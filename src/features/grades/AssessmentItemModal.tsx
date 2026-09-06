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

interface CategoryOption {
  value: AssessmentCategory;
  label: string;
  group: 'SUMMATIVE' | 'FORMATIVE' | 'OTHER';
  groupLabel: string;
  defaultWeight: number;
  defaultIncluded: boolean;
  hint: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  // Sumatif (Kurikulum Merdeka / Kemenag)
  { 
    value: 'QUIZ', 
    label: 'Sumatif Lingkup Materi / Ulangan Bab (TP)', 
    group: 'SUMMATIVE', 
    groupLabel: 'Asesmen Sumatif (Nilai Rapor)', 
    defaultWeight: 35, 
    defaultIncluded: true, 
    hint: 'Asesmen pencapaian tujuan pembelajaran per materi' 
  },
  { 
    value: 'MIDTERM', 
    label: 'STS / PTS (Sumatif Tengah Semester)', 
    group: 'SUMMATIVE', 
    groupLabel: 'Asesmen Sumatif (Nilai Rapor)', 
    defaultWeight: 25, 
    defaultIncluded: true, 
    hint: 'Asesmen tengah semester' 
  },
  { 
    value: 'FINAL', 
    label: 'SAS / PAS (Sumatif Akhir Semester)', 
    group: 'SUMMATIVE', 
    groupLabel: 'Asesmen Sumatif (Nilai Rapor)', 
    defaultWeight: 25, 
    defaultIncluded: true, 
    hint: 'Asesmen komprehensif akhir semester' 
  },
  { 
    value: 'PROJECT', 
    label: 'Proyek / Portofolio Sumatif', 
    group: 'SUMMATIVE', 
    groupLabel: 'Asesmen Sumatif (Nilai Rapor)', 
    defaultWeight: 15, 
    defaultIncluded: true, 
    hint: 'Tugas unjuk kerja atau proyek sumatif' 
  },
  
  // Formatif (Kurikulum Merdeka / Kemenag)
  { 
    value: 'ASSIGNMENT', 
    label: 'Tugas / LKPD Harian (Formatif)', 
    group: 'FORMATIVE', 
    groupLabel: 'Asesmen Formatif (Pemantauan)', 
    defaultWeight: 10, 
    defaultIncluded: true, 
    hint: 'Latihan dan pengerjaan lembar kerja siswa' 
  },
  { 
    value: 'PRACTICE', 
    label: 'Praktik / Unjuk Kerja / Demonstrasi', 
    group: 'FORMATIVE', 
    groupLabel: 'Asesmen Formatif (Pemantauan)', 
    defaultWeight: 15, 
    defaultIncluded: true, 
    hint: 'Aktivitas praktik di kelas / lab madrasah' 
  },
  { 
    value: 'OTHER', 
    label: 'Observasi / Catatan Lainnya', 
    group: 'OTHER', 
    groupLabel: 'Lainnya', 
    defaultWeight: 10, 
    defaultIncluded: false, 
    hint: 'Asesmen informal non-rekap nilai rapor' 
  },
];

