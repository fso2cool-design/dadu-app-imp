import React from 'react';
import { useNavigate } from 'react-router-dom';
import { House, ArrowLeft } from '@phosphor-icons/react';
import { AppLogo } from './AppLogo';
import { APP_CONFIG } from '../../constants/app';

interface NotFoundPageProps {
  onNavigate?: (route: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();

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
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 select-none transition-colors duration-300 relative text-[var(--ds-text)]">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center" aria-hidden="true">
        <div className="w-96 h-96 rounded-full blur-3xl opacity-20 bg-[radial-gradient(circle,var(--ds-accent)_0%,transparent_70%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-6 p-8 sm:p-10 rounded-3xl backdrop-blur-xl shadow-2xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] max-w-md w-full text-center transition-all duration-300 shadow-black/5">
        {/* Logo badge with 404 tag */}
        <div className="relative">
          <div className="p-4 rounded-3xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] shadow-inner flex items-center justify-center transition-colors">
            <AppLogo size={56} variant="mark" animated={false} />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-rose-500 text-white shadow-md shadow-rose-500/30">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="font-extrabold text-2xl tracking-tight text-[var(--ds-text)]">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-[var(--ds-text-muted)]">
            Tautan yang Anda tuju tidak tersedia atau telah dipindahkan ke alamat lain dalam {APP_CONFIG.name}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
          
          <button
            type="button"
            onClick={handleGoHome}
            className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold btn-primary shadow-md cursor-pointer"
          >
            <House className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
