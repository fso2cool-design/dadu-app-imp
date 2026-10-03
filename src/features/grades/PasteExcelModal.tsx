import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { AssessmentItem, Enrollment } from '../../types';
import { FileCsv, CheckCircle, WarningCircle, ArrowRight } from '@phosphor-icons/react';

interface PasteExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAssessmentItem: AssessmentItem | null;
  assessmentItems: AssessmentItem[];
  enrollments: Enrollment[];
  onApplyScores: (scoresMap: Record<string, number>, targetItemId: string) => void;
}

export const PasteExcelModal: React.FC<PasteExcelModalProps> = ({
  isOpen,
  onClose,
  targetAssessmentItem,
  assessmentItems,
  enrollments,
  onApplyScores,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(targetAssessmentItem?.id || '');
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync selected item when modal opens
  React.useEffect(() => {
    if (targetAssessmentItem) {
      setSelectedItemId(targetAssessmentItem.id);
    } else if (assessmentItems.length > 0) {
      setSelectedItemId(assessmentItems[0].id);
    }
    setPastedText('');
    setError(null);
  }, [targetAssessmentItem, assessmentItems, isOpen]);

  // Parse preview
  const parsePastedData = () => {
    if (!pastedText.trim()) return [];
    
    // Split by newlines
    const rawLines = pastedText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsed: Array<{ studentId: string; studentName: string; score: number | null; rawText: string }> = [];

    rawLines.forEach((line, index) => {
      // Split by tab, comma, or semicolon
      const parts = line.split(/\t|,|;/).map(p => p.trim());
      
      // Let's find numeric value in line
      let scoreVal: number | null = null;
      for (const part of parts) {
        // clean non-digits except dot or comma
        const cleanPart = part.replace(',', '.');
        const num = parseFloat(cleanPart);
        if (!isNaN(num) && num >= 0 && num <= 100) {
          scoreVal = Math.round(num * 10) / 10;
          break;
        }
      }

      if (index < enrollments.length) {
        const enr = enrollments[index];
        parsed.push({
          studentId: enr.studentId,
          studentName: enr.student?.fullName || `Siswa #${enr.rollNumber}`,
          score: scoreVal,
          rawText: line,
        });
      }
    });

    return parsed;
  };

  const parsedPreview = parsePastedData();

  const handleApply = () => {
    if (!selectedItemId) {
      setError('Silakan pilih kolom penilaian tujuan.');
      return;
    }

    if (parsedPreview.length === 0) {
      setError('Tidak ada data angka yang dapat dibaca dari clipboard.');
      return;
    }

    const scoresToApply: Record<string, number> = {};
    parsedPreview.forEach(item => {
      if (item.score !== null) {
        scoresToApply[item.studentId] = item.score;
      }
    });

    onApplyScores(scoresToApply, selectedItemId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paste Nilai dari Excel / Spreadsheet"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
            <WarningCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-900 dark:text-emerald-200 leading-relaxed">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <FileCsv className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Cara Praktis Paste Nilai:
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-emerald-800 dark:text-emerald-300">
            <li>Buka file Excel / Google Sheets daftar nilai Anda.</li>
            <li>Salin / Copy (Ctrl+C) 1 kolom nilai siswa yang urutannya sesuai nomor absen.</li>
            <li>Tempelkan / Paste (Ctrl+V) ke kotak teks di bawah ini.</li>
          </ol>
        </div>

        {/* Target assessment selector */}
        <div>
          <label className="block font-semibold text-[var(--ds-text)] mb-1">
            Pilih Kolom Penilaian Tujuan <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent)] text-[var(--ds-text)] text-xs font-medium bg-[var(--ds-surface)]"
          >
            {assessmentItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.category}) — Bobot: {item.weight}%
              </option>
            ))}
          </select>
        </div>

        {/* Paste textarea */}
        <div>
          <label className="block font-semibold text-[var(--ds-text)] mb-1">
            Area Tempel / Paste Text (Ctrl+V)
          </label>
          <textarea
            rows={5}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Contoh isi paste:\n85\n90\n78\n88\n95`}
            className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-[var(--ds-border)] focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent)] text-[var(--ds-text)] bg-[var(--ds-surface)]"
          />
        </div>

        {/* Live Parsing Preview */}
        {parsedPreview.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[var(--ds-text)]">
                Pratinjau Pemetaan ({parsedPreview.length} baris terdeteksi):
              </span>
              <span className="text-[11px] text-[var(--ds-text-muted)]">Total {enrollments.length} siswa di kelas</span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-2 space-y-1">
              {parsedPreview.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[var(--ds-surface)] border border-[color-mix(in_srgb,var(--ds-border)_50%,transparent)] text-xs"
                >
                  <span className="text-[var(--ds-text-muted)] truncate max-w-[200px]">
                    <strong className="text-[var(--ds-text)] mr-1.5">#{idx + 1}</strong>
                    {item.studentName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--ds-text-muted)] font-mono">Teks: "{item.rawText}"</span>
                    <ArrowRight className="w-3 h-3 text-[var(--ds-text-muted)] opacity-60" />
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                      item.score !== null ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                    }`}>
                      {item.score !== null ? item.score : 'Tidak Valid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            type="button"
            onClick={handleApply}
            disabled={parsedPreview.length === 0 || !selectedItemId}
            className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Terapkan Nilai ({parsedPreview.filter(p => p.score !== null).length} Siswa)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
