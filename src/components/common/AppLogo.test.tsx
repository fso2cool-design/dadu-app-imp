import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppLogo } from './AppLogo';

describe('AppLogo Component', () => {
  it('renders default full variant with title and subtitle', () => {
    render(<AppLogo variant="full" />);
    expect(screen.getByText('DADU')).toBeInTheDocument();
    expect(screen.getByText('Digitalisasi Data Guru')).toBeInTheDocument();
  });

  it('renders mark-only variant without text block', () => {
    render(<AppLogo variant="mark" />);
    expect(screen.queryByText('DADU')).not.toBeInTheDocument();
  });

  it('renders custom subtitle when provided in full variant', () => {
    render(<AppLogo variant="full" subtitle="Sistem Informasi Madrasah" />);
    expect(screen.getByText('Sistem Informasi Madrasah')).toBeInTheDocument();
  });

  it('renders correctly with animationMode="drop"', () => {
    const { container } = render(<AppLogo size={48} variant="mark" animationMode="drop" />);
    const logoContainer = container.querySelector('#dadu-app-logo');
    expect(logoContainer).toBeInTheDocument();
  });

  it('renders correctly with animationMode="loading"', () => {
    const { container } = render(<AppLogo size={64} variant="mark" animationMode="loading" />);
    const logoContainer = container.querySelector('#dadu-app-logo');
    expect(logoContainer).toBeInTheDocument();
  });

  it('renders static img fallback when animated is false', () => {
    render(<AppLogo animated={false} variant="mark" alt="Logo Statis DADU" />);
    const img = screen.getByAltText('Logo Statis DADU');
    expect(img).toBeInTheDocument();
  });

  it('fires onClick callback when clicked', () => {
    const handleClick = vi.fn();
    render(<AppLogo onClick={handleClick} variant="mark" />);
    const logoButton = screen.getByRole('img', { name: /Logo Resmi DADU/i });
    fireEvent.click(logoButton);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
