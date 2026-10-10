import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceStatus, Meeting } from '../../types';
import type { SaveAttendanceItem, SaveSubjectAttendancePayload } from '../../domain/attendance.types';

// Mock state and transaction runner
const mockRunTransaction = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));
const mockCollection = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
}));
const mockQuery = vi.fn((coll: any) => coll);
const mockWhere = vi.fn((...args: any[]) => args);
const mockServerTimestamp = vi.fn(() => 'MOCK_SERVER_TIMESTAMP');
const mockGetDoc = vi.fn().mockResolvedValue({
  exists: () => true,
  data: () => ({ isArchived: false }),
});

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...segments: string[]) => mockDoc(_db, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  query: (coll: any) => mockQuery(coll),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (q: any) => mockGetDocs(q),
  runTransaction: (db: any, cb: any) => mockRunTransaction(db, cb),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: vi.fn(),
  getDoc: (ref: any) => mockGetDoc(ref),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

import { saveSubjectAttendance, sanitizeRecordedBy } from './attendance';

describe('Firestore Attendance Service — saveSubjectAttendance()', () => {
  const uid = 'teacher-1';
  const basePayload: SaveSubjectAttendancePayload = {
    academicYearId: '2026/2027',
    semester: 'GANJIL',
    teachingAssignmentId: 'assign-1',
    classId: 'class-1',
    subjectId: 'sub-1',
    date: '2026-10-10',
    meetingId: 'meet-1',
    expectedPreviousMeetingId: null,
    items: [
      {
        studentId: 'stud-1',
        studentName: 'Siswa 1',
        rollNumber: 1,
        gender: 'L',
        status: 'PRESENT',
        note: '',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ isArchived: false }),
    });
  });

  describe('Pre-transaction validations (AC-9 & residual risk check)', () => {
    it('rejects empty items roster', async () => {
      await expect(
        saveSubjectAttendance(uid, { ...basePayload, items: [] })
      ).rejects.toThrow('Roster siswa tidak boleh kosong');
    });

    it('rejects roster exceeding 200 students', async () => {
      const items: SaveAttendanceItem[] = Array.from({ length: 201 }, (_, i) => ({
        studentId: `stud-${i}`,
        studentName: `Siswa ${i}`,
        rollNumber: i + 1,
        gender: 'L',
        status: 'PRESENT',
        note: '',
      }));
      await expect(
        saveSubjectAttendance(uid, { ...basePayload, items })
      ).rejects.toThrow('maksimum 200 siswa');
    });

    it('rejects duplicate student IDs in items', async () => {
      const items: SaveAttendanceItem[] = [
        {
          studentId: 'stud-dup',
          studentName: 'Siswa 1',
          rollNumber: 1,
          gender: 'L',
          status: 'PRESENT',
          note: '',
        },
        {
          studentId: 'stud-dup',
          studentName: 'Siswa 2',
          rollNumber: 2,
          gender: 'P',
          status: 'PRESENT',
          note: '',
        },
      ];
      await expect(
        saveSubjectAttendance(uid, { ...basePayload, items })
      ).rejects.toThrow('Duplikasi ID Siswa');
    });

    it('rejects empty studentId', async () => {
      const items: SaveAttendanceItem[] = [
        {
          studentId: '   ',
          studentName: 'Siswa 1',
          rollNumber: 1,
          gender: 'L',
          status: 'PRESENT',
          note: '',
        },
      ];
      await expect(
        saveSubjectAttendance(uid, { ...basePayload, items })
      ).rejects.toThrow('ID Siswa wajib diisi');
    });

    it('rejects invalid attendance status and NEVER coerces to PRESENT (AC-9)', async () => {
      const items: SaveAttendanceItem[] = [
        {
          studentId: 'stud-1',
          studentName: 'Siswa 1',
          rollNumber: 1,
          gender: 'L',
          status: 'INVALID_STATUS' as AttendanceStatus,
          note: '',
        },
      ];
      await expect(
        saveSubjectAttendance(uid, { ...basePayload, items })
      ).rejects.toThrow('Status presensi tidak sah');
    });

    it('rejects if extra stored records exist in DB that are not in items (residual risk check)', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ studentId: 'stud-1' }) },
          { data: () => ({ studentId: 'stud-unknown-db' }) },
        ],
      });

      await expect(
        saveSubjectAttendance(uid, basePayload)
      ).rejects.toThrow('Rekonsiliasi gagal');
    });
  });

  describe('In-transaction domain logic & safety', () => {
    // Setup helper for transaction execution
    const runTxWithMock = (setupTx: (tx: any) => void) => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ studentId: 'stud-1' }) }],
      });

      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const mockTx = {
          get: vi.fn(),
          set: vi.fn(),
          update: vi.fn(),
        };
        setupTx(mockTx);
        return cb(mockTx);
      });
    };

    it('AC-7: Target meeting validation matrix (SCHEDULED -> COMPLETED)', async () => {
      runTxWithMock((tx) => {
        tx.get.mockImplementation(async (ref: any) => {
          if (ref.path.includes('meetings')) {
            return {
              exists: () => true,
              data: () => ({
                id: 'meet-1',
                teachingAssignmentId: 'assign-1',
                date: '2026-10-10',
                status: 'SCHEDULED',
              }),
            };
          }
          return {
            exists: () => false,
            data: () => ({}),
          };
        });
      });

      const summary = await saveSubjectAttendance(uid, basePayload);
      expect(summary.present).toBe(1);
      expect(summary.total).toBe(1);
    });

    it('AC-7: Rejects target meeting with DRAFT status', async () => {
      runTxWithMock((tx) => {
        tx.get.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            id: 'meet-1',
            teachingAssignmentId: 'assign-1',
            date: '2026-10-10',
            status: 'DRAFT',
          }),
        });
      });

      await expect(saveSubjectAttendance(uid, basePayload)).rejects.toThrow(
        'tidak dapat ditautkan karena berstatus DRAFT'
      );
    });

    it('AC-7: Rejects target meeting with CANCELLED status', async () => {
      runTxWithMock((tx) => {
        tx.get.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            id: 'meet-1',
            teachingAssignmentId: 'assign-1',
            date: '2026-10-10',
            status: 'CANCELLED',
          }),
        });
      });

      await expect(saveSubjectAttendance(uid, basePayload)).rejects.toThrow(
        'tidak dapat ditautkan karena berstatus CANCELLED'
      );
    });

    it('AC-8: Optimistic drift check fails if actual persistent relation differs from expectedPreviousMeetingId', async () => {
      runTxWithMock((tx) => {
        tx.get.mockImplementation(async (ref: any) => {
          if (ref.path.includes('meetings')) {
            return {
              exists: () => true,
              data: () => ({
                id: 'meet-1',
                teachingAssignmentId: 'assign-1',
                date: '2026-10-10',
                status: 'SCHEDULED',
              }),
            };
          }
          return {
            exists: () => true,
            data: () => ({
              meetingId: 'meet-999',
            }),
          };
        });
      });

      await expect(saveSubjectAttendance(uid, basePayload)).rejects.toThrow(
        'OPTIMISTIC_CONCURRENCY_ERROR'
      );
    });

    it('AC-10: Rejects mixed or split meeting relations in stored records', async () => {
      const payloadTwo: SaveSubjectAttendancePayload = {
        ...basePayload,
        items: [
          {
            studentId: 'stud-1',
            studentName: 'Siswa 1',
            rollNumber: 1,
            gender: 'L',
            status: 'PRESENT',
            note: '',
          },
          {
            studentId: 'stud-2',
            studentName: 'Siswa 2',
            rollNumber: 2,
            gender: 'P',
            status: 'PRESENT',
            note: '',
          },
        ],
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ studentId: 'stud-1' }) },
          { data: () => ({ studentId: 'stud-2' }) },
        ],
      });

      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            if (ref.path.includes('meetings')) {
              return {
                exists: () => true,
                data: () => ({
                  id: 'meet-1',
                  teachingAssignmentId: 'assign-1',
                  date: '2026-10-10',
                  status: 'SCHEDULED',
                }),
              };
            }
            if (ref.path.includes('stud-1')) {
              return { exists: () => true, data: () => ({ meetingId: 'meet-A' }) };
            }
            return { exists: () => true, data: () => ({ meetingId: 'meet-B' }) };
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        return cb(mockTx);
      });

      await expect(saveSubjectAttendance(uid, payloadTwo)).rejects.toThrow(
        'bercampur/terpecah'
      );
    });

    it('AC-11: Preserves createdAt and historical metadata on existing documents', async () => {
      let writtenData: any = null;

      runTxWithMock((tx) => {
        tx.get.mockImplementation(async (ref: any) => {
          if (ref.path.includes('meetings')) {
            return {
              exists: () => true,
              data: () => ({
                id: 'meet-1',
                teachingAssignmentId: 'assign-1',
                date: '2026-10-10',
                status: 'SCHEDULED',
              }),
            };
          }
          return {
            exists: () => true,
            data: () => ({
              id: 'att-1',
              createdAt: 'HISTORICAL_CREATED_AT_2025',
              recordedBy: 'teacher-historic',
              customField: 'preserved',
              meetingId: null,
            }),
          };
        });

        tx.set.mockImplementation((_ref: any, data: any) => {
          if (data.studentId === 'stud-1') {
            writtenData = data;
          }
        });
      });

      await saveSubjectAttendance(uid, basePayload);

      expect(writtenData).toBeDefined();
      expect(writtenData.createdAt).toBe('HISTORICAL_CREATED_AT_2025');
      expect(writtenData.recordedBy).toBe('teacher-historic');
      expect(writtenData.updatedAt).toBe('MOCK_SERVER_TIMESTAMP');
      expect(writtenData.meetingId).toBe('meet-1');
    });

    it('AC-5: Moving link from old meeting to new meeting clears old summary without altering old status', async () => {
      let oldMeetingUpdate: any = null;
      let newMeetingUpdate: any = null;

      const movePayload: SaveSubjectAttendancePayload = {
        ...basePayload,
        meetingId: 'meet-target-B',
        expectedPreviousMeetingId: 'meet-old-A',
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ studentId: 'stud-1' }) }],
      });

      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            if (ref.path.includes('meet-target-B')) {
              return {
                exists: () => true,
                data: () => ({
                  id: 'meet-target-B',
                  teachingAssignmentId: 'assign-1',
                  date: '2026-10-10',
                  status: 'SCHEDULED',
                }),
              };
            }
            if (ref.path.includes('meet-old-A')) {
              return {
                exists: () => true,
                data: () => ({
                  id: 'meet-old-A',
                  teachingAssignmentId: 'assign-1',
                  date: '2026-10-10',
                  status: 'COMPLETED',
                  attendanceSummary: { present: 1, total: 1 },
                }),
              };
            }
            return {
              exists: () => true,
              data: () => ({
                meetingId: 'meet-old-A',
              }),
            };
          }),
          set: vi.fn(),
          update: vi.fn().mockImplementation((ref: any, data: any) => {
            if (ref.path.includes('meet-old-A')) {
              oldMeetingUpdate = data;
            } else if (ref.path.includes('meet-target-B')) {
              newMeetingUpdate = data;
            }
          }),
        };
        return cb(mockTx);
      });

      await saveSubjectAttendance(uid, movePayload);

      // Old meeting: attendanceSummary is cleared to null, status is NOT altered
      expect(oldMeetingUpdate).toEqual(
        expect.objectContaining({
          attendanceSummary: null,
        })
      );
      expect(oldMeetingUpdate.status).toBeUndefined();

      // New meeting: attendanceSummary updated, status updated to COMPLETED
      expect(newMeetingUpdate).toEqual({
        attendanceSummary: expect.objectContaining({ present: 1, total: 1 }),
        status: 'COMPLETED',
        updatedAt: 'MOCK_SERVER_TIMESTAMP',
      });
    });

    it('AC-6: Unlinking clears old meeting summary to null without changing old meeting status', async () => {
      let oldMeetingUpdate: any = null;

      const unlinkPayload: SaveSubjectAttendancePayload = {
        ...basePayload,
        meetingId: null,
        expectedPreviousMeetingId: 'meet-old-A',
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ studentId: 'stud-1' }) }],
      });

      mockRunTransaction.mockImplementationOnce(async (_db: any, cb: any) => {
        const mockTx = {
          get: vi.fn().mockImplementation(async (ref: any) => {
            if (ref.path.includes('meet-old-A')) {
              return {
                exists: () => true,
                data: () => ({
                  id: 'meet-old-A',
                  teachingAssignmentId: 'assign-1',
                  date: '2026-10-10',
                  status: 'COMPLETED',
                  attendanceSummary: { present: 1, total: 1 },
                }),
              };
            }
            return {
              exists: () => true,
              data: () => ({
                meetingId: 'meet-old-A',
              }),
            };
          }),
          set: vi.fn(),
          update: vi.fn().mockImplementation((ref: any, data: any) => {
            if (ref.path.includes('meet-old-A')) {
              oldMeetingUpdate = data;
            }
          }),
        };
        return cb(mockTx);
      });

      await saveSubjectAttendance(uid, unlinkPayload);

      expect(oldMeetingUpdate).toEqual(
        expect.objectContaining({
          attendanceSummary: null,
        })
      );
      expect(oldMeetingUpdate.status).toBeUndefined();
    });
  });

  describe('sanitizeRecordedBy()', () => {
    const fallbackUid = 'current-teacher-uid';

    it('retains valid non-empty string without whitespace', () => {
      expect(sanitizeRecordedBy('teacher-123', fallbackUid)).toBe('teacher-123');
      expect(sanitizeRecordedBy('user_xyz', fallbackUid)).toBe('user_xyz');
    });

    it('falls back to currentUid when input is empty string', () => {
      expect(sanitizeRecordedBy('', fallbackUid)).toBe(fallbackUid);
    });

    it('falls back to currentUid when input is whitespace-only string', () => {
      expect(sanitizeRecordedBy('   ', fallbackUid)).toBe(fallbackUid);
      expect(sanitizeRecordedBy("\t\n", fallbackUid)).toBe(fallbackUid);
    });

    it('falls back to currentUid when input has whitespace inside', () => {
      expect(sanitizeRecordedBy('teacher 123', fallbackUid)).toBe(fallbackUid);
      expect(sanitizeRecordedBy(' teacher123 ', fallbackUid)).toBe(fallbackUid);
    });

    it('falls back to currentUid when input is null, undefined, or non-string', () => {
      expect(sanitizeRecordedBy(null, fallbackUid)).toBe(fallbackUid);
      expect(sanitizeRecordedBy(undefined, fallbackUid)).toBe(fallbackUid);
      expect(sanitizeRecordedBy(12345, fallbackUid)).toBe(fallbackUid);
      expect(sanitizeRecordedBy({}, fallbackUid)).toBe(fallbackUid);
      expect(sanitizeRecordedBy(true, fallbackUid)).toBe(fallbackUid);
    });
  });
});
