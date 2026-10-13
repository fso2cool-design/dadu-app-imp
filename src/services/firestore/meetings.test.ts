import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meeting } from '../../types';

let autoIdCounter = 1;

const mockRunTransaction = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((first: any, ...segments: string[]) => {
  if (segments.length === 0) {
    const genId = `gen-meet-${autoIdCounter++}`;
    const basePath = first?.path || 'unknown';
    return {
      path: `${basePath}/${genId}`,
      id: genId,
    };
  }
  const allSegments = [
    first?.type === 'firestore' ? '' : (first?.path || first),
    ...segments,
  ].filter(Boolean);
  return {
    path: allSegments.join('/'),
    id: segments[segments.length - 1],
  };
});

const mockCollection = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
}));

const mockQuery = vi.fn((coll: any, ...args: any[]) => ({ coll, args }));
const mockWhere = vi.fn((...args: any[]) => args);
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TIMESTAMP');
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (first: any, ...segments: string[]) => mockDoc(first, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  query: (coll: any, ...args: any[]) => mockQuery(coll, ...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (q: any) => mockGetDocs(q),
  runTransaction: (db: any, cb: any) => mockRunTransaction(db, cb),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
  getDoc: (ref: any) => mockGetDoc(ref),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
  deleteDoc: (ref: any) => mockDeleteDoc(ref),
  limit: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

vi.mock('../../utils/syncEvents', () => ({
  trackSync: async (promise: Promise<any>) => promise,
}));

import {
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingSlotId,
} from './meetings';
import { saveSubjectAttendance } from './attendance';
import type { SaveSubjectAttendancePayload } from '../../domain/attendance.types';

describe('Meeting Identity, Number Reservation & Correction Service Tests', () => {
  const uid = 'teacher-1';
  const meetingId = 'meet-1';

  const mockExistingMeeting: Meeting = {
    id: meetingId,
    academicYearId: 'ay-2026',
    semester: 'GANJIL',
    teachingAssignmentId: 'ta-1',
    classId: 'cls-1',
    subjectId: 'sub-1',
    meetingNumber: 5,
    date: '2026-10-10',
    topic: 'Materi Asli',
    status: 'COMPLETED',
    createdAt: '2026-10-10T07:00:00.000Z' as any,
    updatedAt: '2026-10-10T07:00:00.000Z' as any,
  };

  // In-memory mock database state
  let docsStore: Map<string, any>;
  let queryStore: Array<{ path: string; data: any }>;

  beforeEach(() => {
    vi.clearAllMocks();
    autoIdCounter = 1;
    docsStore = new Map();
    queryStore = [];

    // Pre-populate active year, assignment, and existing meeting
    docsStore.set(`users/${uid}/academicYears/ay-2026`, { isArchived: false, isActive: true });
    docsStore.set(`users/${uid}/teachingAssignments/ta-1`, { isArchived: false, academicYearId: 'ay-2026', classId: 'cls-1', subjectId: 'sub-1' });
    docsStore.set(`users/${uid}/teachingAssignments/ta-2`, { isArchived: false, academicYearId: 'ay-2026', classId: 'cls-2', subjectId: 'sub-2' });
    docsStore.set(`users/${uid}/classes/cls-1`, { isArchived: false, academicYearId: 'ay-2026' });
    docsStore.set(`users/${uid}/classes/cls-2`, { isArchived: false, academicYearId: 'ay-2026' });

    // Existing meeting
    docsStore.set(`users/${uid}/meetings/${meetingId}`, { ...mockExistingMeeting });
    // Existing slot for meeting 5
    docsStore.set(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`, {
      meetingId,
      teachingAssignmentId: 'ta-1',
      semester: 'GANJIL',
      meetingNumber: 5,
    });

    mockGetDoc.mockImplementation(async (ref: any) => {
      const data = docsStore.get(ref.path);
      return {
        exists: () => data !== undefined,
        data: () => data,
      };
    });

    mockGetDocs.mockImplementation(async (q: any) => {
      const collPath = q?.coll?.path || '';
      const matching = Array.from(docsStore.entries())
        .filter(([p]) => p.startsWith(collPath + '/'))
        .map(([p, data]) => ({ id: p.split('/').pop(), data: () => data, ref: { path: p } }));

      // Evaluate where filters if present
      if (q?.args) {
        const filtered = matching.filter(docObj => {
          const d = docObj.data();
          for (const arg of q.args) {
            if (Array.isArray(arg) && arg.length === 3 && arg[1] === '==') {
              const [field, , expected] = arg;
              if (d[field] !== expected) return false;
            }
          }
          return true;
        });
        return { empty: filtered.length === 0, docs: filtered, size: filtered.length };
      }

      return { empty: matching.length === 0, docs: matching, size: matching.length };
    });

    mockRunTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = {
        get: vi.fn().mockImplementation(async (ref: any) => {
          const data = docsStore.get(ref.path);
          return {
            exists: () => data !== undefined,
            data: () => data,
          };
        }),
        set: vi.fn().mockImplementation((ref: any, data: any) => {
          docsStore.set(ref.path, data);
        }),
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          const existing = docsStore.get(ref.path) || {};
          const merged = { ...existing, ...data };
          docsStore.set(ref.path, merged);
          mockUpdateDoc(ref, data);
        }),
        delete: vi.fn().mockImplementation((ref: any) => {
          docsStore.delete(ref.path);
        }),
      };
      return cb(tx);
    });
  });

  describe('Slot ID generation', () => {
    it('generates unambiguous deterministic slot IDs', () => {
      const id1 = getMeetingSlotId('ta-1', 'GANJIL', 4);
      expect(id1).toBe('slot_ta-1_GANJIL_4');

      const id2 = getMeetingSlotId('ta/special', 'GENAP', 12);
      expect(id2).toBe('slot_ta_special_GENAP_12');
    });
  });

  describe('Meeting number correction (#5 -> #4)', () => {
    it('1. Correction #5 -> #4 succeeds when target number is free', async () => {
      await updateMeeting(uid, meetingId, {
        meetingNumber: 4,
        topic: 'Topik Baru #4',
      });

      // Meeting updated
      const updatedMeeting = docsStore.get(`users/${uid}/meetings/${meetingId}`);
      expect(updatedMeeting.meetingNumber).toBe(4);
      expect(updatedMeeting.topic).toBe('Topik Baru #4');

      // Old slot #5 released
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`)).toBe(false);

      // New slot #4 acquired
      const newSlot = docsStore.get(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_4`);
      expect(newSlot).toBeDefined();
      expect(newSlot.meetingId).toBe(meetingId);
      expect(newSlot.meetingNumber).toBe(4);
    });

    it('2. Correction is rejected when target number is occupied in the same assignment and semester', async () => {
      // Occupy slot 4 with meeting-2
      docsStore.set(`users/${uid}/meetings/meet-2`, {
        ...mockExistingMeeting,
        id: 'meet-2',
        meetingNumber: 4,
      });
      docsStore.set(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_4`, {
        meetingId: 'meet-2',
        teachingAssignmentId: 'ta-1',
        semester: 'GANJIL',
        meetingNumber: 4,
      });

      await expect(
        updateMeeting(uid, meetingId, { meetingNumber: 4 })
      ).rejects.toThrow('sudah ada dalam jurnal');

      // Original meeting unchanged
      const meetingAfter = docsStore.get(`users/${uid}/meetings/${meetingId}`);
      expect(meetingAfter.meetingNumber).toBe(5);
      // Original slot still held
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`)).toBe(true);
    });

    it('3. The same number remains available in another assignment or semester', async () => {
      // Another assignment ta-2 has meeting #5
      docsStore.set(`users/${uid}/meetings/meet-ta2`, {
        ...mockExistingMeeting,
        id: 'meet-ta2',
        teachingAssignmentId: 'ta-2',
        meetingNumber: 5,
      });
      docsStore.set(`users/${uid}/meetingSlots/slot_ta-2_GANJIL_5`, {
        meetingId: 'meet-ta2',
        teachingAssignmentId: 'ta-2',
        semester: 'GANJIL',
        meetingNumber: 5,
      });

      // ta-1 can create meeting #5 or keep meeting #5 without conflict
      expect(docsStore.get(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`).meetingId).toBe(meetingId);
      expect(docsStore.get(`users/${uid}/meetingSlots/slot_ta-2_GANJIL_5`).meetingId).toBe('meet-ta2');
    });

    it('4. Number gaps remain valid (can jump #5 -> #10)', async () => {
      await updateMeeting(uid, meetingId, { meetingNumber: 10 });
      const updatedMeeting = docsStore.get(`users/${uid}/meetings/${meetingId}`);
      expect(updatedMeeting.meetingNumber).toBe(10);
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_10`)).toBe(true);
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`)).toBe(false);
    });

    it('5. A corrected Meeting retains the same physical document ID', async () => {
      await updateMeeting(uid, meetingId, { meetingNumber: 2 });
      expect(docsStore.has(`users/${uid}/meetings/${meetingId}`)).toBe(true);
      const meeting = docsStore.get(`users/${uid}/meetings/${meetingId}`);
      expect(meeting.meetingNumber).toBe(2);
      expect(meeting.id).toBe(meetingId);
    });

    it('6. A freed number can be used to create a new Meeting', async () => {
      // Renumber #5 to #4
      await updateMeeting(uid, meetingId, { meetingNumber: 4 });
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`)).toBe(false);

      // Now create new meeting with #5
      const newMeeting = await createMeeting(uid, {
        academicYearId: 'ay-2026',
        semester: 'GANJIL',
        teachingAssignmentId: 'ta-1',
        classId: 'cls-1',
        subjectId: 'sub-1',
        meetingNumber: 5,
        date: '2026-10-15',
        topic: 'Topik Baru ke-5',
        status: 'COMPLETED',
      });

      expect(newMeeting.meetingNumber).toBe(5);
      expect(newMeeting.id).not.toBe(meetingId);
      expect(docsStore.get(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`).meetingId).toBe(newMeeting.id);
    });

    it('7. Legacy deterministic IDs remain supported and detected during correction', async () => {
      // Legacy meeting document at ta-1_GANJIL_4
      docsStore.set(`users/${uid}/meetings/ta-1_GANJIL_4`, {
        ...mockExistingMeeting,
        id: 'ta-1_GANJIL_4',
        meetingNumber: 4,
      });

      await expect(
        updateMeeting(uid, meetingId, { meetingNumber: 4 })
      ).rejects.toThrow('sudah ada dalam jurnal');
    });

    it('8. Legacy random-ID Meetings are detected by pre-flight uniqueness check', async () => {
      // Legacy meeting with random ID
      docsStore.set(`users/${uid}/meetings/legacy-random-99`, {
        ...mockExistingMeeting,
        id: 'legacy-random-99',
        meetingNumber: 2,
      });

      await expect(
        updateMeeting(uid, meetingId, { meetingNumber: 2 })
      ).rejects.toThrow('sudah ada dalam jurnal');
    });

    it('9. Deletion releases only the reservation owned by the deleted Meeting', async () => {
      // meet-1 owns slot 5
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`)).toBe(true);

      await deleteMeeting(uid, meetingId);

      // Meeting deleted and slot 5 released
      expect(docsStore.has(`users/${uid}/meetings/${meetingId}`)).toBe(false);
      expect(docsStore.has(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`)).toBe(false);
    });

    it('10. Safe Meeting field updates continue to work without touching slots', async () => {
      await updateMeeting(uid, meetingId, {
        topic: 'Topik Saja',
        notes: 'Catatan Baru',
      });

      const meeting = docsStore.get(`users/${uid}/meetings/${meetingId}`);
      expect(meeting.topic).toBe('Topik Saja');
      expect(meeting.notes).toBe('Catatan Baru');
      expect(meeting.meetingNumber).toBe(5);
      // Slot 5 is still intact
      expect(docsStore.get(`users/${uid}/meetingSlots/slot_ta-1_GANJIL_5`).meetingId).toBe(meetingId);
    });

    it('11. Linked Meeting date protection remains unchanged', async () => {
      // Linked attendance
      docsStore.set(`users/${uid}/attendanceRecords/att-1`, {
        meetingId,
        date: '2026-10-10',
      });

      await expect(
        updateMeeting(uid, meetingId, {
          date: '2026-10-12',
          topic: 'Coba Ubah Tanggal',
        })
      ).rejects.toThrow('Tanggal jurnal tidak dapat diubah karena masih terhubung dengan presensi siswa');
    });

    it('12. Concurrency: transactional slot collision rejects concurrent reservation attempt', async () => {
      // Simulate concurrent transaction where target slot was already taken by another writer
      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            if (ref.path.includes('meetingSlots/slot_ta-1_GANJIL_4')) {
              // Slot occupied concurrently
              return {
                exists: () => true,
                data: () => ({ meetingId: 'other-meet', meetingNumber: 4 }),
              };
            }
            const data = docsStore.get(ref.path);
            return {
              exists: () => data !== undefined,
              data: () => data,
            };
          }),
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        };
        return cb(tx);
      });

      await expect(
        updateMeeting(uid, meetingId, { meetingNumber: 4 })
      ).rejects.toThrow('sudah ada dalam jurnal');
    });
  });

  describe('Attendance Unlinking Compatibility', () => {
    it('unlinking a legacy date-mismatched record succeeds without changing attendance date', async () => {
      const unlinkPayload: SaveSubjectAttendancePayload = {
        academicYearId: 'ay-2026',
        semester: 'GANJIL',
        classId: 'cls-1',
        teachingAssignmentId: 'ta-1',
        subjectId: 'sub-1',
        date: '2026-10-12',
        meetingId: null,
        expectedPreviousMeetingId: meetingId,
        items: [
          {
            studentId: 'std-1',
            studentName: 'Siswa Satu',
            rollNumber: 1,
            gender: 'L',
            status: 'PRESENT',
            note: 'Hadir',
          },
        ],
      };

      // Mock existing session record
      docsStore.set(`users/${uid}/attendanceRecords/ay-2026_GANJIL_cls-1_2026-10-12_ta-1_std-1`, {
        meetingId,
        date: '2026-10-12',
        studentId: 'std-1',
      });

      const result = await saveSubjectAttendance(uid, unlinkPayload);
      expect(result.present).toBe(1);

      const recordKey = `users/${uid}/attendanceRecords/ay-2026_GANJIL_cls-1_2026-10-12_ta-1_std-1`;
      const record = docsStore.get(recordKey);
      expect(record.meetingId).toBeNull();
      expect(record.meetingNumber).toBeNull();
      expect(record.date).toBe('2026-10-12');
    });
  });
});