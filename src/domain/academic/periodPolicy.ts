// Pure domain: academic period resolution - extracted from WorkspaceContext:190-230
export type PeriodResolveInput = { years: Array<{ id: string; name: string; isActive?: boolean }>; prefs?: { defaultAcademicYearId?: string; defaultSemester?: string} | null; profileDefaultSemester?: string; };
export function resolveApplicableYear(input: PeriodResolveInput): {pickedYearId: string | null; pickedSemester: string | null } {
  const yearsList = input.years; if (!yearsList.length) return { pickedYearId: null, pickedSemester: null };
  let current = yearsList.find(y => y.isActive) || yearsList[0];
  if (input.prefs?.defaultAcademicYearId) {
    const f = yearsList.find(y => y.id === input.prefs!.defaultAcademicYearId);
    if (f) current = f;
  }
  const sem = input.prefs?.defaultSemester || input.profileDefaultSemester || 'GANJIL';
  return { pickedYearId: current.id, pickedSemester: sem };
}
export function pickInitialClassId(
  classes: Array<{ id: string; academicYearId: string; isArchived?: boolean }>,
  activeYearId: string | null,
  prefClassId?: string,
): string | undefined {
  const active = classes.filter((c) => (!activeYearId || c.academicYearId === activeYearId) && !c.isArchived);
  const fallback = classes.filter((c) => !c.isArchived);
  const pref = active.find((c) => c.id === prefClassId);
  return pref ? pref.id : (active[0]?.id || fallback[0]?.id || classes[0]?.id);
}
