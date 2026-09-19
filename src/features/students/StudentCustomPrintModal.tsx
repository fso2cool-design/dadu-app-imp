import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Student, Enrollment, ClassItem, SchoolSettings } from '../../types';
import { getSchoolSettings } from '../../services/firestore/settings';
import { formatOfficialSignatureName, formatOfficialNip } from '../../utils/formatOfficialName';
import { Modal } from '../../components/common/Modal';
import { 
  Printer, 
  CheckSquare, 
  Square, 
  Settings2, 
  Building2, 
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  X,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

export interface StudentPrintItem {
  student: Student;
  enrollment?: Enrollment | null;
  rollNumber?: number;
  className?: string;
}

interface StudentCustomPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: StudentPrintItem[];
  selectedClass?: ClassItem | null;
}

export type BaseColumnKey = 
  | 'no'
  | 'className'
  | 'fullName'
  | 'gender'
  | 'nis'
  | 'nisn'
  | 'nikSiswa'
  | 'nikIbu'
  | 'nkk'
  | 'birthInfo'
  | 'address'
  | 'parentName'
  | 'parentPhone'
  | 'phone'
  | 'signature'
  | 'notes';

export interface BaseColumnDef {
  key: BaseColumnKey;
  label: string;
  category: 'identitas' | 'kependudukan' | 'biodata' | 'kontak' | 'format';
  width?: string;
}

export interface CustomColumnDef {
  id: string;
  label: string;
  contentType: 'empty' | 'dots' | 'text';
  customText?: string;
  width?: string;
}

const BASE_COLUMNS: BaseColumnDef[] = [
  { key: 'no', label: 'No.', category: 'identitas', width: '35px' },
  { key: 'className', label: 'Kelas / Rombel', category: 'identitas', width: '70px' },
  { key: 'fullName', label: 'Nama Lengkap Siswa', category: 'identitas' },
  { key: 'gender', label: 'L/P', category: 'identitas', width: '35px' },
  { key: 'nis', label: 'NIS', category: 'identitas', width: '75px' },
  { key: 'nisn', label: 'NISN', category: 'identitas', width: '85px' },
  { key: 'nikSiswa', label: 'NIK Siswa', category: 'kependudukan', width: '120px' },
  { key: 'nikIbu', label: 'NIK Ibu Kandung', category: 'kependudukan', width: '120px' },
  { key: 'nkk', label: 'No. KK (NKK)', category: 'kependudukan', width: '120px' },
  { key: 'birthInfo', label: 'Tempat, Tanggal Lahir', category: 'biodata' },
  { key: 'address', label: 'Alamat Domisili', category: 'biodata' },
  { key: 'parentName', label: 'Nama Orang Tua / Wali', category: 'kontak' },
  { key: 'parentPhone', label: 'No. HP Ortu / WA', category: 'kontak' },
  { key: 'phone', label: 'No. HP Siswa', category: 'kontak' },
  { key: 'signature', label: 'Tanda Tangan / Paraf', category: 'format', width: '100px' },
  { key: 'notes', label: 'Keterangan', category: 'format', width: '80px' },
];

export const DEFAULT_ORDER: string[] = [
  'no',
  'className',
  'fullName',
  'gender',
  'nis',
  'nisn',
  'nikSiswa',
  'nikIbu',
  'nkk',
  'birthInfo',
  'address',
  'parentName',
  'parentPhone',
  'phone',
  'signature',
  'notes',
];

export type PresetKey = 'standar' | 'emis' | 'absen' | 'wali';

export const PRESET_LABELS: Record<PresetKey, string> = {
  standar: 'Standar Rombel',
  emis: 'EMIS & Kependudukan (NIK/KK)',
  absen: 'Format Presensi & Tanda Tangan',
  wali: 'Buku Kontak Orang Tua',
};

