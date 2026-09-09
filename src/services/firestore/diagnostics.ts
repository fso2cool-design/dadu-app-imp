import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface IntegrityIssue {
  type: 
    | 'ORPHAN_SCORE' 
    | 'ORPHAN_ATTENDANCE' 
    | 'ORPHAN_DAILY_ATTENDANCE' 
    | 'ORPHAN_ENROLLMENT'
    | 'ORPHAN_STUDENT_ENROLLMENT'
    | 'ORPHAN_CLASS_ENROLLMENT'
    | 'ORPHAN_CLASS'
    | 'ORPHAN_MEETING' 
    | 'ORPHAN_ASSESSMENT' 
    | 'DUPLICATE_ACTIVE_ENROLLMENT' 
    | 'DUPLICATE_NISN'
    | 'INVALID_SCORE_RANGE' 
    | 'ORPHAN_STUDENT_NOTE'
    | 'ORPHAN_TEACHER_ATTENDANCE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  documentId: string;
  collectionName: string;
  details?: any;
}

export interface DiagnosticResult {
  timestamp: string;
  totalIssues: number;
  criticalCount: number;
  warningsCount: number;
  infoCount: number;
  issues: IntegrityIssue[];
  summary: {
    totalStudents: number;
    totalClasses: number;
    totalEnrollments: number;
    totalAssignments: number;
    totalMeetings: number;
    totalAttendanceRecords: number;
    totalAssessmentItems: number;
    totalScores: number;
  };
}

/**
 * Perform a 100% read-only integrity diagnostic check on user workspace
 */
