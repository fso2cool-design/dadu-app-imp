import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppearanceProvider,
  useAppearance,
  type AppearanceContextType,
} from './AppearanceContext';
import { ApplicationProvider } from '../application/ApplicationContext';
import * as authModule from '../features/auth/AuthContext';
import { APPEARANCE_PRESETS } from '../design-system/tokens';
import type { ApplicationOperations } from '../application/types';
import type { AppearancePresetKey, ColorMode } from '../design-system/tokens';
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

describe('AppearanceContext Canonical Runtime API', () => {
  let contextValue: AppearanceContextType;

  const Consumer = () => {
    contextValue = useAppearance();
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
        user: { uid: 'test-user-app-1', email: 'user@madrasah.sch.id' } as any,
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
        <AppearanceProvider>
          <Consumer />
        </AppearanceProvider>
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

  describe('Canonical Public API Shape', () => {
    it('provides activePreset, tokens, colors, mode, and management methods', () => {
      renderWithProviders();

      expect(contextValue.activePreset).toBe('shadcn-ui');
      expect(contextValue.mode).toBe('light');
      expect(contextValue.tokens).toBeDefined();
      expect(contextValue.colors).toBeDefined();
      expect(typeof contextValue.setPreset).toBe('function');
      expect(typeof contextValue.applyAndSavePreset).toBe('function');
      expect(typeof contextValue.setMode).toBe('function');
      expect(typeof contextValue.toggleMode).toBe('function');
      expect(typeof contextValue.applyAndSaveMode).toBe('function');

      // Obsolete legacy names MUST be undefined
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

    it('throws descriptive error when useAppearance is called outside AppearanceProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Consumer />)).toThrow(
        'useAppearance must be used within an AppearanceProvider'
      );
      consoleError.mockRestore();
    });
  });

  describe('DOM Integration via applyAppearanceToDom', () => {
    it('applies data-design-system and class .dark without adding data-theme or data-mode', () => {
      renderWithProviders();

      const root = document.documentElement;
      expect(root.getAttribute('data-design-system')).toBe('shadcn-ui');
      expect(root.getAttribute('data-theme')).toBeNull();
      expect(root.getAttribute('data-mode')).toBeNull();
      expect(root.classList.contains('dark')).toBe(false);

      act(() => {
        contextValue.setPreset('neo-brutalism');
        contextValue.setMode('dark');
      });

      expect(root.getAttribute('data-design-system')).toBe('neo-brutalism');
      expect(root.getAttribute('data-theme')).toBeNull();
      expect(root.getAttribute('data-mode')).toBeNull();
      expect(root.classList.contains('dark')).toBe(true);
    });

    const combinations: Array<{ preset: AppearancePresetKey; mode: ColorMode }> = [
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
    const testUser = { uid: 'user-app-prec' } as any;

    it('Tier 1: prefers profile.designSystemPreference over profile.themePreference and localStorage', () => {
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

    it('Tier 2: falls back to legacy themePreference when designSystemPreference is absent', () => {
      renderWithProviders({
        user: testUser,
        profile: {
          uid: testUser.uid,
          themePreference: 'brutalism', // maps to paper-craft
        } as any,
      });

      expect(contextValue.activePreset).toBe('paper-craft');
    });

    it('Tier 3: falls back to user-scoped localStorage when profile preferences are absent', () => {
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

    it('Tier 4: defaults to shadcn-ui when no preferences exist', () => {
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
    const testUser = { uid: 'user-mode-prec' } as any;

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

  describe('Persistence Operations via Application Port', () => {
    const testUser = { uid: 'user-app-save' } as any;

    it('applyAndSavePreset saves to localStorage and delegates to app.appearance.updateDesignSystem', () => {
      renderWithProviders({
        user: testUser,
        profile: { uid: testUser.uid } as any,
      });

      act(() => {
        contextValue.applyAndSavePreset('paper-craft');
      });

      expect(localStorage.getItem(`app_design_system_${testUser.uid}`)).toBe('paper-craft');
      expect(mockApp.appearance.updateDesignSystem).toHaveBeenCalledWith(testUser.uid, 'paper-craft');
      expect(contextValue.activePreset).toBe('paper-craft');
    });

    it('applyAndSaveMode saves to localStorage and delegates to app.appearance.updateModePreference', () => {
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
    });
  });

  describe('Token Preservation on Mode Toggle', () => {
    it('preserves invariant token object identity while updating color palette', () => {
      renderWithProviders();

      const initialTokens = contextValue.tokens;
      const initialColors = contextValue.colors;
      expect(contextValue.mode).toBe('light');

      act(() => {
        contextValue.toggleMode();
      });

      expect(contextValue.mode).toBe('dark');
      expect(contextValue.tokens).toBe(initialTokens);
      expect(contextValue.colors).not.toEqual(initialColors);
      expect(contextValue.colors.surface).toBe(APPEARANCE_PRESETS[1].colorModes.dark.surface);
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

  describe('Stage 2 Token Contract & Invariant Separation', () => {
    it('verifies all 3 presets have invariant tokens and distinct light/dark colorModes', () => {
      expect(APPEARANCE_PRESETS).toHaveLength(3);
      for (const preset of APPEARANCE_PRESETS) {
        // Invariant tokens present and structural
        expect(preset.tokens).toBeDefined();
        expect(preset.tokens.typography).toBeDefined();
        expect(preset.tokens.spacing).toBeDefined();
        expect(preset.tokens.borders).toBeDefined();
        expect(preset.tokens.elevation).toBeDefined();
        expect(preset.tokens.radius).toBeDefined();
        expect(preset.tokens.transitions).toBeDefined();

        // Structural tokens must not contain color keys
        const invariantKeys = Object.keys(preset.tokens);
        expect(invariantKeys).not.toContain('colors');
        expect(invariantKeys).not.toContain('darkColors');

        // Color modes present
        expect(preset.colorModes).toBeDefined();
        expect(preset.colorModes.light).toBeDefined();
        expect(preset.colorModes.dark).toBeDefined();

        // Color tokens are distinct per mode
        expect(preset.colorModes.light.surface).not.toBe(preset.colorModes.dark.surface);
        expect(preset.colorModes.light.text).not.toBe(preset.colorModes.dark.text);

        // Dead-code cleanup: no preview property
        expect((preset as any).preview).toBeUndefined();
      }
    });
  });
});
