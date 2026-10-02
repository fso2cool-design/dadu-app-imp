import React from 'react';
import {
  Database,
  Download,
  Upload,
  Sparkle,
} from '@phosphor-icons/react';
import { Badge } from '../../../components/common/Badge';
import type { BackupTabProps } from './types';

export const BackupTab: React.FC<BackupTabProps> = ({
  isExporting,
  backupFileContent,
  setBackupFileContent,
  importMode,
  setImportMode,
  isImporting,
  importProgressText,
  onExportFullBackup,
  onBackupFileChange,
  onExecuteRestore,
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          Portabilitas & Backup Database Lengkap
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Unduh seluruh data guru, riwayat KBM, nilai, presensi, dan catatan kelas dalam satu berkas `.json` mandiri.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Full Database Export */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">Ekspor Seluruh Database (JSON)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mencakup 14 sub-koleksi: Tahun Ajaran, Kelas, Mapel, Siswa, Plotting Mengajar, Jurnal/Pertemuan, Presensi Mapel & Harian, Penilaian & Butir Nilai, Skor, Catatan Wali Kelas, dan Konfigurasi Madrasah.
            </p>
          </div>

          <button
            type="button"
            onClick={onExportFullBackup}
            disabled={isExporting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Mengekstrak Data...' : 'Unduh File Backup JSON (1-Klik)'}</span>
          </button>
        </div>

        {/* Card 2: Restore from JSON */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-800">Pulihkan Data dari File Backup</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unggah file backup `.json` sebelumnya untuk mengembalikan seluruh catatan akademik ke akun Anda secara aman.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="file"
              id="restore-json-input"
              accept=".json,application/json"
              onChange={onBackupFileChange}
              className="hidden"
            />
            <label
              htmlFor="restore-json-input"
              className="w-full py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 shadow-2xs transition-all cursor-pointer block text-center"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Pilih Berkas Backup (.json)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Selected Backup Preview & Execution Box */}
      {backupFileContent && (
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-bold text-xs text-emerald-950 flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-emerald-600" />
                Pratinjau Isi File Backup Terpilih
              </h5>
              <p className="text-[11px] text-emerald-700">
                Waktu Ekspor: {new Date(backupFileContent.exportedAt).toLocaleString('id-ID')} • Versi: {backupFileContent.version}
              </p>
            </div>
            <Badge variant="success" size="sm">File Siap</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block font-semibold">Tahun Ajaran</span>
              <span className="font-bold text-slate-800">{backupFileContent.collections.academicYears?.length || 0} entri</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block font-semibold">Kelas / Rombel</span>
              <span className="font-bold text-slate-800">{backupFileContent.collections.classes?.length || 0} entri</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block font-semibold">Siswa & Enrollment</span>
              <span className="font-bold text-slate-800">{backupFileContent.collections.students?.length || 0} siswa</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block font-semibold">Pertemuan & Jurnal</span>
              <span className="font-bold text-slate-800">{backupFileContent.collections.meetings?.length || 0} sesi</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700">Mode Pemulihan:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Gabung Data (Merge)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="overwrite"
                  checked={importMode === 'overwrite'}
                  onChange={() => setImportMode('overwrite')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Timpa (Overwrite)</span>
              </label>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setBackupFileContent(null)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onExecuteRestore}
                disabled={isImporting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Memproses Restorasi...' : 'Eksekusi Pemulihan Data'}</span>
              </button>
            </div>
          </div>

          {importProgressText && (
            <p className="text-[11px] text-emerald-800 font-medium">
              {importProgressText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
