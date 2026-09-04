import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, Student, DailyAttendanceRecord, StudentNote, SchoolSettings, DocumentSettings } from '../../types';
import { formatDateIndonesian, getTodayISO } from '../../utils/date';
import { getSchoolSettings, getDocumentSettings } from '../../services/firestore/settings';
import { Modal } from '../../components/common/Modal';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';
import { 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  Award, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  User,
  HeartHandshake,
  MessageCircle,
  Building2
} from 'lucide-react';

interface StudentProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollment: Enrollment | null;
  attendanceRecords: DailyAttendanceRecord[];
  studentNotes: StudentNote[];
}

export const StudentProgressReportModal: React.FC<StudentProgressReportModalProps> = ({
  isOpen,
  onClose,
  enrollment,
  attendanceRecords,
  studentNotes,
}) => {
  const { user, profile } = useAuth();
  const { activeAcademicYear, activeSemester } = useWorkspace();

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [docSettings, setDocSettings] = useState<DocumentSettings | null>(null);
  const [copiedWA, setCopiedWA] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    const loadSettings = async () => {
      try {
        const [sch, docS] = await Promise.all([
          getSchoolSettings(user.uid),
          getDocumentSettings(user.uid),
        ]);
        if (sch) setSchoolSettings(sch);
        if (docS) setDocSettings(docS);
      } catch (err) {
        console.error('Error loading settings for progress report:', err);
      }
    };
    loadSettings();
  }, [user, isOpen]);

  if (!isOpen || !enrollment) return null;

  const student = enrollment.student;
  const studentName = student?.fullName || 'Nama Siswa';
  const nis = student?.nis || '-';
  const nisn = student?.nisn || '-';
  const className = enrollment.className || 'Kelas';

  // Attendance stats for this student
  let hadirCount = 0;
  let sakitCount = 0;
  let izinCount = 0;
  let alpaCount = 0;
  let dispCount = 0;

  attendanceRecords.forEach(rec => {
    const item = rec.records?.find(r => r.studentId === enrollment.studentId);
    if (item) {
      if (item.status === 'H') hadirCount++;
      else if (item.status === 'S') sakitCount++;
      else if (item.status === 'I') izinCount++;
      else if (item.status === 'A') alpaCount++;
      else if (item.status === 'D') dispCount++;
    }
  });

  const totalDays = hadirCount + sakitCount + izinCount + alpaCount + dispCount;
  const attendanceRate = totalDays > 0 ? Math.round(((hadirCount + dispCount) / totalDays) * 100) : 100;

  // Positive vs disciplinary notes count
  const achievements = studentNotes.filter(n => n.category === 'ACHIEVEMENT');
  const counselings = studentNotes.filter(n => n.category === 'DISCIPLINE' || n.category === 'BEHAVIOR');

  // Generate WhatsApp Message text for Parents
  const generateWAMessage = () => {
    const text = `Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu Wali dari Ananda *${studentName}* (${className})
Berikut kami sampaikan Ringkasan Capaian & Kehadiran Siswa Semester ${activeSemester === 'GANJIL' ? 'Ganjil' : 'Genap'} ${activeAcademicYear?.label || ''}:

📊 *REKAP KEHADIRAN KELAS*:
- Hadir: ${hadirCount} hari
- Sakit: ${sakitCount} hari
- Izin: ${izinCount} hari
- Tanpa Keterangan (Alpa): ${alpaCount} hari
- Persentase Kehadiran: *${attendanceRate}%*

📝 *CATATAN PERKEMBANGAN & KARAKTER*:
${studentNotes.length > 0 ? studentNotes.slice(0, 3).map(n => `- [${n.category}] ${n.content}`).join('\n') : '- Perkembangan belajar dan kepribadian ananda berjalan baik dan tertib.'}

Demikian informasi perkembangan belajar ananda. Terima kasih atas kerja sama dan bimbingan Bapak/Ibu di rumah.
Wassalamu'alaikum Wr. Wb.

_Wali Kelas: ${profile?.displayName || 'Guru Madrasah'}_
_${schoolSettings?.schoolName || 'Madrasah Tsanawiyah'}_`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lembar Capaian & Rapor Sisipan Siswa"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Action Header in Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 no-print">
          <div>
            <span className="text-xs font-bold text-indigo-950 block">Rapor Sisipan / Laporan Perkembangan Siswa</span>
            <p className="text-[11px] text-indigo-700">Dapat langsung dicetak resmi atau dikirimkan salinan teks via WhatsApp ke Wali Murid.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generateWAMessage}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              {copiedWA ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
              <span>{copiedWA ? 'Teks WA Tersalin!' : 'Salin Laporan WA'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Lembar Resmi</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-xs space-y-6 text-slate-800 font-sans print:border-none print:shadow-none print:p-0">
          {/* 4-TIER OFFICIAL KOP SURAT */}
          <div className="pb-3">
            <div className="flex items-center justify-between gap-3 text-center pb-2">
              {/* Left Logo: Kemenag */}
              <div className="w-16 flex items-center justify-center shrink-0">
                <img
                  src={schoolSettings?.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO}
                  alt="Logo Kemenag"
                  className="w-14 h-14 max-w-full max-h-full object-contain"
                />
              </div>

              {/* 4-Tier Official Text */}
              <div className="flex-1 text-center px-1">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 leading-tight">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </h4>
                <h5 className="text-[9px] font-semibold uppercase tracking-wide text-slate-800 leading-tight mt-0.5">
                  {schoolSettings?.kemenagDistrict || (
                    schoolSettings?.regency 
                      ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolSettings.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
                      : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
                  )}
                </h5>
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-950 my-0.5 leading-snug">
                  {schoolSettings?.schoolName || 'MAN 2 SERAM BAGIAN TIMUR'}
                </h2>
                <p className="text-[9px] text-slate-700 leading-snug">
                  {schoolSettings?.address 
                    ? `${schoolSettings.address}${schoolSettings.village ? `, ${schoolSettings.village}` : ''}${schoolSettings.district ? `, Kec. ${schoolSettings.district}` : ''}${schoolSettings.regency ? `, ${schoolSettings.regency}` : ''}${schoolSettings.province ? `, ${schoolSettings.province}` : ''}`
                    : 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula'}
                </p>
              </div>

              {/* Right Logo: Madrasah */}
              <div className="w-16 flex items-center justify-center shrink-0">
                {(schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl) ? (
                  <img
                    src={schoolSettings?.schoolLogoUrl || schoolSettings?.logoUrl}
                    alt="Logo Madrasah"
                    className="w-14 h-14 max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 no-print">
                    <Building2 className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Double Border Rule */}
            <div className="border-b-2 border-slate-950"></div>
            <div className="border-b border-slate-950 mt-0.5"></div>
          </div>

          {/* DOCUMENT TITLE */}
          <div className="text-center space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              LEMBAR KEMAJUAN BELAJAR & RAPOR SISIPAN (STS)
            </h3>
            <p className="text-[11px] text-slate-600">
              Tahun Ajaran {activeAcademicYear?.label || '2026/2027'} — Semester {activeSemester === 'GANJIL' ? 'Ganjil (1)' : 'Genap (2)'}
            </p>
          </div>

          {/* STUDENT BIODATA GRID */}
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <div className="flex">
              <span className="w-28 text-slate-500 font-medium">Nama Siswa</span>
              <span className="font-bold text-slate-900">: {studentName}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-500 font-medium">Kelas / Rombel</span>
              <span className="font-bold text-slate-900">: {className}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-500 font-medium">NIS / NISN</span>
              <span className="font-mono text-slate-800">: {nis} / {nisn}</span>
            </div>
            <div className="flex">
              <span className="w-28 text-slate-500 font-medium">No. Absen / Urut</span>
              <span className="font-bold text-slate-800">: #{enrollment.rollNumber}</span>
            </div>
          </div>

          {/* ATTENDANCE RECAP SECTION */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              A. Rekapitulasi Kehadiran & Kedisiplinan
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-semibold block">Hadir (H)</span>
                <span className="text-sm font-bold text-emerald-950">{hadirCount} hari</span>
              </div>
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] text-blue-800 font-semibold block">Sakit (S)</span>
                <span className="text-sm font-bold text-blue-950">{sakitCount} hari</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-800 font-semibold block">Izin (I)</span>
                <span className="text-sm font-bold text-amber-950">{izinCount} hari</span>
              </div>
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-800 font-semibold block">Alpa (A)</span>
                <span className="text-sm font-bold text-rose-950">{alpaCount} hari</span>
              </div>
              <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                <span className="text-[10px] text-indigo-800 font-semibold block">Persentase</span>
                <span className="text-sm font-bold text-indigo-950">{attendanceRate}%</span>
              </div>
            </div>
          </div>

          {/* STUDENT NOTES & CHARACTER EVALUATION */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              B. Catatan Perkembangan Karakter & Konseling
            </h4>
            {studentNotes.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                Siswa menunjukkan sikap dan kedisiplinan yang baik, tertib dalam mengikuti seluruh kegiatan pembelajaran.
              </p>
            ) : (
              <div className="space-y-2">
                {studentNotes.map(n => (
                  <div key={n.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-800">
                        {n.category === 'ACHIEVEMENT' ? '🏆 Prestasi' :
                         n.category === 'DISCIPLINE' ? '⚠️ Kedisiplinan' :
                         n.category === 'BEHAVIOR' ? '🤝 Sikap / Perilaku' : 'Catatan'}
                      </span>
                      <span className="text-[10px] text-slate-400">{n.date}</span>
                    </div>
                    <p className="text-slate-700">{n.content}</p>
                    {n.actionPlan && (
                      <p className="text-[11px] text-indigo-700 mt-1 font-medium">Tindak lanjut: {n.actionPlan}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SIGNATURES BLOCK */}
          <div className="grid grid-cols-2 gap-6 pt-4 text-xs">
            {/* Left: Parent signature */}
            <div className="text-center space-y-1">
              <p className="text-slate-500 font-medium">Mengetahui,</p>
              <p className="font-bold text-slate-800">Orang Tua / Wali Siswa</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan)</span>
              </div>
              <p className="font-bold text-slate-900 underline decoration-1">
                ( {student?.parentName || '...........................................'} )
              </p>
            </div>

            {/* Right: Homeroom teacher signature */}
            <div className="text-center space-y-1">
              <p className="text-slate-500 font-medium">
                {schoolSettings?.district || schoolSettings?.regency || 'Kota'}, {formatDateIndonesian(getTodayISO())}
              </p>
              <p className="font-bold text-slate-800">Wali Kelas</p>
              <div className="h-16 flex items-center justify-center relative">
                {profile?.signatureUrl && (
                  <img
                    src={profile.signatureUrl}
                    alt="Tanda Tangan Wali Kelas"
                    className="max-h-14 max-w-28 object-contain"
                  />
                )}
              </div>
              <p className="font-bold text-slate-900 underline decoration-1">
                {profile?.displayName || 'Nama Wali Kelas'}
              </p>
              <p className="text-[10px] font-mono text-slate-600">
                NIP. {profile?.nip || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
