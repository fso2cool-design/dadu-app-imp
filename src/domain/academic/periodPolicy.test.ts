import { describe, it, expect } from 'vitest';
import { resolveApplicableYear, pickInitialClassId } from './periodPolicy';
import type { SemesterType } from '../../types';

describe("periodPolicy — Single Source of Truth", () => {
  it("empty years falls back to profile or GANJIL", () => {
    expect(resolveApplicableYear({ years: [] }).pickedYearId).toBeNull();
    expect(resolveApplicableYear({ years: [], profileDefaultSemester: "GENAP" }).pickedSemester).toBe("GENAP");
  });

  it("active master year takes precedence over stale prefs", () => {
    const r = resolveApplicableYear({
      years: [
        { id: "ay-1", label: "2024/2025", isActive: true, currentSemester: "GANJIL" },
        { id: "ay-2", label: "2025/2026", isActive: false, currentSemester: "GENAP" },
      ],
      prefs: { defaultAcademicYearId: "ay-2", defaultSemester: "GENAP" },
    });
    expect(r.pickedYearId).toBe("ay-1");
    expect(r.pickedSemester).toBe("GANJIL");
  });

  it("active master currentSemester takes precedence over stale pref defaultSemester (both GANJIL and GENAP)", () => {
    // Case 1: Master GENAP vs Stale Pref GANJIL
    const r1 = resolveApplicableYear({
      years: [
        { id: "ay-1", label: "2025/2026", isActive: true, currentSemester: "GENAP" },
      ],
      prefs: { defaultAcademicYearId: "ay-1", defaultSemester: "GANJIL" },
    });
    expect(r1.pickedYearId).toBe("ay-1");
    expect(r1.pickedSemester).toBe("GENAP");

    // Case 2: Master GANJIL vs Stale Pref GENAP
    const r2 = resolveApplicableYear({
      years: [
        { id: "ay-1", label: "2025/2026", isActive: true, currentSemester: "GANJIL" },
      ],
      prefs: { defaultAcademicYearId: "ay-1", defaultSemester: "GENAP" },
    });
    expect(r2.pickedYearId).toBe("ay-1");
    expect(r2.pickedSemester).toBe("GANJIL");
  });

  it("falls back to pref when no master year is marked active", () => {
    const r = resolveApplicableYear({
      years: [
        { id: "ay-1", label: "2024/2025" },
        { id: "ay-2", label: "2025/2026" },
      ],
      prefs: { defaultAcademicYearId: "ay-2", defaultSemester: "GENAP" },
    });
    expect(r.pickedYearId).toBe("ay-2");
    expect(r.pickedSemester).toBe("GENAP");
  });

  it("fallback GANJIL when no semester defined anywhere", () => {
    expect(resolveApplicableYear({ years: [{ id: "1", label: "x" }], prefs: null }).pickedSemester).toBe("GANJIL");
  });

  it("pick class pref", () => {
    expect(pickInitialClassId([{ id: "c1", academicYearId: "y1" }, { id: "c2", academicYearId: "y1" }], "y1", "c2")).toBe("c2");
  });

  it("pick first active", () => {
    expect(pickInitialClassId([{ id: "c1", academicYearId: "y1", isArchived: true }, { id: "c2", academicYearId: "y1" }], "y1")).toBe("c2");
  });
});
