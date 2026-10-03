import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../features/auth/AuthContext';
import { useApplication } from '../../application/ApplicationContext';
import { FeedbackType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Bug, Lightbulb, Sparkle, Question, PaperPlane, CheckCircle } from '@phosphor-icons/react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const app = useApplication();
  const { success: toastSuccess, error: toastError } = useToast();

  const [type, setType] = useState<FeedbackType>('BUG');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      await app.feedback.create({
        userId: user.uid,
        userName: profile?.displayName || user.email || 'Guru',
        userEmail: user.email || '',
        type,
        title: title.trim(),
        description: description.trim(),
      });

      setSubmitted(true);
      toastSuccess('Masukan / laporan Anda berhasil dikirim ke Administrator. Terima kasih!');
      if (onSuccess) onSuccess();

      setTimeout(() => {
        handleReset();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      toastError('Gagal mengirim masukan: ' + (err.message || 'Silakan coba lagi'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setType('BUG');
    setTitle('');
    setDescription('');
    setSubmitted(false);
  };

  const categories: { type: FeedbackType; label: string; desc: string; icon: React.ElementType; color: string }[] = [
    {
      type: 'BUG',
      label: 'Lapor Bug / Kendala',
      desc: 'Fitur bermasalah, error, atau hasil tidak sesuai',
      icon: Bug,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
    },
    {
      type: 'FEATURE',
      label: 'Permintaan Fitur Baru',
      desc: 'Usulan modul baru atau kemampuan tambahan',
      icon: Lightbulb,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
    },
    {
      type: 'IMPROVEMENT',
      label: 'Perbaikan / Kemudahan',
      desc: 'Penyempurnaan alur kerja, tampilan, atau kecepatan',
      icon: Sparkle,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
    },
    {
      type: 'OTHER',
      label: 'Lainnya / Saran',
      desc: 'Pertanyaan atau masukan umum seputar aplikasi DADU',
      icon: Question,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) {
          handleReset();
          onClose();
        }
      }}
      title="Kirim Masukan & Lapor Kendala"
      subtitle="Bantu kembangkan aplikasi Dadu menjadi lebih baik dan nyaman bagi guru"
      maxWidth="max-w-lg"
    >
      {submitted ? (
        <div className="py-8 text-center space-y-3 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-[var(--ds-text)]">
            Masukan Berhasil Terkirim!
          </h4>
          <p className="text-xs text-[var(--ds-text-muted)] max-w-sm mx-auto leading-relaxed">
            Terima kasih atas partisipasi Anda. Laporan ini telah diteruskan ke Administrator dan akan segera ditinjau.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User info bar */}
          <div className="p-3 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] text-xs flex items-center justify-between text-[var(--ds-text)]">
            <div>
              <span className="text-[10px] text-[var(--ds-text-muted)] block">Pengirim:</span>
              <span className="font-semibold text-[var(--ds-text)]">
                {profile?.displayName || 'Guru'}
              </span>
              <span className="text-[var(--ds-text-muted)] ml-1.5 font-mono text-[11px]">
                ({user?.email})
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] font-bold border border-[var(--ds-border)]">
              Terverifikasi
            </span>
          </div>

          {/* Feedback Category */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-2">
              Kategori Masukan / Laporan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = type === cat.type;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setType(cat.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? `${cat.color} ring-2 ring-[var(--ds-accent)] font-medium shadow-xs`
                        : 'bg-[var(--ds-surface-elevated)] border-[var(--ds-border)] text-[var(--ds-text)] hover:border-[var(--ds-accent)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{cat.label}</div>
                      <div className="text-[10px] text-[var(--ds-text-muted)] line-clamp-1 leading-tight mt-0.5">
                        {cat.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">
              Judul Masukan / Masalah <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Tombol simpan nilai tidak merespon di kelas X-A"
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-xs text-[var(--ds-text)] placeholder-[var(--ds-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1">
              Deskripsi Lengkap <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kendala atau usulan Anda dengan jelas..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-xs text-[var(--ds-text)] placeholder-[var(--ds-text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent)] resize-none leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--ds-border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer"
            >
              {submitting ? (
                <span>Mengirim...</span>
              ) : (
                <>
                  <PaperPlane className="w-3.5 h-3.5" />
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
