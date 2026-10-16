import type { AttendanceStatus, AttendanceSummary } from '../../types';

export const VALID_ATTENDANCE_STATUSES = [
  'PRESENT',
  'SICK',
  'PERMITTED',
  'ABSENT',
  'DISPENSATION',
] as const;

/**
 * Pure runtime type guard for AttendanceStatus.
 * Accepts any value and returns true only if value is one of the 5 canonical attendance statuses:
 * 'PRESENT' | 'SICK' | 'PERMITTED' | 'ABSENT' | 'DISPENSATION'.
 * Rejects null, undefined, empty strings, and unsupported strings.
 */
export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return typeof value === 'string' && VALID_ATTENDANCE_STATUSES.includes(value as AttendanceStatus);
}

export interface AttendanceSummaryInputItem {
  readonly status: AttendanceStatus;
}

/**
 * Pure calculation for persisted session AttendanceSummary.
 * Computes exact counts of present, sick, permitted, absent, and dispensation.
 * Calculates presentPercentage using formula: Math.round(((present + dispensation) / total) * 100).
 * For empty input, defensively returns 0 percent.
 */
export function calculateAttendanceSummary(
  items: readonly AttendanceSummaryInputItem[]
): AttendanceSummary {
  let present = 0;
  let sick = 0;
  let permitted = 0;
  let absent = 0;
  let dispensation = 0;

  for (const item of items) {
    if (item.status === 'PRESENT') present++;
    else if (item.status === 'SICK') sick++;
    else if (item.status === 'PERMITTED') permitted++;
    else if (item.status === 'ABSENT') absent++;
    else if (item.status === 'DISPENSATION') dispensation++;
  }

  const total = items.length;
  const presentPercentage = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 0;

  return {
    present,
    sick,
    permitted,
    absent,
    dispensation,
    total,
    presentPercentage,
  };
}

/**
 * Pure type guard and validator for KKM.
 * A valid KKM must be a finite number strictly greater than 0 and less than or equal to 100.
 */
export function isValidKkm(kkm: unknown): kkm is number {
  return typeof kkm === 'number' && Number.isFinite(kkm) && kkm > 0 && kkm <= 100;
}

export type PerformanceLevel = 'Perlu Bimbingan' | 'Cukup' | 'Baik' | 'Sangat Baik';

/**
 * Canonical performance classification helper based on dynamic KKM (Kriteria Ketuntasan Minimal).
 *
 * Mathematical Algorithm:
 * - P <= K: 'Perlu Bimbingan'
 * - K < P <= K + 10: 'Cukup'
 * - K + 10 < P <= K + 20: 'Baik'
 * - P > K + 20: 'Sangat Baik'
 *
 * Input handling contract:
 * - P (percentage) must be a finite number in [0, 100].
 * - K (kkm) must be a finite number in (0, 100].
 * - If P or K is missing, invalid, or non-finite, returns null (neutral representation)
 *   rather than defaulting to 'Perlu Bimbingan' or an arbitrary threshold.
 */
export function getPerformanceLevel(
  percentage: number | null | undefined,
  kkm: number | null | undefined
): PerformanceLevel | null {
  if (
    typeof percentage !== 'number' ||
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100 ||
    !isValidKkm(kkm)
  ) {
    return null;
  }

  if (percentage <= kkm) {
    return 'Perlu Bimbingan';
  }
  if (percentage <= kkm + 10) {
    return 'Cukup';
  }
  if (percentage <= kkm + 20) {
    return 'Baik';
  }
  return 'Sangat Baik';
}

export const getAttendancePerformanceLabel = getPerformanceLevel;
