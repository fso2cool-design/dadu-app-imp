import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import {
  HomeroomDailyAttendancePage,
  clearDailyAttendanceCaches,
} from './HomeroomDailyAttendancePage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';
import * as xlsxModule from '../../utils/lazyXlsx';

vi.mock('../../utils/date', () => ({
  getTodayISO: vi.fn(() => '2026-10-10'),
  formatDateWithDay: vi.fn((d) => d),
}));

vi.mock('../../utils/lazyXlsx', () => ({
  loadXlsx: vi.fn(),
}));

describe('HomeroomDailyAttendancePage UX & Initial-State Implementation', () => {
  const mockGetByClass = vi.fn();
  const mockGetDailyAttendanceRecords = vi.fn();
  const mockGetDailySession = vi.fn();
  const mockSaveDailyAttendance = vi.fn();
  const mockTriggerSyncFeedback = vi.fn();
  const mockSetSelectedClassId = vi.fn();

  const mockApp = {
    enrollment: {
      getByClass: mockGetByClass,
    },
    attendance: {
      getDailyAttendanceRecords: mockGetDailyAttendanceRecords,
      getDailySession: mockGetDailySession,
      saveDailyAttendance: mockSaveDailyAttendance,
    },
  } as any;

  const mockStudents = [
    {
      id: 'enr-1',
      studentId: 'std-1',
      rollNumber: 1,
      status: 'ACTIVE',
      student: { id: 'std-1', fullName: 'Ahmad Dahlan', nis: '1001', gender: 'L' as const, parentPhone: '08123456789' },
    },
    {
      id: 'enr-2',
      studentId: 'std-2',
      rollNumber: 2,
      status: 'ACTIVE',
      student: { id: 'std-2', fullName: 'Budi Santoso', nis: '1002', gender: 'L' as const, parentPhone: '08129876543' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    clearDailyAttendanceCaches();

    mockGetByClass.mockResolvedValue(mockStudents);
    mockGetDailyAttendanceRecords.mockResolvedValue([]);
    mockGetDailySession.mockResolvedValue(null);
    mockSaveDailyAttendance.mockResolvedValue({ success: true });

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-uid' },
      profile: { uid: 'teacher-uid', role: 'HOMEROOM_TEACHER', displayName: 'Guru Wali' },
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      activeAcademicYear: { id: 'ay-2025', label: '2025/2026', isArchived: false },
      activeSemester: 'GANJIL',
      classes: [
        { id: 'cls-1', name: '7A', academicYearId: 'ay-2025', isActive: true, classTeacherId: 'teacher-uid' },
        { id: 'cls-2', name: '7B', academicYearId: 'ay-2025', isActive: true, classTeacherId: 'other-uid' },
      ],
      selectedClassId: 'cls-1',
      setSelectedClassId: mockSetSelectedClassId,
      triggerSyncFeedback: mockTriggerSyncFeedback,
      checkIsHoliday: vi.fn().mockReturnValue({ isHoliday: false, reason: '' }),
      attendanceSettings: {
        schoolDaysOption: 6,
        holidays: [],
      },
    } as any);
  });

  const renderComponent = (props: { initialClassId?: string; initialDate?: string } = {}) => {
    return render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <HomeroomDailyAttendancePage initialClassId="cls-1" initialDate="2026-10-10" {...props} />
        </ToastProvider>
      </ApplicationProvider>
    );
  };

  // 1. Fresh session initializes all students as null
  it('1. initializes all active students as null on a fresh session with neutral buttons', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();

    // Stats show 2 unrecorded students
    expect(screen.getByText('Belum Diisi')).toBeInTheDocument();
    const unrecordedCard = screen.getByText('Belum Diisi').closest('div');
    expect(within(unrecordedCard!).getByText('2')).toBeInTheDocument();

    // Verify all status buttons are neutral (no active background)
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const statusButtons = within(ahmadRow).getAllByRole('button');
    statusButtons.forEach(btn => {
      expect(btn.className).not.toContain('scale-105');
      expect(btn.className).not.toContain('bg-emerald-600 text-white font-bold');
    });
  });

  // 2. Save is disabled on initial state
  it('2. disables save button and does not claim unsaved changes on fresh session', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    expect(screen.queryByText('Draf — belum disimpan')).not.toBeInTheDocument();
  });

  // 3. Fresh session is free to navigate date/class without dirty modal
  it('3. allows changing date or class on fresh session without false dirty modal', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Change date via date input
    const dateInput = screen.getByDisplayValue('2026-10-10');
    fireEvent.change(dateInput, { target: { value: '2026-10-11' } });

    // No confirmation dialog opens
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // 4. Typing note does not set attendance status to PRESENT
  it('4. preserves null status when entering a student note', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const noteInput = within(ahmadRow).getByPlaceholderText('Catatan...');
    fireEvent.change(noteInput, { target: { value: 'Izin terlambat datang' } });

    // Ahmad's status must still be null (not PRESENT)
    const statusButtons = within(ahmadRow).getAllByRole('button');
    statusButtons.forEach(btn => {
      expect(btn.className).not.toContain('scale-105');
      expect(btn.className).not.toContain('bg-emerald-600 text-white font-bold');
    });

    // Belum Diisi is still 2
    const unrecordedCard = screen.getByText('Belum Diisi').closest('div');
    expect(within(unrecordedCard!).getByText('2')).toBeInTheDocument();

    // Form is dirty because note was edited, but save is disabled because incomplete
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();
  });

  // 5. Preset does not set attendance status to PRESENT
  it('5. preserves null status if note is changed via state setter without status selection', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const noteInput = within(ahmadRow).getByPlaceholderText('Catatan...');
    fireEvent.change(noteInput, { target: { value: 'Tanpa Kabar' } });

    // Status remains null
    const unrecordedCard = screen.getByText('Belum Diisi').closest('div');
    expect(within(unrecordedCard!).getByText('2')).toBeInTheDocument();
  });

  // 6. Quick presets for absence do not render when status is null
  it('6. does not render absence quick presets when student status is null', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    // Absences presets (e.g. '+ Tanpa Kabar', '+ Surat Dokter', etc.) should NOT be rendered
    expect(within(ahmadRow).queryByText('+ Tanpa Kabar')).not.toBeInTheDocument();
    expect(within(ahmadRow).queryByText('+ Surat Dokter')).not.toBeInTheDocument();
    expect(within(ahmadRow).queryByText('+ Izin Keluarga')).not.toBeInTheDocument();
  });

  // 7. Statistics calculate unrecorded correctly
  it('7. calculates unrecorded count accurately as students are marked', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Initially 2 unrecorded
    const unrecordedCard = screen.getByText('Belum Diisi').closest('div');
    expect(within(unrecordedCard!).getByText('2')).toBeInTheDocument();

    // Mark Ahmad as SICK
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const sickButton = within(ahmadRow).getByRole('button', { name: /^S\s/ });
    fireEvent.click(sickButton);

    // Unrecorded is now 1, Sick is 1
    expect(within(unrecordedCard!).getByText('1')).toBeInTheDocument();
    const sickCard = screen.getByText(/Sakit \(S\)/i).closest('div');
    expect(within(sickCard!).getByText('1')).toBeInTheDocument();
  });

  // 8. Percentage rate for incomplete draft renders as —
  it('8. renders attendance rate as — while draft has unrecorded students', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const rateCard = screen.getByText('% Kehadiran').closest('div');
    expect(within(rateCard!).getByText('—')).toBeInTheDocument();

    // Mark 1 student as PRESENT
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const presentButton = within(ahmadRow).getByRole('button', { name: /^H\s/ });
    fireEvent.click(presentButton);

    // Still has 1 unrecorded student -> percentage rate is STILL —
    expect(within(rateCard!).getByText('—')).toBeInTheDocument();
  });

  // 9. Filter UNSET works correctly
  it('9. filters by UNSET to show only students without a determined status', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Mark Ahmad as PRESENT, leave Budi as null
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const presentButton = within(ahmadRow).getByRole('button', { name: /^H\s/ });
    fireEvent.click(presentButton);

    // Filter to UNSET (Belum Ditentukan)
    const filterSelect = screen.getByRole('combobox', { name: '' });
    fireEvent.change(filterSelect, { target: { value: 'UNSET' } });

    // Ahmad should not be visible; Budi should be visible
    expect(screen.queryByText('Ahmad Dahlan')).not.toBeInTheDocument();
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
  });

  // 10. Filter NOT_PRESENT does not include UNSET students
  it('10. excludes UNSET students from NOT_PRESENT filter', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Ahmad is PRESENT, Budi is null
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const presentButton = within(ahmadRow).getByRole('button', { name: /^H\s/ });
    fireEvent.click(presentButton);

    // Filter to NOT_PRESENT (Hanya yang Tidak Hadir)
    const filterSelect = screen.getByRole('combobox', { name: '' });
    fireEvent.change(filterSelect, { target: { value: 'NOT_PRESENT' } });

    // Neither Ahmad (PRESENT) nor Budi (null) should be in NOT_PRESENT
    expect(screen.queryByText('Ahmad Dahlan')).not.toBeInTheDocument();
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
    expect(screen.getByText('Tidak ada siswa yang sesuai kriteria.')).toBeInTheDocument();
  });

  // 11. Excel export produces '-' and 'Belum Ditentukan (-)' for undetermined status
  it('11. exports undetermined student status as dash and Belum Ditentukan in Excel', async () => {
    const jsonToSheetMock = vi.fn().mockReturnValue({});
    const bookNewMock = vi.fn().mockReturnValue({});
    const bookAppendSheetMock = vi.fn();
    const writeFileMock = vi.fn();

    vi.mocked(xlsxModule.loadXlsx).mockResolvedValue({
      utils: {
        json_to_sheet: jsonToSheetMock,
        book_new: bookNewMock,
        book_append_sheet: bookAppendSheetMock,
      },
      writeFile: writeFileMock,
    } as any);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const exportBtn = screen.getByRole('button', { name: /Export Excel/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(jsonToSheetMock).toHaveBeenCalledTimes(1);
    });

    const exportedRows = jsonToSheetMock.mock.calls[0][0];
    expect(exportedRows[0]['Status Presensi']).toBe('Belum Ditentukan (-)');
    expect(exportedRows[0]['Kode']).toBe('-');
    expect(exportedRows[1]['Status Presensi']).toBe('Belum Ditentukan (-)');
    expect(exportedRows[1]['Kode']).toBe('-');
  });

  // 12. Set Semua Hadir changes all students to PRESENT explicitly
  it('12. explicitly marks all students as PRESENT when Set Semua Hadir is clicked', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const setAllBtn = screen.getByRole('button', { name: /Set Semua Hadir/i });
    fireEvent.click(setAllBtn);

    // Both Ahmad and Budi have PRESENT button active
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const ahmadPresentBtn = within(ahmadRow).getByRole('button', { name: /^H\s/ });
    expect(ahmadPresentBtn.className).toContain('scale-105');
    expect(ahmadPresentBtn.className).toContain('bg-emerald-600');

    const budiRow = screen.getByText('Budi Santoso').closest('tr')!;
    const budiPresentBtn = within(budiRow).getByRole('button', { name: /^H\s/ });
    expect(budiPresentBtn.className).toContain('scale-105');
    expect(budiPresentBtn.className).toContain('bg-emerald-600');
  });

  // 13. Set Semua Hadir makes form dirty and complete
  it('13. marks form dirty and complete upon Set Semua Hadir, enabling save', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    const setAllBtn = screen.getByRole('button', { name: /Set Semua Hadir/i });
    fireEvent.click(setAllBtn);

    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).not.toBeDisabled();

    const rateCard = screen.getByText('% Kehadiran').closest('div');
    expect(within(rateCard!).getByText('100%')).toBeInTheDocument();
  });

  // 14. Runtime save guard rejects incomplete attendance
  it('14. rejects saving when attendance is incomplete even if triggered', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Only mark 1 student
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const sickButton = within(ahmadRow).getByRole('button', { name: /^S\s/ });
    fireEvent.click(sickButton);

    // Save button is disabled in UI
    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    expect(saveButton).toBeDisabled();

    // Verify service was not called
    expect(mockSaveDailyAttendance).not.toHaveBeenCalled();
  });

  // 15. Payload of successful save has no null statuses
  it('15. submits type-safe payload with strictly non-null statuses on successful save', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Mark all present
    const setAllBtn = screen.getByRole('button', { name: /Set Semua Hadir/i });
    fireEvent.click(setAllBtn);

    const saveButton = screen.getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveDailyAttendance).toHaveBeenCalledTimes(1);
    });

    const submittedItems = mockSaveDailyAttendance.mock.calls[0][5];
    expect(submittedItems).toHaveLength(2);
    expect(submittedItems[0].status).toBe('PRESENT');
    expect(submittedItems[1].status).toBe('PRESENT');
  });

  // 16. Save and Proceed does not navigate when save fails
  it('16. halts navigation in unsaved changes modal when save fails', async () => {
    mockSaveDailyAttendance.mockRejectedValueOnce(new Error('Network failure'));

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Set all present
    const setAllBtn = screen.getByRole('button', { name: /Set Semua Hadir/i });
    fireEvent.click(setAllBtn);

    // Change date to trigger unsaved changes modal
    const dateInput = screen.getByDisplayValue('2026-10-10');
    fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

    const dialog = await screen.findByRole('dialog');
    const modalSaveBtn = within(dialog).getByRole('button', { name: /Simpan Presensi/i });
    fireEvent.click(modalSaveBtn);

    // Save was attempted
    await waitFor(() => {
      expect(mockSaveDailyAttendance).toHaveBeenCalledTimes(1);
    });

    // Date must NOT have navigated because save failed
    expect(dateInput).toHaveValue('2026-10-10');
  });

  // 17. Snapshot / discard restores nullable state
  it('17. restores initial null status when discarding changes', async () => {
    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Edit Ahmad to SICK
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const sickButton = within(ahmadRow).getByRole('button', { name: /^S\s/ });
    fireEvent.click(sickButton);
    expect(screen.getByText('Perubahan belum disimpan')).toBeInTheDocument();

    // Trigger discard via date shift
    const nextDayBtn = screen.getByTitle('Hari Berikutnya');
    fireEvent.click(nextDayBtn);

    const dialog = await screen.findByRole('dialog');
    const discardBtn = within(dialog).getByRole('button', { name: /Buang Perubahan/i });
    fireEvent.click(discardBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Ahmad's status is restored to null (neutral button)
    const updatedAhmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const statusButtons = within(updatedAhmadRow).getAllByRole('button');
    statusButtons.forEach(btn => {
      expect(btn.className).not.toContain('scale-105');
    });
  });

  // 18. Persisted historical records remain accurate
  it('18. accurately renders saved historical records from database', async () => {
    mockGetDailyAttendanceRecords.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'SICK', note: 'Demam tinggi' },
      { id: 'rec-2', studentId: 'std-2', status: 'PRESENT', note: '' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Ahmad has SICK active
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const sickBtn = within(ahmadRow).getByRole('button', { name: /^S\s/ });
    expect(sickBtn.className).toContain('scale-105');
    const noteInput = within(ahmadRow).getByPlaceholderText('Catatan...');
    expect(noteInput).toHaveValue('Demam tinggi');

    // Budi has PRESENT active
    const budiRow = screen.getByText('Budi Santoso').closest('tr')!;
    const presentBtn = within(budiRow).getByRole('button', { name: /^H\s/ });
    expect(presentBtn.className).toContain('scale-105');

    // Form is clean
    expect(screen.queryByText('Perubahan belum disimpan')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Simpan Presensi/i })).toBeDisabled();

    // Stats
    const rateCard = screen.getByText('% Kehadiran').closest('div');
    expect(within(rateCard!).getByText('50%')).toBeInTheDocument();
  });

  // 19. Active student without historical record is not automatically PRESENT
  it('19. keeps active student without historical record as null when other students have records', async () => {
    // Only Ahmad has a record in database; Budi does not
    mockGetDailyAttendanceRecords.mockResolvedValue([
      { id: 'rec-1', studentId: 'std-1', status: 'PRESENT', note: '' },
    ]);

    renderComponent();

    await screen.findByText('Ahmad Dahlan');

    // Ahmad is PRESENT
    const ahmadRow = screen.getByText('Ahmad Dahlan').closest('tr')!;
    const ahmadPresentBtn = within(ahmadRow).getByRole('button', { name: /^H\s/ });
    expect(ahmadPresentBtn.className).toContain('scale-105');

    // Budi is null (neutral)
    const budiRow = screen.getByText('Budi Santoso').closest('tr')!;
    const budiButtons = within(budiRow).getAllByRole('button');
    budiButtons.forEach(btn => {
      expect(btn.className).not.toContain('scale-105');
    });

    // Unrecorded is 1, rate is —
    const unrecordedCard = screen.getByText('Belum Diisi').closest('div');
    expect(within(unrecordedCard!).getByText('1')).toBeInTheDocument();

    const rateCard = screen.getByText('% Kehadiran').closest('div');
    expect(within(rateCard!).getByText('—')).toBeInTheDocument();

    // Save is disabled because incomplete
    expect(screen.getByRole('button', { name: /Simpan Presensi/i })).toBeDisabled();
  });
});
