import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Link2, 
  Search, 
  Lock, 
  X, 
  UserCheck, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { runIntegrityAudit, DiagnosticResult, IntegrityIssue } from '../../services/firestore/diagnostics';
import { 
  relinkEnrollmentClass, 
  relinkStudentRelationship, 
  findStudentCandidatesByNisn 
} from '../../services/firestore/relationshipRecovery';
import { ClassItem, AcademicYear, Student } from '../../types';

interface RelationshipRecoverySectionProps {
  uid: string;
  classes: ClassItem[];
  academicYears: AcademicYear[];
  userDisplayName?: string;
  onRefreshStats?: () => void;
}

export const RelationshipRecoverySection: React.FC<RelationshipRecoverySectionProps> = ({
  uid,
  classes,
  academicYears,
  userDisplayName,
  onRefreshStats
}) => {
  const [auditResult, setAuditResult] = useState<DiagnosticResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  // Relink Class Modal State
  const [relinkClassIssue, setRelinkClassIssue] = useState<IntegrityIssue | null>(null);
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>('');
  const [relinkReason, setRelinkReason] = useState<string>('');
  const [isRelinkingClass, setIsRelinkingClass] = useState(false);
  const [classRelinkError, setClassRelinkError] = useState<string | null>(null);

  // Relink Student Modal State
  const [relinkStudentIssue, setRelinkStudentIssue] = useState<IntegrityIssue | null>(null);
  const [nisnSearchQuery, setNisnSearchQuery] = useState<string>('');
  const [candidateStudents, setCandidateStudents] = useState<Student[]>([]);
  const [selectedCandidateStudentId, setSelectedCandidateStudentId] = useState<string>('');
  const [studentRelinkReason, setStudentRelinkReason] = useState<string>('');
  const [isSearchingNisn, setIsSearchingNisn] = useState(false);
  const [isRelinkingStudent, setIsRelinkingStudent] = useState(false);
  const [studentRelinkError, setStudentRelinkError] = useState<string | null>(null);

  const [operationSuccessMsg, setOperationSuccessMsg] = useState<string | null>(null);

  const handleRunAudit = async () => {
    try {
      setIsAuditing(true);
      setOperationSuccessMsg(null);
      const result = await runIntegrityAudit(uid);
      setAuditResult(result);
    } catch (err: any) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Class Relink Handler
  const handleOpenClassRelink = (issue: IntegrityIssue) => {
    setRelinkClassIssue(issue);
    setSelectedTargetClassId('');
    setRelinkReason('Pemulihan kelas penempatan siswa ke kelas aktif yang valid');
    setClassRelinkError(null);
  };

  const handleExecuteClassRelink = async () => {
    if (!relinkClassIssue || !selectedTargetClassId) return;

    try {
      setIsRelinkingClass(true);
      setClassRelinkError(null);

      await relinkEnrollmentClass(uid, {
        enrollmentId: relinkClassIssue.documentId,
        targetClassId: selectedTargetClassId,
        performedBy: userDisplayName || 'Administrator',
        reason: relinkReason,
      });

      setOperationSuccessMsg('Relasi kelas penempatan berhasil dipulihkan secara aman dengan audit trail!');
      setRelinkClassIssue(null);

      // Re-run audit to update issues list
      const freshAudit = await runIntegrityAudit(uid);
      setAuditResult(freshAudit);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Class relink failed:', err);
      setClassRelinkError(err.message || 'Gagal memulihkan relasi kelas.');
    } finally {
      setIsRelinkingClass(false);
    }
  };

  // Student Relink Handler
  const handleOpenStudentRelink = (issue: IntegrityIssue) => {
    setRelinkStudentIssue(issue);
    setNisnSearchQuery(issue.details?.nisn || '');
    setCandidateStudents([]);
    setSelectedCandidateStudentId('');
    setStudentRelinkReason('Pemulihan relasi transaksi akademik ke master siswa yang valid');
    setStudentRelinkError(null);

    if (issue.details?.nisn) {
      findStudentCandidatesByNisn(uid, issue.details.nisn).then(setCandidateStudents);
    }
  };

  const handleSearchNisn = async () => {
    if (!nisnSearchQuery.trim()) return;
    try {
      setIsSearchingNisn(true);
      setStudentRelinkError(null);
      const results = await findStudentCandidatesByNisn(uid, nisnSearchQuery);
      setCandidateStudents(results);
      if (results.length === 0) {
        setStudentRelinkError(`Tidak ditemukan siswa aktif dengan NISN persis "${nisnSearchQuery}". Sistem memblokir fuzzy matching nama demi akurasi identity.`);
      }
    } catch (err: any) {
      setStudentRelinkError(err.message || 'Gagal mencari kandidat siswa.');
    } finally {
      setIsSearchingNisn(false);
    }
  };

  const handleExecuteStudentRelink = async () => {
    if (!relinkStudentIssue || !selectedCandidateStudentId) return;

    let targetType: 'ENROLLMENT' | 'SCORE' | 'ATTENDANCE' | 'DAILY_ATTENDANCE' | 'STUDENT_NOTE' = 'ENROLLMENT';
    if (relinkStudentIssue.collectionName === 'scores') targetType = 'SCORE';
    else if (relinkStudentIssue.collectionName === 'attendanceRecords') targetType = 'ATTENDANCE';
    else if (relinkStudentIssue.collectionName === 'dailyAttendanceRecords') targetType = 'DAILY_ATTENDANCE';
    else if (relinkStudentIssue.collectionName === 'studentNotes') targetType = 'STUDENT_NOTE';

    try {
      setIsRelinkingStudent(true);
      setStudentRelinkError(null);

      await relinkStudentRelationship(uid, {
        targetType,
        documentId: relinkStudentIssue.documentId,
        targetStudentId: selectedCandidateStudentId,
        performedBy: userDisplayName || 'Administrator',
        expectedNisn: nisnSearchQuery.trim() || undefined,
        reason: studentRelinkReason,
      });

      setOperationSuccessMsg('Relasi transaksi siswa berhasil ditautkan kembali ke master siswa secara atomik!');
      setRelinkStudentIssue(null);

      const freshAudit = await runIntegrityAudit(uid);
      setAuditResult(freshAudit);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Student relink failed:', err);
      setStudentRelinkError(err.message || 'Gagal memulihkan relasi siswa.');
    } finally {
      setIsRelinkingStudent(false);
    }
  };

  const filteredIssues = (auditResult?.issues || []).filter(issue => {
    if (activeSeverityFilter === 'ALL') return true;
    return issue.severity === activeSeverityFilter;
  });

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200/80 dark:border-slate-800">
      {/* Header with Run Audit Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Audit Integritas Relasi & Pemulihan (Identity Governance)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mendeteksi dokumen orphan, relasi putus, dan duplikasi tanpa menghapus data histori akademik siswa.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunAudit}
          disabled={isAuditing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
          <span>{isAuditing ? 'Menganalisis Relasi...' : 'Jalankan Audit Integritas'}</span>
        </button>
      </div>

      {operationSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{operationSuccessMsg}</span>
        </div>
      )}

      {/* Audit Summary Cards */}
      {auditResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Temuan</span>
              <strong className="text-lg font-bold text-slate-800 dark:text-slate-200">{auditResult.totalIssues}</strong>
              <span className="text-[11px] text-slate-500 block mt-0.5">Pemeriksaan 100% Read-only</span>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold block uppercase">Kritis (Critical)</span>
              <strong className="text-lg font-bold text-rose-700 dark:text-rose-400">{auditResult.criticalCount}</strong>
              <span className="text-[11px] text-rose-600/80 block mt-0.5">Memerlukan perhatian admin</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block uppercase">Peringatan (Warning)</span>
              <strong className="text-lg font-bold text-amber-700 dark:text-amber-400">{auditResult.warningsCount}</strong>
              <span className="text-[11px] text-amber-600/80 block mt-0.5">Dapat dipulihkan / diperbaiki</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block uppercase">Status Integritas</span>
              <strong className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block mt-1">
                {auditResult.totalIssues === 0 ? 'Konsisten & Aman' : 'Perlu Pemulihan Terkontrol'}
              </strong>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSeverityFilter === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Semua ({auditResult.totalIssues})
            </button>
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('CRITICAL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSeverityFilter === 'CRITICAL'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-500 hover:text-rose-600 dark:text-slate-400'
              }`}
            >
              Kritis ({auditResult.criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveSeverityFilter('WARNING')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSeverityFilter === 'WARNING'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-500 hover:text-amber-600 dark:text-slate-400'
              }`}
            >
              Peringatan ({auditResult.warningsCount})
            </button>
          </div>

          {/* Issues List */}
          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <h5 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Database Sehat & Berintegritas</h5>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 max-w-md mx-auto">
                Tidak ditemukan dokumen orphan, duplikasi NISN aktif, maupun relasi putus pada filter ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredIssues.map((issue, idx) => (
                <div
                  key={`${issue.collectionName}_${issue.documentId}_${idx}`}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    issue.severity === 'CRITICAL'
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        issue.severity === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {issue.collectionName} / {issue.documentId.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {issue.description}
                    </p>
                  </div>

                  {/* Contextual Recovery Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {issue.type === 'ORPHAN_CLASS_ENROLLMENT' && (
                      <button
                        type="button"
                        onClick={() => handleOpenClassRelink(issue)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Re-Link Kelas</span>
                      </button>
                    )}

                    {(issue.type === 'ORPHAN_STUDENT_ENROLLMENT' || 
                      issue.type === 'ORPHAN_SCORE' || 
                      issue.type === 'ORPHAN_ATTENDANCE') && (
                      <button
                        type="button"
                        onClick={() => handleOpenStudentRelink(issue)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Re-Link Siswa (via NISN)</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RE-LINK KELAS */}
      {relinkClassIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#11141f] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Pemulihan Relasi Kelas Penempatan (Re-Link)
              </h4>
              <button
                type="button"
                onClick={() => setRelinkClassIssue(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">Informasi Penempatan Orphan:</p>
              <p className="text-slate-600 dark:text-slate-400 font-mono">
                ID Dokumen: {relinkClassIssue.documentId}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Tahun Ajaran: {academicYears.find(ay => ay.id === relinkClassIssue.details?.academicYearId)?.label || relinkClassIssue.details?.academicYearLabel || relinkClassIssue.details?.academicYearId}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Nama Kelas Sebelumnya: {relinkClassIssue.details?.className || '-'}
              </p>
            </div>

            {classRelinkError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{classRelinkError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Kelas Tujuan yang Valid <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTargetClassId}
                  onChange={e => setSelectedTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Rombel / Kelas --</option>
                  {classes
                    .filter(c => !c.isArchived && (!relinkClassIssue.details?.academicYearId || c.academicYearId === relinkClassIssue.details.academicYearId))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.major ? `(${c.major})` : ''} - Tingkat {c.gradeLevel}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hanya kelas aktif di Tahun Ajaran yang sama yang dapat dipilih (Sesuai tata kelola Dadu).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Re-Link / Pemulihan
                </label>
                <input
                  type="text"
                  value={relinkReason}
                  onChange={e => setRelinkReason(e.target.value)}
                  placeholder="Contoh: Pemulihan kelas setelah reorganisasi rombel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRelinkClassIssue(null)}
                disabled={isRelinkingClass}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteClassRelink}
                disabled={isRelinkingClass || !selectedTargetClassId}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isRelinkingClass ? 'Menyimpan Re-Link...' : 'Validasi & Pulihkan Relasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RE-LINK SISWA (VIA NISN) */}
      {relinkStudentIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#11141f] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Pemulihan Relasi Siswa (Identity Recovery via NISN)
              </h4>
              <button
                type="button"
                onClick={() => setRelinkStudentIssue(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">Dokumen Transaksi Orphan:</p>
              <p className="text-slate-600 dark:text-slate-400 font-mono">
                Koleksi: {relinkStudentIssue.collectionName} / ID: {relinkStudentIssue.documentId}
              </p>
              <p className="text-slate-600 dark:text-slate-400 font-mono">
                ID Siswa Tidak Ditemukan: {relinkStudentIssue.details?.studentId || '-'}
              </p>
            </div>

            {studentRelinkError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{studentRelinkError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cari Master Siswa Berdasarkan NISN Persis <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nisnSearchQuery}
                    onChange={e => setNisnSearchQuery(e.target.value)}
                    placeholder="Masukkan NISN 10 digit siswa..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSearchNisn}
                    disabled={isSearchingNisn || !nisnSearchQuery.trim()}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearchingNisn ? 'Mencari...' : 'Cari'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sesuai prinsip Student Identity Governance, pencocokan otomatis fuzzy nama dilarang untuk mencegah salah kait data.
                </p>
              </div>

              {candidateStudents.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Verifikasi Kandidat Siswa Ditemukan ({candidateStudents.length}):
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {candidateStudents.map(cand => (
                      <label
                        key={cand.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedCandidateStudentId === cand.id
                            ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-900 dark:text-cyan-100 font-semibold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold">{cand.fullName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: {cand.id} | NISN: {cand.nisn} | NIS: {cand.nis || '-'}
                          </p>
                        </div>
                        <input
                          type="radio"
                          name="candidateStudent"
                          value={cand.id}
                          checked={selectedCandidateStudentId === cand.id}
                          onChange={() => setSelectedCandidateStudentId(cand.id)}
                          className="w-4 h-4 text-cyan-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alasan Re-Link
                </label>
                <input
                  type="text"
                  value={studentRelinkReason}
                  onChange={e => setStudentRelinkReason(e.target.value)}
                  placeholder="Contoh: Menautkan kembali nilai ke master siswa dengan NISN cocok"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRelinkStudentIssue(null)}
                disabled={isRelinkingStudent}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteStudentRelink}
                disabled={isRelinkingStudent || !selectedCandidateStudentId}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isRelinkingStudent ? 'Menyimpan Re-Link...' : 'Verifikasi & Tautkan Ulang Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
