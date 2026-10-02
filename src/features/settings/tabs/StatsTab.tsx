import React from 'react';
import {
  Database,
  Pulse,
  HardDrive,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { RelationshipRecoverySection } from '../RelationshipRecoverySection';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../../context/WorkspaceContext';
import type { StatsTabProps } from './types';

export const StatsTab: React.FC<StatsTabProps> = ({
  dbStats,
  statsLoading,
  onRefreshStats,
}) => {
  const { user, profile } = useAuth();
  const { classes, academicYears } = useWorkspace();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Pulse className="w-4 h-4 text-emerald-600" />
            Statistik & Status Kesehatan Firestore
          </h3>
          <p className="text-[11px] text-slate-400">Pemantauan volumetrik rekaman data aktif pada ruang penyimpanan terisolasi Anda.</p>
        </div>

        <button
          type="button"
          onClick={onRefreshStats}
          disabled={statsLoading}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <ArrowClockwise className={`w-3.5 h-3.5 text-emerald-600 ${statsLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Status</span>
        </button>
      </div>

      {/* Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 paper-note-yellow">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Koneksi Firestore</span>
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Online & Terenkripsi
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 paper-note-blue">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Pulse className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Latensi Jaringan</span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              {dbStats ? `${dbStats.latencyMs} ms (Sangat Cepat)` : 'Memeriksa...'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 paper-note-green">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Dokumen Aktif</span>
            <span className="text-xs font-bold text-purple-900 font-mono">
              {dbStats ? `${dbStats.totalDocuments} Dokumen` : 'Memeriksa...'}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Collection Breakdown Table */}
      {dbStats && (
        <div className="space-y-3">
          <h4 className="font-bold text-xs text-slate-800">Rincian Dokumen per Koleksi</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Tahun Ajaran</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.academicYearsCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Rombel / Kelas</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.classesCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Mata Pelajaran</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.subjectsCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Master Siswa</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.studentsCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Plotting Mengajar</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.teachingAssignmentsCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Sesi Pertemuan KBM</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.meetingsCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Log Presensi Siswa</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.attendanceRecordsCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 paper-note-pink">
              <span className="text-slate-500 text-[11px] block">Butir Nilai & Skor</span>
              <strong className="text-sm font-bold text-slate-800">{dbStats.assessmentItemsCount + dbStats.scoresCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Recovery & Identity Governance Section */}
      {user && (
        <RelationshipRecoverySection
          uid={user.uid}
          classes={classes}
          academicYears={academicYears}
          userDisplayName={profile?.displayName || user.displayName || undefined}
          onRefreshStats={onRefreshStats}
        />
      )}
    </div>
  );
};
