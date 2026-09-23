import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getEnrollmentsByClass } from '../../services/firestore/enrollments';
import { 
  getAttendanceRecordsByMeeting, 
  saveMeetingAttendance, 
  SaveAttendanceItem 
} from '../../services/firestore/attendance';
import { Modal } from '../../components/common/Modal';
import { Meeting, AttendanceStatus, AttendanceRecord } from '../../types';
import { 
  CheckSquare, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles, 
  Search,
  Users,
  Info
} from 'lucide-react';

interface SubjectAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedMeetingId: string) => void;
  meeting: Meeting | null;
}

interface StudentAttendanceRow {
  studentId: string;
  studentName: string;
  rollNumber: number;
  nis: string;
  gender: 'L' | 'P';
  status: AttendanceStatus;
  note: string;
  recordId?: string;
}

export const SubjectAttendanceModal: React.FC<SubjectAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  meeting,
}) => {
  const { user } = useAuth();
  const { activeAcademicYear } = useWorkspace();

  const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load students & existing attendance
  useEffect(() => {
    if (!isOpen || !meeting || !user || !activeAcademicYear) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch enrolled students of this class
        const enrollments = await getEnrollmentsByClass(
          user.uid, 
          meeting.academicYearId || activeAcademicYear.id, 
          meeting.classId
        );

        // Fetch existing attendance records for this meeting
        const existingRecords = await getAttendanceRecordsByMeeting(user.uid, meeting.id);
        const recordMap = new Map<string, AttendanceRecord>();
        existingRecords.forEach(r => recordMap.set(r.studentId, r));

        // Build interactive rows
        const initialRows: StudentAttendanceRow[] = enrollments
          .filter(en => en.status === 'ACTIVE' && en.student)
          .map((en, idx) => {
            const stud = en.student!;
            const existing = recordMap.get(stud.id);
            return {
              studentId: stud.id,
              studentName: stud.fullName,
              rollNumber: en.rollNumber || (idx + 1),
              nis: stud.nis || '',
              gender: stud.gender || 'L',
              status: existing ? existing.status : 'PRESENT', // default to PRESENT
              note: existing?.note || '',
              recordId: existing?.id,
            };
          });

        // Sort by rollNumber
        initialRows.sort((a, b) => a.rollNumber - b.rollNumber);
        setRows(initialRows);
      } catch (err: any) {
        console.error('Error loading meeting attendance:', err);
        setErrorMsg('Gagal memuat daftar siswa untuk kelas ini.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, meeting, user, activeAcademicYear]);

  // Real-time counter metrics
  const stats = useMemo(() => {
    let present = 0;
    let sick = 0;
    let permitted = 0;
    let absent = 0;
    let dispensation = 0;

    rows.forEach(r => {
      if (r.status === 'PRESENT') present++;
      else if (r.status === 'SICK') sick++;
      else if (r.status === 'PERMITTED') permitted++;
      else if (r.status === 'ABSENT') absent++;
      else if (r.status === 'DISPENSATION') dispensation++;
    });

    const total = rows.length;
    const percentage = total > 0 ? Math.round(((present + dispensation) / total) * 100) : 0;

    return { present, sick, permitted, absent, dispensation, total, percentage };
  }, [rows]);

  // Handle status toggle for a student
  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setRows(prev => prev.map(r => {
      if (r.studentId === studentId) {
        return { ...r, status: newStatus };
      }
      return r;
    }));
  };

  // Handle note change for a student
  const handleNoteChange = (studentId: string, newNote: string) => {
    setRows(prev => prev.map(r => {
      if (r.studentId === studentId) {
        return { ...r, note: newNote };
      }
      return r;
    }));
  };

  const isArchived = Boolean(activeAcademicYear?.isArchived);

  // Quick Action: Mark all present
  const handleSetAllPresent = () => {
    if (isArchived) return;
    setRows(prev => prev.map(r => ({ ...r, status: 'PRESENT' })));
  };

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => 
      r.studentName.toLowerCase().includes(q) || 
      r.nis.toLowerCase().includes(q) ||
      String(r.rollNumber).includes(q)
    );
  }, [rows, searchQuery]);

  // Save Attendance to Firestore
  const handleSave = async () => {
    if (!user || !meeting || rows.length === 0) return;

    try {
      setSaving(true);
      setErrorMsg(null);

      const itemsToSave: SaveAttendanceItem[] = rows.map(r => ({
        id: r.recordId,
        studentId: r.studentId,
        rollNumber: r.rollNumber,
        studentName: r.studentName,
        gender: r.gender,
        status: r.status,
        note: r.note.trim(),
      }));

      await saveMeetingAttendance(user.uid, meeting.id, itemsToSave);

      setSaveSuccessMsg('Presensi berhasil disimpan ke database!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        onSuccess(meeting.id);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setErrorMsg(err.message || 'Gagal menyimpan presensi siswa.');
    } finally {
      setSaving(false);
    }
  };

  if (!meeting) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Presensi Siswa Mata Pelajaran"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Header Summary Banner */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-xs font-mono">
                Pertemuan #{meeting.meetingNumber}
              </span>
              <h3 className="font-bold text-sm text-slate-800">
                Kelas {meeting.className} • {meeting.subjectName} ({meeting.subjectCode})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>📅 {meeting.date}</span>
              <span>•</span>
              <span className="font-medium text-slate-700">{meeting.topic}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isArchived ? (
              <button
                type="button"
                onClick={handleSetAllPresent}
                className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Set Semua Hadir (H)
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                🔒 Mode Arsip Historis (Read-Only)
              </span>
            )}
          </div>
        </div>

        {/* Counter Summary Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-[#232838]">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Siswa</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{stats.total}</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">Hadir (H)</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-300 text-base">{stats.present}</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">Sakit (S)</span>
            <span className="font-bold text-amber-800 dark:text-amber-300 text-base">{stats.sick}</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold block">Izin (I)</span>
            <span className="font-bold text-blue-800 dark:text-blue-300 text-base">{stats.permitted}</span>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold block">Alpa (A)</span>
            <span className="font-bold text-rose-800 dark:text-rose-300 text-base">{stats.absent}</span>
          </div>
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60">
            <span className="text-[10px] text-violet-700 dark:text-violet-400 font-semibold block">Kehadiran</span>
            <span className="font-bold text-violet-800 dark:text-violet-300 text-base">{stats.percentage}%</span>
          </div>
        </div>

        {/* Search filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau nomor absen siswa..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Attendance interactive table */}
        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat data kehadiran siswa...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Tidak ada siswa yang terdaftar di rombel kelas ini. Pastikan siswa sudah di-enroll.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">No</th>
                  <th className="py-2 px-3">Nama Siswa</th>
                  <th className="py-2 px-3 w-12 text-center">L/P</th>
                  <th className="py-2 px-3 w-56 text-center">Status Presensi</th>
                  <th className="py-2 px-3 w-40">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {filteredRows.map((row) => {
                  return (
                    <tr key={row.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                        {row.rollNumber}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800">{row.studentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{row.nis || ''}</div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.gender === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {row.gender}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
                          <button
                            type="button"
                            disabled={isArchived}
                            onClick={() => handleStatusChange(row.studentId, 'PRESENT')}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed ${
                              row.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-emerald-700'
                            }`}
                            title="Hadir"
                          >
                            H
                          </button>
                          <button
                            type="button"
                            disabled={isArchived}
                            onClick={() => handleStatusChange(row.studentId, 'SICK')}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed ${
                              row.status === 'SICK'
                                ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1b1f2e] hover:text-amber-700 dark:hover:text-amber-300'
                            }`}
                            title="Sakit"
                          >
                            S
                          </button>
                          <button
                            type="button"
                            disabled={isArchived}
                            onClick={() => handleStatusChange(row.studentId, 'PERMITTED')}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed ${
                              row.status === 'PERMITTED'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-blue-700'
                            }`}
                            title="Izin"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            disabled={isArchived}
                            onClick={() => handleStatusChange(row.studentId, 'ABSENT')}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed ${
                              row.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-rose-700'
                            }`}
                            title="Alpa / Tanpa Keterangan"
                          >
                            A
                          </button>
                          <button
                            type="button"
                            disabled={isArchived}
                            onClick={() => handleStatusChange(row.studentId, 'DISPENSATION')}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all disabled:opacity-80 disabled:cursor-not-allowed ${
                              row.status === 'DISPENSATION'
                                ? 'bg-violet-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-violet-700'
                            }`}
                            title="Dispensasi (Lomba / Tugas Sekolah)"
                          >
                            D
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          disabled={isArchived}
                          value={row.note}
                          onChange={e => handleNoteChange(row.studentId, e.target.value)}
                          placeholder={isArchived ? '-' : 'Catatan...'}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500">
            <strong>Keterangan:</strong> H = Hadir, S = Sakit, I = Izin, A = Alpa, D = Dispensasi
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
            >
              {isArchived ? 'Tutup' : 'Batal'}
            </button>
            {!isArchived && (
              <button
                type="button"
                disabled={saving || rows.length === 0}
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Menyimpan...' : 'Simpan Presensi'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
