import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { ApplicationProvider } from '../../application/ApplicationContext';
import { AuthProvider } from '../auth/AuthContext';
import type { ApplicationOperations } from '../../application/types';

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

const mockApp: ApplicationOperations = {
  auth: {
    getProfile: vi.fn().mockResolvedValue({
      uid: 'user-print-1',
      displayName: 'Guru Cetak',
      role: 'TEACHER',
    }),
    createProfile: vi.fn(),
    recordLastLogin: vi.fn(),
    updateProfile: vi.fn(),
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
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
    getSchoolSettings: vi.fn().mockResolvedValue({
      schoolName: 'Madrasah Hebat',
      headmasterName: 'Drs. H. Ahmad',
      city: 'Jakarta',
    }),
    getDocumentSettings: vi.fn().mockResolvedValue({
      showLetterhead: true,
      showSignatures: true,
      city: 'Jakarta',
    }),
  },
} as any;

describe('Print Isolation & Screen Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
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

    // Verify document content renders correctly on screen
    expect(screen.getByText('Laporan Hasil Belajar')).toBeInTheDocument();
    expect(screen.getByTestId('document-content')).toBeInTheDocument();

    // Verify print actions/toolbar exist and carry no-print isolation classes
    const printButton = screen.getByRole('button', { name: /Cetak Dokumen/i });
    expect(printButton).toBeInTheDocument();

    // Find all elements marked with no-print
    const noPrintElements = document.querySelectorAll('.no-print');
    expect(noPrintElements.length).toBeGreaterThan(0);

    // Ensure the main printable document does NOT have .no-print (it must be visible in print media)
    const printableArea = screen.getByTestId('document-content').closest('.no-print');
    expect(printableArea).toBeNull();
  });
});
