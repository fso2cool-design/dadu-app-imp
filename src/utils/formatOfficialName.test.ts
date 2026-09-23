import { describe, expect, it } from 'vitest';
import { formatOfficialNip, formatOfficialSignatureName } from './formatOfficialName';

describe('Official Name & NIP Formatting Utilities', () => {
  describe('formatOfficialSignatureName', () => {
    it('returns fallback when name is empty or null', () => {
      expect(formatOfficialSignatureName(null)).toBe('Pejabat Penanda Tangan');
      expect(formatOfficialSignatureName('')).toBe('Pejabat Penanda Tangan');
      expect(formatOfficialSignatureName('   ', 'Guru Mapel')).toBe('Guru Mapel');
    });

    it('formats plain name to uppercase', () => {
      expect(formatOfficialSignatureName('Ahmad Dahlan')).toBe('AHMAD DAHLAN');
    });

    it('normalizes front titles while uppercasing the main name', () => {
      expect(formatOfficialSignatureName('Drs. H. Zakaria')).toBe('Drs. H. ZAKARIA');
      expect(formatOfficialSignatureName('prof. dr. sulaiman')).toBe('Prof. Dr. SULAIMAN');
      expect(formatOfficialSignatureName('Hj. Siti Aminah')).toBe('Hj. SITI AMINAH');
    });

    it('normalizes all-caps academic degrees according to EYD V', () => {
      expect(formatOfficialSignatureName('Ahmad, S.PD.I')).toBe('AHMAD, S.Pd.I.');
      expect(formatOfficialSignatureName('Budi Santoso, M.PD')).toBe('BUDI SANTOSO, M.Pd.');
      expect(formatOfficialSignatureName('Drs. H. Zakaria, M.AG')).toBe('Drs. H. ZAKARIA, M.Ag.');
      expect(formatOfficialSignatureName('Rina Marlina, S.KOM, M.KOM')).toBe('RINA MARLINA, S.Kom., M.Kom.');
    });

    it('preserves properly formatted mixed-case degrees', () => {
      expect(formatOfficialSignatureName('Ahmad, S.Pd.I.')).toBe('AHMAD, S.Pd.I.');
      expect(formatOfficialSignatureName('Budi, M.Pd.')).toBe('BUDI, M.Pd.');
    });
  });

  describe('formatOfficialNip', () => {
    it('formats empty, null, or dash to "NIP -"', () => {
      expect(formatOfficialNip(null)).toBe('NIP -');
      expect(formatOfficialNip('')).toBe('NIP -');
      expect(formatOfficialNip('-')).toBe('NIP -');
      expect(formatOfficialNip('   ')).toBe('NIP -');
      expect(formatOfficialNip('NIP -')).toBe('NIP -');
    });

    it('cleans up redundant NIP prefixes and formats cleanly', () => {
      expect(formatOfficialNip('198501012010011001')).toBe('NIP 198501012010011001');
      expect(formatOfficialNip('NIP. 198501012010011001')).toBe('NIP 198501012010011001');
      expect(formatOfficialNip('NIP: 198501012010011001')).toBe('NIP 198501012010011001');
      expect(formatOfficialNip('NIP- 198501012010011001')).toBe('NIP 198501012010011001');
    });
  });
});
