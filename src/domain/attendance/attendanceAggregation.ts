// Pure domain: attendance aggregation - maps student + teacher statuses
export type AttendanceStatusDomain = string;
export type AttendanceItem = { status: AttendanceStatusDomain; studentId: string; };
export type StudentAttendanceSummary = { present: number; sick: number; permitted: number; absent: number; total: number; attendancePeriods: number; };
function isPresent(s: string) { return s === 'HADIR' || s === 'PRESENT' }
function isSick(s: string) { return s === 'SAKIT' || s === 'SICK' }
function isPermitted(s: string) { return s === 'IZIN' || s === 'PERMITTED' || s === 'DISPENSATION' || s === 'DINAS' }
function isAbsent(s: string) { return s === 'ALPA' || s === 'ABSENT' }
export function aggregateAttendance(items: AttendanceItem[]): StudentAttendanceSummary {
  let present=0, sick=0, permitted=0, absent=0;
  for (const it of items) {
    if (isPresent(it.status)) present++;
    else if (isSick(it.status)) sick++;
    else if (isPermitted(it.status)) permitted++;
    else if (isAbsent(it.status)) absent++;
  }
  return { present, sick, permitted, absent, total: items.length, attendancePeriods: items.length };
}
export function aggregateByStudent(items: AttendanceItem[]): Map<string, StudentAttendanceSummary> {
  const map = new Map();
  const groups = new Map<string, AttendanceItem[]>();
  for (const it of items) { if (!groups.has(it.studentId)) groups.set(it.studentId, []); groups.get(it.studentId)!.push(it); }
  for (const [id, list] of groups) map.set(id, aggregateAttendance(list));
  return map;
}
