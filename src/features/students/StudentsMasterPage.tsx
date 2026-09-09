import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getStudents, deleteStudent, canDeleteStudent } from '../../services/firestore/students';
import { 
  getEnrollmentsByClass, 
  deleteEnrollment, 
  batchReorderRollNumbers,
  canDeleteEnrollment 
} from '../../services/firestore/enrollments';
import { Student, Enrollment, GenderType, StudentStatus } from '../../types';
import { ImportStudentsModal } from './ImportStudentsModal';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';
import { TransferClassModal } from './TransferClassModal';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { 
  Users, 
  Plus, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  ArrowRightLeft, 
  Phone, 
  ExternalLink,
  GraduationCap,
  Layers,
  Sparkles,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { downloadStudentExcelTemplate } from '../../utils/studentExcelTemplate';

interface StudentsMasterPageProps {
  isHomeroomView?: boolean;
}

export const StudentsMasterPage: React.FC<StudentsMasterPageProps> = ({ isHomeroomView = false }) => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const { 
    classes, 
    activeAcademicYear, 
    activeSemester, 
    selectedClassId, 
    setSelectedClassId,
    triggerSyncFeedback
  } = useWorkspace();

  // Active view: 'class' (enrollment) vs 'all' (master)
  const [viewMode, setViewMode] = useState<'class' | 'all'>(isHomeroomView ? 'class' : 'class');
  const [currentClassId, setCurrentClassId] = useState<string>(selectedClassId || classes[0]?.id || '');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  // Confirm dialog states
  const [confirmReorderOpen, setConfirmReorderOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ studentId: string; enrollmentId?: string; name: string } | null>(null);
  const [deleteBlockedModal, setDeleteBlockedModal] = useState<{
    name: string;
    reason: string;
    isEnrollment: boolean;
  } | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Sync selected class with workspace
  useEffect(() => {
    if (selectedClassId && selectedClassId !== currentClassId) {
      setCurrentClassId(selectedClassId);
    }
  }, [selectedClassId]);

  // Fetch data
  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allStuds = await getStudents(user.uid);
      setStudents(allStuds);

      if (currentClassId && activeAcademicYear) {
        const classEnrolls = await getEnrollmentsByClass(user.uid, activeAcademicYear.id, currentClassId, { status: 'ALL' });
        setEnrollments(classEnrolls);
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error('Error fetching students data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, currentClassId, activeAcademicYear]);

  // Filtered Class Enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(item => {
      const stud = item.student;
      if (!stud) return false;

      // Gender filter
      if (genderFilter !== 'ALL' && stud.gender !== genderFilter) return false;

      // Status filter (match enrollment status or student master status)
      if (statusFilter !== 'ALL') {
        if (item.status !== statusFilter && stud.status !== statusFilter) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = stud.fullName.toLowerCase().includes(q);
        const matchNis = stud.nis?.toLowerCase().includes(q);
        const matchNisn = stud.nisn?.toLowerCase().includes(q);
        const matchParent = stud.parentName?.toLowerCase().includes(q);
        return matchName || matchNis || matchNisn || matchParent;
      }

      return true;
    });
  }, [enrollments, genderFilter, statusFilter, searchQuery]);

  // Filtered All Master Students
  const filteredAllStudents = useMemo(() => {
    return students.filter(stud => {
      // Gender filter
      if (genderFilter !== 'ALL' && stud.gender !== genderFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && stud.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = stud.fullName.toLowerCase().includes(q);
        const matchNis = stud.nis?.toLowerCase().includes(q);
        const matchNisn = stud.nisn?.toLowerCase().includes(q);
        const matchParent = stud.parentName?.toLowerCase().includes(q);
        return matchName || matchNis || matchNisn || matchParent;
      }

      return true;
    });
  }, [students, genderFilter, statusFilter, searchQuery]);

  // Active stats
  const activeTargetList = viewMode === 'class' 
    ? filteredEnrollments.map(e => e.student).filter(Boolean) as Student[] 
    : filteredAllStudents;

  const totalCount = activeTargetList.length;
  const maleCount = activeTargetList.filter(s => s.gender === 'L').length;
  const femaleCount = activeTargetList.filter(s => s.gender === 'P').length;
  const activeCount = activeTargetList.filter(s => s.status === 'ACTIVE').length;

  const currentSelectedClassObj = classes.find(c => c.id === currentClassId);

  // Reorder roll numbers alphabetically
  const handleAutoReorderRollNumbers = () => {
    if (!user || enrollments.length === 0) return;
    setConfirmReorderOpen(true);
  };

  const executeAutoReorder = async () => {
    if (!user || enrollments.length === 0) return;
    try {
      setReordering(true);
      triggerSyncFeedback('syncing', 'Menyusun urutan nomor absen A-Z...');
      // Sort alphabetically
      const sorted = [...enrollments].sort((a, b) => {
        const nameA = a.student?.fullName || '';
        const nameB = b.student?.fullName || '';
        return nameA.localeCompare(nameB);
      });

      const sortedIds = sorted.map(s => s.id);
      await batchReorderRollNumbers(user.uid, sortedIds);
      await fetchData();
      triggerSyncFeedback('saved', 'Nomor absen berhasil diurutkan!');
      toastSuccess('Nomor absen berhasil diurutkan A-Z secara otomatis!');
      setConfirmReorderOpen(false);
    } catch (err: any) {
      console.error('Error reordering roll numbers:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyusun ulang nomor absen: ' + (err.message || 'Error'));
    } finally {
      setReordering(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = viewMode === 'class'
      ? filteredEnrollments.map((en, idx) => ({
          'No Absen': en.rollNumber || (idx + 1),
          'Nama Lengkap': en.student?.fullName || '',
          'NIS': en.student?.nis || '',
          'NISN': en.student?.nisn || '',
          'Jenis Kelamin': en.student?.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
          'Kelas': en.className || currentSelectedClassObj?.name || '',
          'Tempat Lahir': en.student?.birthPlace || '',
          'Tanggal Lahir': en.student?.birthDate || '',
          'No HP Siswa': en.student?.phone || '',
          'Nama Ortu/Wali': en.student?.parentName || '',
          'No HP Ortu': en.student?.parentPhone || '',
          'Alamat': en.student?.address || '',
          'Status': en.student?.status || 'ACTIVE',
        }))
      : filteredAllStudents.map((stud, idx) => ({
          'No': idx + 1,
          'Nama Lengkap': stud.fullName,
          'NIS': stud.nis || '',
          'NISN': stud.nisn || '',
          'Jenis Kelamin': stud.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)',
          'Tempat Lahir': stud.birthPlace || '',
          'Tanggal Lahir': stud.birthDate || '',
          'No HP Siswa': stud.phone || '',
          'Nama Ortu/Wali': stud.parentName || '',
          'No HP Ortu': stud.parentPhone || '',
          'Alamat': stud.address || '',
          'Status': stud.status,
        }));

    const title = viewMode === 'class'
      ? `Daftar_Siswa_Kelas_${currentSelectedClassObj?.name || 'Aktif'}_${activeAcademicYear?.label || 'TP'}`
      : `Master_Seluruh_Siswa_${activeAcademicYear?.label || 'TP'}`;

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  // Delete handler
  const handleDeleteStudent = async (studentId: string, enrollmentId?: string, name?: string) => {
    if (!user) return;
    try {
      if (enrollmentId) {
        const check = await canDeleteEnrollment(user.uid, enrollmentId);
        if (!check.canDelete) {
          setDeleteBlockedModal({
            name: name || 'Siswa ini',
            reason: check.reason || 'Penempatan kelas memiliki catatan presensi harian.',
            isEnrollment: true,
          });
          return;
        }
      } else {
        const check = await canDeleteStudent(user.uid, studentId);
        if (!check.canDelete) {
          setDeleteBlockedModal({
            name: name || 'Siswa ini',
            reason: check.reason || 'Siswa memiliki rekam akademik (penempatan kelas, presensi, atau nilai).',
            isEnrollment: false,
          });
          return;
        }
      }

      setStudentToDelete({
        studentId,
        enrollmentId,
        name: name || 'Siswa ini',
      });
    } catch (err: any) {
      console.error('Error verifying delete student:', err);
      toastError('Gagal memeriksa status data: ' + err.message);
    }
  };

  const executeDeleteStudent = async () => {
    if (!user || !studentToDelete) return;
    setDeletingStudent(true);
    try {
      triggerSyncFeedback('syncing', `Menghapus data ${studentToDelete.name}...`);
      if (studentToDelete.enrollmentId) {
        await deleteEnrollment(user.uid, studentToDelete.enrollmentId);
        triggerSyncFeedback('saved', 'Penempatan kelas dihapus.');
        toastSuccess(`Penempatan kelas untuk "${studentToDelete.name}" berhasil dihapus.`);
      } else {
        await deleteStudent(user.uid, studentToDelete.studentId);
        triggerSyncFeedback('saved', 'Data siswa dihapus permanen.');
        toastSuccess(`Data siswa "${studentToDelete.name}" berhasil dihapus permanen.`);
      }
      await fetchData();
      setStudentToDelete(null);
    } catch (err: any) {
      console.error('Error deleting student:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus data: ' + (err.message || 'Error'));
    } finally {
      setDeletingStudent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600 dark:text-red-400" />
            {isHomeroomView ? 'Data Siswa Binaan Wali Kelas' : 'Master Data Siswa & Rombel'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Kelola data induk siswa, penempatan rombongan belajar, nomor absen, dan import/export data.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedStudent(null);
              setSelectedEnrollment(null);
              setFormModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Siswa
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" /> Import Excel
          </button>

          <button
            type="button"
            onClick={() => downloadStudentExcelTemplate(classes.filter(c => c.academicYearId === activeAcademicYear?.id && !c.isArchived))}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Unduh format template Excel untuk data siswa beserta contoh kolom kelas"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Unduh Template
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Export (.xlsx)
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Total Siswa</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {viewMode === 'class' ? `Di Kelas ${currentSelectedClassObj?.name || 'Aktif'}` : 'Seluruh Database'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Laki-laki (L)</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{maleCount}</div>
          <span className="text-[11px] text-blue-400 mt-0.5 block">
            {totalCount > 0 ? `${Math.round((maleCount / totalCount) * 100)}% dari total` : '0%'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Perempuan (P)</span>
          <div className="text-2xl font-bold text-pink-600 mt-1">{femaleCount}</div>
          <span className="text-[11px] text-pink-400 mt-0.5 block">
            {totalCount > 0 ? `${Math.round((femaleCount / totalCount) * 100)}% dari total` : '0%'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Siswa Aktif</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          <span className="text-[11px] text-emerald-500 mt-0.5 block">Status Belajar Aktif</span>
        </div>
      </div>

      {/* Main Filter & View Controls Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs View Mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'class'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Per Rombel / Kelas ({enrollments.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Semua Siswa Master ({students.length})
            </button>
          </div>

          {/* Quick Order Button if in class view */}
          {viewMode === 'class' && enrollments.length > 0 && (
            <button
              type="button"
              disabled={reordering}
              onClick={handleAutoReorderRollNumbers}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-all self-start md:self-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {reordering ? 'Mengurutkan...' : 'Urutkan No. Absen A-Z'}
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIS, NISN..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Class Selector (if in Class View) */}
          {viewMode === 'class' ? (
            <div>
              <select
                value={currentClassId}
                onChange={e => {
                  setCurrentClassId(e.target.value);
                  setSelectedClassId(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name} (Tingkat {c.gradeLevel}){c.isArchived ? ' [Diarsipkan]' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center px-3 py-2 rounded-xl bg-slate-100 text-xs text-slate-500 font-medium">
              Tahun Ajaran: {activeAcademicYear?.label || 'Aktif'}
            </div>
          )}

          {/* Gender Filter */}
          <div>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700"
            >
              <option value="ALL">Semua Jenis Kelamin (L/P)</option>
              <option value="L">Laki-laki (L) saja</option>
              <option value="P">Perempuan (P) saja</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700"
            >
              <option value="ALL">Semua Status Siswa</option>
              <option value="ACTIVE">Aktif Belajar</option>
              <option value="INACTIVE">Nonaktif / Cuti</option>
              <option value="TRANSFERRED">Mutasi / Keluar</option>
              <option value="GRADUATED">Lulus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat data siswa dari Firestore...
          </div>
        ) : (viewMode === 'class' ? filteredEnrollments.length === 0 : filteredAllStudents.length === 0) ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">Belum Ada Data Siswa</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {viewMode === 'class' 
                ? `Belum ada siswa yang ditempatkan pada Kelas ${currentSelectedClassObj?.name || ''}. Tambah siswa baru atau impor dari file Excel.`
                : 'Belum ada siswa yang terdaftar di basis data madrasah Anda.'}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
              >
                Import via Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setSelectedEnrollment(null);
                  setFormModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
              >
                + Tambah Manual
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-700 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3.5 w-14 text-center">
                    {viewMode === 'class' ? 'Absen' : 'No'}
                  </th>
                  <th className="py-3 px-3.5">Nama Siswa</th>
                  <th className="py-3 px-3.5 w-28">NIS / NISN</th>
                  <th className="py-3 px-3.5 w-16 text-center">L/P</th>
                  {viewMode === 'all' && (
                    <th className="py-3 px-3.5">Status Kelas</th>
                  )}
                  <th className="py-3 px-3.5">Orang Tua / Wali</th>
                  <th className="py-3 px-3.5 w-24 text-center">Status</th>
                  <th className="py-3 px-3.5 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {viewMode === 'class' ? (
                  filteredEnrollments.map((en, idx) => {
                    const stud = en.student;
                    if (!stud) return null;
                    const waLink = stud.parentPhone ? `https://wa.me/${stud.parentPhone.replace(/[^0-9]/g, '')}` : null;

                    return (
                      <tr key={en.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-indigo-700">
                          {en.rollNumber || (idx + 1)}
                        </td>
                        <td className="py-3 px-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(stud);
                              setSelectedEnrollment(en);
                              setDetailModalOpen(true);
                            }}
                            className="font-bold text-slate-800 hover:text-indigo-600 text-left cursor-pointer transition-colors block"
                          >
                            {stud.fullName}
                          </button>
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            {(stud.birthPlace || stud.birthDate) && (
                              <span>
                                {stud.birthPlace ? `${stud.birthPlace}, ` : ''}{stud.birthDate || ''}
                              </span>
                            )}
                            {stud.address && (
                              <div className="text-slate-500 truncate max-w-xs text-[10px]" title={stud.address}>
                                📍 {stud.address}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                          <div>{stud.nis || '-'}</div>
                          <div className="text-[10px] text-slate-400">{stud.nisn || ''}</div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stud.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-pink-50 text-pink-700 border border-pink-100'
                          }`}>
                            {stud.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-700 font-medium">{stud.parentName || '-'}</div>
                          {stud.parentPhone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span>{stud.parentPhone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-0.5"
                                  title="Chat WhatsApp Orang Tua"
                                >
                                  <Phone className="w-2.5 h-2.5" /> WA
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {en.status === 'TRANSFERRED' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge variant="warning" size="sm">
                                Mutasi Rombel
                              </Badge>
                              {en.transferredToClassName && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  ke {en.transferredToClassName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant={en.status === 'ACTIVE' && stud.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                              {en.status === 'ACTIVE' && stud.status === 'ACTIVE' ? 'Aktif' : en.status || stud.status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(stud);
                                setSelectedEnrollment(en);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                              title="Lihat Detail Profil"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {en.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEnrollment(en);
                                  setTransferModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600"
                                title="Pindah / Mutasi Kelas"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(stud);
                                setSelectedEnrollment(en);
                                setFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                              title="Edit Data Siswa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {en.status !== 'TRANSFERRED' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(stud.id, en.id, stud.fullName)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                title="Hapus dari Kelas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  filteredAllStudents.map((stud, idx) => {
                    const waLink = stud.parentPhone ? `https://wa.me/${stud.parentPhone.replace(/[^0-9]/g, '')}` : null;
                    return (
                      <tr key={stud.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(stud);
                              setSelectedEnrollment(null);
                              setDetailModalOpen(true);
                            }}
                            className="font-bold text-slate-800 hover:text-indigo-600 text-left cursor-pointer transition-colors block"
                          >
                            {stud.fullName}
                          </button>
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            {(stud.birthPlace || stud.birthDate) && (
                              <span>
                                {stud.birthPlace ? `${stud.birthPlace}, ` : ''}{stud.birthDate || ''}
                              </span>
                            )}
                            {stud.address && (
                              <div className="text-slate-500 truncate max-w-xs text-[10px]" title={stud.address}>
                                📍 {stud.address}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500">
                          <div>{stud.nis || '-'}</div>
                          <div className="text-[10px] text-slate-400">{stud.nisn || ''}</div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stud.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {stud.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                          Master Siswa
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-700 font-medium">{stud.parentName || '-'}</div>
                          {stud.parentPhone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span>{stud.parentPhone}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <Badge variant={stud.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                            {stud.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(stud);
                                setSelectedEnrollment(null);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                              title="Lihat Detail Profil"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(stud);
                                setSelectedEnrollment(null);
                                setFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                              title="Edit Data Siswa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(stud.id, undefined, stud.fullName)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* Modals */}
      <ImportStudentsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setActionSuccessMsg('Data siswa berhasil diimpor!');
          setTimeout(() => setActionSuccessMsg(null), 3000);
        }}
        targetClassId={currentClassId}
      />

      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedStudent(null);
          setSelectedEnrollment(null);
        }}
        onSuccess={() => {
          fetchData();
          setActionSuccessMsg('Data siswa berhasil disimpan!');
          setTimeout(() => setActionSuccessMsg(null), 3000);
        }}
        studentToEdit={selectedStudent}
        existingEnrollment={selectedEnrollment}
        defaultClassId={currentClassId}
        suggestedRollNumber={enrollments.length + 1}
      />

      <StudentDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedStudent(null);
          setSelectedEnrollment(null);
        }}
        student={selectedStudent}
        enrollment={selectedEnrollment}
        onEdit={(stud) => {
          setSelectedStudent(stud);
          setFormModalOpen(true);
        }}
      />

      <TransferClassModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedEnrollment(null);
        }}
        onSuccess={() => {
          fetchData();
          toastSuccess('Siswa berhasil dipindahkan kelas!');
        }}
        enrollment={selectedEnrollment}
      />

      {/* Confirm Auto Reorder Roll Numbers */}
      <ConfirmDialog
        isOpen={confirmReorderOpen}
        onClose={() => setConfirmReorderOpen(false)}
        onConfirm={executeAutoReorder}
        title="Urutkan Nomor Absen Otomatis"
        message={
          <>
            Apakah Anda ingin menyusun ulang nomor absen siswa (1 s.d. selesai) di kelas ini secara berurutan sesuai abjad nama (A-Z)?
          </>
        }
        confirmLabel="Ya, Urutkan Sekarang"
        variant="primary"
        isLoading={reordering}
      />

      {/* Confirm Delete Student / Enrollment */}
      <ConfirmDialog
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={executeDeleteStudent}
        title={studentToDelete?.enrollmentId ? 'Hapus Siswa dari Kelas' : 'Hapus Siswa Permanen'}
        message={
          studentToDelete?.enrollmentId ? (
            <>
              Apakah Anda yakin ingin menghapus penempatan kelas untuk <strong className="font-semibold text-slate-800 dark:text-slate-100">&quot;{studentToDelete.name}&quot;</strong>? Siswa ini belum memiliki presensi di kelas ini dan akan tetap tersimpan di Master Data Siswa.
            </>
          ) : (
            <>
              Apakah Anda yakin ingin menghapus master siswa <strong className="font-semibold text-slate-800 dark:text-slate-100">&quot;{studentToDelete?.name}&quot;</strong> secara permanen? Siswa ini belum memiliki riwayat akademik dan aman untuk dihapus.
            </>
          )
        }
        confirmLabel={studentToDelete?.enrollmentId ? 'Hapus dari Kelas' : 'Hapus Siswa'}
        variant="danger"
        isLoading={deletingStudent}
      />

      {/* Delete Blocked Dialog */}
      <Modal
        isOpen={!!deleteBlockedModal}
        onClose={() => setDeleteBlockedModal(null)}
        title={deleteBlockedModal?.isEnrollment ? 'Penempatan Kelas Tidak Dapat Dihapus' : 'Data Siswa Dilindungi Tata Kelola'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold">Penghapusan Diblokir demi Integritas Data</p>
              <p className="mt-1 leading-relaxed">
                {deleteBlockedModal?.reason}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Menghapus data ini akan menyebabkan riwayat absensi, asesmen nilai, atau catatan bimbingan menjadi yatim (orphan) dan merusak rekapan rapor.
            Sebagai solusi yang aman:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-zinc-400 space-y-1 pl-1">
            <li>Untuk siswa yang pindah rombel, gunakan menu <strong>&quot;Mutasi / Pindah Kelas&quot;</strong>.</li>
            <li>Untuk siswa yang sudah lulus atau pindah sekolah, ubah status siswa menjadi <strong>&quot;Lulus&quot;</strong> atau <strong>&quot;Pindah&quot;</strong> melalui menu Edit Siswa.</li>
          </ul>

          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setDeleteBlockedModal(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
