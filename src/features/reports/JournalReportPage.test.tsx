import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JournalReportPage } from './JournalReportPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';

const mockWriteFile = vi.fn();
const mockAoaToSheet = vi.fn().mockReturnValue({});
const mockBookNew = vi.fn().mockReturnValue({});
const mockBookAppendSheet = vi.fn();

vi.mock('../../utils/lazyXlsx', () => ({
  loadXlsx: vi.fn().mockResolvedValue({
    utils: {
      aoa_to_sheet: (...args: any[]) => mockAoaToSheet(...args),
      book_new: () => mockBookNew(),
      book_append_sheet: (...args: any[]) => mockBookAppendSheet(...args),
    },
    writeFile: (...args: any[]) => mockWriteFile(...args),
  }),
}));

describe('Priority 5A: JournalReportPage Academic Year & Semester Assignment Isolation', () => {
  const mockGetAllMeetings = vi.fn();
  const mockGetSchoolSettings = vi.fn();
  const mockGetDocumentSettings = vi.fn();
  const mockSetSelectedAssignment = vi.fn();

  const mockApp = {
    meetings: {
      getAll: mockGetAllMeetings,
    },
    settings: {
      getSchoolSettings: mockGetSchoolSettings,
      getDocumentSettings: mockGetDocumentSettings,
    },
    reports: {
      createSharedReport: vi.fn(),
      getUserSharedReports: vi.fn().mockResolvedValue([]),
    },
  } as any;

  const mockAcademicYear = { id: '2026/2027', label: '2026/2027', isArchived: false };
  const assignmentGanjil = {
    id: 'asg-ganjil',
    teacherId: 'teacher-1',
    classId: 'cls-7a',
    className: '7A',
    subjectId: 'sub-fikih',
    subjectName: 'Fikih Ganjil',
    academicYearId: '2026/2027',
    semester: 'GANJIL' as const,
  };
  const assignmentGenap = {
    id: 'asg-genap',
    teacherId: 'teacher-1',
    classId: 'cls-7b',
    className: '7B',
    subjectId: 'sub-akidah',
    subjectName: 'Akidah Genap',
    academicYearId: '2026/2027',
    semester: 'GENAP' as const,
  };

  const sampleMeetingsGanjil = [
    {
      id: 'm-ganjil-1',
      date: '2026-08-10',
      meetingNumber: 1,
      teachingAssignmentId: 'asg-ganjil',
      topic: 'Konsep Bersuci Thaharah',
      status: 'COMPLETED' as const,
      attendanceSummary: { present: 30, sick: 0, permitted: 0, absent: 0, presentPercentage: 100, total: 30 },
    },
    {
      id: 'm-ganjil-2',
      date: '2026-08-17',
      meetingNumber: 2,
      teachingAssignmentId: 'asg-ganjil',
      topic: 'Hadats Besar dan Kecil',
      status: 'COMPLETED' as const,
      attendanceSummary: { present: 28, sick: 2, permitted: 0, absent: 0, presentPercentage: 93, total: 30 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSchoolSettings.mockResolvedValue({
      schoolName: 'MTs DADU Test',
      city: 'Jakarta',
      defaultKkm: 75,
    });
    mockGetDocumentSettings.mockResolvedValue({
      city: 'Jakarta',
      paperSize: 'A4',
      orientation: 'LANDSCAPE',
    });
    mockGetAllMeetings.mockResolvedValue([]);

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-1', displayName: 'Guru Fikih' },
      profile: { uid: 'teacher-1', displayName: 'Guru Fikih' },
    } as any);
  });

  const renderJournalReport = () => {
    return render(
      <ToastProvider>
        <ApplicationProvider app={mockApp}>
          <JournalReportPage />
        </ApplicationProvider>
      </ToastProvider>
    );
  };

  it('TC-REPORT-SEM-04: does not auto-select teachingAssignments[0] when selectedAssignment is null and renders placeholder in dropdown', async () => {
    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GENAP',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: null,
      setSelectedAssignment: mockSetSelectedAssignment,
    } as any);

    renderJournalReport();

    // Must NOT auto-select teachingAssignments[0]
    expect(mockSetSelectedAssignment).not.toHaveBeenCalled();

    // Dropdown must have placeholder and only GENAP options
    expect(screen.getByText('-- Pilih Penugasan Mengajar --')).toBeInTheDocument();
    expect(screen.queryByText(/Fikih Ganjil/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Akidah Genap/i)).toBeInTheDocument();
  });

  it('TC-REPORT-SEM-05: does not fetch meetings data when selectedAssignment is invalid for active semester and shows empty state', async () => {
    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GENAP',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: assignmentGanjil, // Stale Ganjil assignment
      setSelectedAssignment: mockSetSelectedAssignment,
    } as any);

    renderJournalReport();

    // Must NOT call meetings.getAll with stale assignment
    expect(mockGetAllMeetings).not.toHaveBeenCalled();

    // Must show empty meetings placeholder and 0 sessions
    expect(screen.getByText('Belum ada catatan pertemuan untuk kelas dan mata pelajaran ini.')).toBeInTheDocument();
    expect(screen.getByText(/0 Pertemuan/i)).toBeInTheDocument();
  });

  it('TC-REPORT-TRANSITION-01: prevents render-time leakage when transitioning from loaded Semester 1 to Semester 2 with null assignment', async () => {
    mockGetAllMeetings.mockResolvedValue(sampleMeetingsGanjil);

    const workspaceGanjil = {
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GANJIL',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: assignmentGanjil,
      setSelectedAssignment: mockSetSelectedAssignment,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue(workspaceGanjil as any);

    const { rerender } = renderJournalReport();

    // 1. Initial Semester 1 state is fully populated
    expect(await screen.findByText('Konsep Bersuci Thaharah')).toBeInTheDocument();
    expect(screen.getByText('Hadats Besar dan Kecil')).toBeInTheDocument();
    expect(screen.getByText('Pertemuan Terselenggara').closest('div')).toHaveTextContent('2 Sesi');
    expect(screen.getByText('2 Pertemuan')).toBeInTheDocument();

    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    expect(exportBtn).not.toBeDisabled();

    // 2. Transition: workspace switches to GENAP with selectedAssignment = null
    workspaceSpy.mockReturnValue({
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GENAP',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: null,
      setSelectedAssignment: mockSetSelectedAssignment,
    } as any);

    rerender(
      <ToastProvider>
        <ApplicationProvider app={mockApp}>
          <JournalReportPage />
        </ApplicationProvider>
      </ToastProvider>
    );

    // 3. Render-time isolation: Old semester meetings MUST NOT be visible
    expect(screen.queryByText('Konsep Bersuci Thaharah')).not.toBeInTheDocument();
    expect(screen.queryByText('Hadats Besar dan Kecil')).not.toBeInTheDocument();
    expect(screen.getByText('Belum ada catatan pertemuan untuk kelas dan mata pelajaran ini.')).toBeInTheDocument();

    // Statistical counter and metadata must immediately reflect 0
    expect(screen.getByText('Pertemuan Terselenggara').closest('div')).toHaveTextContent('0 Sesi');
    expect(screen.getByText('0 Pertemuan')).toBeInTheDocument();

    // Export button must be disabled
    expect(exportBtn).toBeDisabled();

    // Attempting to trigger export must be rejected by the synchronous guard
    fireEvent.click(exportBtn);
    expect(mockWriteFile).not.toHaveBeenCalled();

    // Public share button must also be disabled
    const shareBtn = screen.getByRole('button', { name: /Bagikan Tautan Publik/i });
    expect(shareBtn).toBeDisabled();
  });

  it('TC-REPORT-TRANSITION-02: fails closed when activeAcademicYear is missing or undefined even with assignments from multiple years matching active semester', async () => {
    const assignmentGanjilAY25 = {
      id: 'asg-ay25-ganjil',
      teacherId: 'teacher-1',
      classId: 'cls-8a',
      className: '8A',
      subjectId: 'sub-fikih',
      subjectName: 'Fikih 2025 Ganjil',
      academicYearId: '2025/2026',
      semester: 'GANJIL' as const,
    };

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      activeAcademicYear: null,
      activeSemester: 'GANJIL',
      teachingAssignments: [assignmentGanjil, assignmentGanjilAY25],
      selectedAssignment: assignmentGanjil, // Mismatched because activeAcademicYear is missing
      setSelectedAssignment: mockSetSelectedAssignment,
    } as any);

    renderJournalReport();

    // 1. Queries must be suppressed completely
    expect(mockGetAllMeetings).not.toHaveBeenCalled();

    // 2. Dropdown must have ONLY the placeholder, no assignment options from either year
    const label = screen.getByText('Pilih Mapel & Kelas:');
    const select = label.parentElement!.querySelector('select')!;
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('-- Pilih Penugasan Mengajar --');
    expect(screen.queryByText(/Fikih Ganjil/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fikih 2025 Ganjil/i)).not.toBeInTheDocument();

    // 3. Stale data must not be exposed
    expect(screen.getByText('Pertemuan Terselenggara').closest('div')).toHaveTextContent('0 Sesi');
    expect(screen.getByText('0 Pertemuan')).toBeInTheDocument();
    expect(screen.getByText('Belum ada catatan pertemuan untuk kelas dan mata pelajaran ini.')).toBeInTheDocument();

    // 4. Action buttons must be disabled and modal unmounted
    expect(screen.getByRole('button', { name: /Ekspor Excel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Bagikan Tautan Publik/i })).toBeDisabled();
    expect(screen.queryByText('Tautan Berbagi Laporan Resmi')).not.toBeInTheDocument();
  });

  it('TC-REPORT-TRANSITION-03: obsolete in-flight response resolving after context switch does not leak stale data or corrupt loading', async () => {
    let resolveInFlight: (value: any) => void;
    const inFlightPromise = new Promise((resolve) => {
      resolveInFlight = resolve;
    });
    mockGetAllMeetings.mockReturnValue(inFlightPromise);

    const assignmentInFlight = {
      id: 'asg-ganjil-inflight',
      teacherId: 'teacher-1',
      academicYearId: '2026/2027',
      semester: 'GANJIL' as const,
      classId: 'cls-7a',
      className: '7A',
      subjectId: 'sub-fikih',
      subjectName: 'Fikih Inflight',
    };

    const workspaceGanjil = {
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GANJIL',
      teachingAssignments: [assignmentInFlight, assignmentGenap],
      selectedAssignment: assignmentInFlight,
      setSelectedAssignment: mockSetSelectedAssignment,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue(workspaceGanjil as any);

    const { rerender } = renderJournalReport();

    // Verify loading state is active while waiting for in-flight response
    expect(await screen.findByText(/Memuat daftar jurnal agenda mengajar/i)).toBeInTheDocument();

    // Now switch context to GENAP with no assignment while the request is still pending
    workspaceSpy.mockReturnValue({
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GENAP',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: null,
      setSelectedAssignment: mockSetSelectedAssignment,
    } as any);

    rerender(
      <ToastProvider>
        <ApplicationProvider app={mockApp}>
          <JournalReportPage />
        </ApplicationProvider>
      </ToastProvider>
    );

    // Resolve the old in-flight request
    await resolveInFlight!(sampleMeetingsGanjil);

    // The stale meetings must not appear in the GENAP context
    await waitFor(() => {
      expect(screen.queryByText('Konsep Bersuci Thaharah')).not.toBeInTheDocument();
      expect(screen.getByText('Belum ada catatan pertemuan untuk kelas dan mata pelajaran ini.')).toBeInTheDocument();
      expect(screen.getByText('Pertemuan Terselenggara').closest('div')).toHaveTextContent('0 Sesi');
    });
  });

  it('TC-REPORT-TRANSITION-04: closes or invalidates ShareReportModal if already open when context changes', async () => {
    mockGetAllMeetings.mockResolvedValue(sampleMeetingsGanjil);

    const workspaceGanjil = {
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GANJIL',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: assignmentGanjil,
      setSelectedAssignment: mockSetSelectedAssignment,
    };

    const workspaceSpy = vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue(workspaceGanjil as any);

    const { rerender } = renderJournalReport();

    expect(await screen.findByText('Konsep Bersuci Thaharah')).toBeInTheDocument();

    // Open share modal
    const shareBtn = screen.getByRole('button', { name: /Bagikan Tautan Publik/i });
    expect(shareBtn).not.toBeDisabled();
    fireEvent.click(shareBtn);

    // Modal is open
    expect(await screen.findByText('Tautan Berbagi Laporan Resmi')).toBeInTheDocument();

    // Switch context to GENAP with selectedAssignment = null
    workspaceSpy.mockReturnValue({
      activeAcademicYear: mockAcademicYear,
      activeSemester: 'GENAP',
      teachingAssignments: [assignmentGanjil, assignmentGenap],
      selectedAssignment: null,
      setSelectedAssignment: mockSetSelectedAssignment,
    } as any);

    rerender(
      <ToastProvider>
        <ApplicationProvider app={mockApp}>
          <JournalReportPage />
        </ApplicationProvider>
      </ToastProvider>
    );

    // Modal must be automatically dismissed/closed
    expect(screen.queryByText('Tautan Berbagi Laporan Resmi')).not.toBeInTheDocument();
  });
});
