import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let authStateCallback: ((user: any) => void) | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback = callback;
    return mockUnsubscribe;
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../../services/firebase/config', () => ({
  auth: { app: { name: '[DEFAULT]' } },
}));

vi.mock('../../services/firestore/users', () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    uid: 'user-1',
    displayName: 'Guru Fulan',
    email: 'guru@test.com',
    role: 'TEACHER',
  }),
  createUserProfile: vi.fn(),
  recordUserLastLogin: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  it('throws an error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error during expected thrown error test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );

    consoleSpy.mockRestore();
  });

  it('provides initial loading state and transitions when auth state is resolved', async () => {
    const TestConsumer = () => {
      const { user, loading } = useAuth();
      if (loading) return <div>Memuat status autentikasi...</div>;
      return <div>{user ? `Halo, ${user.email}` : 'Belum Login'}</div>;
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Initial state before onAuthStateChanged fires
    expect(screen.getByText('Memuat status autentikasi...')).toBeInTheDocument();

    // Simulate onAuthStateChanged with null (no user logged in)
    await act(async () => {
      authStateCallback?.(null);
    });

    expect(screen.getByText('Belum Login')).toBeInTheDocument();
  });

  it('populates user and profile when authenticated user is detected', async () => {
    const TestConsumer = () => {
      const { user, profile, loading } = useAuth();
      if (loading) return <div>Memuat...</div>;
      return (
        <div>
          <span>User: {user?.email}</span>
          <span>Role: {profile?.role}</span>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate onAuthStateChanged with authenticated user
    await act(async () => {
      authStateCallback?.({
        uid: 'user-1',
        email: 'guru@test.com',
        displayName: 'Guru Fulan',
      });
    });

    expect(screen.getByText('User: guru@test.com')).toBeInTheDocument();
    expect(screen.getByText('Role: TEACHER')).toBeInTheDocument();
  });
});
