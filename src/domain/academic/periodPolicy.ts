import type { SemesterType } from '../../types';

// Pure domain: academic period resolution - Single Source of Truth
export type PeriodResolveInput = {
  years: Array<{
    id: string;
    label: string;
    isActive?: boolean;
    currentSemester?: SemesterType | string;
  }>;
  prefs?: { defaultAcademicYearId?: string; defaultSemester?: SemesterType | string } | null;
  profileDefaultSemester?: SemesterType | string;
};

export function resolveApplicableYear(input: PeriodResolveInput): {
  pickedYearId: string | null;
  pickedSemester: SemesterType;
} {
  const yearsList = input.years;
  if (!yearsList.length) {
    const fallbackSem = (input.prefs?.defaultSemester as SemesterType) || (input.profileDefaultSemester as SemesterType) || 'GANJIL';
    return { pickedYearId: null, pickedSemester: fallbackSem };
  }

  // 1. Master active year is authoritative (Single Source of Truth)
  const masterActive = yearsList.find((y) => y.isActive);
  let current = masterActive;

  // 2. Legacy fallback only when no master year is marked active
  if (!current) {
    if (input.prefs?.defaultAcademicYearId) {
      const prefFound = yearsList.find((y) => y.id === input.prefs!.defaultAcademicYearId);
      if (prefFound) current = prefFound;
    }
    if (!current) {
      current = yearsList[0];
    }
  }

  // 3. Master currentSemester is authoritative over stale preferences
  const sem: SemesterType =
    (current.currentSemester as SemesterType) ||
    (input.prefs?.defaultSemester as SemesterType) ||
    (input.profileDefaultSemester as SemesterType) ||
    'GANJIL';

  return { pickedYearId: current.id, pickedSemester: sem };
}

export function pickInitialClassId(
  classes: Array<{ id: string; academicYearId: string; isArchived?: boolean }>,
  activeYearId: string | null,
  prefClassId?: string,
): string | undefined {
  const active = classes.filter(
    (c) => (!activeYearId || c.academicYearId === activeYearId) && !c.isArchived,
  );
  const fallback = classes.filter((c) => !c.isArchived);
  const pref = active.find((c) => c.id === prefClassId);
  return pref ? pref.id : active[0]?.id || fallback[0]?.id || classes[0]?.id;
}
