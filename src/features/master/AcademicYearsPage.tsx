import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createAcademicYear, updateAcademicYear } from '../../services/firestore/academicYears';
import { Calendar, Plus, Check, Star } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

export const AcademicYearsPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { academicYears, activeAcademicYear, reloadWorkspaceData, triggerSyncFeedback } = useWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear() + 1);
  const [currentSemester, setCurrentSemester] = useState<'GANJIL' | 'GENAP'>('GANJIL');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !label.trim()) return;

    try {
      setLoading(true);
      triggerSyncFeedback('syncing', 'Menyimpan tahun ajaran baru...');
      await createAcademicYear(user.uid, {
        label: label.trim(),
        startYear: Number(startYear),
        endYear: Number(endYear),
        currentSemester,
        isActive,
      });
      await reloadWorkspaceData();
      triggerSyncFeedback('saved', 'Tahun ajaran berhasil ditambahkan!');
      toastSuccess(`Tahun ajaran "${label.trim()}" berhasil ditambahkan.`);
      setModalOpen(false);
      setLabel('');
    } catch (err: any) {
      console.error('Error creating academic year:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menambahkan tahun ajaran: ' + (err.message || 'Error'));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Master Tahun Ajaran
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola periode tahun ajaran dan semester aktif di workspace Anda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Tahun Ajaran
        </button>
      </div>

      {/* Grid of Academic Years */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {academicYears.map((year) => {
          const isCurrentActive = activeAcademicYear?.id === year.id;
          return (
            <div
              key={year.id}
              className={`p-5 rounded-2xl border transition-all ${
                isCurrentActive
                  ? 'bg-white border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  TP
                </div>
                {isCurrentActive ? (
                  <Badge variant="success" size="sm">
                    <Star className="w-3 h-3 fill-emerald-600 text-emerald-600 mr-1" />
                    Aktif
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetActive(year.id, year.label)}
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600"
                  >
                    Set Aktif
                  </button>
                )}
              </div>

              <h3 className="font-bold text-base text-slate-800">{year.label}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Semester Berjalan: <span className="font-semibold text-slate-700">{year.currentSemester}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Periode: {year.startYear} - {year.endYear}
              </p>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Tahun Ajaran Baru"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Label Tahun Ajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Contoh: 2026/2027"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tahun Mulai</label>
              <input
                type="number"
                value={startYear}
                onChange={e => setStartYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tahun Selesai</label>
              <input
                type="number"
                value={endYear}
                onChange={e => setEndYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Semester</label>
            <select
              value={currentSemester}
              onChange={e => setCurrentSemester(e.target.value as 'GANJIL' | 'GENAP')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            >
              <option value="GANJIL">Semester Ganjil (1)</option>
              <option value="GENAP">Semester Genap (2)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Jadikan tahun ajaran aktif</span>
          </label>

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
              {loading ? 'Menyimpan...' : 'Simpan Tahun Ajaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
