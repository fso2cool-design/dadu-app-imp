import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { StudentRaporSheet, StudentRaporData } from './StudentRaporSheet';
import { SchoolSettings, DocumentSettings } from '../../types';
import { Printer, MessageCircle, Check, Share2, Building2, Trophy, Sliders } from 'lucide-react';
import { formatDateIndonesian, getTodayISO } from '../../utils/date';

interface StudentRaporModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StudentRaporData | null;
  schoolSettings: SchoolSettings | null;
  documentSettings?: DocumentSettings | null;
  academicYearLabel: string;
  semester: string;
  className: string;
  homeroomTeacherName?: string;
  homeroomTeacherNip?: string;
}

export const StudentRaporModal: React.FC<StudentRaporModalProps> = ({
  isOpen,
  onClose,
  data,
  schoolSettings,
  documentSettings,
  academicYearLabel,
  semester,
  className,
  homeroomTeacherName,
  homeroomTeacherNip,
}) => {
  const [reportType, setReportType] = useState<'RAPOR_SEMESTER' | 'RAPOR_SISIPAN_STS'>('RAPOR_SEMESTER');
  const [showRank, setShowRank] = useState(true);
  const [showKop, setShowKop] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [copiedWA, setCopiedWA] = useState(false);

  if (!isOpen || !data) return null;

  const student = data.enrollment.student;
  const studentName = student?.fullName || 'Siswa';
  const parentPhone = student?.parentPhone || student?.phone;

  // Generate WhatsApp Message
  const generateWAMessage = () => {
    const subjectListText = data.subjectScores
      .map((s, idx) => {
        const val = s.score !== null ? s.score : '-';
        return `${idx + 1}. ${s.subjectName}: *${val}*`;
      })
      .join('\n');

    const text = `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Yth. Bapak/Ibu Orang Tua / Wali dari Ananda *${studentName}* (${className})

Berikut kami sampaikan Ringkasan Laporan Capaian Belajar Siswa:
📚 *${reportType === 'RAPOR_SISIPAN_STS' ? 'RAPOR SISIPAN (STS)' : 'RAPOR HASIL BELAJAR SEMESTER'}*
Tahun Ajaran: ${academicYearLabel} — Semester: ${semester === 'GANJIL' ? 'Ganjil' : 'Genap'}

📋 *CAPAIAN NILAI MATA PELAJARAN*:
${subjectListText || '- Belum ada rekap nilai'}

📊 *RATA-RATA NILAI*: *${data.averageScore > 0 ? data.averageScore : '-'}*
${showRank && data.rank ? `🏆 *PERINGKAT KELAS*: Ke-${data.rank} dari ${data.totalStudents || '-'} Siswa\n` : ''}
📅 *REKAP KEHADIRAN*:
- Sakit: ${data.attendanceStats.sakit} hari
- Izin: ${data.attendanceStats.izin} hari
- Tanpa Keterangan: ${data.attendanceStats.alpa} hari
- Persentase Kehadiran: *${data.attendanceStats.attendanceRate}%*

📝 *CATATAN WALI KELAS*:
${data.notes.length > 0 ? data.notes.slice(0, 2).map(n => `- ${n.note || n.content || ''}`).join('\n') : '- Ananda menunjukkan perkembangan dan kepribadian yang baik selama proses pembelajaran.'}

Demikian laporan ini kami sampaikan. Terima kasih atas bimbingan dan kerja sama Bapak/Ibu di rumah.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

_Wali Kelas: ${homeroomTeacherName || schoolSettings?.teacherName || 'Wali Kelas'}_
_${schoolSettings?.schoolName || 'Madrasah Tsanawiyah'}_`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    if (!parentPhone) return;
    const cleanPhone = parentPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    
    // Copy text first
    generateWAMessage();
    
    window.open(`https://wa.me/${phoneWithCountry}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lembar Rapor Hasil Belajar — ${studentName}`}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Top Control Toolbar (Hidden on Print) */}
        <div className="no-print bg-slate-50 dark:bg-[#141722] p-3.5 rounded-2xl border border-slate-200 dark:border-[#232838] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Report Type Selector */}
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0c0e15] focus:outline-hidden cursor-pointer"
            >
              <option value="RAPOR_SEMESTER">Rapor Semester Lengkap</option>
              <option value="RAPOR_SISIPAN_STS">Rapor Sisipan / STS</option>
            </select>

            {/* Toggle Ranking */}
            <button
              type="button"
              onClick={() => setShowRank(!showRank)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showRank 
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300' 
                  : 'bg-white dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{showRank ? 'Peringkat: Tampil' : 'Peringkat: Sembunyi'}</span>
            </button>

            {/* Toggle Kop */}
            <button
              type="button"
              onClick={() => setShowKop(!showKop)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showKop 
                  ? 'bg-orange-50 dark:bg-cyan-950/50 border-orange-200 dark:border-cyan-500/40 text-orange-700 dark:text-cyan-300' 
                  : 'bg-white dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{showKop ? 'Kop: Aktif' : 'Kop: Nonaktif'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp Text Copy */}
            <button
              type="button"
              onClick={generateWAMessage}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Salin ringkasan rapor dalam format teks WhatsApp"
            >
              {copiedWA ? <Check className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
              <span>{copiedWA ? 'Tersalin ke Clipboard!' : 'Salin Pesan WA'}</span>
            </button>

            {/* Direct WhatsApp Chat if parentPhone exists */}
            {parentPhone && (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title={`Kirim WA ke Orang Tua (${parentPhone})`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rapor</span>
            </button>
          </div>
        </div>

        {/* The Printable Sheet Component */}
        <div className="overflow-y-auto max-h-[75vh] [scrollbar-width:thin]">
          <StudentRaporSheet
            data={data}
            schoolSettings={schoolSettings}
            documentSettings={documentSettings}
            academicYearLabel={academicYearLabel}
            semester={semester}
            className={className}
            homeroomTeacherName={homeroomTeacherName}
            homeroomTeacherNip={homeroomTeacherNip}
            reportType={reportType}
            showRank={showRank}
            showKop={showKop}
            showSignatures={showSignatures}
          />
        </div>
      </div>
    </Modal>
  );
};
