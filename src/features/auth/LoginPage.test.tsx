import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authContextModule from './AuthContext';
import { LoginPage } from './LoginPage';

describe('LoginPage - Workflow Demo Removal & Auth Flows Preservation', () => {
  const mockLogin = vi.fn();
  const mockSignup = vi.fn();
  const mockResetPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      login: mockLogin,
      signup: mockSignup,
      logout: vi.fn(),
      resetPassword: mockResetPassword,
      refreshProfile: vi.fn(),
      adminStatus: { status: 'not-admin' },
      isSuperAdmin: false,
      isAdminOrSuperAdmin: false,
      isReadOnlyAdmin: false,
      adminClaimCheckCompleted: true,
      rawRole: 'TEACHER',
      activeRole: 'TEACHER',
      canSwitchRole: false,
      switchRole: vi.fn(),
    } as any);
  });

  describe('Workflow Demo Removal Verification', () => {
    it('does not render workflow demo button in the login card', () => {
      render(<LoginPage />);

      expect(document.getElementById('btn-open-workflow-demo')).toBeNull();
      expect(screen.queryByText(/Lihat simulasi alur kerja/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Demo 1 Menit/i)).not.toBeInTheDocument();
    });

    it('does not render workflow demo modal anywhere in the DOM', () => {
      render(<LoginPage />);

      expect(screen.queryByText(/Simulasi Alur Kerja Nyata Guru Mapel & Wali Kelas/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Simulasi Langsung Aplikasi/i)).not.toBeInTheDocument();
    });
  });

  describe('Preservation of Existing Authentication Flows', () => {
    it('renders login form elements by default', () => {
      render(<LoginPage />);

      expect(screen.getByRole('heading', { name: /Masuk ke Akun Guru/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Alamat Email/i)).toBeInTheDocument();
      expect(document.getElementById('auth-password')).toBeInTheDocument();
      expect(screen.getByLabelText(/Ingat sesi saya/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Masuk ke Akun/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lupa sandi\?/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Daftar Sekarang/i })).toBeInTheDocument();
    });

    it('submits login credentials correctly', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Alamat Email/i), { target: { value: 'guru@kemenag.go.id' } });
      fireEvent.change(document.getElementById('auth-password')!, { target: { value: 'password123' } });

      fireEvent.click(screen.getByRole('button', { name: /Masuk ke Akun/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('guru@kemenag.go.id', 'password123');
      });
    });

    it('displays error message on failed login', async () => {
      mockLogin.mockRejectedValueOnce({ code: 'auth/invalid-credential', message: 'Invalid credentials' });
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Alamat Email/i), { target: { value: 'wrong@test.com' } });
      fireEvent.change(document.getElementById('auth-password')!, { target: { value: 'wrongpass' } });

      fireEvent.click(screen.getByRole('button', { name: /Masuk ke Akun/i }));

      await waitFor(() => {
        expect(screen.getByText('Email atau kata sandi tidak cocok. Silakan periksa kembali.')).toBeInTheDocument();
      });
    });

    it('toggles password visibility', () => {
      render(<LoginPage />);

      const passwordInput = document.getElementById('auth-password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleBtn = screen.getByRole('button', { name: /Lihat kata sandi/i });
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');

      const hideBtn = screen.getByRole('button', { name: /Sembunyikan kata sandi/i });
      fireEvent.click(hideBtn);
      expect(passwordInput.type).toBe('password');
    });

    it('navigates to signup mode and submits new account registration', async () => {
      mockSignup.mockResolvedValueOnce(undefined);
      render(<LoginPage />);

      fireEvent.click(screen.getByRole('button', { name: /Daftar Sekarang/i }));

      expect(screen.getByRole('heading', { name: /Pendaftaran Akun Guru/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Nama Depan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nama Belakang \/ Gelar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Konfirmasi Kata Sandi/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Nama Depan/i), { target: { value: 'Ahmad' } });
      fireEvent.change(screen.getByLabelText(/Nama Belakang \/ Gelar/i), { target: { value: 'S.Pd.I' } });
      fireEvent.change(screen.getByLabelText(/Alamat Email/i), { target: { value: 'ahmad@kemenag.go.id' } });
      fireEvent.change(document.getElementById('auth-password')!, { target: { value: 'securepass123' } });
      fireEvent.change(screen.getByLabelText(/Konfirmasi Kata Sandi/i), { target: { value: 'securepass123' } });

      fireEvent.click(screen.getByRole('button', { name: /Daftarkan Akun Baru/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('ahmad@kemenag.go.id', 'securepass123', 'Ahmad S.Pd.I');
      });
    });

    it('navigates to forgot password mode, sends reset email, and returns to login', async () => {
      mockResetPassword.mockResolvedValueOnce(undefined);
      render(<LoginPage />);

      fireEvent.click(screen.getByRole('button', { name: /Lupa sandi\?/i }));

      expect(screen.getByRole('heading', { name: /Pemulihan Kata Sandi/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Kirim Link Reset Kata Sandi/i })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/Alamat Email/i), { target: { value: 'reset@kemenag.go.id' } });
      fireEvent.click(screen.getByRole('button', { name: /Kirim Link Reset Kata Sandi/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('reset@kemenag.go.id');
        expect(screen.getByText(/Link reset kata sandi telah dikirim ke email Anda/i)).toBeInTheDocument();
      });

      // Return to login
      fireEvent.click(screen.getByRole('button', { name: /Kembali ke halaman masuk/i }));
      expect(screen.getByRole('heading', { name: /Masuk ke Akun Guru/i })).toBeInTheDocument();
    });
  });
});
