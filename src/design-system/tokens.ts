// ==========================================================================
// APPEARANCE PRESETS & DESIGN TOKENS
// ==========================================================================

export type AppearancePresetKey =
  | 'paper-craft'
  | 'neo-brutalism'
  | 'shadcn-ui';

export type ColorMode = 'light' | 'dark';

export interface DesignColorTokens {
  accent: string;
  accentFg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  focus: string;
  input: string;
  accentHover: string;
  accentSoft: string;
  surfaceMuted: string;
  /** Status semantics. Each fg is verified >= 4.5:1 on its own bg. */
  successBg: string;
  successFg: string;
  warningBg: string;
  warningFg: string;
  dangerBg: string;
  dangerFg: string;
  infoBg: string;
  infoFg: string;
}

export interface InvariantTokens {
  typography: {
    fontFamily: {
      sans: string;
      serif?: string;
      mono: string;
    };
    scale: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
    };
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borders: {
    width: string;
    color: string;
    style: 'solid' | 'none';
  };
  elevation: {
    none: string;
    sm: string;
    md: string;
    lg: string;
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  transitions: {
    fast: string;
    base: string;
    slow: string;
  };
}

export interface AppearancePreset {
  id: AppearancePresetKey;
  name: string;
  description: string;
  tagline: string;
  swatches: [string, string, string, string];
  tokens: InvariantTokens;
  colorModes: {
    light: DesignColorTokens;
    dark: DesignColorTokens;
  };
}

// Contrast audit (WCAG AA, relative-luminance formula, computed 2026-10-01):
// paper-craft light: text #1C1917/bg #FAF7EE 16.33, muted #6B6259/bg 5.57,
//   ink #1C1917/accent #FF5A36 5.64 (white on #FF5A36 is 3.10 -> FAIL, never use).
//   NOTE: spec muted #78716C on #FAF7EE is 4.48 -> FAIL, darkened to #6B6259.
// paper-craft dark: text #FAF7EE/bg #1C1917 16.33, muted #A8A29E/bg 6.93,
//   card text #FAF7EE/#292524 14.16.
// shadcn-ui light: text #09090B/#FFFFFF 19.35, muted #52525B/bg 6.94,
//   accent-fg #FAFAFA/accent #18181B 16.97. All >= 4.5 (AAA).
// shadcn-ui dark: text #FAFAFA/bg #09090B 18.06, muted #A1A1AA/bg 7.55,
//   card text #FAFAFA/#18181B 15.69, accent-fg #18181B/accent #FAFAFA 16.97. All >= 4.5 (AAA).
// neo-brutalism light: text #000000/#FFFDF5 20.62, muted #52525B/bg 7.59,
//   ink #000000/accent #FFE500 16.46. All >= 4.5 (AAA).
// neo-brutalism dark: text #F4F4F5/#121212 17.04, muted #A1A1AA/bg 7.31,
//   card text #F4F4F5/#1E1E22 15.11, ink #000000/accent #FFE500 16.46. All >= 4.5 (AAA).
// Pastel note pairs (paper-craft sticky notes): red #9F2F2D/#FDEBEC 6.66,
//   blue #1F6C9F/#E1F3FE 4.98, green #346538/#EDF3EC 6.08,
//   yellow #956400/#FBF3DB 4.62. All >= 4.5.
// Status tokens (fg on own bg, computed 2026-10-03): paper-craft light 6.24-6.81,
//   dark 8.20-10.20; shadcn light 4.79-6.16, dark 9.22-11.12; neo-brutalism ink
//   on pastel blocks 11.06-16.37 (both modes). Neo dangerFg is #000 in dark mode:
//   never use it as bare text/stroke on dark surfaces - pair with dangerBg.

export const APPEARANCE_PRESETS: AppearancePreset[] = [
  {
    id: 'paper-craft',
    name: 'Paper Craft',
    description: 'Scrapbook hangat ala X-C Hub: border tinta, hard shadow, sticky notes',
    tagline: 'Kertas & tinta, bayangan tajam',
    swatches: ['#FAF7EE', '#1C1917', '#FF5A36', '#A8A29E'],
    tokens: {
      typography: {
        fontFamily: {
          sans: 'Geist, system-ui, sans-serif',
          mono: 'Geist Mono, monospace',
        },
        scale: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
      },
      spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 40,
        xl: 64,
      },
      borders: {
        width: '1.5px',
        color: '#292524',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '3px 3px 0px 0px #1C1917',
        md: '5px 5px 0px 0px #1C1917',
        lg: '8px 8px 0px 0px #1C1917',
      },
      radius: {
        none: '0px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      transitions: {
        fast: '100ms ease',
        base: '200ms ease',
        slow: '300ms ease',
      },
    },
    colorModes: {
      light: {
        accent: '#FF5A36',
        accentFg: '#1C1917',
        surface: '#FAF7EE',
        surfaceElevated: '#FFFDF9',
        border: '#292524',
        text: '#1C1917',
        textMuted: '#6B6259',
        focus: '#FF5A36',
        input: '#FFFDF9',
        accentHover: '#E84E2C',
        accentSoft: 'rgba(255,90,54,0.10)',
        surfaceMuted: '#F5F0E4',
        successBg: '#EDF3EC',
        successFg: '#2F5D33',
        warningBg: '#FBF3DB',
        warningFg: '#7A5200',
        dangerBg: '#FDEBEC',
        dangerFg: '#9F2F2D',
        infoBg: '#E1F3FE',
        infoFg: '#1A5A85',
      },
      dark: {
        accent: '#FF5A36',
        accentFg: '#1C1917',
        surface: '#1C1917',
        surfaceElevated: '#292524',
        border: '#FAF7EE',
        text: '#FAF7EE',
        textMuted: '#A8A29E',
        focus: '#FF5A36',
        input: '#292524',
        accentHover: '#FF7B5E',
        accentSoft: 'rgba(255,90,54,0.15)',
        surfaceMuted: '#292524',
        successBg: '#1E2E20',
        successFg: '#86EFAC',
        warningBg: '#33270F',
        warningFg: '#FCD34D',
        dangerBg: '#3B1A1A',
        dangerFg: '#FCA5A5',
        infoBg: '#132A3A',
        infoFg: '#7DD3FC',
      },
    },
  },
  {
    id: 'shadcn-ui',
    name: 'Shadcn UI',
    description: 'Modern neutral dashboard: crisp 1px borders, subtle zinc shadows, typography bersih dan terstruktur',
    tagline: 'Clean, modern, neutral-first',
    swatches: ['#FFFFFF', '#18181B', '#E4E4E7', '#52525B'],
    tokens: {
      typography: {
        fontFamily: {
          sans: 'Geist, system-ui, sans-serif',
          mono: 'Geist Mono, monospace',
        },
        scale: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
      },
      spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
      },
      borders: {
        width: '1px',
        color: '#E4E4E7',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      radius: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      transitions: {
        fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
    colorModes: {
      light: {
        accent: '#18181B',
        accentFg: '#FAFAFA',
        surface: '#FFFFFF',
        surfaceElevated: '#FFFFFF',
        border: '#E4E4E7',
        text: '#09090B',
        textMuted: '#52525B',
        focus: '#18181B',
        input: '#FFFFFF',
        accentHover: '#27272A',
        accentSoft: 'rgba(24,24,27,0.06)',
        surfaceMuted: '#F4F4F5',
        successBg: '#F0FDF4',
        successFg: '#15803D',
        warningBg: '#FFFBEB',
        warningFg: '#B45309',
        dangerBg: '#FEF2F2',
        dangerFg: '#B91C1C',
        infoBg: '#EFF6FF',
        infoFg: '#1D4ED8',
      },
      dark: {
        accent: '#FAFAFA',
        accentFg: '#18181B',
        surface: '#09090B',
        surfaceElevated: '#18181B',
        border: '#27272A',
        text: '#FAFAFA',
        textMuted: '#A1A1AA',
        focus: '#FAFAFA',
        input: '#18181B',
        accentHover: '#F4F4F5',
        accentSoft: 'rgba(250,250,250,0.10)',
        surfaceMuted: '#18181B',
        successBg: '#052E16',
        successFg: '#86EFAC',
        warningBg: '#2D1F05',
        warningFg: '#FCD34D',
        dangerBg: '#2A0F0F',
        dangerFg: '#FCA5A5',
        infoBg: '#0C1E3A',
        infoFg: '#93C5FD',
      },
    },
  },
  {
    id: 'neo-brutalism',
    name: 'Neo-Brutalism',
    description: 'Neo-Brutalism: border tegas 2px, hard offset shadow, kontras tinggi dan aksen berani',
    tagline: 'Border tegas, bayangan tajam, grafis berani',
    swatches: ['#FFFDF5', '#000000', '#FFE500', '#52525B'],
    tokens: {
      typography: {
        fontFamily: {
          sans: 'Geist, system-ui, sans-serif',
          mono: 'Geist Mono, monospace',
        },
        scale: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.25rem',
          xl: '1.5rem',
        },
      },
      spacing: {
        xs: 8,
        sm: 16,
        md: 24,
        lg: 32,
        xl: 48,
      },
      borders: {
        width: '2px',
        color: '#000000',
        style: 'solid',
      },
      elevation: {
        none: 'none',
        sm: '2px 2px 0px 0px #000000',
        md: '4px 4px 0px 0px #000000',
        lg: '6px 6px 0px 0px #000000',
      },
      radius: {
        none: '0px',
        sm: '3px',
        md: '5px',
        lg: '8px',
        full: '9999px',
      },
      transitions: {
        fast: '80ms ease',
        base: '150ms ease',
        slow: '250ms ease',
      },
    },
    colorModes: {
      light: {
        accent: '#FFE500',
        accentFg: '#000000',
        surface: '#FFFDF5',
        surfaceElevated: '#FFFFFF',
        border: '#000000',
        text: '#000000',
        textMuted: '#52525B',
        focus: '#000000',
        input: '#FFFFFF',
        accentHover: '#E6CF00',
        accentSoft: 'rgba(255,229,0,0.25)',
        surfaceMuted: '#F4F0E4',
        successBg: '#A7F3D0',
        successFg: '#000000',
        warningBg: '#FDBA74',
        warningFg: '#000000',
        dangerBg: '#FCA5A5',
        dangerFg: '#000000',
        infoBg: '#93C5FD',
        infoFg: '#000000',
      },
      dark: {
        accent: '#FFE500',
        accentFg: '#000000',
        surface: '#121212',
        surfaceElevated: '#1E1E22',
        border: '#E4E4E7',
        text: '#F4F4F5',
        textMuted: '#A1A1AA',
        focus: '#FFE500',
        input: '#1E1E22',
        accentHover: '#FFED4B',
        accentSoft: 'rgba(255,229,0,0.20)',
        surfaceMuted: '#18181B',
        successBg: '#A7F3D0',
        successFg: '#000000',
        warningBg: '#FDBA74',
        warningFg: '#000000',
        dangerBg: '#FCA5A5',
        dangerFg: '#000000',
        infoBg: '#93C5FD',
        infoFg: '#000000',
      },
    },
  },
];
