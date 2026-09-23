import { describe, expect, it } from 'vitest';
import {
  INDONESIAN_DAYS,
  INDONESIAN_DAYS_SHORT,
  INDONESIAN_MONTHS,
  INDONESIAN_MONTHS_SHORT,
  formatDateIndonesian,
  formatDateWithDay,
  formatNumericDate,
  formatShortDate,
  formatTimeWIB,
  getCurrentMonthName,
  getTodayISO,
  isValidISODate,
} from './date';

describe('Indonesian Date & Time Utilities', () => {
  describe('Constants', () => {
    it('has 7 Indonesian days starting with Minggu', () => {
      expect(INDONESIAN_DAYS).toHaveLength(7);
      expect(INDONESIAN_DAYS[0]).toBe('Minggu');
      expect(INDONESIAN_DAYS[1]).toBe('Senin');
      expect(INDONESIAN_DAYS_SHORT[0]).toBe('Min');
      expect(INDONESIAN_DAYS_SHORT[1]).toBe('Sen');
    });

    it('has 12 Indonesian months starting with Januari', () => {
      expect(INDONESIAN_MONTHS).toHaveLength(12);
      expect(INDONESIAN_MONTHS[0]).toBe('Januari');
      expect(INDONESIAN_MONTHS[7]).toBe('Agustus');
      expect(INDONESIAN_MONTHS[11]).toBe('Desember');
      expect(INDONESIAN_MONTHS_SHORT[0]).toBe('Jan');
      expect(INDONESIAN_MONTHS_SHORT[7]).toBe('Agu');
    });
  });

  describe('getTodayISO & isValidISODate', () => {
    it('returns valid YYYY-MM-DD format for today', () => {
      const today = getTodayISO();
      expect(isValidISODate(today)).toBe(true);
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('correctly validates ISO date strings', () => {
      expect(isValidISODate('2026-09-23')).toBe(true);
      expect(isValidISODate('invalid-date')).toBe(false);
      expect(isValidISODate(null)).toBe(false);
      expect(isValidISODate(undefined)).toBe(false);
    });
  });

  describe('Formatting functions', () => {
    const sampleDate = '2026-08-17'; // Indonesia Independence Day (Senin)

    it('formats ISO date to full Indonesian date', () => {
      expect(formatDateIndonesian(sampleDate)).toBe('17 Agustus 2026');
      expect(formatDateIndonesian(null)).toBe('-');
      expect(formatDateIndonesian('')).toBe('-');
    });

    it('formats ISO date with day name', () => {
      expect(formatDateWithDay(sampleDate)).toBe('Senin, 17 Agustus 2026');
      expect(formatDateWithDay(null)).toBe('-');
    });

    it('formats ISO date to short format', () => {
      expect(formatShortDate(sampleDate)).toBe('17 Agu 2026');
      expect(formatShortDate(null)).toBe('-');
    });

    it('formats ISO date to numeric date DD/MM/YYYY', () => {
      expect(formatNumericDate(sampleDate)).toBe('17/08/2026');
      expect(formatNumericDate(null)).toBe('-');
    });

    it('returns current month name in Indonesian', () => {
      const currentMonth = getCurrentMonthName();
      expect(INDONESIAN_MONTHS).toContain(currentMonth);
    });

    it('formats time to Indonesian standard WIB format', () => {
      expect(formatTimeWIB('07:30')).toBe('07.30 WIB');
      expect(formatTimeWIB('13:45')).toBe('13.45 WIB');
      expect(formatTimeWIB(null)).toBe('-');
      expect(formatTimeWIB('')).toBe('-');
    });
  });
});
