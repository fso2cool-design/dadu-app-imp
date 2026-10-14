import { AssessmentItem, Enrollment, Score } from '../../types';

export interface CachedGradesReportData {
  assessmentItems: AssessmentItem[];
  enrollments: Enrollment[];
  scores: Score[];
}

const gradesReportCache = new Map<string, CachedGradesReportData>();

/**
 * Builds standard cache key for grades report data, scoped by user, academic year, semester, and teaching assignment.
 */
export function buildGradesReportCacheKey(
  uid: string,
  academicYearId: string,
  semester: string,
  teachingAssignmentId: string
): string {
  return `${uid}_${academicYearId}_${semester}_${teachingAssignmentId}`;
}

/**
 * Retrieves cached grades report data if present in memory.
 */
export function getCachedGradesReport(key: string): CachedGradesReportData | undefined {
  return gradesReportCache.get(key);
}

/**
 * Caches grades report data.
 */
export function setCachedGradesReport(key: string, data: CachedGradesReportData): void {
  gradesReportCache.set(key, data);
}

/**
 * Invalidates grades report cache. If key is supplied, invalidates only that key;
 * otherwise clears the entire grades report cache.
 */
export function invalidateGradesReportCache(key?: string): void {
  if (key) {
    gradesReportCache.delete(key);
  } else {
    gradesReportCache.clear();
  }
}
