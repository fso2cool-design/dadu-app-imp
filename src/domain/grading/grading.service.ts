// Pure domain: grading - extracted from GradesPage.tsx:400-480
export type CalculationMethod = 'SIMPLE_AVERAGE' | 'WEIGHTED_AVERAGE';
export type MissingScoreTreatment = 'IGNORE' | 'ZERO_PENALTY';
export type AssessmentItemDomain = { id: string; weight?: number; };
export type ScoreValue = number | undefined | null;

export type GradingResult = { finalScore: number; filledCount: number; conductedFilledCount: number; conductedTotalCount: number; isIncomplete: boolean; };

export function calculateFinalScore(
  items: AssessmentItemDomain[],
  conductedIds: Set<string>,
  scores: Map<string, ScoreValue>,
  method: CalculationMethod,
  missingTreatment: MissingScoreTreatment = 'IGNORE'
): GradingResult {
  let weightedSum = 0, usedWeight = 0, simpleSum = 0, filledCount = 0, conductedFilledCount = 0;
  const conductedItems = items.filter(it => conductedIds.has(it.id));
  for (const item of items) {
    const v = scores.get(item.id);
    const num = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    const hasValue = typeof v !== 'undefined' && v !== null && String(v) !== '' && !isNaN(num);
    const isConducted = conductedIds.has(item.id);
    if (hasValue) {
      const w = Number(item.weight) || 1;
      weightedSum += num * w; usedWeight += w; simpleSum += num; filledCount++;
      if (isConducted) conductedFilledCount++;
    } else if (isConducted && missingTreatment === 'ZERO_PENALTY') {
      const w = Number(item.weight) || 1; usedWeight += w;
    }
  }
  let finalScore = 0;
  if (method === 'WEIGHTED_AVERAGE') finalScore = usedWeight > 0 ? Math.round((weightedSum / usedWeight) * 10) / 10 : 0;
  else {
    const denom = missingTreatment === 'ZERO_PENALTY' ? Math.max(1, conductedItems.length) : filledCount;
    finalScore = denom > 0 ? Math.round((simpleSum / denom) * 10) / 10 : 0;
  }
  const conductedTotalCount = conductedItems.length;
  const isIncomplete = conductedTotalCount > 0 && conductedFilledCount < conductedTotalCount;
  return { finalScore, filledCount, conductedFilledCount, conductedTotalCount, isIncomplete };
}

export function getGradeScale(score: number, passingGrade: number): { predicate: string; label: string; isPassed: boolean } {
  const isPassed = score >= passingGrade;
  const safeKkm = Math.min(Math.max(passingGrade, 0), 100);
  const interval = Math.max(1, (100 - safeKkm) / 3);
  const thresholdB = Math.round(safeKkm + interval);
  const thresholdA = Math.round(safeKkm + (2 * interval));

  if (score >= thresholdA) return { predicate: 'A', label: 'Sangat Baik', isPassed };
  if (score >= thresholdB) return { predicate: 'B', label: 'Baik', isPassed };
  if (score >= safeKkm) return { predicate: 'C', label: 'Cukup', isPassed };
  return { predicate: 'D', label: 'Kurang', isPassed };
}
