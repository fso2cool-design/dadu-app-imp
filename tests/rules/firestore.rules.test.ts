import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  collectionGroup,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('Firestore Security Rules — SEC-01 & SEC-02 Compliance Suite', () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = 'demo-test';
  const TEACHER_UID = 'teacher-1';
  const OTHER_TEACHER_UID = 'teacher-2';
  const ADMIN_UID = 'admin-user';

  const defaultValidRecord = {
    studentId: 'student-001',
    academicYearId: 'ay-2026',
    classId: 'class-10a',
    subjectId: 'sub-matematika',
    teachingAssignmentId: 'ta-001',
    date: '2026-10-10',
    semester: 'GANJIL',
    status: 'PRESENT',
    note: 'Hadir tepat waktu',
    rollNumber: 1,
    studentName: 'Ahmad Siswa',
    gender: 'L',
    meetingId: 'meeting-01',
    meetingNumber: 1,
    recordedBy: TEACHER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  beforeAll(async () => {
    const rulesPath = resolve(__dirname, '../../firestore.rules');
    const rules = readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // =========================================================================
  // SEC-01: CREATE TESTS
  // =========================================================================
  describe('SEC-01: allow create on attendanceRecords', () => {
    it('TC-C01: allows teacher to create record with valid recordedBy equal to auth.uid', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c01');
      await assertSucceeds(setDoc(ref, { ...defaultValidRecord, recordedBy: TEACHER_UID }));
    });

    it('TC-C02: rejects create if recordedBy is missing', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c02');
      const { recordedBy, ...withoutRecordedBy } = defaultValidRecord;
      await assertFails(setDoc(ref, withoutRecordedBy));
    });

    it('TC-C03: rejects create if recordedBy is empty string ""', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c03');
      await assertFails(setDoc(ref, { ...defaultValidRecord, recordedBy: '' }));
    });

    it('TC-C04: rejects create if recordedBy is whitespace-only "   "', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c04');
      await assertFails(setDoc(ref, { ...defaultValidRecord, recordedBy: '   ' }));
    });

    it('TC-C05: rejects create if teacher attempts to spoof another UID in recordedBy', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c05');
      await assertFails(setDoc(ref, { ...defaultValidRecord, recordedBy: OTHER_TEACHER_UID }));
    });

    it('TC-C06: allows superadmin with admin:true to create record with arbitrary valid non-whitespace recordedBy', async () => {
      const db = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c06');
      await assertSucceeds(setDoc(ref, { ...defaultValidRecord, recordedBy: OTHER_TEACHER_UID }));
    });

    it('TC-C07: rejects create with invalid date format (non-YYYY-MM-DD)', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c07');
      await assertFails(setDoc(ref, { ...defaultValidRecord, date: '10-10-2026' }));
    });

    it('TC-C08: rejects create with unknown extraneous field not in allowlist', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c08');
      await assertFails(setDoc(ref, { ...defaultValidRecord, maliciousField: 'injected' }));
    });

    it('TC-C09: allows unlinked meeting pair (both null or omitted)', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c09');
      await assertSucceeds(setDoc(ref, {
        ...defaultValidRecord,
        meetingId: null,
        meetingNumber: null,
      }));
    });

    it('TC-C10: rejects inconsistent meeting pair (meetingId set, meetingNumber null)', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-c10');
      await assertFails(setDoc(ref, {
        ...defaultValidRecord,
        meetingId: 'meet-01',
        meetingNumber: null,
      }));
    });
  });

  // =========================================================================
  // SEC-01: UPDATE TESTS (THREE-STATE RECORDEDBY)
  // =========================================================================
  describe('SEC-01: allow update — Three States of recordedBy', () => {
    // --- STATE 1: Dokumen lama TIDAK memiliki recordedBy ---
    describe('State 1: Legacy document without recordedBy', () => {
      const recordId = 'rec-state1';

      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (adminContext) => {
          const db = adminContext.firestore();
          const { recordedBy, ...legacyDoc } = defaultValidRecord;
          await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId), legacyDoc);
        });
      });

      it('TC-U01: allows teacher to keep record without recordedBy on update', async () => {
        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertSucceeds(updateDoc(ref, { status: 'SICK', note: 'Izin sakit' }));
      });

      it('TC-U02: allows teacher to backfill recordedBy with own auth.uid', async () => {
        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertSucceeds(updateDoc(ref, { status: 'SICK', recordedBy: TEACHER_UID }));
      });

      it('TC-U03: rejects teacher backfilling recordedBy with spoofed other UID', async () => {
        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertFails(updateDoc(ref, { recordedBy: OTHER_TEACHER_UID }));
      });

      it('TC-U04: allows admin to backfill recordedBy with arbitrary valid non-whitespace string', async () => {
        const db = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertSucceeds(updateDoc(ref, { recordedBy: 'admin-backfill-id' }));
      });
    });

    // --- STATE 2: Dokumen lama memiliki recordedBy VALID ---
    describe('State 2: Existing valid recordedBy', () => {
      const recordId = 'rec-state2';

      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (adminContext) => {
          const db = adminContext.firestore();
          await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId), {
            ...defaultValidRecord,
            recordedBy: 'original-recorder',
          });
        });
      });

      it('TC-U05: allows update when recordedBy is maintained identically', async () => {
        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertSucceeds(updateDoc(ref, { status: 'PERMITTED', recordedBy: 'original-recorder' }));
      });

      it('TC-U06: rejects teacher changing valid existing recordedBy', async () => {
        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertFails(updateDoc(ref, { recordedBy: TEACHER_UID }));
      });

      it('TC-U07: allows superadmin with admin:true to supervise/correct recordedBy to non-whitespace string', async () => {
        const db = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertSucceeds(updateDoc(ref, { recordedBy: 'supervisor-corrected' }));
      });
    });

    // --- STATE 3: Dokumen lama memiliki recordedBy INVALID / CORRUPT ---
    describe('State 3: Corrupt existing recordedBy (empty, whitespace, non-string)', () => {
      it('TC-U08: rejects maintaining whitespace recordedBy; enforces in-place correction to uid', async () => {
        const recordId = 'rec-corrupt-ws';
        await testEnv.withSecurityRulesDisabled(async (adminContext) => {
          const db = adminContext.firestore();
          await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId), {
            ...defaultValidRecord,
            recordedBy: '   ',
          });
        });

        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);

        // Attempting update without fixing recordedBy (still whitespace) -> FAILS
        await assertFails(updateDoc(ref, { status: 'PRESENT', recordedBy: '   ' }));

        // Correcting in-place with teacher UID -> SUCCEEDS
        await assertSucceeds(updateDoc(ref, { status: 'PRESENT', recordedBy: TEACHER_UID }));
      });

      it('TC-U09: rejects maintaining non-string recordedBy; allows in-place correction to uid', async () => {
        const recordId = 'rec-corrupt-num';
        await testEnv.withSecurityRulesDisabled(async (adminContext) => {
          const db = adminContext.firestore();
          await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId), {
            ...defaultValidRecord,
            recordedBy: 12345, // invalid type
          });
        });

        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);

        // Retaining non-string or sending invalid -> FAILS
        await assertFails(updateDoc(ref, { status: 'PRESENT', recordedBy: 12345 }));

        // Fixing in-place to own UID -> SUCCEEDS
        await assertSucceeds(updateDoc(ref, { status: 'PRESENT', recordedBy: TEACHER_UID }));
      });

      it('TC-U10: rejects spoofing other UID when correcting corrupt record in State 3', async () => {
        const recordId = 'rec-corrupt-spoof';
        await testEnv.withSecurityRulesDisabled(async (adminContext) => {
          const db = adminContext.firestore();
          await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId), {
            ...defaultValidRecord,
            recordedBy: '',
          });
        });

        const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
        const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
        await assertFails(updateDoc(ref, { recordedBy: OTHER_TEACHER_UID }));
      });
    });
  });

  // =========================================================================
  // SEC-01: RELATIONAL INTEGRITY UPDATE TESTS
  // =========================================================================
  describe('SEC-01: Relational Integrity and Immutability Guards', () => {
    const recordId = 'rec-relational';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId), defaultValidRecord);
      });
    });

    it('TC-R01: rejects mutating studentId', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { studentId: 'student-999' }));
    });

    it('TC-R01b: rejects mutating studentId even with relinkedAt bypass attempt', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { studentId: 'student-999', relinkedAt: Timestamp.now() }));
    });

    it('TC-R01c: rejects mutating studentId even by superadmin', async () => {
      const db = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { studentId: 'student-999' }));
    });


    it('TC-R02: rejects mutating classId', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { classId: 'class-99b' }));
    });

    it('TC-R03: rejects mutating subjectId', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { subjectId: 'sub-fisika' }));
    });

    it('TC-R04: rejects mutating teachingAssignmentId', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { teachingAssignmentId: 'ta-999' }));
    });

    it('TC-R05: rejects mutating academicYearId', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { academicYearId: 'ay-2027' }));
    });

    it('TC-R06: rejects mutating date', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { date: '2026-10-11' }));
    });

    it('TC-R07: rejects mutating semester', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { semester: 'GENAP' }));
    });

    it('TC-R08: rejects mutating createdAt', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { createdAt: Timestamp.fromDate(new Date('2020-01-01')) }));
    });

    it('TC-R09: rejects combined mutation of classId and status (closing the old OR flaw)', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { classId: 'class-new', status: 'ABSENT' }));
    });

    it('TC-R10: rejects combined mutation of date and status', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, { date: '2026-12-31', status: 'DISPENSATION' }));
    });

    it('TC-R11: allows updating status and note legitimately', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertSucceeds(updateDoc(ref, {
        status: 'ABSENT',
        note: 'Tanpa keterangan',
        updatedAt: Timestamp.now(),
      }));
    });

    it('TC-R12: allows linking to new meeting with valid meetingNumber integer', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertSucceeds(updateDoc(ref, {
        meetingId: 'meet-02',
        meetingNumber: 2,
      }));
    });

    it('TC-R13: allows unlinking meeting by setting both to null', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertSucceeds(updateDoc(ref, {
        meetingId: null,
        meetingNumber: null,
      }));
    });

    it('TC-R14: rejects fractional meetingNumber like 1.5', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, {
        meetingId: 'meet-02',
        meetingNumber: 1.5,
      }));
    });

    it('TC-R15: rejects non-positive meetingNumber like 0 or -1', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', recordId);
      await assertFails(updateDoc(ref, {
        meetingId: 'meet-02',
        meetingNumber: 0,
      }));
    });
  });

  // =========================================================================
  // SEC-02: SUPER ADMIN CUSTOM CLAIMS HARDENING
  // =========================================================================
  describe('SEC-02: Hardened isSuperAdmin() Authentication & Claims', () => {
    it('TC-A01: allows admin with token.admin === true to read other user records', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-admin-read'), defaultValidRecord);
      });

      const db = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-admin-read');
      await assertSucceeds(getDoc(ref));
    });

    it('TC-A02: allows admin with token.admin === true to perform collection group queries', async () => {
      const db = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
      const cg = collectionGroup(db, 'attendanceRecords');
      await assertSucceeds(getDocs(cg));
    });

    it('TC-A03: rejects user with token.role === "ADMIN" but admin !== true from accessing other user records', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-fake-admin'), defaultValidRecord);
      });

      const db = testEnv.authenticatedContext('fake-admin', { role: 'ADMIN' }).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-fake-admin');
      await assertFails(getDoc(ref));
    });

    it('TC-A04: rejects user matching primary email johanrovian90@gmail.com without admin:true', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-email-only'), defaultValidRecord);
      });

      const db = testEnv.authenticatedContext('unclaimed-owner', { email: 'johanrovian90@gmail.com' }).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-email-only');
      await assertFails(getDoc(ref));
    });

    it('TC-A05: rejects regular teacher from reading another teacher records', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-isolated'), defaultValidRecord);
      });

      const db = testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-isolated');
      await assertFails(getDoc(ref));
    });

    it('TC-A06: rejects unauthenticated access to attendanceRecords', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'attendanceRecords', 'rec-unauthed');
      await assertFails(getDoc(ref));
    });
  });

  // =========================================================================
  // SEC-03: STUDENT DOCUMENT DELETION & OPTIONAL isArchived SAFEGUARD
  // =========================================================================
  describe('SEC-03: Student Deletion Optional isArchived Field and Authorization Safeguards', () => {
    it('TC-STD-01: allows document owner to delete student when isArchived field is absent', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-no-archive'), {
          fullName: 'Budi Santoso',
          nis: '1001',
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'students', 'student-no-archive');
      await assertSucceeds(deleteDoc(ref));
    });

    it('TC-STD-02: allows document owner to delete student when isArchived is explicitly false', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-archived-false'), {
          fullName: 'Siti Aminah',
          nis: '1002',
          isArchived: false,
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'students', 'student-archived-false');
      await assertSucceeds(deleteDoc(ref));
    });

    it('TC-STD-03: rejects document owner from deleting student when isArchived is true', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-archived-true'), {
          fullName: 'Dewi Lestari',
          nis: '1003',
          isArchived: true,
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'students', 'student-archived-true');
      await assertFails(deleteDoc(ref));
    });

    it('TC-STD-04: rejects a different authenticated teacher from deleting owner student document', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-diff-user-1'), {
          fullName: 'Ahmad Dahlan',
          nis: '1004',
        });
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-diff-user-2'), {
          fullName: 'Hasyim Asyari',
          nis: '1005',
          isArchived: false,
        });
      });

      const otherDb = testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
      const ref1 = doc(otherDb, 'users', TEACHER_UID, 'students', 'student-diff-user-1');
      const ref2 = doc(otherDb, 'users', TEACHER_UID, 'students', 'student-diff-user-2');
      await assertFails(deleteDoc(ref1));
      await assertFails(deleteDoc(ref2));
    });

    it('TC-STD-05: allows super-admin to delete student whether archived or unarchived', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-admin-archived'), {
          fullName: 'Siswa Arsip Admin',
          nis: '1006',
          isArchived: true,
        });
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-admin-unarchived'), {
          fullName: 'Siswa Bebas Admin',
          nis: '1007',
        });
      });

      const adminDb = testEnv.authenticatedContext(ADMIN_UID, { admin: true }).firestore();
      const refArchived = doc(adminDb, 'users', TEACHER_UID, 'students', 'student-admin-archived');
      const refUnarchived = doc(adminDb, 'users', TEACHER_UID, 'students', 'student-admin-unarchived');
      await assertSucceeds(deleteDoc(refArchived));
      await assertSucceeds(deleteDoc(refUnarchived));
    });

    it('TC-STD-06: rejects unauthenticated user from deleting student document', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'students', 'student-unauth'), {
          fullName: 'Siswa Anonim Target',
          nis: '1008',
        });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const ref = doc(unauthDb, 'users', TEACHER_UID, 'students', 'student-unauth');
      await assertFails(deleteDoc(ref));
    });
  });


  // =========================================================================
  // SEC-04: Meeting Identity & Slot Reservation Protocol
  // =========================================================================
  describe('SEC-04: Meeting Identity & Slot Reservation Protocol', () => {
    const validMeeting = {
      academicYearId: 'ay-2026',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta-001',
      classId: 'class-10a',
      subjectId: 'sub-matematika',
      meetingNumber: 1,
      date: '2026-10-10',
      topic: 'Pengenalan Limit',
      status: 'COMPLETED',
    };

    it('TC-MS01: allows creating meeting together with matching slot reservation in atomic batch', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01');
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1');
      const dateSlotRef = doc(db, 'users', TEACHER_UID, 'meetingDateSlots', 'dateslot_ta-001_GANJIL_2026-10-10');

      batch.set(meetingRef, validMeeting);
      batch.set(slotRef, {
        meetingId: 'meet-01',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 1,
      });
      batch.set(dateSlotRef, {
        meetingId: 'meet-01',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        date: '2026-10-10',
      });

      await assertSucceeds(batch.commit());
    });

    it('TC-MS02: rejects creating meeting without a matching slot reservation', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-no-slot');
      await assertFails(setDoc(meetingRef, validMeeting));
    });

    it('TC-MS03: rejects creating slot reservation if meeting does not match slot data', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-02');
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_2');

      batch.set(meetingRef, { ...validMeeting, meetingNumber: 3 });
      batch.set(slotRef, {
        meetingId: 'meet-02',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 2,
      });

      await assertFails(batch.commit());
    });

    it('TC-MS04: allows updating meetingNumber with matching new reservation and releasing old slot', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01');
      const oldSlotRef = doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1');
      const newSlotRef = doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_2');

      batch.update(meetingRef, { meetingNumber: 2 });
      batch.set(newSlotRef, {
        meetingId: 'meet-01',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 2,
      });
      batch.delete(oldSlotRef);

      await assertSucceeds(batch.commit());
    });

    it('TC-MS05: rejects changing meetingNumber without creating matching new reservation slot', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01');
      await assertFails(updateDoc(meetingRef, { meetingNumber: 2 }));
    });

    it('TC-MS06: allows safe field updates on legacy meeting without a reservation slot', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'legacy-meet'), validMeeting);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'legacy-meet');
      await assertSucceeds(updateDoc(meetingRef, {
        topic: 'Materi Baru yang Diperbarui',
        notes: 'Catatan tambahan guru',
      }));
    });

    it('TC-MS07: rejects mutating structural fields (teachingAssignmentId, classId, subjectId, academicYearId, semester)', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01');
      await assertFails(updateDoc(meetingRef, { teachingAssignmentId: 'ta-diff' }));
      await assertFails(updateDoc(meetingRef, { classId: 'class-diff' }));
      await assertFails(updateDoc(meetingRef, { subjectId: 'sub-diff' }));
      await assertFails(updateDoc(meetingRef, { academicYearId: 'ay-diff' }));
      await assertFails(updateDoc(meetingRef, { semester: 'GENAP' }));
    });

    it('TC-MS08: allows deleting meeting and cleaning up its owned slot reservation', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'));
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'));
      await assertSucceeds(batch.commit());
    });

    it('TC-MS09: rejects standalone slot deletion while owning meeting is unchanged', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1');
      await assertFails(deleteDoc(slotRef));
    });

    it('TC-MS10: rejects unauthorized access from a different teacher', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
      });

      const otherDb = testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
      const otherMeetingRef = doc(otherDb, 'users', TEACHER_UID, 'meetings', 'meet-01');
      const otherSlotRef = doc(otherDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1');

      await assertFails(getDoc(otherMeetingRef));
      await assertFails(getDoc(otherSlotRef));
      await assertFails(deleteDoc(otherSlotRef));
    });
  });

  // =========================================================================
  // SEC-05: meetingDateSlots — Date Uniqueness Reservation Protocol
  // =========================================================================
  describe('SEC-05: meetingDateSlots Date Reservation Protocol', () => {
    const DATE = '2026-10-10';
    const dateSlotId = 'dateslot_ta-001_GANJIL_2026-10-10';
    const validMeeting = {
      academicYearId: 'ay-2026',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta-001',
      classId: 'class-10a',
      subjectId: 'sub-matematika',
      meetingNumber: 1,
      date: DATE,
      topic: 'Pengenalan Limit',
      status: 'COMPLETED',
    };
    const validDateSlot = {
      meetingId: 'meet-01',
      teachingAssignmentId: 'ta-001',
      semester: 'GANJIL',
      date: DATE,
    };

    const seedMeetingAndDateSlot = async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      });
    };

    it('TC-DS01: allows owner to create date slot with schema-valid payload and deterministic slotId', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
      });
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId);
      await assertSucceeds(setDoc(slotRef, validDateSlot));

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const snap = await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
        expect(snap.exists()).toBe(true);
        expect(snap.data()?.meetingId).toBe('meet-01');
        expect(snap.data()?.date).toBe(DATE);
        expect(snap.data()?.teachingAssignmentId).toBe('ta-001');
        expect(snap.data()?.semester).toBe('GANJIL');
      });
    });

    it('TC-DS02: rejects unauthenticated date slot creation', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
      });
      const db = testEnv.unauthenticatedContext().firestore();
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId);
      await assertFails(setDoc(slotRef, validDateSlot));

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const snap = await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
        expect(snap.exists()).toBe(false);
      });
    });

    it('TC-DS03: rejects deleting reservation alone while active meeting keeps the same date', async () => {
      await seedMeetingAndDateSlot();

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId);
      await assertFails(deleteDoc(slotRef));

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const snap = await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
        expect(snap.exists()).toBe(true);
      });
    });

    it('TC-DS03b: allows releasing old reservation only when meeting date moves in the same batch', async () => {
      await seedMeetingAndDateSlot();

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), { date: '2026-10-11' });
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', 'dateslot_ta-001_GANJIL_2026-10-11'), {
        ...validDateSlot,
        date: '2026-10-11',
      });
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
      await assertSucceeds(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        const meetSnap = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'));
        expect(meetSnap.exists()).toBe(true);
        expect(meetSnap.data()?.date).toBe('2026-10-11');

        const oldSlotSnap = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
        expect(oldSlotSnap.exists()).toBe(false);

        const newSlotSnap = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', 'dateslot_ta-001_GANJIL_2026-10-11'));
        expect(newSlotSnap.exists()).toBe(true);
        expect(newSlotSnap.data()?.meetingId).toBe('meet-01');
        expect(newSlotSnap.data()?.date).toBe('2026-10-11');
      });
    });

    it('TC-DS04: allows atomic batch deleting meeting together with its date reservation', async () => {
      await seedMeetingAndDateSlot();

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'));
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
      await assertSucceeds(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(false);
      });
    });

    it('TC-DS04b: allows atomic batch deleting meeting with both meetingSlot and date reservation', async () => {
      await seedMeetingAndDateSlot();
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'));
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'));
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
      await assertSucceeds(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(false);
      });
    });

    it('TC-DS05: rejects cross-owner read, delete, and create on another teacher reservation', async () => {
      await seedMeetingAndDateSlot();

      const otherDb = testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
      const victimSlotRef = doc(otherDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId);
      await assertFails(getDoc(victimSlotRef));
      await assertFails(deleteDoc(victimSlotRef));

      const otherNewSlotRef = doc(
        otherDb,
        'users',
        TEACHER_UID,
        'meetingDateSlots',
        'dateslot_ta-001_GANJIL_2026-10-11'
      );
      await assertFails(setDoc(otherNewSlotRef, { ...validDateSlot, date: '2026-10-11' }));

      const batch = writeBatch(otherDb);
      batch.delete(doc(otherDb, 'users', TEACHER_UID, 'meetings', 'meet-01'));
      batch.delete(victimSlotRef);
      await assertFails(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(true);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(true);
      });
    });

    it('TC-DS06: allows creating meeting, meetingSlot, and meetingDateSlot atomically', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
        meetingId: 'meet-01',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 1,
      });
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      await assertSucceeds(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(true);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'))).exists()).toBe(true);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(true);
      });
    });

    it('TC-DS07: allows updating non-date fields on legacy meeting without meetingDateSlot', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        await setDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetings', 'meet-legacy'), validMeeting);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetingRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-legacy');
      await assertSucceeds(updateDoc(meetingRef, {
        topic: 'Topik Baru Terupdate',
        notes: 'Catatan tambahan',
      }));

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const snap = await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetings', 'meet-legacy'));
        expect(snap.data()?.topic).toBe('Topik Baru Terupdate');
        const slotSnap = await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
        expect(slotSnap.exists()).toBe(false);
      });
    });

    it('TC-DS08: allows updating meeting date with atomic transfer and release of old slot', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      });

      const NEW_DATE = '2026-10-12';
      const newDateSlotId = 'dateslot_ta-001_GANJIL_2026-10-12';

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), { date: NEW_DATE });
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', newDateSlotId), {
        ...validDateSlot,
        date: NEW_DATE,
      });
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
      await assertSucceeds(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        const meet = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'));
        expect(meet.data()?.date).toBe(NEW_DATE);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', newDateSlotId))).exists()).toBe(true);
      });
    });

    it('TC-DS09: rejects creating meeting without matching date reservation slot', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-no-dateslot'), validMeeting);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
        meetingId: 'meet-no-dateslot',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 1,
      });
      // Omit meetingDateSlots
      await assertFails(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-no-dateslot'))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'))).exists()).toBe(false);
      });
    });

    it('TC-DS10: rejects creating meeting if date reservation meetingId or date mismatches', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
        meetingId: 'meet-01',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 1,
      });
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), {
        ...validDateSlot,
        meetingId: 'different-meeting-id',
      });
      await assertFails(batch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(false);
      });
    });

    it('TC-DS11: rejects creating date reservation without matching existing or batch meeting', async () => {
      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const slotRef = doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId);
      await assertFails(setDoc(slotRef, validDateSlot));

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        expect((await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(false);
      });
    });

    it('TC-DS12: rejects updating meeting date without creating new matching date reservation', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01');
      await assertFails(updateDoc(meetRef, { date: '2026-10-15' }));

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const snap = await getDoc(doc(adminContext.firestore(), 'users', TEACHER_UID, 'meetings', 'meet-01'));
        expect(snap.data()?.date).toBe(DATE);
      });
    });

    it('TC-DS13: rejects creating second meeting trying to reuse existing date reservation', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_1'), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-02'), {
        ...validMeeting,
        meetingNumber: 2,
      });
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_2'), {
        meetingId: 'meet-02',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 2,
      });
      await assertFails(batch.commit());

      const stealBatch = writeBatch(db);
      stealBatch.set(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-02'), {
        ...validMeeting,
        meetingNumber: 2,
      });
      stealBatch.set(doc(db, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_2'), {
        meetingId: 'meet-02',
        teachingAssignmentId: 'ta-001',
        semester: 'GANJIL',
        meetingNumber: 2,
      });
      stealBatch.update(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), {
        meetingId: 'meet-02',
      });
      await assertFails(stealBatch.commit());

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(true);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-02'))).exists()).toBe(false);
        const slot = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));
        expect(slot.data()?.meetingId).toBe('meet-01');
      });
    });
  });

  describe('Meeting Deletion Invariants (TC-DEL)', () => {
    const DATE = '2026-10-10';
    const slotId = 'slot_ta-001_GANJIL_1';
    const dateSlotId = 'dateslot_ta-001_GANJIL_2026-10-10';
    const validMeeting = {
      academicYearId: 'ay-2026',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta-001',
      classId: 'class-10a',
      subjectId: 'sub-matematika',
      meetingNumber: 1,
      date: DATE,
      topic: 'Pengenalan Limit',
      status: 'COMPLETED',
    };
    const validDateSlot = {
      meetingId: 'meet-01',
      teachingAssignmentId: 'ta-001',
      semester: 'GANJIL',
      date: DATE,
    };

    it('TC-DEL01: rejects standalone meeting delete when reservations exist', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', slotId), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01');

      // Attempting to delete meeting alone must fail
      await assertFails(deleteDoc(meetRef));

      // Post-state check: meeting and both slots remain intact
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(true);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', slotId))).exists()).toBe(true);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(true);
      });
    });

    it('TC-DEL02: allows atomic deletion of meeting and its owned reservations', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', slotId), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'));
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingSlots', slotId));
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));

      await assertSucceeds(batch.commit());

      // Post-state check: all three documents are deleted
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', slotId))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(false);
      });
    });

    it('TC-DEL03: allows legacy meeting deletion without reservations', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-legacy'), {
          ...validMeeting,
          meetingNumber: 99,
          date: '2026-10-20',
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const meetRef = doc(db, 'users', TEACHER_UID, 'meetings', 'meet-legacy');

      await assertSucceeds(deleteDoc(meetRef));

      // Post-state check: meeting document is deleted
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-legacy'))).exists()).toBe(false);
      });
    });

    it('TC-DEL04: allows legacy meeting deletion while preserving another meeting\'s reservation', async () => {
      const activeSlotId = 'slot_ta-001_GANJIL_1';
      const activeDateSlotId = 'dateslot_ta-001_GANJIL_2026-10-10';

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        // Active meeting owning the slots
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-active'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', activeSlotId), {
          meetingId: 'meet-active',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', activeDateSlotId), {
          ...validDateSlot,
          meetingId: 'meet-active',
        });

        // Duplicate legacy meeting (same number and date, but without owning slots)
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-legacy-dup'), {
          ...validMeeting,
          topic: 'Legacy Duplicate Meeting',
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      // Deleting the legacy duplicate meeting alone
      await assertSucceeds(deleteDoc(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-legacy-dup')));

      // Post-state check: legacy dup is deleted, active meeting and its reservations remain intact
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-legacy-dup'))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-active'))).exists()).toBe(true);

        const slotSnap = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', activeSlotId));
        expect(slotSnap.exists()).toBe(true);
        expect(slotSnap.data()?.meetingId).toBe('meet-active');

        const dateSlotSnap = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', activeDateSlotId));
        expect(dateSlotSnap.exists()).toBe(true);
        expect(dateSlotSnap.data()?.meetingId).toBe('meet-active');
      });
    });

    it('TC-DEL05: allows atomic date change while preserving unrelated reservations', async () => {
      const otherDateSlotId = 'dateslot_ta-001_GANJIL_2026-10-11';
      const newDate = '2026-10-12';
      const newDateSlotId = 'dateslot_ta-001_GANJIL_2026-10-12';

      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        // Target meeting and its date slot
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'), validMeeting);
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', slotId), {
          meetingId: 'meet-01',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 1,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId), validDateSlot);

        // Unrelated meeting and date slot on 2026-10-11
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-unrelated'), {
          ...validMeeting,
          meetingNumber: 2,
          date: '2026-10-11',
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingSlots', 'slot_ta-001_GANJIL_2'), {
          meetingId: 'meet-unrelated',
          teachingAssignmentId: 'ta-001',
          semester: 'GANJIL',
          meetingNumber: 2,
        });
        await setDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', otherDateSlotId), {
          ...validDateSlot,
          meetingId: 'meet-unrelated',
          date: '2026-10-11',
        });
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', TEACHER_UID, 'meetings', 'meet-01'), { date: newDate });
      batch.set(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', newDateSlotId), {
        ...validDateSlot,
        date: newDate,
      });
      batch.delete(doc(db, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId));

      await assertSucceeds(batch.commit());

      // Post-state check:
      // 1. meet-01 has moved to newDate
      // 2. old date slot (dateSlotId) is deleted
      // 3. new date slot (newDateSlotId) exists and points to meet-01
      // 4. meet-unrelated and otherDateSlotId are completely preserved
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const adminDb = adminContext.firestore();
        const meet = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-01'));
        expect(meet.data()?.date).toBe(newDate);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', dateSlotId))).exists()).toBe(false);
        expect((await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', newDateSlotId))).exists()).toBe(true);

        const unrelatedMeet = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetings', 'meet-unrelated'));
        expect(unrelatedMeet.exists()).toBe(true);
        expect(unrelatedMeet.data()?.date).toBe('2026-10-11');

        const otherSlot = await getDoc(doc(adminDb, 'users', TEACHER_UID, 'meetingDateSlots', otherDateSlotId));
        expect(otherSlot.exists()).toBe(true);
        expect(otherSlot.data()?.meetingId).toBe('meet-unrelated');
      });
    });
  });

  // =========================================================================
  // RULES-ENROLLMENT-01: ENROLLMENT STATUS & IMMUTABILITY INVARIANTS
  // =========================================================================
  describe('RULES-ENROLLMENT-01: Enrollment Status & Immutability Invariants', () => {
    const validEnrollment = {
      academicYearId: 'ay-2026',
      classId: 'class-10a',
      studentId: 'student-001',
      rollNumber: 1,
      status: 'ACTIVE',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    it('TC-ENR-01: allows authorized teacher to update enrollment status to INACTIVE', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-inactive-01'), validEnrollment);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-inactive-01');
      await assertSucceeds(updateDoc(ref, {
        status: 'INACTIVE',
        updatedAt: Timestamp.now(),
      }));
    });

    it('TC-ENR-02: rejects updating enrollment status to an invalid status', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-invalid-01'), validEnrollment);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-invalid-01');
      await assertFails(updateDoc(ref, {
        status: 'SUSPENDED',
        updatedAt: Timestamp.now(),
      }));
      await assertFails(updateDoc(ref, {
        status: 'WITHDRAWN',
        updatedAt: Timestamp.now(),
      }));
    });

    it('TC-ENR-03: rejects updating to INACTIVE if protected immutable fields are modified', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-tamper-01'), validEnrollment);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-tamper-01');

      // Tampering academicYearId
      await assertFails(updateDoc(ref, {
        status: 'INACTIVE',
        academicYearId: 'ay-tampered',
      }));

      // Tampering classId
      await assertFails(updateDoc(ref, {
        status: 'INACTIVE',
        classId: 'class-tampered',
      }));

      // Tampering studentId without governed relink exception
      await assertFails(updateDoc(ref, {
        status: 'INACTIVE',
        studentId: 'student-tampered',
      }));
    });

    it('TC-ENR-04: rejects status update to INACTIVE by unauthenticated client or other teacher', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-tenant-01'), validEnrollment);
      });

      // Unauthenticated
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const unauthRef = doc(unauthDb, 'users', TEACHER_UID, 'enrollments', 'enr-tenant-01');
      await assertFails(updateDoc(unauthRef, { status: 'INACTIVE' }));

      // Other teacher (cross-tenant boundary)
      const otherDb = testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
      const otherRef = doc(otherDb, 'users', TEACHER_UID, 'enrollments', 'enr-tenant-01');
      await assertFails(updateDoc(otherRef, { status: 'INACTIVE' }));
    });

    it('TC-ENR-05: allows updating enrollment to other canonical and supported statuses', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-status-01'), validEnrollment);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-status-01');

      await assertSucceeds(updateDoc(ref, { status: 'TRANSFERRED' }));
      await assertSucceeds(updateDoc(ref, { status: 'GRADUATED' }));
      await assertSucceeds(updateDoc(ref, { status: 'DROPOUT' }));
      await assertSucceeds(updateDoc(ref, { status: 'ARCHIVED' }));
    });

    it('TC-ENR-06: allows governed re-link exception with relinkedAt while setting status to INACTIVE', async () => {
      await testEnv.withSecurityRulesDisabled(async (adminContext) => {
        const db = adminContext.firestore();
        await setDoc(doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-relink-01'), validEnrollment);
      });

      const db = testEnv.authenticatedContext(TEACHER_UID).firestore();
      const ref = doc(db, 'users', TEACHER_UID, 'enrollments', 'enr-relink-01');

      await assertSucceeds(updateDoc(ref, {
        studentId: 'student-002',
        relinkedAt: Timestamp.now(),
        relinkReason: 'Perbaikan identitas siswa mutasi',
        status: 'INACTIVE',
      }));
    });
  });

});
