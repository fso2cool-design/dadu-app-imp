/**
 * Standard Indonesian Date & Time Utilities for DADU Workspace
 * Single source of truth for date formatting, parsing, and time slot helpers.
 */

export const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

export const INDONESIAN_DAYS_SHORT = [
  'Min',
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab',
] as const;

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const INDONESIAN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

/**
 * Get current date in ISO format YYYY-MM-DD
 */
export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a string is a valid ISO date YYYY-MM-DD
 */
export function isValidISODate(dateStr?: string | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

/**
 * Format ISO date (YYYY-MM-DD) to full Indonesian date: "31 Agustus 2026"
 */
export function formatDateIndonesian(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${INDONESIAN_MONTHS[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO date to Indonesian date with Day: "Senin, 31 Agustus 2026"
 */
export function formatDateWithDay(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dayName = INDONESIAN_DAYS[d.getDay()];
    const dateFormatted = formatDateIndonesian(dateStr);
    return `${dayName}, ${dateFormatted}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO date to short format: "31 Agu 2026"
 */
export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
        return `${day} ${INDONESIAN_MONTHS_SHORT[monthIdx]} ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${INDONESIAN_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO date to numeric date: "31/08/2026"
 */
export function formatNumericDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Get current Indonesian month name
 */
export function getCurrentMonthName(): string {
  return INDONESIAN_MONTHS[new Date().getMonth()];
}

/**
 * Format time string HH:mm to standard Indonesian time display: "07.30 WIB"
 */
export function formatTimeWIB(timeStr?: string | null): string {
  if (!timeStr) return '-';
  return `${timeStr.replace(':', '.')} WIB`;
}
