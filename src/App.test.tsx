import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useApplication, ApplicationProvider } from './application/ApplicationContext';
import { container } from './application/ports/container';
import { AuthProvider } from './features/auth/AuthContext';
import * as authModule from './features/auth/AuthContext';
import { DesignSystemProvider } from './context/DesignSystemContext';

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

vi.mock('./services/firebase/config', () => ({
  auth: { app: { name: '[DEFAULT]' } },
  db: {},
}));

describe('Production Composition Root & ApplicationProvider Wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  it('renders App root without throwing "useApplication must be used within an ApplicationProvider"', () => {
    // When App mounts, AuthProvider and DesignSystemProvider immediately call useApplication().
    // If ApplicationProvider was omitted from App root, this would throw synchronously or trigger ErrorBoundary.
    expect(() => {
      render(<App />);
    }).not.toThrow();

    // Verify initial render loads properly without triggering ErrorBoundary fallback
    expect(screen.queryByText('Terjadi Kendala Aplikasi')).not.toBeInTheDocument();
  });

  it('guarantees AuthProvider and DesignSystemProvider throw if ApplicationProvider is missing', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Regression check 1: AuthProvider mounted outside ApplicationProvider must fail fast
    expect(() => {
      render(
        <AuthProvider>
          <div>Child</div>
        </AuthProvider>
      );
    }).toThrow('useApplication must be used within an ApplicationProvider');

    // Regression check 2: DesignSystemProvider mounted outside ApplicationProvider must fail fast
    const useAuthSpy = vi.spyOn(authModule, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    } as any);

    expect(() => {
      render(
        <DesignSystemProvider>
          <div>Child</div>
        </DesignSystemProvider>
      );
    }).toThrow('useApplication must be used within an ApplicationProvider');

    useAuthSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('provides valid ApplicationOperations to consumers when wired with container.app', () => {
    let capturedApp: any = null;

    const ProbeConsumer = () => {
      capturedApp = useApplication();
      return <div data-testid="app-probe">Ready</div>;
    };

    render(
      <ApplicationProvider app={container.app}>
        <ProbeConsumer />
      </ApplicationProvider>
    );

    expect(screen.getByTestId('app-probe')).toBeInTheDocument();
    expect(capturedApp).toBeDefined();
    expect(capturedApp).toBe(container.app);
    expect(capturedApp.auth).toBeDefined();
    expect(capturedApp.workspace).toBeDefined();
    expect(capturedApp.students).toBeDefined();
    expect(capturedApp.master).toBeDefined();
    expect(capturedApp.master.classes).toBeDefined();
    expect(capturedApp.master.subjects).toBeDefined();
    expect(capturedApp.attendance).toBeDefined();
    expect(capturedApp.grades).toBeDefined();
    expect(capturedApp.settings).toBeDefined();
  });
});
