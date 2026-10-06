// Pure domain: attendance aggregation - maps student + teacher statuses
export type AttendanceStatusDomain = string;
export type AttendanceItem = { status: AttendanceStatusDomain; studentId: string; };
export type StudentAttendanceSummary = {
  present: number;
  sick: number;
  permitted: number;
  absent: number;
  dispensation: number;
  total: number;
  attendancePeriods: number;
  rate: number;
};

function normalizeStatus(s: string): string {
  return (s ?? '').toUpperCase().trim();
}

function isPresent(norm: string): boolean {
  return norm === 'HADIR' || norm === 'PRESENT' || norm === 'H' || norm === 'LATE' || norm === 'TERLAMBAT';
}

function isSick(norm: string): boolean {
  return norm === 'SAKIT' || norm === 'SICK' || norm === 'S';
}

function isDispensation(norm: string): boolean {
  return norm === 'DISPENSATION' || norm === 'DISPENSASI' || norm === 'DINAS' || norm === 'D';
}

function isPermitted(norm: string): boolean {
  return norm === 'IZIN' || norm === 'PERMITTED' || norm === 'I';
}

function isAbsent(norm: string): boolean {
  return norm === 'ALPA' || norm === 'ABSENT' || norm === 'A' || norm === 'TRUANT' || norm === 'BOLOS';
}

export function aggregateAttendance(items: AttendanceItem[]): StudentAttendanceSummary {
  let present = 0;
  let sick = 0;
  let permitted = 0;
  let absent = 0;
  let dispensation = 0;

  for (const it of items) {
    const norm = normalizeStatus(it.status);
    if (isPresent(norm)) present++;
    else if (isSick(norm)) sick++;
    else if (isDispensation(norm)) dispensation++;
    else if (isPermitted(norm)) permitted++;
    else if (isAbsent(norm)) absent++;
  }

  const total = items.length;
  const rate = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 100;

  return {
    present,
    sick,
    permitted,
    absent,
    dispensation,
    total,
    attendancePeriods: total,
    rate,
  };
}

export function aggregateByStudent(items: AttendanceItem[]): Map<string, StudentAttendanceSummary> {
  const map = new Map<string, StudentAttendanceSummary>();
  const groups = new Map<string, AttendanceItem[]>();
  for (const it of items) {
    if (!groups.has(it.studentId)) groups.set(it.studentId, []);
    groups.get(it.studentId)!.push(it);
  }
  for (const [id, list] of groups) {
    map.set(id, aggregateAttendance(list));
  }
  return map;
}
