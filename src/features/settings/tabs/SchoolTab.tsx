import React from 'react';
import {
  Buildings,
  Image as ImageIcon,
  Upload,
  FloppyDisk,
} from '@phosphor-icons/react';
import { DEFAULT_KEMENAG_LOGO } from '../../../components/common/OfficialDocumentHeader';
import type { SchoolTabProps } from './types';

export const SchoolTab: React.FC<SchoolTabProps> = ({
  schoolData,
  setSchoolData,
  saving,
  onSubmit,
  isHeadmasterSigModalOpen,
  setIsHeadmasterSigModalOpen,
  isStampModalOpen,
  setIsStampModalOpen,
  onKemenagLogoChange,
  onSchoolLogoChange,
  onSuccess,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Identitas Resmi Madrasah / Satuan Kerja</h3>
        <p className="text-[11px] text-slate-400">Konfigurasi Kop Surat 4 Tingkat, Logo Kemenag & Madrasah, Kepala Madrasah, dan stempel resmi.</p>
      </div>

      {/* SECTION 1: DUAL LOGO KOP SURAT (KEMENAG & MADRASAH) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-orange-500 dark:text-cyan-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Logo Resmi Dokumen (Kemenag & Madrasah)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
            Tersimpan di Cloud (Multi-Device)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logo 1: Kementerian Agama */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Kemenag (Sisi Kiri)</span>
                <span className="text-[10px] text-slate-400">Tingkat 1 Instansi Kementerian Agama RI</span>
              </div>
              {schoolData.kemenagLogoUrl ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium">Custom</span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">Default Resmi</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                <img
                  src={schoolData.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO}
                  alt="Logo Kemenag"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                  <span>Unggah Logo Kemenag</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onKemenagLogoChange}
                    className="hidden"
                  />
                </label>

                {schoolData.kemenagLogoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolData(prev => ({ ...prev, kemenagLogoUrl: '' }));
                      onSuccess('Menggunakan logo default resmi Ikhlas Beramal.');
                    }}
                    className="block text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                  >
                    Gunakan Logo Resmi Default
                  </button>
                )}
                <p className="text-[10px] text-slate-400 leading-tight">Mendukung file PNG transparan, JPG, atau SVG.</p>
              </div>
            </div>
          </div>

          {/* Logo 2: Madrasah / Sekolah */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Madrasah (Sisi Kanan)</span>
                <span className="text-[10px] text-slate-400">Lambang satuan kerja / madrasah</span>
              </div>
              {(schoolData.schoolLogoUrl || schoolData.logoUrl) ? (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-medium">Terpasang</span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 font-medium">Belum Diatur</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                {(schoolData.schoolLogoUrl || schoolData.logoUrl) ? (
                  <img
                    src={schoolData.schoolLogoUrl || schoolData.logoUrl}
                    alt="Logo Madrasah"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-300 dark:text-slate-600 flex flex-col items-center">
                    <Buildings className="w-7 h-7 mb-0.5" />
                    <span className="text-[8px] font-bold uppercase">Madrasah</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
                  <span>{(schoolData.schoolLogoUrl || schoolData.logoUrl) ? 'Ganti Logo Madrasah' : 'Unggah Logo Madrasah'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSchoolLogoChange}
                    className="hidden"
                  />
                </label>

                {(schoolData.schoolLogoUrl || schoolData.logoUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolData(prev => ({ ...prev, schoolLogoUrl: '', logoUrl: '' }));
                      onSuccess('Logo madrasah dihapus.');
                    }}
                    className="block text-[11px] text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                  >
                    Hapus Logo
                  </button>
                )}
                <p className="text-[10px] text-slate-400 leading-tight">Otomatis disinkronkan ke seluruh dokumen cetak.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: TEKS TINGKAT KOP SURAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tingkat 2: Kantor Kementerian Agama Kabupaten / Kota
          </label>
          <input
            type="text"
            value={schoolData.kemenagDistrict || ''}
            onChange={e => setSchoolData(s => ({ ...s, kemenagDistrict: e.target.value }))}
            placeholder="Contoh: KANTOR KEMENTERIAN AGAMA KABUPATEN SERAM BAGIAN TIMUR"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase text-slate-900 dark:text-slate-100"
          />
          <p className="text-[10px] text-slate-400 mt-1">Baris ke-2 kop surat. Jika kosong, akan otomatis dibuat dari nama Kota/Kabupaten.</p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tingkat 3: Nama Resmi Madrasah / Satuan Kerja <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={schoolData.schoolName}
            onChange={e => setSchoolData(s => ({ ...s, schoolName: e.target.value }))}
            placeholder="Contoh: MAN 2 SERAM BAGIAN TIMUR"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold uppercase text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Singkat / Akronim</label>
          <input
            type="text"
            value={schoolData.schoolShortName || ''}
            onChange={e => setSchoolData(s => ({ ...s, schoolShortName: e.target.value }))}
            placeholder="Contoh: MAN 2 SBT"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jenjang</label>
            <select
              value={schoolData.schoolLevel || 'MA'}
              onChange={e => setSchoolData(s => ({ ...s, schoolLevel: e.target.value as any }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              <option value="MI">MI (Madrasah Ibtidaiyah)</option>
              <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
              <option value="MA">MA (Madrasah Aliyah)</option>
              <option value="MAK">MAK (Kejuruan)</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Akreditasi</label>
            <select
              value={schoolData.accreditation || 'A'}
              onChange={e => setSchoolData(s => ({ ...s, accreditation: e.target.value as any }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
            >
              <option value="A">A (Unggul)</option>
              <option value="B">B (Baik)</option>
              <option value="C">C (Cukup)</option>
              <option value="BELUM">Belum Terakreditasi</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NSM (Nomor Statistik Madrasah)</label>
          <input
            type="text"
            value={schoolData.nsm || ''}
            onChange={e => setSchoolData(s => ({ ...s, nsm: e.target.value }))}
            placeholder="1211..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NPSN (Nomor Pokok Sekolah Nasional)</label>
          <input
            type="text"
            value={schoolData.npsn || ''}
            onChange={e => setSchoolData(s => ({ ...s, npsn: e.target.value }))}
            placeholder="2058..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Tingkat 4: Alamat Jalan & Nomor Satuan Kerja
          </label>
          <input
            type="text"
            value={schoolData.address || ''}
            onChange={e => setSchoolData(s => ({ ...s, address: e.target.value }))}
            placeholder="Jl. dr. Sugiono – Kelapa Dua"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kecamatan</label>
            <input
              type="text"
              value={schoolData.district || ''}
              onChange={e => setSchoolData(s => ({ ...s, district: e.target.value }))}
              placeholder="Bula"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kota / Kabupaten</label>
            <input
              type="text"
              value={schoolData.regency || ''}
              onChange={e => setSchoolData(s => ({ ...s, regency: e.target.value }))}
              placeholder="Seram Bagian Timur"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Provinsi</label>
            <input
              type="text"
              value={schoolData.province || ''}
              onChange={e => setSchoolData(s => ({ ...s, province: e.target.value }))}
              placeholder="Maluku"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kode Pos</label>
            <input
              type="text"
              value={schoolData.postalCode || ''}
              onChange={e => setSchoolData(s => ({ ...s, postalCode: e.target.value }))}
              placeholder="97554"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Kepala Madrasah</label>
          <input
            type="text"
            value={schoolData.headmasterName || ''}
            onChange={e => setSchoolData(s => ({ ...s, headmasterName: e.target.value }))}
            placeholder="Drs. H. Muhammad Ilyas, M.Pd"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NIP Kepala Madrasah</label>
          <input
            type="text"
            value={schoolData.headmasterNip || ''}
            onChange={e => setSchoolData(s => ({ ...s, headmasterNip: e.target.value }))}
            placeholder="19700101 199503 1 001"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Headmaster Signature & Madrasah Stamp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Headmaster Signature */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tanda Tangan Kepala Madrasah</span>
            <button
              type="button"
              onClick={() => setIsHeadmasterSigModalOpen(true)}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
            >
              {schoolData.headmasterSignatureUrl ? 'Ubah' : '+ Tambah'}
            </button>
          </div>
          {schoolData.headmasterSignatureUrl ? (
            <div className="h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">
              <img
                src={schoolData.headmasterSignatureUrl}
                alt="Tanda Tangan Kepala"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">Belum diatur (Opsional)</p>
          )}
        </div>

        {/* Madrasah Stamp / Cap */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cap / Stempel Resmi Madrasah</span>
            <button
              type="button"
              onClick={() => setIsStampModalOpen(true)}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
            >
              {schoolData.stampImageUrl ? 'Ubah' : '+ Upload Stempel'}
            </button>
          </div>
          {schoolData.stampImageUrl ? (
            <div className="h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">
              <img
                src={schoolData.stampImageUrl}
                alt="Stempel Madrasah"
                className="max-h-full max-w-full object-contain -rotate-6 opacity-85"
              />
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">Belum diatur (Opsional)</p>
          )}
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
        >
          <FloppyDisk className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Identitas Madrasah'}
        </button>
      </div>
    </form>
  );
};
