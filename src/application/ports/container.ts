// Composition Root - Wires infrastructure implementations to application use cases and operations
import { studentRepository } from '../../infrastructure/firestore/repositories/student.repository';
import { academicYearRepository } from '../../infrastructure/firestore/repositories/academicYear.repository';
import { classRepository } from '../../infrastructure/firestore/repositories/class.repository';
import { subjectRepository } from '../../infrastructure/firestore/repositories/subject.repository';
import { teachingAssignmentRepository } from '../../infrastructure/firestore/repositories/teachingAssignment.repository';
import { enrollmentRepository } from '../../infrastructure/firestore/repositories/enrollment.repository';
import { meetingRepository } from '../../infrastructure/firestore/repositories/meeting.repository';
import { attendanceRepository } from '../../infrastructure/firestore/repositories/attendance.repository';
import { assessmentRepository } from '../../infrastructure/firestore/repositories/assessment.repository';
import { teacherAttendanceRepository } from '../../infrastructure/firestore/repositories/teacherAttendance.repository';
import { userRepository } from '../../infrastructure/firestore/repositories/user.repository';
import { settingsRepository } from '../../infrastructure/firestore/repositories/settings.repository';
import { homeroomAttendanceRepository } from '../../infrastructure/firestore/repositories/homeroomAttendance.repository';
import { studentNoteRepository } from '../../infrastructure/firestore/repositories/studentNote.repository';
import { sharedReportRepository } from '../../infrastructure/firestore/repositories/sharedReport.repository';
import { studentCustomFieldRepository } from '../../infrastructure/firestore/repositories/studentCustomField.repository';
import { feedbackRepository } from '../../infrastructure/firestore/repositories/feedback.repository';
import { backupRepository, diagnosticsRepository, deduplicationRepository, relationshipRecoveryRepository, classScheduleRepository, onboardingRepository } from '../../infrastructure/firestore/repositories/misc.repository';
import { loadWorkspaceUseCase } from '../workspace/loadWorkspace.usecase';
import { checkHolidayUseCase } from '../attendance/checkHoliday.usecase';
import { authRepository } from '../../infrastructure/firebase/auth.repository';
import { searchStudentsUseCase } from '../students/searchStudents.usecase';
import { importStudentsUseCase } from '../students/importStudents.usecase';
import type { ApplicationOperations } from '../types';

const repos = {
  student: studentRepository,
  academicYear: academicYearRepository,
  class: classRepository,
  subject: subjectRepository,
  teachingAssignment: teachingAssignmentRepository,
  enrollment: enrollmentRepository,
  meeting: meetingRepository,
  attendance: attendanceRepository,
  assessment: assessmentRepository,
  teacherAttendance: teacherAttendanceRepository,
  user: userRepository,
  settings: settingsRepository,
  homeroomAttendance: homeroomAttendanceRepository,
  studentNote: studentNoteRepository,
  sharedReport: sharedReportRepository,
  studentCustomField: studentCustomFieldRepository,
  feedback: feedbackRepository,
  backup: backupRepository,
  diagnostics: diagnosticsRepository,
  deduplication: deduplicationRepository,
  relationshipRecovery: relationshipRecoveryRepository,
  classSchedule: classScheduleRepository,
  onboarding: onboardingRepository,
};

const useCases = {
  loadWorkspace: (uid: string, profileSemester?: any) => loadWorkspaceUseCase({ uid, profileDefaultSemester: profileSemester }, {
    academicYearRepo: academicYearRepository,
    classRepo: classRepository,
    subjectRepo: subjectRepository,
    teachingAssignmentRepo: teachingAssignmentRepository,
    getUserPreferences: settingsRepository.getUserPreferences,
    getAttendanceSettings: settingsRepository.getAttendanceSettings,
  }),
  checkHoliday: (dateStr: string, settings: any) => checkHolidayUseCase({ dateStr, settings }),
  searchStudents: (uid: string, query: string) => searchStudentsUseCase({ uid, query }, { studentRepo: studentRepository }),
  importStudents: (input: Parameters<typeof importStudentsUseCase>[0]) => importStudentsUseCase(input, { studentRepo: studentRepository, enrollmentRepo: enrollmentRepository }),
};

