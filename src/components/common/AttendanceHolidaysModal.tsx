import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AttendanceSettings, CustomHoliday, SchoolDaysOption } from '../../types';
import { useToast } from '../../context/ToastContext';
import { CalendarBlank, Plus, Trash, CalendarDots, Clock, Check, FloppyDisk, Info, WarningCircle } from '@phosphor-icons/react';

interface AttendanceHolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceHolidaysModal: React.FC<AttendanceHolidaysModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { attendanceSettings, updateAttendanceSettings, triggerSyncFeedback } = useWorkspace();
  const { success: toastSuccess, error: toastError } = useToast();

  const [schoolDaysOption, setSchoolDaysOption] = useState<SchoolDaysOption>(attendanceSettings.schoolDaysOption || 6);
  const [holidays, setHolidays] = useState<CustomHoliday[]>(attendanceSettings.holidays || []);
  
  // New holiday form
  const todayStr = new Date().toISOString().split('T')[0];
  const [newStartDate, setNewStartDate] = useState<string>(todayStr);
  const [newEndDate, setNewEndDate] = useState<string>(todayStr);
  const [newDescription, setNewDescription] = useState<string>('');
  const [isRange, setIsRange] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSchoolDaysOption(attendanceSettings.schoolDaysOption || 6);
      setHolidays(attendanceSettings.holidays || []);
      setFormError(null);
    }
  }, [isOpen, attendanceSettings]);

  // Handle start date change
  const handleStartDateChange = (val: string) => {
    setNewStartDate(val);
    if (!isRange || val > newEndDate) {
      setNewEndDate(val);
    }
  };

  // Add new holiday
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      setFormError('Keterangan / deskripsi hari libur wajib diisi.');
      return;
    }

    if (newEndDate < newStartDate) {
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

    setHolidays(prev => [...prev, newHolidayItem].sort((a, b) => a.startDate.localeCompare(b.startDate)));
    setNewDescription('');
    setFormError(null);
  };

  // Remove holiday
  const handleRemoveHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  // Quick description chips
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

  // FloppyDisk all settings
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
      onClose();
    } catch (err) {
      console.error('Error saving attendance settings:', err);
      toastError('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Hari Belajar & Kalender Libur"
      subtitle="Atur hari efektif belajar mingguan (5 vs 6 hari) serta jadwal hari libur kustom madrasah"
      icon={<CalendarBlank className="w-5 h-5 text-[var(--ds-accent)]" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* SECTION 1: 5-Day vs 6-Day School */}
        <div className="bg-[var(--ds-surface-muted)] p-4 sm:p-5 rounded-2xl border border-[var(--ds-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-text)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--ds-accent)]" />
              Sistem Hari Belajar Mingguan
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] font-bold border border-[var(--ds-border)]">
              {schoolDaysOption === 6 ? '6 Hari Belajar' : '5 Hari Belajar'}
            </span>
          </div>

          <p className="text-xs text-[var(--ds-text-muted)]">
            Tentukan apakah madrasah memberlakukan 6 hari sekolah (Senin–Sabtu) atau 5 hari sekolah (Senin–Jumat).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Option 6 Days */}
            <div
              onClick={() => setSchoolDaysOption(6)}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                schoolDaysOption === 6
                  ? 'border-[var(--ds-accent)] bg-[var(--ds-surface-elevated)] shadow-sm'
                  : 'border-[var(--ds-border)] bg-[color-mix(in_srgb,var(--ds-surface-elevated)_60%,transparent)] hover:border-[var(--ds-accent)]'
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
                <p className="text-[11px] text-[var(--ds-text-muted)] leading-relaxed">
                  Hari Sabtu tetap dihitung sebagai <strong>hari belajar aktif</strong>. Hanya hari Minggu yang libur akhir pekan.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-[var(--ds-border)]">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  ★ Rekomendasi Standar Madrasah & Pesantren
                </span>
              </div>
            </div>

            {/* Option 5 Days */}
            <div
              onClick={() => setSchoolDaysOption(5)}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                schoolDaysOption === 5
                  ? 'border-[var(--ds-accent)] bg-[var(--ds-surface-elevated)] shadow-sm'
                  : 'border-[var(--ds-border)] bg-[color-mix(in_srgb,var(--ds-surface-elevated)_60%,transparent)] hover:border-[var(--ds-accent)]'
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
                <p className="text-[11px] text-[var(--ds-text-muted)] leading-relaxed">
                  Hari <strong>Sabtu dan Minggu</strong> otomatis diperlakukan sebagai hari libur akhir pekan.
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-[var(--ds-border)]">
                <span className="text-[10px] font-semibold text-[var(--ds-text-muted)] bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded-md">
                  Sekolah Sistem Full Day (Senin-Jumat)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Custom Holidays Manager */}
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--ds-text)] flex items-center gap-2">
              <CalendarDots className="w-4 h-4 text-[var(--ds-accent)]" />
              Daftar Hari Libur Kustom Madrasah & Nasional
            </span>
            <p className="text-xs text-[var(--ds-text-muted)] mt-0.5">
              Tambahkan tanggal libur khusus (seperti Hari Santri, Libur Awal Ramadhan, Hari Guru, atau kegiatan jeda semester).
            </p>
          </div>

          {/* Form to add custom holiday */}
          <form onSubmit={handleAddHoliday} className="bg-[var(--ds-surface-muted)] p-4 rounded-2xl border border-[var(--ds-border)] space-y-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ds-text-muted)] mb-1">
                  {isRange ? 'Tanggal Mulai Libur' : 'Tanggal Libur'}
                </label>
                <input
                  type="date"
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
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Contoh: Hari Santri Nasional, Libur Awal Ramadhan 1448 H..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] placeholder-[var(--ds-text-muted)] focus:ring-2 focus:ring-[var(--ds-accent)]"
              />
            </div>

            {/* Suggestions Chips */}
            <div>
              <span className="block text-[10px] text-[var(--ds-text-muted)] mb-1.5">
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
                className="px-3.5 py-1.5 bg-[var(--ds-accent)] hover:opacity-90 text-[var(--ds-accent-fg)] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-opacity cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambahkan ke Kalender</span>
              </button>
            </div>
          </form>

          {/* List of Custom Holidays */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--ds-text)]">
              <span>Daftar Hari Libur Terdaftar ({holidays.length})</span>
              {holidays.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHolidays([])}
                  className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            {holidays.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[var(--ds-border)] text-center text-[var(--ds-text-muted)] text-xs bg-[var(--ds-surface-muted)]">
                <CalendarDots className="w-6 h-6 mx-auto mb-1.5 text-[var(--ds-text-muted)]" />
                <p>Belum ada hari libur kustom yang ditambahkan.</p>
                <p className="text-[11px] text-[var(--ds-text-muted)] mt-0.5">
                  Tambahkan jadwal libur di atas untuk menandai tanggal non-efektif di modul presensi guru dan wali kelas.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {holidays.map((h) => {
                  const isSingleDay = !h.endDate || h.startDate === h.endDate;
                  return (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] flex items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 flex items-center justify-center shrink-0">
                          <CalendarBlank className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--ds-text)] truncate">
                            {h.description}
                          </p>
                          <p className="text-[10px] text-[var(--ds-text-muted)]">
                            {isSingleDay
                              ? formatDateIndo(h.startDate)
                              : `${formatDateIndo(h.startDate)} s.d. ${formatDateIndo(h.endDate)}`}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveHoliday(h.id)}
                        className="p-1.5 rounded-lg text-[var(--ds-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
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

        {/* Informative Note */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Pengaturan ini berlaku untuk seluruh madrasah: presensi harian wali kelas, presensi tatap muka guru mapel, dan rekap matriks kehadiran bulanan.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--ds-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)] hover:text-[var(--ds-text)] rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5 py-2.5 disabled:opacity-50 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FloppyDisk className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
