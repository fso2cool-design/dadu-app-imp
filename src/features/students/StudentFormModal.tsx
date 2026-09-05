import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createStudent, updateStudent } from '../../services/firestore/students';
import { createEnrollment, updateEnrollment } from '../../services/firestore/enrollments';
import { Modal } from '../../components/common/Modal';
import { Student, GenderType, StudentStatus, Enrollment } from '../../types';
import { User, Phone, MapPin, BookOpen, AlertCircle } from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentToEdit?: Student | null;
  existingEnrollment?: Enrollment | null;
  defaultClassId?: string;
  suggestedRollNumber?: number;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentToEdit,
  existingEnrollment,
  defaultClassId,
  suggestedRollNumber,
}) => {
  const { user } = useAuth();
  const { classes, activeAcademicYear, triggerSyncFeedback } = useWorkspace();

  const [formData, setFormData] = useState({
    fullName: '',
    nis: '',
    nisn: '',
    gender: 'L' as GenderType,
    birthPlace: '',
    birthDate: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    email: '',
    religion: 'Islam',
    address: '',
    notes: '',
    status: 'ACTIVE' as StudentStatus,
  });

  const [enrollClassId, setEnrollClassId] = useState<string>('');
  const [rollNumber, setRollNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        fullName: studentToEdit.fullName || '',
        nis: studentToEdit.nis || '',
        nisn: studentToEdit.nisn || '',
        gender: studentToEdit.gender || 'L',
        birthPlace: studentToEdit.birthPlace || '',
        birthDate: studentToEdit.birthDate || '',
        phone: studentToEdit.phone || '',
        parentName: studentToEdit.parentName || '',
        parentPhone: studentToEdit.parentPhone || '',
        email: studentToEdit.email || '',
        religion: studentToEdit.religion || 'Islam',
        address: studentToEdit.address || '',
        notes: studentToEdit.notes || '',
        status: studentToEdit.status || 'ACTIVE',
      });
      if (existingEnrollment) {
        setEnrollClassId(existingEnrollment.classId);
        setRollNumber(existingEnrollment.rollNumber);
      }
    } else {
      setFormData({
        fullName: '',
        nis: '',
        nisn: '',
        gender: 'L',
        birthPlace: '',
        birthDate: '',
        phone: '',
        parentName: '',
        parentPhone: '',
        email: '',
        religion: 'Islam',
        address: '',
        notes: '',
        status: 'ACTIVE',
      });
      setEnrollClassId(defaultClassId || (classes[0]?.id || ''));
      setRollNumber(suggestedRollNumber || 1);
    }
  }, [studentToEdit, existingEnrollment, defaultClassId, suggestedRollNumber, classes, isOpen]);

  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'ENROLLMENT' | 'CONTACT'>('IDENTITY');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('IDENTITY');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.fullName.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      triggerSyncFeedback('syncing', 'Menyimpan data siswa ke cloud...');

      if (studentToEdit) {
        // Update Student
        await updateStudent(user.uid, studentToEdit.id, formData);

        // Update or create enrollment if class selected
        if (existingEnrollment) {
          await updateEnrollment(user.uid, existingEnrollment.id, {
            classId: enrollClassId,
            rollNumber: Number(rollNumber),
            status: formData.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
          });
        } else if (enrollClassId && activeAcademicYear) {
          const targetCls = classes.find(c => c.id === enrollClassId);
          await createEnrollment(user.uid, {
            academicYearId: activeAcademicYear.id,
            classId: enrollClassId,
            studentId: studentToEdit.id,
            rollNumber: Number(rollNumber),
            status: 'ACTIVE',
            className: targetCls?.name || '',
            academicYearLabel: activeAcademicYear.label,
          });
        }
        triggerSyncFeedback('saved', 'Data siswa berhasil diperbarui!');
      } else {
        // Create new student
        const createdStudent = await createStudent(user.uid, formData);

        // Enroll to class if class selected
        if (enrollClassId && activeAcademicYear) {
          const targetCls = classes.find(c => c.id === enrollClassId);
          await createEnrollment(user.uid, {
            academicYearId: activeAcademicYear.id,
            classId: enrollClassId,
            studentId: createdStudent.id,
            rollNumber: Number(rollNumber),
            status: 'ACTIVE',
            className: targetCls?.name || '',
            academicYearLabel: activeAcademicYear.label,
          });
        }
        triggerSyncFeedback('saved', 'Data siswa baru berhasil ditambahkan!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving student:', err);
      triggerSyncFeedback('synced');
      setErrorMsg(err.message || 'Gagal menyimpan data siswa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Section Tabs */}
        <div className="flex border-b border-slate-200 dark:border-[#232838] gap-2 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('IDENTITY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'IDENTITY'
                ? 'bg-orange-500/10 dark:bg-cyan-500/10 text-orange-600 dark:text-cyan-400 border border-orange-500/20 dark:border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Identitas Siswa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ENROLLMENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'ENROLLMENT'
                ? 'bg-orange-500/10 dark:bg-cyan-500/10 text-orange-600 dark:text-cyan-400 border border-orange-500/20 dark:border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Penempatan Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTACT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'CONTACT'
                ? 'bg-orange-500/10 dark:bg-cyan-500/10 text-orange-600 dark:text-cyan-400 border border-orange-500/20 dark:border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Kontak & Wali</span>
          </button>
        </div>

        {/* Tab 1: Data Identitas Siswa */}
        {activeTab === 'IDENTITY' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Contoh: Muhammad Farhan"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-orange-500 dark:focus:ring-cyan-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NIS (Nomor Induk)</label>
                <input
                  type="text"
                  value={formData.nis}
                  onChange={e => setFormData(f => ({ ...f, nis: e.target.value }))}
                  placeholder="20261001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">NISN</label>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={e => setFormData(f => ({ ...f, nisn: e.target.value }))}
                  placeholder="0081234567"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Kelamin</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData(f => ({ ...f, gender: e.target.value as GenderType }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs cursor-pointer"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  value={formData.birthPlace}
                  onChange={e => setFormData(f => ({ ...f, birthPlace: e.target.value }))}
                  placeholder="Kota Kelahiran"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={e => setFormData(f => ({ ...f, birthDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Penempatan Kelas & Rombel */}
        {activeTab === 'ENROLLMENT' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Kelas Rombel</label>
                <select
                  value={enrollClassId}
                  onChange={e => setEnrollClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs font-medium cursor-pointer"
                >
                  <option value="">-- Belum Ditempatkan ke Kelas --</option>
                  {classes.filter(c => !c.isArchived || c.id === existingEnrollment?.classId).map(c => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name} (Tingkat {c.gradeLevel} - {c.major || 'Umum'}){c.isArchived ? ' [Diarsipkan]' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Absen</label>
                <input
                  type="number"
                  min={1}
                  value={rollNumber}
                  onChange={e => setRollNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Keaktifan</label>
              <select
                value={formData.status}
                onChange={e => setFormData(f => ({ ...f, status: e.target.value as StudentStatus }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs font-semibold cursor-pointer"
              >
                <option value="ACTIVE">Aktif (Belajar Aktif)</option>
                <option value="INACTIVE">Nonaktif / Cuti</option>
                <option value="TRANSFERRED">Mutasi / Pindah Keluar</option>
                <option value="GRADUATED">Lulus / Alumni</option>
              </select>
            </div>
          </div>
        )}

        {/* Tab 3: Kontak & Orang Tua */}
        {activeTab === 'CONTACT' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Orang Tua / Wali</label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={e => setFormData(f => ({ ...f, parentName: e.target.value }))}
                  placeholder="Nama Bapak / Ibu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. WhatsApp / HP Ortu</label>
                <input
                  type="text"
                  value={formData.parentPhone}
                  onChange={e => setFormData(f => ({ ...f, parentPhone: e.target.value }))}
                  placeholder="0812..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. HP Siswa</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="08..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Siswa (Opsional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  placeholder="siswa@sekolah.sch.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Tempat Tinggal</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                placeholder="Jl..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#232838] bg-white dark:bg-[#0c0e15] text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-[#232838]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1b1f2e] text-xs font-medium cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white dark:text-slate-950 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menyimpan...' : (studentToEdit ? 'Simpan Perubahan' : 'Tambah Siswa')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
