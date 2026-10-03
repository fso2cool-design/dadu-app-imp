import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignSystemProvider, useDesignSystem } from './DesignSystemContext';
import { ThemeProvider, useAppTheme } from './ThemeContext';
import { ApplicationProvider } from '../application/ApplicationContext';
import { AuthProvider } from '../features/auth/AuthContext';
import type { ApplicationOperations } from '../application/types';
import type { DesignSystemKey, DesignSystemMode } from '../types';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../services/firebase/config', () => ({
  auth: { app: { name: '[DEFAULT]' } },
  db: {},
}));

const mockApp: ApplicationOperations = {
  auth: {
    getProfile: vi.fn().mockResolvedValue(null),
    createProfile: vi.fn(),
    recordLastLogin: vi.fn(),
    updateProfile: vi.fn(),
  },
  theme: {
    updateDesignSystem: vi.fn(),
    updateModePreference: vi.fn(),
  },
} as any;

describe('DesignSystemContext & Theme Architecture', () => {
  let contextValue: ReturnType<typeof useDesignSystem>;
  let themeValue: ReturnType<typeof useAppTheme>;

  const Consumer = () => {
    contextValue = useDesignSystem();
    themeValue = useAppTheme();
    return (
      <div data-testid="consumer">
        <span data-testid="system">{contextValue.activeSystem}</span>
        <span data-testid="mode">{contextValue.mode}</span>
        <span data-testid="theme-alias">{themeValue.activeTheme}</span>
      </div>
    );
  };

  const renderProviders = () => {
    return render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <DesignSystemProvider>
            <ThemeProvider>
              <Consumer />
            </ThemeProvider>
          </DesignSystemProvider>
        </AuthProvider>
      </ApplicationProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Clean up DOM root
    const root = document.documentElement;
    root.removeAttribute('data-design-system');
    root.removeAttribute('data-theme');
    root.removeAttribute('data-mode');
    root.classList.remove('dark');
  });

  const combinations: Array<{
    system: DesignSystemKey;
    mode: DesignSystemMode;
    expectedAccent: string;
    expectedSurface: string;
    hasDarkClass: boolean;
  }> = [
    { system: 'paper-craft', mode: 'light', expectedAccent: '#FF5A36', expectedSurface: '#FAF7EE', hasDarkClass: false },
    { system: 'paper-craft', mode: 'dark', expectedAccent: '#FF5A36', expectedSurface: '#1C1917', hasDarkClass: true },
    { system: 'minimalist', mode: 'light', expectedAccent: '#2F3437', expectedSurface: '#F7F6F3', hasDarkClass: false },
    { system: 'minimalist', mode: 'dark', expectedAccent: '#E7E5E0', expectedSurface: '#201E1C', hasDarkClass: true },
    { system: 'atelier', mode: 'light', expectedAccent: '#FFE500', expectedSurface: '#FFFDF5', hasDarkClass: false },
    { system: 'atelier', mode: 'dark', expectedAccent: '#FFE500', expectedSurface: '#121212', hasDarkClass: true },
  ];

  describe('6 System & Mode Combinations Verification', () => {
    combinations.forEach(({ system, mode, expectedAccent, expectedSurface, hasDarkClass }) => {
      it(`renders and applies tokens for ${system} in ${mode} mode correctly`, () => {
        renderProviders();

        act(() => {
          contextValue.setSystem(system);
          contextValue.setMode(mode);
        });

        const root = document.documentElement;

        // Verify HTML DOM attributes
        expect(root.getAttribute('data-design-system')).toBe(system);
        expect(root.getAttribute('data-theme')).toBe(system);
        expect(root.getAttribute('data-mode')).toBe(mode);
        expect(root.classList.contains('dark')).toBe(hasDarkClass);

        // Verify CSS Variables injected into root style
        expect(root.style.getPropertyValue('--ds-accent')).toBe(expectedAccent);
        expect(root.style.getPropertyValue('--ds-surface')).toBe(expectedSurface);

        // Verify consumer reflection
        expect(screen.getByTestId('system').textContent).toBe(system);
        expect(screen.getByTestId('mode').textContent).toBe(mode);
        expect(screen.getByTestId('theme-alias').textContent).toBe(system);
      });
    });
  });

  describe('Theme Leakage Prevention', () => {
    it('completely purges dark mode and system-specific tokens when switching between themes and modes', () => {
      renderProviders();

      // Start at paper-craft dark
      act(() => {
        contextValue.setSystem('paper-craft');
        contextValue.setMode('dark');
      });

      const root = document.documentElement;
      expect(root.getAttribute('data-design-system')).toBe('paper-craft');
      expect(root.classList.contains('dark')).toBe(true);
      expect(root.style.getPropertyValue('--ds-accent')).toBe('#FF5A36');
      expect(root.style.getPropertyValue('--ds-surface')).toBe('#1C1917');

      // Transition directly to atelier light
      act(() => {
        contextValue.setSystem('atelier');
        contextValue.setMode('light');
      });

      // Assert no leakage from paper-craft or dark mode
      expect(root.getAttribute('data-design-system')).toBe('atelier');
      expect(root.getAttribute('data-mode')).toBe('light');
      expect(root.classList.contains('dark')).toBe(false);
      expect(root.style.getPropertyValue('--ds-accent')).toBe('#FFE500');
      expect(root.style.getPropertyValue('--ds-surface')).toBe('#FFFDF5');

      // Verify border styling does not leak paper-craft width (1.5px) into atelier (2px)
      expect(root.style.getPropertyValue('--ds-border-width')).toBe('2px');
    });
  });

  describe('Single Source of Truth & ThemeContext Shim', () => {
    it('delegates all ThemeContext operations directly to DesignSystemContext without dual state', () => {
      renderProviders();

      // ThemeContext calling setTheme updates DesignSystemContext
      act(() => {
        themeValue.setTheme('paper-craft');
      });

      expect(contextValue.activeSystem).toBe('paper-craft');
      expect(themeValue.activeTheme).toBe('paper-craft');
      expect(document.documentElement.getAttribute('data-design-system')).toBe('paper-craft');

      // ThemeContext toggleMode toggles DesignSystemContext mode
      act(() => {
        themeValue.toggleMode();
      });

      expect(contextValue.mode).toBe('dark');
      expect(themeValue.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Verify ThemeProvider throws if used outside DesignSystemProvider
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        render(
          <ThemeProvider>
            <div>Isolated</div>
          </ThemeProvider>
        );
      }).toThrow('useDesignSystem must be used within a DesignSystemProvider');
      consoleSpy.mockRestore();
    });
  });
});
