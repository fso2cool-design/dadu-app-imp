import React from 'react';
import { SchoolSettings, DocumentSettings, Enrollment, Subject, DailyAttendanceRecord, StudentNote } from '../../types';
import { DEFAULT_KKM, getGradeScale } from '../../constants/grading';
import { DEFAULT_KEMENAG_LOGO } from '../../components/common/OfficialDocumentHeader';
import { formatDateIndonesian, getTodayISO } from '../../utils/date';
import { formatOfficialSignatureName, formatOfficialNip } from '../../utils/formatOfficialName';
import { Building2, Award, Sparkles } from 'lucide-react';

export interface SubjectScoreItem {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  score: number | null;
  kkm: number;
}

export interface StudentRaporData {
  enrollment: Enrollment;
  rank?: number;
  totalStudents?: number;
  subjectScores: SubjectScoreItem[];
  averageScore: number;
  totalScore: number;
  attendanceStats: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    dispensasi: number;
    attendanceRate: number;
  };
  notes: StudentNote[];
}

interface StudentRaporSheetProps {
  data: StudentRaporData;
  schoolSettings: SchoolSettings | null;
  documentSettings?: DocumentSettings | null;
  academicYearLabel: string;
  semester: string;
  className: string;
  homeroomTeacherName?: string;
  homeroomTeacherNip?: string;
  reportType?: 'RAPOR_SEMESTER' | 'RAPOR_SISIPAN_STS';
  showRank?: boolean;
  showKop?: boolean;
  showSignatures?: boolean;
  customDate?: string;
}

