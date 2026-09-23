import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('renders children correctly', () => {
    render(<Badge>Status Aktif</Badge>);
    expect(screen.getByText('Status Aktif')).toBeInTheDocument();
  });

  it('applies default styles when no variant or size is passed', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badgeElement = container.querySelector('span');
    expect(badgeElement).toHaveClass('bg-slate-100');
    expect(badgeElement).toHaveClass('px-2.5'); // md size default
  });

  it('applies success variant styles', () => {
    const { container } = render(<Badge variant="success">Berhasil</Badge>);
    const badgeElement = container.querySelector('span');
    expect(badgeElement).toHaveClass('bg-emerald-50');
    expect(badgeElement).toHaveClass('text-emerald-700');
  });

  it('applies danger variant styles', () => {
    const { container } = render(<Badge variant="danger">Gagal</Badge>);
    const badgeElement = container.querySelector('span');
    expect(badgeElement).toHaveClass('bg-rose-50');
    expect(badgeElement).toHaveClass('text-rose-700');
  });

  it('applies small size styles when size="sm"', () => {
    const { container } = render(<Badge size="sm">Small Tag</Badge>);
    const badgeElement = container.querySelector('span');
    expect(badgeElement).toHaveClass('px-2');
    expect(badgeElement).toHaveClass('py-0.5');
  });
});
