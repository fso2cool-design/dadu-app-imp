import React from 'react';
import {
  Palette,
  Sun,
  Moon,
  CaretDown,
  CheckCircle,
  Eye,
  Info,
  Sparkle,
  CalendarBlank,
  FloppyDisk,
} from '@phosphor-icons/react';
import { useDesignSystem } from '../../../context/DesignSystemContext';
import { useAppTheme, THEME_OPTIONS } from '../../../context/ThemeContext';
import { DESIGN_SYSTEMS } from '../../../types';
import { APP_CONFIG } from '../../../constants/app';
import { APP_CHANGELOGS } from '../../../constants/changelog';
import type { PreferencesTabProps } from './types';

export const PreferencesTab: React.FC<PreferencesTabProps> = ({
  preferencesData,
  setPreferencesData,
  attendanceSettings,
  saving,
  onSubmit,
  isHolidayModalOpen,
  setIsHolidayModalOpen,
  isChangeLogModalOpen,
  setIsChangeLogModalOpen,
  onSuccess,
}) => {
  const { activeSystem, setSystem, applyAndSaveSystem, mode, applyAndSaveMode } = useDesignSystem();
  const { activeTheme, setTheme, applyAndSaveTheme, isDark } = useAppTheme();

  const [selectedTheme, setSelectedTheme] = React.useState(activeTheme);
  const [previewMode, setPreviewMode] = React.useState<'light' | 'dark'>(mode);

  const currentPreviewOption = THEME_OPTIONS.find(t => t.id === selectedTheme) || THEME_OPTIONS[0];
  const activeDS = DESIGN_SYSTEMS.find(ds => ds.id === selectedTheme) || DESIGN_SYSTEMS[1];
  const isSelectedDark = previewMode === 'dark';

  const previewColors = isSelectedDark ? activeDS.tokens.darkColors : activeDS.tokens.colors;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Preferensi Workspace & Personalisasi Tema</h3>
        <p className="text-[11px] text-slate-400">Sesuaikan semester default dan pilih tema visual workspace Anda.</p>
      </div>

      {/* Semester Bawaan Form */}
      <form onSubmit={onSubmit} className="space-y-4 max-w-lg p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
          Pengaturan Alur Kerja Dasar
        </span>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Semester Bawaan Saat Membuka Modul</label>
          <select
            value={preferencesData.defaultSemester}
            onChange={e => setPreferencesData(p => ({ ...p, defaultSemester: e.target.value as any }))}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium"
          >
            <option value="GANJIL">Semester Ganjil (1)</option>
            <option value="GENAP">Semester Genap (2)</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">Semester yang otomatis aktif saat membuka modul presensi dan nilai.</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all"
          >
            <FloppyDisk className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Preferensi Workspace'}
          </button>
        </div>
      </form>

      {/* Kalender & Hari Libur Madrasah Card */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider flex items-center gap-2">
              <CalendarBlank className="w-4 h-4 text-orange-500 dark:text-cyan-400" />
              Sistem Hari Belajar & Kalender Libur Madrasah
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Atur kebijakan 5 hari vs 6 hari sekolah (apakah Sabtu aktif KBM atau libur) serta daftar tanggal libur khusus madrasah.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsHolidayModalOpen(true)}
            className="px-4 py-2 bg-white dark:bg-[#141722] hover:bg-slate-100 dark:hover:bg-[#1c2130] border border-slate-300 dark:border-[#232838] text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <CalendarBlank className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />
            <span>Kelola Kalender & Libur</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-white dark:bg-[#141722] rounded-xl border border-slate-200/70 dark:border-[#232838]">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Sistem Belajar Mingguan</span>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {attendanceSettings.schoolDaysOption === 6 ? '6 Hari (Senin – Sabtu Aktif KBM)' : '5 Hari (Senin – Jumat Aktif, Sabtu Libur)'}
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-[#141722] rounded-xl border border-slate-200/70 dark:border-[#232838]">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Hari Libur Kustom Terdaftar</span>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {attendanceSettings.holidays?.length || 0} Tanggal / Agenda Libur Khusus
            </p>
          </div>
        </div>
      </div>

      {/* Visual Theme Selector Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Pilihan Tema & Mode Tampilan
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                applyAndSaveTheme(selectedTheme);
                applyAndSaveMode(previewMode);
                onSuccess('Tema visual dan mode tampilan berhasil diterapkan dan disimpan!');
              }}
              disabled={selectedTheme === activeTheme && previewMode === mode}
              style={selectedTheme !== activeTheme ? {
                backgroundColor: currentPreviewOption.accentHex,
                color: currentPreviewOption.buttonText,
              } : undefined}
              className={`tactile-press flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                selectedTheme !== activeTheme
                  ? 'shadow-sm active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <FloppyDisk className="w-4 h-4" />
              <span>{selectedTheme === activeTheme && previewMode === mode ? 'Tema & Mode Aktif' : 'Terapkan & Simpan'}</span>
            </button>
          </div>
        </div>

        {/* 3-Column Design System Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
          {/* Left Column: Dropdown Controls, Mode Selector & Philosophy */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Pilih Desain Tema
                </label>
                <div className="relative">
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold shadow-2xs appearance-none cursor-pointer focus:ring-2 focus:ring-(--focus-ring) focus:outline-none"
                  >
                    {THEME_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <CaretDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Mode Terang / Gelap Switcher */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Mode Tampilan
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('light')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      previewMode === 'light'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200 shadow-xs ring-1 ring-amber-300 dark:ring-amber-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Mode Terang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('dark')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      previewMode === 'dark'
                        ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-300 dark:ring-indigo-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Mode Gelap</span>
                  </button>
                </div>
              </div>

              {/* Theme Philosophy & Guidance Badge */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {isSelectedDark ? '🌙 Mode Gelap' : '☀️ Mode Terang'}
                  </span>
                  {selectedTheme === activeTheme && previewMode === mode && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Sedang Digunakan
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {currentPreviewOption.tagline}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {currentPreviewOption.description}
                </p>
              </div>
            </div>

            {/* Micro Palette Swatches */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Palet Utama ({isSelectedDark ? 'Gelap' : 'Terang'}):
              </span>
              <div className="flex items-center gap-1.5">
                {[previewColors.surface, previewColors.surfaceElevated, previewColors.accent, previewColors.text].map((color, idx) => (
                  <span
                    key={idx}
                    style={{ backgroundColor: color }}
                    className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 shadow-2xs inline-block"
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Live Mini Preview Widget */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" style={{ color: previewColors.accent }} />
                Pratinjau Komponen Miniatur
              </span>
              <span className="text-[10px] text-slate-400">Interaktif & Real-time</span>
            </div>

            {/* Mini Mockup Container with exact preview colors */}
            <div
              style={{
                backgroundColor: previewColors.surface,
                borderColor: previewColors.border
              }}
              className="flex-1 p-4 rounded-2xl border transition-colors duration-200 flex flex-col justify-between space-y-3 shadow-inner"
            >
              {/* Mini Header */}
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      backgroundColor: previewColors.accent,
                      color: previewColors.accentFg
                    }}
                    className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold shadow-2xs"
                  >
                    D
                  </div>
                  <span
                    style={{ color: previewColors.text }}
                    className="text-xs font-bold"
                  >
                    DADU Madrasah
                  </span>
                </div>
                <span
                  style={{ backgroundColor: previewColors.accent }}
                  className="w-2 h-2 rounded-full animate-pulse"
                />
              </div>

              {/* Mini Grade Card */}
              <div
                style={{
                  backgroundColor: previewColors.surfaceElevated,
                  borderColor: previewColors.border
                }}
                className="p-3 rounded-xl border shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: previewColors.textMuted }}
                    className="text-[11px] font-semibold"
                  >
                    Penilaian Harian (PH-1)
                  </span>
                  <span
                    style={{
                      backgroundColor: isSelectedDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(4, 120, 87, 0.1)',
                      color: isSelectedDark ? '#6ee7b7' : '#047857'
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  >
                    TUNTAS
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span
                      style={{ color: previewColors.textMuted }}
                      className="text-[10px] block"
                    >
                      Nilai Rata-rata
                    </span>
                    <span
                      style={{ color: previewColors.text }}
                      className="text-base font-black tracking-tight"
                    >
                      95.0
                    </span>
                  </div>

                  {/* Mini Tactile Button with exact theme button text and bg */}
                  <button
                    type="button"
                    style={{
                      backgroundColor: previewColors.accent,
                      color: previewColors.accentFg
                    }}
                    className="tactile-press px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-2xs"
                  >
                    Lihat Rapor
                  </button>
                </div>
              </div>

              {/* Mini Micro Text / Status Pill */}
              <div className="flex items-center justify-between text-[10px] pt-1">
                <span style={{ color: previewColors.textMuted }}>
                  Ergonomi Kontras: <strong style={{ color: previewColors.accent }}>WCAG {isSelectedDark ? 'AAA' : 'AA'}</strong>
                </span>
                <span style={{ color: previewColors.textMuted }}>
                  {activeDS.name} ({isSelectedDark ? 'Mode Gelap' : 'Mode Terang'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Note */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Seluruh skema tema dirancang khusus dengan standar <strong>Anti-AI Slop</strong> dan rasio kontras tinggi, memastikan tampilan nyaman untuk mata guru saat bekerja di siang hari maupun lembur malam. Preferensi tersinkronisasi otomatis ke akun Firestore Anda.
          </p>
        </div>

        {/* Versi & Catatan Pembaruan Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Sparkle className="w-4 h-4 text-emerald-600 dark:text-cyan-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Versi Aplikasi: {APP_CONFIG.versionDisplay}
              </span>
              <span className="text-[10px] bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-cyan-300 px-2 py-0.5 rounded-md font-semibold border border-emerald-100 dark:border-slate-700">
                Rilis {APP_CHANGELOGS[0]?.releaseDate || APP_CONFIG.releaseDate}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Buka jendela Catatan Pembaruan (Change Log) untuk membaca fitur-fitur baru di versi ini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsChangeLogModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-700 dark:text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-emerald-200/80 dark:border-slate-700"
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Lihat Catatan Rilis</span>
          </button>
        </div>
      </div>
    </div>
  );
};
