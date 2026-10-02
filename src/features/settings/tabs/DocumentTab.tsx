import React from 'react';
import { Buildings, FloppyDisk } from '@phosphor-icons/react';
import { DEFAULT_KEMENAG_LOGO } from '../../../components/common/OfficialDocumentHeader';
import type { DocumentTabProps } from './types';

export const DocumentTab: React.FC<DocumentTabProps> = ({
  documentData,
  setDocumentData,
  schoolData,
  saving,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Format & Tata Letak Dokumen Resmi</h3>
        <p className="text-[11px] text-slate-400">Pengaturan ukuran kertas standar, tata letak kop surat, dan posisi titimangsa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ukuran Kertas Standar</label>
          <select
            value={documentData.paperSize}
            onChange={e => setDocumentData(d => ({ ...d, paperSize: e.target.value as any }))}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            <option value="A4">A4 (210 x 297 mm)</option>
            <option value="F4">F4 / Folio (215 x 330 mm)</option>
            <option value="LETTER">US Letter (215 x 279 mm)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Orientasi Default</label>
          <select
            value={documentData.defaultOrientation}
            onChange={e => setDocumentData(d => ({ ...d, defaultOrientation: e.target.value as any }))}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            <option value="PORTRAIT">Tegak (Portrait)</option>
            <option value="LANDSCAPE">Mendatar (Landscape)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kota Titimangsa Tanda Tangan</label>
          <input
            type="text"
            value={documentData.city || ''}
            onChange={e => setDocumentData(d => ({ ...d, city: e.target.value }))}
            placeholder="Contoh: Bula / Surabaya"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Checkbox Toggles */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Fitur Dokumen Cetak</span>

        <label className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={documentData.headerEnabled}
            onChange={e => setDocumentData(d => ({ ...d, headerEnabled: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:text-cyan-500 dark:focus:ring-cyan-500"
          />
          <span>Sertakan Kop Surat Baku 4 Tingkat & Dual Logo (Kemenag & Madrasah)</span>
        </label>

        <label className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={documentData.signatureEnabled}
            onChange={e => setDocumentData(d => ({ ...d, signatureEnabled: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 dark:text-cyan-500 dark:focus:ring-cyan-500"
          />
          <span>Sertakan Kolom Tanda Tangan Resmi (Guru & Kepala Madrasah)</span>
        </label>
      </div>

      {/* Kop Surat Live Preview: Baku 4-Tier Standar Kemenag */}
      <div className="border border-slate-300 dark:border-slate-700 rounded-2xl p-6 bg-white text-slate-900 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pratinjau Kop Surat Baku (4 Tingkat + Dual Logo)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold font-mono">Format Dinas Resmi</span>
        </div>

        <div className="pb-3">
          <div className="flex items-center justify-between gap-3 text-center pb-2">
            {/* Left Logo: Kemenag */}
            <div className="w-18 flex items-center justify-center shrink-0">
              <img
                src={schoolData.kemenagLogoUrl || DEFAULT_KEMENAG_LOGO}
                alt="Logo Kemenag"
                className="w-16 h-16 max-w-full max-h-full object-contain"
              />
            </div>

            {/* 4-Tier Official Text */}
            <div className="flex-1 text-center px-2">
              {/* Tingkat 1 */}
              <h5 className="text-xs font-semibold tracking-wider uppercase text-slate-800 leading-tight">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </h5>
              {/* Tingkat 2 */}
              <h6 className="text-[11px] font-semibold tracking-wide uppercase text-slate-800 leading-tight mt-0.5">
                {schoolData.kemenagDistrict || (
                  schoolData.regency
                    ? `KANTOR KEMENTERIAN AGAMA KABUPATEN ${schoolData.regency.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, '')}`
                    : 'KANTOR KEMENTERIAN AGAMA KABUPATEN'
                )}
              </h6>
              {/* Tingkat 3 */}
              <h3 className="text-base font-black tracking-wide uppercase text-slate-950 my-1 leading-snug">
                {schoolData.schoolName || 'MAN 2 SERAM BAGIAN TIMUR'}
              </h3>
              {/* Tingkat 4: Alamat tanpa NSM/NPSN */}
              <p className="text-[11px] text-slate-700 leading-snug">
                {schoolData.address
                  ? `${schoolData.address}${schoolData.village ? `, ${schoolData.village}` : ''}${schoolData.district ? `, Kec. ${schoolData.district}` : ''}${schoolData.regency ? `, ${schoolData.regency}` : ''}${schoolData.province ? `, ${schoolData.province}` : ''}`
                  : 'Jl. dr. Sugiono – Kelapa Dua Kec. Bula, Kab. Seram Bagian Timur, Bula'}
              </p>
            </div>

            {/* Right Logo: Madrasah */}
            <div className="w-18 flex items-center justify-center shrink-0">
              {(schoolData.schoolLogoUrl || schoolData.logoUrl) ? (
                <img
                  src={schoolData.schoolLogoUrl || schoolData.logoUrl}
                  alt="Logo Madrasah"
                  className="w-16 h-16 max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                  <Buildings className="w-6 h-6 text-slate-400 mb-0.5" />
                  <span className="text-[8px] font-bold uppercase">Madrasah</span>
                </div>
              )}
            </div>
          </div>

          {/* Double Border Rule */}
          <div className="border-b-2 border-slate-950"></div>
          <div className="border-b border-slate-950 mt-0.5"></div>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
        >
          <FloppyDisk className="w-4 h-4" />
          {saving ? 'Menyimpan...' : 'Simpan Format Dokumen'}
        </button>
      </div>
    </form>
  );
};
