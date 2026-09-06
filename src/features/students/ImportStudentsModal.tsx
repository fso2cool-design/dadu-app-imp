import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { atomicImportStudentsWithEnrollment, ImportStudentItem } from '../../services/firestore/students';
import { Modal } from '../../components/common/Modal';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, X, Check } from 'lucide-react';
import { Student, GenderType } from '../../types';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetClassId?: string;
}

interface ParsedRow {
  rollNumber: number;
  fullName: string;
  nis: string;
  nisn: string;
  gender: GenderType;
  birthPlace: string;
  birthDate: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  address: string;
  isValid: boolean;
  validationError?: string;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetClassId,
}) => {
  const { user } = useAuth();
  const { classes, activeAcademicYear, triggerSyncFeedback } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedClassId, setSelectedClassId] = useState(targetClassId || classes[0]?.id || '');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'No Absen': 1,
        'Nama Lengkap': 'Ahmad Fauzi',
        'NIS': '20261001',
        'NISN': '0081234567',
        'Jenis Kelamin (L/P)': 'L',
        'Tempat Lahir': 'Bukittinggi',
        'Tanggal Lahir (YYYY-MM-DD)': '2009-05-14',
        'No HP Siswa': '081234567890',
        'Nama Orang Tua / Wali': 'H. Syahril',
        'No HP Ortu': '081398765432',
        'Alamat': 'Jl. Sudirman No. 12',
      },
      {
        'No Absen': 2,
        'Nama Lengkap': 'Aisyah Putri Rahma',
        'NIS': '20261002',
        'NISN': '0087654321',
        'Jenis Kelamin (L/P)': 'P',
        'Tempat Lahir': 'Padang',
        'Tanggal Lahir (YYYY-MM-DD)': '2009-08-20',
        'No HP Siswa': '081298765432',
        'Nama Orang Tua / Wali': 'Drs. Ridwan',
        'No HP Ortu': '081234123412',
        'Alamat': 'Jl. M. Yamin No. 5',
      },
      {
        'No Absen': 3,
        'Nama Lengkap': 'Budi Santoso',
        'NIS': '20261003',
        'NISN': '0089988776',
        'Jenis Kelamin (L/P)': 'L',
        'Tempat Lahir': 'Jakarta',
        'Tanggal Lahir (YYYY-MM-DD)': '2009-02-10',
        'No HP Siswa': '',
        'Nama Orang Tua / Wali': 'Bambang',
        'No HP Ortu': '085211223344',
        'Alamat': 'Kompleks Asri Blok C-3',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa_TeacherWorkspace.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('File Excel / CSV kosong atau format tidak sesuai.');
          return;
        }

        const rows: ParsedRow[] = rawJson.map((row, idx) => {
          // Normalize column keys
          const name = String(row['Nama Lengkap'] || row['Nama'] || row['Full Name'] || row['nama'] || '').trim();
          const nis = String(row['NIS'] || row['Nis'] || row['nis'] || '').trim();
          const nisn = String(row['NISN'] || row['Nisn'] || row['nisn'] || '').trim();
          const rawGender = String(row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['Gender'] || row['JK'] || 'L').trim().toUpperCase();
          const gender: GenderType = rawGender.startsWith('P') || rawGender.startsWith('W') ? 'P' : 'L';
          const rollNo = Number(row['No Absen'] || row['Absen'] || row['No'] || idx + 1) || (idx + 1);
          const birthPlace = String(row['Tempat Lahir'] || '').trim();
          const birthDate = String(row['Tanggal Lahir (YYYY-MM-DD)'] || row['Tanggal Lahir'] || '').trim();
          const phone = String(row['No HP Siswa'] || row['HP Siswa'] || row['Phone'] || '').trim();
          const parentName = String(row['Nama Orang Tua / Wali'] || row['Nama Ortu'] || row['Orang Tua'] || '').trim();
          const parentPhone = String(row['No HP Ortu'] || row['HP Ortu'] || '').trim();
          const address = String(row['Alamat'] || '').trim();

          const isValid = !!name;
          const validationError = !name ? 'Nama lengkap wajib diisi' : undefined;

          return {
            rollNumber: rollNo,
            fullName: name,
            nis,
            nisn,
            gender,
            birthPlace,
            birthDate,
            phone,
            parentName,
            parentPhone,
            address,
            isValid,
            validationError,
          };
        }).filter(r => r.fullName.length > 0);

        setParsedRows(rows);
      } catch (err: any) {
        console.error('Error parsing Excel:', err);
        setErrorMsg('Gagal membaca file Excel/CSV. Pastikan format file benar.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveImport = async () => {
    if (!user || parsedRows.length === 0 || !activeAcademicYear) return;

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg('Tidak ada baris data siswa yang valid untuk diimpor.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      triggerSyncFeedback('syncing', `Mengimpor ${validRows.length} data siswa secara terpadu...`);

      const targetCls = selectedClassId ? classes.find(c => c.id === selectedClassId) : undefined;
      const enrollmentConfig = (selectedClassId && targetCls) ? {
        academicYearId: activeAcademicYear.id,
        classId: selectedClassId,
        className: targetCls.name,
        academicYearLabel: activeAcademicYear.label,
      } : undefined;

      const studentsToImport: ImportStudentItem[] = validRows.map((r, idx) => ({
        nis: r.nis,
        nisn: r.nisn,
        fullName: r.fullName,
        gender: r.gender,
        birthPlace: r.birthPlace,
        birthDate: r.birthDate,
        phone: r.phone,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
        address: r.address,
        notes: 'Diimpor via Excel',
        status: 'ACTIVE' as const,
        rollNumber: r.rollNumber || (idx + 1),
      }));

      const res = await atomicImportStudentsWithEnrollment(user.uid, studentsToImport, enrollmentConfig);

      triggerSyncFeedback('saved', `${res.count} siswa berhasil diimpor terpadu!`);
      setSuccessCount(res.count);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error importing students:', err);
      triggerSyncFeedback('synced');
      setErrorMsg(err.message || 'Gagal menyimpan data siswa ke database.');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setParsedRows([]);
    setFileName('');
    setErrorMsg(null);
    setSuccessCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Import Data Siswa dari Excel / CSV"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Step 1: Download template & class placement selection */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Template Excel Resmi
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Unduh template standar dengan header kolom yang sesuai format database.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            Unduh Template (.xlsx)
          </button>
        </div>

        {/* Enrollment Target Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Penempatan Kelas Otomatis
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Jangan Enroll ke Kelas (Hanya Simpan Master) --</option>
              {classes.filter(c => c.academicYearId === activeAcademicYear?.id && !c.isArchived).map(c => (
                <option key={c.id} value={c.id}>
                  Enroll langsung ke Kelas {c.name} (Tingkat {c.gradeLevel})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tahun Ajaran Aktif
            </label>
            <input
              type="text"
              disabled
              value={activeAcademicYear?.label || '2026/2027'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-500 font-medium"
            />
          </div>
        </div>

        {/* File Dropzone */}
        {parsedRows.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-indigo-50/70"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Klik atau Seret file Excel (.xlsx / .csv) ke sini
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Mendukung file Excel format Microsoft Excel (.xlsx), Spreadsheet (.xls), atau CSV.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-900">{fileName}</span>
                <span className="text-[11px] bg-white text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                  {parsedRows.length} Siswa Terbaca
                </span>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Ganti File
              </button>
            </div>

            {/* Preview Table */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-12 text-center">No</th>
                    <th className="p-2.5">Nama Lengkap</th>
                    <th className="p-2.5 w-24">NIS / NISN</th>
                    <th className="p-2.5 w-14 text-center">L/P</th>
                    <th className="p-2.5">Ortu / Wali</th>
                    <th className="p-2.5">Kontak</th>
                    <th className="p-2.5 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {parsedRows.map((r, i) => (
                    <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                      <td className="p-2 text-center font-mono font-semibold">{r.rollNumber}</td>
                      <td className="p-2 font-medium text-slate-800">{r.fullName}</td>
                      <td className="p-2 font-mono text-[11px] text-slate-500">
                        {r.nis || '-'}{r.nisn ? ` / ${r.nisn}` : ''}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                          {r.gender}
                        </span>
                      </td>
                      <td className="p-2 text-[11px] text-slate-600">{r.parentName || '-'}</td>
                      <td className="p-2 text-[11px] text-slate-500">{r.parentPhone || r.phone || '-'}</td>
                      <td className="p-2 text-center">
                        {r.isValid ? (
                          <span className="inline-flex items-center text-emerald-600 text-[10px] font-bold">
                            <Check className="w-3 h-3 mr-0.5" /> Siap
                          </span>
                        ) : (
                          <span className="text-rose-600 text-[10px] font-bold">
                            {r.validationError}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successCount !== null && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Berhasil mengimpor {successCount} data siswa ke database!</span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              resetState();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading || parsedRows.length === 0 || successCount !== null}
            onClick={handleSaveImport}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {loading ? 'Menyimpan ke Firestore...' : `Simpan ${parsedRows.length} Siswa`}
          </button>
        </div>
      </div>
    </Modal>
  );
};
