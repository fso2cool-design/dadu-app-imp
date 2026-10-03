import React, { useState, useEffect } from 'react';
import { Users, Sparkle, CheckCircle, Warning, Trash, ArrowRight, ShieldCheck, ArrowClockwise, Info } from '@phosphor-icons/react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DeduplicationScanResult, DeduplicationExecutionResult } from '../../domain/deduplication.types';

import { useApplication } from '../../application/ApplicationContext';

interface DeduplicateStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetClassId?: string;
}

export const DeduplicateStudentsModal: React.FC<DeduplicateStudentsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetClassId,
}) => {
  const { user } = useAuth();
  const app = useApplication();
  const { activeAcademicYear, triggerSyncFeedback } = useWorkspace();

  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [scanResult, setScanResult] = useState<DeduplicationScanResult | null>(null);
  const [executionResult, setExecutionResult] = useState<DeduplicationExecutionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runScan = async () => {
    if (!user) return;
    try {
      setScanning(true);
      setErrorMsg(null);
      setExecutionResult(null);
      const res = await app.students.scanDuplicates(user.uid, {
        academicYearId: activeAcademicYear?.id,
        classId: targetClassId,
      });
      setScanResult(res);
    } catch (err: any) {
      console.error('Error scanning duplicate students:', err);
      setErrorMsg(err.message || 'Gagal memindai data duplikat di database.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runScan();
    } else {
      setScanResult(null);
      setExecutionResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, user, activeAcademicYear, targetClassId]);

  const handleExecuteDeduplication = async () => {
    if (!user) return;
    try {
      setExecuting(true);
      setErrorMsg(null);
      triggerSyncFeedback('syncing', 'Membersihkan dan menggabungkan data duplikat di Firestore...');

      const res = await app.students.executeDeduplication(user.uid, {
        academicYearId: activeAcademicYear?.id,
        classId: targetClassId,
      });

      setExecutionResult(res);
      triggerSyncFeedback(
        'saved',
        `Pembersihan tuntas! ${res.deletedStudentsCount} data duplikat & ${res.deletedEnrollmentsCount} enrollment ganda dihapus.`
      );
      onSuccess();
    } catch (err: any) {
      console.error('Error executing deduplication:', err);
      triggerSyncFeedback('synced');
      setErrorMsg(err.message || 'Gagal membersihkan data duplikat.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembersihan Data Siswa Ganda (Zero-Residue)"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Banner Info Governance */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950 dark:text-amber-100">Prinsip Tata Kelola Bersih Tanpa Residu (Zero-Residue)</p>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              Sistem akan memilih 1 data siswa terlengkap sebagai <strong>Master Record</strong> (mempertahankan Alamat, TTL, dan NIS). Semua catatan akademik (nilai asesmen, presensi) dialihkan ke Master Record, dan seluruh dokumen pendaftaran ganda (enrollment) serta siswa duplikat di Firestore akan <strong>dihapus total tanpa meninggalkan residu</strong>.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <Warning className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hasil Eksekusi Selesai */}
        {executionResult && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Deduplikasi Berhasil Dieksekusi Secara Tuntas!</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-emerald-700 dark:text-emerald-300 ml-1">
              <li><strong>{executionResult.mergedStudentsCount}</strong> data master diperkaya kelengkapannya (Alamat/TTL).</li>
              <li><strong>{executionResult.deletedStudentsCount}</strong> dokumen siswa duplikat dihapus dari Firestore.</li>
              <li><strong>{executionResult.deletedEnrollmentsCount}</strong> penempatan rombel ganda/residu dihapus tuntas.</li>
              {executionResult.relinkedAcademicRecordsCount > 0 && (
                <li><strong>{executionResult.relinkedAcademicRecordsCount}</strong> catatan akademik dialihkan ke akun master.</li>
              )}
            </ul>
          </div>
        )}

        {/* Loading Scan */}
        {scanning && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--ds-text-muted)]">
            <ArrowClockwise className="w-6 h-6 animate-spin text-[var(--ds-accent)]" />
            <p className="text-xs font-medium">Memindai database dan mendeteksi data ganda...</p>
          </div>
        )}

        {/* Hasil Pemindaian (Scan Result) */}
        {!scanning && scanResult && !executionResult && (
          <div>
            {!scanResult.hasDuplicates ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--ds-text)] text-sm">Database Anda Bersih & Rapi!</h4>
                  <p className="text-xs text-[var(--ds-text-muted)] mt-1 max-w-sm mx-auto">
                    Tidak ditemukan duplikasi data siswa ataupun pendaftaran rombel ganda di ruang kerja Anda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--ds-text-muted)] pb-1 border-b border-[var(--ds-border)]">
                  <span>
                    Ditemukan <strong>{scanResult.groups.length}</strong> grup siswa terduplikasi (total <strong>{scanResult.totalDuplicateStudents}</strong> siswa duplikat & <strong>{scanResult.totalDuplicateEnrollments}</strong> penempatan rombel ganda).
                  </span>
                  <button
                    type="button"
                    onClick={runScan}
                    className="text-[var(--ds-accent)] hover:opacity-80 flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                  >
                    <ArrowClockwise className="w-3 h-3" /> Pindai Ulang
                  </button>
                </div>

                {/* List Duplicates */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {scanResult.groups.map(group => (
                    <div
                      key={group.key}
                      className="p-3 bg-[var(--ds-surface-muted)] rounded-xl border border-[var(--ds-border)] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--ds-text)] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />
                          {group.masterStudent.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold text-[10px]">
                          {group.totalRecords} Dokumen Ganda ({group.matchType}: {group.matchValue || '-'})
                        </span>
                      </div>

                      <div className="text-[11px] text-[var(--ds-text-muted)] flex flex-col gap-0.5">
                        <div className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <strong>Master:</strong> {group.masterStudent.fullName} (NIS: {group.masterStudent.nis || '-'}, Alamat: {group.masterStudent.address || '-'}, TTL: {group.masterStudent.birthDate || '-'})
                        </div>
                        <div className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                          <strong>Akan dibersihkan:</strong> {group.duplicateStudents.length} dokumen duplikat
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--ds-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] rounded-xl transition cursor-pointer"
          >
            {executionResult ? 'Tutup' : 'Batal'}
          </button>

          {!executionResult && scanResult?.hasDuplicates && (
            <button
              type="button"
              disabled={executing || scanning}
              onClick={handleExecuteDeduplication}
              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {executing ? (
                <>
                  <ArrowClockwise className="w-3.5 h-3.5 animate-spin" />
                  Membersihkan Tanpa Residu...
                </>
              ) : (
                <>
                  <Trash className="w-3.5 h-3.5" />
                  Bersihkan & Gabungkan Data Duplikat
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
