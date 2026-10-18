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
import { useAppearance } from '../../../context/AppearanceContext';
import { APPEARANCE_PRESETS, type AppearancePresetKey } from '../../../types';
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
  const { activePreset, applyAndSavePreset, mode, applyAndSaveMode } = useAppearance();

  const [selectedPreset, setSelectedPreset] = React.useState<AppearancePresetKey>(activePreset);
  const [previewMode, setPreviewMode] = React.useState<'light' | 'dark'>(mode);

  const activeDS = APPEARANCE_PRESETS.find((ds) => ds.id === selectedPreset) || APPEARANCE_PRESETS[1];
  const isSelectedDark = previewMode === 'dark';

  const previewColors = isSelectedDark ? activeDS.colorModes.dark : activeDS.colorModes.light;

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Preferensi Workspace & Tampilan</h3>
        <p className="text-[11px] text-slate-400">Pilih gaya visual dan mode warna workspace Anda.</p>
      </div>

      {/* Status Periode Akademik & Kalender (Single Source of Truth: Data Master) */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 max-w-2xl">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider flex items-center gap-2">
          <CalendarBlank className="w-4 h-4 text-[var(--ds-accent)]" />
          Pengaturan Operasional Akademik & Kalender
        </span>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Tahun ajaran, semester aktif, serta kebijakan 5/6 hari belajar dan kalender libur madrasah dikelola secara terpusat melalui menu{' '}
          <strong className="text-[var(--ds-text)] font-semibold">Data Master &gt; Tahun Ajaran</strong> dan{' '}
          <strong className="text-[var(--ds-text)] font-semibold">Data Master &gt; Kalender & Libur</strong>.
        </p>
        <div className="pt-1">
          <span className="inline-block px-3 py-1.5 rounded-xl bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[11px] text-[var(--ds-text-muted)] font-medium">
            Pengaturan operasional akademik tidak lagi diatur ganda dari halaman Preferensi.
          </span>
        </div>
      </div>

      {/* Visual Theme Selector Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Preset Tampilan & Mode Warna
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                applyAndSavePreset(selectedPreset);
                applyAndSaveMode(previewMode);
                onSuccess('Preset gaya visual dan mode warna berhasil diterapkan dan disimpan!');
              }}
              disabled={selectedPreset === activePreset && previewMode === mode}
              style={selectedPreset !== activePreset ? {
                backgroundColor: previewColors.accent,
                color: previewColors.accentFg,
              } : undefined}
              className={`tactile-press flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                selectedPreset !== activePreset
                  ? 'shadow-sm active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <FloppyDisk className="w-4 h-4" />
              <span>{selectedPreset === activePreset && previewMode === mode ? 'Preset & Mode Aktif' : 'Terapkan & Simpan'}</span>
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
                  Preset Gaya Visual
                </label>
                <div className="relative">
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value as AppearancePresetKey)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold shadow-2xs appearance-none cursor-pointer focus:ring-2 focus:ring-(--focus-ring) focus:outline-none"
                  >
                    {APPEARANCE_PRESETS.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name}
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
                  Mode Warna
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
                    <span>Terang</span>
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
                    <span>Gelap</span>
                  </button>
                </div>
              </div>

              {/* Theme Philosophy & Guidance Badge */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {isSelectedDark ? '🌙 Gelap' : '☀️ Terang'}
                  </span>
                  {selectedPreset === activePreset && previewMode === mode && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Sedang Digunakan
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  {activeDS.tagline}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {activeDS.description}
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
                  {activeDS.name} ({isSelectedDark ? 'Gelap' : 'Terang'})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Information Note */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Seluruh skema preset dirancang khusus dengan standar <strong>Anti-AI Slop</strong> dan rasio kontras tinggi, memastikan tampilan nyaman untuk mata guru saat bekerja di siang hari maupun lembur malam. Preferensi tersinkronisasi otomatis ke akun Firestore Anda.
          </p>
        </div>

        {/* Versi & Catatan Pembaruan Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <Sparkle className="w-4 h-4 text-[var(--ds-accent)]" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Versi Aplikasi: {APP_CONFIG.versionDisplay}
              </span>
              <span className="text-[10px] bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] px-2 py-0.5 rounded-md font-semibold border border-[var(--ds-border)]">
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
            className="px-3.5 py-2 rounded-xl bg-[var(--ds-accent-soft)] hover:opacity-90 text-[var(--ds-accent)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-[var(--ds-border)]"
          >
            <Sparkle className="w-3.5 h-3.5" />
            <span>Lihat Catatan Rilis</span>
          </button>
        </div>
      </div>
    </div>
  );
};
