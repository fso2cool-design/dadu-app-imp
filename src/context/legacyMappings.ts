import type { AppearancePresetKey } from '../design-system/tokens';

export const DEFAULT_APPEARANCE_PRESET: AppearancePresetKey = 'shadcn-ui';

export const LEGACY_PRESET_MAPPINGS: Record<string, AppearancePresetKey> = {
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

// Helper: Validate appearance preset key (active ids only)
export function isValidAppearancePreset(key: string): key is AppearancePresetKey {
  return (['paper-craft', 'neo-brutalism', 'shadcn-ui'] as string[]).includes(key);
}

// Helper: Resolve stored value — active id or legacy id mapping; null if unknown
export function resolveAppearancePreset(key: string): AppearancePresetKey | null {
  if (isValidAppearancePreset(key)) return key;
  return LEGACY_PRESET_MAPPINGS[key] ?? null;
}

// Helper: Map legacy theme to active appearance preset
export function mapLegacyThemeToAppearancePreset(theme: string): AppearancePresetKey {
  return resolveAppearancePreset(theme) ?? DEFAULT_APPEARANCE_PRESET;
}
