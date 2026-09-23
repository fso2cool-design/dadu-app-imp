import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { updateUserThemePreference } from '../services/firestore/users';

export type ThemeKey = 'light' | 'dark-crimson';

export interface ThemeOption {
  id: ThemeKey;
  name: string;
  category: 'light' | 'dark';
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
  isNeon?: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Mode Terang (Citrus Lime & Orange Fresh)',
    category: 'light',
    description: 'Kanvas putih bersih hangat dengan aksen oranye energik dan sentuhan segar lime green pada status & tuntas.',
    accentColor: '#f97316',
    badgeBg: 'bg-orange-50',
    badgeBorder: 'border-orange-200',
    previewBg: 'bg-[#F8FAFC]',
    previewCard: 'bg-white border-slate-200 shadow-xs',
    previewAccent: 'bg-orange-500',
  },
  {
    id: 'dark-crimson',
    name: 'Mode Gelap (Tron Cyber Grid & Luminescent)',
    category: 'dark',
    description: 'Obsidian cyber dark (#0C0E15) ergonomis dengan garis grid sirkuit Tron halus dan aksen pendaran luminesens presisi.',
    accentColor: '#00e5ff',
    badgeBg: 'bg-cyan-950/60',
    badgeBorder: 'border-cyan-500/50',
    previewBg: 'bg-[#0C0E15]',
    previewCard: 'bg-[#141722] border-cyan-500/30 shadow-xs shadow-cyan-500/20',
    previewAccent: 'bg-cyan-400 shadow-[0_0_14px_rgba(0,229,255,0.8)]',
    isNeon: true,
  },
];

interface ThemeContextType {
  activeTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  applyAndSaveTheme: (theme: ThemeKey) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  
  // Default is strictly 'light' for unauthenticated/guest users
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('light');

  // Synchronize theme based on authenticated user preference
  useEffect(() => {
    if (!user) {
      // Not logged in -> always use global default light theme
      setActiveTheme('light');
      return;
    }

    // Logged in: resolve user theme preference
    // 1. Profile preference from Firestore
    if (profile?.themePreference === 'dark-crimson' || profile?.themePreference === 'light') {
      setActiveTheme(profile.themePreference);
      return;
    }

    // 2. Local storage preference tied to this user's UID
    try {
      const userSaved = localStorage.getItem(`app_theme_${user.uid}`);
      if (userSaved === 'dark-crimson' || userSaved === 'light') {
        setActiveTheme(userSaved);
        return;
      }
    } catch {}

    // Default to 'light' if no preference saved
    setActiveTheme('light');
  }, [user, profile?.themePreference]);

  const isDark = activeTheme === 'dark-crimson';

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', activeTheme);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [activeTheme, isDark]);

  const applyAndSaveTheme = (theme: ThemeKey) => {
    setActiveTheme(theme);
    if (user) {
      try {
        localStorage.setItem(`app_theme_${user.uid}`, theme);
      } catch {}
      // Persist to user Firestore profile so it stays synced across devices/sessions
      updateUserThemePreference(user.uid, theme);
    }
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        activeTheme, 
        setTheme: setActiveTheme, 
        applyAndSaveTheme, 
        isDark 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
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
