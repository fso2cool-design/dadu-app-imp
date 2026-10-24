import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useApplication } from '../application/ApplicationContext';
import {
  AppearancePresetKey,
  ColorMode,
  DesignColorTokens,
  InvariantTokens,
  APPEARANCE_PRESETS,
} from '../design-system/tokens';
import {
  DEFAULT_APPEARANCE_PRESET,
  resolveAppearancePreset,
  mapLegacyThemeToAppearancePreset,
} from './legacyMappings';
import { applyAppearanceToDom } from './appearanceDom';

export interface AppearanceContextType {
  activePreset: AppearancePresetKey;
  tokens: InvariantTokens;
  colors: DesignColorTokens;
  mode: ColorMode;
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setPreset: (preset: AppearancePresetKey) => void;
  applyAndSavePreset: (preset: AppearancePresetKey) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  applyAndSaveMode: (mode: ColorMode) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const app = useApplication();

  const [activePreset, setActivePreset] = useState<AppearancePresetKey>(DEFAULT_APPEARANCE_PRESET);
  const [mode, setModeState] = useState<ColorMode>('light');
  const [animationsEnabled, setAnimationsEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app_animations_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Synchronize appearance preset + mode based on authenticated user preference
  useEffect(() => {
    if (!user) {
      setActivePreset(DEFAULT_APPEARANCE_PRESET);
      setModeState('light');
      return;
    }

    // 1. New designSystemPreference from Firestore profile (with legacy id mapping)
    if (profile?.designSystemPreference) {
      const resolved = resolveAppearancePreset(profile.designSystemPreference);
      if (resolved) {
        setActivePreset(resolved);
      }
    } else if (profile?.themePreference) {
      // 2. Backward compat: map old themePreference to active appearance preset
      setActivePreset(mapLegacyThemeToAppearancePreset(profile.themePreference));
    } else {
      // 3. Local storage preference tied to this user's UID
      try {
        const userSaved = localStorage.getItem(`app_design_system_${user.uid}`);
        const resolved = userSaved ? resolveAppearancePreset(userSaved) : null;
        setActivePreset(resolved ?? DEFAULT_APPEARANCE_PRESET);
      } catch {
        setActivePreset(DEFAULT_APPEARANCE_PRESET);
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

  const setAnimationsEnabled = useCallback((enabled: boolean) => {
    setAnimationsEnabledState(enabled);
    try {
      localStorage.setItem('app_animations_enabled', String(enabled));
    } catch {}
  }, []);

  const toggleAnimations = useCallback(() => {
    setAnimationsEnabledState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app_animations_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  const basePreset =
    APPEARANCE_PRESETS.find((ds) => ds.id === activePreset) ?? APPEARANCE_PRESETS[1];
  const tokens: InvariantTokens = basePreset.tokens;
  const activeColors: DesignColorTokens =
    mode === 'dark' ? basePreset.colorModes.dark : basePreset.colorModes.light;

  // Inject CSS variables to document.documentElement
  useEffect(() => {
    applyAppearanceToDom(document.documentElement, {
      preset: activePreset,
      mode,
      tokens,
      colors: activeColors,
    });
  }, [activePreset, mode, tokens, activeColors]);

  const applyAndSavePreset = useCallback((preset: AppearancePresetKey) => {
    setActivePreset(preset);
    if (user) {
      try {
        localStorage.setItem(`app_design_system_${user.uid}`, preset);
      } catch {}
      app.appearance.updateAppearancePresetPreference(user.uid, preset);
    }
  }, [user, app]);

  const persistMode = useCallback(
    (next: ColorMode) => {
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

  const setMode = useCallback((next: ColorMode) => {
    persistMode(next);
  }, [persistMode]);

  const toggleMode = useCallback(() => {
    persistMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, persistMode]);

  const applyAndSaveMode = useCallback((next: ColorMode) => {
    persistMode(next);
  }, [persistMode]);

  const contextValue = useMemo(() => ({
    activePreset,
    tokens,
    colors: activeColors,
    mode,
    animationsEnabled,
    toggleAnimations,
    setAnimationsEnabled,
    setPreset: setActivePreset,
    applyAndSavePreset,
    setMode,
    toggleMode,
    applyAndSaveMode,
  }), [
    activePreset,
    tokens,
    activeColors,
    mode,
    animationsEnabled,
    toggleAnimations,
    setAnimationsEnabled,
    applyAndSavePreset,
    setMode,
    toggleMode,
    applyAndSaveMode,
  ]);

  return (
    <AppearanceContext.Provider value={contextValue}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = (): AppearanceContextType => {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};

export const useOptionalAppearance = (): AppearanceContextType | undefined => {
  return useContext(AppearanceContext);
};
