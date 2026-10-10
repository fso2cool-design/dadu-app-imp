import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminUserManagementPage } from './AdminUserManagementPage';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { ToastProvider } from '../../context/ToastContext';
import * as authModule from '../auth/AuthContext';

vi.mock('../../utils/date', () => ({
  formatDateIndonesian: vi.fn((date) => date),
  dateToLocalISO: vi.fn(() => '2026-10-10'),
  formatShortDate: vi.fn(() => '10 Okt'),
}));

describe('AdminUserManagementPage UX & Error Handling', () => {
  const mockGetAllUsers = vi.fn();
  const mockGetUnreadCount = vi.fn().mockResolvedValue(0);
  const mockRefreshAdminClaim = vi.fn();

  const mockApp = {
    admin: {
      getAllUsers: mockGetAllUsers,
      setAccountStatus: vi.fn(),
      adminUpdateProfile: vi.fn(),
      purgeWorkspace: vi.fn(),
      purgeOrphans: vi.fn(),
      scanOrphans: vi.fn(),
      getStorageStats: vi.fn(),
    },
    feedback: {
      getUnreadCount: mockGetUnreadCount,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'admin-uid', email: 'admin@madrasah.sch.id' },
      profile: { uid: 'admin-uid', role: 'ADMIN', displayName: 'Admin' },
      refreshAdminClaim: mockRefreshAdminClaim,
    } as any);
  });

  it('displays informative error when permission-denied is received without leaking sensitive internals', async () => {
    const permError = new Error('Missing or insufficient permissions.');
    (permError as any).code = 'permission-denied';
    mockGetAllUsers.mockRejectedValueOnce(permError);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <AdminUserManagementPage />
        </ToastProvider>
      </ApplicationProvider>
    );

    // Initial loading indicator
    expect(screen.getByText(/Memuat data pengguna dari Firestore/i)).toBeInTheDocument();

    // After failure, error state should be rendered
    await waitFor(() => {
      expect(screen.getByText('Izin Akses Administratif Ditolak')).toBeInTheDocument();
    });

    const errorElements = screen.getAllByText(
      'Akses administratif belum aktif atau akun Anda tidak memiliki izin untuk mengelola data pengguna.'
    );
    expect(errorElements.length).toBeGreaterThanOrEqual(1);

    // Verify retry button is available
    const retryBtn = screen.getByRole('button', { name: /Coba Muat Ulang/i });
    expect(retryBtn).toBeInTheDocument();

    // Clicking retry attempts to call getAllUsers again
    mockGetAllUsers.mockResolvedValueOnce([
      { uid: 'u1', email: 'guru1@sch.id', displayName: 'Guru 1', role: 'TEACHER', accountStatus: 'ACTIVE' },
    ]);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Guru 1')).toBeInTheDocument();
    });
  });

  it('allows syncing token claim on permission-denied and reloads user data on success', async () => {
    const permError = new Error('Missing or insufficient permissions.');
    (permError as any).code = 'permission-denied';
    mockGetAllUsers.mockRejectedValueOnce(permError);
    mockRefreshAdminClaim.mockResolvedValueOnce('verified-admin');

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <AdminUserManagementPage />
        </ToastProvider>
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Izin Akses Administratif Ditolak')).toBeInTheDocument();
    });

    const syncClaimBtn = screen.getByRole('button', { name: /Sinkronkan Izin Token/i });
    expect(syncClaimBtn).toBeInTheDocument();

    mockGetAllUsers.mockResolvedValueOnce([
      { uid: 'u2', email: 'guru2@sch.id', displayName: 'Guru Dua', role: 'TEACHER', accountStatus: 'ACTIVE' },
    ]);

    fireEvent.click(syncClaimBtn);

    await waitFor(() => {
      expect(mockRefreshAdminClaim).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Guru Dua')).toBeInTheDocument();
    });
  });

  it('displays profile mismatch notice when user has custom claim but profile.role is TEACHER', async () => {
    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: { uid: 'claimed-teacher', email: 'teacher-admin@sch.id' },
      profile: { uid: 'claimed-teacher', role: 'TEACHER', displayName: 'Pak Guru Admin' },
      refreshAdminClaim: mockRefreshAdminClaim,
    } as any);

    mockGetAllUsers.mockResolvedValueOnce([]);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <AdminUserManagementPage />
        </ToastProvider>
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Akun Anda memiliki izin administratif penuh \(custom claim terverifikasi\), namun dokumen profil tercatat sebagai Guru/i)
      ).toBeInTheDocument();
    });
  });

  it('differentiates empty search/filter state from error state', async () => {
    mockGetAllUsers.mockResolvedValueOnce([]);

    render(
      <ApplicationProvider app={mockApp}>
        <ToastProvider>
          <AdminUserManagementPage />
        </ToastProvider>
      </ApplicationProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Tidak ada akun pengguna yang cocok dengan kriteria filter\/pencarian/i)
      ).toBeInTheDocument();
    });

    // Error alert should not be visible
    expect(screen.queryByText('Izin Akses Administratif Ditolak')).not.toBeInTheDocument();
  });
});
