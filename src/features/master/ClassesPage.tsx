import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createClass, updateClass } from '../../services/firestore/classes';
import { ClassItem } from '../../types';
import { Layers, Plus, Users, Edit2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { classes, activeAcademicYear, reloadWorkspaceData, triggerSyncFeedback } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);

  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('10');
  const [major, setMajor] = useState('Umum');
  const [isHomeroom, setIsHomeroom] = useState(false);
  const [loading, setLoading] = useState(false);

  const openCreateModal = () => {
    setEditingClass(null);
    setName('');
    setGradeLevel('10');
    setMajor('Umum');
    setIsHomeroom(false);
    setModalOpen(true);
  };

  const openEditModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setName(cls.name);
    setGradeLevel(cls.gradeLevel);
    setMajor(cls.major || 'Umum');
    setIsHomeroom(cls.classTeacherId === user?.uid);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    try {
      setLoading(true);
      triggerSyncFeedback('syncing', 'Menyimpan data rombel kelas...');
      if (editingClass) {
        await updateClass(user.uid, editingClass.id, {
          name: name.trim(),
          gradeLevel: gradeLevel.trim(),
          major: major.trim(),
          classTeacherId: isHomeroom ? user.uid : '',
        });
        triggerSyncFeedback('saved', 'Data kelas berhasil diperbarui!');
        toastSuccess(`Kelas "${name.trim()}" berhasil diperbarui.`);
      } else {
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
      setModalOpen(false);
    } catch (err: any) {
      console.error('Error saving class:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan kelas: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-cyan-400" />
            Master Daftar Kelas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Daftar rombongan belajar / kelas pada tahun ajaran {activeAcademicYear?.label || 'aktif'}. Anda dapat mengatur status wali kelas di sini.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Kelas
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const isUserHomeroom = cls.classTeacherId === user?.uid;
          return (
            <div
              key={cls.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] shadow-2xs hover:border-indigo-300 dark:hover:border-cyan-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-cyan-950/40 text-indigo-700 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
                    {cls.name}
                  </div>
                  <div className="flex items-center gap-1.5">
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

                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Kelas {cls.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>Tingkat: {cls.gradeLevel}</span>
                  <span>•</span>
                  <span>Jurusan: {cls.major || 'Umum'}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">Status: Aktif</span>
                <button
                  type="button"
                  onClick={() => openEditModal(cls)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Edit / Atur Wali
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? `Edit Kelas ${editingClass.name}` : 'Tambah Kelas Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Kelas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: X-A / XI-MIPA-1"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tingkat Kelas</label>
              <input
                type="text"
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}
                placeholder="10 / 11 / 12"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Peminatan / Jurusan</label>
              <input
                type="text"
                value={major}
                onChange={e => setMajor(e.target.value)}
                placeholder="MIPA / IPS / Umum"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isHomeroom}
                onChange={e => setIsHomeroom(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold block">Saya bertindak sebagai Wali Kelas di kelas ini</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {isHomeroom 
                    ? 'Kelas ini akan menjadi kelas binaan Anda untuk presensi harian, rekap bulanan, dan rapor.'
                    : 'Kosongkan jika Anda bukan wali kelas di rombel ini.'}
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
