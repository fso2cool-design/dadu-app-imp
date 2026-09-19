import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, StudentNote, DailyAttendanceRecord } from '../../types';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { getAllDailyAttendanceRecordsForClass } from '../../services/firestore/homeroomAttendance';
import { getStudentNotesByStudent, createStudentNote } from '../../services/firestore/studentNotes';
import { Modal } from '../../components/common/Modal';
import { StudentProgressReportModal } from '../students/StudentProgressReportModal';
import { StudentExamCardModal } from '../students/StudentExamCardModal';
import { StudentCustomPrintModal, StudentPrintItem } from '../students/StudentCustomPrintModal';
import { GenderBadge, GenderIcon } from '../../components/common/GenderIcon';
import { 
  Users, 
  Search, 
  FileSpreadsheet, 
  UserCheck, 
  Phone, 
  Home, 
  Calendar, 
  StickyNote, 
  Plus, 
  Award, 
  ShieldAlert, 
  Eye, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  CreditCard,
  FileText,
  UserX,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext';

interface HomeroomStudentsPageProps {
  onNavigate?: (route: string, state?: any) => void;
}

export const HomeroomStudentsPage: React.FC<HomeroomStudentsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId 
  } = useWorkspace();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');

  // Selected student for detail modal
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [studentNotesList, setStudentNotesList] = useState<StudentNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);

  // Modals for Progress Report & Custom Print Biodata
  const [progressReportModalOpen, setProgressReportModalOpen] = useState<boolean>(false);
  const [selectedProgressEnrollment, setSelectedProgressEnrollment] = useState<Enrollment | null>(null);
  const [isCustomPrintModalOpen, setIsCustomPrintModalOpen] = useState<boolean>(false);
  const [isExamCardModalOpen, setIsExamCardModalOpen] = useState<boolean>(false);
  const [selectedExamEnrollment, setSelectedExamEnrollment] = useState<Enrollment | null>(null);

  // Quick note modal
  const [noteModalOpen, setNoteModalOpen] = useState<boolean>(false);
  const [noteCategory, setNoteCategory] = useState<any>('BEHAVIOR');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteActionPlan, setNoteActionPlan] = useState<string>('');
  const [noteParentFollowUp, setNoteParentFollowUp] = useState<string>('');
  const [noteIsImportant, setNoteIsImportant] = useState<boolean>(false);
  const [savingNote, setSavingNote] = useState<boolean>(false);

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

  useEffect(() => {
    if (!user || !activeAcademicYear || !currentClass) {
      setEnrollments([]);
      setAttendanceRecords([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [enrs, atts] = await Promise.all([
          getEnrollmentsByClass(user!.uid, activeAcademicYear!.id, currentClass!.id),
          getAllDailyAttendanceRecordsForClass(user!.uid, currentClass!.id, activeAcademicYear!.id),
        ]);

        if (isMounted) {
          setEnrollments(enrs.filter(e => e.status === 'ACTIVE'));
          setAttendanceRecords(atts);
        }
      } catch (err) {
        console.error('Error loading class students:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user, activeAcademicYear, currentClass]);

  // Load notes when a student is selected
  useEffect(() => {
    if (!user || !selectedEnrollment) {
      setStudentNotesList([]);
      return;
    }

    let isMounted = true;
    async function loadNotes() {
      setLoadingNotes(true);
      try {
        const notes = await getStudentNotesByStudent(user!.uid, selectedEnrollment!.studentId);
        if (isMounted) setStudentNotesList(notes);
      } catch (err) {
        console.error('Error loading student notes:', err);
      } finally {
        if (isMounted) setLoadingNotes(false);
      }
    }

    loadNotes();
    return () => { isMounted = false; };
  }, [user, selectedEnrollment]);

  // Quick stats per student
  const studentStatsMap = useMemo(() => {
    const map = new Map<string, { present: number; sick: number; permitted: number; absent: number; total: number; rate: number }>();
    
    enrollments.forEach(e => {
      map.set(e.studentId, { present: 0, sick: 0, permitted: 0, absent: 0, total: 0, rate: 100 });
    });

    attendanceRecords.forEach(rec => {
      const stats = map.get(rec.studentId);
      if (stats) {
        stats.total++;
        if (rec.status === 'PRESENT' || rec.status === 'DISPENSATION') stats.present++;
        else if (rec.status === 'SICK') stats.sick++;
        else if (rec.status === 'PERMITTED') stats.permitted++;
        else if (rec.status === 'ABSENT') stats.absent++;
      }
    });

    map.forEach(stats => {
      if (stats.total > 0) {
        stats.rate = Math.round((stats.present / stats.total) * 100);
      }
    });

    return map;
  }, [enrollments, attendanceRecords]);

  // Formatted items for flexible student biodata print
  const studentsPrintList: StudentPrintItem[] = useMemo(() => {
    return enrollments.map(enr => ({
      student: enr.student || {
        id: enr.studentId,
        fullName: '',
        gender: 'L',
        status: 'ACTIVE',
        createdAt: null,
        updatedAt: null,
      },
      enrollment: enr,
      rollNumber: enr.rollNumber,
      className: currentClass?.name,
    }));
  }, [enrollments, currentClass]);

  // Filtered student list
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(e => {
      const nameMatch = !searchQuery ||
        e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.student?.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.student?.nisn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.rollNumber?.toString().includes(searchQuery);

      if (!nameMatch) return false;

      if (genderFilter === 'L') return e.student?.gender === 'L';
      if (genderFilter === 'P') return e.student?.gender === 'P';
      return true;
    });
  }, [enrollments, searchQuery, genderFilter]);

  // Save quick note for selected student
  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeAcademicYear || !currentClass || !selectedEnrollment || !noteContent.trim()) return;

    setSavingNote(true);
    try {
      const newNote = await createStudentNote(user.uid, {
        studentId: selectedEnrollment.studentId,
        studentName: selectedEnrollment.student?.fullName || '',
        rollNumber: selectedEnrollment.rollNumber,
        classId: currentClass.id,
        className: currentClass.name,
        academicYearId: activeAcademicYear.id,
        date: new Date().toISOString().split('T')[0],
        category: noteCategory,
        note: noteContent.trim(),
        actionPlan: noteActionPlan.trim(),
        parentFollowUp: noteParentFollowUp.trim(),
        isImportant: noteIsImportant,
      });

      setStudentNotesList(prev => [newNote, ...prev]);
      setNoteModalOpen(false);
      setNoteContent('');
      setNoteActionPlan('');
      setNoteParentFollowUp('');
      setNoteIsImportant(false);
      toastSuccess('Catatan pembinaan siswa berhasil disimpan.');
    } catch (err: any) {
      console.error('Error creating student note:', err);
      toastError('Gagal menyimpan catatan siswa.');
    } finally {
      setSavingNote(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (enrollments.length === 0) {
      toastWarning('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const dataRows = enrollments.map((enr, idx) => {
      const stats = studentStatsMap.get(enr.studentId) || { present: 0, sick: 0, permitted: 0, absent: 0, total: 0, rate: 100 };

      return {
        'No. Urut': enr.rollNumber || idx + 1,
        'NIS': enr.student?.nis || '',
        'NISN': enr.student?.nisn || '',
        'Nama Lengkap': enr.student?.fullName || '',
        'L/P': enr.student?.gender || 'L',
        'Tempat Lahir': enr.student?.birthPlace || '',
        'Tanggal Lahir': enr.student?.birthDate || '',
        'Nama Orang Tua / Wali': enr.student?.parentName || '',
        'No. HP / WA Orang Tua': enr.student?.parentPhone || '',
        'Alamat': enr.student?.address || '',
        'Total Hadir': stats.present,
        'Sakit': stats.sick,
        'Izin': stats.permitted,
        'Alpa': stats.absent,
        '% Kehadiran': `${stats.rate}%`,
        'Status Siswa': enr.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Data_Siswa_${currentClass?.name || ''}`);
    XLSX.writeFile(wb, `Data_Siswa_Kelas_${currentClass?.name || ''}_${activeAcademicYear?.label || ''}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#141722] p-5 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Data Siswa Kelas Binaan
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              T.A {activeAcademicYear?.label} • Sem {activeSemester}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {currentClass ? `Daftar Siswa Kelas ${currentClass.name}` : 'Daftar Siswa Binaan'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Biodata lengkap, kontak wali murid, dan riwayat profil siswa
          </p>
        </div>

        {currentClass && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="btn-print-student-biodata"
              onClick={() => setIsCustomPrintModalOpen(true)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Rekap Data Diri Siswa
            </button>

            <button
              type="button"
              id="btn-print-exam-cards"
              onClick={() => {
                setSelectedExamEnrollment(null);
                setIsExamCardModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Cetak Kartu Ujian Kelas
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Download Excel (.xlsx)
            </button>
          </div>
        )}
      </div>

      {!currentClass ? (
        <div className="bg-white dark:bg-[#141722] p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-[#232838] text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/50">
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
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Kembali ke Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('master-classes')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4" /> Atur Wali di Master Kelas
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Class Select */}
              <div className="flex items-center gap-2">
                <label htmlFor="student-class-select" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kelas:</label>
                <select
                  id="student-class-select"
                  value={currentClass?.id || 'NONE'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedClassId(val === 'NONE' ? '' : val);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NONE">-- Bukan Wali Kelas / Tidak Ada Binaan --</option>
                  {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name} {c.classTeacherId === user?.uid ? '⭐ (Binaan Saya)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setGenderFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    genderFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Semua ({enrollments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('L')}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    genderFilter === 'L' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <GenderIcon gender="L" size={14} className={`shrink-0 w-3.5 h-3.5 ${genderFilter === 'L' ? 'text-white' : 'text-sky-500'}`} />
                  <span>Laki-laki ({enrollments.filter(e => e.student?.gender === 'L').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter('P')}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    genderFilter === 'P' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <GenderIcon gender="P" size={14} className={`shrink-0 w-3.5 h-3.5 ${genderFilter === 'P' ? 'text-white' : 'text-rose-500'}`} />
                  <span>Perempuan ({enrollments.filter(e => e.student?.gender === 'P').length})</span>
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIS, atau NISN..."
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Student List Table */}
          <div className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5 w-12 text-center font-semibold">No</th>
                    <th className="py-3 px-3.5 w-28 font-semibold">NIS / NISN</th>
                    <th className="py-3 px-3.5 min-w-[200px] font-semibold">Nama Siswa</th>
                    <th className="py-3 px-2 w-12 text-center font-semibold">L/P</th>
                    <th className="py-3 px-3.5 min-w-[150px] font-semibold">Kontak Orang Tua</th>
                    <th className="py-3 px-3.5 min-w-[150px] font-semibold">Alamat Domisili</th>
                    <th className="py-3 px-3.5 text-center font-semibold">Kehadiran</th>
                    <th className="py-3 px-3.5 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        {loading ? 'Memuat data siswa...' : 'Tidak ada siswa ditemukan.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((enr) => {
                      const stats = studentStatsMap.get(enr.studentId) || { present: 0, sick: 0, permitted: 0, absent: 0, total: 0, rate: 100 };

                      return (
                        <tr key={enr.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3.5 text-center font-semibold text-slate-500 dark:text-slate-400">
                            {enr.rollNumber}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            <div>{enr.student?.nis || '-'}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">{enr.student?.nisn || ''}</div>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {enr.student?.fullName || '-'}
                            </span>
                            {enr.student?.birthDate && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                Lahir: {enr.student.birthPlace ? `${enr.student.birthPlace}, ` : ''}{enr.student.birthDate}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <GenderBadge gender={enr.student?.gender || 'L'} showLabel={false} size="sm" />
                          </td>
                          <td className="py-3 px-3.5 text-[11px]">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{enr.student?.parentName || '-'}</div>
                            {enr.student?.parentPhone ? (
                              <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                {enr.student.parentPhone}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-[11px] text-slate-600 dark:text-slate-400 max-w-[180px] truncate">
                            {enr.student?.address || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className={`font-bold ${
                              stats.rate < 80 ? 'text-rose-600 dark:text-rose-400' : stats.rate < 90 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                            }`}>
                              {stats.total > 0 ? `${stats.rate}%` : '-'}
                            </span>
                            <span className="block text-[10px] text-slate-400 dark:text-slate-500">
                              {stats.present} H • {stats.absent} A
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExamEnrollment(enr);
                                  setIsExamCardModalOpen(true);
                                }}
                                className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Cetak Kartu Ujian Siswa Ini"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span className="hidden xl:inline">Kartu</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProgressEnrollment(enr);
                                  setProgressReportModalOpen(true);
                                }}
                                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Rapor Sisipan & Kirim WA"
                              >
                                <FileText className="w-3 h-3" />
                                <span className="hidden xl:inline">Rapor</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedEnrollment(enr)}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Lihat Detail Profil"
                              >
                                <Eye className="w-3 h-3" />
                                <span className="hidden xl:inline">Profil</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Student Profile & History Modal */}
      {selectedEnrollment && (
        <Modal
          isOpen={!!selectedEnrollment}
          onClose={() => setSelectedEnrollment(null)}
          title={`Profil Siswa: ${selectedEnrollment.student?.fullName || ''}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Header Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">{selectedEnrollment.student?.fullName}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    selectedEnrollment.student?.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                  }`}>
                    {selectedEnrollment.student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: <span className="font-mono font-semibold text-slate-700">{selectedEnrollment.student?.nis || '-'}</span> • NISN: <span className="font-mono font-semibold text-slate-700">{selectedEnrollment.student?.nisn || '-'}</span> • No. Urut: {selectedEnrollment.rollNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setNoteModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Pembinaan
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Tempat & Tanggal Lahir</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {selectedEnrollment.student?.birthPlace ? `${selectedEnrollment.student.birthPlace}, ` : ''}{selectedEnrollment.student?.birthDate || '-'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Nama Orang Tua / Wali</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {selectedEnrollment.student?.parentName || '-'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">No. Telepon / WA Ortu</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {selectedEnrollment.student?.parentPhone || '-'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Alamat Domisili</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {selectedEnrollment.student?.address || '-'}
                </span>
              </div>
            </div>

            {/* Behavioral & Guidance Notes History */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <StickyNote className="w-4 h-4 text-purple-600" />
                  Riwayat Catatan Pembinaan & Karakter
                </h4>
                <span className="text-[11px] text-slate-500">
                  {studentNotesList.length} Catatan
                </span>
              </div>

              {loadingNotes ? (
                <p className="text-xs text-slate-400 py-3 text-center">Memuat catatan...</p>
              ) : studentNotesList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                  Belum ada catatan pembinaan khusus untuk siswa ini.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {studentNotesList.map(note => (
                    <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800">
                            {note.category}
                          </span>
                          {note.isImportant && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Urgent
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{note.date}</span>
                      </div>
                      <p className="text-slate-800">{note.note}</p>
                      {note.actionPlan && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                          <span className="font-bold">Tindak Lanjut:</span> {note.actionPlan}
                        </div>
                      )}
                      {note.parentFollowUp && (
                        <div className="text-[11px] text-blue-800 bg-blue-50 p-2 rounded-lg">
                          <span className="font-bold">Komunikasi Ortu:</span> {note.parentFollowUp}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Add Note Modal */}
      {noteModalOpen && (
        <Modal
          isOpen={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          title={`Catat Pembinaan: ${selectedEnrollment?.student?.fullName || ''}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveQuickNote} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori Catatan:</label>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as any)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              >
                <option value="BEHAVIOR">Perilaku / Sikap (Karakter)</option>
                <option value="ACADEMIC">Akademik / Prestasi Belajar</option>
                <option value="ATTENDANCE">Presensi & Kedisiplinan</option>
                <option value="ACHIEVEMENT">Prestasi & Penghargaan</option>
                <option value="ADMINISTRATIVE">Administratif / Kelengkapan</option>
                <option value="OTHER">Lainnya / Konseling</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-important-note"
                checked={noteIsImportant}
                onChange={(e) => setNoteIsImportant(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="is-important-note" className="font-semibold text-slate-800">
                Tandai sebagai Perlu Perhatian Khusus (Urgent)
              </label>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Isi Catatan / Kejadian:</label>
              <textarea
                rows={3}
                required
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Deskripsikan pengamatan, perilaku, atau kondisi siswa..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rencana Tindak Lanjut / Solusi (Opsional):</label>
              <textarea
                rows={2}
                value={noteActionPlan}
                onChange={(e) => setNoteActionPlan(e.target.value)}
                placeholder="Rencana pembinaan, bimbingan, atau tugas perbaikan..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tindak Lanjut Orang Tua (Opsional):</label>
              <input
                type="text"
                value={noteParentFollowUp}
                onChange={(e) => setNoteParentFollowUp(e.target.value)}
                placeholder="e.g. Dihubungi via WA / Surat Panggilan Orang Tua..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingNote}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Student Progress Report (Rapor Sisipan) Modal */}
      {selectedProgressEnrollment && (
        <StudentProgressReportModal
          isOpen={progressReportModalOpen}
          onClose={() => {
            setProgressReportModalOpen(false);
            setSelectedProgressEnrollment(null);
          }}
          enrollment={selectedProgressEnrollment}
          attendanceRecords={attendanceRecords}
          studentNotes={studentNotesList}
        />
      )}

      {/* Student Custom Print Modal (Rekap Data Diri Siswa Fleksibel) */}
      <StudentCustomPrintModal
        isOpen={isCustomPrintModalOpen}
        onClose={() => setIsCustomPrintModalOpen(false)}
        studentsList={studentsPrintList}
        selectedClass={currentClass}
      />

      {/* Student Exam Card Modal (Kartu Peserta Ujian / Asesmen) */}
      <StudentExamCardModal
        isOpen={isExamCardModalOpen}
        onClose={() => {
          setIsExamCardModalOpen(false);
          setSelectedExamEnrollment(null);
        }}
        enrollments={filteredEnrollments}
        selectedEnrollment={selectedExamEnrollment}
      />
    </div>
  );
};
