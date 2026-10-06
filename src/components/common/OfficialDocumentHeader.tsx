import React from 'react';
import { SchoolSettings } from '../../types';
import { Buildings } from '@phosphor-icons/react';
import { getOfficialLetterhead, DEFAULT_KEMENAG_LOGO } from '../../domain/reports/letterhead';

export { DEFAULT_KEMENAG_LOGO };

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
  const head = getOfficialLetterhead(schoolSettings);

  return (
    <div className="w-full">
      {/* 1. Official 4-Tier Letterhead (Kop Surat) */}
      {showLetterhead && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 text-center pb-2">
            {/* Left Logo: Kementerian Agama */}
            <div className="w-20 flex items-center justify-center shrink-0">
              <img
                src={head.kemenagLogoUrl}
                alt="Logo Kemenag"
                className="w-18 h-18 max-w-full max-h-full object-contain"
              />
            </div>

            {/* 4-Tier Official Text Hierarchy */}
            <div className="flex-1 text-center px-2">
              {/* Tingkat 1 */}
              <h4 className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                {head.tier1}
              </h4>
              {/* Tingkat 2 */}
              {head.isMadrasah && (
                <h5 className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                  {head.tier2}
                </h5>
              )}
              {/* Tingkat 3: Nama Madrasah */}
              <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-950 my-1 leading-snug">
                {head.tier3}
              </h2>
              {/* Tingkat 4: Alamat Lengkap Tanpa NSM/NPSN */}
              <p className="text-[11px] text-slate-700 leading-snug">
                {head.tier4}
              </p>
            </div>

            {/* Right Logo: Madrasah / Sekolah */}
            <div className="w-20 flex items-center justify-center shrink-0">
              {head.schoolLogoUrl ? (
                <img
                  src={head.schoolLogoUrl}
                  alt="Logo Madrasah"
                  className="w-18 h-18 max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 no-print">
                  <Buildings className="w-6 h-6 text-slate-400 mb-0.5" />
                  <span className="text-[8px] font-bold uppercase">Madrasah</span>
                </div>
              )}
            </div>
          </div>

          {/* Double Border Rule (Garis Ganda Dokumen Dinas Resmi) */}
          <div className="border-b-2 border-slate-950 print:!border-slate-950"></div>
          <div className="border-b border-slate-950 print:!border-slate-950 mt-0.5"></div>
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
