import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { StudentRaporSheet, StudentRaporData } from './StudentRaporSheet';
import { SchoolSettings, DocumentSettings } from '../../types';
import { Printer, Building2, Trophy, Users, AlertCircle } from 'lucide-react';

interface BatchRaporPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsRaporData: StudentRaporData[];
  schoolSettings: SchoolSettings | null;
  documentSettings?: DocumentSettings | null;
  academicYearLabel: string;
  semester: string;
  className: string;
  homeroomTeacherName?: string;
  homeroomTeacherNip?: string;
}

export const BatchRaporPrintModal: React.FC<BatchRaporPrintModalProps> = ({
  isOpen,
  onClose,
  studentsRaporData,
  schoolSettings,
  documentSettings,
  academicYearLabel,
  semester,
  className,
  homeroomTeacherName,
  homeroomTeacherNip,
}) => {
  const [reportType, setReportType] = useState<'RAPOR_SEMESTER' | 'RAPOR_SISIPAN_STS'>('RAPOR_SEMESTER');
  const [showRank, setShowRank] = useState(true);
  const [showKop, setShowKop] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Massal Rapor Siswa — ${className} (${studentsRaporData.length} Siswa)`}
      size="2xl"
    >
      <div className="space-y-4">
        {/* Toolbar Header (Hidden on Print) */}
        <div className="no-print bg-slate-50 dark:bg-[#141722] p-4 rounded-2xl border border-slate-200 dark:border-[#232838] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#232838] text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0c0e15] focus:outline-hidden cursor-pointer"
            >
              <option value="RAPOR_SEMESTER">Rapor Semester Lengkap</option>
              <option value="RAPOR_SISIPAN_STS">Rapor Sisipan / STS</option>
            </select>

            <button
              type="button"
              onClick={() => setShowRank(!showRank)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showRank 
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300' 
                  : 'bg-white dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{showRank ? 'Peringkat: Tampil' : 'Peringkat: Sembunyi'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowKop(!showKop)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showKop 
                  ? 'bg-orange-50 dark:bg-cyan-950/50 border-orange-200 dark:border-cyan-500/40 text-orange-700 dark:text-cyan-300' 
                  : 'bg-white dark:bg-[#0c0e15] border-slate-200 dark:border-[#232838] text-slate-600 dark:text-slate-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{showKop ? 'Kop: Aktif' : 'Kop: Nonaktif'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Total: <strong>{studentsRaporData.length}</strong> Halaman Rapor
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Semua ({studentsRaporData.length} Lembar)</span>
            </button>
          </div>
        </div>

        {/* Notice Info Banner */}
        <div className="no-print p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            Setiap rapor siswa otomatis dipisahkan dengan pemisah halaman cetak (<em>page break</em>). Pada dialog cetak peramban, pilih <strong>Destination: Save as PDF</strong> atau printer fisik Anda.
          </span>
        </div>

        {/* Printable Sheets List */}
        <div className="overflow-y-auto max-h-[70vh] space-y-6 [scrollbar-width:thin]">
          {studentsRaporData.map((sData, idx) => (
            <div 
              key={sData.enrollment.id} 
              className={idx < studentsRaporData.length - 1 ? 'page-break-after' : ''}
            >
              <StudentRaporSheet
                data={sData}
                schoolSettings={schoolSettings}
                documentSettings={documentSettings}
                academicYearLabel={academicYearLabel}
                semester={semester}
                className={className}
                homeroomTeacherName={homeroomTeacherName}
                homeroomTeacherNip={homeroomTeacherNip}
                reportType={reportType}
                showRank={showRank}
                showKop={showKop}
                showSignatures={showSignatures}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
