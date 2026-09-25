import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { Badge } from '../../components/common/Badge';
import { SkeletonTable } from '../../components/common/Skeleton';
import { getAssessmentItems, getScoresByAssessmentItemIds } from '../../services/firestore/assessments';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { getSubjects } from '../../services/firestore/subjects';
import { getAllDailyAttendanceRecordsForClass } from '../../services/firestore/homeroomAttendance';
import { getStudentNotesByClass } from '../../services/firestore/studentNotes';
import { getSchoolSettings, getDocumentSettings } from '../../services/firestore/settings';
import { getUserProfile } from '../../services/firestore/users';
import { StudentRaporModal } from './StudentRaporModal';
import { BatchRaporPrintModal } from './BatchRaporPrintModal';
import { ShareReportModal } from './ShareReportModal';
import { StudentRaporData } from './StudentRaporSheet';
import { DEFAULT_KKM } from '../../constants/grading';
import { getTodayISO } from '../../utils/date';
import { 
  TeachingAssignment, 
  AssessmentItem, 
  Score, 
  Enrollment, 
  Subject, 
  DailyAttendanceRecord, 
  StudentNote, 
  SchoolSettings, 
  DocumentSettings 
} from '../../types';
import * as XLSX from 'xlsx';
import { 
  Table, 
  Search, 
  TrendingUp, 
  Trophy, 
  Users, 
  FileSpreadsheet, 
  Layers, 
  ArrowUpDown,
  Sparkles,
  CalendarCheck,
  RefreshCw,
  CheckCircle2,
  Printer,
  FileText,
  Filter,
  GraduationCap,
  Share2
} from 'lucide-react';

interface StudentLeggerRow {
  enrollmentId: string;
  studentId: string;
  rollNumber: number;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  status: string;
  subjectScores: Record<string, number | null>; // subjectId -> final score for that subject
  totalScore: number;
  averageScore: number;
  rank: number;
  sickCount: number;
  permittedCount: number;
  absentCount: number;
  dispensationCount: number;
  totalAbsent: number;
  enrollment: Enrollment;
}

