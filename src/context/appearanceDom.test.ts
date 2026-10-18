import { beforeEach, describe, expect, it } from 'vitest';
import { applyAppearanceToDom } from './appearanceDom';
import { APPEARANCE_PRESETS } from '../design-system/tokens';
import type { AppearancePresetKey, ColorMode } from '../design-system/tokens';

describe('appearanceDom Unit Tests', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
  });

  const getPreset = (id: AppearancePresetKey) => {
    const found = APPEARANCE_PRESETS.find((p) => p.id === id);
    if (!found) throw new Error(`Preset ${id} not found`);
    return found;
  };

  it('sets data-design-system attribute and toggles .dark according to mode', () => {
    const preset = getPreset('paper-craft');

    // Light mode
    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'light',
      tokens: preset.tokens,
      colors: preset.colorModes.light,
    });
    expect(root.getAttribute('data-design-system')).toBe('paper-craft');
    expect(root.classList.contains('dark')).toBe(false);

    // Dark mode
    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'dark',
      tokens: preset.tokens,
      colors: preset.colorModes.dark,
    });
    expect(root.getAttribute('data-design-system')).toBe('paper-craft');
    expect(root.classList.contains('dark')).toBe(true);
  });

  it('never adds data-theme or data-mode attributes to the root element', () => {
    const preset = getPreset('shadcn-ui');

    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'light',
      tokens: preset.tokens,
      colors: preset.colorModes.light,
    });
    expect(root.getAttribute('data-theme')).toBeNull();
    expect(root.getAttribute('data-mode')).toBeNull();

    applyAppearanceToDom(root, {
      preset: 'neo-brutalism',
      mode: 'dark',
      tokens: getPreset('neo-brutalism').tokens,
      colors: getPreset('neo-brutalism').colorModes.dark,
    });
    expect(root.getAttribute('data-theme')).toBeNull();
    expect(root.getAttribute('data-mode')).toBeNull();
  });

  it('applies all token categories with exact values for all 3 presets and modes', () => {
    const presets: AppearancePresetKey[] = ['paper-craft', 'shadcn-ui', 'neo-brutalism'];
    const modes: ColorMode[] = ['light', 'dark'];

    for (const presetId of presets) {
      const preset = getPreset(presetId);
      for (const mode of modes) {
        const colors = preset.colorModes[mode];
        const tokens = preset.tokens;

        applyAppearanceToDom(root, {
          preset: presetId,
          mode,
          tokens,
          colors,
        });

        // 1. Color tokens
        expect(root.style.getPropertyValue('--ds-accent')).toBe(colors.accent);
        expect(root.style.getPropertyValue('--ds-accent-fg')).toBe(colors.accentFg);
        expect(root.style.getPropertyValue('--ds-surface')).toBe(colors.surface);
        expect(root.style.getPropertyValue('--ds-surface-elevated')).toBe(colors.surfaceElevated);
        expect(root.style.getPropertyValue('--ds-border')).toBe(colors.border);
        expect(root.style.getPropertyValue('--ds-text')).toBe(colors.text);
        expect(root.style.getPropertyValue('--ds-text-muted')).toBe(colors.textMuted);
        expect(root.style.getPropertyValue('--ds-focus')).toBe(colors.focus);
        expect(root.style.getPropertyValue('--ds-input')).toBe(colors.input);
        expect(root.style.getPropertyValue('--ds-accent-hover')).toBe(colors.accentHover);
        expect(root.style.getPropertyValue('--ds-accent-soft')).toBe(colors.accentSoft);
        expect(root.style.getPropertyValue('--ds-surface-muted')).toBe(colors.surfaceMuted);
        expect(root.style.getPropertyValue('--ds-success-bg')).toBe(colors.successBg);
        expect(root.style.getPropertyValue('--ds-success-fg')).toBe(colors.successFg);
        expect(root.style.getPropertyValue('--ds-warning-bg')).toBe(colors.warningBg);
        expect(root.style.getPropertyValue('--ds-warning-fg')).toBe(colors.warningFg);
        expect(root.style.getPropertyValue('--ds-danger-bg')).toBe(colors.dangerBg);
        expect(root.style.getPropertyValue('--ds-danger-fg')).toBe(colors.dangerFg);
        expect(root.style.getPropertyValue('--ds-info-bg')).toBe(colors.infoBg);
        expect(root.style.getPropertyValue('--ds-info-fg')).toBe(colors.infoFg);

        // 2. Spacing tokens
        expect(root.style.getPropertyValue('--ds-spacing-xs')).toBe(`${tokens.spacing.xs}px`);
        expect(root.style.getPropertyValue('--ds-spacing-sm')).toBe(`${tokens.spacing.sm}px`);
        expect(root.style.getPropertyValue('--ds-spacing-md')).toBe(`${tokens.spacing.md}px`);
        expect(root.style.getPropertyValue('--ds-spacing-lg')).toBe(`${tokens.spacing.lg}px`);
        expect(root.style.getPropertyValue('--ds-spacing-xl')).toBe(`${tokens.spacing.xl}px`);

        // 3. Border tokens
        expect(root.style.getPropertyValue('--ds-border-width')).toBe(tokens.borders.width);
        expect(root.style.getPropertyValue('--ds-border-color')).toBe(tokens.borders.color);
        expect(root.style.getPropertyValue('--ds-border-style')).toBe(tokens.borders.style);

        // 4. Typography scale
        expect(root.style.getPropertyValue('--ds-font-scale-xs')).toBe(tokens.typography.scale.xs);
        expect(root.style.getPropertyValue('--ds-font-scale-sm')).toBe(tokens.typography.scale.sm);
        expect(root.style.getPropertyValue('--ds-font-scale-base')).toBe(tokens.typography.scale.base);
        expect(root.style.getPropertyValue('--ds-font-scale-lg')).toBe(tokens.typography.scale.lg);
        expect(root.style.getPropertyValue('--ds-font-scale-xl')).toBe(tokens.typography.scale.xl);

        // 5. Elevation tokens
        expect(root.style.getPropertyValue('--ds-elevation-none')).toBe(tokens.elevation.none);
        expect(root.style.getPropertyValue('--ds-elevation-sm')).toBe(tokens.elevation.sm);
        expect(root.style.getPropertyValue('--ds-elevation-md')).toBe(tokens.elevation.md);
        expect(root.style.getPropertyValue('--ds-elevation-lg')).toBe(tokens.elevation.lg);

        // 6. Radius tokens
        expect(root.style.getPropertyValue('--ds-radius-none')).toBe(tokens.radius.none);
        expect(root.style.getPropertyValue('--ds-radius-sm')).toBe(tokens.radius.sm);
        expect(root.style.getPropertyValue('--ds-radius-md')).toBe(tokens.radius.md);
        expect(root.style.getPropertyValue('--ds-radius-lg')).toBe(tokens.radius.lg);
        expect(root.style.getPropertyValue('--ds-radius-full')).toBe(tokens.radius.full);

        // 7. Transitions tokens
        expect(root.style.getPropertyValue('--ds-transition-fast')).toBe(tokens.transitions.fast);
        expect(root.style.getPropertyValue('--ds-transition-base')).toBe(tokens.transitions.base);
        expect(root.style.getPropertyValue('--ds-transition-slow')).toBe(tokens.transitions.slow);

        // 8. Font families
        expect(root.style.getPropertyValue('--ds-font-sans')).toBe(tokens.typography.fontFamily.sans);
        expect(root.style.getPropertyValue('--ds-font-mono')).toBe(tokens.typography.fontFamily.mono);

        // 9. Compatibility variables
        expect(root.style.getPropertyValue('--accent-primary')).toBe(colors.accent);
        expect(root.style.getPropertyValue('--accent-primary-text')).toBe(colors.accentFg);
        expect(root.style.getPropertyValue('--app-bg')).toBe(colors.surface);
        expect(root.style.getPropertyValue('--card-bg')).toBe(colors.surfaceElevated);
        expect(root.style.getPropertyValue('--card-border')).toBe(colors.border);
        expect(root.style.getPropertyValue('--text-main')).toBe(colors.text);
        expect(root.style.getPropertyValue('--text-muted')).toBe(colors.textMuted);
      }
    }
  });

  it('manages --ds-font-serif property conditionally', () => {
    const preset = getPreset('shadcn-ui');

    // Case 1: serif is undefined
    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'light',
      tokens: preset.tokens,
      colors: preset.colorModes.light,
    });
    expect(root.style.getPropertyValue('--ds-font-serif')).toBe('');

    // Case 2: serif is defined
    const customTokens = {
      ...preset.tokens,
      typography: {
        ...preset.tokens.typography,
        fontFamily: {
          ...preset.tokens.typography.fontFamily,
          serif: 'Merriweather, serif',
        },
      },
    };
    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'light',
      tokens: customTokens,
      colors: preset.colorModes.light,
    });
    expect(root.style.getPropertyValue('--ds-font-serif')).toBe('Merriweather, serif');

    // Case 3: switching back removes property
    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'light',
      tokens: preset.tokens,
      colors: preset.colorModes.light,
    });
    expect(root.style.getPropertyValue('--ds-font-serif')).toBe('');
  });

  it('preserves invariant token references across mode toggles without mutation', () => {
    const preset = getPreset('neo-brutalism');
    const tokensBefore = JSON.parse(JSON.stringify(preset.tokens));

    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'light',
      tokens: preset.tokens,
      colors: preset.colorModes.light,
    });

    applyAppearanceToDom(root, {
      preset: preset.id,
      mode: 'dark',
      tokens: preset.tokens,
      colors: preset.colorModes.dark,
    });

    expect(preset.tokens).toEqual(tokensBefore);
  });
});
