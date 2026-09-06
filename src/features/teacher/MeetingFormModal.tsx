import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createMeeting, updateMeeting, getMeetings } from '../../services/firestore/meetings';
import { Modal } from '../../components/common/Modal';
import { Meeting, TeachingAssignment, MeetingStatus } from '../../types';
import { CalendarCheck2, Clock, BookOpen, FileText, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface MeetingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedMeeting: Meeting) => void;
  meetingToEdit?: Meeting | null;
  defaultAssignmentId?: string;
}

export const MeetingFormModal: React.FC<MeetingFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  meetingToEdit,
  defaultAssignmentId,
}) => {
  const { user } = useAuth();
  const { teachingAssignments, activeAcademicYear, activeSemester, triggerSyncFeedback, checkIsHoliday } = useWorkspace();

  const [assignmentId, setAssignmentId] = useState<string>('');
  const [meetingNumber, setMeetingNumber] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const holidayInfo = useMemo(() => date ? checkIsHoliday(date) : { isHoliday: false }, [checkIsHoliday, date]);
  const [timeSlot, setTimeSlot] = useState<string>('07:30 - 09:00 (Jam 1-2)');
  const [topic, setTopic] = useState<string>('');
  const [learningObjectives, setLearningObjectives] = useState<string>('');
  const [activities, setActivities] = useState<string>('');
  const [method, setMethod] = useState<string>('Tatap Muka Langsung / Diskusi Kelompok');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<MeetingStatus>('COMPLETED');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-calculate next meeting number when assignment changes
  const handleAssignmentChange = async (newAssignId: string) => {
    setAssignmentId(newAssignId);
    if (!user || meetingToEdit) return;
    try {
      const existing = await getMeetings(user.uid, { teachingAssignmentId: newAssignId });
      const nextNum = existing.length > 0 
        ? Math.max(...existing.map(m => m.meetingNumber || 0)) + 1 
        : 1;
      setMeetingNumber(nextNum);
    } catch (err) {
      console.error('Error fetching next meeting number:', err);
    }
  };

  useEffect(() => {
    if (meetingToEdit) {
      setAssignmentId(meetingToEdit.teachingAssignmentId || '');
      setMeetingNumber(meetingToEdit.meetingNumber || 1);
      setDate(meetingToEdit.date || new Date().toISOString().split('T')[0]);
      setTimeSlot(meetingToEdit.timeSlot || '07:30 - 09:00 (Jam 1-2)');
      setTopic(meetingToEdit.topic || '');
      setLearningObjectives(meetingToEdit.learningObjectives || '');
      setActivities(meetingToEdit.activities || '');
      setMethod(meetingToEdit.method || 'Tatap Muka Langsung / Diskusi Kelompok');
      setNotes(meetingToEdit.notes || '');
      setStatus(meetingToEdit.status || 'COMPLETED');
    } else {
      const initialAssignId = defaultAssignmentId || teachingAssignments[0]?.id || '';
      setAssignmentId(initialAssignId);
      setDate(new Date().toISOString().split('T')[0]);
      setTimeSlot('07:30 - 09:00 (Jam 1-2)');
      setTopic('');
      setLearningObjectives('');
      setActivities('');
      setMethod('Tatap Muka Langsung / Diskusi Kelompok');
      setNotes('');
      setStatus('COMPLETED');

      if (initialAssignId && user) {
        getMeetings(user.uid, { teachingAssignmentId: initialAssignId }).then(existing => {
          const nextNum = existing.length > 0 
            ? Math.max(...existing.map(m => m.meetingNumber || 0)) + 1 
            : 1;
          setMeetingNumber(nextNum);
        }).catch(() => setMeetingNumber(1));
      }
    }
  }, [meetingToEdit, defaultAssignmentId, teachingAssignments, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeAcademicYear || !assignmentId || !topic.trim()) {
      setErrorMsg('Harap lengkapi mata pelajaran/kelas dan materi pokok pertemuan.');
      return;
    }

    if (activeAcademicYear?.isArchived) {
      setErrorMsg('Tahun Ajaran ini telah diarsipkan (read-only). Tidak dapat menambah atau mengedit pertemuan.');
      return;
    }

    const selectedAssignment = teachingAssignments.find(t => t.id === assignmentId);
    if (!selectedAssignment) {
      setErrorMsg('Penugasan mengajar tidak valid.');
      return;
    }

    if (!meetingToEdit && selectedAssignment.isArchived) {
      setErrorMsg('Penugasan mengajar ini telah diarsipkan dan tidak dapat digunakan untuk mencatat pertemuan KBM baru.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      triggerSyncFeedback('syncing', 'Menyimpan agenda jurnal KBM...');

      if (meetingToEdit) {
        await updateMeeting(user.uid, meetingToEdit.id, {
          teachingAssignmentId: assignmentId,
          classId: selectedAssignment.classId,
          subjectId: selectedAssignment.subjectId,
          className: selectedAssignment.className || '',
          subjectName: selectedAssignment.subjectName || '',
          subjectCode: selectedAssignment.subjectCode || '',
          meetingNumber: Number(meetingNumber),
          date,
          timeSlot,
          topic: topic.trim(),
          learningObjectives: learningObjectives.trim(),
          activities: activities.trim(),
          method: method.trim(),
          notes: notes.trim(),
          status,
        });

        const updatedObj: Meeting = {
          ...meetingToEdit,
          teachingAssignmentId: assignmentId,
          classId: selectedAssignment.classId,
          subjectId: selectedAssignment.subjectId,
          className: selectedAssignment.className || '',
          subjectName: selectedAssignment.subjectName || '',
          subjectCode: selectedAssignment.subjectCode || '',
          meetingNumber: Number(meetingNumber),
          date,
          timeSlot,
          topic: topic.trim(),
          learningObjectives: learningObjectives.trim(),
          activities: activities.trim(),
          method: method.trim(),
          notes: notes.trim(),
          status,
          updatedAt: new Date(),
        };

        triggerSyncFeedback('saved', 'Jurnal pertemuan berhasil diperbarui!');
        onSuccess(updatedObj);
      } else {
        const created = await createMeeting(user.uid, {
          academicYearId: activeAcademicYear.id,
          semester: activeSemester,
          teachingAssignmentId: assignmentId,
          classId: selectedAssignment.classId,
          subjectId: selectedAssignment.subjectId,
          className: selectedAssignment.className || '',
          subjectName: selectedAssignment.subjectName || '',
          subjectCode: selectedAssignment.subjectCode || '',
          meetingNumber: Number(meetingNumber),
          date,
          timeSlot,
          topic: topic.trim(),
          learningObjectives: learningObjectives.trim(),
          activities: activities.trim(),
          method: method.trim(),
          notes: notes.trim(),
          status,
        });

        triggerSyncFeedback('saved', 'Jurnal pertemuan berhasil dicatat!');
        onSuccess(created);
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving meeting:', err);
      triggerSyncFeedback('synced');
      setErrorMsg(err.message || 'Gagal menyimpan agenda pertemuan KBM.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={meetingToEdit ? 'Edit Jurnal Pertemuan KBM' : 'Catat Pertemuan KBM Baru'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Assignment and Meeting Number */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rombel Kelas & Mata Pelajaran <span className="text-rose-500">*</span>
              {meetingToEdit && <span className="text-[10px] text-amber-600 font-normal ml-1">(Terkunci saat edit)</span>}
            </label>
            <select
              value={assignmentId}
              onChange={e => handleAssignmentChange(e.target.value)}
              disabled={!!meetingToEdit}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="">-- Pilih Kelas & Mapel --</option>
              {teachingAssignments
                .filter(ta => {
                  if (meetingToEdit && ta.id === meetingToEdit.teachingAssignmentId) return true;
                  return !ta.isArchived && ta.isActive !== false && (!activeAcademicYear || ta.academicYearId === activeAcademicYear.id);
                })
                .map(ta => (
                  <option key={ta.id} value={ta.id}>
                    Kelas {ta.className || 'Kelas'} • {ta.subjectName || 'Mapel'} ({ta.subjectCode})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pertemuan Ke- <span className="text-rose-500">*</span>
              {meetingToEdit && <span className="text-[10px] text-amber-600 font-normal ml-1">(Kunci)</span>}
            </label>
            <input
              type="number"
              min={1}
              required
              disabled={!!meetingToEdit}
              value={meetingNumber}
              onChange={e => setMeetingNumber(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-indigo-700 text-center disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Section 2: Date, Time Slot, and Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal KBM <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
            {holidayInfo.isHoliday && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Libur: {holidayInfo.reason}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jam Pelajaran / Waktu
            </label>
            <input
              type="text"
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              placeholder="07:30 - 09:00 (Jam 1-2)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Pertemuan
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MeetingStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
            >
              <option value="COMPLETED">Terlaksana (Selesai)</option>
              <option value="SCHEDULED">Terjadwal (Mendatang)</option>
              <option value="SUBSTITUTE">Pertemuan Pengganti</option>
              <option value="DRAFT">Draft Rencana</option>
              <option value="CANCELLED">Dibatalkan / Libur</option>
            </select>
          </div>
        </div>

        {/* Section 3: Topic and Learning Objectives */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Materi Pokok / Bahasan KBM <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Contoh: Bab 2 - Teks Prosedur Kompleks & Struktur Kalimat Imperatif"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tujuan Pembelajaran / Capaian Pembelajaran (CP/TP)
          </label>
          <textarea
            rows={2}
            value={learningObjectives}
            onChange={e => setLearningObjectives(e.target.value)}
            placeholder="Peserta didik mampu mengidentifikasi struktur teks dan menyusun teks prosedur secara sistematis..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none"
          />
        </div>

        {/* Section 4: Activities and Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ringkasan Aktivitas / Kegiatan KBM
            </label>
            <textarea
              rows={2}
              value={activities}
              onChange={e => setActivities(e.target.value)}
              placeholder="Apersepsi, pemaparan materi, diskusi kelompok, presentasi perwakilan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Metode & Media Pembelajaran
            </label>
            <textarea
              rows={2}
              value={method}
              onChange={e => setMethod(e.target.value)}
              placeholder="Discovery Learning, LKPD, Slide Presentasi, Buku Teks..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none"
            />
          </div>
        </div>

        {/* Section 5: Notes / Reflection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Catatan Guru / Refleksi KBM (Opsional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Sebagian besar siswa antusias, tugas kelompok 3 perlu bimbingan tambahan..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
          />
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            {loading ? 'Menyimpan...' : (meetingToEdit ? 'Simpan Perubahan' : 'Simpan Jurnal Pertemuan')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
