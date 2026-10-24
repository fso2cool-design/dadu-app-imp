import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Header } from './Header';
import * as authModule from '../../features/auth/AuthContext';
import * as workspaceModule from '../../context/WorkspaceContext';
import * as appearanceModule from '../../context/AppearanceContext';

vi.mock('../../utils/date', () => ({
  INDONESIAN_DAYS: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
}));

describe('Header Administrator UX & Navigation Affordance', () => {
  const mockOnOpenAdminPanel = vi.fn();
  const mockRefreshAdminClaim = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(workspaceModule, 'useWorkspace').mockReturnValue({
      academicYears: [],
      activeAcademicYear: null,
      activeSemester: 'GANJIL',
      teachingAssignments: [],
      selectedAssignment: null,
      setSelectedAssignment: vi.fn(),
      selectClassWithAutoAssignment: vi.fn(),
      setActiveAcademicYear: vi.fn(),
      setActiveSemester: vi.fn(),
      reloadWorkspaceData: vi.fn(),
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspaceSync').mockReturnValue({
      isOnline: true,
      syncStatus: 'synced',
      syncMessage: 'Tersinkron',
      triggerSyncFeedback: vi.fn(),
    } as any);

    vi.spyOn(appearanceModule, 'useAppearance').mockReturnValue({
      activePreset: 'shadcn-ui',
      mode: 'light',
      tokens: {} as any,
      colors: {} as any,
      setPreset: vi.fn(),
      applyAndSavePreset: vi.fn(),
      setMode: vi.fn(),
      toggleMode: vi.fn(),
      applyAndSaveMode: vi.fn(),
      animationsEnabled: true,
      toggleAnimations: vi.fn(),
      setAnimationsEnabled: vi.fn(),
    });
  });

  it('renders Administrator role and affordance when isAdmin is true (verified claim)', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'admin-1',
        displayName: 'Pak Admin',
        email: 'admin@madrasah.sch.id',
        role: 'ADMIN',
      },
      isAdmin: true,
      adminStatus: 'verified-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    // Profile dropdown trigger shows "Administrator"
    expect(screen.getByText('Administrator')).toBeInTheDocument();

    // Click profile dropdown to open menu
    const profileBtn = screen.getByRole('button', { name: /Pak Admin/i });
    fireEvent.click(profileBtn);

    // Menu contains "Panel Administrator"
    const adminMenuBtn = screen.getByText('Panel Administrator');
    expect(adminMenuBtn).toBeInTheDocument();

    fireEvent.click(adminMenuBtn);
    expect(mockOnOpenAdminPanel).toHaveBeenCalledTimes(1);
  });

  it('eliminates false affordance: hides admin panel when profile.role === "ADMIN" but claim is NOT verified', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'unclaimed-admin',
        displayName: 'Pak Admin Unclaimed',
        email: 'admin-unclaimed@madrasah.sch.id',
        role: 'ADMIN',
      },
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    // Header role display must show "Guru" because isAdmin is false
    expect(screen.getByText('Guru')).toBeInTheDocument();
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument();

    // Click profile dropdown to open menu
    const profileBtn = screen.getByRole('button', { name: /Pak Admin Unclaimed/i });
    fireEvent.click(profileBtn);

    // Menu MUST NOT display "Panel Administrator"
    expect(screen.queryByText('Panel Administrator')).not.toBeInTheDocument();
  });

  it('eliminates false affordance for johanrovian90@gmail.com when profile.role is TEACHER and claim is false', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'user-primary-email',
        displayName: 'Pak Johan',
        email: 'johanrovian90@gmail.com',
        role: 'TEACHER',
      },
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    expect(screen.getByText('Guru')).toBeInTheDocument();
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument();

    const profileBtn = screen.getByRole('button', { name: /Pak Johan/i });
    fireEvent.click(profileBtn);

    expect(screen.queryByText('Panel Administrator')).not.toBeInTheDocument();
  });

  it('renders Guru role for regular teacher without admin affordance', () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'teacher-1',
        displayName: 'Bu Guru',
        email: 'guru@madrasah.sch.id',
        role: 'TEACHER',
      },
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    expect(screen.getByText('Guru')).toBeInTheDocument();
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument();
  });

  it('allows syncing token claim from profile dropdown and shows success message when verified-admin', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('verified-admin');

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'teacher-1',
        displayName: 'Pak Guru',
        email: 'guru@madrasah.sch.id',
        role: 'TEACHER',
      },
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    const profileBtn = screen.getByRole('button', { name: /Pak Guru/i });
    fireEvent.click(profileBtn);

    const syncBtn = screen.getByRole('button', { name: /Periksa \/ Sinkronkan Izin Akun/i });
    expect(syncBtn).toBeInTheDocument();

    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(mockRefreshAdminClaim).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText('Hak administrator aktif! Menu Panel Administrator telah terbuka.')
      ).toBeInTheDocument();
    });
  });

  it('shows warning advice when token claim is still not-admin on server', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('not-admin');

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'teacher-1',
        displayName: 'Pak Guru',
        email: 'guru@madrasah.sch.id',
        role: 'TEACHER',
      },
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    const profileBtn = screen.getByRole('button', { name: /Pak Guru/i });
    fireEvent.click(profileBtn);

    const syncBtn = screen.getByRole('button', { name: /Periksa \/ Sinkronkan Izin Akun/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Klaim admin belum aktif di server. Jika baru dipasang, silakan login ulang atau hubungi operator.')
      ).toBeInTheDocument();
    });
  });

  it('shows error advice when token claim verification fails with network error', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('verification-error');

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      profile: {
        uid: 'teacher-1',
        displayName: 'Pak Guru',
        email: 'guru@madrasah.sch.id',
        role: 'TEACHER',
      },
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: vi.fn(),
    } as any);

    render(
      <Header
        currentRoute="dashboard"
        onOpenMobileMenu={vi.fn()}
        onNavigate={vi.fn()}
        onOpenAdminPanel={mockOnOpenAdminPanel}
      />
    );

    const profileBtn = screen.getByRole('button', { name: /Pak Guru/i });
    fireEvent.click(profileBtn);

    const syncBtn = screen.getByRole('button', { name: /Periksa \/ Sinkronkan Izin Akun/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Gagal memverifikasi klaim ke server otentikasi. Periksa koneksi Anda.')
      ).toBeInTheDocument();
    });
  });
});
