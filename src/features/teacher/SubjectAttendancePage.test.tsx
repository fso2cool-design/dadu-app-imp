import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import {
  SubjectAttendancePage,
  clearSubjectAttendanceCaches,
  type SubjectAttendancePageHandle,
  type SubjectAttendancePageProps,
} from './SubjectAttendancePage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';
import { renderWithProviders } from '../../test/test-utils';

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
    clearSubjectAttendanceCaches();

    const defaultSavedRecords = [
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ];
    mockGetByAssignment.mockResolvedValue([]);
    mockGetByClass.mockResolvedValue(mockStudents);
    mockGetByDate.mockResolvedValue(defaultSavedRecords);
    mockApp.meetings.getAll.mockResolvedValue([]);
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

    act(() => { handleRef.current?.requestTabChange('journal'); });

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

  // A. Presensi mandiri berhasil disimpan (Scenario A)
  it('A. saves unlinked attendance: receives meetingId null, clears dirty/draft banners, cleans save button, and permits navigation without modal', async () => {
    // Skenario A1: Sesi presensi yang sudah tersimpan sebelumnya tanpa jurnal
    mockGetByDate.mockResolvedValueOnce([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ]);

    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // 1. Pilihan jurnal adalah -- Tidak ditautkan --
    const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');
    expect(meetingSelect).toHaveValue('');

    // Awalnya form bersih (tersimpan): tidak ada banner dan tombol simpan disabled
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();

    // 2. Pengguna mengubah status atau catatan siswa
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    // Verifikasi indikator dirty aktif sebelum simpan
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
    expect(saveButton.className).toContain('ring-2');

    // 3. Pengguna menekan Simpan Presensi
    fireEvent.click(saveButton);

    // 4. Fungsi penyimpanan menerima meetingId: null
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
      meetingId: null,
      expectedPreviousMeetingId: null,
      date: '2026-10-10',
    }));

    // 5. Setelah penyimpanan sukses, indikator tidak muncul lagi
    await waitFor(() => {
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
      expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    });

    // 6. Tombol simpan menunjukkan keadaan bersih dan dinonaktifkan
    expect(saveButton).toBeDisabled();
    expect(saveButton.className).toContain('bg-[var(--ds-surface-muted)]');
    expect(saveButton.className).not.toContain('motion-safe:animate-pulse');

    // 7. Navigasi setelah penyimpanan tidak memunculkan modal perubahan belum disimpan
    const canNavigate = handleRef.current?.requestTabChange('journal');
    expect(canNavigate).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // B. Presensi yang tertaut ke jurnal (Scenario B)
  it('B. handles meeting-linked attendance: marks dirty on link change, saves with meetingId, and clears dirty indicators', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan Pertama', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValueOnce([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ]);

    const handleRef = createRef<SubjectAttendancePageHandle>();
    renderComponent({}, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Wait for meeting options to be populated in select
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
    });

    const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');

    // Tautkan ke jurnal: perubahan relasi jurnal dinilai dirty
    fireEvent.change(meetingSelect, { target: { value: 'meet-1' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // Ubah status siswa juga
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[1]);

    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
      meetingId: 'meet-1',
    }));

    // Setelah simpan sukses, indikator dirty menghilang dan tombol dinonaktifkan
    await waitFor(() => {
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
      expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButton).toBeDisabled();
    expect(handleRef.current?.requestTabChange('journal')).toBe(true);
  });

  // C. Penyimpanan gagal (Scenario C)
  it('C. handles save failure: retains user inputs, preserves dirty indicators, prevents navigation, and allows retry', async () => {
    mockGetByDate.mockResolvedValueOnce([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ]);
    mockSaveSubjectAttendance.mockRejectedValueOnce(new Error('Koneksi terputus ke Firestore'));

    const handleRef = createRef<SubjectAttendancePageHandle>();
    renderComponent({}, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Ubah catatan
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Dispensasi lomba cerdas cermat' } });

    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    // Verifikasi pesan error muncul
    expect(await screen.findByText(/Koneksi terputus ke Firestore/i)).toBeInTheDocument();

    // Perubahan pengguna tetap dipertahankan
    expect(noteInputs[0]).toHaveValue('Dispensasi lomba cerdas cermat');

    // Indikator dirty tetap tampil
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    // Navigasi berbahaya tetap dicegah
    let allowedC: boolean | undefined;
    act(() => { allowedC = handleRef.current?.requestTabChange('journal'); });
    expect(allowedC).toBe(false);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Tutup modal agar bisa mencoba simpan lagi dari toolbar
    const cancelButton = screen.getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Pengguna mencoba menyimpan kembali (retry)
    mockSaveSubjectAttendance.mockResolvedValueOnce({
      totalPresent: 2,
      totalSick: 0,
      totalPermitted: 0,
      totalAbsent: 0,
      totalDispensation: 0,
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButton).toBeDisabled();
  });

  // D. Perubahan baru setelah penyimpanan (Scenario D)
  it('D. handles subsequent changes after a successful save: reappears dirty indicator, enables save, and clears on next save', async () => {
    mockGetByDate.mockResolvedValueOnce([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Edit 1
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });

    // Bersih setelah simpan pertama
    await waitFor(() => {
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButton).toBeDisabled();

    // Edit 2: Buat perubahan baru lagi setelah penyimpanan sukses
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[1], { target: { value: 'Sakit flu berat' } });

    // Indikator dirty muncul kembali
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    // Simpan kedua
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(2);
    });

    // Indikator hilang kembali
    await waitFor(() => {
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButton).toBeDisabled();
  });

  // E. Sesi baru (draf belum disimpan) melindungi seluruh navigasi meski belum ada edit baris siswa
  it('E. protects navigation for new unsaved draft sessions even before any student status changes', async () => {
    // Sesi baru: tidak ada record tersimpan di database untuk tanggal ini
    mockGetByDate.mockResolvedValue([]);

    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // 1. Status draf tampil dan tombol simpan aktif/berdenyut
    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).not.toBeDisabled();
    expect(saveButton.className).toContain('ring-2');

    // 2. Mencoba navigasi tanpa mengubah baris apapun: navigasi dicegah dan dialog muncul
    let allowed: boolean | undefined;
    act(() => { allowed = handleRef.current?.requestTabChange('journal'); });
    expect(allowed).toBe(false);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Presensi Siswa Belum Disimpan')).toBeInTheDocument();

    // 3. Membatalkan dialog: dialog tertutup, sesi tetap berada di halaman draf
    const cancelButton = within(dialog).getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockNavigateParentTab).not.toHaveBeenCalled();
    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();

    // 4. Coba simpan dari dialog: setelah simpan sukses, navigasi dilanjutkan
    act(() => { handleRef.current?.requestTabChange('journal'); });
    const dialogAgain = await screen.findByRole('dialog');
    const dialogSaveButton = within(dialogAgain).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(dialogSaveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockNavigateParentTab).toHaveBeenCalledWith('journal', undefined);

    // 5. Setelah simpan sukses, indikator draf hilang dan tombol simpan dinonaktifkan
    await waitFor(() => {
      expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButton).toBeDisabled();
  });

  // F. Sesi baru: browser Back diblokir dan dicegah meninggalkan halaman tanpa menyimpan
  it('F. blocks browser back navigation for new unsaved draft sessions until explicitly discarded or saved', async () => {
    mockGetByDate.mockResolvedValue([]);

    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    // Verifikasi sesi adalah draf baru
    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();

    // Browser back ditekan tanpa edit baris
    act(() => {
      router.navigate(-1);
    });

    // Harus dicegat oleh DataRouterBlocker
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/teacher/attendance');

    // Buang perubahan
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/teacher/journal');
    });
  });

  // G. beforeunload memicu peringatan untuk sesi baru draf yang belum disimpan
  it('G. triggers beforeunload preventDefault for new unsaved draft sessions', async () => {
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  // H. Pergantian jurnal dengan tanggal sama ketika ada perubahan belum disimpan
  it('H. guards meeting switch when target meeting has the same date and form is dirty', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
      expect(screen.getByText('Jurnal Ke-2')).toBeInTheDocument();
    });

    const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
    expect(meetingSelect).toBeInTheDocument();

    // 1. Ubah catatan siswa sehingga form menjadi dirty
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan meet 1' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // 2. Coba ganti ke meet-2 (tanggal sama: 2026-10-10)
    fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });

    // Dialog konfirmasi harus muncul dan meeting belum berganti
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Presensi Siswa Belum Disimpan')).toBeInTheDocument();
    expect(meetingSelect).toHaveValue('meet-1');

    // 3. Batalkan: dialog tertutup, input dan konteks meet-1 dipertahankan
    const cancelButton = within(dialog).getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(meetingSelect).toHaveValue('meet-1');
    expect(noteInputs[0]).toHaveValue('Catatan meet 1');

    // 4. Coba ganti ke meet-2 lagi, lalu pilih Simpan di dialog
    fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });
    const dialog2 = await screen.findByRole('dialog');
    const saveInDialog = within(dialog2).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveInDialog);

    // Harus simpan pada meet-1 (bukan meet-2)
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
      meetingId: 'meet-1',
    }));

    // Setelah simpan sukses, dialog tertutup dan meeting berpindah ke meet-2
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Jurnal Ke-2')).toBeInTheDocument();
    });
  });

  // I. Pergantian jurnal dengan tanggal sama: simpan gagal dan navigasi tertahan
  it('I. halts meeting switch on save failure, preserving pending edits and current meeting', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
    ]);
    mockSaveSubjectAttendance.mockRejectedValueOnce(new Error('Koneksi database terputus'));

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
    });

    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan penting' } });

    const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
    fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });

    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/Koneksi database terputus/i)).toBeInTheDocument();

    // Navigasi tetap tertahan: dialog tetap terbuka atau feedback error muncul, meeting tidak berganti ke meet-2
    expect(screen.getByDisplayValue('Jurnal Ke-1')).toBeInTheDocument();
    expect(noteInputs[0]).toHaveValue('Catatan penting');
  });

  // J. Pergantian tanggal ketika ada draf baru tanpa perubahan baris siswa
  it('J. protects date input change when there is an unsaved new draft even without row modifications', async () => {
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();

    const dateInput = screen.getByDisplayValue('2026-10-10');

    // 1. Coba ganti tanggal via input date
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

    // Dialog konfirmasi harus muncul
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Presensi Siswa Belum Disimpan')).toBeInTheDocument();
    expect(dateInput).toHaveValue('2026-10-10');

    // 2. Batalkan: tanggal tetap 2026-10-10
    const cancelButton = within(dialog).getByRole('button', { name: /Batal/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(dateInput).toHaveValue('2026-10-10');

    // 3. Buang perubahan: tanggal beralih ke 2026-10-15
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });
    const dialog2 = await screen.findByRole('dialog');
    const discardButton = within(dialog2).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(dateInput).toHaveValue('2026-10-15');
    });
  });

  // K. Sesi tersimpan yang bersih dapat berpindah jurnal atau tanggal tanpa dialog
  it('K. allows clean saved session to switch meeting or date immediately without confirmation dialog', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
    });

    expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();

    const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
    fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });

    // Tidak ada dialog konfirmasi
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(meetingSelect).toHaveValue('meet-2');
  });

  // L. Pergantian jurnal dengan buang perubahan
  it('L. discards changes on meeting switch modal discard, reverting rows and transitioning to target meeting', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
    });

    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan sementara' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
    fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });

    const dialog = await screen.findByRole('dialog');
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Jurnal Ke-2')).toBeInTheDocument();
    });
    expect(noteInputs[0]).toHaveValue('');
  });


  // M. Skenario 1 — Buang draf lalu kembali dari Rekap Matriks
  it('M. maintains draft status and permits saving when returning to Input Presensi after discarding to Rekap Matriks', async () => {
    // 1. Sesi draf baru (tidak ada record di database)
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // 2. Status draf muncul dan tombol simpan aktif
    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).not.toBeDisabled();

    // 3. Beralih ke Rekap Matriks (tombol tab "Rekap Matriks Presensi")
    const matrixTabButton = screen.getByRole('tab', { name: /Rekap Matriks/i });
    fireEvent.click(matrixTabButton);

    // Modal dialog konfirmasi muncul
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Presensi Siswa Belum Disimpan')).toBeInTheDocument();

    // Pilih Buang Perubahan
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    // Sekarang berada di Rekap Matriks: unduh excel ada
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText(/Unduh Rekap Matriks/i)).toBeInTheDocument();
    });

    // 4. Kembali ke Input Presensi pada tanggal yang sama
    const takeTabButton = screen.getByRole('tab', { name: /Input Presensi/i });
    fireEvent.click(takeTabButton);

    // 5. Sesi harus kembali dikenali sebagai draf dan pengguna tetap dapat menyimpan presensi
    await waitFor(() => {
      expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();
    });
    const saveButtonAgain = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButtonAgain).not.toBeDisabled();

    // Pastikan pengguna tetap dapat menyimpan presensi
    fireEvent.click(saveButtonAgain);
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });

    // Setelah disimpan, status draf hilang dan tombol simpan dinonaktifkan
    await waitFor(() => {
      expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButtonAgain).toBeDisabled();
  });

  // N. Skenario 2 — Buang perubahan lalu berpindah jurnal pada tanggal yang sama
  it('N. reflects correct draft/saved status and context when discarding changes and switching meeting on same date', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
      expect(screen.getByText('Jurnal Ke-2')).toBeInTheDocument();
    });

    // Ubah catatan siswa
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan sementara draf' } });

    // Pilih meet-2 pada tanggal yang sama
    const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');
    fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });

    const dialog = await screen.findByRole('dialog');
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    // Modal tutup, meeting beralih ke meet-2, catatan siswa kembali ke baseline (kosong)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Jurnal Ke-2')).toBeInTheDocument();
    });
    expect(noteInputs[0]).toHaveValue('');

    // Karena di database belum tersimpan rekaman, status tetap draf dan tombol simpan aktif
    expect(screen.getByText('Draf — belum disimpan')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).not.toBeDisabled();

    // Simpan presensi untuk meet-2
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
        meetingId: 'meet-2',
      }));
    });
  });

  // O. Skenario 3 — Buang perubahan pada sesi yang sebelumnya sudah tersimpan
  it('O. reverts to persistent saved baseline on discard, clears dirty indicator, and allows subsequent clean navigation', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    mockGetByDate.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: 'Catatan asli tersimpan', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ]);

    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Sesi tersimpan: bersih di awal
    expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();

    // 1. Ubah catatan siswa
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan baru diedit' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();

    // 2. Coba navigasi ke tab journal -> dialog muncul
    const allowed = handleRef.current?.requestTabChange('journal');
    expect(allowed).toBe(false);

    const dialog = await screen.findByRole('dialog');
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockNavigateParentTab).toHaveBeenCalledWith('journal', undefined);

    // 3. Nilai kembali ke baseline tersimpan
    expect(noteInputs[0]).toHaveValue('Catatan asli tersimpan');

    // 4. Indikator dirty hilang, tombol simpan kembali disabled
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Navigasi berikutnya berlangsung tanpa dialog
    const secondAllowed = handleRef.current?.requestTabChange('classes');
    expect(secondAllowed).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

});
