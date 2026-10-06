import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useApplication } from '../../application/ApplicationContext';
import { SchoolSettings, DocumentSettings } from '../../types';
import { formatDateIndonesian, getTodayISO } from '../../utils/date';
import { formatOfficialSignatureName, formatOfficialNip } from '../../utils/formatOfficialName';
import { Buildings } from '@phosphor-icons/react';
import { getOfficialLetterhead } from '../../domain/reports/letterhead';
import { PrintActionBar, PrintOptions } from '../../components/common/PrintActionBar';
import { type PaperSizeKey } from '../../constants/print';

interface PrintDocumentLayoutProps {
  title: string;
  subtitle?: string;
  documentSubtitle?: string;
  documentNumber?: string;
  metaItems?: Array<{ label: string; value: string | React.ReactNode }>;
  children: React.ReactNode;
  onExportExcel?: () => void;
  excelExportDisabled?: boolean;
  onClose?: () => void;
  signatureType?: 'TEACHER_AND_HEADMASTER' | 'HOMEROOM_AND_HEADMASTER' | 'HEADMASTER_ONLY' | 'TEACHER_ONLY';
  customTeacherName?: string;
  customTeacherNip?: string;
  customTeacherRole?: string;
  paperOrientation?: 'PORTRAIT' | 'LANDSCAPE';
  paperSize?: PaperSizeKey;
}