export async function runIntegrityAudit(uid: string): Promise<DiagnosticResult> {
  const issues: IntegrityIssue[] = [];

  // 1. Fetch all collections in user workspace
  const [
    studentsSnap,
    classesSnap,
    academicYearsSnap,
    enrollmentsSnap,
    assignmentsSnap,
    meetingsSnap,
    attendanceSnap,
    dailySessionsSnap,
    dailyRecordsSnap,
    assessmentItemsSnap,
    scoresSnap,
    notesSnap,
    teacherAttendanceSnap
  ] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'students')),
    getDocs(collection(db, 'users', uid, 'classes')),
    getDocs(collection(db, 'users', uid, 'academicYears')),
    getDocs(collection(db, 'users', uid, 'enrollments')),
    getDocs(collection(db, 'users', uid, 'teachingAssignments')),
    getDocs(collection(db, 'users', uid, 'meetings')),
    getDocs(collection(db, 'users', uid, 'attendanceRecords')),
    getDocs(collection(db, 'users', uid, 'dailyAttendanceSessions')),
    getDocs(collection(db, 'users', uid, 'dailyAttendanceRecords')),
    getDocs(collection(db, 'users', uid, 'assessmentItems')),
    getDocs(collection(db, 'users', uid, 'scores')),
    getDocs(collection(db, 'users', uid, 'studentNotes')),
    getDocs(collection(db, 'users', uid, 'teacherAttendanceRecords')),
  ]);

  const studentIds = new Set(studentsSnap.docs.map(d => d.id));
  const classIds = new Set(classesSnap.docs.map(d => d.id));
  const academicYearIds = new Set(academicYearsSnap.docs.map(d => d.id));
  const assignmentIds = new Set(assignmentsSnap.docs.map(d => d.id));
  const meetingIds = new Set(meetingsSnap.docs.map(d => d.id));
  const assessmentItemIds = new Set(assessmentItemsSnap.docs.map(d => d.id));

  // Check 0: Duplicate NISN among active students
  const activeNisnTracker = new Map<string, Array<{ id: string; name: string }>>();
  studentsSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (!data.isArchived && data.status !== 'ARCHIVED' && data.nisn) {
      const cleanNisn = String(data.nisn).trim();
      if (cleanNisn) {
        const list = activeNisnTracker.get(cleanNisn) || [];
        list.push({ id: docSnap.id, name: data.fullName || 'Tanpa Nama' });
        activeNisnTracker.set(cleanNisn, list);
      }
    }
  });

  activeNisnTracker.forEach((studentsWithNisn, nisn) => {
    if (studentsWithNisn.length > 1) {
      issues.push({
        type: 'DUPLICATE_NISN',
        severity: 'WARNING',
        description: `NISN "${nisn}" digunakan oleh lebih dari 1 siswa aktif: ${studentsWithNisn.map(s => `${s.name} (${s.id})`).join(', ')}.`,
        documentId: studentsWithNisn[0].id,
        collectionName: 'students',
        details: { nisn, students: studentsWithNisn },
      });
    }
  });

  // Check 0.5: Orphan Classes (Missing AcademicYear)
  classesSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.academicYearId && !academicYearIds.has(data.academicYearId)) {
      issues.push({
        type: 'ORPHAN_CLASS',
        severity: 'WARNING',
        description: `Kelas "${data.name || docSnap.id}" merujuk ke Tahun Ajaran (${data.academicYearId}) yang tidak ditemukan di master Tahun Ajaran.`,
        documentId: docSnap.id,
        collectionName: 'classes',
        details: data,
      });
    }
  });

  // Check 1: Orphan Enrollments & Duplicate Active Enrollments
  const activeEnrollmentsTracker = new Map<string, string>(); // key: `${academicYearId}_${studentId}` -> classId

  enrollmentsSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.studentId && !studentIds.has(data.studentId)) {
      issues.push({
        type: 'ORPHAN_STUDENT_ENROLLMENT',
        severity: 'CRITICAL',
        description: `Penempatan siswa merujuk ke ID Siswa (${data.studentId}) yang tidak ada di master siswa.`,
        documentId: docSnap.id,
        collectionName: 'enrollments',
        details: data,
      });
    }
    if (data.classId && !classIds.has(data.classId)) {
      issues.push({
        type: 'ORPHAN_CLASS_ENROLLMENT',
        severity: 'WARNING',
        description: `Penempatan siswa merujuk ke ID Kelas (${data.classId}) yang sudah tidak ada di master kelas. Data dapat dipulihkan ke kelas baru.`,
        documentId: docSnap.id,
        collectionName: 'enrollments',
        details: data,
      });
    }
    if (data.academicYearId && !academicYearIds.has(data.academicYearId)) {
      issues.push({
        type: 'ORPHAN_ENROLLMENT',
        severity: 'WARNING',
        description: `Penempatan siswa merujuk ke Tahun Ajaran (${data.academicYearId}) yang tidak ditemukan di master Tahun Ajaran.`,
        documentId: docSnap.id,
        collectionName: 'enrollments',
        details: data,
      });
    }

    if (data.status === 'ACTIVE' && data.academicYearId && data.studentId) {
      const trackerKey = `${data.academicYearId}_${data.studentId}`;
      if (activeEnrollmentsTracker.has(trackerKey)) {
        issues.push({
          type: 'DUPLICATE_ACTIVE_ENROLLMENT',
          severity: 'CRITICAL',
          description: `Siswa memiliki lebih dari satu penempatan kelas berstatus AKTIF pada tahun ajaran yang sama.`,
          documentId: docSnap.id,
          collectionName: 'enrollments',
          details: { ...data, previousClassId: activeEnrollmentsTracker.get(trackerKey) },
        });
      } else {
        activeEnrollmentsTracker.set(trackerKey, data.classId);
      }
    }
  });

  // Check 2: Orphan Meetings
  meetingsSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.teachingAssignmentId && !assignmentIds.has(data.teachingAssignmentId)) {
      issues.push({
        type: 'ORPHAN_MEETING',
        severity: 'WARNING',
        description: `Jurnal tatap muka merujuk ke Tugas Mengajar (${data.teachingAssignmentId}) yang sudah tidak ada.`,
        documentId: docSnap.id,
        collectionName: 'meetings',
        details: data,
      });
    }
  });

  // Check 3: Orphan Subject Attendance Records
  attendanceSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.meetingId && !meetingIds.has(data.meetingId)) {
      issues.push({
        type: 'ORPHAN_ATTENDANCE',
        severity: 'CRITICAL',
        description: `Rekam presensi mata pelajaran merujuk ke Jurnal Pertemuan (${data.meetingId}) yang tidak ditemukan.`,
        documentId: docSnap.id,
        collectionName: 'attendanceRecords',
        details: data,
      });
    }
    if (data.studentId && !studentIds.has(data.studentId)) {
      issues.push({
        type: 'ORPHAN_ATTENDANCE',
        severity: 'WARNING',
        description: `Rekam presensi merujuk ke ID Siswa (${data.studentId}) yang tidak ada di master siswa.`,
        documentId: docSnap.id,
        collectionName: 'attendanceRecords',
        details: data,
      });
    }
  });

  // Check 4: Orphan Assessment Items
  assessmentItemsSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.teachingAssignmentId && !assignmentIds.has(data.teachingAssignmentId)) {
      issues.push({
        type: 'ORPHAN_ASSESSMENT',
        severity: 'WARNING',
        description: `Komponen penilaian merujuk ke Tugas Mengajar (${data.teachingAssignmentId}) yang sudah tidak ada.`,
        documentId: docSnap.id,
        collectionName: 'assessmentItems',
        details: data,
      });
    }
  });

  // Check 5: Orphan Scores & Score Range Validity
  scoresSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.assessmentItemId && !assessmentItemIds.has(data.assessmentItemId)) {
      issues.push({
        type: 'ORPHAN_SCORE',
        severity: 'CRITICAL',
        description: `Rekam nilai merujuk ke Komponen Penilaian (${data.assessmentItemId}) yang tidak ditemukan.`,
        documentId: docSnap.id,
        collectionName: 'scores',
        details: data,
      });
    }
    if (data.studentId && !studentIds.has(data.studentId)) {
      issues.push({
        type: 'ORPHAN_SCORE',
        severity: 'WARNING',
        description: `Rekam nilai merujuk ke ID Siswa (${data.studentId}) yang tidak ada di master siswa.`,
        documentId: docSnap.id,
        collectionName: 'scores',
        details: data,
      });
    }
    if (typeof data.score === 'number' && (data.score < 0 || data.score > 100)) {
      issues.push({
        type: 'INVALID_SCORE_RANGE',
        severity: 'CRITICAL',
        description: `Nilai berada di luar rentang valid 0 - 100 (Nilai terdaftar: ${data.score}).`,
        documentId: docSnap.id,
        collectionName: 'scores',
        details: data,
      });
    }
  });

  // Check 6: Orphan Student Notes
  notesSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.studentId && !studentIds.has(data.studentId)) {
      issues.push({
        type: 'ORPHAN_STUDENT_NOTE',
        severity: 'WARNING',
        description: `Catatan bimbingan merujuk ke ID Siswa (${data.studentId}) yang tidak ditemukan.`,
        documentId: docSnap.id,
        collectionName: 'studentNotes',
        details: data,
      });
    }
  });

  // Check 7: Orphan Teacher Attendance Records
  teacherAttendanceSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.classId && !classIds.has(data.classId)) {
      issues.push({
        type: 'ORPHAN_TEACHER_ATTENDANCE',
        severity: 'WARNING',
        description: `Rekap kehadiran guru mapel merujuk ke ID Kelas (${data.classId}) yang tidak ditemukan.`,
        documentId: docSnap.id,
        collectionName: 'teacherAttendanceRecords',
        details: data,
      });
    } else if (data.teachingAssignmentId && !assignmentIds.has(data.teachingAssignmentId)) {
      issues.push({
        type: 'ORPHAN_TEACHER_ATTENDANCE',
        severity: 'INFO',
        description: `Rekap kehadiran guru mapel merujuk ke ID Penugasan (${data.teachingAssignmentId}) yang telah dihapus permanen.`,
        documentId: docSnap.id,
        collectionName: 'teacherAttendanceRecords',
        details: data,
      });
    }
  });

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningsCount = issues.filter(i => i.severity === 'WARNING').length;
  const infoCount = issues.filter(i => i.severity === 'INFO').length;

  return {
    timestamp: new Date().toISOString(),
    totalIssues: issues.length,
    criticalCount,
    warningsCount,
    infoCount,
    issues,
    summary: {
      totalStudents: studentsSnap.size,
      totalClasses: classesSnap.size,
      totalEnrollments: enrollmentsSnap.size,
      totalAssignments: assignmentsSnap.size,
      totalMeetings: meetingsSnap.size,
      totalAttendanceRecords: attendanceSnap.size,
      totalAssessmentItems: assessmentItemsSnap.size,
      totalScores: scoresSnap.size,
    }
  };
}
