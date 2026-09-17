import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  query, 
  where,
  getDocFromServer 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { buildStudentSearchTokens } from './students';

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
  assessmentItemsCount: number;
  scoresCount: number;
  studentNotesCount: number;
  totalDocuments: number;
  latencyMs: number;
  isConnected: boolean;
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
    settingsList.length;

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userId: uid,
    metadata: {
      teacherName: teacherName || 'Guru',
      schoolName: schoolName || 'Madrasah',
      totalCollections: 17,
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
      settings: settingsMap,
    },
  };
}

/**
 * Import and restore backup JSON data into Firestore
 */
export async function importFullDatabase(
  uid: string, 
  backup: DatabaseBackup, 
  mode: 'merge' | 'overwrite' = 'merge'
): Promise<{ success: boolean; totalRestored: number }> {
  if (!backup || !backup.collections) {
    throw new Error('Format file backup tidak valid. Objek "collections" tidak ditemukan.');
  }

  const collectionsToRestore = [
    { name: 'academicYears', items: backup.collections.academicYears || [] },
    { name: 'classes', items: backup.collections.classes || [] },
    { name: 'subjects', items: backup.collections.subjects || [] },
    { name: 'teachingAssignments', items: backup.collections.teachingAssignments || [] },
    { name: 'students', items: backup.collections.students || [] },
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

  let totalRestored = 0;
  const maxBatchSize = 400; // Safe limit under Firestore's 500 limit

  // 1. Process standard subcollections
  for (const col of collectionsToRestore) {
    if (col.items.length === 0) continue;

    for (let i = 0; i < col.items.length; i += maxBatchSize) {
      const chunk = col.items.slice(i, i + maxBatchSize);
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
        
        batch.set(targetDocRef, data, { merge: mode === 'merge' });
        totalRestored++;
      });

      await batch.commit();
    }
  }

  // 2. Process settings subcollection
  if (backup.collections.settings && typeof backup.collections.settings === 'object') {
    const batch = writeBatch(db);
    Object.entries(backup.collections.settings).forEach(([key, val]) => {
      const docRef = doc(db, 'users', uid, 'settings', key);
      batch.set(docRef, val, { merge: mode === 'merge' });
      totalRestored++;
    });
    await batch.commit();
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
    classSchedules
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
    classSchedules.length;

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
    assessmentItemsCount: assessmentItems.length,
    scoresCount: scores.length,
    studentNotesCount: studentNotes.length,
    totalDocuments,
    latencyMs,
    isConnected,
  };
}

/**
 * Delete semester-specific transactional data (meetings, attendance, assessment items, scores)
 */
export async function resetSemesterData(uid: string, academicYearId: string): Promise<number> {
  let deletedCount = 0;
  const maxBatchSize = 400;

  // 1. Delete all subject attendance records for this academic year
  const attYearQ = query(collection(db, 'users', uid, 'attendanceRecords'), where('academicYearId', '==', academicYearId));
  const attYearSnap = await getDocs(attYearQ);
  for (let j = 0; j < attYearSnap.docs.length; j += maxBatchSize) {
    const chunkDocs = attYearSnap.docs.slice(j, j + maxBatchSize);
    const batch = writeBatch(db);
    chunkDocs.forEach(d => {
      batch.delete(d.ref);
      deletedCount++;
    });
    await batch.commit();
  }

  // 1b. Delete meetings & any legacy meeting-bound attendance
  const meetingsRef = collection(db, 'users', uid, 'meetings');
  const meetingsQ = query(meetingsRef, where('academicYearId', '==', academicYearId));
  const meetingsSnap = await getDocs(meetingsQ);

  if (!meetingsSnap.empty) {
    const meetingIds = meetingsSnap.docs.map(d => d.id);
    
    // Delete legacy attendance records for these meetings (if any remain)
    for (let i = 0; i < meetingIds.length; i += 30) {
      const chunkIds = meetingIds.slice(i, i + 30);
      const attQ = query(collection(db, 'users', uid, 'attendanceRecords'), where('meetingId', 'in', chunkIds));
      const attSnap = await getDocs(attQ);
      
      for (let j = 0; j < attSnap.docs.length; j += maxBatchSize) {
        const chunkDocs = attSnap.docs.slice(j, j + maxBatchSize);
        const batch = writeBatch(db);
        chunkDocs.forEach(d => {
          batch.delete(d.ref);
          deletedCount++;
        });
        await batch.commit();
      }
    }

    // Delete meetings
    for (let i = 0; i < meetingsSnap.docs.length; i += maxBatchSize) {
      const chunk = meetingsSnap.docs.slice(i, i + maxBatchSize);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.delete(d.ref);
        deletedCount++;
      });
      await batch.commit();
    }
  }

  // 2. Delete assessment items & scores
  const assessRef = collection(db, 'users', uid, 'assessmentItems');
  const assessQ = query(assessRef, where('academicYearId', '==', academicYearId));
  const assessSnap = await getDocs(assessQ);

  if (!assessSnap.empty) {
    const assessIds = assessSnap.docs.map(d => d.id);

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
          deletedCount++;
        });
        await batch.commit();
      }
    }

    // Delete assessment items
    for (let i = 0; i < assessSnap.docs.length; i += maxBatchSize) {
      const chunk = assessSnap.docs.slice(i, i + maxBatchSize);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.delete(d.ref);
        deletedCount++;
      });
      await batch.commit();
    }
  }

  return deletedCount;
}
