import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Student, Enrollment, StudentCustomFieldDefinition } from '../../types';
import { Badge } from '../../components/common/Badge';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  Sliders,
  CreditCard,
  FileText
} from 'lucide-react';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  enrollment?: Enrollment | null;
  onEdit?: (student: Student) => void;
  onPrintExamCard?: (enrollment: Enrollment) => void;
  onOpenProgressReport?: (enrollment: Enrollment) => void;
  customFields?: StudentCustomFieldDefinition[];
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  enrollment,
  onEdit,
  onPrintExamCard,
  onOpenProgressReport,
  customFields = [],
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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900/60 border border-indigo-100 dark:border-indigo-900/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-xs ${
              student.gender === 'L' ? 'bg-indigo-600' : 'bg-pink-600'
            }`}>
              {student.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{student.fullName}</h3>
                <Badge variant={student.gender === 'L' ? 'blue' : 'purple'} size="sm">
                  {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
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
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-medium">Penempatan Kelas:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {enrollment ? `Kelas ${enrollment.className || 'Aktif'}` : 'Belum Ditempatkan'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block font-medium">Nomor Absen:</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400 font-mono mt-0.5 block">
              {enrollment?.rollNumber ? `#${enrollment.rollNumber}` : '-'}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Biodata & Kelahiran
            </h4>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
              <p><strong>Tempat Lahir:</strong> {student.birthPlace || '-'}</p>
              <p><strong>Tanggal Lahir:</strong> {student.birthDate || '-'}</p>
              <p><strong>Agama:</strong> {student.religion || 'Islam'}</p>
              <p><strong>Alamat:</strong> {student.address || '-'}</p>
            </div>
          </div>

          <div className="space-y-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
              <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Orang Tua & Kontak
            </h4>
            <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
              <p><strong>Nama Ortu/Wali:</strong> {student.parentName || '-'}</p>
              <p className="flex items-center justify-between">
                <span><strong>No. WhatsApp Ortu:</strong> {student.parentPhone || '-'}</span>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5"
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

        {/* Data Kependudukan (NIK Siswa, NIK Ibu, NKK) */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs space-y-2">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/60 dark:border-slate-800 pb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Data Kependudukan (EMIS / Dapodik)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-slate-700 dark:text-slate-300">
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">NIK Siswa:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{student.nikSiswa || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">NIK Ibu Kandung:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{student.nikIbu || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">Nomor KK (NKK):</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{student.nkk || '-'}</span>
            </div>
          </div>
        </div>

        {/* Data Kolom Kustom Dinamis */}
        {((customFields && customFields.length > 0) || (student.customAttributes && Object.keys(student.customAttributes).length > 0)) && (
          <div className="p-3.5 bg-orange-50/50 dark:bg-amber-950/30 border border-orange-200/70 dark:border-amber-900/50 rounded-xl text-xs space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-orange-200/60 dark:border-amber-900/40 pb-1">
              <Sliders className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              Informasi Tambahan / Kolom Kustom
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-700 dark:text-slate-300">
              {/* Render field from definition */}
              {customFields.map((field) => {
                const val = student.customAttributes?.[field.key] ?? student.customAttributes?.[field.name];
                return (
                  <div key={field.id}>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-medium">{field.name}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{val || '-'}</span>
                  </div>
                );
              })}

              {/* Render any extra keys not in current active definitions */}
              {student.customAttributes && Object.entries(student.customAttributes)
                .filter(([k]) => !customFields.some(f => f.key === k || f.name === k))
                .map(([extraKey, extraVal]) => (
                  <div key={extraKey}>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block capitalize font-medium">{extraKey}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{String(extraVal) || '-'}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {student.notes && (
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-0.5 flex items-center gap-1 text-amber-950 dark:text-amber-200">
              <MessageSquare className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Catatan Khusus Guru:
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">{student.notes}</p>
          </div>
        )}

        {/* Quick Actions for Exam Card & Progress Report if enrolled */}
        {enrollment && (
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 block">Administrasi & Pelaporan Siswa</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Cetak kartu ujian resmi atau kirim laporan berkala ke wali murid.</span>
            </div>
            <div className="flex items-center gap-2">
              {onPrintExamCard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPrintExamCard(enrollment);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Kartu Ujian</span>
                </button>
              )}
              {onOpenProgressReport && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProgressReport(enrollment);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Rapor Sisipan</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Edit Data Siswa
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
