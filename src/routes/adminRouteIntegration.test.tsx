import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthenticatedApp } from '../App';
import * as authModule from '../features/auth/AuthContext';
import * as workspaceModule from '../context/WorkspaceContext';
import * as themeModule from '../context/ThemeContext';
import { ApplicationProvider } from '../application/ApplicationContext';
import { ToastProvider } from '../context/ToastContext';
import type { ApplicationOperations } from '../application/types';

vi.mock('../utils/date', () => ({
  INDONESIAN_DAYS: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  formatDateIndonesian: vi.fn((d) => d),
  dateToLocalISO: vi.fn(() => '2026-10-10'),
  formatShortDate: vi.fn(() => '10 Okt'),
}));

vi.mock('../features/admin/AdminUserManagementPage', () => ({
  AdminUserManagementPage: () => <div data-testid="admin-management-page">Panel Administrator Konten</div>,
}));

vi.mock('../features/dashboard/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Halaman Dashboard Guru</div>,
}));

vi.mock('../features/settings/SettingsPage', () => ({
  SettingsPage: () => <div data-testid="settings-page">Halaman Pengaturan Profil</div>,
}));

describe('Router Integration & Admin Route Guarding (/admin)', () => {
  const mockRefreshAdminClaim = vi.fn();
  const mockLogout = vi.fn();

  const mockApp: ApplicationOperations = {
    auth: {
      getAdminClaimStatus: vi.fn(),
      getProfile: vi.fn(),
    },
    feedback: {
      getUnreadCount: vi.fn().mockResolvedValue(0),
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Polyfill scrollTo for jsdom div elements
    Element.prototype.scrollTo = vi.fn();
    window.scrollTo = vi.fn();

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
      loading: false,
    } as any);

    vi.spyOn(workspaceModule, 'useWorkspaceSync').mockReturnValue({
      isOnline: true,
      syncStatus: 'synced',
      syncMessage: 'Tersinkron',
      triggerSyncFeedback: vi.fn(),
    } as any);

    vi.spyOn(themeModule, 'useAppTheme').mockReturnValue({
      theme: 'emerald-slate',
      themeConfig: { name: 'Emerald Slate' } as any,
      availableThemes: [],
      setTheme: vi.fn(),
      activeTheme: 'emerald-slate',
      previewTheme: 'emerald-slate',
      setPreviewTheme: vi.fn(),
      applyAndSaveTheme: vi.fn(),
      resetPreview: vi.fn(),
      isDark: false,
    } as any);
  });

  it('allows access to /admin when claim is verified (isAdmin: true, verified-admin)', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'admin-1', email: 'admin@madrasah.sch.id' },
      profile: { uid: 'admin-1', role: 'ADMIN', displayName: 'Admin Madrasah', isOnboarded: true },
      loading: false,
      isAdmin: true,
      adminStatus: 'verified-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: mockLogout,
    } as any);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ApplicationProvider>
    );

    // Expect the admin management page to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('admin-management-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Verifikasi Izin Terkendala')).not.toBeInTheDocument();
  });

  it('redirects user with status not-admin away from /admin to /dashboard', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-1', email: 'guru@madrasah.sch.id' },
      profile: { uid: 'teacher-1', role: 'TEACHER', displayName: 'Guru Biasa', isOnboarded: true },
      loading: false,
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: mockLogout,
    } as any);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/dashboard" element={<div data-testid="redirected-dashboard">Redirect Berhasil</div>} />
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ApplicationProvider>
    );

    // Should redirect cleanly to /dashboard via <Navigate to="/dashboard" replace />
    await waitFor(() => {
      expect(screen.getByTestId('redirected-dashboard')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-management-page')).not.toBeInTheDocument();
  });

  it('displays recovery screen on /admin when status is verification-error and allows retrying', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'admin-err', email: 'admin@madrasah.sch.id' },
      profile: { uid: 'admin-err', role: 'ADMIN', displayName: 'Admin Offline', isOnboarded: true },
      loading: false,
      isAdmin: false,
      adminStatus: 'verification-error',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: mockLogout,
    } as any);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ApplicationProvider>
    );

    // Error recovery screen must appear
    expect(screen.getByText('Verifikasi Izin Terkendala')).toBeInTheDocument();
    expect(
      screen.getByText('Gagal memverifikasi klaim token administratif karena kendala jaringan atau server otentikasi.')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Coba Verifikasi Ulang/i });
    expect(retryBtn).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /Kembali ke Dashboard/i });
    expect(backBtn).toBeInTheDocument();

    // Clicking retry calls refreshAdminClaim
    fireEvent.click(retryBtn);
    expect(mockRefreshAdminClaim).toHaveBeenCalledTimes(1);
  });

  it('keeps non-admin pages (e.g. /dashboard) accessible even if admin verification fails', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'teacher-offline', email: 'guru-offline@madrasah.sch.id' },
      profile: { uid: 'teacher-offline', role: 'TEACHER', displayName: 'Guru Offline', isOnboarded: true },
      loading: false,
      isAdmin: false,
      adminStatus: 'verification-error', // token verification failed
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: mockLogout,
    } as any);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ApplicationProvider>
    );

    // Non-admin route is completely unobstructed by admin verification failure
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Verifikasi Izin Terkendala')).not.toBeInTheDocument();
  });

  it('allows synchronizing claim from non-admin page and reveals admin affordance upon success', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('verified-admin');

    // First render with non-admin
    const authState = {
      user: { uid: 'teacher-promoted', email: 'promoted@madrasah.sch.id' },
      profile: { uid: 'teacher-promoted', role: 'TEACHER', displayName: 'Guru Promosi', isOnboarded: true },
      loading: false,
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
      logout: mockLogout,
    };

    const authSpy = vi.spyOn(authModule, 'useAuth').mockReturnValue(authState as any);

    const { rerender } = render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ApplicationProvider>
    );

    // Ensure dashboard loads
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    // Open profile menu
    const profileBtn = screen.getByRole('button', { name: /Guru Promosi/i });
    fireEvent.click(profileBtn);

    // Admin panel button is not visible yet
    expect(screen.queryByText('Panel Administrator')).not.toBeInTheDocument();

    // Click "Periksa / Sinkronkan Izin Akun"
    const syncBtn = screen.getByRole('button', { name: /Periksa \/ Sinkronkan Izin Akun/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(mockRefreshAdminClaim).toHaveBeenCalledTimes(1);
    });

    // Now update authState to reflect successful verification
    authSpy.mockReturnValue({
      ...authState,
      isAdmin: true,
      adminStatus: 'verified-admin',
    } as any);

    // Re-render simulates the AuthContext state change triggered by refreshAdminClaim
    rerender(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ApplicationProvider>
    );

    // "Panel Administrator" affordance is now visible!
    await waitFor(() => {
      expect(screen.getByText('Panel Administrator')).toBeInTheDocument();
    });
  });
});
