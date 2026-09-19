import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  writeBatch, 
  query, 
  where,
  getDocFromServer 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { buildStudentSearchTokens } from './students';
import { SemesterType } from '../../types';

export interface DatabaseBackup {
  version: string;
  exportedAt: string;
  userId: string;
  metadata: {
    teacherName?: string;
    schoolName?: string;
    totalCollections: number;
    totalDocuments: number;
  };
  collections: {
    academicYears: any[];
    classes: any[];
    subjects: any[];
    teachingAssignments: any[];
    students: any[];
    enrollments: any[];
    meetings: any[];
    attendanceRecords: any[];
    dailyAttendanceSessions: any[];
    dailyAttendanceRecords: any[];
    assessmentItems: any[];
    scores: any[];
    studentNotes: any[];
    teacherAttendanceRecords?: any[];
    teacherMonthlyAttendance?: any[];
    classSchedules?: any[];
    studentCustomFields?: any[];
    settings: Record<string, any>;
  };
}

export interface DatabaseStatistics {
  academicYearsCount: number;
  classesCount: number;
  subjectsCount: number;
  teachingAssignmentsCount: number;
  studentsCount: number;
  enrollmentsCount: number;
  meetingsCount: number;
  attendanceRecordsCount: number;
  dailyAttendanceSessionsCount: number;
  dailyAttendanceRecordsCount: number;
  teacherAttendanceRecordsCount?: number;
  teacherMonthlyAttendanceCount?: number;
  classSchedulesCount?: number;
  studentCustomFieldsCount?: number;
  assessmentItemsCount: number;
  scoresCount: number;
  studentNotesCount: number;
  totalDocuments: number;
  latencyMs: number;
  isConnected: boolean;
}

export interface ResetSemesterScope {
  meetingsAndAttendance: boolean; // Jurnal KBM & absensi mapel
  assessmentsAndScores: boolean;  // Butir asesmen & nilai
  dailyAttendance: boolean;       // Absensi harian wali kelas (sesi & rekap)
  teacherAttendance?: boolean;    // Absensi guru & rekap bulanan
  classSchedules?: boolean;       // Jadwal pelajaran
  studentNotes?: boolean;         // Catatan siswa terkait
}

export interface ResetSemesterOptions {
  academicYearId: string;
  semester?: SemesterType | 'ALL';
  scope?: Partial<ResetSemesterScope>;
  forceArchived?: boolean; // Izinkan reset jika tahun ajaran diarsipkan
}

export interface ResetSemesterSummary {
  academicYearId: string;
  semester: SemesterType | 'ALL';
  meetings: number;
  attendanceRecords: number;
  assessmentItems: number;
  scores: number;
  dailyAttendanceSessions: number;
  dailyAttendanceRecords: number;
  teacherAttendanceRecords: number;
  teacherMonthlyAttendance: number;
  classSchedules: number;
  studentNotes: number;
  totalDeleted: number;
}

export interface ImportProgressInfo {
  collectionName: string;
  collectionIndex: number;
  totalCollections: number;
  processedItems: number;
  totalItems: number;
  percentage: number;
  message: string;
}

/**
 * Fetch all documents in a specific user subcollection
 */
async function fetchCollectionData(uid: string, collectionName: string): Promise<any[]> {
  try {
    const colRef = collection(db, 'users', uid, collectionName);
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(`Error fetching collection ${collectionName}:`, err);
    return [];
  }
}

/**
 * Export all user data into a structured JSON backup object
 */
