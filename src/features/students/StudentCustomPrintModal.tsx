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
  FileText, 
  Check, 
  RotateCcw,
  Sparkles,
  ChevronDown
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

type ColumnKey = 
  | 'no'
  | 'rollNumber'
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

interface ColumnDef {
  key: ColumnKey;
  label: string;
  category: 'identitas' | 'kependudukan' | 'biodata' | 'kontak' | 'format';
  width?: string;
}

const AVAILABLE_COLUMNS: ColumnDef[] = [
  { key: 'no', label: 'No.', category: 'identitas', width: '35px' },
  { key: 'rollNumber', label: 'No. Absen', category: 'identitas', width: '45px' },
  { key: 'className', label: 'Kelas / Rombel', category: 'identitas', width: '70px' },
  { key: 'fullName', label: 'Nama Lengkap Siswa', category: 'identitas' },
  { key: 'gender', label: 'L/P', category: 'identitas', width: '35px' },
  { key: 'nis', label: 'NIS', category: 'identitas', width: '75px' },
  { key: 'nisn', label: 'NISN', category: 'identitas', width: '85px' },
  { key: 'nikSiswa', label: 'NIK Siswa', category: 'kependudukan', width: '120px' },
  { key: 'nikIbu', label: 'NIK Ibu Kandung', category: 'kependudukan', width: '120px' },
  { key: 'nkk', label: 'No. KK (NKK)', category: 'kependudukan', width: '120px' },
  { key: 'birthInfo', label: 'Tempat, Tanggal Lahir', category: 'biodata' },
  { key: 'address', label: 'Alamat', category: 'biodata' },
  { key: 'parentName', label: 'Nama Orang Tua / Wali', category: 'kontak' },
  { key: 'parentPhone', label: 'No. HP Ortu / WA', category: 'kontak' },
  { key: 'phone', label: 'No. HP Siswa', category: 'kontak' },
  { key: 'signature', label: 'Tanda Tangan', category: 'format', width: '100px' },
  { key: 'notes', label: 'Keterangan', category: 'format', width: '80px' },
];

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

  // Pilihan Kolom
  const [selectedColumns, setSelectedColumns] = useState<Record<ColumnKey, boolean>>({
    no: true,
    rollNumber: true,
    className: !selectedClass, // otomatis false jika sedang filter 1 kelas
    fullName: true,
    gender: true,
    nis: true,
    nisn: true,
    nikSiswa: true,
    nikIbu: false,
    nkk: false,
    birthInfo: true,
    address: false,
    parentName: true,
    parentPhone: true,
    phone: false,
    signature: false,
    notes: false,
  });

  useEffect(() => {
    if (selectedClass) {
      setDocTitle(`DAFTAR SISWA KELAS ${selectedClass.name.toUpperCase()}`);
      setSelectedColumns(prev => ({
        ...prev,
        className: false,
      }));
    } else {
      setDocTitle('DAFTAR DATA POKOK SISWA');
      setSelectedColumns(prev => ({
        ...prev,
        className: true,
      }));
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

  const activeColumnDefs = useMemo(() => {
    return AVAILABLE_COLUMNS.filter(col => selectedColumns[col.key]);
  }, [selectedColumns]);

  // Otomatis rekomendasi orientasi berdasarkan jumlah kolom
  useEffect(() => {
    if (activeColumnDefs.length > 7) {
      setOrientation('landscape');
    } else {
      setOrientation('portrait');
    }
  }, [activeColumnDefs.length]);

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const applyPreset = (preset: 'standar' | 'emis' | 'absen' | 'wali' | 'all') => {
    if (preset === 'all') {
      const allTrue = {} as Record<ColumnKey, boolean>;
      AVAILABLE_COLUMNS.forEach(c => (allTrue[c.key] = true));
      setSelectedColumns(allTrue);
    } else if (preset === 'standar') {
      setSelectedColumns({
        no: true,
        rollNumber: true,
        className: !selectedClass,
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
      });
    } else if (preset === 'emis') {
      setSelectedColumns({
        no: true,
        rollNumber: true,
        className: !selectedClass,
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
      });
    } else if (preset === 'absen') {
      setSelectedColumns({
        no: true,
        rollNumber: true,
        className: !selectedClass,
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
      });
    } else if (preset === 'wali') {
      setSelectedColumns({
        no: true,
        rollNumber: true,
        className: !selectedClass,
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
      });
    }
  };

  const handlePrint = () => {
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
      title="Cetak Data Siswa Lengkap (Kustomisasi Kolom)"
      size="2xl"
    >
      <div className="space-y-6">
        {/* PRINT CONFIGURATION TOOLBAR (NO PRINT) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 no-print text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-800 text-sm">Pengaturan Kolom & Format Lembar Cetak</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Orientasi Kertas:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                    orientation === 'portrait' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Portrait (Tegak)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                    orientation === 'landscape' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Landscape (Melebar)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Preset:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('standar')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
            >
              Standar Siswa
            </button>
            <button
              type="button"
              onClick={() => applyPreset('emis')}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 font-medium cursor-pointer"
            >
              EMIS / Kependudukan (NIK & KK)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('absen')}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-medium cursor-pointer"
            >
              Daftar Hadir & Tanda Tangan
            </button>
            <button
              type="button"
              onClick={() => applyPreset('wali')}
              className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-medium cursor-pointer"
            >
              Kontak Wali & Orang Tua
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
            >
              Centang Semua
            </button>
          </div>

          {/* Column Toggles Grid */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Pilih Kolom Yang Dicetak:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {AVAILABLE_COLUMNS.map(col => {
                const isChecked = selectedColumns[col.key];
                return (
                  <label
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition ${
                      isChecked
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by wrapper
                      className="hidden"
                    />
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Extra options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Judul Dokumen</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subjudul / Keterangan Tambahan</label>
              <input
                type="text"
                value={docSubtitle}
                onChange={e => setDocSubtitle(e.target.value)}
                placeholder="Contoh: Semester Ganjil - Tahun Ajaran 2026/2027"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
              />
            </div>
            <div className="flex items-center gap-4 sm:pt-5">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showKop}
                  onChange={e => setShowKop(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Kop Madrasah</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
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

          {/* Action Print Button */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-slate-500">
              Total Siap Cetak: <strong>{studentsList.length} Siswa</strong> ({activeColumnDefs.length} Kolom terpilih)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Dokumen (Print / PDF)</span>
              </button>
            </div>
          </div>
        </div>

        {/* PRINTABLE PREVIEW & PHYSICAL OUTPUT SHEET */}
        <div 
          className="print-sheet bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm text-slate-900 font-serif overflow-x-auto print:border-none print:shadow-none print:p-0 print:m-0"
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
                  margin: 12mm 10mm;
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

          {/* KOP SURAT MADRASAH */}
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

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-700">
                    KEMENTERIAN AGAMA REPUBLIK INDONESIA
                  </h4>
                  <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 leading-tight">
                    {schoolSettings?.schoolName || 'MADRASAH TSANAWIYAH'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5">
                    {schoolSettings?.address || 'Alamat Madrasah'} {schoolSettings?.district ? `• ${schoolSettings.district}` : ''} {schoolSettings?.postalCode ? `(${schoolSettings.postalCode})` : ''}
                  </p>
                  {(schoolSettings?.nsm || schoolSettings?.npsn) && (
                    <p className="text-[10px] text-slate-500 font-mono">
                      {schoolSettings?.nsm ? `NSM: ${schoolSettings.nsm}` : ''} {schoolSettings?.npsn ? `• NPSN: ${schoolSettings.npsn}` : ''}
                    </p>
                  )}
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

          {/* TABLE DATA SISWA */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse border border-slate-900 font-sans">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200/60 text-slate-900 border-b border-slate-900 font-bold text-center">
                  {activeColumnDefs.map(col => (
                    <th 
                      key={col.key}
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
                      colSpan={activeColumnDefs.length}
                      className="border border-slate-900 text-center py-6 text-slate-500 italic"
                    >
                      Tidak ada data siswa yang terpilih untuk dicetak.
                    </td>
                  </tr>
                ) : (
                  studentsList.map((item, index) => {
                    const st = item.student;
                    const enr = item.enrollment;
                    const rollNo = item.rollNumber || enr?.rollNumber || index + 1;
                    const clsName = item.className || enr?.className || (selectedClass?.name || '-');

                    return (
                      <tr 
                        key={st.id || index}
                        className="hover:bg-slate-50/50 print:hover:bg-transparent leading-tight"
                      >
                        {selectedColumns.no && (
                          <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono text-[10px]">
                            {index + 1}
                          </td>
                        )}

                        {selectedColumns.rollNumber && (
                          <td className="border border-slate-900 px-1.5 py-1.5 text-center font-mono font-bold text-[10px]">
                            {rollNo}
                          </td>
                        )}

                        {selectedColumns.className && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-medium">
                            {clsName}
                          </td>
                        )}

                        {selectedColumns.fullName && (
                          <td className="border border-slate-900 px-2.5 py-1.5 font-semibold text-slate-900 text-left">
                            {st.fullName}
                          </td>
                        )}

                        {selectedColumns.gender && (
                          <td className="border border-slate-900 px-1.5 py-1.5 text-center font-bold">
                            {st.gender || 'L'}
                          </td>
                        )}

                        {selectedColumns.nis && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.nis || '-'}
                          </td>
                        )}

                        {selectedColumns.nisn && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.nisn || '-'}
                          </td>
                        )}

                        {selectedColumns.nikSiswa && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.nikSiswa || '-'}
                          </td>
                        )}

                        {selectedColumns.nikIbu && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.nikIbu || '-'}
                          </td>
                        )}

                        {selectedColumns.nkk && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.nkk || '-'}
                          </td>
                        )}

                        {selectedColumns.birthInfo && (
                          <td className="border border-slate-900 px-2 py-1.5 text-left text-[10px]">
                            {[st.birthPlace, st.birthDate].filter(Boolean).join(', ') || '-'}
                          </td>
                        )}

                        {selectedColumns.address && (
                          <td className="border border-slate-900 px-2 py-1.5 text-left text-[10px]">
                            {st.address || '-'}
                          </td>
                        )}

                        {selectedColumns.parentName && (
                          <td className="border border-slate-900 px-2 py-1.5 text-left">
                            {st.parentName || '-'}
                          </td>
                        )}

                        {selectedColumns.parentPhone && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.parentPhone || '-'}
                          </td>
                        )}

                        {selectedColumns.phone && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                            {st.phone || '-'}
                          </td>
                        )}

                        {selectedColumns.signature && (
                          <td className="border border-slate-900 px-2 py-2 text-left h-7 relative">
                            <span className="text-[9px] text-slate-400 font-mono">
                              {index + 1}. ............
                            </span>
                          </td>
                        )}

                        {selectedColumns.notes && (
                          <td className="border border-slate-900 px-2 py-1.5 text-center text-[10px]">
                            {/* Tempat catatan manual */}
                          </td>
                        )}
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
