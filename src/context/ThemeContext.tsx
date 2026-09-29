import React, { createContext, useContext } from 'react';
import { ThemeKey } from '../types';
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

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'brutalism',
    name: 'Brutalism Edukatif',
    category: 'light',
    tagline: 'Papan tulis taktil digital dengan borders tegas & typography besar.',
    description: 'Kanvas putih bersih (#FFFFFF), borders hitam tebal 4px, aksen kuning (#FFE500) kontras tinggi, tanpa rounded corners. Desain inspirasi brutalisme arsitektur untuk kejelasan informasi mutlak.',
    accentColor: '#FFE500',
    accentHex: '#FFE500',
    buttonText: '#000000',
    cardBg: '#FFFFFF',
    appBg: '#FFFFFF',
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    badgeBorder: 'border-yellow-200 dark:border-yellow-800',
    badgeText: 'text-yellow-700 dark:text-yellow-300',
    previewBg: 'bg-white',
    previewCard: 'bg-white border-black border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    previewAccent: 'bg-[#FFE500]',
    swatches: ['#FFFFFF', '#000000', '#FFE500', '#4A4A4A'],
  },
  {
    id: 'apple-glass',
    name: 'Apple VisionOS Glass',
    category: 'light',
    tagline: 'Spatial computing dengan frosted glass, subtle depth, & micro-interactions.',
    description: 'Kanvas putih murni, kartu glassmorphism (rgba(255,255,255,0.9) + backdrop-blur-24px), aksen iOS Blue (#007AFF), rounded-20px everywhere. Desain visionOS untuk kedalaman visual & kesan floating.',
    accentColor: '#007AFF',
    accentHex: '#007AFF',
    buttonText: '#FFFFFF',
    cardBg: 'rgba(255,255,255,0.9)',
    appBg: '#FFFFFF',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300',
    previewBg: 'bg-white',
    previewCard: 'bg-white/95 backdrop-blur-xl border-slate-200/80 rounded-2xl shadow-lg',
    previewAccent: 'bg-[#007AFF]',
    swatches: ['#FFFFFF', '#007AFF', '#0F172A', '#64748B'],
  },
  {
    id: 'neo-skeuomorphic',
    name: 'Neo-Skeuomorphic Academic',
    category: 'light',
    tagline: 'Digital buku induk dengan textures, embossed elements, & tactile depth.',
    description: 'Kertas hangat (#FAF9F6) seperti naskah usang, kartu putih bersih dengan inner-shadow emboss, aksen Emerald 700 (#047857) khas administrasi akademik. Desain neo-skeuomorfik modern untuk familiaritas guru.',
    accentColor: '#047857',
    accentHex: '#047857',
    buttonText: '#FFFFFF',
    cardBg: '#FFFFFF',
    appBg: '#FAF9F6',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    previewBg: 'bg-[#FAF9F6]',
    previewCard: 'bg-white border-stone-200 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] rounded-xl',
    previewAccent: 'bg-[#047857]',
    swatches: ['#FAF9F6', '#FFFFFF', '#047857', '#1C1917'],
  },
];

interface ThemeContextType {
  activeTheme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  applyAndSaveTheme: (theme: ThemeKey) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider — shim over DesignSystemContext (single source of truth)
 * No local state, no second localStorage write, no second DOM attribute write.
 * DesignSystemContext owns: data-design-system, --ds-* vars, persistence.
 * This provider just aliases DesignSystemKey <-> ThemeKey (same 3 literals).
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ds = useDesignSystem();

  const value: ThemeContextType = {
    activeTheme: ds.activeSystem as unknown as ThemeKey,
    setTheme: (t: ThemeKey) => ds.setSystem(t as unknown as any),
    applyAndSaveTheme: (t: ThemeKey) => ds.applyAndSaveSystem(t as unknown as any),
    isDark: false, // all 3 systems are light now
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