export async function exportFullDatabase(uid: string, teacherName?: string, schoolName?: string): Promise<DatabaseBackup> {
  const [
    academicYears,
    classes,
    subjects,
    teachingAssignments,
    students,
    enrollments,
    meetings,
    attendanceRecords,
    dailyAttendanceSessions,
    dailyAttendanceRecords,
    assessmentItems,
    scores,
    studentNotes,
    teacherAttendanceRecords,
    teacherMonthlyAttendance,
    classSchedules,
    studentCustomFields,
    settingsList
  ] = await Promise.all([
    fetchCollectionData(uid, 'academicYears'),
    fetchCollectionData(uid, 'classes'),
    fetchCollectionData(uid, 'subjects'),
    fetchCollectionData(uid, 'teachingAssignments'),
    fetchCollectionData(uid, 'students'),
    fetchCollectionData(uid, 'enrollments'),
    fetchCollectionData(uid, 'meetings'),
    fetchCollectionData(uid, 'attendanceRecords'),
    fetchCollectionData(uid, 'dailyAttendanceSessions'),
    fetchCollectionData(uid, 'dailyAttendanceRecords'),
    fetchCollectionData(uid, 'assessmentItems'),
    fetchCollectionData(uid, 'scores'),
    fetchCollectionData(uid, 'studentNotes'),
    fetchCollectionData(uid, 'teacherAttendanceRecords'),
    fetchCollectionData(uid, 'teacherMonthlyAttendance'),
    fetchCollectionData(uid, 'classSchedules'),
    fetchCollectionData(uid, 'studentCustomFields'),
    fetchCollectionData(uid, 'settings'),
  ]);

  const settingsMap: Record<string, any> = {};
  settingsList.forEach(s => {
    const { id, ...rest } = s;
    settingsMap[id] = rest;
  });

  const totalDocuments = 
    academicYears.length +
    classes.length +
    subjects.length +
    teachingAssignments.length +
    students.length +
    enrollments.length +
    meetings.length +
    attendanceRecords.length +
    dailyAttendanceSessions.length +
    dailyAttendanceRecords.length +
    assessmentItems.length +
    scores.length +
    studentNotes.length +
    teacherAttendanceRecords.length +
    teacherMonthlyAttendance.length +
    classSchedules.length +
    studentCustomFields.length +
    settingsList.length;

  return {
    version: '1.1.0',
    exportedAt: new Date().toISOString(),
    userId: uid,
    metadata: {
      teacherName: teacherName || 'Guru',
      schoolName: schoolName || 'Madrasah',
      totalCollections: 18,
      totalDocuments,
    },
    collections: {
      academicYears,
      classes,
      subjects,
      teachingAssignments,
      students,
      enrollments,
      meetings,
      attendanceRecords,
      dailyAttendanceSessions,
      dailyAttendanceRecords,
      assessmentItems,
      scores,
      studentNotes,
      teacherAttendanceRecords,
      teacherMonthlyAttendance,
      classSchedules,
      studentCustomFields,
      settings: settingsMap,
    },
  };
}

/**
 * Deterministic document ID resolver for guaranteed idempotency across restore operations.
 * Prevents duplicating or fragmenting records when re-running imports.
 */
function resolveDeterministicDocId(collectionName: string, item: any): string | undefined {
  if (item.id && typeof item.id === 'string' && item.id.trim() !== '') {
    return item.id.trim();
  }

  switch (collectionName) {
    case 'enrollments':
      if (item.academicYearId && item.classId && item.studentId) {
        return `${item.academicYearId}_${item.classId}_${item.studentId}`;
      }
      break;
    case 'scores':
      if (item.assessmentItemId && item.studentId) {
        return `${item.assessmentItemId}_${item.studentId}`;
      }
      break;
    case 'classSchedules':
      if (item.classId && item.academicYearId && item.semester) {
        return `${item.classId}_${item.academicYearId}_${item.semester}`;
      }
      break;
    case 'dailyAttendanceSessions':
      if (item.academicYearId && item.classId && item.date) {
        return `${item.academicYearId}_${item.semester || '1'}_${item.classId}_${item.date}`;
      }
      break;
    case 'dailyAttendanceRecords':
      if (item.sessionId && item.studentId) {
        return `${item.sessionId}_${item.studentId}`;
      }
      break;
    case 'teacherMonthlyAttendance':
      if (item.academicYearId && item.month && item.year) {
        return `${item.academicYearId}_${item.semester || '1'}_${item.month}_${item.year}`;
      }
      break;
    case 'studentCustomFields':
      if (item.fieldKey) {
        return String(item.fieldKey);
      }
      break;
    case 'attendanceRecords':
      if (item.meetingId && item.studentId) {
        return `${item.meetingId}_${item.studentId}`;
      }
      break;
  }
  return undefined;
}

/**
 * Import and restore backup JSON data into Firestore.
 * Features:
 * - Deterministic ID resolution & in-memory deduplication for strict idempotency
 * - Safe batch chunking (max 300 ops per commit, well under Firestore's 500 limit)
 * - Granular progress callback support
 */
