import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { Badge } from '../../components/common/Badge';
import { getMeetings } from '../../services/firestore/meetings';
import { TeachingAssignment, Meeting, SchoolSettings } from '../../types';
import { formatDateWithDay, getTodayISO } from '../../utils/date';
import { getSchoolSettings } from '../../services/firestore/settings';
import { ShareReportModal } from './ShareReportModal';
import * as XLSX from 'xlsx';
import { 
  CalendarCheck2, 
  Search, 
  BookOpen, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  FileSpreadsheet, 
  Clock,
  Sparkles,
  Share2
} from 'lucide-react';

// In-memory module cache for instant SWR journal report rendering
const journalReportCache = new Map<string, Meeting[]>();

export const JournalReportPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    teachingAssignments, 
    selectedAssignment, 
    setSelectedAssignment 
  } = useWorkspace();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    if (!user) return;
    getSchoolSettings(user.uid).then(setSchoolSettings).catch(console.error);
  }, [user]);

  // Initialize selected assignment
  useEffect(() => {
    if (teachingAssignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(teachingAssignments[0]);
    }
  }, [teachingAssignments, selectedAssignment]);

  // Fetch meetings with SWR
  useEffect(() => {
    if (!user || !activeAcademicYear || !selectedAssignment) return;

    const cacheKey = `${user.uid}_${activeAcademicYear.id}_${activeSemester}_${selectedAssignment.id}`;
    const cached = journalReportCache.get(cacheKey);

    if (cached) {
      setMeetings(cached);
      setLoading(false);
    }

    const fetchJournalData = async () => {
      if (!cached) setLoading(true);
      try {
        const mets = await getMeetings(user.uid, { 
          teachingAssignmentId: selectedAssignment.id,
          academicYearId: activeAcademicYear.id,
          semester: activeSemester
        });
        mets.sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0));
        journalReportCache.set(cacheKey, mets);
        setMeetings(mets);
      } catch (err) {
        console.error('Error fetching journal report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJournalData();
  }, [user, activeAcademicYear, activeSemester, selectedAssignment]);

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    const q = searchQuery.toLowerCase();
    return meetings.filter(m => 
      (m.topic || '').toLowerCase().includes(q) ||
      (m.learningObjectives || '').toLowerCase().includes(q) ||
      (m.activities || '').toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q)
    );
  }, [meetings, searchQuery]);

  // Formatted date helper
  const formatDate = (dateStr: string) => formatDateWithDay(dateStr);

  // Export Excel
  const handleExportExcel = () => {
    if (meetings.length === 0) return;

    const sheetData: any[] = [];

    // Title & Metadata
    sheetData.push(['BUKU AGENDA JURNAL GURU MENGAJAR']);
    sheetData.push([`Tahun Ajaran: ${activeAcademicYear?.label || '-'} (${activeSemester})`]);
    sheetData.push([`Kelas: ${selectedAssignment?.className || '-'}`]);
    sheetData.push([`Mata Pelajaran: ${selectedAssignment?.subjectName || '-'}`]);
    sheetData.push([`Total Pertemuan: ${meetings.length} Pertemuan`]);
    sheetData.push([]); // Empty row

    // Table Header
    sheetData.push([
      'No',
      'Pertemuan Ke',
      'Hari & Tanggal',
      'Jam Ke',
      'Pokok Bahasan / Tujuan Pembelajaran',
      'Uraian Kegiatan Pembelajaran',
      'Kehadiran Siswa (H/S/I/A)',
      '% Hadir',
      'Catatan / Refleksi Guru'
    ]);

    // Rows
    filteredMeetings.forEach((m, idx) => {
      const summary = m.attendanceSummary;
      const isActivity = m.meetingType === 'MADRASAH_ACTIVITY';
      const presensiStr = summary 
        ? `H: ${summary.present}, S: ${summary.sick}, I: ${summary.permitted}, D: ${summary.dispensation || 0}, A: ${summary.absent}` 
        : (isActivity ? 'Kegiatan Madrasah' : '-');
      const pctStr = summary ? `${summary.presentPercentage}%` : '-';

      const topicDesc = isActivity 
        ? `[${m.activityCategory || 'Kegiatan Madrasah'}] ${m.topic}`
        : (m.topic || m.learningObjectives || '-');

      sheetData.push([
        idx + 1,
        m.meetingNumber || idx + 1,
        formatDate(m.date),
        m.timeSlot || '-',
        topicDesc,
        m.activities || '-',
        presensiStr,
        pctStr,
        m.notes || '-'
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jurnal Mengajar');

    const fileName = `Jurnal_Mengajar_${selectedAssignment?.subjectName || 'Mapel'}_${selectedAssignment?.className || 'Kelas'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const metaItems = [
    { label: 'Tahun Ajaran', value: `${activeAcademicYear?.label || '-'} (${activeSemester})` },
    { label: 'Kelas / Rombel', value: selectedAssignment?.className || '-' },
    { label: 'Mata Pelajaran', value: selectedAssignment?.subjectName || '-' },
    { label: 'Total Sesi KBM', value: `${meetings.length} Pertemuan` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-indigo-600 dark:text-red-400" />
            Laporan Jurnal Agenda Mengajar
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Dokumen resmi rekapitulasi pelaksanaan pembelajaran (KBM), materi, dan absensi per semester.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            disabled={meetings.length === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Bagikan Tautan Publik</span>
          </button>
        </div>
      </div>

      {/* Control & Filter Bar (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Pilih Mapel & Kelas:</label>
            <select
              value={selectedAssignment?.id || ''}
              onChange={(e) => {
                const asg = teachingAssignments.find(a => a.id === e.target.value);
                if (asg) setSelectedAssignment(asg);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              {teachingAssignments.map(asg => (
                <option key={asg.id} value={asg.id}>
                  {asg.className} — {asg.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari materi atau topik..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Statistical Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Pertemuan Terselenggara</span>
              <span className="text-lg font-black text-indigo-950">{meetings.length} <span className="text-xs font-normal text-indigo-700">Sesi</span></span>
            </div>
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Presensi Lengkap</span>
              <span className="text-lg font-black text-emerald-950">
                {meetings.filter(m => m.attendanceSummary && m.attendanceSummary.total > 0).length} <span className="text-xs font-normal text-emerald-700">Pertemuan</span>
              </span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Rata-rata Kehadiran KBM</span>
              <span className="text-lg font-black text-slate-900">
                {meetings.length > 0
                  ? Math.round(meetings.reduce((a, m) => a + (m.attendanceSummary?.presentPercentage || 0), 0) / meetings.length)
                  : 0}%
              </span>
            </div>
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Printable Document Section */}
      <PrintDocumentLayout
        title="BUKU JURNAL AGENDA MENGAJAR GURU"
        metaItems={metaItems}
        onExportExcel={handleExportExcel}
        excelExportDisabled={meetings.length === 0}
        signatureType="TEACHER_AND_HEADMASTER"
        customTeacherRole="Guru Mata Pelajaran"
      >
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Memuat daftar jurnal agenda mengajar...
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
            Belum ada catatan pertemuan untuk kelas dan mata pelajaran ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                  <th className="border border-slate-900 px-2 py-2 w-10">Ke-</th>
                  <th className="border border-slate-900 px-2.5 py-2 w-32">Hari / Tanggal</th>
                  <th className="border border-slate-900 px-2 py-2 w-16">Jam Ke</th>
                  <th className="border border-slate-900 px-3 py-2 text-left w-48">Materi & Tujuan Pembelajaran</th>
                  <th className="border border-slate-900 px-3 py-2 text-left">Uraian Kegiatan Pembelajaran</th>
                  <th className="border border-slate-900 px-2 py-2 w-28">Presensi Siswa</th>
                  <th className="border border-slate-900 px-3 py-2 text-left w-36">Catatan & Refleksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-300">
                {filteredMeetings.map((m, idx) => {
                  const summary = m.attendanceSummary;
                  return (
                    <tr 
                      key={m.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="border border-slate-900 px-2 py-2 text-center font-mono font-bold">
                        {m.meetingNumber || idx + 1}
                      </td>
                      <td className="border border-slate-900 px-2.5 py-2 text-center text-[11px]">
                        <div className="font-semibold text-slate-900">{formatDate(m.date)}</div>
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center font-mono text-[11px]">
                        {m.timeSlot || '-'}
                      </td>
                      <td className="border border-slate-900 px-3 py-2 text-slate-900">
                        {m.meetingType === 'MADRASAH_ACTIVITY' ? (
                          <div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mr-1.5 align-middle">
                              {m.activityCategory || 'KEGIATAN MADRASAH'}
                            </span>
                            <span className="font-bold align-middle">{m.topic || 'Agenda Madrasah'}</span>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold">{m.topic || 'Pertemuan KBM'}</div>
                            {m.learningObjectives && (
                              <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">
                                TP: {m.learningObjectives}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="border border-slate-900 px-3 py-2 text-slate-800 text-[11px] leading-relaxed">
                        {m.activities || '-'}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center font-mono text-[11px]">
                        {summary ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900">
                              <span className="text-emerald-700">H:{summary.present}</span> | <span className="text-amber-700">S:{summary.sick}</span> | <span className="text-blue-700">I:{summary.permitted}</span>{summary.dispensation ? <> | <span className="text-indigo-700">D:{summary.dispensation}</span></> : null} | <span className="text-rose-700">A:{summary.absent}</span>
                            </div>
                            <div className="text-[9px] text-slate-500">
                              ({summary.presentPercentage}% hadir)
                            </div>
                          </div>
                        ) : m.meetingType === 'MADRASAH_ACTIVITY' ? (
                          <span className="text-amber-700 font-medium text-[10px]">Agenda Sah</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum diisi</span>
                        )}
                      </td>
                      <td className="border border-slate-900 px-3 py-2 text-slate-700 text-[11px] italic">
                        {m.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PrintDocumentLayout>

      {/* Public Share via Link Modal */}
      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        reportType="JOURNAL"
        defaultTitle="BUKU JURNAL AGENDA MENGAJAR GURU"
        payload={{
          reportType: 'JOURNAL',
          title: 'BUKU JURNAL AGENDA MENGAJAR GURU',
          schoolName: schoolSettings?.schoolName || 'Madrasah Aliyah / Tsanawiyah',
          schoolLevel: schoolSettings?.schoolLevel || 'MA',
          kemenagDistrict: schoolSettings?.district || schoolSettings?.regency || 'Kementerian Agama',
          academicYearLabel: activeAcademicYear?.label || '2026/2027',
          semester: activeSemester,
          className: selectedAssignment?.className || 'Kelas',
          subjectName: selectedAssignment?.subjectName || '-',
          teacherName: schoolSettings?.teacherName || user?.displayName || 'Guru Mata Pelajaran',
          teacherNip: schoolSettings?.teacherNip || '-',
          headmasterName: schoolSettings?.headmasterName || 'H. Ahmad Fauzi, M.Pd.I',
          headmasterNip: schoolSettings?.headmasterNip || '19780512 200501 1 003',
          generatedDate: getTodayISO(),
          journalData: {
            meetings: meetings.map((m, idx) => ({
              meetingNumber: m.meetingNumber || idx + 1,
              date: m.date,
              topic: m.topic || 'Kegiatan Pembelajaran',
              learningObjectives: m.learningObjectives,
              activities: m.activities,
              method: m.method,
              status: m.status,
              attendancePresent: m.attendanceSummary?.present,
              attendanceAbsent: m.attendanceSummary?.absent,
              notes: m.notes
            }))
          }
        }}
      />
    </div>
  );
};
