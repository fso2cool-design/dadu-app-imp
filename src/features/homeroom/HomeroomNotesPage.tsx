import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, StudentNote, StudentNoteCategory } from '../../types';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { 
  getStudentNotesByClass, 
  createStudentNote, 
  updateStudentNote, 
  deleteStudentNote 
} from '../../services/firestore/studentNotes';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { 
  StickyNote, 
  Plus, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  ShieldAlert, 
  Award, 
  BookOpen, 
  CalendarDays, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Clock, 
  User, 
  PhoneCall,
  AlertCircle,
  UserX
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext';

interface HomeroomNotesPageProps {
  initialClassId?: string;
  initialStudentId?: string;
}

export const HomeroomNotesPage: React.FC<HomeroomNotesPageProps> = ({
  initialClassId,
  initialStudentId,
}) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId,
    triggerSyncFeedback
  } = useWorkspace();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [importantOnly, setImportantOnly] = useState<boolean>(false);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(initialStudentId || 'ALL');

  // Modal form state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null);
  const [formStudentId, setFormStudentId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formCategory, setFormCategory] = useState<StudentNoteCategory>('BEHAVIOR');
  const [formNote, setFormNote] = useState<string>('');
  const [formActionPlan, setFormActionPlan] = useState<string>('');
  const [formParentFollowUp, setFormParentFollowUp] = useState<string>('');
  const [formIsImportant, setFormIsImportant] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const availableClasses = useMemo(() => {
    if (!activeAcademicYear) return classes;
    return classes.filter(c => c.academicYearId === activeAcademicYear.id && c.isActive);
  }, [classes, activeAcademicYear]);

  const currentClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'NONE') return null;
    return availableClasses.find(c => c.id === (initialClassId || selectedClassId)) || null;
  }, [availableClasses, selectedClassId, initialClassId]);

  useEffect(() => {
    if (initialClassId && availableClasses.some(c => c.id === initialClassId)) {
      setSelectedClassId(initialClassId);
    } else if (!selectedClassId && selectedClassId !== 'NONE' && availableClasses.length > 0) {
      const homeroomClass = availableClasses.find(c => c.classTeacherId === user?.uid);
      if (homeroomClass) {
        setSelectedClassId(homeroomClass.id);
      }
    }
  }, [initialClassId, availableClasses, selectedClassId, setSelectedClassId, user?.uid]);

  // Load roster & notes for this class
  useEffect(() => {
    if (!user || !activeAcademicYear || !currentClass) {
      setEnrollments([]);
      setNotes([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [enrs, noteList] = await Promise.all([
          getEnrollmentsByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
          getStudentNotesByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
        ]);

        if (isMounted) {
          const activeEnrs = enrs.filter(e => e.status === 'ACTIVE');
          setEnrollments(activeEnrs);
          setNotes(noteList);
        }
      } catch (err) {
        console.error('Error loading student notes:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user, activeAcademicYear, currentClass]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (importantOnly && !n.isImportant) return false;
      if (categoryFilter !== 'ALL' && n.category !== categoryFilter) return false;
      if (selectedStudentFilter !== 'ALL' && n.studentId !== selectedStudentFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = n.studentName?.toLowerCase().includes(q);
        const matchNote = n.note?.toLowerCase().includes(q);
        const matchAction = n.actionPlan?.toLowerCase().includes(q);
        if (!matchName && !matchNote && !matchAction) return false;
      }

      return true;
    });
  }, [notes, importantOnly, categoryFilter, selectedStudentFilter, searchQuery]);

  const openCreateModal = (presetStudentId?: string) => {
    setEditingNote(null);
    setFormStudentId(presetStudentId || (enrollments[0]?.studentId || ''));
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormCategory('BEHAVIOR');
    setFormNote('');
    setFormActionPlan('');
    setFormParentFollowUp('');
    setFormIsImportant(false);
    setModalOpen(true);
  };

  const openEditModal = (note: StudentNote) => {
    setEditingNote(note);
    setFormStudentId(note.studentId);
    setFormDate(note.date);
    setFormCategory(note.category);
    setFormNote(note.note);
    setFormActionPlan(note.actionPlan || '');
    setFormParentFollowUp(note.parentFollowUp || '');
    setFormIsImportant(!!note.isImportant);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeAcademicYear || !currentClass || !formStudentId || !formNote.trim()) return;

    const matchedEnrollment = enrollments.find(e => e.studentId === formStudentId);
    const studentName = matchedEnrollment?.student?.fullName || 'Siswa';
    const rollNumber = matchedEnrollment?.rollNumber || 0;

    setSubmitting(true);
    try {
      triggerSyncFeedback('syncing', 'Menyimpan catatan pembinaan siswa...');
      if (editingNote) {
        await updateStudentNote(user.uid, editingNote.id, {
          studentId: formStudentId,
          studentName,
          rollNumber,
          date: formDate,
          category: formCategory,
          note: formNote.trim(),
          actionPlan: formActionPlan.trim(),
          parentFollowUp: formParentFollowUp.trim(),
          isImportant: formIsImportant,
        });

        setNotes(prev => prev.map(n => n.id === editingNote.id ? {
          ...n,
          studentId: formStudentId,
          studentName,
          rollNumber,
          date: formDate,
          category: formCategory,
          note: formNote.trim(),
          actionPlan: formActionPlan.trim(),
          parentFollowUp: formParentFollowUp.trim(),
          isImportant: formIsImportant,
        } : n));
        triggerSyncFeedback('saved', 'Catatan pembinaan diperbarui!');
        toastSuccess('Catatan pembinaan siswa berhasil diperbarui.');
      } else {
        const created = await createStudentNote(user.uid, {
          studentId: formStudentId,
          studentName,
          rollNumber,
          classId: currentClass.id,
          className: currentClass.name,
          academicYearId: activeAcademicYear.id,
          date: formDate,
          category: formCategory,
          note: formNote.trim(),
          actionPlan: formActionPlan.trim(),
          parentFollowUp: formParentFollowUp.trim(),
          isImportant: formIsImportant,
        });

        setNotes(prev => [created, ...prev]);
        triggerSyncFeedback('saved', 'Catatan pembinaan berhasil dibuat!');
        toastSuccess('Catatan pembinaan siswa berhasil dibuat.');
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving student note:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan catatan siswa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (noteId: string) => {
    setNoteToDelete(noteId);
  };

  const executeDelete = async () => {
    if (!user || !noteToDelete) return;
    setDeleting(true);
    try {
      triggerSyncFeedback('syncing', 'Menghapus catatan pembinaan...');
      await deleteStudentNote(user.uid, noteToDelete);
      setNotes(prev => prev.filter(n => n.id !== noteToDelete));
      triggerSyncFeedback('saved', 'Catatan berhasil dihapus.');
      toastSuccess('Catatan berhasil dihapus.');
      setNoteToDelete(null);
    } catch (err: any) {
      console.error('Error deleting note:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus catatan.');
    } finally {
      setDeleting(false);
    }
  };

  // Export notes to Excel
  const handleExportExcel = () => {
    if (notes.length === 0) {
      toastWarning('Tidak ada catatan pembinaan siswa untuk diekspor.');
      return;
    }

    const dataRows = filteredNotes.map((n, idx) => ({
      'No': idx + 1,
      'Tanggal': n.date,
      'Nama Siswa': n.studentName || '',
      'Kelas': currentClass?.name || '',
      'Kategori': n.category,
      'Status Urgent': n.isImportant ? 'Ya (Urgent)' : 'Biasa',
      'Uraian Catatan / Kejadian': n.note,
      'Rencana Tindak Lanjut / Solusi': n.actionPlan || '',
      'Komunikasi Orang Tua': n.parentFollowUp || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan_Siswa');
    XLSX.writeFile(wb, `Buku_Catatan_Pembinaan_Kelas_${currentClass?.name || ''}.xlsx`);
  };

  const categoryLabels: Record<string, { label: string; bg: string; text: string }> = {
    BEHAVIOR: { label: 'Perilaku & Karakter', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
    ACADEMIC: { label: 'Akademik & Belajar', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    ATTENDANCE: { label: 'Presensi & Disiplin', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
    ACHIEVEMENT: { label: 'Prestasi & Apresiasi', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    ADMINISTRATIVE: { label: 'Administratif', bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' },
    OTHER: { label: 'Konseling / Lainnya', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Buku Catatan & Pembinaan Siswa
            </span>
            <span className="text-xs text-slate-500">
              T.A {activeAcademicYear?.label} • Sem {activeSemester}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Catatan Perkembangan Siswa Kelas {currentClass?.name || ''}
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan kasus, kedisiplinan, prestasi, bimbingan konseling, dan komunikasi wali murid
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentClass && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Tambah Catatan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Select */}
            <div className="flex items-center gap-2">
              <label htmlFor="notes-class-select" className="text-xs font-semibold text-slate-600">Kelas:</label>
              <select
                id="notes-class-select"
                value={currentClass?.id || 'NONE'}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedClassId(val === 'NONE' ? '' : val);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="NONE">-- Bukan Wali Kelas / Tidak Ada Binaan --</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name} {c.classTeacherId === user?.uid ? '⭐ (Binaan Saya)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Select */}
            {currentClass && (
              <div className="flex items-center gap-2">
                <label htmlFor="notes-student-filter" className="text-xs font-semibold text-slate-600">Siswa:</label>
                <select
                  id="notes-student-filter"
                  value={selectedStudentFilter}
                  onChange={(e) => setSelectedStudentFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 max-w-[180px]"
                >
                  <option value="ALL">Semua Siswa ({enrollments.length})</option>
                  {enrollments.map(e => (
                    <option key={e.studentId} value={e.studentId}>
                      {e.rollNumber}. {e.student?.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Filter */}
            {currentClass && (
              <div className="flex items-center gap-2">
                <label htmlFor="notes-cat-filter" className="text-xs font-semibold text-slate-600">Kategori:</label>
                <select
                  id="notes-cat-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="BEHAVIOR">Perilaku & Karakter</option>
                  <option value="ACADEMIC">Akademik & Belajar</option>
                  <option value="ATTENDANCE">Presensi & Disiplin</option>
                  <option value="ACHIEVEMENT">Prestasi</option>
                  <option value="ADMINISTRATIVE">Administratif</option>
                  <option value="OTHER">Lainnya / BK</option>
                </select>
              </div>
            )}
          </div>

          {/* Search */}
          {currentClass && (
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari catatan / solusi..."
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Quick Urgent Toggle */}
        {currentClass && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setImportantOnly(!importantOnly)}
              className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all border ${
                importantOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Hanya Perlu Perhatian Khusus (Urgent)</span>
              <span className="ml-1 px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded-full text-[10px]">
                {notes.filter(n => n.isImportant).length}
              </span>
            </button>
          </div>
        )}
      </div>

      {!currentClass ? (
        <div className="bg-white dark:bg-[#141722] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-[#232838] text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-purple-100 dark:border-purple-900/50">
            <UserX className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Pilih Kelas Binaan untuk Buku Catatan Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Silakan pilih kelas binaan pada opsi di atas untuk mengelola catatan perkembangan dan pembinaan karakter siswa.
          </p>
        </div>
      ) : (
        <>

      {/* Notes Feed / List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            Memuat catatan siswa...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <StickyNote className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <h3 className="font-bold text-slate-700 text-sm">Tidak ada catatan pembinaan ditemukan</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Belum ada catatan yang sesuai dengan filter yang dipilih.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Buat Catatan Siswa Pertama
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const catInfo = categoryLabels[note.category] || { label: note.category, bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700' };

            return (
              <div
                key={note.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  note.isImportant ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catInfo.bg} ${catInfo.text}`}>
                      {catInfo.label}
                    </span>
                    {note.isImportant && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Urgent / Perhatian Khusus
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {note.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Catatan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="pt-3.5 space-y-3 text-xs">
                  {/* Student Title */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      {note.rollNumber || '#'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{note.studentName || 'Siswa'}</h3>
                      <p className="text-[11px] text-slate-500">Kelas {currentClass?.name}</p>
                    </div>
                  </div>

                  {/* Note Description */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {note.note}
                  </div>

                  {/* Action Plan & Parent Follow Up */}
                  {(note.actionPlan || note.parentFollowUp) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {note.actionPlan && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-emerald-950">
                          <span className="font-bold text-[11px] text-emerald-800 flex items-center gap-1 mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Rencana Tindak Lanjut Guru:
                          </span>
                          <p className="text-[11px]">{note.actionPlan}</p>
                        </div>
                      )}

                      {note.parentFollowUp && (
                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-950">
                          <span className="font-bold text-[11px] text-blue-800 flex items-center gap-1 mb-1">
                            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                            Tindak Lanjut Orang Tua:
                          </span>
                          <p className="text-[11px]">{note.parentFollowUp}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
        </>
      )}

      {/* Add / Edit Note Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingNote ? 'Edit Catatan Pembinaan Siswa' : 'Catat Perkembangan / Pembinaan Siswa'}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Siswa:</label>
                <select
                  required
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="" disabled>-- Pilih Siswa Kelas --</option>
                  {enrollments.map(e => (
                    <option key={e.studentId} value={e.studentId}>
                      {e.rollNumber}. {e.student?.fullName} ({e.student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Kejadian / Catatan:</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori Pembinaan:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="BEHAVIOR">Perilaku / Sikap (Karakter)</option>
                  <option value="ACADEMIC">Akademik / Belajar</option>
                  <option value="ATTENDANCE">Presensi & Kedisiplinan</option>
                  <option value="ACHIEVEMENT">Prestasi & Apresiasi</option>
                  <option value="ADMINISTRATIVE">Administratif</option>
                  <option value="OTHER">Lainnya / Konseling BK</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsImportant}
                    onChange={(e) => setFormIsImportant(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-rose-700">
                    Tandai Urgent (Perlu Perhatian Khusus)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Uraian Catatan / Pengamatan / Kasus / Prestasi:
              </label>
              <textarea
                rows={3}
                required
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Ceritakan detail kejadian, perkembangan perilaku, atau hasil pembinaan..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rencana Tindak Lanjut / Solusi Guru / Tindakan Pembinaan (Opsional):
              </label>
              <textarea
                rows={2}
                value={formActionPlan}
                onChange={(e) => setFormActionPlan(e.target.value)}
                placeholder="e.g. Diberi bimbingan individual, pendampingan belajar, kesepakatan target..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tindak Lanjut Komunikasi dengan Orang Tua (Opsional):
              </label>
              <input
                type="text"
                value={formParentFollowUp}
                onChange={(e) => setFormParentFollowUp(e.target.value)}
                placeholder="e.g. Diinfokan ke orang tua via telepon / Surat panggilan ke madrasah..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white rounded-xl font-bold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {submitting ? 'Menyimpan...' : editingNote ? 'Simpan Perubahan' : 'Simpan Catatan Siswa'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Delete Note Dialog */}
      <ConfirmDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={executeDelete}
        title="Hapus Catatan Pembinaan"
        message="Apakah Anda yakin ingin menghapus catatan pembinaan ini? Data yang dihapus tidak dapat dipulihkan kembali."
        confirmLabel="Hapus Catatan"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
};
