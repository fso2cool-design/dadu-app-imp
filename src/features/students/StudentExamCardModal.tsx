import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, Student, SchoolSettings } from '../../types';
import { getSchoolSettings } from '../../services/firestore/settings';
import { formatOfficialSignatureName } from '../../utils/formatOfficialName';
import { Modal } from '../../components/common/Modal';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';
import { 
  Printer, 
  CreditCard, 
  Sparkles, 
  Check, 
  QrCode, 
  ShieldCheck,
  Building2,
  Sliders,
  Scissors
} from 'lucide-react';

interface StudentExamCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollments: Enrollment[];
  selectedEnrollment?: Enrollment | null;
}

export const StudentExamCardModal: React.FC<StudentExamCardModalProps> = ({
  isOpen,
  onClose,
  enrollments,
  selectedEnrollment,
}) => {
  const { user, profile } = useAuth();
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  
  // Customization state
  const [examPreset, setExamPreset] = useState('ASTS');
  const [customExamTitle, setCustomExamTitle] = useState('ASESMEN SUMATIF TENGAH SEMESTER (ASTS)');
  const [targetMode, setTargetMode] = useState<'SINGLE' | 'ALL'>(selectedEnrollment ? 'SINGLE' : 'ALL');
  const [roomPrefix, setRoomPrefix] = useState('Ruang 01');
  const [showRules, setShowRules] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [cardDensity, setCardDensity] = useState<'4_PER_PAGE' | '6_PER_PAGE'>('4_PER_PAGE');

  useEffect(() => {
    if (selectedEnrollment) {
      setTargetMode('SINGLE');
    } else {
      setTargetMode('ALL');
    }
  }, [selectedEnrollment, isOpen]);

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

  const handleExamPresetChange = (val: string) => {
    setExamPreset(val);
    if (val === 'ASTS') {
      setCustomExamTitle('ASESMEN SUMATIF TENGAH SEMESTER (ASTS)');
    } else if (val === 'ASAS') {
      setCustomExamTitle('ASESMEN SUMATIF AKHIR SEMESTER (ASAS)');
    } else if (val === 'PAT') {
      setCustomExamTitle('PENILAIAN AKHIR TAHUN (PAT)');
    } else if (val === 'AM') {
      setCustomExamTitle('ASESMEN MADRASAH (AM / UJIAN AKHIR)');
    } else if (val === 'ABM') {
      setCustomExamTitle('ASESMEN BAKAT MINAT (ABM)');
    } else if (val === 'KARTU_PELAJAR') {
      setCustomExamTitle('KARTU TANDA SISWA MADRASAH');
    }
  };

  const targetStudents = targetMode === 'SINGLE' && selectedEnrollment
    ? [selectedEnrollment]
    : enrollments;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kartu Peserta Asesmen / Ujian Siswa"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-slate-800">
        {/* Custom Print Styling to guarantee clean A4 output without backdrop */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print, nav, sidebar, header, aside, button, footer {
              display: none !important;
            }
            #printable-exam-card-area {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .exam-card-item {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />

        {/* Configuration Toolbar (no-print) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-blue-50/70 border border-indigo-100 shadow-2xs space-y-3 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-indigo-950 uppercase mb-1">
                Jenis Asesmen
              </label>
              <select
                value={examPreset}
                onChange={e => handleExamPresetChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ASTS">Asesmen Sumatif Tengah Semester (ASTS)</option>
                <option value="ASAS">Asesmen Sumatif Akhir Semester (ASAS)</option>
                <option value="PAT">Penilaian Akhir Tahun (PAT)</option>
                <option value="AM">Asesmen Madrasah (AM / Ujian Akhir)</option>
                <option value="ABM">Asesmen Bakat Minat (ABM)</option>
                <option value="KARTU_PELAJAR">Kartu Pelajar / Tanda Siswa</option>
                <option value="CUSTOM">Kustom Teks Sendiri...</option>
              </select>
            </div>

            {examPreset === 'CUSTOM' && (
              <div>
                <label className="block text-[11px] font-bold text-indigo-950 uppercase mb-1">
                  Judul Kustom
                </label>
                <input
                  type="text"
                  value={customExamTitle}
                  onChange={e => setCustomExamTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs"
                  placeholder="e.g. TRY OUT ASESMEN STANDARISASI"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-indigo-950 uppercase mb-1">
                Ruang Ujian Default
              </label>
              <input
                type="text"
                value={roomPrefix}
                onChange={e => setRoomPrefix(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs"
                placeholder="e.g. Ruang 01 / Lab Komputer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-indigo-950 uppercase mb-1">
                Kerapatan Lembar (A4)
              </label>
              <select
                value={cardDensity}
                onChange={e => setCardDensity(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs"
              >
                <option value="4_PER_PAGE">Standar (4 Kartu per Lembar A4)</option>
                <option value="6_PER_PAGE">Kompak (6 Kartu per Lembar A4)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-100">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showRules}
                  onChange={e => setShowRules(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500"
                />
                <span>Tata Tertib Ujian</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
                <input
                  type="checkbox"
                  checked={showSignature}
                  onChange={e => setShowSignature(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500"
                />
                <span>Tanda Tangan & Cap</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTargetMode(targetMode === 'SINGLE' ? 'ALL' : 'SINGLE')}
                disabled={!selectedEnrollment}
                className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {targetMode === 'SINGLE' 
                  ? `Siswa Terpilih: ${selectedEnrollment?.student?.fullName?.split(' ')[0] || '1 Siswa'}` 
                  : `Seluruh Siswa (${targetStudents.length} Kartu)`}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Kartu ({targetStudents.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* PRINTABLE CARDS CONTAINER */}
        <div 
          id="printable-exam-card-area"
          className={`grid gap-4 max-h-[64vh] overflow-y-auto p-1.5 print:max-h-none print:overflow-visible print:p-0 ${
            cardDensity === '6_PER_PAGE' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-3' 
              : 'grid-cols-1 md:grid-cols-2 print:grid-cols-2 print:gap-4'
          }`}
        >
          {targetStudents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Tidak ada data siswa terpilih untuk dicetak kartu ujian.
            </div>
          ) : (
            targetStudents.map((enr, idx) => {
              const st = enr.student;
              const rollNumStr = enr.rollNumber < 10 ? `0${enr.rollNumber}` : `${enr.rollNumber}`;
              const participantNo = `${activeAcademicYear?.startYear?.toString().slice(-2) || '26'}-${enr.className?.replace(/[^a-zA-Z0-9]/g, '') || 'KLS'}-${rollNumStr}`;
              const seatNo = `Meja ${rollNumStr}`;

              return (
                <div 
                  key={enr.id}
                  className="exam-card-item border-2 border-slate-800 rounded-xl p-3 bg-white shadow-2xs space-y-2 break-inside-avoid relative print:border-slate-900 print:shadow-none"
                >
                  {/* Cutting Guides Marker in Print */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 hidden print:flex items-center gap-1 text-[8px] text-slate-400 font-mono">
                    <Scissors className="w-2.5 h-2.5" />
                    <span>potong di sini</span>
                  </div>

                  {/* 1. Header Kop Kartu */}
                  <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-1.5">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={DEFAULT_KEMENAG_LOGO}
                        alt="Kemenag"
                        className="w-7 h-7 object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1 text-center">
                      <h5 className="text-[8px] font-extrabold uppercase tracking-widest text-slate-600 leading-tight">
                        KARTU PESERTA ASESMEN RESMI
                      </h5>
                      <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-900 truncate leading-snug">
                        {schoolSettings?.schoolName || 'MADRASAH TSANAWIYAH NEGERI'}
                      </h4>
                      <p className="text-[8px] font-semibold text-slate-500 leading-none">
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

                  {/* 2. Exam Title Banner */}
                  <div className="text-center py-0.5 px-1 bg-slate-900 text-white rounded text-[8.5px] font-black uppercase tracking-wider">
                    {customExamTitle}
                  </div>

                  {/* 3. Main Info: Photo & Student Bio */}
                  <div className="flex gap-2.5 items-center">
                    {/* Photo Box */}
                    <div className="w-14 h-18 bg-slate-50 border border-dashed border-slate-400 rounded-md flex flex-col items-center justify-center text-center p-1 shrink-0">
                      <span className="text-[7.5px] text-slate-400 font-bold uppercase leading-tight">Pas Foto<br/>2 x 3</span>
                    </div>

                    {/* Biodata List */}
                    <div className="text-[9.5px] space-y-0.5 flex-1 min-w-0 font-sans">
                      <div className="flex items-baseline">
                        <span className="w-18 text-slate-500 font-semibold shrink-0">No. Peserta</span>
                        <span className="font-mono font-black text-slate-950">: {participantNo}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-18 text-slate-500 font-semibold shrink-0">Nama Siswa</span>
                        <span className="font-bold text-slate-900 truncate">: {st?.fullName || 'Nama Siswa'}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-18 text-slate-500 font-semibold shrink-0">NIS / NISN</span>
                        <span className="font-mono text-slate-700">: {st?.nis || '-'} / {st?.nisn || '-'}</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-18 text-slate-500 font-semibold shrink-0">Kelas / Absen</span>
                        <span className="font-bold text-slate-800">: {enr.className || 'Kelas'} (Absen #{enr.rollNumber})</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-18 text-slate-500 font-semibold shrink-0">Ruang & Meja</span>
                        <span className="font-semibold text-indigo-900">: {roomPrefix} • {seatNo}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Optional Exam Rules */}
                  {showRules && (
                    <div className="bg-slate-50 rounded-md p-1.5 border border-slate-200 text-[7.5px] text-slate-600 leading-tight space-y-0.5">
                      <p className="font-bold text-slate-800">Tata Tertib Peserta Asesmen:</p>
                      <p>1. Membawa kartu ini dan hadir 15 menit sebelum asesmen dimulai.</p>
                      <p>2. Menempati meja dan ruang ujian sesuai dengan nomor peserta.</p>
                    </div>
                  )}

                  {/* 5. Footer: QR Code & Headmaster Signature */}
                  {showSignature && (
                    <div className="flex items-end justify-between border-t border-slate-200 pt-1.5 text-[8px] leading-tight">
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-1 text-slate-800 font-mono">
                          <QrCode className="w-5 h-5 text-slate-900" />
                          <div>
                            <span className="block font-bold text-[7px] text-slate-800">VALIDASI ASESMEN</span>
                            <span className="block font-mono text-[6.5px] text-slate-500">{participantNo}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-slate-500">
                          {schoolSettings?.district || schoolSettings?.regency || 'Bula'}, {new Date().getFullYear()}
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
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
