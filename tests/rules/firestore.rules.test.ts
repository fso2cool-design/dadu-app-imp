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
});
