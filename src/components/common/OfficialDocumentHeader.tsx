import React from 'react';
import { SchoolSettings } from '../../types';
import { Building2 } from 'lucide-react';

// Default Kemenag "Ikhlas Beramal" Clean Vector Logo
export const DEFAULT_KEMENAG_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="46" fill="#0c6b38" stroke="#f6c12c" stroke-width="4"/>
  <circle cx="50" cy="50" r="38" fill="#ffffff"/>
  <polygon points="50,16 54,26 65,26 56,33 60,43 50,37 40,43 44,33 35,26 46,26" fill="#f6c12c"/>
  <path d="M30 46 C35 44, 45 44, 50 48 C55 44, 65 44, 70 46 L70 68 C65 65, 55 65, 50 69 C45 65, 35 65, 30 68 Z" fill="#0c6b38"/>
  <path d="M50 48 L50 69" stroke="#ffffff" stroke-width="1.5"/>
  <circle cx="50" cy="76" r="3.5" fill="#f6c12c"/>
  <text x="50" y="87" font-size="5.5" font-weight="bold" fill="#0c6b38" text-anchor="middle" font-family="sans-serif">IKHLAS BERAMAL</text>
</svg>
`)}`;

interface OfficialDocumentHeaderProps {
  schoolSettings?: SchoolSettings | null;
  documentTitle?: string;
  documentSubtitle?: string;
  documentNumber?: string;
  metaItems?: Array<{ label: string; value: string | React.ReactNode }>;
  showLetterhead?: boolean;
}

export const OfficialDocumentHeader: React.FC<OfficialDocumentHeaderProps> = ({
  schoolSettings,
  documentTitle,
  documentSubtitle,
  documentNumber,
  metaItems = [],
  showLetterhead = true,
}) => {
  const isMadrasah = !schoolSettings?.schoolLevel || ['MI', 'MTs', 'MA', 'MAK'].includes(schoolSettings.schoolLevel);
  
  // 4-Tier Official Letterhead Details
  const tier1 = isMadrasah 
    ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA' 
    : 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI';

  const tier2 = schoolSettings?.kemenagDistrict || (
    schoolSettings?.regency 
      ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolSettings.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
      : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
  );

  const tier3 = schoolSettings?.schoolName || 'MAN 2 SERAM BAGIAN TIMUR';

  const tier4 = schoolSettings?.address 
    ? `${schoolSettings.address}${schoolSettings.village ? `, ${schoolSettings.village}` : ''}${schoolSettings.district ? `, Kec. ${schoolSettings.district}` : ''}${schoolSettings.regency ? `, ${schoolSettings.regency}` : ''}${schoolSettings.province ? `, ${schoolSettings.province}` : ''}`
    : 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula';

  const kemenagLogo = schoolSettings?.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO;
  const madrasahLogo = schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl;

  return (
    <div className="w-full">
      {/* 1. Official 4-Tier Letterhead (Kop Surat) */}
      {showLetterhead && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 text-center pb-2">
            {/* Left Logo: Kementerian Agama */}
            <div className="w-20 flex items-center justify-center shrink-0">
              <img
                src={kemenagLogo}
                alt="Logo Kemenag"
                className="w-18 h-18 max-w-full max-h-full object-contain"
              />
            </div>

            {/* 4-Tier Official Text Hierarchy */}
            <div className="flex-1 text-center px-2">
              {/* Tingkat 1 */}
              <h4 className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                {tier1}
              </h4>
              {/* Tingkat 2 */}
              {isMadrasah && (
                <h5 className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                  {tier2}
                </h5>
              )}
              {/* Tingkat 3: Nama Madrasah */}
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-950 my-1 leading-snug">
                {tier3}
              </h2>
              {/* Tingkat 4: Alamat Lengkap Tanpa NSM/NPSN */}
              <p className="text-[11px] text-slate-700 leading-snug">
                {tier4}
              </p>
            </div>

            {/* Right Logo: Madrasah / Sekolah */}
            <div className="w-20 flex items-center justify-center shrink-0">
              {madrasahLogo ? (
                <img
                  src={madrasahLogo}
                  alt="Logo Madrasah"
                  className="w-18 h-18 max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 no-print">
                  <Building2 className="w-6 h-6 text-slate-400 mb-0.5" />
                  <span className="text-[8px] font-bold uppercase">Madrasah</span>
                </div>
              )}
            </div>
          </div>

          {/* Double Border Rule (Garis Ganda Dokumen Dinas Resmi) */}
          <div className="border-b-2 border-slate-950"></div>
          <div className="border-b border-slate-950 mt-0.5"></div>
        </div>
      )}

      {/* 2. Document Title & Header Meta */}
      {documentTitle && (
        <div className="text-center mb-5">
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide text-slate-950">
            {documentTitle}
          </h1>
          {documentSubtitle && (
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {documentSubtitle}
            </p>
          )}
          {documentNumber && (
            <p className="text-xs font-mono text-slate-500 mt-1">
              Nomor: {documentNumber}
            </p>
          )}
        </div>
      )}

      {/* 3. Metadata Grid (e.g. Kelas, Mapel, Guru, Semester) */}
      {metaItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-6">
          {metaItems.map((meta, idx) => (
            <div key={idx} className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {meta.label}
              </span>
              <span className="font-semibold text-slate-800 block">
                {meta.value || '-'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
