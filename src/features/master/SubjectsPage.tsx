import React, { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  createSubject, 
  updateSubject, 
  archiveSubject, 
  unarchiveSubject, 
  canDeleteSubject, 
  deleteSubject 
} from '../../services/firestore/subjects';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  AlertCircle,
  Search,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Subject } from '../../types';

export const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { subjects, reloadWorkspaceData, triggerSyncFeedback } = useWorkspace();

  // Tabs & Filters
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete states
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [deleteBlockedModal, setDeleteBlockedModal] = useState<{
    subject: Subject;
    reason: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Archive state
  const [archiving, setArchiving] = useState(false);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSubject(null);
    setCode('');
    setName('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setCode(subject.code);
    setName(subject.name);
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim() || !name.trim()) return;

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    try {
      setLoading(true);
      if (editingSubject) {
        triggerSyncFeedback('syncing', 'Memperbarui data mata pelajaran...');
        await updateSubject(user.uid, editingSubject.id, {
          code: trimmedCode,
          name: trimmedName,
        });
        await reloadWorkspaceData();
        triggerSyncFeedback('saved', 'Mata pelajaran berhasil diperbarui!');
        toastSuccess(`Mata pelajaran "${trimmedName}" berhasil diperbarui.`);
      } else {
        triggerSyncFeedback('syncing', 'Menyimpan mata pelajaran ke cloud...');
        await createSubject(user.uid, {
          code: trimmedCode,
          name: trimmedName,
          isActive: true,
        });
        await reloadWorkspaceData();
        triggerSyncFeedback('saved', 'Mata pelajaran berhasil ditambahkan!');
        toastSuccess(`Mata pelajaran "${trimmedName}" berhasil ditambahkan.`);
      }
      setModalOpen(false);
      setCode('');
      setName('');
      setEditingSubject(null);
    } catch (err: any) {
      console.error('Error saving subject:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan mata pelajaran: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  // Check and Request Delete
  const handleRequestDelete = async (subject: Subject) => {
    if (!user) return;
    try {
      const check = await canDeleteSubject(user.uid, subject.id);
      if (!check.canDelete) {
        setDeleteBlockedModal({
          subject,
          reason: check.reason || 'Mata pelajaran ini memiliki relasi data aktif dan dilindungi oleh tata kelola data madrasah.',
        });
        return;
      }
      setSubjectToDelete(subject);
    } catch (err: any) {
      console.error('Error checking subject deletion:', err);
      toastError('Gagal memverifikasi dependensi mata pelajaran: ' + (err.message || ''));
    }
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!user || !subjectToDelete) return;

    try {
      setDeleting(true);
      triggerSyncFeedback('syncing', 'Menghapus mata pelajaran...');
      await deleteSubject(user.uid, subjectToDelete.id);
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Mata pelajaran berhasil dihapus');
      toastSuccess(`Mata pelajaran "${subjectToDelete.name}" telah dihapus.`);
      setSubjectToDelete(null);
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setDeleting(false);
    }
  };

  // Toggle Archive / Unarchive
  const handleToggleArchive = async (subject: Subject) => {
    if (!user) return;

    const isArchiving = !subject.isArchived;
    try {
      setArchiving(true);
      triggerSyncFeedback('syncing', isArchiving ? 'Mengarsipkan mata pelajaran...' : 'Mengaktifkan kembali...');
      
      if (isArchiving) {
        await archiveSubject(user.uid, subject.id);
        toastSuccess(`Mata pelajaran "${subject.name}" telah diarsipkan.`);
      } else {
        await unarchiveSubject(user.uid, subject.id);
        toastSuccess(`Mata pelajaran "${subject.name}" telah diaktifkan kembali.`);
      }
      
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', isArchiving ? 'Mata pelajaran diarsipkan' : 'Mata pelajaran aktif');
    } catch (err: any) {
      console.error('Error toggling subject archive:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal mengubah status arsip: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setArchiving(false);
    }
  };

  // Filtered list
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      // Tab status filter
      if (filterTab === 'ACTIVE' && sub.isArchived) return false;
      if (filterTab === 'ARCHIVED' && !sub.isArchived) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = sub.name.toLowerCase().includes(q);
        const matchCode = sub.code.toLowerCase().includes(q);
        return matchName || matchCode;
      }

      return true;
    });
  }, [subjects, filterTab, searchQuery]);

  const activeCount = subjects.filter((s) => !s.isArchived).length;
  const archivedCount = subjects.filter((s) => s.isArchived).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Master Mata Pelajaran
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pusat pengelolaan mata pelajaran kurikulum madrasah terintegrasi dengan plotting dan asesmen.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Mata Pelajaran
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'ACTIVE'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('ARCHIVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'ARCHIVED'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Diarsipkan ({archivedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === 'ALL'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Semua ({subjects.length})
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau nama mapel..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Grid of Subject Cards */}
      {filteredSubjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-10 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? 'Mata pelajaran tidak ditemukan' : 'Belum ada mata pelajaran'}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? `Tidak ada mata pelajaran yang cocok dengan kata kunci "${searchQuery}".`
              : 'Tambahkan mata pelajaran untuk memulai penyusunan plotting mengajar dan buku nilai.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Mata Pelajaran Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => {
            const isArchived = Boolean(sub.isArchived);
            return (
              <div
                key={sub.id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between shadow-2xs hover:shadow-sm ${
                  isArchived
                    ? 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs uppercase">
                      {sub.code}
                    </span>
                    <div>
                      {isArchived ? (
                        <Badge variant="warning" size="sm">Diarsipkan</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Aktif</Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-snug">
                    {sub.name}
                  </h3>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    ID: {sub.id.slice(0, 6)}...
                  </span>

                  {/* Actions: Edit, Archive/Restore, Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sub)}
                      title="Ubah Mata Pelajaran"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleArchive(sub)}
                      title={isArchived ? "Pulihkan / Aktifkan Kembali" : "Arsipkan Mata Pelajaran"}
                      disabled={archiving}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isArchived 
                          ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60' 
                          : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60'
                      }`}
                    >
                      {isArchived ? (
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestDelete(sub)}
                      title="Hapus Mata Pelajaran"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Tambah / Edit Mata Pelajaran */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          if (!loading) {
            setModalOpen(false);
            setEditingSubject(null);
          }
        }}
        title={editingSubject ? "Ubah Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Kode Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Contoh: ENG / MAT / BIO / PAI"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Kode singkat untuk penamaan jadwal & header rapor.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Lengkap Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Bahasa Inggris Peminatan"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setModalOpen(false);
                setEditingSubject(null);
              }}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading 
                ? 'Menyimpan...' 
                : editingSubject 
                  ? 'Simpan Perubahan' 
                  : 'Simpan Mata Pelajaran'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Hard Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        title="Hapus Mata Pelajaran Permanen?"
        message={`Apakah Anda yakin ingin menghapus mata pelajaran "${subjectToDelete?.name}" (${subjectToDelete?.code})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={deleting ? "Menghapus..." : "Hapus Permanen"}
        cancelLabel="Batal"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSubjectToDelete(null)}
      />

      {/* Blocked Delete Notification Modal (Data Protection Guard) */}
      <Modal
        isOpen={Boolean(deleteBlockedModal)}
        onClose={() => setDeleteBlockedModal(null)}
        title="Pencegahan Penghapusan Data (Governance Guard)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold leading-tight">
                Mata Pelajaran Tidak Boleh Dihapus Permanen
              </p>
              <p className="text-xs mt-1 text-amber-800 dark:text-amber-300 leading-relaxed">
                {deleteBlockedModal?.reason}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
              Solusi Terbaik Berdasarkan Standar Data Madrasah:
            </span>
            Gunakan tombol <strong>Arsipkan</strong> untuk menyembunyikan mata pelajaran ini dari formulir pembuatan jadwal baru, tanpa merusak atau menghilangkan riwayat nilai rapor dan presensi siswa yang sudah tersimpan.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteBlockedModal(null)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={async () => {
                if (deleteBlockedModal?.subject) {
                  const targetSub = deleteBlockedModal.subject;
                  setDeleteBlockedModal(null);
                  await handleToggleArchive(targetSub);
                }
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" /> Arsipkan Mata Pelajaran Ini
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