export async function importFullDatabase(
  uid: string, 
  backup: DatabaseBackup, 
  mode: 'merge' | 'overwrite' = 'merge',
  onProgress?: (info: ImportProgressInfo) => void
): Promise<{ success: boolean; totalRestored: number }> {
  if (!backup || !backup.collections) {
    throw new Error('Format file backup tidak valid. Objek "collections" tidak ditemukan.');
  }

  const collectionsToRestore: Array<{ name: string; items: any[] }> = [
    { name: 'academicYears', items: backup.collections.academicYears || [] },
    { name: 'classes', items: backup.collections.classes || [] },
    { name: 'subjects', items: backup.collections.subjects || [] },
    { name: 'teachingAssignments', items: backup.collections.teachingAssignments || [] },
    { name: 'students', items: backup.collections.students || [] },
    { name: 'studentCustomFields', items: backup.collections.studentCustomFields || [] },
    { name: 'enrollments', items: backup.collections.enrollments || [] },
    { name: 'meetings', items: backup.collections.meetings || [] },
    { name: 'attendanceRecords', items: backup.collections.attendanceRecords || [] },
    { name: 'dailyAttendanceSessions', items: backup.collections.dailyAttendanceSessions || [] },
    { name: 'dailyAttendanceRecords', items: backup.collections.dailyAttendanceRecords || [] },
    { name: 'assessmentItems', items: backup.collections.assessmentItems || [] },
    { name: 'scores', items: backup.collections.scores || [] },
    { name: 'studentNotes', items: backup.collections.studentNotes || [] },
    { name: 'teacherAttendanceRecords', items: backup.collections.teacherAttendanceRecords || [] },
    { name: 'teacherMonthlyAttendance', items: backup.collections.teacherMonthlyAttendance || [] },
    { name: 'classSchedules', items: backup.collections.classSchedules || [] },
  ];

  // Calculate grand total items to process
  let totalGrandItems = collectionsToRestore.reduce((acc, c) => acc + c.items.length, 0);
  if (backup.collections.settings && typeof backup.collections.settings === 'object') {
    totalGrandItems += Object.keys(backup.collections.settings).length;
  }

  let totalRestored = 0;
  let itemsProcessedCount = 0;
  const maxBatchSize = 300; // Safe limit under Firestore's 500 limit
  const totalCollections = collectionsToRestore.length + (backup.collections.settings ? 1 : 0);

  // 1. Process standard subcollections with idempotency
  for (let cIdx = 0; cIdx < collectionsToRestore.length; cIdx++) {
    const col = collectionsToRestore[cIdx];
    if (col.items.length === 0) continue;

    // In-memory deduplication pass using deterministic IDs to prevent batch conflicts
    const deduplicatedMap = new Map<string, any>();
    const anonymousItems: any[] = [];

    col.items.forEach(item => {
      const resolvedId = resolveDeterministicDocId(col.name, item);
      if (resolvedId) {
        deduplicatedMap.set(resolvedId, { ...item, id: resolvedId });
      } else {
        anonymousItems.push(item);
      }
    });

    const finalItems = [...Array.from(deduplicatedMap.values()), ...anonymousItems];

    for (let i = 0; i < finalItems.length; i += maxBatchSize) {
      const chunk = finalItems.slice(i, i + maxBatchSize);
      const batch = writeBatch(db);

      chunk.forEach(item => {
        const { id, ...data } = item;
        const targetDocRef = id 
          ? doc(db, 'users', uid, col.name, id)
          : doc(collection(db, 'users', uid, col.name));

        if (col.name === 'students') {
          if (!data.searchTokens || !Array.isArray(data.searchTokens) || data.searchTokens.length === 0) {
            data.searchTokens = buildStudentSearchTokens(data.fullName, data.parentName);
          }
        }

        // Sanitize userId to ensure strict tenant isolation
        if ('userId' in data || col.name === 'meetings' || col.name === 'students') {
          data.userId = uid;
        }
        
        batch.set(targetDocRef, data, { merge: mode === 'merge' });
        totalRestored++;
        itemsProcessedCount++;
      });

      await batch.commit();

      if (onProgress) {
        onProgress({
          collectionName: col.name,
          collectionIndex: cIdx + 1,
          totalCollections,
          processedItems: itemsProcessedCount,
          totalItems: totalGrandItems,
          percentage: Math.min(100, Math.round((itemsProcessedCount / Math.max(1, totalGrandItems)) * 100)),
          message: `Memulihkan koleksi ${col.name} (${itemsProcessedCount}/${totalGrandItems})...`
        });
      }
    }
  }

  // 2. Process settings subcollection
  if (backup.collections.settings && typeof backup.collections.settings === 'object') {
    const batch = writeBatch(db);
    Object.entries(backup.collections.settings).forEach(([key, val]) => {
      const docRef = doc(db, 'users', uid, 'settings', key);
      batch.set(docRef, val, { merge: mode === 'merge' });
      totalRestored++;
      itemsProcessedCount++;
    });
    await batch.commit();

    if (onProgress) {
      onProgress({
        collectionName: 'settings',
        collectionIndex: totalCollections,
        totalCollections,
        processedItems: itemsProcessedCount,
        totalItems: totalGrandItems,
        percentage: 100,
        message: 'Pengaturan aplikasi berhasil dipulihkan.'
      });
    }
  }

  return { success: true, totalRestored };
}

