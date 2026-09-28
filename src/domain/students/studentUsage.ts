// Pure domain: student usage summary derivation
export type StudentUsageCounts = { enrollments: number; scores: number; attendanceRecords: number; dailyAttendanceRecords: number; studentNotes: number; };
export type StudentUsageSummary = { isUsed: boolean; canDelete: boolean; reasons: string[]; counts: StudentUsageCounts; };

export function deriveStudentUsage(counts: StudentUsageCounts): StudentUsageSummary {
  const reasons: string[] = [];
  if (counts.enrollments > 0) reasons.push(`Terdaftar dalam ${counts.enrollments} rombongan belajar`);
  if (counts.scores > 0) reasons.push(`Memiliki ${counts.scores} data nilai asesmen`);
  if (counts.attendanceRecords > 0) reasons.push(`Memiliki ${counts.attendanceRecords} rekam presensi mapel`);
  if (counts.dailyAttendanceRecords > 0) reasons.push(`Memiliki ${counts.dailyAttendanceRecords} rekam presensi harian`);
  if (counts.studentNotes > 0) reasons.push(`Memiliki ${counts.studentNotes} catatan pembinaan siswa`);
  const isUsed = reasons.length > 0;
  return { isUsed, canDelete: !isUsed, reasons, counts };
}
