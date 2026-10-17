import { describe, expect, it, vi } from 'vitest';
import { loadWorkspaceUseCase } from './workspace/loadWorkspace.usecase';
import { checkHolidayUseCase } from './attendance/checkHoliday.usecase';
import { searchStudentsUseCase } from './students/searchStudents.usecase';
import { importStudentsUseCase } from './students/importStudents.usecase';
import type { AttendanceSettings, AcademicYear, ClassItem, Subject, TeachingAssignment, Student } from '../types';

describe('Application Core Use Cases', () => {
  describe('loadWorkspaceUseCase', () => {
    it('aggregates master data, resolves active academic year, and defaults correctly', async () => {
      const mockYears: AcademicYear[] = [
        { id: 'ay-1', label: '2025/2026', startYear: 2025, endYear: 2026, isActive: true, currentSemester: 'GANJIL', semester1Label: 'Ganjil', semester2Label: 'Genap' } as any,
        { id: 'ay-2', label: '2026/2027', startYear: 2026, endYear: 2027, isActive: false, currentSemester: 'GENAP', semester1Label: 'Ganjil', semester2Label: 'Genap' } as any
      ];
      const mockClasses: ClassItem[] = [
        { id: 'cls-1', name: '7A', academicYearId: 'ay-1', gradeLevel: '7', classTeacherId: 'teacher-1' } as any,
        { id: 'cls-2', name: '7B', academicYearId: 'ay-1', gradeLevel: '7', classTeacherId: '' } as any
      ];
      const mockSubjects: Subject[] = [
        { id: 'sub-1', name: 'Matematika', code: 'MTK' } as any
      ];
      const mockAssignments: TeachingAssignment[] = [
        { id: 'ta-1', academicYearId: 'ay-1', semester: 'GANJIL', classId: 'cls-1', className: '7A', subjectId: 'sub-1', subjectName: 'Matematika', isActive: true } as any
      ];

      const deps = {
        academicYearRepo: { getAll: vi.fn().mockResolvedValue(mockYears), getActive: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), checkUsage: vi.fn(), archive: vi.fn(), unarchive: vi.fn(), canDelete: vi.fn() },
        classRepo: { getAll: vi.fn().mockResolvedValue(mockClasses), create: vi.fn(), update: vi.fn(), delete: vi.fn(), archive: vi.fn(), unarchive: vi.fn(), checkUsage: vi.fn(), canDelete: vi.fn() },
        subjectRepo: { getAll: vi.fn().mockResolvedValue(mockSubjects), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue(mockAssignments), create: vi.fn(), update: vi.fn(), delete: vi.fn(), checkUsage: vi.fn(), archive: vi.fn(), unarchive: vi.fn(), canDelete: vi.fn() },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultSemester: 'GANJIL', defaultClassId: 'cls-1' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      };

      const result = await loadWorkspaceUseCase({ uid: 'user-1' }, deps as any);

      expect(result.activeAcademicYear?.id).toBe('ay-1');
      expect(result.activeSemester).toBe('GANJIL');
      expect(result.selectedClassId).toBe('cls-1');
      expect(result.selectedAssignment?.id).toBe('ta-1');
      expect(result.classes.length).toBe(2);
      expect(result.subjects.length).toBe(1);
    });

    it('does not fallback to assignment of different semester when active semester has no matching assignments', async () => {
      const mockYears: AcademicYear[] = [
        { id: 'ay-1', label: '2025/2026', isActive: true, currentSemester: 'GENAP' } as any,
      ];
      const mockClasses: ClassItem[] = [
        { id: 'cls-1', name: '7A', academicYearId: 'ay-1' } as any,
      ];
      const mockSubjects: Subject[] = [
        { id: 'sub-1', name: 'Matematika' } as any,
      ];
      // Only GANJIL assignment exists, but active semester is GENAP
      const mockAssignments: TeachingAssignment[] = [
        { id: 'ta-ganjil-1', academicYearId: 'ay-1', semester: 'GANJIL', classId: 'cls-1', className: '7A', subjectId: 'sub-1', isActive: true } as any
      ];

      const deps = {
        academicYearRepo: { getAll: vi.fn().mockResolvedValue(mockYears) },
        classRepo: { getAll: vi.fn().mockResolvedValue(mockClasses) },
        subjectRepo: { getAll: vi.fn().mockResolvedValue(mockSubjects) },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue(mockAssignments) },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultSemester: 'GENAP' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      };

      const result = await loadWorkspaceUseCase({ uid: 'user-1' }, deps as any);

      expect(result.activeSemester).toBe('GENAP');
      expect(result.selectedAssignment).toBeNull();
    });

    it('selects matching assignment for active semester when both semesters have assignments', async () => {
      const mockYears: AcademicYear[] = [
        { id: 'ay-1', label: '2025/2026', isActive: true, currentSemester: 'GENAP' } as any,
      ];
      const mockClasses: ClassItem[] = [
        { id: 'cls-1', name: '7A', academicYearId: 'ay-1' } as any,
      ];
      const mockSubjects: Subject[] = [
        { id: 'sub-1', name: 'Matematika' } as any,
      ];
      const mockAssignments: TeachingAssignment[] = [
        { id: 'ta-ganjil-1', academicYearId: 'ay-1', semester: 'GANJIL', classId: 'cls-1', className: '7A', subjectId: 'sub-1', isActive: true } as any,
        { id: 'ta-genap-1', academicYearId: 'ay-1', semester: 'GENAP', classId: 'cls-1', className: '7A', subjectId: 'sub-1', isActive: true } as any,
      ];

      const deps = {
        academicYearRepo: { getAll: vi.fn().mockResolvedValue(mockYears) },
        classRepo: { getAll: vi.fn().mockResolvedValue(mockClasses) },
        subjectRepo: { getAll: vi.fn().mockResolvedValue(mockSubjects) },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue(mockAssignments) },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultSemester: 'GENAP', defaultClassId: 'cls-1' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      };

      const result = await loadWorkspaceUseCase({ uid: 'user-1' }, deps as any);

      expect(result.activeSemester).toBe('GENAP');
      expect(result.selectedAssignment?.id).toBe('ta-genap-1');
      expect(result.selectedAssignment?.semester).toBe('GENAP');
    });

    it('prioritizes master active year when user preferences has stale defaultAcademicYearId', async () => {
      const mockYears: AcademicYear[] = [
        { id: 'ay-new', label: '2026/2027', isActive: true, currentSemester: 'GANJIL' } as any,
        { id: 'ay-old', label: '2025/2026', isActive: false, currentSemester: 'GENAP' } as any,
      ];
      const deps = {
        academicYearRepo: { getAll: vi.fn().mockResolvedValue(mockYears) },
        classRepo: { getAll: vi.fn().mockResolvedValue([]) },
        subjectRepo: { getAll: vi.fn().mockResolvedValue([]) },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue([]) },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultAcademicYearId: 'ay-old', defaultSemester: 'GENAP' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      };

      const result = await loadWorkspaceUseCase({ uid: 'user-1' }, deps as any);

      expect(result.activeAcademicYear?.id).toBe('ay-new');
      expect(result.activeSemester).toBe('GANJIL');
    });

    it('prioritizes master currentSemester when user preferences has stale defaultSemester', async () => {
      const mockYears: AcademicYear[] = [
        { id: 'ay-1', label: '2025/2026', isActive: true, currentSemester: 'GENAP' } as any,
      ];
      const deps = {
        academicYearRepo: { getAll: vi.fn().mockResolvedValue(mockYears) },
        classRepo: { getAll: vi.fn().mockResolvedValue([]) },
        subjectRepo: { getAll: vi.fn().mockResolvedValue([]) },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue([]) },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultAcademicYearId: 'ay-1', defaultSemester: 'GANJIL' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      };

      const result = await loadWorkspaceUseCase({ uid: 'user-1' }, deps as any);

      expect(result.activeAcademicYear?.id).toBe('ay-1');
      expect(result.activeSemester).toBe('GENAP');
    });

    it('falls back to preferences only when no master academic year is marked active', async () => {
      const mockYears: AcademicYear[] = [
        { id: 'ay-1', label: '2025/2026' } as any,
        { id: 'ay-2', label: '2026/2027' } as any,
      ];
      const deps = {
        academicYearRepo: { getAll: vi.fn().mockResolvedValue(mockYears) },
        classRepo: { getAll: vi.fn().mockResolvedValue([]) },
        subjectRepo: { getAll: vi.fn().mockResolvedValue([]) },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue([]) },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultAcademicYearId: 'ay-2', defaultSemester: 'GENAP' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      };

      const result = await loadWorkspaceUseCase({ uid: 'user-1' }, deps as any);

      expect(result.activeAcademicYear?.id).toBe('ay-2');
      expect(result.activeSemester).toBe('GENAP');
    });

    describe('assignment selection on reload (Priority 5)', () => {
      const buildDeps = (currentSemester: 'GANJIL' | 'GENAP', assignments: TeachingAssignment[]) => ({
        academicYearRepo: {
          getAll: vi.fn().mockResolvedValue([
            { id: 'ay-1', label: '2025/2026', isActive: true, currentSemester } as any,
            { id: 'ay-0', label: '2024/2025', isActive: false, currentSemester: 'GENAP' } as any,
          ]),
        },
        classRepo: {
          getAll: vi.fn().mockResolvedValue([
            { id: 'cls-1', name: '7A', academicYearId: 'ay-1' } as any,
            { id: 'cls-2', name: '7B', academicYearId: 'ay-1' } as any,
          ]),
        },
        subjectRepo: { getAll: vi.fn().mockResolvedValue([{ id: 'sub-1', name: 'Matematika' } as any]) },
        teachingAssignmentRepo: { getAll: vi.fn().mockResolvedValue(assignments) },
        getUserPreferences: vi.fn().mockResolvedValue({ defaultClassId: 'cls-1' }),
        getAttendanceSettings: vi.fn().mockResolvedValue({ schoolDaysOption: 6, holidays: [] }),
      });

      const base = { subjectId: 'sub-1', isActive: true } as const;
      const crossSemesterAssignments = [
        { ...base, id: 'ta-g-1', academicYearId: 'ay-1', semester: 'GANJIL', classId: 'cls-1', className: '7A' },
        { ...base, id: 'ta-g-2', academicYearId: 'ay-1', semester: 'GANJIL', classId: 'cls-2', className: '7B' },
        { ...base, id: 'ta-e-2', academicYearId: 'ay-1', semester: 'GENAP', classId: 'cls-2', className: '7B' },
        // Same semester but different academic year
        { ...base, id: 'ta-old-e-1', academicYearId: 'ay-0', semester: 'GENAP', classId: 'cls-1', className: '7A' },
        // Matching year + semester but archived
        { ...base, id: 'ta-arch-e-1', academicYearId: 'ay-1', semester: 'GENAP', classId: 'cls-1', className: '7A', isArchived: true },
        // Matching year but semester missing (fail-closed)
        { ...base, id: 'ta-nosem-1', academicYearId: 'ay-1', classId: 'cls-1', className: '7A' },
      ] as any as TeachingAssignment[];

      it('selects the assignment matching the active year and semester, and follows a semester change on reload', async () => {
        const ganjil = await loadWorkspaceUseCase(
          { uid: 'user-1' },
          buildDeps('GANJIL', crossSemesterAssignments) as any,
        );
        expect(ganjil.activeSemester).toBe('GANJIL');
        expect(ganjil.selectedAssignment?.id).toBe('ta-g-1');

        // Same persisted data, only currentSemester switched on the active master year
        const genap = await loadWorkspaceUseCase(
          { uid: 'user-1' },
          buildDeps('GENAP', crossSemesterAssignments) as any,
        );
        expect(genap.activeSemester).toBe('GENAP');
        expect(genap.selectedAssignment?.id).toBe('ta-e-2');
        expect(genap.selectedAssignment?.semester).toBe('GENAP');
        expect(genap.selectedAssignment?.academicYearId).toBe('ay-1');
      });

      it('never selects other-semester, other-year, archived or semester-less assignments', async () => {
        const result = await loadWorkspaceUseCase(
          { uid: 'user-1' },
          buildDeps('GENAP', crossSemesterAssignments) as any,
        );

        expect(['ta-g-1', 'ta-g-2', 'ta-old-e-1', 'ta-arch-e-1', 'ta-nosem-1']).not.toContain(
          result.selectedAssignment?.id,
        );
        // The full list stays available to consumers; only the selection is filtered
        expect(result.teachingAssignments).toHaveLength(crossSemesterAssignments.length);
      });

      it('returns no selected assignment when the active semester has no valid assignment', async () => {
        const withoutGenap = (crossSemesterAssignments as any[]).filter((a) => a.id !== 'ta-e-2');

        const result = await loadWorkspaceUseCase(
          { uid: 'user-1' },
          buildDeps('GENAP', withoutGenap as TeachingAssignment[]) as any,
        );

        expect(result.activeSemester).toBe('GENAP');
        expect(result.selectedAssignment).toBeNull();
      });
    });
  });

  describe('checkHolidayUseCase', () => {
    it('identifies Sunday as non-school day on 6-day week setting', () => {
      const settings: AttendanceSettings = {
        schoolDaysOption: 6,
        holidays: []
      };
      // 2026-10-04 is Sunday
      const res = checkHolidayUseCase({ dateStr: '2026-10-04', settings });
      expect(res.isHoliday).toBe(true);
      expect(res.reason).toBe('Hari Minggu (Libur Akhir Pekan)');
    });

    it('identifies custom holiday', () => {
      const settings: AttendanceSettings = {
        schoolDaysOption: 6,
        holidays: [{ id: 'h-1', startDate: '2026-10-02', endDate: '2026-10-02', description: 'Hari Batik Nasional' }]
      };
      const res = checkHolidayUseCase({ dateStr: '2026-10-02', settings });
      expect(res.isHoliday).toBe(true);
      expect(res.reason).toBe('Hari Batik Nasional');
    });

    it('identifies normal active school day', () => {
      const settings: AttendanceSettings = {
        schoolDaysOption: 6,
        holidays: []
      };
      // 2026-10-01 is Thursday
      const res = checkHolidayUseCase({ dateStr: '2026-10-01', settings });
      expect(res.isHoliday).toBe(false);
    });
  });

  describe('searchStudentsUseCase', () => {
    it('returns exact match first if query is exact numeric identifier', async () => {
      const mockStudents: Student[] = [
        { id: 's-1', fullName: 'Budi Santoso', nis: '12345', nisn: '0012345678', gender: 'L', status: 'ACTIVE' } as any
      ];
      const studentRepo = {
        searchByExactIdentifier: vi.fn().mockResolvedValue(mockStudents),
        searchByNameToken: vi.fn().mockResolvedValue([]),
        getAll: vi.fn(),
        getPaginated: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        checkUsage: vi.fn(),
        canDelete: vi.fn(),
        archive: vi.fn(),
        unarchive: vi.fn(),
        checkNisnAvailability: vi.fn(),
        batchCreate: vi.fn(),
        atomicImport: vi.fn(),
      };

      const res = await searchStudentsUseCase({ uid: 'user-1', query: '12345' }, { studentRepo });

      expect(studentRepo.searchByExactIdentifier).toHaveBeenCalledWith('user-1', '12345');
      expect(res).toEqual(mockStudents);
    });

    it('falls back to token search when exact search returns empty', async () => {
      const mockStudents: Student[] = [
        { id: 's-1', fullName: 'Ahmad Dahlan', gender: 'L', status: 'ACTIVE' } as any
      ];
      const studentRepo = {
        searchByExactIdentifier: vi.fn().mockResolvedValue([]),
        searchByNameToken: vi.fn().mockResolvedValue(mockStudents),
        getAll: vi.fn(),
        getPaginated: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        checkUsage: vi.fn(),
        canDelete: vi.fn(),
        archive: vi.fn(),
        unarchive: vi.fn(),
        checkNisnAvailability: vi.fn(),
        batchCreate: vi.fn(),
        atomicImport: vi.fn(),
      };

      const res = await searchStudentsUseCase({ uid: 'user-1', query: 'Ahmad' }, { studentRepo });

      expect(studentRepo.searchByNameToken).toHaveBeenCalled();
      expect(res).toEqual(mockStudents);
    });
  });

  describe('importStudentsUseCase', () => {
    it('enriches search tokens and delegates atomic import to repository', async () => {
      const studentRepo = {
        atomicImport: vi.fn().mockResolvedValue({
          count: 1,
          createdCount: 1,
          updatedCount: 0,
          enrolledCount: 1,
        }),
        searchByExactIdentifier: vi.fn(),
        searchByNameToken: vi.fn(),
        getAll: vi.fn(),
        getPaginated: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        checkUsage: vi.fn(),
        canDelete: vi.fn(),
        archive: vi.fn(),
        unarchive: vi.fn(),
        checkNisnAvailability: vi.fn(),
        batchCreate: vi.fn(),
      };

      const res = await importStudentsUseCase(
        {
          uid: 'user-1',
          items: [{ fullName: 'Siti Aminah', gender: 'P', nisn: '0098765432' }],
          enrollmentConfig: { academicYearId: 'ay-1', classId: 'cls-1', className: '7A' },
          shouldOverwrite: true
        },
        { studentRepo }
      );

      expect(studentRepo.atomicImport).toHaveBeenCalledWith(
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({
            fullName: 'Siti Aminah',
            searchTokens: expect.any(Array)
          })
        ]),
        expect.objectContaining({
          academicYearId: 'ay-1',
          overwriteExisting: true
        })
      );
      expect(res.createdCount).toBe(1);
      expect(res.enrolledCount).toBe(1);
    });
  });
});
