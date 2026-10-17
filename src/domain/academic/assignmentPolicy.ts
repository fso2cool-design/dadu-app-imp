import type { SemesterType, TeachingAssignment } from '../../types';

/**
 * Checks if a teaching assignment is active and strictly matches the specified academic context.
 * Invariant:
 * - Assignment must exist
 * - Must not be archived (isArchived === false or undefined)
 * - Must be active (isActive !== false)
 * - Must have a defined semester matching targetSemester (if targetSemester is specified)
 * - Must have an academicYearId matching targetAcademicYearId (if targetAcademicYearId is specified)
 * If semester is missing or undefined on assignment, it fails closed (returns false).
 */
export function isAssignmentForSemester(
  assignment: TeachingAssignment | null | undefined,
  academicYearId?: string | null,
  semester?: SemesterType | null
): boolean {
  if (!assignment) return false;
  if (assignment.isArchived) return false;
  if (assignment.isActive === false) return false;

  // Academic year check
  if (academicYearId && assignment.academicYearId !== academicYearId) {
    return false;
  }

  // Semester check - strict, fail-closed on missing/mismatched semester
  if (semester) {
    if (!assignment.semester || assignment.semester !== semester) {
      return false;
    }
  }

  return true;
}

/**
 * Filters a list of teaching assignments to only those active and strictly matching
 * the specified academic year and semester.
 */
export function filterAssignmentsForSemester(
  assignments: TeachingAssignment[],
  academicYearId?: string | null,
  semester?: SemesterType | null
): TeachingAssignment[] {
  if (!Array.isArray(assignments)) return [];
  return assignments.filter(a => isAssignmentForSemester(a, academicYearId, semester));
}

/**
 * Finds the unique counterpart assignment in a target semester for a given current assignment.
 * A counterpart is defined as an assignment with:
 * - identical classId
 * - identical subjectId
 * - active and non-archived
 * - belonging to targetAcademicYearId (or currentAssignment.academicYearId)
 * - belonging to targetSemester
 *
 * Rules:
 * - Returns the counterpart ONLY IF exactly 1 unique match is found.
 * - If 0 matches or >1 ambiguous matches are found, returns null.
 */
export function findMatchingCounterpart(
  assignments: TeachingAssignment[],
  currentAssignment: TeachingAssignment | null | undefined,
  targetSemester: SemesterType,
  targetAcademicYearId?: string | null
): TeachingAssignment | null {
  if (!currentAssignment || !targetSemester) return null;

  const academicYearId = targetAcademicYearId || currentAssignment.academicYearId;

  const matches = assignments.filter(a => {
    if (a.id === currentAssignment.id) return false;
    if (a.classId !== currentAssignment.classId) return false;
    if (a.subjectId !== currentAssignment.subjectId) return false;
    return isAssignmentForSemester(a, academicYearId, targetSemester);
  });

  if (matches.length === 1) {
    return matches[0];
  }

  return null;
}

/**
 * Validates and resolves the assignment selection during an academic period transition (e.g. semester switch).
 * Rules:
 * 1. If currentAssignment is already valid for targetAcademicYear and targetSemester, maintain it.
 * 2. If currentAssignment is not valid for targetSemester, search for a unique class-subject counterpart in targetSemester.
 * 3. If a unique counterpart is found, select it.
 * 4. If no valid counterpart exists (0 or multiple ambiguous), return null so the teacher explicitly chooses.
 */
export function resolveAssignmentOnSemesterSwitch(
  assignments: TeachingAssignment[],
  currentAssignment: TeachingAssignment | null | undefined,
  targetSemester: SemesterType,
  targetAcademicYearId?: string | null
): TeachingAssignment | null {
  if (!currentAssignment) return null;

  // 1. Maintain if still strictly valid
  if (isAssignmentForSemester(currentAssignment, targetAcademicYearId, targetSemester)) {
    return currentAssignment;
  }

  // 2. Find unique counterpart
  return findMatchingCounterpart(assignments, currentAssignment, targetSemester, targetAcademicYearId);
}
