import { describe, it, expect } from 'vitest';
import { calculateFinalScore, getGradeScale } from './grading.service';

describe('grading - calculateFinalScore', () => {
  it('weighted average', () => {
    const r = calculateFinalScore(
      [
        { id: 'a', weight: 2 },
        { id: 'b', weight: 1 },
      ],
      new Set(['a', 'b']),
      new Map([
        ['a', 80],
        ['b', 90],
      ]),
      'WEIGHTED_AVERAGE'
    );
    expect(r.finalScore).toBeCloseTo(83.3, 1);
  });

  it('simple average', () => {
    const r = calculateFinalScore(
      [{ id: 'a' }, { id: 'b' }],
      new Set(['a', 'b']),
      new Map([
        ['a', 80],
        ['b', 90],
      ]),
      'SIMPLE_AVERAGE'
    );
    expect(r.finalScore).toBe(85);
  });

  it('zero penalty missing conducted', () => {
    const r = calculateFinalScore(
      [{ id: 'a' }, { id: 'b' }],
      new Set(['a', 'b']),
      new Map([['a', 80]]),
      'SIMPLE_AVERAGE',
      'ZERO_PENALTY'
    );
    expect(r.conductedTotalCount).toBe(2);
    expect(r.isIncomplete).toBe(true);
  });
});

describe('grading - getGradeScale domain policy', () => {
  it('predicate D produces label "Perlu Bimbingan" and isPassed false', () => {
    const result = getGradeScale(60, 75);
    expect(result.predicate).toBe('D');
    expect(result.label).toBe('Perlu Bimbingan');
    expect(result.isPassed).toBe(false);
  });

  it('handles score 74.9 and 75 against KKM 75 without pre-rounding', () => {
    const belowKkm = getGradeScale(74.9, 75);
    expect(belowKkm.predicate).toBe('D');
    expect(belowKkm.label).toBe('Perlu Bimbingan');
    expect(belowKkm.isPassed).toBe(false);

    const atKkm = getGradeScale(75, 75);
    expect(atKkm.predicate).toBe('C');
    expect(atKkm.label).toBe('Cukup');
    expect(atKkm.isPassed).toBe(true);
  });

  it('correctly classifies predicate boundaries for default KKM 75', () => {
    // KKM 75: interval = (100 - 75) / 3 = 8.333 -> thresholdB = 83, thresholdA = 92
    expect(getGradeScale(100, 75)).toEqual({ predicate: 'A', label: 'Sangat Baik', isPassed: true });
    expect(getGradeScale(92, 75)).toEqual({ predicate: 'A', label: 'Sangat Baik', isPassed: true });
    expect(getGradeScale(91.9, 75)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(83, 75)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(82.9, 75)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(75, 75)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(74.9, 75)).toEqual({ predicate: 'D', label: 'Perlu Bimbingan', isPassed: false });
    expect(getGradeScale(0, 75)).toEqual({ predicate: 'D', label: 'Perlu Bimbingan', isPassed: false });
  });

  it('handles dynamic KKM 60', () => {
    // KKM 60: interval = 40 / 3 = 13.333 -> thresholdB = 73, thresholdA = 87
    expect(getGradeScale(87, 60)).toEqual({ predicate: 'A', label: 'Sangat Baik', isPassed: true });
    expect(getGradeScale(86.9, 60)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(73, 60)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(72.9, 60)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(60, 60)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(59.9, 60)).toEqual({ predicate: 'D', label: 'Perlu Bimbingan', isPassed: false });
  });

  it('handles dynamic KKM 70', () => {
    // KKM 70: interval = 30 / 3 = 10 -> thresholdB = 80, thresholdA = 90
    expect(getGradeScale(90, 70)).toEqual({ predicate: 'A', label: 'Sangat Baik', isPassed: true });
    expect(getGradeScale(89.9, 70)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(80, 70)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(79.9, 70)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(70, 70)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(69.9, 70)).toEqual({ predicate: 'D', label: 'Perlu Bimbingan', isPassed: false });
  });

  it('handles dynamic KKM 80', () => {
    // KKM 80: interval = 20 / 3 = 6.667 -> thresholdB = 87, thresholdA = 93
    expect(getGradeScale(93, 80)).toEqual({ predicate: 'A', label: 'Sangat Baik', isPassed: true });
    expect(getGradeScale(92.9, 80)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(87, 80)).toEqual({ predicate: 'B', label: 'Baik', isPassed: true });
    expect(getGradeScale(86.9, 80)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(80, 80)).toEqual({ predicate: 'C', label: 'Cukup', isPassed: true });
    expect(getGradeScale(79.9, 80)).toEqual({ predicate: 'D', label: 'Perlu Bimbingan', isPassed: false });
  });

  it('safely clamps passingGrade to [0, 100]', () => {
    // passingGrade < 0 -> safeKkm = 0, interval = 33.333 -> thresholdB = 33, thresholdA = 67
    const clampedLow = getGradeScale(35, -10);
    expect(clampedLow.predicate).toBe('B');
    expect(clampedLow.isPassed).toBe(true);

    // passingGrade > 100 -> safeKkm = 100, interval = 1 -> thresholdB = 101, thresholdA = 102
    const clampedHigh = getGradeScale(95, 120);
    expect(clampedHigh.predicate).toBe('D');
    expect(clampedHigh.isPassed).toBe(false);
  });
});
