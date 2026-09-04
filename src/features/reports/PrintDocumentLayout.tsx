import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSchoolSettings, getDocumentSettings } from '../../services/firestore/settings';
import { SchoolSettings, DocumentSettings } from '../../types';
import { formatDateIndonesian, getTodayISO } from '../../utils/date';
import { Printer, Download, Building2, Sliders, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';

interface PrintDocumentLayoutProps {
  title: string;
  documentNumber?: string;
  metaItems?: Array<{ label: string; value: string | React.ReactNode }>;
  children: React.ReactNode;
  onExportExcel?: () => void;
  excelExportDisabled?: boolean;
  signatureType?: 'TEACHER_AND_HEADMASTER' | 'HOMEROOM_AND_HEADMASTER' | 'HEADMASTER_ONLY' | 'TEACHER_ONLY';
  customTeacherName?: string;
  customTeacherNip?: string;
  customTeacherRole?: string;
  paperOrientation?: 'PORTRAIT' | 'LANDSCAPE';
  paperSize?: 'A4' | 'F4' | 'LETTER';
}

export const PrintDocumentLayout: React.FC<PrintDocumentLayoutProps> = ({
  title,
  documentNumber,
  metaItems = [],
  children,
  onExportExcel,
  excelExportDisabled = false,
  signatureType = 'TEACHER_AND_HEADMASTER',
  customTeacherName,
  customTeacherNip,
  customTeacherRole,
  paperOrientation = 'PORTRAIT',
  paperSize = 'A4',
}) => {
  const { user, profile } = useAuth();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [documentSettings, setDocumentSettings] = useState<DocumentSettings | null>(null);
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showDigitalSignatures, setShowDigitalSignatures] = useState(true);
  const [customCity, setCustomCity] = useState('');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const [school, doc] = await Promise.all([
          getSchoolSettings(user.uid),
          getDocumentSettings(user.uid),
        ]);
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
    setCustomDate(formatDateIndonesian(getTodayISO()));
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  const isMadrasah = !schoolSettings?.schoolLevel || ['MI', 'MTs', 'MA', 'MAK'].includes(schoolSettings.schoolLevel);
  
  const tier1 = isMadrasah 
    ? 'KEMENTERIAN AGAMA REPUBLIK INDONESIA' 
    : 'KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI';

  const tier2 = schoolSettings?.kemenagDistrict || (
    schoolSettings?.regency 
      ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolSettings.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
      : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
  );

  const effectiveSchoolName = schoolSettings?.schoolName || 'MAN 2 SERAM BAGIAN TIMUR';
  const effectiveAddress = schoolSettings?.address 
    ? `${schoolSettings.address}${schoolSettings.village ? `, ${schoolSettings.village}` : ''}${schoolSettings.district ? `, Kec. ${schoolSettings.district}` : ''}${schoolSettings.regency ? `, ${schoolSettings.regency}` : ''}${schoolSettings.province ? `, ${schoolSettings.province}` : ''}`
    : 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula';

  const kemenagLogo = schoolSettings?.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO;
  const madrasahLogo = schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl;

  const effectiveHeadmasterName = schoolSettings?.headmasterName || 'H. Ahmad Fauzi, M.Pd.I';
  const effectiveHeadmasterNip = schoolSettings?.headmasterNip || '19780512 200501 1 003';

  const effectiveTeacherName = customTeacherName || schoolSettings?.teacherName || user?.displayName || 'Guru Pengampu';
  const effectiveTeacherNip = customTeacherNip || schoolSettings?.teacherNip || '-';
  const effectiveTeacherRole = customTeacherRole || (signatureType === 'HOMEROOM_AND_HEADMASTER' ? 'Wali Kelas' : 'Guru Mata Pelajaran');

  return (
    <div className="space-y-4">
      {/* Document Control Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-cyan-950/60 text-orange-600 dark:text-cyan-400 border border-orange-200 dark:border-cyan-500/40 flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">Pratinjau Dokumen Cetak</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Format Kertas: <strong className="text-slate-700 dark:text-slate-200">{paperSize}</strong> • Orientasi: <strong className="text-slate-700 dark:text-slate-200">{paperOrientation}</strong>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Letterhead */}
          <button
            type="button"
            onClick={() => setShowLetterhead(!showLetterhead)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showLetterhead 
                ? 'bg-orange-50 dark:bg-cyan-950/50 border-orange-200 dark:border-cyan-500/40 text-orange-700 dark:text-cyan-300' 
                : 'bg-white dark:bg-[#141722] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{showLetterhead ? 'Kop Madrasah: Aktif' : 'Kop Madrasah: Nonaktif'}</span>
          </button>

          {/* Toggle Signatures */}
          <button
            type="button"
            onClick={() => setShowSignatures(!showSignatures)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showSignatures 
                ? 'bg-orange-50 dark:bg-cyan-950/50 border-orange-200 dark:border-cyan-500/40 text-orange-700 dark:text-cyan-300' 
                : 'bg-white dark:bg-[#141722] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{showSignatures ? 'Tanda Tangan: Aktif' : 'Tanda Tangan: Nonaktif'}</span>
          </button>

          {/* Export Excel if provided */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={excelExportDisabled}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] bg-white dark:bg-[#141722] hover:bg-slate-50 dark:hover:bg-[#1b1f2e] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="printable-document bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm max-w-5xl mx-auto text-slate-900 font-sans">
        
        {/* 1. Official Madrasah 4-Tier Letterhead (Kop Surat) */}
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
                  {effectiveSchoolName}
                </h2>
                {/* Tingkat 4: Alamat Lengkap Tanpa NSM/NPSN */}
                <p className="text-[11px] text-slate-700 leading-snug">
                  {effectiveAddress}
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

        {/* 2. Document Title & Number */}
        <div className="text-center my-4">
          <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900 underline decoration-2 underline-offset-4">
            {title}
          </h1>
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
        {showSignatures && (
          <div className="mt-10 pt-4 page-break-inside-avoid text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-8 items-start">
              {/* Left Column: Mengetahui Kepala Madrasah */}
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
                  {effectiveHeadmasterName}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  NIP. {effectiveHeadmasterNip}
                </p>
              </div>

              {/* Right Column: Tempat, Titimangsa & Guru Pengampu / Wali Kelas */}
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
                  {effectiveTeacherName}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  NIP. {effectiveTeacherNip}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
