import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Modal } from '../../components/common/Modal';
import { AssessmentItem, AssessmentCategory, TeachingAssignment } from '../../types';
import { createAssessmentItem, updateAssessmentItem } from '../../services/firestore/assessments';
import { getTodayISO } from '../../utils/date';
import { Award, Calendar, Percent, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface AssessmentItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: TeachingAssignment | null;
  itemToEdit: AssessmentItem | null;
  onSuccess: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: AssessmentCategory; label: string; defaultWeight: number }> = [
  { value: 'ASSIGNMENT', label: 'Tugas / LKPD', defaultWeight: 15 },
  { value: 'QUIZ', label: 'Kuis / Ulangan Harian', defaultWeight: 15 },
  { value: 'PRACTICE', label: 'Praktik / Unjuk Kerja', defaultWeight: 20 },
  { value: 'PROJECT', label: 'Proyek / Portofolio', defaultWeight: 20 },
  { value: 'MIDTERM', label: 'PTS / STS (Tengah Semester)', defaultWeight: 15 },
  { value: 'FINAL', label: 'PAS / SAS (Akhir Semester)', defaultWeight: 15 },
  { value: 'OTHER', label: 'Lainnya', defaultWeight: 10 },
];

export const AssessmentItemModal: React.FC<AssessmentItemModalProps> = ({
  isOpen,
  onClose,
  assignment,
  itemToEdit,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { triggerSyncFeedback } = useWorkspace();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssessmentCategory>('ASSIGNMENT');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [weight, setWeight] = useState<number>(15);
  const [isIncludedInFinalScore, setIsIncludedInFinalScore] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setCategory(itemToEdit.category || 'ASSIGNMENT');
      setAssessmentDate(itemToEdit.assessmentDate || getTodayISO());
      setMaxScore(itemToEdit.maxScore ?? 100);
      setWeight(itemToEdit.weight ?? 15);
      setIsIncludedInFinalScore(itemToEdit.isIncludedInFinalScore ?? true);
      setNotes(itemToEdit.notes || '');
    } else {
      setName('');
      setCategory('ASSIGNMENT');
      setAssessmentDate(getTodayISO());
      setMaxScore(100);
      setWeight(15);
      setIsIncludedInFinalScore(true);
      setNotes('');
    }
    setError(null);
  }, [itemToEdit, isOpen]);

  const handleCategoryChange = (newCat: AssessmentCategory) => {
    setCategory(newCat);
    if (!itemToEdit) {
      const opt = CATEGORY_OPTIONS.find(o => o.value === newCat);
      if (opt) {
        setWeight(opt.defaultWeight);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignment) {
      setError('Data penugasan pengajaran tidak ditemukan.');
      return;
    }

    if (!name.trim()) {
      setError('Nama kolom penilaian harus diisi.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      triggerSyncFeedback('syncing', 'Menyimpan kolom penilaian ke cloud...');

      if (itemToEdit) {
        await updateAssessmentItem(user.uid, itemToEdit.id, {
          name: name.trim(),
          category,
          assessmentDate,
          maxScore: Number(maxScore) || 100,
          weight: Number(weight) || 10,
          isIncludedInFinalScore,
          notes: notes.trim(),
        });
        triggerSyncFeedback('saved', 'Kolom penilaian berhasil diperbarui!');
      } else {
        await createAssessmentItem(user.uid, {
          academicYearId: assignment.academicYearId,
          semester: assignment.semester,
          teachingAssignmentId: assignment.id,
          classId: assignment.classId,
          subjectId: assignment.subjectId,
          name: name.trim(),
          category,
          assessmentDate,
          maxScore: Number(maxScore) || 100,
          weight: Number(weight) || 10,
          isIncludedInFinalScore,
          notes: notes.trim(),
        });
        triggerSyncFeedback('saved', 'Kolom penilaian berhasil dibuat!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving assessment item:', err);
      triggerSyncFeedback('synced');
      setError(err.message || 'Gagal menyimpan kolom penilaian.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Edit Kolom Penilaian' : 'Tambah Kolom Penilaian Baru'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {assignment && (
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 flex items-center justify-between">
            <span className="font-semibold">{assignment.subjectName}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white font-medium text-indigo-700">
              Kelas {assignment.className}
            </span>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Nama Penilaian / Judul Tagihan <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Tugas 1 (Teks Deskripsi) atau STS Ganjil"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs font-medium"
          />
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Kategori Penilaian <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as AssessmentCategory)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs font-medium bg-white"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Tanggal Pelaksanaan
            </label>
            <input
              type="date"
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs font-medium"
            />
          </div>
        </div>

        {/* Weight & Max Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              Bobot Nilai (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              placeholder="Contoh: 15"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">Digunakan pada formula Rata-rata Berbobot</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Skor Maksimum (Skala)
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              placeholder="100"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs font-medium"
            />
            <p className="text-[10px] text-slate-400 mt-1">Standar skala nilai madrasah: 100</p>
          </div>
        </div>

        {/* Include in Final Score Toggle */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-800 block">Hitung ke Nilai Akhir</span>
            <span className="text-[11px] text-slate-500">
              Sertakan nilai kolom ini dalam rekap Nilai Rapor / Nilai Akhir
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isIncludedInFinalScore}
              onChange={(e) => setIsIncludedInFinalScore(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Notes / Materi TP */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Topik Materi / Keterangan TP (Opsional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: TP 1.1 Menganalisis struktur teks prosedur dan kaidah kebahasaan"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 text-xs"
          />
        </div>

        {/* Footer Actions */}
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
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{itemToEdit ? 'Perbarui Kolom' : 'Buat Kolom Penilaian'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
