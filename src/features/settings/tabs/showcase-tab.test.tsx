import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DESIGN_SYSTEMS, type DesignSystemKey, type DesignSystemMode } from '../../../types';
import { ShowcaseTab } from './ShowcaseTab';
import {
  buildPreviewVars,
  contrastRatio,
  getPreviewPalette,
  primitiveContrastChecks,
} from './showcaseTokens';

const ds = {
  activeSystem: 'shadcn-ui' as DesignSystemKey,
  mode: 'light' as DesignSystemMode,
  tokens: DESIGN_SYSTEMS[1].tokens,
  setSystem: vi.fn(),
  applyAndSaveSystem: vi.fn(),
  setMode: vi.fn(),
  toggleMode: vi.fn(),
  applyAndSaveMode: vi.fn(),
};

vi.mock('../../../context/DesignSystemContext', () => ({
  useDesignSystem: () => ds,
}));

const COMBOS: Array<[DesignSystemKey, DesignSystemMode]> = DESIGN_SYSTEMS.flatMap((d) => [
  [d.id, 'light'] as [DesignSystemKey, DesignSystemMode],
  [d.id, 'dark'] as [DesignSystemKey, DesignSystemMode],
]);

describe('showcaseTokens', () => {
  it('contrastRatio matches the verified reference values in a11y-contrast-check.md', () => {
    expect(contrastRatio('#000000', '#FFE500')).toBeCloseTo(16.46, 2);
    expect(contrastRatio('#FFFFFF', '#0051D5')).toBeCloseTo(6.69, 2);
    expect(contrastRatio('#FFFFFF', '#007AFF')).toBeCloseTo(4.02, 2);
    expect(contrastRatio('#FFE500', '#FFFFFF')).toBeCloseTo(1.28, 2);
  });

  it.each(COMBOS)('%s/%s: every status fg reaches 4.5:1 on its own bg', (system, mode) => {
    const { colors } = getPreviewPalette(system, mode);
    for (const s of ['success', 'warning', 'danger', 'info'] as const) {
      const ratio = contrastRatio(colors[`${s}Fg`], colors[`${s}Bg`]);
      expect(ratio, `${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(COMBOS)(
    '%s/%s: primitive text pairs pass 4.5:1 and error indicator passes 3:1',
    (system, mode) => {
      const checks = primitiveContrastChecks(getPreviewPalette(system, mode).colors);
      for (const c of checks.filter((x) => x.threshold === 4.5)) {
        expect(c.ratio, c.label).toBeGreaterThanOrEqual(4.5);
      }
      const focus = checks.find((c) => c.label.startsWith('Focus outline'));
      expect(focus?.pass).toBe(true);
      const stroke = checks.find((c) => c.label.startsWith('Garis error'));
      const halo = checks.find((c) => c.label.startsWith('Halo error'));
      expect(Math.max(stroke?.ratio ?? 0, halo?.ratio ?? 0)).toBeGreaterThanOrEqual(3);
    },
  );

  it('reports the known shadcn input-boundary failure instead of hiding it', () => {
    for (const mode of ['light', 'dark'] as const) {
      const boundary = primitiveContrastChecks(getPreviewPalette('shadcn-ui', mode).colors).find(
        (c) => c.label.startsWith('Batas input'),
      );
      expect(boundary?.pass).toBe(false);
    }
  });
});

describe('ShowcaseTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-mode');
    document.documentElement.classList.remove('dark');
  });

  const preview = () => screen.getByTestId('ds-preview');
  const systemGroup = () => screen.getByRole('group', { name: 'Pilih design system' });
  const modeGroup = () => screen.getByRole('group', { name: 'Pilih mode' });

  it('starts from the active system and mode', () => {
    render(<ShowcaseTab />);
    expect(preview()).toHaveAttribute('data-preview-system', 'shadcn-ui');
    expect(preview()).toHaveAttribute('data-preview-mode', 'light');
    expect(preview().style.getPropertyValue('--ds-accent')).toBe('#18181B');
  });

  it.each(COMBOS)('scopes %s/%s tokens onto the preview container', (system, mode) => {
    render(<ShowcaseTab />);
    const name = DESIGN_SYSTEMS.find((d) => d.id === system)?.name ?? '';
    fireEvent.click(within(systemGroup()).getByRole('button', { name }));
    fireEvent.click(within(modeGroup()).getByRole('button', { name: mode === 'dark' ? 'Gelap' : 'Terang' }));
    const expected = buildPreviewVars(system, mode);
    for (const [k, v] of Object.entries(expected)) {
      expect(preview().style.getPropertyValue(k), k).toBe(v);
    }
  });

  it('never persists: no context setters, no localStorage writes, no root changes', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<ShowcaseTab />);
    act(() => {
      fireEvent.click(within(systemGroup()).getByRole('button', { name: 'Neo-Brutalism' }));
      fireEvent.click(within(modeGroup()).getByRole('button', { name: 'Gelap' }));
      fireEvent.click(within(systemGroup()).getByRole('button', { name: 'Paper Craft' }));
    });
    expect(ds.setSystem).not.toHaveBeenCalled();
    expect(ds.applyAndSaveSystem).not.toHaveBeenCalled();
    expect(ds.setMode).not.toHaveBeenCalled();
    expect(ds.toggleMode).not.toHaveBeenCalled();
    expect(ds.applyAndSaveMode).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.documentElement.getAttribute('data-mode')).toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    setItem.mockRestore();
  });

  it('renders real primitives without per-component colour overrides', () => {
    render(<ShowcaseTab />);
    const save = within(preview()).getByRole('button', { name: /Simpan Nilai/ });
    expect(save.className).toContain('bg-[var(--ds-accent)]');
    expect(save.style.backgroundColor).toBe('');
    expect(save.style.color).toBe('');
    const nisn = within(preview()).getByLabelText('NISN');
    expect(nisn).toHaveAttribute('aria-invalid', 'true');
    expect(nisn.style.backgroundColor).toBe('');
  });

  it('applies theme assets only to their own system', () => {
    render(<ShowcaseTab />);
    expect(preview().querySelector('.ds-texture-paper')).toBeNull();
    expect(screen.queryByTestId('hazard-bar')).toBeNull();

    fireEvent.click(within(systemGroup()).getByRole('button', { name: 'Paper Craft' }));
    expect(preview().querySelector('.ds-texture-paper')).not.toBeNull();
    expect(screen.queryByTestId('hazard-bar')).toBeNull();

    fireEvent.click(within(systemGroup()).getByRole('button', { name: 'Neo-Brutalism' }));
    expect(preview().querySelector('.ds-texture-paper')).toBeNull();
    expect(screen.getByTestId('hazard-bar')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a contrast row per checked pair and marks failures', () => {
    render(<ShowcaseTab />);
    const rows = within(screen.getByTestId('contrast-table')).getAllByRole('row');
    const expected = primitiveContrastChecks(getPreviewPalette('shadcn-ui', 'light').colors);
    expect(rows).toHaveLength(expected.length + 1);
    expect(screen.getAllByText('Gagal').length).toBe(expected.filter((c) => !c.pass).length);
  });
});
