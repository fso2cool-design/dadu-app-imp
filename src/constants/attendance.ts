import { AttendanceStatus } from '../types';

export interface AttendanceStatusMeta {
  code: AttendanceStatus;
  shortCode: string;
  label: string;
  labelIndonesian: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  activeBtnClass: string;
  bgLightClass: string;
  textColor: string;
  description: string;
}

export const ATTENDANCE_STATUS_LIST: AttendanceStatus[] = [
  'PRESENT',
  'SICK',
  'PERMITTED',
  'ABSENT',
  'DISPENSATION',
];

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, AttendanceStatusMeta> = {
  PRESENT: {
    code: 'PRESENT',
    shortCode: 'H',
    label: 'Hadir',
    labelIndonesian: 'Hadir',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40',
    dotClass: 'bg-emerald-500',
    borderClass: 'border-emerald-500',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30',
    bgLightClass: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    description: 'Siswa hadir dan mengikuti kegiatan pembelajaran secara penuh',
  },
  SICK: {
    code: 'SICK',
    shortCode: 'S',
    label: 'Sakit',
    labelIndonesian: 'Sakit',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-500',
    activeBtnClass: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30',
    bgLightClass: 'bg-amber-50/70 dark:bg-amber-950/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    description: 'Siswa tidak dapat hadir karena kondisi kesehatan / sakit berpenjelasan',
  },
  PERMITTED: {
    code: 'PERMITTED',
    shortCode: 'I',
    label: 'Izin',
    labelIndonesian: 'Izin',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500/40',
    dotClass: 'bg-sky-500',
    borderClass: 'border-sky-500',
    activeBtnClass: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/30',
    bgLightClass: 'bg-sky-50/70 dark:bg-sky-950/20',
    textColor: 'text-sky-600 dark:text-sky-400',
    description: 'Siswa berhalangan hadir dengan izin resmi dari orang tua / wali',
  },
  ABSENT: {
    code: 'ABSENT',
    shortCode: 'A',
    label: 'Alpa / Tanpa Keterangan',
    labelIndonesian: 'Alpa',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40',
    dotClass: 'bg-rose-500',
    borderClass: 'border-rose-500',
    activeBtnClass: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30',
    bgLightClass: 'bg-rose-50/70 dark:bg-rose-950/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    description: 'Siswa tidak hadir tanpa ada pemberitahuan atau keterangan yang sah',
  },
  DISPENSATION: {
    code: 'DISPENSATION',
    shortCode: 'D',
    label: 'Dispensasi',
    labelIndonesian: 'Dispensasi',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/40',
    dotClass: 'bg-purple-500',
    borderClass: 'border-purple-500',
    activeBtnClass: 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/30',
    bgLightClass: 'bg-purple-50/70 dark:bg-purple-950/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    description: 'Siswa mewakili sekolah / madrasah pada kegiatan lomba, delegasi, atau tugas resmi',
  },
};

export function getAttendanceStatusMeta(status: AttendanceStatus): AttendanceStatusMeta {
  return ATTENDANCE_STATUS_META[status] || ATTENDANCE_STATUS_META.PRESENT;
}

/**
 * Calculate attendance summary from record list
 */
export function calculateAttendanceSummary(records: Array<{ status: AttendanceStatus }>): {
  present: number;
  sick: number;
  permitted: number;
  absent: number;
  dispensation: number;
  total: number;
  presentPercentage: number;
} {
  let present = 0;
  let sick = 0;
  let permitted = 0;
  let absent = 0;
  let dispensation = 0;

  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'SICK') sick++;
    else if (r.status === 'PERMITTED') permitted++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'DISPENSATION') dispensation++;
  }

  const total = records.length;
  // Hadir + Dispensasi dihitung sebagai capaian kehadiran
  const presentPercentage = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 0;

  return {
    present,
    sick,
    permitted,
    absent,
    dispensation,
    total,
    presentPercentage,
  };
}
