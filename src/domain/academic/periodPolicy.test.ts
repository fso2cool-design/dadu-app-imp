import { describe, it, expect } from 'vitest';
import { resolveApplicableYear, pickInitialClassId } from './periodPolicy';
describe("periodPolicy", () => {
  it("empty years", () => expect(resolveApplicableYear({ years: [] }).pickedYearId).toBeNull());
  it("pref overrides active", () => { const r = resolveApplicableYear({ years: [ { id: "1", name: "2024/2025", isActive: true }, { id: "2", name: "2025/2026" }], prefs: { defaultAcademicYearId: "2", defaultSemester: "GENAP" } }); expect(r.pickedYearId).toBe("2"); expect(r.pickedSemester).toBe("GENAP"); });
  it("fallback GANJIL", () => expect(resolveApplicableYear({ years: [{ id: "1", name: "x" }], prefs: null}).pickedSemester).toBe("GANJIL"));
  it("pick class pref", () => expect(pickInitialClassId(  [  { id: "c1", academicYearId: "y1" }, { id: "c2", academicYearId: "y1" } ], "y1", "c2")).toBe("c2"));
  it("pick first active", () => expect(pickInitialClassId([ { id: "c1", academicYearId: "y1", isArchived: true }, { id: "c2", academicYearId: "y1" } ], "y1")).toBe("c2"));
});