/**
 * Fetch statistical count of documents across all subcollections and check latency
 */
export async function getDatabaseStatistics(uid: string): Promise<DatabaseStatistics> {
  const startTime = performance.now();
  let isConnected = true;

  try {
    // Ping connection
    await getDocFromServer(doc(db, 'users', uid, 'settings', 'school'));
  } catch (e) {
    isConnected = false;
  }
  const latencyMs = Math.round(performance.now() - startTime);

  const [
    academicYears,
    classes,
    subjects,
    teachingAssignments,
    students,
    enrollments,
    meetings,
    attendanceRecords,
    dailyAttendanceSessions,
    dailyAttendanceRecords,
    assessmentItems,
    scores,
    studentNotes,
    teacherAttendanceRecords,
    teacherMonthlyAttendance,
    classSchedules,
    studentCustomFields
  ] = await Promise.all([
    fetchCollectionData(uid, 'academicYears'),
    fetchCollectionData(uid, 'classes'),
    fetchCollectionData(uid, 'subjects'),
    fetchCollectionData(uid, 'teachingAssignments'),
    fetchCollectionData(uid, 'students'),
    fetchCollectionData(uid, 'enrollments'),
    fetchCollectionData(uid, 'meetings'),
    fetchCollectionData(uid, 'attendanceRecords'),
    fetchCollectionData(uid, 'dailyAttendanceSessions'),
    fetchCollectionData(uid, 'dailyAttendanceRecords'),
    fetchCollectionData(uid, 'assessmentItems'),
    fetchCollectionData(uid, 'scores'),
    fetchCollectionData(uid, 'studentNotes'),
    fetchCollectionData(uid, 'teacherAttendanceRecords'),
    fetchCollectionData(uid, 'teacherMonthlyAttendance'),
    fetchCollectionData(uid, 'classSchedules'),
    fetchCollectionData(uid, 'studentCustomFields'),
  ]);

  const totalDocuments = 
    academicYears.length +
    classes.length +
    subjects.length +
    teachingAssignments.length +
    students.length +
    enrollments.length +
    meetings.length +
    attendanceRecords.length +
    dailyAttendanceSessions.length +
    dailyAttendanceRecords.length +
    assessmentItems.length +
    scores.length +
    studentNotes.length +
    teacherAttendanceRecords.length +
    teacherMonthlyAttendance.length +
    classSchedules.length +
    studentCustomFields.length;

  return {
    academicYearsCount: academicYears.length,
    classesCount: classes.length,
    subjectsCount: subjects.length,
    teachingAssignmentsCount: teachingAssignments.length,
    studentsCount: students.length,
    enrollmentsCount: enrollments.length,
    meetingsCount: meetings.length,
    attendanceRecordsCount: attendanceRecords.length,
    dailyAttendanceSessionsCount: dailyAttendanceSessions.length,
    dailyAttendanceRecordsCount: dailyAttendanceRecords.length,
    teacherAttendanceRecordsCount: teacherAttendanceRecords.length,
    teacherMonthlyAttendanceCount: teacherMonthlyAttendance.length,
    classSchedulesCount: classSchedules.length,
    studentCustomFieldsCount: studentCustomFields.length,
    assessmentItemsCount: assessmentItems.length,
    scoresCount: scores.length,
    studentNotesCount: studentNotes.length,
    totalDocuments,
    latencyMs,
    isConnected,
  };
}

/**
 * Pre-flight dry-run query for resetSemesterData.
 * Safely calculates exact counts of records that would be removed without performing any writes/deletions.
 */
