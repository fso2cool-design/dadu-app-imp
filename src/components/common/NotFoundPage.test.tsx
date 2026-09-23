import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotFoundPage Component', () => {
  it('renders 404 indicator and not-found message', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Halaman Tidak Ditemukan')).toBeInTheDocument();
    expect(screen.getByText('Kembali')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('navigates back when clicking "Kembali"', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    const backButton = screen.getByText('Kembali');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('calls onNavigate callback when provided upon clicking "Dashboard"', () => {
    const handleNavigate = vi.fn();
    render(
      <MemoryRouter>
        <NotFoundPage onNavigate={handleNavigate} />
      </MemoryRouter>
    );

    const homeButton = screen.getByText('Dashboard');
    fireEvent.click(homeButton);

    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('navigates to /dashboard directly if onNavigate is not provided', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    const homeButton = screen.getByText('Dashboard');
    fireEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
