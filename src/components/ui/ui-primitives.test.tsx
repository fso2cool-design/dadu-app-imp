import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from './index';

const UI_DIR = dirname(fileURLToPath(import.meta.url));

describe('ui primitives: token-only styling (source scan)', () => {
  const sources = readdirSync(UI_DIR)
    .filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.'))
    .map((f) => ({ f, src: readFileSync(join(UI_DIR, f), 'utf8') }));

  it('scans every primitive file', () => {
    const names = sources.map((s) => s.f);
    expect(names).toEqual(expect.arrayContaining(['Button.tsx', 'Card.tsx', 'Input.tsx', 'Select.tsx']));
  });

  it.each(['Button.tsx', 'Card.tsx', 'Input.tsx', 'Select.tsx'])(
    '%s has no hex colours, dark: variants or legacy palette classes',
    (file) => {
      const src = sources.find((s) => s.f === file)?.src ?? '';
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src).not.toMatch(/\bdark:/);
      expect(src).not.toMatch(/\b(bg|text|border)-(white|black|slate|zinc|gray|orange|cyan)\b/);
      expect(src).toMatch(/var\(--ds-/);
    },
  );
});

describe('Button', () => {
  it('defaults to a non-submitting primary md button driven by --ds-* tokens', () => {
    render(<Button>Simpan</Button>);
    const btn = screen.getByRole('button', { name: 'Simpan' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveAttribute('data-variant', 'primary');
    expect(btn.className).toContain('bg-[var(--ds-accent)]');
    expect(btn.className).toContain('text-[var(--ds-accent-fg)]');
    expect(btn.className).toContain('ds-ui-control');
    expect(btn.className).toContain('h-10');
    expect(btn.style.borderRadius).toBe('var(--ds-radius-md)');
    expect(btn.style.borderWidth).toBe('var(--ds-border-width)');
    expect(btn.style.backgroundColor).toBe('');
  });

  it.each([
    ['secondary', 'bg-[var(--ds-surface-muted)]'],
    ['outline', 'border-[var(--ds-border)]'],
    ['ghost', 'border-transparent'],
    ['danger', 'bg-[var(--ds-danger-bg)]'],
  ] as const)('renders %s variant with its token class', (variant, cls) => {
    render(<Button variant={variant}>X</Button>);
    expect(screen.getByRole('button').className).toContain(cls);
  });

  it('applies size classes', () => {
    render(<Button size="lg">Besar</Button>);
    expect(screen.getByRole('button').className).toContain('h-12');
  });

  it('calls onClick when enabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Klik</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('loading disables the button and marks it busy', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Menyimpan
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /Menyimpan/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('respects explicit type="submit"', () => {
    render(<Button type="submit">Kirim</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

describe('Card', () => {
  it('renders all slots with token styling', () => {
    render(
      <Card data-testid="card" elevation="md">
        <CardHeader>
          <CardTitle>Judul</CardTitle>
          <CardDescription>Deskripsi</CardDescription>
        </CardHeader>
        <CardContent>Isi</CardContent>
        <CardFooter data-testid="footer">Aksi</CardFooter>
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-[var(--ds-surface-elevated)]');
    expect(card.className).toContain('p-5');
    expect(card.style.boxShadow).toBe('var(--ds-elevation-md)');
    expect(card.style.borderRadius).toBe('var(--ds-radius-lg)');
    expect(screen.getByRole('heading', { name: 'Judul' })).toBeInTheDocument();
    expect(screen.getByText('Deskripsi').className).toContain('text-[var(--ds-text-muted)]');
    expect(screen.getByTestId('footer').style.borderTop).toContain('var(--ds-border)');
  });

  it('supports padding="none"', () => {
    render(<Card data-testid="card" padding="none" />);
    expect(screen.getByTestId('card').className).toContain('p-0');
  });
});

describe('Input', () => {
  it('associates label and helper text', () => {
    render(<Input label="Nama siswa" helperText="Minimal 3 huruf" />);
    const input = screen.getByLabelText('Nama siswa');
    expect(input.className).toContain('bg-[var(--ds-input)]');
    expect(input.className).toContain('ds-ui-control');
    expect(input).not.toHaveAttribute('aria-invalid');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Minimal 3 huruf');
  });

  it('error state sets aria-invalid and describes the field with the error block', () => {
    render(<Input label="NISN" helperText="10 digit" error="NISN harus 10 digit." />);
    const input = screen.getByLabelText('NISN');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorEl = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    expect(errorEl?.textContent).toContain('NISN harus 10 digit.');
    expect(errorEl?.className).toContain('bg-[var(--ds-danger-bg)]');
    expect(errorEl?.className).toContain('text-[var(--ds-danger-fg)]');
    expect(screen.queryByText('10 digit')).not.toBeInTheDocument();
  });

  it('keeps a caller-provided aria-describedby', () => {
    render(<Input label="A" aria-describedby="hint" error="Salah" />);
    expect(screen.getByLabelText('A').getAttribute('aria-describedby')).toMatch(/^hint .+-error$/);
  });

  it('renders icons and pads around them', () => {
    render(<Input label="Cari" leftIcon={<span data-testid="ico" />} />);
    expect(screen.getByTestId('ico')).toBeInTheDocument();
    expect(screen.getByLabelText('Cari').className).toContain('pl-9');
  });

  it('forwards onChange', () => {
    const onChange = vi.fn();
    render(<Input label="Nilai" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Nilai'), { target: { value: '90' } });
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Select', () => {
  const options = [
    { value: '7A', label: 'Kelas 7A' },
    { value: '7B', label: 'Kelas 7B' },
  ];

  it('starts on the placeholder when uncontrolled', () => {
    render(<Select label="Kelas" placeholder="Pilih kelas" options={options} />);
    const select = screen.getByLabelText('Kelas') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(select.options).toHaveLength(3);
    expect(select.className).toContain('bg-[var(--ds-input)]');
  });

  it('fires onChange with the chosen value', () => {
    const onChange = vi.fn();
    render(<Select label="Kelas" options={options} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Kelas'), { target: { value: '7B' } });
    expect(onChange).toHaveBeenCalled();
    expect((screen.getByLabelText('Kelas') as HTMLSelectElement).value).toBe('7B');
  });

  it('error state sets aria-invalid', () => {
    render(<Select label="Kelas" options={options} error="Wajib dipilih" />);
    expect(screen.getByLabelText('Kelas')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Wajib dipilih')).toBeInTheDocument();
  });
});
