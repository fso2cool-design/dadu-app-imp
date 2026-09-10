import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Enrollment, Student, SchoolSettings } from '../../types';
import { getSchoolSettings } from '../../services/firestore/settings';
import { formatOfficialSignatureName } from '../../utils/formatOfficialName';
import { Modal } from '../../components/common/Modal';
import { 
  Printer, 
  CreditCard, 
  Sparkles, 
  Check, 
  QrCode, 
  ShieldCheck,
  Building2
} from 'lucide-react';

interface StudentExamCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollments: Enrollment[];
  selectedEnrollment?: Enrollment | null;
}

export const StudentExamCardModal: React.FC<StudentExamCardModalProps> = ({
  isOpen,
  onClose,
  enrollments,
  selectedEnrollment,
}) => {
  const { user, profile } = useAuth();
  const { activeAcademicYear, activeSemester } = useWorkspace();
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [examTitle, setExamTitle] = useState('ASESMEN SUMATIF TENGAH SEMESTER (ASTS)');
  const [targetMode, setTargetMode] = useState<'SINGLE' | 'ALL'>(selectedEnrollment ? 'SINGLE' : 'ALL');

  useEffect(() => {
    if (!user || !isOpen) return;
    const loadSchool = async () => {
      try {
        const sch = await getSchoolSettings(user.uid);
        if (sch) setSchoolSettings(sch);
      } catch (err) {
        console.error('Error loading school settings:', err);
      }
    };
    loadSchool();
  }, [user, isOpen]);

  if (!isOpen) return null;

  const targetStudents = targetMode === 'SINGLE' && selectedEnrollment
    ? [selectedEnrollment]
    : enrollments;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Kartu Peserta Ujian / Asesmen Siswa"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Settings Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 no-print">
          <div className="space-y-1 w-full sm:w-auto">
            <label className="block text-[11px] font-bold text-indigo-950 uppercase">Jenis Asesmen / Ujian</label>
            <select
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="ASESMEN SUMATIF TENGAH SEMESTER (ASTS)">Asesmen Sumatif Tengah Semester (ASTS / STS)</option>
              <option value="ASESMEN SUMATIF AKHIR SEMESTER (ASAS)">Asesmen Sumatif Akhir Semester (ASAS / SAS)</option>
              <option value="PENILAIAN AKHIR TAHUN (PAT)">Penilaian Akhir Tahun (PAT)</option>
              <option value="ASESMEN MADRASAH (AM)">Asesmen Madrasah (AM / Ujian Akhir)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setTargetMode(targetMode === 'SINGLE' ? 'ALL' : 'SINGLE')}
              className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 cursor-pointer"
            >
              Mode: {targetMode === 'SINGLE' ? '1 Siswa Terpilih' : `Seluruh Kelas (${targetStudents.length} Siswa)`}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu ({targetStudents.length})</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE CARDS CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1 print:max-h-none print:overflow-visible print:grid-cols-2 print:gap-4">
          {targetStudents.map((enr) => {
            const st = enr.student;
            return (
              <div 
                key={enr.id}
                className="border-2 border-slate-800 rounded-xl p-3.5 bg-white shadow-xs space-y-2.5 break-inside-avoid relative"
              >
                {/* Header Kop Kecil */}
                <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-slate-700" />
                  </div>
                  <div className="min-w-0 flex-1 text-center">
                    <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-700 leading-tight">
                      KARTU PESERTA ASESMEN
                    </h5>
                    <h4 className="text-[10px] font-black uppercase tracking-tight text-slate-900 truncate">
                      {schoolSettings?.schoolName || 'MADRASAH TSANAWIYAH NEGERI'}
                    </h4>
                    <p className="text-[8px] font-semibold text-slate-500">
                      T.A. {activeAcademicYear?.label || '2026/2027'} (Sem. {activeSemester})
                    </p>
                  </div>
                </div>

                {/* Exam Title Pill */}
                <div className="text-center py-0.5 bg-slate-100 rounded text-[9px] font-bold uppercase tracking-wider text-slate-800">
                  {examTitle}
                </div>

                {/* Body: Photo Placeholder & Biodata */}
                <div className="flex gap-3 items-center">
                  {/* Photo Box */}
                  <div className="w-16 h-20 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-center p-1 shrink-0">
                    <span className="text-[8px] text-slate-400 font-semibold uppercase leading-tight">Foto 2x3</span>
                  </div>

                  {/* Biodata */}
                  <div className="text-[10px] space-y-0.5 flex-1 min-w-0">
                    <div className="flex">
                      <span className="w-16 text-slate-500 font-medium">No. Peserta</span>
                      <span className="font-mono font-bold text-slate-900">: {st?.nis || '0000'}-{enr.rollNumber < 10 ? `0${enr.rollNumber}` : enr.rollNumber}</span>
                    </div>
                    <div className="flex">
                      <span className="w-16 text-slate-500 font-medium">Nama Siswa</span>
                      <span className="font-bold text-slate-900 truncate">: {st?.fullName || 'Nama Siswa'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-16 text-slate-500 font-medium">NIS / NISN</span>
                      <span className="font-mono text-slate-700">: {st?.nis || '-'} / {st?.nisn || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-16 text-slate-500 font-medium">Kelas / Rombel</span>
                      <span className="font-bold text-slate-800">: {enr.className || 'Kelas'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-16 text-slate-500 font-medium">Ruang Ujian</span>
                      <span className="font-semibold text-indigo-700">: Ruang {enr.className?.split(' ')[0] || '01'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures & Stamp */}
                <div className="flex items-end justify-between border-t border-slate-200 pt-1.5 text-[8px]">
                  <div className="flex items-center gap-1 text-slate-400 font-mono">
                    <QrCode className="w-5 h-5 text-slate-800" />
                    <span className="text-[7px]">VERIFIED</span>
                  </div>

                  <div className="text-right">
                    <p className="text-slate-500">{schoolSettings?.district || 'Kota'}, {new Date().getFullYear()}</p>
                    <p className="font-bold text-slate-800">Kepala Madrasah</p>
                    <div className="h-6 flex items-center justify-end relative">
                      {schoolSettings?.headmasterSignatureUrl && (
                        <img
                          src={schoolSettings.headmasterSignatureUrl}
                          alt="Tanda Tangan Kepala"
                          className="max-h-5 max-w-16 object-contain"
                        />
                      )}
                    </div>
                    <p className="font-bold text-slate-900 underline">
                      {formatOfficialSignatureName(schoolSettings?.headmasterName, 'Kepala Madrasah')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
