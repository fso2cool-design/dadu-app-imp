import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ConfirmVariant = 'danger' | 'warning' | 'primary' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false,
  maxWidth = 'md',
}) => {
  const handleClose = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel, onClose]);

  const config = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60',
      btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 focus:ring-rose-500',
      defaultConfirmLabel: 'Hapus Data',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60',
      btnClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm shadow-amber-500/20 focus:ring-amber-500',
      defaultConfirmLabel: 'Ya, Lanjutkan',
    },
    primary: {
      icon: HelpCircle,
      iconBg: 'bg-accent-primary-soft text-accent-text border border-accent-primary-border',
      btnClass: 'btn-primary shadow-sm',
      defaultConfirmLabel: 'Konfirmasi',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60',
      btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 focus:ring-blue-500',
      defaultConfirmLabel: 'Mengerti',
    },
  }[variant];

  const IconComponent = config.icon;
  const finalConfirmLabel = confirmLabel || config.defaultConfirmLabel;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] overflow-y-auto" aria-modal="true" role="dialog">
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={isLoading ? undefined : onClose}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`relative w-full ${maxWidthClass} transform overflow-hidden rounded-2xl bg-white dark:bg-[#141722] p-6 text-left shadow-2xl transition-all border border-slate-200 dark:border-[#232838]`}
            >
              {/* Close Button Top Right */}
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                {/* Variant Icon */}
                <div className={`p-3 rounded-2xl shrink-0 ${config.iconBg}`}>
                  <IconComponent className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {title}
                  </h3>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {message}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#232838] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] border border-slate-200 dark:border-[#232838] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${config.btnClass}`}
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {finalConfirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
