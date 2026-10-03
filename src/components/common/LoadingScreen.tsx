import React from 'react';
import { AppLogo } from './AppLogo';
import { APP_CONFIG } from '../../constants/app';

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Menyiapkan ruang kerja Anda...',
  subtitle = `${APP_CONFIG.tagline} • ${APP_CONFIG.description}`,
  fullScreen = true
}) => {
  return (
    <div className={`${fullScreen ? 'min-h-screen' : 'py-16 min-h-[400px]'} flex flex-col items-center justify-center px-4 select-none transition-colors duration-300 relative ${
      fullScreen ? 'bg-[var(--ds-surface)] text-[var(--ds-text)]' : 'bg-transparent text-[var(--ds-text)]'
    }`}>
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className="w-96 h-96 rounded-full blur-3xl opacity-30 bg-[radial-gradient(circle,var(--ds-accent)_0%,transparent_70%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-5 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] max-w-sm w-full text-center transition-all duration-300 shadow-black/5">
        {/* Embossed circular logo badge with ambient glow */}
        <div className="relative p-4 rounded-3xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] shadow-inner flex items-center justify-center transition-colors">
          <AppLogo size={64} variant="mark" animated={true} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h3 className="font-extrabold text-xl tracking-tight font-serif text-[var(--ds-text)]">
              {APP_CONFIG.shortName}
            </h3>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[var(--ds-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]">
              {APP_CONFIG.versionDisplay}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--ds-text-muted)]">
            {subtitle}
          </p>
        </div>

        {/* Animated Loading Bar & Status */}
        <div className="w-full mt-3 space-y-2.5">
          <div className="w-full h-1.5 rounded-full overflow-hidden relative border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
            <div 
              className="absolute top-0 bottom-0 left-0 rounded-full w-1/2 bg-[var(--ds-accent)]" 
              style={{
                animation: 'loadingSweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }}
            />
          </div>
          <p className="text-xs font-medium flex items-center justify-center gap-2 text-[var(--ds-accent)]">
            <span className="w-2 h-2 rounded-full animate-ping bg-[var(--ds-accent)]" />
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
