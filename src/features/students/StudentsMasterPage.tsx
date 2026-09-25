import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  getStudentsPaginated, 
  searchStudentsByExactIdentifier,
  searchStudentsByNameToken,
  deleteStudent, 
  canDeleteStudent 
} from '../../services/firestore/students';
import { 
  getEnrollmentsByClass, 
  deleteEnrollment, 
  batchReorderRollNumbers,
  canDeleteEnrollment 
} from '../../services/firestore/enrollments';
import { Student, Enrollment, GenderType, StudentStatus, StudentCustomFieldDefinition } from '../../types';
import { getStudentCustomFields } from '../../services/firestore/studentCustomFields';
import { ImportStudentsModal } from './ImportStudentsModal';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';
import { TransferClassModal } from './TransferClassModal';
import { DeduplicateStudentsModal } from './DeduplicateStudentsModal';
import { StudentCustomPrintModal } from './StudentCustomPrintModal';
import { ManageCustomFieldsModal } from './ManageCustomFieldsModal';
import { StudentExamCardModal } from './StudentExamCardModal';
import { StudentProgressReportModal } from './StudentProgressReportModal';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { SkeletonTable } from '../../components/common/Skeleton';
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
  FileSpreadsheet,
  Sliders,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight
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
    reloadWorkspaceData,
    triggerSyncFeedback
  } = useWorkspace();

  // Active view: 'class' (enrollment) vs 'all' (master)
  const [viewMode, setViewMode] = useState<'class' | 'all'>(isHomeroomView ? 'class' : 'class');
  const [currentClassId, setCurrentClassId] = useState<string>(selectedClassId || classes[0]?.id || '');

  // Data states
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Firestore Native Pagination states for Master Students
  const PAGE_SIZE = 25;
  const [paginatedStudents, setPaginatedStudents] = useState<Student[]>([]);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageCursors, setPageCursors] = useState<any[]>([null]);
  const [loadingPagination, setLoadingPagination] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Search Results State for Exact Identifier Search
  const [searchResults, setSearchResults] = useState<Student[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deduplicateModalOpen, setDeduplicateModalOpen] = useState(false);
  const [customPrintModalOpen, setCustomPrintModalOpen] = useState(false);
  const [manageCustomFieldsOpen, setManageCustomFieldsOpen] = useState(false);
  const [examCardModalOpen, setExamCardModalOpen] = useState(false);
  const [progressReportModalOpen, setProgressReportModalOpen] = useState(false);

  // Dynamic Custom Field Definitions
  const [customFields, setCustomFields] = useState<StudentCustomFieldDefinition[]>([]);
  const visibleTableCustomFields = useMemo(
    () => customFields.filter(f => f.showInTable && f.isActive !== false),
    [customFields]
  );

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

  // Fetch Paginated Master Students with Firestore Cursor and Native Filters
  const fetchPaginatedStudents = async (
    targetPage: number = 0,
    cursorToUse?: any,
    currentCursorsList?: any[]
  ) => {
    if (!user) return;
    try {
      setLoadingPagination(true);
      const cursor = cursorToUse !== undefined ? cursorToUse : (pageCursors[targetPage] ?? null);
      const result = await getStudentsPaginated(user.uid, {
        pageSize: PAGE_SIZE,
        cursorDoc: cursor,
        status: statusFilter,
        gender: genderFilter,
      });

      setPaginatedStudents(result.students);
      setHasMorePages(result.hasMore);
      setPageIndex(targetPage);

      if (result.lastDoc) {
        setPageCursors(prev => {
          const list = currentCursorsList ? [...currentCursorsList] : [...prev];
          list[targetPage + 1] = result.lastDoc;
          return list;
        });
      }
    } catch (err) {
      console.error('Error fetching paginated students:', err);
    } finally {
      setLoadingPagination(false);
    }
  };

  // Reset pagination cursors and re-fetch page 0 when filters change in 'all' view
  useEffect(() => {
    if (viewMode === 'all' && user) {
      setPageIndex(0);
      setPageCursors([null]);
      fetchPaginatedStudents(0, null, [null]);
    }
  }, [genderFilter, statusFilter, viewMode, user]);

  // Debounced Search (Exact NIS/NISN + Name/Parent Token Search) with Firestore status/gender constraints
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setLoadingSearch(false);
      return;
    }

    if (viewMode === 'all' && user) {
      setLoadingSearch(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const filterOptions = {
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
            gender: genderFilter !== 'ALL' ? genderFilter : undefined,
            maxResults: 50,
            limitPerToken: 100,
          };

          // Cari paralel: exact identifier (NIS/NISN) dan word-prefix searchTokens (nama/orang tua)
          // Filter status dan gender diaplikasikan langsung pada query constraint Firestore
          const isNumeric = /^[0-9]+$/.test(trimmed);
          const [idResults, nameResults] = await Promise.all([
            isNumeric ? searchStudentsByExactIdentifier(user.uid, trimmed, filterOptions) : Promise.resolve([]),
            searchStudentsByNameToken(user.uid, trimmed, filterOptions),
          ]);

          // Gabungkan hasil dan deduplikasi berdasarkan student ID
          const resultMap = new Map<string, Student>();
          idResults.forEach(s => resultMap.set(s.id, s));
          nameResults.forEach(s => {
            if (!resultMap.has(s.id)) {
              resultMap.set(s.id, s);
            }
          });

          setSearchResults(Array.from(resultMap.values()));
        } catch (err) {
          console.error('Error during student search:', err);
          setSearchResults([]);
        } finally {
          setLoadingSearch(false);
        }
      }, 350);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, statusFilter, genderFilter, viewMode, user]);

  // Fetch data without full collection scan
  const fetchData = async (forceRefreshStudents = false) => {
    if (!user) return;
    try {
      if (customFields.length === 0 || forceRefreshStudents) {
        const fetchedFields = await getStudentCustomFields(user.uid).catch(() => [] as StudentCustomFieldDefinition[]);
        setCustomFields(fetchedFields);
      }

      if (forceRefreshStudents && viewMode === 'all') {
        setPageIndex(0);
        setPageCursors([null]);
        fetchPaginatedStudents(0, null, [null]);
      }

      if (currentClassId && activeAcademicYear) {
        setLoading(true);
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

  // Initial load or view mode switch for paginated students
  useEffect(() => {
    if (viewMode === 'all' && paginatedStudents.length === 0 && user) {
      fetchPaginatedStudents(0, null, [null]);
    }
  }, [viewMode, user]);

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

      // Search query (in class view, local filter over class enrollments)
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

  // Is Search Active in All View
  const isSearchActive = searchQuery.trim() !== '';

  // Master Students list to display:
  // - If searching NIS/NISN/Name: show searchResults (targeted query with status & gender constrained in Firestore)
  // - If browsing: show paginatedStudents (native Firestore paginated + filtered)
  const filteredAllStudents = useMemo(() => {
    if (isSearchActive) {
      return searchResults || [];
    }
    return paginatedStudents;
  }, [isSearchActive, searchResults, paginatedStudents]);

  // Active stats
  const activeTargetList = viewMode === 'class' 
    ? filteredEnrollments.map(e => e.student).filter(Boolean) as Student[] 
    : filteredAllStudents;

  const totalCount = activeTargetList.length;
  const maleCount = activeTargetList.filter(s => s.gender === 'L').length;
  const femaleCount = activeTargetList.filter(s => s.gender === 'P').length;
  const activeCount = activeTargetList.filter(s => s.status === 'ACTIVE').length;

  const currentSelectedClassObj = classes.find(c => c.id === currentClassId);

  // Data terstruktur untuk cetak info siswa lengkap dengan kustomisasi kolom
  const printItems = useMemo(() => {
    if (viewMode === 'class') {
      return filteredEnrollments
        .filter(en => en.student)
        .map((en, idx) => ({
          student: en.student!,
          enrollment: en,
          rollNumber: en.rollNumber || (idx + 1),
          className: en.className || currentSelectedClassObj?.name,
        }));
    } else {
      return filteredAllStudents.map((stud, idx) => ({
        student: stud,
        rollNumber: idx + 1,
      }));
    }
  }, [viewMode, filteredEnrollments, filteredAllStudents, currentSelectedClassObj]);

  // Deteksi duplikasi siswa pada rombel aktif atau halaman aktif master secara real-time
  const duplicateDetected = useMemo(() => {
    const listToCheck = viewMode === 'class'
      ? enrollments.map(e => e.student).filter(Boolean) as Student[]
      : paginatedStudents;

    const seenNis = new Set<string>();
    const seenNisn = new Set<string>();
    const seenNames = new Set<string>();

    for (const s of listToCheck) {
      const nis = s.nis?.trim().toLowerCase();
      const nisn = s.nisn?.trim().toLowerCase();
      const name = s.fullName?.trim().toLowerCase().replace(/\s+/g, ' ');

      if (nis && seenNis.has(nis)) return true;
      if (nis) seenNis.add(nis);

      if (nisn && seenNisn.has(nisn)) return true;
      if (nisn) seenNisn.add(nisn);

      if (name && seenNames.has(name)) return true;
      if (name) seenNames.add(name);
    }
    return false;
  }, [viewMode, enrollments, paginatedStudents]);

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
          'NIK Siswa': en.student?.nikSiswa || '',
          'NIK Ibu': en.student?.nikIbu || '',
          'NKK': en.student?.nkk || '',
          'Status': en.student?.status || 'ACTIVE',
          ...customFields.reduce((acc, f) => {
            acc[f.name] = en.student?.customAttributes?.[f.key] ?? en.student?.customAttributes?.[f.name] ?? '';
            return acc;
          }, {} as Record<string, string>),
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
          'NIK Siswa': stud.nikSiswa || '',
          'NIK Ibu': stud.nikIbu || '',
          'NKK': stud.nkk || '',
          'Status': stud.status,
          ...customFields.reduce((acc, f) => {
            acc[f.name] = stud.customAttributes?.[f.key] ?? stud.customAttributes?.[f.name] ?? '';
            return acc;
          }, {} as Record<string, string>),
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
      await fetchData(true);
      reloadWorkspaceData();
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
            className="btn-primary px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Siswa
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Import Excel
          </button>

          <button
            type="button"
            onClick={() => downloadStudentExcelTemplate(classes.filter(c => c.academicYearId === activeAcademicYear?.id && !c.isArchived), customFields)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Unduh format template Excel untuk data siswa beserta kolom kustom dan contoh kelas"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Unduh Template
          </button>

          <button
            type="button"
            onClick={() => setManageCustomFieldsOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Kelola kolom kustom tambahan siswa (KIP/PIP, No Registrasi, Asal Sekolah, dsb)"
          >
            <Sliders className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" /> Kolom Kustom {customFields.length > 0 ? `(${customFields.length})` : ''}
          </button>

          <button
            type="button"
            onClick={() => setDeduplicateModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
              duplicateDetected
                ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 ring-2 ring-amber-400/50'
                : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="Pindai dan bersihkan data siswa ganda di Firestore tanpa meninggalkan residu"
          >
            <Sparkles className={`w-3.5 h-3.5 ${duplicateDetected ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} />
            {duplicateDetected ? 'Bersihkan Duplikat (!)' : 'Deduplikasi'}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export (.xlsx)
          </button>

          <button
            type="button"
            onClick={() => setCustomPrintModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Cetak informasi data siswa lengkap dengan kop resmi dan kustomisasi kolom"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Cetak Data Siswa
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedEnrollment(null);
              setExamCardModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Lihat & Cetak Kartu Pelajar Siswa (Virtual Pass / ID Card)"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Kartu Pelajar Siswa
          </button>
        </div>
      </div>

      {/* Alert Terdeteksi Duplikasi */}
      {duplicateDetected && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl text-xs text-amber-950 dark:text-amber-200 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-200 text-xs sm:text-sm">Terdeteksi Data Siswa Ganda di Tampilan Ini</p>
              <p className="text-amber-800 dark:text-amber-300/90 text-[11px] mt-0.5">
                Terdapat siswa dengan NIS atau Nama yang sama. Gunakan fitur <strong>Pembersihan Data Ganda</strong> untuk menggabungkan data terlengkap dan menghapus seluruh residu pendaftaran ganda di database.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeduplicateModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Bersihkan Data Ganda
          </button>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-[#232838] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">Total Siswa</span>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalCount}</div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            {viewMode === 'class' 
              ? `Di Kelas ${currentSelectedClassObj?.name || 'Aktif'}` 
              : isSearchActive 
                ? 'Hasil Pencarian' 
                : 'Halaman Ini'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-[#232838] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">Laki-laki (L)</span>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{maleCount}</div>
          <span className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 block">
            {totalCount > 0 ? `${Math.round((maleCount / totalCount) * 100)}% dari total` : '0%'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-[#232838] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">Perempuan (P)</span>
          <div className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-1">{femaleCount}</div>
          <span className="text-[11px] text-pink-500 dark:text-pink-400 mt-0.5 block">
            {totalCount > 0 ? `${Math.round((femaleCount / totalCount) * 100)}% dari total` : '0%'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-[#232838] rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">Siswa Aktif</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">Status Belajar Aktif</span>
        </div>
      </div>

      {/* Main Filter & View Controls Bar */}
      <div className="bg-white dark:bg-[#141722] border border-slate-200/80 dark:border-[#232838] rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs View Mode */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/90 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'class'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Per Rombel / Kelas ({enrollments.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Siswa Master
            </button>
          </div>

          {/* Quick Order Button if in class view & Quick Deduplication */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {viewMode === 'class' && enrollments.length > 0 && (
              <button
                type="button"
                disabled={reordering}
                onClick={handleAutoReorderRollNumbers}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {reordering ? 'Mengurutkan...' : 'Urutkan No. Absen A-Z'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setDeduplicateModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                duplicateDetected
                  ? 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Pindai dan bersihkan data siswa ganda di Firestore tanpa residu"
            >
              <Sparkles className={`w-3.5 h-3.5 ${duplicateDetected ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`} />
              {duplicateDetected ? 'Bersihkan Duplikat (!)' : 'Cek Duplikat'}
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIS, NISN, atau orang tua..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
            {loadingSearch && (
              <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin absolute right-3 top-2.5" />
            )}
            {!loadingSearch && searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer p-0.5"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
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
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    Kelas {c.name} (Tingkat {c.gradeLevel}){c.isArchived ? ' [Diarsipkan]' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
              Tahun Ajaran: {activeAcademicYear?.label || 'Aktif'}
            </div>
          )}

          {/* Gender Filter */}
          <div>
            <select
              value={genderFilter}
              onChange={e => setGenderFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Semua Jenis Kelamin (L/P)</option>
              <option value="L" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Laki-laki (L) saja</option>
              <option value="P" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Perempuan (P) saja</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Semua Status Siswa</option>
              <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Aktif Belajar</option>
              <option value="INACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Nonaktif / Cuti</option>
              <option value="TRANSFERRED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Mutasi / Keluar</option>
              <option value="GRADUATED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Lulus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={8} columns={6} />
          </div>
        ) : (viewMode === 'class' ? filteredEnrollments.length === 0 : filteredAllStudents.length === 0) ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              {isSearchActive ? 'Siswa Tidak Ditemukan' : 'Belum Ada Data Siswa'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {isSearchActive
                ? `Tidak ada siswa yang cocok dengan kata kunci "${searchQuery}". Coba periksa kembali ejaan nama, NIS, NISN, atau nama orang tua.`
                : viewMode === 'class' 
                  ? `Belum ada siswa yang ditempatkan pada Kelas ${currentSelectedClassObj?.name || ''}. Tambah siswa baru atau impor dari file Excel.`
                  : 'Belum ada siswa yang terdaftar di basis data madrasah Anda.'}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-accent-primary-soft text-accent-text text-xs font-semibold hover:opacity-90 transition-colors cursor-pointer"
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
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                + Tambah Manual
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 w-14 text-center font-semibold">
                    {viewMode === 'class' ? 'Absen' : 'No'}
                  </th>
                  <th className="py-3 px-3.5 font-semibold">Nama Siswa</th>
                  <th className="py-3 px-3.5 w-28 font-semibold">NIS / NISN</th>
                  <th className="py-3 px-3.5 w-16 text-center font-semibold">L/P</th>
                  {viewMode === 'all' && (
                    <th className="py-3 px-3.5 font-semibold">Status Kelas</th>
                  )}
                  <th className="py-3 px-3.5 font-semibold">Orang Tua / Wali</th>
                  {visibleTableCustomFields.map(f => (
                    <th key={f.id} className="py-3 px-3.5 whitespace-nowrap text-amber-900 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/50 font-semibold border-x border-amber-200/70 dark:border-amber-900/50">
                      {f.name}
                    </th>
                  ))}
                  <th className="py-3 px-3.5 w-24 text-center font-semibold">Status</th>
                  <th className="py-3 px-3.5 w-28 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {viewMode === 'class' ? (
                  filteredEnrollments.map((en, idx) => {
                    const stud = en.student;
                    if (!stud) return null;
                    const waLink = stud.parentPhone ? `https://wa.me/${stud.parentPhone.replace(/[^0-9]/g, '')}` : null;

                    return (
                      <tr key={en.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
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
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer transition-colors block"
                          >
                            {stud.fullName}
                          </button>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5">
                            {(stud.birthPlace || stud.birthDate) && (
                              <span>
                                {stud.birthPlace ? `${stud.birthPlace}, ` : ''}{stud.birthDate || ''}
                              </span>
                            )}
                            {stud.address && (
                              <div className="text-slate-500 dark:text-slate-400 truncate max-w-xs text-[10px]" title={stud.address}>
                                📍 {stud.address}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                          <div>{stud.nis || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{stud.nisn || ''}</div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stud.gender === 'L' 
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                              : 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                          }`}>
                            {stud.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">{stud.parentName || '-'}</div>
                          {stud.parentPhone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{stud.parentPhone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold inline-flex items-center gap-0.5"
                                  title="Chat WhatsApp Orang Tua"
                                >
                                  <Phone className="w-2.5 h-2.5" /> WA
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                        {visibleTableCustomFields.map(f => {
                          const val = stud.customAttributes?.[f.key] ?? stud.customAttributes?.[f.name];
                          return (
                            <td key={f.id} className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-800 dark:text-slate-200 font-medium bg-amber-50/40 dark:bg-amber-950/20 border-x border-amber-200/40 dark:border-amber-900/40">
                              {val || <span className="text-slate-400 dark:text-slate-500 font-normal italic">-</span>}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3.5 text-center">
                          {en.status === 'TRANSFERRED' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge variant="warning" size="sm">
                                Mutasi Rombel
                              </Badge>
                              {en.transferredToClassName && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
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
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
                              title="Lihat Detail Profil"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(stud);
                                setSelectedEnrollment(en);
                                setExamCardModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                              title="Lihat Kartu Pelajar Siswa"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudent(stud);
                                setSelectedEnrollment(en);
                                setProgressReportModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                              title="Rapor Sisipan & Kirim WA"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {en.status === 'ACTIVE' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEnrollment(en);
                                  setTransferModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
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
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
                              title="Edit Data Siswa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {en.status !== 'TRANSFERRED' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(stud.id, en.id, stud.fullName)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
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
                    const rowNumber = isSearchActive ? idx + 1 : pageIndex * PAGE_SIZE + (idx + 1);
                    return (
                      <tr key={stud.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono text-slate-500 dark:text-slate-400 font-semibold">
                          {rowNumber}
                        </td>
                        <td className="py-3 px-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudent(stud);
                              setSelectedEnrollment(null);
                              setDetailModalOpen(true);
                            }}
                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer transition-colors block"
                          >
                            {stud.fullName}
                          </button>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5 mt-0.5">
                            {(stud.birthPlace || stud.birthDate) && (
                              <span>
                                {stud.birthPlace ? `${stud.birthPlace}, ` : ''}{stud.birthDate || ''}
                              </span>
                            )}
                            {stud.address && (
                              <div className="text-slate-500 dark:text-slate-400 truncate max-w-xs text-[10px]" title={stud.address}>
                                📍 {stud.address}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                          <div>{stud.nis || '-'}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{stud.nisn || ''}</div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stud.gender === 'L' 
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                              : 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800'
                          }`}>
                            {stud.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                          Master Siswa
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">{stud.parentName || '-'}</div>
                          {stud.parentPhone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{stud.parentPhone}</span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold inline-flex items-center gap-0.5"
                                  title="Chat WhatsApp Orang Tua"
                                >
                                  <Phone className="w-2.5 h-2.5" /> WA
                                </a>
                              )}
                            </div>
                          )}
                        </td>
                        {visibleTableCustomFields.map(f => {
                          const val = stud.customAttributes?.[f.key] ?? stud.customAttributes?.[f.name];
                          return (
                            <td key={f.id} className="py-3 px-3.5 whitespace-nowrap text-xs text-slate-800 dark:text-slate-200 font-medium bg-amber-50/40 dark:bg-amber-950/20 border-x border-amber-200/40 dark:border-amber-900/40">
                              {val || <span className="text-slate-400 dark:text-slate-500 font-normal italic">-</span>}
                            </td>
                          );
                        })}
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
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
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
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
                              title="Edit Data Siswa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(stud.id, undefined, stud.fullName)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
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

        {/* Pagination Controls for Master Students (when in 'all' view and not searching) */}
        {viewMode === 'all' && !loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 rounded-b-2xl">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {isSearchActive ? (
                <span>
                  Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-100">{filteredAllStudents.length}</span> siswa hasil pencarian "{searchQuery}"
                </span>
              ) : (
                <span>
                  Halaman <span className="font-semibold text-slate-800 dark:text-slate-100">{pageIndex + 1}</span> (Menampilkan {paginatedStudents.length} siswa per halaman)
                </span>
              )}
            </div>

            {!isSearchActive && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (pageIndex > 0) {
                      fetchPaginatedStudents(pageIndex - 1);
                    }
                  }}
                  disabled={pageIndex === 0 || loadingPagination}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sebelumnya
                </button>

                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                  {pageIndex + 1}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (hasMorePages) {
                      fetchPaginatedStudents(pageIndex + 1);
                    }
                  }}
                  disabled={!hasMorePages || loadingPagination}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                >
                  Berikutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ImportStudentsModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          fetchData(true);
          reloadWorkspaceData();
          setActionSuccessMsg('Data siswa berhasil diimpor!');
          setTimeout(() => setActionSuccessMsg(null), 3000);
        }}
        targetClassId={currentClassId}
        customFields={customFields}
      />

      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedStudent(null);
          setSelectedEnrollment(null);
        }}
        onSuccess={() => {
          fetchData(true);
          reloadWorkspaceData();
          setActionSuccessMsg('Data siswa berhasil disimpan!');
          setTimeout(() => setActionSuccessMsg(null), 3000);
        }}
        studentToEdit={selectedStudent}
        existingEnrollment={selectedEnrollment}
        defaultClassId={currentClassId}
        suggestedRollNumber={enrollments.length + 1}
        customFields={customFields}
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
        onPrintExamCard={(en) => {
          setSelectedEnrollment(en);
          setExamCardModalOpen(true);
        }}
        onOpenProgressReport={(en) => {
          setSelectedEnrollment(en);
          setProgressReportModalOpen(true);
        }}
        customFields={customFields}
      />

      <ManageCustomFieldsModal
        isOpen={manageCustomFieldsOpen}
        onClose={() => setManageCustomFieldsOpen(false)}
        customFields={customFields}
        onFieldsChanged={async () => {
          if (user) {
            const fields = await getStudentCustomFields(user.uid);
            setCustomFields(fields);
          }
        }}
      />

      <TransferClassModal
        isOpen={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setSelectedEnrollment(null);
        }}
        onSuccess={() => {
          fetchData(true);
          reloadWorkspaceData();
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

      {/* Zero-Residue Deduplication Modal */}
      <DeduplicateStudentsModal
        isOpen={deduplicateModalOpen}
        onClose={() => setDeduplicateModalOpen(false)}
        onSuccess={() => {
          fetchData(true);
        }}
        targetClassId={viewMode === 'class' ? currentClassId : undefined}
      />

      {/* Modal Cetak Info Siswa Lengkap dengan Kustomisasi Kolom */}
      <StudentCustomPrintModal
        isOpen={customPrintModalOpen}
        onClose={() => setCustomPrintModalOpen(false)}
        studentsList={printItems}
        selectedClass={viewMode === 'class' ? currentSelectedClassObj : null}
      />

      {/* Modal Cetak Kartu Peserta Ujian / Asesmen Resmi */}
      <StudentExamCardModal
        isOpen={examCardModalOpen}
        onClose={() => {
          setExamCardModalOpen(false);
          setSelectedEnrollment(null);
        }}
        enrollments={filteredEnrollments}
        selectedEnrollment={selectedEnrollment}
      />

      {/* Modal Lembar Capaian & Rapor Sisipan / Laporan WA */}
      <StudentProgressReportModal
        isOpen={progressReportModalOpen}
        onClose={() => {
          setProgressReportModalOpen(false);
          setSelectedEnrollment(null);
        }}
        enrollment={selectedEnrollment}
      />
    </div>
  );
};
