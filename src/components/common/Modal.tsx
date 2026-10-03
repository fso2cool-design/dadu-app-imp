import React, { ReactNode, useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: ModalSize | string;
  maxWidth?: ModalSize | 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl' | string;
  closeOnBackdropClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size,
  maxWidth = 'lg',
  closeOnBackdropClick = false,
}) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const rawSize = (size || maxWidth || 'lg').replace(/^max-w-/, '');
  const maxWidthClass = ({
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full',
  } as Record<string, string>)[rawSize] || 'max-w-lg';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
          <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 text-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={closeOnBackdropClick ? onClose : undefined}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`relative w-full ${maxWidthClass} transform overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-elevated)] p-5 sm:p-6 text-left shadow-[var(--ds-elevation-lg)] transition-all border border-[var(--ds-border)] text-[var(--ds-text)] my-8`}
            >
              <div className="flex items-start justify-between border-b border-[var(--ds-border)] pb-3.5 mb-4">
                <div className="pr-4 min-w-0 flex items-start gap-3">
                  {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[var(--ds-text)] tracking-tight">
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="text-xs text-[var(--ds-text-muted)] mt-0.5 font-normal">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[var(--ds-radius-md)] p-1.5 text-[var(--ds-text-muted)] hover:bg-[var(--ds-accent-soft)] hover:text-[var(--ds-text)] transition-colors cursor-pointer shrink-0"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
