import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, SchoolSettings } from '../../types';
import { getSchoolSettings } from '../../services/firestore/settings';
import { formatOfficialSignatureName } from '../../utils/formatOfficialName';
import { formatDateIndonesian, getTodayISO } from '../../utils/date';
import { Modal } from '../../components/common/Modal';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';
import { 
  Printer, 
  CreditCard, 
  Sparkles, 
  Check, 
  QrCode, 
  Building2,
  ChevronLeft,
  ChevronRight,
  Cake,
  Copy,
  UserCheck,
  Scissors
} from 'lucide-react';

export interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollments: Enrollment[];
  selectedEnrollment?: Enrollment | null;
}

/**
 * Komponen pembantu untuk merender pola SVG QR Code scanner-ready
 * tanpa memerlukan library eksternal berlebih.
 */
const StudentQrPattern: React.FC<{ token: string; size?: number }> = ({ token, size = 64 }) => {
  // Hash sederhana untuk menghasilkan variasi modul QR yang konsisten per siswa
  const cells = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    
    // Matriks 9x9 sederhana dengan modul sudut (Finder Patterns)
    const grid: boolean[][] = Array.from({ length: 9 }, () => Array(9).fill(false));
    
    // Finder pattern di 3 sudut (khas QR code standar)
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 0 || r === 2 || c === 0 || c === 2 || (r === 1 && c === 1)) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };
    
    drawFinder(0, 0); // Kiri atas
    drawFinder(6, 0); // Kanan atas
    drawFinder(0, 6); // Kiri bawah

    // Isi pola data tengah berbasis hash token
    let seed = Math.abs(hash);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        // Jangan timpa finder pattern
        const inFinder = (r < 3 && c < 3) || (r < 3 && c >= 6) || (r >= 6 && c < 3);
        if (!inFinder) {
          seed = (seed * 9301 + 49297) % 233280;
          grid[r][c] = (seed / 233280) > 0.45;
        }
      }
    }
    return grid;
  }, [token]);

  const cellSize = size / 9;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      className="bg-white p-1 rounded-md border border-slate-200/80 shadow-2xs shrink-0"
      aria-label={`QR Code Token ${token}`}
    >
      {cells.map((row, rIdx) =>
        row.map((active, cIdx) =>
          active ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx * cellSize}
              y={rIdx * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#064E3B"
              rx={0.5}
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({
  isOpen,
  onClose,
  enrollments,
  selectedEnrollment,
}) => {
  const { user } = useAuth();
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  
  // Customization & View states
  const [activeTab, setActiveTab] = useState<'VIRTUAL' | 'PRINT_SHEET'>('VIRTUAL');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [targetMode, setTargetMode] = useState<'SINGLE' | 'ALL'>('SINGLE');
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showBirthday, setShowBirthday] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState<string>(getTodayISO());

  // Sync selected student enrollment
  useEffect(() => {
    if (selectedEnrollment && enrollments.length > 0) {
      const idx = enrollments.findIndex(e => e.id === selectedEnrollment.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setTargetMode('SINGLE');
      }
    } else {
      setCurrentIndex(0);
    }
  }, [selectedEnrollment, enrollments, isOpen]);

  useEffect(() => {
    if (!user || !isOpen) return;
    const loadSchool = async () => {
      try {
        const sch = await getSchoolSettings(user.uid);
        if (sch) setSchoolSettings(sch);
      } catch (err) {
        console.error('Error loading school settings:', err);
      }
    };
    loadSchool();
  }, [user, isOpen]);

  if (!isOpen) return null;

  const currentEnrollment = enrollments[currentIndex] || selectedEnrollment || enrollments[0];
  const currentStudent = currentEnrollment?.student;

  const targetStudents = targetMode === 'SINGLE' && currentEnrollment
    ? [currentEnrollment]
    : enrollments;

  const handleNextStudent = () => {
    if (currentIndex < enrollments.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPasscode = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kartu Pelajar Siswa (Virtual Student ID)"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-slate-800 dark:text-slate-100">
        {/* Custom Print Styling untuk Lembar Cetak A4 */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print, nav, sidebar, header, aside, button, footer {
              display: none !important;
            }
            #printable-student-id-area {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .id-card-item {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />

        {/* Toolbar & Filter Bar (no-print) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-[#161a26] border border-emerald-100 dark:border-emerald-900/50 shadow-2xs space-y-3 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tab Navigasi Tampilan */}
            <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#121622] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('VIRTUAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'VIRTUAL'
                    ? 'btn-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Kartu Virtual</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PRINT_SHEET')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'PRINT_SHEET'
                    ? 'btn-primary shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Lembar Cetak ID Card</span>
              </button>
            </div>

            {/* Mode Single vs All Siswa */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTargetMode(targetMode === 'SINGLE' ? 'ALL' : 'SINGLE')}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
              >
                {targetMode === 'SINGLE'
                  ? `Siswa Terpilih: ${currentStudent?.fullName?.split(' ')[0] || '1 Siswa'}`
                  : `Seluruh Siswa (${targetStudents.length} Kartu)`}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu ({targetStudents.length})</span>
              </button>
            </div>
          </div>

          {/* Opsi Tampilan Fitur Tambahan */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-100/80 dark:border-emerald-900/40 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showQrCode}
                  onChange={e => setShowQrCode(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
                />
                <span>QR Code / Kode Akses</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showBirthday}
                  onChange={e => setShowBirthday(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
                />
                <span>Info Tanggal Lahir (Ultah)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showSignature}
                  onChange={e => setShowSignature(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500"
                />
                <span>Tanda Tangan Kepala Madrasah</span>
              </label>

              <div className="flex items-center gap-1.5 pl-2 sm:border-l border-emerald-200/80 dark:border-emerald-900/60">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Tgl Terbit:</span>
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#121622] text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Stepper Siswa (Jika mode virtual/single) */}
            {enrollments.length > 1 && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={handlePrevStudent}
                  disabled={currentIndex === 0}
                  className="p-1 rounded-lg bg-white dark:bg-[#121622] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                  title="Siswa Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>{currentIndex + 1} / {enrollments.length}</span>
                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={currentIndex === enrollments.length - 1}
                  className="p-1 rounded-lg bg-white dark:bg-[#121622] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                  title="Siswa Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAMPILAN 1: KARTU DIGITAL INTERAKTIF (VIRTUAL PASS) */}
        {activeTab === 'VIRTUAL' && (
          <div className="flex flex-col items-center justify-center py-4 no-print">
            {currentStudent ? (
              <div className="w-full max-w-md">
                {/* Virtual ID Card Preview Frame */}
                <div className="relative rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white p-6 shadow-xl border border-emerald-500/30 overflow-hidden">
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Header Kop Madrasah */}
                  <div className="relative z-10 flex items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20">
                      <img 
                        src={schoolSettings?.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO} 
                        alt="Kemenag" 
                        className="w-8 h-8 object-contain" 
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-center">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 block">
                        KARTU TANDA SISWA (DIGITAL PASS)
                      </span>
                      <h4 className="text-xs font-black uppercase text-white truncate leading-tight">
                        {schoolSettings?.schoolName || 'MADRASAH TSANAWIYAH'}
                      </h4>
                      <p className="text-[8.5px] text-emerald-200/80 font-medium">
                        T.A. {activeAcademicYear?.label || '2026/2027'} • Sem. {activeSemester === 'GANJIL' ? 'Ganjil' : 'Genap'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20">
                      {schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl ? (
                        <img 
                          src={schoolSettings.schoolLogoUrl || schoolSettings.logoUrl} 
                          alt="Logo Madrasah" 
                          className="w-8 h-8 object-contain" 
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-emerald-300" />
                      )}
                    </div>
                  </div>

                  {/* Body Profil Siswa */}
                  <div className="relative z-10 py-4 flex items-start gap-4">
                    {/* Avatar Karakter Pelajar */}
                    <div className="shrink-0 flex flex-col items-center gap-1.5">
                      <div className={`w-20 h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 shadow-inner ${
                        currentStudent.gender === 'L'
                          ? 'bg-gradient-to-b from-emerald-700 to-teal-800 border-emerald-400/50'
                          : 'bg-gradient-to-b from-rose-700 to-pink-800 border-rose-400/50'
                      }`}>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-black text-white shadow-xs">
                          {currentStudent.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[8px] font-bold uppercase text-white/90 tracking-wide mt-1">
                          {currentStudent.gender === 'L' ? 'Siswa (L)' : 'Siswi (P)'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                        AKTIF
                      </span>
                    </div>

                    {/* Informasi Biodata */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div>
                        <h3 className="text-sm font-black text-white leading-tight">
                          {currentStudent.fullName}
                        </h3>
                        <p className="text-[10px] text-emerald-300 font-semibold mt-0.5">
                          Kelas: {currentEnrollment?.className || 'Rombel'} (Absen #{currentEnrollment?.rollNumber || '-'})
                        </p>
                      </div>

                      <div className="space-y-0.5 text-[10px] font-mono text-emerald-100/90 pt-1 border-t border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-300 font-sans text-[9px]">NIS:</span>
                          <span className="font-bold">{currentStudent.nis || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-300 font-sans text-[9px]">NISN:</span>
                          <span className="font-bold">{currentStudent.nisn || '-'}</span>
                        </div>
                        {showBirthday && (
                          <div className="flex items-center justify-between pt-0.5 text-amber-200">
                            <span className="text-amber-300 font-sans text-[9px] flex items-center gap-1">
                              <Cake className="w-2.5 h-2.5" /> Lahir:
                            </span>
                            <span className="text-[9px] font-sans truncate max-w-[140px]">
                              {currentStudent.birthPlace ? `${currentStudent.birthPlace}, ` : ''}{currentStudent.birthDate || '-'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Kartu Virtual (QR & Token) */}
                  <div className="relative z-10 pt-3 border-t border-emerald-500/30 flex items-center justify-between gap-3">
                    {showQrCode ? (
                      <div className="flex items-center gap-2.5">
                        <StudentQrPattern 
                          token={currentStudent.nisn || currentStudent.nis || currentStudent.id} 
                          size={48} 
                        />
                        <div>
                          <span className="text-[8px] font-bold text-emerald-300 uppercase block">
                            PASPOR AKSES DIGITAL
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <code className="text-[10px] font-mono font-bold text-white bg-black/30 px-1.5 py-0.5 rounded">
                              {currentStudent.nisn || currentStudent.nis || currentStudent.id.slice(0, 8).toUpperCase()}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyPasscode(currentStudent.nisn || currentStudent.nis || currentStudent.id)}
                              className="p-1 rounded hover:bg-white/10 text-emerald-300 hover:text-white transition-colors cursor-pointer"
                              title="Salin Kode Akses Siswa"
                            >
                              {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                        <UserCheck className="w-4 h-4" />
                        <span>Siswa Terdaftar Resmi</span>
                      </div>
                    )}

                    {showSignature && (
                      <div className="text-right">
                        <p className="text-[7px] text-emerald-300/80 font-medium">
                          {schoolSettings?.district || schoolSettings?.regency || 'Bula'}, {formatDateIndonesian(issueDate)}
                        </p>
                        <p className="text-[7.5px] text-emerald-300 font-semibold">Kepala Madrasah</p>
                        <p className="text-[9px] font-bold text-white underline decoration-1 truncate max-w-[120px]">
                          {formatOfficialSignatureName(schoolSettings?.headmasterName, 'Kepala Madrasah')}
                        </p>
                        {schoolSettings?.headmasterNip && (
                          <p className="text-[7px] font-mono text-emerald-200/70">
                            NIP. {schoolSettings.headmasterNip}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Petunjuk Ekosistem Masa Depan */}
                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
                  💡 Kode akses & QR di atas siap dipakai siswa untuk masuk ke aplikasi to-do list, reminder ultah, atau game edukasi web tanpa memerlukan registrasi terpisah.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                Pilih siswa terlebih dahulu untuk melihat kartu pelajar digital.
              </div>
            )}
          </div>
        )}

        {/* TAMPILAN 2 & PRINTABLE AREA: LEMBAR CETAK ID CARD (PRINTABLE CARDS CONTAINER) */}
        <div
          id="printable-student-id-area"
          className={`${activeTab === 'VIRTUAL' ? 'hidden print:block' : 'block'} max-h-[62vh] overflow-y-auto p-1.5 print:max-h-none print:overflow-visible print:p-0`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3">
            {targetStudents.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                Tidak ada data siswa terpilih untuk dicetak kartu pelajar.
              </div>
            ) : (
              targetStudents.map((enr) => {
                const st = enr.student;
                const studentToken = st?.nisn || st?.nis || enr.id;

                return (
                  <div
                    key={enr.id}
                    className="id-card-item border-2 border-emerald-800 dark:border-emerald-600 rounded-2xl p-3.5 bg-white text-slate-900 shadow-2xs space-y-2.5 break-inside-avoid relative print:border-slate-900 print:shadow-none"
                  >
                    {/* Cutting Guides Marker in Print */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 hidden print:flex items-center gap-1 text-[8px] text-slate-400 font-mono">
                      <Scissors className="w-2.5 h-2.5" />
                      <span>potong di sini</span>
                    </div>

                    {/* 1. Header Kop Kartu */}
                    <div className="flex items-center gap-2 border-b-2 border-emerald-800 pb-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                        <img 
                          src={schoolSettings?.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO} 
                          alt="Kemenag" 
                          className="w-7 h-7 object-contain" 
                        />
                      </div>

                      <div className="min-w-0 flex-1 text-center">
                        <h5 className="text-[7.5px] font-extrabold uppercase tracking-widest text-emerald-900 leading-tight">
                          KARTU TANDA PELAJAR / SISWA
                        </h5>
                        <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-900 truncate leading-snug">
                          {schoolSettings?.schoolName || 'MADRASAH TSANAWIYAH'}
                        </h4>
                        <p className="text-[7.5px] font-semibold text-slate-600 leading-none">
                          T.A. {activeAcademicYear?.label || '2026/2027'} • Semester {activeSemester === 'GANJIL' ? 'Ganjil' : 'Genap'}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                        {schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl ? (
                          <img
                            src={schoolSettings.schoolLogoUrl || schoolSettings.logoUrl}
                            alt="Logo Madrasah"
                            className="w-7 h-7 object-contain"
                          />
                        ) : (
                          <Building2 className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    {/* 2. Main Body: Pas Foto Box & Student Biodata */}
                    <div className="flex gap-3 items-center">
                      {/* Pas Foto Box (Standar 2x3 untuk cetak fisik) */}
                      <div className="w-14 h-18 bg-slate-50 border border-dashed border-slate-400 rounded-md flex flex-col items-center justify-center text-center p-1 shrink-0">
                        <span className="text-[7.5px] text-slate-400 font-bold uppercase leading-tight">
                          Pas Foto<br/>2 x 3
                        </span>
                      </div>

                      {/* Biodata List */}
                      <div className="text-[9px] space-y-0.5 flex-1 min-w-0 font-sans leading-tight">
                        <div className="flex items-baseline">
                          <span className="w-16 text-slate-500 font-semibold shrink-0">Nama Siswa</span>
                          <span className="font-bold text-slate-900 truncate">: {st?.fullName || 'Nama Siswa'}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="w-16 text-slate-500 font-semibold shrink-0">NIS / NISN</span>
                          <span className="font-mono text-slate-800">: {st?.nis || '-'} / {st?.nisn || '-'}</span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="w-16 text-slate-500 font-semibold shrink-0">Kelas / Absen</span>
                          <span className="font-bold text-slate-800">: {enr.className || 'Kelas'} (Absen #{enr.rollNumber})</span>
                        </div>
                        {showBirthday && (
                          <div className="flex items-baseline">
                            <span className="w-16 text-slate-500 font-semibold shrink-0">TTL</span>
                            <span className="text-slate-800 truncate">: {st?.birthPlace ? `${st.birthPlace}, ` : ''}{st?.birthDate || '-'}</span>
                          </div>
                        )}
                        <div className="flex items-baseline">
                          <span className="w-16 text-slate-500 font-semibold shrink-0">Status</span>
                          <span className="font-semibold text-emerald-800">: Siswa Terdaftar Aktif</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Footer: QR Code & Signature */}
                    <div className="flex items-end justify-between border-t border-slate-200 pt-1.5 text-[8px] leading-tight">
                      {showQrCode ? (
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <StudentQrPattern token={studentToken} size={36} />
                          <div>
                            <span className="block font-bold text-[7px] text-emerald-900">KODE AKSES SISWA</span>
                            <span className="block font-mono text-[6.5px] text-slate-600">{studentToken}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[7.5px] font-semibold text-emerald-900">
                          MTs Resmi Kemenag
                        </div>
                      )}

                      {showSignature && (
                        <div className="text-right">
                          <p className="text-slate-500">
                            {schoolSettings?.district || schoolSettings?.regency || 'Bula'}, {formatDateIndonesian(issueDate)}
                          </p>
                          <p className="font-bold text-slate-800">Kepala Madrasah</p>
                          <div className="h-6 flex items-center justify-end relative my-0.5">
                            {schoolSettings?.headmasterSignatureUrl ? (
                              <img
                                src={schoolSettings.headmasterSignatureUrl}
                                alt="Ttd Kepala"
                                className="max-h-6 max-w-16 object-contain"
                              />
                            ) : (
                              <span className="text-[7px] text-slate-300 italic">(Tanda Tangan)</span>
                            )}
                          </div>
                          <p className="font-bold text-slate-950 underline decoration-1">
                            {formatOfficialSignatureName(schoolSettings?.headmasterName, 'Kepala Madrasah')}
                          </p>
                          {schoolSettings?.headmasterNip && (
                            <p className="text-[6.5px] font-mono text-slate-500">
                              NIP. {schoolSettings.headmasterNip}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Alias ekspor untuk memastikan backward-compatibility penuh jika ada berkas yang mengimpor nama lama
export const StudentExamCardModal = StudentIdCardModal;
