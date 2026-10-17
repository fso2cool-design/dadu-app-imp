import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { WorkspaceProvider, useWorkspace } from './WorkspaceContext';
import * as authModule from '../features/auth/AuthContext';
import { ApplicationProvider } from '../application/ApplicationContext';
import type { TeachingAssignment, AcademicYear, AttendanceSettings } from '../types';

describe('WorkspaceContext — Semester, Calendar & Assignment Integrity', () => {
  const mockSaveUserPreferences = vi.fn().mockResolvedValue(undefined);
  const mockSaveAttendanceSettings = vi.fn().mockResolvedValue(undefined);
  const mockLoadWorkspace = vi.fn();

  const mockApp = {
    workspace: {
      loadWorkspace: mockLoadWorkspace,
      saveUserPreferences: mockSaveUserPreferences,
      saveAttendanceSettings: mockSaveAttendanceSettings,
    },
  } as any;

  const mockYear: AcademicYear = {
    id: 'ay-2025',
    label: '2025/2026',
    isActive: true,
    currentSemester: 'GANJIL',
  } as any;

  const asgGanjil7A: TeachingAssignment = {
    id: 'ta-ganjil-7a',
    academicYearId: 'ay-2025',
    semester: 'GANJIL',
    classId: 'cls-7a',
    className: '7A',
    subjectId: 'sub-mtk',
    subjectName: 'Matematika',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    createdAt: null,
    updatedAt: null,
  };

  const asgGenap7A: TeachingAssignment = {
    id: 'ta-genap-7a',
    academicYearId: 'ay-2025',
    semester: 'GENAP',
    classId: 'cls-7a',
    className: '7A',
    subjectId: 'sub-mtk',
    subjectName: 'Matematika',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    createdAt: null,
    updatedAt: null,
  };

  const asgGanjil8B: TeachingAssignment = {
    id: 'ta-ganjil-8b',
    academicYearId: 'ay-2025',
    semester: 'GANJIL',
    classId: 'cls-8b',
    className: '8B',
    subjectId: 'sub-ipa',
    subjectName: 'IPA',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    createdAt: null,
    updatedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-1' },
      profile: { uid: 'teacher-1' },
    } as any);
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <ApplicationProvider app={mockApp}>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </ApplicationProvider>
    );
  };

  it('selects unique counterpart on Ganjil -> Genap semester switch and does not write to preferences', async () => {
    mockLoadWorkspace.mockResolvedValue({
      academicYears: [mockYear],
      activeAcademicYear: mockYear,
      activeSemester: 'GANJIL',
      classes: [{ id: 'cls-7a', name: '7A', academicYearId: 'ay-2025' }],
      subjects: [{ id: 'sub-mtk', name: 'Matematika' }],
      teachingAssignments: [asgGanjil7A, asgGenap7A],
      attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      selectedClassId: 'cls-7a',
      selectedAssignment: asgGanjil7A,
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper: createWrapper() });

    // Wait until loading finishes
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeSemester).toBe('GANJIL');
    expect(result.current.selectedAssignment?.id).toBe('ta-ganjil-7a');

    // Switch to GENAP
    await act(async () => {
      await result.current.setActiveSemester('GENAP');
    });

    expect(result.current.activeSemester).toBe('GENAP');
    // Must immediately switch to the unique matching counterpart in Genap
    expect(result.current.selectedAssignment?.id).toBe('ta-genap-7a');
    expect(result.current.selectedAssignment?.semester).toBe('GENAP');

    // Does not write duplicate defaultSemester to preferences
    expect(mockSaveUserPreferences).not.toHaveBeenCalledWith(
      'teacher-1',
      expect.objectContaining({ defaultSemester: 'GENAP' })
    );
  });

  it('sets selectedAssignment to null on semester switch when no counterpart exists', async () => {
    // Only Ganjil 8B exists; no Genap counterpart exists
    mockLoadWorkspace.mockResolvedValue({
      academicYears: [mockYear],
      activeAcademicYear: mockYear,
      activeSemester: 'GANJIL',
      classes: [{ id: 'cls-8b', name: '8B', academicYearId: 'ay-2025' }],
      subjects: [{ id: 'sub-ipa', name: 'IPA' }],
      teachingAssignments: [asgGanjil8B],
      attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      selectedClassId: 'cls-8b',
      selectedAssignment: asgGanjil8B,
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper: createWrapper() });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.selectedAssignment?.id).toBe('ta-ganjil-8b');

    // Switch to GENAP
    await act(async () => {
      await result.current.setActiveSemester('GENAP');
    });

    expect(result.current.activeSemester).toBe('GENAP');
    // Must set to null and not retain stale Ganjil assignment
    expect(result.current.selectedAssignment).toBeNull();
  });

  it('sets selectedAssignment to null on semester switch when counterparts are ambiguous (multiple matches)', async () => {
    const duplicateGenap7A: TeachingAssignment = {
      ...asgGenap7A,
      id: 'ta-genap-7a-duplicate',
    };

    mockLoadWorkspace.mockResolvedValue({
      academicYears: [mockYear],
      activeAcademicYear: mockYear,
      activeSemester: 'GANJIL',
      classes: [{ id: 'cls-7a', name: '7A', academicYearId: 'ay-2025' }],
      subjects: [{ id: 'sub-mtk', name: 'Matematika' }],
      teachingAssignments: [asgGanjil7A, asgGenap7A, duplicateGenap7A],
      attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      selectedClassId: 'cls-7a',
      selectedAssignment: asgGanjil7A,
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper: createWrapper() });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.selectedAssignment?.id).toBe('ta-ganjil-7a');

    // Switch to GENAP
    await act(async () => {
      await result.current.setActiveSemester('GENAP');
    });

    expect(result.current.activeSemester).toBe('GENAP');
    // Ambiguous counterparts must result in null so teacher can explicitly choose
    expect(result.current.selectedAssignment).toBeNull();
  });

  it('selectClassWithAutoAssignment only auto-selects assignment matching activeSemester', async () => {
    mockLoadWorkspace.mockResolvedValue({
      academicYears: [mockYear],
      activeAcademicYear: mockYear,
      activeSemester: 'GENAP',
      classes: [{ id: 'cls-7a', name: '7A', academicYearId: 'ay-2025' }, { id: 'cls-8b', name: '8B', academicYearId: 'ay-2025' }],
      subjects: [{ id: 'sub-mtk', name: 'Matematika' }, { id: 'sub-ipa', name: 'IPA' }],
      // 8B only has a GANJIL assignment
      teachingAssignments: [asgGanjil7A, asgGenap7A, asgGanjil8B],
      attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      selectedClassId: 'cls-7a',
      selectedAssignment: asgGenap7A,
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper: createWrapper() });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.selectedAssignment?.id).toBe('ta-genap-7a');

    // Teacher selects class 8B, which has no GENAP assignment
    act(() => {
      result.current.selectClassWithAutoAssignment('cls-8b');
    });

    expect(result.current.selectedClassId).toBe('cls-8b');
    // Must NOT auto-assign asgGanjil8B because it belongs to GANJIL
    expect(result.current.selectedAssignment).toBeNull();
  });

  it('reloadWorkspaceData updates activeAcademicYear and activeSemester from reloaded workspace', async () => {
    mockLoadWorkspace.mockResolvedValueOnce({
      academicYears: [mockYear],
      activeAcademicYear: mockYear,
      activeSemester: 'GANJIL',
      classes: [],
      subjects: [],
      teachingAssignments: [],
      attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      selectedClassId: '',
      selectedAssignment: null,
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper: createWrapper() });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.activeAcademicYear?.id).toBe('ay-2025');
    expect(result.current.activeSemester).toBe('GANJIL');

    const updatedYear: AcademicYear = {
      id: 'ay-2026',
      label: '2026/2027',
      isActive: true,
      currentSemester: 'GENAP',
    } as any;

    mockLoadWorkspace.mockResolvedValueOnce({
      academicYears: [mockYear, updatedYear],
      activeAcademicYear: updatedYear,
      activeSemester: 'GENAP',
      classes: [],
      subjects: [],
      teachingAssignments: [],
      attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      selectedClassId: '',
      selectedAssignment: null,
    });

    await act(async () => {
      await result.current.reloadWorkspaceData();
    });

    expect(result.current.activeAcademicYear?.id).toBe('ay-2026');
    expect(result.current.activeSemester).toBe('GENAP');
  });

  it('updateAttendanceSettings persists settings to repository and updates context state fail-closed', async () => {
    const initialSettings: AttendanceSettings = { schoolDaysOption: 6, holidays: [] };
    mockLoadWorkspace.mockResolvedValueOnce({
      academicYears: [mockYear],
      activeAcademicYear: mockYear,
      activeSemester: 'GANJIL',
      classes: [],
      subjects: [],
      teachingAssignments: [],
      attendanceSettings: initialSettings,
      selectedClassId: '',
      selectedAssignment: null,
    });

    const { result } = renderHook(() => useWorkspace(), { wrapper: createWrapper() });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.attendanceSettings.schoolDaysOption).toBe(6);

    const newSettings: AttendanceSettings = {
      schoolDaysOption: 5,
      holidays: [{ id: 'h1', startDate: '2026-10-22', endDate: '2026-10-22', description: 'Libur', createdAt: '' }],
    };

    // Successful update
    await act(async () => {
      await result.current.updateAttendanceSettings(newSettings);
    });

    expect(mockSaveAttendanceSettings).toHaveBeenCalledWith('teacher-1', newSettings);
    expect(result.current.attendanceSettings.schoolDaysOption).toBe(5);
    expect(result.current.attendanceSettings.holidays.length).toBe(1);

    // Failed update should throw and NOT update state
    mockSaveAttendanceSettings.mockRejectedValueOnce(new Error('Network error'));
    let thrownError: any = null;
    await act(async () => {
      try {
        await result.current.updateAttendanceSettings({ schoolDaysOption: 6, holidays: [] });
      } catch (err) {
        thrownError = err;
      }
    });

    expect(thrownError).toBeDefined();
    // Context retains last valid settings (remains 5, not reverted to 6)
    expect(result.current.attendanceSettings.schoolDaysOption).toBe(5);
  });
});
