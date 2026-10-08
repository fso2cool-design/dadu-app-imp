import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DesignSystemProvider,
  useDesignSystem,
  isValidDesignSystem,
  resolveDesignSystem,
  mapLegacyThemeToDesignSystem,
} from './DesignSystemContext';
import { ThemeProvider, useAppTheme, THEME_OPTIONS } from './ThemeContext';
import { ApplicationProvider } from '../application/ApplicationContext';
import { AuthProvider } from '../features/auth/AuthContext';
import { DESIGN_SYSTEMS } from '../types';
import type { ApplicationOperations } from '../application/types';
import type { DesignSystemKey, DesignSystemMode } from '../types';
import { buildPreviewVars } from '../features/settings/tabs/showcaseTokens';

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
    onAuthStateChanged: vi.fn((cb) => {
      cb(null);
      return vi.fn(); // return unsubscribe function
    }),
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
    { system: 'shadcn-ui', mode: 'light', expectedAccent: '#18181B', expectedSurface: '#FFFFFF', hasDarkClass: false },
    { system: 'shadcn-ui', mode: 'dark', expectedAccent: '#FAFAFA', expectedSurface: '#09090B', hasDarkClass: true },
    { system: 'neo-brutalism', mode: 'light', expectedAccent: '#FFE500', expectedSurface: '#FFFDF5', hasDarkClass: false },
    { system: 'neo-brutalism', mode: 'dark', expectedAccent: '#FFE500', expectedSurface: '#121212', hasDarkClass: true },
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

      // 1. Start at paper-craft dark
      act(() => {
        contextValue.setSystem('paper-craft');
        contextValue.setMode('dark');
      });

      const root = document.documentElement;
      expect(root.getAttribute('data-design-system')).toBe('paper-craft');
      expect(root.classList.contains('dark')).toBe(true);
      expect(root.style.getPropertyValue('--ds-accent')).toBe('#FF5A36');
      expect(root.style.getPropertyValue('--ds-surface')).toBe('#1C1917');

      // 2. Transition directly to neo-brutalism light
      act(() => {
        contextValue.setSystem('neo-brutalism');
        contextValue.setMode('light');
      });

      // Assert no leakage from paper-craft or dark mode
      expect(root.getAttribute('data-design-system')).toBe('neo-brutalism');
      expect(root.getAttribute('data-mode')).toBe('light');
      expect(root.classList.contains('dark')).toBe(false);
      expect(root.style.getPropertyValue('--ds-accent')).toBe('#FFE500');
      expect(root.style.getPropertyValue('--ds-surface')).toBe('#FFFDF5');
      expect(root.style.getPropertyValue('--ds-border-width')).toBe('2px');

      // 3. Transition to shadcn-ui light
      act(() => {
        contextValue.setSystem('shadcn-ui');
        contextValue.setMode('light');
      });

      expect(root.getAttribute('data-design-system')).toBe('shadcn-ui');
      expect(root.getAttribute('data-mode')).toBe('light');
      expect(root.classList.contains('dark')).toBe(false);
      expect(root.style.getPropertyValue('--ds-accent')).toBe('#18181B');
      expect(root.style.getPropertyValue('--ds-surface')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--ds-border-width')).toBe('1px');
    });
  });

  describe('Legacy Migration & Backward Compatibility Boundary', () => {
    it('validates active design system keys strictly', () => {
      expect(isValidDesignSystem('paper-craft')).toBe(true);
      expect(isValidDesignSystem('neo-brutalism')).toBe(true);
      expect(isValidDesignSystem('shadcn-ui')).toBe(true);

      // Legacy keys must NOT be valid active keys
      expect(isValidDesignSystem('atelier')).toBe(false);
      expect(isValidDesignSystem('minimalist')).toBe(false);
      expect(isValidDesignSystem('light')).toBe(false);
      expect(isValidDesignSystem('apple-glass')).toBe(false);
    });

    it('resolves legacy identifiers at read boundary correctly', () => {
      // atelier -> neo-brutalism
      expect(resolveDesignSystem('atelier')).toBe('neo-brutalism');
      // minimalist -> shadcn-ui
      expect(resolveDesignSystem('minimalist')).toBe('shadcn-ui');

      // Other legacy theme aliases
      expect(resolveDesignSystem('apple-glass')).toBe('neo-brutalism');
      expect(resolveDesignSystem('dark-crimson')).toBe('neo-brutalism');
      expect(resolveDesignSystem('obsidian-tactile')).toBe('neo-brutalism');
      expect(resolveDesignSystem('solarized-comfort')).toBe('neo-brutalism');
      expect(resolveDesignSystem('neo-skeuomorphic')).toBe('shadcn-ui');
      expect(resolveDesignSystem('light')).toBe('shadcn-ui');
      expect(resolveDesignSystem('swiss-manuscript')).toBe('shadcn-ui');
      expect(resolveDesignSystem('brutalism')).toBe('paper-craft');
      expect(resolveDesignSystem('chalkboard-school')).toBe('paper-craft');

      // Unknown keys return null
      expect(resolveDesignSystem('unknown-random')).toBeNull();
    });

    it('maps legacy theme preferences with safe default fallback', () => {
      expect(mapLegacyThemeToDesignSystem('atelier')).toBe('neo-brutalism');
      expect(mapLegacyThemeToDesignSystem('minimalist')).toBe('shadcn-ui');
      expect(mapLegacyThemeToDesignSystem('light')).toBe('shadcn-ui');
      expect(mapLegacyThemeToDesignSystem('chalkboard-school')).toBe('paper-craft');
      expect(mapLegacyThemeToDesignSystem('unknown-legacy')).toBe('shadcn-ui');
    });

    it('ensures DESIGN_SYSTEMS array only contains active keys', () => {
      const activeIds = DESIGN_SYSTEMS.map((ds) => ds.id);
      expect(activeIds).toEqual(['paper-craft', 'shadcn-ui', 'neo-brutalism']);
      expect(activeIds).not.toContain('atelier');
      expect(activeIds).not.toContain('minimalist');
    });

    it('ensures THEME_OPTIONS presents clean display names in the dropdown', () => {
      const displayNames = THEME_OPTIONS.map((opt) => opt.name);
      expect(displayNames).toEqual(['Paper Craft', 'Shadcn UI', 'Neo-Brutalism']);
      expect(displayNames).not.toContain('Minimalist');
      expect(displayNames).not.toContain('Atelier');
      expect(displayNames).not.toContain('Atelier (Neo-Brutalism)');
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

  describe('Showcase CSS Variables Parity', () => {
    combinations.forEach(({ system, mode }) => {
      it(`injects variables into root matching buildPreviewVars for ${system}/${mode}`, () => {
        renderProviders();

        act(() => {
          contextValue.setSystem(system);
          contextValue.setMode(mode);
        });

        const root = document.documentElement;
        const expectedVars = buildPreviewVars(system, mode);

        for (const [key, value] of Object.entries(expectedVars)) {
          expect(root.style.getPropertyValue(key), key).toBe(value);
        }
      });
    });
  });
});
