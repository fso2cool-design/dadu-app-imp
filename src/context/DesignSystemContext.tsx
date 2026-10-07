import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useApplication } from '../application/ApplicationContext';
import { DesignSystemKey, DesignSystemMode, DesignSystemTokens, DESIGN_SYSTEMS } from '../types';

interface DesignSystemContextType {
  activeSystem: DesignSystemKey;
  tokens: DesignSystemTokens;
  mode: DesignSystemMode;
  setSystem: (system: DesignSystemKey) => void;
  applyAndSaveSystem: (system: DesignSystemKey) => void;
  setMode: (mode: DesignSystemMode) => void;
  toggleMode: () => void;
  applyAndSaveMode: (mode: DesignSystemMode) => void;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

const DEFAULT_SYSTEM: DesignSystemKey = 'shadcn-ui';

export const DesignSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const app = useApplication();

  const [activeSystem, setActiveSystem] = useState<DesignSystemKey>(DEFAULT_SYSTEM);
  const [mode, setModeState] = useState<DesignSystemMode>('light');

  // Synchronize design system + mode based on authenticated user preference
  useEffect(() => {
    if (!user) {
      setActiveSystem(DEFAULT_SYSTEM);
      setModeState('light');
      return;
    }

    // 1. New designSystemPreference from Firestore (with legacy id mapping)
    if (profile?.designSystemPreference) {
      const resolved = resolveDesignSystem(profile.designSystemPreference);
      if (resolved) {
        setActiveSystem(resolved);
      }
    } else if (profile?.themePreference) {
      // 2. Backward compat: map old themePreference to new design system
      setActiveSystem(mapLegacyThemeToDesignSystem(profile.themePreference));
    } else {
      // 3. Local storage preference tied to this user's UID
      try {
        const userSaved = localStorage.getItem(`app_design_system_${user.uid}`);
        const resolved = userSaved ? resolveDesignSystem(userSaved) : null;
        setActiveSystem(resolved ?? DEFAULT_SYSTEM);
      } catch {
        setActiveSystem(DEFAULT_SYSTEM);
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
    DESIGN_SYSTEMS.find((ds) => ds.id === activeSystem)?.tokens ?? DESIGN_SYSTEMS[1].tokens;
  const activeColors = mode === 'dark' ? baseTokens.darkColors : baseTokens.colors;
  // tokens.colors always reflects the active mode palette (backward compat for
  // consumers reading tokens.colors); full light+dark pair stays available.
  const tokens: DesignSystemTokens = { ...baseTokens, colors: activeColors };

  // Inject CSS variables to :root
  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-design-system', activeSystem);
    root.setAttribute('data-theme', activeSystem);
    root.setAttribute('data-mode', mode);
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
  }, [activeSystem, mode, tokens, activeColors]);

  const applyAndSaveSystem = useCallback((system: DesignSystemKey) => {
    setActiveSystem(system);
    if (user) {
      try {
        localStorage.setItem(`app_design_system_${user.uid}`, system);
      } catch {}
      app.theme.updateDesignSystem(user.uid, system);
    }
  }, [user, app]);

  const persistMode = useCallback(
    (next: DesignSystemMode) => {
      setModeState(next);
      if (user) {
        try {
          localStorage.setItem(`app_design_system_mode_${user.uid}`, next);
        } catch {}
        app.theme.updateModePreference(user.uid, next);
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
    activeSystem,
    tokens,
    mode,
    setSystem: setActiveSystem,
    applyAndSaveSystem,
    setMode,
    toggleMode,
    applyAndSaveMode,
  }), [activeSystem, tokens, mode, applyAndSaveSystem, setMode, toggleMode, applyAndSaveMode]);

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

// Helper: Validate design system key (new ids only)
export function isValidDesignSystem(key: string): key is DesignSystemKey {
  return (['paper-craft', 'neo-brutalism', 'shadcn-ui'] as string[]).includes(key);
}

// Helper: Resolve stored value — new id or legacy id mapping; null if unknown
export function resolveDesignSystem(key: string): DesignSystemKey | null {
  if (isValidDesignSystem(key)) return key;
  const legacy: Record<string, DesignSystemKey> = {
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
  return legacy[key] ?? null;
}

// Helper: Map legacy theme to new design system
export function mapLegacyThemeToDesignSystem(theme: string): DesignSystemKey {
  const resolved = resolveDesignSystem(theme);
  if (resolved) return resolved;
  const mapping: Record<string, DesignSystemKey> = {
    'atelier': 'neo-brutalism',
    'minimalist': 'shadcn-ui',
    'light': 'shadcn-ui',
    'dark-crimson': 'neo-brutalism',
    'obsidian-tactile': 'neo-brutalism',
    'swiss-manuscript': 'shadcn-ui',
    'solarized-comfort': 'neo-brutalism',
    'chalkboard-school': 'paper-craft',
  };
  return mapping[theme] || 'shadcn-ui';
}
