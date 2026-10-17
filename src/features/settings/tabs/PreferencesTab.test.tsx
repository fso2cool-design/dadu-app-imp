import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreferencesTab } from './PreferencesTab';
import type { UserPreferences } from '../../../types';

vi.mock('../../../context/DesignSystemContext', () => ({
  useDesignSystem: () => ({
    activePreset: 'emerald-serenity',
    applyAndSavePreset: vi.fn(),
    mode: 'light',
    applyAndSaveMode: vi.fn(),
  }),
}));

describe('PreferencesTab — Single Source of Truth Neutralization', () => {
  const mockPreferencesData: UserPreferences = {
    defaultAcademicYearId: 'ay-1',
    defaultSemester: 'GANJIL',
  };

  it('renders informative message that active period and calendar are managed in Data Master', () => {
    render(
      <PreferencesTab
        preferencesData={mockPreferencesData}
        setPreferencesData={vi.fn()}
        saving={false}
        onSubmit={vi.fn()}
        isChangeLogModalOpen={false}
        setIsChangeLogModalOpen={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    // Confirms informational banner directing to Master Data
    expect(screen.getByText('Pengaturan Operasional Akademik & Kalender')).toBeInTheDocument();
    expect(screen.getByText(/Data Master > Tahun Ajaran/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Master > Kalender & Libur/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Pengaturan operasional akademik tidak lagi diatur ganda dari halaman Preferensi/i)
    ).toBeInTheDocument();

    // Verifies duplicate semester dropdown form is completely absent
    expect(screen.queryByText('Semester Bawaan Saat Membuka Modul')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Semester Bawaan/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Semester Genap (2)')).not.toBeInTheDocument();
    expect(screen.queryByText('Simpan Preferensi Workspace')).not.toBeInTheDocument();

    // Verifies calendar and school days editor is removed from Preferences
    expect(screen.queryByText(/Kelola Kalender & Libur/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sistem Hari Belajar & Kalender Libur Madrasah/i)).not.toBeInTheDocument();
  });

  it('preserves visual theme preset, color mode, and personal preferences', () => {
    render(
      <PreferencesTab
        preferencesData={mockPreferencesData}
        setPreferencesData={vi.fn()}
        saving={false}
        onSubmit={vi.fn()}
        isChangeLogModalOpen={false}
        setIsChangeLogModalOpen={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    // Visual theme preset and mode remain present and functional
    expect(screen.getByText(/Preset Tampilan & Mode Warna/i)).toBeInTheDocument();
    expect(screen.getByText(/Preset Gaya Visual/i)).toBeInTheDocument();
  });
});
