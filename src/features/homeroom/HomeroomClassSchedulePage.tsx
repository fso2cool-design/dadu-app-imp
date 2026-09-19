import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  ClassSchedule, 
  ClassScheduleItem, 
  ClassScheduleDay, 
  SemesterType 
} from '../../types';
import { 
  getClassSchedule, 
  saveClassSchedule, 
  deleteClassSchedule 
} from '../../services/firestore/classSchedule';
import { PrintDocumentLayout } from '../reports/PrintDocumentLayout';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import * as XLSX from 'xlsx';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Download, 
  Clock, 
  BookOpen, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Layers,
  Info,
  ExternalLink,
  Building2,
  CalendarCheck
} from 'lucide-react';

const DAYS_OF_WEEK: Array<{ key: ClassScheduleDay; label: string }> = [
  { key: 'SENIN', label: 'Senin' },
  { key: 'SELASA', label: 'Selasa' },
  { key: 'RABU', label: 'Rabu' },
  { key: 'KAMIS', label: 'Kamis' },
  { key: 'JUMAT', label: 'Jumat' },
  { key: 'SABTU', label: 'Sabtu' },
];

const DEFAULT_TIME_SLOTS = [
  '07.15 - 07.50',
  '07.50 - 08.25',
  '08.25 - 09.00',
  '09.20 - 09.55',
  '09.55 - 10.30',
  '10.30 - 11.05',
  '11.05 - 11.40',
  '11.40 - 12.15',
  '12.15 - 12.50',
];

interface ScheduleDisplayItem {
  id: string;
  day: ClassScheduleDay;
  period?: number;
  timeSlot: string;
  subjectName: string;
  subjectCode?: string;
  teacherName: string;
  roomOrNotes?: string;
  isFromPlotting: boolean;
  assignmentId?: string;
}

interface HomeroomClassSchedulePageProps {
  onNavigate?: (route: string, state?: any) => void;
}

// Normalizer for day string into ClassScheduleDay
function normalizeDay(rawDay?: string): ClassScheduleDay | null {
  if (!rawDay) return null;
  const upper = rawDay.trim().toUpperCase();
  if (upper.includes('SENIN')) return 'SENIN';
  if (upper.includes('SELASA')) return 'SELASA';
  if (upper.includes('RABU')) return 'RABU';
  if (upper.includes('KAMIS')) return 'KAMIS';
  if (upper.includes('JUMAT') || upper.includes("JUM'AT")) return 'JUMAT';
  if (upper.includes('SABTU')) return 'SABTU';
  return null;
}

// Helper to extract numeric start time for chronological sorting
function getSortableTime(timeSlot?: string): number {
  if (!timeSlot) return 9999;
  // Match patterns like "07:15", "07.15", "7:30", "Jam 1", etc.
  const timeMatch = timeSlot.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  }
  const jamMatch = timeSlot.match(/jam\s*(?:ke-?|\s*)(\d+)/i);
  if (jamMatch) {
    return parseInt(jamMatch[1], 10) * 100;
  }
  return 9000;
}

