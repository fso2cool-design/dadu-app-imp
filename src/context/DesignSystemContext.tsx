import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useApplication } from '../application/ApplicationContext';
import { DesignSystemKey, DesignSystemMode, DesignSystemTokens, DESIGN_SYSTEMS } from '../types';

interface DesignSystemContextType {
  activePreset: DesignSystemKey;
  tokens: DesignSystemTokens;
  mode: DesignSystemMode;
  setPreset: (preset: DesignSystemKey) => void;
  applyAndSavePreset: (preset: DesignSystemKey) => void;
  setMode: (mode: DesignSystemMode) => void;
  toggleMode: () => void;
  applyAndSaveMode: (mode: DesignSystemMode) => void;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

const DEFAULT_SYSTEM: DesignSystemKey = 'shadcn-ui';

export const DesignSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const app = useApplication();

  const [activePreset, setActivePreset] = useState<DesignSystemKey>(DEFAULT_SYSTEM);
  const [mode, setModeState] = useState<DesignSystemMode>('light');

  // Synchronize design system preset + mode based on authenticated user preference
  useEffect(() => {
    if (!user) {
      setActivePreset(DEFAULT_SYSTEM);
      setModeState('light');
      return;
    }

    // 1. New designSystemPreference from Firestore (with legacy id mapping)
    if (profile?.designSystemPreference) {
      const resolved = resolveDesignSystem(profile.designSystemPreference);
      if (resolved) {
        setActivePreset(resolved);
      }
    } else if (profile?.themePreference) {
      // 2. Backward compat: map old themePreference to new design system
      setActivePreset(mapLegacyThemeToDesignSystem(profile.themePreference));
    } else {
      // 3. Local storage preference tied to this user's UID
      try {
        const userSaved = localStorage.getItem(`app_design_system_${user.uid}`);
        const resolved = userSaved ? resolveDesignSystem(userSaved) : null;
        setActivePreset(resolved ?? DEFAULT_SYSTEM);
      } catch {
        setActivePreset(DEFAULT_SYSTEM);
      }
    }

    // Mode: Firestore profile field first, then per-uid localStorage, fallback 'light'
    if (profile?.designSystemModePreference === 'light' || profile?.designSystemModePreference === 'dark') {
      setModeState(profile.designSystemModePreference);
    } else {
      try {
        const savedMode = localStorage.getItem(`app_design_system_mode_${user.uid}`);
        setModeState(savedMode === 'dark' ? 'dark' : 'light');
      } catch {
        setModeState('light');
      }
    }
  }, [user, profile?.themePreference, profile?.designSystemPreference, profile?.designSystemModePreference]);

  const baseTokens =
    DESIGN_SYSTEMS.find((ds) => ds.id === activePreset)?.tokens ?? DESIGN_SYSTEMS[1].tokens;
  const activeColors = mode === 'dark' ? baseTokens.darkColors : baseTokens.colors;
  // tokens.colors always reflects the active mode palette (backward compat for
  // consumers reading tokens.colors); full light+dark pair stays available.
  const tokens: DesignSystemTokens = { ...baseTokens, colors: activeColors };

  // Inject CSS variables to :root
  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-design-system', activePreset);
    root.classList.toggle('dark', mode === 'dark');

    root.style.setProperty('--ds-accent', activeColors.accent);
    root.style.setProperty('--ds-accent-fg', activeColors.accentFg);
    root.style.setProperty('--ds-surface', activeColors.surface);
    root.style.setProperty('--ds-surface-elevated', activeColors.surfaceElevated);
    root.style.setProperty('--ds-border', activeColors.border);
    root.style.setProperty('--ds-text', activeColors.text);
    root.style.setProperty('--ds-text-muted', activeColors.textMuted);
    root.style.setProperty('--ds-focus', activeColors.focus);
    root.style.setProperty('--ds-input', activeColors.input);
    root.style.setProperty('--ds-accent-hover', activeColors.accentHover);
    root.style.setProperty('--ds-accent-soft', activeColors.accentSoft);
    root.style.setProperty('--ds-surface-muted', activeColors.surfaceMuted);
    root.style.setProperty('--ds-success-bg', activeColors.successBg);
    root.style.setProperty('--ds-success-fg', activeColors.successFg);
    root.style.setProperty('--ds-warning-bg', activeColors.warningBg);
    root.style.setProperty('--ds-warning-fg', activeColors.warningFg);
    root.style.setProperty('--ds-danger-bg', activeColors.dangerBg);
    root.style.setProperty('--ds-danger-fg', activeColors.dangerFg);
    root.style.setProperty('--ds-info-bg', activeColors.infoBg);
    root.style.setProperty('--ds-info-fg', activeColors.infoFg);

    root.style.setProperty('--ds-spacing-xs', `${tokens.spacing.xs}px`);
    root.style.setProperty('--ds-spacing-sm', `${tokens.spacing.sm}px`);
    root.style.setProperty('--ds-spacing-md', `${tokens.spacing.md}px`);
    root.style.setProperty('--ds-spacing-lg', `${tokens.spacing.lg}px`);
    root.style.setProperty('--ds-spacing-xl', `${tokens.spacing.xl}px`);

