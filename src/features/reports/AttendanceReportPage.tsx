import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { Badge } from '../../components/common/Badge';
import { getMeetings } from '../../services/firestore/meetings';
import { getAttendanceRecordsByMeetingIds } from '../../services/firestore/attendance';
import { getAllDailyAttendanceRecordsForClass } from '../../services/firestore/homeroomAttendance';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { TeachingAssignment, Meeting, AttendanceRecord, DailyAttendanceRecord, Enrollment } from '../../types';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  CalendarCheck2, 
  Users, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Download,
  Percent,
  Clock
} from 'lucide-react';

interface StudentAttendanceSummary {
  enrollmentId: string;
  studentId: string;
  rollNumber: number;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  presentCount: number;
  sickCount: number;
  permittedCount: number;
  absentCount: number;
  dispensationCount: number;
  totalMeetings: number;
  presentPercentage: number;
}

export const AttendanceReportPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    teachingAssignments, 
    classes, 
    selectedAssignment,
    setSelectedAssignment 
  } = useWorkspace();

  const [reportMode, setReportMode] = useState<'SUBJECT' | 'HOMEROOM'>('SUBJECT');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Subject Attendance State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  // Homeroom Attendance State
  const [dailyRecords, setDailyRecords] = useState<DailyAttendanceRecord[]>([]);

  // Initialize selected assignment or class
  useEffect(() => {
    if (teachingAssignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(teachingAssignments[0]);
    }
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [teachingAssignments, classes, selectedAssignment, selectedClassId]);

  // Fetch Subject Attendance Data
  useEffect(() => {
    if (!user || !activeAcademicYear || reportMode !== 'SUBJECT' || !selectedAssignment) return;

    const fetchSubjectData = async () => {
      setLoading(true);
      try {
        // 1. Fetch meetings for this assignment
        const mets = await getMeetings(user.uid, { teachingAssignmentId: selectedAssignment.id });
        setMeetings(mets);

        // 2. Fetch class enrollments
        const enrs = await getEnrollmentsByClass(
          user.uid,
          activeAcademicYear.id,
          selectedAssignment.classId
        );
        enrs.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
        setEnrollments(enrs);

        // 3. Fetch all attendance records across these meetings
        if (mets.length > 0) {
          const mIds = mets.map(m => m.id);
          const recs = await getAttendanceRecordsByMeetingIds(user.uid, mIds);
          setAttendanceRecords(recs);
        } else {
          setAttendanceRecords([]);
        }
      } catch (err) {
        console.error('Error fetching subject attendance report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectData();
  }, [user, activeAcademicYear, reportMode, selectedAssignment]);

  // Fetch Homeroom Daily Attendance Data
  useEffect(() => {
    if (!user || !activeAcademicYear || reportMode !== 'HOMEROOM' || !selectedClassId) return;

    const fetchHomeroomData = async () => {
      setLoading(true);
      try {
        // 1. Fetch class enrollments
        const enrs = await getEnrollmentsByClass(
          user.uid,
          activeAcademicYear.id,
          selectedClassId
        );
        enrs.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
        setEnrollments(enrs);

        // 2. Fetch all daily records for this class
        const recs = await getAllDailyAttendanceRecordsForClass(user.uid, selectedClassId);
        setDailyRecords(recs);
      } catch (err) {
        console.error('Error fetching homeroom attendance report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeroomData();
  }, [user, activeAcademicYear, reportMode, selectedClassId]);

  // Compile Student Summaries for Subject Attendance
  const subjectSummaries = useMemo<StudentAttendanceSummary[]>(() => {
    if (reportMode !== 'SUBJECT') return [];

    const totalM = meetings.length;
    return enrollments.map(enr => {
      const studentRecs = attendanceRecords.filter(r => r.studentId === enr.studentId);
      
      let p = 0;
      let s = 0;
      let i = 0;
      let a = 0;
      let d = 0;

      studentRecs.forEach(r => {
        if (r.status === 'PRESENT') p++;
        else if (r.status === 'SICK') s++;
        else if (r.status === 'PERMITTED') i++;
        else if (r.status === 'ABSENT') a++;
        else if (r.status === 'DISPENSATION') d++;
      });

      const effectiveTotal = totalM > 0 ? totalM : (p + s + i + a + d);
      const percentage = effectiveTotal > 0 ? Math.round(((p + d) / effectiveTotal) * 100) : 0;

      return {
        enrollmentId: enr.id,
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || 0,
        nis: enr.student?.nis || '-',
        nisn: enr.student?.nisn || '-',
        name: enr.student?.fullName || 'Siswa',
        gender: enr.student?.gender || 'L',
        presentCount: p,
        sickCount: s,
        permittedCount: i,
        absentCount: a,
        dispensationCount: d,
        totalMeetings: effectiveTotal,
        presentPercentage: percentage,
      };
    });
  }, [reportMode, enrollments, attendanceRecords, meetings]);

  // Compile Student Summaries for Homeroom Attendance
  const homeroomSummaries = useMemo<StudentAttendanceSummary[]>(() => {
    if (reportMode !== 'HOMEROOM') return [];

    // Distinct dates
    const distinctDates = new Set(dailyRecords.map(r => r.date));
    const totalEffectiveDays = distinctDates.size;

    return enrollments.map(enr => {
      const studentRecs = dailyRecords.filter(r => r.studentId === enr.studentId);

      let p = 0;
      let s = 0;
      let i = 0;
      let a = 0;
      let d = 0;

      studentRecs.forEach(r => {
        if (r.status === 'PRESENT') p++;
        else if (r.status === 'SICK') s++;
        else if (r.status === 'PERMITTED') i++;
        else if (r.status === 'ABSENT') a++;
        else if (r.status === 'DISPENSATION') d++;
      });

      const effectiveTotal = totalEffectiveDays > 0 ? totalEffectiveDays : (p + s + i + a + d);
      const percentage = effectiveTotal > 0 ? Math.round(((p + d) / effectiveTotal) * 100) : 0;

      return {
        enrollmentId: enr.id,
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || 0,
        nis: enr.student?.nis || '-',
        nisn: enr.student?.nisn || '-',
        name: enr.student?.fullName || 'Siswa',
        gender: enr.student?.gender || 'L',
        presentCount: p,
        sickCount: s,
        permittedCount: i,
        absentCount: a,
        dispensationCount: d,
        totalMeetings: effectiveTotal,
        presentPercentage: percentage,
      };
    });
  }, [reportMode, enrollments, dailyRecords]);

  const activeSummaries = reportMode === 'SUBJECT' ? subjectSummaries : homeroomSummaries;

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return activeSummaries;
    const q = searchQuery.toLowerCase();
    return activeSummaries.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.nis.toLowerCase().includes(q) ||
      s.nisn.toLowerCase().includes(q)
    );
  }, [activeSummaries, searchQuery]);

  // Statistical Overview
  const stats = useMemo(() => {
    if (activeSummaries.length === 0) {
      return { avgPercentage: 0, perfectCount: 0, criticalCount: 0, totalP: 0, totalS: 0, totalI: 0, totalA: 0 };
    }
    const sumPercentage = activeSummaries.reduce((acc, s) => acc + s.presentPercentage, 0);
    const avgPercentage = Math.round(sumPercentage / activeSummaries.length);
    const perfectCount = activeSummaries.filter(s => s.presentPercentage === 100).length;
    const criticalCount = activeSummaries.filter(s => s.presentPercentage < 75).length;
    const totalP = activeSummaries.reduce((acc, s) => acc + s.presentCount, 0);
    const totalS = activeSummaries.reduce((acc, s) => acc + s.sickCount, 0);
    const totalI = activeSummaries.reduce((acc, s) => acc + s.permittedCount, 0);
    const totalA = activeSummaries.reduce((acc, s) => acc + s.absentCount, 0);

    return { avgPercentage, perfectCount, criticalCount, totalP, totalS, totalI, totalA };
  }, [activeSummaries]);

  // Selected Class & Subject info
  const selectedClassObj = classes.find(c => 
    reportMode === 'SUBJECT' ? c.id === selectedAssignment?.classId : c.id === selectedClassId
  );

  // Handle Export Excel
  const handleExportExcel = () => {
    if (activeSummaries.length === 0) return;

    const sheetData: any[] = [];

    // Header info
    sheetData.push(['LAPORAN REKAPITULASI PRESENSI SISWA']);
    sheetData.push([`Tahun Ajaran: ${activeAcademicYear?.label || '-'} (${activeSemester})`]);
    sheetData.push([`Kelas: ${selectedClassObj?.name || '-'}`]);
    if (reportMode === 'SUBJECT') {
      sheetData.push([`Mata Pelajaran: ${selectedAssignment?.subjectName || '-'}`]);
      sheetData.push([`Total Pertemuan KBM: ${meetings.length}`]);
    } else {
      sheetData.push([`Jenis Presensi: Presensi Harian Wali Kelas`]);
    }
    sheetData.push([]); // Empty row

    // Table Header
    sheetData.push([
      'No',
      'No Absen',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alpa (A)',
      'Dispensasi (D)',
      'Total Sesi',
      '% Kehadiran',
      'Keterangan'
    ]);

    // Table Rows
    filteredSummaries.forEach((s, idx) => {
      let ket = 'Baik';
      if (s.presentPercentage >= 95) ket = 'Sangat Baik';
      else if (s.presentPercentage < 75) ket = 'Perlu Pembinaan / Kritis';
      else if (s.presentPercentage < 85) ket = 'Cukup';

      sheetData.push([
        idx + 1,
        s.rollNumber || '-',
        s.nis || '-',
        s.nisn || '-',
        s.name,
        s.gender,
        s.presentCount,
        s.sickCount,
        s.permittedCount,
        s.absentCount,
        s.dispensationCount,
        s.totalMeetings,
        `${s.presentPercentage}%`,
        ket
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi');

    const fileName = `Rekap_Presensi_${reportMode === 'SUBJECT' ? selectedAssignment?.subjectName : 'Kelas'}_${selectedClassObj?.name || 'Kelas'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const documentTitle = reportMode === 'SUBJECT' 
    ? 'LAPORAN REKAPITULASI PRESENSI MATA PELAJARAN'
    : 'LAPORAN REKAPITULASI PRESENSI HARIAN KELAS';

  const metaItems = [
    { label: 'Tahun Ajaran', value: `${activeAcademicYear?.label || '-'} (${activeSemester})` },
    { label: 'Kelas / Rombel', value: selectedClassObj?.name || '-' },
    ...(reportMode === 'SUBJECT' ? [
      { label: 'Mata Pelajaran', value: selectedAssignment?.subjectName || '-' },
      { label: 'Total Sesi KBM', value: `${meetings.length} Pertemuan` },
    ] : [
      { label: 'Tipe Laporan', value: 'Buku Presensi Harian' },
      { label: 'Jumlah Siswa', value: `${enrollments.length} Siswa` },
    ]),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600 dark:text-cyan-400" />
            Laporan Rekapitulasi Presensi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Rekap kehadiran siswa per mata pelajaran & kelas dengan format siap cetak dan ekspor Excel.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-slate-100 dark:bg-[#0c0e15] p-1 rounded-xl flex items-center border border-slate-200/80 dark:border-[#232838] self-start md:self-auto transition-colors">
          <button
            type="button"
            onClick={() => setReportMode('SUBJECT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              reportMode === 'SUBJECT'
                ? 'bg-white dark:bg-[#141722] text-orange-700 dark:text-cyan-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            Presensi Mapel
          </button>
          <button
            type="button"
            onClick={() => setReportMode('HOMEROOM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              reportMode === 'HOMEROOM'
                ? 'bg-white dark:bg-[#141722] text-orange-700 dark:text-cyan-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Presensi Harian Wali Kelas
          </button>
        </div>
      </div>

      {/* Filter Selector Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs space-y-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {reportMode === 'SUBJECT' ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pilih Mapel & Kelas:</label>
              <select
                value={selectedAssignment?.id || ''}
                onChange={(e) => {
                  const asg = teachingAssignments.find(a => a.id === e.target.value);
                  if (asg) setSelectedAssignment(asg);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
              >
                {teachingAssignments.map(asg => (
                  <option key={asg.id} value={asg.id}>
                    {asg.className} — {asg.subjectName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pilih Rombongan Belajar:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 bg-slate-50 dark:bg-[#0c0e15] transition-all"
            />
          </div>
        </div>

        {/* Statistical Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-[#232838]">
          <div className="p-2.5 rounded-xl bg-orange-50/60 dark:bg-cyan-950/40 border border-orange-200/60 dark:border-cyan-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-700 dark:text-cyan-400 block">Rata-rata Kehadiran</span>
              <span className="text-lg font-black text-orange-950 dark:text-cyan-200">{stats.avgPercentage}%</span>
            </div>
            <Percent className="w-6 h-6 text-orange-400 dark:text-cyan-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">100% Hadir</span>
              <span className="text-lg font-black text-emerald-950 dark:text-emerald-200">{stats.perfectCount} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">Siswa</span></span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">Kehadiran &lt; 75%</span>
              <span className="text-lg font-black text-rose-950 dark:text-rose-200">{stats.criticalCount} <span className="text-xs font-normal text-rose-700 dark:text-rose-400">Siswa</span></span>
            </div>
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-[#232838] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Akumulasi H / S / I / A</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                <strong className="text-emerald-700 dark:text-emerald-400">{stats.totalP}</strong> / <strong className="text-amber-700 dark:text-amber-400">{stats.totalS}</strong> / <strong className="text-sky-700 dark:text-sky-400">{stats.totalI}</strong> / <strong className="text-rose-700 dark:text-rose-400">{stats.totalA}</strong>
              </span>
            </div>
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Printable Document Section */}
      <PrintDocumentLayout
        title={documentTitle}
        metaItems={metaItems}
        onExportExcel={handleExportExcel}
        excelExportDisabled={activeSummaries.length === 0}
        signatureType={reportMode === 'HOMEROOM' ? 'HOMEROOM_AND_HEADMASTER' : 'TEACHER_AND_HEADMASTER'}
      >
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Memuat kompilasi data presensi...
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
            Belum ada data siswa atau catatan presensi untuk kelas ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                  <th className="border border-slate-900 px-2 py-2 w-10">No</th>
                  <th className="border border-slate-900 px-2 py-2 w-12">Absen</th>
                  <th className="border border-slate-900 px-2 py-2 w-20">NIS / NISN</th>
                  <th className="border border-slate-900 px-3 py-2 text-left">Nama Siswa</th>
                  <th className="border border-slate-900 px-2 py-2 w-10">L/P</th>
                  <th className="border border-slate-900 px-2 py-2 w-12 bg-emerald-50 text-emerald-900">H</th>
                  <th className="border border-slate-900 px-2 py-2 w-12 bg-amber-50 text-amber-900">S</th>
                  <th className="border border-slate-900 px-2 py-2 w-12 bg-blue-50 text-blue-900">I</th>
                  <th className="border border-slate-900 px-2 py-2 w-12 bg-rose-50 text-rose-900">A</th>
                  <th className="border border-slate-900 px-2 py-2 w-12 bg-purple-50 text-purple-900">D</th>
                  <th className="border border-slate-900 px-2 py-2 w-14">Total Sesi</th>
                  <th className="border border-slate-900 px-2 py-2 w-16">% Hadir</th>
                  <th className="border border-slate-900 px-3 py-2 text-left w-32">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredSummaries.map((s, idx) => {
                  const isCritical = s.presentPercentage < 75;
                  return (
                    <tr 
                      key={s.enrollmentId} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCritical ? 'bg-rose-50/40' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold">{s.rollNumber || '-'}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[11px]">
                        <div>{s.nis}</div>
                        {s.nisn && s.nisn !== '-' && <div className="text-[10px] text-slate-500">{s.nisn}</div>}
                      </td>
                      <td className="border border-slate-900 px-3 py-1.5 font-semibold text-slate-900">
                        {s.name}
                      </td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{s.gender}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold text-emerald-800">{s.presentCount}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-amber-800">{s.sickCount}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-blue-800">{s.permittedCount}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold text-rose-800">
                        {s.absentCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900">{s.absentCount}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-purple-800">{s.dispensationCount}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold">{s.totalMeetings}</td>
                      <td className={`border border-slate-900 px-2 py-1.5 text-center font-mono font-bold ${
                        isCritical ? 'text-rose-700 bg-rose-100/50' : 'text-slate-900'
                      }`}>
                        {s.presentPercentage}%
                      </td>
                      <td className="border border-slate-900 px-3 py-1.5 text-[11px]">
                        {s.presentPercentage >= 95 ? (
                          <span className="text-emerald-700 font-semibold">Sangat Baik</span>
                        ) : isCritical ? (
                          <span className="text-rose-700 font-bold">Perlu Pembinaan</span>
                        ) : (
                          <span className="text-slate-600">Cukup Baik</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total & Summary Row */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-center">
                  <td colSpan={5} className="border border-slate-900 px-3 py-2 text-right">
                    RATA-RATA / TOTAL KELAS
                  </td>
                  <td className="border border-slate-900 px-2 py-2 text-emerald-900">{stats.totalP}</td>
                  <td className="border border-slate-900 px-2 py-2 text-amber-900">{stats.totalS}</td>
                  <td className="border border-slate-900 px-2 py-2 text-blue-900">{stats.totalI}</td>
                  <td className="border border-slate-900 px-2 py-2 text-rose-900">{stats.totalA}</td>
                  <td className="border border-slate-900 px-2 py-2 text-purple-900">-</td>
                  <td className="border border-slate-900 px-2 py-2">-</td>
                  <td className="border border-slate-900 px-2 py-2 text-indigo-900 bg-indigo-50">
                    {stats.avgPercentage}%
                  </td>
                  <td className="border border-slate-900 px-3 py-2 text-left text-[10px] text-slate-500">
                    {stats.criticalCount > 0 ? `${stats.criticalCount} siswa di bawah KKM` : 'Seluruh siswa tertib'}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Attendance Legend & Notes */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-800">Keterangan:</span>
                <span><strong>H</strong> = Hadir</span>
                <span><strong>S</strong> = Sakit</span>
                <span><strong>I</strong> = Izin</span>
                <span><strong>A</strong> = Alpa</span>
                <span><strong>D</strong> = Dispensasi</span>
              </div>
              <div className="text-[10px] text-slate-500">
                * Batas minimal kehadiran standar: <strong>75%</strong>
              </div>
            </div>
          </div>
        )}
      </PrintDocumentLayout>
    </div>
  );
};
