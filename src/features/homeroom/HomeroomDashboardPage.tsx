import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, DailyAttendanceRecord, StudentNote, ClassItem } from '../../types';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { getDailyAttendanceRecords, getAllDailyAttendanceRecordsForClass } from '../../services/firestore/homeroomAttendance';
import { getStudentNotesByClass } from '../../services/firestore/studentNotes';
import { GenderBadge } from '../../components/common/GenderIcon';
import { 
  Users, 
  UserCheck, 
  CalendarDays, 
  CalendarRange, 
  StickyNote, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  FileSpreadsheet, 
  Search,
  Award,
  ShieldAlert,
  Clock,
  ChevronRight,
  Filter,
  UserX,
  Layers
} from 'lucide-react';

interface HomeroomDashboardPageProps {
  onNavigate: (route: string, state?: any) => void;
}

export const HomeroomDashboardPage: React.FC<HomeroomDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId 
  } = useWorkspace();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [todayRecords, setTodayRecords] = useState<DailyAttendanceRecord[]>([]);
  const [allClassAttendance, setAllClassAttendance] = useState<DailyAttendanceRecord[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter classes available in active academic year
  const availableClasses = useMemo(() => {
    if (!activeAcademicYear) return classes;
    return classes.filter(c => c.academicYearId === activeAcademicYear.id && c.isActive);
  }, [classes, activeAcademicYear]);

  // Current selected class object
  const currentClass = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'NONE') return null;
    return availableClasses.find(c => c.id === selectedClassId) || null;
  }, [availableClasses, selectedClassId]);

  useEffect(() => {
    if (selectedClassId === 'NONE') return;
    if (!selectedClassId && availableClasses.length > 0) {
      const homeroomClass = availableClasses.find(c => c.classTeacherId === user?.uid);
      if (homeroomClass) {
        setSelectedClassId(homeroomClass.id);
      }
    }
  }, [availableClasses, selectedClassId, setSelectedClassId, user?.uid]);

  // Load data for the selected class
  useEffect(() => {
    if (!user || !activeAcademicYear || !currentClass) {
      setEnrollments([]);
      setTodayRecords([]);
      setAllClassAttendance([]);
      setStudentNotes([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadHomeroomData() {
      setLoading(true);
      try {
        const [enrs, todayRecs, allRecs, notes] = await Promise.all([
          getEnrollmentsByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
          getDailyAttendanceRecords(user!.uid, activeAcademicYear!.id, currentClass!.id, todayStr),
          getAllDailyAttendanceRecordsForClass(user!.uid, currentClass!.id),
          getStudentNotesByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
        ]);

        if (isMounted) {
          setEnrollments(enrs.filter(e => e.status === 'ACTIVE'));
          setTodayRecords(todayRecs);
          setAllClassAttendance(allRecs);
          setStudentNotes(notes);
        }
      } catch (err) {
        console.error('Error loading homeroom dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHomeroomData();
    return () => { isMounted = false; };
  }, [user, activeAcademicYear, currentClass, todayStr]);

  // Calculations
  const totalStudents = enrollments.length;
  const boysCount = enrollments.filter(e => e.student?.gender === 'L').length;
  const girlsCount = enrollments.filter(e => e.student?.gender === 'P').length;

  // Today attendance stats
  const todayStats = useMemo(() => {
    const present = todayRecords.filter(r => r.status === 'PRESENT').length;
    const sick = todayRecords.filter(r => r.status === 'SICK').length;
    const permitted = todayRecords.filter(r => r.status === 'PERMITTED').length;
    const absent = todayRecords.filter(r => r.status === 'ABSENT').length;
    const dispensation = todayRecords.filter(r => r.status === 'DISPENSATION').length;
    const isRecorded = todayRecords.length > 0;
    const rate = totalStudents > 0 && isRecorded 
      ? Math.round(((present + dispensation) / totalStudents) * 100) 
      : 0;

    return { present, sick, permitted, absent, dispensation, isRecorded, rate };
  }, [todayRecords, totalStudents]);

  // Overall student attendance matrix map
  const studentAttendanceStats = useMemo(() => {
    const map = new Map<string, { present: number; sick: number; permitted: number; absent: number; total: number; rate: number }>();
    
    enrollments.forEach(e => {
      map.set(e.studentId, { present: 0, sick: 0, permitted: 0, absent: 0, total: 0, rate: 100 });
    });

    allClassAttendance.forEach(rec => {
      const stats = map.get(rec.studentId);
      if (stats) {
        stats.total++;
        if (rec.status === 'PRESENT' || rec.status === 'DISPENSATION') stats.present++;
        else if (rec.status === 'SICK') stats.sick++;
        else if (rec.status === 'PERMITTED') stats.permitted++;
        else if (rec.status === 'ABSENT') stats.absent++;
      }
    });

    map.forEach((stats) => {
      if (stats.total > 0) {
        stats.rate = Math.round((stats.present / stats.total) * 100);
      }
    });

    return map;
  }, [enrollments, allClassAttendance]);

  // Watchlist students (≥2 Absent or Rate < 85% or has important notes)
  const watchlistStudents = useMemo(() => {
    const importantStudentIds = new Set(studentNotes.filter(n => n.isImportant).map(n => n.studentId));
    
    return enrollments.filter(e => {
      const stats = studentAttendanceStats.get(e.studentId);
      const hasHighAbsence = stats && (stats.absent >= 2 || (stats.total >= 5 && stats.rate < 85));
      const hasImportantNote = importantStudentIds.has(e.studentId);
      return hasHighAbsence || hasImportantNote;
    });
  }, [enrollments, studentAttendanceStats, studentNotes]);

  // Filtered roster
  const filteredEnrollments = useMemo(() => {
    if (!searchQuery) return enrollments;
    const q = searchQuery.toLowerCase();
    return enrollments.filter(e => 
      e.student?.fullName?.toLowerCase().includes(q) ||
      e.student?.nis?.toLowerCase().includes(q) ||
      e.rollNumber?.toString().includes(q)
    );
  }, [enrollments, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Class Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Wali Kelas
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              T.A {activeAcademicYear?.label || '-'} • Semester {activeSemester}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {currentClass ? `Dashboard Binaan Kelas ${currentClass.name}` : 'Dashboard Binaan Kelas'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoring kehadiran harian, data siswa, dan pembinaan karakter kelas binaan.
          </p>
        </div>

        {/* Class Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="homeroom-class-select" className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Pilih Kelas:
          </label>
          <select
            id="homeroom-class-select"
            value={currentClass?.id || 'NONE'}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedClassId(val === 'NONE' ? '' : val);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="NONE">-- Bukan Wali Kelas / Tidak Ada Binaan --</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                Kelas {c.name} {c.major ? `(${c.major})` : ''} - Tingkat {c.gradeLevel} {c.classTeacherId === user?.uid ? '⭐ (Binaan Saya)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!currentClass ? (
        <div className="bg-white dark:bg-[#141722] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-[#232838] text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
            <UserX className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Tidak Ada Kelas Binaan Terpilih
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
            Anda belum memilih kelas binaan atau akun Anda terdaftar sebagai Guru Mata Pelajaran (Bukan Wali Kelas).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Kembali ke Dashboard Guru
            </button>
            <button
              type="button"
              onClick={() => onNavigate('master-classes')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4" /> Atur Wali di Master Kelas
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Siswa */}
            <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Siswa Rombel</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalStudents}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Siswa Aktif</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <GenderBadge gender="L" count={boysCount} size="sm" />
                  <GenderBadge gender="P" count={girlsCount} size="sm" />
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Presensi Hari Ini */}
            <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Presensi Hari Ini</p>
                <div className="flex items-baseline gap-2 mt-1">
                  {todayStats.isRecorded ? (
                    <>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{todayStats.rate}%</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Kehadiran</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Belum Diinput</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {todayStats.isRecorded 
                    ? `H: ${todayStats.present} | S: ${todayStats.sick} | I: ${todayStats.permitted} | A: ${todayStats.absent}`
                    : 'Klik tombol untuk presensi'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                todayStats.isRecorded ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              }`}>
                <CalendarDays className="w-6 h-6" />
              </div>
            </div>

            {/* Perlu Perhatian / Watchlist */}
            <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perlu Perhatian</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-2xl font-bold ${watchlistStudents.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {watchlistStudents.length}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Siswa</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Alpa berulang / catatan khusus
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                watchlistStudents.length > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            {/* Catatan Pembinaan */}
            <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Catatan Pembinaan</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">{studentNotes.length}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Catatan</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {studentNotes.filter(n => n.isImportant).length} catatan penting / urgent
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <StickyNote className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Main Content: Watchlist & Roster Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Student Roster & Attendance Status */}
            <div className="lg:col-span-2 bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Daftar Kehadiran Siswa Kelas</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ringkasan presensi harian & kumulatif siswa</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari siswa atau NIS..."
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">NIS</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-2 text-center">L/P</th>
                      <th className="py-2.5 px-3 text-center">Hari Ini</th>
                      <th className="py-2.5 px-3 text-center">Hadir</th>
                      <th className="py-2.5 px-3 text-center">S/I/A</th>
                      <th className="py-2.5 px-3 text-center">% Hadir</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500">
                          {loading ? 'Memuat data siswa...' : 'Belum ada siswa terdaftar pada kelas ini.'}
                        </td>
                      </tr>
                    ) : (
                      filteredEnrollments.map((enr) => {
                        const todayRec = todayRecords.find(r => r.studentId === enr.studentId);
                        const stats = studentAttendanceStats.get(enr.studentId) || { present: 0, sick: 0, permitted: 0, absent: 0, total: 0, rate: 100 };

                        let todayBadge = <span className="text-[11px] text-slate-400 font-medium">-</span>;
                        if (todayRec) {
                          if (todayRec.status === 'PRESENT') {
                            todayBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">Hadir</span>;
                          } else if (todayRec.status === 'SICK') {
                            todayBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">Sakit</span>;
                          } else if (todayRec.status === 'PERMITTED') {
                            todayBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">Izin</span>;
                          } else if (todayRec.status === 'ABSENT') {
                            todayBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">Alpa</span>;
                          } else if (todayRec.status === 'DISPENSATION') {
                            todayBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">Dispen</span>;
                          }
                        }

                        return (
                          <tr key={enr.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-3 text-center font-medium text-slate-500 dark:text-slate-400">{enr.rollNumber}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{enr.student?.nis || '-'}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{enr.student?.fullName || '-'}</td>
                            <td className="py-2.5 px-2 text-center">
                              <GenderBadge gender={enr.student?.gender || 'L'} showLabel={false} size="sm" />
                            </td>
                            <td className="py-2.5 px-3 text-center">{todayBadge}</td>
                            <td className="py-2.5 px-3 text-center font-semibold text-emerald-700 dark:text-emerald-400">{stats.present}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                              <span className="text-amber-600 dark:text-amber-400">{stats.sick}</span>/
                              <span className="text-blue-600 dark:text-blue-400">{stats.permitted}</span>/
                              <span className="text-rose-600 dark:text-rose-400 font-bold">{stats.absent}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-bold ${
                                stats.rate < 80 ? 'text-rose-600 dark:text-rose-400' : stats.rate < 90 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {stats.total > 0 ? `${stats.rate}%` : '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => onNavigate('homeroom-notes', { classId: currentClass?.id, studentId: enr.studentId })}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Tambah/Lihat Catatan Siswa"
                              >
                                <StickyNote className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Recent Student Notes & Watchlist */}
            <div className="space-y-6">
              {/* Watchlist Panel */}
              <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Siswa Perlu Perhatian</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    {watchlistStudents.length} Siswa
                  </span>
                </div>

                {watchlistStudents.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Semua siswa dalam kondisi baik</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Tidak ada indikasi absensi berulang atau catatan urgent.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {watchlistStudents.slice(0, 5).map(e => {
                      const stats = studentAttendanceStats.get(e.studentId);
                      return (
                        <div key={e.id} className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">{e.student?.fullName}</h4>
                            <p className="text-[11px] text-rose-700 dark:text-rose-400">
                              {stats && stats.absent > 0 ? `Alpa: ${stats.absent} hari` : 'Catatan pembinaan aktif'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate('homeroom-notes', { classId: currentClass?.id, studentId: e.studentId })}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            Bina
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Notes Panel */}
              <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Catatan Siswa Terakhir</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('homeroom-notes', { classId: currentClass?.id })}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-cyan-400 hover:text-indigo-800 dark:hover:text-cyan-300 cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                {studentNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
                    Belum ada catatan pembinaan siswa dicatat.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {studentNotes.slice(0, 4).map(note => (
                      <div key={note.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{note.studentName || 'Siswa'}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{note.date}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">{note.note}</p>
                        {note.isImportant && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            Urgent
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Class Schedule Card */}
              <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-cyan-400" />
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Jadwal Pelajaran Kelas</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Kelola dan cetak matriks roster pelajaran mingguan kelas binaan (Senin - Sabtu).
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('homeroom-class-schedule')}
                  className="w-full py-2 px-3 rounded-xl bg-orange-50 dark:bg-cyan-950/40 hover:bg-orange-100 dark:hover:bg-cyan-900/60 text-orange-700 dark:text-cyan-300 border border-orange-200 dark:border-cyan-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Buka Roster & Cetak Jadwal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
