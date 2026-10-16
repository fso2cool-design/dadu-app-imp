import { describe, expect, it } from 'vitest';
import type { AttendanceStatus } from '../../types';
import {
  calculateAttendanceSummary,
  isAttendanceStatus,
  VALID_ATTENDANCE_STATUSES,
  getPerformanceLevel,
  getAttendancePerformanceLabel,
  isValidKkm,
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

  it('rejects non-canonical strings', () => {
    expect(isAttendanceStatus('HADIR')).toBe(false);
    expect(isAttendanceStatus('ALPHA')).toBe(false);
    expect(isAttendanceStatus('UNKNOWN')).toBe(false);
    expect(isAttendanceStatus('')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(isAttendanceStatus(123)).toBe(false);
    expect(isAttendanceStatus({})).toBe(false);
    expect(isAttendanceStatus([])).toBe(false);
  });
});

describe('attendancePolicy — calculateAttendanceSummary()', () => {
  it('correctly aggregates an all-present session', () => {
    const items = [
      { status: 'PRESENT' as const },
      { status: 'PRESENT' as const },
      { status: 'PRESENT' as const },
    ];

    const summary = calculateAttendanceSummary(items);
    expect(summary).toEqual({
      present: 3,
      sick: 0,
      permitted: 0,
      absent: 0,
      dispensation: 0,
      total: 3,
      presentPercentage: 100,
    });
  });

  it('correctly counts all distinct attendance statuses', () => {
    const items = [
      { status: 'PRESENT' as const },
      { status: 'SICK' as const },
      { status: 'PERMITTED' as const },
      { status: 'ABSENT' as const },
      { status: 'DISPENSATION' as const },
    ];

    const summary = calculateAttendanceSummary(items);
    expect(summary).toEqual({
      present: 1,
      sick: 1,
      permitted: 1,
      absent: 1,
      dispensation: 1,
      total: 5,
      // (1 present + 1 dispensation) / 5 = 40%
      presentPercentage: 40,
    });
  });

  it('treats dispensation as present in percentage calculation', () => {
    const items = [
      { status: 'DISPENSATION' as const },
      { status: 'DISPENSATION' as const },
      { status: 'ABSENT' as const },
      { status: 'ABSENT' as const },
    ];

    const summary = calculateAttendanceSummary(items);
    expect(summary.present).toBe(0);
    expect(summary.dispensation).toBe(2);
    expect(summary.total).toBe(4);
    // (0 + 2) / 4 = 50%
    expect(summary.presentPercentage).toBe(50);
  });

  it('rounds percentage to the nearest integer', () => {
    // 2 present out of 3 = 66.666...% -> 67%
    const items1 = [
      { status: 'PRESENT' as const },
      { status: 'PRESENT' as const },
      { status: 'ABSENT' as const },
    ];
    expect(calculateAttendanceSummary(items1).presentPercentage).toBe(67);

    // 1 present out of 3 = 33.333...% -> 33%
    const items2 = [
      { status: 'PRESENT' as const },
      { status: 'ABSENT' as const },
      { status: 'ABSENT' as const },
    ];
    expect(calculateAttendanceSummary(items2).presentPercentage).toBe(33);
  });

  it('returns 0 percentage and counts for empty array', () => {
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

describe('attendancePolicy — getPerformanceLevel() and getAttendancePerformanceLabel()', () => {
  describe('KKM = 60', () => {
    it('accurately classifies canonical boundaries for KKM 60', () => {
      // 0–60: Perlu Bimbingan
      expect(getPerformanceLevel(0, 60)).toBe('Perlu Bimbingan');
      expect(getPerformanceLevel(59.99, 60)).toBe('Perlu Bimbingan');
      expect(getPerformanceLevel(60, 60)).toBe('Perlu Bimbingan');

      // >60–70: Cukup
      expect(getPerformanceLevel(60.01, 60)).toBe('Cukup');
      expect(getPerformanceLevel(65, 60)).toBe('Cukup');
      expect(getPerformanceLevel(69.99, 60)).toBe('Cukup');
      expect(getPerformanceLevel(70, 60)).toBe('Cukup');

      // >70–80: Baik
      expect(getPerformanceLevel(70.01, 60)).toBe('Baik');
      expect(getPerformanceLevel(75, 60)).toBe('Baik');
      expect(getPerformanceLevel(79.99, 60)).toBe('Baik');
      expect(getPerformanceLevel(80, 60)).toBe('Baik');

      // >80–100: Sangat Baik
      expect(getPerformanceLevel(80.01, 60)).toBe('Sangat Baik');
      expect(getPerformanceLevel(90, 60)).toBe('Sangat Baik');
      expect(getPerformanceLevel(100, 60)).toBe('Sangat Baik');
    });
  });

  describe('KKM = 65', () => {
    it('accurately classifies canonical boundaries for KKM 65', () => {
      // 0–65: Perlu Bimbingan
      expect(getPerformanceLevel(0, 65)).toBe('Perlu Bimbingan');
      expect(getPerformanceLevel(64.99, 65)).toBe('Perlu Bimbingan');
      expect(getPerformanceLevel(65, 65)).toBe('Perlu Bimbingan');

      // >65–75: Cukup
      expect(getPerformanceLevel(65.01, 65)).toBe('Cukup');
      expect(getPerformanceLevel(70, 65)).toBe('Cukup');
      expect(getPerformanceLevel(74.99, 65)).toBe('Cukup');
      expect(getPerformanceLevel(75, 65)).toBe('Cukup');

      // >75–85: Baik
      expect(getPerformanceLevel(75.01, 65)).toBe('Baik');
      expect(getPerformanceLevel(80, 65)).toBe('Baik');
      expect(getPerformanceLevel(84.99, 65)).toBe('Baik');
      expect(getPerformanceLevel(85, 65)).toBe('Baik');

      // >85–100: Sangat Baik
      expect(getPerformanceLevel(85.01, 65)).toBe('Sangat Baik');
      expect(getPerformanceLevel(95, 65)).toBe('Sangat Baik');
      expect(getPerformanceLevel(100, 65)).toBe('Sangat Baik');
    });
  });

  describe('KKM = 75', () => {
    it('accurately classifies canonical boundaries without pre-rounding for KKM 75', () => {
      // 0–75: Perlu Bimbingan
      expect(getPerformanceLevel(0, 75)).toBe('Perlu Bimbingan');
      expect(getPerformanceLevel(74.99, 75)).toBe('Perlu Bimbingan');
      expect(getPerformanceLevel(75.00, 75)).toBe('Perlu Bimbingan');

      // >75–85: Cukup
      expect(getPerformanceLevel(75.01, 75)).toBe('Cukup');
      expect(getPerformanceLevel(80, 75)).toBe('Cukup');
      expect(getPerformanceLevel(84.99, 75)).toBe('Cukup');
      expect(getPerformanceLevel(85.00, 75)).toBe('Cukup');

      // >85–95: Baik
      expect(getPerformanceLevel(85.01, 75)).toBe('Baik');
      expect(getPerformanceLevel(90, 75)).toBe('Baik');
      expect(getPerformanceLevel(94.99, 75)).toBe('Baik');
      expect(getPerformanceLevel(95.00, 75)).toBe('Baik');

      // >95–100: Sangat Baik
      expect(getPerformanceLevel(95.01, 75)).toBe('Sangat Baik');
      expect(getPerformanceLevel(99.99, 75)).toBe('Sangat Baik');
      expect(getPerformanceLevel(100, 75)).toBe('Sangat Baik');
    });
  });

  describe('isValidKkm validator', () => {
    it('returns true only for finite numbers in range (0, 100]', () => {
      expect(isValidKkm(60)).toBe(true);
      expect(isValidKkm(65)).toBe(true);
      expect(isValidKkm(75)).toBe(true);
      expect(isValidKkm(100)).toBe(true);
      expect(isValidKkm(0.1)).toBe(true);

      expect(isValidKkm(0)).toBe(false);
      expect(isValidKkm(-1)).toBe(false);
      expect(isValidKkm(100.1)).toBe(false);
      expect(isValidKkm(101)).toBe(false);
      expect(isValidKkm(NaN)).toBe(false);
      expect(isValidKkm(Infinity)).toBe(false);
      expect(isValidKkm(-Infinity)).toBe(false);
      expect(isValidKkm(null)).toBe(false);
      expect(isValidKkm(undefined)).toBe(false);
      expect(isValidKkm('75')).toBe(false);
    });
  });

  describe('Rejection of invalid, missing, and non-finite inputs', () => {
    it('returns null and does NOT classify as Perlu Bimbingan when percentage is invalid or out of range', () => {
      expect(getPerformanceLevel(-1, 75)).toBeNull();
      expect(getPerformanceLevel(-0.01, 75)).toBeNull();
      expect(getPerformanceLevel(100.01, 75)).toBeNull();
      expect(getPerformanceLevel(110, 75)).toBeNull();
      expect(getPerformanceLevel(NaN, 75)).toBeNull();
      expect(getPerformanceLevel(Infinity, 75)).toBeNull();
      expect(getPerformanceLevel(-Infinity, 75)).toBeNull();
      expect(getPerformanceLevel(null, 75)).toBeNull();
      expect(getPerformanceLevel(undefined, 75)).toBeNull();
    });

    it('returns null and does NOT classify as Perlu Bimbingan when KKM is invalid, missing, or out of range', () => {
      expect(getPerformanceLevel(80, 0)).toBeNull();
      expect(getPerformanceLevel(80, -10)).toBeNull();
      expect(getPerformanceLevel(80, 101)).toBeNull();
      expect(getPerformanceLevel(80, 105)).toBeNull();
      expect(getPerformanceLevel(80, NaN)).toBeNull();
      expect(getPerformanceLevel(80, Infinity)).toBeNull();
      expect(getPerformanceLevel(80, -Infinity)).toBeNull();
      expect(getPerformanceLevel(80, null)).toBeNull();
      expect(getPerformanceLevel(80, undefined)).toBeNull();
    });

    it('getAttendancePerformanceLabel alias behaves identically to getPerformanceLevel', () => {
      expect(getAttendancePerformanceLabel(75, 75)).toBe('Perlu Bimbingan');
      expect(getAttendancePerformanceLabel(75.01, 75)).toBe('Cukup');
      expect(getAttendancePerformanceLabel(85.01, 75)).toBe('Baik');
      expect(getAttendancePerformanceLabel(95.01, 75)).toBe('Sangat Baik');
      expect(getAttendancePerformanceLabel(90, undefined)).toBeNull();
    });
  });
});
