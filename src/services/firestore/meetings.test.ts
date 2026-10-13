import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meeting } from '../../types';

const mockRunTransaction = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));
const mockCollection = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
}));
const mockQuery = vi.fn((coll: any, ...args: any[]) => ({ coll, args }));
const mockWhere = vi.fn((...args: any[]) => args);
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TIMESTAMP');
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...segments: string[]) => mockDoc(_db, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  query: (coll: any, ...args: any[]) => mockQuery(coll, ...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (q: any) => mockGetDocs(q),
  runTransaction: (db: any, cb: any) => mockRunTransaction(db, cb),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: vi.fn(),
  getDoc: (ref: any) => mockGetDoc(ref),
  setDoc: vi.fn(),
  updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
  deleteDoc: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

vi.mock('../../utils/syncEvents', () => ({
  trackSync: async (promise: Promise<any>) => promise,
}));

import { updateMeeting } from './meetings';
import { saveSubjectAttendance } from './attendance';
import type { SaveSubjectAttendancePayload } from '../../domain/attendance.types';

describe('Meeting Date Integrity & Guard Service Tests', () => {
  const uid = 'teacher-1';
  const meetingId = 'meet-1';

  const mockExistingMeeting: Meeting = {
    id: meetingId,
    academicYearId: 'ay-2026',
    semester: 'GANJIL',
    teachingAssignmentId: 'ta-1',
    classId: 'cls-1',
    subjectId: 'sub-1',
    meetingNumber: 3,
    date: '2026-10-10',
    topic: 'Materi Asli',
    status: 'COMPLETED',
    createdAt: '2026-10-10T07:00:00.000Z' as any,
    updatedAt: '2026-10-10T07:00:00.000Z' as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockImplementation(async (ref: any) => {
      if (ref.path.includes('meetings/meet-1')) {
        return {
          exists: () => true,
          data: () => mockExistingMeeting,
        };
      }
      if (ref.path.includes('academicYears/ay-2026')) {
        return {
          exists: () => true,
          data: () => ({ isArchived: false, isActive: true }),
        };
      }
      return {
        exists: () => true,
        data: () => ({ isArchived: false }),
      };
    });

    mockRunTransaction.mockImplementation(async (_db: any, cb: any) => {
      const tx = {
        get: vi.fn().mockImplementation(async (ref: any) => {
          return mockGetDoc(ref);
        }),
        set: vi.fn(),
        update: vi.fn().mockImplementation((ref: any, data: any) => {
          mockUpdateDoc(ref, data);
        }),
        delete: vi.fn(),
      };
      return cb(tx);
    });
  });

  describe('updateMeeting date guard (Criteria 4 & 5)', () => {
    it('Criteria 4: rejects date change when linked attendance records exist', async () => {
      // Mock presence of linked attendance records
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'att-1' }],
      });

      await expect(
        updateMeeting(uid, meetingId, {
          date: '2026-10-15',
          topic: 'Topik Baru',
        })
      ).rejects.toThrow('Tanggal jurnal tidak dapat diubah karena masih terhubung dengan presensi siswa');

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('Criteria 1 & 5: allows date change when no linked attendance records exist', async () => {
      // Mock empty attendance records (unlinked)
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await updateMeeting(uid, meetingId, {
        date: '2026-10-15',
        topic: 'Topik Baru',
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdateDoc.mock.calls[0][1];
      expect(updatePayload.date).toBe('2026-10-15');
      expect(updatePayload.topic).toBe('Topik Baru');
    });

    it('Criteria 5: allows safe field edits with unchanged date while attendance is linked', async () => {
      // When date is identical or undefined, query is not triggered and update succeeds
      await updateMeeting(uid, meetingId, {
        date: '2026-10-10', // unchanged date
        topic: 'Revisi Topik Saja',
        notes: 'Catatan tambahan',
      });

      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdateDoc.mock.calls[0][1];
      expect(updatePayload.topic).toBe('Revisi Topik Saja');
      expect(updatePayload.notes).toBe('Catatan tambahan');
    });

    it('Criteria 11: ensures meetingNumber remains strictly stripped on update', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await updateMeeting(uid, meetingId, {
        meetingNumber: 99,
        topic: 'Coba Ubah Nomor',
      } as any);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdateDoc.mock.calls[0][1];
      expect(updatePayload.meetingNumber).toBeUndefined();
      expect(updatePayload.topic).toBe('Coba Ubah Nomor');
    });

    it('Concurrency Integrity: rejects date change if attendance was linked concurrently before transaction commits', async () => {
      // 1. Initial query check sees 0 attendance records
      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      // 2. But during/inside the transaction, a concurrent saveSubjectAttendance linked attendance and set attendanceSummary
      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            if (ref.path.includes('meetings/meet-1')) {
              return {
                exists: () => true,
                data: () => ({
                  ...mockExistingMeeting,
                  attendanceSummary: {
                    present: 20,
                    sick: 1,
                    permitted: 0,
                    absent: 0,
                    dispensation: 0,
                    total: 21,
                    presentPercentage: 95.2,
                  },
                }),
              };
            }
            return mockGetDoc(ref);
          }),
          set: vi.fn(),
          update: vi.fn().mockImplementation((ref: any, data: any) => {
            mockUpdateDoc(ref, data);
          }),
          delete: vi.fn(),
        };
        return cb(tx);
      });

      // 3. Attempt to update meeting date concurrently must be aborted
      await expect(
        updateMeeting(uid, meetingId, {
          date: '2026-10-15',
          topic: 'Topik Baru',
        })
      ).rejects.toThrow('Tanggal jurnal tidak dapat diubah karena masih terhubung dengan presensi siswa. Lepaskan tautan presensi dan simpan terlebih dahulu untuk mengubah tanggal.');

      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });

  describe('Legacy Mismatched Unlink (Criteria 10)', () => {
    it('Criteria 10: unlinking a legacy date-mismatched record succeeds without changing attendance date', async () => {
      const unlinkPayload: SaveSubjectAttendancePayload = {
        academicYearId: 'ay-2026',
        semester: 'GANJIL',
        classId: 'cls-1',
        teachingAssignmentId: 'ta-1',
        subjectId: 'sub-1',
        date: '2026-10-12', // Attendance session date differs from meeting date (2026-10-10)
        meetingId: null, // Selecting "-- Tidak ditautkan --"
        expectedPreviousMeetingId: 'meet-1',
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

      // Mock existing session records query
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ studentId: 'std-1' }) }],
      });

      let updatedRecordPayload: any = null;
      let updatedOldMeetingPayload: any = null;

      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const tx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            if (ref.path.includes('meetings/meet-1')) {
              return {
                exists: () => true,
                data: () => ({
                  id: 'meet-1',
                  teachingAssignmentId: 'ta-1',
                  date: '2026-10-10', // Mismatched date
                  status: 'COMPLETED',
                }),
              };
            }
            return {
              exists: () => true,
              data: () => ({
                meetingId: 'meet-1',
                date: '2026-10-12', // Attendance original date
                studentId: 'std-1',
              }),
            };
          }),
          set: vi.fn().mockImplementation((_ref: any, data: any) => {
            updatedRecordPayload = data;
          }),
          update: vi.fn().mockImplementation((ref: any, data: any) => {
            if (ref.path.includes('meetings/meet-1')) {
              updatedOldMeetingPayload = data;
            }
          }),
        };
        return cb(tx);
      });

      const result = await saveSubjectAttendance(uid, unlinkPayload);

      // Verify unlinking succeeded
      expect(result.present).toBe(1);
      expect(updatedOldMeetingPayload).toEqual(
        expect.objectContaining({
          attendanceSummary: null,
        })
      );
      // Verify attendance record unlinked and original date preserved
      expect(updatedRecordPayload.meetingId).toBeNull();
      expect(updatedRecordPayload.meetingNumber).toBeNull();
      expect(updatedRecordPayload.date).toBe('2026-10-12');
      expect(updatedRecordPayload.status).toBe('PRESENT');
    });
  });
});
