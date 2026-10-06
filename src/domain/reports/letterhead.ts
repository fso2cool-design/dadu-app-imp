import { SchoolSettings } from '../../types';

export const DEFAULT_KEMENAG_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="46" fill="#0c6b38" stroke="#f6c12c" stroke-width="4"/>
  <circle cx="50" cy="38" r="38" fill="#ffffff"/>
  <polygon points="50,16 54,26 65,26 56,33 60,43 50,37 40,43 44,33 35,26 46,26" fill="#f6c12c"/>
  <path d="M30 46 C35 44, 45 44, 50 48 C55 44, 65 44, 70 46 L70 68 C65 65, 55 65, 50 69 C45 65, 35 65, 30 68 Z" fill="#0c6b38"/>
  <path d="M50 48 L50 69" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="50" cy="76" r="3.5" fill="#f6c12c"/>
  <text x="50" y="87" font-size="5.5" font-weight="bold" fill="#0c6b38" text-anchor="middle" font-family="sans-serif">IKHLAS BERAMAL</text>
</svg>
`)}`;

export interface OfficialLetterhead {
  isMadrasah: boolean;
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;
  addressText: string;
  contactText: string;
  kemenagLogoUrl: string;
  schoolLogoUrl?: string;
  hasSchoolLogo: boolean;
}

export function getOfficialLetterhead(schoolSettings?: SchoolSettings | null): OfficialLetterhead {
  const isMadrasah = !schoolSettings?.schoolLevel || ['MI', 'MTs', 'MA', 'MAK'].includes(schoolSettings.schoolLevel);

  const tier1 = isMadrasah
    ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'
    : 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI';

  const tier2 = schoolSettings?.kemenagDistrict || (
    schoolSettings?.regency
      ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolSettings.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
      : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
  );

  const tier3 = schoolSettings?.schoolName || (schoolSettings as any)?.name || 'MAN 2 SERAM BAGIAN TIMUR';

  const addressParts = [
    schoolSettings?.address,
    schoolSettings?.village ? `, ${schoolSettings.village}` : '',
    schoolSettings?.district ? `, Kec. ${schoolSettings.district}` : '',
    schoolSettings?.regency ? `, ${schoolSettings.regency}` : '',
    schoolSettings?.province ? `, ${schoolSettings.province}` : '',
  ].filter(Boolean);

  const addressText = addressParts.length > 0
    ? `${schoolSettings?.address || ''}${schoolSettings?.village ? `, ${schoolSettings.village}` : ''}${schoolSettings?.district ? `, Kec. ${schoolSettings.district}` : ''}${schoolSettings?.regency ? `, ${schoolSettings.regency}` : ''}${schoolSettings?.province ? `, ${schoolSettings.province}` : ''}`
    : 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula';

  const contactParts: string[] = [];
  if (schoolSettings?.phone) contactParts.push(`Telp: ${schoolSettings.phone}`);
  if (schoolSettings?.email) contactParts.push(`Email: ${schoolSettings.email}`);
  const contactText = contactParts.join(' | ');

  const tier4 = contactText ? `${addressText} | ${contactText}` : addressText;

  const kemenagLogoUrl = schoolSettings?.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO;
  const schoolLogoUrl = schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl;

  return {
    isMadrasah,
    tier1,
    tier2,
    tier3,
    tier4,
    addressText,
    contactText,
    kemenagLogoUrl,
    schoolLogoUrl,
    hasSchoolLogo: Boolean(schoolLogoUrl),
  };
}
