import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  getAssessmentItems, 
  getScoresByAssessmentItemIds, 
  saveMatrixScores, 
  deleteAssessmentItem,
  canDeleteAssessmentItem
} from '../../services/firestore/assessments';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { AssessmentItemModal } from './AssessmentItemModal';
import { PasteExcelModal } from './PasteExcelModal';
import { ScoreNoteModal } from './ScoreNoteModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { UnsavedChangesModal } from '../../components/common/UnsavedChangesModal';
import { SkeletonTable } from '../../components/common/Skeleton';
import { Tooltip } from '../../components/common/Tooltip';
import { 
  AssessmentItem, 
  Score, 
  Enrollment, 
  TeachingAssignment, 
  CalculationMethod 
} from '../../types';
import { DEFAULT_KKM, getGradeScale } from '../../constants/grading';
import * as XLSX from 'xlsx';
import {
  Award,
  Plus,
  Save,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Search,
  Filter,
  Layers,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Percent,
  SlidersHorizontal,
  HelpCircle,
  StickyNote,
  Sparkles,
  ArrowUpDown,
  FileCheck
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { TabNavigation } from '../../components/common/TabNavigation';
import { useToast } from '../../context/ToastContext';

export const GradesPage: React.FC = () => {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const { 
    teachingAssignments, 
    activeAcademicYear, 
    activeSemester, 
    selectedAssignment, 
    setSelectedAssignment,
    triggerSyncFeedback
  } = useWorkspace();

  // Current active assignment for grading
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string>('');
  
  // Data states
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Scores state: Key is `${studentId}_${assessmentItemId}`
  const [scoresMap, setScoresMap] = useState<Record<string, number | string>>({});
  const [initialScoresMap, setInitialScoresMap] = useState<Record<string, number | string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  // Preferences / Formulas
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('WEIGHTED_AVERAGE');
  const [passingGrade, setPassingGrade] = useState<number>(DEFAULT_KKM); // KKM / KKTP
  const [missingScoreTreatment, setMissingScoreTreatment] = useState<'PRO_RATA' | 'ZERO_PENALTY'>('PRO_RATA');

  // Archive check
  const isArchivedYear = Boolean(activeAcademicYear?.isArchived || selectedAssignment?.isArchived);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'REMEDIAL'>('ALL');
  const [sortBy, setSortBy] = useState<'ROLL' | 'NAME' | 'FINAL_DESC' | 'FINAL_ASC'>('ROLL');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssessmentItem | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteTargetItem, setPasteTargetItem] = useState<AssessmentItem | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{
    studentId: string;
    assessmentItemId: string;
    studentName: string;
    assessmentName: string;
    currentScore: number | string;
    currentNote: string;
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  // Unsaved changes modal state
  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState(false);
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);

  // File input ref for Excel import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Warning before leaving/reloading browser tab with unsaved scores
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

  // Find active assignment object
  const activeAssignment = useMemo(() => {
    if (!currentAssignmentId) return teachingAssignments[0] || null;
    return teachingAssignments.find(a => a.id === currentAssignmentId) || teachingAssignments[0] || null;
  }, [currentAssignmentId, teachingAssignments]);

  // Set initial assignment from workspace or list
  useEffect(() => {
    if (selectedAssignment) {
      setCurrentAssignmentId(selectedAssignment.id);
    } else if (teachingAssignments.length > 0 && !currentAssignmentId) {
      setCurrentAssignmentId(teachingAssignments[0].id);
    }
  }, [selectedAssignment, teachingAssignments]);

  // Load data for the active assignment
  const loadGradesData = async () => {
    if (!user || !activeAssignment) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setIsDirty(false);

      // 1. Fetch assessment columns for this assignment
      const items = await getAssessmentItems(user.uid, {
        teachingAssignmentId: activeAssignment.id,
      });
      setAssessmentItems(items);

      // 2. Fetch class enrollments
      const enrs = await getEnrollmentsByClass(
        user.uid,
        activeAssignment.academicYearId,
        activeAssignment.classId
      );
      // Sort students by roll number
      enrs.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
      setEnrollments(enrs);

      // 3. Fetch scores for all assessment items
      const itemIds = items.map(i => i.id);
      if (itemIds.length > 0) {
        const scores = await getScoresByAssessmentItemIds(user.uid, itemIds);
        const newScoresMap: Record<string, number | string> = {};
        const newNotesMap: Record<string, string> = {};

        scores.forEach(s => {
          const key = `${s.studentId}_${s.assessmentItemId}`;
          newScoresMap[key] = s.score;
          if (s.note) {
            newNotesMap[key] = s.note;
          }
        });

        setScoresMap(newScoresMap);
        setInitialScoresMap(newScoresMap);
        setNotesMap(newNotesMap);
      } else {
        setScoresMap({});
        setInitialScoresMap({});
        setNotesMap({});
      }
    } catch (err) {
      console.error('Error loading grades data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGradesData();
  }, [user, activeAssignment?.id]);

  // Score change handler
  const handleScoreChange = (studentId: string, assessmentItemId: string, valStr: string) => {
    if (isArchivedYear) return;
    const key = `${studentId}_${assessmentItemId}`;
    if (valStr === '') {
      setScoresMap(prev => ({ ...prev, [key]: '' }));
      setIsDirty(true);
      return;
    }

    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      const clamped = Math.max(0, Math.min(100, num));
      setScoresMap(prev => ({ ...prev, [key]: clamped }));
      setIsDirty(true);
    }
  };

  // Note change handler
  const handleSaveNote = (noteText: string) => {
    if (isArchivedYear || !noteTarget) return;
    const key = `${noteTarget.studentId}_${noteTarget.assessmentItemId}`;
    setNotesMap(prev => ({ ...prev, [key]: noteText }));
    setIsDirty(true);
  };

  // Save all changes to Firestore
  const handleSaveAll = async () => {
    if (!user || !activeAssignment) return;
    if (isArchivedYear) {
      toastWarning('Tidak dapat menyimpan: Tahun Ajaran ini berstatus diarsipkan (read-only).');
      return;
    }

    try {
      setSaving(true);
      triggerSyncFeedback('syncing', `Menyimpan nilai ${activeAssignment.subjectName} - Kelas ${activeAssignment.className}...`);
      
      const scoresToSave: Array<{
        assessmentItemId: string;
        studentId: string;
        score: number | null;
        note?: string;
        isDeleted?: boolean;
      }> = [];

      enrollments.forEach(enr => {
        assessmentItems.forEach(item => {
          const key = `${enr.studentId}_${item.id}`;
          const currentVal = scoresMap[key];
          const initialVal = initialScoresMap[key];
          const note = notesMap[key] || '';

          const hasCurrent = currentVal !== undefined && currentVal !== '' && currentVal !== null;
          const hadInitial = initialVal !== undefined && initialVal !== '' && initialVal !== null;

          if (hasCurrent) {
            scoresToSave.push({
              assessmentItemId: item.id,
              studentId: enr.studentId,
              score: Number(currentVal),
              note: note || undefined,
            });
          } else if (hadInitial) {
            // Previously had a score in database, now cleared by teacher -> delete document
            scoresToSave.push({
              assessmentItemId: item.id,
              studentId: enr.studentId,
              score: null,
              isDeleted: true,
            });
          }
        });
      });

      await saveMatrixScores(user.uid, scoresToSave);
      setInitialScoresMap({ ...scoresMap });
      setIsDirty(false);
      triggerSyncFeedback('saved', 'Nilai siswa berhasil disimpan ke cloud!');
      setSaveSuccessMessage('Semua perubahan nilai berhasil disimpan.');
      toastSuccess('Semua perubahan nilai berhasil disimpan ke cloud database.');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Error saving matrix scores:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menyimpan nilai: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignmentChange = (newAssignmentId: string) => {
    if (newAssignmentId === currentAssignmentId) return;
    if (isDirty) {
      setPendingAssignmentId(newAssignmentId);
      setIsDirtyModalOpen(true);
    } else {
      setCurrentAssignmentId(newAssignmentId);
      const found = teachingAssignments.find(a => a.id === newAssignmentId);
      if (found) setSelectedAssignment(found);
    }
  };

  const handleSaveAndProceedAssignment = async () => {
    try {
      await handleSaveAll();
      if (pendingAssignmentId) {
        setCurrentAssignmentId(pendingAssignmentId);
        const found = teachingAssignments.find(a => a.id === pendingAssignmentId);
        if (found) setSelectedAssignment(found);
        setPendingAssignmentId(null);
      }
      setIsDirtyModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardAndProceedAssignment = () => {
    setIsDirty(false);
    if (pendingAssignmentId) {
      setCurrentAssignmentId(pendingAssignmentId);
      const found = teachingAssignments.find(a => a.id === pendingAssignmentId);
      if (found) setSelectedAssignment(found);
      setPendingAssignmentId(null);
    }
    setIsDirtyModalOpen(false);
  };

  // Delete assessment column
  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (isArchivedYear) {
      toastWarning('Tahun Ajaran ini telah diarsipkan. Kolom nilai tidak dapat dihapus.');
      return;
    }
    if (!user) return;

    try {
      const check = await canDeleteAssessmentItem(user.uid, itemId);
      if (!check.canDelete) {
        toastWarning(check.reason || 'Kolom penilaian tidak dapat dihapus karena sudah memiliki nilai siswa.');
        return;
      }
      setItemToDelete({ id: itemId, name: itemName });
    } catch (err: any) {
      console.error('Error checking assessment item deletion:', err);
      toastError('Gagal memverifikasi status kolom: ' + (err.message || 'Error'));
    }
  };

  const executeDeleteItem = async () => {
    if (!user || !itemToDelete || isArchivedYear) return;
    setDeletingItem(true);
    try {
      triggerSyncFeedback('syncing', `Menghapus kolom penilaian ${itemToDelete.name}...`);
      await deleteAssessmentItem(user.uid, itemToDelete.id);
      triggerSyncFeedback('saved', 'Kolom penilaian berhasil dihapus.');
      toastSuccess(`Kolom "${itemToDelete.name}" berhasil dihapus.`);
      setItemToDelete(null);
      loadGradesData();
    } catch (err: any) {
      console.error('Error deleting assessment item:', err);
      triggerSyncFeedback('synced');
      toastError('Gagal menghapus kolom: ' + (err.message || 'Error'));
    } finally {
      setDeletingItem(false);
    }
  };

  // Apply pasted scores from modal
  const handleApplyPastedScores = (scores: Record<string, number>, targetItemId: string) => {
    if (isArchivedYear) return;
    setScoresMap(prev => {
      const updated = { ...prev };
      Object.entries(scores).forEach(([studentId, scoreVal]) => {
        updated[`${studentId}_${targetItemId}`] = scoreVal;
      });
      return updated;
    });
    setIsDirty(true);
    setSaveSuccessMessage('Data nilai dari Excel berhasil ditempelkan. Jangan lupa klik Simpan Nilai.');
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Active students only (exclude transferred/inactive from statistics)
  const activeEnrollments = useMemo(() => {
    return enrollments.filter(e => e.status === 'ACTIVE');
  }, [enrollments]);

  // Assessment items that are active and have at least 1 score entered in class
  const conductedItems = useMemo(() => {
    const included = assessmentItems.filter(i => i.isIncludedInFinalScore !== false);
    return included.filter(item => {
      return enrollments.some(enr => {
        const val = scoresMap[`${enr.studentId}_${item.id}`];
        return val !== undefined && val !== '' && val !== null;
      });
    });
  }, [assessmentItems, enrollments, scoresMap]);

  // Calculate final grade for each student
  const studentCalculations = useMemo(() => {
    const calcs: Record<string, {
      finalScore: number;
      predicate: 'A' | 'B' | 'C' | 'D';
      predicateLabel: string;
      isPassed: boolean;
      filledCount: number;
      conductedFilledCount: number;
      conductedTotalCount: number;
      isIncomplete: boolean;
    }> = {};

    const includedItems = assessmentItems.filter(i => i.isIncludedInFinalScore !== false);

    enrollments.forEach(enr => {
      let weightedSum = 0;
      let usedWeight = 0;
      let simpleSum = 0;
      let filledCount = 0;
      let conductedFilledCount = 0;

      includedItems.forEach(item => {
        const key = `${enr.studentId}_${item.id}`;
        const rawVal = scoresMap[key];
        const isConducted = conductedItems.some(ci => ci.id === item.id);

        if (rawVal !== undefined && rawVal !== '' && rawVal !== null) {
          const num = Number(rawVal);
          const w = Number(item.weight) || 1;
          weightedSum += num * w;
          usedWeight += w;
          simpleSum += num;
          filledCount += 1;
          if (isConducted) conductedFilledCount += 1;
        } else if (isConducted && missingScoreTreatment === 'ZERO_PENALTY') {
          // Uncompleted assessment that has been conducted is treated as 0
          const w = Number(item.weight) || 1;
          usedWeight += w;
        }
      });

      let finalScore = 0;
      if (calculationMethod === 'WEIGHTED_AVERAGE') {
        finalScore = usedWeight > 0 ? Math.round((weightedSum / usedWeight) * 10) / 10 : 0;
      } else {
        const denom = missingScoreTreatment === 'ZERO_PENALTY' ? Math.max(1, conductedItems.length) : filledCount;
        finalScore = denom > 0 ? Math.round((simpleSum / denom) * 10) / 10 : 0;
      }

      const scale = getGradeScale(finalScore, passingGrade);
      const predicate = scale.predicate;
      const predicateLabel = scale.label;
      const conductedTotalCount = conductedItems.length;
      const isIncomplete = conductedTotalCount > 0 && conductedFilledCount < conductedTotalCount;

      calcs[enr.studentId] = {
        finalScore,
        predicate,
        predicateLabel,
        isPassed: finalScore >= passingGrade && filledCount > 0 && !isIncomplete,
        filledCount,
        conductedFilledCount,
        conductedTotalCount,
        isIncomplete,
      };
    });

    return calcs;
  }, [enrollments, assessmentItems, conductedItems, scoresMap, calculationMethod, passingGrade, missingScoreTreatment]);

  // Summary statistics for class (calculated solely on ACTIVE students)
  const classStats = useMemo(() => {
    const totalStudents = activeEnrollments.length;
    if (totalStudents === 0) {
      return {
        avgScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passedCount: 0,
        remedialCount: 0,
        incompleteCount: 0,
        passPercentage: 0,
        distribution: { A: 0, B: 0, C: 0, D: 0 },
      };
    }

    let sum = 0;
    let highest = 0;
    let lowest = 100;
    let passedCount = 0;
    let incompleteCount = 0;
    let activeWithScores = 0;
    const distribution = { A: 0, B: 0, C: 0, D: 0 };

    activeEnrollments.forEach(enr => {
      const c = studentCalculations[enr.studentId];
      if (c && c.filledCount > 0) {
        sum += c.finalScore;
        activeWithScores++;
        if (c.finalScore > highest) highest = c.finalScore;
        if (c.finalScore < lowest) lowest = c.finalScore;
        if (c.isPassed) passedCount++;
        if (c.isIncomplete) incompleteCount++;
        distribution[c.predicate]++;
      } else if (c) {
        distribution.D++;
      }
    });

    const avgScore = activeWithScores > 0 ? Math.round((sum / activeWithScores) * 10) / 10 : 0;
    const passPercentage = activeWithScores > 0 ? Math.round((passedCount / activeWithScores) * 100) : 0;

    return {
      avgScore,
      highestScore: activeWithScores > 0 ? highest : 0,
      lowestScore: activeWithScores > 0 ? lowest : 0,
      passedCount,
      remedialCount: totalStudents - passedCount,
      incompleteCount,
      passPercentage,
      distribution,
    };
  }, [activeEnrollments, studentCalculations]);

  // Filtered & Sorted student list
  const displayedEnrollments = useMemo(() => {
    let list = [...enrollments];

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(enr => {
        const name = (enr.student?.fullName || '').toLowerCase();
        const nis = (enr.student?.nis || '').toLowerCase();
        const nisn = (enr.student?.nisn || '').toLowerCase();
        return name.includes(q) || nis.includes(q) || nisn.includes(q);
      });
    }

    // Filter by status
    if (statusFilter === 'PASSED') {
      list = list.filter(enr => studentCalculations[enr.studentId]?.isPassed);
    } else if (statusFilter === 'REMEDIAL') {
      list = list.filter(enr => !studentCalculations[enr.studentId]?.isPassed);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'ROLL') {
        return (a.rollNumber || 0) - (b.rollNumber || 0);
      }
      if (sortBy === 'NAME') {
        return (a.student?.fullName || '').localeCompare(b.student?.fullName || '');
      }
      if (sortBy === 'FINAL_DESC') {
        return (studentCalculations[b.studentId]?.finalScore || 0) - (studentCalculations[a.studentId]?.finalScore || 0);
      }
      if (sortBy === 'FINAL_ASC') {
        return (studentCalculations[a.studentId]?.finalScore || 0) - (studentCalculations[b.studentId]?.finalScore || 0);
      }
      return 0;
    });

    return list;
  }, [enrollments, searchTerm, statusFilter, sortBy, studentCalculations]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!activeAssignment || enrollments.length === 0) {
      toastWarning('Tidak ada data nilai siswa untuk diekspor.');
      return;
    }

    // Prepare header row
    const headers = [
      'No',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
      ...assessmentItems.map(item => `${item.name} (${item.category} - ${item.weight}%)`),
      'Nilai Akhir',
      'Predikat',
      'Status Ketuntasan'
    ];

    // Prepare rows
    const rows = enrollments.map(enr => {
      const calc = studentCalculations[enr.studentId];
      const itemScores = assessmentItems.map(item => {
        const val = scoresMap[`${enr.studentId}_${item.id}`];
        return val !== undefined && val !== '' ? Number(val) : '';
      });

      return [
        enr.rollNumber || '',
        enr.student?.nis || '',
        enr.student?.nisn || '',
        enr.student?.fullName || '',
        enr.student?.gender || '',
        ...itemScores,
        calc?.finalScore ?? 0,
        calc?.predicate ?? 'D',
        calc?.isPassed ? 'TUNTAS' : 'REMEDIAL'
      ];
    });

    // Create Worksheet
    const ws = XLSX.utils.aoa_to_sheet([
      [`DAFTAR NILAI AKADEMIK - ${activeAssignment.subjectName}`],
      [`Kelas: ${activeAssignment.className} | Tahun Ajaran: ${activeAcademicYear?.label || ''} (${activeSemester})`],
      [`Metode: ${calculationMethod === 'WEIGHTED_AVERAGE' ? 'Rata-rata Berbobot' : 'Rata-rata Sederhana'} | KKTP: ${passingGrade}`],
      [],
      headers,
      ...rows,
    ]);

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Akademik');

    const fileName = `Daftar_Nilai_${activeAssignment.subjectName}_${activeAssignment.className}_${activeSemester}.xlsx`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, fileName);
  };

  // Import from Excel (.xlsx)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          toastError('Format file Excel kosong atau tidak sesuai.');
          return;
        }

        // Find header row containing NIS / Nama
        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(10, data.length); r++) {
          const rowStr = (data[r] || []).join(' ').toLowerCase();
          if (rowStr.includes('nama') || rowStr.includes('nis')) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) {
          toastError('Baris header tabel nilai tidak ditemukan dalam file Excel.');
          return;
        }

        const headers = data[headerRowIndex];
        const newScores: Record<string, number> = {};

        // Parse student rows
        for (let r = headerRowIndex + 1; r < data.length; r++) {
          const row = data[r];
          if (!row || row.length === 0) continue;

          // Find student by NIS or Roll or Name
          const rollCandidate = parseInt(row[0]);
          const nisCandidate = String(row[1] || '').trim();
          const nameCandidate = String(row[3] || row[2] || '').trim().toLowerCase();

          const student = enrollments.find(e => 
            (nisCandidate && e.student?.nis === nisCandidate) ||
            (rollCandidate && e.rollNumber === rollCandidate) ||
            (nameCandidate && (e.student?.fullName || '').toLowerCase().includes(nameCandidate))
          );

          if (student) {
            // Read columns mapped to assessmentItems
            assessmentItems.forEach((item, itemIdx) => {
              const colIndex = 5 + itemIdx; // standard offset
              if (row[colIndex] !== undefined && row[colIndex] !== '') {
                const scoreVal = parseFloat(row[colIndex]);
                if (!isNaN(scoreVal) && scoreVal >= 0 && scoreVal <= 100) {
                  newScores[`${student.studentId}_${item.id}`] = scoreVal;
                }
              }
            });
          }
        }

        setScoresMap(prev => ({ ...prev, ...newScores }));
        setIsDirty(true);
        setSaveSuccessMessage('Import nilai dari Excel berhasil! Klik "Simpan Nilai" untuk menyimpan ke cloud.');
        toastSuccess('Import Excel berhasil! Klik "Simpan Nilai" untuk menyimpan ke cloud.');
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      } catch (err: any) {
        console.error('Error importing Excel:', err);
        toastError('Gagal membaca file Excel: ' + (err.message || 'Format Error'));
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalActiveWeight = useMemo(() => {
    return assessmentItems
      .filter(i => i.isIncludedInFinalScore)
      .reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
  }, [assessmentItems]);

  // Completion metrics for each assessment item (how many active students have a score)
  const itemCompletionMap = useMemo(() => {
    const map = new Map<string, { filled: number; total: number; percentage: number; isComplete: boolean }>();
    const totalActive = activeEnrollments.length;

    assessmentItems.forEach(item => {
      if (totalActive === 0) {
        map.set(item.id, { filled: 0, total: 0, percentage: 0, isComplete: false });
        return;
      }
      let filled = 0;
      activeEnrollments.forEach(enr => {
        const val = scoresMap[`${enr.studentId}_${item.id}`];
        if (val !== undefined && val !== '' && val !== null) {
          filled++;
        }
      });
      const percentage = Math.round((filled / totalActive) * 100);
      map.set(item.id, {
        filled,
        total: totalActive,
        percentage,
        isComplete: filled === totalActive,
      });
    });

    return map;
  }, [assessmentItems, activeEnrollments, scoresMap]);

  // Overall class scores completeness (all items * active students)
  const overallCompleteness = useMemo(() => {
    const totalCells = activeEnrollments.length * assessmentItems.length;
    if (totalCells === 0) return { filled: 0, total: 0, percentage: 0, isAllComplete: false };
    let totalFilled = 0;
    assessmentItems.forEach(item => {
      const stats = itemCompletionMap.get(item.id);
      if (stats) totalFilled += stats.filled;
    });
    const percentage = Math.round((totalFilled / totalCells) * 100);
    return {
      filled: totalFilled,
      total: totalCells,
      percentage,
      isAllComplete: totalFilled === totalCells && totalCells > 0,
    };
  }, [activeEnrollments.length, assessmentItems, itemCompletionMap]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-600 dark:text-cyan-400" />
            Nilai Akademik & Penilaian
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Spreadsheet penilaian terpadu, bobot asesmen otomatis, analisis ketuntasan KKTP, dan ekspor legger.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Ekspor Excel</span>
          </button>

          {/* Import Excel */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
            disabled={isArchivedYear}
          />
          <button
            type="button"
            disabled={isArchivedYear}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Import Excel</span>
          </button>

          {/* Add Assessment Column */}
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
            disabled={!activeAssignment || isArchivedYear}
            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kolom Nilai</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || !isDirty || isArchivedYear}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isArchivedYear
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : isDirty 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-60'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan*' : 'Tersimpan'}</span>
          </button>
        </div>
      </div>

      {/* Archive Warning Banner */}
      {isArchivedYear && (
        <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">Mode Arsip Historis (Read-Only)</span>
              <span className="text-[11px] text-amber-700 dark:text-amber-300">
                Tahun Ajaran ini telah diarsipkan. Seluruh data asesmen dan nilai siswa berstatus terkunci permanen untuk menjaga integritas data historis.
              </span>
            </div>
          </div>
          <Badge variant="warning">Terkunci</Badge>
        </div>
      )}

      {/* Save Success Toast Banner */}
      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Assignment Selector & Class Banner */}
      <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-cyan-950/60 text-orange-600 dark:text-cyan-400 border border-orange-200 dark:border-cyan-500/40 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Pilih Rombel & Mata Pelajaran Aktif
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <select
                  value={currentAssignmentId}
                  onChange={(e) => handleAssignmentChange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] font-bold text-slate-800 dark:text-slate-200 text-xs bg-slate-50 dark:bg-[#0c0e15] hover:bg-slate-100 dark:hover:bg-[#1b1f2e] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
                >
                  {teachingAssignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.subjectName} — Kelas {a.className}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  ({enrollments.length} Siswa Terdaftar)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Settings: Formula & KKTP */}
          <div className="flex flex-wrap items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#232838]">
            {/* Calculation Method */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0c0e15] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">Metode:</span>
              <select
                value={calculationMethod}
                onChange={(e) => setCalculationMethod(e.target.value as CalculationMethod)}
                className="font-semibold text-slate-700 dark:text-slate-300 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="WEIGHTED_AVERAGE">Rata-rata Berbobot</option>
                <option value="SIMPLE_AVERAGE">Rata-rata Sederhana</option>
              </select>
            </div>

            {/* Missing score treatment */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0c0e15] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Nilai Kosong:</span>
              <select
                value={missingScoreTreatment}
                onChange={(e) => setMissingScoreTreatment(e.target.value as any)}
                className="font-semibold text-slate-700 dark:text-slate-300 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="PRO_RATA">Abaikan (Pro-rata)</option>
                <option value="ZERO_PENALTY">Hitung 0</option>
              </select>
            </div>

            {/* KKTP Passing Threshold */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0c0e15] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">KKTP / KKM:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={passingGrade}
                onChange={(e) => setPassingGrade(Number(e.target.value) || 75)}
                className="w-12 font-mono font-bold text-orange-700 dark:text-cyan-400 bg-white dark:bg-[#141722] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#232838] text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Assessments & Progress */}
        <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Kelengkapan Nilai</span>
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
              {overallCompleteness.filled}/{overallCompleteness.total} Sel
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
              {overallCompleteness.percentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {assessmentItems.length} Kolom Tagihan
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-[#0c0e15] rounded-full overflow-hidden mt-2 border border-slate-200/50 dark:border-[#232838]">
            <div
              style={{ width: `${overallCompleteness.percentage}%` }}
              className={`h-full transition-all duration-300 ${
                overallCompleteness.isAllComplete
                  ? 'bg-emerald-500'
                  : 'bg-emerald-600 dark:bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Class Average */}
        <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Rata-rata Kelas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                {classStats.avgScore || '-'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Skala 100</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Min: <strong className="text-slate-700 dark:text-slate-300 font-mono">{classStats.lowestScore}</strong></span>
              <span>•</span>
              <span>Max: <strong className="text-slate-700 dark:text-slate-300 font-mono">{classStats.highestScore}</strong></span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Passed Rate */}
        <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 block">Tingkat Ketuntasan</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {classStats.passPercentage}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tuntas KKTP</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div>
                <strong className="text-emerald-700 dark:text-emerald-400">{classStats.passedCount}</strong> Tuntas /{' '}
                <strong className="text-rose-600 dark:text-rose-400">{classStats.remedialCount}</strong> Remedial
              </div>
              {classStats.incompleteCount > 0 && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>{classStats.incompleteCount} siswa tagihan belum lengkap</span>
                </div>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/40 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Distribusi Predikat</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">A/B/C/D</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-2 text-center">
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-500/30 rounded-lg py-1 px-0.5">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">A</span>
              <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">{classStats.distribution.A}</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-500/30 rounded-lg py-1 px-0.5">
              <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 block">B</span>
              <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">{classStats.distribution.B}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-500/30 rounded-lg py-1 px-0.5">
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 block">C</span>
              <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">{classStats.distribution.C}</span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-500/30 rounded-lg py-1 px-0.5">
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 block">D</span>
              <span className="font-mono font-bold text-xs text-rose-700 dark:text-rose-400">{classStats.distribution.D}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Warning if total != 100% */}
      {calculationMethod === 'WEIGHTED_AVERAGE' && totalActiveWeight !== 100 && assessmentItems.length > 0 && (
        <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Perhatian: Total bobot aktif saat ini adalah <strong>{totalActiveWeight}%</strong> (disarankan tepat 100% untuk formula Rata-rata Berbobot presisi).
            </span>
          </div>
        </div>
      )}

      {/* Filter & Toolbar Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-3 shadow-2xs transition-colors">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari siswa atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 bg-slate-50 dark:bg-[#0c0e15]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <TabNavigation
            tabs={[
              { id: 'ALL', label: `Semua (${enrollments.length})` },
              { id: 'PASSED', label: `Tuntas (${classStats.passedCount})` },
              { id: 'REMEDIAL', label: `Remedial (${classStats.remedialCount})` },
            ]}
            activeTab={statusFilter}
            onChange={(id) => setStatusFilter(id as any)}
            size="sm"
          />

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden cursor-pointer"
          >
            <option value="ROLL">Urutkan: No. Absen</option>
            <option value="NAME">Urutkan: Nama (A-Z)</option>
            <option value="FINAL_DESC">Nilai: Tertinggi</option>
            <option value="FINAL_ASC">Nilai: Terendah</option>
          </select>

          {/* Paste Excel Toolbar Trigger */}
          {assessmentItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPasteTargetItem(assessmentItems[0]);
                setIsPasteModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-orange-200 dark:border-cyan-500/40 bg-orange-50/70 dark:bg-cyan-950/40 hover:bg-orange-100 dark:hover:bg-cyan-900/60 text-orange-700 dark:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-orange-600 dark:text-cyan-400" />
              <span>Paste Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Spreadsheet Matrix */}
      {loading ? (
        <SkeletonTable rows={10} columns={7} />
      ) : enrollments.length === 0 ? (
        <div className="bg-white dark:bg-[#141722] rounded-2xl border border-slate-200 dark:border-[#232838] p-12 text-center transition-colors">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Belum Ada Siswa di Kelas Ini</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Silakan masukkan data siswa dan lakukan enrollment kelas pada modul Master Data Siswa.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl shadow-2xs overflow-hidden transition-colors">
          <div className="overflow-x-auto max-h-[620px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            <table className="w-full text-left border-collapse text-xs">
              {/* Table Header */}
              <thead className="bg-slate-50/90 dark:bg-[#0c0e15]/90 sticky top-0 z-20 backdrop-blur-xs border-b border-slate-200 dark:border-[#232838]">
                <tr>
                  {/* Sticky Column: No */}
                  <th className="sticky left-0 z-30 bg-slate-50 dark:bg-[#0c0e15] px-3 py-3 w-12 text-center font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-[#232838]">
                    No
                  </th>
                  {/* Sticky Column: NIS & Nama */}
                  <th className="sticky left-12 z-30 bg-slate-50 dark:bg-[#0c0e15] px-4 py-3 min-w-[200px] max-w-[260px] font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-[#232838]">
                    Nama Siswa
                  </th>

                  {/* Dynamic Assessment Columns */}
                  {assessmentItems.map((item) => {
                    const comp = itemCompletionMap.get(item.id) || { filled: 0, total: 0, percentage: 0, isComplete: false };

                    return (
                      <th
                        key={item.id}
                        className="px-3 py-2 min-w-[130px] max-w-[160px] text-center border-r border-slate-200 dark:border-[#232838] group/col relative"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 dark:bg-cyan-950/60 text-orange-700 dark:text-cyan-300 border border-orange-200/50 dark:border-cyan-500/40 uppercase tracking-tight mb-0.5">
                            {item.category}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 text-xs" title={item.name}>
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <span>Bobot: <strong>{item.weight}%</strong></span>
                            <span>•</span>
                            <span>Max: {item.maxScore}</span>
                          </div>

                          {/* Column Completion Micro-Bar (Linear style) */}
                          <div className="w-full mt-1.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 px-0.5">
                              <span>{comp.filled}/{comp.total}</span>
                              <span className={comp.isComplete ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                                {comp.isComplete ? '✓ Lengkap' : `${comp.percentage}%`}
                              </span>
                            </div>
                            <div className="w-full h-1 bg-slate-200/70 dark:bg-[#1c2030] rounded-full overflow-hidden">
                              <div
                                style={{ width: `${comp.percentage}%` }}
                                className={`h-full transition-all duration-300 ${
                                  comp.isComplete
                                    ? 'bg-emerald-500'
                                    : 'bg-emerald-600/70 dark:bg-emerald-500/70'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                      {/* Header quick actions on hover */}
                      {!isArchivedYear && (
                        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition-opacity bg-white/90 dark:bg-[#141722]/90 p-0.5 rounded-md shadow-xs border border-slate-200 dark:border-[#232838]">
                          <Tooltip content="Edit Kolom" position="top">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Hapus Kolom" position="top">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </th>
                    );
                  })}

                  {/* Empty Add Column Button Header */}
                  <th className="px-3 py-3 w-16 text-center border-r border-slate-200 dark:border-[#232838]">
                    {!isArchivedYear && (
                      <Tooltip content="Tambah Kolom Penilaian Baru" position="top">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(null);
                            setIsItemModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                  </th>

                  {/* Final Score Calculated Header */}
                  <th className="px-4 py-3 min-w-[100px] text-center font-bold text-slate-800 dark:text-slate-100 bg-emerald-50/50 dark:bg-emerald-950/30 border-r border-slate-200 dark:border-[#232838]">
                    Nilai Akhir
                  </th>
                  {/* Predicate Header */}
                  <th className="px-3 py-3 min-w-[80px] text-center font-bold text-slate-800 dark:text-slate-100 bg-emerald-50/50 dark:bg-emerald-950/30 border-r border-slate-200 dark:border-[#232838]">
                    Predikat
                  </th>
                  {/* Status Ketuntasan Header */}
                  <th className="px-3 py-3 min-w-[100px] text-center font-bold text-slate-800 dark:text-slate-100 bg-emerald-50/50 dark:bg-emerald-950/30">
                    Status
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-[#232838]">
                {displayedEnrollments.map((enr, index) => {
                  const calc = studentCalculations[enr.studentId];
                  const isBelowPassing = calc ? !calc.isPassed && calc.filledCount > 0 : false;

                  return (
                    <tr
                      key={enr.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#1b1f2e] transition-colors group"
                    >
                      {/* Sticky Roll Number */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] px-3 py-2 text-center font-mono font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-[#232838]">
                        {enr.rollNumber || index + 1}
                      </td>

                      {/* Sticky Student Name & NIS */}
                      <td className="sticky left-12 z-10 bg-white group-hover:bg-slate-50 dark:bg-[#141722] dark:group-hover:bg-[#1b1f2e] px-4 py-2 border-r border-slate-200 dark:border-[#232838]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                            {enr.student?.fullName || 'Nama Siswa'}
                          </span>
                          {enr.status !== 'ACTIVE' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1c2030] text-slate-500 shrink-0">
                              {enr.status === 'TRANSFERRED' ? 'Mutasi' : 'Non-Aktif'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          <span>NIS: {enr.student?.nis || '-'}</span>
                          <span>•</span>
                          <span className="font-sans text-slate-500 dark:text-slate-400 font-medium">({enr.student?.gender})</span>
                        </div>
                      </td>

                      {/* Dynamic Assessment Score Inputs */}
                      {assessmentItems.map((item) => {
                        const cellKey = `${enr.studentId}_${item.id}`;
                        const rawVal = scoresMap[cellKey];
                        const note = notesMap[cellKey];
                        const numVal = rawVal !== undefined && rawVal !== '' ? Number(rawVal) : null;
                        const isScoreLow = numVal !== null && numVal < passingGrade;

                        return (
                          <td
                            key={item.id}
                            className="px-2 py-1 text-center border-r border-slate-100 dark:border-[#232838] relative group/cell"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={item.maxScore || 100}
                                step="0.5"
                                disabled={isArchivedYear}
                                value={rawVal ?? ''}
                                placeholder="-"
                                onChange={(e) => handleScoreChange(enr.studentId, item.id, e.target.value)}
                                className={`w-16 h-8 text-center py-1 font-mono font-bold text-xs rounded-lg border transition-all focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed ${
                                  isScoreLow
                                    ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-500/60 text-rose-800 dark:text-rose-300 font-black shadow-2xs'
                                    : numVal !== null
                                    ? 'bg-white dark:bg-[#0c0e15] border-slate-300 dark:border-[#2e344a] text-slate-900 dark:text-slate-100 font-bold shadow-2xs'
                                    : 'bg-slate-50/60 dark:bg-[#0c0e15]/40 border-dashed border-slate-300/80 dark:border-[#232838] text-slate-400 dark:text-slate-600 hover:border-slate-400'
                                }`}
                              />

                              {/* Note icon button */}
                              <Tooltip content={note ? `Catatan: ${note}` : 'Tambah Catatan / Remedial'} position="top">
                                <button
                                  type="button"
                                  disabled={isArchivedYear}
                                  onClick={() => {
                                    setNoteTarget({
                                      studentId: enr.studentId,
                                      assessmentItemId: item.id,
                                      studentName: enr.student?.fullName || 'Siswa',
                                      assessmentName: item.name,
                                      currentScore: rawVal ?? '',
                                      currentNote: note || '',
                                    });
                                    setIsNoteModalOpen(true);
                                  }}
                                  className={`p-1 rounded-md transition-all cursor-pointer disabled:cursor-not-allowed ${
                                    note 
                                      ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' 
                                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover/cell:opacity-100'
                                  }`}
                                >
                                  <StickyNote className="w-3 h-3" />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        );
                      })}

                      {/* Spacer empty cell */}
                      <td className="border-r border-slate-100 dark:border-[#232838]"></td>

                      {/* Final Score Calculated Value */}
                      <td className="px-3 py-2 text-center border-r border-slate-200 dark:border-[#232838] font-mono font-bold text-sm bg-orange-50/30 dark:bg-cyan-950/20">
                        <span className={isBelowPassing ? 'text-rose-600 dark:text-rose-400' : 'text-orange-950 dark:text-cyan-300'}>
                          {calc?.finalScore || 0}
                        </span>
                      </td>

                      {/* Predicate */}
                      <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-[#232838] bg-orange-50/30 dark:bg-cyan-950/20">
                        <span
                          className={`inline-block w-6 py-0.5 rounded-md font-bold text-xs font-mono ${
                            calc?.predicate === 'A'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40'
                              : calc?.predicate === 'B'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/40'
                              : calc?.predicate === 'C'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/40'
                          }`}
                        >
                          {calc?.predicate || 'D'}
                        </span>
                      </td>

                      {/* Status Ketuntasan */}
                      <td className="px-3 py-2 text-center bg-orange-50/30 dark:bg-cyan-950/20">
                        {calc && calc.filledCount > 0 ? (
                          calc.isIncomplete ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Belum Lengkap ({calc.conductedFilledCount}/{calc.conductedTotalCount})
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {calc.isPassed ? 'Sementara Tuntas' : 'Sementara Remedial'}
                              </span>
                            </div>
                          ) : calc.isPassed ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Tuntas
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Remedial
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Ada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Column Statistics */}
              <tfoot className="bg-slate-100/90 font-semibold text-slate-700 border-t-2 border-slate-200 sticky bottom-0 z-20">
                <tr>
                  <td colSpan={2} className="sticky left-0 z-30 bg-slate-100 px-4 py-2.5 font-bold text-slate-800 border-r border-slate-200">
                    Rata-rata Kelas per Kolom ({activeEnrollments.length} Siswa Aktif)
                  </td>
                  {assessmentItems.map(item => {
                    let colSum = 0;
                    let count = 0;
                    activeEnrollments.forEach(enr => {
                      const val = scoresMap[`${enr.studentId}_${item.id}`];
                      if (val !== undefined && val !== '' && val !== null) {
                        colSum += Number(val);
                        count++;
                      }
                    });
                    const colAvg = count > 0 ? Math.round((colSum / count) * 10) / 10 : '-';

                    return (
                      <td key={item.id} className="px-2 py-2 text-center border-r border-slate-200 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                        {colAvg}
                      </td>
                    );
                  })}
                  <td className="border-r border-slate-200"></td>
                  <td className="px-3 py-2 text-center font-mono font-black text-xs text-emerald-900 dark:text-emerald-200 bg-emerald-100/50 dark:bg-emerald-950/40 border-r border-slate-200">
                    {classStats.avgScore}
                  </td>
                  <td colSpan={2} className="bg-emerald-100/50 dark:bg-emerald-950/40 text-center text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                    {classStats.passPercentage}% Tuntas
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AssessmentItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        assignment={activeAssignment}
        itemToEdit={editingItem}
        onSuccess={() => loadGradesData()}
      />

      <PasteExcelModal
        isOpen={isPasteModalOpen}
        onClose={() => {
          setIsPasteModalOpen(false);
          setPasteTargetItem(null);
        }}
        targetAssessmentItem={pasteTargetItem}
        assessmentItems={assessmentItems}
        enrollments={enrollments}
        onApplyScores={handleApplyPastedScores}
      />

      {noteTarget && (
        <ScoreNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => {
            setIsNoteModalOpen(false);
            setNoteTarget(null);
          }}
          studentName={noteTarget.studentName}
          assessmentName={noteTarget.assessmentName}
          currentScore={noteTarget.currentScore}
          currentNote={noteTarget.currentNote}
          onSave={handleSaveNote}
        />
      )}

      {/* Confirm Delete Assessment Column Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={executeDeleteItem}
        title="Hapus Kolom Penilaian"
        message={
          <>
            Apakah Anda yakin ingin menghapus kolom penilaian <strong className="font-semibold text-slate-800 dark:text-slate-100">&quot;{itemToDelete?.name}&quot;</strong>?
            <br />
            Kolom penilaian ini belum memiliki nilai siswa dan akan dihapus dari daftar asesmen.
          </>
        }
        confirmLabel="Hapus Kolom"
        variant="danger"
        isLoading={deletingItem}
      />

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={isDirtyModalOpen}
        onClose={() => {
          setIsDirtyModalOpen(false);
          setPendingAssignmentId(null);
        }}
        onDiscard={handleDiscardAndProceedAssignment}
        onSave={handleSaveAndProceedAssignment}
        title="Perubahan Nilai Belum Disimpan"
        message="Terdapat perubahan nilai siswa yang belum disimpan ke database. Apakah Anda ingin menyimpan perubahan tersebut sebelum berpindah kelas atau mata pelajaran?"
        saveButtonText="Simpan & Pindah"
        discardButtonText="Buang Perubahan"
      />
    </div>
  );
};
