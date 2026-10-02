import type {
  AcademicYear,
  ClassItem,
  Subject,
  TeachingAssignment,
  SemesterType,
  AttendanceSettings,
  AttendanceRecord,
  AttendanceSummary,
  DailyAttendanceSession,
  DailyAttendanceRecord,
  TeacherAttendanceRecord,
  Meeting,
  AssessmentItem,
  Student,
  StudentPaginationOptions,
  PaginatedStudentsResult,
  StudentCustomFieldDefinition,
  Enrollment,
  UserProfile,
  UserPreferences,
  SchoolSettings,
  DocumentSettings,
  FeedbackItem,
  SharedReport,
  ClassSchedule,
  DesignSystemKey,
  DesignSystemMode,
} from '../types';

import type {
  SaveAttendanceItem,
  SaveSubjectAttendancePayload,
} from '../domain/attendance.types';

import type {
  SaveDailyAttendanceItem,
} from '../domain/homeroomAttendance.types';

import type {
  SaveTeacherAttendancePayload,
} from '../domain/teacherAttendance.types';

import type {
  AssessmentFilterOptions,
  MatrixScoreInput,
} from '../domain/assessment.types';

import type {
  StudentUsageSummary,
} from '../domain/student.types';

import type { StudentSearchFilterOptions } from './ports/studentRepository';

import type {
  DeduplicationScanResult,
  DeduplicationExecutionResult,
} from '../domain/deduplication.types';

import type {
  OrphanResidualItem,
  UserStorageStats,
} from '../domain/user.types';

import type {
  DatabaseStatistics,
  DatabaseBackup,
  ResetSemesterSummary,
} from '../domain/backup.types';

import type {
  DiagnosticResult,
} from '../domain/diagnostics.types';

import type {
  OnboardingData,
} from '../domain/onboarding.types';

import type { LoadWorkspaceResult } from './workspace/loadWorkspace.usecase';
import type { ImportStudentsInput, ImportStudentsResult } from './students/importStudents.usecase';

