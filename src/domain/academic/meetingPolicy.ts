import type { SemesterType } from '../../types';

/**
 * Calculates the deterministic MeetingSlot document ID.
 * Format: slot_{safeTeachingAssignmentId}_{semester}_{meetingNumber}
 * Safe TA ID replaces any characters outside [a-zA-Z0-9_-] with an underscore.
 */
export function getMeetingSlotId(
  teachingAssignmentId: string,
  semester: SemesterType,
  meetingNumber: number
): string {
  const safeTaId = teachingAssignmentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `slot_${safeTaId}_${semester}_${meetingNumber}`;
}

/**
 * Calculates the deterministic MeetingDateSlot document ID.
 * Format: dateslot_{safeTeachingAssignmentId}_{semester}_{safeDate}
 * Safe TA ID and date replace any characters outside [a-zA-Z0-9_-] with an underscore.
 */
export function getMeetingDateSlotId(
  teachingAssignmentId: string,
  semester: SemesterType,
  date: string
): string {
  const safeTaId = teachingAssignmentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDate = date.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `dateslot_${safeTaId}_${semester}_${safeDate}`;
}

/**
 * Pure runtime guard for meeting numbers.
 * A valid meeting number must be a finite integer number >= 1.
 * Rejects 0, negative numbers, fractions, NaN, +/- Infinity, null, undefined,
 * strings when passed directly, booleans, and other non-number values.
 */
export function isValidMeetingNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
