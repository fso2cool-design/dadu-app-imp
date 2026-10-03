import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Notepad, CheckCircle, User, Medal } from '@phosphor-icons/react';

interface ScoreNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  assessmentName: string;
  currentScore: number | string;
  currentNote: string;
  onSave: (note: string) => void;
}

export const ScoreNoteModal: React.FC<ScoreNoteModalProps> = ({
  isOpen,
  onClose,
  studentName,
  assessmentName,
  currentScore,
  currentNote,
  onSave,
}) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote(currentNote || '');
  }, [currentNote, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(note.trim());
    onClose();
  };

  const quickTemplates = [
    'Remedial dari nilai awal',
    'Tugas perbaikan telah diserahkan',
    'Pengayaan materi tingkat lanjut',
    'Nilai susulan karena izin/sakit',
    'Nilai sempurna / Sangat aktif',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catatan Nilai Siswa"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--ds-text)] font-semibold">
            <User className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />
            <span>{studentName}</span>
          </div>
          <div className="flex items-center justify-between text-[var(--ds-text-muted)] text-[11px]">
            <span>Penilaian: <strong className="text-[var(--ds-text)]">{assessmentName}</strong></span>
            <span className="flex items-center gap-1">
              <Medal className="w-3 h-3 text-emerald-500" />
              Skor: <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-xs">{currentScore || '-'}</strong>
            </span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[var(--ds-text)] mb-1 flex items-center gap-1">
            <Notepad className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />
            Catatan Guru / Keterangan Remedial
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan catatan khusus untuk nilai ini..."
            className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent)] text-[var(--ds-text)] text-xs"
          />
        </div>

        {/* Quick templates */}
        <div>
          <span className="text-[11px] font-semibold text-[var(--ds-text-muted)] block mb-1.5">Template Cepat:</span>
          <div className="flex flex-wrap gap-1.5">
            {quickTemplates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setNote(tmpl)}
                className="text-[10px] px-2 py-1 bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] rounded-lg transition-colors cursor-pointer"
              >
                + {tmpl}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--ds-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--ds-border)] text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Simpan Catatan</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
