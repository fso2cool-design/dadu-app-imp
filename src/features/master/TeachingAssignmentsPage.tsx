import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  createTeachingAssignment, 
  updateTeachingAssignment, 
  deleteTeachingAssignment,
  archiveTeachingAssignment,
  unarchiveTeachingAssignment,
  canDeleteTeachingAssignment,
  checkTeachingAssignmentUsage,
  TeachingAssignmentUsageSummary
} from '../../services/firestore/teachingAssignments';
import { Briefcase, Plus, Edit2, Trash2, Calendar, Clock, MapPin, Layers, Archive, ArchiveRestore, Lock, AlertCircle } from 'lucide-react';
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
  const [deleteBlockedModal, setDeleteBlockedModal] = useState<{
    assignment: TeachingAssignment;
    reason: string;
  } | null>(null);
  const [assignmentUsage, setAssignmentUsage] = useState<TeachingAssignmentUsageSummary | null>(null);
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleOpenAdd = () => {
    setEditingAssignment(null);
    setAssignmentUsage(null);
    const firstActive = classes.find(c => c.academicYearId === activeAcademicYear?.id && !c.isArchived);
    setSelectedClassId(firstActive?.id || classes[0]?.id || '');
    setSelectedSubjectId(subjects[0]?.id || '');
    setDayOfWeek('');
    setTimeSlot('');
    setRoom('');
    setModalOpen(true);
  };

  const handleOpenEdit = async (assign: TeachingAssignment) => {
    setEditingAssignment(assign);
    setSelectedClassId(assign.classId);
    setSelectedSubjectId(assign.subjectId);
    setDayOfWeek(assign.dayOfWeek || '');
    setTimeSlot(assign.timeSlot || '');
    setRoom(assign.room || '');
    setAssignmentUsage(null);
    setModalOpen(true);

    if (user) {
      try {
        const usage = await checkTeachingAssignmentUsage(user.uid, assign.id);
        setAssignmentUsage(usage);
      } catch (err) {
        console.error('Error checking teaching assignment usage:', err);
      }
    }
  };

  const handleRequestDelete = async (assign: TeachingAssignment) => {
    if (!user) return;
    try {
      const check = await canDeleteTeachingAssignment(user.uid, assign.id);
      if (!check.canDelete) {
        setDeleteBlockedModal({
          assignment: assign,
          reason: check.reason || 'Penugasan mengajar memiliki transaksi akademik.'
        });
        return;
      }
      setAssignmentToDelete(assign);
    } catch (err: any) {
      toastError('Gagal memeriksa status penugasan: ' + err.message);
    }
  };

  const handleArchive = async (assign: TeachingAssignment) => {
    if (!user) return;
    try {
      setArchiving(true);
      triggerSyncFeedback('syncing', 'Mengarsipkan penugasan mengajar...');
      await archiveTeachingAssignment(user.uid, assign.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Penugasan berhasil diarsipkan.');
      toastSuccess(`Penugasan mengajar "${assign.subjectName} - Kelas ${assign.className}" telah diarsipkan.`);
      setDeleteBlockedModal(null);
    } catch (err: any) {
      toastError('Gagal mengarsipkan: ' + (err.message || 'Error'));
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async (assign: TeachingAssignment) => {
    if (!user) return;
    try {
      setArchiving(true);
      triggerSyncFeedback('syncing', 'Mengaktifkan kembali penugasan...');
      await unarchiveTeachingAssignment(user.uid, assign.id, activeAcademicYear?.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Penugasan aktif kembali.');
      toastSuccess(`Penugasan mengajar "${assign.subjectName} - Kelas ${assign.className}" berhasil diaktifkan kembali.`);
    } catch (err: any) {
      toastError(err.message || 'Gagal mengaktifkan penugasan.');
    } finally {
      setArchiving(false);
    }
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

  const filteredAssignments = teachingAssignments.filter(assign => {
    const isArchived = Boolean(assign.isArchived || assign.isActive === false);
    if (filterTab === 'ACTIVE') return !isArchived;
    if (filterTab === 'ARCHIVED') return isArchived;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Plotting & Jadwal Mengajar
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Penugasan dan jadwal mengajar mingguan Anda untuk Semester {activeSemester} TP {activeAcademicYear?.label || 'Aktif'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs Filter */}
          <div className="flex bg-slate-100 dark:bg-neutral-900 p-1 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterTab === 'ACTIVE'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              Aktif ({teachingAssignments.filter(a => !a.isArchived && a.isActive !== false).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('ARCHIVED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterTab === 'ARCHIVED'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              Arsip ({teachingAssignments.filter(a => a.isArchived || a.isActive === false).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              Semua ({teachingAssignments.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Penugasan Mengajar
          </button>
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-neutral-950 border border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">
            {filterTab === 'ARCHIVED' ? 'Tidak ada penugasan diarsipkan' : 'Belum ada plotting pengajaran'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {filterTab === 'ARCHIVED' 
              ? 'Penugasan yang telah diarsipkan akan muncul di sini.'
              : 'Klik tombol di atas untuk menambahkan mata pelajaran, kelas, dan jadwal mengajar mingguan Anda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assign) => {
            const isArchived = Boolean(assign.isArchived || assign.isActive === false);
            return (
              <div
                key={assign.id}
                className={`p-5 rounded-2xl bg-white dark:bg-neutral-950 border shadow-2xs transition-all flex flex-col justify-between group ${
                  isArchived 
                    ? 'border-dashed border-slate-300 dark:border-neutral-800 opacity-80' 
                    : 'border-slate-200/90 dark:border-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2.5 py-1 rounded-lg border font-bold text-xs ${
                      isArchived
                        ? 'bg-slate-100 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-zinc-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      Kelas {assign.className}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isArchived && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded">
                          Diarsipkan
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-zinc-400 bg-slate-100 dark:bg-neutral-900 px-2 py-0.5 rounded">
                        {assign.subjectCode || 'MAPEL'}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-zinc-100">{assign.subjectName}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Semester {assign.semester} • TP {activeAcademicYear?.label}
                  </p>

                  {/* Schedule info block */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                  <span className={`text-xs font-medium ${isArchived ? 'text-slate-400 dark:text-zinc-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    Status: {isArchived ? 'Nonaktif / Arsip' : 'Aktif'}
                  </span>
                  <div className="flex items-center gap-1">
                    {!isArchived ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(assign)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Edit Jadwal & Penugasan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={archiving}
                          onClick={() => handleArchive(assign)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          title="Arsipkan Penugasan"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={archiving}
                        onClick={() => handleUnarchive(assign)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Aktifkan Kembali"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Aktifkan</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRequestDelete(assign)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Hapus Penugasan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
          {editingAssignment && assignmentUsage?.isUsed && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Relasi Penugasan Dikunci</p>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                  Penugasan ini telah memiliki riwayat data ({assignmentUsage.reasons.join(', ')}). Rombel kelas dan mata pelajaran dikunci demi menjaga integritas data jurnal KBM dan asesmen nilai. Anda tetap dapat memperbarui jadwal mingguan (hari, jam, ruang).
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Pilih Kelas <span className="text-rose-500">*</span></span>
              {assignmentUsage?.isUsed && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci (Ada Riwayat)
                </span>
              )}
            </label>
            <select
              value={selectedClassId}
              disabled={Boolean(assignmentUsage?.isUsed)}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-neutral-800"
            >
              {classes
                .filter(c => (c.academicYearId === activeAcademicYear?.id && !c.isArchived) || c.id === editingAssignment?.classId)
                .map(c => (
                  <option key={c.id} value={c.id}>Kelas {c.name} (Tingkat {c.gradeLevel}){c.isArchived ? ' [Diarsipkan]' : ''}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Pilih Mata Pelajaran <span className="text-rose-500">*</span></span>
              {assignmentUsage?.isUsed && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci (Ada Riwayat)
                </span>
              )}
            </label>
            <select
              value={selectedSubjectId}
              disabled={Boolean(assignmentUsage?.isUsed)}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-neutral-800"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Schedule Configuration Group */}
          <div className="p-3.5 bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-800 dark:text-zinc-200 text-xs focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
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
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-sm"
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

      {/* Delete Blocked Dialog */}
      <Modal
        isOpen={!!deleteBlockedModal}
        onClose={() => setDeleteBlockedModal(null)}
        title="Penugasan Tidak Dapat Dihapus"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">Penugasan memiliki riwayat transaksi akademik</p>
              <p className="mt-1 leading-relaxed">
                {deleteBlockedModal?.reason}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Menghapus penugasan ini akan merusak integritas data rekap jurnal KBM atau nilai siswa yang sudah tercatat.
            Sebagai alternatif yang aman, Anda disarankan untuk <strong>mengarsipkan</strong> penugasan ini sehingga tidak lagi muncul di menu transaksi aktif namun tetap aman di riwayat data.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setDeleteBlockedModal(null)}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-medium cursor-pointer"
            >
              Tutup
            </button>
            {deleteBlockedModal?.assignment && (
              <button
                type="button"
                disabled={archiving}
                onClick={() => handleArchive(deleteBlockedModal.assignment)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                {archiving ? 'Mengarsipkan...' : 'Arsipkan Penugasan Ini'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
