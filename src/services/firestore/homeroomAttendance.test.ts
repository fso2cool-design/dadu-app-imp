import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceStatus } from '../../types';
import type { SaveDailyAttendanceItem } from '../../domain/homeroomAttendance.types';

// Mock state and tracking
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockWriteBatch = vi.fn(() => ({
  set: mockBatchSet,
  commit: mockBatchCommit,
}));

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
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...segments: string[]) => mockDoc(_db, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  query: (coll: any) => mockQuery(coll),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (q: any) => mockGetDocs(q),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: () => mockWriteBatch(),
  getDoc: (ref: any) => mockGetDoc(ref),
  setDoc: vi.fn(),
  orderBy: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

import { saveDailyAttendance } from './homeroomAttendance';

describe('Firestore Homeroom Attendance Service — saveDailyAttendance()', () => {
  const uid = 'teacher-1';
  const academicYearId = 'ay-2026';
  const classId = 'cls-7a';
  const className = '7A';
  const date = '2026-10-10';

  const validItems: SaveDailyAttendanceItem[] = [
    {
      studentId: 'stud-1',
      studentName: 'Siswa Satu',
      rollNumber: 1,
      gender: 'L',
      status: 'PRESENT',
      note: '',
    },
    {
      studentId: 'stud-2',
      studentName: 'Siswa Dua',
      rollNumber: 2,
      gender: 'P',
      status: 'SICK',
      note: 'Demam',
    },
    {
      studentId: 'stud-3',
      studentName: 'Siswa Tiga',
      rollNumber: 3,
      gender: 'L',
      status: 'PERMITTED',
      note: 'Acara keluarga',
    },
    {
      studentId: 'stud-4',
      studentName: 'Siswa Empat',
      rollNumber: 4,
      gender: 'P',
      status: 'ABSENT',
      note: '',
    },
    {
      studentId: 'stud-5',
      studentName: 'Siswa Lima',
      rollNumber: 5,
      gender: 'L',
      status: 'DISPENSATION',
      note: 'Lomba sains',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ isArchived: false, academicYearId }),
    });
  });

  describe('Pre-write Boundary Validations', () => {
    it('rejects empty uid', async () => {
      await expect(
        saveDailyAttendance('', academicYearId, classId, className, date, validItems)
      ).rejects.toThrow('ID Pengguna (guru) wajib diisi');
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('rejects missing metadata (academicYearId, classId, or date)', async () => {
      await expect(
        saveDailyAttendance(uid, '', classId, className, date, validItems)
      ).rejects.toThrow('Data sesi presensi harian tidak lengkap');
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('rejects empty items roster', async () => {
      await expect(
        saveDailyAttendance(uid, academicYearId, classId, className, date, [])
      ).rejects.toThrow('Roster siswa tidak boleh kosong');
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('rejects duplicate student IDs', async () => {
      const duplicateItems: SaveDailyAttendanceItem[] = [
        { studentId: 'stud-dup', rollNumber: 1, status: 'PRESENT' },
        { studentId: 'stud-dup', rollNumber: 2, status: 'SICK' },
      ];
      await expect(
        saveDailyAttendance(uid, academicYearId, classId, className, date, duplicateItems)
      ).rejects.toThrow('Duplikasi ID Siswa terdeteksi (stud-dup)');
      expect(mockWriteBatch).not.toHaveBeenCalled();
    });

    it('rejects null status and occurs BEFORE any Firestore write', async () => {
      const itemsWithNull: any[] = [
        { studentId: 'stud-1', rollNumber: 1, status: null },
      ];
      await expect(
        saveDailyAttendance(uid, academicYearId, classId, className, date, itemsWithNull)
      ).rejects.toThrow('Status presensi tidak sah (null)');
      expect(mockWriteBatch).not.toHaveBeenCalled();
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('rejects undefined/missing status and occurs BEFORE any Firestore write', async () => {
      const itemsWithUndefined: any[] = [
        { studentId: 'stud-1', rollNumber: 1 },
      ];
      await expect(
        saveDailyAttendance(uid, academicYearId, classId, className, date, itemsWithUndefined)
      ).rejects.toThrow('Status presensi tidak sah (undefined)');
      expect(mockWriteBatch).not.toHaveBeenCalled();
      expect(mockGetDoc).not.toHaveBeenCalled();
    });

    it('rejects unsupported status values', async () => {
      const itemsWithInvalid: any[] = [
        { studentId: 'stud-1', rollNumber: 1, status: 'HADIR_SEBAGIAN' },
      ];
      await expect(
        saveDailyAttendance(uid, academicYearId, classId, className, date, itemsWithInvalid)
      ).rejects.toThrow('Status presensi tidak sah (HADIR_SEBAGIAN)');
      expect(mockWriteBatch).not.toHaveBeenCalled();
      expect(mockGetDoc).not.toHaveBeenCalled();
    });
  });

  describe('Correct Summary & Record Consistency', () => {
    it('saves valid statuses and derives summary counts matching exact persisted records', async () => {
      const summary = await saveDailyAttendance(
        uid,
        academicYearId,
        classId,
        className,
        date,
        validItems,
        'Catatan sesi wali kelas'
      );

      // Verify returned summary
      expect(summary).toEqual({
        present: 1,
        sick: 1,
        permitted: 1,
        absent: 1,
        dispensation: 1,
        total: 5,
        presentPercentage: 40, // (1 present + 1 dispensation) / 5 * 100 = 40%
      });

      // Verify persisted records in writeBatch
      expect(mockBatchSet).toHaveBeenCalledTimes(6); // 5 student records + 1 session document

      // Find all student record writes
      const studentRecordCalls = mockBatchSet.mock.calls.slice(0, 5);
      const persistedStatuses = studentRecordCalls.map((call: any) => call[1].status);

      expect(persistedStatuses).toEqual(['PRESENT', 'SICK', 'PERMITTED', 'ABSENT', 'DISPENSATION']);

      // Ensure no fallback was used
      expect(persistedStatuses[1]).toBe('SICK');
      expect(persistedStatuses[2]).toBe('PERMITTED');
      expect(persistedStatuses[3]).toBe('ABSENT');
      expect(persistedStatuses[4]).toBe('DISPENSATION');

      // Verify session document write
      const sessionDocCall = mockBatchSet.mock.calls[5];
      expect(sessionDocCall[1].summary).toEqual(summary);
      expect(sessionDocCall[1].notes).toBe('Catatan sesi wali kelas');

      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it('supports explicit bulk-setting to PRESENT without state discrepancy', async () => {
      const allPresentItems: SaveDailyAttendanceItem[] = [
        { studentId: 'stud-1', rollNumber: 1, status: 'PRESENT' },
        { studentId: 'stud-2', rollNumber: 2, status: 'PRESENT' },
        { studentId: 'stud-3', rollNumber: 3, status: 'PRESENT' },
      ];

      const summary = await saveDailyAttendance(
        uid,
        academicYearId,
        classId,
        className,
        date,
        allPresentItems
      );

      expect(summary.present).toBe(3);
      expect(summary.total).toBe(3);
      expect(summary.presentPercentage).toBe(100);

      const studentRecordCalls = mockBatchSet.mock.calls.slice(0, 3);
      for (const call of studentRecordCalls) {
        expect(call[1].status).toBe('PRESENT');
      }
    });
  });
});
