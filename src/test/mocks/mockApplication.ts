import { vi } from 'vitest';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { ApplicationOperations } from '../../application/types';
import type {
  AcademicYear,
  ClassItem,
  ClassSchedule,
  Enrollment,
  Meeting,
  SharedReport,
  SharedReportPayload,
  Student,
  StudentCustomFieldDefinition,
  StudentNote,
  Subject,
  TeachingAssignment,
  UserProfile,
} from '../../types';
import type { AcademicYearUsageSummary } from '../../domain/academicYear.types';
import type { ClassUsageSummary } from '../../domain/class.types';
import type { TeachingAssignmentUsageSummary } from '../../domain/teachingAssignment.types';
import type { UserStorageStats } from '../../domain/user.types';
import type {
  DatabaseBackup,
  DatabaseStatistics,
  ResetSemesterSummary,
} from '../../domain/backup.types';
import type { DiagnosticResult } from '../../domain/diagnostics.types';
import {
  createTestAcademicYear,
  createTestClass,
  createTestTeachingAssignment,
} from '../fixtures';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (...args: never[]) => unknown
    ? T[P]
    : T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

function createMockFirebaseUser(overrides?: Partial<FirebaseAuthUser>): FirebaseAuthUser {
  return {
    uid: 'mock-user',
    email: 'mock@example.com',
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: vi.fn().mockResolvedValue(undefined),
    getIdToken: vi.fn().mockResolvedValue('mock-token'),
    getIdTokenResult: vi.fn().mockResolvedValue({
      authTime: '0',
      claims: {},
      expirationTime: '0',
      issuedAtTime: '0',
      signInProvider: null,
      signInSecondFactor: null,
      token: 'mock-token',
    }),
    reload: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn().mockReturnValue({}),
    displayName: 'Mock User',
    phoneNumber: null,
    photoURL: null,
    providerId: 'firebase',
    ...overrides,
  };
}

