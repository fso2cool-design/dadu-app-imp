import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { StickyNote, CheckCircle2, User, Award } from 'lucide-react';

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
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{studentName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Penilaian: <strong className="text-slate-700">{assessmentName}</strong></span>
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3 text-emerald-500" />
              Skor: <strong className="text-emerald-700 font-mono text-xs">{currentScore || '-'}</strong>
            </span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <StickyNote className="w-3.5 h-3.5 text-slate-400" />
            Catatan Guru / Keterangan Remedial
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan catatan khusus untuk nilai ini..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-accent-primary text-slate-800 text-xs"
          />
        </div>

        {/* Quick templates */}
        <div>
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Template Cepat:</span>
          <div className="flex flex-wrap gap-1.5">
            {quickTemplates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setNote(tmpl)}
                className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                + {tmpl}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Catatan</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
