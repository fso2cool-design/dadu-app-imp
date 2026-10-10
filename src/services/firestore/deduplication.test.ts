import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Student } from '../../types';

// Mock Firestore
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockCommit = vi.fn().mockResolvedValue(undefined);

const mockBatch = {
  update: mockUpdate,
  set: mockSet,
  delete: mockDelete,
  commit: mockCommit,
};

const mockGetDocs = vi.fn();
const mockDoc = vi.fn((_db: any, ...segments: string[]) => {
  const basePath = typeof _db === 'object' && _db?.path ? _db.path : '';
  const fullPath = [basePath, ...segments].filter(Boolean).join('/');
  return {
    path: fullPath,
    id: segments[segments.length - 1],
  };
});
const mockCollection = vi.fn((_db: any, ...segments: string[]) => ({
  path: segments.join('/'),
  name: segments[segments.length - 1],
}));
const mockQuery = vi.fn((coll: any, ...clauses: any[]) => ({
  ...coll,
  clauses,
}));
const mockWhere = vi.fn((...args: any[]) => args);
const mockServerTimestamp = vi.fn(() => 'MOCK_TIMESTAMP');

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, ...segments: string[]) => mockDoc(_db, ...segments),
  collection: (_db: any, ...segments: string[]) => mockCollection(_db, ...segments),
  query: (coll: any, ...args: any[]) => mockQuery(coll, ...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (q: any) => mockGetDocs(q),
  writeBatch: () => mockBatch,
  serverTimestamp: () => mockServerTimestamp(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('../firebase/config', () => ({
  db: { type: 'firestore' },
}));

import { executeZeroResidueDeduplication } from './deduplication';

describe('Firestore Deduplication Service — attendanceRecords compatibility', () => {
  const uid = 'teacher-owner';

  const masterStudent: Student = {
    id: 'master-01',
    fullName: 'Budi Santoso Master',
    nis: '1001',
    nisn: '0012345678',
    gender: 'L',
    status: 'ACTIVE',
    address: 'Jl. Merdeka No. 1',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  const dupStudent: Student = {
    id: 'dup-01',
    fullName: 'Budi S Duplikat',
    nis: '1001',
    nisn: '0012345678',
    gender: 'L',
    status: 'ACTIVE',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles attendanceRecords: deletes duplicate when master already has record; sets new record & deletes old when master does not', async () => {
    const existingMasterAttId = 'ay26_GANJIL_class1_2026-10-01_ta1_master-01';
    const dupAttSession1Id = 'ay26_GANJIL_class1_2026-10-01_ta1_dup-01';
    const dupAttSession2Id = 'ay26_GANJIL_class1_2026-10-02_ta1_dup-01';
    const expectedNewMasterAttId = 'ay26_GANJIL_class1_2026-10-02_ta1_master-01';

    // Mock getDocs responses based on query clauses
    mockGetDocs.mockImplementation((q: any) => {
      const path = q?.path || '';

      if (path.includes('students')) {
        return Promise.resolve({
          docs: [
            { id: masterStudent.id, ref: { path: `users/${uid}/students/${masterStudent.id}`, id: masterStudent.id }, data: () => masterStudent },
            { id: dupStudent.id, ref: { path: `users/${uid}/students/${dupStudent.id}`, id: dupStudent.id }, data: () => dupStudent },
          ],
        });
      }

      if (path.includes('enrollments')) {
        return Promise.resolve({ docs: [] });
      }

      if (path.includes('attendanceRecords')) {
        const isMasterQuery = q.clauses?.some(
          (clause: any[]) => clause[0] === 'studentId' && clause[2] === 'master-01'
        );

        if (isMasterQuery) {
          return Promise.resolve({
            docs: [
              {
                id: existingMasterAttId,
                ref: { path: `users/${uid}/attendanceRecords/${existingMasterAttId}`, id: existingMasterAttId },
                data: () => ({
                  studentId: 'master-01',
                  academicYearId: 'ay26',
                  semester: 'GANJIL',
                  classId: 'class1',
                  date: '2026-10-01',
                  teachingAssignmentId: 'ta1',
                  status: 'PRESENT',
                  recordedBy: uid,
                }),
              },
            ],
          });
        }

        // Querying duplicate's attendance (studentId == dup-01)
        return Promise.resolve({
          docs: [
            // Session 1: Master already has this
            {
              id: dupAttSession1Id,
              ref: { path: `users/${uid}/attendanceRecords/${dupAttSession1Id}`, id: dupAttSession1Id },
              data: () => ({
                studentId: 'dup-01',
                academicYearId: 'ay26',
                semester: 'GANJIL',
                classId: 'class1',
                date: '2026-10-01',
                teachingAssignmentId: 'ta1',
                status: 'SICK',
                recordedBy: uid,
              }),
            },
            // Session 2: Master does not have this
            {
              id: dupAttSession2Id,
              ref: { path: `users/${uid}/attendanceRecords/${dupAttSession2Id}`, id: dupAttSession2Id },
              data: () => ({
                studentId: 'dup-01',
                academicYearId: 'ay26',
                semester: 'GANJIL',
                classId: 'class1',
                date: '2026-10-02',
                teachingAssignmentId: 'ta1',
                status: 'PERMITTED',
                note: 'Izin lomba',
                rollNumber: 15,
                recordedBy: uid,
              }),
            },
          ],
        });
      }

      // Default empty docs for scores, dailyAttendanceRecords, notes
      return Promise.resolve({ docs: [] });
    });

    const result = await executeZeroResidueDeduplication(uid);

    expect(result.deletedStudentsCount).toBe(1);

    // CRITICAL SECURITY ASSERTION:
    // No UPDATE call must ever be made to attendanceRecords with studentId!
    const attendanceUpdates = mockUpdate.mock.calls.filter(([ref, _data]) =>
      ref?.path?.includes('attendanceRecords')
    );
    expect(attendanceUpdates).toHaveLength(0);

    // Verify session 1 (duplicate to master): deleted, not overwritten
    const deletedPaths = mockDelete.mock.calls.map(([ref]) => ref?.path);
    expect(deletedPaths).toContain(`users/${uid}/attendanceRecords/${dupAttSession1Id}`);

    // Verify session 2 (absent on master): created via SET for master with deterministic ID
    const setCalls = mockSet.mock.calls.filter(([ref, _data]) =>
      ref?.path?.includes('attendanceRecords')
    );
    expect(setCalls).toHaveLength(1);

    const [setRef, setData] = setCalls[0];
    expect(setRef.id).toBe(expectedNewMasterAttId);
    expect(setData.studentId).toBe('master-01');
    expect(setData.studentName).toBe('Budi Santoso Master');
    expect(setData.academicYearId).toBe('ay26');
    expect(setData.classId).toBe('class1');
    expect(setData.date).toBe('2026-10-02');
    expect(setData.semester).toBe('GANJIL');
    expect(setData.status).toBe('PERMITTED');
    expect(setData.note).toBe('Izin lomba');
    expect(setData.rollNumber).toBe(15);
    expect(setData.recordedBy).toBe(uid);

    // Old duplicate record for session 2 must also be scheduled for DELETE
    expect(deletedPaths).toContain(`users/${uid}/attendanceRecords/${dupAttSession2Id}`);

    // Duplicate student document itself must also be deleted
    expect(deletedPaths).toContain(`users/${uid}/students/${dupStudent.id}`);

    // Batch must be committed
    expect(mockCommit).toHaveBeenCalled();
  });
  it('handles dailyAttendanceRecords: preserves master record and enriches notes without data loss when conflict; sets new record & deletes old when master does not have record', async () => {
    const existingMasterDailyAttId = 'ay26_class1_2026-10-01_master-01';
    const dupDailySession1Id = 'ay26_class1_2026-10-01_dup-01';
    const dupDailySession2Id = 'ay26_class1_2026-10-02_dup-01';
    const expectedNewMasterDailyAttId = 'ay26_class1_2026-10-02_master-01';

    mockGetDocs.mockImplementation((q: any) => {
      const path = q?.path || '';

      if (path.includes('students')) {
        return Promise.resolve({
          docs: [
            { id: masterStudent.id, ref: { path: `users/${uid}/students/${masterStudent.id}`, id: masterStudent.id }, data: () => masterStudent },
            { id: dupStudent.id, ref: { path: `users/${uid}/students/${dupStudent.id}`, id: dupStudent.id }, data: () => dupStudent },
          ],
        });
      }

      if (path.includes('enrollments')) {
        return Promise.resolve({ docs: [] });
      }

      if (path.includes('attendanceRecords')) {
        return Promise.resolve({ docs: [] });
      }

      if (path.includes('dailyAttendanceRecords')) {
        const isMasterQuery = q.clauses?.some(
          (clause: any[]) => clause[0] === 'studentId' && clause[2] === 'master-01'
        );

        if (isMasterQuery) {
          return Promise.resolve({
            docs: [
              {
                id: existingMasterDailyAttId,
                ref: { path: `users/${uid}/dailyAttendanceRecords/${existingMasterDailyAttId}`, id: existingMasterDailyAttId },
                data: () => ({
                  studentId: 'master-01',
                  academicYearId: 'ay26',
                  classId: 'class1',
                  date: '2026-10-01',
                  sessionId: 'ay26_class1_2026-10-01',
                  status: 'PRESENT',
                  note: '',
                  rollNumber: 1,
                }),
              },
            ],
          });
        }

        // Querying duplicate's daily attendance (studentId == dup-01)
        return Promise.resolve({
          docs: [
            // Session 1: Master already has this -> conflict!
            {
              id: dupDailySession1Id,
              ref: { path: `users/${uid}/dailyAttendanceRecords/${dupDailySession1Id}`, id: dupDailySession1Id },
              data: () => ({
                studentId: 'dup-01',
                academicYearId: 'ay26',
                classId: 'class1',
                date: '2026-10-01',
                sessionId: 'ay26_class1_2026-10-01',
                status: 'PRESENT',
                note: 'Catatan dispensasi khusus dari duplikat',
              }),
            },
            // Session 2: Master does not have this -> new record!
            {
              id: dupDailySession2Id,
              ref: { path: `users/${uid}/dailyAttendanceRecords/${dupDailySession2Id}`, id: dupDailySession2Id },
              data: () => ({
                studentId: 'dup-01',
                academicYearId: 'ay26',
                classId: 'class1',
                date: '2026-10-02',
                sessionId: 'ay26_class1_2026-10-02',
                status: 'SICK',
                note: 'Demam flu',
                rollNumber: 12,
              }),
            },
          ],
        });
      }

      // Default empty docs for scores, notes
      return Promise.resolve({ docs: [] });
    });

    const result = await executeZeroResidueDeduplication(uid);

    expect(result.deletedStudentsCount).toBe(1);

    // CRITICAL SECURITY ASSERTION:
    // No UPDATE call must ever be made to dailyAttendanceRecords with studentId!
    const dailyStudentIdUpdates = mockUpdate.mock.calls.filter(([ref, data]) =>
      ref?.path?.includes('dailyAttendanceRecords') && data && 'studentId' in data
    );
    expect(dailyStudentIdUpdates).toHaveLength(0);

    // Verify session 1 (conflict with master):
    // 1. Master document is NOT overwritten (status remains PRESENT).
    // 2. Note from duplicate is preserved via non-destructive enrichment on master document.
    const masterNoteUpdates = mockUpdate.mock.calls.filter(([ref, _data]) =>
      ref?.path?.includes(existingMasterDailyAttId)
    );
    expect(masterNoteUpdates).toHaveLength(1);
    expect(masterNoteUpdates[0][1].note).toBe('Catatan dispensasi khusus dari duplikat');

    // 3. Duplicate record is deleted to ensure zero residue
    const deletedPaths = mockDelete.mock.calls.map(([ref]) => ref?.path);
    expect(deletedPaths).toContain(`users/${uid}/dailyAttendanceRecords/${dupDailySession1Id}`);

    // Verify session 2 (absent on master):
    // 1. Created via SET for master with deterministic ID
    const dailySetCalls = mockSet.mock.calls.filter(([ref, _data]) =>
      ref?.path?.includes('dailyAttendanceRecords')
    );
    expect(dailySetCalls).toHaveLength(1);

    const [setRef, setData] = dailySetCalls[0];
    expect(setRef.id).toBe(expectedNewMasterDailyAttId);
    expect(setData.studentId).toBe('master-01');
    expect(setData.studentName).toBe('Budi Santoso Master');
    expect(setData.academicYearId).toBe('ay26');
    expect(setData.classId).toBe('class1');
    expect(setData.date).toBe('2026-10-02');
    expect(setData.status).toBe('SICK');
    expect(setData.note).toBe('Demam flu');
    expect(setData.rollNumber).toBe(12);

    // 2. Old duplicate record for session 2 must also be scheduled for DELETE
    expect(deletedPaths).toContain(`users/${uid}/dailyAttendanceRecords/${dupDailySession2Id}`);

    // Duplicate student document itself must also be deleted
    expect(deletedPaths).toContain(`users/${uid}/students/${dupStudent.id}`);

    // Batch must be committed
    expect(mockCommit).toHaveBeenCalled();
  });
});
