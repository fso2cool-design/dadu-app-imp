// Pure domain: student policy - NISN uniqueness and archive guards.
export type StudentPolicyInput = { nisn: string; students: Array<{ id: string; nisn: string; fullName?: string; isArchived?: boolean; }>; excludeStudentId?: string; };
export type NisnCheckResult = { isAvailable: boolean; conflictingStudentId?: string; conflictingName?: string; };
export function normalizeNisn(nisn: string | undefined): string { return (nisn || '').trim(); }
export function checkNisnAvailabilityPure(input: StudentPolicyInput): NisnCheckResult {
  const clean = normalizeNisn(input.nisn);
  if (!clean) return { isAvailable: true };
  for (const s of input.students) {
    if (input.excludeStudentId === s.id) continue;
    if (s.isArchived) continue;
    if ((normalizeNisn(s.nisn) || '') === clean) return { isAvailable: false, conflictingStudentId: s.id, conflictingName: s.fullName || '' };
  }
  return { isAvailable: true };
}
export function canArchiveStudent(status: string): boolean { return ['INACTIVE','GRADUATED','TRANSFERRED'].includes(status); }
export function isValidStudentName(name: string): boolean { return !!name && name.trim().length >= 2; }
