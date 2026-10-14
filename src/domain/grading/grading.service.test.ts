import { describe, it, expect } from 'vitest';
import { calculateFinalScore, getGradeScale } from './grading.service';

describe('grading - calculateFinalScore (Phase 2A Consistency)', () => {
  // Case 1: Dua komponen berbobot 50: nilai 80 dan kosong menghasilkan referensi 80, bukan 40
  it('case 1: two components with weight 50: score 80 and empty yields provisional 80, not 40', () => {
    const items = [
      { id: 'comp-1', weight: 50 },
      { id: 'comp-2', weight: 50 },
    ];
    const scores = new Map<string, any>([['comp-1', 80]]);
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBe(80);
    expect(result.filledCount).toBe(1);
    expect(result.conductedTotalCount).toBe(2);
    expect(result.isIncomplete).toBe(true);
  });

  // Case 2: Nilai eksplisit 0 tetap masuk perhitungan
  it('case 2: explicit numeric 0 is included in calculation', () => {
    const items = [
      { id: 'comp-1', weight: 50 },
      { id: 'comp-2', weight: 50 },
    ];
    // Explicit 0 on comp-1, 100 on comp-2 -> (0*50 + 100*50) / 100 = 50
    const scores = new Map<string, any>([
      ['comp-1', 0],
      ['comp-2', 100],
    ]);
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBe(50);
    expect(result.filledCount).toBe(2);
    expect(result.isIncomplete).toBe(false);

    // Sole explicit 0 should yield 0, not null
    const soleZeroScores = new Map<string, any>([['comp-1', 0]]);
    const soleZeroResult = calculateFinalScore(items, undefined, soleZeroScores, 'WEIGHTED_AVERAGE', 'IGNORE');
    expect(soleZeroResult.finalScore).toBe(0);
    expect(soleZeroResult.filledCount).toBe(1);
    expect(soleZeroResult.isIncomplete).toBe(true);
  });

  // Case 2b: Hasil tetap sama untuk seluruh pengaturan penanganan nilai kosong yang didukung (IGNORE, PRO_RATA, default)
  it('case 2b: result remains identical across all supported missing score treatments', () => {
    const items = [
      { id: 'comp-1', weight: 50 },
      { id: 'comp-2', weight: 50 },
    ];
    const scores = new Map<string, any>([['comp-1', 80]]);

    const resDefault = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE');
    const resIgnore = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');
    const resProRata = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'PRO_RATA');

    expect(resDefault.finalScore).toBe(80);
    expect(resIgnore.finalScore).toBe(80);
    expect(resProRata.finalScore).toBe(80);
    expect(resDefault.isIncomplete).toBe(true);
    expect(resIgnore.isIncomplete).toBe(true);
    expect(resProRata.isIncomplete).toBe(true);
  });

  // Case 3: Nilai kosong (''), null, dan undefined tidak masuk numerator atau denominator
  it('case 3: empty string, null, and undefined are excluded from numerator and denominator', () => {
    const items = [
      { id: 'a', weight: 10 },
      { id: 'b', weight: 20 },
      { id: 'c', weight: 30 },
      { id: 'd', weight: 40 },
    ];
    const scores = new Map<string, any>([
      ['a', 90],
      ['b', ''],
      ['c', null],
      ['d', undefined],
    ]);
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBe(90);
    expect(result.filledCount).toBe(1);
    expect(result.conductedTotalCount).toBe(4);
    expect(result.isIncomplete).toBe(true);
  });

  // Case 4: Jika semua komponen kosong, tidak ada nilai referensi yang diperlakukan sebagai nilai final 0 atau predikat D
  it('case 4: when all components are empty, finalScore is null and no false 0 is reported', () => {
    const items = [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 1 },
    ];
    const scores = new Map<string, any>([
      ['a', null],
      ['b', ''],
    ]);
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBeNull();
    expect(result.filledCount).toBe(0);
    expect(result.conductedTotalCount).toBe(2);
    expect(result.isIncomplete).toBe(true);
  });

  // Case 5: Komponen yang dikecualikan tidak masuk perhitungan
  it('case 5: excluded components (isIncludedInFinalScore === false) are ignored', () => {
    const items = [
      { id: 'included', weight: 50, isIncludedInFinalScore: true },
      { id: 'excluded', weight: 50, isIncludedInFinalScore: false },
    ];
    const scores = new Map<string, any>([
      ['included', 85],
      ['excluded', 20], // Should be skipped completely
    ]);
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBe(85);
    expect(result.filledCount).toBe(1);
    expect(result.conductedTotalCount).toBe(1);
    expect(result.isIncomplete).toBe(false);
  });

  // Case 5b: Nilai kosong tidak menambah denominator weighted average maupun simple average
  it('case 5b: unfilled items do not inflate denominator in weighted average or simple average', () => {
    const items = [
      { id: 'c1', weight: 20 },
      { id: 'c2', weight: 30 },
      { id: 'c3', weight: 50 },
    ];
    const scores = new Map<string, any>([
      ['c1', 90], // weight 20
      ['c2', 70], // weight 30
      // c3 is unfilled
    ]);

    // Weighted average: (90*20 + 70*30) / (20 + 30) = (1800 + 2100) / 50 = 3900 / 50 = 78
    // If c3 weight (50) was in denominator, it would be 3900 / 100 = 39 (WRONG)
    const weightedRes = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE');
    expect(weightedRes.finalScore).toBe(78);
    expect(weightedRes.filledCount).toBe(2);
    expect(weightedRes.conductedTotalCount).toBe(3);

    // Simple average: (90 + 70) / 2 = 160 / 2 = 80
    // If c3 count was in denominator, it would be 160 / 3 = 53.3 (WRONG)
    const simpleRes = calculateFinalScore(items, undefined, scores, 'SIMPLE_AVERAGE');
    expect(simpleRes.finalScore).toBe(80);
    expect(simpleRes.filledCount).toBe(2);
    expect(simpleRes.conductedTotalCount).toBe(3);
  });

  // Case 6: Rata-rata sederhana hanya menggunakan nilai yang sudah diisi
  it('case 6: simple average uses only filled scores in denominator', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const scores = new Map<string, any>([
      ['a', 80],
      ['b', 90],
      // c is unrecorded
    ]);
    const result = calculateFinalScore(items, undefined, scores, 'SIMPLE_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBe(85); // (80 + 90) / 2 = 85, NOT / 3 (= 56.7)
    expect(result.filledCount).toBe(2);
    expect(result.conductedTotalCount).toBe(3);
    expect(result.isIncomplete).toBe(true);
  });

  // Case 7: Rata-rata berbobot menggunakan bobot komponen bernilai
  it('case 7: weighted average divides only by weight of scored items', () => {
    const items = [
      { id: 'quiz', weight: 20 },
      { id: 'midterm', weight: 30 },
      { id: 'final', weight: 50 },
    ];
    const scores = new Map<string, any>([
      ['quiz', 100],
      ['midterm', 80],
      // final is missing
    ]);
    // Numerator: 100*20 + 80*30 = 2000 + 2400 = 4400. Denominator: 20 + 30 = 50. Final: 4400 / 50 = 88
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(result.finalScore).toBe(88);
    expect(result.filledCount).toBe(2);
    expect(result.conductedTotalCount).toBe(3);
    expect(result.isIncomplete).toBe(true);
  });

  // Case 8: Nilai desimal dan predikat tetap konsisten dengan Stage 1C
  it('case 8: rounded to 1 decimal place and predicate aligns with Stage 1C', () => {
    const items = [
      { id: 'a', weight: 2 },
      { id: 'b', weight: 1 },
    ];
    const scores = new Map<string, any>([
      ['a', 80],
      ['b', 90],
    ]);
    const result = calculateFinalScore(items, undefined, scores, 'WEIGHTED_AVERAGE');
    expect(result.finalScore).toBe(83.3);

    const scale = getGradeScale(result.finalScore!, 75);
    expect(scale.predicate).toBe('B');
    expect(scale.label).toBe('Baik');
    expect(scale.isPassed).toBe(true);
  });

  // Case 9: Perhitungan pada berbagai skenario menghasilkan angka yang konsisten bila input, metode, dan KKM sama
  it('case 9: cross-consumer calculation determinism', () => {
    const items = [
      { id: 'uh1', weight: 30 },
      { id: 'uh2', weight: 30 },
      { id: 'pas', weight: 40 },
    ];
    const studentScores = new Map<string, any>([
      ['uh1', 75],
      ['uh2', 85],
    ]);

    // Consumer A (GradesPage): calls with conductedIds set
    const conducted = new Set(['uh1', 'uh2', 'pas']);
    const resA = calculateFinalScore(items, conducted, studentScores, 'WEIGHTED_AVERAGE', 'IGNORE');

    // Consumer B (ReportsPage): calls without conductedIds set
    const resB = calculateFinalScore(items, undefined, studentScores, 'WEIGHTED_AVERAGE', 'IGNORE');

    expect(resA.finalScore).toBe(resB.finalScore);
    expect(resA.finalScore).toBe(80); // (75*30 + 85*30) / 60 = 80
    expect(resA.isIncomplete).toBe(true);
    expect(resB.isIncomplete).toBe(true);
  });

  // Case 10: Ketidaklengkapan data tidak membuat UI mengklaim penilaian sudah final
  it('case 10: incomplete data signals isIncomplete: true when conducted items remain unscored', () => {
    const items = [
      { id: 'tugas1', weight: 20 },
      { id: 'tugas2', weight: 20 },
    ];
    const conducted = new Set(['tugas1', 'tugas2']);
    const scores = new Map<string, any>([['tugas1', 95]]);

    const result = calculateFinalScore(items, conducted, scores, 'WEIGHTED_AVERAGE', 'IGNORE');
    expect(result.isIncomplete).toBe(true);
    expect(result.conductedFilledCount).toBe(1);
    expect(result.conductedTotalCount).toBe(2);

    // When all conducted items are scored, isIncomplete is false
    scores.set('tugas2', 90);
    const completedResult = calculateFinalScore(items, conducted, scores, 'WEIGHTED_AVERAGE', 'IGNORE');
    expect(completedResult.isIncomplete).toBe(false);
    expect(completedResult.conductedFilledCount).toBe(2);
    expect(completedResult.conductedTotalCount).toBe(2);
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
    expect(getGradeScale(100, 75).predicate).toBe('A');
    expect(getGradeScale(92, 75).predicate).toBe('A');
    expect(getGradeScale(91.9, 75).predicate).toBe('B');
    expect(getGradeScale(83.5, 75).predicate).toBe('B');
    expect(getGradeScale(83, 75).predicate).toBe('B');
    expect(getGradeScale(82.9, 75).predicate).toBe('C');
    expect(getGradeScale(75, 75).predicate).toBe('C');
    expect(getGradeScale(74.9, 75).predicate).toBe('D');
    expect(getGradeScale(0, 75).predicate).toBe('D');
  });

  it('handles dynamic KKM 60', () => {
    expect(getGradeScale(60, 60).predicate).toBe('C');
    expect(getGradeScale(59.9, 60).predicate).toBe('D');
    expect(getGradeScale(73, 60).predicate).toBe('B');
    expect(getGradeScale(87, 60).predicate).toBe('A');
  });

  it('handles dynamic KKM 70', () => {
    expect(getGradeScale(70, 70).predicate).toBe('C');
    expect(getGradeScale(69.9, 70).predicate).toBe('D');
    expect(getGradeScale(80, 70).predicate).toBe('B');
    expect(getGradeScale(90, 70).predicate).toBe('A');
  });

  it('handles dynamic KKM 80', () => {
    expect(getGradeScale(80, 80).predicate).toBe('C');
    expect(getGradeScale(79.9, 80).predicate).toBe('D');
    expect(getGradeScale(87, 80).predicate).toBe('B');
    expect(getGradeScale(93, 80).predicate).toBe('A');
  });

  it('safely clamps passingGrade to [0, 100]', () => {
    const clampedLow = getGradeScale(50, -10);
    expect(clampedLow.isPassed).toBe(true);

    const clampedHigh = getGradeScale(90, 150);
    expect(clampedHigh.isPassed).toBe(false);
  });
});
