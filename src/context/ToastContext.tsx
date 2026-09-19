import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 3500,
    }: {
      type?: ToastType;
      title?: string;
      message: string;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 active toasts

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title?: string) => toast({ type: 'success', title: title || 'Berhasil', message }),
    [toast]
  );

  const error = useCallback(
    (message: string, title?: string) => toast({ type: 'error', title: title || 'Terjadi Kesalahan', message, duration: 5000 }),
    [toast]
  );

  const warning = useCallback(
    (message: string, title?: string) => toast({ type: 'warning', title: title || 'Perhatian', message, duration: 4000 }),
    [toast]
  );

  const info = useCallback(
    (message: string, title?: string) => toast({ type: 'info', title, message }),
    [toast]
  );

  // Global custom event listener for dadu:toast
  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ type?: ToastType; title?: string; message: string; duration?: number }>;
      if (customEvent.detail && customEvent.detail.message) {
        toast(customEvent.detail);
      }
    };

    window.addEventListener('dadu:toast', handleCustomToast);
    return () => window.removeEventListener('dadu:toast', handleCustomToast);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}

      {/* Floating Global Toast Container (Top Right) */}
      <div 
        aria-live="polite" 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, y: -10, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="pointer-events-auto"
            >
              <div
                className={`flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
                  t.type === 'success'
                    ? 'bg-slate-900/95 dark:bg-[#141722]/95 border-emerald-500/40 text-slate-100 shadow-emerald-950/20'
                    : t.type === 'error'
                    ? 'bg-slate-900/95 dark:bg-[#141722]/95 border-rose-500/50 text-slate-100 shadow-rose-950/20'
                    : t.type === 'warning'
                    ? 'bg-slate-900/95 dark:bg-[#141722]/95 border-amber-500/50 text-slate-100 shadow-amber-950/20'
                    : 'bg-slate-900/95 dark:bg-[#141722]/95 border-sky-500/40 text-slate-100 shadow-sky-950/20'
                }`}
              >
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                  {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {t.type === 'info' && <Info className="w-5 h-5 text-sky-400 dark:text-cyan-400" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  {t.title && (
                    <h5 className="font-bold text-xs tracking-tight text-white mb-0.5">
                      {t.title}
                    </h5>
                  )}
                  <p className="text-xs text-slate-300 dark:text-zinc-300 leading-relaxed break-words font-medium">
                    {t.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
