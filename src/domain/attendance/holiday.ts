// Pure domain: holiday policy - extracted from WorkspaceContext.tsx:279-313
export type Holiday = { startDate: string; endDate?: string; description?: string };
export type AttendanceSettingsDomain = { schoolDaysOption: 5 | 6; Holidays?: Holiday[]; holidays?: Holiday[] };
export function checkIsHoliday(dateStr: string, settings: AttendanceSettingsDomain): { isHoliday: boolean; reason?: string } {
  if (!dateStr) return { isHoliday: false };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { isHoliday: false };
  const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return { isHoliday: false };
  const dow = new Date(y, m - 1, d).getDay();
  if (dow === 0) return { isHoliday: true, reason: 'Hari Minggu (Libur Akhir Pekan)' };
  if (dow === 6 && settings.schoolDaysOption === 5) return { isHoliday: true, reason: 'Hari Sabtu (Libur Akhir Pekan - Sekolah 5 Hari)' };
  const list = settings.Holidays || settings.holidays || undefined;
  if (Array.isArray(list)) {
    const match = list.find((h) => { const s = h.startDate; const e = h.endDate || h.startDate; return dateStr >= s && dateStr <= e; });
    if (match) return { isHoliday: true, reason: match.description || 'Hari Libur Madrasah' };
  }
  return { isHoliday: false };
}

