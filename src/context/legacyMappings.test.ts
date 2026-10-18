import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPEARANCE_PRESET,
  LEGACY_PRESET_MAPPINGS,
  isValidAppearancePreset,
  mapLegacyThemeToAppearancePreset,
  resolveAppearancePreset,
} from './legacyMappings';
import type { AppearancePresetKey } from '../design-system/tokens';

describe('legacyMappings Unit Tests', () => {
  const canonicalPresets: AppearancePresetKey[] = ['paper-craft', 'shadcn-ui', 'neo-brutalism'];

  const expected11Mappings: Record<string, AppearancePresetKey> = {
    'atelier': 'neo-brutalism',
    'minimalist': 'shadcn-ui',
    'brutalism': 'paper-craft',
    'neo-skeuomorphic': 'shadcn-ui',
    'apple-glass': 'neo-brutalism',
    'light': 'shadcn-ui',
    'dark-crimson': 'neo-brutalism',
    'obsidian-tactile': 'neo-brutalism',
    'swiss-manuscript': 'shadcn-ui',
    'solarized-comfort': 'neo-brutalism',
    'chalkboard-school': 'paper-craft',
  };

  describe('LEGACY_PRESET_MAPPINGS registry integrity', () => {
    it('contains exactly 11 legacy keys', () => {
      expect(Object.keys(LEGACY_PRESET_MAPPINGS)).toHaveLength(11);
    });

    it('maps every legacy key to a valid canonical preset', () => {
      for (const [legacyKey, targetPreset] of Object.entries(LEGACY_PRESET_MAPPINGS)) {
        expect(canonicalPresets).toContain(targetPreset);
        expect(targetPreset).toBe(expected11Mappings[legacyKey]);
      }
    });

    it('has default appearance preset set to shadcn-ui', () => {
      expect(DEFAULT_APPEARANCE_PRESET).toBe('shadcn-ui');
    });
  });

  describe('isValidAppearancePreset', () => {
    it('returns true for all 3 canonical preset keys', () => {
      for (const preset of canonicalPresets) {
        expect(isValidAppearancePreset(preset)).toBe(true);
      }
    });

    it('returns false for all 11 legacy keys', () => {
      for (const legacyKey of Object.keys(expected11Mappings)) {
        expect(isValidAppearancePreset(legacyKey)).toBe(false);
      }
    });

    it('returns false for arbitrary, invalid, or empty strings', () => {
      expect(isValidAppearancePreset('')).toBe(false);
      expect(isValidAppearancePreset('neutral')).toBe(false);
      expect(isValidAppearancePreset('dark')).toBe(false);
      expect(isValidAppearancePreset('light')).toBe(false);
      expect(isValidAppearancePreset('unknown-theme')).toBe(false);
    });
  });

  describe('resolveAppearancePreset', () => {
    it('passes through canonical preset keys directly', () => {
      for (const preset of canonicalPresets) {
        expect(resolveAppearancePreset(preset)).toBe(preset);
      }
    });

    it('maps each of the 11 legacy keys to its expected canonical preset', () => {
      for (const [legacyKey, expectedPreset] of Object.entries(expected11Mappings)) {
        expect(resolveAppearancePreset(legacyKey)).toBe(expectedPreset);
      }
    });

    it('returns null for unknown or empty strings', () => {
      expect(resolveAppearancePreset('')).toBeNull();
      expect(resolveAppearancePreset('unknown')).toBeNull();
      expect(resolveAppearancePreset('random-preset')).toBeNull();
      expect(resolveAppearancePreset('classic')).toBeNull();
    });
  });

  describe('mapLegacyThemeToAppearancePreset', () => {
    it('maps each of the 11 legacy keys correctly', () => {
      for (const [legacyKey, expectedPreset] of Object.entries(expected11Mappings)) {
        expect(mapLegacyThemeToAppearancePreset(legacyKey)).toBe(expectedPreset);
      }
    });

    it('preserves canonical preset keys directly', () => {
      for (const preset of canonicalPresets) {
        expect(mapLegacyThemeToAppearancePreset(preset)).toBe(preset);
      }
    });

    it('falls back to DEFAULT_APPEARANCE_PRESET (shadcn-ui) for unknown inputs', () => {
      expect(mapLegacyThemeToAppearancePreset('')).toBe('shadcn-ui');
      expect(mapLegacyThemeToAppearancePreset('unknown-theme')).toBe('shadcn-ui');
      expect(mapLegacyThemeToAppearancePreset('nonexistent')).toBe('shadcn-ui');
    });
  });
});
