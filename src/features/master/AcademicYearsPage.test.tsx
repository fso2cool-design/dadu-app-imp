import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AcademicYearsPage } from './AcademicYearsPage';
import type { AcademicYear } from '../../types';

const mockUser = { uid: 'teacher-1' };
const mockReloadWorkspaceData = vi.fn().mockResolvedValue(undefined);
const mockTriggerSyncFeedback = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

const mockUpdateYear = vi.fn().mockResolvedValue(undefined);
const mockCreateYear = vi.fn().mockResolvedValue(undefined);
const mockCheckUsage = vi.fn().mockResolvedValue({ isUsed: false, canDelete: true, reasons: [], counts: {} });

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const year1: AcademicYear = {
  id: 'ay-1',
  label: '2025/2026',
  startYear: 2025,
  endYear: 2026,
  isActive: true,
  currentSemester: 'GANJIL',
  isArchived: false,
  createdAt: null,
  updatedAt: null,
};

const year2: AcademicYear = {
  id: 'ay-2',
  label: '2026/2027',
  startYear: 2026,
  endYear: 2027,
  isActive: false,
  currentSemester: 'GENAP',
  isArchived: false,
  createdAt: null,
  updatedAt: null,
};

let currentActiveYear: AcademicYear | null = year1;
let currentYearsList: AcademicYear[] = [year1, year2];

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    academicYears: currentYearsList,
    activeAcademicYear: currentActiveYear,
    reloadWorkspaceData: mockReloadWorkspaceData,
    triggerSyncFeedback: mockTriggerSyncFeedback,
  }),
}));

vi.mock('../../application/ApplicationContext', () => ({
  useApplication: () => ({
    master: {
      academicYears: {
        update: mockUpdateYear,
        create: mockCreateYear,
        checkUsage: mockCheckUsage,
      },
    },
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe('AcademicYearsPage — Single Source of Truth, Set Aktif & Semester Control', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentActiveYear = year1;
    currentYearsList = [year1, year2];
  });

  it('renders active badge on active year and Set Aktif button on inactive year', () => {
    render(<AcademicYearsPage />);

    expect(screen.getByText('2025/2026')).toBeInTheDocument();
    expect(screen.getByText('2026/2027')).toBeInTheDocument();

    // Active card has 'Aktif' badge
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    // Inactive card has 'Set Aktif' button
    expect(screen.getByText('Set Aktif')).toBeInTheDocument();
  });

  it('calls ayRepo.update with { isActive: true } and reloads workspace on Set Aktif click', async () => {
    render(<AcademicYearsPage />);

    const setAktifBtn = screen.getByText('Set Aktif');
    fireEvent.click(setAktifBtn);

    await waitFor(() => {
      expect(mockUpdateYear).toHaveBeenCalledWith('teacher-1', 'ay-2', { isActive: true });
      expect(mockReloadWorkspaceData).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('2026/2027'));
    });
  });

  it('handles write failure properly without showing false positive success toast', async () => {
    mockUpdateYear.mockRejectedValueOnce(new Error('Firestore write failed'));
    render(<AcademicYearsPage />);

    const setAktifBtn = screen.getByText('Set Aktif');
    fireEvent.click(setAktifBtn);

    await waitFor(() => {
      expect(mockUpdateYear).toHaveBeenCalledWith('teacher-1', 'ay-2', { isActive: true });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('Firestore write failed'));
      expect(mockToastSuccess).not.toHaveBeenCalled();
    });
  });

  it('reflects updated active year and semester display from master', () => {
    // When master active year changes to year2
    currentActiveYear = year2;
    const { rerender } = render(<AcademicYearsPage />);

    // year2 now has Aktif badge and year1 has Set Aktif
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Set Aktif')).toBeInTheDocument();
    expect(screen.getByText('GENAP')).toBeInTheDocument();
  });

  it('allows switching currentSemester on active year and reloads workspace with updated semester', async () => {
    render(<AcademicYearsPage />);

    // Active year is currently GANJIL, button should allow switching to Genap
    const switchBtn = screen.getByRole('button', { name: /Beralih ke Genap/i });
    expect(switchBtn).toBeInTheDocument();

    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(mockUpdateYear).toHaveBeenCalledWith('teacher-1', 'ay-1', { currentSemester: 'GENAP' });
      expect(mockReloadWorkspaceData).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('GENAP'));
    });
  });

  it('allows switching currentSemester back to GANJIL when active year is GENAP', async () => {
    const activeYearGenap: AcademicYear = {
      ...year1,
      currentSemester: 'GENAP',
    };
    currentActiveYear = activeYearGenap;
    currentYearsList = [activeYearGenap, year2];

    render(<AcademicYearsPage />);

    const switchBtn = screen.getByRole('button', { name: /Beralih ke Ganjil/i });
    expect(switchBtn).toBeInTheDocument();

    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(mockUpdateYear).toHaveBeenCalledWith('teacher-1', 'ay-1', { currentSemester: 'GANJIL' });
      expect(mockReloadWorkspaceData).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('GANJIL'));
    });
  });

  it('allows updating currentSemester through the Edit modal and saving to Firestore', async () => {
    render(<AcademicYearsPage />);

    // Click edit button for year1
    const editButtons = screen.getAllByTitle('Edit Tahun Ajaran');
    fireEvent.click(editButtons[0]);

    // Modal opens
    expect(screen.getByText('Edit Tahun Ajaran')).toBeInTheDocument();

    // Select semester dropdown
    const selectSemester = screen.getByLabelText(/Semester Berjalan/i);
    expect(selectSemester).toBeInTheDocument();
    fireEvent.change(selectSemester, { target: { value: 'GENAP' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Simpan Perubahan/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateYear).toHaveBeenCalledWith(
        'teacher-1',
        'ay-1',
        expect.objectContaining({
          currentSemester: 'GENAP',
        })
      );
      expect(mockReloadWorkspaceData).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('2025/2026'));
    });
  });

  it('handles semester switch write failure properly without showing false positive success toast', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateYear.mockRejectedValueOnce(new Error('Permission denied'));

    render(<AcademicYearsPage />);

    const switchBtn = screen.getByRole('button', { name: /Beralih ke Genap/i });
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(mockUpdateYear).toHaveBeenCalledWith('teacher-1', 'ay-1', { currentSemester: 'GENAP' });
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
      expect(mockToastSuccess).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
