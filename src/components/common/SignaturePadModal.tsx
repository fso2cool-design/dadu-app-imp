import React, { useRef, useState } from 'react';
import { X, Upload, Check, Trash, Image as ImageIcon } from '@phosphor-icons/react';
import { useToast } from '../../context/ToastContext';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  initialSignatureUrl?: string;
  title?: string;
  subtitle?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Tanda Tangan Digital',
  subtitle = 'Unggah file gambar tanda tangan transparan (.png)',
}) => {
  const { error, warning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Hanya file gambar yang diizinkan');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setUploadedImage(event.target.result);
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      error('Gagal membaca file gambar');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    if (uploadedImage) {
      onSave(uploadedImage);
      onClose();
    } else {
      warning('Pilih gambar tanda tangan terlebih dahulu');
    }
  };

  const handleClear = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--ds-surface-elevated)] rounded-3xl border border-[var(--ds-border)] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-[var(--ds-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--ds-text)]">{title}</h3>
              <p className="text-[11px] text-[var(--ds-text-muted)] line-clamp-2">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 font-bold" />
          </button>
        </div>

        {/* Modal Body - Pure Upload Area */}
        <div className="p-5">
          {!uploadedImage ? (
            <div 
              className="border-2 border-dashed border-[var(--ds-border)] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--ds-surface-muted)] transition-colors group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-[var(--ds-text)] mb-1">Unggah Tanda Tangan</p>
              <p className="text-[11px] text-[var(--ds-text-muted)]">Format PNG (latar transparan) disarankan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-[var(--ds-border)] rounded-2xl bg-[var(--ds-surface-muted)] p-4 flex items-center justify-center relative overflow-hidden h-40">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(var(--ds-border) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  opacity: 0.5
                }} />
                <img 
                  src={uploadedImage} 
                  alt="Tanda Tangan" 
                  className="max-h-full max-w-full object-contain relative z-10 drop-shadow-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-2 transition-colors cursor-pointer border border-rose-200/50 dark:border-rose-800/50"
                >
                  <Trash className="w-4 h-4" />
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ds-text)] bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-border)] flex items-center gap-2 transition-colors cursor-pointer border border-[var(--ds-border)]"
                >
                  <Upload className="w-4 h-4" />
                  Ganti
                </button>
              </div>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/png, image/jpeg, image/jpg" 
            className="hidden" 
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-muted)] flex justify-end gap-2 shrink-0 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--ds-text)] bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer shadow-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveSignature}
            disabled={!uploadedImage || isProcessing}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--ds-accent)] hover:bg-[color-mix(in_srgb,var(--ds-accent)_90%,black)] text-[var(--ds-accent-fg)] flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Gunakan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  );
};
