import React from 'react';
import { AlertTriangle, Save, Trash2, X, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#141722] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-[#232838] space-y-5 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {displayDescription}
            </p>
          </div>
          {handleCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Save & Proceed, Discard & Proceed, Cancel */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          {handleSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
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
              <Trash2 className="w-4 h-4" />
              <span>{discardButtonText}</span>
            </button>
          )}

          {handleCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {cancelButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
