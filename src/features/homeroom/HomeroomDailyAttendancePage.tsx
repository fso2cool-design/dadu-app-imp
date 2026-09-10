import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, DailyAttendanceRecord, AttendanceStatus, GenderType } from '../../types';
import { getTodayISO, formatDateWithDay } from '../../utils/date';
import { ATTENDANCE_STATUS_LIST, ATTENDANCE_STATUS_META } from '../../constants/attendance';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { 
  getDailyAttendanceRecords, 
  getDailyAttendanceSession,
  saveDailyAttendance,
  SaveDailyAttendanceItem 
} from '../../services/firestore/homeroomAttendance';
import { 
  CalendarDays, 
  Calendar,
  Check, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Save, 
  Search, 
  Users, 
  AlertCircle,
  FileSpreadsheet,
  UserX
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext';
import { GenderBadge } from '../../components/common/GenderIcon';
import { UnsavedChangesModal } from '../../components/common/UnsavedChangesModal';
import { AttendanceHolidaysModal } from '../../components/common/AttendanceHolidaysModal';

interface HomeroomDailyAttendancePageProps {
  initialClassId?: string;
  initialDate?: string;
}

export const HomeroomDailyAttendancePage: React.FC<HomeroomDailyAttendancePageProps> = ({
  initialClassId,
  initialDate,
}) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId,
    triggerSyncFeedback,
    checkIsHoliday,
    attendanceSettings
  } = useWorkspace();

  const isArchivedYear = Boolean(activeAcademicYear?.isArchived);

  const [date, setDate] = useState<string>(
    initialDate || getTodayISO()
  );
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);
  const holidayInfo = useMemo(() => checkIsHoliday(date), [checkIsHoliday, date]);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dirty state tracking
  const initialSnapshotRef = useRef<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'class' | 'date'; targetValue: string } | null>(null);

  // Browser safety check on tab close/reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Available classes in active academic year
  const availableClasses = useMemo(() => {
    if (!activeAcademicYear) return classes;
    return classes.filter(c => c.academicYearId === activeAcademicYear.id && c.isActive);
  }, [classes, activeAcademicYear]);

  const currentClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'NONE') return null;
    return availableClasses.find(c => c.id === (initialClassId || selectedClassId)) || null;
  }, [availableClasses, selectedClassId, initialClassId]);

  useEffect(() => {
    if (initialClassId && availableClasses.some(c => c.id === initialClassId)) {
      setSelectedClassId(initialClassId);
    } else if (!selectedClassId && selectedClassId !== 'NONE' && availableClasses.length > 0) {
      const homeroomClass = availableClasses.find(c => c.classTeacherId === user?.uid);
      if (homeroomClass) {
        setSelectedClassId(homeroomClass.id);
      }
    }
  }, [initialClassId, availableClasses, selectedClassId, setSelectedClassId, user?.uid]);

  // Load class enrollment & daily attendance records for this date
  useEffect(() => {
    if (!user || !activeAcademicYear || !currentClass) {
      setEnrollments([]);
      setAttendanceState({});
      setSessionNotes('');
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [enrs, records, session] = await Promise.all([
          getEnrollmentsByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
          getDailyAttendanceRecords(user!.uid, activeAcademicYear!.id, currentClass!.id, date),
          getDailyAttendanceSession(user!.uid, activeAcademicYear!.id, currentClass!.id, date),
        ]);

        if (isMounted) {
          const activeEnrs = enrs.filter(e => e.status === 'ACTIVE');
          setEnrollments(activeEnrs);
          setSessionNotes(session?.notes || '');

          const stateMap: Record<string, { status: AttendanceStatus; note: string }> = {};
          
          if (records.length > 0) {
            records.forEach(r => {
              stateMap[r.studentId] = {
                status: r.status,
                note: r.note || '',
              };
            });
          } else {
            // Default: initialize all active students with 'PRESENT'
            activeEnrs.forEach(e => {
              stateMap[e.studentId] = {
                status: 'PRESENT',
                note: '',
              };
            });
          }

          setAttendanceState(stateMap);
          initialSnapshotRef.current = JSON.stringify({ stateMap, sessionNotes: session?.notes || '' });
          setIsDirty(false);
        }
      } catch (err) {
        console.error('Error loading daily attendance data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user, activeAcademicYear, currentClass, date]);

  // Set all students to a specific status
  const handleSetAllStatus = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; note: string }> = {};
    enrollments.forEach(e => {
      updated[e.studentId] = {
        status,
        note: attendanceState[e.studentId]?.note || '',
      };
    });
    setAttendanceState(updated);
    setIsDirty(JSON.stringify({ stateMap: updated, sessionNotes }) !== initialSnapshotRef.current);
  };

  // Update single student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          status,
          note: prev[studentId]?.note || '',
        },
      };
      setIsDirty(JSON.stringify({ stateMap: updated, sessionNotes }) !== initialSnapshotRef.current);
      return updated;
    });
  };

  // Update single student note
  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceState(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          status: prev[studentId]?.status || 'PRESENT',
          note,
        },
      };
      setIsDirty(JSON.stringify({ stateMap: updated, sessionNotes }) !== initialSnapshotRef.current);
      return updated;
    });
  };

  // Preset note clicked
  const handlePresetNote = (studentId: string, preset: string) => {
    setAttendanceState(prev => {
      const updated = {
        ...prev,
        [studentId]: {
          status: prev[studentId]?.status || 'PRESENT',
          note: preset,
        },
      };
      setIsDirty(JSON.stringify({ stateMap: updated, sessionNotes }) !== initialSnapshotRef.current);
      return updated;
    });
  };

  const handleSessionNotesChange = (notes: string) => {
    setSessionNotes(notes);
    setIsDirty(JSON.stringify({ stateMap: attendanceState, sessionNotes: notes }) !== initialSnapshotRef.current);
  };

  // Navigation handlers with dirty guard
  const handleClassChange = (newClassId: string) => {
    const targetId = newClassId === 'NONE' ? '' : newClassId;
    if (targetId === (selectedClassId || '')) return;
    if (isDirty) {
      setPendingAction({ type: 'class', targetValue: targetId });
      setIsDirtyModalOpen(true);
    } else {
      setSelectedClassId(targetId);
    }
  };

  const handleDateChange = (newDate: string) => {
    if (newDate === date) return;
    if (isDirty) {
      setPendingAction({ type: 'date', targetValue: newDate });
      setIsDirtyModalOpen(true);
    } else {
      setDate(newDate);
    }
  };

  const handleDateShift = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    const targetDate = d.toISOString().split('T')[0];
    handleDateChange(targetDate);
  };

  const handleSaveAndProceed = async () => {
    try {
      await handleSave();
      if (pendingAction) {
        if (pendingAction.type === 'class') setSelectedClassId(pendingAction.targetValue);
        else if (pendingAction.type === 'date') setDate(pendingAction.targetValue);
        setPendingAction(null);
      }
      setIsDirtyModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardAndProceed = () => {
    setIsDirty(false);
    if (pendingAction) {
      if (pendingAction.type === 'class') setSelectedClassId(pendingAction.targetValue);
      else if (pendingAction.type === 'date') setDate(pendingAction.targetValue);
      setPendingAction(null);
    }
    setIsDirtyModalOpen(false);
  };

  // Calculation of summary
  const summaryStats = useMemo(() => {
    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;
    let dispensation = 0;

    enrollments.forEach(e => {
      const s = attendanceState[e.studentId]?.status || 'PRESENT';
      if (s === 'PRESENT') present++;
      else if (s === 'SICK') sick++;
      else if (s === 'PERMITTED') permitted++;
      else if (s === 'ABSENT') absent++;
      else if (s === 'DISPENSATION') dispensation++;
    });

    const total = enrollments.length;
    const rate = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 0;

    return { present, sick, permitted, absent, dispensation, total, rate };
  }, [enrollments, attendanceState]);

  // Save handler
  const handleSave = async () => {
    if (!user || !activeAcademicYear || !currentClass) return;

    setSaving(true);
    try {
      triggerSyncFeedback('syncing', `Menyimpan presensi harian Kelas ${currentClass.name}...`);
      const itemsToSave: SaveDailyAttendanceItem[] = enrollments.map(e => ({
        studentId: e.studentId,
        rollNumber: e.rollNumber,
        studentName: e.student?.fullName || '',
        gender: e.student?.gender || 'L',
        status: attendanceState[e.studentId]?.status || 'PRESENT',
        note: attendanceState[e.studentId]?.note || '',
      }));

      await saveDailyAttendance(
        user.uid,
        activeAcademicYear.id,
        currentClass.id,
        currentClass.name,
        date,
        itemsToSave,
        sessionNotes
      );

      initialSnapshotRef.current = JSON.stringify({ stateMap: attendanceState, sessionNotes });
      setIsDirty(false);

      triggerSyncFeedback('saved', 'Presensi harian berhasil disimpan!');
      toastSuccess('Presensi harian berhasil disimpan ke cloud database!');
    } catch (err: any) {
      console.error('Error saving daily attendance:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan presensi harian. Periksa koneksi Anda.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered student list
  const filteredList = useMemo(() => {
    return enrollments.filter(e => {
      const nameMatch = !searchQuery || 
        e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.student?.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.rollNumber?.toString().includes(searchQuery);

      if (!nameMatch) return false;

      const st = attendanceState[e.studentId]?.status || 'PRESENT';
      if (filterStatus === 'ALL') return true;
      if (filterStatus === 'NOT_PRESENT') return st !== 'PRESENT';
      return st === filterStatus;
    });
  }, [enrollments, searchQuery, filterStatus, attendanceState]);

  // Export to Excel
  const handleExportExcel = () => {
    if (enrollments.length === 0) return;

    const dataRows = enrollments.map((enr, idx) => {
      const record = attendanceState[enr.studentId] || { status: 'PRESENT', note: '' };
      const statusIndo = 
        record.status === 'PRESENT' ? 'Hadir (H)' :
        record.status === 'SICK' ? 'Sakit (S)' :
        record.status === 'PERMITTED' ? 'Izin (I)' :
        record.status === 'ABSENT' ? 'Alpa (A)' : 'Dispensasi (D)';

      return {
        'No': enr.rollNumber || idx + 1,
        'NIS': enr.student?.nis || '',
        'NISN': enr.student?.nisn || '',
        'Nama Siswa': enr.student?.fullName || '',
        'L/P': enr.student?.gender || 'L',
        'Tanggal': date,
        'Status Presensi': statusIndo,
        'Kode': record.status === 'PRESENT' ? 'H' : record.status === 'SICK' ? 'S' : record.status === 'PERMITTED' ? 'I' : record.status === 'ABSENT' ? 'A' : 'D',
        'Keterangan / Alasan': record.note || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Presensi_${date}`);
    XLSX.writeFile(workbook, `Presensi_Harian_Kelas_${currentClass?.name || ''}_${date}.xlsx`);
  };

  const statusOptions: { value: AttendanceStatus; label: string; short: string; color: string; activeColor: string }[] = [
    { value: 'PRESENT', label: 'Hadir', short: 'H', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-500/40', activeColor: 'bg-emerald-600 text-white font-bold' },
    { value: 'SICK', label: 'Sakit', short: 'S', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-500/40', activeColor: 'bg-amber-500 text-white font-bold' },
    { value: 'PERMITTED', label: 'Izin', short: 'I', color: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-500/40', activeColor: 'bg-sky-600 text-white font-bold' },
    { value: 'ABSENT', label: 'Alpa', short: 'A', color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-500/40', activeColor: 'bg-rose-600 text-white font-bold' },
    { value: 'DISPENSATION', label: 'Dispen', short: 'D', color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-500/40', activeColor: 'bg-indigo-600 text-white font-bold' },
  ];

  return (
    <div className="space-y-6">
      {/* Historical Archive Banner */}
      {isArchivedYear && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Mode Arsip Historis (Read-Only):</span> Tahun Ajaran ini telah diarsipkan. Seluruh data presensi harian siswa rombel dikunci permanen demi integritas data laporan.
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 dark:bg-cyan-950/60 text-orange-700 dark:text-cyan-400 border border-orange-200 dark:border-cyan-500/40">
                Presensi Harian Wali Kelas
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                T.A {activeAcademicYear?.label} • Sem {activeSemester}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Buku Presensi Harian Kelas {currentClass?.name || ''}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pencatatan kehadiran seluruh siswa rombongan belajar per hari
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1f2e] dark:hover:bg-[#232838] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || isArchivedYear}
              title={isArchivedYear ? 'Tahun Ajaran telah diarsipkan (read-only)' : 'Simpan Presensi'}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : (isArchivedYear ? 'Terkunci (Arsip)' : 'Simpan Presensi')}
            </button>
          </div>
        </div>

        {/* Filters and Date Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#232838] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Class Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="daily-att-class" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kelas:</label>
            <select
              id="daily-att-class"
              value={currentClass?.id || 'NONE'}
              onChange={(e) => handleClassChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
            >
              <option value="NONE">-- Bukan Wali Kelas / Tidak Ada Binaan --</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} {c.classTeacherId === user?.uid ? '⭐ (Binaan Saya)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker with Navigator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDateShift(-1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1b1f2e] cursor-pointer"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] px-3 py-1.5 rounded-lg">
              <CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={() => handleDateShift(1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1b1f2e] cursor-pointer"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleDateChange(getTodayISO())}
              className="px-2.5 py-1.5 text-xs font-semibold text-orange-700 dark:text-cyan-400 bg-orange-50 dark:bg-cyan-950/60 hover:bg-orange-100 dark:hover:bg-cyan-900/60 rounded-lg border border-orange-200 dark:border-cyan-500/40 cursor-pointer"
            >
              Hari Ini
            </button>

            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0c0e15] hover:bg-slate-100 dark:hover:bg-[#1b1f2e] rounded-lg border border-slate-300 dark:border-[#232838] transition-colors cursor-pointer"
              title="Atur Sistem Hari Belajar 5/6 Hari & Hari Libur Kustom"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
              <span>Kalender & Libur</span>
            </button>
          </div>
        </div>
      </div>

      {!currentClass ? (
        <div className="bg-white dark:bg-[#141722] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-[#232838] text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/50">
            <UserX className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Pilih Kelas Binaan untuk Presensi Harian
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Silakan pilih kelas binaan pada opsi di atas untuk mencatat atau melihat presensi harian siswa.
          </p>
        </div>
      ) : (
        <>
          {/* Holiday Notification Banner */}
          {holidayInfo.isHoliday && (
            <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-300">
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 shrink-0">
                  <Calendar className="w-4 h-4" />
                </span>
                <span>
                  <strong>Hari Non-Efektif / Libur:</strong> {holidayInfo.reason}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-medium">
                  Tatap Muka Ditiadakan
                </span>
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(true)}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Ubah Jadwal
                </button>
              </div>
            </div>
          )}

          {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-slate-200 dark:border-[#232838] text-center">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Siswa</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{summaryStats.total}</p>
        </div>

        <div className="bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-center">
          <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Hadir (H)</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{summaryStats.present}</p>
        </div>

        <div className="bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/20 text-center">
          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Sakit (S)</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">{summaryStats.sick}</p>
        </div>

        <div className="bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-sky-200 dark:border-sky-500/40 bg-sky-50/30 dark:bg-sky-950/20 text-center">
          <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 uppercase">Izin (I)</p>
          <p className="text-xl font-bold text-sky-700 dark:text-sky-300 mt-0.5">{summaryStats.permitted}</p>
        </div>

        <div className="bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/40 bg-rose-50/30 dark:bg-rose-950/20 text-center">
          <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 uppercase">Alpa (A)</p>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5">{summaryStats.absent}</p>
        </div>

        <div className="bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-950/20 text-center">
          <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 uppercase">Dispen (D)</p>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">{summaryStats.dispensation}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#141722] p-3.5 rounded-xl border border-orange-200 dark:border-cyan-500/40 bg-orange-50/30 dark:bg-cyan-950/20 text-center">
          <p className="text-[10px] font-semibold text-orange-700 dark:text-cyan-400 uppercase">% Kehadiran</p>
          <p className="text-xl font-bold text-orange-700 dark:text-cyan-300 mt-0.5">{summaryStats.rate}%</p>
        </div>
      </div>

      {/* Batch Operations & Student Search */}
      <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Fast Batch Setting */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Set Massal:</span>
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleSetAllStatus('PRESENT')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Set Semua Hadir (H)
          </button>
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => handleSetAllStatus('PERMITTED')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1f2e] dark:hover:bg-[#232838] text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Semua Izin
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
          >
            <option value="ALL">Semua Siswa</option>
            <option value="NOT_PRESENT">Hanya yang Tidak Hadir</option>
            <option value="PRESENT">Hadir Saja</option>
            <option value="SICK">Sakit Saja</option>
            <option value="PERMITTED">Izin Saja</option>
            <option value="ABSENT">Alpa Saja</option>
            <option value="DISPENSATION">Dispen Saja</option>
          </select>

          {/* Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari siswa..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] text-slate-800 dark:text-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Student List Table with Sticky Columns */}
      <div className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0c0e15] text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-[#232838] sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 dark:bg-[#0c0e15] py-3 px-3.5 w-12 text-center border-r border-slate-200 dark:border-[#232838]">No</th>
                <th className="sticky left-12 z-30 bg-slate-50 dark:bg-[#0c0e15] py-3 px-3.5 min-w-[200px] border-r border-slate-200 dark:border-[#232838]">Nama Lengkap</th>
                <th className="py-3 px-3.5 w-24 border-r border-slate-200 dark:border-[#232838]">NIS</th>
                <th className="py-3 px-2 w-12 text-center border-r border-slate-200 dark:border-[#232838]">L/P</th>
                <th className="py-3 px-3.5 min-w-[260px] text-center border-r border-slate-200 dark:border-[#232838]">Status Kehadiran</th>
                <th className="py-3 px-3.5 min-w-[220px]">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#232838] text-slate-700 dark:text-slate-300">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    {loading ? 'Memuat presensi siswa...' : 'Tidak ada siswa yang sesuai kriteria.'}
                  </td>
                </tr>
              ) : (
                filteredList.map((enr) => {
                  const state = attendanceState[enr.studentId] || { status: 'PRESENT', note: '' };

                  return (
                    <tr key={enr.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1b1f2e] transition-colors group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] py-3 px-3.5 text-center font-mono font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-[#232838]">
                        {enr.rollNumber}
                      </td>
                      <td className="sticky left-12 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] py-3 px-3.5 border-r border-slate-200 dark:border-[#232838]">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {enr.student?.fullName || '-'}
                        </span>
                        {enr.student?.parentPhone && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 font-mono">
                            HP: {enr.student.parentPhone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-[#232838]">
                        {enr.student?.nis || '-'}
                      </td>
                      <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-[#232838]">
                        <GenderBadge gender={enr.student?.gender || 'L'} showLabel={false} size="sm" />
                      </td>

                      {/* Status Badges Group */}
                      <td className="py-3 px-3.5 border-r border-slate-200 dark:border-[#232838]">
                        <div className="flex items-center justify-center gap-1">
                          {statusOptions.map((opt) => {
                            const isSelected = state.status === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={isArchivedYear}
                                onClick={() => handleStatusChange(enr.studentId, opt.value)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${isArchivedYear ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                                  isSelected
                                    ? opt.activeColor + ' border-transparent shadow-xs scale-105'
                                    : 'bg-slate-50 dark:bg-[#0c0e15] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#232838] hover:bg-slate-100 dark:hover:bg-[#1b1f2e]'
                                }`}
                              >
                                {opt.short} <span className="hidden sm:inline font-normal">({opt.label})</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Notes & Quick Presets */}
                      <td className="py-3 px-3.5">
                        <input
                          type="text"
                          disabled={isArchivedYear}
                          value={state.note}
                          onChange={(e) => handleNoteChange(enr.studentId, e.target.value)}
                          placeholder={isArchivedYear ? '-' : 'Catatan...'}
                          className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838] text-slate-800 dark:text-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500 dark:focus:ring-cyan-500 mb-1 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        {/* Quick Presets for non-present */}
                        {state.status !== 'PRESENT' && !isArchivedYear && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(state.status === 'DISPENSATION'
                              ? ['Tugas Lomba KSM', 'Porseni / AKSIOMA', 'Tugas OSIM/Madrasah', 'Petugas Upacara', 'Kepramukaan']
                              : state.status === 'SICK'
                              ? ['Surat Dokter', 'Sakit di Rumah', 'Istirahat di UKS']
                              : state.status === 'PERMITTED'
                              ? ['Izin Keluarga', 'Kepulangan Santri', 'Ada Surat Izin']
                              : ['Tanpa Kabar', 'Belum Ada Keterangan']
                            ).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => handlePresetNote(enr.studentId, preset)}
                                className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer transition-colors ${
                                  state.status === 'DISPENSATION'
                                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1f2e] dark:hover:bg-[#232838] text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class General Notes & Save Footer */}
      <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs space-y-3 transition-colors">
        <label htmlFor="homeroom-notes-area" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
          Catatan & Kejadian Khusus Wali Kelas Hari Ini:
        </label>
        <textarea
          id="homeroom-notes-area"
          rows={2}
          disabled={isArchivedYear}
          value={sessionNotes}
          onChange={(e) => handleSessionNotesChange(e.target.value)}
          placeholder={isArchivedYear ? 'Tidak ada catatan kelas khusus (Arsip read-only)' : 'Tulis catatan kelas, kejadian istimewa, pengumuman, atau kondisi khusus siswa pada hari ini...'}
          className="w-full p-3 text-xs bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838] text-slate-800 dark:text-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <div className="pt-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Perubahan status akan otomatis disinkronisasi ke rekapitulasi bulanan dan legger wali kelas. Gunakan tombol <strong>Simpan Presensi</strong> di bagian atas untuk menyimpan data.
          </p>
        </div>
      </div>
        </>
      )}

      {/* Holiday Configuration Modal */}
      <AttendanceHolidaysModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={isDirtyModalOpen}
        onClose={() => {
          setIsDirtyModalOpen(false);
          setPendingAction(null);
        }}
        onDiscard={handleDiscardAndProceed}
        onSave={handleSaveAndProceed}
        title="Presensi Harian Belum Disimpan"
        message="Terdapat perubahan presensi atau catatan harian wali kelas yang belum disimpan ke database. Apakah Anda ingin menyimpannya sekarang?"
        saveButtonText="Simpan Presensi"
        discardButtonText="Buang Perubahan"
      />
    </div>
  );
};
