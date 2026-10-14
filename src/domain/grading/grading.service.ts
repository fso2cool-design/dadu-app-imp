// Pure domain: grading - extracted from GradesPage.tsx:400-480
export type CalculationMethod = 'SIMPLE_AVERAGE' | 'WEIGHTED_AVERAGE';
export type MissingScoreTreatment = 'IGNORE' | 'PRO_RATA';
export type AssessmentItemDomain = {
  id: string;
  weight?: number;
  isIncludedInFinalScore?: boolean;
};
export type ScoreValue = number | undefined | null | string;
export type GradePredicate = 'A' | 'B' | 'C' | 'D';

export type GradeScaleDomain = {
  predicate: GradePredicate;
  label: string;
  isPassed: boolean;
};

export type GradingResult = {
  finalScore: number | null;
  filledCount: number;
  conductedFilledCount: number;
  conductedTotalCount: number;
  isIncomplete: boolean;
};

export function calculateFinalScore(
  items: AssessmentItemDomain[],
  conductedIds?: Set<string>,
  scores?: Map<string, ScoreValue>,
  method: CalculationMethod = 'WEIGHTED_AVERAGE',
  _missingTreatment: MissingScoreTreatment = 'IGNORE'
): GradingResult {
  const activeItems = items.filter(it => it.isIncludedInFinalScore !== false);
  const conductedItems = conductedIds
    ? activeItems.filter(it => conductedIds.has(it.id))
    : activeItems;

  let weightedSum = 0;
  let usedWeight = 0;
  let simpleSum = 0;
  let filledCount = 0;
  let conductedFilledCount = 0;

  for (const item of activeItems) {
    const v = scores?.get(item.id);
    const num = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    const str = String(v ?? '').trim();
    const hasValue = v !== undefined && v !== null && str !== '' && !isNaN(num);
    const isConducted = conductedIds ? conductedIds.has(item.id) : true;

    if (hasValue) {
      const w = Number(item.weight) || 1;
      weightedSum += num * w;
      usedWeight += w;
      simpleSum += num;
      filledCount++;
      if (isConducted) conductedFilledCount++;
    }
  }

  let finalScore: number | null = null;
  if (filledCount > 0) {
    if (method === 'WEIGHTED_AVERAGE') {
      finalScore = usedWeight > 0 ? Math.round((weightedSum / usedWeight) * 10) / 10 : null;
    } else {
      finalScore = filledCount > 0 ? Math.round((simpleSum / filledCount) * 10) / 10 : null;
    }
  }

  const conductedTotalCount = conductedItems.length;
  const isIncomplete = conductedTotalCount > 0 && conductedFilledCount < conductedTotalCount;

  return {
    finalScore,
    filledCount,
    conductedFilledCount,
    conductedTotalCount,
    isIncomplete,
  };
}

export function getGradeScale(score: number, passingGrade: number): GradeScaleDomain {
  const isPassed = score >= passingGrade;
  const safeKkm = Math.min(Math.max(passingGrade, 0), 100);
  const interval = Math.max(1, (100 - safeKkm) / 3);
  const thresholdB = Math.round(safeKkm + interval);
  const thresholdA = Math.round(safeKkm + (2 * interval));

  if (score >= thresholdA) return { predicate: 'A', label: 'Sangat Baik', isPassed };
  if (score >= thresholdB) return { predicate: 'B', label: 'Baik', isPassed };
  if (score >= safeKkm) return { predicate: 'C', label: 'Cukup', isPassed };
  return { predicate: 'D', label: 'Perlu Bimbingan', isPassed };
}
