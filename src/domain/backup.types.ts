import { 
  SemesterType
} from '../types';

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

export interface ResetSemesterScope {
  meetingsAndAttendance: boolean; // Jurnal KBM & absensi mapel
  assessmentsAndScores: boolean;  // Butir asesmen & nilai
  dailyAttendance: boolean;       // Absensi harian wali kelas (sesi & rekap)
  teacherAttendance?: boolean;    // Absensi guru & rekap bulanan
  classSchedules?: boolean;       // Jadwal pelajaran
  studentNotes?: boolean;         // Catatan siswa terkait
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

