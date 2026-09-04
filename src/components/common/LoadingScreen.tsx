import React from 'react';
import { DaduLogo } from './DaduLogo';
import { APP_CONFIG } from '../../constants/app';

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Menyiapkan ruang kerja Anda...',
  subtitle = `${APP_CONFIG.tagline} • ${APP_CONFIG.description}`
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0E1017] text-slate-100 px-4 select-none">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-96 h-96 rounded-full bg-gradient-to-tr from-orange-500/10 via-amber-500/10 to-cyan-500/10 blur-3xl opacity-50" />
      </div>

      <div className="relative flex flex-col items-center gap-5 p-8 sm:p-10 rounded-3xl bg-[#141722]/90 backdrop-blur-xl shadow-2xl border border-slate-800/80 max-w-sm w-full text-center">
        {/* Embossed circular logo badge with ambient glow */}
        <div className="relative p-4 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/60 shadow-inner flex items-center justify-center">
          <DaduLogo size="xl" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-extrabold text-white text-xl tracking-tight font-serif">{APP_CONFIG.shortName}</h3>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-400 border border-orange-700/60">
              {APP_CONFIG.versionDisplay}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        </div>

        {/* Animated Loading Bar & Status */}
        <div className="w-full mt-3 space-y-2.5">
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden relative border border-slate-700/30">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 rounded-full w-1/2" 
              style={{
                animation: 'loadingSweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }}
            />
          </div>
          <p className="text-xs text-orange-400/90 font-medium flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
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

