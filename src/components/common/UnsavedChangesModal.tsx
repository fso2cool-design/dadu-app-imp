import React from 'react';
import { Warning, FloppyDisk, Trash, X, CircleNotch } from '@phosphor-icons/react';

export interface UnsavedChangesModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  message?: string;
  tabOrModuleName?: string;
  isSaving?: boolean;
  onSaveAndProceed?: () => Promise<void> | void;
  onSave?: () => Promise<void> | void;
  onDiscardAndProceed?: () => void;
  onDiscard?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  saveButtonText?: string;
  discardButtonText?: string;
  cancelButtonText?: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  title = 'Perubahan Belum Disimpan',
  description,
  message,
  tabOrModuleName,
  isSaving = false,
  onSaveAndProceed,
  onSave,
  onDiscardAndProceed,
  onDiscard,
  onCancel,
  onClose,
  saveButtonText = 'Simpan & Lanjut',
  discardButtonText = 'Buang Perubahan',
  cancelButtonText = 'Batal',
}) => {
  if (!isOpen) return null;

  const handleSave = onSave || onSaveAndProceed;
  const handleDiscard = onDiscard || onDiscardAndProceed;
  const handleCancel = onClose || onCancel;

  const defaultDescription = tabOrModuleName
    ? `Ada perubahan data pada formulir ${tabOrModuleName} yang belum disimpan ke database. Apa yang ingin Anda lakukan sebelum berpindah?`
    : 'Ada perubahan data pada formulir yang belum disimpan ke database. Apa yang ingin Anda lakukan sebelum berpindah?';

  const displayDescription = message || description || defaultDescription;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[var(--ds-surface-elevated)] rounded-3xl p-6 shadow-2xl border border-[var(--ds-border)] space-y-5 animate-in zoom-in-95 duration-150 text-[var(--ds-text)]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <Warning className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold tracking-tight text-[var(--ds-text)]">
              {title}
            </h3>
            <p className="text-xs text-[var(--ds-text-muted)] mt-1 leading-relaxed">
              {displayDescription}
            </p>
          </div>
          {handleCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Buttons: FloppyDisk & Proceed, Discard & Proceed, Cancel */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {handleSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary w-full sm:flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <CircleNotch className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <FloppyDisk className="w-4 h-4" />
                  <span>{saveButtonText}</span>
                </>
              )}
            </button>
          )}

          {handleDiscard && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash className="w-4 h-4" />
              <span>{discardButtonText}</span>
            </button>
          )}

          {handleCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
