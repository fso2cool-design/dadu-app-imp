import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceReportPage, getPerformanceLevel, getAttendancePerformanceLabel } from './AttendanceReportPage';
import { PublicReportViewerPage } from '../public/PublicReportViewerPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';

const mockAoaToSheet = vi.fn().mockReturnValue({});
const mockBookNew = vi.fn().mockReturnValue({});
const mockBookAppendSheet = vi.fn();
const mockWriteFile = vi.fn();

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

describe('AttendanceReportPage Denominator Semantics & Correctness', () => {
  const mockGetAllMeetings = vi.fn();
  const mockGetByClass = vi.fn();
  const mockGetByAssignment = vi.fn();
  const mockGetByMeetingIds = vi.fn();
  const mockGetAllDailyForClass = vi.fn();
  const mockGetSchoolSettings = vi.fn();
  const mockGetDocumentSettings = vi.fn();
  const mockSetSelectedAssignment = vi.fn();
  const mockCreateSharedReport = vi.fn().mockImplementation(async (data: any) => ({
    id: 'tok-share-123',
    ...data,
  }));
  const mockGetSharedReportByToken = vi.fn();

  const mockApp = {
    meetings: {
      getAll: mockGetAllMeetings,
    },
    enrollment: {
      getByClass: mockGetByClass,
    },
    attendance: {
      getByAssignment: mockGetByAssignment,
      getByMeetingIds: mockGetByMeetingIds,
      getAllDailyForClass: mockGetAllDailyForClass,
    },
    settings: {
      getSchoolSettings: mockGetSchoolSettings,
      getDocumentSettings: mockGetDocumentSettings,
    },
    reports: {
      createSharedReport: mockCreateSharedReport,
      getUserSharedReports: vi.fn().mockResolvedValue([]),
      revokeSharedReport: vi.fn(),
      getSharedReportByToken: mockGetSharedReportByToken,
      incrementView: vi.fn(),
      decrypt: vi.fn(),
    },
  } as any;

  const mockAcademicYear = { id: '2026/2027', label: '2026/2027', isArchived: false };
  const mockAssignment = {
    id: 'asg-1',
    teacherId: 'teacher-1',
    classId: 'cls-7a',
    className: '7A',
    subjectId: 'sub-fikih',
    subjectName: 'Fikih',
    academicYearId: '2026/2027',
    semester: 'GANJIL',
  };

  const mockClass = {
    id: 'cls-7a',
    name: '7A',
    academicYearId: '2026/2027',
    isActive: true,
  };

  const mockStudents = [
    {
      id: 'enr-1',
      studentId: 'std-1',
      rollNumber: 1,
      status: 'ACTIVE',
      student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', nisn: '001', gender: 'L' as const },
    },
    {
      id: 'enr-2',
      studentId: 'std-2',
      rollNumber: 2,
      status: 'ACTIVE',
      student: { id: 'std-2', fullName: 'Siti Walidah', nis: '1002', nisn: '002', gender: 'P' as const },
    },
  ];

  // 10 meetings in semester: 6 in September 2026, 4 in October 2026
  const mockMeetings = [
    { id: 'm-sep-1', date: '2026-09-01', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-sep-2', date: '2026-09-08', meetingNumber: 2, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-sep-3', date: '2026-09-15', meetingNumber: 3, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-sep-4', date: '2026-09-22', meetingNumber: 4, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-sep-5', date: '2026-09-29', meetingNumber: 5, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-sep-6', date: '2026-09-30', meetingNumber: 6, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-oct-1', date: '2026-10-06', meetingNumber: 7, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-oct-2', date: '2026-10-13', meetingNumber: 8, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-oct-3', date: '2026-10-20', meetingNumber: 9, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    { id: 'm-oct-4', date: '2026-10-27', meetingNumber: 10, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
  ];

  // Ahmad attended all 4 October meetings (4/4 = 100%)
  // Siti attended 3 October meetings, 1 absent (3/4 = 75%)
  const mockAttendanceRecords = [
    { id: 'att-1', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
    { id: 'att-2', studentId: 'std-1', date: '2026-10-13', meetingId: 'm-oct-2', status: 'PRESENT' },
    { id: 'att-3', studentId: 'std-1', date: '2026-10-20', meetingId: 'm-oct-3', status: 'PRESENT' },
    { id: 'att-4', studentId: 'std-1', date: '2026-10-27', meetingId: 'm-oct-4', status: 'PRESENT' },

    { id: 'att-5', studentId: 'std-2', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
    { id: 'att-6', studentId: 'std-2', date: '2026-10-13', meetingId: 'm-oct-2', status: 'PRESENT' },
    { id: 'att-7', studentId: 'std-2', date: '2026-10-20', meetingId: 'm-oct-3', status: 'PRESENT' },
    { id: 'att-8', studentId: 'std-2', date: '2026-10-27', meetingId: 'm-oct-4', status: 'ABSENT' },
  ];

  // Homeroom daily records: 30 days total (20 in Sep, 10 in Oct).
  // Ahmad attended all 10 Oct days.
  const mockDailyRecords = [
    ...Array.from({ length: 20 }, (_, idx) => ({
      id: `daily-sep-${idx + 1}`,
      studentId: 'std-1',
      date: `2026-09-${String(idx + 1).padStart(2, '0')}`,
      status: 'ABSENT' as const,
    })),
    ...Array.from({ length: 10 }, (_, idx) => ({
      id: `daily-oct-${idx + 1}`,
      studentId: 'std-1',
      date: `2026-10-${String(idx + 1).padStart(2, '0')}`,
      status: 'PRESENT' as const,
    })),
  ];

  const workspaceState = {
    activeAcademicYear: mockAcademicYear,
    activeSemester: 'GANJIL',
    teachingAssignments: [mockAssignment],
    classes: [mockClass],
    selectedAssignment: mockAssignment,
    setSelectedAssignment: mockSetSelectedAssignment,
  };

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

    mockGetAllMeetings.mockResolvedValue(mockMeetings);
    mockGetByClass.mockResolvedValue(mockStudents);
    mockGetByAssignment.mockResolvedValue(mockAttendanceRecords);
    mockGetByMeetingIds.mockResolvedValue([]);
    mockGetAllDailyForClass.mockResolvedValue(mockDailyRecords);

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-1' },
      profile: { uid: 'teacher-1', displayName: 'Guru Fikih' },
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue(workspaceState as any);
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <ApplicationProvider app={mockApp}>
          <AttendanceReportPage />
        </ApplicationProvider>
      </ToastProvider>
    );
  };

  const getMonthSelect = () => {
    const label = screen.getByText('Bulan:');
    return label.parentElement!.querySelector('select')!;
  };

  it('1. Four recorded attendance dates, all attended, plus two future scheduled meetings without records: percentage remains 100%', async () => {
    // 4 completed meetings + 2 future SCHEDULED meetings
    const meetings = [
      { id: 'm-oct-1', date: '2026-10-06', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-2', date: '2026-10-13', meetingNumber: 2, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-3', date: '2026-10-20', meetingNumber: 3, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-4', date: '2026-10-27', meetingNumber: 4, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-5', date: '2026-10-28', meetingNumber: 5, teachingAssignmentId: 'asg-1', status: 'SCHEDULED' },
      { id: 'm-oct-6', date: '2026-10-29', meetingNumber: 6, teachingAssignmentId: 'asg-1', status: 'SCHEDULED' },
    ];
    mockGetAllMeetings.mockResolvedValue(meetings);
    // Attendance only exists for the 4 completed meetings (Ahmad attended all 4)
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-1', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
      { id: 'att-2', studentId: 'std-1', date: '2026-10-13', meetingId: 'm-oct-2', status: 'PRESENT' },
      { id: 'att-3', studentId: 'std-1', date: '2026-10-20', meetingId: 'm-oct-3', status: 'PRESENT' },
      { id: 'att-4', studentId: 'std-1', date: '2026-10-27', meetingId: 'm-oct-4', status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      // Total Sesi must be 4 (not inflated to 6 by future scheduled meetings)
      expect(row).toHaveTextContent('4');
      // Percentage 4/4 = 100% (not deflated to 67%)
      expect(row).toHaveTextContent('100%');
      expect(row).not.toHaveTextContent('67%');
      expect(row).not.toHaveTextContent('Perlu Pembinaan');
    });
  });

  it('2. Four recorded attendance dates, all attended, plus one past scheduled meeting without records: percentage remains 100%', async () => {
    // 4 completed meetings + 1 past SCHEDULED meeting without attendance records
    const meetings = [
      { id: 'm-oct-1', date: '2026-10-06', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-2', date: '2026-10-10', meetingNumber: 2, teachingAssignmentId: 'asg-1', status: 'SCHEDULED' }, // past scheduled, unrecorded
      { id: 'm-oct-3', date: '2026-10-13', meetingNumber: 3, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-4', date: '2026-10-20', meetingNumber: 4, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-5', date: '2026-10-27', meetingNumber: 5, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    ];
    mockGetAllMeetings.mockResolvedValue(meetings);
    // Attendance only exists for the 4 completed dates
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-1', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
      { id: 'att-2', studentId: 'std-1', date: '2026-10-13', meetingId: 'm-oct-3', status: 'PRESENT' },
      { id: 'att-3', studentId: 'std-1', date: '2026-10-20', meetingId: 'm-oct-4', status: 'PRESENT' },
      { id: 'att-4', studentId: 'std-1', date: '2026-10-27', meetingId: 'm-oct-5', status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      // Total Sesi must be 4 (not inflated to 5 by unrecorded past meeting)
      expect(row).toHaveTextContent('4');
      // Percentage 4/4 = 100% (not penalizing student to 80%)
      expect(row).toHaveTextContent('100%');
      expect(row).not.toHaveTextContent('80%');
    });
  });

  it('3. A recorded attendance date remains counted even if its journal meeting cannot be resolved', async () => {
    // Journal meeting has been deleted or cannot be resolved from meetings array
    mockGetAllMeetings.mockResolvedValue([]);
    // Persisted attendance record has its own date
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-orphan-1', studentId: 'std-1', date: '2026-10-14', meetingId: 'ghost-meeting-id', status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent('1'); // Total Sesi
      expect(row).toHaveTextContent('100%');
    });
  });

  it('4. An unlinked physical-attendance record (meetingId: null) remains counted by its saved date', async () => {
    mockGetAllMeetings.mockResolvedValue([]);
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-physical-1', studentId: 'std-1', date: '2026-10-15', meetingId: null, status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent('1'); // Total Sesi
      expect(row).toHaveTextContent('100%');
    });
  });

  it('5. Two journal meetings on one date plus one recorded attendance date count as one denominator date', async () => {
    const meetings = [
      { id: 'm-oct-1a', date: '2026-10-06', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
      { id: 'm-oct-1b', date: '2026-10-06', meetingNumber: 2, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    ];
    mockGetAllMeetings.mockResolvedValue(meetings);
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-1', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1a', status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent('1'); // Total Sesi = 1 (not 2)
      expect(row).toHaveTextContent('100%');
    });
  });

  it('6. Monthly filter uses only recorded attendance dates in the selected month and year', async () => {
    // 6 September records, 4 October records
    const sepRecords = Array.from({ length: 6 }, (_, idx) => ({
      id: `att-sep-${idx + 1}`,
      studentId: 'std-1',
      date: `2026-09-${String(idx + 1).padStart(2, '0')}`,
      meetingId: `m-sep-${idx + 1}`,
      status: 'ABSENT',
    }));
    const octRecords = [
      { id: 'att-oct-1', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
      { id: 'att-oct-2', studentId: 'std-1', date: '2026-10-13', meetingId: 'm-oct-2', status: 'PRESENT' },
      { id: 'att-oct-3', studentId: 'std-1', date: '2026-10-20', meetingId: 'm-oct-3', status: 'PRESENT' },
      { id: 'att-oct-4', studentId: 'std-1', date: '2026-10-27', meetingId: 'm-oct-4', status: 'PRESENT' },

      { id: 'att-oct-5', studentId: 'std-2', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
      { id: 'att-oct-6', studentId: 'std-2', date: '2026-10-13', meetingId: 'm-oct-2', status: 'PRESENT' },
      { id: 'att-oct-7', studentId: 'std-2', date: '2026-10-20', meetingId: 'm-oct-3', status: 'PRESENT' },
      { id: 'att-oct-8', studentId: 'std-2', date: '2026-10-27', meetingId: 'm-oct-4', status: 'ABSENT' },
    ];
    mockGetByAssignment.mockResolvedValue([...sepRecords, ...octRecords]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(ahmadRow).toHaveTextContent('4'); // 4 October sessions (Sep excluded)
      expect(ahmadRow).toHaveTextContent('100%');

      const sitiRow = screen.getByText('Siti Walidah').closest('tr');
      expect(sitiRow).toHaveTextContent('4');
      expect(sitiRow).toHaveTextContent('75%');
    });
  });

  it('7. ALL mode uses distinct recorded dates across the full selected reporting scope', async () => {
    // 6 September records + 4 October records
    const sepRecords = Array.from({ length: 6 }, (_, idx) => ({
      id: `att-sep-${idx + 1}`,
      studentId: 'std-1',
      date: `2026-09-${String(idx + 1).padStart(2, '0')}`,
      meetingId: `m-sep-${idx + 1}`,
      status: 'PRESENT',
    }));
    const octRecords = [
      { id: 'att-oct-1', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
      { id: 'att-oct-2', studentId: 'std-1', date: '2026-10-13', meetingId: 'm-oct-2', status: 'PRESENT' },
      { id: 'att-oct-3', studentId: 'std-1', date: '2026-10-20', meetingId: 'm-oct-3', status: 'PRESENT' },
      { id: 'att-oct-4', studentId: 'std-1', date: '2026-10-27', meetingId: 'm-oct-4', status: 'PRESENT' },
    ];
    mockGetByAssignment.mockResolvedValue([...sepRecords, ...octRecords]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    expect(getMonthSelect()).toHaveValue('ALL');

    await waitFor(() => {
      const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(ahmadRow).toHaveTextContent('10'); // Total 10 distinct recorded dates
      expect(ahmadRow).toHaveTextContent('100%');
    });
  });

  it('8. Homeroom monthly calculations remain based on distinct recorded daily-attendance dates', async () => {
    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();

    const homeroomTab = screen.getByRole('button', { name: /Presensi Harian Wali Kelas/i });
    fireEvent.click(homeroomTab);

    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(ahmadRow).toHaveTextContent('10'); // 10 daily recorded dates in October
      expect(ahmadRow).toHaveTextContent('100%');
      expect(ahmadRow).toHaveTextContent('Sangat Baik');
    });
  });

  it('9. Zero-enrollment behavior and report metadata do not invent recorded sessions when no records exist', async () => {
    mockGetByClass.mockResolvedValue([]);
    // Journal meetings exist in October, but ZERO attendance records exist:
    mockGetByAssignment.mockResolvedValue([]);

    renderComponent();

    expect(await screen.findByText(/Belum ada data siswa atau catatan presensi untuk kelas ini/i)).toBeInTheDocument();

    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    // Under new semantics, 0 attendance records = 0 Sesi (does NOT invent 4 sessions from unrecorded meetings)
    await waitFor(() => {
      expect(screen.getByText('0 Sesi')).toBeInTheDocument();
    });

    // In Homeroom mode with 10 daily records:
    const homeroomTab = screen.getByRole('button', { name: /Presensi Harian Wali Kelas/i });
    fireEvent.click(homeroomTab);

    await waitFor(() => {
      expect(screen.getByText('Hari Presensi Tercatat')).toBeInTheDocument();
      expect(screen.getByText('10 Hari')).toBeInTheDocument();
    });
  });

  it('10. Print, Excel export, and share payload use consistent terminology and denominator semantics', async () => {
    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      expect(screen.getByText('Ahmad Dahlan').closest('tr')).toHaveTextContent('100%');
    });

    // A. Print Layout metadata check:
    expect(screen.getByText('Sesi Presensi Tercatat')).toBeInTheDocument();
    expect(screen.getByText('4 Sesi')).toBeInTheDocument();

    // B. Excel export check:
    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockAoaToSheet).toHaveBeenCalled();
    });

    const sheetData = mockAoaToSheet.mock.calls[0][0];
    const metadataRow = sheetData.find((row: any[]) => row && typeof row[0] === 'string' && row[0].startsWith('Sesi Presensi Tercatat:'));
    expect(metadataRow).toBeDefined();
    expect(metadataRow[0]).toBe('Sesi Presensi Tercatat: 4');

    // C. Share modal check:
    const shareBtn = screen.getByRole('button', { name: /Bagikan Tautan Publik/i });
    fireEvent.click(shareBtn);

    expect(await screen.findByText(/Tautan Berbagi Laporan Resmi/i)).toBeInTheDocument();
  });

  it('11. One valid recorded date plus an orphaned PRESENT record with no usable date: orphan does not inflate status totals or percentage', async () => {
    const meetings = [
      { id: 'm-oct-1', date: '2026-10-06', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    ];
    mockGetAllMeetings.mockResolvedValue(meetings);
    mockGetByAssignment.mockResolvedValue([
      // Valid record on 2026-10-06
      { id: 'att-valid', studentId: 'std-1', date: '2026-10-06', meetingId: 'm-oct-1', status: 'PRESENT' },
      // Orphan record: no date, and meetingId cannot be resolved
      { id: 'att-orphan', studentId: 'std-1', date: '', meetingId: 'unresolvable-ghost', status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();

    // In ALL mode:
    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      // Total Sesi should be 1 (orphan excluded from denominator)
      expect(row).toHaveTextContent('1');
      // Present count should be 1, NOT 2 (orphan excluded from numerator)
      // Percentage 1/1 = 100% (not 200%)
      expect(row).toHaveTextContent('100%');
      expect(row).not.toHaveTextContent('200%');
    });

    // Also in monthly mode:
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });
    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent('1');
      expect(row).toHaveTextContent('100%');
    });
  });

  it('12. Only orphaned records in the selected report scope: no artificial session/date or absence is created', async () => {
    mockGetAllMeetings.mockResolvedValue([]);
    // Only orphaned records without dates
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-orphan-1', studentId: 'std-1', date: '', meetingId: 'unresolvable-1', status: 'PRESENT' },
      { id: 'att-orphan-2', studentId: 'std-1', date: '', meetingId: 'unresolvable-2', status: 'ABSENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      // Total Sesi = 0
      expect(row).toHaveTextContent('0');
      // Percentage = 0%
      expect(row).toHaveTextContent('0%');
    });

    // Header metadata must show 0 Sesi (no artificial session created)
    expect(screen.getByText('0 Sesi')).toBeInTheDocument();
  });

  it('13. A record without date but with a resolvable meetingId continues to use the meeting date', async () => {
    const meetings = [
      { id: 'm-oct-1', date: '2026-10-06', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' },
    ];
    mockGetAllMeetings.mockResolvedValue(meetings);
    // Record has no date property, but has resolvable meetingId
    mockGetByAssignment.mockResolvedValue([
      { id: 'att-legacy-1', studentId: 'std-1', date: '', meetingId: 'm-oct-1', status: 'PRESENT' },
    ]);

    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      const row = screen.getByText('Ahmad Dahlan').closest('tr');
      expect(row).not.toBeNull();
      // Denominator should be 1 resolved from m-oct-1
      expect(row).toHaveTextContent('1');
      // Present count = 1, percentage = 100%
      expect(row).toHaveTextContent('100%');
    });
  });

  it('14. Homeroom metadata print and Excel export labels use "Hari Presensi Tercatat" instead of "Total Hari Efektif"', async () => {
    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();

    // Switch to Homeroom tab
    const homeroomTab = screen.getByRole('button', { name: /Presensi Harian Wali Kelas/i });
    fireEvent.click(homeroomTab);

    fireEvent.change(getMonthSelect(), { target: { value: '10' } });

    await waitFor(() => {
      expect(screen.getByText('Ahmad Dahlan').closest('tr')).toHaveTextContent('100%');
    });

    // A. Print Layout metadata check for Homeroom:
    expect(screen.getByText('Hari Presensi Tercatat')).toBeInTheDocument();
    expect(screen.queryByText('Total Hari Efektif')).not.toBeInTheDocument();
    expect(screen.getByText('10 Hari')).toBeInTheDocument();

    // B. Excel export check for Homeroom:
    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockAoaToSheet).toHaveBeenCalled();
    });

    const sheetData = mockAoaToSheet.mock.calls[0][0];
    const homeroomMetaRow = sheetData.find((row: any[]) => row && typeof row[0] === 'string' && row[0].startsWith('Hari Presensi Tercatat:'));
    expect(homeroomMetaRow).toBeDefined();
    expect(homeroomMetaRow[0]).toBe('Hari Presensi Tercatat: 10');
    // Ensure "Total Hari Efektif:" is not present
    const misleadingRow = sheetData.find((row: any[]) => row && typeof row[0] === 'string' && row[0].startsWith('Total Hari Efektif:'));
    expect(misleadingRow).toBeUndefined();
  });

  it('15. Canonical classification helper getPerformanceLevel strictly classifies boundaries and invalid inputs', () => {
    // KKM 75
    expect(getPerformanceLevel(0, 75)).toBe('Perlu Bimbingan');
    expect(getPerformanceLevel(75.00, 75)).toBe('Perlu Bimbingan');
    expect(getPerformanceLevel(75.01, 75)).toBe('Cukup');
    expect(getPerformanceLevel(85.00, 75)).toBe('Cukup');
    expect(getPerformanceLevel(85.01, 75)).toBe('Baik');
    expect(getPerformanceLevel(95.00, 75)).toBe('Baik');
    expect(getPerformanceLevel(95.01, 75)).toBe('Sangat Baik');
    expect(getPerformanceLevel(100, 75)).toBe('Sangat Baik');

    // KKM 60
    expect(getPerformanceLevel(60.00, 60)).toBe('Perlu Bimbingan');
    expect(getPerformanceLevel(60.01, 60)).toBe('Cukup');
    expect(getPerformanceLevel(70.00, 60)).toBe('Cukup');
    expect(getPerformanceLevel(70.01, 60)).toBe('Baik');
    expect(getPerformanceLevel(80.00, 60)).toBe('Baik');
    expect(getPerformanceLevel(80.01, 60)).toBe('Sangat Baik');

    // KKM 65
    expect(getPerformanceLevel(65.00, 65)).toBe('Perlu Bimbingan');
    expect(getPerformanceLevel(65.01, 65)).toBe('Cukup');
    expect(getPerformanceLevel(75.00, 65)).toBe('Cukup');
    expect(getPerformanceLevel(75.01, 65)).toBe('Baik');
    expect(getPerformanceLevel(85.00, 65)).toBe('Baik');
    expect(getPerformanceLevel(85.01, 65)).toBe('Sangat Baik');

    // Invalid / non-finite inputs return null (never Perlu Bimbingan)
    expect(getPerformanceLevel(NaN, 75)).toBeNull();
    expect(getPerformanceLevel(Infinity, 75)).toBeNull();
    expect(getPerformanceLevel(-Infinity, 75)).toBeNull();
    expect(getPerformanceLevel(null, 75)).toBeNull();
    expect(getPerformanceLevel(undefined, 75)).toBeNull();
    expect(getPerformanceLevel(-10, 75)).toBeNull();
    expect(getPerformanceLevel(110, 75)).toBeNull();
    expect(getPerformanceLevel(90, undefined)).toBeNull();
    expect(getPerformanceLevel(90, null)).toBeNull();
    expect(getPerformanceLevel(90, 0)).toBeNull();
  });

  it('16. Strict UI and Excel parity across every KKM-based classification range (KKM = 75)', async () => {
    mockGetSchoolSettings.mockResolvedValue({
      schoolName: 'MTs DADU Test',
      city: 'Jakarta',
      defaultKkm: 75,
    });

    // 4 students representing key brackets under KKM 75:
    // std-1: 10/10 = 100% (> 95) -> 'Sangat Baik'
    // std-2: 9/10 = 90% (> 85 and <= 95) -> 'Baik'
    // std-3: 8/10 = 80% (> 75 and <= 85) -> 'Cukup'
    // std-4: 5/10 = 50% (<= 75) -> 'Perlu Bimbingan'
    const testStudents = [
      { id: 'enr-1', studentId: 'std-1', rollNumber: 1, status: 'ACTIVE', student: { id: 'std-1', fullName: 'Siswa Teladan', nis: '1001', nisn: '001', gender: 'L' as const } },
      { id: 'enr-2', studentId: 'std-2', rollNumber: 2, status: 'ACTIVE', student: { id: 'std-2', fullName: 'Siswa Baik', nis: '1002', nisn: '002', gender: 'P' as const } },
      { id: 'enr-3', studentId: 'std-3', rollNumber: 3, status: 'ACTIVE', student: { id: 'std-3', fullName: 'Siswa Cukup', nis: '1003', nisn: '003', gender: 'L' as const } },
      { id: 'enr-4', studentId: 'std-4', rollNumber: 4, status: 'ACTIVE', student: { id: 'std-4', fullName: 'Siswa Kritis', nis: '1004', nisn: '004', gender: 'P' as const } },
    ];
    mockGetByClass.mockResolvedValue(testStudents);

    const meetings = Array.from({ length: 10 }, (_, i) => ({
      id: `m-oct-${i + 1}`,
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      meetingNumber: i + 1,
      teachingAssignmentId: 'asg-1',
      status: 'COMPLETED',
    }));
    mockGetAllMeetings.mockResolvedValue(meetings);

    const attendanceRecords: any[] = [];
    meetings.forEach((m, idx) => {
      attendanceRecords.push({ id: `att-1-${m.id}`, studentId: 'std-1', date: m.date, meetingId: m.id, status: 'PRESENT' });
      attendanceRecords.push({ id: `att-2-${m.id}`, studentId: 'std-2', date: m.date, meetingId: m.id, status: idx < 1 ? 'ABSENT' : 'PRESENT' });
      attendanceRecords.push({ id: `att-3-${m.id}`, studentId: 'std-3', date: m.date, meetingId: m.id, status: idx < 2 ? 'ABSENT' : 'PRESENT' });
      attendanceRecords.push({ id: `att-4-${m.id}`, studentId: 'std-4', date: m.date, meetingId: m.id, status: idx < 5 ? 'ABSENT' : 'PRESENT' });
    });
    mockGetByAssignment.mockResolvedValue(attendanceRecords);

    renderComponent();

    expect(await screen.findByText('Siswa Teladan')).toBeInTheDocument();

    // 1. Verify UI Rendered Labels:
    const row1 = screen.getByText('Siswa Teladan').closest('tr')!;
    const row2 = screen.getByText('Siswa Baik').closest('tr')!;
    const row3 = screen.getByText('Siswa Cukup').closest('tr')!;
    const row4 = screen.getByText('Siswa Kritis').closest('tr')!;

    expect(row1).toHaveTextContent('100%');
    expect(row1).toHaveTextContent('Sangat Baik');

    expect(row2).toHaveTextContent('90%');
    expect(row2).toHaveTextContent('Baik');
    expect(row2).not.toHaveTextContent('Cukup Baik');

    expect(row3).toHaveTextContent('80%');
    expect(row3).toHaveTextContent('Cukup');
    expect(row3).not.toHaveTextContent('Cukup Baik');

    expect(row4).toHaveTextContent('50%');
    expect(row4).toHaveTextContent('Perlu Bimbingan');
    expect(row4).not.toHaveTextContent('Perlu Pembinaan');

    // 2. Trigger Excel Export:
    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockAoaToSheet).toHaveBeenCalled();
    });

    const sheetData = mockAoaToSheet.mock.calls[0][0];

    // Find student rows in generated Excel sheetData
    const excelRow1 = sheetData.find((r: any[]) => r && r[4] === 'Siswa Teladan');
    const excelRow2 = sheetData.find((r: any[]) => r && r[4] === 'Siswa Baik');
    const excelRow3 = sheetData.find((r: any[]) => r && r[4] === 'Siswa Cukup');
    const excelRow4 = sheetData.find((r: any[]) => r && r[4] === 'Siswa Kritis');

    expect(excelRow1).toBeDefined();
    expect(excelRow2).toBeDefined();
    expect(excelRow3).toBeDefined();
    expect(excelRow4).toBeDefined();

    // Column 12 is '% Kehadiran', Column 13 is 'Keterangan'
    expect(excelRow1[12]).toBe('100%');
    expect(excelRow1[13]).toBe('Sangat Baik');

    expect(excelRow2[12]).toBe('90%');
    expect(excelRow2[13]).toBe('Baik');

    expect(excelRow3[12]).toBe('80%');
    expect(excelRow3[13]).toBe('Cukup');

    expect(excelRow4[12]).toBe('50%');
    expect(excelRow4[13]).toBe('Perlu Bimbingan');

    // 3. Assert Strict Parity: labelInUI === labelInExcel
    expect(row1).toHaveTextContent(excelRow1[13]);
    expect(row2).toHaveTextContent(excelRow2[13]);
    expect(row3).toHaveTextContent(excelRow3[13]);
    expect(row4).toHaveTextContent(excelRow4[13]);

    // Ensure legacy non-canonical strings never appear anywhere in Excel output
    const allExcelKeterangan = sheetData.slice(7).map((r: any[]) => r[13]);
    expect(allExcelKeterangan).not.toContain('Cukup Baik');
    expect(allExcelKeterangan).not.toContain('Perlu Pembinaan');
    expect(allExcelKeterangan).not.toContain('Perlu Pembinaan / Kritis');
  });

  it('17. Safely displays neutral representation when KKM is not configured', async () => {
    mockGetSchoolSettings.mockResolvedValue({
      schoolName: 'MTs DADU Test',
      city: 'Jakarta',
      // defaultKkm is undefined
    });

    const testStudents = [
      { id: 'enr-1', studentId: 'std-1', rollNumber: 1, status: 'ACTIVE', student: { id: 'std-1', fullName: 'Siswa Teladan', nis: '1001', nisn: '001', gender: 'L' as const } },
    ];
    mockGetByClass.mockResolvedValue(testStudents);

    const meetings = [{ id: 'm-1', date: '2026-10-01', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' }];
    mockGetAllMeetings.mockResolvedValue(meetings);
    mockGetByAssignment.mockResolvedValue([{ id: 'att-1', studentId: 'std-1', date: '2026-10-01', meetingId: 'm-1', status: 'PRESENT' }]);

    renderComponent();

    expect(await screen.findByText('Siswa Teladan')).toBeInTheDocument();

    const row1 = screen.getByText('Siswa Teladan').closest('tr')!;
    expect(row1).toHaveTextContent('-');
    expect(row1).not.toHaveTextContent('Perlu Bimbingan');

    // Stats overview card displays '—' instead of claiming '0 Siswa'
    const criticalCard = screen.getByText('Perlu Bimbingan').closest('div')!;
    expect(criticalCard).toHaveTextContent('—');
    expect(criticalCard).not.toHaveTextContent('0 Siswa');

    // Footer note indicates KKM belum ditentukan
    expect(screen.getByText('KKM belum ditentukan')).toBeInTheDocument();
    expect(screen.getByText(/Batas minimal kehadiran \(KKM\):/)).toHaveTextContent('Belum diatur');

    // Excel export also has '-'
    const exportBtn = screen.getByRole('button', { name: /Ekspor Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockAoaToSheet).toHaveBeenCalled();
    });

    const sheetData = mockAoaToSheet.mock.calls[0][0];
    const excelRow1 = sheetData.find((r: any[]) => r && r[4] === 'Siswa Teladan');
    expect(excelRow1[13]).toBe('-');
  });

  it('17b. Rejects out-of-range or non-finite KKM (0, 101, NaN, Infinity) and safely displays neutral representation', async () => {
    for (const invalidKkm of [0, 101, NaN, Infinity]) {
      mockGetSchoolSettings.mockResolvedValue({
        schoolName: 'MTs DADU Test',
        defaultKkm: invalidKkm,
      });

      const testStudents = [
        { id: 'enr-1', studentId: 'std-1', rollNumber: 1, status: 'ACTIVE', student: { id: 'std-1', fullName: 'Siswa Satu', nis: '1001', nisn: '001', gender: 'L' as const } },
      ];
      mockGetByClass.mockResolvedValue(testStudents);

      const meetings = [{ id: 'm-1', date: '2026-10-01', meetingNumber: 1, teachingAssignmentId: 'asg-1', status: 'COMPLETED' }];
      mockGetAllMeetings.mockResolvedValue(meetings);
      mockGetByAssignment.mockResolvedValue([{ id: 'att-1', studentId: 'std-1', date: '2026-10-01', meetingId: 'm-1', status: 'PRESENT' }]);

      const { unmount } = renderComponent();

      expect(await screen.findByText('Siswa Satu')).toBeInTheDocument();

      const row1 = screen.getByText('Siswa Satu').closest('tr')!;
      expect(row1).toHaveTextContent('-');
      expect(row1).not.toHaveTextContent('Perlu Bimbingan');

      // Card must show '—' and NOT claim '0 Siswa'
      const criticalCard = screen.getByText('Perlu Bimbingan').closest('div')!;
      expect(criticalCard).toHaveTextContent('—');
      expect(criticalCard).not.toHaveTextContent('0 Siswa');

      // Footer note and legend
      expect(screen.getByText('KKM belum ditentukan')).toBeInTheDocument();
      expect(screen.getByText(/Batas minimal kehadiran \(KKM\):/)).toHaveTextContent('Belum diatur');

      unmount();
    }
  });


  it('18. End-to-end payload pipeline: passes schoolSettings defaultKkm into ShareReportModal payload and produces consistent classification in PublicReportViewer', async () => {
    // 1. Settings configured with defaultKkm = 65
    mockGetSchoolSettings.mockResolvedValue({
      schoolName: 'MTs Al-Huda DADU',
      defaultKkm: 65,
    });

    // 4 students with percentages: 60% (<=65), 70% (65<P<=75), 80% (75<P<=85), 90% (>85)
    const testStudents = [
      { id: 'enr-1', studentId: 'std-1', rollNumber: 1, status: 'ACTIVE', student: { id: 'std-1', fullName: 'Siswa 60%', nis: '1001', nisn: '001', gender: 'L' as const } },
      { id: 'enr-2', studentId: 'std-2', rollNumber: 2, status: 'ACTIVE', student: { id: 'std-2', fullName: 'Siswa 70%', nis: '1002', nisn: '002', gender: 'P' as const } },
      { id: 'enr-3', studentId: 'std-3', rollNumber: 3, status: 'ACTIVE', student: { id: 'std-3', fullName: 'Siswa 80%', nis: '1003', nisn: '003', gender: 'L' as const } },
      { id: 'enr-4', studentId: 'std-4', rollNumber: 4, status: 'ACTIVE', student: { id: 'std-4', fullName: 'Siswa 90%', nis: '1004', nisn: '004', gender: 'P' as const } },
    ];
    mockGetByClass.mockResolvedValue(testStudents);

    const meetings = Array.from({ length: 10 }, (_, i) => ({
      id: `m-${i + 1}`,
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      meetingNumber: i + 1,
      teachingAssignmentId: 'asg-1',
      status: 'COMPLETED',
    }));
    mockGetAllMeetings.mockResolvedValue(meetings);

    const attendanceRecords: any[] = [];
    meetings.forEach((m, idx) => {
      attendanceRecords.push({ id: `att-1-${idx}`, studentId: 'std-1', date: m.date, meetingId: m.id, status: idx < 6 ? 'PRESENT' : 'ABSENT' });
      attendanceRecords.push({ id: `att-2-${idx}`, studentId: 'std-2', date: m.date, meetingId: m.id, status: idx < 7 ? 'PRESENT' : 'ABSENT' });
      attendanceRecords.push({ id: `att-3-${idx}`, studentId: 'std-3', date: m.date, meetingId: m.id, status: idx < 8 ? 'PRESENT' : 'ABSENT' });
      attendanceRecords.push({ id: `att-4-${idx}`, studentId: 'std-4', date: m.date, meetingId: m.id, status: idx < 9 ? 'PRESENT' : 'ABSENT' });
    });
    mockGetByAssignment.mockResolvedValue(attendanceRecords);

    // 2. Render AttendanceReportPage
    const { unmount } = renderComponent();

    expect(await screen.findByText('Siswa 60%')).toBeInTheDocument();

    // Verify main UI performance labels based on KKM 65
    expect(screen.getByText('Siswa 60%').closest('tr')).toHaveTextContent('Perlu Bimbingan');
    expect(screen.getByText('Siswa 70%').closest('tr')).toHaveTextContent('Cukup');
    expect(screen.getByText('Siswa 80%').closest('tr')).toHaveTextContent('Baik');
    expect(screen.getByText('Siswa 90%').closest('tr')).toHaveTextContent('Sangat Baik');

    // 3. Open Share Modal
    const shareBtn = screen.getByRole('button', { name: /Bagikan Tautan Publik/i });
    fireEvent.click(shareBtn);

    // 4. In Share Modal, click "Buat Tautan Publik"
    const generateBtn = await screen.findByRole('button', { name: /Buat Tautan Publik/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockCreateSharedReport).toHaveBeenCalled();
    });

    // 5. Inspect the generated payload passed to createSharedReport
    const createCallArg = mockCreateSharedReport.mock.calls[0][0];
    const sharedPayload = createCallArg.payload;

    expect(sharedPayload.attendanceData.kkm).toBe(65);
    expect(sharedPayload.attendanceData.statistics.criticalCount).toBe(1); // Only Siswa 60% <= 65%

    unmount();

    // 6. Test reception of this exact payload in PublicReportViewerPage
    mockGetSharedReportByToken.mockResolvedValue({
      id: 'rep-token-65',
      token: 'rep-token-65',
      reportType: 'ATTENDANCE',
      hasPasscode: false,
      passcode: '',
      payload: sharedPayload,
    });

    render(
      <ApplicationProvider app={mockApp as any}>
        <PublicReportViewerPage token="rep-token-65" />
      </ApplicationProvider>
    );

    expect(await screen.findByText('Siswa 60%')).toBeInTheDocument();

    // Public Viewer must classify identically using KKM = 65 received in payload
    expect(screen.getByText('Siswa 60%').closest('tr')).toHaveTextContent('Perlu Bimbingan');
    expect(screen.getByText('Siswa 70%').closest('tr')).toHaveTextContent('Cukup');
    expect(screen.getByText('Siswa 80%').closest('tr')).toHaveTextContent('Baik');
    expect(screen.getByText('Siswa 90%').closest('tr')).toHaveTextContent('Sangat Baik');

    // Public Viewer statistics strip shows KKM 65 and criticalCount = 1
    const publicCriticalCard = screen.getByText('Perlu Bimbingan (≤65%)').closest('div')!;
    expect(publicCriticalCard).toHaveTextContent('1 Siswa');
  });
});
