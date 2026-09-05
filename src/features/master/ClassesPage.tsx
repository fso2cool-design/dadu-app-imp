import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  createClass, 
  updateClass, 
  deleteClass, 
  archiveClass, 
  unarchiveClass, 
  checkClassUsage, 
  ClassUsageSummary 
} from '../../services/firestore/classes';
import { ClassItem } from '../../types';
import { 
  Layers, 
  Plus, 
  Users, 
  Edit2, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  Lock, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  Filter
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { classes, activeAcademicYear, reloadWorkspaceData, triggerSyncFeedback } = useWorkspace();

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [usageMap, setUsageMap] = useState<Record<string, ClassUsageSummary>>({});
  const [checkingUsage, setCheckingUsage] = useState(false);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [archiveModalCls, setArchiveModalCls] = useState<ClassItem | null>(null);
  const [unarchiveModalCls, setUnarchiveModalCls] = useState<ClassItem | null>(null);
  const [deleteModalCls, setDeleteModalCls] = useState<ClassItem | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('10');
  const [major, setMajor] = useState('Umum');
  const [isHomeroom, setIsHomeroom] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch usage check for classes in workspace
  useEffect(() => {
    if (!user || classes.length === 0) return;
    let isMounted = true;

    const loadUsages = async () => {
      setCheckingUsage(true);
      try {
        const results = await Promise.all(
          classes.map(async (cls) => {
            const summary = await checkClassUsage(user.uid, cls.id);
            return { id: cls.id, summary };
          })
        );
        if (isMounted) {
          const map: Record<string, ClassUsageSummary> = {};
          results.forEach(r => { map[r.id] = r.summary; });
          setUsageMap(map);
        }
      } catch (err) {
        console.error('Failed to check class usage:', err);
      } finally {
        if (isMounted) setCheckingUsage(false);
      }
    };

    loadUsages();
    return () => { isMounted = false; };
  }, [classes, user]);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (statusFilter === 'active') return !cls.isArchived;
      if (statusFilter === 'archived') return !!cls.isArchived;
      return true;
    });
  }, [classes, statusFilter]);

  const activeCount = useMemo(() => classes.filter(c => !c.isArchived).length, [classes]);
  const archivedCount = useMemo(() => classes.filter(c => c.isArchived).length, [classes]);

  // Modal open helpers
  const openCreateModal = () => {
    setEditingClass(null);
    setName('');
    setGradeLevel('10');
    setMajor('Umum');
    setIsHomeroom(false);
    setEditModalOpen(true);
  };

  const openEditModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setName(cls.name);
    setGradeLevel(cls.gradeLevel);
    setMajor(cls.major || 'Umum');
    setIsHomeroom(cls.classTeacherId === user?.uid);
    setEditModalOpen(true);
  };

  const isEditingUsed = editingClass ? Boolean(usageMap[editingClass.id]?.isUsed) : false;

  // Save (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    try {
      setActionLoading(true);
      triggerSyncFeedback('syncing', 'Menyimpan data rombel kelas...');

      if (editingClass) {
        if (isEditingUsed) {
          // Locked edit: only allow updating classTeacherId
          await updateClass(user.uid, editingClass.id, {
            classTeacherId: isHomeroom ? user.uid : '',
          });
          triggerSyncFeedback('saved', 'Metadata wali kelas berhasil diperbarui!');
          toastSuccess(`Metadata kelas "${editingClass.name}" berhasil diperbarui.`);
        } else {
          // Unused class: normal full edit
          await updateClass(user.uid, editingClass.id, {
            name: name.trim(),
            gradeLevel: gradeLevel.trim(),
            major: major.trim(),
            classTeacherId: isHomeroom ? user.uid : '',
          });
          triggerSyncFeedback('saved', 'Data kelas berhasil diperbarui!');
          toastSuccess(`Kelas "${name.trim()}" berhasil diperbarui.`);
        }
      } else {
        // Create new class
        await createClass(user.uid, {
          academicYearId: activeAcademicYear?.id || '',
          name: name.trim(),
          gradeLevel: gradeLevel.trim(),
          major: major.trim(),
          classTeacherId: isHomeroom ? user.uid : '',
          isActive: true,
        });
        triggerSyncFeedback('saved', 'Data kelas berhasil ditambahkan!');
        toastSuccess(`Kelas "${name.trim()}" berhasil ditambahkan.`);
      }

      await reloadWorkspaceData();
      setEditModalOpen(false);
    } catch (err: any) {
      console.error('Error saving class:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan kelas: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Archive action
  const handleConfirmArchive = async () => {
    if (!user || !archiveModalCls) return;
    try {
      setActionLoading(true);
      triggerSyncFeedback('syncing', `Mengarsipkan kelas ${archiveModalCls.name}...`);
      await archiveClass(user.uid, archiveModalCls.id);
      triggerSyncFeedback('saved', `Kelas ${archiveModalCls.name} berhasil diarsipkan.`);
      toastSuccess(`Kelas ${archiveModalCls.name} berhasil diarsipkan. Seluruh data historis tetap aman.`);
      await reloadWorkspaceData();
      setArchiveModalCls(null);
    } catch (err: any) {
      console.error('Error archiving class:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal mengarsipkan kelas: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Unarchive action
  const handleConfirmUnarchive = async () => {
    if (!user || !unarchiveModalCls) return;
    try {
      setActionLoading(true);
      triggerSyncFeedback('syncing', `Mengaktifkan kembali kelas ${unarchiveModalCls.name}...`);
      await unarchiveClass(user.uid, unarchiveModalCls.id);
      triggerSyncFeedback('saved', `Kelas ${unarchiveModalCls.name} kembali aktif.`);
      toastSuccess(`Kelas ${unarchiveModalCls.name} berhasil diaktifkan kembali.`);
      await reloadWorkspaceData();
      setUnarchiveModalCls(null);
    } catch (err: any) {
      console.error('Error unarchiving class:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal mengaktifkan kelas: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete action (Unused classes only)
  const handleConfirmDelete = async () => {
    if (!user || !deleteModalCls) return;
    try {
      setActionLoading(true);
      triggerSyncFeedback('syncing', `Menghapus kelas ${deleteModalCls.name}...`);
      await deleteClass(user.uid, deleteModalCls.id);
      triggerSyncFeedback('saved', `Kelas ${deleteModalCls.name} berhasil dihapus permanen.`);
      toastSuccess(`Kelas ${deleteModalCls.name} berhasil dihapus permanen.`);
      await reloadWorkspaceData();
      setDeleteModalCls(null);
    } catch (err: any) {
      console.error('Error deleting class:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus kelas: ' + (err.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
            Master Daftar Kelas & Rombel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengelolaan rombongan belajar tahun ajaran {activeAcademicYear?.label || 'aktif'}. Data historis yang sudah digunakan dilindungi dengan tata kelola arsip.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Kelas Baru
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#232838] pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'active'
              ? 'bg-indigo-50 dark:bg-cyan-950/50 text-indigo-700 dark:text-cyan-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Kelas Aktif</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('archived')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'archived'
              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-amber-500" />
          <span>Diarsipkan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold">
            {archivedCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            statusFilter === 'all'
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Semua ({classes.length})</span>
        </button>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] text-center">
          <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {statusFilter === 'archived' ? 'Tidak ada kelas yang diarsipkan' : 'Belum ada kelas'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {statusFilter === 'archived' 
              ? 'Semua kelas saat ini berstatus aktif dan siap digunakan dalam transaksi pembelajaran.'
              : 'Tambahkan kelas rombongan belajar baru untuk tahun ajaran aktif.'}
          </p>
          {statusFilter !== 'archived' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 dark:bg-cyan-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Kelas
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const isUserHomeroom = cls.classTeacherId === user?.uid;
            const usage = usageMap[cls.id];
            const isUsed = usage ? usage.isUsed : false;

            return (
              <div
                key={cls.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  cls.isArchived 
                    ? 'bg-slate-50/60 dark:bg-[#10121a] border-dashed border-slate-300 dark:border-slate-800 opacity-80'
                    : 'bg-white dark:bg-[#141722] border-slate-200/90 dark:border-[#232838] shadow-2xs hover:border-indigo-300 dark:hover:border-cyan-500/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      cls.isArchived
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-indigo-50 dark:bg-cyan-950/40 text-indigo-700 dark:text-cyan-400'
                    }`}>
                      {cls.name}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {cls.isArchived ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50 flex items-center gap-1">
                          <Archive className="w-3 h-3" /> Diarsipkan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      )}

                      {isUserHomeroom ? (
                        <Badge variant="purple" size="sm">
                          <Users className="w-3 h-3 mr-1" />
                          Wali Kelas
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                          Bukan Binaan
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Kelas {cls.name}
                    {cls.isArchived && (
                      <span className="text-xs font-normal text-amber-600 dark:text-amber-400">(Riwayat)</span>
                    )}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>Tingkat: {cls.gradeLevel}</span>
                    <span>•</span>
                    <span>Jurusan: {cls.major || 'Umum'}</span>
                  </div>

                  {/* Historical Usage Notice */}
                  <div className="mt-3">
                    {checkingUsage && !usage ? (
                      <span className="text-[10px] text-slate-400">Memeriksa status data...</span>
                    ) : isUsed ? (
                      <div className="inline-flex items-center gap-1 text-[11px] text-indigo-700 dark:text-cyan-400 font-medium bg-indigo-50 dark:bg-cyan-950/40 px-2 py-1 rounded-lg">
                        <Lock className="w-3 h-3 text-indigo-500 dark:text-cyan-400 shrink-0" />
                        <span>Memiliki riwayat transaksi akademik</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                        <Info className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Belum ada transaksi (Bisa diedit/dihapus)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  {cls.isArchived ? (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 italic">Disimpan sebagai riwayat</span>
                      <button
                        type="button"
                        onClick={() => setUnarchiveModalCls(cls)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" /> Aktifkan Kembali
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(cls)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> 
                        {isUsed ? 'Edit Metadata' : 'Edit Kelas'}
                      </button>

                      {isUsed ? (
                        <button
                          type="button"
                          onClick={() => setArchiveModalCls(cls)}
                          title="Arsipkan kelas untuk melindungi riwayat akademik"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" /> Arsipkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteModalCls(cls)}
                          title="Hapus kelas yang belum pernah digunakan"
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create or Edit Class */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={
          editingClass 
            ? (isEditingUsed ? `Edit Metadata Kelas ${editingClass.name}` : `Edit Kelas ${editingClass.name}`)
            : 'Tambah Kelas Rombel Baru'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Historical Warning Notice */}
          {editingClass && isEditingUsed && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold text-[12px]">Identitas Historis Kelas Terkunci</p>
                <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  Kelas ini sudah digunakan dalam transaksi akademik historis ({usageMap[editingClass.id]?.reasons.join(', ')}). 
                  Nama, tingkat, dan jurusan dikunci agar rekap rapor dan riwayat presensi tidak bias. Anda tetap dapat memperbarui status Wali Kelas.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Kelas <span className="text-rose-500">*</span>
              </label>
              {editingClass && isEditingUsed && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci
                </span>
              )}
            </div>
            <input
              type="text"
              required
              disabled={Boolean(editingClass && isEditingUsed)}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: X-A / XI-MIPA-1"
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:ring-indigo-500 ${
                editingClass && isEditingUsed
                  ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/70 text-slate-500 cursor-not-allowed'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Tingkat Kelas</label>
                {editingClass && isEditingUsed && <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
              </div>
              <input
                type="text"
                disabled={Boolean(editingClass && isEditingUsed)}
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}
                placeholder="10 / 11 / 12"
                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                  editingClass && isEditingUsed
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/70 text-slate-500 cursor-not-allowed'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Peminatan / Jurusan</label>
                {editingClass && isEditingUsed && <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
              </div>
              <input
                type="text"
                disabled={Boolean(editingClass && isEditingUsed)}
                value={major}
                onChange={e => setMajor(e.target.value)}
                placeholder="MIPA / IPS / Umum"
                className={`w-full px-3 py-2 rounded-xl border text-xs ${
                  editingClass && isEditingUsed
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/70 text-slate-500 cursor-not-allowed'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                }`}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isHomeroom}
                onChange={e => setIsHomeroom(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold block">Saya bertindak sebagai Wali Kelas di rombel ini</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {isHomeroom 
                    ? 'Kelas ini akan menjadi rombel binaan Anda untuk presensi harian, rekap bulanan, dan rapor.'
                    : 'Kosongkan jika Anda bukan wali kelas di rombel ini.'}
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {actionLoading ? 'Menyimpan...' : (editingClass ? 'Simpan Perubahan' : 'Tambah Kelas')}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Confirmation Archive Class */}
      <Modal
        isOpen={Boolean(archiveModalCls)}
        onClose={() => setArchiveModalCls(null)}
        title={`Arsipkan Kelas ${archiveModalCls?.name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
            <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold">Kelas ini memiliki transaksi akademik historis.</p>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                Untuk menjaga stabilitas buku nilai, rapor, dan presensi lama, kelas tidak dihapus permanen melainkan dipindahkan ke arsip.
              </p>
            </div>
          </div>

          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
            <li>Kelas yang diarsipkan <strong>tidak akan muncul</strong> pada formulir pembuatan data akademik baru.</li>
            <li>Seluruh riwayat nilai, rapor, dan jurnal pembelajaran siswa masa lalu <strong>tetap utuh dan aman</strong>.</li>
            <li>Anda dapat mengaktifkan kembali kelas ini sewaktu-waktu jika dibutuhkan.</li>
          </ul>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setArchiveModalCls(null)}
              className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirmArchive}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              {actionLoading ? 'Mengarsipkan...' : 'Ya, Arsipkan Kelas'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Confirmation Unarchive Class */}
      <Modal
        isOpen={Boolean(unarchiveModalCls)}
        onClose={() => setUnarchiveModalCls(null)}
        title={`Aktifkan Kembali Kelas ${unarchiveModalCls?.name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Kelas <strong>{unarchiveModalCls?.name}</strong> akan kembali aktif dan dapat dipilih untuk pembuatan tugas mengajar maupun penempatan siswa.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setUnarchiveModalCls(null)}
              className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirmUnarchive}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              {actionLoading ? 'Mengaktifkan...' : 'Aktifkan Kelas'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Confirmation Hard Delete Class (Unused Only) */}
      <Modal
        isOpen={Boolean(deleteModalCls)}
        onClose={() => setDeleteModalCls(null)}
        title={`Hapus Permanen Kelas ${deleteModalCls?.name}?`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p className="font-bold">Kelas ini dipastikan BELUM PERNAH digunakan.</p>
              <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                Sistem telah memverifikasi bahwa kelas ini memiliki 0 siswa, 0 tugas mengajar, 0 presensi, dan 0 butir asesmen nilai.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Penghapusan permanen hanya diizinkan untuk kelas yang benar-benar bersih dari transaksi historis. Dokumen kelas akan dihapus dari sistem.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDeleteModalCls(null)}
              className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {actionLoading ? 'Menghapus...' : 'Hapus Permanen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

