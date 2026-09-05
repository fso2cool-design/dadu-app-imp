import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  createTeachingAssignment, 
  updateTeachingAssignment, 
  deleteTeachingAssignment 
} from '../../services/firestore/teachingAssignments';
import { Briefcase, Plus, Edit2, Trash2, Calendar, Clock, MapPin, Layers } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { TeachingAssignment } from '../../types';

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const TeachingAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { 
    teachingAssignments, 
    classes, 
    subjects, 
    activeAcademicYear, 
    activeSemester, 
    reloadWorkspaceData,
    triggerSyncFeedback
  } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeachingAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<TeachingAssignment | null>(null);

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleOpenAdd = () => {
    setEditingAssignment(null);
    setSelectedClassId(classes[0]?.id || '');
    setSelectedSubjectId(subjects[0]?.id || '');
    setDayOfWeek('');
    setTimeSlot('');
    setRoom('');
    setModalOpen(true);
  };

  const handleOpenEdit = (assign: TeachingAssignment) => {
    setEditingAssignment(assign);
    setSelectedClassId(assign.classId);
    setSelectedSubjectId(assign.subjectId);
    setDayOfWeek(assign.dayOfWeek || '');
    setTimeSlot(assign.timeSlot || '');
    setRoom(assign.room || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedClassId || !selectedSubjectId || !activeAcademicYear) return;

    const targetClass = classes.find(c => c.id === selectedClassId);
    const targetSubject = subjects.find(s => s.id === selectedSubjectId);

    if (!targetClass || !targetSubject) return;

    try {
      setLoading(true);
      triggerSyncFeedback('syncing', 'Menyimpan jadwal mengajar ke cloud...');

      if (editingAssignment) {
        await updateTeachingAssignment(user.uid, editingAssignment.id, {
          classId: targetClass.id,
          subjectId: targetSubject.id,
          className: targetClass.name,
          subjectName: targetSubject.name,
          subjectCode: targetSubject.code,
          dayOfWeek: dayOfWeek || '',
          timeSlot: timeSlot.trim(),
          room: room.trim(),
        });
        triggerSyncFeedback('saved', 'Jadwal mengajar berhasil diperbarui!');
        toastSuccess(`Jadwal mengajar "${targetSubject.name} - Kelas ${targetClass.name}" berhasil diperbarui.`);
      } else {
        await createTeachingAssignment(user.uid, {
          academicYearId: activeAcademicYear.id,
          semester: activeSemester,
          classId: targetClass.id,
          subjectId: targetSubject.id,
          teacherId: user.uid,
          isActive: true,
          dayOfWeek: dayOfWeek || '',
          timeSlot: timeSlot.trim(),
          room: room.trim(),
          className: targetClass.name,
          subjectName: targetSubject.name,
          subjectCode: targetSubject.code,
        });
        triggerSyncFeedback('saved', 'Tugas mengajar berhasil dibuat!');
        toastSuccess(`Tugas mengajar "${targetSubject.name} - Kelas ${targetClass.name}" berhasil dibuat.`);
      }

      await reloadWorkspaceData();
      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving teaching assignment:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan tugas mengajar: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !assignmentToDelete) return;
    try {
      setDeleting(true);
      triggerSyncFeedback('syncing', 'Menghapus tugas mengajar...');
      await deleteTeachingAssignment(user.uid, assignmentToDelete.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Tugas mengajar berhasil dihapus.');
      toastSuccess(`Tugas mengajar "${assignmentToDelete.subjectName} - Kelas ${assignmentToDelete.className}" berhasil dihapus.`);
      setAssignmentToDelete(null);
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus tugas mengajar: ' + (err.message || 'Error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600 dark:text-red-400" />
            Plotting & Jadwal Mengajar
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Penugasan dan jadwal mengajar mingguan Anda untuk Semester {activeSemester} TP {activeAcademicYear?.label || 'Aktif'}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Penugasan Mengajar
        </button>
      </div>

      {teachingAssignments.length === 0 ? (
        <div className="bg-white dark:bg-neutral-950 border border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-neutral-900 border border-indigo-100 dark:border-neutral-800 flex items-center justify-center text-indigo-600 dark:text-red-400 mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Belum ada plotting pengajaran</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Klik tombol di atas untuk menambahkan mata pelajaran, kelas, dan jadwal mengajar mingguan Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachingAssignments.map((assign) => (
            <div
              key={assign.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 shadow-2xs hover:border-indigo-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-red-950/60 border border-indigo-100 dark:border-red-500/40 text-indigo-700 dark:text-red-400 font-bold text-xs">
                    Kelas {assign.className}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-zinc-400 bg-slate-100 dark:bg-neutral-900 px-2 py-0.5 rounded">
                    {assign.subjectCode || 'MAPEL'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-800 dark:text-zinc-100">{assign.subjectName}</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Semester {assign.semester} • TP {activeAcademicYear?.label}
                </p>

                {/* Schedule info block */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-red-400 shrink-0" />
                    <span className="font-semibold">
                      {assign.dayOfWeek ? `Hari ${assign.dayOfWeek}` : <span className="text-slate-400 dark:text-zinc-500 italic font-normal">Hari belum diatur</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {assign.timeSlot ? assign.timeSlot : <span className="text-slate-400 dark:text-zinc-500 italic">Jam belum diatur</span>}
                    </span>
                  </div>

                  {assign.room ? (
                    <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{assign.room}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Status: Aktif
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(assign)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
                    title="Edit Jadwal & Penugasan"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentToDelete(assign)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Hapus Penugasan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAssignment ? 'Edit Plotting & Jadwal Mengajar' : 'Tambah Plotting Pengajaran'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              Pilih Kelas <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {classes.filter(c => !c.isArchived || c.id === editingAssignment?.classId).map(c => (
                <option key={c.id} value={c.id}>Kelas {c.name} (Tingkat {c.gradeLevel}){c.isArchived ? ' [Diarsipkan]' : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
              Pilih Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Schedule Configuration Group */}
          <div className="p-3.5 bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-red-400" />
              Pengaturan Jadwal Mingguan (Opsional)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                  Hari Mengajar
                </label>
                <select
                  value={dayOfWeek}
                  onChange={e => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Belum Diatur --</option>
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>Hari {d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                  Jam / Sesi Mengajar
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 07:30 - 09:00"
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">
                Ruangan / Tempat (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Ruang X-A / Lab Komputer"
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-neutral-900 rounded-xl text-xs text-slate-500 dark:text-zinc-400 space-y-1">
            <p><strong>Tahun Ajaran:</strong> {activeAcademicYear?.label}</p>
            <p><strong>Semester:</strong> {activeSemester}</p>
            <p><strong>Guru Pengampu:</strong> {user?.email}</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? 'Menyimpan...' : editingAssignment ? 'Simpan Perubahan' : 'Simpan Plotting'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Penugasan Mengajar"
        message={
          <>
            Apakah Anda yakin ingin menghapus tugas mengajar <strong className="font-semibold text-slate-800 dark:text-slate-100">&quot;{assignmentToDelete?.subjectName} - Kelas {assignmentToDelete?.className}&quot;</strong>?
          </>
        }
        confirmLabel="Hapus Penugasan"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
};