export const HomeroomClassSchedulePage: React.FC<HomeroomClassSchedulePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId,
    subjects,
    teachingAssignments
  } = useWorkspace();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

  const [customSchedule, setCustomSchedule] = useState<ClassSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'matrix' | 'print'>('matrix');

  // Modal item state for custom ad-hoc activities (e.g. Upacara, Literasi, Wali Kelas)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassScheduleItem | null>(null);
  const [formDay, setFormDay] = useState<ClassScheduleDay>('SENIN');
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formTimeSlot, setFormTimeSlot] = useState<string>('07.15 - 07.50');
  const [formSubjectName, setFormSubjectName] = useState<string>('');
  const [formTeacherName, setFormTeacherName] = useState<string>('');
  const [formRoomOrNotes, setFormRoomOrNotes] = useState<string>('');

  // Available classes for homeroom
  const availableClasses = useMemo(() => {
    if (!activeAcademicYear) return classes;
    return classes.filter(c => c.academicYearId === activeAcademicYear.id && c.isActive);
  }, [classes, activeAcademicYear]);

  const currentClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'NONE') return null;
    return availableClasses.find(c => c.id === selectedClassId) || null;
  }, [availableClasses, selectedClassId]);

  // Set default class if not set
  useEffect(() => {
    if (selectedClassId === 'NONE') return;
    if (!selectedClassId && availableClasses.length > 0) {
      const homeroomClass = availableClasses.find(c => c.classTeacherId === user?.uid);
      if (homeroomClass) {
        setSelectedClassId(homeroomClass.id);
      } else {
        setSelectedClassId(availableClasses[0].id);
      }
    }
  }, [availableClasses, selectedClassId, setSelectedClassId, user?.uid]);

  // Load any ad-hoc/custom class activities from Firestore
  useEffect(() => {
    if (!user || !currentClass || !activeAcademicYear || !activeSemester) {
      setCustomSchedule(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadSchedule = async () => {
      setLoading(true);
      try {
        const data = await getClassSchedule(
          user.uid,
          currentClass.id,
          activeAcademicYear.id,
          activeSemester as SemesterType
        );
        if (isMounted) {
          setCustomSchedule(data);
        }
      } catch (err) {
        console.error('Error loading custom class schedule items:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSchedule();
    return () => { isMounted = false; };
  }, [user, currentClass, activeAcademicYear, activeSemester]);

  // 1. ALL Teaching Assignments for the current class in active year & semester (SINGLE SOURCE OF TRUTH)
  const classAssignments = useMemo(() => {
    if (!currentClass || !activeAcademicYear || !activeSemester) return [];
    return teachingAssignments.filter(ta => 
      ta.classId === currentClass.id &&
      ta.academicYearId === activeAcademicYear.id &&
      ta.semester === activeSemester &&
      !ta.isArchived &&
      ta.isActive !== false
    );
  }, [teachingAssignments, currentClass, activeAcademicYear, activeSemester]);

  // 2. Identify scheduled vs unscheduled assignments from plotting
  const { scheduledFromPlotting, unscheduledFromPlotting } = useMemo(() => {
    const scheduled: ScheduleDisplayItem[] = [];
    const unscheduled: typeof classAssignments = [];

    classAssignments.forEach(ta => {
      let hasSchedule = false;

      // Check if assignment has multiple schedules array
      if (Array.isArray(ta.schedules) && ta.schedules.length > 0) {
        ta.schedules.forEach((sch, idx) => {
          const dayKey = normalizeDay(sch.day);
          if (dayKey) {
            hasSchedule = true;
            scheduled.push({
              id: `plot_${ta.id}_${idx}`,
              day: dayKey,
              timeSlot: sch.timeSlot || ta.timeSlot || 'Jam KBM',
              subjectName: ta.subjectName || 'Mata Pelajaran',
              subjectCode: ta.subjectCode,
              teacherName: ta.teacherName || 'Guru Pengampu',
              roomOrNotes: sch.room || ta.room || '',
              isFromPlotting: true,
              assignmentId: ta.id,
            });
          }
        });
      }

      // Check single dayOfWeek field
      if (ta.dayOfWeek) {
        const dayKey = normalizeDay(ta.dayOfWeek);
        if (dayKey) {
          hasSchedule = true;
          // Avoid duplicate if already caught in schedules array
          if (!scheduled.some(s => s.assignmentId === ta.id && s.day === dayKey)) {
            scheduled.push({
              id: `plot_${ta.id}`,
              day: dayKey,
              timeSlot: ta.timeSlot || 'Jam KBM',
              subjectName: ta.subjectName || 'Mata Pelajaran',
              subjectCode: ta.subjectCode,
              teacherName: ta.teacherName || 'Guru Pengampu',
              roomOrNotes: ta.room || '',
              isFromPlotting: true,
              assignmentId: ta.id,
            });
          }
        }
      }

      if (!hasSchedule) {
        unscheduled.push(ta);
      }
    });

    return { scheduledFromPlotting: scheduled, unscheduledFromPlotting: unscheduled };
  }, [classAssignments]);

  // 3. Merge plotting schedules with any custom school activities saved in classSchedule
  const allItemsByDay = useMemo(() => {
    const map: Record<ClassScheduleDay, ScheduleDisplayItem[]> = {
      SENIN: [],
      SELASA: [],
      RABU: [],
      KAMIS: [],
      JUMAT: [],
      SABTU: [],
    };

    // Add items from plotting
    scheduledFromPlotting.forEach(item => {
      map[item.day].push(item);
    });

    // Add custom/ad-hoc activities from customSchedule
    if (customSchedule?.items) {
      customSchedule.items.forEach(customItem => {
        if (map[customItem.day]) {
          map[customItem.day].push({
            id: customItem.id,
            day: customItem.day,
            period: customItem.period,
            timeSlot: customItem.timeSlot || 'Jam KBM',
            subjectName: customItem.subjectName,
            teacherName: customItem.teacherName || '-',
            roomOrNotes: customItem.roomOrNotes,
            isFromPlotting: false,
          });
        }
      });
    }

    // Sort items chronologically by time slot or period
    Object.keys(map).forEach(dayKey => {
      const day = dayKey as ClassScheduleDay;
      map[day].sort((a, b) => {
        const timeA = getSortableTime(a.timeSlot);
        const timeB = getSortableTime(b.timeSlot);
        if (timeA !== timeB) return timeA - timeB;
        return (a.period || 0) - (b.period || 0);
      });

      // Assign sequential period numbers for display consistency
      map[day].forEach((item, idx) => {
        item.period = idx + 1;
      });
    });

    return map;
  }, [scheduledFromPlotting, customSchedule]);

  const totalScheduledItems = useMemo(() => {
    return (Object.values(allItemsByDay) as ScheduleDisplayItem[][]).reduce((acc, list) => acc + list.length, 0);
  }, [allItemsByDay]);

  // Modal actions for custom extra activities
  const handleOpenAddCustom = (day: ClassScheduleDay) => {
    setEditingItem(null);
    setFormDay(day);
    const dayItems = allItemsByDay[day] || [];
    const nextPeriod = dayItems.length + 1;
    setFormPeriod(nextPeriod);
    setFormTimeSlot(DEFAULT_TIME_SLOTS[nextPeriod - 1] || '07.15 - 07.50');
    setFormSubjectName('');
    setFormTeacherName(user?.displayName || '');
    setFormRoomOrNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditCustom = (item: ScheduleDisplayItem) => {
    setEditingItem({
      id: item.id,
      day: item.day,
      period: item.period || 1,
      timeSlot: item.timeSlot,
      subjectName: item.subjectName,
      teacherName: item.teacherName,
      roomOrNotes: item.roomOrNotes,
    });
    setFormDay(item.day);
    setFormPeriod(item.period || 1);
    setFormTimeSlot(item.timeSlot);
    setFormSubjectName(item.subjectName);
    setFormTeacherName(item.teacherName);
    setFormRoomOrNotes(item.roomOrNotes || '');
    setIsModalOpen(true);
  };

  const handleSaveCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentClass || !activeAcademicYear || !activeSemester) return;

    if (!formSubjectName.trim()) {
      toastWarning('Nama kegiatan/mapel wajib diisi');
      return;
    }

    setSaving(true);
    try {
      let currentItems = [...(customSchedule?.items || [])];

      if (editingItem) {
        currentItems = currentItems.map(i => {
          if (i.id === editingItem.id) {
            return {
              ...i,
              day: formDay,
              period: Number(formPeriod),
              timeSlot: formTimeSlot.trim(),
              subjectName: formSubjectName.trim(),
              teacherName: formTeacherName.trim(),
              roomOrNotes: formRoomOrNotes.trim() || undefined,
            };
          }
          return i;
        });
      } else {
        const newItem: ClassScheduleItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          day: formDay,
          period: Number(formPeriod),
          timeSlot: formTimeSlot.trim(),
          subjectName: formSubjectName.trim(),
          teacherName: formTeacherName.trim(),
          roomOrNotes: formRoomOrNotes.trim() || undefined,
        };
        currentItems.push(newItem);
      }

      const updated = await saveClassSchedule(user.uid, {
        classId: currentClass.id,
        className: currentClass.name,
        academicYearId: activeAcademicYear.id,
        academicYearLabel: activeAcademicYear.label,
        semester: activeSemester as SemesterType,
        items: currentItems,
      });

      setCustomSchedule(updated);
      setIsModalOpen(false);
      toastSuccess('Jadwal kegiatan berhasil disimpan');
    } catch (err) {
      console.error('Error saving custom schedule item:', err);
      toastError('Gagal menyimpan kegiatan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomItem = async (itemId: string) => {
    if (!user || !currentClass || !activeAcademicYear || !activeSemester || !customSchedule) return;
    if (!window.confirm('Hapus kegiatan jadwal khusus ini?')) return;

    try {
      const updatedItems = customSchedule.items.filter(i => i.id !== itemId);
      const updated = await saveClassSchedule(user.uid, {
        ...customSchedule,
        items: updatedItems,
      });
      setCustomSchedule(updated);
      toastSuccess('Kegiatan dihapus');
    } catch (err) {
      console.error('Error deleting schedule item:', err);
      toastError('Gagal menghapus kegiatan');
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!currentClass) return;

    const rows: any[] = [];
    DAYS_OF_WEEK.forEach(d => {
      const items = allItemsByDay[d.key];
      if (items.length > 0) {
        items.forEach(i => {
          rows.push({
            'Hari': d.label.toUpperCase(),
            'Jam Ke': i.period || '-',
            'Waktu': i.timeSlot || '-',
            'Mata Pelajaran': i.subjectName,
            'Guru Pengampu': i.teacherName || '-',
            'Ruang / Catatan': i.roomOrNotes || '-',
            'Sumber': i.isFromPlotting ? 'Plotting Tugas Mengajar' : 'Jadwal Khusus Kelas',
          });
        });
      } else {
        rows.push({
          'Hari': d.label.toUpperCase(),
          'Jam Ke': '-',
          'Waktu': '-',
          'Mata Pelajaran': '(Tidak ada KBM)',
          'Guru Pengampu': '-',
          'Ruang / Catatan': '-',
          'Sumber': '-',
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');

    const fileName = `Jadwal_Pelajaran_Kelas_${currentClass.name.replace(/\s+/g, '_')}_${activeAcademicYear?.label.replace('/', '-')}_${activeSemester}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toastSuccess('Jadwal pelajaran diekspor ke Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sinkron Otomatis dari Plotting Guru & Mapel</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              T.A {activeAcademicYear?.label} • Semester {activeSemester}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {currentClass ? `Jadwal Pelajaran Kelas ${currentClass.name}` : 'Jadwal Pelajaran Kelas Binaan'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Informasi rujukan KBM mingguan kelas binaan, terpusat dari SK Pembagian Tugas Mengajar.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class selector */}
          {availableClasses.length > 1 && (
            <select
              id="select-homeroom-class-schedule"
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838] text-xs font-semibold rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Toggle View: Matriks vs Cetak */}
          <button
            type="button"
            id="btn-toggle-view-schedule"
            onClick={() => setActiveView(activeView === 'matrix' ? 'print' : 'matrix')}
            className="px-3.5 py-2 bg-white dark:bg-[#0c0e15] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#232838] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {activeView === 'matrix' ? (
              <>
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Format Cetak Resmi</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Kembali ke Matriks</span>
              </>
            )}
          </button>

          {/* Excel Export */}
          <button
            type="button"
            id="btn-export-schedule-excel"
            onClick={handleExportExcel}
            disabled={totalScheduledItems === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Shortcut to Plotting Master if user has access */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('master-teaching')}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Atur hari & jam mengajar di menu Plotting Mengajar"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Atur di Plotting</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards & Informativeness Notice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Mapel di Kelas Ini */}
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Mapel Diplot
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {classAssignments.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Mata Pelajaran</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Penugasan mengajar di Kelas {currentClass?.name || '-'}
          </p>
        </div>

        {/* Mapel Terjadwal */}
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Sesi KBM Terjadwal
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalScheduledItems}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Jam / Sesi</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {scheduledFromPlotting.length} dari plotting master
          </p>
        </div>

        {/* Status Belum Terjadwal */}
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Belum Diatur Jadwalnya
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold ${unscheduledFromPlotting.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {unscheduledFromPlotting.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Mapel</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {unscheduledFromPlotting.length === 0 ? 'Semua mapel telah terjadwal' : 'Hari & jam belum diisi di plotting'}
          </p>
        </div>

        {/* Wali Kelas & Info Kelas */}
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Wali Kelas Rombel
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentClass?.classTeacherName || user?.displayName || '-'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            {currentClass ? `Rombel: ${currentClass.name} • Tingkat ${currentClass.gradeLevel || '-'}` : '-'}
          </p>
        </div>
      </div>

      {/* Notice jika ada mapel yang belum diatur jadwalnya di plotting */}
      {unscheduledFromPlotting.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">Informasi: Terdapat {unscheduledFromPlotting.length} mapel yang belum memiliki jadwal (hari/jam) di Master Plotting:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {unscheduledFromPlotting.map(ta => (
                  <span key={ta.id} className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 text-[11px] font-semibold">
                    {ta.subjectName} ({ta.teacherName || 'Guru belum diisi'})
                  </span>
                ))}
              </div>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('master-teaching')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-2xs transition-colors cursor-pointer"
            >
              Lengkapi di Plotting
            </button>
          )}
        </div>
      )}

      {/* Main View: Matrix Grid vs Official Print Document */}
      {activeView === 'print' ? (
        <PrintDocumentLayout
          title={`JADWAL PELAJARAN KELAS ${currentClass?.name ? currentClass.name.toUpperCase() : ''}`}
          documentSubtitle={`TAHUN PELAJARAN ${activeAcademicYear?.label || ''} • SEMESTER ${activeSemester || ''}`}
          signatureType="HOMEROOM_AND_HEADMASTER"
          paperOrientation="LANDSCAPE"
          metaItems={[
            { label: 'Kelas / Rombel', value: currentClass?.name || '-' },
            { label: 'Wali Kelas', value: currentClass?.classTeacherName || user?.displayName || '-' },
            { label: 'Tahun Pelajaran', value: activeAcademicYear?.label || '-' },
            { label: 'Semester', value: activeSemester || '-' },
          ]}
          onExportExcel={handleExportExcel}
        >
          {/* Printable 6-Day Schedule Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-2 text-slate-950">
            {DAYS_OF_WEEK.map(d => {
              const dayItems = allItemsByDay[d.key];
              return (
                <div key={d.key} className="border-2 border-slate-900 rounded-none bg-white p-0 overflow-hidden">
                  <div className="bg-slate-200 border-b-2 border-slate-900 py-1.5 px-3 font-bold text-xs uppercase tracking-wider text-center">
                    {d.label}
                  </div>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                        <th className="border-r border-slate-900 px-1.5 py-1 text-center w-8">NO</th>
                        <th className="border-r border-slate-900 px-1.5 py-1 text-center w-24">WAKTU</th>
                        <th className="border-r border-slate-900 px-2 py-1 text-left">MAPEL</th>
                        <th className="px-2 py-1 text-left">GURU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-center text-[10px] text-slate-400 italic">
                            Tidak ada kegiatan KBM
                          </td>
                        </tr>
                      ) : (
                        dayItems.map(item => (
                          <tr key={item.id} className="border-b border-slate-300 last:border-b-0 hover:bg-slate-50">
                            <td className="border-r border-slate-900 px-1.5 py-1 text-center font-mono font-bold">
                              {item.period}
                            </td>
                            <td className="border-r border-slate-900 px-1.5 py-1 text-center font-mono text-[10px]">
                              {item.timeSlot || '-'}
                            </td>
                            <td className="border-r border-slate-900 px-2 py-1 font-semibold leading-tight">
                              {item.subjectName}
                              {item.roomOrNotes && (
                                <span className="block text-[9px] font-normal text-slate-600 italic">
                                  ({item.roomOrNotes})
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-[10px] leading-tight text-slate-800">
                              {item.teacherName || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </PrintDocumentLayout>
      ) : (
        /* Matrix Grid View: Monday to Saturday */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DAYS_OF_WEEK.map(d => {
            const dayItems = allItemsByDay[d.key];
            const hasItems = dayItems.length > 0;

            return (
              <div 
                key={d.key} 
                className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Day Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#0c0e15] border-b border-slate-200 dark:border-[#232838] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      {d.label}
                    </h2>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 font-mono">
                      ({dayItems.length} jam)
                    </span>
                  </div>

                  {/* Add ad-hoc custom school activity button */}
                  <button
                    type="button"
                    onClick={() => handleOpenAddCustom(d.key)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#1b1f2e] text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Tambah kegiatan rutin/khusus hari ${d.label} (Upacara, Literasi, dll)`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Khusus</span>
                  </button>
                </div>

                {/* Day Schedule List */}
                <div className="flex-1 p-3 overflow-x-auto">
                  {!hasItems ? (
                    <div className="py-8 text-center">
                      <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Belum ada KBM terjadwal
                      </p>
                      {onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('master-teaching')}
                          className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" /> Atur jadwal di Plotting
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenAddCustom(d.key)}
                          className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Tambah kegiatan khusus
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayItems.map(item => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-slate-100 dark:border-[#1d2232] bg-slate-50/70 dark:bg-[#0c0e15]/60 hover:bg-slate-50 dark:hover:bg-[#141722] transition-colors flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Period badge */}
                            <div className="shrink-0 text-center w-8 py-1 rounded-lg bg-white dark:bg-[#1b1f2e] border border-slate-200 dark:border-[#232838] shadow-2xs">
                              <span className="block text-[9px] text-slate-400 uppercase leading-none font-semibold">JAM</span>
                              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                                #{item.period}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {item.subjectName}
                                </h3>
                                {item.timeSlot && (
                                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-[#181c2a] border border-slate-200 dark:border-[#232838] px-1.5 py-0.2 rounded font-medium">
                                    {item.timeSlot}
                                  </span>
                                )}
                                {item.isFromPlotting ? (
                                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded">
                                    Plotting
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-1.5 py-0.2 rounded">
                                    Khusus
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                <User className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{item.teacherName || '-'}</span>
                              </div>

                              {item.roomOrNotes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5 truncate">
                                  {item.roomOrNotes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action button if custom item */}
                          {!item.isFromPlotting && (
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCustom(item)}
                                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-[#1b1f2e] transition-colors cursor-pointer"
                                title="Edit kegiatan"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomItem(item.id)}
                                className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="Hapus kegiatan khusus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Custom School Activity (e.g. Upacara, Literasi, Wali Kelas) */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Kegiatan Khusus' : `Tambah Kegiatan Khusus Kelas • ${formDay}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCustomItem} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-blue-800 dark:text-blue-200 text-xs">
              Form ini untuk kegiatan khusus non-mapel (seperti Upacara Bendera, Pembinaan Wali Kelas, Sholat Dhuha, atau Literasi). Jadwal mata pelajaran KBM utama otomatis diambil dari Master Plotting Guru & Mapel.
            </div>

            {/* Day and Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hari:
                </label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value as ClassScheduleDay)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jam Ke-:
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Time slot */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alokasi Waktu (Jam):
              </label>
              <input
                type="text"
                list="time-slot-presets"
                value={formTimeSlot}
                onChange={(e) => setFormTimeSlot(e.target.value)}
                placeholder="e.g. 07.00 - 07.45"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-mono"
              />
              <datalist id="time-slot-presets">
                {DEFAULT_TIME_SLOTS.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

            {/* Activity Name */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kegiatan:
              </label>
              <input
                type="text"
                value={formSubjectName}
                onChange={(e) => setFormSubjectName(e.target.value)}
                placeholder="e.g. Upacara Bendera, Pembinaan Wali Kelas, Literasi Pagi..."
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-bold"
                required
              />
            </div>

            {/* Responsible Person */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Penanggung Jawab / Pembina:
              </label>
              <input
                type="text"
                value={formTeacherName}
                onChange={(e) => setFormTeacherName(e.target.value)}
                placeholder="e.g. Wali Kelas / Petugas Piket"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-medium"
              />
            </div>

            {/* Room / Notes */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lokasi / Catatan (Opsional):
              </label>
              <input
                type="text"
                value={formRoomOrNotes}
                onChange={(e) => setFormRoomOrNotes(e.target.value)}
                placeholder="e.g. Lapangan Utama / Ruang Kelas"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#232838]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-[#232838] rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1b1f2e] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Tambahkan Kegiatan')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
