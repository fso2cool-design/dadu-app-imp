import { describe, it, expect } from 'vitest';
import { calculateFinalScore, getGradeScale } from './grading.service';
describe("grading", () => {
  it("weighted average", () => { const r = calculateFinalScore([ { id: "a", weight: 2 }, { id: "b", weight: 1 } ], new Set(["a","b"]), new Map([["a",80],["b",90]]), "WEIGHTED_AVERAGE"); expect(r.finalScore).toBeCloseTo(83.3,1); });
  it("simple average", () => { const r = calculateFinalScore([ { id: "a" }, { id: "b" }], new Set(["a","b"]), new Map([["a",80],["b",90]]), "SIMPLE_AVERAGE"); expect(r.finalScore).toBe(85); });
  it("zero penalty missing conducted", () => { const r = calculateFinalScore([ { id: "a" }, { id: "b" }], new Set(["a","b"]), new Map([["a",80]]), "SIMPLE_AVERAGE", "ZERO_PENALTY"); expect(r.conductedTotalCount).toBe(2); expect(r.isIncomplete).toBe(true); });
  it("grade scale", () => { expect(getGradeScale(92,75).predicate).toBe("A"); expect(getGradeScale(70,75).isPassed).toBe(false); });
});