export const LeggerReportPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    teachingAssignments 
  } = useWorkspace();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [dailyAttendanceRecords, setDailyAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [docSettings, setDocSettings] = useState<DocumentSettings | null>(null);
  const [homeroomTeacher, setHomeroomTeacher] = useState<{ name: string; nip: string } | null>(null);

  const [showAttendanceColumns, setShowAttendanceColumns] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'ROLL_NUMBER' | 'RANK'>('ROLL_NUMBER');

  // Modal States
  const [isRaporModalOpen, setIsRaporModalOpen] = useState(false);
  const [selectedRaporData, setSelectedRaporData] = useState<StudentRaporData | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Initialize selected class
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Fetch subjects, enrollments, assessments, scores, daily attendance, notes, and settings
  const fetchClassLeggerData = async () => {
    if (!user || !activeAcademicYear || !selectedClassId) return;
    setLoading(true);
    try {
      // 1. Fetch subjects & settings
      const [subs, sch, docS] = await Promise.all([
        getSubjects(user.uid),
        getSchoolSettings(user.uid),
        getDocumentSettings(user.uid),
      ]);
      subs.sort((a, b) => a.name.localeCompare(b.name));
      setSubjectsList(subs);
      if (sch) setSchoolSettings(sch);
      if (docS) setDocSettings(docS);

      // 2. Fetch class enrollments
      const enrs = await getEnrollmentsByClass(
        user.uid,
        activeAcademicYear.id,
        selectedClassId
      );
      enrs.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
      setEnrollments(enrs);

      // 3. Fetch all assessment items for this class & academic year & semester
      const items = await getAssessmentItems(user.uid, {
        academicYearId: activeAcademicYear.id,
        classId: selectedClassId,
        semester: activeSemester,
      });
      setAssessmentItems(items);

      // 4. Fetch all scores for these assessment items
      if (items.length > 0) {
        const itemIds = items.map(it => it.id);
        const scs = await getScoresByAssessmentItemIds(user.uid, itemIds);
        setScores(scs);
      } else {
        setScores([]);
      }

      // 5. Fetch all daily homeroom attendance records for this class
      const attRecs = await getAllDailyAttendanceRecordsForClass(user.uid, selectedClassId, activeAcademicYear.id);
      setDailyAttendanceRecords(attRecs);

      // 6. Fetch student notes for this class
      const notes = await getStudentNotesByClass(user.uid, activeAcademicYear.id, selectedClassId);
      setStudentNotes(notes);

      // 7. Homeroom teacher lookup
      const currentClass = classes.find(c => c.id === selectedClassId);
      if (currentClass?.classTeacherId) {
        if (currentClass.classTeacherId === user.uid && profile) {
          setHomeroomTeacher({
            name: profile.displayName || 'Wali Kelas',
            nip: profile.nip || '-',
          });
        } else {
          const tProfile = await getUserProfile(currentClass.classTeacherId);
          if (tProfile) {
            setHomeroomTeacher({
              name: tProfile.displayName || 'Wali Kelas',
              nip: tProfile.nip || '-',
            });
          }
        }
      } else if (profile) {
        setHomeroomTeacher({
          name: profile.displayName || 'Wali Kelas',
          nip: profile.nip || '-',
        });
      }
    } catch (err) {
      console.error('Error fetching legger data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassLeggerData();
  }, [user, activeAcademicYear, activeSemester, selectedClassId]);

  // Determine which subjects are relevant for this class
  const activeClassAssignments = useMemo(() => {
    return teachingAssignments.filter(a => a.classId === selectedClassId);
  }, [teachingAssignments, selectedClassId]);

  const classSubjects = useMemo(() => {
    const assignedSubjectIds = new Set(activeClassAssignments.map(a => a.subjectId));
    const assessedSubjectIds = new Set(assessmentItems.map(a => a.subjectId));
    
    return subjectsList.filter(s => 
      assignedSubjectIds.has(s.id) || assessedSubjectIds.has(s.id) || subjectsList.length <= 12
    );
  }, [subjectsList, activeClassAssignments, assessmentItems]);

  // Calculate Legger Rows per student
  const calculatedRows = useMemo<StudentLeggerRow[]>(() => {
    if (enrollments.length === 0) return [];

    const rows = enrollments.map(enr => {
      const studentSubjectScores: Record<string, number | null> = {};
      let total = 0;
      let countWithScore = 0;

      classSubjects.forEach(subject => {
        const subjectItems = assessmentItems.filter(
          it => it.subjectId === subject.id && it.isIncludedInFinalScore !== false
        );

        if (subjectItems.length === 0) {
          studentSubjectScores[subject.id] = null;
          return;
        }

        const totalWeight = subjectItems.reduce((acc, it) => acc + (Number(it.weight) || 1), 0);
        let weightedSum = 0;
        let validScoresCount = 0;

        subjectItems.forEach(item => {
          const sc = scores.find(s => s.studentId === enr.studentId && s.assessmentItemId === item.id);
          if (sc && typeof sc.score === 'number') {
            const weight = Number(item.weight) || 1;
            weightedSum += sc.score * weight;
            validScoresCount++;
          }
        });

        if (validScoresCount > 0 && totalWeight > 0) {
          const finalSubScore = Math.round((weightedSum / totalWeight) * 10) / 10;
          studentSubjectScores[subject.id] = finalSubScore;
          total += finalSubScore;
          countWithScore++;
        } else {
          studentSubjectScores[subject.id] = null;
        }
      });

      const avg = countWithScore > 0 ? Math.round((total / countWithScore) * 10) / 10 : 0;

      // Compute attendance records for this student
      const studentDailyRecs = dailyAttendanceRecords.filter(r => r.studentId === enr.studentId);
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;
      let dCount = 0;

      studentDailyRecs.forEach(r => {
        const st = r.status as string;
        if (st === 'SICK' || st === 'S') sCount++;
        else if (st === 'PERMITTED' || st === 'I') iCount++;
        else if (st === 'ABSENT' || st === 'A') aCount++;
        else if (st === 'DISPENSATION' || st === 'D') dCount++;
      });

      return {
        enrollmentId: enr.id,
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || 0,
        nis: enr.student?.nis || '-',
        nisn: enr.student?.nisn || '-',
        name: enr.student?.fullName || 'Siswa',
        gender: (enr.student?.gender || 'L') as 'L' | 'P',
        status: enr.status || 'ACTIVE',
        subjectScores: studentSubjectScores,
        totalScore: Math.round(total * 10) / 10,
        averageScore: avg,
        rank: 0,
        sickCount: sCount,
        permittedCount: iCount,
        absentCount: aCount,
        dispensationCount: dCount,
        totalAbsent: sCount + iCount + aCount,
        enrollment: enr,
      };
    });

    // Compute ranks only for ACTIVE students
    const activeStudents = rows.filter(r => r.status === 'ACTIVE');
    const sortedForRank = [...activeStudents].sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);
    sortedForRank.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    // Return filtered rows based on statusFilter
    const filteredByStatus = statusFilter === 'ACTIVE' ? rows.filter(r => r.status === 'ACTIVE') : rows;

    if (sortBy === 'RANK') {
      return [...filteredByStatus].sort((a, b) => {
        if (a.rank === 0) return 1;
        if (b.rank === 0) return -1;
        return a.rank - b.rank;
      });
    }
    return [...filteredByStatus].sort((a, b) => a.rollNumber - b.rollNumber);
  }, [enrollments, classSubjects, assessmentItems, scores, dailyAttendanceRecords, sortBy, statusFilter]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return calculatedRows;
    const q = searchQuery.toLowerCase();
    return calculatedRows.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.nis.toLowerCase().includes(q) ||
      r.nisn.toLowerCase().includes(q)
    );
  }, [calculatedRows, searchQuery]);

  const selectedClassObj = classes.find(c => c.id === selectedClassId);

  // Statistics
  const classStats = useMemo(() => {
    if (calculatedRows.length === 0) return { overallAvg: 0, topStudent: '-', highestAvg: 0, passedCount: 0 };
    const averages = calculatedRows.map(r => r.averageScore).filter(a => a > 0);
    const overallAvg = averages.length > 0 
      ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10 
      : 0;
    const top = calculatedRows.find(r => r.rank === 1);
    const passed = calculatedRows.filter(r => r.averageScore >= DEFAULT_KKM).length;
    return {
      overallAvg,
      topStudent: top?.name || '-',
      highestAvg: top?.averageScore || 0,
      passedCount: passed,
    };
  }, [calculatedRows]);

  // Construct StudentRaporData for batch printing or single student modal
  const allStudentsRaporData = useMemo<StudentRaporData[]>(() => {
    return calculatedRows.map(row => {
      const subjectScoresList = classSubjects.map(sub => ({
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        score: row.subjectScores[sub.id],
        kkm: DEFAULT_KKM,
      }));

      const notes = studentNotes.filter(n => n.studentId === row.studentId);
      const hadirCount = dailyAttendanceRecords.filter(
        r => r.studentId === row.studentId && (r.status === 'PRESENT' || (r.status as any) === 'H')
      ).length;

      const totalDays = hadirCount + row.sickCount + row.permittedCount + row.absentCount + row.dispensationCount;
      const attendanceRate = totalDays > 0 
        ? Math.round(((hadirCount + row.dispensationCount) / totalDays) * 100) 
        : 100;

      return {
        enrollment: row.enrollment,
        rank: row.rank,
        totalStudents: calculatedRows.filter(r => r.status === 'ACTIVE').length,
        subjectScores: subjectScoresList,
        averageScore: row.averageScore,
        totalScore: row.totalScore,
        attendanceStats: {
          hadir: hadirCount,
          sakit: row.sickCount,
          izin: row.permittedCount,
          alpa: row.absentCount,
          dispensasi: row.dispensationCount,
          attendanceRate,
        },
        notes,
      };
    });
  }, [calculatedRows, classSubjects, studentNotes, dailyAttendanceRecords]);

  // Open single student rapor modal
  const handleOpenStudentRapor = (enrollmentId: string) => {
    const data = allStudentsRaporData.find(d => d.enrollment.id === enrollmentId);
    if (data) {
      setSelectedRaporData(data);
      setIsRaporModalOpen(true);
    }
  };

  // Handle Export Excel Legger
  const handleExportExcel = () => {
    if (calculatedRows.length === 0) return;

    const sheetData: any[] = [];

    // Official Header
    if (schoolSettings?.schoolName) {
      sheetData.push([schoolSettings.schoolName.toUpperCase()]);
      sheetData.push([schoolSettings.address || '']);
      sheetData.push([]);
    }
    sheetData.push(['LEGGER NILAI AKADEMIK ROMBONGAN BELAJAR']);
    sheetData.push([`Tahun Ajaran: ${activeAcademicYear?.label || '-'} (Semester ${activeSemester === 'GANJIL' ? 'Ganjil' : 'Genap'})`]);
    sheetData.push([`Kelas / Rombel: ${selectedClassObj?.name || '-'}`]);
    sheetData.push([`Wali Kelas: ${homeroomTeacher?.name || schoolSettings?.teacherName || '-'}`]);
    sheetData.push([`Jumlah Siswa: ${filteredRows.length} Orang`]);
    sheetData.push([]); // Empty row

    // Table Header
    const headerRow: any[] = [
      'No',
      'No Absen',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
      'Status',
    ];

    classSubjects.forEach(s => {
      headerRow.push(s.name);
    });

    headerRow.push('Total Nilai');
    headerRow.push('Rata-rata');
    headerRow.push('Peringkat / Ranking');

    if (showAttendanceColumns) {
      headerRow.push('Sakit (S)');
      headerRow.push('Izin (I)');
      headerRow.push('Alpa (A)');
      headerRow.push('Dispensasi (D)');
      headerRow.push('Total Ketidakhadiran');
    }

    sheetData.push(headerRow);

    // Rows
    filteredRows.forEach((r, idx) => {
      const rowData: any[] = [
        idx + 1,
        r.rollNumber || '-',
        r.nis || '-',
        r.nisn || '-',
        r.name,
        r.gender,
        r.status,
      ];

      classSubjects.forEach(s => {
        const val = r.subjectScores[s.id];
        rowData.push(val !== null && val !== undefined ? val : '');
      });

      rowData.push(r.totalScore);
      rowData.push(r.averageScore);
      rowData.push(r.rank > 0 ? r.rank : '-');

      if (showAttendanceColumns) {
        rowData.push(r.sickCount || 0);
        rowData.push(r.permittedCount || 0);
        rowData.push(r.absentCount || 0);
        rowData.push(r.dispensationCount || 0);
        rowData.push(r.totalAbsent || 0);
      }

      sheetData.push(rowData);
    });

    // Class average footer
    const footerRow: any[] = ['', '', '', '', 'RERATA KELAS', '', ''];
    classSubjects.forEach(sub => {
      const validScores = calculatedRows
        .map(r => r.subjectScores[sub.id])
        .filter((v): v is number => typeof v === 'number' && v > 0);
      const avg = validScores.length > 0 
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 
        : '';
      footerRow.push(avg);
    });
    footerRow.push('-');
    footerRow.push(classStats.overallAvg);
    footerRow.push('-');
    if (showAttendanceColumns) {
      footerRow.push(calculatedRows.reduce((acc, r) => acc + r.sickCount, 0));
      footerRow.push(calculatedRows.reduce((acc, r) => acc + r.permittedCount, 0));
      footerRow.push(calculatedRows.reduce((acc, r) => acc + r.absentCount, 0));
      footerRow.push(calculatedRows.reduce((acc, r) => acc + r.dispensationCount, 0));
      footerRow.push(calculatedRows.reduce((acc, r) => acc + r.totalAbsent, 0));
    }
    sheetData.push(footerRow);

    // Signatures in Excel
    sheetData.push([]);
    sheetData.push([]);
    const regency = schoolSettings?.regency || 'Kota';
    sheetData.push(['', '', 'Mengetahui,', '', '', '', '', '', `${regency}, ${new Date().toLocaleDateString('id-ID')}`]);
    sheetData.push(['', '', 'Kepala Madrasah,', '', '', '', '', '', 'Wali Kelas,']);
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push(['', '', schoolSettings?.headmasterName || 'Kepala Madrasah', '', '', '', '', '', homeroomTeacher?.name || schoolSettings?.teacherName || 'Wali Kelas']);
    sheetData.push(['', '', `NIP. ${schoolSettings?.headmasterNip || '-'}`, '', '', '', '', '', `NIP. ${homeroomTeacher?.nip || schoolSettings?.teacherNip || '-'}`]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Legger Nilai');

    const fileName = `Legger_Nilai_${selectedClassObj?.name || 'Kelas'}_${activeSemester}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const metaItems = [
    { label: 'Tahun Ajaran', value: `${activeAcademicYear?.label || '-'} (${activeSemester})` },
    { label: 'Kelas / Rombel', value: selectedClassObj?.name || '-' },
    { label: 'Wali Kelas', value: homeroomTeacher?.name || schoolSettings?.teacherName || '-' },
    { label: 'Jumlah Siswa', value: `${filteredRows.length} Siswa` },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Table className="w-5 h-5 text-orange-600 dark:text-cyan-400" />
            Legger Nilai Akademik Rombel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Rekapitulasi nilai terpadu seluruh mata pelajaran, total nilai, rata-rata rapor, ranking kelas, dan cetak lembar rapor siswa.
          </p>
        </div>

        {/* Quick Batch Action & Share via Link */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            disabled={calculatedRows.length === 0}
            className="btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Tautan Publik</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            disabled={calculatedRows.length === 0}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Cetak Rapor Rombel (Batch)</span>
          </button>
        </div>
      </div>

      {/* Control & Filter Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs space-y-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Class Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pilih Kelas:</label>
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

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden cursor-pointer"
              >
                <option value="ACTIVE">Hanya Siswa Aktif</option>
                <option value="ALL">Semua Siswa</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Urutkan:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden cursor-pointer"
              >
                <option value="ROLL_NUMBER">Nomor Absen Siswa</option>
                <option value="RANK">Peringkat / Ranking</option>
              </select>
            </div>

            {/* Attendance Toggle */}
            <button
              type="button"
              onClick={() => setShowAttendanceColumns(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showAttendanceColumns
                  ? 'bg-orange-50 dark:bg-cyan-950/50 text-orange-700 dark:text-cyan-300 border-orange-300 dark:border-cyan-500/50 shadow-2xs'
                  : 'bg-slate-50 dark:bg-[#0c0e15] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#232838]'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{showAttendanceColumns ? 'Presensi: Aktif' : 'Presensi: Sembunyi'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchClassLeggerData()}
              title="Perbarui data legger & presensi"
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-[#232838] bg-slate-50 dark:bg-[#0c0e15] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600 dark:text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 bg-slate-50 dark:bg-[#0c0e15] transition-all"
            />
          </div>
        </div>

        {/* Statistical KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-[#232838]">
          <div className="p-2.5 rounded-xl bg-orange-50/60 dark:bg-cyan-950/40 border border-orange-200/60 dark:border-cyan-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-orange-700 dark:text-cyan-400 block">Rata-rata Rombel</span>
              <span className="text-lg font-black text-orange-950 dark:text-cyan-200">{classStats.overallAvg}</span>
            </div>
            <TrendingUp className="w-6 h-6 text-orange-400 dark:text-cyan-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-400 block">Peringkat 1 Kelas</span>
              <span className="text-sm font-bold text-amber-950 dark:text-amber-200 truncate max-w-[180px] block">{classStats.topStudent}</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">Rerata: {classStats.highestAvg}</span>
            </div>
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-[#232838] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">Total Siswa Terdaftar</span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                {filteredRows.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Siswa</span>
              </span>
            </div>
            <Users className="w-6 h-6 text-slate-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Ketuntasan KKTP ({DEFAULT_KKM})</span>
              <span className="text-sm font-bold text-emerald-950 dark:text-emerald-200 block">
                {classStats.passedCount} dari {filteredRows.length} Siswa
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                {filteredRows.length > 0 ? `${Math.round((classStats.passedCount / filteredRows.length) * 100)}% Tuntas` : '0%'}
              </span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Main Printable Document Section */}
      <PrintDocumentLayout
        title="LEGGER NILAI AKADEMIK HASIL BELAJAR SISWA"
        metaItems={metaItems}
        onExportExcel={handleExportExcel}
        excelExportDisabled={calculatedRows.length === 0}
        signatureType="HOMEROOM_AND_HEADMASTER"
        customTeacherRole="Wali Kelas"
        customTeacherName={homeroomTeacher?.name || schoolSettings?.teacherName}
        customTeacherNip={homeroomTeacher?.nip || schoolSettings?.teacherNip}
        paperOrientation="LANDSCAPE"
        paperSize="F4"
      >
        {loading ? (
          <div className="py-4">
            <SkeletonTable rows={10} columns={8} />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
            Belum ada data siswa untuk kelas ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-900 min-w-[850px]">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                  <th className="border border-slate-900 px-2 py-2 w-8">No</th>
                  <th className="border border-slate-900 px-2 py-2 w-10">Abs</th>
                  <th className="border border-slate-900 px-2 py-2 w-16">NIS</th>
                  <th className="border border-slate-900 px-3 py-2 text-left min-w-[140px]">Nama Siswa</th>
                  <th className="border border-slate-900 px-2 py-2 w-8">L/P</th>

                  {/* Subject Columns */}
                  {classSubjects.map(sub => (
                    <th key={sub.id} className="border border-slate-900 px-2 py-2 text-[11px] min-w-[55px]">
                      <div className="truncate max-w-[70px]" title={sub.name}>
                        {sub.code || sub.name}
                      </div>
                    </th>
                  ))}

                  <th className="border border-slate-900 px-2 py-2 w-14 bg-slate-200">Total</th>
                  <th className="border border-slate-900 px-2 py-2 w-14 bg-indigo-100 text-indigo-950">Rerata</th>
                  <th className="border border-slate-900 px-2 py-2 w-12 bg-amber-100 text-amber-950">Rank</th>

                  {/* Synced Attendance Columns */}
                  {showAttendanceColumns && (
                    <>
                      <th className="border border-slate-900 px-1.5 py-2 w-9 bg-amber-50 text-amber-900" title="Sakit">S</th>
                      <th className="border border-slate-900 px-1.5 py-2 w-9 bg-blue-50 text-blue-900" title="Izin">I</th>
                      <th className="border border-slate-900 px-1.5 py-2 w-9 bg-rose-50 text-rose-900" title="Alpa / Tanpa Keterangan">A</th>
                      <th className="border border-slate-900 px-1.5 py-2 w-10 bg-slate-100 text-slate-800" title="Total Tidak Hadir (S+I+A)">Jml</th>
                    </>
                  )}

                  {/* Action Column (Hidden on Print) */}
                  <th className="border border-slate-900 px-2 py-2 w-18 text-center no-print">Aksi Rapor</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-300">
                {filteredRows.map((r, idx) => {
                  const isTopThree = r.rank <= 3 && r.rank > 0 && r.averageScore > 0;
                  return (
                    <tr 
                      key={r.enrollmentId} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isTopThree ? 'bg-amber-50/30' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="border border-slate-900 px-2 py-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold">{r.rollNumber || '-'}</td>
                      <td className="border border-slate-900 px-2 py-1 text-center font-mono text-[11px]">{r.nis}</td>
                      <td className="border border-slate-900 px-3 py-1 font-semibold text-slate-900 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {isTopThree && <Sparkles className="w-3 h-3 text-amber-500 shrink-0 no-print" />}
                          <span>{r.name}</span>
                        </div>
                        {r.status !== 'ACTIVE' && (
                          <span className="text-[9px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-normal">
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-900 px-2 py-1 text-center font-mono">{r.gender}</td>

                      {/* Scores per Subject */}
                      {classSubjects.map(sub => {
                        const val = r.subjectScores[sub.id];
                        return (
                          <td 
                            key={sub.id} 
                            className="border border-slate-900 px-2 py-1 text-center font-mono"
                          >
                            {val !== null && val !== undefined ? val : '-'}
                          </td>
                        );
                      })}

                      {/* Total Score */}
                      <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold bg-slate-50">
                        {r.totalScore > 0 ? r.totalScore : '-'}
                      </td>

                      {/* Average Score */}
                      <td className="border border-slate-900 px-2 py-1 text-center font-mono font-black text-indigo-950 bg-indigo-50/60">
                        {r.averageScore > 0 ? r.averageScore : '-'}
                      </td>

                      {/* Rank */}
                      <td className={`border border-slate-900 px-2 py-1 text-center font-mono font-bold ${
                        isTopThree ? 'bg-amber-100/70 text-amber-900' : 'text-slate-700'
                      }`}>
                        {r.averageScore > 0 && r.rank > 0 ? r.rank : '-'}
                      </td>

                      {/* Synced Attendance Columns */}
                      {showAttendanceColumns && (
                        <>
                          <td className="border border-slate-900 px-1.5 py-1 text-center font-mono text-amber-900 bg-amber-50/30">
                            {r.sickCount > 0 ? r.sickCount : '-'}
                          </td>
                          <td className="border border-slate-900 px-1.5 py-1 text-center font-mono text-blue-900 bg-blue-50/30">
                            {r.permittedCount > 0 ? r.permittedCount : '-'}
                          </td>
                          <td className="border border-slate-900 px-1.5 py-1 text-center font-mono font-bold bg-rose-50/30">
                            {r.absentCount > 0 ? (
                              <span className="text-rose-700">{r.absentCount}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="border border-slate-900 px-1.5 py-1 text-center font-mono font-bold text-slate-800 bg-slate-100/50">
                            {r.totalAbsent > 0 ? r.totalAbsent : '-'}
                          </td>
                        </>
                      )}

                      {/* Action Column */}
                      <td className="border border-slate-900 px-2 py-1 text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleOpenStudentRapor(r.enrollmentId)}
                          className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 text-orange-700 dark:text-cyan-300 text-[10px] font-bold flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer shadow-2xs"
                          title="Lihat dan cetak lembar rapor siswa ini"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Rapor</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Row */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-center">
                  <td colSpan={5} className="border border-slate-900 px-3 py-2 text-right">
                    RERATA KELAS
                  </td>

                  {classSubjects.map(sub => {
                    const validScores = calculatedRows
                      .map(r => r.subjectScores[sub.id])
                      .filter((v): v is number => typeof v === 'number' && v > 0);
                    const avg = validScores.length > 0 
                      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 
                      : '-';
                    return (
                      <td key={sub.id} className="border border-slate-900 px-2 py-2 font-mono">
                        {avg}
                      </td>
                    );
                  })}

                  <td className="border border-slate-900 px-2 py-2 font-mono">-</td>
                  <td className="border border-slate-900 px-2 py-2 font-mono text-indigo-950 bg-indigo-100">
                    {classStats.overallAvg}
                  </td>
                  <td className="border border-slate-900 px-2 py-2 font-mono">-</td>

                  {showAttendanceColumns && (
                    <>
                      <td className="border border-slate-900 px-1.5 py-2 font-mono text-amber-900">
                        {calculatedRows.reduce((acc, r) => acc + r.sickCount, 0)}
                      </td>
                      <td className="border border-slate-900 px-1.5 py-2 font-mono text-blue-900">
                        {calculatedRows.reduce((acc, r) => acc + r.permittedCount, 0)}
                      </td>
                      <td className="border border-slate-900 px-1.5 py-2 font-mono text-rose-900">
                        {calculatedRows.reduce((acc, r) => acc + r.absentCount, 0)}
                      </td>
                      <td className="border border-slate-900 px-1.5 py-2 font-mono text-slate-900 bg-slate-200/60">
                        {calculatedRows.reduce((acc, r) => acc + r.totalAbsent, 0)}
                      </td>
                    </>
                  )}

                  <td className="border border-slate-900 px-2 py-2 font-mono no-print">-</td>
                </tr>
              </tfoot>
            </table>

            {/* Attendance Legend below Legger */}
            {showAttendanceColumns && (
              <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-800">Keterangan Presensi Semester:</span>
                  <span><strong>S</strong> = Sakit</span>
                  <span><strong>I</strong> = Izin</span>
                  <span><strong>A</strong> = Alpa / Tanpa Keterangan</span>
                  <span><strong>Jml</strong> = Total Ketidakhadiran</span>
                </div>
                <div className="text-[10px] text-slate-500 italic">
                  * Data presensi terhubung dan dikalkulasi secara otomatis dari modul presensi harian kelas.
                </div>
              </div>
            )}
          </div>
        )}
      </PrintDocumentLayout>

      {/* Single Student Rapor Modal */}
      <StudentRaporModal
        isOpen={isRaporModalOpen}
        onClose={() => {
          setIsRaporModalOpen(false);
          setSelectedRaporData(null);
        }}
        data={selectedRaporData}
        schoolSettings={schoolSettings}
        documentSettings={docSettings}
        academicYearLabel={activeAcademicYear?.label || '2026/2027'}
        semester={activeSemester}
        className={selectedClassObj?.name || 'Kelas'}
        homeroomTeacherName={homeroomTeacher?.name}
        homeroomTeacherNip={homeroomTeacher?.nip}
      />

      {/* Batch Rapor Print Modal */}
      <BatchRaporPrintModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        studentsRaporData={allStudentsRaporData}
        schoolSettings={schoolSettings}
        documentSettings={docSettings}
        academicYearLabel={activeAcademicYear?.label || '2026/2027'}
        semester={activeSemester}
        className={selectedClassObj?.name || 'Kelas'}
        homeroomTeacherName={homeroomTeacher?.name}
        homeroomTeacherNip={homeroomTeacher?.nip}
      />

      {/* Public Share via Link Modal */}
      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        reportType="LEGGER"
        defaultTitle={`LEGGER NILAI AKADEMIK ROMBEL ${selectedClassObj?.name || ''}`}
        payload={{
          reportType: 'LEGGER',
          title: `LEGGER NILAI AKADEMIK ROMBEL ${selectedClassObj?.name || ''}`,
          schoolName: schoolSettings?.schoolName || 'Madrasah Aliyah / Tsanawiyah',
          schoolLevel: schoolSettings?.schoolLevel || 'MA',
          kemenagDistrict: schoolSettings?.district || schoolSettings?.regency || 'Kementerian Agama',
          academicYearLabel: activeAcademicYear?.label || '2026/2027',
          semester: activeSemester,
          className: selectedClassObj?.name || 'Kelas',
          teacherName: homeroomTeacher?.name || schoolSettings?.teacherName || 'Wali Kelas',
          teacherNip: homeroomTeacher?.nip || schoolSettings?.teacherNip || '-',
          headmasterName: schoolSettings?.headmasterName || 'H. Ahmad Fauzi, M.Pd.I',
          headmasterNip: schoolSettings?.headmasterNip || '19780512 200501 1 003',
          generatedDate: getTodayISO(),
          leggerData: {
            kkm: schoolSettings?.defaultKkm || DEFAULT_KKM,
            subjects: classSubjects.map(s => ({
              id: s.id,
              name: s.name,
              code: s.code || s.name.substring(0, 5).toUpperCase()
            })),
            rows: calculatedRows.map(r => ({
              rollNumber: r.rollNumber,
              nis: r.nis,
              nisn: r.nisn,
              name: r.name,
              gender: r.gender,
              subjectScores: r.subjectScores,
              totalScore: r.totalScore,
              averageScore: r.averageScore,
              rank: r.rank
            })),
            classAverage: classStats.overallAvg,
          }
        }}
      />
    </div>
  );
};
