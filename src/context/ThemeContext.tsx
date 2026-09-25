import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { updateUserThemePreference } from '../services/firestore/users';
import { ThemeKey } from '../types';

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

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Atelier Zamrud (Resmi)',
    category: 'light',
    tagline: 'Wibawa resmi madrasah dengan kanvas porselen bersih & aksen hijau zamrud taktil.',
    description: 'Kanvas porselen Slate-50 (#F8FAFC) yang sejuk, kartu putih murni bergaris mikro, dan aksen Emerald 700 (#047857) berwibawa terkalibrasi WCAG AA.',
    accentColor: '#047857',
    accentHex: '#047857',
    buttonText: '#ffffff',
    cardBg: '#ffffff',
    appBg: '#f8fafc',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    previewBg: 'bg-[#F8FAFC]',
    previewCard: 'bg-white border-slate-200/90 shadow-2xs',
    previewAccent: 'bg-[#047857]',
    swatches: ['#F8FAFC', '#FFFFFF', '#047857', '#0F172A'],
  },
  {
    id: 'dark-crimson',
    name: 'Obsidian Zamrud Taktil',
    category: 'dark',
    tagline: 'Fokus malam tanpa silau dengan elevasi kartu slate obsidian & pendar mint luminesens.',
    description: 'Obsidian slate pekat (#090D16) yang tenang di mata, permukaan kartu bertingkat (#111726), dan aksen mint luminesens lembut (#10B981). Bebas pendar neon berlebih.',
    accentColor: '#10b981',
    accentHex: '#10b981',
    buttonText: '#090d16',
    cardBg: '#111726',
    appBg: '#090d16',
    badgeBg: 'bg-emerald-950/50',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-300',
    previewBg: 'bg-[#090D16]',
    previewCard: 'bg-[#111726] border-slate-700/60 shadow-2xs',
    previewAccent: 'bg-emerald-500',
    swatches: ['#090D16', '#111726', '#10B981', '#F1F5F9'],
  },
  {
    id: 'swiss-manuscript',
    name: 'Manuskrip Kertas & Emas',
    category: 'light',
    tagline: 'Kehangatan lembaran arsip ijazah dengan aksen stempel emas kuno & hijau kaligrafi.',
    description: 'Kanvas serat kertas katun (#FAF9F6), batas batu hangat (#E7E5E4), dan sentuhan stempel emas kuno (#B45309) berpadu hijau madrasah klasik (#1B4D3E).',
    accentColor: '#b45309',
    accentHex: '#b45309',
    buttonText: '#ffffff',
    cardBg: '#ffffff',
    appBg: '#faf9f6',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
    previewBg: 'bg-[#FAF9F6]',
    previewCard: 'bg-white border-amber-900/10 shadow-2xs',
    previewAccent: 'bg-amber-600',
    swatches: ['#FAF9F6', '#FFFFFF', '#B45309', '#1C1917'],
  },
  {
    id: 'solarized-comfort',
    name: 'Solaris Ramah Mata',
    category: 'dark',
    tagline: 'Kenyamanan optometri mutlak untuk guru lembur malam. Nol radiasi biru menusuk.',
    description: 'Kanvas deep teal malam (#071A21), teks pasir lembut (#93A1A1), dan aksen celadon teduh (#2AA198). Terkalibrasi secara ilmiah untuk meredam kelelahan retina.',
    accentColor: '#2aa198',
    accentHex: '#2aa198',
    buttonText: '#071a21',
    cardBg: '#0c242d',
    appBg: '#071a21',
    badgeBg: 'bg-teal-950/60',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-300',
    previewBg: 'bg-[#071A21]',
    previewCard: 'bg-[#0C242D] border-teal-800/50 shadow-2xs',
    previewAccent: 'bg-teal-500',
    swatches: ['#071A21', '#0C242D', '#2AA198', '#93A1A1'],
  },
  {
    id: 'chalkboard-school',
    name: 'Batu Sabak Madrasah',
    category: 'dark',
    tagline: 'Sentuhan nostalgia ruang kelas dengan kanvas papan tulis batu & goresan kapur halus.',
    description: 'Kanvas batu sabak hijau tua gelap (#0E1713), permukaan papan tulis (#15221C), teks kapur putih gading (#E6ECE8), dan aksen kapur emas muda (#F59E0B).',
    accentColor: '#f59e0b',
    accentHex: '#f59e0b',
    buttonText: '#0e1713',
    cardBg: '#15221c',
    appBg: '#0e1713',
    badgeBg: 'bg-amber-950/40',
    badgeBorder: 'border-amber-400/30',
    badgeText: 'text-amber-200',
    previewBg: 'bg-[#0E1713]',
    previewCard: 'bg-[#15221C] border-emerald-900/50 shadow-2xs',
    previewAccent: 'bg-amber-500',
    swatches: ['#0E1713', '#15221C', '#F59E0B', '#E6ECE8'],
  },
];

const VALID_THEME_KEYS: ThemeKey[] = [
  'light',
  'dark-crimson',
  'obsidian-tactile',
  'swiss-manuscript',
  'solarized-comfort',
  'chalkboard-school',
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
    if (profile?.themePreference && VALID_THEME_KEYS.includes(profile.themePreference)) {
      setActiveTheme(profile.themePreference);
      return;
    }

    // 2. Local storage preference tied to this user's UID
    try {
      const userSaved = localStorage.getItem(`app_theme_${user.uid}`) as ThemeKey;
      if (userSaved && VALID_THEME_KEYS.includes(userSaved)) {
        setActiveTheme(userSaved);
        return;
      }
    } catch {}

    // Default to 'light' if no preference saved
    setActiveTheme('light');
  }, [user, profile?.themePreference]);

  const selectedThemeOption = THEME_OPTIONS.find(t => t.id === activeTheme);
  const isDark = selectedThemeOption 
    ? selectedThemeOption.category === 'dark' 
    : (activeTheme === 'dark-crimson' || activeTheme === 'obsidian-tactile' || activeTheme === 'solarized-comfort' || activeTheme === 'chalkboard-school');

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
