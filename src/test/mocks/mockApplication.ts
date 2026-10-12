import { vi } from 'vitest';
import type { ApplicationOperations } from '../../application/types';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (...args: any[]) => any
    ? T[P]
    : T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

export function createMockApplicationOperations(
  overrides?: DeepPartial<ApplicationOperations>
): ApplicationOperations {
  const base: ApplicationOperations = {
    auth: {
      getProfile: vi.fn().mockResolvedValue(null),
      createProfile: vi.fn().mockImplementation(async (_uid, data) => ({ uid: _uid, ...data })),
      recordLastLogin: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue({ uid: 'mock-user' } as any),
      signup: vi.fn().mockResolvedValue({ uid: 'mock-user' } as any),
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
      updateDesignSystem: vi.fn().mockResolvedValue(undefined),
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
      create: vi.fn().mockImplementation(async (_uid, data) => ({ id: 'student-id', ...data })),
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
      createCustomField: vi.fn().mockResolvedValue({} as any),
      updateCustomField: vi.fn().mockResolvedValue(undefined),
      deleteCustomField: vi.fn().mockResolvedValue(undefined),
      getStudentNotes: vi.fn().mockResolvedValue([]),
      getStudentNotesByClass: vi.fn().mockResolvedValue([]),
      createStudentNote: vi.fn().mockResolvedValue({} as any),
      updateStudentNote: vi.fn().mockResolvedValue(undefined),
      deleteStudentNote: vi.fn().mockResolvedValue(undefined),
    },
    enrollment: {
      getByClass: vi.fn().mockResolvedValue([]),
      getByAcademicYear: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({} as any),
      update: vi.fn().mockResolvedValue(undefined),
      archive: vi.fn().mockResolvedValue(undefined),
      canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      batchEnroll: vi.fn().mockResolvedValue(undefined),
      batchReorderRollNumbers: vi.fn().mockResolvedValue(undefined),
      transfer: vi.fn().mockResolvedValue({} as any),
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
      create: vi.fn().mockResolvedValue({} as any),
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
        create: vi.fn().mockResolvedValue({} as any),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        checkUsage: vi.fn().mockResolvedValue({} as any),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
      classes: {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({} as any),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        checkUsage: vi.fn().mockResolvedValue({} as any),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
      subjects: {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({} as any),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        archive: vi.fn().mockResolvedValue(undefined),
        unarchive: vi.fn().mockResolvedValue(undefined),
        canDelete: vi.fn().mockResolvedValue({ canDelete: true }),
      },
      teachingAssignments: {
        getAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({} as any),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        checkUsage: vi.fn().mockResolvedValue({} as any),
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
      getStorageStats: vi.fn().mockResolvedValue({ totalDocs: 0, collections: {} } as any),
      purgeWorkspace: vi.fn().mockResolvedValue(0),
      purgeOrphans: vi.fn().mockResolvedValue(0),
      scanOrphans: vi.fn().mockResolvedValue([]),
      getFeedbackList: vi.fn().mockResolvedValue([]),
      updateFeedbackStatus: vi.fn().mockResolvedValue(undefined),
      deleteFeedback: vi.fn().mockResolvedValue(undefined),
    },
    reports: {
      createSharedReport: vi.fn().mockResolvedValue({} as any),
      getSharedReportByToken: vi.fn().mockResolvedValue(null),
      getUserSharedReports: vi.fn().mockResolvedValue([]),
      deleteSharedReport: vi.fn().mockResolvedValue(undefined),
      revokeSharedReport: vi.fn().mockResolvedValue(undefined),
      decrypt: vi.fn().mockResolvedValue({} as any),
      incrementView: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      getSchoolSettings: vi.fn().mockResolvedValue(null),
      saveSchoolSettings: vi.fn().mockResolvedValue(undefined),
      getDocumentSettings: vi.fn().mockResolvedValue(null),
      saveDocumentSettings: vi.fn().mockResolvedValue(undefined),
    },
    maintenance: {
      exportBackup: vi.fn().mockResolvedValue({} as any),
      importBackup: vi.fn().mockResolvedValue({ success: true, totalRestored: 0 }),
      getDatabaseStats: vi.fn().mockResolvedValue({} as any),
      previewResetSemester: vi.fn().mockResolvedValue({} as any),
      resetSemesterData: vi.fn().mockResolvedValue({} as any),
    },
    diagnostics: {
      runIntegrityAudit: vi.fn().mockResolvedValue({} as any),
      findStudentCandidatesByNisn: vi.fn().mockResolvedValue([]),
      relinkEnrollmentClass: vi.fn().mockResolvedValue(undefined),
      relinkStudentRelationship: vi.fn().mockResolvedValue(undefined),
    },
    classSchedule: {
      getClassSchedule: vi.fn().mockResolvedValue(null),
      saveClassSchedule: vi.fn().mockResolvedValue({} as any),
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

  for (const key of Object.keys(overrides) as Array<keyof ApplicationOperations>) {
    if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
      (base as any)[key] = {
        ...(base as any)[key],
        ...(overrides as any)[key],
      };
    } else if (overrides[key] !== undefined) {
      (base as any)[key] = overrides[key];
    }
  }

  return base;
}
