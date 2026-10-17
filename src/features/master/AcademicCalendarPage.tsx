import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AttendanceSettings, CustomHoliday, SchoolDaysOption } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formatShortDate, dateToLocalISO, getTodayISO } from '../../utils/date';
import {
  CalendarBlank,
  CalendarDots,
  Clock,
  Check,
  Plus,
  Trash,
  FloppyDisk,
  Info,
  WarningCircle,
  Sparkle,
} from '@phosphor-icons/react';

export const AcademicCalendarPage: React.FC = () => {
  const { attendanceSettings, updateAttendanceSettings, triggerSyncFeedback } = useWorkspace();
  const { success: toastSuccess, error: toastError } = useToast();

  const [schoolDaysOption, setSchoolDaysOption] = useState<SchoolDaysOption>(
    attendanceSettings.schoolDaysOption || 6,
  );
  const [holidays, setHolidays] = useState<CustomHoliday[]>(
    attendanceSettings.holidays || [],
  );

  // New holiday form
  // Local calendar day (not UTC) so the default never shifts to the previous day.
  const todayStr = getTodayISO();
  const [newStartDate, setNewStartDate] = useState<string>(todayStr);
  const [newEndDate, setNewEndDate] = useState<string>(todayStr);
  const [newDescription, setNewDescription] = useState<string>('');
  const [isRange, setIsRange] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Synchronize with context updates, but never discard an unsaved draft.
  // A field follows the new saved value only if the draft still equals the previously saved value.
  const prevSavedRef = useRef({
    schoolDaysOption: (attendanceSettings.schoolDaysOption || 6) as SchoolDaysOption,
    holidays: attendanceSettings.holidays || [],
  });
  useEffect(() => {
    const prev = prevSavedRef.current;
    const nextOption = (attendanceSettings.schoolDaysOption || 6) as SchoolDaysOption;
    const nextHolidays = attendanceSettings.holidays || [];
    prevSavedRef.current = { schoolDaysOption: nextOption, holidays: nextHolidays };
    setSchoolDaysOption((cur) => (cur === prev.schoolDaysOption ? nextOption : cur));
    setHolidays((cur) =>
      JSON.stringify(cur) === JSON.stringify(prev.holidays) ? nextHolidays : cur,
    );
  }, [attendanceSettings]);

  // Check dirty state
  const isDirty =
    schoolDaysOption !== (attendanceSettings.schoolDaysOption || 6) ||
    JSON.stringify(holidays) !== JSON.stringify(attendanceSettings.holidays || []);

  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    if (!isRange || val > newEndDate) {
      setNewEndDate(val);
    }
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      setFormError('Keterangan / deskripsi hari libur wajib diisi.');
      return;
    }

    if (isRange && newEndDate < newStartDate) {
      setFormError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    const newHolidayItem: CustomHoliday = {
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      startDate: newStartDate,
      endDate: isRange ? newEndDate : newStartDate,
      description: newDescription.trim(),
      createdAt: new Date().toISOString(),
    };

    setHolidays((prev) =>
      [...prev, newHolidayItem].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    );
    setNewDescription('');
    setFormError(null);
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const holidayPresets = [
    'Hari Santri Nasional',
    'Hari Guru Nasional',
    'Libur Awal Ramadhan',
    'Libur Hari Raya Idul Fitri',
    'Libur Hari Raya Idul Adha',
    'Kegiatan Porseni / Classmeeting',
    'Libur Semester Ganjil',
    'Libur Semester Genap',
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated: AttendanceSettings = {
        schoolDaysOption,
        holidays,
        updatedAt: new Date().toISOString(),
      };

      await updateAttendanceSettings(updated);
      triggerSyncFeedback('saved', 'Pengaturan hari belajar dan libur tersimpan');
      toastSuccess('Pengaturan hari belajar & kalender libur berhasil disimpan.');
    } catch (err) {
      console.error('Error saving attendance settings:', err);
      toastError('Gagal menyimpan pengaturan kalender.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToSaved = () => {
    setSchoolDaysOption(attendanceSettings.schoolDaysOption || 6);
    setHolidays(attendanceSettings.holidays || []);
    setFormError(null);
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return formatShortDate(dateToLocalISO(d));
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-[var(--ds-surface-elevated)] rounded-2xl border border-[var(--ds-border)] shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-accent-primary-soft text-accent-text border border-accent-primary-border">
            <CalendarDots className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Kalender & Hari Belajar Madrasah
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pusat pengelolaan sistem hari belajar mingguan (5 vs 6 hari) serta jadwal hari libur kustom madrasah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {isDirty && (
            <button
              type="button"
              onClick={handleResetToSaved}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-semibold text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)] rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            id="btn-save-calendar-settings"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
              isDirty
                ? 'btn-primary active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <FloppyDisk className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan' : 'Tersimpan'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-[var(--ds-surface-elevated)] rounded-2xl border border-[var(--ds-border)] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)] block">
            Sistem Hari Belajar
          </span>
          <p className="text-base font-bold text-[var(--ds-text)] mt-1">
            {schoolDaysOption === 6 ? '6 Hari Belajar' : '5 Hari Belajar'}
          </p>
          <span className="text-[11px] text-[var(--ds-text-muted)] mt-0.5 block">
            {schoolDaysOption === 6 ? 'Senin – Sabtu Aktif KBM' : 'Senin – Jumat Aktif, Sabtu Libur'}
          </span>
        </div>

        <div className="p-4 bg-[var(--ds-surface-elevated)] rounded-2xl border border-[var(--ds-border)] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)] block">
            Hari Libur Kustom
          </span>
          <p className="text-base font-bold text-[var(--ds-text)] mt-1">
            {holidays.length} Agenda Libur
          </p>
          <span className="text-[11px] text-[var(--ds-text-muted)] mt-0.5 block">
            Terdaftar di kalender madrasah
          </span>
        </div>

        <div className="p-4 bg-[var(--ds-surface-elevated)] rounded-2xl border border-[var(--ds-border)] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)] block">
            Cakupan Modul
          </span>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            Sinkron Seluruh Modul
          </p>
          <span className="text-[11px] text-[var(--ds-text-muted)] mt-0.5 block">
            Presensi mapel & presensi wali kelas
          </span>
        </div>
      </div>

      {/* SECTION 1: 5-Day vs 6-Day School */}
      <div className="bg-[var(--ds-surface-elevated)] p-5 rounded-2xl border border-[var(--ds-border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--ds-border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--ds-text)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--ds-accent)]" />
              Sistem Hari Belajar Mingguan
            </h3>
            <p className="text-xs text-[var(--ds-text-muted)] mt-0.5">
              Tentukan apakah madrasah memberlakukan 6 hari sekolah (Senin–Sabtu) atau 5 hari sekolah (Senin–Jumat).
            </p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] font-bold border border-[var(--ds-border)]">
            {schoolDaysOption === 6 ? 'Opsi 6 Hari Aktif' : 'Opsi 5 Hari Aktif'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Option 6 Days */}
          <div
            id="opt-school-days-6"
            onClick={() => setSchoolDaysOption(6)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              schoolDaysOption === 6
                ? 'border-[var(--ds-accent)] bg-[var(--ds-surface-muted)] shadow-sm'
                : 'border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[var(--ds-text)] flex items-center gap-1.5">
                  6 Hari (Senin – Sabtu)
                </span>
                {schoolDaysOption === 6 && (
                  <span className="w-5 h-5 rounded-full bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ds-text-muted)] leading-relaxed">
                Hari Sabtu tetap dihitung sebagai <strong>hari belajar aktif</strong>. Hanya hari Minggu yang diperlakukan sebagai libur akhir pekan otomatis.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[var(--ds-border)]">
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                ★ Rekomendasi Standar Madrasah & Pesantren
              </span>
            </div>
          </div>

          {/* Option 5 Days */}
          <div
            id="opt-school-days-5"
            onClick={() => setSchoolDaysOption(5)}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
              schoolDaysOption === 5
                ? 'border-[var(--ds-accent)] bg-[var(--ds-surface-muted)] shadow-sm'
                : 'border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] hover:border-[var(--ds-accent)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[var(--ds-text)] flex items-center gap-1.5">
                  5 Hari (Senin – Jumat)
                </span>
                {schoolDaysOption === 5 && (
                  <span className="w-5 h-5 rounded-full bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--ds-text-muted)] leading-relaxed">
                Hari <strong>Sabtu dan Minggu</strong> otomatis diperlakukan sebagai hari libur akhir pekan.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[var(--ds-border)]">
              <span className="text-[10px] font-semibold text-[var(--ds-text-muted)] bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded-md">
                Sekolah Sistem Full Day (Senin–Jumat)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Custom Holidays Manager */}
      <div className="bg-[var(--ds-surface-elevated)] p-5 rounded-2xl border border-[var(--ds-border)] shadow-xs space-y-5">
        <div className="border-b border-[var(--ds-border)] pb-3">
          <h3 className="text-sm font-bold text-[var(--ds-text)] flex items-center gap-2">
            <CalendarBlank className="w-4 h-4 text-[var(--ds-accent)]" />
            Daftar Hari Libur Kustom Madrasah & Nasional
          </h3>
          <p className="text-xs text-[var(--ds-text-muted)] mt-0.5">
            Tambahkan tanggal libur khusus (seperti Hari Santri, Libur Awal Ramadhan, Hari Guru, atau kegiatan jeda semester).
          </p>
        </div>

        {/* Form to add custom holiday */}
        <form onSubmit={handleAddHoliday} className="bg-[var(--ds-surface-muted)] p-4 sm:p-5 rounded-2xl border border-[var(--ds-border)] space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--ds-text)]">Tambah Hari Libur Baru</span>
            <label className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={isRange}
                onChange={(e) => {
                  setIsRange(e.target.checked);
                  if (!e.target.checked) setNewEndDate(newStartDate);
                }}
                className="rounded-sm accent-[var(--ds-accent)] cursor-pointer"
              />
              <span>Rentang beberapa hari</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ds-text-muted)] mb-1">
                {isRange ? 'Tanggal Mulai Libur' : 'Tanggal Libur'}
              </label>
              <input
                type="date"
                id="input-holiday-start-date"
                value={newStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] font-medium focus:ring-2 focus:ring-[var(--ds-accent)]"
              />
            </div>

            {isRange && (
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ds-text-muted)] mb-1">
                  Tanggal Selesai Libur
                </label>
                <input
                  type="date"
                  id="input-holiday-end-date"
                  value={newEndDate}
                  min={newStartDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] font-medium focus:ring-2 focus:ring-[var(--ds-accent)]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--ds-text-muted)] mb-1">
              Keterangan / Deskripsi Libur
            </label>
            <input
              type="text"
              id="input-holiday-description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Contoh: Hari Santri Nasional, Libur Awal Ramadhan 1448 H..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] placeholder-[var(--ds-text-muted)] focus:ring-2 focus:ring-[var(--ds-accent)]"
            />
          </div>

          {/* Suggestions Chips */}
          <div>
            <span className="block text-[10px] text-[var(--ds-text-muted)] mb-1.5 font-medium">
              Contoh Cepat (Klik untuk memilih):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {holidayPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewDescription(preset)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] hover:border-[var(--ds-accent)] hover:text-[var(--ds-accent)] transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {formError && (
            <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
              <WarningCircle className="w-3.5 h-3.5" />
              {formError}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              id="btn-add-holiday"
              className="px-4 py-2 bg-[var(--ds-accent)] hover:opacity-90 text-[var(--ds-accent-fg)] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambahkan ke Kalender</span>
            </button>
          </div>
        </form>

        {/* List of Custom Holidays */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--ds-text)]">
            <span>Daftar Hari Libur Terdaftar ({holidays.length})</span>
            {holidays.length > 0 && (
              <button
                type="button"
                id="btn-clear-all-holidays"
                onClick={() => setHolidays([])}
                className="text-[11px] text-rose-500 hover:underline cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {holidays.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-[var(--ds-border)] text-center text-[var(--ds-text-muted)] text-xs bg-[var(--ds-surface-muted)]">
              <CalendarBlank className="w-8 h-8 mx-auto mb-2 text-[var(--ds-text-muted)] opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada hari libur kustom yang ditambahkan.</p>
              <p className="text-[11px] text-[var(--ds-text-muted)] mt-1 max-w-md mx-auto">
                Tambahkan jadwal libur di atas untuk menandai tanggal non-efektif secara otomatis di modul presensi guru dan wali kelas.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {holidays.map((h) => {
                const isSingleDay = !h.endDate || h.startDate === h.endDate;
                return (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-[var(--ds-accent)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center shrink-0">
                        <CalendarBlank className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--ds-text)] truncate">
                          {h.description}
                        </p>
                        <p className="text-[11px] text-[var(--ds-text-muted)] mt-0.5">
                          {isSingleDay
                            ? formatDateIndo(h.startDate)
                            : `${formatDateIndo(h.startDate)} s.d. ${formatDateIndo(h.endDate)}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.id)}
                      className="p-2 rounded-lg text-[var(--ds-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title="Hapus hari libur ini"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Informative Invariant Card */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Ketentuan Sumber Kebenaran Tunggal Kalender Madrasah:</p>
          <p className="text-[11px] leading-relaxed">
            Pengaturan di halaman ini tersimpan pada dokumen konfigurasi kehadiran madrasah dan menjadi rujukan tunggal untuk deteksi hari libur (<code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">checkIsHoliday</code>) pada presensi harian siswa, presensi mengajar guru per tatap muka, dan rekap matriks bulanan.
          </p>
        </div>
      </div>
    </div>
  );
};
