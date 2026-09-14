import React, { useState, useEffect } from 'react';
import { 
  getSharedReportByToken, 
  incrementReportViewCount 
} from '../../services/firestore/sharedReports';
import { SharedReport } from '../../types';
import { 
  Share2, 
  Lock, 
  Printer, 
  FileSpreadsheet, 
  Clock, 
  Eye, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Award,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  BookOpen,
  BarChart3,
  Table
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';

interface PublicReportViewerPageProps {
  token: string;
}

export const PublicReportViewerPage: React.FC<PublicReportViewerPageProps> = ({ token }) => {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Passcode verification state
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeUnlocked, setPasscodeUnlocked] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      try {
        setLoading(true);
        setError(null);
        const rep = await getSharedReportByToken(token);
        if (!isMounted) return;

        if (!rep) {
          setError('Tautan laporan tidak valid, telah dicabut oleh pemilik, atau masa aktifnya telah berakhir.');
          setLoading(false);
          return;
        }

        setReport(rep);
        // If no passcode required, unlock automatically
        if (!rep.passcode) {
          setPasscodeUnlocked(true);
          incrementReportViewCount(token);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error loading public report:', err);
        setError('Terjadi kendala saat memuat laporan. Silakan periksa koneksi internet Anda.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReport();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    if (enteredPasscode.trim() === report.passcode?.trim()) {
      setPasscodeUnlocked(true);
      setPasscodeError(false);
      incrementReportViewCount(token);
    } else {
      setPasscodeError(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (!report) return;
    const { payload, reportType } = report;

    const workbook = XLSX.utils.book_new();
    const sheetData: any[] = [];

    // Official Title & Metadata
    sheetData.push([payload.title.toUpperCase()]);
    sheetData.push([payload.schoolName]);
    sheetData.push([`Tahun Ajaran: ${payload.academicYearLabel} (Semester ${payload.semester})`]);
    sheetData.push([`Kelas: ${payload.className}${payload.subjectName ? ` | Mapel: ${payload.subjectName}` : ''}`]);
    sheetData.push([`Guru / Pengampu: ${payload.teacherName}`]);
    sheetData.push([`Tanggal Diterbitkan: ${payload.generatedDate}`]);
    sheetData.push([]); // Empty spacer

    if (reportType === 'ATTENDANCE' && payload.attendanceData) {
      sheetData.push(['No', 'No Absen', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'H', 'S', 'I', 'A', 'D', 'Total Sesi', '% Kehadiran', 'Status']);
      payload.attendanceData.summaries.forEach((s, idx) => {
        sheetData.push([
          idx + 1,
          s.rollNumber || '-',
          s.nis || '-',
          s.nisn || '-',
          s.name,
          s.gender,
          s.presentCount,
          s.sickCount,
          s.permittedCount,
          s.absentCount,
          s.dispensationCount,
          s.totalMeetings,
          `${s.presentPercentage}%`,
          s.presentPercentage >= 75 ? 'Tuntas' : 'Perlu Perhatian'
        ]);
      });
    } else if (reportType === 'JOURNAL' && payload.journalData) {
      sheetData.push(['Pertemuan Ke-', 'Hari / Tanggal', 'Materi / Pokok Bahasan', 'Tujuan Pembelajaran', 'Metode & Aktivitas', 'Status KBM', 'Catatan Guru']);
      payload.journalData.meetings.forEach((m) => {
        sheetData.push([
          `Pertemuan ${m.meetingNumber}`,
          m.date,
          m.topic,
          m.learningObjectives || '-',
          `${m.method || '-'} / ${m.activities || '-'}`,
          m.status,
          m.notes || '-'
        ]);
      });
    } else if (reportType === 'LEGGER' && payload.leggerData) {
      const headerRow = ['No', 'No Absen', 'NIS', 'Nama Siswa', 'L/P'];
      payload.leggerData.subjects.forEach(sb => headerRow.push(sb.code || sb.name));
      headerRow.push('Total Nilai', 'Rata-rata', 'Peringkat');
      sheetData.push(headerRow);

      payload.leggerData.rows.forEach((r, idx) => {
        const rowData: any[] = [
          idx + 1,
          r.rollNumber || '-',
          r.nis || '-',
          r.name,
          r.gender
        ];
        payload.leggerData!.subjects.forEach(sb => {
          const sc = r.subjectScores[sb.id];
          rowData.push(sc !== null && sc !== undefined ? sc : '-');
        });
        rowData.push(r.totalScore, r.averageScore, r.rank);
        sheetData.push(rowData);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');
    XLSX.writeFile(workbook, `${payload.title.replace(/\s+/g, '_')}_${payload.className}.xlsx`);
  };

  // State 1: Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 animate-pulse mb-3">
          <Share2 className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-700">Menghubungkan ke Laporan Resmi...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Memvalidasi token akses publik</p>
      </div>
    );
  }

  // State 2: Error or Not Found / Expired
  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-md space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center text-2xl font-bold">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Tautan Laporan Tidak Tersedia</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'Laporan tidak ditemukan. Pastikan alamat tautan lengkap dan belum melewati batas waktu kadaluarsa.'}
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Menuju Halaman Masuk
            </a>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Passcode Required
  if (!passcodeUnlocked) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-slate-200/90 rounded-3xl p-6 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Laporan Dilindungi Kode Akses</h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Pembuat laporan ({report.userName}) telah melindungi dokumen ini dengan kode sandi / passcode.
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-3 pt-2">
            <div>
              <input
                type="password"
                maxLength={8}
                placeholder="Masukkan kode akses..."
                value={enteredPasscode}
                onChange={(e) => {
                  setEnteredPasscode(e.target.value);
                  setPasscodeError(false);
                }}
                className={`w-full px-4 py-2.5 text-center text-sm font-bold tracking-widest rounded-xl border ${
                  passcodeError 
                    ? 'border-rose-400 bg-rose-50 text-rose-900' 
                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-orange-500'
                } focus:outline-hidden transition-all`}
                autoFocus
              />
              {passcodeError && (
                <p className="text-[11px] font-medium text-rose-600 mt-1.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Kode akses salah. Silakan coba lagi.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Buka Laporan
            </button>
          </form>

          <p className="text-[10px] text-slate-400">
            Hubungi pengampu terkait jika Anda belum menerima kode sandi.
          </p>
        </div>
      </div>
    );
  }

  // State 4: Unlocked & Viewing Document
  const { payload, reportType } = report;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans pb-16">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {payload.title}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {payload.schoolName} • Diterbitkan oleh: <strong>{payload.teacherName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="printable-document bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm text-slate-900">
          
          {/* Official 4-Tier Kop Surat */}
          <div className="border-b-2 border-double border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="w-18 h-18 flex-shrink-0 flex items-center justify-center">
                <img
                  src={DEFAULT_KEMENAG_LOGO}
                  alt="Logo Kemenag"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <div className="text-center flex-1 space-y-0.5">
                <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-700 uppercase">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </p>
                <p className="text-[10px] sm:text-[11px] font-bold tracking-wide text-slate-800 uppercase">
                  {payload.kemenagDistrict || 'KANTOR KEMENTERIAN AGAMA KABUPATEN'}
                </p>
                <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight uppercase">
                  {payload.schoolName}
                </h1>
                <p className="text-[10px] text-slate-600 leading-snug">
                  Dokumen Elektronik Resmi • Sistem Informasi Penilaian & Administrasi Madrasah
                </p>
              </div>

              <div className="w-18 h-18 flex-shrink-0 hidden sm:flex items-center justify-center">
                <div className="w-14 h-14 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-bold">
                  RESMI
                </div>
              </div>
            </div>
          </div>

          {/* Document Title Header */}
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-950 uppercase tracking-wide">
              {payload.title}
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
              <span>Kelas: <strong>{payload.className}</strong></span>
              <span>•</span>
              <span>Tahun Ajaran: <strong>{payload.academicYearLabel} ({payload.semester})</strong></span>
              {payload.subjectName && (
                <>
                  <span>•</span>
                  <span>Mata Pelajaran: <strong>{payload.subjectName}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Render Specific Data Table */}
          {reportType === 'ATTENDANCE' && payload.attendanceData && (
            <div className="space-y-4">
              {/* Statistics strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 no-print">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Rata-rata Kehadiran</span>
                  <span className="text-sm font-bold text-slate-900">{payload.attendanceData.statistics.avgPercentage}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Kehadiran 100%</span>
                  <span className="text-sm font-bold text-emerald-800">{payload.attendanceData.statistics.perfectCount} Siswa</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-700 uppercase font-semibold block">Perhatian Khusus (&lt;75%)</span>
                  <span className="text-sm font-bold text-amber-800">{payload.attendanceData.statistics.criticalCount} Siswa</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] text-blue-700 uppercase font-semibold block">Total Sesi KBM</span>
                  <span className="text-sm font-bold text-blue-800">{payload.attendanceData.totalMeetingsOrDays} Sesi</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                      <th className="border border-slate-900 px-2 py-2 w-10">No</th>
                      <th className="border border-slate-900 px-2 py-2 w-12">Absen</th>
                      <th className="border border-slate-900 px-2 py-2 w-20">NIS / NISN</th>
                      <th className="border border-slate-900 px-3 py-2 text-left">Nama Siswa</th>
                      <th className="border border-slate-900 px-2 py-2 w-10">L/P</th>
                      <th className="border border-slate-900 px-2 py-2 w-10 bg-emerald-50 text-emerald-900">H</th>
                      <th className="border border-slate-900 px-2 py-2 w-10 bg-amber-50 text-amber-900">S</th>
                      <th className="border border-slate-900 px-2 py-2 w-10 bg-blue-50 text-blue-900">I</th>
                      <th className="border border-slate-900 px-2 py-2 w-10 bg-rose-50 text-rose-900">A</th>
                      <th className="border border-slate-900 px-2 py-2 w-10 bg-purple-50 text-purple-900">D</th>
                      <th className="border border-slate-900 px-2 py-2 w-14">Total</th>
                      <th className="border border-slate-900 px-2 py-2 w-16">% Hadir</th>
                      <th className="border border-slate-900 px-3 py-2 text-left w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.attendanceData.summaries.map((s, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{s.rollNumber || '-'}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">
                          {s.nis || '-'}<br />
                          <span className="text-slate-500">{s.nisn || '-'}</span>
                        </td>
                        <td className="border border-slate-900 px-3 py-1.5 font-medium">{s.name}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center">{s.gender}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-bold text-emerald-700 bg-emerald-50/30">{s.presentCount}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center text-amber-700">{s.sickCount}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center text-blue-700">{s.permittedCount}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-bold text-rose-700">{s.absentCount}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center text-purple-700">{s.dispensationCount}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{s.totalMeetings}</td>
                        <td className="border border-slate-900 px-2 py-1.5 text-center font-bold">
                          <span className={s.presentPercentage < 75 ? 'text-rose-700' : 'text-slate-900'}>
                            {s.presentPercentage}%
                          </span>
                        </td>
                        <td className="border border-slate-900 px-3 py-1.5 text-xs">
                          {s.presentPercentage >= 90 ? 'Sangat Baik' : s.presentPercentage >= 75 ? 'Baik' : 'Perlu Pembinaan'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportType === 'JOURNAL' && payload.journalData && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                    <th className="border border-slate-900 px-2 py-2 w-12">Pertemuan</th>
                    <th className="border border-slate-900 px-3 py-2 w-28 text-left">Hari / Tanggal</th>
                    <th className="border border-slate-900 px-3 py-2 text-left">Materi Pokok Bahasan</th>
                    <th className="border border-slate-900 px-3 py-2 text-left">Tujuan & Aktivitas Pembelajaran</th>
                    <th className="border border-slate-900 px-2 py-2 w-20">Status</th>
                    <th className="border border-slate-900 px-3 py-2 text-left w-32">Catatan Guru</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.journalData.meetings.map((m, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      <td className="border border-slate-900 px-2 py-2 text-center font-bold">#{m.meetingNumber}</td>
                      <td className="border border-slate-900 px-3 py-2 font-medium">{m.date}</td>
                      <td className="border border-slate-900 px-3 py-2 font-semibold text-slate-950">{m.topic}</td>
                      <td className="border border-slate-900 px-3 py-2 text-slate-700">
                        {m.learningObjectives && <div className="mb-1 text-[11px]"><strong>Tujuan:</strong> {m.learningObjectives}</div>}
                        {m.activities && <div className="text-[11px]"><strong>Kegiatan:</strong> {m.activities}</div>}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {m.status}
                        </span>
                      </td>
                      <td className="border border-slate-900 px-3 py-2 text-slate-600 italic text-[11px]">{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportType === 'LEGGER' && payload.leggerData && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                    <th className="border border-slate-900 px-2 py-2 w-8">No</th>
                    <th className="border border-slate-900 px-2 py-2 w-10">Absen</th>
                    <th className="border border-slate-900 px-2 py-2 w-18">NIS</th>
                    <th className="border border-slate-900 px-3 py-2 text-left">Nama Siswa</th>
                    <th className="border border-slate-900 px-2 py-2 w-8">L/P</th>
                    {payload.leggerData.subjects.map(sb => (
                      <th key={sb.id} className="border border-slate-900 px-2 py-2 w-12 text-center">
                        {sb.code || sb.name}
                      </th>
                    ))}
                    <th className="border border-slate-900 px-2 py-2 w-14 font-bold bg-amber-50 text-amber-950">Total</th>
                    <th className="border border-slate-900 px-2 py-2 w-14 font-bold bg-blue-50 text-blue-950">Rata2</th>
                    <th className="border border-slate-900 px-2 py-2 w-12 font-bold bg-emerald-50 text-emerald-950">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.leggerData.rows.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{r.rollNumber || '-'}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[10px]">{r.nis || '-'}</td>
                      <td className="border border-slate-900 px-3 py-1.5 font-medium">{r.name}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center">{r.gender}</td>
                      {payload.leggerData!.subjects.map(sb => {
                        const score = r.subjectScores[sb.id];
                        const isUnderKkm = score !== null && score !== undefined && score < payload.leggerData!.kkm;
                        return (
                          <td 
                            key={sb.id} 
                            className={`border border-slate-900 px-2 py-1.5 text-center font-mono font-medium ${
                              isUnderKkm ? 'text-rose-600 font-bold bg-rose-50/30' : ''
                            }`}
                          >
                            {score !== null && score !== undefined ? score : '-'}
                          </td>
                        );
                      })}
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-bold bg-amber-50/20">{r.totalScore}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-bold bg-blue-50/20">{r.averageScore}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-bold bg-emerald-50/20">{r.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Official Signatures Section */}
          <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala Madrasah</p>
              <div className="h-20 flex items-center justify-center">
                <span className="inline-block px-3 py-1 border border-dashed border-slate-300 rounded text-[10px] text-slate-400">
                  Stempel & Tanda Tangan Resmi
                </span>
              </div>
              <p className="font-bold text-slate-950 underline">{payload.headmasterName || 'Kepala Madrasah'}</p>
              <p className="text-[11px] text-slate-600">NIP. {payload.headmasterNip || '-'}</p>
            </div>

            <div>
              <p className="text-slate-600">Diterbitkan pada {payload.generatedDate}</p>
              <p className="font-bold text-slate-900">Guru Pengampu / Wali Kelas</p>
              <div className="h-20 flex items-center justify-center">
                <span className="inline-block px-3 py-1 border border-dashed border-slate-300 rounded text-[10px] text-slate-400">
                  Tanda Tangan Digital
                </span>
              </div>
              <p className="font-bold text-slate-950 underline">{payload.teacherName}</p>
              <p className="text-[11px] text-slate-600">NIP. {payload.teacherNip || '-'}</p>
            </div>
          </div>

          {/* Bottom Security / Authenticity Watermark */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-400 gap-2">
            <div>
              Token Akses Publik: <span className="font-mono font-semibold text-slate-600">{report.id}</span> • Dilihat: {report.viewCount} kali
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dokumen ini diterbitkan sah secara digital tanpa memerlukan login akun.</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
