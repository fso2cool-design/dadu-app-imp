import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationProvider } from '../../application/ApplicationContext';
import type { ApplicationOperations } from '../../application/types';

let authStateCallback: ((user: any) => void) | null = null;
const mockUnsubscribe = vi.fn();
const mockGetAdminClaimStatus = vi.fn();

vi.mock('../../services/firebase/config', () => ({
  auth: { app: { name: '[DEFAULT]' } },
}));

const mockApp: ApplicationOperations = {
  auth: {
    getProfile: vi.fn().mockResolvedValue({
      uid: 'user-1',
      displayName: 'Guru Fulan',
      email: 'guru@test.com',
      role: 'TEACHER',
    }),
    createProfile: vi.fn(),
    recordLastLogin: vi.fn(),
    updateProfile: vi.fn(),
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    onAuthStateChanged: vi.fn((callback) => {
      authStateCallback = callback;
      return mockUnsubscribe;
    }),
    getAdminClaimStatus: mockGetAdminClaimStatus,
  },
} as any;

import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockGetAdminClaimStatus.mockResolvedValue({ status: 'not-admin' });
  });

  it('throws an error when useAuth is used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleSpy.mockRestore();
  });

  it('provides initial loading state and transitions when auth state is resolved', async () => {
    const TestConsumer = () => {
      const { user, loading, adminStatus } = useAuth();
      if (loading) return <div>Memuat status autentikasi...</div>;
      return (
        <div>
          <span>{user ? `Halo, ${user.email}` : 'Belum Login'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    // Initial state before onAuthStateChanged fires
    expect(screen.getByText('Memuat status autentikasi...')).toBeInTheDocument();

    // Simulate onAuthStateChanged with null (no user logged in)
    await act(async () => {
      authStateCallback?.(null);
    });

    expect(screen.getByText('Belum Login')).toBeInTheDocument();
    expect(screen.getByText('Status: not-admin')).toBeInTheDocument();
  });

  it('verifies admin status when custom claim admin is true', async () => {
    mockGetAdminClaimStatus.mockResolvedValueOnce({ status: 'verified-admin' });

    const TestConsumer = () => {
      const { user, profile, isAdmin, adminStatus, loading } = useAuth();
      if (loading) return <div>Memuat...</div>;
      return (
        <div>
          <span>User: {user?.email}</span>
          <span>Role: {profile?.role}</span>
          <span>IsAdmin: {isAdmin ? 'YES' : 'NO'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    await act(async () => {
      authStateCallback?.({
        uid: 'admin-uid',
        email: 'admin@madrasah.sch.id',
      });
    });

    expect(screen.getByText('IsAdmin: YES')).toBeInTheDocument();
    expect(screen.getByText('Status: verified-admin')).toBeInTheDocument();
  });

  it('does not grant admin when claim is false even if profile role is ADMIN', async () => {
    (mockApp.auth.getProfile as any).mockResolvedValueOnce({
      uid: 'user-unclaimed-admin',
      displayName: 'Admin Belum Klaim',
      email: 'admin-unclaimed@test.com',
      role: 'ADMIN',
    });
    mockGetAdminClaimStatus.mockResolvedValueOnce({ status: 'not-admin' });

    const TestConsumer = () => {
      const { profile, isAdmin, adminStatus, loading } = useAuth();
      if (loading) return <div>Memuat...</div>;
      return (
        <div>
          <span>Role: {profile?.role}</span>
          <span>IsAdmin: {isAdmin ? 'YES' : 'NO'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    await act(async () => {
      authStateCallback?.({
        uid: 'user-unclaimed-admin',
        email: 'admin-unclaimed@test.com',
      });
    });

    // Profile role is ADMIN, but without claim, isAdmin is NO and status is not-admin
    expect(screen.getByText('Role: ADMIN')).toBeInTheDocument();
    expect(screen.getByText('IsAdmin: NO')).toBeInTheDocument();
    expect(screen.getByText('Status: not-admin')).toBeInTheDocument();
  });

  it('grants admin when claim is true even if profile role is TEACHER (claim is ground truth)', async () => {
    (mockApp.auth.getProfile as any).mockResolvedValueOnce({
      uid: 'teacher-claimed-admin',
      displayName: 'Guru Jadi Admin',
      email: 'guru-admin@test.com',
      role: 'TEACHER',
    });
    mockGetAdminClaimStatus.mockResolvedValueOnce({ status: 'verified-admin' });

    const TestConsumer = () => {
      const { profile, isAdmin, adminStatus, loading } = useAuth();
      if (loading) return <div>Memuat...</div>;
      return (
        <div>
          <span>Role: {profile?.role}</span>
          <span>IsAdmin: {isAdmin ? 'YES' : 'NO'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    await act(async () => {
      authStateCallback?.({
        uid: 'teacher-claimed-admin',
        email: 'guru-admin@test.com',
      });
    });

    expect(screen.getByText('Role: TEACHER')).toBeInTheDocument();
    expect(screen.getByText('IsAdmin: YES')).toBeInTheDocument();
    expect(screen.getByText('Status: verified-admin')).toBeInTheDocument();
  });

  it('handles token verification failure safely with verification-error (fail-closed)', async () => {
    mockGetAdminClaimStatus.mockRejectedValueOnce(new Error('Network error on STS'));

    const TestConsumer = () => {
      const { isAdmin, adminStatus, loading } = useAuth();
      if (loading) return <div>Memuat...</div>;
      return (
        <div>
          <span>IsAdmin: {isAdmin ? 'YES' : 'NO'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    await act(async () => {
      authStateCallback?.({
        uid: 'user-err',
        email: 'user-err@test.com',
      });
    });

    expect(screen.getByText('IsAdmin: NO')).toBeInTheDocument();
    expect(screen.getByText('Status: verification-error')).toBeInTheDocument();
  });

  it('supports explicit on-demand refreshAdminClaim and updates state', async () => {
    // Initial state: not-admin
    mockGetAdminClaimStatus.mockResolvedValueOnce({ status: 'not-admin' });

    let refreshFn: any;
    const TestConsumer = () => {
      const { isAdmin, adminStatus, refreshAdminClaim } = useAuth();
      refreshFn = refreshAdminClaim;
      return (
        <div>
          <span>IsAdmin: {isAdmin ? 'YES' : 'NO'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    await act(async () => {
      authStateCallback?.({
        uid: 'user-provisioned',
        email: 'provisioned@test.com',
      });
    });

    expect(screen.getByText('IsAdmin: NO')).toBeInTheDocument();

    // Admin runs CLI script in background, then user clicks refresh
    mockGetAdminClaimStatus.mockResolvedValueOnce({ status: 'verified-admin' });

    await act(async () => {
      await refreshFn();
    });

    expect(screen.getByText('IsAdmin: YES')).toBeInTheDocument();
    expect(screen.getByText('Status: verified-admin')).toBeInTheDocument();
    expect(mockGetAdminClaimStatus).toHaveBeenLastCalledWith(true);
  });

  it('resets admin status cleanly on logout and account switch', async () => {
    mockGetAdminClaimStatus.mockResolvedValueOnce({ status: 'verified-admin' });

    let logoutFn: any;
    const TestConsumer = () => {
      const { user, isAdmin, adminStatus, logout } = useAuth();
      logoutFn = logout;
      return (
        <div>
          <span>User: {user ? user.email : 'NONE'}</span>
          <span>IsAdmin: {isAdmin ? 'YES' : 'NO'}</span>
          <span>Status: {adminStatus}</span>
        </div>
      );
    };

    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ApplicationProvider>
    );

    await act(async () => {
      authStateCallback?.({
        uid: 'admin-1',
        email: 'admin1@test.com',
      });
    });

    expect(screen.getByText('IsAdmin: YES')).toBeInTheDocument();

    await act(async () => {
      await logoutFn();
    });

    expect(screen.getByText('User: NONE')).toBeInTheDocument();
    expect(screen.getByText('IsAdmin: NO')).toBeInTheDocument();
    expect(screen.getByText('Status: not-admin')).toBeInTheDocument();
  });
});
