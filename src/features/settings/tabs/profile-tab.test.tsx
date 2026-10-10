import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileTab } from './ProfileTab';
import * as authModule from '../../auth/AuthContext';
import type { ProfileFormData } from './types';

describe('ProfileTab Account Permissions & Claim Recovery Affordance', () => {
  const mockRefreshAdminClaim = vi.fn();
  const mockSetProfileData = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockSetIsTeacherSigModalOpen = vi.fn();

  const dummyProfileData: ProfileFormData = {
    displayName: 'Ahmad Dahlan',
    nip: '19850101',
    nuptk: '12345',
    nik: '3201',
    phone: '081234',
    employmentStatus: 'PNS',
    mainSubject: 'Fikih',
    signatureUrl: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders non-admin status initially and allows manual synchronization', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('verified-admin');

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
    } as any);

    render(
      <ProfileTab
        profileData={dummyProfileData}
        setProfileData={mockSetProfileData}
        saving={false}
        onSubmit={mockOnSubmit}
        isTeacherSigModalOpen={false}
        setIsTeacherSigModalOpen={mockSetIsTeacherSigModalOpen}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    // Initial badge
    expect(screen.getByText('GURU (NON-ADMIN)')).toBeInTheDocument();

    const syncBtn = screen.getByRole('button', { name: /Sinkronkan Izin Token/i });
    expect(syncBtn).toBeInTheDocument();

    // Trigger sync
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(mockRefreshAdminClaim).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText('Hak administrator berhasil diverifikasi! Menu dan akses panel admin kini aktif.')
      ).toBeInTheDocument();
    });
  });

  it('shows warning advice when claim is still not-admin on server', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('not-admin');

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
    } as any);

    render(
      <ProfileTab
        profileData={dummyProfileData}
        setProfileData={mockSetProfileData}
        saving={false}
        onSubmit={mockOnSubmit}
        isTeacherSigModalOpen={false}
        setIsTeacherSigModalOpen={mockSetIsTeacherSigModalOpen}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /Sinkronkan Izin Token/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Klaim administratif belum aktif di server. Jika operator baru saja menetapkan izin, silakan logout lalu login ulang atau hubungi operator sistem.'
        )
      ).toBeInTheDocument();
    });
  });

  it('shows error advice when token claim verification fails due to network error', async () => {
    mockRefreshAdminClaim.mockResolvedValueOnce('verification-error');

    vi.spyOn(authModule, 'useAuth').mockReturnValue({
      isAdmin: false,
      adminStatus: 'not-admin',
      refreshAdminClaim: mockRefreshAdminClaim,
    } as any);

    render(
      <ProfileTab
        profileData={dummyProfileData}
        setProfileData={mockSetProfileData}
        saving={false}
        onSubmit={mockOnSubmit}
        isTeacherSigModalOpen={false}
        setIsTeacherSigModalOpen={mockSetIsTeacherSigModalOpen}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    const syncBtn = screen.getByRole('button', { name: /Sinkronkan Izin Token/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Gagal menghubungi server otentikasi. Periksa koneksi internet Anda.')
      ).toBeInTheDocument();
    });
  });
});
