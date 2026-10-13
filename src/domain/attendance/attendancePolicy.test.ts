import { describe, expect, it } from 'vitest';
import type { AttendanceStatus } from '../../types';
import {
  calculateAttendanceSummary,
  isAttendanceStatus,
  VALID_ATTENDANCE_STATUSES,
} from './attendancePolicy';

describe('attendancePolicy — isAttendanceStatus()', () => {
  it('recognizes all 5 canonical attendance statuses', () => {
    expect(VALID_ATTENDANCE_STATUSES).toEqual([
      'PRESENT',
      'SICK',
      'PERMITTED',
      'ABSENT',
      'DISPENSATION',
    ]);

    expect(isAttendanceStatus('PRESENT')).toBe(true);
    expect(isAttendanceStatus('SICK')).toBe(true);
    expect(isAttendanceStatus('PERMITTED')).toBe(true);
    expect(isAttendanceStatus('ABSENT')).toBe(true);
    expect(isAttendanceStatus('DISPENSATION')).toBe(true);
  });

  it('rejects null and undefined', () => {
    expect(isAttendanceStatus(null)).toBe(false);
    expect(isAttendanceStatus(undefined)).toBe(false);
  });

  it('rejects empty strings and whitespace strings', () => {
    expect(isAttendanceStatus('')).toBe(false);
    expect(isAttendanceStatus('   ')).toBe(false);
  });

  it('rejects case-mismatched or unsupported string values', () => {
    expect(isAttendanceStatus('present')).toBe(false);
    expect(isAttendanceStatus('Present')).toBe(false);
    expect(isAttendanceStatus('HADIR')).toBe(false);
    expect(isAttendanceStatus('HADIR_SEBAGIAN')).toBe(false);
    expect(isAttendanceStatus('LATE')).toBe(false);
    expect(isAttendanceStatus('UNKNOWN')).toBe(false);
  });

  it('rejects non-string primitives and objects', () => {
    expect(isAttendanceStatus(0)).toBe(false);
    expect(isAttendanceStatus(1)).toBe(false);
    expect(isAttendanceStatus(true)).toBe(false);
    expect(isAttendanceStatus({})).toBe(false);
    expect(isAttendanceStatus([])).toBe(false);
  });
});

describe('attendancePolicy — calculateAttendanceSummary()', () => {
  it('correctly tallies mixed attendance statuses', () => {
    const items: Array<{ status: AttendanceStatus }> = [
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'SICK' },
      { status: 'PERMITTED' },
      { status: 'ABSENT' },
      { status: 'DISPENSATION' },
    ];

    const summary = calculateAttendanceSummary(items);

    expect(summary).toEqual({
      present: 2,
      sick: 1,
      permitted: 1,
      absent: 1,
      dispensation: 1,
      total: 6,
      // (2 present + 1 dispensation) / 6 * 100 = 50%
      presentPercentage: 50,
    });
  });

  it('returns 100% when all students are PRESENT', () => {
    const items: Array<{ status: AttendanceStatus }> = [
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'PRESENT' },
    ];

    const summary = calculateAttendanceSummary(items);

    expect(summary.present).toBe(3);
    expect(summary.total).toBe(3);
    expect(summary.presentPercentage).toBe(100);
  });

  it('includes DISPENSATION in present percentage calculation', () => {
    const items: Array<{ status: AttendanceStatus }> = [
      { status: 'PRESENT' },
      { status: 'DISPENSATION' },
      { status: 'SICK' },
      { status: 'ABSENT' },
    ];

    const summary = calculateAttendanceSummary(items);

    // (1 present + 1 dispensation) / 4 = 50%
    expect(summary.present).toBe(1);
    expect(summary.dispensation).toBe(1);
    expect(summary.total).toBe(4);
    expect(summary.presentPercentage).toBe(50);
  });

  it('returns 0% when no students are PRESENT or in DISPENSATION', () => {
    const items: Array<{ status: AttendanceStatus }> = [
      { status: 'SICK' },
      { status: 'PERMITTED' },
      { status: 'ABSENT' },
    ];

    const summary = calculateAttendanceSummary(items);

    expect(summary.present).toBe(0);
    expect(summary.dispensation).toBe(0);
    expect(summary.sick).toBe(1);
    expect(summary.permitted).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.presentPercentage).toBe(0);
  });

  it('rounds percentage using standard Math.round rounding', () => {
    // 1 present out of 3 total = 33.333% -> 33%
    const items1: Array<{ status: AttendanceStatus }> = [
      { status: 'PRESENT' },
      { status: 'SICK' },
      { status: 'ABSENT' },
    ];
    expect(calculateAttendanceSummary(items1).presentPercentage).toBe(33);

    // 2 present out of 3 total = 66.666% -> 67%
    const items2: Array<{ status: AttendanceStatus }> = [
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'ABSENT' },
    ];
    expect(calculateAttendanceSummary(items2).presentPercentage).toBe(67);
  });

  it('defensively returns 0% and zero counts for empty array', () => {
    const summary = calculateAttendanceSummary([]);

    expect(summary).toEqual({
      present: 0,
      sick: 0,
      permitted: 0,
      absent: 0,
      dispensation: 0,
      total: 0,
      presentPercentage: 0,
    });
  });

  it('accepts readonly array inputs without requiring mutation', () => {
    const readonlyItems: ReadonlyArray<{ readonly status: AttendanceStatus }> = Object.freeze([
      Object.freeze({ status: 'PRESENT' as const }),
      Object.freeze({ status: 'SICK' as const }),
    ]);

    const summary = calculateAttendanceSummary(readonlyItems);
    expect(summary.total).toBe(2);
    expect(summary.present).toBe(1);
    expect(summary.sick).toBe(1);
    expect(summary.presentPercentage).toBe(50);
  });
});
