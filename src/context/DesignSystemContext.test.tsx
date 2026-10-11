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
import { ApplicationProvider } from '../application/ApplicationContext';
import * as authModule from '../features/auth/AuthContext';
import { DESIGN_SYSTEMS } from '../types';
import type { ApplicationOperations } from '../application/types';
import type { DesignSystemKey, DesignSystemMode, UserProfile } from '../types';
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
      return vi.fn();
    }),
  },
  appearance: {
    updateDesignSystem: vi.fn(),
    updateModePreference: vi.fn(),
  },
} as any;

describe('DesignSystemContext Canonical Architecture', () => {
  let contextValue: ReturnType<typeof useDesignSystem>;

  const Consumer = () => {
    contextValue = useDesignSystem();
    return (
      <div data-testid="consumer">
        <span data-testid="preset">{contextValue.activePreset}</span>
        <span data-testid="mode">{contextValue.mode}</span>
      </div>
    );
  };

  const renderWithProviders = (customAuth?: Partial<ReturnType<typeof authModule.useAuth>>) => {
    if (customAuth) {
      vi.spyOn(authModule, 'useAuth').mockReturnValue({
        user: { uid: 'test-user-1', email: 'test@madrasah.sch.id' } as any,
        profile: null,
        loading: false,
        adminStatus: 'not-admin',
        isAdmin: false,
        refreshAdminClaim: vi.fn(),
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        resetPassword: vi.fn(),
        refreshProfile: vi.fn(),
        ...customAuth,
      });
    } else {
      vi.spyOn(authModule, 'useAuth').mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        adminStatus: 'not-admin',
        isAdmin: false,
        refreshAdminClaim: vi.fn(),
        login: vi.fn(),
        signup: vi.fn(),
        logout: vi.fn(),
        resetPassword: vi.fn(),
        refreshProfile: vi.fn(),
      });
    }

    return render(
      <ApplicationProvider app={mockApp}>
        <DesignSystemProvider>
          <Consumer />
        </DesignSystemProvider>
      </ApplicationProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    const root = document.documentElement;
    root.removeAttribute('data-design-system');
    root.removeAttribute('data-theme');
    root.removeAttribute('data-mode');
    root.classList.remove('dark');
  });

  describe('Canonical API & Deleted Names Absence', () => {
    it('exposes canonical activePreset, setPreset, and applyAndSavePreset without deleted aliases', () => {
      renderWithProviders();

      // Canonical properties exist and are functional
      expect(contextValue.activePreset).toBe('shadcn-ui');
      expect(typeof contextValue.setPreset).toBe('function');
      expect(typeof contextValue.applyAndSavePreset).toBe('function');
      expect(contextValue.mode).toBe('light');
      expect(typeof contextValue.setMode).toBe('function');
      expect(typeof contextValue.toggleMode).toBe('function');
      expect(typeof contextValue.applyAndSaveMode).toBe('function');

      // Obsolete runtime API names MUST be undefined
      const untyped = contextValue as any;
      expect(untyped.activeSystem).toBeUndefined();
      expect(untyped.setSystem).toBeUndefined();
      expect(untyped.applyAndSaveSystem).toBeUndefined();
      expect(untyped.theme).toBeUndefined();
      expect(untyped.activeTheme).toBeUndefined();
      expect(untyped.setTheme).toBeUndefined();
      expect(untyped.applyAndSaveTheme).toBeUndefined();
      expect(untyped.availableThemes).toBeUndefined();
    });

    it('throws when useDesignSystem is used outside DesignSystemProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Consumer />)).toThrow(
        'useDesignSystem must be used within a DesignSystemProvider'
      );
      consoleError.mockRestore();
    });
  });

  describe('Absence of data-theme and data-mode on DOM', () => {
    it('never injects data-theme or data-mode into the root element', () => {
      renderWithProviders();

      const root = document.documentElement;
      expect(root.getAttribute('data-design-system')).toBe('shadcn-ui');
      expect(root.getAttribute('data-theme')).toBeNull();
      expect(root.getAttribute('data-mode')).toBeNull();

      act(() => {
        contextValue.setPreset('paper-craft');
        contextValue.setMode('dark');
      });

      expect(root.getAttribute('data-design-system')).toBe('paper-craft');
      expect(root.getAttribute('data-theme')).toBeNull();
      expect(root.getAttribute('data-mode')).toBeNull();
      expect(root.classList.contains('dark')).toBe(true);
    });
  });

  describe('6 Preset and Mode Combinations Verification', () => {
    const combinations: Array<{ preset: DesignSystemKey; mode: DesignSystemMode }> = [
      { preset: 'paper-craft', mode: 'light' },
      { preset: 'paper-craft', mode: 'dark' },
      { preset: 'shadcn-ui', mode: 'light' },
      { preset: 'shadcn-ui', mode: 'dark' },
      { preset: 'neo-brutalism', mode: 'light' },
      { preset: 'neo-brutalism', mode: 'dark' },
    ];

    combinations.forEach(({ preset, mode }) => {
      it(`applies DOM attributes, classes, and CSS vars correctly for ${preset} in ${mode} mode`, () => {
        renderWithProviders();

        act(() => {
          contextValue.setPreset(preset);
          contextValue.setMode(mode);
        });

        const root = document.documentElement;

        // DOM attributes & classes
        expect(root.getAttribute('data-design-system')).toBe(preset);
        expect(root.getAttribute('data-theme')).toBeNull();
        expect(root.getAttribute('data-mode')).toBeNull();
        expect(root.classList.contains('dark')).toBe(mode === 'dark');

        // Verify CSS Variables match canonical token definition
        const expectedVars = buildPreviewVars(preset, mode);
        for (const [key, value] of Object.entries(expectedVars)) {
          expect(root.style.getPropertyValue(key), `Token ${key} for ${preset}/${mode}`).toBe(value);
        }

        // Verify consumer state
        expect(screen.getByTestId('preset').textContent).toBe(preset);
        expect(screen.getByTestId('mode').textContent).toBe(mode);
      });
    });
  });

  describe('Preset Persistence Precedence Tiers', () => {
    const testUser = { uid: 'user-prec-1' } as any;

    it('Tier 1: profile.designSystemPreference wins over profile.themePreference and localStorage', () => {
      localStorage.setItem(`app_design_system_${testUser.uid}`, 'paper-craft');
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
          designSystemPreference: 'neo-brutalism',
          themePreference: 'brutalism',
        } as any,
      });

      expect(contextValue.activePreset).toBe('neo-brutalism');
    });

    it('Tier 1b: profile.designSystemPreference resolves legacy identifiers at read boundary', () => {
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
          designSystemPreference: 'atelier',
        } as any,
      });

      expect(contextValue.activePreset).toBe('neo-brutalism');
    });

    it('Tier 2: profile.themePreference wins when designSystemPreference is absent', () => {
      localStorage.setItem(`app_design_system_${testUser.uid}`, 'neo-brutalism');
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
          themePreference: 'brutalism', // maps to paper-craft
        } as any,
      });

      expect(contextValue.activePreset).toBe('paper-craft');
    });

    it('Tier 3: localStorage wins when profile has no preset preferences', () => {
      localStorage.setItem(`app_design_system_${testUser.uid}`, 'paper-craft');
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
        } as any,
      });

      expect(contextValue.activePreset).toBe('paper-craft');
    });

    it('Tier 3b: localStorage resolves legacy identifiers at read boundary', () => {
      localStorage.setItem(`app_design_system_${testUser.uid}`, 'atelier');
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
        } as any,
      });

      expect(contextValue.activePreset).toBe('neo-brutalism');
    });

    it('Tier 4: falls back to DEFAULT_SYSTEM (shadcn-ui) when no preferences exist', () => {
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
        } as any,
      });

      expect(contextValue.activePreset).toBe('shadcn-ui');
    });
  });

  describe('Mode Persistence Precedence Tiers', () => {
    const testUser = { uid: 'user-mode-1' } as any;

    it('Tier 1: profile.designSystemModePreference wins over localStorage', () => {
      localStorage.setItem(`app_design_system_mode_${testUser.uid}`, 'light');
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
          designSystemModePreference: 'dark',
        } as any,
      });

      expect(contextValue.mode).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('Tier 2: localStorage wins when profile.designSystemModePreference is absent', () => {
      localStorage.setItem(`app_design_system_mode_${testUser.uid}`, 'dark');
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
        } as any,
      });

      expect(contextValue.mode).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('Tier 3: defaults to light when no mode preference exists', () => {
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
        } as any,
      });

      expect(contextValue.mode).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('All 11 Legacy Preset Mappings Verification', () => {
    const legacyExpectations: Record<string, DesignSystemKey> = {
      'atelier': 'neo-brutalism',
      'minimalist': 'shadcn-ui',
      'brutalism': 'paper-craft',
      'neo-skeuomorphic': 'shadcn-ui',
      'apple-glass': 'neo-brutalism',
      'light': 'shadcn-ui',
      'dark-crimson': 'neo-brutalism',
      'obsidian-tactile': 'neo-brutalism',
      'swiss-manuscript': 'shadcn-ui',
      'solarized-comfort': 'neo-brutalism',
      'chalkboard-school': 'paper-craft',
    };

    it('verifies all 11 legacy identifiers map to canonical presets via resolveDesignSystem', () => {
      expect(Object.keys(legacyExpectations)).toHaveLength(11);
      for (const [legacyKey, expectedCanonical] of Object.entries(legacyExpectations)) {
        expect(resolveDesignSystem(legacyKey), `Legacy key: ${legacyKey}`).toBe(expectedCanonical);
      }
    });

    it('verifies all 11 legacy identifiers map via mapLegacyThemeToDesignSystem with fallback', () => {
      for (const [legacyKey, expectedCanonical] of Object.entries(legacyExpectations)) {
        expect(mapLegacyThemeToDesignSystem(legacyKey), `Legacy key: ${legacyKey}`).toBe(expectedCanonical);
      }
      expect(mapLegacyThemeToDesignSystem('completely-unknown-preset')).toBe('shadcn-ui');
    });

    it('passes through active canonical preset keys directly', () => {
      expect(resolveDesignSystem('paper-craft')).toBe('paper-craft');
      expect(resolveDesignSystem('shadcn-ui')).toBe('shadcn-ui');
      expect(resolveDesignSystem('neo-brutalism')).toBe('neo-brutalism');
      expect(resolveDesignSystem('unknown-key')).toBeNull();
    });

    it('validates active design system keys strictly with isValidDesignSystem', () => {
      expect(isValidDesignSystem('paper-craft')).toBe(true);
      expect(isValidDesignSystem('shadcn-ui')).toBe(true);
      expect(isValidDesignSystem('neo-brutalism')).toBe(true);

      // Legacy keys must NOT be valid active keys
      for (const legacyKey of Object.keys(legacyExpectations)) {
        expect(isValidDesignSystem(legacyKey), `Should reject legacy key: ${legacyKey}`).toBe(false);
      }
      expect(isValidDesignSystem('unknown-random')).toBe(false);
    });

    it('ensures DESIGN_SYSTEMS array only contains the 3 canonical keys', () => {
      const activeIds = DESIGN_SYSTEMS.map((ds) => ds.id);
      expect(activeIds).toEqual(['paper-craft', 'shadcn-ui', 'neo-brutalism']);
    });
  });

  describe('Canonical Writes & Persistence Isolation', () => {
    const testUser = { uid: 'user-save-1' } as any;

    it('applyAndSavePreset writes strictly to canonical localStorage and app.appearance.updateDesignSystem', () => {
      renderWithProviders({
        user: testUser,
        profile: { uid: testUser.uid } as any,
      });

      act(() => {
        contextValue.applyAndSavePreset('paper-craft');
      });

      // Canonical writes executed
      expect(localStorage.getItem(`app_design_system_${testUser.uid}`)).toBe('paper-craft');
      expect(mockApp.appearance.updateDesignSystem).toHaveBeenCalledWith(testUser.uid, 'paper-craft');

      // State updated
      expect(contextValue.activePreset).toBe('paper-craft');
      expect(document.documentElement.getAttribute('data-design-system')).toBe('paper-craft');
      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('applyAndSaveMode writes strictly to canonical localStorage and app.appearance.updateModePreference', () => {
      renderWithProviders({
        user: testUser,
        profile: { uid: testUser.uid } as any,
      });

      act(() => {
        contextValue.applyAndSaveMode('dark');
      });

      expect(localStorage.getItem(`app_design_system_mode_${testUser.uid}`)).toBe('dark');
      expect(mockApp.appearance.updateModePreference).toHaveBeenCalledWith(testUser.uid, 'dark');

      expect(contextValue.mode).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-mode')).toBeNull();
    });
  });

  describe('Print & Document Isolation Verification', () => {
    it('maintains isolation between runtime design system variables and print document containers', () => {
      renderWithProviders();

      act(() => {
        contextValue.setPreset('neo-brutalism');
        contextValue.setMode('dark');
      });

      const root = document.documentElement;
      expect(root.getAttribute('data-design-system')).toBe('neo-brutalism');
      expect(root.classList.contains('dark')).toBe(true);

      // Verify root styling does not mutate or contaminate no-print isolation semantics
      expect(root.getAttribute('data-theme')).toBeNull();
      expect(root.getAttribute('data-mode')).toBeNull();
    });
  });
});
