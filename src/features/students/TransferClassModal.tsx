import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useApplication } from '../../application/ApplicationContext';
import { Modal } from '../../components/common/Modal';
import { Enrollment } from '../../types';
import { ArrowsLeftRight, WarningCircle } from '@phosphor-icons/react';

interface TransferClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  enrollment: Enrollment | null;
}

export const TransferClassModal: React.FC<TransferClassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  enrollment,
}) => {
  const { user } = useAuth();
  const app = useApplication();
  const { classes, activeAcademicYear, triggerSyncFeedback } = useWorkspace();

  const availableClasses = classes.filter(
    c => c.academicYearId === activeAcademicYear?.id && !c.isArchived && c.id !== enrollment?.classId
  );

  const [targetClassId, setTargetClassId] = useState('');
  const [newRollNumber, setNewRollNumber] = useState(1);
  const [transferReason, setTransferReason] = useState('Mutasi rombel / penataan kelas');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (availableClasses.length > 0) {
      setTargetClassId(availableClasses[0].id);
    } else {
      setTargetClassId('');
    }
    setErrorMessage(null);
  }, [enrollment, classes, activeAcademicYear]);

  if (!enrollment) return null;

  const currentClass = classes.find(c => c.id === enrollment.classId);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetClassId) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      triggerSyncFeedback('syncing', 'Memproses mutasi kelas siswa...');
      const targetCls = classes.find(c => c.id === targetClassId);
      await app.enrollment.transfer(
        user.uid, 
        enrollment.id, 
        targetClassId, 
        targetCls?.name || '', 
        Number(newRollNumber) || 1,
        transferReason
      );
      triggerSyncFeedback('saved', 'Siswa berhasil dimutasi ke kelas baru!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error transferring student:', err);
      setErrorMessage(err?.message || 'Gagal melakukan mutasi siswa.');
      triggerSyncFeedback('synced');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pindah / Mutasi Kelas Siswa"
      maxWidth="md"
    >
      <form onSubmit={handleTransfer} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <WarningCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Mutasi Kelas</p>
              <p className="text-[11px] mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="p-3.5 bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] rounded-xl text-xs">
          <p className="font-semibold text-[var(--ds-text)]">
            Siswa: <span className="font-bold">{enrollment.student?.fullName}</span> ({enrollment.student?.nisn || enrollment.student?.nis || 'NIS/NISN -'})
          </p>
          <p className="text-[11px] text-[var(--ds-text-muted)] mt-0.5">
            Kelas Saat Ini: <strong>Kelas {currentClass?.name || enrollment.className || '-'}</strong> • No. Absen #{enrollment.rollNumber}
          </p>
          <p className="text-[10px] text-[var(--ds-text-muted)] mt-1 italic">
            * Riwayat kelas dan nilai siswa di kelas lama tetap tersimpan dan tidak akan terhapus.
          </p>
        </div>

        {availableClasses.length === 0 ? (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            Tidak ada rombel aktif lainnya pada Tahun Ajaran ini ({activeAcademicYear?.label || '-'}).
            Mutasi rombel hanya diizinkan antar-kelas dalam tahun ajaran yang sama.
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">
                Pilih Kelas Tujuan <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetClassId}
                onChange={e => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs focus:ring-2 focus:ring-[var(--ds-accent)] font-medium cursor-pointer"
              >
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id} className="bg-[var(--ds-surface)] text-[var(--ds-text)]">
                    Kelas {c.name} (Tingkat {c.gradeLevel} - {c.major || 'Umum'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">
                  Nomor Absen Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={newRollNumber}
                  onChange={e => setNewRollNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs focus:ring-2 focus:ring-[var(--ds-accent)] font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">
                  Alasan Mutasi
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="Contoh: Penataan rombel"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs focus:ring-2 focus:ring-[var(--ds-accent)] font-medium"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--ds-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--ds-border)] text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] text-xs font-medium cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || availableClasses.length === 0}
            className="px-5 py-2 rounded-xl btn-primary hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <ArrowsLeftRight className="w-3.5 h-3.5" />
            {loading ? 'Memindahkan...' : 'Konfirmasi Pindah Kelas'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
