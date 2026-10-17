import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { GradesPage } from './GradesPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';
import * as toastModule from '../../context/ToastContext';
import type { AssessmentItem, Enrollment, TeachingAssignment, SemesterType } from '../../types';

describe('GradesPage — Semester Switch & Dirty Draft Protection (Stage 5.3)', () => {
  const mockToastSuccess = vi.fn();
  const mockToastError = vi.fn();
  const mockToastWarning = vi.fn();
  const mockToastInfo = vi.fn();

  const mockGetAssessmentItems = vi.fn();
  const mockGetByClass = vi.fn();
  const mockGetScoresByItemIds = vi.fn();
  const mockSaveMatrixScores = vi.fn().mockResolvedValue(undefined);
  const mockTriggerSyncFeedback = vi.fn();

  const mockApp = {
    grades: {
      getAssessmentItems: mockGetAssessmentItems,
      getScoresByItemIds: mockGetScoresByItemIds,
      saveMatrixScores: mockSaveMatrixScores,
      canDeleteAssessmentItem: vi.fn().mockResolvedValue({ canDelete: true }),
    },
    enrollment: {
      getByClass: mockGetByClass,
    },
  } as any;

  const asgGanjil: TeachingAssignment = {
    id: 'ta-ganjil-1',
    classId: 'cls-7a',
    className: '7A',
    subjectId: 'sub-mtk',
    subjectName: 'Matematika',
    academicYearId: 'ay-2025',
    semester: 'GANJIL',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    createdAt: null,
    updatedAt: null,
  };

  const asgGenap: TeachingAssignment = {
    id: 'ta-genap-1',
    classId: 'cls-7a',
    className: '7A',
    subjectId: 'sub-mtk',
    subjectName: 'Matematika',
    academicYearId: 'ay-2025',
    semester: 'GENAP',
    teacherId: 'teacher-1',
    isActive: true,
    isArchived: false,
    createdAt: null,
    updatedAt: null,
  };

  const itemsGanjil: AssessmentItem[] = [
    {
      id: 'item-ganjil-1',
      academicYearId: 'ay-2025',
      semester: 'GANJIL',
      teachingAssignmentId: 'ta-ganjil-1',
      classId: 'cls-7a',
      subjectId: 'sub-mtk',
      name: 'Ulangan Harian 1 Ganjil',
      category: 'QUIZ',
      assessmentDate: '2026-10-15',
      maxScore: 100,
      weight: 20,
      isIncludedInFinalScore: true,
      createdAt: '2026-10-15T00:00:00.000Z',
      updatedAt: '2026-10-15T00:00:00.000Z',
    },
  ];

  const itemsGenap: AssessmentItem[] = [
    {
      id: 'item-genap-1',
      academicYearId: 'ay-2025',
      semester: 'GENAP',
      teachingAssignmentId: 'ta-genap-1',
      classId: 'cls-7a',
      subjectId: 'sub-mtk',
      name: 'Ulangan Harian 1 Genap',
      category: 'QUIZ',
      assessmentDate: '2027-02-15',
      maxScore: 100,
      weight: 20,
      isIncludedInFinalScore: true,
      createdAt: '2027-02-15T00:00:00.000Z',
      updatedAt: '2027-02-15T00:00:00.000Z',
    },
  ];

  const enrollments7A: Enrollment[] = [
    {
      id: 'enr-1',
      studentId: 'stu-1',
      rollNumber: 1,
      status: 'ACTIVE',
      academicYearId: 'ay-2025',
      classId: 'cls-7a',
      student: { id: 'stu-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
    } as Enrollment,
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAssessmentItems.mockImplementation(async (_uid, params) => {
      if (params?.teachingAssignmentId === 'ta-ganjil-1') return itemsGanjil;
      if (params?.teachingAssignmentId === 'ta-genap-1') return itemsGenap;
      return [];
    });
    mockGetByClass.mockResolvedValue(enrollments7A);
    mockGetScoresByItemIds.mockResolvedValue([]);
    mockSaveMatrixScores.mockResolvedValue(undefined);

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-1' },
      profile: { uid: 'teacher-1', role: 'TEACHER', displayName: 'Guru Pengampu' },
    } as any);

    vi.spyOn(toastModule, 'useToast').mockReturnValue({
      success: mockToastSuccess,
      error: mockToastError,
      warning: mockToastWarning,
      info: mockToastInfo,
      toast: vi.fn(),
      dismiss: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test A — Draft kotor, semester tujuan tanpa assignment: modal konfirmasi muncul, draft aman, tidak tersimpan ke assignment lain', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    // Initial render in GANJIL: uses asgGanjil
    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });
    expect(screen.getByText('Ulangan Harian 1 Ganjil')).toBeInTheDocument();

    // Teacher modifies score -> draft becomes dirty
    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '92' } });
    expect(input.value).toBe('92');
    expect(screen.getByText('Simpan Perubahan*')).toBeInTheDocument();

    // Workspace changes to GENAP with NO matching assignment
    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: null,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    // Assert:
    // 1. Unsaved changes modal is shown
    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // 2. Draft is still completely safe in background (score 92 not wiped, isDirty true)
    expect(input.value).toBe('92');
    expect(screen.getByText('Simpan Perubahan*')).toBeInTheDocument();

    // 3. No data has been saved to any other assignment
    expect(mockSaveMatrixScores).not.toHaveBeenCalled();
  });

  it('Test B — Draft kotor, semester tujuan memiliki assignment: tidak membuang draft otomatis, konfirmasi muncul', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    // Teacher modifies score -> dirty draft
    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '88' } });
    expect(input.value).toBe('88');

    // Context changes to GENAP with counterpart asgGenap
    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: asgGenap,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    // Assert:
    // 1. Unsaved changes modal is displayed
    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // 2. Draft is not discarded automatically, GENAP items not loaded yet
    expect(input.value).toBe('88');
    expect(screen.queryByText('Ulangan Harian 1 Genap')).toBeNull();
  });

  it('Test C — Buang perubahan: draft dibuang setelah konfirmasi dan transisi tertunda diselesaikan (Skenario A & B)', async () => {
    // Skenario 1: Buang perubahan saat transisi ke semester tanpa assignment
    let workspaceState1: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState1.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy1 = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState1 as any);

    const { rerender: rerender1 } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    // Dirty score
    const input1 = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input1, { target: { value: '75' } });

    // Workspace switch to GENAP (no counterpart)
    workspaceState1 = {
      ...workspaceState1,
      activeSemester: 'GENAP',
      selectedAssignment: null,
    };
    workspaceSpy1.mockImplementation(() => workspaceState1 as any);

    await act(async () => {
      rerender1(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // Click "Buang Perubahan"
    const discardButton1 = screen.getByRole('button', { name: /buang perubahan/i });
    fireEvent.click(discardButton1);

    // Assert: modal closes and empty state for semester without assignment appears
    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
    expect(screen.getByText('Tidak Ada Penugasan Mengajar Aktif')).toBeInTheDocument();

    // Skenario 2: Buang perubahan saat transisi ke semester dengan assignment
    let workspaceState2: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState2.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    workspaceSpy1.mockImplementation(() => workspaceState2 as any);

    const { rerender: rerender2 } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    const input2 = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input2, { target: { value: '82' } });

    workspaceState2 = {
      ...workspaceState2,
      activeSemester: 'GENAP',
      selectedAssignment: asgGenap,
    };
    workspaceSpy1.mockImplementation(() => workspaceState2 as any);

    await act(async () => {
      rerender2(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());
    const discardButton2 = screen.getByRole('button', { name: /buang perubahan/i });
    fireEvent.click(discardButton2);

    // Assert: modal closes and assignment GENAP is loaded
    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-genap-1' });
    });
    expect(screen.getByText('Ulangan Harian 1 Genap')).toBeInTheDocument();
  });

  it('Test D — Simpan dan lanjutkan: draft disimpan ke assignment asal GANJIL, bukan GENAP, dan kegagalan simpan membatalkan transisi', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    // Dirty score 98
    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '98' } });

    // Context change to GENAP
    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: asgGenap,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // Sub-case 1: Simulasikan kegagalan penyimpanan terlebih dahulu
    mockSaveMatrixScores.mockRejectedValueOnce(new Error('Simulated network error'));

    const saveAndProceedBtn = screen.getByRole('button', { name: /simpan & pindah/i });
    await act(async () => {
      fireEvent.click(saveAndProceedBtn);
    });

    // Assert: Kegagalan simpan mempertahankan draft dan tidak melanjutkan transisi
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('Simulated network error'));
    expect(input.value).toBe('98');
    expect(screen.getByText('Simpan Perubahan*')).toBeInTheDocument();
    expect(screen.queryByText('Ulangan Harian 1 Genap')).toBeNull();

    // Sub-case 2: Simpan berhasil
    mockSaveMatrixScores.mockResolvedValueOnce(undefined);
    await act(async () => {
      fireEvent.click(saveAndProceedBtn);
    });

    // Assert:
    // 1. Draft disimpan menggunakan ID item GANJIL asal
    expect(mockSaveMatrixScores).toHaveBeenCalledWith('teacher-1', [
      expect.objectContaining({
        assessmentItemId: 'item-ganjil-1',
        studentId: 'stu-1',
        score: 98,
      }),
    ]);

    // 2. Assignment GENAP dimuat setelah penyimpanan berhasil
    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-genap-1' });
    });
    expect(screen.getByText('Ulangan Harian 1 Genap')).toBeInTheDocument();
  });

  it('Test E — Tidak ada draft kotor: perilaku Stage 5.2 tetap terjaga tanpa modal konfirmasi', async () => {
    // 1. Initial unselected in GENAP -> selects GENAP immediately
    const workspaceState = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GENAP' as SemesterType,
      selectedAssignment: null,
      setSelectedAssignment: vi.fn(),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue(workspaceState as any);

    render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    // No modal should be opened
    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();

    // Active assignment is GENAP, GANJIL is not fallback
    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-genap-1' });
    });
    const select = screen.getByRole('combobox', { name: /pilih rombel/i }) as HTMLSelectElement;
    expect(select.value).toBe('ta-genap-1');
    expect(screen.getByText('Ulangan Harian 1 Genap')).toBeInTheDocument();
    expect(mockGetAssessmentItems).not.toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
  });

  it('Test F — Cancel workspace transition, then manual save succeeds', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    // 1. Edit score -> dirty
    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '89' } });
    expect(input.value).toBe('89');

    // 2. Workspace changes to GENAP assignment B
    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: asgGenap,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    // 3. Modal appears
    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // 4. Click Cancel ("Batal")
    const cancelBtn = screen.getByRole('button', { name: /batal/i });
    fireEvent.click(cancelBtn);

    // 5. Assert: draft A still visible, modal closed, A still temporarily active, no auto save
    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
    expect(input.value).toBe('89');
    expect(screen.getByText('Ulangan Harian 1 Ganjil')).toBeInTheDocument();
    expect(mockSaveMatrixScores).not.toHaveBeenCalled();

    // 6. Click main toolbar button "Simpan Perubahan*"
    const toolbarSaveBtn = screen.getByRole('button', { name: /simpan perubahan\*/i });
    await act(async () => {
      fireEvent.click(toolbarSaveBtn);
    });

    // 7. Assert: save uses assignment A items
    expect(mockSaveMatrixScores).toHaveBeenCalledWith('teacher-1', [
      expect.objectContaining({
        assessmentItemId: 'item-ganjil-1',
        studentId: 'stu-1',
        score: 89,
      }),
    ]);

    // 8. After save succeeds, transition to B completes automatically
    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-genap-1' });
    });
    expect(screen.getByText('Ulangan Harian 1 Genap')).toBeInTheDocument();
    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
  });

  it('Test G — Cancel workspace transition, then manual save fails, then retry succeeds', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '95' } });

    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: asgGenap,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /batal/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
    expect(input.value).toBe('95');

    // Simulate backend save failure on first attempt
    mockSaveMatrixScores.mockRejectedValueOnce(new Error('Network disconnected'));

    const toolbarSaveBtn = screen.getByRole('button', { name: /simpan perubahan\*/i });
    await act(async () => {
      fireEvent.click(toolbarSaveBtn);
    });

    // Assert: error toast, draft A still visible, A still active, transition not occurred
    expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('Network disconnected'));
    expect(input.value).toBe('95');
    expect(screen.getByText('Ulangan Harian 1 Ganjil')).toBeInTheDocument();
    expect(screen.queryByText('Ulangan Harian 1 Genap')).toBeNull();

    // Retry save succeeds
    mockSaveMatrixScores.mockResolvedValueOnce(undefined);
    await act(async () => {
      fireEvent.click(toolbarSaveBtn);
    });

    // Assert: now transitions to GENAP
    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-genap-1' });
    });
    expect(screen.getByText('Ulangan Harian 1 Genap')).toBeInTheDocument();
  });

  it('Test H — Cancel to empty target, then manual save succeeds and transitions to empty state', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '77' } });

    // Workspace changes to GENAP without assignment
    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: null,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /batal/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
    expect(input.value).toBe('77');

    // Manual toolbar save succeeds
    const toolbarSaveBtn = screen.getByRole('button', { name: /simpan perubahan\*/i });
    await act(async () => {
      fireEvent.click(toolbarSaveBtn);
    });

    // Assert: saved using GANJIL item
    expect(mockSaveMatrixScores).toHaveBeenCalledWith('teacher-1', [
      expect.objectContaining({
        assessmentItemId: 'item-ganjil-1',
        studentId: 'stu-1',
        score: 77,
      }),
    ]);

    // Enters empty state for GENAP without assignment
    await waitFor(() => {
      expect(screen.getByText('Tidak Ada Penugasan Mengajar Aktif')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ulangan Harian 1 Ganjil')).toBeNull();
  });

  it('Test I — No modal re-open loop after Cancel', async () => {
    let workspaceState: {
      teachingAssignments: TeachingAssignment[];
      activeAcademicYear: { id: string; label: string; isArchived: boolean };
      activeSemester: SemesterType;
      selectedAssignment: TeachingAssignment | null;
      setSelectedAssignment: (asg: TeachingAssignment | null) => void;
      triggerSyncFeedback: (status: any, message?: string) => void;
    } = {
      teachingAssignments: [asgGanjil, asgGenap],
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      selectedAssignment: asgGanjil,
      setSelectedAssignment: vi.fn((asg) => { workspaceState.selectedAssignment = asg; }),
      triggerSyncFeedback: mockTriggerSyncFeedback,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockImplementation(() => workspaceState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <GradesPage />
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(mockGetAssessmentItems).toHaveBeenCalledWith('teacher-1', { teachingAssignmentId: 'ta-ganjil-1' });
    });

    const input = screen.getByPlaceholderText('-') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '80' } });

    // Workspace changes to GENAP
    workspaceState = {
      ...workspaceState,
      activeSemester: 'GENAP',
      selectedAssignment: asgGenap,
    };
    workspaceSpy.mockImplementation(() => workspaceState as any);

    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await waitFor(() => expect(screen.getByText('Perubahan Nilai Belum Disimpan')).toBeInTheDocument());

    // Click Cancel
    const cancelBtn = screen.getByRole('button', { name: /batal/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();

    // Trigger multiple rerenders and effect flushes
    await act(async () => {
      rerender(
        <ApplicationProvider app={mockApp}>
          <GradesPage />
        </ApplicationProvider>
      );
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: '81' } });
    });

    // Assert: modal remains closed
    expect(screen.queryByText('Perubahan Nilai Belum Disimpan')).toBeNull();
    expect(input.value).toBe('81');
    expect(screen.getByText('Ulangan Harian 1 Ganjil')).toBeInTheDocument();
  });
});
