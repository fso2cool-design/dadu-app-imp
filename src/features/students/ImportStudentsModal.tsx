import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { atomicImportStudentsWithEnrollment, ImportStudentItem, getStudents } from '../../services/firestore/students';
import { Modal } from '../../components/common/Modal';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, X, Check, ArrowRight, Layers, HelpCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { GenderType, ClassItem, Student, StudentCustomFieldDefinition } from '../../types';
import { downloadStudentExcelTemplate } from '../../utils/studentExcelTemplate';
import { sanitizeExcelDate, getRowValueByAliases } from '../../utils/excelImportSanitizer';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetClassId?: string;
  customFields?: StudentCustomFieldDefinition[];
}

interface ParsedRow {
  originalIndex: number;
  rollNumber: number;
  fullName: string;
  rawClassName: string;
  targetClassId: string; // ID rombel tujuan, atau '' jika tanpa rombel
  targetClassName: string;
  classMatchStatus: 'MATCHED' | 'UNMATCHED' | 'UNASSIGNED';
  nis: string;
  nisn: string;
  gender: GenderType;
  birthPlace: string;
  birthDate: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  address: string;
  nikSiswa?: string;
  nikIbu?: string;
  nkk?: string;
  customAttributes?: Record<string, string>;
  isExistingInDb?: boolean;
  existingStudentName?: string;
  isValid: boolean;
  validationError?: string;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetClassId,
  customFields = [],
}) => {
  const { user } = useAuth();
  const { classes, activeAcademicYear, triggerSyncFeedback } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeClasses = useMemo(() => {
    return classes.filter(c => c.academicYearId === activeAcademicYear?.id && !c.isArchived);
  }, [classes, activeAcademicYear]);

  const [defaultClassId, setDefaultClassId] = useState<string>(targetClassId || activeClasses[0]?.id || '');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ total: number; enrolled: number; created: number; updated: number } | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);

  // Helper pencocokan cerdas nama kelas dari Excel ke rombel sistem
  const matchClassByName = (rawName: string, availableClasses: ClassItem[]): ClassItem | null => {
    const trimmed = rawName.trim();
    if (!trimmed) return null;

    // 1. Pencocokan tepat (case-insensitive)
    const exact = availableClasses.find(c => c.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact;

    // 2. Normalisasi karakter (hapus tanda baca dan spasi berlebih)
    const cleanStr = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanRaw = cleanStr(trimmed);
    const stripped = availableClasses.find(c => cleanStr(c.name) === cleanRaw);
    if (stripped) return stripped;

    // 3. Konversi angka romawi vs desimal (VII <-> 7, X <-> 10, dll)
    const toDigit = (s: string) => s.toLowerCase()
      .replace(/\bvii\b/g, '7')
      .replace(/\bviii\b/g, '8')
      .replace(/\bix\b/g, '9')
      .replace(/\bx\b/g, '10')
      .replace(/\bxi\b/g, '11')
      .replace(/\bxii\b/g, '12');

    const toRoman = (s: string) => s.toLowerCase()
      .replace(/\b7\b/g, 'vii')
      .replace(/\b8\b/g, 'viii')
      .replace(/\b9\b/g, 'ix')
      .replace(/\b10\b/g, 'x')
      .replace(/\b11\b/g, 'xi')
      .replace(/\b12\b/g, 'xii');

    const dMatch = availableClasses.find(c => toDigit(c.name.trim()) === toDigit(trimmed));
    if (dMatch) return dMatch;

    const rMatch = availableClasses.find(c => toRoman(c.name.trim()) === toRoman(trimmed));
    if (rMatch) return rMatch;

    return null;
  };

  const handleDownload = () => {
    downloadStudentExcelTemplate(activeClasses, customFields);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setSuccessInfo(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('File Excel / CSV kosong atau format baris tidak terbaca.');
          return;
        }

        // Ambil data siswa yang sudah ada untuk deteksi keberadaan di database (Smart Upsert / Overwrite)
        let existingNisnMap = new Map<string, string>();
        let existingNisMap = new Map<string, string>();
        let existingNameMap = new Map<string, string>();
        if (user) {
          try {
            const currentStudents = await getStudents(user.uid);
            currentStudents.forEach(s => {
              if (!s.isArchived) {
                if (s.nisn && s.nisn.trim()) {
                  existingNisnMap.set(s.nisn.trim().toLowerCase(), s.fullName);
                }
                if (s.nis && s.nis.trim()) {
                  existingNisMap.set(s.nis.trim().toLowerCase(), s.fullName);
                }
                if (s.fullName && s.fullName.trim()) {
                  const norm = s.fullName.trim().toLowerCase().replace(/\s+/g, ' ');
                  existingNameMap.set(norm, s.fullName);
                }
              }
            });
          } catch (e) {
            console.error('Error fetching existing students for check:', e);
          }
        }

        // Lacak duplikasi NISN internal di dalam file
        const seenNisnsInFile = new Set<string>();
        const defaultClassObj = activeClasses.find(c => c.id === defaultClassId);

        const rows: ParsedRow[] = rawJson.map((row, idx) => {
          const name = String(row['Nama Lengkap'] || row['Nama'] || row['Full Name'] || row['nama'] || '').trim();
          const rawClass = String(
            row['Kelas'] || row['Rombel'] || row['Kelas / Rombel'] || row['Class'] || row['Rombongan Belajar'] || ''
          ).trim();
          const nis = String(row['NIS'] || row['Nis'] || row['nis'] || '').trim();
          const nisn = String(row['NISN'] || row['Nisn'] || row['nisn'] || '').trim();
          const rawGender = String(row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['Gender'] || row['JK'] || 'L').trim().toUpperCase();
          const gender: GenderType = rawGender.startsWith('P') || rawGender.startsWith('W') ? 'P' : 'L';
          
          // Nomor absen dari berkas jika ada
          const rawRoll = Number(row['No Absen'] || row['Absen'] || row['No Urut'] || 0);
          const rollNo = !isNaN(rawRoll) && rawRoll > 0 ? rawRoll : 0;

          const birthPlace = getRowValueByAliases(row, [
            'Tempat Lahir', 'TempatLahir', 'Tempat Lahir Siswa', 'Kota Lahir', 'Birth Place'
          ]);

          // Sanitasi cerdas untuk Tanggal Lahir (Mendukung serial Excel, DD/MM/YYYY, teks bulan, dan ISO)
          const rawBirthDate = getRowValueByAliases(row, [
            'Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir', 'Tgl Lahir', 'TglLahir', 
            'TanggalLahir', 'Tgl Lahir Siswa', 'Birth Date', 'DOB'
          ]) || row['Tanggal Lahir (YYYY-MM-DD)'] || row['Tanggal Lahir'] || row['Tgl Lahir'];
          const birthDate = sanitizeExcelDate(rawBirthDate);

          const phone = getRowValueByAliases(row, [
            'No HP Siswa', 'No HP', 'HP Siswa', 'Nomor HP Siswa', 'Telepon Siswa', 'Phone', 'No. HP Siswa'
          ]);
          const parentName = getRowValueByAliases(row, [
            'Nama Orang Tua / Wali', 'Nama Orang Tua', 'Nama Ortu', 'Nama Wali', 'Orang Tua', 'Ortu', 'Nama Ayah', 'Nama Ibu', 'Parent Name'
          ]);
          const parentPhone = getRowValueByAliases(row, [
            'No HP Ortu', 'No HP Orang Tua', 'HP Ortu', 'Nomor HP Ortu', 'No Telp Ortu', 'No. HP Ortu'
          ]);

          // Pencocokan fleksibel untuk Alamat (Mendukung Alamat, Alamat Siswa, Alamat Rumah, Domisili, dll)
          const address = getRowValueByAliases(row, [
            'Alamat', 'Alamat Siswa', 'Alamat Lengkap', 'Alamat Rumah', 'Alamat Domisili', 'Alamat Tinggal', 'Domisili', 'Address'
          ]);

          // Pencocokan data kependudukan (NIK Siswa, NIK Ibu, NKK)
          const rawNikSiswa = getRowValueByAliases(row, [
            'NIK SISWA', 'NIK Siswa', 'NIK', 'Nik Siswa', 'Nik', 'Nomor Induk Kependudukan', 'Nomor Induk Kependudukan Siswa'
          ]);
          const nikSiswa = rawNikSiswa ? String(rawNikSiswa).replace(/[^0-9]/g, '').slice(0, 16) : '';

          const rawNikIbu = getRowValueByAliases(row, [
            'NIK IBU', 'NIK Ibu', 'NIK Ibu Kandung', 'Nik Ibu', 'Nik Ibu Kandung', 'NIK Orang Tua'
          ]);
          const nikIbu = rawNikIbu ? String(rawNikIbu).replace(/[^0-9]/g, '').slice(0, 16) : '';

          const rawNkk = getRowValueByAliases(row, [
            'NKK', 'No KK', 'Nomor KK', 'No. KK', 'Kartu Keluarga', 'Nomor Kartu Keluarga'
          ]);
          const nkk = rawNkk ? String(rawNkk).replace(/[^0-9]/g, '').slice(0, 16) : '';

          // Ekstrak Kolom Kustom Tambahan Dinamis
          const rowCustomAttributes: Record<string, string> = {};
          if (customFields && customFields.length > 0) {
            customFields.forEach((cf) => {
              const aliases = [
                cf.name,
                cf.key,
                cf.name.toLowerCase(),
                cf.key.toLowerCase(),
                cf.name.toUpperCase(),
              ];
              const val = getRowValueByAliases(row, aliases);
              if (val !== undefined && val !== null && String(val).trim() !== '') {
                rowCustomAttributes[cf.key] = String(val).trim();
              }
            });
          }

          // Deteksi Kelas Otomatis
          let targetId = '';
          let targetName = '';
          let matchStatus: 'MATCHED' | 'UNMATCHED' | 'UNASSIGNED' = 'UNASSIGNED';

          if (rawClass) {
            const matched = matchClassByName(rawClass, activeClasses);
            if (matched) {
              targetId = matched.id;
              targetName = matched.name;
              matchStatus = 'MATCHED';
            } else {
              matchStatus = 'UNMATCHED';
              // Fallback ke default class jika disetel
              if (defaultClassObj) {
                targetId = defaultClassObj.id;
                targetName = defaultClassObj.name;
              }
            }
          } else {
            // Kolom kelas kosong di Excel
            if (defaultClassObj) {
              targetId = defaultClassObj.id;
              targetName = defaultClassObj.name;
              matchStatus = 'MATCHED';
            } else {
              matchStatus = 'UNASSIGNED';
            }
          }

          let isValid = !!name;
          let validationError = !name ? 'Nama lengkap wajib diisi' : undefined;

          // Deteksi apakah siswa ini sudah ada di database (berdasarkan NISN, NIS, atau Nama)
          let isExistingInDb = false;
          let existingStudentName: string | undefined = undefined;

          const normName = name.toLowerCase().replace(/\s+/g, ' ');
          if (nisn && existingNisnMap.has(nisn.toLowerCase())) {
            isExistingInDb = true;
            existingStudentName = existingNisnMap.get(nisn.toLowerCase());
          } else if (nis && existingNisMap.has(nis.toLowerCase())) {
            isExistingInDb = true;
            existingStudentName = existingNisMap.get(nis.toLowerCase());
          } else if (name && existingNameMap.has(normName)) {
            isExistingInDb = true;
            existingStudentName = existingNameMap.get(normName);
          }

          if (nisn) {
            if (seenNisnsInFile.has(nisn)) {
              isValid = false;
              validationError = `Duplikasi NISN "${nisn}" di dalam berkas impor`;
            } else {
              seenNisnsInFile.add(nisn);
            }
          }

          return {
            originalIndex: idx,
            rollNumber: rollNo,
            fullName: name,
            rawClassName: rawClass,
            targetClassId: targetId,
            targetClassName: targetName,
            classMatchStatus: matchStatus,
            nis,
            nisn,
            gender,
            birthPlace,
            birthDate,
            phone,
            parentName,
            parentPhone,
            address,
            nikSiswa,
            nikIbu,
            nkk,
            customAttributes: rowCustomAttributes,
            isExistingInDb,
            existingStudentName,
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

  // Hitung penomoran absen A-Z secara dinamis per-kelas untuk pratinjau
  const rowsWithComputedRoll = useMemo(() => {
    const classRollCounters = new Map<string, number>();
    return parsedRows.map((r, globalIdx) => {
      let computedRoll = r.rollNumber;
      if (r.targetClassId) {
        if (!computedRoll || computedRoll <= 0) {
          const next = (classRollCounters.get(r.targetClassId) || 0) + 1;
          classRollCounters.set(r.targetClassId, next);
          computedRoll = next;
        } else {
          const cur = classRollCounters.get(r.targetClassId) || 0;
          if (computedRoll > cur) classRollCounters.set(r.targetClassId, computedRoll);
        }
      } else {
        computedRoll = computedRoll && computedRoll > 0 ? computedRoll : globalIdx + 1;
      }

      return {
        ...r,
        computedRoll,
      };
    });
  }, [parsedRows]);

  // Daftar nama kelas mentah yang tidak cocok dengan kelas terdaftar
  const unmatchedClassGroups = useMemo(() => {
    const map = new Map<string, number>();
    parsedRows.forEach(r => {
      if (r.classMatchStatus === 'UNMATCHED' && r.rawClassName) {
        map.set(r.rawClassName, (map.get(r.rawClassName) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [parsedRows]);

  // Bulk map: Petakan seluruh siswa dengan nama kelas mentah tertentu ke kelas sistem
  const handleBulkMapClass = (rawName: string, newTargetClassId: string) => {
    const targetCls = activeClasses.find(c => c.id === newTargetClassId);
    setParsedRows(prev =>
      prev.map(r => {
        if (r.rawClassName === rawName) {
          return {
            ...r,
            targetClassId: newTargetClassId,
            targetClassName: targetCls?.name || '',
            classMatchStatus: newTargetClassId ? 'MATCHED' : 'UNASSIGNED',
          };
        }
        return r;
      })
    );
  };

  // Ubah kelas per-baris siswa
  const handleRowClassChange = (index: number, newTargetClassId: string) => {
    const targetCls = activeClasses.find(c => c.id === newTargetClassId);
    setParsedRows(prev =>
      prev.map((r, i) => {
        if (i === index) {
          return {
            ...r,
            targetClassId: newTargetClassId,
            targetClassName: targetCls?.name || '',
            classMatchStatus: newTargetClassId ? 'MATCHED' : 'UNASSIGNED',
          };
        }
        return r;
      })
    );
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
      triggerSyncFeedback('syncing', `Mengimpor ${validRows.length} siswa secara terpadu...`);

      // Susun item siswa untuk atomic batch import
      const studentsToImport: ImportStudentItem[] = validRows.map((r) => ({
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
        nikSiswa: r.nikSiswa,
        nikIbu: r.nikIbu,
        nkk: r.nkk,
        customAttributes: r.customAttributes || {},
        notes: r.rawClassName ? `Diimpor via Excel (Kelas asal: ${r.rawClassName})` : 'Diimpor via Excel',
        status: 'ACTIVE' as const,
        rollNumber: r.rollNumber,
        classId: r.targetClassId || undefined,
        className: r.targetClassName || undefined,
      }));

      const res = await atomicImportStudentsWithEnrollment(user.uid, studentsToImport, {
        academicYearId: activeAcademicYear.id,
        academicYearLabel: activeAcademicYear.label,
        overwriteExisting: overwriteExisting,
      });

      const feedbackMsg = res.updatedCount > 0
        ? (overwriteExisting
            ? `${res.createdCount} siswa baru, ${res.updatedCount} siswa berhasil ditimpa/diperbarui (${res.enrolledCount} di rombel)!`
            : `${res.createdCount} siswa baru diimpor (${res.updatedCount} siswa lama dilewati)`)
        : `${res.count} siswa berhasil diimpor (${res.enrolledCount} masuk rombel)!`;

      triggerSyncFeedback('saved', feedbackMsg);
      setSuccessInfo({ total: res.count, enrolled: res.enrolledCount, created: res.createdCount, updated: res.updatedCount });
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
    setSuccessInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Ringkasan kelas dan deteksi siswa yang sudah ada
  const enrolledSummary = useMemo(() => {
    const map = new Map<string, number>();
    let unassignedCount = 0;
    let existingInDbCount = 0;
    parsedRows.forEach(r => {
      if (r.targetClassName) {
        map.set(r.targetClassName, (map.get(r.targetClassName) || 0) + 1);
      } else {
        unassignedCount++;
      }
      if (r.isExistingInDb) {
        existingInDbCount++;
      }
    });
    return {
      classes: Array.from(map.entries()),
      unassignedCount,
      existingInDbCount,
    };
  }, [parsedRows]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Import Data Siswa dari Excel (Multi-Rombel)"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Step 1: Download template & info */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Template Excel Resmi (Dengan Kolom Kelas)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
              Template menyertakan kolom <span className="font-semibold text-slate-700">"Kelas"</span> sehingga sistem otomatis memasukkan siswa ke rombel yang sesuai. Format daftar sudah otomatis disesuaikan dengan urutan alfabetis (A-Z).
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            Unduh Template (.xlsx)
          </button>
        </div>

        {/* Global Fallback Class Option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rombel Cadangan / Default:
            </label>
            <p className="text-[10px] text-slate-400 mb-1.5">
              Digunakan jika kolom "Kelas" di baris Excel kosong atau tidak terisi.
            </p>
            <select
              value={defaultClassId}
              onChange={e => setDefaultClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Jangan Enroll (Simpan Sebagai Siswa Master) --</option>
              {activeClasses.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} (Tingkat {c.gradeLevel})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Ajaran Aktif:
            </label>
            <p className="text-[10px] text-slate-400 mb-1.5">
              Target penempatan rombel siswa tahun ajaran ini.
            </p>
            <input
              type="text"
              disabled
              value={activeAcademicYear?.label || '2026/2027'}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-600 font-semibold"
            />
          </div>
        </div>

        {/* File Dropzone */}
        {parsedRows.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-2xl p-7 text-center cursor-pointer transition-all hover:bg-indigo-50/70"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              Pilih atau Seret Berkas Excel (.xlsx / .csv) ke Sini
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              File dapat memuat satu atau beberapa kelas sekaligus. Kolom kelas akan dibaca otomatis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-900">{fileName}</span>
                <span className="text-[11px] bg-white text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                  {parsedRows.length} Baris Siswa
                </span>
                {enrolledSummary.classes.map(([cName, cnt]) => (
                  <span key={cName} className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-medium">
                    {cName}: {cnt}
                  </span>
                ))}
                {enrolledSummary.unassignedCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                    Tanpa Rombel: {enrolledSummary.unassignedCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={resetState}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Ganti Berkas
              </button>
            </div>

            {/* UNMATCHED CLASS RESOLVER BANNER */}
            {unmatchedClassGroups.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ditemukan Nama Kelas di Excel yang Belum Terdaftar di Rombel:</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Sistem menemukan penamaan kelas berikut dalam file. Silakan tentukan kelas tujuan agar seluruh siswa otomatis dialihkan:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {unmatchedClassGroups.map(group => (
                    <div key={group.name} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-amber-200 text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          "{group.name}"
                        </span>
                        <span className="text-[11px] text-slate-500 shrink-0">({group.count} siswa)</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <select
                          onChange={e => handleBulkMapClass(group.name, e.target.value)}
                          className="px-2 py-1 rounded text-xs border border-amber-300 bg-amber-50/50 text-slate-800 font-medium focus:ring-1 focus:ring-amber-500"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Pilih Rombel --</option>
                          <option value="">Simpan Tanpa Rombel</option>
                          {activeClasses.map(c => (
                            <option key={c.id} value={c.id}>
                              Kelas {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OVERWRITE / UPDATE CONFIRMATION OPTION */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              overwriteExisting 
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200' 
                : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                    overwriteExisting ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <RefreshCw className={`w-4 h-4 ${overwriteExisting ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Timpa Data Siswa yang Sudah Terdaftar (Overwrite)
                      </span>
                      {enrolledSummary.existingInDbCount > 0 && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
                          {enrolledSummary.existingInDbCount} Siswa cocok dengan database
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {overwriteExisting
                        ? 'Aktif: Kolom tanggal lahir, alamat, NIS, rombel, dan info siswa yang ada di dokumen Excel akan langsung memperbarui data di aplikasi.'
                        : 'Nonaktif: Siswa yang sudah terdaftar di database akan dilewati tanpa mengubah tanggal lahir atau data lamanya.'}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1 sm:mt-0">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#141722]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-800 z-10">
                  <tr>
                    <th className="p-2.5 w-12 text-center font-semibold">No Absen</th>
                    <th className="p-2.5 min-w-36 font-semibold">Nama Siswa (A-Z)</th>
                    <th className="p-2.5 min-w-44 font-semibold">Rombel / Kelas Tujuan</th>
                    <th className="p-2.5 w-24 font-semibold">NIS / NISN</th>
                    <th className="p-2.5 w-14 text-center font-semibold">L/P</th>
                    <th className="p-2.5 min-w-32 font-semibold">TTL (Tgl Lahir)</th>
                    <th className="p-2.5 min-w-36 font-semibold">Alamat</th>
                    <th className="p-2.5 min-w-32 font-semibold">Ortu / Kontak</th>
                    <th className="p-2.5 w-20 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-200">
                  {rowsWithComputedRoll.map((r, i) => (
                    <tr key={i} className={r.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/30'}>
                      {/* Roll number */}
                      <td className="p-2 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {r.computedRoll}
                      </td>

                      {/* Full Name */}
                      <td className="p-2 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{r.fullName}</span>
                          {r.isExistingInDb && (
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800" title={`Siswa sudah ada di database (${r.existingStudentName || ''})`}>
                              Ada di DB
                            </span>
                          )}
                          {r.customAttributes && Object.keys(r.customAttributes).length > 0 && (
                            <span 
                              className="text-[9px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800" 
                              title={`Kolom kustom terdeteksi: ${Object.keys(r.customAttributes).join(', ')}`}
                            >
                              +{Object.keys(r.customAttributes).length} Kustom
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Class Column with dropdown selector & status indicator */}
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={r.targetClassId}
                            onChange={e => handleRowClassChange(i, e.target.value)}
                            className={`w-full px-2 py-1 rounded-lg text-xs border font-medium cursor-pointer ${
                              r.targetClassId
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <option value="" className="dark:bg-slate-900">-- Tanpa Rombel (Master Saja) --</option>
                            {activeClasses.map(c => (
                              <option key={c.id} value={c.id} className="dark:bg-slate-900">
                                Kelas {c.name} (Tk. {c.gradeLevel})
                              </option>
                            ))}
                          </select>
                          {r.classMatchStatus === 'MATCHED' && (
                            <span title="Cocok otomatis" className="shrink-0 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {r.classMatchStatus === 'UNMATCHED' && (
                            <span title="Nama kelas tidak ditemukan di sistem, perlu diarahkan" className="shrink-0 text-amber-500 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NIS / NISN */}
                      <td className="p-2 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {r.nis || '-'}{r.nisn ? ` / ${r.nisn}` : ''}
                      </td>

                      {/* Gender */}
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.gender === 'L' 
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                            : 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                        }`}>
                          {r.gender}
                        </span>
                      </td>

                      {/* TTL (Tempat & Tanggal Lahir) */}
                      <td className="p-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <div>{r.birthPlace || '-'}</div>
                        <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          {r.birthDate ? r.birthDate : <span className="text-slate-400 dark:text-slate-500 font-normal italic">Tidak ada</span>}
                        </div>
                      </td>

                      {/* Alamat */}
                      <td className="p-2 text-[11px] text-slate-700 dark:text-slate-300 max-w-xs truncate" title={r.address}>
                        {r.address ? r.address : <span className="text-slate-400 dark:text-slate-500 italic">-</span>}
                      </td>

                      {/* Parent & Phone */}
                      <td className="p-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{r.parentName || '-'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{r.parentPhone || r.phone || ''}</div>
                      </td>

                      {/* Status */}
                      <td className="p-2 text-center">
                        {r.isValid ? (
                          r.isExistingInDb ? (
                            overwriteExisting ? (
                              <span className="inline-flex items-center text-blue-600 dark:text-blue-400 text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                <RefreshCw className="w-2.5 h-2.5 mr-0.5" /> Ditimpa
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-slate-600 dark:text-slate-300 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                Dilewati
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-3 h-3 mr-0.5" /> Baru
                            </span>
                          )
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold">
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

        {successInfo && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              {successInfo.updated > 0 ? (
                <>
                  Berhasil memproses <strong>{successInfo.total}</strong> siswa (<strong>{successInfo.created}</strong> siswa baru, <strong>{successInfo.updated}</strong> siswa diperbarui, <strong>{successInfo.enrolled}</strong> ditempatkan di rombel).
                </>
              ) : (
                <>
                  Berhasil mengimpor <strong>{successInfo.total}</strong> data siswa (<strong>{successInfo.enrolled}</strong> siswa ditempatkan ke rombel)!
                </>
              )}
            </span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Nomor absen otomatis tersortir per-kelas sesuai urutan A-Z data.
          </div>
          <div className="flex gap-2">
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
              disabled={loading || parsedRows.length === 0 || successInfo !== null}
              onClick={handleSaveImport}
              className={`px-5 py-2 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                overwriteExisting && enrolledSummary.existingInDbCount > 0
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {loading 
                ? 'Menyimpan ke Firestore...' 
                : (overwriteExisting && enrolledSummary.existingInDbCount > 0
                    ? `Proses & Timpa ${parsedRows.length} Siswa`
                    : `Simpan ${parsedRows.length} Siswa`)}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

