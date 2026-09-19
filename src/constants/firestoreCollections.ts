/**
 * Single Source of Truth for all Firestore collection & subcollection names.
 * Ensures strict compile-time type safety across data services, backup, diagnostics,
 * and purge/cleanup routines to prevent residual data leaks.
 */

export const WORKSPACE_SUBCOLLECTIONS = [
  'academicYears',
  'classes',
  'subjects',
  'teachingAssignments',
  'students',
  'enrollments',
  'meetings',
  'attendanceRecords',
  'dailyAttendanceSessions',
  'dailyAttendanceRecords',
  'assessmentItems',
  'scores',
  'studentNotes',
  'teacherAttendanceRecords',
  'teacherMonthlyAttendance',
  'classSchedules',
  'settings',
  'studentCustomFields',
] as const;

export type WorkspaceSubcollection = typeof WORKSPACE_SUBCOLLECTIONS[number];

export const ROOT_COLLECTIONS = [
  'users',
  'feedbacks',
  'sharedReports',
] as const;

export type RootCollection = typeof ROOT_COLLECTIONS[number];
