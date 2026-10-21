import { describe, expect, it } from 'vitest';
import { APPEARANCE_PRESETS, type AppearancePresetKey, type ColorMode } from './tokens';
import { contrastRatio } from '../features/settings/tabs/showcaseTokens';

const PRESET_COMBOS: Array<[AppearancePresetKey, ColorMode]> = [
  ['paper-craft', 'light'],
  ['paper-craft', 'dark'],
  ['shadcn-ui', 'light'],
  ['shadcn-ui', 'dark'],
  ['neo-brutalism', 'light'],
  ['neo-brutalism', 'dark'],
];

describe('Stage D: Contrast Accessibility & Token Fidelity Audit', () => {
  describe('1. Relative Luminance & Contrast Calculation Math', () => {
    it('verifies standard contrast benchmarks with precision', () => {
      // Pure black on pure white is 21:1
      expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21.0, 1);
      // Neo-brutalism ink on yellow
      expect(contrastRatio('#000000', '#FFE500')).toBeCloseTo(16.46, 2);
      // Paper craft ink on paper surface
      expect(contrastRatio('#1C1917', '#FAF7EE')).toBeCloseTo(16.33, 2);
      // Shadcn zinc text on white
      expect(contrastRatio('#09090B', '#FFFFFF')).toBeCloseTo(19.90, 2);
    });
  });

  describe('2. Paper Craft Light Mode Focus Contrast Correction', () => {
    it('verifies paper-craft light focus token achieves >= 3.0:1 on all paper surfaces', () => {
      const pc = APPEARANCE_PRESETS.find((p) => p.id === 'paper-craft')!;
      const light = pc.colorModes.light;

      // Previously #FF5A36 yielded 2.90:1 (FAIL). Corrected to #E84E2C.
      expect(light.focus).toBe('#E84E2C');

      const surfaceRatio = contrastRatio(light.focus, light.surface);
      expect(surfaceRatio).toBeGreaterThanOrEqual(3.0);
      expect(surfaceRatio).toBeCloseTo(3.53, 2);

      const elevatedRatio = contrastRatio(light.focus, light.surfaceElevated);
      expect(elevatedRatio).toBeGreaterThanOrEqual(3.0);
      expect(elevatedRatio).toBeCloseTo(3.72, 2);

      const mutedRatio = contrastRatio(light.focus, light.surfaceMuted);
      expect(mutedRatio).toBeGreaterThanOrEqual(3.0);
      expect(mutedRatio).toBeCloseTo(3.32, 2);
    });

    it('verifies paper-craft dark mode focus token achieves >= 3.0:1', () => {
      const pc = APPEARANCE_PRESETS.find((p) => p.id === 'paper-craft')!;
      const dark = pc.colorModes.dark;
      const ratio = contrastRatio(dark.focus, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(ratio).toBeCloseTo(5.64, 2);
    });
  });

  describe('3. Reusable Button Text & Status Contrast', () => {
    it.each(PRESET_COMBOS)('%s/%s: Primary button text & hover reach >= 4.5:1', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      const normalRatio = contrastRatio(c.accentFg, c.accent);
      expect(normalRatio, `Primary button text in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);

      const hoverRatio = contrastRatio(c.accentFg, c.accentHover);
      expect(hoverRatio, `Primary button hover text in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
    });

    it.each(PRESET_COMBOS)('%s/%s: Secondary button text on surfaceMuted reaches >= 4.5:1', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      const ratio = contrastRatio(c.text, c.surfaceMuted);
      expect(ratio, `Secondary button text in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
    });

    it.each(PRESET_COMBOS)('%s/%s: Danger button text on dangerBg reaches >= 4.5:1', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      const ratio = contrastRatio(c.dangerFg, c.dangerBg);
      expect(ratio, `Danger button text in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
    });

    it.each(PRESET_COMBOS)('%s/%s: Outline & Ghost button text on surfaces reach >= 4.5:1', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      const surfaceRatio = contrastRatio(c.text, c.surface);
      expect(surfaceRatio, `Outline text on surface in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);

      const elevatedRatio = contrastRatio(c.text, c.surfaceElevated);
      expect(elevatedRatio, `Outline text on surfaceElevated in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('4. Navigation Contrast & Label Readability (Sidebar & BottomNav)', () => {
    it.each(PRESET_COMBOS)('%s/%s: Inactive navigation label reaches >= 4.5:1', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      const ratio = contrastRatio(c.textMuted, c.surface);
      expect(ratio, `Inactive nav text in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
    });

    it.each(PRESET_COMBOS)('%s/%s: Active navigation text/icon reaches >= 4.5:1 on its active surface', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      let activeFg: string;
      let activeBg: string;

      if (presetId === 'neo-brutalism') {
        // Neo-Brutalism active nav renders high-contrast accentFg on accent background
        activeFg = c.accentFg;
        activeBg = c.accent;
      } else if (presetId === 'paper-craft') {
        // Paper Craft active nav renders ink text on elevated paper surface card
        activeFg = c.text;
        activeBg = c.surfaceElevated;
      } else {
        // Shadcn UI active nav renders primary text on subtle muted container
        activeFg = c.text;
        activeBg = c.surfaceMuted;
      }

      const ratio = contrastRatio(activeFg, activeBg);
      expect(ratio, `Active nav contrast in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
    });

    it.each(PRESET_COMBOS)('%s/%s: Focus indicators reach >= 3.0:1 on surface', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      const ratio = contrastRatio(c.focus, c.surface);
      expect(ratio, `Focus indicator contrast on surface in ${presetId}/${mode}`).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('5. Status Semantics (WCAG AA >= 4.5:1)', () => {
    it.each(PRESET_COMBOS)('%s/%s: All status tokens (success, warning, danger, info) reach >= 4.5:1 on their own bg', (presetId, mode) => {
      const preset = APPEARANCE_PRESETS.find((p) => p.id === presetId)!;
      const c = preset.colorModes[mode];

      for (const s of ['success', 'warning', 'danger', 'info'] as const) {
        const fg = c[`${s}Fg`];
        const bg = c[`${s}Bg`];
        const ratio = contrastRatio(fg, bg);
        expect(ratio, `Status ${s} in ${presetId}/${mode}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
