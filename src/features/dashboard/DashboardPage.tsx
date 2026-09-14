import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  CheckSquare, 
  CalendarCheck2, 
  Award, 
  CalendarDays, 
  BookOpen, 
  Users, 
  ArrowRight, 
  Clock, 
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  List,
  FileSpreadsheet,
  AlertTriangle,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { TabNavigation } from '../../components/common/TabNavigation';
import { getMeetings } from '../../services/firestore/meetings';
import { getEnrollmentsByAcademicYear } from '../../services/firestore/enrollments';
import { getStudents } from '../../services/firestore/students';
import { getAssessmentItems, getScoresByAssessmentItemIds } from '../../services/firestore/assessments';
import { getDailyAttendanceSession } from '../../services/firestore/homeroomAttendance';
import { Meeting, Enrollment, TeachingAssignment, Student, AssessmentItem, Score, DailyAttendanceSession } from '../../types';
import { getTodayISO, formatDateWithDay, INDONESIAN_DAYS } from '../../utils/date';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { profile, user } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    teachingAssignments, 
    classes, 
    setSelectedAssignment 
  } = useWorkspace();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [homeroomDailySession, setHomeroomDailySession] = useState<DailyAttendanceSession | null>(null);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');

  const todayISO = useMemo(() => getTodayISO(), []);
  const todayDayName = useMemo(() => {
    const dayIdx = new Date().getDay();
    return INDONESIAN_DAYS[dayIdx];
  }, []);

  // Check if current teacher is a homeroom teacher in any class
  const homeroomClass = useMemo(() => {
    return classes.find(c => Boolean(c.classTeacherId && (c.classTeacherId === user?.uid || c.classTeacherId === profile?.uid)));
  }, [classes, user?.uid, profile?.uid]);

  // Load meetings, enrollments, students, assessments & homeroom session
  useEffect(() => {
    if (!user?.uid || !activeAcademicYear?.id) return;

    let isMounted = true;
    const loadRealMetrics = async () => {
      setLoadingStats(true);
      try {
        const [meetingData, enrollmentData, studentData, assessmentData] = await Promise.all([
          getMeetings(user.uid, {
            academicYearId: activeAcademicYear.id,
            semester: activeSemester,
          }),
          getEnrollmentsByAcademicYear(user.uid, activeAcademicYear.id),
          getStudents(user.uid, 'ACTIVE'),
          getAssessmentItems(user.uid, {
            academicYearId: activeAcademicYear.id,
            semester: activeSemester,
          }),
        ]);

        let scoreData: Score[] = [];
        if (assessmentData.length > 0) {
          const itemIds = assessmentData.map(a => a.id);
          scoreData = await getScoresByAssessmentItemIds(user.uid, itemIds);
        }

        let dailySession: DailyAttendanceSession | null = null;
        if (homeroomClass) {
          dailySession = await getDailyAttendanceSession(user.uid, activeAcademicYear.id, homeroomClass.id, todayISO);
        }

        if (isMounted) {
          setMeetings(meetingData);
          setEnrollments(enrollmentData);
          setStudents(studentData);
          setAssessmentItems(assessmentData);
          setScores(scoreData);
          setHomeroomDailySession(dailySession);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    loadRealMetrics();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, activeAcademicYear?.id, activeSemester, homeroomClass, todayISO]);

  const handleOpenAssignment = (assign: TeachingAssignment, targetRoute: string) => {
    setSelectedAssignment(assign);
    onNavigate(targetRoute);
  };

  // Map of student count per classId
  const studentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    enrollments.forEach(e => {
      if (e.classId && e.status !== 'INACTIVE' && e.status !== 'TRANSFERRED') {
        map.set(e.classId, (map.get(e.classId) || 0) + 1);
      }
    });
    return map;
  }, [enrollments]);

  // Group and sort teaching assignments naturally
  const sortedAssignments = useMemo(() => {
    return [...teachingAssignments].sort((a, b) => {
      const nameA = a.className || '';
      const nameB = b.className || '';
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [teachingAssignments]);

  // Today's schedule items with live attendance and journal status
  const todayScheduleItems = useMemo(() => {
    const scheduled = sortedAssignments.filter(
      a => a.dayOfWeek?.trim().toLowerCase() === todayDayName.toLowerCase()
    );

    return scheduled.map(assign => {
      // Find today's meeting for this assignment or class/subject
      const meetingToday = meetings.find(
        m => m.date === todayISO && (
          m.teachingAssignmentId === assign.id ||
          (m.classId === assign.classId && m.subjectId === assign.subjectId)
        )
      );

      const hasAttendance = Boolean(meetingToday && meetingToday.attendanceSummary);
      const attendanceSummary = meetingToday?.attendanceSummary;
      const hasJournal = Boolean(meetingToday && meetingToday.topic && meetingToday.topic.trim() !== '');

      const totalInClass = studentCountMap.get(assign.classId) || 0;

      return {
        assignment: assign,
        meeting: meetingToday,
        hasAttendance,
        attendanceSummary,
        hasJournal,
        topic: meetingToday?.topic || '',
        totalStudents: totalInClass,
      };
    });
  }, [sortedAssignments, todayDayName, meetings, todayISO, studentCountMap]);

  // Smart Recommendations & Pending Tasks Workflow
  const pendingTasks = useMemo(() => {
    const tasks: Array<{
      id: string;
      title: string;
      desc: string;
      actionLabel: string;
      actionType: 'attendance' | 'meeting' | 'grades' | 'homeroom' | 'general';
      assignment?: TeachingAssignment;
      severity: 'warning' | 'info' | 'critical';
    }> = [];

    // 1. Check today's schedule for unfilled attendance
    todayScheduleItems.forEach(item => {
      if (!item.hasAttendance) {
        tasks.push({
          id: `att-${item.assignment.id}`,
          title: `Presensi Kelas ${item.assignment.className} belum diisi`,
          desc: `Jadwal ${item.assignment.subjectName} (${item.assignment.timeSlot || 'Hari ini'})`,
          actionLabel: 'Isi Presensi',
          actionType: 'attendance',
          assignment: item.assignment,
          severity: 'warning',
        });
      }

      if (!item.hasJournal) {
        tasks.push({
          id: `jrn-${item.assignment.id}`,
          title: `Jurnal mengajar Kelas ${item.assignment.className} belum dicatat`,
          desc: `Catat materi & pokok bahasan untuk ${item.assignment.subjectName}`,
          actionLabel: 'Tulis Jurnal',
          actionType: 'meeting',
          assignment: item.assignment,
          severity: 'info',
        });
      }
    });

    // 2. Check for incomplete assessments (students missing score)
    assessmentItems.forEach(item => {
      const classId = item.classId;
      const totalStudents = studentCountMap.get(classId) || 0;
      if (totalStudents > 0) {
        const itemScores = scores.filter(s => s.assessmentItemId === item.id);
        if (itemScores.length < totalStudents) {
          const assign = sortedAssignments.find(a => a.id === item.teachingAssignmentId || a.classId === classId);
          tasks.push({
            id: `score-${item.id}`,
            title: `Nilai "${item.name}" belum lengkap`,
            desc: `Kelas ${assign?.className || 'Binaan'}: baru ${itemScores.length} dari ${totalStudents} siswa terisi`,
            actionLabel: 'Lengkapi Nilai',
            actionType: 'grades',
            assignment: assign,
            severity: 'info',
          });
        }
      }
    });

    // 3. If teacher is Homeroom, check if daily attendance is filled
    if (homeroomClass && !homeroomDailySession) {
      tasks.push({
        id: `homeroom-today-${homeroomClass.id}`,
        title: `Presensi harian Kelas ${homeroomClass.name} belum diisi`,
        desc: `Absensi harian siswa binaan wali kelas untuk hari ini (${todayDayName})`,
        actionLabel: 'Buka Presensi Harian',
        actionType: 'homeroom',
        severity: 'warning',
      });
    }

    return tasks;
  }, [todayScheduleItems, assessmentItems, scores, studentCountMap, sortedAssignments, homeroomClass, homeroomDailySession, todayDayName]);

  // Extract available grade level tabs
  const gradeTabs = useMemo(() => {
    const gradesSet = new Set<string>();
    sortedAssignments.forEach(assign => {
      const cls = classes.find(c => c.id === assign.classId);
      const gradeLevel = cls?.gradeLevel || (assign.className?.split('-')[0]) || 'Lainnya';
      if (gradeLevel) gradesSet.add(gradeLevel);
    });

    const sortedGrades = Array.from(gradesSet).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true })
    );

    const tabs = [
      { id: 'ALL', label: `Semua Kelas (${sortedAssignments.length})` }
    ];

    sortedGrades.forEach(g => {
      const count = sortedAssignments.filter(assign => {
        const cls = classes.find(c => c.id === assign.classId);
        const gradeLevel = cls?.gradeLevel || (assign.className?.split('-')[0]);
        return gradeLevel === g;
      }).length;
      tabs.push({ id: g, label: `Kelas ${g} (${count})` });
    });

    return tabs;
  }, [sortedAssignments, classes]);

  // Filter assignments based on selected grade level tab
  const filteredAssignments = useMemo(() => {
    if (gradeFilter === 'ALL') return sortedAssignments;
    return sortedAssignments.filter(assign => {
      const cls = classes.find(c => c.id === assign.classId);
      const gradeLevel = cls?.gradeLevel || (assign.className?.split('-')[0]);
      return gradeLevel === gradeFilter;
    });
  }, [sortedAssignments, gradeFilter, classes]);

  // Map of meetings summary per teachingAssignmentId
  const assignmentMetricsMap = useMemo(() => {
    const map = new Map<string, { totalMeetings: number; lastTopic: string; lastDate: string; avgAttendance: number }>();
    
    sortedAssignments.forEach(assign => {
      const assignMeetings = meetings.filter(m => m.teachingAssignmentId === assign.id || (m.classId === assign.classId && m.subjectId === assign.subjectId));
      
      const totalMeetings = assignMeetings.length;
      let lastTopic = '-';
      let lastDate = '-';
      let attendanceSum = 0;
      let attendanceCount = 0;

      if (totalMeetings > 0) {
        const sorted = [...assignMeetings].sort((a, b) => (b.meetingNumber || 0) - (a.meetingNumber || 0));
        const latest = sorted[0];
        lastTopic = latest.topic || 'Materi Pertemuan';
        lastDate = latest.date || '-';

        assignMeetings.forEach(m => {
          if (m.attendanceSummary && typeof m.attendanceSummary.presentPercentage === 'number') {
            attendanceSum += m.attendanceSummary.presentPercentage;
            attendanceCount++;
          }
        });
      }

      const avgAttendance = attendanceCount > 0 ? Math.round(attendanceSum / attendanceCount) : 0;

      map.set(assign.id, {
        totalMeetings,
        lastTopic,
        lastDate,
        avgAttendance
      });
    });

    return map;
  }, [sortedAssignments, meetings]);

  const teacherName = profile?.displayName || user?.email?.split('@')[0] || 'Guru';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Greeting & Academic Context */}
      <div className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            Selamat datang, {teacherName} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-zinc-400 mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-red-400" />
            <span>{formatDateWithDay(todayISO)}</span>
            <span className="text-slate-300 dark:text-neutral-700">•</span>
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              Semester {activeSemester} TP {activeAcademicYear?.label || 'Aktif'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-neutral-900 border border-orange-200/80 dark:border-neutral-800 text-xs font-bold text-orange-700 dark:text-zinc-300 shadow-2xs">
            {teachingAssignments.length} Kelas Diampu
          </span>
        </div>
      </div>

      {/* 2. ⚡ AKSI CEPAT (Main Action Buttons) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Aksi Cepat
          </h2>
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-500">Pintasan administrasi guru</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('attendance-subject')}
            className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-red-500/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all flex items-center gap-3 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-red-950/60 dark:text-red-400 border border-indigo-100 dark:border-red-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-red-400 block truncate">
                + Presensi Sesi
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                Kehadiran tatap muka
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('meetings')}
            className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all flex items-center gap-3 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 block truncate">
                + Jurnal Mengajar
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                Materi & kegiatan
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('grades')}
            className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 hover:border-amber-300 dark:hover:border-amber-500/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all flex items-center gap-3 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 block truncate">
                + Input Nilai
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                Formatif & sumatif
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('homeroom-attendance-daily')}
            className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 hover:border-sky-300 dark:hover:border-sky-500/50 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all flex items-center gap-3 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-100 dark:border-sky-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 block truncate">
                Presensi Harian
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 block truncate">
                Buku absensi harian
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. 📅 JADWAL HARI INI */}
      <div className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-red-950/60 border border-indigo-100 dark:border-red-500/40 flex items-center justify-center text-indigo-600 dark:text-red-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Jadwal Hari Ini ({todayDayName})
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Status presensi dan jurnal tatap muka kelas hari ini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('master-teaching')}
            className="text-xs font-semibold text-indigo-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            Atur Jadwal <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayScheduleItems.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/70 dark:border-neutral-800 flex items-start sm:items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-800/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                Tidak Ada Jadwal Mengajar Hari Ini
              </h4>
              <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 mt-0.5">
                Bebas jam tatap muka hari ini. Anda dapat fokus menyelesaikan administrasi, rekap nilai, dan kelengkapan jurnal mengajar.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayScheduleItems.map((item) => {
              const assign = item.assignment;
              const summary = item.attendanceSummary;

              return (
                <div
                  key={assign.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-neutral-900/90 border border-slate-200/80 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-neutral-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                >
                  {/* Left info: Time, Class, Subject */}
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-center shrink-0">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 block uppercase">
                        Jam
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                        {assign.timeSlot || 'Sesi'}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-red-950/60 text-indigo-700 dark:text-red-400 font-bold text-xs">
                          Kelas {assign.className}
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-100">
                          {assign.subjectName}
                        </h4>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                        {assign.room ? `Ruang: ${assign.room}` : `${item.totalStudents} Siswa Terdaftar`}
                      </p>
                    </div>
                  </div>

                  {/* Center info: Live Attendance & Journal Summary */}
                  <div className="flex flex-wrap items-center gap-2">
                    {item.hasAttendance && summary ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>H: {summary.present}</span>
                        <span className="text-emerald-300">•</span>
                        <span>S: {summary.sick}</span>
                        <span className="text-emerald-300">•</span>
                        <span>I: {summary.permit}</span>
                        <span className="text-emerald-300">•</span>
                        <span>A: {summary.absent}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Presensi Belum Diisi</span>
                      </div>
                    )}

                    {item.hasJournal ? (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-neutral-800 text-slate-700 dark:text-zinc-300 text-[11px] font-medium truncate max-w-[200px]" title={item.topic}>
                        ✓ Jurnal: {item.topic}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200/40 dark:bg-neutral-800 text-slate-400 dark:text-zinc-500 text-[11px] italic">
                        Jurnal belum ada
                      </span>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {!item.hasAttendance ? (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignment(assign, 'attendance-subject')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        Isi Presensi
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAssignment(assign, 'attendance-subject')}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-red-400 text-xs font-semibold transition-all cursor-pointer"
                      >
                        Lihat Presensi
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'meetings')}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold transition-all cursor-pointer"
                    >
                      {item.hasJournal ? 'Edit Jurnal' : '+ Jurnal'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. 💡 REKOMENDASI & PERLU DIKERJAKAN (Smart Workflow Reminders) */}
      <div className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                Rekomendasi & Perlu Dikerjakan
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                Pengingat cerdas kelengkapan administrasi dan penilaian
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-500">
            {pendingTasks.length} Catatan
          </span>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Kerja Bagus! Semua Administrasi Lengkap
              </h4>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Tidak ada presensi tertunda atau kolom penilaian yang belum lengkap untuk saat ini.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {task.severity === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-indigo-500 dark:text-red-400 shrink-0" />
                    )}
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                      {task.title}
                    </h4>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 mt-0.5 truncate">
                    {task.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (task.assignment) {
                      if (task.actionType === 'attendance') handleOpenAssignment(task.assignment, 'attendance-subject');
                      else if (task.actionType === 'meeting') handleOpenAssignment(task.assignment, 'meetings');
                      else if (task.actionType === 'grades') handleOpenAssignment(task.assignment, 'grades');
                    } else if (task.actionType === 'homeroom') {
                      onNavigate('homeroom-attendance-daily');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300/90 dark:border-neutral-800 hover:border-slate-400 dark:bg-neutral-950 dark:hover:bg-red-600 text-slate-800 dark:text-zinc-300 hover:text-indigo-700 dark:hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  {task.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. 👨🏫 WALI KELAS (Conditional Render: Only when teacher is a homeroom teacher) */}
      {homeroomClass && (
        <div className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-neutral-900 border border-purple-100 dark:border-neutral-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase tracking-wider">
                    Wali Kelas
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Kelas {homeroomClass.name}
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                  Rekap kehadiran dan pembinaan siswa binaan Anda hari ini
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('homeroom-attendance-daily')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Buka Presensi Harian
              </button>
              <button
                type="button"
                onClick={() => onNavigate('homeroom-dashboard')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Dashboard Wali
              </button>
            </div>
          </div>

          {/* Attendance live pill breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold block">
                  Total Siswa
                </span>
                <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                  {studentCountMap.get(homeroomClass.id) || 0} Siswa
                </span>
              </div>

              {homeroomDailySession ? (
                <>
                  <div className="border-l border-slate-200 dark:border-neutral-800 pl-4">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">
                      Hadir
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                      {homeroomDailySession.totalPresent || 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">
                      Sakit
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                      {homeroomDailySession.totalSick || 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold block">
                      Izin
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                      {homeroomDailySession.totalPermit || 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold block">
                      Alfa
                    </span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm">
                      {homeroomDailySession.totalAbsent || 0}
                    </span>
                  </div>
                </>
              ) : (
                <div className="border-l border-slate-200 dark:border-neutral-800 pl-4 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Presensi harian hari ini belum diinput</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('homeroom-attendance-monthly')}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Rekap Bulanan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 6. 📚 PENGAJARAN SAYA (Semua Rombel & Mapel yang Diampu) */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 p-2.5 sm:p-3 rounded-2xl shadow-2xs">
          {/* Left: Grade Level Tabs or Section Title */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {gradeTabs.length > 2 ? (
              <TabNavigation
                tabs={gradeTabs}
                activeTab={gradeFilter}
                onChange={setGradeFilter}
                size="sm"
              />
            ) : (
              <div className="flex items-center gap-2 pl-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-red-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                  Pengajaran Saya ({filteredAssignments.length} Kelas)
                </span>
              </div>
            )}
          </div>

          {/* Right: View Mode Toggle & Manage Link */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-neutral-800">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200/80 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-white dark:bg-neutral-950 text-indigo-600 dark:text-red-400 shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
                title="Tampilan Baris Kompak (Efisien & Rapi)"
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">Baris</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'bg-white dark:bg-neutral-950 text-indigo-600 dark:text-red-400 shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">Kartu</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('teaching')}
              className="text-xs font-semibold text-indigo-600 dark:text-red-400 hover:underline inline-flex items-center gap-1 cursor-pointer pl-1"
            >
              Kelola <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white dark:bg-neutral-950 border border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-neutral-900 border border-indigo-100 dark:border-neutral-800 flex items-center justify-center text-indigo-600 dark:text-red-400 mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Tidak ada data kelas</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Tambahkan plotting mata pelajaran dan rombel kelas yang Anda ampu melalui Master Pengajaran.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('master-teaching')}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-red-600 dark:hover:bg-red-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              + Tambah Plotting Pengajaran
            </button>
          </div>
        ) : viewMode === 'LIST' ? (
          /* VIEW MODE A: COMPACT ROWS */
          <div className="space-y-2">
            {filteredAssignments.map((assign) => {
              const rawCount = studentCountMap.get(assign.classId);
              const metrics = assignmentMetricsMap.get(assign.id) || { totalMeetings: 0, lastTopic: '-', lastDate: '-', avgAttendance: 0 };

              return (
                <div
                  key={assign.id}
                  className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-neutral-700 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  {/* Class & Subject Identity */}
                  <div className="flex items-center gap-3 min-w-[210px]">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex flex-col items-center justify-center shrink-0 group-hover:border-indigo-300 dark:group-hover:border-red-500/40 transition-colors">
                      <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-zinc-500">
                        {assign.subjectCode || 'MAPEL'}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-zinc-100">
                        {assign.className}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                          Kelas {assign.className}
                        </h4>
                        {typeof rawCount === 'number' && rawCount > 0 ? (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-red-950/40 text-[10px] font-semibold text-indigo-600 dark:text-red-400 border border-indigo-100/60 dark:border-red-500/30">
                            {rawCount} Siswa
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {assign.subjectName}
                      </p>
                    </div>
                  </div>

                  {/* Progress & Live Metrics */}
                  <div className="flex items-center gap-4 sm:gap-6 text-xs border-y md:border-y-0 md:border-x border-slate-100 dark:border-neutral-800/80 py-1.5 md:py-0 md:px-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                        Terlaksana
                      </span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 inline-flex items-center gap-1.5 mt-0.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        {metrics.totalMeetings} Pertemuan
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                        Kehadiran Rata-rata
                      </span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200 inline-flex items-center gap-1.5 mt-0.5 text-xs">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500 dark:text-red-400" />
                        {metrics.avgAttendance > 0 ? `${metrics.avgAttendance}%` : 'Belum Ada'}
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Direct Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'attendance-subject')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-neutral-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-red-950/80 dark:hover:text-red-300 text-indigo-700 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer border border-indigo-100/80 dark:border-neutral-800"
                      title="Input / Lihat Presensi Kelas Ini"
                    >
                      Presensi
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'meetings')}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-950/80 dark:hover:text-emerald-300 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer border border-slate-200/80 dark:border-neutral-800"
                      title="Buka Jurnal Mengajar Kelas Ini"
                    >
                      Jurnal
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'grades')}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-neutral-900 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-950/80 dark:hover:text-amber-300 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer border border-slate-200/80 dark:border-neutral-800"
                      title="Buku Nilai Kelas Ini"
                    >
                      Nilai
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW MODE B: GRID CARDS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAssignments.map((assign) => {
              const rawCount = studentCountMap.get(assign.classId);
              const metrics = assignmentMetricsMap.get(assign.id) || { totalMeetings: 0, lastTopic: '-', lastDate: '-', avgAttendance: 0 };

              return (
                <div
                  key={assign.id}
                  className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs hover:border-indigo-300 dark:hover:border-neutral-700 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-red-950/60 border border-indigo-100 dark:border-red-500/40 text-indigo-700 dark:text-red-400 font-bold text-xs">
                        Kelas {assign.className}
                      </span>
                      {typeof rawCount === 'number' && rawCount > 0 ? (
                        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-2 py-0.5 rounded">
                          {rawCount} Siswa
                        </span>
                      ) : null}
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight">
                      {assign.subjectName}
                    </h4>
                    
                    {/* Metric pills */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 text-[11px]">
                      <div className="bg-slate-50 dark:bg-neutral-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-neutral-800">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block">Pertemuan</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{metrics.totalMeetings} Sesi</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-neutral-900/80 p-2 rounded-xl border border-slate-200/60 dark:border-neutral-800">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold block">Rata Kehadiran</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-200">{metrics.avgAttendance > 0 ? `${metrics.avgAttendance}%` : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'attendance-subject')}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 dark:bg-neutral-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-red-950/60 dark:hover:text-red-400 text-indigo-700 dark:text-zinc-300 text-xs font-semibold transition-colors text-center cursor-pointer border border-indigo-100/60 dark:border-neutral-800"
                    >
                      Presensi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'meetings')}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-neutral-900 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors text-center cursor-pointer border border-slate-200/60 dark:border-neutral-800"
                    >
                      Jurnal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignment(assign, 'grades')}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-neutral-900 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-950/50 dark:hover:text-amber-400 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors text-center cursor-pointer border border-slate-200/60 dark:border-neutral-800"
                    >
                      Nilai
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

