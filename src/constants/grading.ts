/**
 * Standard Grading & KKM/KKTP Constants and Helpers for DADU Workspace
 * Single source of truth for evaluation criteria, predicates, and calculation helpers.
 */

export const DEFAULT_KKM = 75;

export type GradePredicate = 'A' | 'B' | 'C' | 'D';

export interface GradeScale {
  predicate: GradePredicate;
  minScore: number;
  maxScore: number;
  label: string;
  description: string;
  badgeClass: string;
}

export const GRADE_SCALES: GradeScale[] = [
  {
    predicate: 'A',
    minScore: 90,
    maxScore: 100,
    label: 'Sangat Baik',
    description: 'Menunjukkan penguasaan kompetensi yang sangat optimal dan mandiri',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
  },
  {
    predicate: 'B',
    minScore: 80,
    maxScore: 89,
    label: 'Baik',
    description: 'Menunjukkan penguasaan kompetensi yang baik dan telah mencapai tujuan pembelajaran',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40',
  },
  {
    predicate: 'C',
    minScore: DEFAULT_KKM,
    maxScore: 79,
    label: 'Cukup',
    description: 'Menunjukkan penguasaan kompetensi yang cukup, memenuhi kriteria minimal kelulusan',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
  },
  {
    predicate: 'D',
    minScore: 0,
    maxScore: DEFAULT_KKM - 1,
    label: 'Perlu Bimbingan',
    description: 'Belum mencapai kriteria ketuntasan minimal, memerlukan remedial / bimbingan lanjutan',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
  },
];

/**
 * Get grade scale info based on numeric score and optional custom KKM
 */
export function getGradeScale(score: number, customKkm: number = DEFAULT_KKM): GradeScale {
  const rounded = Math.round(score);
  if (rounded >= 90) return GRADE_SCALES[0];
  if (rounded >= 80) return GRADE_SCALES[1];
  if (rounded >= customKkm) return GRADE_SCALES[2];
  return GRADE_SCALES[3];
}

/**
 * Determine if a score meets the minimum passing threshold (KKM/KKTP)
 */
export function isPassingScore(score: number, kkm: number = DEFAULT_KKM): boolean {
  return score >= kkm;
}

/**
 * Calculate simple arithmetic average from list of numbers
 */
export function calculateSimpleAverage(scores: number[]): number {
  const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s) && s >= 0);
  if (validScores.length === 0) return 0;
  const sum = validScores.reduce((acc, curr) => acc + curr, 0);
  return Math.round((sum / validScores.length) * 10) / 10;
}

/**
 * Calculate weighted average score
 */
export function calculateWeightedAverage(items: Array<{ score: number; weight: number }>): number {
  const validItems = items.filter(
    item => typeof item.score === 'number' && !isNaN(item.score) && item.weight > 0
  );
  if (validItems.length === 0) return 0;

  const totalWeight = validItems.reduce((acc, curr) => acc + curr.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = validItems.reduce((acc, curr) => acc + curr.score * curr.weight, 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}
