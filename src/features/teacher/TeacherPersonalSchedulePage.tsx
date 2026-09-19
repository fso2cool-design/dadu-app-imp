import React, { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PrintDocumentLayout } from '../reports/PrintDocumentLayout';
import { TeachingAssignment } from '../../types';
import * as XLSX from 'xlsx';
import { 
  Calendar, 
  Clock, 
  Printer, 
  Download, 
  Layers, 
  BookOpen, 
  MapPin, 
  CalendarDays,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  CalendarCheck2
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'SENIN', label: 'Senin' },
  { key: 'SELASA', label: 'Selasa' },
  { key: 'RABU', label: 'Rabu' },
  { key: 'KAMIS', label: 'Kamis' },
  { key: 'JUMAT', label: 'Jumat' },
  { key: 'SABTU', label: 'Sabtu' },
];

export interface TeacherScheduleSlot {
  id: string;
  assignmentId: string;
  day: string;
  timeSlot: string;
  subjectName: string;
  subjectCode?: string;
  className: string;
  classId: string;
  room?: string;
}

interface TeacherPersonalSchedulePageProps {
  onNavigate?: (route: string, state?: any) => void;
}

export const TeacherPersonalSchedulePage: React.FC<TeacherPersonalSchedulePageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const { 
    teachingAssignments, 
    activeAcademicYear, 
    activeSemester 
  } = useWorkspace();

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Helper normalisasi nama hari
  const normalizeDay = (raw: string | undefined): string => {
    if (!raw) return '';
    const clean = raw.trim().toUpperCase();
    if (clean.includes('SENIN') || clean === 'MON') return 'SENIN';
    if (clean.includes('SELASA') || clean === 'TUE') return 'SELASA';
    if (clean.includes('RABU') || clean === 'WED') return 'RABU';
    if (clean.includes('KAMIS') || clean === 'THU') return 'KAMIS';
    if (clean.includes('JUMAT') || clean === 'FRI') return 'JUMAT';
    if (clean.includes('SABTU') || clean === 'SAT') return 'SABTU';
    return clean;
  };

  // Kumpulkan semua jadwal mengajar guru aktif untuk semester ini
  const { scheduledSlots, unscheduledAssignments } = useMemo(() => {
    const slots: TeacherScheduleSlot[] = [];
    const unscheduled: TeachingAssignment[] = [];

    // Filter assignments yang aktif dan milik semester berjalan
    const activeAssignments = teachingAssignments.filter(ta => 
      !ta.isArchived && 
      ta.isActive !== false &&
      ta.academicYearId === activeAcademicYear?.id &&
      ta.semester === activeSemester
    );

    activeAssignments.forEach(ta => {
      let hasSchedule = false;

      // Cek array schedules jika ada
      if (Array.isArray(ta.schedules) && ta.schedules.length > 0) {
        ta.schedules.forEach((sch, idx) => {
          const dayKey = normalizeDay(sch.day);
          if (dayKey) {
            hasSchedule = true;
            slots.push({
              id: `${ta.id}_${idx}`,
              assignmentId: ta.id,
              day: dayKey,
              timeSlot: sch.timeSlot || ta.timeSlot || 'Jam KBM',
              subjectName: ta.subjectName || 'Mata Pelajaran',
              subjectCode: ta.subjectCode,
              className: ta.className || 'Kelas',
              classId: ta.classId,
              room: sch.room || ta.room,
            });
          }
        });
      }

      // Cek dayOfWeek tunggal
      if (ta.dayOfWeek) {
        const dayKey = normalizeDay(ta.dayOfWeek);
        if (dayKey && !slots.some(s => s.assignmentId === ta.id && s.day === dayKey)) {
          hasSchedule = true;
          slots.push({
            id: `${ta.id}_single`,
            assignmentId: ta.id,
            day: dayKey,
            timeSlot: ta.timeSlot || 'Jam KBM',
            subjectName: ta.subjectName || 'Mata Pelajaran',
            subjectCode: ta.subjectCode,
            className: ta.className || 'Kelas',
            classId: ta.classId,
            room: ta.room,
          });
        }
      }

      if (!hasSchedule) {
        unscheduled.push(ta);
      }
    });

    // Urutkan jadwal per hari berdasarkan timeSlot
    slots.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot, undefined, { numeric: true }));

    return { scheduledSlots: slots, unscheduledAssignments: unscheduled };
  }, [teachingAssignments, activeAcademicYear, activeSemester]);

  // Kelompokkan jadwal berdasarkan hari
  const scheduleByDay = useMemo(() => {
    const map: Record<string, TeacherScheduleSlot[]> = {
      SENIN: [],
      SELASA: [],
      RABU: [],
      KAMIS: [],
      JUMAT: [],
      SABTU: [],
    };

    scheduledSlots.forEach(slot => {
      if (map[slot.day]) {
        map[slot.day].push(slot);
      }
    });

    return map;
  }, [scheduledSlots]);

  // Ekspor Excel
  const handleExportExcel = () => {
    const dataRows: any[] = [];

    DAYS_OF_WEEK.forEach(day => {
      const daySlots = scheduleByDay[day.key] || [];
      if (daySlots.length > 0) {
        daySlots.forEach(slot => {
          dataRows.push({
            'Hari': day.label,
            'Waktu / Jam Ke': slot.timeSlot,
            'Mata Pelajaran': slot.subjectName,
            'Kode Mapel': slot.subjectCode || '-',
            'Kelas / Rombel': `Kelas ${slot.className}`,
            'Ruangan': slot.room || '-',
            'Nama Guru': profile?.displayName || user?.displayName || 'Guru Pengampu',
          });
        });
      }
    });

    if (dataRows.length === 0) {
      alert('Belum ada jadwal mengajar yang dapat diekspor.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Mengajar');
    const filename = `Jadwal_Mengajar_${(profile?.displayName || 'Guru').replace(/\s+/g, '_')}_${activeAcademicYear?.label.replace('/', '-')}_${activeSemester}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const currentTeacherName = profile?.displayName || user?.displayName || 'Guru Pengampu';
  const totalTeachingHours = scheduledSlots.length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#141722] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 dark:bg-cyan-950/70 text-orange-600 dark:text-cyan-400 border border-orange-200/50 dark:border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider">
              Tahun {activeAcademicYear?.label || '-'} • Semester {activeSemester}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1.5 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-orange-500 dark:text-cyan-400" />
            <span>Jadwal Mengajar Saya</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Matriks jadwal KBM terpadu untuk semua rombel kelas yang Anda ampu pada semester aktif
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            disabled={scheduledSlots.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Cetak Jadwal</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={scheduledSlots.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 dark:bg-cyan-500/10 border border-orange-500/20 dark:border-cyan-500/20 flex items-center justify-center text-orange-500 dark:text-cyan-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Total Sesi Terjadwal</span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">{totalTeachingHours} Sesi / Pekan</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Rombel Kelas Diampu</span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">
              {new Set(scheduledSlots.map(s => s.classId)).size} Kelas
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Mata Pelajaran</span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">
              {new Set(scheduledSlots.map(s => s.subjectName)).size} Mapel
            </span>
          </div>
        </div>
      </div>

      {/* Filter Hari */}
      <div className="bg-white dark:bg-[#141722] p-2 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setSelectedDayFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedDayFilter === 'ALL'
              ? 'bg-orange-500 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b1f2e]'
          }`}
        >
          Semua Hari ({scheduledSlots.length})
        </button>

        {DAYS_OF_WEEK.map(day => {
          const count = scheduleByDay[day.key]?.length || 0;
          const isActive = selectedDayFilter === day.key;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => setSelectedDayFilter(day.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-orange-500 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b1f2e]'
              }`}
            >
              <span>{day.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive 
                  ? 'bg-white/20 text-white dark:text-slate-950 font-black'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid Tampilan Jadwal Mingguan */}
      {scheduledSlots.length === 0 ? (
        <div className="bg-white dark:bg-[#141722] p-12 text-center rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Jadwal Pelajaran Ditetapkan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Plotting mata pelajaran dan rombel kelas Anda belum memiliki informasi hari dan jam mengajar. Anda dapat melengkapinya di menu Plotting Pengajaran.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('master-teaching')}
              className="px-4 py-2 rounded-xl bg-orange-500 dark:bg-cyan-500 text-white dark:text-slate-950 text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
            >
              Atur Jadwal di Master Plotting
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DAYS_OF_WEEK.filter(d => selectedDayFilter === 'ALL' || selectedDayFilter === d.key).map(day => {
            const daySlots = scheduleByDay[day.key] || [];

            return (
              <div 
                key={day.key}
                className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden flex flex-col"
              >
                {/* Header Hari */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#0c0e15] border-b border-slate-200 dark:border-[#232838] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 dark:bg-cyan-400" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      {day.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {daySlots.length} Sesi
                  </span>
                </div>

                {/* List Slot Pembelajaran */}
                <div className="p-3.5 space-y-2.5 flex-1">
                  {daySlots.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada jadwal mengajar pada hari {day.label}.
                    </div>
                  ) : (
                    daySlots.map(slot => (
                      <div 
                        key={slot.id}
                        className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-[#232838] hover:border-orange-500/40 dark:hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-cyan-400 font-mono bg-orange-500/10 dark:bg-cyan-500/10 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            {slot.timeSlot}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Kelas {slot.className}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {slot.subjectName}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                          <span className="flex items-center gap-1 font-mono">
                            {slot.subjectCode ? `[${slot.subjectCode}]` : ''}
                          </span>
                          {slot.room ? (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {slot.room}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">R. Kelas</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rombel Belum Terjadwal (Notice jika ada) */}
      {unscheduledAssignments.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">
              Terdapat {unscheduledAssignments.length} Rombel Ampuan Belum Memiliki Jadwal Hari & Jam:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {unscheduledAssignments.map(u => (
                <span 
                  key={u.id}
                  className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[11px] font-medium"
                >
                  {u.subjectName} - Kelas {u.className}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL LAYOUT */}
      {isPrintModalOpen && (
        <PrintDocumentLayout
          title="JADWAL MENGAJAR GURU"
          subtitle={`Tahun Ajaran ${activeAcademicYear?.label || ''} • Semester ${activeSemester}`}
          onClose={() => setIsPrintModalOpen(false)}
        >
          <div className="space-y-6 text-slate-900 text-xs">
            {/* Identitas Guru */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-300">
              <div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="w-28 py-0.5 font-semibold text-slate-600">Nama Guru</td>
                      <td className="w-4">:</td>
                      <td className="font-bold text-slate-900">{currentTeacherName}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">NIP / NUPTK</td>
                      <td>:</td>
                      <td className="font-mono">{profile?.nip || profile?.nuptk || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">Mata Pelajaran</td>
                      <td>:</td>
                      <td>{profile?.mainSubject || 'Guru Mata Pelajaran'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <table className="w-full text-xs">
                  <tbody>
                    <tr>
                      <td className="w-28 py-0.5 font-semibold text-slate-600">Tahun Ajaran</td>
                      <td className="w-4">:</td>
                      <td className="font-bold">{activeAcademicYear?.label}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">Semester</td>
                      <td>:</td>
                      <td>{activeSemester}</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-slate-600">Beban Mengajar</td>
                      <td>:</td>
                      <td className="font-bold">{scheduledSlots.length} Sesi Pertemuan / Pekan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matriks Tabel Jadwal */}
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="border border-slate-400 py-2 px-3 text-center w-12">No</th>
                  <th className="border border-slate-400 py-2 px-3 text-left w-24">Hari</th>
                  <th className="border border-slate-400 py-2 px-3 text-center w-28">Waktu / Jam</th>
                  <th className="border border-slate-400 py-2 px-3 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-400 py-2 px-3 text-center w-24">Kelas</th>
                  <th className="border border-slate-400 py-2 px-3 text-center w-24">Ruang</th>
                </tr>
              </thead>
              <tbody>
                {scheduledSlots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-slate-400 py-6 text-center text-slate-500">
                      Belum ada jadwal mengajar pada semester ini.
                    </td>
                  </tr>
                ) : (
                  scheduledSlots.map((slot, idx) => (
                    <tr key={slot.id} className="hover:bg-slate-50">
                      <td className="border border-slate-400 py-1.5 px-3 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 py-1.5 px-3 font-semibold">{slot.day}</td>
                      <td className="border border-slate-400 py-1.5 px-3 text-center font-mono">{slot.timeSlot}</td>
                      <td className="border border-slate-400 py-1.5 px-3 font-medium">
                        {slot.subjectName}
                        {slot.subjectCode && <span className="text-slate-500 ml-1">({slot.subjectCode})</span>}
                      </td>
                      <td className="border border-slate-400 py-1.5 px-3 text-center font-bold">
                        Kelas {slot.className}
                      </td>
                      <td className="border border-slate-400 py-1.5 px-3 text-center text-slate-600">
                        {slot.room || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PrintDocumentLayout>
      )}
    </div>
  );
};
