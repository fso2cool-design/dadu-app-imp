import { describe, it, expect } from 'vitest';
import {
  DEFAULT_KKM,
  GRADE_SCALES,
  getGradeScale,
  isPassingScore,
  calculateSimpleAverage,
  calculateWeightedAverage,
} from './grading';
import { getGradeScale as getDomainGradeScale } from '../domain/grading/grading.service';

describe('constants/grading - getGradeScale adapter', () => {
  it('delegates to domain policy for predicate and label', () => {
    const scores = [0, 50, 74.9, 75, 82.9, 83, 91.9, 92, 100];
    for (const score of scores) {
      const adapterResult = getGradeScale(score, DEFAULT_KKM);
      const domainResult = getDomainGradeScale(score, DEFAULT_KKM);
      expect(adapterResult.predicate).toBe(domainResult.predicate);
      expect(adapterResult.label).toBe(domainResult.label);
    }
  });

  it('preserves presentation metadata on returned GradeScale object', () => {
    const resultA = getGradeScale(95, 75);
    expect(resultA.predicate).toBe('A');
    expect(resultA.label).toBe('Sangat Baik');
    expect(resultA.description).toContain('optimal');
    expect(resultA.badgeClass).toContain('emerald');

    const resultD = getGradeScale(60, 75);
    expect(resultD.predicate).toBe('D');
    expect(resultD.label).toBe('Perlu Bimbingan');
    expect(resultD.description).toContain('remedial');
    expect(resultD.badgeClass).toContain('rose');
  });

  it('does not pre-round score 74.9 to 75 against KKM 75', () => {
    const belowKkm = getGradeScale(74.9, 75);
    expect(belowKkm.predicate).toBe('D');
    expect(belowKkm.label).toBe('Perlu Bimbingan');

    const atKkm = getGradeScale(75, 75);
    expect(atKkm.predicate).toBe('C');
    expect(atKkm.label).toBe('Cukup');
  });

  it('supports custom KKM matching domain policy', () => {
    expect(getGradeScale(87, 60).predicate).toBe('A');
    expect(getGradeScale(73, 60).predicate).toBe('B');
    expect(getGradeScale(60, 60).predicate).toBe('C');
    expect(getGradeScale(59.9, 60).predicate).toBe('D');
  });
});

describe('constants/grading - helper calculations', () => {
  it('isPassingScore', () => {
    expect(isPassingScore(75, 75)).toBe(true);
    expect(isPassingScore(74.9, 75)).toBe(false);
    expect(isPassingScore(70, 70)).toBe(true);
  });

  it('calculateSimpleAverage', () => {
    expect(calculateSimpleAverage([80, 90])).toBe(85);
    expect(calculateSimpleAverage([])).toBe(0);
    expect(calculateSimpleAverage([80, 85, 90])).toBe(85);
  });

  it('calculateWeightedAverage', () => {
    expect(
      calculateWeightedAverage([
        { score: 80, weight: 2 },
        { score: 90, weight: 1 },
      ])
    ).toBe(83.3);
    expect(calculateWeightedAverage([])).toBe(0);
  });
});