export const PrintDocumentLayout: React.FC<PrintDocumentLayoutProps> = ({
  title,
  subtitle,
  documentSubtitle,
  documentNumber,
  metaItems = [],
  children,
  onExportExcel,
  excelExportDisabled = false,
  onClose,
  signatureType = 'TEACHER_AND_HEADMASTER',
  customTeacherName,
  customTeacherNip,
  customTeacherRole,
  paperOrientation = 'PORTRAIT',
  paperSize = 'A4',
}) => {
  const { user, profile } = useAuth();
  const app = useApplication();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [documentSettings, setDocumentSettings] = useState<DocumentSettings | null>(null);
  
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    paperSize: (paperSize === 'F4' ? 'F4' : 'A4') as 'A4' | 'F4',
    orientation: paperOrientation,
    useKop: true,
    useSignature: true,
  });

  const [customCity, setCustomCity] = useState('');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    setPrintOptions((prev) => ({
      ...prev,
      paperSize: (paperSize === 'F4' ? 'F4' : 'A4') as 'A4' | 'F4',
      orientation: paperOrientation,
    }));
  }, [paperSize, paperOrientation]);

  useEffect(() => {
      let isMounted = true;
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const [school, doc] = await Promise.all([
          app.settings.getSchoolSettings(user.uid),
          app.settings.getDocumentSettings(user.uid),
        ]);
        if (!isMounted) return;
        setSchoolSettings(school);
        setDocumentSettings(doc);
        if (doc?.city) {
          setCustomCity(doc.city);
        } else if (school?.district || school?.regency) {
          setCustomCity(school.district || school.regency || 'Kota');
        }
      } catch (err) {
        console.error('Error fetching settings for document layout:', err);
      }
    };
    fetchSettings();

    // Default formatted Indonesian date
      return () => { isMounted = false; };
    setCustomDate(formatDateIndonesian(getTodayISO()));
  }, [user, app.settings]);

  const handlePrint = () => {
    window.print();
  };

  const letterhead = getOfficialLetterhead(schoolSettings);

  const effectiveHeadmasterName = schoolSettings?.headmasterName || 'H. Ahmad Fauzi, M.Pd.I';
  const effectiveHeadmasterNip = schoolSettings?.headmasterNip || '19780512 200501 1 003';

  const effectiveTeacherName = customTeacherName || schoolSettings?.teacherName || user?.displayName || 'Guru Pengampu';
  const effectiveTeacherNip = customTeacherNip || schoolSettings?.teacherNip || '-';
  const effectiveTeacherRole = customTeacherRole || (signatureType === 'HOMEROOM_AND_HEADMASTER' ? 'Wali Kelas' : 'Guru Mata Pelajaran');

  return (
    <div className="space-y-4">
      {/* Document Control Bar (Hidden on Print) */}
      <PrintActionBar
        options={printOptions}
        onOptionsChange={setPrintOptions}
        onPrint={handlePrint}
        onExportExcel={onExportExcel}
        excelExportDisabled={excelExportDisabled}
        onClose={onClose}
      />

      {/* Printable Sheet Wrapper */}
      <div
        className="printable-document bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm max-w-5xl mx-auto text-slate-900 font-sans"
        data-paper={printOptions.paperSize}
        data-orientation={printOptions.orientation}
      >
        
        {/* 1. Official Madrasah 4-Tier Letterhead (Kop Surat) */}
        {printOptions.useKop && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 text-center pb-2">
              {/* Left Logo: Kementerian Agama */}
              <div className="w-20 flex items-center justify-center shrink-0">
                <img
                  src={letterhead.kemenagLogoUrl}
                  alt="Logo Kemenag"
                  className="w-18 h-18 max-w-full max-h-full object-contain"
                />
              </div>

              {/* 4-Tier Official Text Hierarchy */}
              <div className="flex-1 text-center px-2">
                {/* Tingkat 1 */}
                <h4 className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                  {letterhead.tier1}
                </h4>
                {/* Tingkat 2 */}
                {letterhead.isMadrasah && (
                  <h5 className="text-[11px] sm:text-xs font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                    {letterhead.tier2}
                  </h5>
                )}
                {/* Tingkat 3: Nama Madrasah */}
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-950 my-1 leading-snug">
                  {letterhead.tier3}
                </h2>
                {/* Tingkat 4: Alamat Lengkap */}
                <p className="text-[11px] text-slate-700 leading-snug">
                  {letterhead.tier4}
                </p>
              </div>

              {/* Right Logo: Madrasah / Sekolah */}
              <div className="w-20 flex items-center justify-center shrink-0">
                {letterhead.hasSchoolLogo && letterhead.schoolLogoUrl ? (
                  <img
                    src={letterhead.schoolLogoUrl}
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
            <div className="border-b-2 border-slate-950 print:!border-slate-950" />
            <div className="border-b border-slate-950 print:!border-slate-950 mt-0.5" />
          </div>
        )}

        {/* 2. Document Title & Number */}
        <div className="text-center my-4">
          <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900 underline decoration-2 underline-offset-4">
            {title}
          </h1>
          {(subtitle || documentSubtitle) && (
            <p className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
              {subtitle || documentSubtitle}
            </p>
          )}
          {documentNumber && (
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Nomor: {documentNumber}
            </p>
          )}
        </div>

        {/* 3. Metadata Grid (Key-Value) */}
        {metaItems.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs mb-5 font-medium">
            {metaItems.map((meta, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">{meta.label}</span>
                <span className="text-slate-800 font-bold">{meta.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* 4. Document Main Content Slot (Tables, Matrix, Stats) */}
        <div className="my-4">
          {children}
        </div>

        {/* 5. Formal Indonesian Signature Blocks */}
        {printOptions.useSignature && (
          <div className="mt-10 pt-4 page-break-inside-avoid text-xs text-slate-800">
            <div className={`grid ${signatureType === 'HEADMASTER_ONLY' || signatureType === 'TEACHER_ONLY' ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'} gap-8 items-start`}>
              {/* Left Column: Mengetahui Kepala Madrasah */}
              {signatureType !== 'TEACHER_ONLY' && (
                <div className="text-center space-y-1">
                  <p className="text-xs text-slate-600 font-medium">Mengetahui,</p>
                  <p className="font-bold text-slate-800">Kepala Madrasah</p>
                  
                  {/* Signature & Stamp space */}
                  <div className="h-20 flex items-center justify-center relative">
                    {schoolSettings?.stampImageUrl && (
                      <img
                        src={schoolSettings.stampImageUrl}
                        alt="Stempel Madrasah"
                        className="absolute max-h-18 max-w-28 object-contain opacity-80 pointer-events-none -rotate-6"
                      />
                    )}
                    {schoolSettings?.headmasterSignatureUrl ? (
                      <img
                        src={schoolSettings.headmasterSignatureUrl}
                        alt="Tanda Tangan Kepala"
                        className="max-h-16 max-w-32 object-contain relative z-10"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan & Stempel)</span>
                    )}
                  </div>

                  <p className="font-bold text-slate-900 underline decoration-1 underline-offset-2">
                    {formatOfficialSignatureName(effectiveHeadmasterName, 'Kepala Madrasah')}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    {formatOfficialNip(effectiveHeadmasterNip)}
                  </p>
                </div>
              )}

              {/* Right Column: Tempat, Titimangsa & Guru Pengampu / Wali Kelas */}
              {signatureType !== 'HEADMASTER_ONLY' && (
                <div className="text-center space-y-1">
                  <p className="text-xs text-slate-600 font-medium">
                    {customCity || 'Kota'}, {customDate}
                  </p>
                  <p className="font-bold text-slate-800">{effectiveTeacherRole}</p>

                  {/* Signature space */}
                  <div className="h-20 flex items-center justify-center">
                    {(profile?.signatureUrl || documentSettings?.signatureImageUrl) ? (
                      <img
                        src={profile?.signatureUrl || documentSettings?.signatureImageUrl}
                        alt="Tanda Tangan Guru"
                        className="max-h-16 max-w-32 object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan)</span>
                    )}
                  </div>

                  <p className="font-bold text-slate-900 underline decoration-1 underline-offset-2">
                    {formatOfficialSignatureName(effectiveTeacherName, 'Guru Pengampu')}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    {formatOfficialNip(effectiveTeacherNip)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
