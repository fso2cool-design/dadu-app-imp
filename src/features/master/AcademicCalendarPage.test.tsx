import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AcademicCalendarPage } from './AcademicCalendarPage';
import type { AttendanceSettings } from '../../types';

const mockUpdateAttendanceSettings = vi.fn();
const mockTriggerSyncFeedback = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

let mockSettings: AttendanceSettings = {
  schoolDaysOption: 6,
  holidays: [
    {
      id: 'h-1',
      startDate: '2026-10-22',
      endDate: '2026-10-22',
      description: 'Hari Santri Nasional',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ],
};

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    attendanceSettings: mockSettings,
    updateAttendanceSettings: mockUpdateAttendanceSettings,
    triggerSyncFeedback: mockTriggerSyncFeedback,
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe('AcademicCalendarPage — Master Centralized Calendar & Holiday Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings = {
      schoolDaysOption: 6,
      holidays: [
        {
          id: 'h-1',
          startDate: '2026-10-22',
          endDate: '2026-10-22',
          description: 'Hari Santri Nasional',
          createdAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    };
  });

  it('renders initial calendar settings and registered holidays from context', () => {
    render(<AcademicCalendarPage />);

    expect(screen.getByText('Kalender & Hari Belajar Madrasah')).toBeInTheDocument();
    expect(screen.getByText('6 Hari Belajar')).toBeInTheDocument();
    expect(screen.getByText('1 Agenda Libur')).toBeInTheDocument();
    expect(screen.getByText('Hari Santri Nasional')).toBeInTheDocument();
    expect(screen.getByText('Opsi 6 Hari Aktif')).toBeInTheDocument();
  });

  it('allows toggling between 5-day and 6-day school options and saving', async () => {
    mockUpdateAttendanceSettings.mockResolvedValueOnce(undefined);

    render(<AcademicCalendarPage />);

    const opt5Days = document.getElementById('opt-school-days-5');
    expect(opt5Days).toBeInTheDocument();

    // Click 5 days
    fireEvent.click(opt5Days!);

    expect(screen.getByText('Opsi 5 Hari Aktif')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateAttendanceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolDaysOption: 5,
        })
      );
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Pengaturan hari belajar & kalender libur berhasil disimpan.'
      );
    });
  });

  it('allows adding and removing custom holidays', async () => {
    mockUpdateAttendanceSettings.mockResolvedValueOnce(undefined);

    render(<AcademicCalendarPage />);

    const descInput = document.getElementById('input-holiday-description');
    const startInput = document.getElementById('input-holiday-start-date');
    const addBtn = document.getElementById('btn-add-holiday');

    expect(descInput).toBeInTheDocument();
    expect(startInput).toBeInTheDocument();

    // Fill form
    fireEvent.change(startInput!, { target: { value: '2026-11-25' } });
    fireEvent.change(descInput!, { target: { value: 'Hari Guru Nasional' } });
    fireEvent.click(addBtn!);

    // New holiday appears in list
    expect(screen.getByText('Hari Guru Nasional')).toBeInTheDocument();
    expect(screen.getByText('Daftar Hari Libur Terdaftar (2)')).toBeInTheDocument();

    // Now save
    const saveBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateAttendanceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          holidays: expect.arrayContaining([
            expect.objectContaining({ description: 'Hari Santri Nasional' }),
            expect.objectContaining({ description: 'Hari Guru Nasional' }),
          ]),
        })
      );
    });
  });

  it('handles save failure gracefully without false success toast', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateAttendanceSettings.mockRejectedValueOnce(new Error('Firestore write failed'));

    render(<AcademicCalendarPage />);

    const opt5Days = document.getElementById('opt-school-days-5');
    fireEvent.click(opt5Days!);

    const saveBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateAttendanceSettings).toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith('Gagal menyimpan pengaturan kalender.');
      expect(mockToastSuccess).not.toHaveBeenCalled();
    });

    errorSpy.mockRestore();
  });

  describe('default holiday date uses the local calendar day', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ['just after local midnight', new Date(2026, 9, 17, 0, 30, 0)],
      ['just before local midnight', new Date(2026, 9, 17, 23, 30, 0)],
    ])('defaults to 2026-10-17 %s', (_label, now) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(now);

      render(<AcademicCalendarPage />);

      const startInput = document.getElementById('input-holiday-start-date') as HTMLInputElement;
      expect(startInput.value).toBe('2026-10-17');
    });
  });

  describe('draft protection against context refresh', () => {
    const savedHoliday = {
      id: 'h-1',
      startDate: '2026-10-22',
      endDate: '2026-10-22',
      description: 'Hari Santri Nasional',
      createdAt: '2026-10-01T00:00:00.000Z',
    };

    it('keeps an unsaved draft when the context object is replaced', () => {
      const { rerender } = render(<AcademicCalendarPage />);

      fireEvent.click(document.getElementById('opt-school-days-5')!);
      expect(screen.getByText('Opsi 5 Hari Aktif')).toBeInTheDocument();

      // Context refresh (e.g. workspace reload) delivers a new object with an extra saved holiday
      mockSettings = {
        schoolDaysOption: 6,
        holidays: [
          savedHoliday,
          { ...savedHoliday, id: 'h-2', description: 'Hari Guru Nasional', startDate: '2026-11-25', endDate: '2026-11-25' },
        ],
      };
      rerender(<AcademicCalendarPage />);

      // Draft option survives and is still treated as unsaved
      expect(screen.getByText('Opsi 5 Hari Aktif')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Simpan Perubahan/i })).not.toBeDisabled();
    });

    it('follows the new saved values when the form is clean', () => {
      const { rerender } = render(<AcademicCalendarPage />);
      expect(screen.getByText('6 Hari Belajar')).toBeInTheDocument();

      mockSettings = { schoolDaysOption: 5, holidays: [] };
      rerender(<AcademicCalendarPage />);

      expect(screen.getByText('5 Hari Belajar')).toBeInTheDocument();
      expect(screen.getByText('0 Agenda Libur')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tersimpan/i })).toBeDisabled();
    });

    it('syncs draft and saved values after a successful save', async () => {
      mockUpdateAttendanceSettings.mockImplementationOnce(async (next: AttendanceSettings) => {
        mockSettings = next;
      });
      const { rerender } = render(<AcademicCalendarPage />);

      fireEvent.click(document.getElementById('opt-school-days-5')!);
      fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }));

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledTimes(1);
      });
      expect(mockUpdateAttendanceSettings).toHaveBeenCalledWith(
        expect.objectContaining({ schoolDaysOption: 5, holidays: [savedHoliday] }),
      );

      rerender(<AcademicCalendarPage />);

      expect(screen.getByText('5 Hari Belajar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tersimpan/i })).toBeDisabled();
    });

    it('keeps the draft after a failed save and allows retry', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateAttendanceSettings
        .mockRejectedValueOnce(new Error('Firestore write failed'))
        .mockResolvedValueOnce(undefined);
      render(<AcademicCalendarPage />);

      fireEvent.click(document.getElementById('opt-school-days-5')!);
      fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledTimes(1);
      });
      expect(mockToastSuccess).not.toHaveBeenCalled();
      expect(screen.getByText('Opsi 5 Hari Aktif')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
      expect(retryBtn).not.toBeDisabled();
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(mockUpdateAttendanceSettings).toHaveBeenCalledTimes(2);
        expect(mockToastSuccess).toHaveBeenCalledTimes(1);
      });
      expect(mockUpdateAttendanceSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({ schoolDaysOption: 5 }),
      );
      errorSpy.mockRestore();
    });
  });

  describe('form validation and draft semantics', () => {
    const submitAddForm = () => {
      fireEvent.submit(document.getElementById('btn-add-holiday')!.closest('form')!);
    };

    it('rejects a holiday without description', () => {
      render(<AcademicCalendarPage />);

      submitAddForm();

      expect(screen.getByText('Keterangan / deskripsi hari libur wajib diisi.')).toBeInTheDocument();
      expect(screen.getByText('Daftar Hari Libur Terdaftar (1)')).toBeInTheDocument();
    });

    it('rejects a reversed date range', () => {
      render(<AcademicCalendarPage />);

      fireEvent.click(screen.getByLabelText('Rentang beberapa hari'));
      fireEvent.change(document.getElementById('input-holiday-start-date')!, { target: { value: '2026-11-10' } });
      fireEvent.change(document.getElementById('input-holiday-end-date')!, { target: { value: '2026-11-05' } });
      fireEvent.change(document.getElementById('input-holiday-description')!, { target: { value: 'Libur Terbalik' } });
      submitAddForm();

      expect(
        screen.getByText('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Libur Terbalik')).not.toBeInTheDocument();
    });

    it('Hapus Semua only changes the draft and Reset restores the saved holidays', () => {
      render(<AcademicCalendarPage />);

      fireEvent.click(document.getElementById('btn-clear-all-holidays')!);
      expect(screen.getByText('0 Agenda Libur')).toBeInTheDocument();
      expect(mockUpdateAttendanceSettings).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByText('1 Agenda Libur')).toBeInTheDocument();
      expect(screen.getByText('Hari Santri Nasional')).toBeInTheDocument();
      expect(mockUpdateAttendanceSettings).not.toHaveBeenCalled();
    });
  });
});