export const PRESET_COLUMNS: Record<PresetKey, (hasSelectedClass: boolean) => Record<string, boolean>> = {
  standar: (hasSelectedClass) => ({
    no: true,
    className: !hasSelectedClass,
    fullName: true,
    gender: true,
    nis: true,
    nisn: true,
    nikSiswa: false,
    nikIbu: false,
    nkk: false,
    birthInfo: true,
    address: false,
    parentName: true,
    parentPhone: true,
    phone: false,
    signature: false,
    notes: false,
  }),
  emis: (hasSelectedClass) => ({
    no: true,
    className: !hasSelectedClass,
    fullName: true,
    gender: true,
    nis: true,
    nisn: true,
    nikSiswa: true,
    nikIbu: true,
    nkk: true,
    birthInfo: true,
    address: true,
    parentName: true,
    parentPhone: false,
    phone: false,
    signature: false,
    notes: false,
  }),
  absen: (hasSelectedClass) => ({
    no: true,
    className: !hasSelectedClass,
    fullName: true,
    gender: true,
    nis: false,
    nisn: true,
    nikSiswa: false,
    nikIbu: false,
    nkk: false,
    birthInfo: false,
    address: false,
    parentName: false,
    parentPhone: false,
    phone: false,
    signature: true,
    notes: true,
  }),
  wali: (hasSelectedClass) => ({
    no: true,
    className: !hasSelectedClass,
    fullName: true,
    gender: false,
    nis: false,
    nisn: false,
    nikSiswa: false,
    nikIbu: false,
    nkk: false,
    birthInfo: false,
    address: true,
    parentName: true,
    parentPhone: true,
    phone: true,
    signature: false,
    notes: false,
  }),
};

