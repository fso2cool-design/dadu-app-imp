import React, { createContext, useContext } from 'react';
import { ThemeKey, DESIGN_SYSTEMS, DesignSystemKey } from '../types';
import { useDesignSystem } from './DesignSystemContext';

export { type ThemeKey };

export interface ThemeOption {
  id: ThemeKey;
  name: string;
  category: 'light' | 'dark';
  tagline: string;
  description: string;
  accentColor: string;
  accentHex: string;
  buttonText: string;
  cardBg: string;
  appBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
  swatches: string[];
}

function toThemeOption(ds: typeof DESIGN_SYSTEMS[number]): ThemeOption {
  const c = ds.tokens.colors;
  const sw = ds.swatches ?? [c.surface, c.text, c.accent, c.textMuted] as string[];
  return {
    id: ds.id as unknown as ThemeKey,
    name: ds.name,
    category: 'light',
    tagline: ds.tagline,
    description: ds.description,
    accentColor: c.accent,
    accentHex: c.accent,
    buttonText: c.accentFg,
    cardBg: c.surfaceElevated,
    appBg: c.surface,
    badgeBg: 'bg-[var(--ds-surface-elevated)]',
    badgeBorder: 'border-[var(--ds-border)]',
    badgeText: 'text-[var(--ds-text-muted)]',
    previewBg: 'bg-[var(--ds-surface)]',
    previewCard: ds.preview.card,
    previewAccent: ds.preview.accent,
    swatches: [...sw] as string[],
  };
}

export const THEME_OPTIONS: ThemeOption[] = DESIGN_SYSTEMS.map(toThemeOption);

interface ThemeContextType {
  activeTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  applyAndSaveTheme: (theme: ThemeKey) => void;
  isDark: boolean;
  mode: 'light' | 'dark';
  toggleMode: () => void;
  applyAndSaveMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider - shim over DesignSystemContext (single source of truth)
 * No local state, no second localStorage write, no second DOM attribute write.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ds = useDesignSystem();

  const value: ThemeContextType = {
    activeTheme: ds.activeSystem as unknown as ThemeKey,
    setTheme: (t: ThemeKey) => ds.setSystem(t as unknown as DesignSystemKey),
    applyAndSaveTheme: (t: ThemeKey) => ds.applyAndSaveSystem(t as unknown as DesignSystemKey),
    isDark: ds.mode === 'dark',
    mode: ds.mode,
    toggleMode: ds.toggleMode,
    applyAndSaveMode: ds.applyAndSaveMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useOptionalAppTheme = (): ThemeContextType | null => {
  return useContext(ThemeContext) || null;
};

export const useAppTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
