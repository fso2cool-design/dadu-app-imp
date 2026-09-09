import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  TeachingAssignment,
  TeacherAttendanceRecord,
  TeacherAttendanceStatus,
  TeacherAttendanceSummaryItem,
  SemesterType,
  SchoolSettings,
} from '../../types';
import {
  getHomeroomTeachingAssignments,
  getMonthlyTeacherAttendanceRecords,
  getTeacherAttendanceRecordsForDate,
  saveTeacherAttendanceRecords,
  deleteTeacherAttendanceForDate,
  calculateTeacherAttendanceSummary,
  SaveTeacherAttendanceItem,
} from '../../services/firestore/teacherAttendance';
import { getSchoolSettings } from '../../services/firestore/settings';
import { emitSyncSuccess, emitSyncError } from '../../utils/syncEvents';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Info,
  Layers,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  AlertCircle,
  HelpCircle,
  Briefcase,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttendanceHolidaysModal } from '../../components/common/AttendanceHolidaysModal';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const HomeroomTeacherAttendancePage: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    activeAcademicYear,
    activeSemester,
    classes,
    checkIsHoliday,
    attendanceSettings,
  } = useWorkspace();

  // Settings & Kop
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  // Filter State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>(activeSemester || 'GANJIL');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Selected Date for Fast Input (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Data State
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<TeacherAttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);

  // Form Input State per Assignment: { [assignmentId]: { status, notes } }
  const [entryForm, setEntryForm] = useState<Record<string, { status: TeacherAttendanceStatus; notes: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // View Mode: 'input' (input per tanggal) or 'recap' (tabel rekap bulanan)
  const [viewMode, setViewMode] = useState<'input' | 'recap'>('input');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load School Settings for Print
  useEffect(() => {
    if (!user) return;
    getSchoolSettings(user.uid).then(setSchoolSettings).catch(() => {});
  }, [user]);

  // Syarat Wali Kelas: Cari kelas yang diajar oleh user sebagai wali kelas
  const homeroomClasses = useMemo(() => {
    if (!user) return [];
    return classes.filter(c => c.classTeacherId === user.uid && c.isActive);
  }, [classes, user]);

  // Current selected class object
  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Is the current user valid homeroom teacher of this class?
  const isAuthorizedHomeroom = useMemo(() => {
    if (!currentClass || !user) return false;
    return currentClass.classTeacherId === user.uid;
  }, [currentClass, user]);

  // Auto-select homeroom class upon load
  useEffect(() => {
    if (homeroomClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(homeroomClasses[0].id);
    } else if (homeroomClasses.length === 0 && classes.length > 0 && !selectedClassId) {
      // Fallback if user is demo / super admin or hasn't assigned classTeacherId
      setSelectedClassId(classes[0].id);
    }
  }, [homeroomClasses, classes, selectedClassId]);

  // Update semester when activeSemester changes
  useEffect(() => {
    if (activeSemester) {
      setSelectedSemester(activeSemester);
    }
  }, [activeSemester]);

  // Load Teaching Assignments & Monthly Records
  const loadData = useCallback(async () => {
    if (!user || !activeAcademicYear || !selectedClassId) {
      setAssignments([]);
      setMonthlyRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const mm = String(selectedMonth).padStart(2, '0');
      const yearMonthPrefix = `${selectedYear}-${mm}`;

      const [asgList, mRecords] = await Promise.all([
        getHomeroomTeachingAssignments(user.uid, activeAcademicYear.id, selectedSemester, selectedClassId),
        getMonthlyTeacherAttendanceRecords(user.uid, activeAcademicYear.id, selectedSemester, selectedClassId, yearMonthPrefix),
      ]);

      setAssignments(asgList);
      setMonthlyRecords(mRecords);
    } catch (err) {
      console.error('Failed to load teacher attendance data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeAcademicYear, selectedSemester, selectedClassId, selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-populate entry form when selectedDate or monthlyRecords change
  useEffect(() => {
    if (!selectedDate || assignments.length === 0) {
      setEntryForm({});
      setHasUnsavedChanges(false);
      return;
    }

    const recordsForSelectedDate = monthlyRecords.filter(r => r.date === selectedDate);
    const existingMap = new Map<string, TeacherAttendanceRecord>(recordsForSelectedDate.map(r => [r.teachingAssignmentId, r]));

    const newForm: Record<string, { status: TeacherAttendanceStatus; notes: string }> = {};
    assignments.forEach(asg => {
      const rec = existingMap.get(asg.id);
      if (rec) {
        newForm[asg.id] = {
          status: rec.status,
          notes: rec.notes || '',
        };
      } else {
        // Default: HADIR
        newForm[asg.id] = {
          status: 'HADIR',
          notes: '',
        };
      }
    });

    setEntryForm(newForm);
    setHasUnsavedChanges(false);
  }, [selectedDate, assignments, monthlyRecords]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Map of dates in month that already have records: date -> count of recorded teachers
  const recordedDatesMap = useMemo(() => {
    const map = new Map<string, number>();
    monthlyRecords.forEach(r => {
      map.set(r.date, (map.get(r.date) || 0) + 1);
    });
    return map;
  }, [monthlyRecords]);

  // Check if a date string is today
  const isDateToday = (dStr: string) => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return dStr === todayStr;
  };

  // Day of week for selected date (0 = Sunday, 1 = Monday, ...)
  const selectedDateDayOfWeek = useMemo(() => {
    if (!selectedDate) return 0;
    const [y, m, d] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }, [selectedDate]);

  // Sorted and filtered assignments for the selected date
  const sortedAssignments = useMemo(() => {
    // Sort: Mapel yang terjadwal di hari ini ditaruh di atas
    return [...assignments].sort((a, b) => {
      const aIsToday = a.dayOfWeek === selectedDateDayOfWeek ? 1 : 0;
      const bIsToday = b.dayOfWeek === selectedDateDayOfWeek ? 1 : 0;
      if (aIsToday !== bIsToday) return bIsToday - aIsToday;
      return (a.subjectName || '').localeCompare(b.subjectName || '');
    });
  }, [assignments, selectedDateDayOfWeek]);

  // Status Change Handler
  const handleStatusChange = (assignmentId: string, status: TeacherAttendanceStatus) => {
    setEntryForm(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        status,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Notes Change Handler
  const handleNotesChange = (assignmentId: string, notes: string) => {
    setEntryForm(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        notes,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Quick Action: Set All to HADIR
  const handleSetAllHadir = () => {
    setEntryForm(prev => {
      const updated = { ...prev };
      assignments.forEach(asg => {
        updated[asg.id] = {
          ...updated[asg.id],
          status: 'HADIR',
        };
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Save Bulk Records for Selected Date
  const handleSaveDate = async () => {
    if (!user || !activeAcademicYear || !currentClass || !selectedDate) return;

    if (activeAcademicYear.isArchived) {
      alert('Tahun ajaran ini telah diarsipkan (read-only). Tidak dapat menyimpan data.');
      return;
    }

    setSaving(true);
    try {
      const items: SaveTeacherAttendanceItem[] = assignments.map(asg => {
        const formData = entryForm[asg.id] || { status: 'HADIR', notes: '' };
        return {
          teachingAssignmentId: asg.id,
          teacherId: asg.teacherId || '',
          teacherName: asg.teacherName || 'Guru Mapel',
          subjectId: asg.subjectId || '',
          subjectName: asg.subjectName || 'Mata Pelajaran',
          subjectCode: asg.subjectCode,
          dayOfWeek: asg.dayOfWeek,
          status: formData.status,
          notes: formData.notes,
        };
      });

      await saveTeacherAttendanceRecords(user.uid, {
        academicYearId: activeAcademicYear.id,
        academicYearLabel: activeAcademicYear.label,
        semester: selectedSemester,
        classId: currentClass.id,
        className: currentClass.name,
        date: selectedDate,
        items,
      });

      emitSyncSuccess(`Kehadiran guru mapel tanggal ${selectedDate} berhasil disimpan.`);
      setHasUnsavedChanges(false);

      // Refresh monthly records
      const mm = String(selectedMonth).padStart(2, '0');
      const yearMonthPrefix = `${selectedYear}-${mm}`;
      const updatedRecords = await getMonthlyTeacherAttendanceRecords(
        user.uid,
        activeAcademicYear.id,
        selectedSemester,
        currentClass.id,
        yearMonthPrefix
      );
      setMonthlyRecords(updatedRecords);
    } catch (err: any) {
      console.error('Error saving teacher attendance:', err);
      alert(err.message || 'Gagal menyimpan kehadiran guru.');
    } finally {
      setSaving(false);
    }
  };

  // Reset/Hapus Catatan Tanggal Ini
  const handleDeleteDate = async () => {
    if (!user || !activeAcademicYear || !currentClass || !selectedDate) return;
    if (!window.confirm(`Hapus seluruh rekaman kehadiran guru mapel pada tanggal ${selectedDate}?`)) return;

    setSaving(true);
    try {
      await deleteTeacherAttendanceForDate(
        user.uid,
        activeAcademicYear.id,
        selectedSemester,
        currentClass.id,
        selectedDate
      );

      emitSyncSuccess(`Rekaman kehadiran tanggal ${selectedDate} telah direset.`);

      // Refresh data
      const mm = String(selectedMonth).padStart(2, '0');
      const yearMonthPrefix = `${selectedYear}-${mm}`;
      const updatedRecords = await getMonthlyTeacherAttendanceRecords(
        user.uid,
        activeAcademicYear.id,
        selectedSemester,
        currentClass.id,
        yearMonthPrefix
      );
      setMonthlyRecords(updatedRecords);
    } catch (err: any) {
      console.error('Error deleting teacher attendance:', err);
      alert(err.message || 'Gagal menghapus data.');
    } finally {
      setSaving(false);
    }
  };

  // Monthly Summary Calculation
  const monthlySummary = useMemo(() => {
    return calculateTeacherAttendanceSummary(assignments, monthlyRecords);
  }, [assignments, monthlyRecords]);

  // Filtered Summary for search in recap view
  const filteredSummary = useMemo(() => {
    if (!searchQuery.trim()) return monthlySummary;
    const q = searchQuery.toLowerCase();
    return monthlySummary.filter(
      item =>
        item.teacherName.toLowerCase().includes(q) ||
        item.subjectName.toLowerCase().includes(q) ||
        (item.subjectCode && item.subjectCode.toLowerCase().includes(q))
    );
  }, [monthlySummary, searchQuery]);

  // Export Excel Handler
  const handleExportExcel = () => {
    if (!currentClass || !activeAcademicYear) return;

    const monthLabel = MONTH_NAMES[selectedMonth - 1];
    const fileName = `Rekap_Kehadiran_Guru_${currentClass.name.replace(/\s+/g, '_')}_${monthLabel}_${selectedYear}.xlsx`;

    const data = filteredSummary.map((item, idx) => ({
      No: idx + 1,
      'Nama Guru': item.teacherName,
      'Mata Pelajaran': item.subjectName,
      'Kode Mapel': item.subjectCode || '-',
      'Hadir (H)': item.hadir,
      'Sakit (S)': item.sakit,
      'Izin (I)': item.izin,
      'Alpa (A)': item.alpa,
      'Dinas/Tugas (D)': item.dinas,
      'Total Pertemuan': item.total,
      '% Kehadiran': `${item.persentaseHadir}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Guru');
    XLSX.writeFile(wb, fileName);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ACTION BAR */}
      <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-cyan-500/10 text-orange-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Rekap Kehadiran Guru Mapel Kelas Binaan
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pencatatan dan verifikasi kehadiran guru mata pelajaran berdasarkan buku jurnal kelas
                </p>
              </div>
            </div>
          </div>

          {/* Quick View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-[#1c2130] rounded-xl border border-slate-200/80 dark:border-[#282e42]">
              <button
                type="button"
                onClick={() => setViewMode('input')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'input'
                    ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Input Harian</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('recap')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'recap'
                    ? 'bg-white dark:bg-cyan-500 text-slate-900 dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Rekap Bulanan</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={assignments.length === 0}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#282e42] hover:bg-slate-50 dark:hover:bg-[#1b2030] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={assignments.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* FILTER BAR: KELAS BINAAN, TAHUN AJARAN, SEMESTER, BULAN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-[#232838]">
          {/* Pilih Kelas Binaan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Kelas Binaan
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-cyan-500/20"
            >
              {homeroomClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Wali Kelas)
                </option>
              ))}
              {homeroomClasses.length === 0 && classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun Ajaran */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Tahun Ajaran
            </label>
            <div className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#171b28] text-slate-700 dark:text-slate-300">
              {activeAcademicYear?.label || 'Belum dipilih'} {activeAcademicYear?.isArchived ? '(Arsip)' : ''}
            </div>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as SemesterType)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="GANJIL">Ganjil</option>
              <option value="GENAP">Genap</option>
            </select>
          </div>

          {/* Bulan & Tahun */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Bulan & Tahun
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-24 px-2 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#282e42] bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Warning if user is not homeroom teacher */}
        {!isAuthorizedHomeroom && currentClass && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Informasi Hak Akses:</span> Anda bukan wali kelas terdaftar untuk kelas{' '}
              <strong>{currentClass.name}</strong>. Kelas binaan Anda terdeteksi:{' '}
              {homeroomClasses.map(c => c.name).join(', ') || 'Belum ada kelas yang ditugaskan kepada Anda sebagai Wali Kelas'}.
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE: INPUT HARIAN (KALENDER + FORM CEPAT) */}
      {viewMode === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* SISI KIRI: KALENDER BULAN INI (5 Kolom) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-[#141722] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-orange-500 dark:text-cyan-400" />
                    <span>Kalender {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih tanggal jurnal untuk mengisi kehadiran guru
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(true)}
                  className="text-[11px] font-semibold text-orange-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Atur Libur</span>
                </button>
              </div>

              {/* Grid Hari Kalender */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DAY_NAMES.map((day, idx) => (
                  <div
                    key={day}
                    className={`py-1 text-[11px] font-bold ${
                      idx === 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}

                {/* Padding awal bulan */}
                {Array.from({
                  length: new Date(selectedYear, selectedMonth - 1, 1).getDay(),
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 rounded-xl" />
                ))}

                {/* Tanggal-tanggal dalam bulan */}
                {daysArray.map((dayNum) => {
                  const dayStr = String(dayNum).padStart(2, '0');
                  const monthStr = String(selectedMonth).padStart(2, '0');
                  const dateString = `${selectedYear}-${monthStr}-${dayStr}`;

                  const isSelected = selectedDate === dateString;
                  const isToday = isDateToday(dateString);
                  const isHoliday = checkIsHoliday(dateString);
                  const recordCount = recordedDatesMap.get(dateString) || 0;
                  const isRecorded = recordCount > 0;

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => {
                        if (hasUnsavedChanges) {
                          if (
                            !window.confirm(
                              'Ada perubahan data yang belum disimpan pada tanggal saat ini. Tetap beralih tanggal?'
                            )
                          ) {
                            return;
                          }
                        }
                        setSelectedDate(dateString);
                      }}
                      className={`h-11 rounded-xl p-1 flex flex-col items-center justify-between border text-xs font-semibold transition-all relative cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-600 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-400 shadow-sm'
                          : isRecorded
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/70'
                          : isHoliday
                          ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40'
                          : 'bg-slate-50/70 dark:bg-[#1a1f2e] text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-[#282e42] hover:bg-slate-100 dark:hover:bg-[#20273a]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[11px]">{dayNum}</span>
                        {isToday && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white dark:bg-slate-950' : 'bg-orange-500'
                            }`}
                            title="Hari Ini"
                          />
                        )}
                      </div>

                      {/* Indikator Status Terisi */}
                      <div className="w-full flex items-center justify-center">
                        {isRecorded ? (
                          <span
                            className={`text-[9px] font-bold px-1 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white dark:text-slate-950'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            Terisi
                          </span>
                        ) : isHoliday ? (
                          <span className="text-[8px] text-rose-500 opacity-80">Libur</span>
                        ) : (
                          <span className="text-[8px] opacity-30 text-slate-400">-</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legenda Kalender */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#232838] flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 dark:bg-cyan-500" />
                  <span>Dipilih</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/40" />
                  <span>Sudah Ada Rekap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-100 border border-rose-200 dark:bg-rose-950/40" />
                  <span>Hari Libur</span>
                </div>
              </div>
            </div>

            {/* Info Kartu Buku Jurnal */}
            <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-300 text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Tips Pengisian Cepat:</span> Buka buku jurnal kelas madrasah.
                  Cek tanda tangan/presensi guru pada tanggal yang dipilih. Klik tombol{' '}
                  <strong>"Semua Hadir"</strong>, lalu ubah status guru yang berhalangan hadir (Sakit/Izin/Alpa/Dinas).
                </div>
              </div>
            </div>
          </div>

          {/* SISI KANAN: FORM INPUT CEPAT PER TANGGAL (7 Kolom) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-[#141722] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
              {/* Header Tanggal Terpilih & Action Simpan */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#232838]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 dark:bg-cyan-500/10 dark:text-cyan-400">
                      {DAY_NAMES[selectedDateDayOfWeek]}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {selectedDate}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kelas {currentClass?.name || '-'} • {assignments.length} Guru Mapel Terdaftar
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetAllHadir}
                    disabled={assignments.length === 0}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#282e42] hover:bg-slate-50 dark:hover:bg-[#1c2232] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Set Semua Hadir
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDate}
                    disabled={saving || assignments.length === 0}
                    className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Tanggal Ini'}</span>
                  </button>
                </div>
              </div>

              {/* Status Banner Jika Tanggal Sudah Ada Record */}
              {recordedDatesMap.has(selectedDate) && (
                <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Data kehadiran tanggal ini sudah tersimpan di database. Anda dapat mengeditnya kapan saja.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteDate}
                    disabled={saving}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    Reset Tanggal
                  </button>
                </div>
              )}

              {/* Empty State jika belum ada penugasan guru di kelas ini */}
              {assignments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <Briefcase className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold">
                    Belum ada data Penugasan Guru (Teaching Assignments) untuk Kelas {currentClass?.name} di Semester ini.
                  </p>
                  <p className="text-[11px] mt-1 text-slate-400">
                    Silakan plotting penugasan guru mapel terlebih dahulu pada menu Master Data &gt; Penugasan Mengajar.
                  </p>
                </div>
              ) : (
                /* DAFTAR GURU MAPEL UNTUK DIINPUT */
                <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {sortedAssignments.map((asg, idx) => {
                    const formData = entryForm[asg.id] || { status: 'HADIR', notes: '' };
                    const isScheduledToday = asg.dayOfWeek === selectedDateDayOfWeek;

                    return (
                      <div
                        key={asg.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          formData.status === 'HADIR'
                            ? 'bg-white dark:bg-[#181d2a] border-slate-200 dark:border-[#282e42]'
                            : formData.status === 'SAKIT'
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                            : formData.status === 'IZIN'
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                            : formData.status === 'ALPA'
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                            : 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Info Guru & Mapel */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {asg.teacherName || 'Guru Mapel'}
                              </span>
                              {isScheduledToday && (
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  Terjadwal Hari Ini
                                </span>
                              )}
                              {asg.timeSlot && (
                                <span className="text-[10px] text-slate-400">
                                  Jam: {asg.timeSlot}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {asg.subjectName}
                              </span>
                              {asg.subjectCode && (
                                <span className="text-[10px] bg-slate-100 dark:bg-[#202738] px-1.5 py-0.2 rounded font-mono">
                                  {asg.subjectCode}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Status Buttons (H, S, I, A, D) */}
                          <div className="flex items-center gap-1 shrink-0">
                            {(['HADIR', 'SAKIT', 'IZIN', 'ALPA', 'DINAS'] as TeacherAttendanceStatus[]).map((st) => {
                              const isSelected = formData.status === st;
                              const labelShort = st === 'HADIR' ? 'H' : st === 'SAKIT' ? 'S' : st === 'IZIN' ? 'I' : st === 'ALPA' ? 'A' : 'D';

                              let activeBg = '';
                              if (st === 'HADIR') activeBg = 'bg-emerald-600 text-white border-emerald-600';
                              else if (st === 'SAKIT') activeBg = 'bg-amber-500 text-white border-amber-500';
                              else if (st === 'IZIN') activeBg = 'bg-blue-600 text-white border-blue-600';
                              else if (st === 'ALPA') activeBg = 'bg-rose-600 text-white border-rose-600';
                              else if (st === 'DINAS') activeBg = 'bg-purple-600 text-white border-purple-600';

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(asg.id, st)}
                                  title={`${st} (${asg.teacherName})`}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? activeBg
                                      : 'bg-slate-100 dark:bg-[#202738] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#2d354d] hover:bg-slate-200 dark:hover:bg-[#283248]'
                                  }`}
                                >
                                  {labelShort}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Input Catatan Opsional (jika sakit, izin, tugas dinas, atau ada info khusus) */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#232838]/80">
                          <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => handleNotesChange(asg.id, e.target.value)}
                            placeholder="Catatan jurnal (cth: Tugas mandiri di kelas / Guru pengganti / Izin dinas luar)..."
                            className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#282e42] bg-slate-50/50 dark:bg-[#141722] text-slate-800 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-[#1a1f2e]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Sticky Save Bar */}
              {assignments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#232838] flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {hasUnsavedChanges ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Perubahan belum disimpan
                      </span>
                    ) : (
                      <span>Siap disimpan</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDate}
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan ke Firestore...' : `Simpan ${assignments.length} Guru`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: REKAP BULANAN OTOMATIS */}
      {viewMode === 'recap' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#232838]">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Rekapitulasi Kehadiran Guru Mapel</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1f2536] text-slate-700 dark:text-slate-300 font-normal">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dihitung otomatis dari seluruh record tanggal aktual pada bulan ini
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari guru atau mapel..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#171b28] text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* TABEL REKAP BULANAN */}
            <div className="mt-4 overflow-x-auto border border-slate-200 dark:border-[#282e42] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#171b28] text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-[#282e42]">
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3 min-w-[180px]">Nama Guru</th>
                    <th className="p-3 min-w-[150px]">Mata Pelajaran</th>
                    <th className="p-3 w-16 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">Hadir</th>
                    <th className="p-3 w-16 text-center text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">Sakit</th>
                    <th className="p-3 w-16 text-center text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">Izin</th>
                    <th className="p-3 w-16 text-center text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20">Alpa</th>
                    <th className="p-3 w-16 text-center text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">Dinas</th>
                    <th className="p-3 w-20 text-center font-bold">Total</th>
                    <th className="p-3 w-24 text-center font-bold">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#232838]">
                  {filteredSummary.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Tidak ada data rekap guru yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSummary.map((item, idx) => (
                      <tr
                        key={item.teachingAssignmentId}
                        className="hover:bg-slate-50/70 dark:hover:bg-[#1b2030] transition-colors"
                      >
                        <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                          {item.teacherName}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span>{item.subjectName}</span>
                            {item.subjectCode && (
                              <span className="text-[10px] bg-slate-100 dark:bg-[#202738] px-1 py-0.2 rounded font-mono text-slate-500">
                                {item.subjectCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                          {item.hadir}
                        </td>
                        <td className="p-3 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                          {item.sakit}
                        </td>
                        <td className="p-3 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10">
                          {item.izin}
                        </td>
                        <td className="p-3 text-center font-bold text-rose-700 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/10">
                          {item.alpa}
                        </td>
                        <td className="p-3 text-center font-bold text-purple-700 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/10">
                          {item.dinas}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                          {item.total}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.persentaseHadir >= 90
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : item.persentaseHadir >= 75
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : item.persentaseHadir >= 50
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {item.persentaseHadir}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Catatan Perhitungan */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-[#171b28] border border-slate-200 dark:border-[#282e42] text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                Persentase Kehadiran dihitung dengan rumus:{' '}
                <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-slate-800 dark:text-slate-200">
                  (Hadir + Dinas) ÷ Total Pertemuan × 100%
                </code>
                . Guru yang ditugaskan dinas luar tetap diperhitungkan sebagai pemenuhan jam kehadiran mengajar resmi.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY VIEW: TAMPILAN RESMI KETIKA DI-PRINT */}
      <div className="hidden print:block font-serif text-black p-4 space-y-4">
        {/* Kop Madrasah */}
        <div className="text-center border-b-2 border-black pb-3">
          <h2 className="text-sm font-bold tracking-wider uppercase">
            {schoolSettings?.kemenagDistrict || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}
          </h2>
          <h1 className="text-base font-extrabold uppercase">
            {schoolSettings?.schoolName || 'MADRASAH DADU'}
          </h1>
          <p className="text-[11px]">
            {schoolSettings?.address || 'Alamat Madrasah'} • Telp: {schoolSettings?.phone || '-'} • Email: {schoolSettings?.email || '-'}
          </p>
        </div>

        {/* Judul Dokumen */}
        <div className="text-center my-3">
          <h3 className="text-sm font-bold underline uppercase">
            REKAPITULASI KEHADIRAN GURU MATA PELAJARAN OLEH WALI KELAS
          </h3>
          <p className="text-xs mt-1">
            Kelas: <strong>{currentClass?.name}</strong> • Bulan:{' '}
            <strong>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </strong>{' '}
            • Semester: <strong>{selectedSemester}</strong> (TA {activeAcademicYear?.label})
          </p>
        </div>

        {/* Tabel Print */}
        <table className="w-full text-xs border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100 font-bold text-center">
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 text-left">Nama Guru</th>
              <th className="border border-black p-1.5 text-left">Mata Pelajaran</th>
              <th className="border border-black p-1.5 w-12">H</th>
              <th className="border border-black p-1.5 w-12">S</th>
              <th className="border border-black p-1.5 w-12">I</th>
              <th className="border border-black p-1.5 w-12">A</th>
              <th className="border border-black p-1.5 w-12">D</th>
              <th className="border border-black p-1.5 w-14">Total</th>
              <th className="border border-black p-1.5 w-16">% Hadir</th>
            </tr>
          </thead>
          <tbody>
            {monthlySummary.map((item, idx) => (
              <tr key={item.teachingAssignmentId}>
                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border border-black p-1.5 font-semibold">{item.teacherName}</td>
                <td className="border border-black p-1.5">{item.subjectName}</td>
                <td className="border border-black p-1.5 text-center">{item.hadir}</td>
                <td className="border border-black p-1.5 text-center">{item.sakit}</td>
                <td className="border border-black p-1.5 text-center">{item.izin}</td>
                <td className="border border-black p-1.5 text-center">{item.alpa}</td>
                <td className="border border-black p-1.5 text-center">{item.dinas}</td>
                <td className="border border-black p-1.5 text-center font-bold">{item.total}</td>
                <td className="border border-black p-1.5 text-center font-bold">{item.persentaseHadir}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda Tangan */}
        <div className="mt-8 pt-4 flex justify-between text-xs">
          <div className="text-center w-56">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Madrasah</p>
            <div className="h-16" />
            <p className="font-bold underline">{schoolSettings?.headmasterName || '( ........................................ )'}</p>
            <p>NIP. {schoolSettings?.headmasterNip || '-'}</p>
          </div>

          <div className="text-center w-56">
            <p>
              {schoolSettings?.district || 'Kota'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-bold">Wali Kelas {currentClass?.name}</p>
            <div className="h-16" />
            <p className="font-bold underline">{profile?.displayName || user?.displayName || '( ........................................ )'}</p>
            <p>NIP. {profile?.nip || '-'}</p>
          </div>
        </div>
      </div>

      {/* MODAL PENGATURAN HARI LIBUR */}
      {isHolidayModalOpen && (
        <AttendanceHolidaysModal
          isOpen={isHolidayModalOpen}
          onClose={() => setIsHolidayModalOpen(false)}
        />
      )}
    </div>
  );
};
