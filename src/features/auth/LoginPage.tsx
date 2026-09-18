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
  GraduationCap, 
  Play, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  ShieldCheck,
  Check,
  CalendarCheck
} from 'lucide-react';
import { WorkflowDemoModal } from './WorkflowDemoModal';
import { Logo } from '../../components/common/Logo';
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
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-200">
      {/* Background Architectural Geometry (Subtle Islamic Arch & Grid Motif) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft top emerald glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-b from-emerald-500/10 dark:from-emerald-500/5 via-teal-500/5 to-transparent blur-3xl" />
        {/* Delicate structural grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px]" 
          aria-hidden="true" 
        />
      </div>

      {/* Top Header Bar (Institutional Context) */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2 sm:py-3 mb-2 sm:mb-4">
        <div className="flex items-center gap-3">
          <KemenagLogo size="md" className="shrink-0" />
          <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 block leading-tight">
              Kementerian Agama RI
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 block leading-tight mt-0.5">
              Direktorat Jenderal Pendidikan Islam
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-mono">
          <span>{APP_CONFIG.shortName}</span>
          <span>{APP_CONFIG.versionDisplay}</span>
        </div>
      </header>

      {/* Main Elevated Card Container */}
      <main className="relative z-10 w-full max-w-[440px] my-auto">
        <div className="bg-white dark:bg-[#121622] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-200/50 dark:shadow-black/40 p-6 sm:p-8 lg:p-9 transition-all">
          
          {/* Brand Header Inside Card */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <Logo size={44} animated={false} />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' ? 'Masuk ke Akun Guru' : mode === 'signup' ? 'Pendaftaran Akun Guru' : 'Pemulihan Kata Sandi'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xs">
              {mode === 'login' 
                ? 'Portal digitalisasi administrasi guru, jurnal KBM, dan pelaporan nilai madrasah.' 
                : mode === 'signup' 
                ? 'Lengkapi data pendidik untuk menginisialisasi ruang kerja baru Anda.' 
                : 'Masukkan alamat email terdaftar untuk menerima tautan pemulihan sandi.'}
            </p>

            {mode !== 'login' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Kembali ke halaman masuk</span>
              </button>
            )}
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Success Notice */}
          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Sign Up Fields: First Name & Last Name */}
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-first-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Depan <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      id="signup-first-name"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Nama depan"
                      className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-last-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Belakang / Gelar
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="signup-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Gelar (S.Pd.I)"
                      className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email Input Field */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Alamat Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan alamat email"
                  className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Password Input Field */}
            {mode !== 'forgot' && (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Sign up mode only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi Anda"
                    className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Remember Me & Forgot Password (Login Mode) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>Ingat sesi saya</span>
                </label>
                <button
                  id="btn-forgot-password-link"
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium cursor-pointer transition-colors"
                >
                  Lupa sandi?
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading}
                className="w-full h-11 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Akun</span>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftarkan Akun Baru</span>
                  </>
                ) : (
                  'Kirim Link Reset Kata Sandi'
                )}
              </button>
            </div>

            {/* Switch to Sign up or Login */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
              {mode === 'login' ? (
                <p>
                  Belum memiliki akun pendidik?{' '}
                  <button
                    id="btn-create-account-card"
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Daftar Sekarang
                  </button>
                </p>
              ) : (
                <p>
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Masuk di sini
                  </button>
                </p>
              )}
            </div>

            {/* Compact Discreet Demo Link */}
            <div className="pt-1 text-center">
              <button
                id="btn-open-workflow-demo"
                type="button"
                onClick={() => setIsDemoOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer py-1"
              >
                <Play className="w-3 h-3 text-emerald-600 fill-emerald-600/20" />
                <span>Lihat simulasi alur kerja (Demo 1 Menit)</span>
              </button>
            </div>

          </form>

        </div>

        {/* Card Trust & Security Badges */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Data Aman Terisolasi Per Pendidik</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Kemenag RI</span>
        </div>
      </main>

      {/* Institutional Bottom Footer */}
      <footer className="relative z-10 w-full max-w-5xl py-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-4">
        <div className="flex items-center gap-2">
          <KemenagBerdampakLogo size="sm" />
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden sm:inline">Kurikulum Merdeka & Standar Penilaian Resmi</span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          Dadu (Digitalisasi Data Guru) © 2026
        </div>
      </footer>

      {/* Workflow Demo Modal */}
      <WorkflowDemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onStartSignUp={() => {
          setMode('signup');
          setError(null);
        }}
      />
    </div>
  );
};


