import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  TeachingAssignment,
  TeacherMonthlyAttendanceItem,
  TeacherMonthlyAttendanceRecord,
  SemesterType,
  SchoolSettings,
} from '../../types';
import {
  getHomeroomTeachingAssignments,
  getTeacherMonthlyAttendance,
  saveTeacherMonthlyAttendance,
} from '../../services/firestore/teacherAttendance';
import { getSchoolSettings } from '../../services/firestore/settings';
import { formatOfficialSignatureName, formatOfficialNip } from '../../utils/formatOfficialName';
import { emitSyncSuccess, emitSyncError } from '../../utils/syncEvents';
import {
  CalendarDays,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Users,
  AlertCircle,
  Briefcase,
  Plus,
  Trash2,
  ArrowRightLeft,
  UserPlus,
  BookOpen,
  Check,
  Percent,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AddTeacherAttendanceModal } from './AddTeacherAttendanceModal';
import { OfficialDocumentHeader } from '../../components/common/OfficialDocumentHeader';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const HomeroomTeacherAttendancePage: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    activeAcademicYear,
    activeSemester,
    classes,
    subjects,
    teachingAssignments: allSchoolAssignments,
  } = useWorkspace();

  // Settings & Kop
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  // Filter State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>(activeSemester || 'GANJIL');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data State
  const [items, setItems] = useState<TeacherMonthlyAttendanceItem[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Modal Tambah Guru / Inval
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Inisialisasi Kelas Terpilih
  useEffect(() => {
    if (!selectedClassId && classes && classes.length > 0) {
      // Prioritaskan kelas binaan di mana user adalah wali kelas
      const myHomeroom = classes.find(c => c.classTeacherId === user?.uid || c.classTeacherId === profile?.uid);
      if (myHomeroom) {
        setSelectedClassId(myHomeroom.id);
      } else {
        setSelectedClassId(classes[0].id);
      }
    }
  }, [classes, selectedClassId, user, profile]);

  // Load School Settings
  useEffect(() => {
    if (!user) return;
    getSchoolSettings(user.uid)
      .then(res => setSchoolSettings(res))
      .catch(err => console.error('Error loading school settings:', err));
  }, [user]);

  // Informasi kelas aktif
  const currentClass = useMemo(() => {
    return (classes || []).find(c => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Load Data Rekapitulasi Bulanan
  useEffect(() => {
    if (!user || !selectedClassId || !activeAcademicYear?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all([
      getHomeroomTeachingAssignments(user.uid, activeAcademicYear.id, selectedSemester, selectedClassId),
      getTeacherMonthlyAttendance(user.uid, selectedClassId, activeAcademicYear.id, selectedSemester, selectedYear, selectedMonth)
    ])
      .then(([asgs, savedRecord]) => {
        if (!isMounted) return;
        setAssignments(asgs);

        const resolveTeacherName = (tName?: string, tId?: string) => {
          if (tName && tName !== 'Guru Mapel' && tName.trim() !== '') return tName;
          if (tId === user?.uid || !tId) {
            return profile?.displayName || user?.displayName || 'Johan Rovian Afik, S.Pd.I.';
          }
          return tName || profile?.displayName || 'Guru Mapel';
        };

        if (savedRecord && savedRecord.items && savedRecord.items.length > 0) {
          // Gunakan record tersimpan dengan auto-resolve jika nama masih 'Guru Mapel'
          const savedItemsMap = new Map(savedRecord.items.map(it => [it.teachingAssignmentId || it.id, it]));
          const combinedItems: TeacherMonthlyAttendanceItem[] = savedRecord.items.map(it => ({
            ...it,
            teacherName: resolveTeacherName(it.teacherName, it.teacherId),
          }));

          // Tambahkan penugasan baru dari master yang belum ada di rekapan tersimpan
          asgs.forEach(asg => {
            if (!savedItemsMap.has(asg.id)) {
              combinedItems.push({
                id: asg.id,
                teachingAssignmentId: asg.id,
                teacherId: asg.teacherId || '',
                teacherName: resolveTeacherName(asg.teacherName, asg.teacherId),
                subjectId: asg.subjectId || '',
                subjectName: asg.subjectName || 'Mata Pelajaran',
                subjectCode: asg.subjectCode || '',
                targetMeetings: 4,
                hadir: 4,
                sakit: 0,
                izin: 0,
                alpa: 0,
                dinas: 0,
                notes: '',
                isManual: false,
                isSubstitute: false,
              });
            }
          });

          setItems(combinedItems);
          setHasUnsavedChanges(false);
        } else {
          // Buat entri awal dari daftar guru penugasan di kelas ini
          const initialItems: TeacherMonthlyAttendanceItem[] = asgs.map(asg => ({
            id: asg.id,
            teachingAssignmentId: asg.id,
            teacherId: asg.teacherId || '',
            teacherName: resolveTeacherName(asg.teacherName, asg.teacherId),
            subjectId: asg.subjectId || '',
            subjectName: asg.subjectName || 'Mata Pelajaran',
            subjectCode: asg.subjectCode || '',
            targetMeetings: 4, // Default rata-rata 4 pertemuan per bulan
            hadir: 4,
            sakit: 0,
            izin: 0,
            alpa: 0,
            dinas: 0,
            notes: '',
            isManual: false,
            isSubstitute: false,
          }));

          setItems(initialItems);
          setHasUnsavedChanges(false);
        }
      })
      .catch(err => {
        console.error('Error fetching teacher monthly attendance:', err);
        emitSyncError('Gagal memuat rekapitulasi kehadiran guru mapel');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, selectedClassId, activeAcademicYear?.id, selectedSemester, selectedYear, selectedMonth]);

  // Daftar seluruh guru sekolah (untuk modal guru pengganti/inval)
  const allSchoolTeachers = useMemo(() => {
    const map = new Map<string, string>();
    (allSchoolAssignments || []).forEach(a => {
      if (a.teacherId && a.teacherName) {
        map.set(a.teacherId, a.teacherName);
      }
    });
    assignments.forEach(a => {
      if (a.teacherId && a.teacherName) {
        map.set(a.teacherId, a.teacherName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allSchoolAssignments, assignments]);

  // Guru kelas reguler saat ini (untuk referensi guru yang digantikan)
  const regularClassTeachers = useMemo(() => {
    return items
      .filter(it => !it.isSubstitute)
      .map(it => ({ id: it.teacherId, name: it.teacherName }));
  }, [items]);

  // Handler update field pada baris
  const handleUpdateField = (id: string, field: keyof TeacherMonthlyAttendanceItem, value: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          // Pastikan angka valid dan tidak negatif
          if (['targetMeetings', 'hadir', 'sakit', 'izin', 'alpa', 'dinas'].includes(field as string)) {
            const num = Math.max(0, parseInt(value) || 0);
            (updated as any)[field] = num;
          }
          return updated;
        }
        return it;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Preset catatan helper untuk guru tertentu
  const handleAppendNotePreset = (id: string, preset: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          const current = (it.notes || '').trim();
          const newNotes = current ? `${current}; ${preset}` : preset;
          return { ...it, notes: newNotes };
        }
        return it;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Set semua hadir penuh (100% instan)
  const handleSetAllFull = () => {
    setItems(prev =>
      prev.map(it => ({
        ...it,
        hadir: it.targetMeetings || 4,
        sakit: 0,
        izin: 0,
        alpa: 0,
        dinas: 0,
      }))
    );
    setHasUnsavedChanges(true);
    emitSyncSuccess('Semua guru berhasil di-set Hadir Penuh!');
  };

  // Reset 1 baris ke hadir penuh
  const handleResetRow = (id: string) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id === id) {
          return {
            ...it,
            hadir: it.targetMeetings || 4,
            sakit: 0,
            izin: 0,
            alpa: 0,
            dinas: 0,
            notes: '',
          };
        }
        return it;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Hapus baris dari tabel (bisa hapus mapel master maupun inval/manual)
  const handleDeleteRow = (id: string) => {
    const itemToRemove = items.find(it => it.id === id);
    setItems(prev => prev.filter(it => it.id !== id));
    setHasUnsavedChanges(true);
    emitSyncSuccess(`Baris ${itemToRemove?.subjectName || 'Mapel'} (${itemToRemove?.teacherName || 'Guru'}) berhasil dihapus dari rekap.`);
  };

  // Muat ulang daftar dari Master Penugasan
  const handleReloadFromMaster = () => {
    if (assignments.length === 0) {
      emitSyncError('Tidak ada penugasan guru di kelas ini pada Master.');
      return;
    }
    const defaultItems: TeacherMonthlyAttendanceItem[] = assignments.map(asg => ({
      id: asg.id,
      teachingAssignmentId: asg.id,
      teacherId: asg.teacherId || '',
      teacherName: (asg.teacherName && asg.teacherName !== 'Guru Mapel' && asg.teacherName.trim() !== '')
        ? asg.teacherName
        : (profile?.displayName || user?.displayName || 'Johan Rovian Afik, S.Pd.I.'),
      subjectId: asg.subjectId || '',
      subjectName: asg.subjectName || 'Mata Pelajaran',
      subjectCode: asg.subjectCode || '',
      targetMeetings: 4,
      hadir: 4,
      sakit: 0,
      izin: 0,
      alpa: 0,
      dinas: 0,
      notes: '',
      isSubstitute: false,
      isManual: false,
    }));
    setItems(defaultItems);
    setHasUnsavedChanges(true);
    emitSyncSuccess('Daftar guru dimuat ulang dari Master Penugasan.');
  };

  // Tambah item manual dari modal
  const handleAddManualItem = (newItem: TeacherMonthlyAttendanceItem) => {
    setItems(prev => [newItem, ...prev]);
    setHasUnsavedChanges(true);
    emitSyncSuccess('Baris guru pengganti/tambahan berhasil ditambahkan!');
  };

  // Simpan rekapitulasi ke Firestore
  const handleSave = async () => {
    if (!user || !selectedClassId || !activeAcademicYear?.id) return;

    setSaving(true);
    try {
      await saveTeacherMonthlyAttendance(user.uid, {
        id: `${selectedClassId}_${activeAcademicYear.id}_${selectedSemester}_${selectedYear}_${selectedMonth}`,
        classId: selectedClassId,
        className: currentClass?.name || 'Kelas Binaan',
        academicYearId: activeAcademicYear.id,
        academicYearLabel: activeAcademicYear.label || '2026/2027',
        semester: selectedSemester,
        year: selectedYear,
        month: selectedMonth,
        items,
      });

      setHasUnsavedChanges(false);
      emitSyncSuccess('Rekapitulasi kehadiran bulanan guru mapel berhasil disimpan!');
    } catch (err: any) {
      console.error('Error saving teacher monthly attendance:', err);
      emitSyncError(err?.message || 'Gagal menyimpan rekapitulasi kehadiran');
    } finally {
      setSaving(false);
    }
  };

  // Filtered items berdasarkan pencarian
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      it =>
        it.teacherName.toLowerCase().includes(q) ||
        it.subjectName.toLowerCase().includes(q) ||
        (it.subjectCode && it.subjectCode.toLowerCase().includes(q)) ||
        (it.notes && it.notes.toLowerCase().includes(q)) ||
        (it.substituteForTeacherName && it.substituteForTeacherName.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Statistik Ringkasan Cepat
  const stats = useMemo(() => {
    let totalTarget = 0;
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;
    let totalDinas = 0;
    let teachersWithAbsence = 0;

    items.forEach(it => {
      totalTarget += it.targetMeetings || 0;
      totalHadir += it.hadir || 0;
      totalSakit += it.sakit || 0;
      totalIzin += it.izin || 0;
      totalAlpa += it.alpa || 0;
      totalDinas += it.dinas || 0;

      if (it.sakit > 0 || it.izin > 0 || it.alpa > 0) {
        teachersWithAbsence++;
      }
    });

    const totalTerlaksana = totalHadir + totalDinas;
    const percentage = totalTarget > 0 ? Math.round((totalTerlaksana / totalTarget) * 100) : 0;

    return {
      totalTeachers: items.length,
      totalTarget,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpa,
      totalDinas,
      totalTerlaksana,
      percentage,
      teachersWithAbsence,
    };
  }, [items]);

  // Ekspor Excel
  const handleExportExcel = () => {
    if (items.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const exportRows = items.map((it, idx) => {
      const target = it.targetMeetings || 0;
      const pct = target > 0 ? Math.round(((it.hadir + it.dinas) / target) * 100) : 0;

      return {
        No: idx + 1,
        'Nama Guru Pengampu': it.teacherName,
        'Kategori Penugasan': it.isSubstitute
          ? 'Guru Inval / Pengganti'
          : it.isManual
          ? 'Jadwal Khusus'
          : 'Jadwal Rutin',
        'Menggantikan Guru': it.substituteForTeacherName || '-',
        'Mata Pelajaran': it.subjectName,
        'Kode Mapel': it.subjectCode || '-',
        'Target Tatap Muka (Bulan Ini)': target,
        'Hadir (H)': it.hadir,
        'Sakit (S)': it.sakit,
        'Izin (I)': it.izin,
        'Alpa (A)': it.alpa,
        'Tugas Dinas (D)': it.dinas,
        '% Kehadiran': `${pct}%`,
        'Catatan / Alasan Ketidakhadiran (Jurnal Fisik)': it.notes || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Guru Mapel');

    const classNameClean = (currentClass?.name || 'Kelas').replace(/[\s\/]/g, '_');
    const monthName = MONTH_NAMES[selectedMonth - 1];
    XLSX.writeFile(workbook, `Rekap_Kehadiran_Guru_${classNameClean}_${monthName}_${selectedYear}.xlsx`);
  };

  // Cetak Dokumen Resmi
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ========================================================= */}
      {/* 1. HEADER & CONTROLS (Screen View Only)                  */}
      {/* ========================================================= */}
      <div className="print:hidden space-y-4">
        {/* Banner Title */}
        <div className="bg-white dark:bg-[#141722] rounded-2xl p-5 border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white">
                Rekap Kehadiran Guru Mapel (Jurnal Fisik)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Salin angka kehadiran guru per mata pelajaran dari buku jurnal kelas fisik untuk laporan resmi bulanan ke Kepala Madrasah.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSetAllFull}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              title="Isi otomatis semua guru hadir 100% sesuai target tatap muka"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Set Semua Hadir Penuh</span>
            </button>

            <button
              type="button"
              onClick={handleReloadFromMaster}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1e2434] border border-slate-200 dark:border-[#2b334a] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#283146] flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              title="Muat ulang daftar guru dari Master Penugasan jika ada baris yang terhapus"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Muat Ulang Master</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Guru / Inval</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#1e2434] border border-slate-200 dark:border-[#2b334a] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#283146] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-[#141722] rounded-2xl p-4 border border-slate-200 dark:border-[#232838] shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            {/* Pilih Kelas */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Kelas Binaan
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#181d2a] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
              >
                {(classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.classTeacherId === user?.uid ? '(Wali Kelas)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Ajaran */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tahun Ajaran
              </label>
              <div className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-100/70 dark:bg-[#181d2a]/70 text-slate-700 dark:text-slate-300 font-semibold">
                {activeAcademicYear?.label || '2026/2027'}
              </div>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as SemesterType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#181d2a] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
              >
                <option value="GANJIL">Ganjil</option>
                <option value="GENAP">Genap</option>
              </select>
            </div>

            {/* Bulan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Bulan Rekapan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-200 font-bold focus:outline-none"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Tahun Kalender */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tahun
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || now.getFullYear())}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#181d2a] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Guru Mapel</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalTeachers} <span className="text-xs font-normal text-slate-500">Guru/Mapel</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Target Pertemuan</span>
              <CalendarDays className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalTarget} <span className="text-xs font-normal text-slate-500">Tatap Muka</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Ketercapaian Kelas</span>
              <Percent className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.percentage}%
              </span>
              <span className="text-xs text-slate-500">
                ({stats.totalTerlaksana} hadir/dinas)
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Ada Ketidakhadiran</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {stats.teachersWithAbsence}{' '}
              <span className="text-xs font-normal text-slate-500">
                guru ({stats.totalSakit}S, {stats.totalIzin}I, {stats.totalAlpa}A)
              </span>
            </div>
          </div>
        </div>

        {/* 3. FLOATING / TOP SAVE STATUS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
          <div className="flex items-center gap-2 text-xs text-orange-900 dark:text-orange-200">
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <span>
              <strong>Tips Wali Kelas:</strong> Buka buku fisik jurnal kelas. Cek total hadir guru di bulan{' '}
              <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>. Ketik angka kehadiran atau catatan izin/sakit langsung di tabel bawah ini.
            </span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {hasUnsavedChanges && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                • Perubahan belum disimpan
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Rekapitulasi Bulan Ini'}</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru atau mata pelajaran..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#141722] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500">
            Menampilkan <strong>{filteredItems.length}</strong> dari {items.length} guru/mapel
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MAIN TABLE (Screen View)                               */}
      {/* ========================================================= */}
      <div className="print:hidden bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
            <p className="text-xs">Memuat data rekapitulasi kehadiran guru kelas...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Belum ada guru mapel terdaftar di kelas {currentClass?.name || ''}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Pastikan Master Penugasan Mengajar telah diisi oleh admin/kurikulum, atau Anda dapat menambahkan guru pengganti/manual melalui tombol di bawah.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Guru / Inval Manual</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#181d2a] border-b border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3 min-w-[220px]">Mata Pelajaran & Guru Pengampu</th>
                  <th className="p-3 w-28 text-center" title="Target tatap muka atau jumlah pertemuan dalam bulan ini">
                    Target Pertemuan
                  </th>
                  <th className="p-3 w-20 text-center text-emerald-700 dark:text-emerald-400">Hadir (H)</th>
                  <th className="p-3 w-20 text-center text-amber-700 dark:text-amber-400">Sakit (S)</th>
                  <th className="p-3 w-20 text-center text-blue-700 dark:text-blue-400">Izin (I)</th>
                  <th className="p-3 w-20 text-center text-rose-700 dark:text-rose-400">Alpa (A)</th>
                  <th className="p-3 w-20 text-center text-purple-700 dark:text-purple-400">Dinas (D)</th>
                  <th className="p-3 w-24 text-center">% Hadir</th>
                  <th className="p-3 min-w-[280px]">
                    Catatan Ketidakhadiran & Jurnal Fisik
                  </th>
                  <th className="p-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#232838]">
                {filteredItems.map((item, idx) => {
                  const target = item.targetMeetings || 0;
                  const effectivePresent = (item.hadir || 0) + (item.dinas || 0);
                  const pct = target > 0 ? Math.round((effectivePresent / target) * 100) : 0;
                  const hasAbsence = (item.sakit || 0) > 0 || (item.izin || 0) > 0 || (item.alpa || 0) > 0;
                  const missingNotesPrompt = hasAbsence && !item.notes.trim();

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-[#181d2a]/50 transition-colors ${
                        item.isSubstitute
                          ? 'bg-purple-50/20 dark:bg-purple-950/10'
                          : item.isManual
                          ? 'bg-blue-50/20 dark:bg-blue-950/10'
                          : ''
                      }`}
                    >
                      {/* No */}
                      <td className="p-3 text-center text-slate-400 font-semibold">{idx + 1}</td>

                      {/* Mapel & Guru */}
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {item.subjectName}
                            </span>
                            {item.subjectCode && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1f2536] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#282e42]">
                                {item.subjectCode}
                              </span>
                            )}

                            {item.isSubstitute && (
                              <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                                Inval / Pengganti
                              </span>
                            )}
                            {item.isManual && !item.isSubstitute && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                                Khusus / Manual
                              </span>
                            )}
                          </div>

                          <div className="relative max-w-sm">
                            <input
                              type="text"
                              value={item.teacherName}
                              onChange={(e) => handleUpdateField(item.id, 'teacherName', e.target.value)}
                              placeholder="Ketik nama guru pengampu..."
                              className="w-full px-2 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-50 hover:bg-white focus:bg-white dark:bg-[#181d2a] dark:hover:bg-[#1f2536] dark:focus:bg-[#181d2a] rounded-lg border border-slate-200 dark:border-[#282e42] focus:border-orange-500 dark:focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 focus:outline-none transition-colors"
                              title="Klik untuk mengubah nama guru pengampu"
                            />
                          </div>

                          {item.substituteForTeacherName && (
                            <p className="text-[11px] text-purple-600 dark:text-purple-400 italic">
                              Menggantikan: {item.substituteForTeacherName}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Target Pertemuan */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateField(item.id, 'targetMeetings', Math.max(1, target - 1))}
                            className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-[#283146] text-slate-500 font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={target}
                            onChange={(e) => handleUpdateField(item.id, 'targetMeetings', e.target.value)}
                            className="w-10 text-center font-bold py-1 rounded-md border border-slate-200 dark:border-[#2b334a] bg-white dark:bg-[#181d2a] text-slate-900 dark:text-slate-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateField(item.id, 'targetMeetings', target + 1)}
                            className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-[#283146] text-slate-500 font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Hadir (H) */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={target + 5}
                          value={item.hadir}
                          onChange={(e) => handleUpdateField(item.id, 'hadir', e.target.value)}
                          className="w-14 text-center font-black py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Sakit (S) */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.sakit}
                          onChange={(e) => handleUpdateField(item.id, 'sakit', e.target.value)}
                          className={`w-14 text-center font-bold py-1.5 rounded-lg border focus:outline-none ${
                            item.sakit > 0
                              ? 'border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                              : 'border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#181d2a] text-slate-700 dark:text-slate-300'
                          }`}
                        />
                      </td>

                      {/* Izin (I) */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.izin}
                          onChange={(e) => handleUpdateField(item.id, 'izin', e.target.value)}
                          className={`w-14 text-center font-bold py-1.5 rounded-lg border focus:outline-none ${
                            item.izin > 0
                              ? 'border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300'
                              : 'border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#181d2a] text-slate-700 dark:text-slate-300'
                          }`}
                        />
                      </td>

                      {/* Alpa (A) */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.alpa}
                          onChange={(e) => handleUpdateField(item.id, 'alpa', e.target.value)}
                          className={`w-14 text-center font-bold py-1.5 rounded-lg border focus:outline-none ${
                            item.alpa > 0
                              ? 'border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                              : 'border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#181d2a] text-slate-700 dark:text-slate-300'
                          }`}
                        />
                      </td>

                      {/* Dinas (D) */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={item.dinas}
                          onChange={(e) => handleUpdateField(item.id, 'dinas', e.target.value)}
                          className={`w-14 text-center font-bold py-1.5 rounded-lg border focus:outline-none ${
                            item.dinas > 0
                              ? 'border-purple-400 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300'
                              : 'border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#181d2a] text-slate-700 dark:text-slate-300'
                          }`}
                        />
                      </td>

                      {/* % Hadir */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block font-black text-xs px-2 py-1 rounded-md ${
                            pct >= 90
                              ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                              : pct >= 75
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>

                      {/* FORM CATATAN MANUAL KETIDAKHADIRAN & JURNAL FISIK */}
                      <td className="p-3">
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleUpdateField(item.id, 'notes', e.target.value)}
                            placeholder="Catatan jurnal fisik (cth: Tgl 14 sakit, ada surat tugas/dokter)..."
                            className={`w-full px-3 py-1.5 rounded-lg border text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-[#181d2a] focus:outline-none ${
                              missingNotesPrompt
                                ? 'border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/40 bg-amber-50/20'
                                : 'border-slate-200 dark:border-[#282e42]'
                            }`}
                          />

                          {/* Quick Chips Helpers */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {missingNotesPrompt && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 mr-1">
                                <AlertCircle className="w-3 h-3" />
                                Ada absensi, mohon isi alasan:
                              </span>
                            )}
                            {[
                              'Sakit (Surat Dokter)',
                              'Izin Dinas MGMP',
                              'Tugas Mandiri di Kelas',
                              'Diganti Guru Piket',
                              'Tanpa Keterangan',
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handleAppendNotePreset(item.id, preset)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#202738] hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] font-medium transition-colors cursor-pointer"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleResetRow(item.id)}
                            title="Reset baris ini ke Hadir Penuh"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283146] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRow(item.id)}
                            title="Hapus baris ini dari rekapitulasi bulan ini"
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-500 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. MODAL TAMBAH GURU / INVAL                              */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <AddTeacherAttendanceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddManualItem}
          availableTeachers={allSchoolTeachers}
          availableSubjects={subjects || []}
          regularClassTeachers={regularClassTeachers}
          monthName={MONTH_NAMES[selectedMonth - 1]}
          year={selectedYear}
        />
      )}

      {/* ========================================================= */}
      {/* 6. PRINT LAYOUT (Visible ONLY when Printing / window.print)*/}
      {/* ========================================================= */}
      <div className="hidden print:block text-black font-serif text-[11pt] leading-normal">
        {/* KOP RESMI MADRASAH & JUDUL LAPORAN (STANDAR GOVERNANCE) */}
        <OfficialDocumentHeader
          schoolSettings={schoolSettings}
          documentTitle="LAPORAN REKAPITULASI KEHADIRAN GURU MATA PELAJARAN"
          documentSubtitle={`Kelas: ${currentClass?.name || '-'} | Periode: ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} | Semester: ${selectedSemester} TP: ${activeAcademicYear?.label || '2026/2027'}`}
          showLetterhead={true}
        />

        {/* TABEL CETAK RESMI */}
        <table className="w-full border-collapse border border-black text-[10pt] my-3">
          <thead>
            <tr className="bg-gray-100 font-bold text-center">
              <th className="border border-black p-1 w-8">No</th>
              <th className="border border-black p-1 text-left min-w-[140px]">Nama Guru Pengampu</th>
              <th className="border border-black p-1 text-left min-w-[120px]">Mata Pelajaran</th>
              <th className="border border-black p-1 w-14">Target Tatap Muka</th>
              <th className="border border-black p-1 w-10">H</th>
              <th className="border border-black p-1 w-10">S</th>
              <th className="border border-black p-1 w-10">I</th>
              <th className="border border-black p-1 w-10">A</th>
              <th className="border border-black p-1 w-10">D</th>
              <th className="border border-black p-1 w-14">% Hadir</th>
              <th className="border border-black p-1 text-left min-w-[160px]">
                Keterangan / Tindak Lanjut Jurnal
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const target = item.targetMeetings || 0;
              const effective = item.hadir + item.dinas;
              const pct = target > 0 ? Math.round((effective / target) * 100) : 0;

              return (
                <tr key={item.id} className="break-inside-avoid">
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1 font-semibold">
                    {item.teacherName}
                    {item.isSubstitute ? ' (Inval)' : item.isManual ? ' (Khusus)' : ''}
                    {item.substituteForTeacherName ? ` [ganti ${item.substituteForTeacherName}]` : ''}
                  </td>
                  <td className="border border-black p-1">
                    {item.subjectName} {item.subjectCode ? `(${item.subjectCode})` : ''}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">{target}</td>
                  <td className="border border-black p-1 text-center">{item.hadir}</td>
                  <td className="border border-black p-1 text-center">{item.sakit}</td>
                  <td className="border border-black p-1 text-center">{item.izin}</td>
                  <td className="border border-black p-1 text-center">{item.alpa}</td>
                  <td className="border border-black p-1 text-center">{item.dinas}</td>
                  <td className="border border-black p-1 text-center font-bold">{pct}%</td>
                  <td className="border border-black p-1 text-xs">{item.notes || '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={3} className="border border-black p-1.5 text-center">
                TOTAL KESELURUHAN
              </td>
              <td className="border border-black p-1.5 text-center">{stats.totalTarget}</td>
              <td className="border border-black p-1.5 text-center">{stats.totalHadir}</td>
              <td className="border border-black p-1.5 text-center">{stats.totalSakit}</td>
              <td className="border border-black p-1.5 text-center">{stats.totalIzin}</td>
              <td className="border border-black p-1.5 text-center">{stats.totalAlpa}</td>
              <td className="border border-black p-1.5 text-center">{stats.totalDinas}</td>
              <td className="border border-black p-1.5 text-center">{stats.percentage}%</td>
              <td className="border border-black p-1.5 text-xs">
                {stats.teachersWithAbsence > 0
                  ? `${stats.teachersWithAbsence} guru ada catatan absensi`
                  : 'Seluruh guru hadir tuntas'}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* TANDA TANGAN (DUAL SIGNATURES) */}
        <div className="mt-8 pt-4 flex justify-between items-start text-xs break-inside-avoid">
          {/* KIRI: KEPALA MADRASAH */}
          <div className="text-center w-60">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Madrasah</p>
            <div className="h-20"></div>
            <p className="font-bold underline">
              {formatOfficialSignatureName(
                schoolSettings?.headmasterName,
                'NAMA KEPALA MADRASAH, M.Pd.'
              )}
            </p>
            <p>{formatOfficialNip(schoolSettings?.headmasterNip)}</p>
          </div>

          {/* KANAN: WALI KELAS */}
          <div className="text-center w-60">
            <p>
              {schoolSettings?.district || 'Tempat'},{' '}
              {new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="font-bold">Wali Kelas {currentClass?.name || ''}</p>
            <div className="h-20"></div>
            <p className="font-bold underline">
              {formatOfficialSignatureName(
                profile?.displayName || user?.displayName,
                'WALI KELAS'
              )}
            </p>
            <p>{formatOfficialNip(profile?.nip)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
