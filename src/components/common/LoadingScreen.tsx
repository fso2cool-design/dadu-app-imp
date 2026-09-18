import React from 'react';
import { Logo } from './Logo';
import { APP_CONFIG } from '../../constants/app';
import { useAppTheme } from '../../context/ThemeContext';

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Menyiapkan ruang kerja Anda...',
  subtitle = `${APP_CONFIG.tagline} • ${APP_CONFIG.description}`
}) => {
  let isDark = false;
  try {
    const themeContext = useAppTheme();
    isDark = themeContext.isDark;
  } catch {
    // Fallback if rendered outside ThemeProvider
    isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 select-none transition-colors duration-300 relative ${
      isDark ? 'bg-[#0E1017] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className={`w-96 h-96 rounded-full blur-3xl opacity-50 ${
          isDark 
            ? 'bg-gradient-to-tr from-orange-500/10 via-amber-500/10 to-cyan-500/10' 
            : 'bg-gradient-to-tr from-orange-500/15 via-emerald-500/10 to-amber-500/15'
        }`} />
      </div>

      <div className={`relative flex flex-col items-center gap-5 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl border max-w-sm w-full text-center transition-all duration-300 ${
        isDark 
          ? 'bg-[#141722]/90 border-slate-800/80 shadow-black/40' 
          : 'bg-white/95 border-slate-200/80 shadow-slate-300/50'
      }`}>
        {/* Embossed circular logo badge with ambient glow */}
        <div className={`relative p-4 rounded-3xl border shadow-inner flex items-center justify-center transition-colors ${
          isDark 
            ? 'bg-gradient-to-b from-[#2A103E] to-[#12061C] border-fuchsia-900/60 shadow-fuchsia-950/40' 
            : 'bg-gradient-to-b from-purple-50 to-fuchsia-50/50 border-purple-200 shadow-sm'
        }`}>
          <Logo size={64} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h3 className={`font-extrabold text-xl tracking-tight font-serif ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {APP_CONFIG.shortName}
            </h3>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
              isDark 
                ? 'bg-orange-950/80 text-orange-400 border-orange-700/60' 
                : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}>
              {APP_CONFIG.versionDisplay}
            </span>
          </div>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {subtitle}
          </p>
        </div>

        {/* Animated Loading Bar & Status */}
        <div className="w-full mt-3 space-y-2.5">
          <div className={`w-full h-1.5 rounded-full overflow-hidden relative border ${
            isDark 
              ? 'bg-slate-800/80 border-slate-700/30' 
              : 'bg-slate-100 border-slate-200/80'
          }`}>
            <div 
              className={`absolute top-0 bottom-0 left-0 rounded-full w-1/2 ${
                isDark 
                  ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400' 
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500'
              }`} 
              style={{
                animation: 'loadingSweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }}
            />
          </div>
          <p className={`text-xs font-medium flex items-center justify-center gap-2 ${
            isDark ? 'text-orange-400/90' : 'text-orange-600'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-ping ${
              isDark ? 'bg-orange-400' : 'bg-orange-500'
            }`} />
            {message}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes loadingSweep {
          0% { transform: translateX(-100%) scaleX(0.4); }
          50% { transform: translateX(50%) scaleX(1); }
          100% { transform: translateX(200%) scaleX(0.4); }
        }
      `}</style>
    </div>
  );
};


