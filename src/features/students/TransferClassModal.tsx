import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { transferStudentEnrollment } from '../../services/firestore/enrollments';
import { Modal } from '../../components/common/Modal';
import { Enrollment } from '../../types';
import { ArrowRightLeft, CheckCircle2 } from 'lucide-react';

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
  const { classes, triggerSyncFeedback } = useWorkspace();

  const [targetClassId, setTargetClassId] = useState(classes[0]?.id || '');
  const [newRollNumber, setNewRollNumber] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!enrollment) return null;

  const currentClass = classes.find(c => c.id === enrollment.classId);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetClassId) return;

    try {
      setLoading(true);
      triggerSyncFeedback('syncing', 'Memproses mutasi kelas siswa...');
      const targetCls = classes.find(c => c.id === targetClassId);
      await transferStudentEnrollment(
        user.uid, 
        enrollment.id, 
        targetClassId, 
        targetCls?.name || '', 
        Number(newRollNumber) || 1
      );
      triggerSyncFeedback('saved', 'Siswa berhasil dimutasi ke kelas baru!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error transferring student:', err);
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
        <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
          <p className="font-semibold text-indigo-900">
            Siswa: <span className="font-bold">{enrollment.student?.fullName}</span>
          </p>
          <p className="text-[11px] text-indigo-700 mt-0.5">
            Kelas Saat Ini: <strong>Kelas {currentClass?.name || enrollment.className || '-'}</strong> • No. Absen #{enrollment.rollNumber}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Pilih Kelas Tujuan <span className="text-rose-500">*</span>
          </label>
          <select
            value={targetClassId}
            onChange={e => setTargetClassId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            {classes.filter(c => !c.isArchived && c.id !== enrollment.classId).map(c => (
              <option key={c.id} value={c.id}>
                Kelas {c.name} (Tingkat {c.gradeLevel} - {c.major || 'Umum'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nomor Absen di Kelas Baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={newRollNumber}
            onChange={e => setNewRollNumber(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-semibold"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {loading ? 'Memindahkan...' : 'Konfirmasi Pindah Kelas'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