    root.style.setProperty('--ds-border-width', tokens.borders.width);
    root.style.setProperty('--ds-border-color', tokens.borders.color);
    root.style.setProperty('--ds-border-style', tokens.borders.style);

    root.style.setProperty('--ds-font-scale-xs', tokens.typography.scale.xs);
    root.style.setProperty('--ds-font-scale-sm', tokens.typography.scale.sm);
    root.style.setProperty('--ds-font-scale-base', tokens.typography.scale.base);
    root.style.setProperty('--ds-font-scale-lg', tokens.typography.scale.lg);
    root.style.setProperty('--ds-font-scale-xl', tokens.typography.scale.xl);

    root.style.setProperty('--ds-elevation-none', tokens.elevation.none);
    root.style.setProperty('--ds-elevation-sm', tokens.elevation.sm);
    root.style.setProperty('--ds-elevation-md', tokens.elevation.md);
    root.style.setProperty('--ds-elevation-lg', tokens.elevation.lg);

    root.style.setProperty('--ds-radius-none', tokens.radius.none);
    root.style.setProperty('--ds-radius-sm', tokens.radius.sm);
    root.style.setProperty('--ds-radius-md', tokens.radius.md);
    root.style.setProperty('--ds-radius-lg', tokens.radius.lg);
    root.style.setProperty('--ds-radius-full', tokens.radius.full);

    root.style.setProperty('--ds-transition-fast', tokens.transitions.fast);
    root.style.setProperty('--ds-transition-base', tokens.transitions.base);
    root.style.setProperty('--ds-transition-slow', tokens.transitions.slow);

    root.style.setProperty('--ds-font-sans', tokens.typography.fontFamily.sans);
    root.style.setProperty('--ds-font-mono', tokens.typography.fontFamily.mono);
    if (tokens.typography.fontFamily.serif) {
      root.style.setProperty('--ds-font-serif', tokens.typography.fontFamily.serif);
    } else {
      root.style.removeProperty('--ds-font-serif');
    }

    // Map design system colors to existing theme variables for backward compat
    root.style.setProperty('--accent-primary', activeColors.accent);
    root.style.setProperty('--accent-primary-text', activeColors.accentFg);
    root.style.setProperty('--app-bg', activeColors.surface);
    root.style.setProperty('--card-bg', activeColors.surfaceElevated);
    root.style.setProperty('--card-border', activeColors.border);
    root.style.setProperty('--text-main', activeColors.text);
    root.style.setProperty('--text-muted', activeColors.textMuted);
  }, [activePreset, mode, tokens, activeColors]);

  const applyAndSavePreset = useCallback((preset: DesignSystemKey) => {
    setActivePreset(preset);
    if (user) {
      try {
        localStorage.setItem(`app_design_system_${user.uid}`, preset);
      } catch {}
      app.appearance.updateDesignSystem(user.uid, preset);
    }
  }, [user, app]);

  const persistMode = useCallback(
    (next: DesignSystemMode) => {
      setModeState(next);
      if (user) {
        try {
          localStorage.setItem(`app_design_system_mode_${user.uid}`, next);
        } catch {}
        app.appearance.updateModePreference(user.uid, next);
      }
    },
    [user, app],
  );

  const setMode = useCallback((next: DesignSystemMode) => {
    persistMode(next);
  }, [persistMode]);

  const toggleMode = useCallback(() => {
    persistMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, persistMode]);

  const applyAndSaveMode = useCallback((next: DesignSystemMode) => {
    persistMode(next);
  }, [persistMode]);

  const contextValue = React.useMemo(() => ({
    activePreset,
    tokens,
    mode,
    setPreset: setActivePreset,
    applyAndSavePreset,
    setMode,
    toggleMode,
    applyAndSaveMode,
  }), [activePreset, tokens, mode, applyAndSavePreset, setMode, toggleMode, applyAndSaveMode]);

  return (
    <DesignSystemContext.Provider value={contextValue}>
      {children}
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = (): DesignSystemContextType => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};

export const useOptionalDesignSystem = (): DesignSystemContextType | null => {
  return useContext(DesignSystemContext) || null;
};

// Helper: Validate design system key (active ids only)
export function isValidDesignSystem(key: string): key is DesignSystemKey {
  return (['paper-craft', 'neo-brutalism', 'shadcn-ui'] as string[]).includes(key);
}

export const LEGACY_PRESET_MAPPINGS: Record<string, DesignSystemKey> = {
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

// Helper: Resolve stored value — active id or legacy id mapping; null if unknown
export function resolveDesignSystem(key: string): DesignSystemKey | null {
  if (isValidDesignSystem(key)) return key;
  return LEGACY_PRESET_MAPPINGS[key] ?? null;
}

// Helper: Map legacy theme to active design system preset
export function mapLegacyThemeToDesignSystem(theme: string): DesignSystemKey {
  return resolveDesignSystem(theme) ?? DEFAULT_SYSTEM;
}