function createMockCustomField(
  overrides?: Partial<StudentCustomFieldDefinition>
): StudentCustomFieldDefinition {
  return {
    id: 'custom-field-1',
    name: 'Field 1',
    key: 'field1',
    type: 'TEXT',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockStudentNote(overrides?: Partial<StudentNote>): StudentNote {
  return {
    id: 'note-1',
    studentId: 'student-id',
    classId: 'class-id',
    academicYearId: 'ay-id',
    date: '2025-01-01',
    category: 'ACADEMIC',
    note: 'Catatan siswa',
    isImportant: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockEnrollment(overrides?: Partial<Enrollment>): Enrollment {
  return {
    id: 'enrollment-1',
    academicYearId: 'ay-2024-2025',
    classId: 'class-1',
    studentId: 'student-1',
    rollNumber: 1,
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockMeeting(overrides?: Partial<Meeting>): Meeting {
  return {
    id: 'meeting-1',
    academicYearId: 'ay-2024-2025',
    semester: 'GANJIL',
    teachingAssignmentId: 'assignment-1',
    classId: 'class-1',
    subjectId: 'subject-1',
    date: '2025-01-01',
    meetingNumber: 1,
    topic: 'Pertemuan 1',
    status: 'SCHEDULED',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockSubject(overrides?: Partial<Subject>): Subject {
  return {
    id: 'subject-1',
    code: 'MAPEL',
    name: 'Mata Pelajaran Test',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockSharedReport(overrides?: Partial<SharedReport>): SharedReport {
  return {
    id: 'report-token-1',
    reportType: 'ATTENDANCE',
    userId: 'user-1',
    userName: 'Guru Test',
    title: 'Laporan Test',
    expiresAt: '2025-01-01T00:00:00.000Z',
    isRevoked: false,
    viewCount: 0,
    payload: {
      reportType: 'ATTENDANCE',
      title: 'Laporan Test',
      schoolName: 'Sekolah Test',
      academicYearLabel: '2024/2025',
      semester: 'GANJIL',
      className: 'Kelas 7A',
      teacherName: 'Guru Test',
      generatedDate: '2025-01-01',
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockClassSchedule(overrides?: Partial<ClassSchedule>): ClassSchedule {
  return {
    id: 'schedule-1',
    classId: 'class-1',
    academicYearId: 'ay-2024-2025',
    semester: 'GANJIL',
    items: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const defaultAcademicYearUsage: AcademicYearUsageSummary = {
  isUsed: false,
  canDelete: true,
  reasons: [],
  counts: {
    classes: 0,
    enrollments: 0,
    teachingAssignments: 0,
    meetings: 0,
    attendanceRecords: 0,
    dailyAttendanceSessions: 0,
    dailyAttendanceRecords: 0,
    assessmentItems: 0,
    studentNotes: 0,
    teacherAttendanceRecords: 0,
  },
};

const defaultClassUsage: ClassUsageSummary = {
  isUsed: false,
  canDelete: true,
  reasons: [],
  counts: {
    enrollments: 0,
    teachingAssignments: 0,
    meetings: 0,
    dailyAttendance: 0,
    assessmentItems: 0,
    studentNotes: 0,
  },
};

const defaultTeachingAssignmentUsage: TeachingAssignmentUsageSummary = {
  isUsed: false,
  canDelete: true,
  reasons: [],
  counts: {
    meetings: 0,
    attendanceRecords: 0,
    assessmentItems: 0,
    teacherAttendanceRecords: 0,
  },
};

const defaultStorageStats: UserStorageStats = {
  classesCount: 0,
  subjectsCount: 0,
  studentsCount: 0,
  assignmentsCount: 0,
  meetingsCount: 0,
  attendanceCount: 0,
  gradesCount: 0,
  totalDocuments: 0,
};

const defaultSharedReportPayload: SharedReportPayload = {
  reportType: 'ATTENDANCE',
  title: 'Laporan Test',
  schoolName: 'Sekolah Test',
  academicYearLabel: '2024/2025',
  semester: 'GANJIL',
  className: 'Kelas 7A',
  teacherName: 'Guru Test',
  generatedDate: '2025-01-01',
};

const defaultDatabaseBackup: DatabaseBackup = {
  version: '2.0.0',
  exportedAt: '2025-01-01T00:00:00.000Z',
  userId: 'user-1',
  metadata: {
    totalCollections: 0,
    totalDocuments: 0,
  },
  collections: {
    academicYears: [],
    classes: [],
    subjects: [],
    teachingAssignments: [],
    students: [],
    enrollments: [],
    meetings: [],
    attendanceRecords: [],
    dailyAttendanceSessions: [],
    dailyAttendanceRecords: [],
    assessmentItems: [],
    scores: [],
    studentNotes: [],
    settings: {},
  },
};

const defaultDatabaseStats: DatabaseStatistics = {
  academicYearsCount: 0,
  classesCount: 0,
  subjectsCount: 0,
  teachingAssignmentsCount: 0,
  studentsCount: 0,
  enrollmentsCount: 0,
  meetingsCount: 0,
  attendanceRecordsCount: 0,
  dailyAttendanceSessionsCount: 0,
  dailyAttendanceRecordsCount: 0,
  assessmentItemsCount: 0,
  scoresCount: 0,
  studentNotesCount: 0,
  totalDocuments: 0,
  latencyMs: 0,
  isConnected: true,
};

const defaultResetSemesterSummary: ResetSemesterSummary = {
  academicYearId: 'ay-2024-2025',
  semester: 'ALL',
  meetings: 0,
  attendanceRecords: 0,
  assessmentItems: 0,
  scores: 0,
  dailyAttendanceSessions: 0,
  dailyAttendanceRecords: 0,
  teacherAttendanceRecords: 0,
  teacherMonthlyAttendance: 0,
  classSchedules: 0,
  studentNotes: 0,
  totalDeleted: 0,
};

const defaultDiagnosticResult: DiagnosticResult = {
  timestamp: '2025-01-01T00:00:00.000Z',
  totalIssues: 0,
  criticalCount: 0,
  warningsCount: 0,
  infoCount: 0,
  issues: [],
  summary: {
    totalStudents: 0,
    totalClasses: 0,
    totalEnrollments: 0,
    totalAssignments: 0,
    totalMeetings: 0,
    totalAttendanceRecords: 0,
    totalAssessmentItems: 0,
    totalScores: 0,
  },
};

export function createMockApplicationOperations(
  overrides?: DeepPartial<ApplicationOperations>
): ApplicationOperations {
  const base: ApplicationOperations = {
    auth: {
      getProfile: vi.fn().mockResolvedValue(null),
      createProfile: vi.fn().mockImplementation(
        async (_uid: string, data: Partial<UserProfile>): Promise<UserProfile> => ({
          uid: _uid,
          displayName: data.displayName ?? 'Guru Test',
          email: data.email ?? 'guru@test.com',
          role: data.role ?? 'TEACHER',
          accountStatus: data.accountStatus ?? 'ACTIVE',
          defaultSemester: data.defaultSemester ?? 'GANJIL',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          ...data,
        })
      ),
      recordLastLogin: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockImplementation(async () => createMockFirebaseUser()),
      signup: vi.fn().mockImplementation(async () => createMockFirebaseUser()),
      logout: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue(undefined),
      onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
      getAdminClaimStatus: vi.fn().mockResolvedValue({ isAdmin: false, status: 'not-admin' }),
    },
    workspace: {
      loadWorkspace: vi.fn().mockResolvedValue({
        academicYears: [],
        activeAcademicYear: null,
        activeSemester: 'GANJIL',
        classes: [],
        subjects: [],
        teachingAssignments: [],
        preferences: null,
        attendanceSettings: { schoolDaysOption: 6, holidays: [] },
      }),
      getUserPreferences: vi.fn().mockResolvedValue(null),
      saveUserPreferences: vi.fn().mockResolvedValue(undefined),
      saveAttendanceSettings: vi.fn().mockResolvedValue(undefined),
      checkHoliday: vi.fn().mockReturnValue({ isHoliday: false }),
    },
    appearance: {
      updateAppearancePresetPreference: vi.fn().mockResolvedValue(undefined),
      updateModePreference: vi.fn().mockResolvedValue(undefined),
    },
    students: {
      search: vi.fn().mockResolvedValue([]),
      searchByExactIdentifier: vi.fn().mockResolvedValue([]),
      searchByNameToken: vi.fn().mockResolvedValue([]),
      import: vi.fn().mockResolvedValue({ totalProcessed: 0, importedCount: 0, errors: [] }),
      getAll: vi.fn().mockResolvedValue([]),
      getPaginated: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false }),
      getById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(
        async (_uid: string, data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> => ({
          id: 'student-id',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          ...data,
        })
      ),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      checkUsage: vi.fn().mockResolvedValue({ totalEnrollments: 0, totalAttendanceRecords: 0, totalScores: 0 }),
      canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      checkNisnAvailability: vi.fn().mockResolvedValue({ isAvailable: true }),
      batchCreate: vi.fn().mockResolvedValue([]),
      scanDuplicates: vi.fn().mockResolvedValue({ duplicateGroups: [], totalDuplicates: 0 }),
      executeDeduplication: vi.fn().mockResolvedValue({ mergedCount: 0, deletedCount: 0 }),
      getCustomFields: vi.fn().mockResolvedValue([]),
      createCustomField: vi.fn().mockImplementation(async () => createMockCustomField()),
      updateCustomField: vi.fn().mockResolvedValue(undefined),
      deleteCustomField: vi.fn().mockResolvedValue(undefined),
      getStudentNotes: vi.fn().mockResolvedValue([]),
      getStudentNotesByClass: vi.fn().mockResolvedValue([]),
      createStudentNote: vi.fn().mockImplementation(async () => createMockStudentNote()),
      updateStudentNote: vi.fn().mockResolvedValue(undefined),
      deleteStudentNote: vi.fn().mockResolvedValue(undefined),
    },
    enrollment: {
      getByClass: vi.fn().mockResolvedValue([]),
      getByAcademicYear: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation(async () => createMockEnrollment()),
      update: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(undefined),
      canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      batchEnroll: vi.fn().mockResolvedValue(undefined),
      batchReorderRollNumbers: vi.fn().mockResolvedValue(undefined),
      transfer: vi.fn().mockImplementation(async () => createMockEnrollment()),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    attendance: {
      saveSubjectAttendance: vi.fn().mockResolvedValue({ present: 0, sick: 0, permitted: 0, absent: 0, total: 0 }),
      saveMeetingAttendance: vi.fn().mockResolvedValue({ present: 0, sick: 0, permitted: 0, absent: 0, total: 0 }),
      getByMeeting: vi.fn().mockResolvedValue([]),
      getByMeetingIds: vi.fn().mockResolvedValue([]),
      getByAssignment: vi.fn().mockResolvedValue([]),
      getByDate: vi.fn().mockResolvedValue([]),
      getByClassAndPeriod: vi.fn().mockResolvedValue([]),
      saveDailyAttendance: vi.fn().mockResolvedValue({ present: 0, sick: 0, permitted: 0, absent: 0, total: 0 }),
      getDailySession: vi.fn().mockResolvedValue(null),
      getDailyAttendanceRecords: vi.fn().mockResolvedValue([]),
      getAllDailyForClass: vi.fn().mockResolvedValue([]),
      getMonthlyDaily: vi.fn().mockResolvedValue([]),
      getHomeroomAssignments: vi.fn().mockResolvedValue([]),
      getTeacherAttendance: vi.fn().mockResolvedValue([]),
      getMonthlyTeacherAttendance: vi.fn().mockResolvedValue([]),
      getMonthlyAttendance: vi.fn().mockResolvedValue(null),
      saveTeacherAttendance: vi.fn().mockResolvedValue({ count: 0 }),
      saveMonthlyAttendance: vi.fn().mockResolvedValue(undefined),
    },
    meetings: {
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async () => createMockMeeting()),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    grades: {
      getAssessmentItems: vi.fn().mockResolvedValue([]),
      getAssessmentItemById: vi.fn().mockResolvedValue(null),
      createAssessmentItem: vi.fn().mockResolvedValue('item-id'),
      updateAssessmentItem: vi.fn().mockResolvedValue(undefined),
      deleteAssessmentItem: vi.fn().mockResolvedValue(undefined),
      canDeleteAssessmentItem: vi.fn().mockResolvedValue({ canDelete: true, hasScores: false }),
      getScoresByItemIds: vi.fn().mockResolvedValue([]),
      saveScoresBatch: vi.fn().mockResolvedValue(undefined),
      saveMatrixScores: vi.fn().mockResolvedValue(undefined),
    },
    master: {
      academicYears: {
        getAll: vi.fn().mockResolvedValue([]),
        getActive: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async () => createTestAcademicYear()),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        checkUsage: vi.fn().mockResolvedValue(defaultAcademicYearUsage),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
      classes: {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async () => createTestClass()),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        checkUsage: vi.fn().mockResolvedValue(defaultClassUsage),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
      subjects: {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async () => createMockSubject()),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
      teachingAssignments: {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async () => createTestTeachingAssignment()),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        checkUsage: vi.fn().mockResolvedValue(defaultTeachingAssignmentUsage),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
    },
    admin: {
      getAllUsers: vi.fn().mockResolvedValue([]),
      setAccountStatus: vi.fn().mockResolvedValue(undefined),
      setAccountRole: vi.fn().mockResolvedValue(undefined),
      adminUpdateProfile: vi.fn().mockResolvedValue(undefined),
      getStorageStats: vi.fn().mockResolvedValue(defaultStorageStats),
      purgeWorkspace: vi.fn().mockResolvedValue(0),
      purgeOrphans: vi.fn().mockResolvedValue(0),
      scanOrphans: vi.fn().mockResolvedValue([]),
      getFeedbackList: vi.fn().mockResolvedValue([]),
      updateFeedbackStatus: vi.fn().mockResolvedValue(undefined),
      deleteFeedback: vi.fn().mockResolvedValue(undefined),
    },
    reports: {
      createSharedReport: vi.fn().mockImplementation(async () => createMockSharedReport()),
      getSharedReportByToken: vi.fn().mockResolvedValue(null),
      getUserSharedReports: vi.fn().mockResolvedValue([]),
      deleteSharedReport: vi.fn().mockResolvedValue(undefined),
      revokeSharedReport: vi.fn().mockResolvedValue(undefined),
      decrypt: vi.fn().mockResolvedValue(defaultSharedReportPayload),
      incrementView: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      getSchoolSettings: vi.fn().mockResolvedValue(null),
      saveSchoolSettings: vi.fn().mockResolvedValue(undefined),
      getDocumentSettings: vi.fn().mockResolvedValue(null),
      saveDocumentSettings: vi.fn().mockResolvedValue(undefined),
    },
    maintenance: {
      exportBackup: vi.fn().mockResolvedValue(defaultDatabaseBackup),
      importBackup: vi.fn().mockResolvedValue({ success: true, totalRestored: 0 }),
      getDatabaseStats: vi.fn().mockResolvedValue(defaultDatabaseStats),
      previewResetSemester: vi.fn().mockResolvedValue(defaultResetSemesterSummary),
      resetSemesterData: vi.fn().mockResolvedValue(defaultResetSemesterSummary),
    },
    diagnostics: {
      runIntegrityAudit: vi.fn().mockResolvedValue(defaultDiagnosticResult),
      findStudentCandidatesByNisn: vi.fn().mockResolvedValue([]),
      relinkEnrollmentClass: vi.fn().mockResolvedValue(undefined),
      relinkStudentRelationship: vi.fn().mockResolvedValue(undefined),
    },
    classSchedule: {
      getClassSchedule: vi.fn().mockResolvedValue(null),
      saveClassSchedule: vi.fn().mockImplementation(async () => createMockClassSchedule()),
      deleteClassSchedule: vi.fn().mockResolvedValue(undefined),
    },
    onboarding: {
      submitOnboarding: vi.fn().mockResolvedValue(undefined),
    },
    feedback: {
      create: vi.fn().mockResolvedValue('feedback-id'),
      getUnreadCount: vi.fn().mockResolvedValue(0),
    },
  };

  if (!overrides) return base;

  return {
    auth: { ...base.auth, ...overrides.auth },
    workspace: { ...base.workspace, ...overrides.workspace },
    appearance: { ...base.appearance, ...overrides.appearance },
    students: { ...base.students, ...overrides.students },
    enrollment: { ...base.enrollment, ...overrides.enrollment },
    attendance: { ...base.attendance, ...overrides.attendance },
    meetings: { ...base.meetings, ...overrides.meetings },
    grades: { ...base.grades, ...overrides.grades },
    master: {
      academicYears: { ...base.master.academicYears, ...overrides.master?.academicYears },
      classes: { ...base.master.classes, ...overrides.master?.classes },
      subjects: { ...base.master.subjects, ...overrides.master?.subjects },
      teachingAssignments: { ...base.master.teachingAssignments, ...overrides.master?.teachingAssignments },
    },
    admin: { ...base.admin, ...overrides.admin },
    reports: { ...base.reports, ...overrides.reports },
    settings: { ...base.settings, ...overrides.settings },
    maintenance: { ...base.maintenance, ...overrides.maintenance },
    diagnostics: { ...base.diagnostics, ...overrides.diagnostics },
    classSchedule: { ...base.classSchedule, ...overrides.classSchedule },
    onboarding: { ...base.onboarding, ...overrides.onboarding },
    feedback: { ...base.feedback, ...overrides.feedback },
  };
}
