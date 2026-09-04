import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createSubject } from '../../services/firestore/subjects';
import { BookOpen, Plus } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { subjects, reloadWorkspaceData, triggerSyncFeedback } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code.trim() || !name.trim()) return;

    try {
      setLoading(true);
      triggerSyncFeedback('syncing', 'Menyimpan mata pelajaran ke cloud...');
      await createSubject(user.uid, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        isActive: true,
      });
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Mata pelajaran berhasil ditambahkan!');
      toastSuccess(`Mata pelajaran "${name.trim()}" berhasil ditambahkan.`);
      setModalOpen(false);
      setCode('');
      setName('');
    } catch (err: any) {
      console.error('Error creating subject:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menambahkan mata pelajaran: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Master Mata Pelajaran
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar mata pelajaran yang Anda ampu di madrasah/sekolah.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Mata Pelajaran
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((sub) => (
          <div
            key={sub.id}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-xs uppercase">
                  {sub.code}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                  Aktif
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-800">{sub.name}</h3>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Kode Unik: <span className="font-mono text-slate-600">{sub.code}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Mata Pelajaran Baru"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Contoh: ENG / MAT / BIO"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs uppercase focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Lengkap Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Bahasa Inggris Peminatan"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Mata Pelajaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
