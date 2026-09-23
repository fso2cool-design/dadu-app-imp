import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';

describe('Alert Component', () => {
  it('renders default info alert with message', () => {
    render(<Alert>Informasi penting sistem</Alert>);
    expect(screen.getByText('Informasi penting sistem')).toBeInTheDocument();
  });

  it('renders title when title prop is provided', () => {
    render(<Alert title="Pemberitahuan">Pesan detail alert</Alert>);
    expect(screen.getByText('Pemberitahuan')).toBeInTheDocument();
    expect(screen.getByText('Pesan detail alert')).toBeInTheDocument();
  });

  it('applies error styling for error alert type', () => {
    const { container } = render(
      <Alert type="error" title="Gagal">
        Gagal memproses data
      </Alert>
    );

    const alertContainer = container.firstChild as HTMLElement;
    expect(alertContainer).toHaveClass('bg-rose-50');
    expect(alertContainer).toHaveClass('text-rose-800');
  });

  it('applies success styling for success alert type', () => {
    const { container } = render(
      <Alert type="success">
        Data berhasil disimpan
      </Alert>
    );

    const alertContainer = container.firstChild as HTMLElement;
    expect(alertContainer).toHaveClass('bg-emerald-50');
    expect(alertContainer).toHaveClass('text-emerald-800');
  });

  it('applies warning styling for warning alert type', () => {
    const { container } = render(
      <Alert type="warning">
        Periksa kembali data Anda
      </Alert>
    );

    const alertContainer = container.firstChild as HTMLElement;
    expect(alertContainer).toHaveClass('bg-amber-50');
    expect(alertContainer).toHaveClass('text-amber-800');
  });
});
