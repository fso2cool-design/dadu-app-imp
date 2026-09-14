import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PrintDocumentLayout } from './PrintDocumentLayout';
import { Badge } from '../../components/common/Badge';
import { getAssessmentItems, getScoresByAssessmentItemIds } from '../../services/firestore/assessments';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { TeachingAssignment, AssessmentItem, Score, Enrollment } from '../../types';
import { DEFAULT_KKM, getGradeScale } from '../../constants/grading';
import * as XLSX from 'xlsx';
import { 
  Award, 
  Search, 
  Filter, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  BarChart3,
  Percent,
  Sliders
} from 'lucide-react';

interface StudentGradeRow {
  enrollmentId: string;
  studentId: string;
  rollNumber: number;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  scores: Record<string, number | null>; // assessmentItemId -> score
  finalScore: number;
  predicate: 'A' | 'B' | 'C' | 'D';
  isPassed: boolean;
}

// In-memory module cache for instant SWR grades report rendering
const gradesReportCache = new Map<string, { assessmentItems: AssessmentItem[]; enrollments: Enrollment[]; scores: Score[] }>();

export const GradesReportPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    activeAcademicYear, 
    activeSemester, 
    teachingAssignments, 
    selectedAssignment, 
    setSelectedAssignment 
  } = useWorkspace();

  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Scoring parameters
  const [kkmThreshold, setKkmThreshold] = useState<number>(DEFAULT_KKM);
  const [calcFormula, setCalcFormula] = useState<'WEIGHTED' | 'SIMPLE'>('WEIGHTED');

  // Ensure an assignment is selected
  useEffect(() => {
    if (teachingAssignments.length > 0 && !selectedAssignment) {
      setSelectedAssignment(teachingAssignments[0]);
    }
  }, [teachingAssignments, selectedAssignment]);

  // Fetch Assessment and Score Data with SWR
  useEffect(() => {
    if (!user || !activeAcademicYear || !selectedAssignment) return;

    const cacheKey = `${user.uid}_${activeAcademicYear.id}_${activeSemester}_${selectedAssignment.id}`;
    const cached = gradesReportCache.get(cacheKey);

    if (cached) {
      setAssessmentItems(cached.assessmentItems);
      setEnrollments(cached.enrollments);
      setScores(cached.scores);
      setLoading(false);
    }

    const fetchData = async () => {
      if (!cached) setLoading(true);
      try {
        // 1. Fetch assessment columns
        const items = await getAssessmentItems(user.uid, {
          teachingAssignmentId: selectedAssignment.id,
        });

        // 2. Fetch class enrollments
        const enrs = await getEnrollmentsByClass(
          user.uid,
          activeAcademicYear.id,
          selectedAssignment.classId
        );
        enrs.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));

        // 3. Fetch scores for these assessments
        let scs: Score[] = [];
        if (items.length > 0) {
          const itemIds = items.map(it => it.id);
          scs = await getScoresByAssessmentItemIds(user.uid, itemIds);
        }

        gradesReportCache.set(cacheKey, {
          assessmentItems: items,
          enrollments: enrs,
          scores: scs
        });

        setAssessmentItems(items);
        setEnrollments(enrs);
        setScores(scs);
      } catch (err) {
        console.error('Error fetching grades report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeAcademicYear, activeSemester, selectedAssignment]);

  // Compute Grade Matrix per Student
  const gradeRows = useMemo<StudentGradeRow[]>(() => {
    const includedItems = assessmentItems.filter(it => it.isIncludedInFinalScore !== false);
    const totalWeight = includedItems.reduce((acc, it) => acc + (Number(it.weight) || 1), 0);

    return enrollments.map(enr => {
      const studentScores: Record<string, number | null> = {};
      let weightedSum = 0;
      let scoreCount = 0;
      let simpleSum = 0;

      assessmentItems.forEach(item => {
        const found = scores.find(s => s.studentId === enr.studentId && s.assessmentItemId === item.id);
        const val = found && typeof found.score === 'number' ? found.score : null;
        studentScores[item.id] = val;

        if (item.isIncludedInFinalScore !== false && val !== null) {
          const weight = Number(item.weight) || 1;
          weightedSum += val * weight;
          simpleSum += val;
          scoreCount++;
        }
      });

      let finalScore = 0;
      if (calcFormula === 'WEIGHTED' && totalWeight > 0) {
        finalScore = Math.round((weightedSum / totalWeight) * 10) / 10;
      } else if (scoreCount > 0) {
        finalScore = Math.round((simpleSum / scoreCount) * 10) / 10;
      }

      const scale = getGradeScale(finalScore, kkmThreshold);
      const predicate = scale.predicate;
      const isPassed = finalScore >= kkmThreshold;

      return {
        enrollmentId: enr.id,
        studentId: enr.studentId,
        rollNumber: enr.rollNumber || 0,
        nis: enr.student?.nis || '-',
        nisn: enr.student?.nisn || '-',
        name: enr.student?.fullName || 'Siswa',
        gender: enr.student?.gender || 'L',
        scores: studentScores,
        finalScore,
        predicate,
        isPassed,
      };
    });
  }, [enrollments, assessmentItems, scores, calcFormula, kkmThreshold]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return gradeRows;
    const q = searchQuery.toLowerCase();
    return gradeRows.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.nis.toLowerCase().includes(q) ||
      r.nisn.toLowerCase().includes(q)
    );
  }, [gradeRows, searchQuery]);

  // Statistical Overview
  const stats = useMemo(() => {
    if (gradeRows.length === 0) {
      return { avgScore: 0, highest: 0, lowest: 0, passedCount: 0, remedialCount: 0, passRate: 0 };
    }
    const scoresArr = gradeRows.map(r => r.finalScore);
    const sum = scoresArr.reduce((a, b) => a + b, 0);
    const avgScore = Math.round((sum / scoresArr.length) * 10) / 10;
    const highest = Math.max(...scoresArr);
    const lowest = Math.min(...scoresArr);
    const passedCount = gradeRows.filter(r => r.isPassed).length;
    const remedialCount = gradeRows.length - passedCount;
    const passRate = Math.round((passedCount / gradeRows.length) * 100);

    return { avgScore, highest, lowest, passedCount, remedialCount, passRate };
  }, [gradeRows]);

  // Handle Export Excel
  const handleExportExcel = () => {
    if (gradeRows.length === 0) return;

    const sheetData: any[] = [];

    // Header Metadata
    sheetData.push(['LAPORAN DAFTAR NILAI AKADEMIK SISWA']);
    sheetData.push([`Tahun Ajaran: ${activeAcademicYear?.label || '-'} (${activeSemester})`]);
    sheetData.push([`Kelas: ${selectedAssignment?.className || '-'}`]);
    sheetData.push([`Mata Pelajaran: ${selectedAssignment?.subjectName || '-'}`]);
    sheetData.push([`Kriteria Ketuntasan (KKTP/KKM): ${kkmThreshold}`]);
    sheetData.push([]); // Empty row

    // Table Columns
    const headerRow: any[] = [
      'No',
      'No Absen',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
    ];

    assessmentItems.forEach(item => {
      headerRow.push(`${item.name} (${item.weight}%)`);
    });

    headerRow.push('Nilai Akhir');
    headerRow.push('Predikat');
    headerRow.push('Status Ketuntasan');

    sheetData.push(headerRow);

    // Rows
    filteredRows.forEach((r, idx) => {
      const rowData: any[] = [
        idx + 1,
        r.rollNumber || '-',
        r.nis || '-',
        r.nisn || '-',
        r.name,
        r.gender,
      ];

      assessmentItems.forEach(item => {
        const val = r.scores[item.id];
        rowData.push(val !== null && val !== undefined ? val : '');
      });

      rowData.push(r.finalScore);
      rowData.push(r.predicate);
      rowData.push(r.isPassed ? 'TUNTAS' : 'REMEDIAL');

      sheetData.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Nilai');

    const fileName = `Daftar_Nilai_${selectedAssignment?.subjectName || 'Mapel'}_${selectedAssignment?.className || 'Kelas'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const metaItems = [
    { label: 'Tahun Ajaran', value: `${activeAcademicYear?.label || '-'} (${activeSemester})` },
    { label: 'Kelas / Rombel', value: selectedAssignment?.className || '-' },
    { label: 'Mata Pelajaran', value: selectedAssignment?.subjectName || '-' },
    { label: 'Batas KKTP / KKM', value: `${kkmThreshold}` },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600 dark:text-red-400" />
            Laporan Daftar Nilai Akademik
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Format resmi rekap nilai mata pelajaran per semester, rincian komponen asesmen, dan kalkulasi otomatis.
          </p>
        </div>
      </div>

      {/* Control & Filter Bar (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
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

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Ambang KKTP:</label>
              <input
                type="number"
                min={50}
                max={95}
                value={kkmThreshold}
                onChange={(e) => setKkmThreshold(Number(e.target.value) || 75)}
                className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-xs text-center font-bold text-slate-800 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Formula:</label>
              <select
                value={calcFormula}
                onChange={(e) => setCalcFormula(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50"
              >
                <option value="WEIGHTED">Rata-rata Berbobot (%)</option>
                <option value="SIMPLE">Rata-rata Sederhana</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Statistical Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Rata-rata Kelas</span>
              <span className="text-lg font-black text-indigo-950">{stats.avgScore}</span>
            </div>
            <TrendingUp className="w-6 h-6 text-indigo-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Ketuntasan (≥{kkmThreshold})</span>
              <span className="text-lg font-black text-emerald-950">{stats.passRate}% <span className="text-xs font-normal text-emerald-700">({stats.passedCount} siswa)</span></span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Remedial (&lt;{kkmThreshold})</span>
              <span className="text-lg font-black text-rose-950">{stats.remedialCount} <span className="text-xs font-normal text-rose-700">Siswa</span></span>
            </div>
            <AlertCircle className="w-6 h-6 text-rose-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Tertinggi / Terendah</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                <strong className="text-emerald-700">{stats.highest}</strong> / <strong className="text-rose-700">{stats.lowest}</strong>
              </span>
            </div>
            <BarChart3 className="w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Main Printable Document Section */}
      <PrintDocumentLayout
        title="LAPORAN DAFTAR NILAI HASIL BELAJAR SISWA"
        metaItems={metaItems}
        onExportExcel={handleExportExcel}
        excelExportDisabled={gradeRows.length === 0}
        signatureType="TEACHER_AND_HEADMASTER"
        customTeacherRole="Guru Mata Pelajaran"
      >
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            Memuat kompilasi daftar nilai...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
            Belum ada data siswa atau asesmen untuk mata pelajaran ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-900">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-center">
                  <th className="border border-slate-900 px-2 py-2 w-10" rowSpan={2}>No</th>
                  <th className="border border-slate-900 px-2 py-2 w-12" rowSpan={2}>Absen</th>
                  <th className="border border-slate-900 px-2 py-2 w-20" rowSpan={2}>NIS / NISN</th>
                  <th className="border border-slate-900 px-3 py-2 text-left" rowSpan={2}>Nama Siswa</th>
                  <th className="border border-slate-900 px-2 py-2 w-10" rowSpan={2}>L/P</th>
                  
                  {assessmentItems.length > 0 && (
                    <th className="border border-slate-900 px-2 py-1 bg-slate-200" colSpan={assessmentItems.length}>
                      Komponen Penilaian & Asesmen
                    </th>
                  )}

                  <th className="border border-slate-900 px-2 py-2 w-16 bg-indigo-50" rowSpan={2}>Nilai Akhir</th>
                  <th className="border border-slate-900 px-2 py-2 w-12" rowSpan={2}>Predikat</th>
                  <th className="border border-slate-900 px-3 py-2 text-left w-24" rowSpan={2}>Ketuntasan</th>
                </tr>

                {/* Subheader for assessment columns */}
                {assessmentItems.length > 0 && (
                  <tr className="bg-slate-50 text-[11px] font-semibold text-center">
                    {assessmentItems.map(item => (
                      <th key={item.id} className="border border-slate-900 px-2 py-1 min-w-[70px]">
                        <div className="font-bold truncate max-w-[90px]">{item.name}</div>
                        <div className="text-[9px] text-slate-600 font-mono">({item.weight}%)</div>
                      </th>
                    ))}
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-300">
                {filteredRows.map((r, idx) => {
                  const isUnderKkm = r.finalScore < kkmThreshold;
                  return (
                    <tr 
                      key={r.enrollmentId} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUnderKkm ? 'bg-rose-50/30' : idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold">{r.rollNumber || '-'}</td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono text-[11px]">
                        <div>{r.nis}</div>
                        {r.nisn && r.nisn !== '-' && <div className="text-[10px] text-slate-500">{r.nisn}</div>}
                      </td>
                      <td className="border border-slate-900 px-3 py-1.5 font-semibold text-slate-900">
                        {r.name}
                      </td>
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{r.gender}</td>

                      {/* Scores */}
                      {assessmentItems.map(item => {
                        const val = r.scores[item.id];
                        const valUnder = val !== null && val < kkmThreshold;
                        return (
                          <td 
                            key={item.id} 
                            className={`border border-slate-900 px-2 py-1.5 text-center font-mono ${
                              valUnder ? 'text-rose-700 bg-rose-50 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {val !== null ? val : '-'}
                          </td>
                        );
                      })}

                      {/* Final Score */}
                      <td className={`border border-slate-900 px-2 py-1.5 text-center font-mono font-black ${
                        isUnderKkm ? 'text-rose-800 bg-rose-100/60' : 'text-indigo-950 bg-indigo-50/50'
                      }`}>
                        {r.finalScore}
                      </td>

                      {/* Predicate */}
                      <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold">
                        {r.predicate}
                      </td>

                      {/* Passing Status */}
                      <td className="border border-slate-900 px-3 py-1.5 text-[11px] font-semibold">
                        {r.isPassed ? (
                          <span className="text-emerald-700">TUNTAS</span>
                        ) : (
                          <span className="text-rose-700 font-bold">REMEDIAL</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Summary Row */}
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-center">
                  <td colSpan={5} className="border border-slate-900 px-3 py-2 text-right">
                    RERATA KELAS
                  </td>
                  
                  {assessmentItems.map(item => {
                    const validScores = gradeRows
                      .map(r => r.scores[item.id])
                      .filter((v): v is number => typeof v === 'number');
                    const avg = validScores.length > 0 
                      ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 
                      : '-';
                    return (
                      <td key={item.id} className="border border-slate-900 px-2 py-2 font-mono">
                        {avg}
                      </td>
                    );
                  })}

                  <td className="border border-slate-900 px-2 py-2 font-mono text-indigo-950 bg-indigo-50">
                    {stats.avgScore}
                  </td>
                  <td className="border border-slate-900 px-2 py-2">-</td>
                  <td className="border border-slate-900 px-3 py-2 text-left text-[10px] text-slate-600">
                    Ketuntasan: {stats.passRate}%
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Assessment Legend */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-800">Predikat Capaian:</span>
                <span><strong>A</strong> (≥ 90 Sangat Baik)</span>
                <span><strong>B</strong> (80 - 89.9 Baik)</span>
                <span><strong>C</strong> ({kkmThreshold} - 79.9 Cukup)</span>
                <span><strong>D</strong> (&lt; {kkmThreshold} Perlu Bimbingan)</span>
              </div>
              <div className="text-[10px] text-slate-500">
                * Kriteria Ketuntasan Minimal / KKTP: <strong>{kkmThreshold}</strong>
              </div>
            </div>
          </div>
        )}
      </PrintDocumentLayout>
    </div>
  );
};