export async function previewSemesterReset(
  uid: string, 
  options: ResetSemesterOptions
): Promise<ResetSemesterSummary> {
  const { academicYearId, semester = 'ALL', scope } = options;
  const isAllSemesters = !semester || semester === 'ALL';

  const scopeConfig: ResetSemesterScope = {
    meetingsAndAttendance: scope?.meetingsAndAttendance ?? true,
    assessmentsAndScores: scope?.assessmentsAndScores ?? true,
    dailyAttendance: scope?.dailyAttendance ?? true,
    teacherAttendance: scope?.teacherAttendance ?? false,
    classSchedules: scope?.classSchedules ?? false,
    studentNotes: scope?.studentNotes ?? false,
  };

  let meetingsCount = 0;
  let attendanceRecordsCount = 0;
  let assessmentItemsCount = 0;
  let scoresCount = 0;
  let dailyAttendanceSessionsCount = 0;
  let dailyAttendanceRecordsCount = 0;
  let teacherAttendanceRecordsCount = 0;
  let teacherMonthlyAttendanceCount = 0;
  let classSchedulesCount = 0;
  let studentNotesCount = 0;

  // 1. Meetings & Subject Attendance
  if (scopeConfig.meetingsAndAttendance) {
    const meetingsRef = collection(db, 'users', uid, 'meetings');
    const meetingsSnap = await getDocs(query(meetingsRef, where('academicYearId', '==', academicYearId)));
    const matchingMeetings = meetingsSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    meetingsCount = matchingMeetings.length;
    const meetingIds = matchingMeetings.map(d => d.id);

    // Query subject attendance records
    const attYearSnap = await getDocs(query(collection(db, 'users', uid, 'attendanceRecords'), where('academicYearId', '==', academicYearId)));
    const matchingAtt = attYearSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    const countedAttIds = new Set<string>(matchingAtt.map(d => d.id));

    // Also check legacy attendance bound to meetingIds
    for (let i = 0; i < meetingIds.length; i += 30) {
      const chunkIds = meetingIds.slice(i, i + 30);
      const legacyAttSnap = await getDocs(query(collection(db, 'users', uid, 'attendanceRecords'), where('meetingId', 'in', chunkIds)));
      legacyAttSnap.docs.forEach(d => countedAttIds.add(d.id));
    }
    attendanceRecordsCount = countedAttIds.size;
  }

  // 2. Assessment Items & Scores
  if (scopeConfig.assessmentsAndScores) {
    const assessRef = collection(db, 'users', uid, 'assessmentItems');
    const assessSnap = await getDocs(query(assessRef, where('academicYearId', '==', academicYearId)));
    const matchingAssess = assessSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    assessmentItemsCount = matchingAssess.length;
    const assessIds = matchingAssess.map(d => d.id);

    for (let i = 0; i < assessIds.length; i += 30) {
      const chunkIds = assessIds.slice(i, i + 30);
      const scoresSnap = await getDocs(query(collection(db, 'users', uid, 'scores'), where('assessmentItemId', 'in', chunkIds)));
      scoresCount += scoresSnap.docs.length;
    }
  }

  // 3. Daily Attendance Sessions & Records
  if (scopeConfig.dailyAttendance) {
    const dailySessionsSnap = await getDocs(query(collection(db, 'users', uid, 'dailyAttendanceSessions'), where('academicYearId', '==', academicYearId)));
    const matchingSessions = dailySessionsSnap.docs.filter(d => isAllSemesters || !d.data().semester || d.data().semester === semester);
    dailyAttendanceSessionsCount = matchingSessions.length;
    const sessionIds = matchingSessions.map(d => d.id);

    const dailyRecsSnap = await getDocs(query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('academicYearId', '==', academicYearId)));
    const matchingRecIds = new Set<string>(dailyRecsSnap.docs.map(d => d.id));

    for (let i = 0; i < sessionIds.length; i += 30) {
      const chunkIds = sessionIds.slice(i, i + 30);
      const sessRecsSnap = await getDocs(query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('sessionId', 'in', chunkIds)));
      sessRecsSnap.docs.forEach(d => matchingRecIds.add(d.id));
    }
    dailyAttendanceRecordsCount = matchingRecIds.size;
  }

  // 4. Teacher Attendance (Optional)
  if (scopeConfig.teacherAttendance) {
    const teacherRecsSnap = await getDocs(query(collection(db, 'users', uid, 'teacherAttendanceRecords'), where('academicYearId', '==', academicYearId)));
    teacherAttendanceRecordsCount = teacherRecsSnap.docs.filter(d => isAllSemesters || d.data().semester === semester).length;

    const teacherMonthlySnap = await getDocs(query(collection(db, 'users', uid, 'teacherMonthlyAttendance'), where('academicYearId', '==', academicYearId)));
    teacherMonthlyAttendanceCount = teacherMonthlySnap.docs.filter(d => isAllSemesters || d.data().semester === semester).length;
  }

  // 5. Class Schedules (Optional)
  if (scopeConfig.classSchedules) {
    const schedSnap = await getDocs(query(collection(db, 'users', uid, 'classSchedules'), where('academicYearId', '==', academicYearId)));
    classSchedulesCount = schedSnap.docs.filter(d => isAllSemesters || d.data().semester === semester).length;
  }

  // 6. Student Notes (Optional)
  if (scopeConfig.studentNotes) {
    const notesSnap = await getDocs(query(collection(db, 'users', uid, 'studentNotes'), where('academicYearId', '==', academicYearId)));
    studentNotesCount = notesSnap.docs.length;
  }

  const totalDeleted = 
    meetingsCount + 
    attendanceRecordsCount + 
    assessmentItemsCount + 
    scoresCount + 
    dailyAttendanceSessionsCount + 
    dailyAttendanceRecordsCount + 
    teacherAttendanceRecordsCount + 
    teacherMonthlyAttendanceCount + 
    classSchedulesCount + 
    studentNotesCount;

  return {
    academicYearId,
    semester,
    meetings: meetingsCount,
    attendanceRecords: attendanceRecordsCount,
    assessmentItems: assessmentItemsCount,
    scores: scoresCount,
    dailyAttendanceSessions: dailyAttendanceSessionsCount,
    dailyAttendanceRecords: dailyAttendanceRecordsCount,
    teacherAttendanceRecords: teacherAttendanceRecordsCount,
    teacherMonthlyAttendance: teacherMonthlyAttendanceCount,
    classSchedules: classSchedulesCount,
    studentNotes: studentNotesCount,
    totalDeleted,
  };
}

