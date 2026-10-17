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
          academicYearId: 'ay-2025',
          semester: 'GANJIL',
          isActive: true,
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
      setSelectedAssignment: vi.fn(),
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
      // When clean, requestTabChange returns true directly and no modal is opened
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

  // E. Sesi baru dimulai dengan status netral/unrecorded, save disabled, dan tidak memblokir navigasi
  it('E. starts fresh session with unselected status, disabled save, and permits clean navigation', async () => {
    // Sesi baru: tidak ada record tersimpan di database untuk tanggal ini
    mockGetByDate.mockResolvedValue([]);

    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // 1. Tidak ada banner draf false-dirty, tombol simpan dinonaktifkan
    expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();

    // 2. Seluruh status unselected
    expect(screen.getByText(/2 belum diisi/i)).toBeInTheDocument();
    expect(screen.getByText(/— Tingkat Kehadiran/i)).toBeInTheDocument();

    // 3. Navigasi tanpa edit baris: diizinkan langsung tanpa dialog
    let allowed: boolean | undefined;
    act(() => { allowed = handleRef.current?.requestTabChange('journal'); });
    expect(allowed).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // F. Sesi baru: browser Back tidak diblokir sebelum guru melakukan tindakan eksplisit
  it('F. does not block browser back navigation for fresh unedited sessions', async () => {
    mockGetByDate.mockResolvedValue([]);

    const { router } = renderWithDataRouter();

    await screen.findByText('Ahmad Dahlan');

    // Browser back ditekan tanpa edit baris
    act(() => {
      router.navigate(-1);
    });

    // Tidak ada dialog, langsung berpindah
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/teacher/journal');
    });
  });

  // G. beforeunload tidak memicu peringatan untuk sesi baru yang belum diedit
  it('G. does not trigger beforeunload preventDefault for fresh unedited sessions', async () => {
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  // H. Pergantian jurnal dengan tanggal sama ketika ada perubahan belum disimpan
  it('H. guards meeting switch when target meeting has the same date and form is dirty', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
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

    const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
    expect(meetingSelect).toBeInTheDocument();

    // 1. Ubah catatan siswa sehingga form menjadi dirty
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan meet 1' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // 2. Coba ganti ke unlinked (tanggal sama: 2026-10-10)
    fireEvent.change(meetingSelect, { target: { value: '' } });

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

    // 4. Coba ganti ke unlinked lagi, lalu pilih Simpan di dialog
    fireEvent.change(meetingSelect, { target: { value: '' } });
    const dialog2 = await screen.findByRole('dialog');
    const saveInDialog = within(dialog2).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveInDialog);

    // Harus simpan pada meet-1
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
      meetingId: 'meet-1',
    }));

    // Setelah simpan sukses, dialog tertutup dan meeting berpindah ke unlinked
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toBeInTheDocument();
    });
  });

  // I. Pergantian jurnal dengan tanggal sama: simpan gagal dan navigasi tertahan
  it('I. halts meeting switch on save failure, preserving pending edits and current meeting', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
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
    fireEvent.change(meetingSelect, { target: { value: '' } });

    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/Koneksi database terputus/i)).toBeInTheDocument();

    // Navigasi tetap tertahan: dialog tetap terbuka atau feedback error muncul, meeting tidak berganti
    expect(screen.getByDisplayValue('Jurnal Ke-1')).toBeInTheDocument();
    expect(noteInputs[0]).toHaveValue('Catatan penting');
  });

  // J. Pergantian tanggal pada sesi baru tanpa perubahan baris siswa diizinkan tanpa dialog
  it('J. allows clean date input change on fresh sessions without confirmation dialog', async () => {
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();

    const dateInput = screen.getByDisplayValue('2026-10-10');

    // Ganti tanggal via input date pada form bersih
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

    // Tidak ada dialog konfirmasi
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(dateInput).toHaveValue('2026-10-15');
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


  // M. Skenario 1 — Sesi bersih berpindah ke Rekap Matriks dan kembali dengan status netral terjaga
  it('M. maintains neutral draft state when returning to Input Presensi after visiting Rekap Matriks', async () => {
    // 1. Sesi draf baru (tidak ada record di database)
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // 2. Status bersih dan tombol simpan dinonaktifkan
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();

    // 3. Beralih ke Rekap Matriks: langsung berpindah tanpa modal
    const matrixTabButton = screen.getByRole('tab', { name: /Rekap Matriks/i });
    fireEvent.click(matrixTabButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Unduh Rekap Matriks/i)).toBeInTheDocument();
    });

    // 4. Kembali ke Input Presensi pada tanggal yang sama
    const takeTabButton = screen.getByRole('tab', { name: /Input Presensi/i });
    fireEvent.click(takeTabButton);

    // 5. Sesi tetap netral, save disabled
    await waitFor(() => {
      expect(screen.getByText(/2 belum diisi/i)).toBeInTheDocument();
    });
    const saveButtonAgain = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButtonAgain).toBeDisabled();

    // 6. Guru mengeklik Set Semua Hadir (H): form menjadi dirty dan lengkap
    const setAllButton = screen.getByRole('button', { name: /Set Semua Hadir/i });
    fireEvent.click(setAllButton);

    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    expect(saveButtonAgain).not.toBeDisabled();

    // Simpan presensi
    fireEvent.click(saveButtonAgain);
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
    });

    // Setelah disimpan, status perubahan hilang dan tombol simpan dinonaktifkan
    await waitFor(() => {
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });
    expect(saveButtonAgain).toBeDisabled();
  });

  // N. Skenario 2 — Buang perubahan lalu berpindah jurnal pada sesi baru
  it('N. reflects correct neutral status and context when discarding changes and switching meeting on fresh session', async () => {
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
    });

    // Ubah catatan siswa
    const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
    fireEvent.change(noteInputs[0], { target: { value: 'Catatan sementara draf' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // Pilih meet-1 pada tanggal yang sama
    const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');
    fireEvent.change(meetingSelect, { target: { value: 'meet-1' } });

    const dialog = await screen.findByRole('dialog');
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    // Modal tutup, meeting beralih ke meet-1, catatan siswa kembali ke baseline (kosong)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Jurnal Ke-1')).toBeInTheDocument();
    });
    expect(noteInputs[0]).toHaveValue('');

    // Meeting berpindah ke meet-1 (perubahan meeting membuat form dirty), tetapi baris siswa belum diisi sehingga save tetap disabled
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();

    // Set Semua Hadir agar lengkap dan dapat disimpan
    const setAllButton = screen.getByRole('button', { name: /Set Semua Hadir/i });
    fireEvent.click(setAllButton);
    expect(saveButton).not.toBeDisabled();

    // Simpan presensi untuk meet-1
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
        meetingId: 'meet-1',
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

  // P. Incomplete attendance: satu siswa diubah membuat form dirty, tetapi Save tetap disabled & ditolak runtime
  it('P. single student change marks form dirty, keeps others null, and blocks incomplete save', async () => {
    mockGetByDate.mockResolvedValue([]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Ubah siswa 1 menjadi SICK
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);

    // Form dirty
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // Siswa 2 masih belum diisi (stats: 1 belum diisi)
    expect(screen.getByText(/1 belum diisi/i)).toBeInTheDocument();

    // Tombol simpan tetap disabled karena belum lengkap
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute('title', expect.stringContaining('belum ditentukan'));
    expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
  });

  // Q. Discard pada fresh session yang sebagian diedit mengembalikan status ke null
  it('Q. discard restores initial null status and neutral state for fresh sessions', async () => {
    const handleRef = createRef<SubjectAttendancePageHandle>();
    const mockNavigateParentTab = vi.fn();
    mockGetByDate.mockResolvedValue([]);

    renderComponent({ onNavigateParentTab: mockNavigateParentTab }, handleRef);

    await screen.findByText('Ahmad Dahlan');

    // Ubah siswa 1
    const sickButtons = screen.getAllByTitle('Sakit (S)');
    fireEvent.click(sickButtons[0]);
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // Navigasi ke journal -> modal muncul
    const allowed = handleRef.current?.requestTabChange('journal');
    expect(allowed).toBe(false);

    const dialog = await screen.findByRole('dialog');
    const discardButton = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Form bersih kembali, kedua siswa kembali belum diisi (2 belum diisi)
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    expect(screen.getByText(/2 belum diisi/i)).toBeInTheDocument();
  });

  // R. Meeting auto-link baseline invariants
  it('R. preserves baseline null meeting for existing records with meetingId null, and treats auto-link as baseline for fresh session', async () => {
    // Kasus 1: Existing record dengan meetingId: null
    mockApp.meetings.getAll.mockResolvedValue([
      { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
    ]);
    mockGetByDate.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    await waitFor(() => {
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
    });

    // Meeting select tetap "-- Tidak ditautkan --", form TIDAK dirty
    const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');
    expect(meetingSelect).toBeInTheDocument();
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();

    // Jika guru secara manual memilih meet-1 -> menjadi dirty
    fireEvent.change(meetingSelect, { target: { value: 'meet-1' } });
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
  });

  // Controlled UX Patch: Explicit Journal Selection Behavior
  describe('Controlled UX Patch: Explicit Journal Selection Behavior', () => {
    it('1. Changing the attendance date while unlinked does not select a journal automatically', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-15', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      const dateInput = screen.getByDisplayValue('2026-10-10');
      const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');
      expect(meetingSelect).toHaveValue('');

      // Ganti tanggal ke tanggal yang memiliki jurnal (2026-10-15)
      fireEvent.change(dateInput, { target: { value: '2026-10-15' } });
      expect(dateInput).toHaveValue('2026-10-15');

      // Dropdown tetap tidak ditautkan, TIDAK memilih meet-1 secara otomatis
      expect(meetingSelect).toHaveValue('');
      expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toBeInTheDocument();
    });

    it('2. Changing the attendance date when multiple matching journals exist does not choose the first match', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Sesi Pagi', date: '2026-10-15', status: 'SCHEDULED' },
        { id: 'meet-2', meetingNumber: 2, topic: 'Sesi Siang', date: '2026-10-15', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      const dateInput = screen.getByDisplayValue('2026-10-10');
      const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');

      // Ganti tanggal ke 2026-10-15 yang memiliki dua jurnal
      fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

      // Tetap tidak ditautkan, tidak memilih meet-1 secara otomatis
      expect(meetingSelect).toHaveValue('');
      expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toBeInTheDocument();

      // Kedua opsi tersedia di dropdown
      expect(screen.getByText('Jurnal Ke-1')).toBeInTheDocument();
      expect(screen.getByText('Jurnal Ke-2')).toBeInTheDocument();
    });

    it('3. An existing journal selection is not silently replaced when the attendance date changes', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
        { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-15', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      expect(screen.getByDisplayValue('Jurnal Ke-1')).toBeInTheDocument();

      const dateInput = screen.getByDisplayValue('2026-10-10');
      // Ganti tanggal ke 2026-10-15
      fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

      // meet-1 tidak digantikan secara diam-diam oleh meet-2
      const meetingSelect = screen.getByDisplayValue(/Jurnal Ke-1/);
      expect(meetingSelect).toHaveValue('meet-1');

      // Error mismatch ditampilkan
      expect(screen.getByText(/Tanggal pertemuan jurnal \(2026-10-10\) tidak cocok dengan tanggal presensi \(2026-10-15\)/i)).toBeInTheDocument();
    });

    it('4. The teacher can explicitly select a journal from the dropdown', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Aljabar', date: '2026-10-10', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');

      // Guru memilih jurnal secara eksplisit
      fireEvent.change(meetingSelect, { target: { value: 'meet-1' } });

      expect(meetingSelect).toHaveValue('meet-1');
      expect(screen.getByDisplayValue('Jurnal Ke-1')).toBeInTheDocument();
      expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    });

    it('5. Explicit journal selection retains the existing date-synchronization behavior', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
        { id: 'meet-2', meetingNumber: 2, topic: 'Pertemuan 2', date: '2026-10-20', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-2', date: '2026-10-10' },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-2', date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      const dateInput = screen.getByDisplayValue('2026-10-10');
      const meetingSelect = screen.getByDisplayValue(/Jurnal Ke-2/);

      expect(meetingSelect).toHaveValue('meet-2');
      expect(screen.getByText(/Tanggal pertemuan jurnal \(2026-10-20\) tidak cocok dengan tanggal presensi/i)).toBeInTheDocument();

      // Guru memilih kembali meet-2 dari dropdown secara eksplisit untuk menyelaraskan tanggal
      fireEvent.change(meetingSelect, { target: { value: 'meet-2' } });

      expect(meetingSelect).toHaveValue('meet-2');
      // Tanggal presensi tersinkronisasi ke tanggal jurnal yang dipilih
      expect(dateInput).toHaveValue('2026-10-20');
      expect(screen.queryByText(/tidak cocok dengan tanggal presensi/i)).not.toBeInTheDocument();
    });

    it('6. A date-mismatched relationship cannot be saved', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      const dateInput = screen.getByDisplayValue('2026-10-10');

      // Ganti tanggal ke 2026-10-15 (menyebabkan mismatch dengan meet-1 pada 2026-10-10)
      fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

      const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute('title', expect.stringContaining('tidak cocok dengan tanggal presensi'));

      // Mencoba klik tombol simpan tidak memanggil penyimpanan
      fireEvent.click(saveButton);
      expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
    });

    it('7. Selecting "-- Tidak ditautkan --" continues to support standalone attendance', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');

      // Lepaskan tautan ke jurnal secara eksplisit
      fireEvent.change(meetingSelect, { target: { value: '' } });
      expect(meetingSelect).toHaveValue('');
      expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toBeInTheDocument();

      const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
      });
      // meetingId bernilai null untuk presensi mandiri (standalone)
      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
        meetingId: null,
      }));
    });

    it('8. Existing unsaved-change protections and attendance persistence behavior remain intact', async () => {
      mockApp.meetings.getAll.mockResolvedValue([
        { id: 'meet-1', meetingNumber: 1, topic: 'Pertemuan 1', date: '2026-10-10', status: 'SCHEDULED' },
      ]);
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: 'meet-1', date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');

      // Ubah catatan siswa agar form menjadi dirty
      const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
      fireEvent.change(noteInputs[0], { target: { value: 'Perubahan belum disimpan' } });
      expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

      const dateInput = screen.getByDisplayValue('2026-10-10');
      // Coba ganti tanggal saat form dirty
      fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

      // Modal proteksi perubahan belum disimpan muncul
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Batal di modal
      const cancelButton = within(dialog).getByRole('button', { name: /Batal/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Tanggal tidak berubah, input tetap dipertahankan
      expect(dateInput).toHaveValue('2026-10-10');
      expect(noteInputs[0]).toHaveValue('Perubahan belum disimpan');
      expect(screen.getByDisplayValue('Jurnal Ke-1')).toBeInTheDocument();
    });
  });

  describe('Controlled Fix B: Historical Student Attendance Recovery', () => {
    it('1. includes saved historical student absent from current active roster when reopening existing session', async () => {
      mockGetByClass.mockResolvedValue([
        {
          id: 'enr-1',
          studentId: 'std-1',
          rollNumber: 1,
          status: 'ACTIVE',
          student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
        },
        {
          id: 'enr-transferred',
          studentId: 'std-transferred',
          rollNumber: 3,
          status: 'TRANSFERRED',
          student: { id: 'std-transferred', fullName: 'Citra Kirana', nis: '1003', gender: 'P' as const },
        },
      ]);

      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
        { id: 'rec-trans', studentId: 'std-transferred', status: 'PRESENT', note: 'Catatan siswa pindah', meetingId: null, date: '2026-10-10' },
      ]);

      renderComponent();

      expect(await screen.findByText('Ahmad Dahlan')).toBeInTheDocument();
      expect(screen.getByText('Citra Kirana')).toBeInTheDocument();
      expect(screen.getByText('Mutasi')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Catatan siswa pindah')).toBeInTheDocument();
      expect(screen.queryByText(/rekaman presensi tersimpan untuk siswa yang tidak ada di roster aktif/i)).not.toBeInTheDocument();
    });

    it('2. allows correcting historical session without losing historical student record and satisfies reconciliation', async () => {
      mockGetByClass.mockResolvedValue([
        {
          id: 'enr-1',
          studentId: 'std-1',
          rollNumber: 1,
          status: 'ACTIVE',
          student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
        },
        {
          id: 'enr-transferred',
          studentId: 'std-transferred',
          rollNumber: 3,
          status: 'TRANSFERRED',
          student: { id: 'std-transferred', fullName: 'Citra Kirana', nis: '1003', gender: 'P' as const },
        },
      ]);

      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
        { id: 'rec-trans', studentId: 'std-transferred', status: 'PRESENT', note: 'Catatan siswa pindah', meetingId: null, date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      await screen.findByText('Citra Kirana');

      const noteInputs = screen.getAllByPlaceholderText('Keterangan...');
      fireEvent.change(noteInputs[0], { target: { value: 'Koreksi catatan Ahmad' } });

      const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
      });

      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith('teacher-uid', expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            studentId: 'std-1',
            note: 'Koreksi catatan Ahmad',
            status: 'PRESENT',
          }),
          expect.objectContaining({
            studentId: 'std-transferred',
            studentName: 'Citra Kirana',
            status: 'PRESENT',
            note: 'Catatan siswa pindah',
          }),
        ]),
      }));
    });

    it('3. does not automatically include historical-only student in a new session on another date', async () => {
      mockGetByClass.mockResolvedValue([
        {
          id: 'enr-1',
          studentId: 'std-1',
          rollNumber: 1,
          status: 'ACTIVE',
          student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
        },
        {
          id: 'enr-transferred',
          studentId: 'std-transferred',
          rollNumber: 3,
          status: 'TRANSFERRED',
          student: { id: 'std-transferred', fullName: 'Citra Kirana', nis: '1003', gender: 'P' as const },
        },
      ]);

      mockGetByDate.mockResolvedValue([]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      expect(screen.queryByText('Citra Kirana')).not.toBeInTheDocument();
      expect(screen.queryByText('Mutasi')).not.toBeInTheDocument();
    });

    it('4. displays neutral "Di luar roster aktif" badge when historical record student is not in enrollment list', async () => {
      mockGetByClass.mockResolvedValue([
        {
          id: 'enr-1',
          studentId: 'std-1',
          rollNumber: 1,
          status: 'ACTIVE',
          student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const },
        },
      ]);

      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
        { id: 'rec-old', studentId: 'std-non-enrolled', studentName: 'Siswa Non-Enroll', rollNumber: 99, gender: 'L', status: 'SICK', note: '', meetingId: null, date: '2026-10-10' },
      ]);

      renderComponent();

      await screen.findByText('Ahmad Dahlan');
      expect(screen.getByText('Siswa Non-Enroll')).toBeInTheDocument();
      expect(screen.getByText('Di luar roster aktif')).toBeInTheDocument();
    });
  });

  describe('Regression: Optimistic Concurrency Baseline Isolation', () => {
    it('Skenario A: saves unlinked attendance with expectedPreviousMeetingId null when new session with initial meeting context is switched to physical book', async () => {
      const syntheticDate = '2026-10-15';
      const syntheticMeetingId = 'meet-synthetic-1';

      // 1. Data awal: tidak ada rekaman presensi tersimpan (sesi baru)
      mockGetByDate.mockResolvedValue([]);
      mockApp.meetings.getAll.mockResolvedValue([
        {
          id: syntheticMeetingId,
          meetingNumber: 1,
          topic: 'Topik Sesi Baru',
          date: syntheticDate,
          status: 'SCHEDULED',
        },
      ]);

      // 2. Buka halaman dengan konteks navigasi yang menyediakan meetingId
      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: syntheticDate,
          meetingId: syntheticMeetingId,
        },
      });

      await screen.findByText('Ahmad Dahlan');

      // 3. Pilihan meeting pada UI tampil dari konteks navigasi
      const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
      expect(meetingSelect).toHaveValue(syntheticMeetingId);

      // 4. Pilih opsi Buku Presensi Fisik / Tidak Ditautkan
      fireEvent.change(meetingSelect, { target: { value: '' } });
      expect(meetingSelect).toHaveValue('');
      expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toBeInTheDocument();

      // 5. Tetapkan status kehadiran yang diwajibkan oleh form (Semua Hadir)
      const setAllPresentBtn = screen.getByRole('button', { name: /Semua Hadir/i });
      fireEvent.click(setAllPresentBtn);

      const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
      expect(saveButton).not.toBeDisabled();

      // 6. Simpan melalui handler UI
      fireEvent.click(saveButton);

      // 7. Pastikan service penyimpanan menerima meetingId: null dan expectedPreviousMeetingId: null
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
      });

      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
        'teacher-uid',
        expect.objectContaining({
          meetingId: null,
          expectedPreviousMeetingId: null,
          date: syntheticDate,
        })
      );

      // 8. Pastikan penyimpanan berhasil sesuai respons mock
      await waitFor(() => {
        expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
      });

      // 9. Pastikan UI tidak menampilkan OPTIMISTIC_CONCURRENCY_ERROR akibat baseline fiktif
      expect(screen.queryByText(/OPTIMISTIC_CONCURRENCY_ERROR/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Relasi sesi telah berubah oleh pengguna lain/i)).not.toBeInTheDocument();
    });

    it('Skenario B: UI surfaces real optimistic concurrency conflict when backend rejects relation drift', async () => {
      const syntheticDate = '2026-10-15';
      const initialMeetingId = 'meet-persisted-1';

      // Sesi sudah tersimpan dengan relasi meeting sebelumnya di DB
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: initialMeetingId, date: syntheticDate },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: initialMeetingId, date: syntheticDate },
      ]);
      mockApp.meetings.getAll.mockResolvedValue([
        { id: initialMeetingId, meetingNumber: 1, topic: 'Pertemuan Pertama', date: syntheticDate, status: 'SCHEDULED' },
        { id: 'meet-concurrent-2', meetingNumber: 2, topic: 'Pertemuan Kedua', date: '2026-10-16', status: 'SCHEDULED' },
      ]);

      // Service menolak dengan OPTIMISTIC_CONCURRENCY_ERROR karena data diubah oleh perangkat lain
      mockSaveSubjectAttendance.mockRejectedValueOnce(
        new Error('OPTIMISTIC_CONCURRENCY_ERROR: Relasi sesi telah berubah oleh pengguna lain (sebelumnya meet-persisted-1, sekarang meet-concurrent-2). Harap muat ulang.')
      );

      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: syntheticDate,
        },
      });

      await screen.findByText('Ahmad Dahlan');

      // Dropdown awalnya terisi relasi persisten yang tersimpan
      const meetingSelect = screen.getByDisplayValue('Jurnal Ke-1');
      expect(meetingSelect).toHaveValue(initialMeetingId);

      // Guru mencoba mengubah relasi ke Buku Fisik
      fireEvent.change(meetingSelect, { target: { value: '' } });
      expect(meetingSelect).toHaveValue('');

      const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
      fireEvent.click(saveButton);

      // Service menerima baseline persisten yang dicatat UI
      await waitFor(() => {
        expect(mockSaveSubjectAttendance).toHaveBeenCalledTimes(1);
      });
      expect(mockSaveSubjectAttendance).toHaveBeenCalledWith(
        'teacher-uid',
        expect.objectContaining({
          meetingId: null,
          expectedPreviousMeetingId: initialMeetingId,
          date: syntheticDate,
        })
      );

      // UI menampilkan banner error konflik konkurensi nyata
      await waitFor(() => {
        expect(screen.getByText(/OPTIMISTIC_CONCURRENCY_ERROR/i)).toBeInTheDocument();
      });
    });

    it('Test B: persistent unlinked attendance overrides stale router meetingId and remains unlinked and clean on reload', async () => {
      const syntheticDate = '2026-10-15';
      const staleNavMeetingId = 'meet-stale-nav-1';

      // 1. Database memiliki rekaman persisten dengan meetingId: null (Buku Fisik)
      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: syntheticDate },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: syntheticDate },
      ]);
      mockApp.meetings.getAll.mockResolvedValue([
        {
          id: staleNavMeetingId,
          meetingNumber: 1,
          topic: 'Topik Jurnal Lama',
          date: syntheticDate,
          status: 'SCHEDULED',
        },
      ]);

      // 2. Buka halaman seolah di-reload dengan location.state / initialContext membawa meetingId lama
      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: syntheticDate,
          meetingId: staleNavMeetingId,
        },
      });

      await screen.findByText('Ahmad Dahlan');

      // 3. Dropdown harus menampilkan Buku Presensi Fisik / Tidak Ditautkan (persisten menang atas router)
      const meetingSelect = screen.getByDisplayValue('-- Tidak ditautkan --');
      expect(meetingSelect).toHaveValue('');

      // 4. Halaman TIDAK boleh ditandai dirty hanya karena router context membawa ID lama
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();

      // 5. Pastikan service penyimpanan tidak dipanggil secara otomatis
      expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
    });

    it('Test C: persistent linked attendance to meeting B overrides different router meetingId A', async () => {
      const syntheticDate = '2026-10-15';
      const routerMeetingId = 'meet-A';
      const persistentMeetingId = 'meet-B';

      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: persistentMeetingId, date: syntheticDate },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: persistentMeetingId, date: syntheticDate },
      ]);
      mockApp.meetings.getAll.mockResolvedValue([
        { id: routerMeetingId, meetingNumber: 1, topic: 'Pertemuan A', date: syntheticDate, status: 'SCHEDULED' },
        { id: persistentMeetingId, meetingNumber: 2, topic: 'Pertemuan B', date: syntheticDate, status: 'SCHEDULED' },
      ]);

      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: syntheticDate,
          meetingId: routerMeetingId,
        },
      });

      await screen.findByText('Ahmad Dahlan');

      // Dropdown akhirnya menunjukkan meeting persisten (meet-B), bukan router (meet-A)
      const meetingSelect = screen.getByDisplayValue('Jurnal Ke-2');
      expect(meetingSelect).toHaveValue(persistentMeetingId);

      // Halaman tidak boleh dirty hanya karena router context berbeda dari DB
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
      expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
    });

    it('Test D: date change resets link state to persistent record of new date or unlinked default', async () => {
      const initialDate = '2026-10-10';
      const newDate = '2026-10-20';
      const initialMeetingId = 'meet-initial-1';
      const newMeetingId = 'meet-new-2';

      mockApp.meetings.getAll.mockResolvedValue([
        { id: initialMeetingId, meetingNumber: 1, topic: 'Pertemuan 1', date: initialDate, status: 'SCHEDULED' },
        { id: newMeetingId, meetingNumber: 2, topic: 'Pertemuan 2', date: newDate, status: 'SCHEDULED' },
      ]);

      // Sesi 10 Oktober tertaut ke meet-initial-1
      mockGetByDate.mockImplementation(async (_uid, _assignId, date) => {
        if (date === initialDate) {
          return [
            { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: initialMeetingId, date: initialDate },
          ];
        }
        // Sesi 20 Oktober belum memiliki rekaman (kosong)
        return [];
      });

      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: initialDate,
          meetingId: initialMeetingId,
        },
      });

      await screen.findByText('Ahmad Dahlan');
      expect(screen.getByDisplayValue('Jurnal Ke-1')).toHaveValue(initialMeetingId);

      // Ganti tanggal ke 20 Oktober yang belum memiliki rekaman dan tidak cocok dengan router context tanggal awal
      const dateInput = screen.getByDisplayValue(initialDate);
      fireEvent.change(dateInput, { target: { value: newDate } });

      await waitFor(() => {
        // Dropdown harus kembali ke unlinked / tidak ditautkan, tidak mewarisi meet-initial-1
        expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toHaveValue('');
      });
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });

    it('Test D (assignment): assignment change resets link state to persistent record of new assignment or unlinked default', async () => {
      const syntheticDate = '2026-10-10';
      const initialMeetingId = 'meet-asg1';
      const asg2MeetingId = 'meet-asg2';

      vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
        teachingAssignments: [
          { id: 'asg-1', classId: 'cls-1', className: '7A', subjectId: 'sub-1', subjectName: 'Matematika', academicYearId: 'ay-2025', semester: 'GANJIL', isActive: true },
          { id: 'asg-2', classId: 'cls-2', className: '7B', subjectId: 'sub-1', subjectName: 'Matematika', academicYearId: 'ay-2025', semester: 'GANJIL', isActive: true },
        ],
        activeAcademicYear: { id: 'ay-2025', name: '2025/2026', isArchived: false },
        activeSemester: 'GANJIL',
        triggerSyncFeedback: mockTriggerSyncFeedback,
        checkIsHoliday: vi.fn().mockReturnValue({ isHoliday: false }),
        attendanceSettings: { schoolDaysOption: 6, holidays: [] },
        updateAttendanceSettings: vi.fn(),
      } as any);

      mockApp.meetings.getAll.mockImplementation(async (_uid, opts) => {
        if (opts.teachingAssignmentId === 'asg-1' || !opts.teachingAssignmentId) {
          return [{ id: initialMeetingId, meetingNumber: 1, topic: 'Pertemuan Asg 1', date: syntheticDate, status: 'SCHEDULED' }];
        }
        return [{ id: asg2MeetingId, meetingNumber: 1, topic: 'Pertemuan Asg 2', date: syntheticDate, status: 'SCHEDULED' }];
      });

      mockGetByDate.mockImplementation(async (_uid, assignId, date) => {
        if (assignId === 'asg-1') {
          return [
            { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: initialMeetingId, date },
          ];
        }
        return [];
      });

      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: syntheticDate,
          meetingId: initialMeetingId,
        },
      });

      await screen.findByText('Ahmad Dahlan');
      expect(screen.getByDisplayValue('Jurnal Ke-1')).toHaveValue(initialMeetingId);

      const assignmentSelect = screen.getByDisplayValue('Kelas 7A — Matematika');
      fireEvent.change(assignmentSelect, { target: { value: 'asg-2' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('-- Tidak ditautkan --')).toHaveValue('');
      });
      expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    });

    it('Test E: stale error banner is cleared on subsequent successful save', async () => {
      const syntheticDate = '2026-10-15';
      const initialMeetingId = 'meet-persisted-1';

      mockGetByDate.mockResolvedValue([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: initialMeetingId, date: syntheticDate },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: initialMeetingId, date: syntheticDate },
      ]);
      mockApp.meetings.getAll.mockResolvedValue([
        { id: initialMeetingId, meetingNumber: 1, topic: 'Pertemuan Pertama', date: syntheticDate, status: 'SCHEDULED' },
      ]);

      // Panggilan 1: Gagal dengan error concurrency
      mockSaveSubjectAttendance.mockRejectedValueOnce(
        new Error('OPTIMISTIC_CONCURRENCY_ERROR: Relasi sesi telah berubah oleh pengguna lain. Harap muat ulang.')
      );
      // Panggilan 2: Sukses
      mockSaveSubjectAttendance.mockResolvedValueOnce({
        present: 1,
        total: 1,
        sick: 0,
        permitted: 0,
        absent: 0,
        dispensation: 0,
      });

      renderComponent({
        initialContext: {
          assignmentId: 'asg-1',
          date: syntheticDate,
        },
      });

      await screen.findByText('Ahmad Dahlan');

      // Ubah status siswa untuk mengaktifkan dirty state
      const sickButton = screen.getAllByTitle('Sakit (S)')[0];
      fireEvent.click(sickButton);

      const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
      expect(saveButton).toBeEnabled();

      // Simpan pertama -> Gagal
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/OPTIMISTIC_CONCURRENCY_ERROR/i)).toBeInTheDocument();
      });
      expect(screen.queryByText('Presensi siswa berhasil disimpan ke database!')).not.toBeInTheDocument();

      // Simpan kedua -> Sukses
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Presensi siswa berhasil disimpan ke database!')).toBeInTheDocument();
      });
      // Banner error lama harus hilang dan tidak ditampilkan bersamaan dengan feedback sukses
      expect(screen.queryByText(/OPTIMISTIC_CONCURRENCY_ERROR/i)).not.toBeInTheDocument();
    });
  });


  // P. Navigasi ke editor kalender sentral (Data Master > Kalender & Libur)
  describe('P. navigasi ke Kalender Madrasah', () => {
    it('navigates to master-calendar via onNavigate when there are no unsaved changes', async () => {
      const onNavigate = vi.fn();
      renderComponent({ onNavigate });

      await screen.findByText('Ahmad Dahlan');

      fireEvent.click(screen.getByRole('button', { name: /Kalender Madrasah/i }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('master-calendar');
      expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
    });

    it('does not render the calendar shortcut when no navigation handler is provided', async () => {
      renderComponent();

      await screen.findByText('Ahmad Dahlan');

      expect(screen.queryByRole('button', { name: /Kalender Madrasah/i })).not.toBeInTheDocument();
    });

    it('asks for confirmation when attendance is dirty and navigates only after discard', async () => {
      const onNavigate = vi.fn();
      mockGetByDate.mockResolvedValueOnce([
        { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
        { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '', meetingId: null, date: '2026-10-10' },
      ]);
      renderComponent({ onNavigate });

      await screen.findByText('Ahmad Dahlan');

      fireEvent.click(screen.getAllByTitle('Sakit (S)')[0]);
      expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Kalender Madrasah/i }));

      const dialog = await screen.findByRole('dialog');
      expect(onNavigate).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole('button', { name: /Buang Perubahan/i }));

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledTimes(1);
      });
      expect(onNavigate).toHaveBeenCalledWith('master-calendar');
      expect(mockSaveSubjectAttendance).not.toHaveBeenCalled();
    });
  });

});
