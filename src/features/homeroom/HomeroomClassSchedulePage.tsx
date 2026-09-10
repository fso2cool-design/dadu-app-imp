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
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Layers
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

export const HomeroomClassSchedulePage: React.FC = () => {
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

  const [schedule, setSchedule] = useState<ClassSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'matrix' | 'print'>('matrix');

  // Modal item state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClassScheduleItem | null>(null);
  const [formDay, setFormDay] = useState<ClassScheduleDay>('SENIN');
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formTimeSlot, setFormTimeSlot] = useState<string>('07.15 - 07.50');
  const [formSubjectName, setFormSubjectName] = useState<string>('');
  const [formTeacherName, setFormTeacherName] = useState<string>('');
  const [formRoomOrNotes, setFormRoomOrNotes] = useState<string>('');
  const [addDoublePeriod, setAddDoublePeriod] = useState<boolean>(false);

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

  // Load schedule from Firestore
  useEffect(() => {
    if (!user || !currentClass || !activeAcademicYear || !activeSemester) {
      setSchedule(null);
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
          setSchedule(data);
        }
      } catch (err) {
        console.error('Error loading class schedule:', err);
        toastError('Gagal memuat jadwal pelajaran kelas');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSchedule();
    return () => { isMounted = false; };
  }, [user, currentClass, activeAcademicYear, activeSemester]);

  // Distinct subjects and teachers suggestions for auto-complete
  const subjectSuggestions = useMemo(() => {
    const list = new Set<string>();
    subjects.forEach(s => list.add(s.name));
    teachingAssignments.forEach(ta => {
      if (ta.subjectName) list.add(ta.subjectName);
    });
    return Array.from(list);
  }, [subjects, teachingAssignments]);

  const teacherSuggestions = useMemo(() => {
    const list = new Set<string>();
    teachingAssignments.forEach(ta => {
      if (ta.teacherName) list.add(ta.teacherName);
    });
    return Array.from(list);
  }, [teachingAssignments]);

  // Group items by day and sort by period
  const scheduleByDay = useMemo(() => {
    const map: Record<ClassScheduleDay, ClassScheduleItem[]> = {
      SENIN: [],
      SELASA: [],
      RABU: [],
      KAMIS: [],
      JUMAT: [],
      SABTU: [],
    };

    if (schedule?.items) {
      schedule.items.forEach(item => {
        if (map[item.day]) {
          map[item.day].push(item);
        }
      });

      // Sort items by period ascending
      Object.keys(map).forEach(dayKey => {
        map[dayKey as ClassScheduleDay].sort((a, b) => a.period - b.period);
      });
    }

    return map;
  }, [schedule]);

  // Open modal to add new item for a specific day
  const handleOpenAdd = (day: ClassScheduleDay) => {
    setEditingItem(null);
    setFormDay(day);
    const dayItems = scheduleByDay[day] || [];
    const nextPeriod = dayItems.length > 0 ? Math.max(...dayItems.map(i => i.period)) + 1 : 1;
    setFormPeriod(nextPeriod);

    // Auto pick next time slot if in range
    const slotIdx = nextPeriod - 1;
    setFormTimeSlot(DEFAULT_TIME_SLOTS[slotIdx] || '07.15 - 07.50');
    setFormSubjectName('');
    setFormTeacherName('');
    setFormRoomOrNotes('');
    setAddDoublePeriod(false);
    setIsModalOpen(true);
  };

  // Open modal to edit existing item
  const handleOpenEdit = (item: ClassScheduleItem) => {
    setEditingItem(item);
    setFormDay(item.day);
    setFormPeriod(item.period);
    setFormTimeSlot(item.timeSlot || '07.15 - 07.50');
    setFormSubjectName(item.subjectName);
    setFormTeacherName(item.teacherName);
    setFormRoomOrNotes(item.roomOrNotes || '');
    setAddDoublePeriod(false);
    setIsModalOpen(true);
  };

  // Save item (add or update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentClass || !activeAcademicYear || !activeSemester) return;

    if (!formSubjectName.trim()) {
      toastWarning('Nama mata pelajaran wajib diisi');
      return;
    }

    setSaving(true);
    try {
      let currentItems = [...(schedule?.items || [])];

      if (editingItem) {
        // Update existing item
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
        // Create new item
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

        // If double period is checked, add consecutive period
        if (addDoublePeriod) {
          const nextPeriod = Number(formPeriod) + 1;
          const nextSlotIdx = nextPeriod - 1;
          const nextSlot = DEFAULT_TIME_SLOTS[nextSlotIdx] || '';
          const doubleItem: ClassScheduleItem = {
            id: `item_${Date.now() + 1}_${Math.random().toString(36).substr(2, 5)}`,
            day: formDay,
            period: nextPeriod,
            timeSlot: nextSlot,
            subjectName: formSubjectName.trim(),
            teacherName: formTeacherName.trim(),
            roomOrNotes: formRoomOrNotes.trim() || undefined,
          };
          currentItems.push(doubleItem);
        }
      }

      // Persist to Firestore
      const updatedSchedule = await saveClassSchedule(user.uid, {
        classId: currentClass.id,
        className: currentClass.name,
        academicYearId: activeAcademicYear.id,
        academicYearLabel: activeAcademicYear.label,
        semester: activeSemester as SemesterType,
        items: currentItems,
      });

      setSchedule(updatedSchedule);
      setIsModalOpen(false);
      toastSuccess(editingItem ? 'Jam pelajaran diperbarui' : 'Jam pelajaran berhasil ditambahkan');
    } catch (err) {
      console.error('Error saving class schedule item:', err);
      toastError('Gagal menyimpan jadwal');
    } finally {
      setSaving(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    if (!user || !currentClass || !activeAcademicYear || !activeSemester || !schedule) return;
    if (!window.confirm('Hapus baris jadwal pelajaran ini?')) return;

    try {
      const updatedItems = schedule.items.filter(i => i.id !== itemId);
      const updated = await saveClassSchedule(user.uid, {
        ...schedule,
        items: updatedItems,
      });
      setSchedule(updated);
      toastSuccess('Baris jadwal dihapus');
    } catch (err) {
      console.error('Error deleting schedule item:', err);
      toastError('Gagal menghapus jadwal');
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!currentClass || !schedule) return;

    const rows: any[] = [];
    DAYS_OF_WEEK.forEach(d => {
      const items = scheduleByDay[d.key];
      if (items.length > 0) {
        items.forEach(i => {
          rows.push({
            'Hari': d.label.toUpperCase(),
            'Jam Ke': i.period,
            'Waktu': i.timeSlot || '-',
            'Mata Pelajaran': i.subjectName,
            'Guru Pengampu': i.teacherName || '-',
            'Ruang / Catatan': i.roomOrNotes || '-',
          });
        });
      } else {
        rows.push({
          'Hari': d.label.toUpperCase(),
          'Jam Ke': '-',
          'Waktu': '-',
          'Mata Pelajaran': '(Tidak ada jadwal KBM)',
          'Guru Pengampu': '-',
          'Ruang / Catatan': '-',
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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 dark:bg-cyan-950/40 text-orange-700 dark:text-cyan-300 border border-orange-200 dark:border-cyan-800">
              Jadwal Pelajaran Kelas Binaan
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              T.A {activeAcademicYear?.label} • Semester {activeSemester}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {currentClass ? `Roster Pelajaran Kelas ${currentClass.name}` : 'Jadwal Pelajaran Kelas Binaan'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pemetaan mata pelajaran dan guru pengampu mingguan untuk kendali KBM wali kelas
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Class selector if multiple */}
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

          <button
            type="button"
            id="btn-toggle-view-schedule"
            onClick={() => setActiveView(activeView === 'matrix' ? 'print' : 'matrix')}
            className="px-3.5 py-2 bg-white dark:bg-[#0c0e15] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#232838] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {activeView === 'matrix' ? (
              <>
                <Printer className="w-3.5 h-3.5 text-orange-600 dark:text-cyan-400" />
                <span>Format Cetak Resmi</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-orange-600 dark:text-cyan-400" />
                <span>Kembali ke Matriks</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-export-schedule-excel"
            onClick={handleExportExcel}
            disabled={!schedule || schedule.items.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main View: Matrix Grid vs Official Print Document */}
      {activeView === 'print' ? (
        <PrintDocumentLayout
          title={`JADWAL PELAJARAN KELAS ${currentClass?.name ? currentClass.name.toUpperCase() : ''}`}
          documentSubtitle={`TAHUN PELAJARAN ${activeAcademicYear?.label || ''}`}
          signatureType="HOMEROOM_AND_HEADMASTER"
          paperOrientation="LANDSCAPE"
          metaItems={[
            { label: 'Kelas', value: currentClass?.name || '-' },
            { label: 'Tahun Pelajaran', value: activeAcademicYear?.label || '-' },
            { label: 'Semester', value: activeSemester || '-' },
            { label: 'Kurikulum', value: 'Kurikulum Merdeka / Nasional' },
          ]}
          onExportExcel={handleExportExcel}
        >
          {/* Printable 6-Day Schedule Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-2 text-slate-950">
            {DAYS_OF_WEEK.map(d => {
              const dayItems = scheduleByDay[d.key];
              return (
                <div key={d.key} className="border-2 border-slate-900 rounded-none bg-white p-0 overflow-hidden">
                  <div className="bg-slate-200 border-b-2 border-slate-900 py-1.5 px-3 font-bold text-xs uppercase tracking-wider text-center">
                    {d.label}
                  </div>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                        <th className="border-r border-slate-900 px-1.5 py-1 text-center w-8">NO</th>
                        <th className="border-r border-slate-900 px-1.5 py-1 text-center w-20">WAKTU</th>
                        <th className="border-r border-slate-900 px-2 py-1 text-left">MAPEL</th>
                        <th className="px-2 py-1 text-left">GURU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-center text-[10px] text-slate-400 italic">
                            Tidak ada jadwal pelajaran
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
        /* Matrix Grid (Interactive Work View) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DAYS_OF_WEEK.map(d => {
            const dayItems = scheduleByDay[d.key];
            const hasItems = dayItems.length > 0;

            return (
              <div 
                key={d.key} 
                className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Day Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#0c0e15] border-b border-slate-200 dark:border-[#232838] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 dark:bg-cyan-400" />
                    <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      {d.label}
                    </h2>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 font-mono">
                      ({dayItems.length} jam)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenAdd(d.key)}
                    className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 text-orange-600 dark:text-cyan-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Tambah jam pelajaran hari ${d.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Tambah</span>
                  </button>
                </div>

                {/* Day Schedule Table */}
                <div className="flex-1 p-3 overflow-x-auto">
                  {!hasItems ? (
                    <div className="py-8 text-center">
                      <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60" />
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Belum ada jadwal KBM
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(d.key)}
                        className="mt-2 text-xs font-semibold text-orange-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah jam ke-1
                      </button>
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
                              <span className="block text-[10px] text-slate-400 uppercase leading-none">JAM</span>
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
                                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-[#181c2a] border border-slate-200 dark:border-[#232838] px-1.5 py-0.2 rounded">
                                    {item.timeSlot}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                <User className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{item.teacherName || 'Guru belum ditentukan'}</span>
                              </div>

                              {item.roomOrNotes && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5 truncate">
                                  {item.roomOrNotes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-[#1b1f2e] transition-colors cursor-pointer"
                              title="Edit jam pelajaran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Modal Add / Edit Schedule Item */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Jam Pelajaran' : `Tambah Jam Pelajaran • ${formDay}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
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
                  Jam Pelajaran Ke-:
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
                Alokasi Waktu (Jam Ke):
              </label>
              <input
                type="text"
                list="time-slot-presets"
                value={formTimeSlot}
                onChange={(e) => setFormTimeSlot(e.target.value)}
                placeholder="e.g. 07.15 - 07.50"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-mono"
              />
              <datalist id="time-slot-presets">
                {DEFAULT_TIME_SLOTS.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

            {/* Subject Name with suggestion datalist */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mata Pelajaran:
              </label>
              <input
                type="text"
                list="subject-presets"
                value={formSubjectName}
                onChange={(e) => setFormSubjectName(e.target.value)}
                placeholder="e.g. Bahasa Arab, Biologi, Matematika..."
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-bold"
                required
              />
              <datalist id="subject-presets">
                {subjectSuggestions.map((sub, idx) => (
                  <option key={idx} value={sub} />
                ))}
              </datalist>
            </div>

            {/* Teacher Name with suggestion datalist */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Guru Pengampu:
              </label>
              <input
                type="text"
                list="teacher-presets"
                value={formTeacherName}
                onChange={(e) => setFormTeacherName(e.target.value)}
                placeholder="e.g. MACHFUD AFFANDI, S.Pd.I"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200 font-medium"
              />
              <datalist id="teacher-presets">
                {teacherSuggestions.map((tea, idx) => (
                  <option key={idx} value={tea} />
                ))}
              </datalist>
            </div>

            {/* Room / Notes */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ruang / Catatan Tambahan (Opsional):
              </label>
              <input
                type="text"
                value={formRoomOrNotes}
                onChange={(e) => setFormRoomOrNotes(e.target.value)}
                placeholder="e.g. Lab Komputer / Ruang Multimedia"
                className="w-full p-2.5 bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-[#232838] rounded-xl text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Consecutive double period option if adding new */}
            {!editingItem && (
              <div className="p-3 bg-orange-50 dark:bg-cyan-950/30 border border-orange-200 dark:border-cyan-800/40 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-double-period"
                  checked={addDoublePeriod}
                  onChange={(e) => setAddDoublePeriod(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="chk-double-period" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  Tambahkan 2 Jam Berturut-turut Sekaligus (Jam #{formPeriod} & #{Number(formPeriod) + 1})
                </label>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-[#232838]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-[#232838] rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1b1f2e]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white dark:text-slate-950 rounded-xl font-semibold shadow-xs disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Tambahkan Jam')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
