import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getMeetings } from '../../services/firestore/meetings';
import { getEnrollmentsByAcademicYear } from '../../services/firestore/enrollments';
import { MeetingFormModal } from './MeetingFormModal';
import { SubjectAttendanceModal } from './SubjectAttendanceModal';
import { TeachingAssignment, Meeting } from '../../types';
import { SkeletonCardGrid } from '../../components/common/Skeleton';
import { 
  BookOpen, 
  Users, 
  CalendarCheck2, 
  CheckSquare, 
  Plus, 
  Layers, 
  Award,
  Filter,
  GraduationCap,
  Sparkles,
  CalendarDays,
  Clock
} from 'lucide-react';

interface TeachingClassesPageProps {
  onNavigate: (route: string, state?: any) => void;
}

interface AssignmentStats {
  studentCount: number;
  meetingCount: number;
  completedMeetingCount: number;
  avgAttendanceRate: number;
  latestMeeting?: Meeting;
}

// In-memory module cache to ensure instant 0ms tab switching
let cachedTeachingStats: Record<string, AssignmentStats> | null = null;
let cachedTeachingKey: string = '';

export const TeachingClassesPage: React.FC<TeachingClassesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { 
    teachingAssignments, 
    activeAcademicYear, 
    activeSemester, 
    setSelectedAssignment 
  } = useWorkspace();

  const currentCacheKey = `${user?.uid}_${activeAcademicYear?.id}_${activeSemester}`;
  const hasValidCache = cachedTeachingStats && cachedTeachingKey === currentCacheKey;

  const [statsMap, setStatsMap] = useState<Record<string, AssignmentStats>>(hasValidCache ? cachedTeachingStats! : {});
  const [loading, setLoading] = useState(!hasValidCache);

  // Filters state
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');

  // Modals state
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<Meeting | null>(null);

  const loadAssignmentsData = async (forceSilent = false) => {
    if (!user || !activeAcademicYear) return;
    try {
      if (!forceSilent && !hasValidCache) {
        setLoading(true);
      }
      
      // Batch fetch all meetings and all enrollments for active academic year in parallel (2 queries instead of 2 * N)
      const [allMeetings, allEnrollments] = await Promise.all([
        getMeetings(user.uid, { academicYearId: activeAcademicYear.id, semester: activeSemester }),
        getEnrollmentsByAcademicYear(user.uid, activeAcademicYear.id)
      ]);

      // Index active student count by classId
      const studentCountByClass = new Map<string, number>();
      for (const e of allEnrollments) {
        if (e.status === 'ACTIVE') {
          studentCountByClass.set(e.classId, (studentCountByClass.get(e.classId) || 0) + 1);
        }
      }

      // Group meetings by teachingAssignmentId
      const meetingsByAssignment = new Map<string, Meeting[]>();
      for (const m of allMeetings) {
        if (m.teachingAssignmentId) {
          const list = meetingsByAssignment.get(m.teachingAssignmentId) || [];
          list.push(m);
          meetingsByAssignment.set(m.teachingAssignmentId, list);
        }
      }

      const newStats: Record<string, AssignmentStats> = {};

      for (const assignment of teachingAssignments) {
        const meetings = meetingsByAssignment.get(assignment.id) || [];
        const completed = meetings.filter(m => m.status === 'COMPLETED');
        
        let totalPct = 0;
        let countedMeetings = 0;
        completed.forEach(m => {
          if (m.attendanceSummary?.presentPercentage !== undefined) {
            totalPct += m.attendanceSummary.presentPercentage;
            countedMeetings++;
          }
        });
        const avgAttendanceRate = countedMeetings > 0 ? Math.round(totalPct / countedMeetings) : 0;
        const studentCount = studentCountByClass.get(assignment.classId) || 0;
        const latestMeeting = meetings.length > 0 ? meetings[meetings.length - 1] : undefined;

        newStats[assignment.id] = {
          studentCount,
          meetingCount: meetings.length,
          completedMeetingCount: completed.length,
          avgAttendanceRate,
          latestMeeting,
        };
      }

      cachedTeachingStats = newStats;
      cachedTeachingKey = currentCacheKey;
      setStatsMap(newStats);
    } catch (err) {
      console.error('Error loading teaching assignment stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If we already have cache, load quietly in background; otherwise load with loading state
    loadAssignmentsData(hasValidCache);
  }, [teachingAssignments, activeAcademicYear, activeSemester, user]);

  // Extract unique classes and subjects for filter dropdowns
  const uniqueClasses = useMemo(() => {
    const map = new Map<string, string>();
    teachingAssignments.forEach(a => {
      if (a.classId && !map.has(a.classId)) {
        map.set(a.classId, a.className || 'Kelas');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [teachingAssignments]);

  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, { name: string; code?: string }>();
    teachingAssignments.forEach(a => {
      if (a.subjectId && !map.has(a.subjectId)) {
        map.set(a.subjectId, { name: a.subjectName || 'Mapel', code: a.subjectCode });
      }
    });
    return Array.from(map.entries()).map(([id, data]) => ({ id, name: data.name, code: data.code }));
  }, [teachingAssignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return teachingAssignments.filter(assignment => {
      const matchClass = selectedClassId === 'ALL' || assignment.classId === selectedClassId;
      const matchSubject = selectedSubjectId === 'ALL' || assignment.subjectId === selectedSubjectId;
      return matchClass && matchSubject;
    });
  }, [teachingAssignments, selectedClassId, selectedSubjectId]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141722] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 dark:bg-cyan-950/60 text-orange-600 dark:text-cyan-400 border border-orange-200/60 dark:border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Pengajaran Saya (Guru Mapel)</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Daftar rombongan belajar & mata pelajaran aktif pada Tahun Ajaran {activeAcademicYear?.label} ({activeSemester === 'GANJIL' ? 'Semester Ganjil' : 'Semester Genap'}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('teaching-schedule')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            title="Lihat Matriks Jadwal Mengajar Mingguan"
          >
            <CalendarDays className="w-4 h-4 text-orange-500 dark:text-cyan-400" />
            <span>Jadwal Mengajar</span>
          </button>

          <button
            id="btn-create-meeting-top"
            onClick={() => {
              setSelectedAssignmentId(teachingAssignments[0]?.id || '');
              setIsMeetingModalOpen(true);
            }}
            disabled={teachingAssignments.length === 0}
            className="px-4 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Catat Pertemuan Baru
          </button>
        </div>
      </div>

      {/* Filter Bar (Kelas & Mata Pelajaran) */}
      {teachingAssignments.length > 0 && (
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {/* Filter Kelas */}
            <div className="w-full sm:w-56">
              <label htmlFor="filter-class-select" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Filter Kelas / Rombel
              </label>
              <div className="relative">
                <select
                  id="filter-class-select"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Kelas ({teachingAssignments.length})</option>
                  {uniqueClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Mata Pelajaran */}
            <div className="w-full sm:w-64">
              <label htmlFor="filter-subject-select" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Filter Mata Pelajaran
              </label>
              <div className="relative">
                <select
                  id="filter-subject-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Mata Pelajaran</option>
                  {uniqueSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-[#232838]">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Menampilkan <strong className="text-slate-800 dark:text-slate-100">{filteredAssignments.length}</strong> dari {teachingAssignments.length} Rombel
            </span>
            {(selectedClassId !== 'ALL' || selectedSubjectId !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassId('ALL');
                  setSelectedSubjectId('ALL');
                }}
                className="text-xs text-orange-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Overview Cards Grid */}
      {loading ? (
        <SkeletonCardGrid count={teachingAssignments.length > 0 ? teachingAssignments.length : 3} />
      ) : teachingAssignments.length === 0 ? (
        <div className="bg-white dark:bg-[#141722] p-12 text-center rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Plotting Pengajaran Aktif</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Anda belum memiliki rombel kelas atau mata pelajaran yang diampu pada semester ini. Silakan buat plotting di menu Master Data.
          </p>
          <button
            onClick={() => onNavigate('master-teaching')}
            className="px-4 py-2 rounded-xl btn-primary text-xs font-bold transition-all cursor-pointer"
          >
            Atur Plotting Pengajaran
          </button>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white dark:bg-[#141722] p-10 text-center rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <Filter className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Tidak Ada Rombel yang Sesuai Filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-3">
            Silakan ubah pilihan filter kelas atau mata pelajaran untuk melihat data rombel lainnya.
          </p>
          <button
            onClick={() => {
              setSelectedClassId('ALL');
              setSelectedSubjectId('ALL');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1b1f2e] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            Tampilkan Semua Rombel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map((assignment) => {
            const stats = statsMap[assignment.id] || {
              studentCount: 0,
              meetingCount: 0,
              completedMeetingCount: 0,
              avgAttendanceRate: 0,
            };

            return (
              <div
                key={assignment.id}
                className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs hover:shadow-md dark:hover:border-cyan-500/40 transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 dark:border-[#232838]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 dark:bg-cyan-950/70 text-orange-600 dark:text-cyan-400 border border-orange-200/50 dark:border-cyan-500/30 font-mono font-bold text-xs">
                        {assignment.subjectCode || 'MAPEL'}
                      </span>
                      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-2 line-clamp-1">
                        {assignment.subjectName}
                      </h2>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>Kelas {assignment.className}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-normal">
                          <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {stats.studentCount} Siswa
                        </span>
                      </p>

                      {/* Display Scheduled Slot if available */}
                      {(assignment.dayOfWeek || (assignment.schedules && assignment.schedules.length > 0)) && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                          <Clock className="w-3 h-3 text-orange-500 dark:text-cyan-400" />
                          <span>
                            {assignment.dayOfWeek || assignment.schedules?.[0]?.day}: {assignment.timeSlot || assignment.schedules?.[0]?.timeSlot || 'Jam KBM'}
                            {assignment.room ? ` (${assignment.room})` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        stats.completedMeetingCount > 0
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/40'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {stats.completedMeetingCount > 0 
                          ? `${stats.completedMeetingCount} Pertemuan Terlaksana`
                          : 'Belum Dimulai'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric Info */}
                  <div className="mt-4 flex items-center justify-between text-xs bg-slate-50/80 dark:bg-[#0c0e15] px-3 py-2 rounded-xl border border-slate-100 dark:border-[#232838]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Presensi Siswa</span>
                    <span className={`font-bold ${
                      stats.avgAttendanceRate >= 85 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : stats.avgAttendanceRate > 0 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {stats.avgAttendanceRate > 0 ? `${stats.avgAttendanceRate}% Rata-rata Kehadiran` : 'Belum Ada Presensi'}
                    </span>
                  </div>
                </div>

                {/* Latest Meeting Preview */}
                <div className="px-5 py-3.5 bg-slate-50/40 dark:bg-[#0F121C] border-b border-slate-100 dark:border-[#232838] text-xs">
                  {stats.latestMeeting ? (
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
                        Pertemuan Terakhir #{stats.latestMeeting.meetingNumber} ({stats.latestMeeting.date})
                      </span>
                      <p className="font-medium text-slate-700 dark:text-slate-200 line-clamp-1 mt-0.5">
                        {stats.latestMeeting.topic}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic text-[11px]">Belum ada agenda pertemuan yang dicatat.</p>
                  )}
                </div>

                {/* Card Action Buttons (3 Clean Equal Action Buttons) */}
                <div className="p-3.5 bg-white dark:bg-[#141722] grid grid-cols-3 gap-2">
                  <button
                    id={`btn-journal-${assignment.id}`}
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      onNavigate('meetings', { assignmentId: assignment.id });
                    }}
                    className="px-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Buka Jurnal KBM"
                  >
                    <CalendarCheck2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    Jurnal
                  </button>

                  <button
                    id={`btn-attendance-${assignment.id}`}
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      onNavigate('attendance-subject', { assignmentId: assignment.id });
                    }}
                    className="px-2 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-orange-700 dark:text-cyan-300 border border-orange-200/80 dark:border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Buka Presensi Mata Pelajaran"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-orange-600 dark:text-cyan-400" />
                    Presensi
                  </button>

                  <button
                    id={`btn-grades-${assignment.id}`}
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      onNavigate('grades');
                    }}
                    className="px-2 py-2.5 rounded-xl bg-accent-primary-soft hover:opacity-90 text-accent-text border border-accent-primary-border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Buka Buku Nilai"
                  >
                    <Award className="w-3.5 h-3.5 text-accent-primary" />
                    Nilai
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <MeetingFormModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        defaultAssignmentId={selectedAssignmentId}
        onSuccess={() => loadAssignmentsData()}
      />

      <SubjectAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setSelectedMeetingForAttendance(null);
        }}
        meeting={selectedMeetingForAttendance}
        onSuccess={() => loadAssignmentsData()}
      />
    </div>
  );
};

