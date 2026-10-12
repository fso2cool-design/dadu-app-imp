import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

const mockUser = { uid: 'teacher-uid' };
const mockProfile = { uid: 'teacher-uid', displayName: 'Guru Pengampu', role: 'TEACHER' };

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../application/ApplicationContext', () => ({
  useApplication: () => ({
    settings: {
      getSchoolSettings: vi.fn().mockResolvedValue(null),
      getDocumentSettings: vi.fn().mockResolvedValue(null),
    },
    workspace: {
      getUserPreferences: vi.fn().mockResolvedValue(null),
    },
    maintenance: {
      importBackup: vi.fn(),
      exportBackup: vi.fn(),
      previewResetSemester: vi.fn(),
      executeResetSemester: vi.fn(),
    },
  }),
}));

vi.mock('../../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    academicYears: [],
    activeAcademicYear: null,
    reloadWorkspaceData: vi.fn().mockResolvedValue(undefined),
    triggerSyncFeedback: vi.fn(),
    attendanceSettings: {
      schoolDaysOption: 6,
      holidays: [],
    },
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock heavy tab subcomponents so SettingsPage navigation tests remain fast and isolated
vi.mock('./tabs/ProfileTab', () => ({ ProfileTab: () => <div data-testid="profile-tab">Konten Profil</div> }));
vi.mock('./tabs/SchoolTab', () => ({ SchoolTab: () => <div data-testid="school-tab">Konten Madrasah</div> }));
vi.mock('./tabs/DocumentTab', () => ({ DocumentTab: () => <div data-testid="document-tab">Konten Dokumen</div> }));
vi.mock('./tabs/PreferencesTab', () => ({ PreferencesTab: () => <div data-testid="preferences-tab">Konten Preferensi</div> }));
vi.mock('./tabs/StatsTab', () => ({ StatsTab: () => <div data-testid="stats-tab">Konten Statistik</div> }));
vi.mock('./tabs/BackupTab', () => ({ BackupTab: () => <div data-testid="backup-tab">Konten Backup</div> }));
vi.mock('./tabs/MaintenanceTab', () => ({ MaintenanceTab: () => <div data-testid="maintenance-tab">Konten Maintenance</div> }));
vi.mock('./tabs/ShowcaseTab', () => ({ ShowcaseTab: () => <div data-testid="ds-preview">Konten Showcase</div> }));

describe('SettingsPage Dev-only ShowcaseTab Navigation', () => {
  const originalDev = import.meta.env.DEV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (import.meta.env as any).DEV = originalDev;
  });

  it('hides Design System tab from settings navigation in production build (DEV = false)', async () => {
    (import.meta.env as any).DEV = false;
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Design System/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Pratinjau')).not.toBeInTheDocument();
  });

  it('redirects to preferences and does not render showcase when deep-linked to showcase in production build', async () => {
    (import.meta.env as any).DEV = false;
    render(<SettingsPage initialTab="settings-showcase" />);

    await waitFor(() => {
      expect(screen.getByTestId('preferences-tab')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Design System/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('ds-preview')).not.toBeInTheDocument();
  });

  it('shows Design System tab with Pratinjau badge in development build (DEV = true)', async () => {
    (import.meta.env as any).DEV = true;
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    });

    const dsTabButton = screen.getByRole('button', { name: /Design System/i });
    expect(dsTabButton).toBeInTheDocument();
    expect(screen.getByText('Pratinjau')).toBeInTheDocument();
  });

  it('allows clicking and viewing ShowcaseTab when DEV = true', async () => {
    (import.meta.env as any).DEV = true;
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    });

    const dsTabButton = screen.getByRole('button', { name: /Design System/i });
    fireEvent.click(dsTabButton);

    expect(await screen.findByTestId('ds-preview')).toBeInTheDocument();
  });
});
