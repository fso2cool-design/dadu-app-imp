import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getMeetings, deleteMeeting } from '../../services/firestore/meetings';
import { MeetingFormModal } from './MeetingFormModal';
import { SubjectAttendanceModal } from './SubjectAttendanceModal';
import { Meeting, TeachingAssignment, MeetingStatus } from '../../types';
import { SkeletonMeetingList } from '../../components/common/Skeleton';
import * as XLSX from 'xlsx';
import { 
  CalendarCheck2, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  CheckSquare, 
  Download, 
  Printer, 
  Clock, 
  BookOpen, 
  ChevronRight, 
  Layers, 
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface MeetingsJournalPageProps {
  initialAssignmentId?: string;
  onNavigate?: (route: string, state?: any) => void;
}

// In-memory module cache for instant SWR navigation without skeleton flicker
const meetingsJournalCache = new Map<string, Meeting[]>();

export const MeetingsJournalPage: React.FC<MeetingsJournalPageProps> = ({ 
  initialAssignmentId,
  onNavigate 
}) => {
  const { user } = useAuth();
  const { 
    teachingAssignments, 
    activeAcademicYear, 
    activeSemester, 
    selectedAssignment, 
    setSelectedAssignment,
    triggerSyncFeedback
  } = useWorkspace();

  const isArchivedYear = Boolean(activeAcademicYear?.isArchived);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialAssignmentId || selectedAssignment?.id || '');
  
  const currentCacheKey = `${user?.uid}_${activeAcademicYear?.id}_${activeSemester}_${selectedAssignmentId || 'ALL'}`;
  const cachedMeetings = meetingsJournalCache.get(currentCacheKey);

  const [meetings, setMeetings] = useState<Meeting[]>(cachedMeetings || []);
  const [loading, setLoading] = useState(!cachedMeetings);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] = useState<Meeting | null>(null);
  const [meetingForAttendance, setMeetingForAttendance] = useState<Meeting | null>(null);

  // Delete confirmation modal state
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync selectedAssignment when assignmentId changes
  const currentAssignment = useMemo(() => {
    return teachingAssignments.find(ta => ta.id === selectedAssignmentId) || null;
  }, [teachingAssignments, selectedAssignmentId]);

  const loadMeetings = async (silent = false) => {
    if (!user || !activeAcademicYear) return;
    const key = `${user.uid}_${activeAcademicYear.id}_${activeSemester}_${selectedAssignmentId || 'ALL'}`;
    const hasCache = meetingsJournalCache.has(key);
    
    try {
      if (!silent && !hasCache) {
        setLoading(true);
      }
      const data = await getMeetings(user.uid, {
        academicYearId: activeAcademicYear.id,
        semester: activeSemester,
        teachingAssignmentId: selectedAssignmentId || undefined,
      });
      meetingsJournalCache.set(key, data);
      setMeetings(data);
    } catch (err) {
      console.error('Error loading meetings journal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // When assignment, year, or semester changes, immediately use cached data if present
    const key = `${user?.uid}_${activeAcademicYear?.id}_${activeSemester}_${selectedAssignmentId || 'ALL'}`;
    const cached = meetingsJournalCache.get(key);
    if (cached) {
      setMeetings(cached);
      setLoading(false);
      // Quiet background revalidation
      loadMeetings(true);
    } else {
      loadMeetings(false);
    }
  }, [user, activeAcademicYear, activeSemester, selectedAssignmentId]);

  // Overall attendance calculation for current view
  const aggregateStats = useMemo(() => {
    const completed = meetings.filter(m => m.status === 'COMPLETED').length;
    let totalPresentSum = 0;
    let meetingWithAttCount = 0;

    meetings.forEach(m => {
      if (m.attendanceSummary && m.attendanceSummary.total > 0) {
        totalPresentSum += m.attendanceSummary.presentPercentage;
        meetingWithAttCount++;
      }
    });

    const avgAttendance = meetingWithAttCount > 0 
      ? Math.round(totalPresentSum / meetingWithAttCount) 
      : 0;

    return {
      totalMeetings: meetings.length,
      completedMeetings: completed,
      avgAttendance,
    };
  }, [meetings]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const matchSearch = 
        m.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.learningObjectives && m.learningObjectives.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.className && m.className.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.subjectName && m.subjectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        String(m.meetingNumber).includes(searchQuery);

      const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [meetings, searchQuery, statusFilter]);

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!user || !meetingToDelete) return;
    try {
      setIsDeleting(true);
      triggerSyncFeedback('syncing', 'Menghapus data pertemuan jurnal...');
      await deleteMeeting(user.uid, meetingToDelete.id);
      setMeetings(prev => {
        const next = prev.filter(m => m.id !== meetingToDelete.id);
        const key = `${user.uid}_${activeAcademicYear?.id}_${activeSemester}_${selectedAssignmentId || 'ALL'}`;
        meetingsJournalCache.set(key, next);
        return next;
      });
      triggerSyncFeedback('saved', 'Pertemuan berhasil dihapus.');
      setMeetingToDelete(null);
    } catch (err) {
      console.error('Error deleting meeting:', err);
      triggerSyncFeedback('synced');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredMeetings.length === 0) return;

    const exportRows = filteredMeetings.map((m, index) => ({
      'No': index + 1,
      'Pertemuan Ke-': m.meetingNumber,
      'Tanggal': m.date,
      'Jam Pelajaran': m.timeSlot || '-',
      'Kelas': m.className || '-',
      'Mata Pelajaran': m.subjectName || '-',
      'Materi Pokok / Pembahasan': m.topic,
      'Tujuan Pembelajaran (CP/TP)': m.learningObjectives || '-',
      'Ringkasan Aktivitas KBM': m.activities || '-',
      'Metode/Media': m.method || '-',
      'Status': m.status,
      'Siswa Hadir': m.attendanceSummary?.present ?? '-',
      'Siswa Sakit': m.attendanceSummary?.sick ?? '-',
      'Siswa Izin': m.attendanceSummary?.permitted ?? '-',
      'Siswa Alpa': m.attendanceSummary?.absent ?? '-',
      'Siswa Dispen': m.attendanceSummary?.dispensation ?? '-',
      '% Kehadiran': m.attendanceSummary ? `${m.attendanceSummary.presentPercentage}%` : 'Belum Ada',
      'Catatan / Refleksi': m.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Mengajar');

    const fileName = `Jurnal_Mengajar_${activeAcademicYear?.label.replace('/', '-')}_${activeSemester}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getStatusBadge = (status: MeetingStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">Terlaksana</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-[10px] border border-sky-500/20">Terjadwal</span>;
      case 'SUBSTITUTE':
        return <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[10px] border border-purple-500/20">Pengganti</span>;
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 font-bold text-[10px] border border-slate-500/20">Draft</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">Dibatalkan</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Historical Archive Banner */}
      {isArchivedYear && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Mode Arsip Historis (Read-Only):</span> Tahun Ajaran ini telah diarsipkan. Seluruh agenda jurnal KBM dan rekaman presensi dikunci demi integritas riwayat akademik.
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141722] p-6 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-accent-primary-soft text-accent-text border border-accent-primary-border">
              <CalendarCheck2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Agenda & Jurnal Mengajar</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Buku agenda harian KBM, capaian pembelajaran (CP/TP), dan rekapitulasi kehadiran siswa per tatap muka.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-journal-excel"
            onClick={handleExportExcel}
            disabled={filteredMeetings.length === 0}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#0c0e15] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel (.xlsx)
          </button>

          <button
            id="btn-create-new-meeting"
            disabled={isArchivedYear}
            onClick={() => {
              setMeetingToEdit(null);
              setIsFormModalOpen(true);
            }}
            title={isArchivedYear ? 'Tahun Ajaran ini telah diarsipkan (read-only)' : 'Catat Pertemuan Baru'}
            className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Catat Pertemuan Baru
          </button>
        </div>
      </div>

      {/* Snapshot KPI Digest */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {currentAssignment ? `Kelas ${currentAssignment.className}` : 'Semua Rombel'}
            </span>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {aggregateStats.completedMeetings} <span className="text-xs font-normal text-slate-400">Pertemuan Terlaksana</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-cyan-950/50 border border-orange-100 dark:border-cyan-500/30 text-orange-600 dark:text-cyan-400 flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Rata-rata Presensi
            </span>
            <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {aggregateStats.avgAttendance > 0 ? `${aggregateStats.avgAttendance}%` : '-'} <span className="text-xs font-normal text-slate-400">Kehadiran</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Mata Pelajaran
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate max-w-[180px]">
              {currentAssignment ? currentAssignment.subjectName : 'Semua Mapel'}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {currentAssignment && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssignment(currentAssignment);
                    onNavigate?.('attendance-subject', { assignmentId: currentAssignment.id });
                  }}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1b1f2e] dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Buka Presensi Rombel Ini"
                >
                  Presensi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssignment(currentAssignment);
                    onNavigate?.('grades');
                  }}
                  className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Buka Buku Nilai Rombel Ini"
                >
                  Nilai
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Assignment Selector */}
          <div className="w-full sm:w-64">
            <label htmlFor="select-assignment-journal" className="sr-only">Pilih Rombel & Mapel</label>
            <select
              id="select-assignment-journal"
              value={selectedAssignmentId}
              onChange={e => {
                const val = e.target.value;
                setSelectedAssignmentId(val);
                const found = teachingAssignments.find(ta => ta.id === val);
                if (found) setSelectedAssignment(found);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
            >
              <option value="">Semua Rombel & Mapel ({teachingAssignments.length})</option>
              {teachingAssignments.map(ta => (
                <option key={ta.id} value={ta.id}>
                  Kelas {ta.className} • {ta.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="w-full sm:w-44">
            <label htmlFor="select-status-journal" className="sr-only">Filter Status</label>
            <select
              id="select-status-journal"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0c0e15] focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="COMPLETED">Terlaksana</option>
              <option value="SCHEDULED">Terjadwal</option>
              <option value="SUBSTITUTE">Pengganti</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari materi pokok / topik..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <SkeletonMeetingList count={3} />
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white dark:bg-[#141722] p-12 text-center rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs">
          <CalendarCheck2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Agenda Pertemuan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            {searchQuery 
              ? 'Tidak ditemukan agenda pertemuan yang sesuai dengan kata kunci pencarian.'
              : 'Mulai dokumentasikan kegiatan belajar mengajar dengan mencatat pertemuan baru.'}
          </p>
          <button
            onClick={() => {
              setMeetingToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl btn-primary text-xs font-semibold transition-all cursor-pointer"
          >
            Catat Pertemuan Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => {
            const hasAttendance = meeting.attendanceSummary && meeting.attendanceSummary.total > 0;
            const att = meeting.attendanceSummary;

            return (
              <div
                key={meeting.id}
                className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs hover:border-accent-primary-border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Meeting Info */}
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="btn-primary px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                      Pertemuan #{meeting.meetingNumber}
                    </span>
                    {meeting.meetingType === 'MADRASAH_ACTIVITY' && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                        {meeting.activityCategory || 'Kegiatan Madrasah'}
                      </span>
                    )}
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0c0e15] border border-slate-200/60 dark:border-[#232838] px-2 py-0.5 rounded-md">
                      Kelas {meeting.className} • {meeting.subjectName}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {meeting.date}
                    </span>
                    {meeting.timeSlot && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {meeting.timeSlot}
                      </span>
                    )}
                    {getStatusBadge(meeting.status)}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                    {meeting.topic}
                  </h3>

                  {meeting.learningObjectives && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      <strong className="text-slate-600 dark:text-slate-300 font-semibold">CP/TP:</strong> {meeting.learningObjectives}
                    </p>
                  )}

                  {meeting.activities && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 italic">
                      <strong className="text-slate-500 dark:text-slate-400 font-medium">{meeting.meetingType === 'MADRASAH_ACTIVITY' ? 'Uraian Kegiatan:' : 'Aktivitas:'}</strong> {meeting.activities}
                    </p>
                  )}
                </div>

                {/* Right: Attendance Summary & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#232838]">
                  {/* Attendance badge */}
                  <div className={`px-3 py-2 rounded-xl border text-right min-w-[140px] ${
                    hasAttendance 
                      ? 'bg-slate-50 dark:bg-[#0c0e15] border-slate-200/80 dark:border-[#232838]' 
                      : meeting.meetingType === 'MADRASAH_ACTIVITY'
                      ? 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20'
                      : 'bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/30'
                  }`}>
                    {hasAttendance ? (
                      <div>
                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span className="text-emerald-600 dark:text-emerald-400">{att!.present} Hadir</span>
                          {att!.sick > 0 && <span className="text-amber-600 dark:text-amber-400">• {att!.sick} S</span>}
                          {att!.permitted > 0 && <span className="text-blue-600 dark:text-blue-400">• {att!.permitted} I</span>}
                          {att!.dispensation ? <span className="text-violet-600 dark:text-violet-400">• {att!.dispensation} D</span> : null}
                          {att!.absent > 0 && <span className="text-rose-600 dark:text-rose-400">• {att!.absent} A</span>}
                        </div>
                        <div className="text-[10px] text-orange-600 dark:text-cyan-400 font-semibold mt-0.5">
                          {att!.presentPercentage}% Kehadiran
                        </div>
                      </div>
                    ) : meeting.meetingType === 'MADRASAH_ACTIVITY' ? (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center justify-end gap-1">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Agenda Sah (Non-KBM)</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-end gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Presensi Belum Diisi</span>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setMeetingForAttendance(meeting);
                        setIsAttendanceModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-orange-600 dark:text-cyan-400 border border-orange-200/60 dark:border-cyan-500/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title={isArchivedYear ? 'Lihat Rekap Presensi (Read-Only)' : 'Input / Edit Presensi'}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      {isArchivedYear ? 'Lihat Presensi' : 'Presensi'}
                    </button>

                    <button
                      disabled={isArchivedYear}
                      onClick={() => {
                        setMeetingToEdit(meeting);
                        setIsFormModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1b1f2e] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isArchivedYear ? 'Arsip historis terkunci (read-only)' : 'Edit Jurnal Pertemuan'}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      disabled={isArchivedYear}
                      onClick={() => setMeetingToDelete(meeting)}
                      className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isArchivedYear ? 'Arsip historis terkunci (read-only)' : 'Hapus Pertemuan'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {meetingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#141722] rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-[#232838] space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Hapus Agenda Pertemuan?</h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-900 dark:text-white">Pertemuan #{meetingToDelete.meetingNumber} ({meetingToDelete.topic})</strong>? 
            </p>

            {/* Attendance Decoupled Preservation Notice */}
            {meetingToDelete.attendanceSummary && (meetingToDelete.attendanceSummary.totalRecords || meetingToDelete.attendanceSummary.total) > 0 ? (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Jaminan Integritas Presensi</span>
                </div>
                <p>
                  Pertemuan ini terhubung dengan <strong>{meetingToDelete.attendanceSummary.totalRecords || meetingToDelete.attendanceSummary.total} rekaman presensi siswa</strong>. Menghapus jurnal pertemuan ini <u>tidak akan menghapus data kehadiran siswa</u>. Rekaman kehadiran tetap aman tersimpan sebagai presensi mandiri.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pertemuan ini belum memiliki rekaman presensi siswa.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMeetingToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MeetingFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setMeetingToEdit(null);
        }}
        meetingToEdit={meetingToEdit}
        defaultAssignmentId={selectedAssignmentId}
        onSuccess={() => loadMeetings()}
      />

      <SubjectAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setMeetingForAttendance(null);
        }}
        meeting={meetingForAttendance}
        onSuccess={() => loadMeetings()}
      />
    </div>
  );
};