export const StudentCustomPrintModal: React.FC<StudentCustomPrintModalProps> = ({
  isOpen,
  onClose,
  studentsList,
  selectedClass,
}) => {
  const { user, profile } = useAuth();
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  // Dokumen Konfigurasi
  const defaultDocTitle = selectedClass 
    ? `DAFTAR SISWA KELAS ${selectedClass.name.toUpperCase()}`
    : 'DAFTAR DATA POKOK SISWA';
  const [docTitle, setDocTitle] = useState(defaultDocTitle);
  const [docSubtitle, setDocSubtitle] = useState('');
  const [showKop, setShowKop] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [teacherSignerTitle, setTeacherSignerTitle] = useState(selectedClass ? 'Wali Kelas' : 'Guru Pembina / Wali Data');

  // Pilihan Kolom Aktif (Checked) - Diinisialisasi dari preset standar, tetapi sepenuhnya bebas diedit
  const [selectedColumnIds, setSelectedColumnIds] = useState<Record<string, boolean>>(() =>
    PRESET_COLUMNS.standar(Boolean(selectedClass))
  );

  // Status template yang terakhir kali diterapkan sebagai dasar (preset)
  const [appliedPreset, setAppliedPreset] = useState<PresetKey | null>('standar');
  const [printError, setPrintError] = useState<string | null>(null);

  // Urutan Kolom (Dapat diubah-ubah posisi indexnya)
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_ORDER);

  // Kolom Tambahan Manual (Custom Columns)
  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>([]);

  // State Form Tambah Kolom Kustom
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColType, setNewColType] = useState<'empty' | 'dots' | 'text'>('empty');
  const [newColText, setNewColText] = useState('');
  const [newColWidth, setNewColWidth] = useState('90px');

  useEffect(() => {
    if (selectedClass) {
      setDocTitle(`DAFTAR SISWA KELAS ${selectedClass.name.toUpperCase()}`);
    } else {
      setDocTitle('DAFTAR DATA POKOK SISWA');
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!user || !isOpen) return;
    getSchoolSettings(user.uid)
      .then(sch => {
        if (sch) setSchoolSettings(sch);
      })
      .catch(err => {
        console.error('Error fetching school settings for print:', err);
      });
  }, [user, isOpen]);

  // Cek apakah pilihan kolom saat ini masih identik 100% dengan preset yang dipilih
  const isMatchingPreset = useMemo(() => {
    if (!appliedPreset) return false;
    const expected = PRESET_COLUMNS[appliedPreset](Boolean(selectedClass));
    for (const col of BASE_COLUMNS) {
      if (!!expected[col.key] !== !!selectedColumnIds[col.key]) {
        return false;
      }
    }
    // Jika ada kolom kustom yang dicentang, maka status menjadi kustom
    for (const custom of customColumns) {
      if (selectedColumnIds[custom.id]) {
        return false;
      }
    }
    return true;
  }, [appliedPreset, selectedClass, selectedColumnIds, customColumns]);

  // Daftar kolom terpilih yang sudah diurutkan sesuai urutan pengguna
  const activeColumns = useMemo(() => {
    return columnOrder
      .filter(id => selectedColumnIds[id])
      .map(id => {
        const base = BASE_COLUMNS.find(c => c.key === id);
        if (base) {
          return {
            id: base.key,
            label: base.label,
            isCustom: false,
            width: base.width,
            category: base.category,
          };
        }
        const custom = customColumns.find(c => c.id === id);
        if (custom) {
          return {
            id: custom.id,
            label: custom.label,
            isCustom: true,
            width: custom.width,
            contentType: custom.contentType,
            customText: custom.customText,
            category: 'format' as const,
          };
        }
        return null;
      })
      .filter(Boolean) as {
        id: string;
        label: string;
        isCustom: boolean;
        width?: string;
        contentType?: 'empty' | 'dots' | 'text';
        customText?: string;
        category: string;
      }[];
  }, [columnOrder, selectedColumnIds, customColumns]);

  // Toggle Centang Kolom (Bebas tanpa ikatan ke template)
  const toggleColumn = (id: string) => {
    setPrintError(null);
    setSelectedColumnIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Reorder kolom (menggeser kolom ke depan/kiri atau ke belakang/kanan)
  const moveColumn = (id: string, direction: 'prev' | 'next') => {
    const currentActiveIds = columnOrder.filter(cId => selectedColumnIds[cId]);
    const currentIndex = currentActiveIds.indexOf(id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentActiveIds.length) return;

    const targetId = currentActiveIds[targetIndex];

    setColumnOrder(prev => {
      const newOrder = [...prev];
      const indexA = newOrder.indexOf(id);
      const indexB = newOrder.indexOf(targetId);
      if (indexA !== -1 && indexB !== -1) {
        newOrder[indexA] = targetId;
        newOrder[indexB] = id;
      }
      return newOrder;
    });
  };

  // Reset urutan kolom ke urutan standar bawaan
  const resetOrderToDefault = () => {
    setColumnOrder(DEFAULT_ORDER.concat(customColumns.map(c => c.id)));
  };

  // Tambah kolom manual kustom
  const handleAddCustomColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newColTitle.trim()) return;

    const newId = `custom_${Date.now()}`;
    const newCol: CustomColumnDef = {
      id: newId,
      label: newColTitle.trim(),
      contentType: newColType,
      customText: newColText.trim(),
      width: newColWidth.trim() || '90px',
    };

    setCustomColumns(prev => [...prev, newCol]);
    setSelectedColumnIds(prev => ({ ...prev, [newId]: true }));
    setColumnOrder(prev => [...prev, newId]);
    setPrintError(null);

    setNewColTitle('');
    setNewColText('');
    setShowAddCustom(false);
  };

  // Hapus kolom manual kustom
  const handleDeleteCustomColumn = (id: string) => {
    setCustomColumns(prev => prev.filter(c => c.id !== id));
    setSelectedColumnIds(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setColumnOrder(prev => prev.filter(colId => colId !== id));
  };

  // Preset Template Cepat (Hanya mengisi pilihan awal/shortcut, pengguna tetap bebas mengubah checkbox satu per satu)
  const applyPreset = (preset: PresetKey | 'all' | 'none') => {
    setPrintError(null);
    if (preset === 'all') {
      const allTrue: Record<string, boolean> = {};
      BASE_COLUMNS.forEach(c => { allTrue[c.key] = true; });
      customColumns.forEach(c => { allTrue[c.id] = true; });
      setSelectedColumnIds(allTrue);
      setAppliedPreset(null);
      return;
    }

    if (preset === 'none') {
      const allFalse: Record<string, boolean> = {};
      BASE_COLUMNS.forEach(c => { allFalse[c.key] = false; });
      customColumns.forEach(c => { allFalse[c.id] = false; });
      setSelectedColumnIds(allFalse);
      setAppliedPreset(null);
      return;
    }

    const presetCols = PRESET_COLUMNS[preset](Boolean(selectedClass));
    setSelectedColumnIds(prev => {
      const next: Record<string, boolean> = {};
      BASE_COLUMNS.forEach(c => {
        next[c.key] = !!presetCols[c.key];
      });
      // Pertahankan status kolom kustom/manual yang sudah dibuat pengguna
      customColumns.forEach(c => {
        next[c.id] = prev[c.id] !== undefined ? prev[c.id] : false;
      });
      return next;
    });
    setAppliedPreset(preset);
  };

  const handlePrint = () => {
    if (activeColumns.length === 0) {
      setPrintError('Pilih minimal satu kolom yang ingin ditampilkan untuk dicetak.');
      return;
    }
    setPrintError(null);
    window.print();
  };

  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Rekap Data Diri Siswa (Kustomisasi Kolom & Urutan)"
      size="2xl"
    >
      <div className="space-y-6">
        {/* PRINT CONFIGURATION TOOLBAR (NO PRINT) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 no-print text-xs">
          {/* Header & Orientation */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Pengaturan Format & Kustomisasi Kolom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Orientasi Kertas:</span>
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                    orientation === 'portrait' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Portrait (Tegak)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                    orientation === 'landscape' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Landscape (Melebar)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Presets & Select All */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Template Cepat (Preset Awal):
                </span>
                {appliedPreset && isMatchingPreset && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Preset Aktif: {PRESET_LABELS[appliedPreset]}
                  </span>
                )}
                {appliedPreset && !isMatchingPreset && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Kustom (Basis: {PRESET_LABELS[appliedPreset]})
                  </span>
                )}
                {!appliedPreset && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Kustom / Bebas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer transition"
                >
                  Centang Semua
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('none')}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer transition"
                >
                  Kosongkan Semua
                </button>
              </div>
            </div>

            {/* Template Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['standar', 'emis', 'absen', 'wali'] as PresetKey[]).map(key => {
                const isSelected = appliedPreset === key;
                const isExact = isSelected && isMatchingPreset;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition flex items-center gap-1.5 ${
                      isExact
                        ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600'
                        : isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300 border border-indigo-300 dark:border-indigo-700'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{PRESET_LABELS[key]}</span>
                    {isExact && (
                      <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
                        Preset
                      </span>
                    )}
                    {isSelected && !isExact && (
                      <span className="text-[9px] bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded-full font-bold">
                        Kustom
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 Template berfungsi sebagai preset cepat. Setelah template dipilih, Anda bebas mencentang atau menghapus centang setiap kolom secara mandiri.
            </p>
          </div>

          {/* Column Toggles Grid */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Centang Kolom Yang Ingin Ditampilkan ({activeColumns.length} dipilih):
              </span>
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kolom Manual</span>
              </button>
            </div>

            {/* Standard Columns Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {BASE_COLUMNS.map(col => {
                const isChecked = !!selectedColumnIds[col.key];
                return (
                  <button
                    type="button"
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer select-none transition ${
                      isChecked
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-cyan-200 font-medium'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-cyan-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate text-xs">{col.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom User-Defined Columns (if any) */}
            {customColumns.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Kolom Tambahan Manual Anda:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {customColumns.map(col => {
                    const isChecked = !!selectedColumnIds[col.id];
                    return (
                      <div
                        key={col.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition ${
                          isChecked
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-medium'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <button 
                          type="button"
                          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer select-none"
                          onClick={() => toggleColumn(col.id)}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="truncate block font-semibold text-xs">{col.label}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {col.contentType === 'dots' ? 'Garis Titik-titik' : col.contentType === 'text' ? `Teks: "${col.customText || '-'}"` : 'Kolom Kosong'}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomColumn(col.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                          title="Hapus Kolom Kustom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Custom Column Drawer/Card */}
            {showAddCustom && (
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Tambah Kolom Manual Baru
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Nama Header Kolom *</label>
                    <input
                      type="text"
                      placeholder="Contoh: Ukuran Seragam / Status PIP"
                      value={newColTitle}
                      onChange={e => setNewColTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Jenis Isian Kolom</label>
                    <select
                      value={newColType}
                      onChange={e => setNewColType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="empty">Kolom Kosong (Tulis Tangan)</option>
                      <option value="dots">Garis Titik-Titik (............)</option>
                      <option value="text">Teks Tertentu Seragam</option>
                    </select>
                  </div>
                  <div>
                    {newColType === 'text' ? (
                      <>
                        <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Teks Isian Default</label>
                        <input
                          type="text"
                          placeholder="Misal: Sudah / Belum"
                          value={newColText}
                          onChange={e => setNewColText(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Perkiraan Lebar Kolom</label>
                        <input
                          type="text"
                          placeholder="Contoh: 90px atau 120px"
                          value={newColWidth}
                          onChange={e => setNewColWidth(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCustomColumn()}
                    disabled={!newColTitle.trim()}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    Simpan & Pasang Kolom
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reorder Columns Section */}
          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                Urutan Kolom Cetak ({activeColumns.length} Kolom Terpilih - Geser Posisi):
              </span>
              <button
                type="button"
                onClick={resetOrderToDefault}
                className="text-[11px] text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Urutan Bawaan
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gunakan tombol panah (◀ / ▶) pada kolom di bawah ini untuk mengatur urutan posisi tabel dari kiri ke kanan:
            </p>

            <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
              {activeColumns.map((col, idx) => (
                <div
                  key={col.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold">{col.label}</span>
                  {col.isCustom && (
                    <span className="px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-bold">
                      Kustom
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => moveColumn(col.id, 'prev')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-25 cursor-pointer text-slate-600 dark:text-slate-300"
                      title="Geser ke kiri / sebelumnya"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(col.id, 'next')}
                      disabled={idx === activeColumns.length - 1}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-25 cursor-pointer text-slate-600 dark:text-slate-300"
                      title="Geser ke kanan / setelahnya"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extra options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Dokumen</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Subjudul / Keterangan Tambahan</label>
              <input
                type="text"
                value={docSubtitle}
                onChange={e => setDocSubtitle(e.target.value)}
                placeholder="Contoh: Semester Ganjil - Tahun Ajaran 2026/2027"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-4 sm:pt-5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showKop}
                  onChange={e => setShowKop(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Kop Madrasah</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={e => setShowSignatures(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Tanda Tangan</span>
              </label>
            </div>
          </div>

          {/* Warning Banner if No Column Selected */}
          {printError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <span className="font-semibold">⚠️ {printError}</span>
              <button
                type="button"
                onClick={() => setPrintError(null)}
                className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Action Print Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Total Siap Cetak: <strong>{studentsList.length} Siswa</strong> ({activeColumns.length} Kolom terpilih)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Dokumen (Print / PDF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* PRINTABLE PREVIEW & PHYSICAL OUTPUT SHEET */}
        <div 
          className="print-sheet bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-xs text-slate-900 font-serif overflow-x-auto print:border-none print:shadow-none print:p-0 print:m-0"
          style={{
            pageBreakInside: 'avoid',
          }}
        >
          {/* Dynamic Print CSS Injection for Orientation */}
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: ${orientation};
                  margin: 10mm 8mm;
                }
                body {
                  background: #fff !important;
                  color: #000 !important;
                  font-family: 'Times New Roman', Times, serif;
                }
                .no-print {
                  display: none !important;
                }
                .print-sheet {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  max-height: none !important;
                  overflow: visible !important;
                }
                table {
                  border-collapse: collapse !important;
                  width: 100% !important;
                }
                th, td {
                  border: 1px solid #000 !important;
                  color: #000 !important;
                }
              }
            `
          }} />

          {/* KOP SURAT MADRASAH (4-LAYER KEMENAG TANPA NSM/NPSN) */}
          {showKop && (
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <div className="flex items-center justify-between gap-4">
                <div className="w-14 h-14 flex items-center justify-center shrink-0">
                  {schoolSettings?.schoolLogoUrl ? (
                    <img 
                      src={schoolSettings.schoolLogoUrl} 
                      alt="Logo Madrasah" 
                      className="max-w-14 max-h-14 object-contain"
                    />
                  ) : (
                    <Building2 className="w-12 h-12 text-slate-800" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-center">
                  <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                    KEMENTERIAN AGAMA REPUBLIK INDONESIA
                  </h4>
                  <h5 className="text-[11px] font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                    {schoolSettings?.kemenagDistrict || (
                      schoolSettings?.regency 
                        ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolSettings.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
                        : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
                    )}
                  </h5>
                  <h3 className="text-base sm:text-lg font-black uppercase text-slate-950 my-0.5 leading-snug">
                    {schoolSettings?.schoolName || 'MAN 2 SERAM BAGIAN TIMUR'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-700 leading-snug">
                    {schoolSettings?.address || 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula'}
                  </p>
                </div>

                <div className="w-14 h-14 shrink-0" />
              </div>
            </div>
          )}

          {/* DOKUMEN TITLE */}
          <div className="text-center my-4">
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-900 underline underline-offset-4">
              {docTitle}
            </h2>
            <p className="text-xs text-slate-600 mt-1 font-sans">
              {docSubtitle || (
                <>Tahun Ajaran: {activeAcademicYear?.label || '2026/2027'} • Semester {activeSemester}</>
              )}
            </p>
          </div>

          {/* TABLE DATA SISWA DENGAN URUTAN DINAMIS */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-slate-900 font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200/60 text-slate-900 border-b border-slate-900 font-bold text-center">
                  {activeColumns.map(col => (
                    <th 
                      key={col.id}
                      style={{ width: col.width }}
                      className="border border-slate-900 px-2 py-1.5 font-bold tracking-tight uppercase text-[10px]"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentsList.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={Math.max(1, activeColumns.length)}
                      className="border border-slate-900 text-center py-6 text-slate-500 italic"
                    >
                      Tidak ada data siswa yang terpilih untuk dicetak.
                    </td>
                  </tr>
                ) : (
                  studentsList.map((item, index) => {
                    const st = item.student;
                    const enr = item.enrollment;
                    const clsName = item.className || enr?.className || (selectedClass?.name || '-');

                    return (
                      <tr 
                        key={st.id || index}
                        className="hover:bg-slate-50/50 print:hover:bg-transparent leading-tight"
                      >
                        {activeColumns.map(col => {
                          if (col.id === 'no') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-1.5 py-1.5 text-center font-mono text-[10px]">
                                {index + 1}
                              </td>
                            );
                          }

                          if (col.id === 'className') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-medium">
                                {clsName}
                              </td>
                            );
                          }

                          if (col.id === 'fullName') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2.5 py-1.5 font-semibold text-slate-900 text-left">
                                {st.fullName}
                              </td>
                            );
                          }

                          if (col.id === 'gender') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-1.5 py-1.5 text-center font-bold">
                                {st.gender || 'L'}
                              </td>
                            );
                          }

                          if (col.id === 'nis') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.nis || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'nisn') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.nisn || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'nikSiswa') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.nikSiswa || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'nikIbu') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.nikIbu || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'nkk') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.nkk || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'birthInfo') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-left text-[10px]">
                                {[st.birthPlace, st.birthDate].filter(Boolean).join(', ') || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'address') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-left text-[10px]">
                                {st.address || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'parentName') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-left">
                                {st.parentName || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'parentPhone') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.parentPhone || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'phone') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                                {st.phone || '-'}
                              </td>
                            );
                          }

                          if (col.id === 'signature') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-2 text-left h-7 relative">
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {index + 1}. ............
                                </span>
                              </td>
                            );
                          }

                          if (col.id === 'notes') {
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center text-[10px]">
                              </td>
                            );
                          }

                          // Kolom Manual Kustom Pengguna
                          if (col.isCustom) {
                            if (col.contentType === 'dots') {
                              return (
                                <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center text-slate-400 font-mono text-[9px]">
                                  ................
                                </td>
                              );
                            }
                            if (col.contentType === 'text') {
                              return (
                                <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center text-[10px]">
                                  {col.customText || '-'}
                                </td>
                              );
                            }
                            return (
                              <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center text-[10px]">
                              </td>
                            );
                          }

                          return (
                            <td key={col.id} className="border border-slate-900 px-2 py-1.5 text-center text-[10px]">
                              -
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER PENGESAHAN / TANDA TANGAN */}
          {showSignatures && (
            <div className="mt-8 pt-4 flex items-start justify-between text-xs text-slate-800 break-inside-avoid font-sans">
              <div className="text-center w-64">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala Madrasah</p>
                <div className="h-16 flex items-center justify-center">
                  {schoolSettings?.headmasterSignatureUrl && (
                    <img 
                      src={schoolSettings.headmasterSignatureUrl} 
                      alt="Tanda Tangan Kepala" 
                      className="max-h-14 max-w-40 object-contain"
                    />
                  )}
                </div>
                <p className="font-bold underline">
                  {formatOfficialSignatureName(schoolSettings?.headmasterName, 'Kepala Madrasah')}
                </p>
                <p className="text-[10px] font-mono text-slate-600">
                  {formatOfficialNip(schoolSettings?.headmasterNip)}
                </p>
              </div>

              <div className="text-center w-64">
                <p>{schoolSettings?.district || 'Kota'}, {todayFormatted}</p>
                <p className="font-bold">{teacherSignerTitle}</p>
                <div className="h-16 flex items-center justify-center">
                  {/* Space for signature */}
                </div>
                <p className="font-bold underline">
                  {formatOfficialSignatureName(profile?.displayName, 'Guru / Wali Data')}
                </p>
                <p className="text-[10px] font-mono text-slate-600">
                  {formatOfficialNip(profile?.nip)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
