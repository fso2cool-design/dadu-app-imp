import React, { useState } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  FileEdit,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Subject,
  TeacherMonthlyAttendanceItem,
} from '../../types';

interface AddTeacherAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: TeacherMonthlyAttendanceItem) => void;
  availableTeachers: { id: string; name: string }[];
  availableSubjects: Subject[];
  regularClassTeachers: { id: string; name: string }[];
  monthName?: string;
  year?: number;
}

export const AddTeacherAttendanceModal: React.FC<AddTeacherAttendanceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  availableTeachers,
  availableSubjects,
  regularClassTeachers,
  monthName,
  year,
}) => {
  const [isSubstitute, setIsSubstitute] = useState<boolean>(true);

  // Teacher Selection
  const [teacherMode, setTeacherMode] = useState<'SELECT' | 'CUSTOM'>('SELECT');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    availableTeachers[0]?.id || ''
  );
  const [customTeacherName, setCustomTeacherName] = useState<string>('');

  // Substitute Target
  const [substituteTarget, setSubstituteTarget] = useState<string>(
    regularClassTeachers[0]?.name || ''
  );

  // Subject Selection
  const [subjectMode, setSubjectMode] = useState<'SELECT' | 'CUSTOM'>('SELECT');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    availableSubjects[0]?.id || ''
  );
  const [customSubjectName, setCustomSubjectName] = useState<string>('');

  // Numbers
  const [targetMeetings, setTargetMeetings] = useState<number>(4);
  const [hadir, setHadir] = useState<number>(4);
  const [sakit, setSakit] = useState<number>(0);
  const [izin, setIzin] = useState<number>(0);
  const [alpa, setAlpa] = useState<number>(0);
  const [dinas, setDinas] = useState<number>(0);

  // Notes
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleApplyPresetNote = (preset: string) => {
    setNotes(prev => (prev ? `${prev}; ${preset}` : preset));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalTeacherId = '';
    let finalTeacherName = '';

    if (teacherMode === 'SELECT') {
      const found = availableTeachers.find(t => t.id === selectedTeacherId);
      finalTeacherId = selectedTeacherId || `teacher_${Date.now()}`;
      finalTeacherName = found?.name || 'Guru Pengganti';
    } else {
      if (!customTeacherName.trim()) {
        alert('Silakan masukkan nama guru.');
        return;
      }
      finalTeacherId = `custom_t_${Date.now()}`;
      finalTeacherName = customTeacherName.trim();
    }

    let finalSubjectId = '';
    let finalSubjectName = '';
    let finalSubjectCode: string | undefined = undefined;

    if (subjectMode === 'SELECT') {
      const found = availableSubjects.find(s => s.id === selectedSubjectId);
      finalSubjectId = selectedSubjectId || `sub_${Date.now()}`;
      finalSubjectName = found?.name || 'Mata Pelajaran';
      finalSubjectCode = found?.code;
    } else {
      if (!customSubjectName.trim()) {
        alert('Silakan masukkan nama mata pelajaran.');
        return;
      }
      finalSubjectId = `custom_s_${Date.now()}`;
      finalSubjectName = customSubjectName.trim();
    }

    const uniqueItemId = `manual_${finalTeacherId}_${finalSubjectId}_${Date.now()}`;

    onAdd({
      id: uniqueItemId,
      teacherId: finalTeacherId,
      teacherName: finalTeacherName,
      subjectId: finalSubjectId,
      subjectName: finalSubjectName,
      subjectCode: finalSubjectCode,
      targetMeetings: Math.max(1, Number(targetMeetings) || 1),
      hadir: Math.max(0, Number(hadir) || 0),
      sakit: Math.max(0, Number(sakit) || 0),
      izin: Math.max(0, Number(izin) || 0),
      alpa: Math.max(0, Number(alpa) || 0),
      dinas: Math.max(0, Number(dinas) || 0),
      notes: notes.trim(),
      isManual: true,
      isSubstitute,
      substituteForTeacherName: isSubstitute && substituteTarget.trim() ? substituteTarget.trim() : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#141722] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-[#232838] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#232838] flex items-center justify-between bg-slate-50/50 dark:bg-[#181d2a]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambah Baris Guru / Mapel Pengganti (Inval)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Rekap Periode: <span className="font-semibold text-slate-700 dark:text-slate-300">{monthName || 'Bulan Berjalan'} {year || ''}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1f2536] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. Kategori */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Kategori Penugasan di Bulan Ini
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSubstitute(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSubstitute
                    ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#181d2a] border-slate-200 dark:border-[#282e42] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Guru Inval / Pengganti</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Guru piket / pengganti yang mengisi jam guru kelas yang berhalangan
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsSubstitute(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  !isSubstitute
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-[#181d2a] border-slate-200 dark:border-[#282e42] text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Jadwal Khusus / Luar Master</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  Mapel ekstra, muatan lokal, atau guru yang belum sempat ter-plot
                </p>
              </button>
            </div>
          </div>

          {/* Kolom Target Pengganti jika Guru Inval */}
          {isSubstitute && (
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
              <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
                Menggantikan Guru Siapa di Buku Jurnal? (Opsional)
              </label>
              <div className="flex gap-2">
                {regularClassTeachers.length > 0 ? (
                  <select
                    value={substituteTarget}
                    onChange={(e) => setSubstituteTarget(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="">-- Pilih Guru Kelas yang Digantikan --</option>
                    {regularClassTeachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={substituteTarget}
                    onChange={(e) => setSubstituteTarget(e.target.value)}
                    placeholder="Ketik nama guru yang digantikan..."
                    className="w-full px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* 2. Guru yang Mengajar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Guru yang Mengajar / Hadir
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTeacherMode('SELECT')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    teacherMode === 'SELECT'
                      ? 'bg-orange-100 text-orange-800 dark:bg-cyan-500/20 dark:text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Pilih dari Master
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setTeacherMode('CUSTOM')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    teacherMode === 'CUSTOM'
                      ? 'bg-orange-100 text-orange-800 dark:bg-cyan-500/20 dark:text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Ketik Nama Manual
                </button>
              </div>
            </div>

            {teacherMode === 'SELECT' ? (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customTeacherName}
                onChange={(e) => setCustomTeacherName(e.target.value)}
                placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Pd.I (Guru Piket)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            )}
          </div>

          {/* 3. Mata Pelajaran */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mata Pelajaran
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSubjectMode('SELECT')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    subjectMode === 'SELECT'
                      ? 'bg-orange-100 text-orange-800 dark:bg-cyan-500/20 dark:text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Pilih Mapel
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setSubjectMode('CUSTOM')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    subjectMode === 'CUSTOM'
                      ? 'bg-orange-100 text-orange-800 dark:bg-cyan-500/20 dark:text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Ketik Mapel
                </button>
              </div>
            </div>

            {subjectMode === 'SELECT' ? (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                placeholder="Contoh: Bahasa Arab / Bimbingan Konseling"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            )}
          </div>

          {/* 4. Target Pertemuan & Hadir */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#181d2a] border border-slate-200 dark:border-[#282e42]">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Pertemuan (Bulan Ini)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={targetMeetings}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setTargetMeetings(val);
                  setHadir(val);
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#333b52] bg-white dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                Jumlah Hadir (H)
              </label>
              <input
                type="number"
                min="0"
                max={targetMeetings}
                value={hadir}
                onChange={(e) => setHadir(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-[#1b2030] text-emerald-700 dark:text-emerald-300 font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Angka Sakit / Izin / Alpa */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                Sakit (S)
              </label>
              <input
                type="number"
                min="0"
                value={sakit}
                onChange={(e) => setSakit(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#1b2030] text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-blue-700 dark:text-blue-400 mb-0.5">
                Izin (I)
              </label>
              <input
                type="number"
                min="0"
                value={izin}
                onChange={(e) => setIzin(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-[#1b2030] text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-rose-700 dark:text-rose-400 mb-0.5">
                Alpa (A)
              </label>
              <input
                type="number"
                min="0"
                value={alpa}
                onChange={(e) => setAlpa(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#1b2030] text-center font-bold"
              />
            </div>
          </div>

          {/* 5. Catatan Jurnal & Presets */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Catatan Jurnal / Keterangan Ketidakhadiran
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Mengisi jam ke-3 s.d 4 (Pak Budi sakit); materi Bab 3 tuntas"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] bg-slate-50 dark:bg-[#1b2030] text-slate-900 dark:text-slate-100 focus:outline-none"
            />

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                'Guru Piket Inval',
                'Tukar Jam Pelajaran',
                'Jam ke-1 s.d 2',
                'Jam ke-3 s.d 4',
                'Tugas Mandiri',
                'Sakit (Surat Dokter)',
                'Izin Dinas MGMP',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleApplyPresetNote(chip)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#202738] hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#232838] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#282e42] hover:bg-slate-50 dark:hover:bg-[#1c2232] text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Tambahkan Baris ke Rekap</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
