import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { container } from '../application/ports/container';
import { DesignSystemKey, DesignSystemTokens, DESIGN_SYSTEMS } from '../types';

interface DesignSystemContextType {
  activeSystem: DesignSystemKey;
  tokens: DesignSystemTokens;
  setSystem: (system: DesignSystemKey) => void;
  applyAndSaveSystem: (system: DesignSystemKey) => void;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

export const DesignSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  
  // Default to neo-skeuomorphic (most academic-appropriate)
  const [activeSystem, setActiveSystem] = useState<DesignSystemKey>('neo-skeuomorphic');

  // Synchronize design system based on authenticated user preference
  useEffect(() => {
    if (!user) {
      // Not logged in -> use default
      setActiveSystem('neo-skeuomorphic');
      return;
    }

    // Logged in: resolve user design system preference
    // 1. New designSystemPreference from Firestore
    if (profile?.designSystemPreference && isValidDesignSystem(profile.designSystemPreference)) {
      setActiveSystem(profile.designSystemPreference);
      return;
    }

    // 2. Backward compat: map old themePreference to new design system
    if (profile?.themePreference) {
      const mappedSystem = mapLegacyThemeToDesignSystem(profile.themePreference);
      setActiveSystem(mappedSystem);
      return;
    }

    // 3. Local storage preference tied to this user's UID
    try {
      const userSaved = localStorage.getItem(`app_design_system_${user.uid}`) as DesignSystemKey;
      if (userSaved && isValidDesignSystem(userSaved)) {
        setActiveSystem(userSaved);
        return;
      }
    } catch {}

    // Default to neo-skeuomorphic
    setActiveSystem('neo-skeuomorphic');
  }, [user, profile?.themePreference, profile?.designSystemPreference]);

  const currentDesignSystem = DESIGN_SYSTEMS.find(ds => ds.id === activeSystem);
  const tokens = currentDesignSystem?.tokens || DESIGN_SYSTEMS[2].tokens; // Fallback to neo-skeuomorphic

  // Inject CSS variables to :root
  useEffect(() => {
    const root = document.documentElement;
    
    // Set data-design-system attribute
    root.setAttribute('data-design-system', activeSystem);
    
    // Inject color tokens
    root.style.setProperty('--ds-accent', tokens.colors.accent);
    root.style.setProperty('--ds-accent-fg', tokens.colors.accentFg);
    root.style.setProperty('--ds-surface', tokens.colors.surface);
    root.style.setProperty('--ds-surface-elevated', tokens.colors.surfaceElevated);
    root.style.setProperty('--ds-border', tokens.colors.border);
    root.style.setProperty('--ds-text', tokens.colors.text);
    root.style.setProperty('--ds-text-muted', tokens.colors.textMuted);
    
    // Inject spacing tokens
    root.style.setProperty('--ds-spacing-xs', `${tokens.spacing.xs}px`);
    root.style.setProperty('--ds-spacing-sm', `${tokens.spacing.sm}px`);
    root.style.setProperty('--ds-spacing-md', `${tokens.spacing.md}px`);
    root.style.setProperty('--ds-spacing-lg', `${tokens.spacing.lg}px`);
    root.style.setProperty('--ds-spacing-xl', `${tokens.spacing.xl}px`);
    
    // Inject border tokens
    root.style.setProperty('--ds-border-width', tokens.borders.width);
    root.style.setProperty('--ds-border-color', tokens.borders.color);
    
    // Inject elevation tokens
    root.style.setProperty('--ds-elevation-none', tokens.elevation.none);
    root.style.setProperty('--ds-elevation-sm', tokens.elevation.sm);
    root.style.setProperty('--ds-elevation-md', tokens.elevation.md);
    root.style.setProperty('--ds-elevation-lg', tokens.elevation.lg);
    
    // Inject radius tokens
    root.style.setProperty('--ds-radius-none', tokens.radius.none);
    root.style.setProperty('--ds-radius-sm', tokens.radius.sm);
    root.style.setProperty('--ds-radius-md', tokens.radius.md);
    root.style.setProperty('--ds-radius-lg', tokens.radius.lg);
    root.style.setProperty('--ds-radius-full', tokens.radius.full);
    
    // Inject transition tokens
    root.style.setProperty('--ds-transition-fast', tokens.transitions.fast);
    root.style.setProperty('--ds-transition-base', tokens.transitions.base);
    root.style.setProperty('--ds-transition-slow', tokens.transitions.slow);
    
    // Inject typography tokens
    root.style.setProperty('--ds-font-sans', tokens.typography.fontFamily.sans);
    root.style.setProperty('--ds-font-mono', tokens.typography.fontFamily.mono);
    if (tokens.typography.fontFamily.serif) {
      root.style.setProperty('--ds-font-serif', tokens.typography.fontFamily.serif);
    }
    
    // Map design system colors to existing theme variables for backward compat
    root.style.setProperty('--accent-primary', tokens.colors.accent);
    root.style.setProperty('--accent-primary-text', tokens.colors.accentFg);
    root.style.setProperty('--app-bg', tokens.colors.surface);
    root.style.setProperty('--card-bg', tokens.colors.surfaceElevated);
    root.style.setProperty('--card-border', tokens.colors.border);
    root.style.setProperty('--text-main', tokens.colors.text);
    root.style.setProperty('--text-muted', tokens.colors.textMuted);
  }, [activeSystem, tokens]);

  const applyAndSaveSystem = (system: DesignSystemKey) => {
    setActiveSystem(system);
    if (user) {
      try {
        localStorage.setItem(`app_design_system_${user.uid}`, system);
      } catch {}
      // Persist to user Firestore profile via container
      container.repos.user.updateDesignSystem(user.uid, system);
    }
  };

  return (
    <DesignSystemContext.Provider 
      value={{ 
        activeSystem, 
        tokens,
        setSystem: setActiveSystem, 
        applyAndSaveSystem,
      }}
    >
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

// Helper: Validate design system key
function isValidDesignSystem(key: string): key is DesignSystemKey {
  return ['brutalism', 'apple-glass', 'neo-skeuomorphic'].includes(key);
}

// Helper: Map legacy theme to new design system
function mapLegacyThemeToDesignSystem(theme: string): DesignSystemKey {
  const mapping: Record<string, DesignSystemKey> = {
    'light': 'neo-skeuomorphic',
    'dark-crimson': 'apple-glass',
    'obsidian-tactile': 'apple-glass',
    'swiss-manuscript': 'neo-skeuomorphic',
    'solarized-comfort': 'apple-glass',
    'chalkboard-school': 'brutalism',
  };
  return mapping[theme] || 'neo-skeuomorphic';
}
