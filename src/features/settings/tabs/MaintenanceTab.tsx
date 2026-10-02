import React from 'react';
import {
  Trash,
  ShieldCheck,
  Warning,
  WarningCircle,
  Eye,
  Download,
  CheckCircle,
} from '@phosphor-icons/react';
import type { MaintenanceTabProps } from './types';

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({
  academicYears,
  resetAcademicYearId,
  setResetAcademicYearId,
  resetSemester,
  setResetSemester,
  resetScope,
  setResetScope,
  resetPreview,
  isPreviewLoading,
  lastResetSummary,
  confirmResetText,
  setConfirmResetText,
  isResetting,
  isExporting,
  onPreviewReset,
  onResetSemester,
  onQuickSafetyBackup,
  setResetPreview,
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Trash className="w-4 h-4 text-rose-600" />
          Pemeliharaan & Pembersihan Data Semester (Semantic Reset)
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Fitur proteksi bergradasi untuk membersihkan data transaksional (jurnal KBM, absensi, dan nilai) pada pergantian semester secara aman dan terukur tanpa menghapus data master (siswa, kelas, mata pelajaran).
        </p>
      </div>

      {/* Quick Safety Backup Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-amber-950">Disarankan: Unduh Cadangan Pengaman</h4>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
              Sebelum melakukan tindakan destruktif, unduh file snapshot database JSON sebagai arsip cadangan pengaman darurat.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onQuickSafetyBackup}
          disabled={isExporting}
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Mengunduh...' : 'Unduh Cadangan Pengaman'}</span>
        </button>
      </div>

      {/* Main Semantic Reset Form */}
      <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-5 max-w-2xl">
        <div className="flex items-start gap-3 border-b border-rose-100 pb-3">
          <Warning className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs text-rose-950">Proteksi & Filter Semantik</h4>
            <p className="text-[11px] text-rose-700 leading-relaxed mt-1">
              Pilih tahun ajaran, semester sasaran, dan cakupan data yang ingin dibersihkan. Operasi ini berjalan dengan batch chunking tahan-kuota Firestore dan dilengkapi pratinjau pra-eksekusi.
            </p>
          </div>
        </div>

        {/* 1. Target Academic Year */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            1. Pilih Tahun Ajaran Sasaran:
          </label>
          <select
            value={resetAcademicYearId}
            onChange={e => {
              setResetAcademicYearId(e.target.value);
              setResetPreview(null);
            }}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-rose-400 focus:outline-none"
          >
            {academicYears.map(ay => (
              <option key={ay.id} value={ay.id}>
                Tahun Ajaran {ay.label} ({ay.currentSemester}) {ay.isArchived ? '— [DIARSIPKAN]' : (ay.isActive ? '— [SEDANG AKTIF]' : '')}
              </option>
            ))}
          </select>

          {academicYears.find(ay => ay.id === resetAcademicYearId)?.isArchived && (
            <div className="mt-2 p-2.5 rounded-xl bg-red-100/90 border border-red-300 text-[11px] text-red-800 flex items-center gap-2">
              <WarningCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                <strong>Tahun Ajaran ini Diarsipkan:</strong> Status read-only aktif. Reset data dikunci untuk menjaga integritas riwayat terdahulu.
              </span>
            </div>
          )}
        </div>

        {/* 2. Target Semester Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            2. Pilih Semester yang Dibersihkan:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setResetSemester('ALL'); setResetPreview(null); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                resetSemester === 'ALL'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${resetSemester === 'ALL' ? 'bg-white' : 'bg-rose-400'}`} />
              <span>Semua Semester (1 & 2)</span>
            </button>

            <button
              type="button"
              onClick={() => { setResetSemester('1'); setResetPreview(null); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                resetSemester === '1'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${resetSemester === '1' ? 'bg-white' : 'bg-rose-400'}`} />
              <span>Semester 1 (Ganjil)</span>
            </button>

            <button
              type="button"
              onClick={() => { setResetSemester('2'); setResetPreview(null); }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 ${
                resetSemester === '2'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${resetSemester === '2' ? 'bg-white' : 'bg-rose-400'}`} />
              <span>Semester 2 (Genap)</span>
            </button>
          </div>
        </div>

        {/* 3. Granular Scope Checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            3. Tentukan Cakupan Koleksi Data yang Dihapus:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={resetScope.meetingsAndAttendance}
                onChange={e => {
                  setResetScope(s => ({ ...s, meetingsAndAttendance: e.target.checked }));
                  setResetPreview(null);
                }}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Jurnal KBM & Absensi Mapel</span>
                <span className="text-[10px] text-slate-500">Pertemuan agenda guru dan presensi pertemuan per mapel.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={resetScope.assessmentsAndScores}
                onChange={e => {
                  setResetScope(s => ({ ...s, assessmentsAndScores: e.target.checked }));
                  setResetPreview(null);
                }}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Penilaian & Nilai Siswa</span>
                <span className="text-[10px] text-slate-500">Daftar butir asesmen formatif/sumatif serta skor nilai siswa.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={resetScope.dailyAttendance}
                onChange={e => {
                  setResetScope(s => ({ ...s, dailyAttendance: e.target.checked }));
                  setResetPreview(null);
                }}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Presensi Harian Wali Kelas</span>
                <span className="text-[10px] text-slate-500">Sesi harian kelas dan rekam kehadiran siswa oleh wali kelas.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={resetScope.teacherAttendance}
                onChange={e => {
                  setResetScope(s => ({ ...s, teacherAttendance: e.target.checked }));
                  setResetPreview(null);
                }}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Presensi Mandiri Guru (Opsional)</span>
                <span className="text-[10px] text-slate-500">Rekam presensi kedatangan guru dan log bulanan.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={resetScope.classSchedules}
                onChange={e => {
                  setResetScope(s => ({ ...s, classSchedules: e.target.checked }));
                  setResetPreview(null);
                }}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Jadwal Pelajaran Kelas (Opsional)</span>
                <span className="text-[10px] text-slate-500">Alokasi jadwal KBM mingguan pada semester terpilih.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-rose-100 hover:border-rose-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={resetScope.studentNotes}
                onChange={e => {
                  setResetScope(s => ({ ...s, studentNotes: e.target.checked }));
                  setResetPreview(null);
                }}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Catatan Perkembangan Siswa</span>
                <span className="text-[10px] text-slate-500">Catatan khusus BK dan karakter siswa pada semester ini.</span>
              </div>
            </label>
          </div>
        </div>

        {/* 4. Pre-Flight Preview Button & Display */}
        <div className="pt-1 border-t border-rose-100">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-700">4. Pratinjau Dokumen Terdampak (Dry Run):</span>
            <button
              type="button"
              onClick={onPreviewReset}
              disabled={isPreviewLoading || !resetAcademicYearId}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{isPreviewLoading ? 'Menghitung Dokumen...' : 'Hitung Dokumen Terdampak'}</span>
            </button>
          </div>

          {resetPreview && (
            <div className="mt-3 p-3.5 rounded-xl bg-white border border-rose-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-rose-950 pb-2 border-b border-rose-100">
                <span>Total Dokumen yang Akan Dihapus:</span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-mono font-bold">
                  {resetPreview.totalDeleted} Dokumen
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div>Pertemuan KBM: <strong className="text-slate-800">{resetPreview.meetings}</strong></div>
                <div>Presensi Mapel: <strong className="text-slate-800">{resetPreview.attendanceRecords}</strong></div>
                <div>Butir Penilaian: <strong className="text-slate-800">{resetPreview.assessmentItems}</strong></div>
                <div>Nilai Siswa: <strong className="text-slate-800">{resetPreview.scores}</strong></div>
                <div>Sesi Presensi Harian: <strong className="text-slate-800">{resetPreview.dailyAttendanceSessions}</strong></div>
                <div>Rekam Presensi Harian: <strong className="text-slate-800">{resetPreview.dailyAttendanceRecords}</strong></div>
                {resetScope.teacherAttendance && (
                  <div>Presensi Guru: <strong className="text-slate-800">{resetPreview.teacherAttendanceRecords + resetPreview.teacherMonthlyAttendance}</strong></div>
                )}
                {resetScope.classSchedules && (
                  <div>Jadwal Kelas: <strong className="text-slate-800">{resetPreview.classSchedules}</strong></div>
                )}
                {resetScope.studentNotes && (
                  <div>Catatan Siswa: <strong className="text-slate-800">{resetPreview.studentNotes}</strong></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 5. Confirmation Input */}
        <div className="pt-1 border-t border-rose-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            5. Ketik <code className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-mono font-bold">RESET DATA</code> untuk konfirmasi eksekusi:
          </label>
          <input
            type="text"
            value={confirmResetText}
            onChange={e => setConfirmResetText(e.target.value)}
            placeholder="Ketik persis: RESET DATA"
            className="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* 6. Execution Button */}
        <button
          type="button"
          onClick={onResetSemester}
          disabled={
            isResetting ||
            confirmResetText !== 'RESET DATA' ||
            academicYears.find(ay => ay.id === resetAcademicYearId)?.isArchived ||
            !Object.values(resetScope).some(v => Boolean(v))
          }
          className="w-full px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40"
        >
          <Trash className="w-4 h-4" />
          <span>{isResetting ? 'Mengeksekusi Pembersihan Batch...' : 'Bersihkan Data Semester Terpilih Sekarang'}</span>
        </button>
      </div>

      {/* Last Reset Audit Result Card */}
      {lastResetSummary && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 font-bold text-emerald-950">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Audit Pembersihan Terakhir Berhasil</span>
          </div>
          <p className="text-[11px] text-emerald-800">
            Sebanyak <strong>{lastResetSummary.totalDeleted}</strong> dokumen transaksional berhasil dihapus secara aman dari koleksi pengguna tanpa kesalahan batch.
          </p>
        </div>
      )}
    </div>
  );
};
