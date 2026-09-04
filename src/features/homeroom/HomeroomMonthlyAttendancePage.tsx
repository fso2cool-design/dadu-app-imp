import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, DailyAttendanceRecord } from '../../types';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { getMonthlyDailyAttendanceRecords } from '../../services/firestore/homeroomAttendance';
import { getSchoolSettings } from '../../services/firestore/settings';
import { 
  CalendarRange, 
  Calendar,
  Download, 
  FileSpreadsheet, 
  Filter, 
  Search, 
  Users, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Info,
  UserX
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GenderBadge } from '../../components/common/GenderIcon';
import { AttendanceHolidaysModal } from '../../components/common/AttendanceHolidaysModal';

export const HomeroomMonthlyAttendancePage: React.FC = () => {
  const { user, profile } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId,
    checkIsHoliday
  } = useWorkspace();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState<boolean>(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const availableClasses = useMemo(() => {
    if (!activeAcademicYear) return classes;
    return classes.filter(c => c.academicYearId === activeAcademicYear.id && c.isActive);
  }, [classes, activeAcademicYear]);

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

  // Days in month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Format month string e.g. "2026-08"
  const yearMonthPrefix = useMemo(() => {
    const mm = selectedMonth.toString().padStart(2, '0');
    return `${selectedYear}-${mm}`;
  }, [selectedYear, selectedMonth]);

  // Load roster & attendance records for this month
  useEffect(() => {
    if (!user || !activeAcademicYear || !currentClass) {
      setEnrollments([]);
      setRecords([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadMonthlyData() {
      setLoading(true);
      try {
        const [enrs, recs] = await Promise.all([
          getEnrollmentsByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
          getMonthlyDailyAttendanceRecords(user!.uid, currentClass!.id, yearMonthPrefix),
        ]);

        if (isMounted) {
          setEnrollments(enrs.filter(e => e.status === 'ACTIVE'));
          setRecords(recs);
        }
      } catch (err) {
        console.error('Error loading monthly attendance matrix:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMonthlyData();
    return () => { isMounted = false; };
  }, [user, activeAcademicYear, currentClass, yearMonthPrefix]);

  // Build matrix lookup: date -> studentId -> DailyAttendanceRecord
  const matrix = useMemo(() => {
    const map = new Map<string, Map<string, DailyAttendanceRecord>>();
    records.forEach(r => {
      if (!r.date) return;
      if (!map.has(r.date)) {
        map.set(r.date, new Map<string, DailyAttendanceRecord>());
      }
      map.get(r.date)!.set(r.studentId, r);
    });
    return map;
  }, [records]);

  // Distinct recorded dates count
  const recordedDatesCount = useMemo(() => {
    return matrix.size;
  }, [matrix]);

  // Student summary calculations
  const studentSummaries = useMemo(() => {
    const map = new Map<string, { present: number; sick: number; permitted: number; absent: number; dispensation: number; total: number; rate: number }>();

    enrollments.forEach(e => {
      let present = 0;
      let sick = 0;
      let permitted = 0;
      let absent = 0;
      let dispensation = 0;

      daysArray.forEach(day => {
        const dateStr = `${yearMonthPrefix}-${day.toString().padStart(2, '0')}`;
        const rec = matrix.get(dateStr)?.get(e.studentId);
        if (rec) {
          if (rec.status === 'PRESENT') present++;
          else if (rec.status === 'SICK') sick++;
          else if (rec.status === 'PERMITTED') permitted++;
          else if (rec.status === 'ABSENT') absent++;
          else if (rec.status === 'DISPENSATION') dispensation++;
        }
      });

      const totalRecorded = present + sick + permitted + absent + dispensation;
      const rate = totalRecorded > 0 ? Math.round(((present + dispensation) / totalRecorded) * 100) : 100;

      map.set(e.studentId, {
        present,
        sick,
        permitted,
        absent,
        dispensation,
        total: totalRecorded,
        rate,
      });
    });

    return map;
  }, [enrollments, daysArray, yearMonthPrefix, matrix]);

  // Overall class monthly attendance rate
  const classMonthlyRate = useMemo(() => {
    let totalPresent = 0;
    let totalRecorded = 0;

    studentSummaries.forEach(s => {
      totalPresent += (s.present + s.dispensation);
      totalRecorded += s.total;
    });

    return totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 0;
  }, [studentSummaries]);

  // Check if a day is Sunday (0) or Saturday (6)
  const getDayOfWeek = (day: number) => {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    return d.getDay(); // 0 is Sun, 6 is Sat
  };

  const filteredEnrollments = useMemo(() => {
    if (!searchQuery) return enrollments;
    const q = searchQuery.toLowerCase();
    return enrollments.filter(e => 
      e.student?.fullName?.toLowerCase().includes(q) ||
      e.student?.nis?.toLowerCase().includes(q) ||
      e.rollNumber?.toString().includes(q)
    );
  }, [enrollments, searchQuery]);

  // Export matrix to Excel
  const handleExportExcel = async () => {
    if (enrollments.length === 0) return;

    let schoolInfo: any = null;
    if (user) {
      try {
        schoolInfo = await getSchoolSettings(user.uid);
      } catch (e) {}
    }

    const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';
    const wsData: any[][] = [];

    // Title & Info
    wsData.push(['REKAPITULASI PRESENSI BULANAN WALI KELAS']);
    wsData.push([schoolInfo?.schoolName || 'MADRASAH / SEKOLAH']);
    wsData.push([`Kelas: ${currentClass?.name || ''}`, `Bulan: ${monthLabel} ${selectedYear}`, `Tahun Ajaran: ${activeAcademicYear?.label || ''} Sem ${activeSemester}`]);
    wsData.push([]); // blank line

    // Table Header
    const headerRow = ['No', 'NIS', 'Nama Siswa', 'L/P'];
    daysArray.forEach(d => {
      headerRow.push(`${d}`);
    });
    headerRow.push('H', 'S', 'I', 'A', 'D', '% Hadir');
    wsData.push(headerRow);

    // Student Rows
    enrollments.forEach((enr, idx) => {
      const row: any[] = [
        enr.rollNumber || idx + 1,
        enr.student?.nis || '',
        enr.student?.fullName || '',
        enr.student?.gender || 'L',
      ];

      daysArray.forEach(d => {
        const dateStr = `${yearMonthPrefix}-${d.toString().padStart(2, '0')}`;
        const rec = matrix.get(dateStr)?.get(enr.studentId);
        if (rec) {
          const code = rec.status === 'PRESENT' ? 'H' : rec.status === 'SICK' ? 'S' : rec.status === 'PERMITTED' ? 'I' : rec.status === 'ABSENT' ? 'A' : 'D';
          row.push(code);
        } else {
          const dayOfWeek = getDayOfWeek(d);
          row.push(dayOfWeek === 0 || dayOfWeek === 6 ? '-' : '');
        }
      });

      const summary = studentSummaries.get(enr.studentId) || { present: 0, sick: 0, permitted: 0, absent: 0, dispensation: 0, total: 0, rate: 0 };
      row.push(
        summary.present,
        summary.sick,
        summary.permitted,
        summary.absent,
        summary.dispensation,
        `${summary.rate}%`
      );

      wsData.push(row);
    });

    wsData.push([]);
    wsData.push(['Keterangan Kode: H = Hadir, S = Sakit, I = Izin, A = Alpa, D = Dispensasi, - = Libur']);
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', '', '', '', `Mengetahui, Kepala Madrasah`, '', '', '', '', '', `Wali Kelas ${currentClass?.name || ''}`]);
    wsData.push([]);
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', '', '', '', schoolInfo?.headmasterName || '( ................................... )', '', '', '', '', '', profile?.displayName || '( ................................... )']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap_${monthLabel}_${selectedYear}`);
    XLSX.writeFile(wb, `Presensi_Bulanan_${currentClass?.name || ''}_${monthLabel}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Matriks Presensi Bulanan
            </span>
            <span className="text-xs text-slate-500">
              T.A {activeAcademicYear?.label} • Sem {activeSemester}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Rekapitulasi Kehadiran Bulanan Kelas {currentClass?.name || ''}
          </h1>
          <p className="text-xs text-slate-500">
            Matriks kehadiran siswa harian tanggal 1 s.d. {daysInMonth} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Download Rekap Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="monthly-class-select" className="text-xs font-semibold text-slate-600">Kelas:</label>
            <select
              id="monthly-class-select"
              value={currentClass?.id || 'NONE'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassId(val === 'NONE' ? '' : val);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NONE">-- Bukan Wali Kelas / Tidak Ada Binaan --</option>
              {availableClasses.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} {c.classTeacherId === user?.uid ? '⭐ (Binaan Saya)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="monthly-month-select" className="text-xs font-semibold text-slate-600">Bulan:</label>
            <select
              id="monthly-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="monthly-year-select" className="text-xs font-semibold text-slate-600">Tahun:</label>
            <select
              id="monthly-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Holiday Settings Button */}
          <button
            type="button"
            onClick={() => setIsHolidayModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0c0e15] hover:bg-slate-100 dark:hover:bg-[#1b1f2e] rounded-lg border border-slate-300 dark:border-[#232838] transition-colors cursor-pointer"
            title="Atur Sistem 5/6 Hari Belajar & Tanggal Libur Madrasah"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
            <span>Kalender & Libur</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa..."
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {!currentClass ? (
        <div className="bg-white dark:bg-[#141722] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-[#232838] text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50">
            <UserX className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            Pilih Kelas Binaan untuk Rekap Bulanan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Silakan pilih kelas binaan pada opsi di atas untuk melihat rekapitulasi kehadiran bulanan.
          </p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Siswa Terdaftar</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{enrollments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Hari Efektif Tercatat</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{recordedDatesCount} Hari</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CalendarRange className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase">Rata-rata Kehadiran Bulan Ini</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{classMonthlyRate}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly Attendance Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-2.5 px-2 w-8 text-center sticky left-0 z-20 bg-slate-900 border-r border-slate-800">
                  No
                </th>
                <th className="py-2.5 px-3 min-w-[150px] sticky left-8 z-20 bg-slate-900 border-r border-slate-800">
                  Nama Siswa
                </th>
                <th className="py-2.5 px-1.5 w-8 text-center border-r border-slate-800">
                  L/P
                </th>

                {/* Day Headers 1..N */}
                {daysArray.map((day) => {
                  const dayStr = day.toString().padStart(2, '0');
                  const fullDateStr = `${yearMonthPrefix}-${dayStr}`;
                  const holidayCheck = checkIsHoliday(fullDateStr);

                  return (
                    <th
                      key={day}
                      className={`py-2 px-1 text-center min-w-[24px] max-w-[28px] border-r border-slate-800 ${
                        holidayCheck.isHoliday ? 'bg-rose-950/80 text-rose-300' : 'bg-slate-900 text-slate-200'
                      }`}
                      title={
                        holidayCheck.isHoliday
                          ? `Tanggal ${day}: Libur (${holidayCheck.reason})`
                          : `Tanggal ${day} (Hari Belajar Aktif)`
                      }
                    >
                      <span className="block text-[10px]">{day}</span>
                    </th>
                  );
                })}

                {/* Summary Headers */}
                <th className="py-2.5 px-2 text-center bg-emerald-950 text-emerald-300 border-r border-slate-800">H</th>
                <th className="py-2.5 px-2 text-center bg-amber-950 text-amber-300 border-r border-slate-800">S</th>
                <th className="py-2.5 px-2 text-center bg-blue-950 text-blue-300 border-r border-slate-800">I</th>
                <th className="py-2.5 px-2 text-center bg-rose-950 text-rose-300 border-r border-slate-800">A</th>
                <th className="py-2.5 px-2 text-center bg-purple-950 text-purple-300 border-r border-slate-800">D</th>
                <th className="py-2.5 px-2 text-center bg-indigo-950 text-indigo-300">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 10} className="py-12 text-center text-slate-400">
                    {loading ? 'Memuat matriks presensi...' : 'Belum ada data siswa.'}
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enr) => {
                  const summary = studentSummaries.get(enr.studentId) || { present: 0, sick: 0, permitted: 0, absent: 0, dispensation: 0, total: 0, rate: 100 };

                  return (
                    <tr key={enr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2 text-center font-medium text-slate-500 sticky left-0 z-10 bg-white border-r border-slate-200">
                        {enr.rollNumber}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 sticky left-8 z-10 bg-white border-r border-slate-200 truncate max-w-[180px]">
                        {enr.student?.fullName || '-'}
                      </td>
                      <td className="py-2 px-1.5 text-center border-r border-slate-200">
                        <GenderBadge gender={enr.student?.gender || 'L'} showLabel={false} size="sm" />
                      </td>

                      {/* Day Cells */}
                      {daysArray.map((day) => {
                        const dateStr = `${yearMonthPrefix}-${day.toString().padStart(2, '0')}`;
                        const rec = matrix.get(dateStr)?.get(enr.studentId);
                        const holidayCheck = checkIsHoliday(dateStr);

                        let content = '';
                        let cellBg = holidayCheck.isHoliday ? 'bg-slate-100/70 text-slate-300' : 'text-slate-300';

                        if (rec) {
                          if (rec.status === 'PRESENT') {
                            content = '•';
                            cellBg = 'bg-emerald-50 text-emerald-700 font-bold text-base';
                          } else if (rec.status === 'SICK') {
                            content = 'S';
                            cellBg = 'bg-amber-100 text-amber-800 font-bold';
                          } else if (rec.status === 'PERMITTED') {
                            content = 'I';
                            cellBg = 'bg-blue-100 text-blue-800 font-bold';
                          } else if (rec.status === 'ABSENT') {
                            content = 'A';
                            cellBg = 'bg-rose-100 text-rose-800 font-bold';
                          } else if (rec.status === 'DISPENSATION') {
                            content = 'D';
                            cellBg = 'bg-purple-100 text-purple-800 font-bold';
                          }
                        } else if (holidayCheck.isHoliday) {
                          content = '-';
                        }

                        return (
                          <td
                            key={day}
                            className={`py-1.5 px-0.5 text-center text-[10px] border-r border-slate-100 ${cellBg}`}
                            title={holidayCheck.isHoliday ? `Libur: ${holidayCheck.reason}` : undefined}
                          >
                            {content}
                          </td>
                        );
                      })}

                      {/* Summary Values */}
                      <td className="py-2 px-2 text-center font-semibold text-emerald-700 bg-emerald-50/40 border-r border-slate-200">
                        {summary.present}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-amber-700 bg-amber-50/40 border-r border-slate-200">
                        {summary.sick}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-blue-700 bg-blue-50/40 border-r border-slate-200">
                        {summary.permitted}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-slate-200">
                        {summary.absent}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-purple-700 bg-purple-50/40 border-r border-slate-200">
                        {summary.dispensation}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900 bg-slate-50">
                        <span className={`${summary.rate < 80 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {summary.total > 0 ? `${summary.rate}%` : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend & Guide */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Keterangan:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Hadir (• / H)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Sakit (S)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-600">Izin (I)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span className="text-slate-600">Alpa (A)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-slate-600">Dispensasi (D)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="text-slate-600">Hari Libur (-)</span>
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Data tersimpan secara aman di Firebase dan siap dicetak/diekspor ke Excel.
        </p>
      </div>
        </>
      )}

      {/* Holiday Configuration Modal */}
      <AttendanceHolidaysModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />
    </div>
  );
};
