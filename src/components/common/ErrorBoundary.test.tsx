import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// Helper component that throws on demand
const ProblemChild = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test crash in component');
  }
  return <div>Konten Halaman Normal</div>;
};

// Resettable wrapper to test retry behavior
const ResettableContainer = ({ onReset }: { onReset?: () => void }) => {
  const [hasError, setHasError] = useState(true);

  return (
    <ErrorBoundary
      onReset={() => {
        setHasError(false);
        onReset?.();
      }}
    >
      <ProblemChild shouldThrow={hasError} />
    </ErrorBoundary>
  );
};

describe('ErrorBoundary Component', () => {
  let originalError: typeof console.error;

  beforeEach(() => {
    originalError = console.error;
    // Suppress console.error during tests that trigger deliberate errors
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Konten Halaman Normal')).toBeInTheDocument();
  });

  it('catches render error and displays default fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Terjadi Kendala pada Halaman Ini')).toBeInTheDocument();
    expect(screen.getByText(/Sistem mendeteksi kendala/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coba Lagi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ke Dashboard/i })).toBeInTheDocument();
  });

  it('allows custom fallbackTitle and fallbackMessage', () => {
    render(
      <ErrorBoundary
        fallbackTitle="Kendala Modul Siswa"
        fallbackMessage="Gagal memuat daftar siswa."
      >
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Kendala Modul Siswa')).toBeInTheDocument();
    expect(screen.getByText('Gagal memuat daftar siswa.')).toBeInTheDocument();
  });

  it('toggles diagnostic error information when clicked', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const toggleButton = screen.getByRole('button', { name: /Informasi Diagnostik Error/i });
    expect(screen.queryByText(/Error: Test crash in component/i)).not.toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.getByText(/Error: Test crash in component/i)).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.queryByText(/Error: Test crash in component/i)).not.toBeInTheDocument();
  });

  it('resets error state and calls onReset when Coba Lagi is clicked', () => {
    const handleReset = vi.fn();
    render(<ResettableContainer onReset={handleReset} />);

    // Initially shows error
    expect(screen.getByText('Terjadi Kendala pada Halaman Ini')).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByRole('button', { name: /Coba Lagi/i });
    fireEvent.click(retryButton);

    expect(handleReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Konten Halaman Normal')).toBeInTheDocument();
  });

  it('applies root layout styling when isRoot is true', () => {
    render(
      <ErrorBoundary isRoot>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const alertContainer = screen.getByRole('alert');
    expect(alertContainer).toHaveClass('min-h-screen');
  });
});
