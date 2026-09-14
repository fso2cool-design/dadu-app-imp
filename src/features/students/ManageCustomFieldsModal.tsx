import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { StudentCustomFieldDefinition } from '../../types';
import { 
  createStudentCustomField, 
  updateStudentCustomField, 
  deleteStudentCustomField 
} from '../../services/firestore/studentCustomFields';
import { useAuth } from '../auth/AuthContext';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  HelpCircle, 
  Table, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface ManageCustomFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customFields: StudentCustomFieldDefinition[];
  onFieldsChanged: () => void;
}

export const ManageCustomFieldsModal: React.FC<ManageCustomFieldsModalProps> = ({
  isOpen,
  onClose,
  customFields,
  onFieldsChanged,
}) => {
  const { user } = useAuth();
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<'TEXT' | 'NUMBER' | 'SELECT' | 'DATE'>('TEXT');
  const [optionsStr, setOptionsStr] = useState('');
  const [description, setDescription] = useState('');
  const [showInTable, setShowInTable] = useState(false);

  const resetForm = () => {
    setName('');
    setKey('');
    setType('TEXT');
    setOptionsStr('');
    setDescription('');
    setShowInTable(false);
    setEditingFieldId(null);
    setIsAddingNew(false);
    setErrorMsg(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleStartEdit = (field: StudentCustomFieldDefinition) => {
    setEditingFieldId(field.id);
    setName(field.name);
    setKey(field.key);
    setType(field.type);
    setOptionsStr(field.options ? field.options.join(', ') : '');
    setDescription(field.description || '');
    setShowInTable(field.showInTable ?? false);
    setIsAddingNew(false);
    setErrorMsg(null);
  };

  const handleToggleShowInTable = async (field: StudentCustomFieldDefinition) => {
    if (!user) return;
    try {
      await updateStudentCustomField(user.uid, field.id, {
        showInTable: !field.showInTable,
      });
      onFieldsChanged();
    } catch (err: any) {
      console.error('Error toggling column in table:', err);
    }
  };

  const handleDelete = async (field: StudentCustomFieldDefinition) => {
    if (!user) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus kolom kustom "${field.name}"?\nNilai yang tersimpan pada siswa tidak akan hilang dari database, namun kolom tidak akan ditampilkan lagi.`
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await deleteStudentCustomField(user.uid, field.id);
      onFieldsChanged();
      setSuccessMsg(`Kolom "${field.name}" berhasil dihapus.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error deleting custom field:', err);
      setErrorMsg(err.message || 'Gagal menghapus kolom.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);

      const parsedOptions = type === 'SELECT'
        ? optionsStr.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (editingFieldId) {
        await updateStudentCustomField(user.uid, editingFieldId, {
          name: name.trim(),
          type,
          options: parsedOptions,
          description: description.trim(),
          showInTable,
        });
        setSuccessMsg(`Kolom "${name.trim()}" berhasil diperbarui.`);
      } else {
        const generatedKey = key.trim() 
          ? key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
          : name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

        await createStudentCustomField(user.uid, {
          name: name.trim(),
          key: generatedKey,
          type,
          options: parsedOptions,
          description: description.trim(),
          showInTable,
          isActive: true,
        });
        setSuccessMsg(`Kolom kustom "${name.trim()}" berhasil ditambahkan.`);
      }

      resetForm();
      onFieldsChanged();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Error saving custom field:', err);
      setErrorMsg(err.message || 'Gagal menyimpan kolom kustom.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Kolom Kustom Data Siswa"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Helper Banner */}
        <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-slate-800/80 border border-orange-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <FileSpreadsheet className="w-4 h-4 text-orange-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100">Fleksibel & Otomatis:</strong> Kolom yang Anda buat di sini akan otomatis muncul di form input siswa, profil detail, template Excel, serta dipetakan secara otomatis saat Anda melakukan <strong>Impor Data Siswa via Excel / CSV</strong>.
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Add or Edit Form */}
        {(isAddingNew || editingFieldId) && (
          <form onSubmit={handleSaveField} className="p-4 rounded-xl border border-orange-200 dark:border-cyan-800 bg-orange-50/30 dark:bg-cyan-950/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-700/70">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                {editingFieldId ? 'Edit Kolom Kustom' : 'Tambah Kolom Kustom Baru'}
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kolom / Label <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Nomor KIP / PIP"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Data
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="TEXT">Teks Singkat / Bebas</option>
                  <option value="NUMBER">Angka / Numerik</option>
                  <option value="SELECT">Pilihan Ganda (Dropdown)</option>
                  <option value="DATE">Tanggal</option>
                </select>
              </div>
            </div>

            {type === 'SELECT' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Opsi Pilihan (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={optionsStr}
                  onChange={e => setOptionsStr(e.target.value)}
                  placeholder="Contoh: A, B, AB, O"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Contoh: Bantuan beasiswa siswa"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showInTable}
                    onChange={e => setShowInTable(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 dark:text-cyan-500 focus:ring-orange-400"
                  />
                  <span>Tampilkan sebagai Kolom di Tabel Siswa</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white dark:text-slate-950 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : (editingFieldId ? 'Simpan Perubahan' : 'Tambahkan Kolom')}
              </button>
            </div>
          </form>
        )}

        {/* Existing Custom Fields List */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/50">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Daftar Kolom Kustom Aktif ({customFields.length})
            </span>
            {!isAddingNew && !editingFieldId && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3 py-1.5 rounded-lg bg-orange-500 dark:bg-cyan-500 hover:bg-orange-600 dark:hover:bg-cyan-600 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kolom</span>
              </button>
            )}
          </div>

          {customFields.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada kolom kustom. Klik tombol "Tambah Kolom" di atas untuk menambahkan data seperti Nomor KIP, Asal Sekolah, atau Golongan Darah.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {customFields.map((field) => (
                <div key={field.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {field.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {field.type}
                      </span>
                      {field.showInTable && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                          <Table className="w-2.5 h-2.5" /> Ditampilkan di Tabel
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>Kode: <code className="font-mono text-orange-600 dark:text-cyan-400">{field.key}</code></span>
                      {field.description && <span>• {field.description}</span>}
                      {field.options && field.options.length > 0 && (
                        <span>• Opsi: {field.options.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleShowInTable(field)}
                      title={field.showInTable ? 'Sembunyikan dari tabel utama' : 'Tampilkan di tabel utama'}
                      className={`p-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                        field.showInTable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(field)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit kolom ini"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(field)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Hapus kolom ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  );
};
