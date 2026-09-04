import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getMeetings } from '../../services/firestore/meetings';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { 
  getAttendanceRecordsByMeeting, 
  saveMeetingAttendance, 
  SaveAttendanceItem 
} from '../../services/firestore/attendance';
import { MeetingFormModal } from './MeetingFormModal';
import { UnsavedChangesModal } from '../../components/common/UnsavedChangesModal';
import { AttendanceHolidaysModal } from '../../components/common/AttendanceHolidaysModal';
import { Meeting, AttendanceStatus, AttendanceRecord, Enrollment } from '../../types';
import { TabNavigation } from '../../components/common/TabNavigation';
import { SkeletonTable, SkeletonStatsBar } from '../../components/common/Skeleton';
import * as XLSX from 'xlsx';
import { 
  CheckSquare, 
  Users, 
  Calendar, 
  Sparkles, 
  Save, 
  Search, 
  Download, 
  Plus, 
  Table, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface StudentRow {
  studentId: string;
  studentName: string;
  rollNumber: number;
  nis: string;
  gender: 'L' | 'P';
  status: AttendanceStatus;
  note: string;
  recordId?: string;
}

export const SubjectAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { teachingAssignments, activeAcademicYear, activeSemester, triggerSyncFeedback, checkIsHoliday } = useWorkspace();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'TAKE' | 'MATRIX'>('TAKE');

  // Meetings for selected assignment
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Take Attendance State
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Matrix Rekap State
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [allMeetingRecords, setAllMeetingRecords] = useState<Record<string, AttendanceRecord[]>>({});
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  // Quick Meeting Modal & Holiday Settings Modal
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Dirty state tracking for attendance input
  const initialRowsRef = useRef<string>('[]');
  const [isDirty, setIsDirty] = useState(false);
  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'assignment' | 'meeting' | 'tab'; targetValue: string } | null>(null);

  // Warning when leaving or reloading browser tab with unsaved attendance
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 1. Initial selection
  useEffect(() => {
    if (teachingAssignments.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(teachingAssignments[0].id);
    }
  }, [teachingAssignments]);

  // 2. Fetch meetings whenever assignment changes
  useEffect(() => {
    if (!user || !activeAcademicYear || !selectedAssignmentId) return;

    const fetchMeetings = async () => {
      try {
        setLoadingMeetings(true);
        const data = await getMeetings(user.uid, {
          academicYearId: activeAcademicYear.id,
          semester: activeSemester,
          teachingAssignmentId: selectedAssignmentId,
        });
        setMeetings(data);

        // Select latest meeting or first
        if (data.length > 0) {
          setSelectedMeetingId(data[data.length - 1].id);
        } else {
          setSelectedMeetingId('');
          setStudentRows([]);
        }
      } catch (err) {
        console.error('Error fetching meetings:', err);
      } finally {
        setLoadingMeetings(false);
      }
    };

    fetchMeetings();
  }, [user, activeAcademicYear, activeSemester, selectedAssignmentId]);

  // Selected Assignment details
  const currentAssignment = useMemo(() => {
    return teachingAssignments.find(t => t.id === selectedAssignmentId);
  }, [teachingAssignments, selectedAssignmentId]);

  // Selected Meeting details
  const currentMeeting = useMemo(() => {
    return meetings.find(m => m.id === selectedMeetingId);
  }, [meetings, selectedMeetingId]);

  const meetingHolidayInfo = useMemo(() => {
    return currentMeeting?.date ? checkIsHoliday(currentMeeting.date) : { isHoliday: false };
  }, [checkIsHoliday, currentMeeting]);

  // 3. Load students and attendance records when selected meeting changes
  useEffect(() => {
    if (!user || !activeAcademicYear || !currentAssignment || !selectedMeetingId) {
      setStudentRows([]);
      return;
    }

    const loadMeetingAttendance = async () => {
      try {
        setLoadingRows(true);
        setFeedbackMsg(null);

        // Enrolled students in class
        const enrollments = await getEnrollmentsByClass(
          user.uid,
          activeAcademicYear.id,
          currentAssignment.classId
        );

        // Existing records for this meeting
        const existingRecords = await getAttendanceRecordsByMeeting(user.uid, selectedMeetingId);
        const recordMap = new Map<string, AttendanceRecord>();
        existingRecords.forEach(r => recordMap.set(r.studentId, r));

        const rows: StudentRow[] = enrollments
          .filter(en => en.status === 'ACTIVE' && en.student)
          .map((en, idx) => {
            const stud = en.student!;
            const existing = recordMap.get(stud.id);
            return {
              studentId: stud.id,
              studentName: stud.fullName,
              rollNumber: en.rollNumber || (idx + 1),
              nis: stud.nis || '',
              gender: stud.gender || 'L',
              status: existing ? existing.status : 'PRESENT',
              note: existing?.note || '',
              recordId: existing?.id,
            };
          });

        rows.sort((a, b) => a.rollNumber - b.rollNumber);
        setStudentRows(rows);
        initialRowsRef.current = JSON.stringify(rows.map(r => ({ id: r.studentId, s: r.status, n: r.note })));
        setIsDirty(false);
      } catch (err) {
        console.error('Error loading attendance rows:', err);
      } finally {
        setLoadingRows(false);
      }
    };

    loadMeetingAttendance();
  }, [user, activeAcademicYear, currentAssignment, selectedMeetingId]);

  // 4. Load Matrix Data (all enrollments & all records for this class)
  useEffect(() => {
    if (activeTab !== 'MATRIX' || !user || !activeAcademicYear || !currentAssignment) return;

    const loadMatrixData = async () => {
      try {
        setLoadingMatrix(true);
        const enrollments = await getEnrollmentsByClass(
          user.uid,
          activeAcademicYear.id,
          currentAssignment.classId
        );
        setAllEnrollments(enrollments.filter(e => e.status === 'ACTIVE' && e.student));

        const recordsMap: Record<string, AttendanceRecord[]> = {};
        for (const m of meetings) {
          const recs = await getAttendanceRecordsByMeeting(user.uid, m.id);
          recordsMap[m.id] = recs;
        }
        setAllMeetingRecords(recordsMap);
      } catch (err) {
        console.error('Error loading matrix data:', err);
      } finally {
        setLoadingMatrix(false);
      }
    };

    loadMatrixData();
  }, [activeTab, user, activeAcademicYear, currentAssignment, meetings]);

  // Real-time counter metrics for current meeting
  const stats = useMemo(() => {
    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;
    let dispensation = 0;

    studentRows.forEach(r => {
      if (r.status === 'PRESENT') present++;
      else if (r.status === 'SICK') sick++;
      else if (r.status === 'PERMITTED') permitted++;
      else if (r.status === 'ABSENT') absent++;
      else if (r.status === 'DISPENSATION') dispensation++;
    });

    const total = studentRows.length;
    const percentage = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 0;

    return { present, sick, permitted, absent, dispensation, total, percentage };
  }, [studentRows]);

  // Handle single status change
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setStudentRows(prev => {
      const updated = prev.map(r => r.studentId === studentId ? { ...r, status: newStatus } : r);
      setIsDirty(JSON.stringify(updated.map(r => ({ id: r.studentId, s: r.status, n: r.note }))) !== initialRowsRef.current);
      return updated;
    });
  };

  // Handle note change
  const handleNoteChange = (studentId: string, newNote: string) => {
    setStudentRows(prev => {
      const updated = prev.map(r => r.studentId === studentId ? { ...r, note: newNote } : r);
      setIsDirty(JSON.stringify(updated.map(r => ({ id: r.studentId, s: r.status, n: r.note }))) !== initialRowsRef.current);
      return updated;
    });
  };

  // Set all Present
  const handleSetAllPresent = () => {
    setStudentRows(prev => {
      const updated = prev.map(r => ({ ...r, status: 'PRESENT' as const }));
      setIsDirty(JSON.stringify(updated.map(r => ({ id: r.studentId, s: r.status, n: r.note }))) !== initialRowsRef.current);
      return updated;
    });
  };

  // Save current meeting attendance
  const handleSaveAttendance = async () => {
    if (!user || !selectedMeetingId || studentRows.length === 0) return;

    try {
      setSavingAttendance(true);
      setFeedbackMsg(null);
      triggerSyncFeedback('syncing', 'Menyimpan presensi siswa ke cloud...');

      const items: SaveAttendanceItem[] = studentRows.map(r => ({
        id: r.recordId,
        studentId: r.studentId,
        rollNumber: r.rollNumber,
        studentName: r.studentName,
        gender: r.gender,
        status: r.status,
        note: r.note.trim(),
      }));

      const summary = await saveMeetingAttendance(user.uid, selectedMeetingId, items);

      // Update meeting attendanceSummary locally
      setMeetings(prev => prev.map(m => {
        if (m.id === selectedMeetingId) {
          return { ...m, attendanceSummary: summary, status: 'COMPLETED' };
        }
        return m;
      }));

      initialRowsRef.current = JSON.stringify(studentRows.map(r => ({ id: r.studentId, s: r.status, n: r.note })));
      setIsDirty(false);

      triggerSyncFeedback('saved', 'Presensi siswa berhasil disimpan!');
      setFeedbackMsg({ type: 'success', text: 'Presensi siswa berhasil disimpan ke database!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      triggerSyncFeedback('synced');
      setFeedbackMsg({ type: 'error', text: err.message || 'Gagal menyimpan presensi.' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAssignmentChange = (targetAssignmentId: string) => {
    if (targetAssignmentId === selectedAssignmentId) return;
    if (isDirty) {
      setPendingAction({ type: 'assignment', targetValue: targetAssignmentId });
      setIsDirtyModalOpen(true);
    } else {
      setSelectedAssignmentId(targetAssignmentId);
    }
  };

  const handleMeetingChange = (targetMeetingId: string) => {
    if (targetMeetingId === selectedMeetingId) return;
    if (isDirty) {
      setPendingAction({ type: 'meeting', targetValue: targetMeetingId });
      setIsDirtyModalOpen(true);
    } else {
      setSelectedMeetingId(targetMeetingId);
    }
  };

  const handleTabChange = (targetTab: 'TAKE' | 'MATRIX') => {
    if (targetTab === activeTab) return;
    if (isDirty) {
      setPendingAction({ type: 'tab', targetValue: targetTab });
      setIsDirtyModalOpen(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleSaveAndProceed = async () => {
    try {
      await handleSaveAttendance();
      if (pendingAction) {
        if (pendingAction.type === 'assignment') setSelectedAssignmentId(pendingAction.targetValue);
        else if (pendingAction.type === 'meeting') setSelectedMeetingId(pendingAction.targetValue);
        else if (pendingAction.type === 'tab') setActiveTab(pendingAction.targetValue as any);
        setPendingAction(null);
      }
      setIsDirtyModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardAndProceed = () => {
    setIsDirty(false);
    if (pendingAction) {
      if (pendingAction.type === 'assignment') setSelectedAssignmentId(pendingAction.targetValue);
      else if (pendingAction.type === 'meeting') setSelectedMeetingId(pendingAction.targetValue);
      else if (pendingAction.type === 'tab') setActiveTab(pendingAction.targetValue as any);
      setPendingAction(null);
    }
    setIsDirtyModalOpen(false);
  };

  // Filtered rows for take attendance
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return studentRows;
    const q = searchQuery.toLowerCase();
    return studentRows.filter(r => 
      r.studentName.toLowerCase().includes(q) ||
      r.nis.toLowerCase().includes(q) ||
      String(r.rollNumber).includes(q)
    );
  }, [studentRows, searchQuery]);

  // Export Rekap Matriks to Excel
  const handleExportMatrixExcel = () => {
    if (!currentAssignment || allEnrollments.length === 0) return;

    const rowsData = allEnrollments.map((en, idx) => {
      const stud = en.student!;
      const row: Record<string, any> = {
        'No': en.rollNumber || (idx + 1),
        'Nama Siswa': stud.fullName,
        'NIS': stud.nis || '-',
        'L/P': stud.gender || 'L',
      };

      let countH = 0;
      let countS = 0;
      let countI = 0;
      let countA = 0;
      let countD = 0;

      meetings.forEach(m => {
        const recs = allMeetingRecords[m.id] || [];
        const r = recs.find(rec => rec.studentId === stud.id);
        const colKey = `P${m.meetingNumber} (${m.date})`;
        if (r) {
          const statusShort = r.status === 'PRESENT' ? 'H' 
            : r.status === 'SICK' ? 'S' 
            : r.status === 'PERMITTED' ? 'I' 
            : r.status === 'ABSENT' ? 'A' 
            : 'D';
          row[colKey] = statusShort;

          if (r.status === 'PRESENT') countH++;
          else if (r.status === 'SICK') countS++;
          else if (r.status === 'PERMITTED') countI++;
          else if (r.status === 'ABSENT') countA++;
          else if (r.status === 'DISPENSATION') countD++;
        } else {
          row[colKey] = '-';
        }
      });

      row['Total Hadir (H)'] = countH;
      row['Total Sakit (S)'] = countS;
      row['Total Izin (I)'] = countI;
      row['Total Alpa (A)'] = countA;
      row['Total Dispen (D)'] = countD;

      const totalMeet = meetings.length;
      const pct = totalMeet > 0 ? Math.round(((countH + countD) / totalMeet) * 100) : 0;
      row['% Kehadiran'] = `${pct}%`;

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rowsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi Mapel');

    const fileName = `Rekap_Presensi_${currentAssignment.className}_${currentAssignment.subjectCode}_${activeAcademicYear?.label.replace('/', '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141722] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 dark:bg-cyan-950/60 text-orange-600 dark:text-cyan-400 border border-orange-200/60 dark:border-cyan-500/40">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">Presensi Siswa Mata Pelajaran</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pencatatan daftar hadir siswa per tatap muka dan rekapitulasi matriks kehadiran kelas mapel.
          </p>
        </div>

        {/* Tab switcher */}
        <TabNavigation
          tabs={[
            { id: 'TAKE', label: 'Input Presensi', icon: CheckSquare },
            { id: 'MATRIX', label: 'Rekap Matriks Presensi', icon: Table },
          ]}
          activeTab={activeTab}
          onChange={(id) => handleTabChange(id as 'TAKE' | 'MATRIX')}
          size="sm"
        />
      </div>

      {/* Assignment & Meeting Selector Bar */}
      <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
          {/* Assignment Selector */}
          <div className="w-full sm:w-64">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Rombel & Mata Pelajaran
            </label>
            <select
              value={selectedAssignmentId}
              onChange={e => handleAssignmentChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
            >
              {teachingAssignments.map(ta => (
                <option key={ta.id} value={ta.id}>
                  Kelas {ta.className} • {ta.subjectName} ({ta.subjectCode})
                </option>
              ))}
            </select>
          </div>

          {/* Meeting Selector (for Take Attendance tab) */}
          {activeTab === 'TAKE' && (
            <div className="w-full sm:w-80">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Pilih Pertemuan KBM
              </label>
              <div className="flex gap-1.5">
                <select
                  value={selectedMeetingId}
                  onChange={e => handleMeetingChange(e.target.value)}
                  disabled={meetings.length === 0}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 disabled:opacity-50 cursor-pointer"
                >
                  {meetings.length === 0 ? (
                    <option value="">Belum ada pertemuan</option>
                  ) : (
                    meetings.map(m => (
                      <option key={m.id} value={m.id}>
                        Pertemuan #{m.meetingNumber} ({m.date}) - {m.topic}
                      </option>
                    ))
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => setIsMeetingModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 text-orange-600 dark:text-cyan-400 border border-orange-200/60 dark:border-cyan-500/40 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                  title="Buat Pertemuan Baru"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Pertemuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(true)}
                  className="px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0c0e15] dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#232838] text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5"
                  title="Atur Kalender & Hari Libur Madrasah"
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                  <span className="hidden md:inline">Kalender & Libur</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab specific actions */}
        {activeTab === 'TAKE' ? (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-[#232838]">
            <button
              type="button"
              onClick={handleSetAllPresent}
              disabled={studentRows.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Set Semua Hadir (H)
            </button>

            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={savingAttendance || studentRows.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savingAttendance ? 'Menyimpan...' : 'Simpan Presensi'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-[#232838]">
            <button
              onClick={handleExportMatrixExcel}
              disabled={allEnrollments.length === 0 || meetings.length === 0}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Unduh Rekap Matriks (.xlsx)
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: INPUT PRESENSI PERTEMUAN */}
      {activeTab === 'TAKE' && (
        <div className="space-y-4">
          {/* Active Meeting Info Banner & Counters */}
          {currentMeeting && (
            <div className="p-4 bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs space-y-3 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#232838] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-orange-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-mono font-bold text-xs">
                      Pertemuan #{currentMeeting.meetingNumber}
                    </span>
                    <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {currentMeeting.topic}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <span>📅 {currentMeeting.date}</span>
                    {currentMeeting.timeSlot && (
                      <>
                        <span>•</span>
                        <span>⏰ {currentMeeting.timeSlot}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    stats.percentage >= 85 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/40' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/40'
                  }`}>
                    {stats.percentage}% Tingkat Kehadiran
                  </span>
                </div>
              </div>

              {/* Meeting on Holiday Warning */}
              {meetingHolidayInfo.isHoliday && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 text-amber-900 dark:text-amber-300 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Pemberitahuan Kalender:</strong> Tanggal pertemuan ({currentMeeting.date}) bertepatan dengan <u>{meetingHolidayInfo.reason}</u>.
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 font-semibold shrink-0">
                    Hari Non-Efektif
                  </span>
                </div>
              )}

              {/* Counter Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-100 dark:border-[#232838]">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Siswa</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{stats.total}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">Hadir (H)</span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">{stats.present}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">Sakit (S)</span>
                  <span className="font-bold text-amber-800 dark:text-amber-300 text-base">{stats.sick}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/40">
                  <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold block">Izin (I)</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300 text-base">{stats.permitted}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold block">Alpa (A)</span>
                  <span className="font-bold text-rose-800 dark:text-rose-300 text-base">{stats.absent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/40">
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold block">Dispensasi (D)</span>
                  <span className="font-bold text-purple-800 dark:text-purple-300 text-base">{stats.dispensation}</span>
                </div>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {feedbackMsg && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
            }`}>
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau nomor absen siswa..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#141722] border border-slate-200 dark:border-[#232838] text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 shadow-2xs transition-colors"
            />
          </div>

          {/* Interactive Attendance Table with Sticky Freeze Columns */}
          {loadingRows ? (
            <SkeletonTable rows={8} columns={5} />
          ) : (
            <div className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden transition-colors">
              {studentRows.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  {meetings.length === 0 ? (
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">Belum Ada Agenda Pertemuan untuk Kelas Ini</p>
                      <p className="text-slate-400 mt-1 mb-4">Buat agenda pertemuan terlebih dahulu untuk mulai mengambil presensi.</p>
                      <button
                        onClick={() => setIsMeetingModalOpen(true)}
                        className="px-4 py-2 rounded-xl bg-orange-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs hover:bg-orange-500 dark:hover:bg-cyan-400 cursor-pointer"
                      >
                        + Buat Pertemuan Baru
                      </button>
                    </div>
                  ) : (
                    <p>Tidak ada siswa aktif yang terdaftar di kelas ini.</p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-[#0c0e15] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-[#232838] sticky top-0 z-20">
                    <tr>
                      <th className="sticky left-0 z-30 bg-slate-50 dark:bg-[#0c0e15] py-3 px-4 w-12 text-center border-r border-slate-200 dark:border-[#232838]">No</th>
                      <th className="sticky left-12 z-30 bg-slate-50 dark:bg-[#0c0e15] py-3 px-4 min-w-[180px] sm:min-w-[220px] border-r border-slate-200 dark:border-[#232838]">Nama Siswa</th>
                      <th className="py-3 px-4 w-28 border-r border-slate-200 dark:border-[#232838]">NIS</th>
                      <th className="py-3 px-4 w-12 text-center border-r border-slate-200 dark:border-[#232838]">L/P</th>
                      <th className="py-3 px-4 w-60 text-center border-r border-slate-200 dark:border-[#232838]">Status Kehadiran</th>
                      <th className="py-3 px-4 w-64">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#232838] text-slate-600 dark:text-slate-300">
                    {filteredRows.map((row) => {
                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50/70 dark:hover:bg-[#1b1f2e] transition-colors group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-[#232838]">
                            {row.rollNumber}
                          </td>
                          <td className="sticky left-12 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] py-3 px-4 border-r border-slate-200 dark:border-[#232838]">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">{row.studentName}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-[#232838]">
                            {row.nis || '-'}
                          </td>
                          <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-[#232838]">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.gender === 'L' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' : 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-400'
                            }`}>
                              {row.gender}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center border-r border-slate-200 dark:border-[#232838]">
                            <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0c0e15] rounded-xl border border-slate-200/60 dark:border-[#232838]">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.studentId, 'PRESENT')}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  row.status === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1b1f2e] hover:text-emerald-600 dark:hover:text-emerald-400'
                                }`}
                                title="Hadir (H)"
                              >
                                H
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.studentId, 'SICK')}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  row.status === 'SICK'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1b1f2e] hover:text-amber-600 dark:hover:text-amber-400'
                                }`}
                                title="Sakit (S)"
                              >
                                S
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.studentId, 'PERMITTED')}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  row.status === 'PERMITTED'
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1b1f2e] hover:text-sky-600 dark:hover:text-sky-400'
                                }`}
                                title="Izin (I)"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.studentId, 'ABSENT')}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  row.status === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1b1f2e] hover:text-rose-600 dark:hover:text-rose-400'
                                }`}
                                title="Alpa (A)"
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(row.studentId, 'DISPENSATION')}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  row.status === 'DISPENSATION'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1b1f2e] hover:text-indigo-600 dark:hover:text-indigo-400'
                                }`}
                                title="Dispensasi (D)"
                              >
                                D
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={row.note}
                              onChange={e => handleNoteChange(row.studentId, e.target.value)}
                              placeholder="Keterangan..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 dark:focus:ring-cyan-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* TAB 2: REKAP MATRIKS KEHADIRAN SISWA */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden p-4 sm:p-5 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#232838] pb-3">
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Matriks Kehadiran Siswa Kelas {currentAssignment?.className} ({currentAssignment?.subjectName})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rekapitulasi kehadiran seluruh pertemuan KBM pada semester ini.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" /> H = Hadir
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> S = Sakit
              </span>
              <span className="flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400">
                <span className="w-2.5 h-2.5 rounded bg-sky-600 inline-block" /> I = Izin
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded bg-rose-600 inline-block" /> A = Alpa
              </span>
              <span className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block" /> D = Dispen
              </span>
            </div>
          </div>

          {loadingMatrix ? (
            <SkeletonTable rows={10} columns={8} />
          ) : allEnrollments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada siswa yang terdaftar di rombel kelas ini.
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum ada pertemuan yang dicatat untuk rombel ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-200 dark:border-[#232838]">
                <thead className="bg-slate-100 dark:bg-[#0c0e15] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-[#232838] sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-slate-100 dark:bg-[#0c0e15] py-2.5 px-3 border-r border-slate-200 dark:border-[#232838] w-10 text-center">No</th>
                    <th className="sticky left-10 z-30 bg-slate-100 dark:bg-[#0c0e15] py-2.5 px-3 border-r border-slate-200 dark:border-[#232838] min-w-[160px]">Nama Siswa</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-[#232838] w-10 text-center">L/P</th>
                    
                    {/* Columns for each meeting */}
                    {meetings.map(m => (
                      <th 
                        key={m.id} 
                        className="py-2 px-2 border-r border-slate-200 dark:border-[#232838] text-center font-mono text-[11px] min-w-[36px]"
                        title={`Pertemuan #${m.meetingNumber} (${m.date}): ${m.topic}`}
                      >
                        P{m.meetingNumber}
                      </th>
                    ))}

                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-[#232838] text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 w-10">H</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-[#232838] text-center text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/40 w-10">S</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-[#232838] text-center text-sky-700 dark:text-sky-400 bg-sky-50/70 dark:bg-sky-950/40 w-10">I</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-[#232838] text-center text-rose-700 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 w-10">A</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-[#232838] text-center text-indigo-700 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 w-10">D</th>
                    <th className="py-2.5 px-3 text-center bg-orange-50 dark:bg-cyan-950/60 text-orange-800 dark:text-cyan-300 font-bold w-16">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#232838]">
                  {allEnrollments.map((en, idx) => {
                    const stud = en.student!;
                    let countH = 0;
                    let countS = 0;
                    let countI = 0;
                    let countA = 0;
                    let countD = 0;

                    return (
                      <tr key={stud.id} className="hover:bg-slate-50 dark:hover:bg-[#1b1f2e] group">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] py-2 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-[#232838]">
                          {en.rollNumber || (idx + 1)}
                        </td>
                        <td className="sticky left-10 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] py-2 px-3 font-semibold text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-[#232838] whitespace-nowrap">
                          {stud.fullName}
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-[#232838] font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {stud.gender}
                        </td>

                        {/* Meeting cells */}
                        {meetings.map(m => {
                          const recs = allMeetingRecords[m.id] || [];
                          const r = recs.find(rec => rec.studentId === stud.id);
                          let statusShort = '-';
                          let cellClass = 'text-slate-300 dark:text-slate-600';

                          if (r) {
                            if (r.status === 'PRESENT') {
                              statusShort = 'H';
                              cellClass = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold';
                              countH++;
                            } else if (r.status === 'SICK') {
                              statusShort = 'S';
                              cellClass = 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold';
                              countS++;
                            } else if (r.status === 'PERMITTED') {
                              statusShort = 'I';
                              cellClass = 'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold';
                              countI++;
                            } else if (r.status === 'ABSENT') {
                              statusShort = 'A';
                              cellClass = 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold';
                              countA++;
                            } else if (r.status === 'DISPENSATION') {
                              statusShort = 'D';
                              cellClass = 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-bold';
                              countD++;
                            }
                          }

                          return (
                            <td 
                              key={m.id} 
                              className={`py-1.5 px-1 text-center border-r border-slate-200 dark:border-[#232838] font-mono text-xs ${cellClass}`}
                            >
                              {statusShort}
                            </td>
                          );
                        })}

                        {/* Summary totals */}
                        <td className="py-2 px-2 text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-r border-slate-200 dark:border-[#232838]">
                          {countH}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20 border-r border-slate-200 dark:border-[#232838]">
                          {countS}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-sky-700 dark:text-sky-400 bg-sky-50/40 dark:bg-sky-950/20 border-r border-slate-200 dark:border-[#232838]">
                          {countI}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-rose-700 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20 border-r border-slate-200 dark:border-[#232838]">
                          {countA}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-[#232838]">
                          {countD}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-orange-700 dark:text-cyan-400 bg-orange-50/50 dark:bg-cyan-950/30">
                          {meetings.length > 0 ? Math.round(((countH + countD) / meetings.length) * 100) : 0}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Meeting Modal */}
      <MeetingFormModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        defaultAssignmentId={selectedAssignmentId}
        onSuccess={(saved) => {
          setMeetings(prev => [...prev, saved]);
          setSelectedMeetingId(saved.id);
        }}
      />

      {/* Holiday Configuration Modal */}
      <AttendanceHolidaysModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={isDirtyModalOpen}
        onClose={() => {
          setIsDirtyModalOpen(false);
          setPendingAction(null);
        }}
        onDiscard={handleDiscardAndProceed}
        onSave={handleSaveAndProceed}
        title="Presensi Siswa Belum Disimpan"
        message="Terdapat perubahan status atau catatan kehadiran siswa yang belum disimpan ke database. Apakah Anda ingin menyimpannya sekarang?"
        saveButtonText="Simpan Presensi"
        discardButtonText="Buang Perubahan"
      />
    </div>
  );
};
