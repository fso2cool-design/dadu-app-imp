import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import {
  SubjectAttendancePage,
  type SubjectAttendancePageHandle,
  type SubjectAttendancePageProps,
} from './SubjectAttendancePage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';

vi.mock('./MeetingsJournalPage', () => ({
  invalidateMeetingsJournalCache: vi.fn(),
}));

vi.mock('../../utils/date', () => ({
  getTodayISO: vi.fn(() => '2026-10-10'),
  formatDateIndonesian: vi.fn((d) => d),
}));

vi.mock('../../utils/lazyXlsx', () => ({
  loadXlsx: vi.fn(),
}));

describe('SubjectAttendancePage UX & Guard Implementation', () => {
  const mockGetByAssignment = vi.fn();
  const mockGetByClass = vi.fn();
  const mockGetByDate = vi.fn();
  const mockSaveSubjectAttendance = vi.fn();
  const mockTriggerSyncFeedback = vi.fn();

  const mockApp = {
    meeting: {
      getByAssignment: mockGetByAssignment,
    },
    meetings: {
      getAll: vi.fn().mockResolvedValue([]),
    },
    enrollment: {
      getByClass: mockGetByClass,
    },
    attendance: {
      getByDate: mockGetByDate,
      getByAssignment: vi.fn().mockResolvedValue([]),
      getByMeetingIds: vi.fn().mockResolvedValue([]),
      saveSubjectAttendance: mockSaveSubjectAttendance,
    },
  } as any;

  const mockStudents = [
    {
      id: 'enr-1',
      studentId: 'std-1',
      rollNumber: 1,
      status: 'ACTIVE',
      student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
    },
    {
      id: 'enr-2',
      studentId: 'std-2',
      rollNumber: 2,
      status: 'ACTIVE',
      student: { id: 'std-2', fullName: 'Budi Santoso', nis: '1002', gender: 'L' as const },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetByAssignment.mockResolvedValue([]);
    mockGetByClass.mockResolvedValue(mockStudents);
    mockGetByDate.mockResolvedValue([]);
    mockSaveSubjectAttendance.mockResolvedValue({
      totalPresent: 2,
      totalSick: 0,
      totalPermitted: 0,
      totalAbsent: 0,
      totalDispensation: 0,
    });

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-uid' },
      profile: { uid: 'teacher-uid', role: 'TEACHER', displayName: 'Guru Pengampu' },
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      teachingAssignments: [
        {
          id: 'asg-1',
          classId: 'cls-1',
          className: '7A',
          subjectId: 'sub-1',
          subjectName: 'Matematika',
        },
      ],
      activeAcademicYear: { id: 'ay-2025', name: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      triggerSyncFeedback: mockTriggerSyncFeedback,
      checkIsHoliday: vi.fn().mockReturnValue({ isHoliday: false }),
      attendanceSettings: {
        schoolDaysOption: 6,
        holidays: [],
      },
      updateAttendanceSettings: vi.fn(),
    } as any);
  });

  const renderComponent = (
    props: Partial<SubjectAttendancePageProps> = {},
    ref?: React.Ref<SubjectAttendancePageHandle>
  ) => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <ApplicationProvider app={mockApp}>
            <SubjectAttendancePage
              ref={ref}
              initialContext={{ assignmentId: 'asg-1', date: '2026-10-10' }}
              {...props}
            />
          </ApplicationProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };

  const renderWithDataRouter = (
    props: Partial<SubjectAttendancePageProps> = {},
    options: { initialEntries?: string[]; initialIndex?: number } = {}
  ) => {
    let capturedRouter: any = null;

    const router = createMemoryRouter(
      [
        {
          path: '/teacher/journal',
          element: <div data-testid="journal-page">Halaman Jurnal</div>,
        },
        {
          path: '/teacher/attendance',
          element: (
            <ToastProvider>
              <ApplicationProvider app={mockApp}>
                <SubjectAttendancePage
                  initialContext={{ assignmentId: 'asg-1', date: '2026-10-10' }}
                  {...props}
                />
              </ApplicationProvider>
            </ToastProvider>
          ),
        },
      ],
      {
        initialEntries: options.initialEntries || ['/teacher/journal', '/teacher/attendance'],
        initialIndex: options.initialIndex !== undefined ? options.initialIndex : 1,
      }
    );

    capturedRouter = router;
    const renderResult = render(<RouterProvider router={router} />);

    return {
      ...renderResult,
      router: capturedRouter,
    };
  };

  // 1. Rendering daftar siswa
  it('1. renders student roster accurately with names and initial controls', async () => {
    renderComponent();

    expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('1001')).toBeInTheDocument();
    expect(screen.getByText('1002')).toBeInTheDocument();
  });

  // 2. Dirty tracking saat status atau catatan berubah
  it('2. tracks dirty state when attendance status or note is updated', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    renderComponent({}, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Before changes, tab switch is allowed directly
    expect(handleRef.current?.requestTabChange('journal')).toBe(true);

    // Modify Ahmad Dahlan status to Sakit (S)
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    // Now dirty: requestTabChange must return false and hold transition
    expect(handleRef.current?.requestTabChange('journal')).toBe(false);

    // Dialog should be displayed
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  // 3. Perpindahan tab ketika form dirty
  it('3. intercepts tab transition when form is dirty and opens unsaved changes modal', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    renderComponent({}, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Make note input dirty
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Terlambat 15 menit' } });

    // Attempt tab change to journal
    const allowed = handleRef.current?.requestTabChange('journal');
    expect(allowed).toBe(false);

    // Modal dialog is shown with title
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByText('Presensi Siswa Belum Disimpan')).toBeInTheDocument();
  });

  // 4. Batal: tab tidak berpindah
  it('4. cancels navigation on modal cancel: keeps tab, modal closes, and unsaved changes preserved', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    handleRef.current?.requestTabChange('journal');

    const modal = await screen.findByRole('dialog');
    const cancelButton = within(modal).getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(mockNavigateParentTab).not.toHaveBeenCalled();
    // Remains dirty
    expect(handleRef.current?.requestTabChange('classes')).toBe(false);
  });

  // 5. Buang perubahan: tab berpindah dan dirty state dibersihkan
  it('5. discards changes on modal discard: executes navigation and clears dirty state', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    handleRef.current?.requestTabChange('journal', { from: 'attendance' });

    const modal = await screen.findByRole('dialog');
    const discardButton = within(modal).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(mockNavigateParentTab).toHaveBeenCalledWith('journal', { from: 'attendance' });

    // Dirty state should now be reset
    expect(handleRef.current?.requestTabChange('classes')).toBe(true);
  });

  // 6. Simpan berhasil: penyimpanan selesai sebelum navigasi
  it('6. saves attendance before completing tab navigation when user chooses save in modal', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    handleRef.current?.requestTabChange('journal');

    const modal = await screen.findByRole('dialog');
    const saveButton = within(modal).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockNavigateParentTab).toHaveBeenCalledWith('journal', undefined);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // 7. Simpan gagal: navigasi tertahan, input dipertahankan, retry tersedia
  it('7. halts navigation on save error, preserves input, displays error, and allows retry', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();

    // First attempt fails
    mockSaveSubjectAttendance.mockRejectedValueOnce(new Error('Simpan gagal Firestore'));

    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Izin sakit gigi' } });

    handleRef.current?.requestTabChange('journal');

    const modal = await screen.findByRole('dialog');
    const saveButton = within(modal).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    // Save was attempted
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });

    // Navigation MUST NOT be called because save failed
    expect(mockNavigateParentTab).not.toHaveBeenCalled();

    // Error feedback displayed
    expect(await screen.findByText(/Simpan gagal Firestore/i)).toBeInTheDocument();

    // Input is preserved
    expect(noteInputs[0]).toHaveValue('Izin sakit gigi');

    // Retry: mock resolves this time
    mockSaveSubjectAttendance.mockResolvedValueOnce({
      totalPresent: 2,
      totalSick: 0,
      totalPermitted: 0,
      totalAbsent: 0,
      totalDispensation: 0,
    });

    // Click save again in modal
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(2);
      expect(mockNavigateParentTab).toHaveBeenCalledWith('journal', undefined);
    });
  });

  // 8. Guard mencegah pemanggilan penyimpanan ganda
  it('8. prevents duplicate concurrent save invocations via synchronous isSavingRef guard', async () => {
    let resolveSave: ((val?: any) => void) | null = null;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    mockSaveSubjectAttendance.mockReturnValueOnce(savePromise);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Mark dirty so main toolbar save button is enabled
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    // Find main toolbar save button
    const toolbarSaveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(toolbarSaveButton).not.toBeDisabled();

    // Rapid double click
    fireEvent.click(toolbarSaveButton);
    fireEvent.click(toolbarSaveButton);

    // Even though clicked twice, saveSubjectAttendance was called only once due to synchronous guard
    expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);

    // Resolve the in-flight save
    resolveSave!({
      totalPresent: 1,
      totalSick: 1,
      totalPermitted: 0,
      totalAbsent: 0,
      totalDispensation: 0,
    });

    await waitFor(() => {
      expect(mockTriggerSyncFeedback).toHaveBeenCalledWith('saved', expect.any(String));
    });
  });

  // 9. Tidak ada modal konfirmasi ganda
  it('9. renders exactly one confirmation dialog in the DOM when navigation is intercepted', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    renderComponent({}, handleRef);

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    handleRef.current?.requestTabChange('journal');

    await screen.findByRole('dialog');
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
  });

  // 10. Form bersih tetap dapat berpindah tab tanpa dialog
  it('10. allows clean form to transition tabs immediately without showing modal dialog', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Clean form: request tab change
    const allowed = handleRef.current?.requestTabChange('journal');
    expect(allowed).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 11. Form bersih: browser Back tidak diblokir
  it('11. does not block browser back navigation when attendance form is clean', async () => {
    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    act(() => {
      router.navigate(-1);
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/teacher/journal');
      expect(screen.getByTestId('journal-page')).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 12. Form kotor: browser Back diblokir dan modal konfirmasi muncul
  it('12. blocks browser back navigation and displays modal when form is dirty', async () => {
    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    // Mark dirty
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    act(() => {
      router.navigate(-1);
    });

    // Navigation must be intercepted, staying on attendance page
    expect(router.state.location.pathname).toBe('/teacher/attendance');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Presensi Siswa Belum Disimpan')).toBeInTheDocument();
  });

  // 13. Batal di modal Back: navigasi dibatalkan, URL tetap, dan input dipertahankan
  it('13. cancels browser back navigation on modal cancel, keeping URL and unsaved inputs', async () => {
    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    act(() => {
      router.navigate(-1);
    });

    const dialog = await screen.findByRole('dialog');
    const cancelButton = within(dialog).getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(router.state.location.pathname).toBe('/teacher/attendance');
    expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
  });

  // 14. Buang perubahan di modal Back: navigasi dilanjutkan satu kali dan dirty state dibersihkan
  it('14. proceeds browser back navigation exactly once and clears dirty state on discard', async () => {
    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    act(() => {
      router.navigate(-1);
    });

    const dialog = await screen.findByRole('dialog');
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/teacher/journal');
      expect(screen.getByTestId('journal-page')).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 15. Simpan berhasil di modal Back: presensi disimpan dulu lalu navigasi dilanjutkan
  it('15. saves attendance before proceeding with browser back navigation on save selection', async () => {
    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    act(() => {
      router.navigate(-1);
    });

    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
      expect(mockTriggerSyncFeedback).toHaveBeenCalledWith('saved', expect.any(String));
      expect(router.state.location.pathname).toBe('/teacher/journal');
      expect(screen.getByTestId('journal-page')).toBeInTheDocument();
    });
  });

  // 16. Simpan gagal di modal Back: navigasi dibatalkan, input dan pesan error dipertahankan
  it('16. halts browser back navigation on save error, retaining input and showing error feedback', async () => {
    mockSaveSubjectAttendance.mockRejectedValueOnce(new Error('Koneksi Firestore terputus'));

    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    act(() => {
      router.navigate(-1);
    });

    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });

    // Navigation must remain halted on attendance page
    expect(router.state.location.pathname).toBe('/teacher/attendance');
    expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
    expect(await screen.findByText(/Koneksi Firestore terputus/i)).toBeInTheDocument();
  });

  // 17. Klik Back berulang saat form kotor tidak memunculkan dialog ganda atau history trap
  it('17. prevents duplicate confirmation dialogs and history traps on repeated back navigation', async () => {
    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    act(() => {
      router.navigate(-1);
      router.navigate(-1);
    });

    await screen.findByRole('dialog');
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);

    const discardButton = within(dialogs[0]).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/teacher/journal');
      expect(screen.getByTestId('journal-page')).toBeInTheDocument();
    });
  });

  // 18. beforeunload event memicu konfirmasi reload/tutup tab saat form dirty
  it('18. triggers beforeunload preventDefault when form is dirty to protect page reload/close', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
