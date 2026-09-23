import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Compass, ArrowLeft } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { useOptionalAppTheme } from '../../context/ThemeContext';
import { APP_CONFIG } from '../../constants/app';

interface NotFoundPageProps {
  onNavigate?: (route: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const themeContext = useOptionalAppTheme();
  const isDark = themeContext 
    ? themeContext.isDark 
    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className={`min-h-[70vh] flex flex-col items-center justify-center px-4 select-none transition-colors duration-300 relative ${
      isDark ? 'text-slate-100' : 'text-slate-800'
    }`}>
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className={`w-96 h-96 rounded-full blur-3xl opacity-30 ${
          isDark 
            ? 'bg-gradient-to-tr from-rose-500/10 via-amber-500/10 to-cyan-500/10' 
            : 'bg-gradient-to-tr from-orange-500/15 via-rose-500/10 to-amber-500/15'
        }`} />
      </div>

      <div className={`relative flex flex-col items-center gap-6 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl border max-w-md w-full text-center transition-all duration-300 ${
        isDark 
          ? 'bg-[#141722]/90 border-slate-800/80 shadow-black/40' 
          : 'bg-white/95 border-slate-200/80 shadow-slate-300/50'
      }`}>
        {/* Logo badge with 404 tag */}
        <div className="relative">
          <div className={`p-4 rounded-3xl border shadow-inner flex items-center justify-center transition-colors ${
            isDark 
              ? 'bg-gradient-to-b from-[#1e2333] to-[#131724] border-slate-700/60 shadow-black/40' 
              : 'bg-gradient-to-b from-slate-50/90 to-white border-slate-200/80 shadow-sm'
          }`}>
            <AppLogo size={56} variant="mark" animated={false} />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-rose-500 text-white shadow-md shadow-rose-500/30">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h2 className={`font-extrabold text-2xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Halaman Tidak Ditemukan
          </h2>
          <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Tautan yang Anda tuju tidak tersedia atau telah dipindahkan ke alamat lain dalam {APP_CONFIG.name}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className={`w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-200 ${
              isDark 
                ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          
          <button
            type="button"
            onClick={handleGoHome}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 transition-all duration-200"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
