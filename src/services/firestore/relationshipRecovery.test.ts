import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Student } from '../../types';

// Mock Firestore transaction
const mockTransactionGet = vi.fn();
const mockTransactionSet = vi.fn();
const mockTransactionUpdate = vi.fn();
const mockTransactionDelete = vi.fn();

const mockRunTransaction = vi.fn((_db: any, callback: (tx: any) => Promise<any>) => {
  return callback({
    get: mockTransactionGet,
    set: mockTransactionSet,
    update: mockTransactionUpdate,
    delete: mockTransactionDelete,
  });
});

const mockDoc = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
  id: segments[segments.length - 1],
}));
const mockCollection = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
}));
const mockQuery = vi.fn((coll: any) => coll);
const mockWhere = vi.fn((...args: any[]) => args);
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });
const mockServerTimestamp = vi.fn(() => 'MOCK_TIMESTAMP');

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...segments: string[]) => mockDoc(_db, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  query: (coll: any) => mockQuery(coll),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (q: any) => mockGetDocs(q),
  runTransaction: (_db: any, cb: any) => mockRunTransaction(_db, cb),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

import { relinkStudentRelationship } from './relationshipRecovery';

describe('Firestore Relationship Recovery Service — attendanceRecords compatibility', () => {
  const uid = 'teacher-1';

  const validTargetStudent: Student = {
    id: 'student-target',
    fullName: 'Siti Rahma Target',
    nis: '2001',
    nisn: '0098765432',
    gender: 'P',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const orphanAttendanceData = {
    studentId: 'student-orphan',
    studentName: 'Siswa Yatim Lama',
    academicYearId: 'ay26',
    semester: 'GANJIL',
    classId: 'cls-10a',
    date: '2026-10-10',
    subjectId: 'sub-mtk',
    teachingAssignmentId: 'ta-01',
    status: 'PRESENT',
    rollNumber: 12,
    recordedBy: uid,
    createdAt: '2026-10-10T07:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects relinking ATTENDANCE if target student already has a record for the session (prevents conflict)', async () => {
    mockTransactionGet.mockImplementation((ref: any) => {
      // 1. Transaction document (attendanceRecords)
      if (ref.path.includes('attendanceRecords/orphan-doc-1')) {
        return Promise.resolve({
          exists: () => true,
          data: () => orphanAttendanceData,
        });
      }
      // 2. Target student document
      if (ref.path.includes('students/student-target')) {
        return Promise.resolve({
          exists: () => true,
          data: () => validTargetStudent,
        });
      }
      // 3. Target attendance record (already exists!)
      if (ref.path.includes('ay26_GANJIL_cls-10a_2026-10-10_ta-01_student-target')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ ...orphanAttendanceData, studentId: 'student-target' }),
        });
      }
      return Promise.resolve({ exists: () => false, data: () => null });
    });

    await expect(
      relinkStudentRelationship(uid, {
        targetType: 'ATTENDANCE',
        documentId: 'orphan-doc-1',
        targetStudentId: 'student-target',
        performedBy: 'admin',
      })
    ).rejects.toThrow(/sudah memiliki rekam presensi pada pertemuan\/sesi ini/);

    // No write or delete must have executed
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(mockTransactionDelete).not.toHaveBeenCalled();
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('atomically sets new record with deterministic ID and deletes orphan document when target student has no record', async () => {
    mockTransactionGet.mockImplementation((ref: any) => {
      if (ref.path.includes('attendanceRecords/orphan-doc-1')) {
        return Promise.resolve({
          exists: () => true,
          data: () => orphanAttendanceData,
        });
      }
      if (ref.path.includes('students/student-target')) {
        return Promise.resolve({
          exists: () => true,
          data: () => validTargetStudent,
        });
      }
      // Target attendance does not exist
      return Promise.resolve({ exists: () => false, data: () => null });
    });

    await relinkStudentRelationship(uid, {
      targetType: 'ATTENDANCE',
      documentId: 'orphan-doc-1',
      targetStudentId: 'student-target',
      performedBy: 'admin',
    });

    // CRITICAL: Must NOT call transaction.update on attendance document!
    expect(mockTransactionUpdate).not.toHaveBeenCalled();

    // Must call transaction.set on target deterministic ID
    expect(mockTransactionSet).toHaveBeenCalledTimes(1);
    const [setRef, setData] = mockTransactionSet.mock.calls[0];
    expect(setRef.id).toBe('ay26_GANJIL_cls-10a_2026-10-10_ta-01_student-target');
    expect(setData.studentId).toBe('student-target');
    expect(setData.studentName).toBe('Siti Rahma Target');
    expect(setData.rollNumber).toBe(12);
    expect(setData.gender).toBe('P');
    expect(setData.recordedBy).toBe(uid);

    // Must NOT contain disallowed fields like relinkedAt, relinkedBy, etc.
    expect(setData).not.toHaveProperty('relinkedAt');
    expect(setData).not.toHaveProperty('relinkedBy');
    expect(setData).not.toHaveProperty('relinkedFromId');
    expect(setData).not.toHaveProperty('relinkedToId');
    expect(setData).not.toHaveProperty('relinkReason');

    // Must delete old orphan document
    expect(mockTransactionDelete).toHaveBeenCalledTimes(1);
    const [delRef] = mockTransactionDelete.mock.calls[0];
    expect(delRef.id).toBe('orphan-doc-1');
  });

  it('maintains standard update with relinkedAt audit trail for non-attendance records (e.g. SCORE)', async () => {
    mockTransactionGet.mockImplementation((ref: any) => {
      if (ref.path.includes('scores/score-doc-1')) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            studentId: 'student-orphan',
            assessmentItemId: 'item-1',
            score: 85,
          }),
        });
      }
      if (ref.path.includes('students/student-target')) {
        return Promise.resolve({
          exists: () => true,
          data: () => validTargetStudent,
        });
      }
      return Promise.resolve({ exists: () => false, data: () => null });
    });

    await relinkStudentRelationship(uid, {
      targetType: 'SCORE',
      documentId: 'score-doc-1',
      targetStudentId: 'student-target',
      performedBy: 'admin',
      reason: 'Koreksi relasi nilai',
    });

    // Score uses standard transaction.update with relinkedAt
    expect(mockTransactionUpdate).toHaveBeenCalledTimes(1);
    const [updateRef, updatePayload] = mockTransactionUpdate.mock.calls[0];
    expect(updateRef.id).toBe('score-doc-1');
    expect(updatePayload.studentId).toBe('student-target');
    expect(updatePayload).toHaveProperty('relinkedAt');
    expect(updatePayload.relinkedBy).toBe('admin');
    expect(updatePayload.relinkReason).toBe('Koreksi relasi nilai');

    // No set or delete for Score
    expect(mockTransactionSet).not.toHaveBeenCalled();
    expect(mockTransactionDelete).not.toHaveBeenCalled();
  });
});
