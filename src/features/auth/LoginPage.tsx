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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-8 relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic atmospheric subtle background lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-emerald-600/15 via-teal-900/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-950/40 blur-3xl rounded-full opacity-50" />
      </div>

      {/* Main Split-Screen Shell Container */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col lg:flex-row border border-slate-800/80">
        
        {/* ========================================================================= */}
        {/* === LEFT BRAND / VALUE PROPOSITION PANEL (MADRASAH ISLAMIC IDENTITY) === */}
        {/* ========================================================================= */}
        <div className="relative bg-[#022b27] text-white p-6 sm:p-8 lg:p-10 lg:w-[48%] flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-emerald-900/60">
          
          {/* Subtle Islamic Geometrical Matrix Pattern Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:20px_20px]" 
            aria-hidden="true" 
          />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute top-1/3 -right-20 w-72 h-72 bg-teal-400/10 blur-3xl rounded-full pointer-events-none" />

          {/* TOP SECTION: Kemenag RI Institutional Header & Back Control */}
          <div className="relative z-10">
            {mode !== 'login' ? (
              <div className="flex items-center justify-between mb-5">
                <button
                  id="btn-back-to-login"
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200 hover:text-white bg-emerald-900/50 hover:bg-emerald-800/60 px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer border border-emerald-700/50"
                  title="Kembali ke Halaman Masuk"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Kembali Masuk</span>
                </button>

                {mode === 'signup' && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-600/40">
                    Pendaftaran Pendidik
                  </span>
                )}
                {mode === 'forgot' && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-600/40">
                    Bantuan Akun
                  </span>
                )}
              </div>
            ) : null}

            {/* Official Kemenag RI Branding Block */}
            <div className="flex items-center gap-3">
              <KemenagLogo size="md" withGlow className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-white leading-snug">
                  Kementerian Agama RI
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-emerald-300/90 tracking-wide leading-tight mt-0.5">
                  Direktorat Jenderal Pendidikan Islam
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: DADU Title, Subtitle, and 3 Value Propositions */}
          <div className="relative z-10 my-6 lg:my-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold tracking-wide mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{APP_CONFIG.tagline}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Dadu <span className="text-emerald-400 font-semibold">Workspace</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 font-normal leading-relaxed mt-2 max-w-sm">
                Sistem administrasi digital guru madrasah terpadu untuk efisiensi KBM, presensi presisi, dan pelaporan akademik resmi.
              </p>
            </div>

            {/* 3 Core Value Propositions (Clean & Focused) */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-xl border border-emerald-500/40 bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5 text-emerald-300 shadow-sm">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-[13px] font-semibold text-white leading-snug">
                    Agenda Tatap Muka & Presensi Mapel
                  </h2>
                  <p className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Catat jurnal mengajar dan kehadiran siswa secara instan di setiap jam KBM.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-xl border border-emerald-500/40 bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5 text-emerald-300 shadow-sm">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-[13px] font-semibold text-white leading-snug">
                    Buku Nilai & Legger Otomatis
                  </h2>
                  <p className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Pengelolaan nilai formatif dan sumatif dengan rekapitulasi nilai rapor otomatis.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-xl border border-emerald-500/40 bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5 text-emerald-300 shadow-sm">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-[13px] font-semibold text-white leading-snug">
                    Ruang Wali Kelas & Rapor Kurikulum Merdeka
                  </h2>
                  <p className="text-[11px] text-emerald-200/70 mt-0.5 leading-snug">
                    Monitoring kehadiran guru mapel, jadwal kelas, dan pencetakan rapor berstandar Kemenag.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Kemenag Berdampak & Institutional Security Footer */}
          <div className="relative z-10 pt-4 border-t border-emerald-900/80">
            <div className="bg-[#031d1b] border border-emerald-800/60 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2">
                <Logo size={28} className="shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block leading-tight truncate">
                    {APP_CONFIG.shortName}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 block leading-tight truncate">
                    {APP_CONFIG.versionDisplay}
                  </span>
                </div>
              </div>
              <div className="w-px h-6 bg-emerald-800/80 shrink-0" />
              <div className="flex items-center">
                <KemenagBerdampakLogo size="sm" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-emerald-300/70 pt-3 px-0.5">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Data Aman Terisolasi Per Pendidik</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400/80">Kemenag RI</span>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* === RIGHT FORM PANEL (CLEAN WHITE & EMERALD ACCENT) === */}
        {/* ======================================================== */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-white text-slate-900">
          <div className="w-full max-w-md mx-auto">
            
            {/* Top Brand / Motif Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#2A103E] to-[#12061C] border border-fuchsia-500/30 flex items-center justify-center shadow-lg shadow-fuchsia-950/20 transition-transform hover:scale-105 duration-200">
                <Logo size={36} />
              </div>
            </div>

            {/* Form Mode Title & Subtitle */}
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login' ? 'Masuk ke Akun Guru' : mode === 'signup' ? 'Pendaftaran Akun Guru Baru' : 'Pemulihan Kata Sandi'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                {mode === 'login' 
                  ? 'Silakan masukkan email dan kata sandi Anda untuk mengakses workspace.' 
                  : mode === 'signup' 
                  ? 'Lengkapi data pendidik untuk menginisialisasi ruang kerja baru Anda.' 
                  : 'Masukkan alamat email terdaftar untuk menerima link reset kata sandi.'}
              </p>
            </div>

            {/* Error Notice */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Notice */}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Sign Up Fields: First Name & Last Name */}
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="signup-first-name" className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="signup-last-name" className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Belakang / Gelar
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="signup-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Gelar (S.Pd.I)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Input Field */}
              <div>
                <label htmlFor="auth-email" className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                  />
                </div>
              </div>

              {/* Password Input Field */}
              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="auth-password" className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
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
                  <label htmlFor="signup-confirm-password" className="block text-[11px] font-semibold text-slate-700 mb-1">
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 placeholder-slate-400 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Remember Me & Forgot Password (Login Mode) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Ingat saya</span>
                  </label>
                  <button
                    id="btn-forgot-password-link"
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-emerald-700 hover:text-emerald-800 hover:underline font-semibold cursor-pointer transition-colors"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
              )}

              {/* Forgot mode back button */}
              {mode === 'forgot' && (
                <div className="text-center pt-1">
                  <button
                    id="btn-back-login-link"
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Kembali ke halaman masuk
                  </button>
                </div>
              )}

              {/* Primary Action Button */}
              <div className="pt-2">
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

              {/* Secondary Navigation Divider & Register Link */}
              {mode === 'login' && (
                <div className="pt-2">
                  <div className="relative flex items-center justify-center mb-3">
                    <div className="w-full border-t border-slate-200" />
                    <span className="absolute bg-white px-3 text-[11px] font-medium text-slate-400">
                      atau
                    </span>
                  </div>

                  <button
                    id="btn-create-account-card"
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    <span>Daftar Akun Guru Baru</span>
                  </button>
                </div>
              )}

              {/* Interactive Workflow Demo Link */}
              <div className="pt-1">
                <button
                  id="btn-open-workflow-demo"
                  type="button"
                  onClick={() => setIsDemoOpen(true)}
                  className="w-full p-3 rounded-xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-200 text-left flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-emerald-950 group-hover:text-emerald-900 leading-snug">
                      Simulasi Alur Kerja Guru (1 Menit Demo)
                    </span>
                    <span className="block text-[11px] text-emerald-700/80 leading-snug truncate">
                      Lihat bagaimana Dadu memudahkan administrasi harian Anda.
                    </span>
                  </div>
                </button>
              </div>

            </form>
          </div>

          {/* Institutional Trust Footer Note */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 max-w-md mx-auto w-full">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Administrasi Guru Digital Terpadu</span>
            </div>
            <span>Kemenag Berdampak • 2026</span>
          </div>
        </div>

      </div>

      {/* Workflow Demo Modal (Mandiri / Zero Functional Impact) */}
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


