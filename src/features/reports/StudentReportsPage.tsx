import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Enrollment, 
  Subject, 
  AssessmentItem, 
  Score, 
  DailyAttendanceRecord, 
  StudentNote, 
  SchoolSettings, 
  DocumentSettings 
} from '../../types';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { getSubjects } from '../../services/firestore/subjects';
import { getAssessmentItems, getScoresByAssessmentItemIds } from '../../services/firestore/assessments';
import { getAllDailyAttendanceRecordsForClass } from '../../services/firestore/homeroomAttendance';
import { getStudentNotesByClass } from '../../services/firestore/studentNotes';
import { getSchoolSettings, getDocumentSettings } from '../../services/firestore/settings';
import { getUserProfile } from '../../services/firestore/users';
import { StudentRaporSheet, StudentRaporData } from './StudentRaporSheet';
import { DEFAULT_KKM } from '../../constants/grading';
import { 
  GraduationCap, 
  Printer, 
  MessageCircle, 
  Check, 
  Share2, 
  Building2, 
  Trophy, 
  Users, 
  Search, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface StudentReportsPageProps {
  onNavigate?: (route: string, state?: any) => void;
}

export const StudentReportsPage: React.FC<StudentReportsPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const { 
    activeAcademicYear, 
    activeSemester, 
    classes, 
    selectedClassId, 
    setSelectedClassId,
    teachingAssignments 
  } = useWorkspace();

  const [currentClassId, setCurrentClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL'); // 'ALL' or studentId
  const [reportType, setReportType] = useState<'RAPOR_SEMESTER' | 'RAPOR_SISIPAN_STS'>('RAPOR_SEMESTER');
  const [showRank, setShowRank] = useState<boolean>(true);
  const [showKop, setShowKop] = useState<boolean>(true);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [copiedWA, setCopiedWA] = useState<boolean>(false);

  // Data states
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendanceRecord[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [docSettings, setDocSettings] = useState<DocumentSettings | null>(null);
  const [homeroomTeacher, setHomeroomTeacher] = useState<{ name: string; nip: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync selected class
  useEffect(() => {
    if (selectedClassId && selectedClassId !== 'NONE') {
      setCurrentClassId(selectedClassId);
    } else if (classes.length > 0 && !currentClassId) {
      setCurrentClassId(classes[0].id);
    }
  }, [selectedClassId, classes, currentClassId]);

  // Load Settings
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const [sch, docS] = await Promise.all([
          getSchoolSettings(user.uid),
          getDocumentSettings(user.uid),
        ]);
        if (sch) setSchoolSettings(sch);
        if (docS) setDocSettings(docS);
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, [user]);

  // Load Class Data
  const loadClassData = async () => {
    if (!user || !activeAcademicYear || !currentClassId) return;
    setLoading(true);
    try {
      // 1. Subjects
      const subs = await getSubjects(user.uid);
      subs.sort((a, b) => a.name.localeCompare(b.name));
      setSubjectsList(subs);

      // 2. Enrollments
      const enrs = await getEnrollmentsByClass(user.uid, activeAcademicYear.id, currentClassId);
      enrs.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
      setEnrollments(enrs);

      // 3. Assessment Items
      const items = await getAssessmentItems(user.uid, {
        academicYearId: activeAcademicYear.id,
        classId: currentClassId,
        semester: activeSemester,
      });
      setAssessmentItems(items);

      // 4. Scores
      if (items.length > 0) {
        const scs = await getScoresByAssessmentItemIds(user.uid, items.map(it => it.id));
        setScores(scs);
      } else {
        setScores([]);
      }

      // 5. Daily Attendance
      const attRecs = await getAllDailyAttendanceRecordsForClass(user.uid, currentClassId);
      setAttendanceRecords(attRecs);

      // 6. Student Notes
      const notes = await getStudentNotesByClass(user.uid, activeAcademicYear.id, currentClassId);
      setStudentNotes(notes);

      // 7. Homeroom Teacher
      const currentClassObj = classes.find(c => c.id === currentClassId);
      if (currentClassObj?.classTeacherId) {
        if (currentClassObj.classTeacherId === user.uid && profile) {
          setHomeroomTeacher({
            name: profile.displayName || 'Wali Kelas',
            nip: profile.nip || '-',
          });
        } else {
          const tProfile = await getUserProfile(currentClassObj.classTeacherId);
          if (tProfile) {
            setHomeroomTeacher({
              name: tProfile.displayName || 'Wali Kelas',
              nip: tProfile.nip || '-',
            });
          }
        }
      } else if (profile) {
        setHomeroomTeacher({
          name: profile.displayName || 'Wali Kelas',
          nip: profile.nip || '-',
        });
      }
    } catch (err) {
      console.error('Error loading class report data:', err);
      toastError('Gagal memuat data rapor kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassData();
  }, [user, activeAcademicYear, activeSemester, currentClassId]);

  const currentClassObj = useMemo(() => {
    return classes.find(c => c.id === currentClassId) || null;
  }, [classes, currentClassId]);

  // Class relevant subjects
  const classSubjects = useMemo(() => {
    const classAssignments = teachingAssignments.filter(a => a.classId === currentClassId);
    const assignedSubjectIds = new Set(classAssignments.map(a => a.subjectId));
    const assessedSubjectIds = new Set(assessmentItems.map(a => a.subjectId));

    return subjectsList.filter(s => 
      assignedSubjectIds.has(s.id) || assessedSubjectIds.has(s.id) || subjectsList.length <= 12
    );
  }, [subjectsList, teachingAssignments, currentClassId, assessmentItems]);

  // Compute Rapor Data for all students in class
  const allStudentsRaporData = useMemo<StudentRaporData[]>(() => {
    if (enrollments.length === 0) return [];

    const list: StudentRaporData[] = enrollments.map(enr => {
      // Calculate scores for each subject
      const subjectScores = classSubjects.map(sub => {
        const subItems = assessmentItems.filter(
          it => it.subjectId === sub.id && it.isIncludedInFinalScore !== false
        );

        if (subItems.length === 0) {
          return {
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            score: null,
            kkm: DEFAULT_KKM,
          };
        }

        const totalWeight = subItems.reduce((acc, it) => acc + (Number(it.weight) || 1), 0);
        let weightedSum = 0;
        let validCount = 0;

        subItems.forEach(item => {
          const sc = scores.find(s => s.studentId === enr.studentId && s.assessmentItemId === item.id);
          if (sc && typeof sc.score === 'number') {
            const weight = Number(item.weight) || 1;
            weightedSum += sc.score * weight;
            validCount++;
          }
        });

        const finalScore = validCount > 0 && totalWeight > 0 
          ? Math.round((weightedSum / totalWeight) * 10) / 10 
          : null;

        return {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          score: finalScore,
          kkm: DEFAULT_KKM,
        };
      });

      const validSubjectScores = subjectScores.filter(s => s.score !== null);
      const totalScore = validSubjectScores.reduce((acc, s) => acc + (s.score || 0), 0);
      const averageScore = validSubjectScores.length > 0 
        ? Math.round((totalScore / validSubjectScores.length) * 10) / 10 
        : 0;

      // Attendance
      const studentDailyRecs = attendanceRecords.filter(r => r.studentId === enr.studentId);
      let hadirCount = 0;
      let sakitCount = 0;
      let izinCount = 0;
      let alpaCount = 0;
      let dispCount = 0;

      studentDailyRecs.forEach(r => {
        const st = r.status as string;
        if (st === 'PRESENT' || st === 'H') hadirCount++;
        else if (st === 'SICK' || st === 'S') sakitCount++;
        else if (st === 'PERMITTED' || st === 'I') izinCount++;
        else if (st === 'ABSENT' || st === 'A') alpaCount++;
        else if (st === 'DISPENSATION' || st === 'D') dispCount++;
      });

      const totalDays = hadirCount + sakitCount + izinCount + alpaCount + dispCount;
      const attendanceRate = totalDays > 0 
        ? Math.round(((hadirCount + dispCount) / totalDays) * 100) 
        : 100;

      // Notes
      const notes = studentNotes.filter(n => n.studentId === enr.studentId);

      return {
        enrollment: enr,
        subjectScores,
        totalScore: Math.round(totalScore * 10) / 10,
        averageScore,
        attendanceStats: {
          hadir: hadirCount,
          sakit: sakitCount,
          izin: izinCount,
          alpa: alpaCount,
          dispensasi: dispCount,
          attendanceRate,
        },
        notes,
      };
    });

    // Compute active student rankings
    const activeStudents = list.filter(item => item.enrollment.status === 'ACTIVE');
    const sorted = [...activeStudents].sort((a, b) => b.averageScore - a.averageScore || b.totalScore - a.totalScore);
    
    sorted.forEach((item, idx) => {
      item.rank = idx + 1;
      item.totalStudents = activeStudents.length;
    });

    return list;
  }, [enrollments, classSubjects, assessmentItems, scores, attendanceRecords, studentNotes]);

  // Selected student's data
  const currentStudentRaporData = useMemo(() => {
    if (selectedStudentId === 'ALL') return null;
    return allStudentsRaporData.find(d => d.enrollment.studentId === selectedStudentId) || null;
  }, [allStudentsRaporData, selectedStudentId]);

  // Generate WhatsApp Message for current student
  const generateWAMessage = (data: StudentRaporData) => {
    const student = data.enrollment.student;
    const studentName = student?.fullName || 'Siswa';
    const className = currentClassObj?.name || 'Kelas';

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
Tahun Ajaran: ${activeAcademicYear?.label || ''} — Semester: ${activeSemester === 'GANJIL' ? 'Ganjil' : 'Genap'}

📋 *CAPAIAN NILAI MATA PELAJARAN*:
${subjectListText || '- Belum ada rekap nilai'}

📊 *RATA-RATA NILAI*: *${data.averageScore > 0 ? data.averageScore : '-'}*
${showRank && data.rank ? `🏆 *PERINGKAT KELAS*: Ke-${data.rank} dari ${data.totalStudents || '-'} Siswa\n` : ''}
📅 *REKAP KEHADIRAN*:
- Hadir: ${data.attendanceStats.hadir} hari
- Sakit: ${data.attendanceStats.sakit} hari
- Izin: ${data.attendanceStats.izin} hari
- Tanpa Keterangan: ${data.attendanceStats.alpa} hari
- Persentase Kehadiran: *${data.attendanceStats.attendanceRate}%*

📝 *CATATAN WALI KELAS*:
${data.notes.length > 0 ? data.notes.slice(0, 2).map(n => `- ${n.note || (n as any).content}`).join('\n') : '- Ananda menunjukkan perkembangan dan kepribadian yang baik selama proses pembelajaran.'}

Demikian laporan ini kami sampaikan. Terima kasih atas kerja sama dan bimbingan Bapak/Ibu di rumah.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.

_Wali Kelas: ${homeroomTeacher?.name || schoolSettings?.teacherName || 'Wali Kelas'}_
_${schoolSettings?.schoolName || 'Madrasah Tsanawiyah'}_`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    toastSuccess('Teks laporan WhatsApp berhasil disalin!');
    setTimeout(() => setCopiedWA(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-orange-600 dark:text-cyan-400" />
            Cetak Rapor & Lembar Hasil Belajar Siswa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Format resmi Laporan Capaian Hasil Belajar Siswa (Rapor Semester & Rapor Sisipan STS) lengkap dengan Kop Dinas 4-Tingkat dan tanda tangan digital.
          </p>
        </div>
      </div>

      {/* Control & Selection Bar (Hidden on Print) */}
      <div className="no-print bg-white dark:bg-[#141722] border border-slate-200/90 dark:border-[#232838] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Class Select */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Pilih Kelas / Rombel:
            </label>
            <select
              value={currentClassId}
              onChange={(e) => {
                setCurrentClassId(e.target.value);
                setSelectedClassId(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.gradeLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Student Select */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Pilih Peserta Didik:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
            >
              <option value="ALL">📋 Cetak Semua Siswa (Batch Rombel - {enrollments.length} Siswa)</option>
              {enrollments.map(enr => (
                <option key={enr.studentId} value={enr.studentId}>
                  #{enr.rollNumber || '-'} — {enr.student?.fullName || 'Siswa'} {enr.status !== 'ACTIVE' ? `(${enr.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Format Dokumen:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#0c0e15] focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 cursor-pointer"
            >
              <option value="RAPOR_SEMESTER">Rapor Semester Lengkap</option>
              <option value="RAPOR_SISIPAN_STS">Rapor Sisipan / STS</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="text-[11px] font-bold text-transparent block">Aksi Cetak</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{selectedStudentId === 'ALL' ? `Cetak Rombel (${enrollments.length})` : 'Cetak Rapor'}</span>
              </button>

              {selectedStudentId !== 'ALL' && currentStudentRaporData && (
                <button
                  type="button"
                  onClick={() => generateWAMessage(currentStudentRaporData)}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                  title="Salin Rangkuman Teks WhatsApp"
                >
                  {copiedWA ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toggles Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#232838]/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRank(!showRank)}
              className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showRank 
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/50 text-amber-900 dark:text-amber-300' 
                  : 'bg-slate-50 dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-500'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{showRank ? 'Peringkat: Aktif' : 'Peringkat: Sembunyi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowKop(!showKop)}
              className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showKop 
                  ? 'bg-orange-50 dark:bg-cyan-950/40 border-orange-300 dark:border-cyan-500/50 text-orange-800 dark:text-cyan-300' 
                  : 'bg-slate-50 dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-500'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{showKop ? 'Kop Madrasah: Aktif' : 'Kop: Sembunyi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSignatures(!showSignatures)}
              className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showSignatures 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-slate-50 dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{showSignatures ? 'Tanda Tangan: Aktif' : 'Tanda Tangan: Sembunyi'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Wali Kelas: <strong>{homeroomTeacher?.name || schoolSettings?.teacherName || 'Wali Kelas'}</strong>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-3 border-orange-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold">Menghitung akumulasi nilai dan menyusun dokumen rapor...</p>
        </div>
      )}

      {/* Rapor Content Area */}
      {!loading && (
        <>
          {selectedStudentId === 'ALL' ? (
            /* Batch View: All Students in class */
            <div className="space-y-8">
              <div className="no-print p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 rounded-2xl text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    Menampilkan <strong>{allStudentsRaporData.length}</strong> lembar rapor siswa. Saat mencetak, masing-masing lembar otomatis berada di halaman terpisah.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang</span>
                </button>
              </div>

              {allStudentsRaporData.map((sData, idx) => (
                <div 
                  key={sData.enrollment.id} 
                  className={`max-w-4xl mx-auto ${idx < allStudentsRaporData.length - 1 ? 'page-break-after' : ''}`}
                >
                  <StudentRaporSheet
                    data={sData}
                    schoolSettings={schoolSettings}
                    documentSettings={docSettings}
                    academicYearLabel={activeAcademicYear?.label || '2026/2027'}
                    semester={activeSemester}
                    className={currentClassObj?.name || 'Kelas'}
                    homeroomTeacherName={homeroomTeacher?.name}
                    homeroomTeacherNip={homeroomTeacher?.nip}
                    reportType={reportType}
                    showRank={showRank}
                    showKop={showKop}
                    showSignatures={showSignatures}
                  />
                </div>
              ))}
            </div>
          ) : currentStudentRaporData ? (
            /* Single View */
            <div className="max-w-4xl mx-auto">
              <StudentRaporSheet
                data={currentStudentRaporData}
                schoolSettings={schoolSettings}
                documentSettings={docSettings}
                academicYearLabel={activeAcademicYear?.label || '2026/2027'}
                semester={activeSemester}
                className={currentClassObj?.name || 'Kelas'}
                homeroomTeacherName={homeroomTeacher?.name}
                homeroomTeacherNip={homeroomTeacher?.nip}
                reportType={reportType}
                showRank={showRank}
                showKop={showKop}
                showSignatures={showSignatures}
              />
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 italic">
              Pilih peserta didik untuk melihat lembar rapor.
            </div>
          )}
        </>
      )}
    </div>
  );
};
