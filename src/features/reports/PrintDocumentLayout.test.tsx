import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { AuthProvider } from '../auth/AuthContext';
import { createMockApplicationOperations } from '../../test/mocks/mockApplication';

let authStateCallback: ((user: any) => void) | null = null;
const mockUnsubscribe = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authStateCallback = callback;
    return mockUnsubscribe;
  }),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../../services/firebase/config', () => ({
  auth: { app: { name: '[DEFAULT]' } },
  db: {},
}));

const mockGetSchoolSettings = vi.fn();
const mockGetDocumentSettings = vi.fn();

const mockApp = createMockApplicationOperations({
  auth: {
    getProfile: vi.fn().mockResolvedValue({
      uid: 'user-print-1',
      displayName: 'Guru Cetak',
      role: 'TEACHER',
    }),
    onAuthStateChanged: vi.fn((cb) => { 
      if (typeof authStateCallback !== 'undefined' && authStateCallback) { 
        // will be triggered in test
      } else { 
        cb({ uid: 'test-user-id', email: 'test@example.com' }); 
      } 
      return vi.fn(); 
    }),
  },
  settings: {
    getSchoolSettings: mockGetSchoolSettings,
    getDocumentSettings: mockGetDocumentSettings,
  },
});

describe('Print Isolation & Screen Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockGetSchoolSettings.mockResolvedValue({
      schoolName: 'Madrasah Hebat',
      headmasterName: 'Drs. H. Ahmad',
      city: 'Jakarta',
    });
    mockGetDocumentSettings.mockResolvedValue({
      showLetterhead: true,
      showSignatures: true,
      paperSize: 'A4',
      orientation: 'PORTRAIT',
    });
  });

  it('renders printable document on screen while isolating controls with .no-print classes', async () => {
    render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <PrintDocumentLayout title="Laporan Hasil Belajar">
            <div data-testid="document-content">Tabel Nilai Siswa</div>
          </PrintDocumentLayout>
        </AuthProvider>
      </ApplicationProvider>
    );

    expect(screen.getByText('Laporan Hasil Belajar')).toBeInTheDocument();
    expect(screen.getByTestId('document-content')).toBeInTheDocument();

    const printButton = screen.getByRole('button', { name: /Cetak Dokumen/i });
    expect(printButton).toBeInTheDocument();

    const noPrintElements = document.querySelectorAll('.no-print');
    expect(noPrintElements.length).toBeGreaterThan(0);

    const printableArea = screen.getByTestId('document-content').closest('.no-print');
    expect(printableArea).toBeNull();
  });

  it('initializes paper size, orientation and @page style from document settings when props are not specified', async () => {
    mockGetDocumentSettings.mockResolvedValue({
      showLetterhead: true,
      showSignatures: true,
      paperSize: 'F4',
      orientation: 'LANDSCAPE',
    });

    const { container } = render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <PrintDocumentLayout title="Laporan Rekap">
            <div data-testid="document-content">Konten F4 Landscape</div>
          </PrintDocumentLayout>
        </AuthProvider>
      </ApplicationProvider>
    );

    await waitFor(() => {
      const docWrapper = container.querySelector('.printable-document');
      expect(docWrapper).toHaveAttribute('data-paper', 'F4');
      expect(docWrapper).toHaveAttribute('data-orientation', 'LANDSCAPE');
    });

    const styleEl = container.querySelector('style');
    expect(styleEl?.innerHTML).toContain('size: 330mm 215mm');
  });

  it('prioritizes explicit paper props over documentSettings defaults', async () => {
    mockGetDocumentSettings.mockResolvedValue({
      showLetterhead: true,
      showSignatures: true,
      paperSize: 'A4',
      orientation: 'PORTRAIT',
    });

    const { container } = render(
      <ApplicationProvider app={mockApp}>
        <AuthProvider>
          <PrintDocumentLayout
            title="Legger Nilai"
            paperSize="F4"
            paperOrientation="LANDSCAPE"
          >
            <div data-testid="document-content">Tabel Legger F4</div>
          </PrintDocumentLayout>
        </AuthProvider>
      </ApplicationProvider>
    );

    await waitFor(() => {
      const docWrapper = container.querySelector('.printable-document');
      expect(docWrapper).toHaveAttribute('data-paper', 'F4');
      expect(docWrapper).toHaveAttribute('data-orientation', 'LANDSCAPE');
    });

    const styleEl = container.querySelector('style');
    expect(styleEl?.innerHTML).toContain('size: 330mm 215mm');
  });
});