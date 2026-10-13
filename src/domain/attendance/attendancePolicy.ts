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
