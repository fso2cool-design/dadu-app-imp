import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  createAcademicYear, 
  updateAcademicYear,
  deleteAcademicYear,
  archiveAcademicYear,
  unarchiveAcademicYear,
  canDeleteAcademicYear,
  checkAcademicYearUsage,
  AcademicYearUsageSummary
} from '../../services/firestore/academicYears';
import { 
  Calendar, 
  Plus, 
  Check, 
  Star, 
  Edit2, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  Lock, 
  AlertCircle 
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { AcademicYear } from '../../types';

export const AcademicYearsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { academicYears, activeAcademicYear, reloadWorkspaceData, triggerSyncFeedback } = useWorkspace();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [yearUsage, setYearUsage] = useState<AcademicYearUsageSummary | null>(null);
  
  // Delete states
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);
  const [deleteBlockedModal, setDeleteBlockedModal] = useState<{
    year: AcademicYear;
    reason: string;
  } | null>(null);

  // Form states
  const [label, setLabel] = useState('');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear() + 1);
  const [currentSemester, setCurrentSemester] = useState<'GANJIL' | 'GENAP'>('GANJIL');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Filter
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');

  const handleOpenAdd = () => {
    setEditingYear(null);
    setYearUsage(null);
    const currYear = new Date().getFullYear();
    setLabel(`${currYear}/${currYear + 1}`);
    setStartYear(currYear);
    setEndYear(currYear + 1);
    setCurrentSemester('GANJIL');
    setIsActive(academicYears.length === 0);
    setModalOpen(true);
  };

  const handleOpenEdit = async (year: AcademicYear) => {
    setEditingYear(year);
    setLabel(year.label);
    setStartYear(year.startYear);
    setEndYear(year.endYear);
    setCurrentSemester(year.currentSemester);
    setIsActive(Boolean(year.isActive));
    setYearUsage(null);
    setModalOpen(true);

    if (user) {
      try {
        const usage = await checkAcademicYearUsage(user.uid, year.id);
        setYearUsage(usage);
      } catch (err) {
        console.error('Error checking academic year usage:', err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !label.trim()) return;

    try {
      setLoading(true);
      triggerSyncFeedback('syncing', 'Menyimpan tahun ajaran ke cloud...');

      if (editingYear) {
        await updateAcademicYear(user.uid, editingYear.id, {
          label: label.trim(),
          startYear: Number(startYear),
          endYear: Number(endYear),
          currentSemester,
          isActive,
        });
        triggerSyncFeedback('saved', 'Tahun ajaran berhasil diperbarui!');
        toastSuccess(`Tahun ajaran "${label.trim()}" berhasil diperbarui.`);
      } else {
        await createAcademicYear(user.uid, {
          label: label.trim(),
          startYear: Number(startYear),
          endYear: Number(endYear),
          currentSemester,
          isActive,
        });
        triggerSyncFeedback('saved', 'Tahun ajaran baru berhasil ditambahkan!');
        toastSuccess(`Tahun ajaran "${label.trim()}" berhasil ditambahkan.`);
      }

      await reloadWorkspaceData();
      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving academic year:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan tahun ajaran: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string, yearLabel: string) => {
    if (!user) return;
    try {
      triggerSyncFeedback('syncing', `Mengaktifkan tahun ajaran ${yearLabel}...`);
      await updateAcademicYear(user.uid, id, { isActive: true });
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', `Tahun ajaran ${yearLabel} aktif!`);
      toastSuccess(`Tahun ajaran aktif diubah ke ${yearLabel}.`);
    } catch (err: any) {
      console.error('Error setting active academic year:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal mengubah status aktif: ' + (err.message || 'Error'));
    }
  };

  const handleArchive = async (year: AcademicYear) => {
    if (!user) return;
    if (year.isActive) {
      toastError('Tahun ajaran yang sedang aktif tidak dapat diarsipkan. Aktifkan tahun ajaran lain terlebih dahulu.');
      return;
    }

    try {
      setArchiving(true);
      triggerSyncFeedback('syncing', `Mengarsipkan tahun ajaran ${year.label}...`);
      await archiveAcademicYear(user.uid, year.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Tahun ajaran berhasil diarsipkan.');
      toastSuccess(`Tahun ajaran "${year.label}" telah diarsipkan.`);
      setDeleteBlockedModal(null);
    } catch (err: any) {
      toastError(err.message || 'Gagal mengarsipkan tahun ajaran.');
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async (year: AcademicYear) => {
    if (!user) return;
    try {
      setArchiving(true);
      triggerSyncFeedback('syncing', `Memulihkan tahun ajaran ${year.label}...`);
      await unarchiveAcademicYear(user.uid, year.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Tahun ajaran dipulihkan.');
      toastSuccess(`Tahun ajaran "${year.label}" berhasil dipulihkan dari arsip.`);
    } catch (err: any) {
      toastError(err.message || 'Gagal memulihkan tahun ajaran.');
    } finally {
      setArchiving(false);
    }
  };

  const handleRequestDelete = async (year: AcademicYear) => {
    if (!user) return;
    try {
      const check = await canDeleteAcademicYear(user.uid, year.id);
      if (!check.canDelete) {
        setDeleteBlockedModal({
          year,
          reason: check.reason || 'Tahun ajaran memiliki riwayat data transaksi dan tidak dapat dihapus.'
        });
        return;
      }
      setYearToDelete(year);
    } catch (err: any) {
      toastError('Gagal memeriksa status tahun ajaran: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!user || !yearToDelete) return;
    try {
      setDeleting(true);
      triggerSyncFeedback('syncing', 'Menghapus tahun ajaran...');
      await deleteAcademicYear(user.uid, yearToDelete.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Tahun ajaran berhasil dihapus.');
      toastSuccess(`Tahun ajaran "${yearToDelete.label}" berhasil dihapus.`);
      setYearToDelete(null);
    } catch (err: any) {
      console.error('Error deleting academic year:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus tahun ajaran: ' + (err.message || 'Error'));
    } finally {
      setDeleting(false);
    }
  };

  const filteredYears = academicYears.filter(y => {
    const isArchived = Boolean(y.isArchived);
    if (filterTab === 'ACTIVE') return !isArchived;
    if (filterTab === 'ARCHIVED') return isArchived;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-red-400" />
            Master Tahun Ajaran
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Kelola periode tahun ajaran, semester berjalan, dan tata kelola arsip data historis Anda.
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
              Aktif ({academicYears.filter(y => !y.isArchived).length})
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
              Arsip ({academicYears.filter(y => y.isArchived).length})
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
              Semua ({academicYears.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Tahun Ajaran
          </button>
        </div>
      </div>

      {/* Grid of Academic Years */}
      {filteredYears.length === 0 ? (
        <div className="bg-white dark:bg-neutral-950 border border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-10 text-center">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
            {filterTab === 'ARCHIVED' ? 'Tidak ada tahun ajaran yang diarsipkan' : 'Belum ada tahun ajaran'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredYears.map((year) => {
            const isCurrentActive = activeAcademicYear?.id === year.id;
            const isArchived = Boolean(year.isArchived);

            return (
              <div
                key={year.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isArchived
                    ? 'bg-slate-50 dark:bg-neutral-900/50 border-dashed border-slate-300 dark:border-neutral-800 opacity-80'
                    : isCurrentActive
                    ? 'bg-white dark:bg-neutral-950 border-indigo-300 dark:border-red-500/40 ring-2 ring-indigo-500/20 dark:ring-red-500/20 shadow-sm'
                    : 'bg-white dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-neutral-900 text-indigo-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                      TP
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isArchived && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded">
                          Diarsipkan
                        </span>
                      )}
                      {isCurrentActive ? (
                        <Badge variant="success" size="sm">
                          <Star className="w-3 h-3 fill-emerald-600 text-emerald-600 mr-1" />
                          Aktif
                        </Badge>
                      ) : !isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleSetActive(year.id, year.label)}
                          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-red-400 cursor-pointer"
                        >
                          Set Aktif
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-zinc-100">{year.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Semester Berjalan: <span className="font-semibold text-slate-700 dark:text-zinc-300">{year.currentSemester}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    Periode Kalender: {year.startYear} - {year.endYear}
                  </p>
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className={`text-[11px] font-medium ${isArchived ? 'text-amber-600 dark:text-amber-400' : isCurrentActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {isArchived ? 'Tahun Ajaran Arsip' : isCurrentActive ? 'Sedang Digunakan' : 'Tahun Ajaran Inaktif'}
                  </span>

                  <div className="flex items-center gap-1">
                    {!isArchived ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(year)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Edit Tahun Ajaran"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isCurrentActive && (
                          <button
                            type="button"
                            disabled={archiving}
                            onClick={() => handleArchive(year)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                            title="Arsipkan Tahun Ajaran"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={archiving}
                        onClick={() => handleUnarchive(year)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Pulihkan dari Arsip"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Pulihkan</span>
                      </button>
                    )}

                    {!isCurrentActive && (
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(year)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Hapus Tahun Ajaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
        title={editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {editingYear && yearUsage?.isUsed && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Identitas Tahun Ajaran Terkunci</p>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                  Tahun ajaran ini telah memiliki riwayat data ({yearUsage.reasons.join(', ')}). Label nama dan periode tahun dikunci demi melindungi integritas seluruh rekam data akademik. Anda tetap dapat memperbarui semester berjalan.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Label Tahun Ajaran <span className="text-rose-500">*</span></span>
              {yearUsage?.isUsed && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Terkunci (Ada Data)
                </span>
              )}
            </label>
            <input
              type="text"
              required
              disabled={Boolean(yearUsage?.isUsed)}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Contoh: 2026/2027"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-neutral-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Tahun Mulai</span>
                {yearUsage?.isUsed && <Lock className="w-3 h-3 text-amber-500" />}
              </label>
              <input
                type="number"
                disabled={Boolean(yearUsage?.isUsed)}
                value={startYear}
                onChange={e => setStartYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-neutral-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Tahun Selesai</span>
                {yearUsage?.isUsed && <Lock className="w-3 h-3 text-amber-500" />}
              </label>
              <input
                type="number"
                disabled={Boolean(yearUsage?.isUsed)}
                value={endYear}
                onChange={e => setEndYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs disabled:opacity-60 disabled:bg-slate-100 dark:disabled:bg-neutral-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Semester Berjalan</label>
            <select
              value={currentSemester}
              onChange={e => setCurrentSemester(e.target.value as 'GANJIL' | 'GENAP')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs"
            >
              <option value="GANJIL">Semester Ganjil (1)</option>
              <option value="GENAP">Semester Genap (2)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Jadikan tahun ajaran aktif di workspace</span>
          </label>

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
              {loading ? 'Menyimpan...' : editingYear ? 'Simpan Perubahan' : 'Simpan Tahun Ajaran'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!yearToDelete}
        onClose={() => setYearToDelete(null)}
        onConfirm={handleDelete}
        title="Hapus Tahun Ajaran"
        message={
          <>
            Apakah Anda yakin ingin menghapus tahun ajaran <strong className="font-semibold text-slate-800 dark:text-slate-100">&quot;{yearToDelete?.label}&quot;</strong>?
          </>
        }
        confirmLabel="Hapus Tahun Ajaran"
        variant="danger"
        isLoading={deleting}
      />

      {/* Delete Blocked Dialog */}
      <Modal
        isOpen={!!deleteBlockedModal}
        onClose={() => setDeleteBlockedModal(null)}
        title="Tahun Ajaran Tidak Dapat Dihapus"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">Tahun ajaran dilindungi oleh tata kelola data</p>
              <p className="mt-1 leading-relaxed">
                {deleteBlockedModal?.reason}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Menghapus tahun ajaran ini akan merusak integritas seluruh rekam kelas, rombel, nilai, dan absensi yang pernah tercatat.
            Sebagai alternatif yang aman, Anda dapat <strong>mengarsipkan</strong> tahun ajaran ini sehingga tetap aman tersimpan untuk kebutuhan historis.
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setDeleteBlockedModal(null)}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-medium cursor-pointer"
            >
              Tutup
            </button>
            {deleteBlockedModal?.year && !deleteBlockedModal.year.isActive && (
              <button
                type="button"
                disabled={archiving}
                onClick={() => handleArchive(deleteBlockedModal.year)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                {archiving ? 'Mengarsipkan...' : 'Arsipkan Tahun Ajaran Ini'}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
