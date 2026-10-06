import { describe, it, expect } from 'vitest';
import { getOfficialLetterhead, DEFAULT_KEMENAG_LOGO } from './letterhead';
import { SchoolSettings } from '../../types';

describe('letterhead domain', () => {
  it('provides default madrasah letterhead when settings is null', () => {
    const head = getOfficialLetterhead(null);
    expect(head.isMadrasah).toBe(true);
    expect(head.tier1).toBe('KEMENTERIAN AGAMA REPUBLIK INDONESIA');
    expect(head.tier3).toBe('MAN 2 SERAM BAGIAN TIMUR');
    expect(head.kemenagLogoUrl).toBe(DEFAULT_KEMENAG_LOGO);
    expect(head.hasSchoolLogo).toBe(false);
  });

  it('formats Kemendikbud letterhead for non-madrasah school levels', () => {
    const settings: SchoolSettings = {
      schoolName: 'SMP NEGERI 1 BULA',
      schoolLevel: 'SMP',
      headmasterName: 'Drs. Fulan',
    };
    const head = getOfficialLetterhead(settings);
    expect(head.isMadrasah).toBe(false);
    expect(head.tier1).toBe('KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI');
    expect(head.tier3).toBe('SMP NEGERI 1 BULA');
  });

  it('correctly constructs tier2 district office and tier4 contacts', () => {
    const settings: SchoolSettings = {
      schoolName: 'MTs Al-Ikhlas',
      schoolLevel: 'MTs',
      regency: 'Kabupaten Seram Bagian Timur',
      phone: '08123456789',
      email: 'mts@example.com',
      headmasterName: 'H. Ahmad',
    };
    const head = getOfficialLetterhead(settings);
    expect(head.tier2).toBe('KANTOR KEMENTERIAN AGAMA KABUPATEN SERAM BAGIAN TIMUR');
    expect(head.contactText).toContain('Telp: 08123456789');
    expect(head.contactText).toContain('Email: mts@example.com');
  });
});
