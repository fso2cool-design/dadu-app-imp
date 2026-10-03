import React from 'react';
import { Badge } from '../../../components/common/Badge';
import { PenNib, CheckCircle, FloppyDisk } from '@phosphor-icons/react';
import type { ProfileFormData, ProfileTabProps } from './types';

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileData,
  setProfileData,
  saving,
  onSubmit,
  isTeacherSigModalOpen,
  setIsTeacherSigModalOpen,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--ds-border)] pb-3">
        <div>
          <h3 className="font-bold text-sm text-[var(--ds-text)]">Biodata & Informasi Akun Guru</h3>
          <p className="text-[11px] text-[var(--ds-text-muted)]">Data ini digunakan sebagai nama penandatangan resmi di setiap laporan.</p>
        </div>
        <Badge variant="blue" size="sm">Akun Terverifikasi</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">
            Nama Lengkap & Gelar Akademik <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={profileData.displayName}
            onChange={e => setProfileData(p => ({ ...p, displayName: e.target.value }))}
            placeholder="Contoh: Ust. Ahmad Fauzi, S.Pd.I, M.Pd"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">NIP (Nomor Induk Pegawai)</label>
          <input
            type="text"
            value={profileData.nip}
            onChange={e => setProfileData(p => ({ ...p, nip: e.target.value }))}
            placeholder="19850715 201001 1 012"
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">NUPTK</label>
          <input
            type="text"
            value={profileData.nuptk}
            onChange={e => setProfileData(p => ({ ...p, nuptk: e.target.value }))}
            placeholder="1234765890123456"
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">NIK (Kependudukan)</label>
          <input
            type="text"
            value={profileData.nik}
            onChange={e => setProfileData(p => ({ ...p, nik: e.target.value }))}
            placeholder="3201..."
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">Status Kepegawaian</label>
          <select
            value={profileData.employmentStatus}
            onChange={e => setProfileData(p => ({ ...p, employmentStatus: e.target.value as ProfileFormData['employmentStatus'] }))}
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs font-medium"
          >
            <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
            <option value="PPPK">PPPK (Pegawai Pemerintah dgn Perjanjian Kerja)</option>
            <option value="GTT">Guru Tidak Tetap (GTT / Honorer)</option>
            <option value="TETAP_YAYASAN">Guru Tetap Yayasan (GTY)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">Mata Pelajaran Utama / Pengampu</label>
          <input
            type="text"
            value={profileData.mainSubject}
            onChange={e => setProfileData(p => ({ ...p, mainSubject: e.target.value }))}
            placeholder="Contoh: Fikih / Matematika / Bahasa Arab"
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ds-text)] mb-1.5">Nomor WhatsApp / HP Aktif</label>
          <input
            type="text"
            value={profileData.phone}
            onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
            placeholder="081234567890"
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs"
          />
        </div>
      </div>

      {/* Teacher Digital Signature Section */}
      <div className="p-4 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-xs text-[var(--ds-text)] flex items-center gap-2">
              <PenNib className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Tanda Tangan Digital Guru
            </h4>
            <p className="text-[11px] text-[var(--ds-text-muted)]">
              Otomatis dibubuhkan pada dokumen rekap nilai, presensi, dan jurnal KBM saat dicetak.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTeacherSigModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[var(--ds-surface)] border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <PenNib className="w-3.5 h-3.5" />
            <span>{profileData.signatureUrl ? 'Ubah Tanda Tangan' : 'Buat Tanda Tangan'}</span>
          </button>
        </div>

        {profileData.signatureUrl ? (
          <div className="flex items-center gap-4 bg-[var(--ds-surface)] p-3 rounded-xl border border-[var(--ds-border)]">
            <div className="h-16 w-36 bg-[var(--ds-surface-muted)] rounded-lg border border-[var(--ds-border)] flex items-center justify-center p-1">
              <img
                src={profileData.signatureUrl}
                alt="Tanda Tangan Guru"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Tanda Tangan Aktif
              </span>
              <p className="text-[11px] text-[var(--ds-text-muted)]">Siap dicantumkan pada titimangsa dokumen cetak resmi.</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--ds-text-muted)] italic">Belum ada tanda tangan digital yang disimpan.</p>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
        >
          <FloppyDisk className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Profil Guru'}
        </button>
      </div>
    </form>
  );
};
