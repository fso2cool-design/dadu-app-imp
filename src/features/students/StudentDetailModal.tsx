import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Student, Enrollment } from '../../types';
import { Badge } from '../../components/common/Badge';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  ExternalLink,
  GraduationCap
} from 'lucide-react';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  enrollment?: Enrollment | null;
  onEdit?: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  enrollment,
  onEdit,
}) => {
  if (!student) return null;

  const waLink = student.parentPhone ? `https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}` : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profil Lengkap Siswa"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Header Hero Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-slate-50 border border-indigo-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-xs ${
              student.gender === 'L' ? 'bg-indigo-600' : 'bg-pink-600'
            }`}>
              {student.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-800">{student.fullName}</h3>
                <Badge variant={student.gender === 'L' ? 'blue' : 'purple'} size="sm">
                  {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                <span>NIS: <strong>{student.nis || '-'}</strong></span>
                <span>•</span>
                <span>NISN: <strong>{student.nisn || '-'}</strong></span>
              </div>
            </div>
          </div>

          <Badge variant={student.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
            {student.status}
          </Badge>
        </div>

        {/* Enrollment Quick Info */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Penempatan Kelas:</span>
            <span className="font-bold text-slate-700 flex items-center gap-1 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              {enrollment ? `Kelas ${enrollment.className || 'Aktif'}` : 'Belum Ditempatkan'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Nomor Absen:</span>
            <span className="font-bold text-indigo-700 font-mono mt-0.5 block">
              {enrollment?.rollNumber ? `#${enrollment.rollNumber}` : '-'}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-100 bg-white">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Biodata & Kelahiran
            </h4>
            <div className="space-y-1.5 text-slate-600">
              <p><strong>Tempat Lahir:</strong> {student.birthPlace || '-'}</p>
              <p><strong>Tanggal Lahir:</strong> {student.birthDate || '-'}</p>
              <p><strong>Agama:</strong> {student.religion || 'Islam'}</p>
              <p><strong>Alamat:</strong> {student.address || '-'}</p>
            </div>
          </div>

          <div className="space-y-3 p-3.5 rounded-xl border border-slate-100 bg-white">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              Orang Tua & Kontak
            </h4>
            <div className="space-y-1.5 text-slate-600">
              <p><strong>Nama Ortu/Wali:</strong> {student.parentName || '-'}</p>
              <p className="flex items-center justify-between">
                <span><strong>No. WhatsApp Ortu:</strong> {student.parentPhone || '-'}</span>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                  >
                    Chat WA <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </p>
              <p><strong>No. HP Siswa:</strong> {student.phone || '-'}</p>
              <p><strong>Email:</strong> {student.email || '-'}</p>
            </div>
          </div>
        </div>

        {student.notes && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900">
            <p className="font-bold mb-0.5 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-amber-700" /> Catatan Khusus Guru:
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">{student.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Edit Data Siswa
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