export const StudentRaporSheet: React.FC<StudentRaporSheetProps> = ({
  data,
  schoolSettings,
  documentSettings,
  academicYearLabel,
  semester,
  className,
  homeroomTeacherName,
  homeroomTeacherNip,
  reportType = 'RAPOR_SEMESTER',
  showRank = true,
  showKop = true,
  showSignatures = true,
  customDate,
}) => {
  const { enrollment, rank, totalStudents, subjectScores, averageScore, attendanceStats, notes } = data;
  const student = enrollment.student;

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

  const effectiveTeacherName = homeroomTeacherName || schoolSettings?.teacherName || 'Wali Kelas';
  const effectiveTeacherNip = homeroomTeacherNip || schoolSettings?.teacherNip || '-';

  const city = documentSettings?.city || schoolSettings?.district || schoolSettings?.regency || 'Kota';
  const formattedDate = customDate || formatDateIndonesian(getTodayISO());

  const docTitle = reportType === 'RAPOR_SISIPAN_STS'
    ? 'LEMBAR KEMAJUAN BELAJAR & RAPOR SISIPAN (STS)'
    : 'LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR)';

  return (
    <div className="printable-document bg-white border border-slate-300 print:border-none rounded-2xl p-6 sm:p-8 shadow-xs text-slate-900 font-sans leading-relaxed text-xs">
      {/* 1. Official Kop Surat (4-Tier) */}
      {showKop && (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 text-center pb-2">
            {/* Left Logo: Kemenag */}
            <div className="w-18 flex items-center justify-center shrink-0">
              <img
                src={kemenagLogo}
                alt="Logo Kemenag"
                className="w-16 h-16 max-w-full max-h-full object-contain"
              />
            </div>

            {/* 4-Tier Official Text */}
            <div className="flex-1 text-center px-1">
              <h4 className="text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                {tier1}
              </h4>
              {isMadrasah && (
                <h5 className="text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                  {tier2}
                </h5>
              )}
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-950 my-0.5 leading-snug">
                {effectiveSchoolName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-700 leading-snug">
                {effectiveAddress}
              </p>
            </div>

            {/* Right Logo: Madrasah */}
            <div className="w-18 flex items-center justify-center shrink-0">
              {madrasahLogo ? (
                <img
                  src={madrasahLogo}
                  alt="Logo Madrasah"
                  className="w-16 h-16 max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 no-print">
                  <Building2 className="w-5 h-5 text-slate-400 mb-0.5" />
                  <span className="text-[7px] font-bold uppercase">Madrasah</span>
                </div>
              )}
            </div>
          </div>

          {/* Double Border Rule */}
          <div className="border-b-2 border-slate-950"></div>
          <div className="border-b border-slate-950 mt-0.5"></div>
        </div>
      )}

      {/* 2. Document Title */}
      <div className="text-center my-3">
        <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950 underline decoration-2 underline-offset-4">
          {docTitle}
        </h1>
        <p className="text-[11px] text-slate-600 mt-1">
          Tahun Ajaran: <strong className="text-slate-900">{academicYearLabel}</strong> — Semester: <strong className="text-slate-900">{semester === 'GANJIL' ? 'Ganjil (1)' : 'Genap (2)'}</strong>
        </p>
      </div>

      {/* 3. Student Identity Grid */}
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-6 bg-slate-50/90 border border-slate-300 rounded-xl p-3 my-3 text-xs">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-600 font-medium">Nama Peserta Didik</span>
            <span className="font-bold text-slate-900">: {student?.fullName || 'Nama Siswa'}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600 font-medium">NIS / NISN</span>
            <span className="font-mono text-slate-800">: {student?.nis || '-'} / {student?.nisn || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600 font-medium">Jenis Kelamin</span>
            <span className="text-slate-800">: {student?.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-600 font-medium">Kelas / Rombel</span>
            <span className="font-bold text-slate-900">: {className}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-600 font-medium">Nomor Absen</span>
            <span className="font-mono font-bold text-slate-800">: #{enrollment.rollNumber || '-'}</span>
          </div>
          {showRank && typeof rank === 'number' && rank > 0 && (
            <div className="flex items-center">
              <span className="w-28 text-slate-600 font-medium">Peringkat Kelas</span>
              <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                Ke-{rank} dari {totalStudents || '-'} Siswa
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Academic Grades Table */}
      <div className="my-3 space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
          <span>A. Capaian Kompetensi & Nilai Akademik</span>
        </h3>

        <table className="w-full text-left text-xs border-collapse border border-slate-900">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-900 text-center">
              <th className="border border-slate-900 px-2 py-1.5 w-8">No</th>
              <th className="border border-slate-900 px-3 py-1.5 text-left">Mata Pelajaran</th>
              <th className="border border-slate-900 px-2 py-1.5 w-14">KKTP</th>
              <th className="border border-slate-900 px-2 py-1.5 w-16">Nilai Akhir</th>
              <th className="border border-slate-900 px-2 py-1.5 w-14">Predikat</th>
              <th className="border border-slate-900 px-3 py-1.5 text-left">Capaian Kompetensi / Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {subjectScores.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-900 py-6 text-center text-slate-400 italic">
                  Belum ada komponen penilaian atau nilai yang dimasukkan untuk kelas ini.
                </td>
              </tr>
            ) : (
              subjectScores.map((item, idx) => {
                const kkm = item.kkm || DEFAULT_KKM;
                const score = item.score;
                const scale = score !== null ? getGradeScale(score, kkm) : null;
                const isPassed = score !== null ? score >= kkm : false;

                return (
                  <tr key={item.subjectId || idx} className="hover:bg-slate-50/50">
                    <td className="border border-slate-900 px-2 py-1.5 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-900 px-3 py-1.5 font-semibold text-slate-900">
                      {item.subjectName}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-medium">
                      {kkm}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-bold">
                      {score !== null ? score : '-'}
                    </td>
                    <td className="border border-slate-900 px-2 py-1.5 text-center font-bold">
                      {scale ? scale.predicate : '-'}
                    </td>
                    <td className="border border-slate-900 px-3 py-1.5 text-[11px] text-slate-700 leading-snug">
                      {score !== null ? (
                        <span>
                          <strong className={isPassed ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPassed ? 'Tuntas' : 'Perlu Bimbingan'}
                          </strong>{' '}
                          — {scale?.description}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada evaluasi nilai</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t border-slate-900">
              <td colSpan={3} className="border border-slate-900 px-3 py-1.5 text-right uppercase">
                Rata-rata Nilai Akademik
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-center font-mono font-black text-slate-950 text-sm">
                {averageScore > 0 ? averageScore : '-'}
              </td>
              <td className="border border-slate-900 px-2 py-1.5 text-center">
                {averageScore > 0 ? getGradeScale(averageScore, DEFAULT_KKM).predicate : '-'}
              </td>
              <td className="border border-slate-900 px-3 py-1.5 text-[11px] text-slate-700">
                {averageScore >= DEFAULT_KKM ? 'Memenuhi kriteria ketuntasan kelulusan rombel' : 'Memerlukan remedial bimbingan'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 5. Attendance & Student Character Recap (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
        {/* Attendance */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            B. Rekapitulasi Kehadiran
          </h3>
          <table className="w-full text-left text-xs border border-slate-900">
            <thead>
              <tr className="bg-slate-100 font-bold text-center border-b border-slate-900">
                <th className="border border-slate-900 px-2 py-1 text-left">Alasan Ketidakhadiran</th>
                <th className="border border-slate-900 px-2 py-1 w-20">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-900 px-3 py-1">Sakit (S)</td>
                <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold">
                  {attendanceStats.sakit} hari
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 px-3 py-1">Izin (I)</td>
                <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold">
                  {attendanceStats.izin} hari
                </td>
              </tr>
              <tr>
                <td className="border border-slate-900 px-3 py-1">Tanpa Keterangan / Alpa (A)</td>
                <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold text-rose-700">
                  {attendanceStats.alpa} hari
                </td>
              </tr>
              {attendanceStats.dispensasi > 0 && (
                <tr>
                  <td className="border border-slate-900 px-3 py-1">Dispensasi Kegiatan (D)</td>
                  <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold">
                    {attendanceStats.dispensasi} hari
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t border-slate-900">
                <td className="border border-slate-900 px-3 py-1">Persentase Kehadiran</td>
                <td className="border border-slate-900 px-2 py-1 text-center font-mono font-bold text-emerald-800">
                  {attendanceStats.attendanceRate}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Character & Homeroom Notes */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
            C. Catatan & Bimbingan Wali Kelas
          </h3>
          <div className="border border-slate-900 rounded-lg p-2.5 min-h-[105px] bg-slate-50/40 text-xs flex flex-col justify-between">
            {notes.length === 0 ? (
              <p className="text-[11px] text-slate-700 italic leading-relaxed">
                Ananda menunjukkan kemajuan dan kepribadian yang baik selama proses pembelajaran. Pertahankan semangat belajar, ketekunan, dan adab santri dalam keseharian.
              </p>
            ) : (
              <div className="space-y-1.5">
                {notes.slice(0, 3).map((n) => (
                  <div key={n.id} className="text-[11px] leading-snug">
                    <span className="font-bold text-slate-900">
                      {n.category === 'ACHIEVEMENT' ? '🏆 ' : n.category === 'DISCIPLINE' ? '⚠️ ' : '📝 '}
                    </span>
                    <span className="text-slate-800">{n.note || (n as any).content}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-200 pt-1">
              * Terus tingkatkan prestasi belajar dan jaga integritas akhlak karimah.
            </div>
          </div>
        </div>
      </div>

      {/* 6. Formal 3-Column Signatures Block */}
      {showSignatures && (
        <div className="mt-8 pt-2 page-break-inside-avoid text-xs text-slate-900">
          <div className="grid grid-cols-3 gap-4 items-start text-center">
            {/* 1. Orang Tua / Wali */}
            <div className="space-y-1">
              <p className="text-slate-600 font-medium">Mengetahui,</p>
              <p className="font-bold text-slate-900">Orang Tua / Wali Siswa</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan)</span>
              </div>
              <p className="font-bold text-slate-950 underline decoration-1">
                ( {student?.parentName || '...........................................'} )
              </p>
            </div>

            {/* 2. Mengetahui Kepala Madrasah */}
            <div className="space-y-1">
              <p className="text-slate-600 font-medium">Mengetahui,</p>
              <p className="font-bold text-slate-900">Kepala Madrasah</p>
              <div className="h-16 flex items-center justify-center relative">
                {schoolSettings?.stampImageUrl && (
                  <img
                    src={schoolSettings.stampImageUrl}
                    alt="Stempel Madrasah"
                    className="absolute max-h-16 max-w-24 object-contain opacity-80 pointer-events-none -rotate-6"
                  />
                )}
                {schoolSettings?.headmasterSignatureUrl ? (
                  <img
                    src={schoolSettings.headmasterSignatureUrl}
                    alt="TTD Kepala"
                    className="max-h-14 max-w-28 object-contain relative z-10"
                  />
                ) : (
                  <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan & Stempel)</span>
                )}
              </div>
              <p className="font-bold text-slate-950 underline decoration-1">
                {formatOfficialSignatureName(effectiveHeadmasterName, 'Kepala Madrasah')}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">
                {formatOfficialNip(effectiveHeadmasterNip)}
              </p>
            </div>

            {/* 3. Wali Kelas */}
            <div className="space-y-1">
              <p className="text-slate-600 font-medium">
                {city}, {formattedDate}
              </p>
              <p className="font-bold text-slate-900">Wali Kelas</p>
              <div className="h-16 flex items-center justify-center relative">
                {documentSettings?.signatureImageUrl ? (
                  <img
                    src={documentSettings.signatureImageUrl}
                    alt="TTD Wali Kelas"
                    className="max-h-14 max-w-28 object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-slate-300 italic no-print">(Tanda Tangan)</span>
                )}
              </div>
              <p className="font-bold text-slate-950 underline decoration-1">
                {formatOfficialSignatureName(effectiveTeacherName, 'Wali Kelas')}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">
                {formatOfficialNip(effectiveTeacherNip)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