export interface ApplicationOperations {
  auth: {
    getProfile: (uid: string) => Promise<UserProfile | null>;
    createProfile: (uid: string, data: Partial<UserProfile>) => Promise<UserProfile>;
    recordLastLogin: (uid: string) => Promise<void>;
    updateProfile: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  };
  workspace: {
    loadWorkspace: (uid: string, profileSemester?: SemesterType) => Promise<LoadWorkspaceResult>;
    getUserPreferences: (uid: string) => Promise<UserPreferences | null>;
    saveUserPreferences: (uid: string, prefs: Partial<UserPreferences>) => Promise<void>;
    saveAttendanceSettings: (uid: string, settings: AttendanceSettings) => Promise<void>;
    checkHoliday: (dateStr: string, settings: AttendanceSettings) => { isHoliday: boolean; reason?: string };
  };
  theme: {
    updateDesignSystem: (uid: string, system: DesignSystemKey) => Promise<void>;
    updateModePreference: (uid: string, mode: DesignSystemMode) => Promise<void>;
  };
  students: {
    search: (uid: string, query: string) => Promise<Student[]>;
    searchByExactIdentifier: (uid: string, rawQuery: string, options?: StudentSearchFilterOptions) => Promise<Student[]>;
    searchByNameToken: (uid: string, rawQuery: string, options?: StudentSearchFilterOptions | number) => Promise<Student[]>;
    import: (input: ImportStudentsInput) => Promise<ImportStudentsResult>;
    getAll: (uid: string, status?: string) => Promise<Student[]>;
    getPaginated: (uid: string, options?: StudentPaginationOptions) => Promise<PaginatedStudentsResult>;
    getById: (uid: string, id: string) => Promise<Student | null>;
    create: (uid: string, data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Student>;
    update: (uid: string, id: string, data: Partial<Student>) => Promise<void>;
    delete: (uid: string, id: string) => Promise<void>;
    checkUsage: (uid: string, id: string) => Promise<StudentUsageSummary>;
    canDelete: (uid: string, id: string) => Promise<{ canDelete: boolean; reason?: string; details?: StudentUsageSummary }>;
    archive: (uid: string, id: string, status?: 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED') => Promise<void>;
    unarchive: (uid: string, id: string) => Promise<void>;
    checkNisnAvailability: (uid: string, nisn: string, excludeStudentId?: string) => Promise<{ isAvailable: boolean; conflictingStudent?: Student }>;
    batchCreate: (uid: string, list: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Student[]>;
    scanDuplicates: (uid: string, options?: { academicYearId?: string; classId?: string }) => Promise<DeduplicationScanResult>;
    executeDeduplication: (uid: string, options?: { academicYearId?: string; classId?: string }) => Promise<DeduplicationExecutionResult>;
    getCustomFields: (uid: string) => Promise<StudentCustomFieldDefinition[]>;
    saveCustomFields: (uid: string, fields: StudentCustomFieldDefinition[]) => Promise<void>;
    createCustomField: (uid: string, data: any) => Promise<any>;
    updateCustomField: (uid: string, id: string, data: any) => Promise<void>;
    deleteCustomField: (uid: string, id: string) => Promise<void>;
    getStudentNotes: (uid: string, studentId: string) => Promise<any[]>;
    getStudentNotesByClass: (uid: string, academicYearId: string, classId: string) => Promise<any[]>;
    createStudentNote: (uid: string, data: any) => Promise<any>;
    updateStudentNote: (uid: string, id: string, data: any) => Promise<void>;
    deleteStudentNote: (uid: string, id: string) => Promise<void>;
  };
  enrollment: {
    getByClass: (uid: string, academicYearId: string, classId: string, options?: any) => Promise<Enrollment[]>;
    getByAcademicYear: (uid: string, academicYearId: string) => Promise<Enrollment[]>;
    create: (uid: string, data: Omit<Enrollment, 'id' | 'createdAt' | 'updatedAt' | 'student'>) => Promise<Enrollment>;
    update: (uid: string, id: string, data: Partial<Enrollment>) => Promise<void>;
    archive: (uid: string, id: string, status?: 'INACTIVE' | 'TRANSFERRED' | 'GRADUATED') => Promise<void>;
    canDelete: (uid: string, enrollmentId: string) => Promise<{ canDelete: boolean; reason?: string }>;
    batchEnroll: (uid: string, items: any[]) => Promise<void>;
    batchReorderRollNumbers: (uid: string, sortedEnrollmentIds: string[]) => Promise<void>;
    transfer: (uid: string, currentEnrollmentId: string, targetClassId: string, targetClassName: string, newRollNumber: number, transferReason?: string) => Promise<Enrollment>;
    delete: (uid: string, enrollmentId: string) => Promise<void>;
  };
  attendance: {
    saveSubjectAttendance: (uid: string, payload: SaveSubjectAttendancePayload) => Promise<AttendanceSummary>;
    saveMeetingAttendance: (uid: string, meetingId: string, items: SaveAttendanceItem[]) => Promise<AttendanceSummary>;
    getByMeeting: (uid: string, meetingId: string) => Promise<AttendanceRecord[]>;
    getByMeetingIds: (uid: string, meetingIds: string[]) => Promise<AttendanceRecord[]>;
    getByAssignment: (uid: string, teachingAssignmentId: string, date?: string) => Promise<AttendanceRecord[]>;
    getByDate: (uid: string, teachingAssignmentId: string, date: string) => Promise<AttendanceRecord[]>;
    getByClassAndPeriod: (uid: string, classId: string, academicYearId: string, semester?: SemesterType) => Promise<AttendanceRecord[]>;
    saveDailyAttendance: (uid: string, ayId: string, classId: string, className: string, date: string, items: any[], notes?: string) => Promise<AttendanceSummary>;
    getDailySession: (uid: string, ayId: string, classId: string, date: string) => Promise<DailyAttendanceSession | null>;
    getDailyAttendanceRecords: (uid: string, ayId: string, classId: string, date: string) => Promise<DailyAttendanceRecord[]>;
    getAllDailyForClass: (uid: string, classId: string, ayId: string) => Promise<DailyAttendanceRecord[]>;
    getMonthlyDaily: (uid: string, ayId: string, classId: string, ym: string) => Promise<DailyAttendanceRecord[]>;
    getHomeroomAssignments: (uid: string, ay: string, sem: SemesterType, cid: string, inc?: boolean) => Promise<any[]>;
    getTeacherAttendance: (uid: string, academicYearId: string, semester: SemesterType, classId: string, date: string) => Promise<TeacherAttendanceRecord[]>;
    getMonthlyTeacherAttendance: (uid: string, academicYearId: string, semester: SemesterType, classId: string, ym: string) => Promise<TeacherAttendanceRecord[]>;
    getMonthlyAttendance: (uid: string, cid: string, ay: string, sem: SemesterType, y: number, m: number) => Promise<any>;
    saveTeacherAttendance: (uid: string, payload: SaveTeacherAttendancePayload) => Promise<{ count: number }>;
    saveMonthlyAttendance: (uid: string, rec: any) => Promise<void>;
  };
  meetings: {
    getAll: (uid: string, filters?: any) => Promise<Meeting[]>;
    getById: (uid: string, id: string) => Promise<Meeting | null>;
    create: (uid: string, data: any) => Promise<Meeting>;
    update: (uid: string, id: string, data: any) => Promise<void>;
    delete: (uid: string, id: string) => Promise<void>;
  };
  grades: {
    getItems: (uid: string, filters?: AssessmentFilterOptions) => Promise<AssessmentItem[]>;
    getItemById: (uid: string, itemId: string) => Promise<AssessmentItem | null>;
    createItem: (uid: string, data: Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
    updateItem: (uid: string, id: string, data: Partial<Omit<AssessmentItem, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    deleteItem: (uid: string, id: string) => Promise<void>;
    canDeleteItem: (uid: string, id: string) => Promise<{ canDelete: boolean; reason?: string; hasScores: boolean; scoresCount?: number }>;
    getScoresByItemIds: (uid: string, itemIds: string[]) => Promise<any[]>;
    saveScoresBatch: (uid: string, itemId: string, scores: Array<{ studentId: string; score: number; note?: string }>) => Promise<void>;
    saveMatrixScores: (uid: string, payload: MatrixScoreInput[]) => Promise<void>;
  };
  master: {
    academicYears: {
      getAll: (uid: string) => Promise<AcademicYear[]>;
      getActive: (uid: string) => Promise<AcademicYear | null>;
      create: (uid: string, data: any) => Promise<AcademicYear>;
      update: (uid: string, id: string, data: any) => Promise<void>;
      delete: (uid: string, id: string) => Promise<void>;
      checkUsage: (uid: string, id: string) => Promise<any>;
      archive: (uid: string, id: string) => Promise<void>;
      unarchive: (uid: string, id: string) => Promise<void>;
      canDelete: (uid: string, id: string) => Promise<any>;
    };
    classes: {
      getAll: (uid: string) => Promise<ClassItem[]>;
      create: (uid: string, data: any) => Promise<ClassItem>;
      update: (uid: string, id: string, data: any) => Promise<void>;
      delete: (uid: string, id: string) => Promise<void>;
      archive: (uid: string, id: string) => Promise<void>;
      unarchive: (uid: string, id: string, aay?: string) => Promise<void>;
      checkUsage: (uid: string, id: string) => Promise<any>;
      canDelete: (uid: string, id: string) => Promise<any>;
    };
    subjects: {
      getAll: (uid: string) => Promise<Subject[]>;
      create: (uid: string, data: any) => Promise<Subject>;
      update: (uid: string, id: string, data: any) => Promise<void>;
      delete: (uid: string, id: string) => Promise<void>;
      archive: (uid: string, id: string) => Promise<void>;
      unarchive: (uid: string, id: string) => Promise<void>;
      canDelete: (uid: string, id: string) => Promise<{ canDelete: boolean; reason?: string }>;
    };
    teachingAssignments: {
      getAll: (uid: string) => Promise<TeachingAssignment[]>;
      create: (uid: string, data: any) => Promise<TeachingAssignment>;
      update: (uid: string, id: string, data: any) => Promise<void>;
      delete: (uid: string, id: string) => Promise<void>;
      checkUsage: (uid: string, id: string) => Promise<any>;
      archive: (uid: string, id: string, activeAyId?: string) => Promise<void>;
      unarchive: (uid: string, id: string, activeAyId?: string) => Promise<void>;
      canDelete: (uid: string, id: string) => Promise<any>;
    };
  };
  admin: {
    getAllUsers: () => Promise<UserProfile[]>;
    setAccountStatus: (uid: string, status: string) => Promise<void>;
    setAccountRole: (uid: string, role: string) => Promise<void>;
    adminUpdateProfile: (targetUid: string, data: any) => Promise<void>;
    getStorageStats: (targetUid: string) => Promise<UserStorageStats>;
    purgeWorkspace: (targetUid: string) => Promise<number>;
    purgeOrphans: (targetUid: string) => Promise<number>;
    scanOrphans: () => Promise<any[]>;
    getFeedbackList: () => Promise<FeedbackItem[]>;
    updateFeedbackStatus: (id: string, status: string, reply?: string) => Promise<void>;
    deleteFeedback: (id: string) => Promise<void>;
  };
  reports: {
    createSharedReport: (data: any) => Promise<SharedReport>;
    getSharedReportByToken: (token: string) => Promise<SharedReport | null>;
    getUserSharedReports: (uid: string) => Promise<SharedReport[]>;
    deleteSharedReport: (id: string) => Promise<void>;
    revokeSharedReport: (id: string) => Promise<void>;
    decrypt: (data: any, pass: string) => Promise<any>;
    incrementView: (id: string) => Promise<void>;
  };
  settings: {
    getSettings: (uid: string) => Promise<any>;
    saveSettings: (uid: string, data: any) => Promise<void>;
    getSchoolSettings: (uid: string) => Promise<SchoolSettings | null>;
    saveSchoolSettings: (uid: string, data: SchoolSettings) => Promise<void>;
    getDocumentSettings: (uid: string) => Promise<DocumentSettings | null>;
    saveDocumentSettings: (uid: string, data: DocumentSettings) => Promise<void>;
    exportBackup: (uid: string, displayName?: string, schoolName?: string) => Promise<DatabaseBackup>;
    importBackup: (uid: string, backup: DatabaseBackup, mode?: any, onProgress?: (prog: { message: string; percentage: number }) => void) => Promise<any>;
    getDatabaseStats: (uid: string) => Promise<DatabaseStatistics>;
    previewResetSemester: (uid: string, options: any) => Promise<ResetSemesterSummary>;
    resetSemesterData: (uid: string, options: any) => Promise<ResetSemesterSummary>;
    runIntegrityAudit: (uid: string) => Promise<DiagnosticResult>;
    findStudentCandidatesByNisn: (uid: string, nisn: string) => Promise<any[]>;
    relinkEnrollmentClass: (uid: string, params: any) => Promise<void>;
    relinkStudentRelationship: (uid: string, params: any) => Promise<void>;
    getClassSchedule: (uid: string, classId: string, academicYearId: string, semester: SemesterType) => Promise<ClassSchedule | null>;
    saveClassSchedule: (uid: string, schedule: Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<ClassSchedule>;
  };
  onboarding: {
    submitOnboarding: (uid: string, email: string, data: OnboardingData) => Promise<void>;
  };
  feedback: {
    create: (data: Partial<FeedbackItem>) => Promise<string>;
    getUnreadCount: () => Promise<number>;
  };
}
