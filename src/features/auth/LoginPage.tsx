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
  ShieldCheck
} from 'lucide-react';
import { WorkflowDemoModal } from './WorkflowDemoModal';
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
    <div className="min-h-screen bg-[#071318] flex items-center justify-center p-3 sm:p-6 lg:p-10 select-none relative overflow-x-hidden">
      {/* Subtle organic mosque & light gradient atmospheric glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-800/15 via-[#004D40]/20 to-teal-900/10 blur-3xl opacity-80" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-3xl rounded-full" />
      </div>

      {/* Main Dual-Pane Card Container */}
      <div className="relative w-full max-w-lg lg:max-w-5xl bg-white text-slate-900 rounded-[32px] sm:rounded-[36px] shadow-[0_24px_70px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col lg:flex-row border border-emerald-950/40 min-h-0">
        
        {/* ======================================================== */}
        {/* === LEFT BRANDING PANEL (MADRASAH / KEMENAG THEME)  === */}
        {/* ======================================================== */}
        <div className="relative bg-[#022B27] text-white p-7 sm:p-9 lg:p-11 lg:w-[46%] flex flex-col justify-between overflow-hidden">
          
          {/* Subtle Madrasah Arch & Islamic Geometric Architecture Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute -right-16 top-1/4 w-80 h-80 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
          
          {/* Subtle architectural silhouette effect in background */}
          <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-15 pointer-events-none flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 400 400" className="w-full h-full object-cover text-emerald-300" fill="currentColor">
              <path d="M200 60 C150 140 100 200 100 320 L300 320 C300 200 250 140 200 60 Z" opacity="0.4" />
              <path d="M140 220 C140 180 170 160 200 160 C230 160 260 180 260 220 L260 320 L140 320 Z" opacity="0.5" />
            </svg>
          </div>

          {/* TOP SECTION: Kemenag RI Official Identity Header */}
          <div className="relative z-10">
            {/* Header Controls (Back button when in signup or forgot mode) */}
            {mode !== 'login' && (
              <div className="flex items-center justify-between mb-4">
                <button
                  id="btn-back-to-login"
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-white hover:bg-emerald-900/60 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                  title="Kembali ke Login"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali Masuk</span>
                </button>

                {mode === 'signup' && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-600/50">
                    Pendaftaran Pendidik
                  </span>
                )}
              </div>
            )}

            {/* Official Kemenag RI Branding Block */}
            <div className="flex items-center gap-3.5">
              <KemenagLogo size="md" withGlow className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] sm:text-[13px] font-extrabold uppercase tracking-wider text-white leading-snug">
                  Kementerian Agama RI
                </div>
                <div className="text-[11px] sm:text-[12px] font-semibold text-emerald-300 tracking-wide leading-tight mt-0.5">
                  Direktorat Jenderal Pendidikan Islam
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: DADU Title & Narrative Points */}
          <div className="relative z-10 my-8 lg:my-10 space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-white tracking-tight font-serif leading-none">
                Dadu
              </h1>
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-emerald-400 tracking-tight font-serif leading-none mt-1">
                Workspace
              </h2>
              <p className="text-xs sm:text-[13px] text-emerald-100/85 font-normal leading-relaxed mt-4 max-w-sm">
                Sistem terintegrasi untuk memudahkan pengelolaan agenda tatap muka, presensi siswa, jurnal guru, dan penilaian akademik madrasah.
              </p>
            </div>

            {/* Feature Highlights Badges with Round Accent Icons */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full border border-amber-400/80 bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5 text-amber-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                    Agenda Tatap Muka & Jurnal Pembelajaran
                  </h4>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-snug">
                    Kelola agenda mengajar dan jurnal KBM dengan mudah.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full border border-cyan-400/80 bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5 text-cyan-300">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-[13px] font-bold text-white leading-snug">
                    Presensi Terpadu & Legger Nilai Otomatis
                  </h4>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5 leading-snug">
                    Presensi harian siswa dan rekap nilai otomatis lebih akurat dan efisien.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Dadu Mendukung & Kemenag Berdampak Dock */}
          <div className="relative z-10 pt-4">
            <div className="bg-[#031C1A]/85 border border-emerald-800/60 rounded-2xl p-3.5 shadow-inner">
              <div className="text-[10px] font-bold text-emerald-300/90 uppercase tracking-wider mb-2">
                Dadu Mendukung
              </div>
              <div className="flex items-center justify-between gap-3">
                {/* Left: Dadu Brand */}
                <div className="flex items-center gap-2.5">
                  <DaduLogo size="sm" withGlow className="shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">
                      {APP_CONFIG.shortName}
                    </span>
                    <span className="text-[9px] text-emerald-300 font-medium block leading-tight">
                      Digitalisasi Data Guru
                    </span>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-7 bg-emerald-800/80 shrink-0" />

                {/* Right: Kemenag Berdampak */}
                <div className="flex items-center">
                  <KemenagBerdampakLogo size="sm" />
                </div>
              </div>
            </div>

            {/* Institutional Security Badge & Version */}
            <div className="flex items-center justify-between text-[10px] text-emerald-300/80 pt-3.5 px-0.5">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Aman, Terpercaya, Terintegrasi</span>
              </div>
              <span className="font-mono text-emerald-400/80">{APP_CONFIG.shortName} ver. {APP_CONFIG.versionDisplay}</span>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* === RIGHT FORM PANEL (WHITE & CLEAN EMERALD ACCENT) === */}
        {/* ======================================================== */}
        <div className="flex-1 p-7 sm:p-9 lg:p-11 flex flex-col justify-between bg-white">
          <div>
            {/* Top Mosque Motif Icon */}
            <div className="flex justify-center mb-3">
              <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
                <svg viewBox="0 0 48 48" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Mosque Dome and Minaret Icon */}
                  <path d="M24 6 C24 4 23 3 24 3 C25 3 24 4 24 6 Z" />
                  <path d="M24 6 C20 12 16 16 16 22 L32 22 C32 16 28 12 24 6 Z" fill="currentColor" fillOpacity="0.12" />
                  <path d="M12 22 L36 22 L36 38 L12 38 Z" />
                  <path d="M20 38 L20 28 C20 25.8 21.8 24 24 24 C26.2 24 28 25.8 28 28 L28 38" />
                  <circle cx="24" cy="5" r="1.5" fill="currentColor" />
                  {/* Crescent moon atop */}
                  <path d="M22.5 3.5 C23.5 2.5 25.5 2.5 26 3.8 C24.8 3.6 23.5 4.5 23.8 5.8 C22.8 5.2 22.2 4.2 22.5 3.5 Z" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Form Mode Header */}
            <div className="text-center mb-6">
              <div className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest mb-1">
                Madrasah Digital Workspace
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif tracking-tight">
                {mode === 'login' ? 'Masuk ke Akun Guru' : mode === 'signup' ? 'Pendaftaran Akun Baru' : 'Pemulihan Kata Sandi'}
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                {mode === 'login' 
                  ? 'Silakan masukkan email madrasah dan kata sandi Anda untuk mengakses workspace.' 
                  : mode === 'signup' 
                  ? 'Lengkapi identitas pendidik untuk menginisialisasi ruang kerja baru.' 
                  : 'Masukkan email terdaftar untuk menerima tautan instruksi reset kata sandi.'}
              </p>
            </div>

            {/* Error Message Notice */}
            {error && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Message Notice */}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Sign Up Fields: First Name & Last Name */}
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
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
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
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

              {/* Email Input Box (Styled as large card input with icon) */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl px-4 py-3 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                <label htmlFor="auth-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Alamat Email Pendidik
                </label>
                <div className="flex items-center gap-3 mt-1.5">
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

              {/* Password Input Box */}
              {mode !== 'forgot' && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl px-4 py-3 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                  <label htmlFor="auth-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Kata Sandi Akun
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (Sign up mode only) */}
              {mode === 'signup' && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl px-4 py-3 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-600/15">
                  <label htmlFor="signup-confirm-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ulangi Kata Sandi
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      id="signup-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Masukkan ulang kata sandi"
                      className="w-full bg-transparent text-slate-900 text-sm font-medium focus:outline-none placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Action Links: Remember Me & Forgot Password */}
              {mode === 'login' && (
                <div className="flex items-center justify-between pt-1 px-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Ingat saya di perangkat ini</span>
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

              {/* Forgot mode back link */}
              {mode === 'forgot' && (
                <div className="text-center pt-2">
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

              {/* Primary Action Button: "Masuk Workspace" */}
              <div className="pt-2">
                <button
                  id="btn-auth-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#065F46] hover:bg-[#044E3A] active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-900/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memverifikasi kredensial...
                    </span>
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Masuk Workspace</span>
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Daftarkan Akun Guru Baru</span>
                    </>
                  ) : (
                    'Kirim Link Reset Kata Sandi'
                  )}
                </button>
              </div>

              {/* Divider "atau" */}
              {mode === 'login' && (
                <div className="relative flex items-center justify-center py-1">
                  <div className="w-full border-t border-slate-200" />
                  <span className="absolute bg-white px-3 text-[11px] font-semibold text-slate-400">
                    atau
                  </span>
                </div>
              )}

              {/* Secondary Action Button: "Daftar akun pendidik baru" */}
              {mode === 'login' && (
                <div>
                  <button
                    id="btn-create-account-card"
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="w-full py-3 px-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <UserPlus className="w-4 h-4 text-slate-500" />
                    <span>Daftar akun pendidik baru</span>
                  </button>
                </div>
              )}

              {/* Interactive Workflow Demo Card Button */}
              <div className="pt-1">
                <button
                  id="btn-open-workflow-demo"
                  type="button"
                  onClick={() => setIsDemoOpen(true)}
                  className="w-full p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-200 text-left flex items-center gap-3 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600 group-hover:scale-110 transition-transform shadow-2xs">
                    <Play className="w-3.5 h-3.5 fill-emerald-600 ml-0.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-emerald-950 group-hover:text-emerald-900 leading-snug">
                      Lihat Simulasi Alur Kerja (1 Menit Demo)
                    </span>
                    <span className="block text-[11px] text-emerald-700/80 leading-snug mt-0.5 truncate">
                      Pelajari bagaimana Dadu Workspace membantu pekerjaan Anda.
                    </span>
                  </div>
                </button>
              </div>

            </form>
          </div>

          {/* Institutional Trust Footer Note */}
          <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Administrasi Guru Terpadu</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Kemenag Berdampak • 2026</span>
              <span className="text-emerald-600 font-bold">🌸</span>
            </div>
          </div>
        </div>

      </div>

      {/* Workflow Demo Modal (Modul Mandiri / Zero-Impact Isolation) */}
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

