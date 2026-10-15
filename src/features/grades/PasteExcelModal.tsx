import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/common/Modal';
import { AssessmentItem, Enrollment } from '../../types';
import { FileCsv, CheckCircle, WarningCircle, ArrowRight, Info } from '@phosphor-icons/react';
import { parsePastedScores } from './pasteExcelParser';

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
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync selected item and clear state when modal opens
  useEffect(() => {
    if (targetAssessmentItem) {
      setSelectedItemId(targetAssessmentItem.id);
    } else if (assessmentItems.length > 0) {
      setSelectedItemId(assessmentItems[0].id);
    }
    setPastedText('');
    setActionError(null);
  }, [targetAssessmentItem, assessmentItems, isOpen]);

  // Pure parsing and validation
  const parseResult = useMemo(() => {
    return parsePastedScores(pastedText, enrollments);
  }, [pastedText, enrollments]);

  const handleApply = () => {
    if (!selectedItemId) {
      setActionError('Silakan pilih kolom penilaian tujuan.');
      return;
    }

    if (!parseResult.isValid) {
      setActionError(parseResult.errorMessage || 'Terdapat kesalahan pada format data yang ditempel.');
      return;
    }

    if (parseResult.validScoreCount === 0) {
      setActionError('Tidak ada nilai valid yang dapat diterapkan.');
      return;
    }

    onApplyScores(parseResult.scoresToApply, selectedItemId);
    onClose();
  };

  const displayedError = actionError || parseResult.errorMessage;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paste Nilai dari Excel / Spreadsheet"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        {displayedError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl flex items-start gap-2">
            <WarningCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Validasi Gagal:</span>
              <span>{displayedError}</span>
            </div>
          </div>
        )}

        {parseResult.isValid && parseResult.warningMessage && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 rounded-xl flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{parseResult.warningMessage}</span>
          </div>
        )}

        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-900 dark:text-emerald-200 leading-relaxed">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <FileCsv className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Aturan Format Paste Nilai:
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-emerald-800 dark:text-emerald-300">
            <li>Salin <strong>hanya 1 kolom angka nilai</strong> (tanpa kolom nama atau nomor absen) sesuai urutan siswa di kelas.</li>
            <li>Nilai valid berada pada rentang <strong>0 hingga 100</strong>. Format desimal titik (87.5) maupun koma (87,5) didukung.</li>
            <li>Baris kosong di tengah data akan dilewati tanpa menggeser urutan siswa lainnya.</li>
          </ol>
        </div>

        {/* Target assessment selector */}
        <div>
          <label className="block font-semibold text-[var(--ds-text)] mb-1">
            Pilih Kolom Penilaian Tujuan <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              setActionError(null);
            }}
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
            onChange={(e) => {
              setPastedText(e.target.value);
              setActionError(null);
            }}
            placeholder={`Contoh isi paste 1 kolom:\n85\n90\n\n88.5\n95`}
            className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-[var(--ds-border)] focus:outline-hidden focus:ring-2 focus:ring-[var(--ds-accent)] text-[var(--ds-text)] bg-[var(--ds-surface)]"
          />
        </div>

        {/* Live Parsing Preview */}
        {parseResult.rows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-[var(--ds-text)]">
                Pratinjau Pemetaan ({parseResult.rows.length} baris diproses):
              </span>
              <span className="text-[11px] text-[var(--ds-text-muted)]">Total {enrollments.length} siswa di kelas</span>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-2 space-y-1">
              {parseResult.rows.map((item) => (
                <div
                  key={item.rowIndex}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs ${
                    !item.isValid
                      ? 'bg-rose-50/70 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-200'
                      : item.isEmpty
                      ? 'bg-[var(--ds-surface)] border-[var(--ds-border)] opacity-70'
                      : 'bg-[var(--ds-surface)] border-[color-mix(in_srgb,var(--ds-border)_50%,transparent)]'
                  }`}
                >
                  <span className="text-[var(--ds-text-muted)] truncate max-w-[220px]">
                    <strong className="text-[var(--ds-text)] mr-1.5">#{item.rowIndex + 1}</strong>
                    {item.studentName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[var(--ds-text-muted)] font-mono max-w-[120px] truncate">
                      "{item.rawText}"
                    </span>
                    <ArrowRight className="w-3 h-3 text-[var(--ds-text-muted)] opacity-60" />
                    {item.isEmpty ? (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Kosong (Tidak Diubah)
                      </span>
                    ) : item.isValid ? (
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {item.score}
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                        Tidak Valid
                      </span>
                    )}
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
            disabled={!parseResult.isValid || parseResult.validScoreCount === 0 || !selectedItemId}
            className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Terapkan Nilai ({parseResult.validScoreCount} Siswa)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