export const AssessmentItemModal: React.FC<AssessmentItemModalProps> = ({
  isOpen,
  onClose,
  assignment,
  itemToEdit,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { triggerSyncFeedback, activeAcademicYear } = useWorkspace();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssessmentCategory>('QUIZ');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [weight, setWeight] = useState<number>(35);
  const [isIncludedInFinalScore, setIsIncludedInFinalScore] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchivedYear = Boolean(activeAcademicYear?.isArchived || assignment?.isArchived);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setCategory(itemToEdit.category || 'QUIZ');
      setAssessmentDate(itemToEdit.assessmentDate || getTodayISO());
      setMaxScore(itemToEdit.maxScore ?? 100);
      setWeight(itemToEdit.weight ?? 35);
      setIsIncludedInFinalScore(itemToEdit.isIncludedInFinalScore ?? true);
      setNotes(itemToEdit.notes || '');
    } else {
      setName('');
      setCategory('QUIZ');
      setAssessmentDate(getTodayISO());
      setMaxScore(100);
      setWeight(35);
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
        setIsIncludedInFinalScore(opt.defaultIncluded);
      }
    }
  };

  const selectedCategoryMeta = CATEGORY_OPTIONS.find(o => o.value === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignment) {
      setError('Data penugasan pengajaran tidak ditemukan.');
      return;
    }

    if (isArchivedYear) {
      setError('Tahun Ajaran ini telah diarsipkan (read-only). Tidak dapat menambah atau mengubah kolom penilaian.');
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
        {isArchivedYear && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Tahun Ajaran ini telah diarsipkan. Kolom penilaian berstatus Read-Only dan tidak dapat diubah.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {assignment && (
          <div className="p-2.5 bg-orange-50/70 dark:bg-cyan-950/40 border border-orange-100 dark:border-cyan-800/40 rounded-xl text-orange-900 dark:text-cyan-200 flex items-center justify-between">
            <span className="font-semibold">{assignment.subjectName}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-[#141722] font-medium text-orange-700 dark:text-cyan-400 border border-orange-200/60 dark:border-cyan-700/50">
              Kelas {assignment.className}
            </span>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nama Penilaian / Judul Tagihan <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            disabled={isArchivedYear}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Sumatif Bab 1 (Teks Eksplanasi) atau STS Ganjil"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-medium bg-white dark:bg-[#0c0e15] disabled:opacity-60"
          />
        </div>

        {/* Category & Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Kategori Penilaian <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              disabled={isArchivedYear}
              onChange={(e) => handleCategoryChange(e.target.value as AssessmentCategory)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-medium bg-white dark:bg-[#0c0e15] disabled:opacity-60 cursor-pointer"
            >
              <optgroup label="── Asesmen Sumatif (Rapor) ──">
                {CATEGORY_OPTIONS.filter(o => o.group === 'SUMMATIVE').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Asesmen Formatif (Proses) ──">
                {CATEGORY_OPTIONS.filter(o => o.group === 'FORMATIVE').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="── Lainnya ──">
                {CATEGORY_OPTIONS.filter(o => o.group === 'OTHER').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {selectedCategoryMeta && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {selectedCategoryMeta.hint}
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Tanggal Pelaksanaan
            </label>
            <input
              type="date"
              disabled={isArchivedYear}
              value={assessmentDate}
              onChange={(e) => setAssessmentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-medium bg-white dark:bg-[#0c0e15] disabled:opacity-60"
            />
          </div>
        </div>

        {/* Weight & Max Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              Bobot Nilai (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              disabled={isArchivedYear}
              value={weight}
              onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
              placeholder="Contoh: 35"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-medium bg-white dark:bg-[#0c0e15] disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Digunakan pada formula Rata-rata Berbobot</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Skor Maksimum (Skala)
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              disabled={isArchivedYear}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              placeholder="100"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-medium bg-white dark:bg-[#0c0e15] disabled:opacity-60"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Standar skala nilai madrasah: 100</p>
          </div>
        </div>

        {/* Include in Final Score Toggle */}
        <div className="p-3 bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-[#232838] rounded-xl flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 block">Hitung ke Nilai Akhir (Rapor)</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Sertakan nilai kolom ini dalam rekap legger dan nilai akhir semester
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              disabled={isArchivedYear}
              checked={isIncludedInFinalScore}
              onChange={(e) => setIsIncludedInFinalScore(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500 dark:peer-checked:bg-cyan-500"></div>
          </label>
        </div>

        {/* Notes / Materi TP */}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Tujuan Pembelajaran (TP) / Topik Materi (Opsional)
          </label>
          <textarea
            rows={2}
            disabled={isArchivedYear}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: TP 1.1 Menganalisis struktur teks eksplanasi dan kaidah kebahasaan"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 text-slate-800 dark:text-slate-200 text-xs bg-white dark:bg-[#0c0e15] disabled:opacity-60"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#232838]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || isArchivedYear}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
