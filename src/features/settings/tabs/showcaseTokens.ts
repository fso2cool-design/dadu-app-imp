import {
  DESIGN_SYSTEMS,
  type DesignSystemColorTokens,
  type DesignSystemKey,
  type DesignSystemMode,
} from '../../../types';

/**
 * Colour token -> CSS variable name. Typed as a full Record so adding a colour
 * token without a variable name fails `tsc`. A parity test asserts these names
 * and values match what DesignSystemContext writes to :root.
 */
const COLOR_VARS: Record<keyof DesignSystemColorTokens, string> = {
  accent: '--ds-accent',
  accentFg: '--ds-accent-fg',
  surface: '--ds-surface',
  surfaceElevated: '--ds-surface-elevated',
  border: '--ds-border',
  text: '--ds-text',
  textMuted: '--ds-text-muted',
  focus: '--ds-focus',
  input: '--ds-input',
  accentHover: '--ds-accent-hover',
  accentSoft: '--ds-accent-soft',
  surfaceMuted: '--ds-surface-muted',
  successBg: '--ds-success-bg',
  successFg: '--ds-success-fg',
  warningBg: '--ds-warning-bg',
  warningFg: '--ds-warning-fg',
  dangerBg: '--ds-danger-bg',
  dangerFg: '--ds-danger-fg',
  infoBg: '--ds-info-bg',
  infoFg: '--ds-info-fg',
};

export function getPreviewPalette(system: DesignSystemKey, mode: DesignSystemMode) {
  // Same fallback as DesignSystemContext (index 1 = shadcn-ui).
  const option = DESIGN_SYSTEMS.find((ds) => ds.id === system) ?? DESIGN_SYSTEMS[1];
  const colors = mode === 'dark' ? option.tokens.darkColors : option.tokens.colors;
  return { option, tokens: option.tokens, colors };
}

/**
 * The --ds-* variables a given system/mode would put on :root, for scoping onto a
 * preview container. Read-only: never touches the DOM, localStorage or Firestore.
 */
export function buildPreviewVars(
  system: DesignSystemKey,
  mode: DesignSystemMode,
): Record<string, string> {
  const { tokens, colors } = getPreviewPalette(system, mode);
  const vars: Record<string, string> = {};
  for (const key of Object.keys(COLOR_VARS) as Array<keyof DesignSystemColorTokens>) {
    vars[COLOR_VARS[key]] = colors[key];
  }
  for (const k of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    vars[`--ds-spacing-${k}`] = `${tokens.spacing[k]}px`;
  }
  for (const k of ['xs', 'sm', 'base', 'lg', 'xl'] as const) {
    vars[`--ds-font-scale-${k}`] = tokens.typography.scale[k];
  }
  vars['--ds-border-width'] = tokens.borders.width;
  vars['--ds-border-color'] = tokens.borders.color;
  vars['--ds-border-style'] = tokens.borders.style;
  for (const k of ['none', 'sm', 'md', 'lg'] as const) {
    vars[`--ds-elevation-${k}`] = tokens.elevation[k];
  }
  for (const k of ['none', 'sm', 'md', 'lg', 'full'] as const) {
    vars[`--ds-radius-${k}`] = tokens.radius[k];
  }
  for (const k of ['fast', 'base', 'slow'] as const) {
    vars[`--ds-transition-${k}`] = tokens.transitions[k];
  }
  vars['--ds-font-sans'] = tokens.typography.fontFamily.sans;
  vars['--ds-font-mono'] = tokens.typography.fontFamily.mono;
  if (tokens.typography.fontFamily.serif) {
    vars['--ds-font-serif'] = tokens.typography.fontFamily.serif;
  }
  return vars;
}

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const h = hex.replace('#', '');
    const [r, g, bl] = [0, 2, 4].map((i) => {
      const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface ContrastCheck {
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  /** 4.5 = normal text, 3 = large text / non-text UI (WCAG 1.4.11). */
  threshold: 4.5 | 3;
  pass: boolean;
}

/** Every fg/bg pair the four ui primitives actually render, for one system/mode. */
export function primitiveContrastChecks(c: DesignSystemColorTokens): ContrastCheck[] {
  const pairs: Array<[string, string, string, 4.5 | 3]> = [
    ['Teks tombol primary', c.accentFg, c.accent, 4.5],
    ['Teks tombol primary (hover)', c.accentFg, c.accentHover, 4.5],
    ['Teks tombol secondary', c.text, c.surfaceMuted, 4.5],
    ['Teks tombol danger', c.dangerFg, c.dangerBg, 4.5],
    ['Teks kartu', c.text, c.surfaceElevated, 4.5],
    ['Deskripsi kartu (teks muted)', c.textMuted, c.surfaceElevated, 4.5],
    ['Isi input', c.text, c.input, 4.5],
    ['Placeholder & helper input', c.textMuted, c.input, 4.5],
    ['Pesan error', c.dangerFg, c.dangerBg, 4.5],
    ['Status hadir (success)', c.successFg, c.successBg, 4.5],
    ['Status izin (warning)', c.warningFg, c.warningBg, 4.5],
    ['Status sakit (info)', c.infoFg, c.infoBg, 4.5],
    ['Batas input (non-teks)', c.border, c.input, 3],
    ['Focus outline (non-teks)', c.text, c.surface, 3],
    ['Garis error input (non-teks)', c.dangerFg, c.input, 3],
    ['Halo error input (non-teks)', c.dangerBg, c.surfaceElevated, 3],
  ];
  return pairs.map(([label, fg, bg, threshold]) => {
    const ratio = contrastRatio(fg, bg);
    return { label, fg, bg, ratio, threshold, pass: ratio >= threshold };
  });
}
