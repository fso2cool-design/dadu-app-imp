import type {
  AppearancePresetKey,
  ColorMode,
  DesignColorTokens,
  InvariantTokens,
} from '../design-system/tokens';

export interface ApplyAppearanceOptions {
  preset: AppearancePresetKey;
  mode: ColorMode;
  tokens: InvariantTokens;
  colors: DesignColorTokens;
}

/**
 * Applies visual design tokens, custom CSS properties, and root DOM attributes.
 * Pure DOM function accepting an explicit root element without global side-effects.
 */
export function applyAppearanceToDom(
  root: HTMLElement,
  options: ApplyAppearanceOptions
): void {
  const { preset, mode, tokens, colors } = options;

  root.setAttribute('data-design-system', preset);
  root.classList.toggle('dark', mode === 'dark');

  // Color tokens (--ds-*)
  root.style.setProperty('--ds-accent', colors.accent);
  root.style.setProperty('--ds-accent-fg', colors.accentFg);
  root.style.setProperty('--ds-surface', colors.surface);
  root.style.setProperty('--ds-surface-elevated', colors.surfaceElevated);
  root.style.setProperty('--ds-border', colors.border);
  root.style.setProperty('--ds-text', colors.text);
  root.style.setProperty('--ds-text-muted', colors.textMuted);
  root.style.setProperty('--ds-focus', colors.focus);
  root.style.setProperty('--ds-input', colors.input);
  root.style.setProperty('--ds-accent-hover', colors.accentHover);
  root.style.setProperty('--ds-accent-soft', colors.accentSoft);
  root.style.setProperty('--ds-surface-muted', colors.surfaceMuted);
  root.style.setProperty('--ds-success-bg', colors.successBg);
  root.style.setProperty('--ds-success-fg', colors.successFg);
  root.style.setProperty('--ds-warning-bg', colors.warningBg);
  root.style.setProperty('--ds-warning-fg', colors.warningFg);
  root.style.setProperty('--ds-danger-bg', colors.dangerBg);
  root.style.setProperty('--ds-danger-fg', colors.dangerFg);
  root.style.setProperty('--ds-info-bg', colors.infoBg);
  root.style.setProperty('--ds-info-fg', colors.infoFg);

  // Spacing tokens (--ds-spacing-*)
  root.style.setProperty('--ds-spacing-xs', `${tokens.spacing.xs}px`);
  root.style.setProperty('--ds-spacing-sm', `${tokens.spacing.sm}px`);
  root.style.setProperty('--ds-spacing-md', `${tokens.spacing.md}px`);
  root.style.setProperty('--ds-spacing-lg', `${tokens.spacing.lg}px`);
  root.style.setProperty('--ds-spacing-xl', `${tokens.spacing.xl}px`);

  // Border tokens (--ds-border-*)
  root.style.setProperty('--ds-border-width', tokens.borders.width);
  root.style.setProperty('--ds-border-color', tokens.borders.color);
  root.style.setProperty('--ds-border-style', tokens.borders.style);

  // Typography scale tokens (--ds-font-scale-*)
  root.style.setProperty('--ds-font-scale-xs', tokens.typography.scale.xs);
  root.style.setProperty('--ds-font-scale-sm', tokens.typography.scale.sm);
  root.style.setProperty('--ds-font-scale-base', tokens.typography.scale.base);
  root.style.setProperty('--ds-font-scale-lg', tokens.typography.scale.lg);
  root.style.setProperty('--ds-font-scale-xl', tokens.typography.scale.xl);

  // Elevation tokens (--ds-elevation-*)
  root.style.setProperty('--ds-elevation-none', tokens.elevation.none);
  root.style.setProperty('--ds-elevation-sm', tokens.elevation.sm);
  root.style.setProperty('--ds-elevation-md', tokens.elevation.md);
  root.style.setProperty('--ds-elevation-lg', tokens.elevation.lg);

  // Radius tokens (--ds-radius-*)
  root.style.setProperty('--ds-radius-none', tokens.radius.none);
  root.style.setProperty('--ds-radius-sm', tokens.radius.sm);
  root.style.setProperty('--ds-radius-md', tokens.radius.md);
  root.style.setProperty('--ds-radius-lg', tokens.radius.lg);
  root.style.setProperty('--ds-radius-full', tokens.radius.full);

  // Transition tokens (--ds-transition-*)
  root.style.setProperty('--ds-transition-fast', tokens.transitions.fast);
  root.style.setProperty('--ds-transition-base', tokens.transitions.base);
  root.style.setProperty('--ds-transition-slow', tokens.transitions.slow);

  // Font family tokens (--ds-font-*)
  root.style.setProperty('--ds-font-sans', tokens.typography.fontFamily.sans);
  root.style.setProperty('--ds-font-mono', tokens.typography.fontFamily.mono);
  if (tokens.typography.fontFamily.serif) {
    root.style.setProperty('--ds-font-serif', tokens.typography.fontFamily.serif);
  } else {
    root.style.removeProperty('--ds-font-serif');
  }

  // Compatibility variables for legacy theme mappings
  root.style.setProperty('--accent-primary', colors.accent);
  root.style.setProperty('--accent-primary-text', colors.accentFg);
  root.style.setProperty('--app-bg', colors.surface);
  root.style.setProperty('--card-bg', colors.surfaceElevated);
  root.style.setProperty('--card-border', colors.border);
  root.style.setProperty('--text-main', colors.text);
  root.style.setProperty('--text-muted', colors.textMuted);
}
