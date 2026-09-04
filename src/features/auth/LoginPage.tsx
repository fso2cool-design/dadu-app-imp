import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  ChevronLeft, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Mail, 
  User as UserIcon,
  BookOpen,
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { DaduLogo } from '../../components/common/DaduLogo';
import { KemenagLogo } from '../../components/common/KemenagLogo';
import { KemenagBerdampakLogo } from '../../components/common/KemenagBerdampakLogo';
import { APP_CONFIG } from '../../constants/app';

export const LoginPage: React.FC = () => {
  const { login, signup, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          throw new Error('Silakan isi email dan kata sandi.');
        }
        await login(email.trim(), password);
      } else if (mode === 'signup') {
        const full = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (!email.trim() || !password || !full) {
          throw new Error('Silakan lengkapi nama, email, dan kata sandi.');
        }
        if (password.length < 6) {
          throw new Error('Kata sandi minimal 6 karakter.');
        }
        if (password !== confirmPassword) {
          throw new Error('Konfirmasi kata sandi tidak cocok.');
        }
        await signup(email.trim(), password, full);
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Silakan masukkan email Anda untuk reset kata sandi.');
        }
        await resetPassword(email.trim());
        setSuccessMsg('Link reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Terjadi kesalahan pada proses autentikasi.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email ini sudah terdaftar. Silakan login atau gunakan reset password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Format alamat email tidak valid.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-3 sm:p-6 lg:p-8 select-none">
      {/* Subtle atmospheric ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-600/10 via-teal-500/10 to-amber-500/10 blur-3xl opacity-70" />
      </div>

      {/* Main Split-Screen Container */}
      <div className="relative w-full max-w-lg lg:max-w-5xl bg-white text-slate-900 rounded-3xl lg:rounded-[36px] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-slate-800/60 min-h-0">
        
        {/* ======================================================== */}
        {/* === LEFT BRANDING PANEL (KEMENAG & DADU SHOWCASE)   === */}
        {/* ======================================================== */}
        <div className="relative bg-[#0F1420] text-white p-6 sm:p-8 lg:p-10 lg:w-5/12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          
          {/* TOP SECTION: Kemenag RI Official Identity Header */}
          <div>
            {/* Header Controls (Back button when in signup or forgot mode) */}
            <div className="flex items-center justify-between min-h-[32px] mb-3">
              {mode !== 'login' ? (
                <button
                  id="btn-back-to-login"
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/50 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                  title="Kembali ke Login"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali Masuk</span>
                </button>
              ) : (
                <div />
              )}

              {mode === 'signup' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                  Pendaftaran Akun Guru
                </span>
              )}
            </div>

            {/* Official Kemenag RI Branding Block */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800/70">
              <KemenagLogo size="md" withGlow className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-100 leading-snug">
                  Kementerian Agama RI
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-emerald-400 tracking-wide leading-tight">
                  Direktorat Jenderal Pendidikan Islam
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: DADU System Title & Feature Highlights */}
          <div className="my-6 lg:my-8 space-y-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">
                {APP_CONFIG.shortName} Workspace
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-300 font-normal leading-relaxed mt-1.5">
                Sistem tunggal terintegrasi untuk pengelolaan agenda tatap muka, presensi harian siswa, jurnal guru, dan legger nilai akademik madrasah.
              </p>
            </div>

            {/* Feature Highlights Badges (Desktop/Tablet) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-full bg-amber-950/80 border border-amber-700/60 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3 h-3 text-amber-400" />
                </div>
                <span>Agenda Tatap Muka & Jurnal Pembelajaran Guru</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-5 h-5 rounded-full bg-sky-950/80 border border-sky-700/60 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-3 h-3 text-sky-400" />
                </div>
                <span>Legger Nilai Otomatis & Presensi Terpadu</span>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: DADU Logo & Kemenag Berdampak Side-by-Side */}
          <div className="pt-4 border-t border-slate-800/70">
            {/* Dock Card containing both DADU Logo and Kemenag Berdampak Logo side-by-side */}
            <div className="bg-[#141A28] border border-slate-700/70 rounded-2xl p-3 flex items-center justify-around gap-4 shadow-inner">
              {/* Left Side: DADU Brand Identity */}
              <div className="flex items-center gap-2.5 group">
                <DaduLogo size="md" withGlow className="shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white tracking-tight leading-tight">
                    {APP_CONFIG.shortName}
                  </span>
                  <span className="text-[9px] text-amber-400 font-medium leading-tight">
                    Digitalisasi Data Guru
                  </span>
                </div>
              </div>

              {/* Elegant Vertical Divider */}
              <div className="w-px h-8 bg-slate-700/80 shrink-0" />

              {/* Right Side: Kemenag Berdampak Official Brand */}
              <div className="flex items-center group">
                <KemenagBerdampakLogo size="md" />
              </div>
            </div>

            {/* Version Sub-footer */}
            <div className="flex items-center justify-start text-[10px] text-slate-500 pt-3">
              <span>{APP_CONFIG.shortName} {APP_CONFIG.versionDisplay}</span>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* === RIGHT AUTHENTICATION FORM BODY                  === */}
        {/* ======================================================== */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white">
          <div>
            {/* Form Mode Header */}
            <div className="mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                <span>Madrasah Digital Workspace</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
                {mode === 'login' ? 'Masuk ke Akun Guru' : mode === 'signup' ? 'Pendaftaran Akun Baru' : 'Pemulihan Kata Sandi'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {mode === 'login' 
                  ? 'Silakan masukkan email madrasah dan kata sandi Anda untuk mengakses workspace' 
                  : mode === 'signup' 
                  ? 'Lengkapi identitas pendidik untuk menginisialisasi ruang kerja baru' 
                  : 'Masukkan email terdaftar untuk menerima tautan instruksi reset kata sandi'}
              </p>
            </div>

            {/* Error Message Notice */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Message Notice */}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Sign Up Fields: First Name & Last Name */}
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                    <label htmlFor="signup-first-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Nama Lengkap Depan
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        id="signup-first-name"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ahmad"
                        className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                    <label htmlFor="signup-last-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Gelar / Nama Belakang
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        id="signup-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="S.Pd.I., M.Pd."
                        className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Input Field */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                <label htmlFor="auth-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Alamat Email Pendidik
                </label>
                <div className="flex items-center gap-2.5 mt-1">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email Anda"
                    className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Password Input Field */}
              {mode !== 'forgot' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                  <label htmlFor="auth-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Kata Sandi Akun
                  </label>
                  <div className="flex items-center gap-2.5 mt-1">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      id="auth-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Confirm Password (Sign up mode only) */}
              {mode === 'signup' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                  <label htmlFor="signup-confirm-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ulangi Kata Sandi
                  </label>
                  <div className="flex items-center gap-2.5 mt-1">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      id="signup-confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Action Links: Forgot Password & Sign up (Login Mode) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-600 font-medium">
                  <button
                    id="btn-forgot-password-link"
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                  >
                    Lupa kata sandi?
                  </button>
                  <button
                    id="btn-create-account-link"
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="text-emerald-700 hover:text-emerald-800 hover:underline font-semibold cursor-pointer transition-colors"
                  >
                    Daftar akun pendidik
                  </button>
                </div>
              )}

              {/* Forgot mode back link */}
              {mode === 'forgot' && (
                <div className="text-center pt-2">
                  <button
                    id="btn-back-login-link"
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-xs text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer"
                  >
                    Kembali ke halaman masuk
                  </button>
                </div>
              )}

              {/* Primary Submit Button */}
              <div className="pt-3 sm:pt-5 pb-1">
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-emerald-800/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memverifikasi kredensial...
                    </span>
                  ) : mode === 'login' ? (
                    'Masuk Workspace'
                  ) : mode === 'signup' ? (
                    'Daftarkan Akun Guru Baru'
                  ) : (
                    'Kirim Link Reset Kata Sandi'
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Institutional Trust Footer Note */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Administrasi Guru Terpadu</span>
            <span>Kemenag Berdampak • 2026</span>
          </div>
        </div>

      </div>
    </div>
  );
};