/**
 * Granular & Safe Semester Data Reset.
 * Semantics:
 * - Allows targeting a specific semester ('1' | '2') or 'ALL'
 * - Granular scope selection (KBM, assessments, daily attendance, teacher attendance, schedules, notes)
 * - Strict safeguard: blocks execution on archived academic years unless explicitly authorized (forceArchived: true)
 * - Resilient batch chunking (max 300 items per batch commit)
 * - Returns structured summary of all purged documents
 */
export async function resetSemesterData(
  uid: string, 
  optionsOrYearId: string | ResetSemesterOptions,
  maybeSemester?: SemesterType | 'ALL'
): Promise<ResetSemesterSummary> {
  const options: ResetSemesterOptions = typeof optionsOrYearId === 'string'
    ? {
        academicYearId: optionsOrYearId,
        semester: maybeSemester || 'ALL',
        scope: {
          meetingsAndAttendance: true,
          assessmentsAndScores: true,
          dailyAttendance: true,
          teacherAttendance: false,
          classSchedules: false,
          studentNotes: false,
        }
      }
    : optionsOrYearId;

  const { academicYearId, semester = 'ALL', scope, forceArchived = false } = options;
  const isAllSemesters = !semester || semester === 'ALL';

  const scopeConfig: ResetSemesterScope = {
    meetingsAndAttendance: scope?.meetingsAndAttendance ?? true,
    assessmentsAndScores: scope?.assessmentsAndScores ?? true,
    dailyAttendance: scope?.dailyAttendance ?? true,
    teacherAttendance: scope?.teacherAttendance ?? false,
    classSchedules: scope?.classSchedules ?? false,
    studentNotes: scope?.studentNotes ?? false,
  };

  // Safeguard: Check if Academic Year is archived
  const ayDoc = await getDoc(doc(db, 'users', uid, 'academicYears', academicYearId));
  if (ayDoc.exists() && ayDoc.data()?.isArchived && !forceArchived) {
    throw new Error('Tahun Ajaran ini berstatus diarsipkan (read-only). Buka status arsip terlebih dahulu di master Tahun Ajaran sebelum menghapus data KBM.');
  }

  let deletedCount = 0;
  const maxBatchSize = 300;

  let meetingsDeleted = 0;
  let attendanceRecordsDeleted = 0;
  let assessmentItemsDeleted = 0;
  let scoresDeleted = 0;
  let dailySessionsDeleted = 0;
  let dailyRecordsDeleted = 0;
  let teacherRecordsDeleted = 0;
  let teacherMonthlyDeleted = 0;
  let classSchedulesDeleted = 0;
  let studentNotesDeleted = 0;

  // 1. Delete Meetings & Subject Attendance
  if (scopeConfig.meetingsAndAttendance) {
    // 1a. Meetings
    const meetingsRef = collection(db, 'users', uid, 'meetings');
    const meetingsSnap = await getDocs(query(meetingsRef, where('academicYearId', '==', academicYearId)));
    const matchingMeetings = meetingsSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    const meetingIds = matchingMeetings.map(d => d.id);

    // 1b. Attendance records by academicYearId
    const attYearQ = query(collection(db, 'users', uid, 'attendanceRecords'), where('academicYearId', '==', academicYearId));
    const attYearSnap = await getDocs(attYearQ);
    const matchingAttDocs = attYearSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    const deletedAttIds = new Set<string>();

    for (let j = 0; j < matchingAttDocs.length; j += maxBatchSize) {
      const chunkDocs = matchingAttDocs.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        deletedAttIds.add(d.id);
        attendanceRecordsDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }

    // 1c. Legacy attendance records by meetingId
    for (let i = 0; i < meetingIds.length; i += 30) {
      const chunkIds = meetingIds.slice(i, i + 30);
      const attQ = query(collection(db, 'users', uid, 'attendanceRecords'), where('meetingId', 'in', chunkIds));
      const attSnap = await getDocs(attQ);
      const remainingDocs = attSnap.docs.filter(d => !deletedAttIds.has(d.id));

      for (let j = 0; j < remainingDocs.length; j += maxBatchSize) {
        const chunkDocs = remainingDocs.slice(j, j + maxBatchSize);
        const batch = writeBatch(db);
        chunkDocs.forEach(d => {
          batch.delete(d.ref);
          deletedAttIds.add(d.id);
          attendanceRecordsDeleted++;
          deletedCount++;
        });
        await batch.commit();
      }
    }

    // 1d. Delete meeting docs
    for (let i = 0; i < matchingMeetings.length; i += maxBatchSize) {
      const chunk = matchingMeetings.slice(i, i + maxBatchSize);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.delete(d.ref);
        meetingsDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }
  }

  // 2. Delete Assessment Items & Scores
  if (scopeConfig.assessmentsAndScores) {
    const assessRef = collection(db, 'users', uid, 'assessmentItems');
    const assessSnap = await getDocs(query(assessRef, where('academicYearId', '==', academicYearId)));
    const matchingAssess = assessSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    const assessIds = matchingAssess.map(d => d.id);

    // Delete scores for these assessment items
    for (let i = 0; i < assessIds.length; i += 30) {
      const chunkIds = assessIds.slice(i, i + 30);
      const scoresQ = query(collection(db, 'users', uid, 'scores'), where('assessmentItemId', 'in', chunkIds));
      const scoresSnap = await getDocs(scoresQ);

      for (let j = 0; j < scoresSnap.docs.length; j += maxBatchSize) {
        const chunk = scoresSnap.docs.slice(j, j + maxBatchSize);
        const batch = writeBatch(db);
        chunk.forEach(d => {
          batch.delete(d.ref);
          scoresDeleted++;
          deletedCount++;
        });
        await batch.commit();
      }
    }

    // Delete assessment items
    for (let i = 0; i < matchingAssess.length; i += maxBatchSize) {
      const chunk = matchingAssess.slice(i, i + maxBatchSize);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.delete(d.ref);
        assessmentItemsDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }
  }

  // 3. Delete Daily Attendance Sessions & Records
  if (scopeConfig.dailyAttendance) {
    const dailySessionsQ = query(collection(db, 'users', uid, 'dailyAttendanceSessions'), where('academicYearId', '==', academicYearId));
    const dailySessionsSnap = await getDocs(dailySessionsQ);
    const matchingSessions = dailySessionsSnap.docs.filter(d => isAllSemesters || !d.data().semester || d.data().semester === semester);
    const sessionIds = matchingSessions.map(d => d.id);
    const deletedDailyRecIds = new Set<string>();

    // Delete dailyAttendanceRecords by academicYearId
    const dailyRecsQ = query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('academicYearId', '==', academicYearId));
    const dailyRecsSnap = await getDocs(dailyRecsQ);
    for (let j = 0; j < dailyRecsSnap.docs.length; j += maxBatchSize) {
      const chunkDocs = dailyRecsSnap.docs.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        deletedDailyRecIds.add(d.id);
        dailyRecordsDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }

    // Delete dailyAttendanceRecords by sessionId
    for (let i = 0; i < sessionIds.length; i += 30) {
      const chunkIds = sessionIds.slice(i, i + 30);
      const sessRecsQ = query(collection(db, 'users', uid, 'dailyAttendanceRecords'), where('sessionId', 'in', chunkIds));
      const sessRecsSnap = await getDocs(sessRecsQ);
      const remainingDocs = sessRecsSnap.docs.filter(d => !deletedDailyRecIds.has(d.id));

      for (let j = 0; j < remainingDocs.length; j += maxBatchSize) {
        const chunkDocs = remainingDocs.slice(j, j + maxBatchSize);
        const batch = writeBatch(db);
        chunkDocs.forEach(d => {
          batch.delete(d.ref);
          deletedDailyRecIds.add(d.id);
          dailyRecordsDeleted++;
          deletedCount++;
        });
        await batch.commit();
      }
    }

    // Delete sessions
    for (let j = 0; j < matchingSessions.length; j += maxBatchSize) {
      const chunkDocs = matchingSessions.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        dailySessionsDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }
  }

  // 4. Delete Teacher Attendance (If selected)
  if (scopeConfig.teacherAttendance) {
    const teacherRecsSnap = await getDocs(query(collection(db, 'users', uid, 'teacherAttendanceRecords'), where('academicYearId', '==', academicYearId)));
    const matchingTeacherRecs = teacherRecsSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    for (let j = 0; j < matchingTeacherRecs.length; j += maxBatchSize) {
      const chunkDocs = matchingTeacherRecs.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        teacherRecordsDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }

    const teacherMonthlySnap = await getDocs(query(collection(db, 'users', uid, 'teacherMonthlyAttendance'), where('academicYearId', '==', academicYearId)));
    const matchingMonthly = teacherMonthlySnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    for (let j = 0; j < matchingMonthly.length; j += maxBatchSize) {
      const chunkDocs = matchingMonthly.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        teacherMonthlyDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }
  }

  // 5. Delete Class Schedules (If selected)
  if (scopeConfig.classSchedules) {
    const schedSnap = await getDocs(query(collection(db, 'users', uid, 'classSchedules'), where('academicYearId', '==', academicYearId)));
    const matchingSched = schedSnap.docs.filter(d => isAllSemesters || d.data().semester === semester);
    for (let j = 0; j < matchingSched.length; j += maxBatchSize) {
      const chunkDocs = matchingSched.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        classSchedulesDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }
  }

  // 6. Delete Student Notes (If selected)
  if (scopeConfig.studentNotes) {
    const notesSnap = await getDocs(query(collection(db, 'users', uid, 'studentNotes'), where('academicYearId', '==', academicYearId)));
    for (let j = 0; j < notesSnap.docs.length; j += maxBatchSize) {
      const chunkDocs = notesSnap.docs.slice(j, j + maxBatchSize);
      const batch = writeBatch(db);
      chunkDocs.forEach(d => {
        batch.delete(d.ref);
        studentNotesDeleted++;
        deletedCount++;
      });
      await batch.commit();
    }
  }

  return {
    academicYearId,
    semester,
    meetings: meetingsDeleted,
    attendanceRecords: attendanceRecordsDeleted,
    assessmentItems: assessmentItemsDeleted,
    scores: scoresDeleted,
    dailyAttendanceSessions: dailySessionsDeleted,
    dailyAttendanceRecords: dailyRecordsDeleted,
    teacherAttendanceRecords: teacherRecordsDeleted,
    teacherMonthlyAttendance: teacherMonthlyDeleted,
    classSchedules: classSchedulesDeleted,
    studentNotes: studentNotesDeleted,
    totalDeleted: deletedCount,
  };
}