const app: ApplicationOperations = {
  auth: {
    getProfile: (uid) => userRepository.getProfile(uid),
    createProfile: (uid, data) => userRepository.createProfile(uid, data),
    recordLastLogin: (uid) => userRepository.recordLastLogin(uid),
    updateProfile: (uid, data) => userRepository.updateProfile(uid, data),
    login: (email, pass) => authRepository.login(email, pass),
    signup: (email, pass, name) => authRepository.signup(email, pass, name),
    logout: () => authRepository.logout(),
    resetPassword: (email) => authRepository.resetPassword(email),
    onAuthStateChanged: (callback) => authRepository.onAuthStateChanged(callback),
  },
  workspace: {
    loadWorkspace: useCases.loadWorkspace,
    getUserPreferences: (uid) => settingsRepository.getUserPreferences(uid),
    saveUserPreferences: (uid, prefs) => settingsRepository.saveUserPreferences(uid, prefs),
    saveAttendanceSettings: (uid, settings) => settingsRepository.saveAttendanceSettings(uid, settings),
    checkHoliday: useCases.checkHoliday,
  },
  theme: {
    updateDesignSystem: (uid, system) => userRepository.updateDesignSystem(uid, system),
    updateModePreference: (uid, mode) => userRepository.updateProfile(uid, { designSystemModePreference: mode }),
  },
  students: {
    search: useCases.searchStudents,
    searchByExactIdentifier: (uid, rawQuery, options) => studentRepository.searchByExactIdentifier(uid, rawQuery, options),
    searchByNameToken: (uid, rawQuery, options) => studentRepository.searchByNameToken(uid, rawQuery, options),
    import: useCases.importStudents,
    getAll: (uid, status) => studentRepository.getAll(uid, status),
    getPaginated: (uid, options) => studentRepository.getPaginated(uid, options),
    getById: (uid, id) => studentRepository.getById(uid, id),
    create: (uid, data) => studentRepository.create(uid, data),
    update: (uid, id, data) => studentRepository.update(uid, id, data),
    delete: (uid, id) => studentRepository.delete(uid, id),
    checkUsage: (uid, id) => studentRepository.checkUsage(uid, id),
    canDelete: (uid, id) => studentRepository.canDelete(uid, id),
    archive: (uid, id, status) => studentRepository.archive(uid, id, status),
    unarchive: (uid, id) => studentRepository.unarchive(uid, id),
    checkNisnAvailability: (uid, nisn, excludeId) => studentRepository.checkNisnAvailability(uid, nisn, excludeId),
    batchCreate: (uid, list) => studentRepository.batchCreate(uid, list),
    scanDuplicates: (uid, options) => deduplicationRepository.scanDuplicateStudents(uid, options),
    executeDeduplication: (uid, options) => deduplicationRepository.executeZeroResidueDeduplication(uid, options),
    getCustomFields: (uid) => studentCustomFieldRepository.getAll(uid),
    saveCustomFields: (uid, fields) => studentCustomFieldRepository.saveAll(uid, fields),
    createCustomField: (uid, data) => studentCustomFieldRepository.create(uid, data),
    updateCustomField: (uid, id, data) => studentCustomFieldRepository.update(uid, id, data),
    deleteCustomField: (uid, id) => studentCustomFieldRepository.delete(uid, id),
    getStudentNotes: (uid, studentId) => studentNoteRepository.getByStudent(uid, studentId),
    getStudentNotesByClass: (uid, academicYearId, classId) => studentNoteRepository.getByClass(uid, academicYearId, classId),
    createStudentNote: (uid, data) => studentNoteRepository.create(uid, data),
    updateStudentNote: (uid, id, data) => studentNoteRepository.update(uid, id, data),
    deleteStudentNote: (uid, id) => studentNoteRepository.delete(uid, id),
  },
  enrollment: {
    getByClass: (uid, academicYearId, classId, options) => enrollmentRepository.getByClass(uid, academicYearId, classId, options),
    getByAcademicYear: (uid, academicYearId) => enrollmentRepository.getByAcademicYear(uid, academicYearId),
    create: (uid, data) => enrollmentRepository.create(uid, data),
    update: (uid, id, data) => enrollmentRepository.update(uid, id, data),
    archive: (uid, id, status) => enrollmentRepository.archive(uid, id, status),
    canDelete: (uid, enrollmentId) => enrollmentRepository.canDelete(uid, enrollmentId),
    batchEnroll: (uid, items) => enrollmentRepository.batchEnroll(uid, items),
    batchReorderRollNumbers: (uid, sortedEnrollmentIds) => enrollmentRepository.batchReorderRollNumbers(uid, sortedEnrollmentIds),
    transfer: (uid, currentEnrollmentId, targetClassId, targetClassName, newRollNumber, reason) =>
      enrollmentRepository.transfer(uid, currentEnrollmentId, targetClassId, targetClassName, newRollNumber, reason),
    delete: (uid, enrollmentId) => enrollmentRepository.delete(uid, enrollmentId),
  },
  attendance: {
    saveSubjectAttendance: (uid, payload) => attendanceRepository.saveSubjectAttendance(uid, payload),
    saveMeetingAttendance: (uid, meetingId, items) => attendanceRepository.saveMeetingAttendance(uid, meetingId, items),
    getByMeeting: (uid, meetingId) => attendanceRepository.getByMeeting(uid, meetingId),
    getByMeetingIds: (uid, meetingIds) => attendanceRepository.getByMeetingIds(uid, meetingIds),
    getByAssignment: (uid, teachingAssignmentId, date) => attendanceRepository.getByAssignment(uid, teachingAssignmentId, date),
    getByDate: (uid, teachingAssignmentId, date) => attendanceRepository.getByDate(uid, teachingAssignmentId, date),
    getByClassAndPeriod: (uid, classId, academicYearId, semester) => attendanceRepository.getByClassAndPeriod(uid, classId, academicYearId, semester),
    saveDailyAttendance: (uid, ayId, classId, className, date, items, notes) =>
      homeroomAttendanceRepository.saveDailyAttendance(uid, ayId, classId, className, date, items, notes),
    getDailySession: (uid, ayId, classId, date) => homeroomAttendanceRepository.getSession(uid, ayId, classId, date),
    getDailyAttendanceRecords: (uid, ayId, classId, date) => homeroomAttendanceRepository.getByDate(uid, ayId, classId, date),
    getAllDailyForClass: (uid, classId, ayId) => homeroomAttendanceRepository.getAllForClass(uid, classId, ayId),
    getMonthlyDaily: (uid, ayId, classId, ym) => homeroomAttendanceRepository.getMonthly(uid, ayId, classId, ym),
    getHomeroomAssignments: (uid, ay, sem, cid, inc) => teacherAttendanceRepository.getHomeroomAssignments(uid, ay, sem, cid, inc),
    getTeacherAttendance: (uid, academicYearId, semester, classId, date) =>
      teacherAttendanceRepository.getForDate(uid, academicYearId, semester, classId, date),
    getMonthlyTeacherAttendance: (uid, academicYearId, semester, classId, ym) =>
      teacherAttendanceRepository.getMonthly(uid, academicYearId, semester, classId, ym),
    getMonthlyAttendance: (uid, cid, ay, sem, y, m) =>
      teacherAttendanceRepository.getMonthlyAttendance(uid, cid, ay, sem, y, m),
    saveTeacherAttendance: (uid, payload) => teacherAttendanceRepository.save(uid, payload),
    saveMonthlyAttendance: (uid, rec) => teacherAttendanceRepository.saveMonthlyAttendance(uid, rec),
  },
  meetings: {
    getAll: (uid, filters) => meetingRepository.getAll(uid, filters),
    getById: (uid, id) => meetingRepository.getById(uid, id),
    create: (uid, data) => meetingRepository.create(uid, data),
    update: (uid, id, data) => meetingRepository.update(uid, id, data),
    delete: (uid, id) => meetingRepository.delete(uid, id),
  },
  grades: {
    getItems: (uid, filters) => assessmentRepository.getItems(uid, filters),
    getItemById: (uid, itemId) => assessmentRepository.getItemById(uid, itemId),
    createItem: (uid, data) => assessmentRepository.createItem(uid, data),
    updateItem: (uid, id, data) => assessmentRepository.updateItem(uid, id, data),
    deleteItem: (uid, id) => assessmentRepository.deleteItem(uid, id),
    canDeleteItem: (uid, id) => assessmentRepository.canDeleteItem(uid, id),
    getScoresByItemIds: (uid, itemIds) => assessmentRepository.getScoresByItemIds(uid, itemIds),
    saveScoresBatch: (uid, itemId, scores) => assessmentRepository.saveScoresBatch(uid, itemId, scores),
    saveMatrixScores: (uid, payload) => assessmentRepository.saveMatrixScores(uid, payload),
  },
  master: {
    academicYears: {
      getAll: (uid) => academicYearRepository.getAll(uid),
      getActive: (uid) => academicYearRepository.getActive(uid),
      create: (uid, data) => academicYearRepository.create(uid, data),
      update: (uid, id, data) => academicYearRepository.update(uid, id, data),
      delete: (uid, id) => academicYearRepository.delete(uid, id),
      checkUsage: (uid, id) => academicYearRepository.checkUsage(uid, id),
      archive: (uid, id) => academicYearRepository.archive(uid, id),
      unarchive: (uid, id) => academicYearRepository.unarchive(uid, id),
      canDelete: (uid, id) => academicYearRepository.canDelete(uid, id),
    },
    classes: {
      getAll: (uid) => classRepository.getAll(uid),
      create: (uid, data) => classRepository.create(uid, data),
      update: (uid, id, data) => classRepository.update(uid, id, data),
      delete: (uid, id) => classRepository.delete(uid, id),
      archive: (uid, id) => classRepository.archive(uid, id),
      unarchive: (uid, id, aay) => classRepository.unarchive(uid, id, aay),
      checkUsage: (uid, id) => classRepository.checkUsage(uid, id),
      canDelete: (uid, id) => classRepository.canDelete(uid, id),
    },
    subjects: {
      getAll: (uid) => subjectRepository.getAll(uid),
      create: (uid, data) => subjectRepository.create(uid, data),
      update: (uid, id, data) => subjectRepository.update(uid, id, data),
      delete: (uid, id) => subjectRepository.delete(uid, id),
      archive: (uid, id) => subjectRepository.archive(uid, id),
      unarchive: (uid, id) => subjectRepository.unarchive(uid, id),
      canDelete: (uid, id) => subjectRepository.canDelete(uid, id),
    },
    teachingAssignments: {
      getAll: (uid) => teachingAssignmentRepository.getAll(uid),
      create: (uid, data) => teachingAssignmentRepository.create(uid, data),
      update: (uid, id, data) => teachingAssignmentRepository.update(uid, id, data),
      delete: (uid, id) => teachingAssignmentRepository.delete(uid, id),
      checkUsage: (uid, id) => teachingAssignmentRepository.checkUsage(uid, id),
      archive: (uid, id, aay) => teachingAssignmentRepository.archive(uid, id),
      unarchive: (uid, id, aay) => teachingAssignmentRepository.unarchive(uid, id, aay),
      canDelete: (uid, id) => teachingAssignmentRepository.canDelete(uid, id),
    },
  },
  admin: {
    getAllUsers: () => userRepository.getAllUsers(),
    setAccountStatus: (uid, status) => userRepository.setAccountStatus(uid, status),
    setAccountRole: (uid, role) => userRepository.setAccountRole(uid, role),
    adminUpdateProfile: (targetUid, data) => userRepository.adminUpdateProfile(targetUid, data),
    getStorageStats: (targetUid) => userRepository.getStorageStats(targetUid),
    purgeWorkspace: (targetUid) => userRepository.purgeWorkspace(targetUid),
    purgeOrphans: (targetUid) => userRepository.purgeOrphans(targetUid),
    scanOrphans: () => userRepository.scanOrphans(),
    getFeedbackList: () => feedbackRepository.getAll(),
    updateFeedbackStatus: (id, status, reply) => feedbackRepository.updateStatus(id, status, reply),
    deleteFeedback: (id) => feedbackRepository.delete(id),
  },
  reports: {
    createSharedReport: (data) => sharedReportRepository.create(data),
    getSharedReportByToken: (token) => sharedReportRepository.getByToken(token),
    getUserSharedReports: (uid) => sharedReportRepository.getUserReports(uid),
    deleteSharedReport: (id) => sharedReportRepository.delete(id),
    revokeSharedReport: (id) => sharedReportRepository.revoke(id),
    decrypt: (data, pass) => sharedReportRepository.decrypt(data, pass),
    incrementView: (id) => sharedReportRepository.incrementView(id),
  },
  settings: {
    getSettings: (uid) => settingsRepository.get(uid),
    saveSettings: (uid, data) => settingsRepository.save(uid, data),
    getSchoolSettings: (uid) => settingsRepository.getSchoolSettings(uid),
    saveSchoolSettings: (uid, data) => settingsRepository.saveSchoolSettings(uid, data),
    getDocumentSettings: (uid) => settingsRepository.getDocumentSettings(uid),
    saveDocumentSettings: (uid, data) => settingsRepository.saveDocumentSettings(uid, data),
    exportBackup: (uid, displayName, schoolName) => backupRepository.exportFullDatabase(uid, displayName, schoolName),
    importBackup: (uid, backup, mode, onProgress) => backupRepository.importFullDatabase(uid, backup, mode, onProgress),
    getDatabaseStats: (uid) => backupRepository.getDatabaseStatistics(uid),
    previewResetSemester: (uid, options) => backupRepository.previewSemesterReset(uid, options),
    resetSemesterData: (uid, options) => backupRepository.resetSemesterData(uid, options),
    runIntegrityAudit: (uid) => diagnosticsRepository.runIntegrityAudit(uid),
    findStudentCandidatesByNisn: (uid, nisn) => relationshipRecoveryRepository.findStudentCandidatesByNisn(uid, nisn),
    relinkEnrollmentClass: (uid, params) => relationshipRecoveryRepository.relinkEnrollmentClass(uid, params),
    relinkStudentRelationship: (uid, params) => relationshipRecoveryRepository.relinkStudentRelationship(uid, params),
    getClassSchedule: (uid, classId, academicYearId, semester) => classScheduleRepository.getClassSchedule(uid, classId, academicYearId, semester),
    saveClassSchedule: (uid, schedule) => classScheduleRepository.saveClassSchedule(uid, schedule),
  },
  onboarding: {
    submitOnboarding: (uid, email, data) => onboardingRepository.submitOnboarding(uid, email, data),
  },
  feedback: {
    create: (data) => feedbackRepository.create(data),
    getUnreadCount: () => feedbackRepository.getUnreadCount(),
  },
};

export const container = {
  repos,
  useCases,
  app,
};
