import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  BookOpen, 
  Users, 
  GraduationCap, 
  CalendarCheck2, 
  FileSpreadsheet, 
  Printer, 
  Share2, 
  MousePointer2, 
  Sparkles, 
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Clock,
  Award,
  Filter
} from 'lucide-react';
import { KemenagLogo } from '../../components/common/KemenagLogo';

interface WorkflowDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSignUp?: () => void;
}

type RoleType = 'MAPEL' | 'WALI';

interface StepMeta {
  id: number;
  role: RoleType;
  roleLabel: string;
  roleBadgeColor: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
  benefit: string;
  keyPoints: string[];
}

const STEPS_META: StepMeta[] = [
  {
    id: 1,
    role: 'MAPEL',
    roleLabel: 'Guru Mata Pelajaran',
    roleBadgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    title: 'Presensi Tatap Muka Per Jam KBM',
    shortTitle: 'Presensi Mapel',
    description: 'Catat kehadiran siswa saat mengajar di kelas secara instan tanpa kertas rekap fisik.',
    icon: CalendarCheck2,
    benefit: 'Menghemat 15 menit waktu belajar per pertemuan; rekap hadir semester terhitung otomatis.',
    keyPoints: [
      'Pilih jam mengajar dan rombel dengan 1 sentuhan',
      'Tombol cepat H (Hadir), S (Sakit), I (Izin), A (Alpa)',
      'Statistik kehadiran dan persentase langsung terakumulasi'
    ]
  },
  {
    id: 2,
    role: 'MAPEL',
    roleLabel: 'Guru Mata Pelajaran',
    roleBadgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    title: 'Pengisian Buku Jurnal Mengajar',
    shortTitle: 'Jurnal Harian',
    description: 'Catat materi pokok dan situasi kelas harian yang langsung tersusun jadi buku jurnal resmi.',
    icon: BookOpen,
    benefit: 'Buku jurnal siap cetak atau ditunjukkan kapan saja saat supervisi kepala madrasah / pengawas.',
    keyPoints: [
      'Input materi pokok, capaian belajar, & aktivitas KBM',
      'Otomatis mengaitkan daftar hadir siswa di hari itu',
      'Format standar supervisi Kemenag lengkap ruang tanda tangan'
    ]
  },
  {
    id: 3,
    role: 'MAPEL',
    roleLabel: 'Guru Mata Pelajaran',
    roleBadgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    title: 'Asesmen Formatif & Sumatif (Batas KKM)',
    shortTitle: 'Input Nilai Mapel',
    description: 'Kelola nilai tugas, ulangan harian, STS, & SAS dengan kalkulasi ketuntasan otomatis.',
    icon: GraduationCap,
    benefit: 'Tidak perlu menyusun rumus Excel manual; predikat dan status ketuntasan dihitung akurat.',
    keyPoints: [
      'Batas KKM dapat disesuaikan (misal: 75)',
      'Deteksi otomatis siswa tuntas atau perlu remedial',
      'Nilai akhir langsung terhubung ke lembar legger wali kelas'
    ]
  },
  {
    id: 4,
    role: 'WALI',
    roleLabel: 'Wali Kelas',
    roleBadgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    title: 'Presensi Harian Rombel & Rekap Absensi',
    shortTitle: 'Presensi Rombel',
    description: 'Wali kelas memantau ketidakhadiran seluruh siswa bimbingan dan menyiapkan rekap resmi.',
    icon: Users,
    benefit: 'Wali kelas mengetahui pola absensi siswa sedini mungkin sebelum rekap semester ditutup.',
    keyPoints: [
      'Rekapitulasi terpusat Sakit, Izin, Alpa harian',
      'Peringatan otomatis jika siswa memiliki alpa tinggi',
      'Siap diteruskan sebagai laporan ke orang tua / BK'
    ]
  },
  {
    id: 5,
    role: 'WALI',
    roleLabel: 'Wali Kelas',
    roleBadgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    title: 'Legger Nilai Rombel & Peringkat Otomatis',
    shortTitle: 'Legger Nilai',
    description: 'Menghimpun nilai dari seluruh guru mata pelajaran tanpa perlu menagih berkas fisik satu per satu.',
    icon: FileSpreadsheet,
    benefit: 'Penyusunan legger yang biasanya memakan berhari-hari selesai hanya dalam beberapa detik.',
    keyPoints: [
      'Gabungan nilai seluruh mapel (Fikih, Quran Hadits, MTK, dll)',
      'Kalkulasi total nilai, rata-rata, & peringkat 1 s/d akhir',
      'Ekspor lembar kerja Excel (.xlsx) dengan 1 klik'
    ]
  },
  {
    id: 6,
    role: 'WALI',
    roleLabel: 'Wali Kelas & Guru Mapel',
    roleBadgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    title: 'Cetak Dokumen Resmi & Bagikan Tautan Publik',
    shortTitle: 'Cetak & Share',
    description: 'Cetak lembar resmi ber-kop Kemenag atau bagikan tautan baca aman tanpa login ke pihak luar.',
    icon: Printer,
    benefit: 'Laporan tersaji profesional dengan tanda tangan digital resmi, siap dikirim ke WA pengawas / wali murid.',
    keyPoints: [
      'Format standar kertas A4/Folio rapi ber-kop madrasah',
      'Tanda tangan Kepala Madrasah & Wali Kelas tercantum rapi',
      'Tautan publik aman (read-only) dapat diproteksi PIN'
    ]
  }
];

export const WorkflowDemoModal: React.FC<WorkflowDemoModalProps> = ({
  isOpen,
  onClose,
  onStartSignUp
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [simTime, setSimTime] = useState(0); // 0 to 100 ticks per step

  const stepMeta = STEPS_META[currentStep];

  // Sim time controller: runs from 0 to 100 in ~6.5 seconds, then advances to next step if playing
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSimTime(prev => {
        if (prev >= 100) {
          if (isPlaying) {
            setCurrentStep(s => (s + 1) % STEPS_META.length);
            return 0;
          }
          return 100;
        }
        return prev + 1.25; // updates every 80ms ~ 6.4s per step
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, currentStep]);

  const handleSelectStep = (index: number) => {
    setCurrentStep(index);
    setSimTime(0);
  };

  const handleResetSim = () => {
    setSimTime(0);
  };

  const handleNext = () => {
    setCurrentStep(prev => (prev + 1) % STEPS_META.length);
    setSimTime(0);
  };

  const handlePrev = () => {
    setCurrentStep(prev => (prev - 1 + STEPS_META.length) % STEPS_META.length);
    setSimTime(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-[#0B101B] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-demo-title"
      >
        {/* HEADER BAR */}
        <div className="px-5 sm:px-8 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#080d16]/90">
          <div className="flex items-center gap-3">
            <KemenagLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Simulasi Langsung Aplikasi
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  Tahun Ajaran 2026/2027
                </span>
              </div>
              <h2 id="workflow-demo-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Simulasi Alur Kerja Nyata Guru Mapel & Wali Kelas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset / Replay simulation */}
            <button
              type="button"
              onClick={handleResetSim}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Ulangi simulasi langkah ini"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Ulangi Gerakan</span>
            </button>

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Jeda</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Putar Otomatis</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              aria-label="Tutup simulasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP TABS WITH DYNAMIC PROGRESS BAR */}
        <div className="px-5 sm:px-8 pt-2.5 pb-2 bg-slate-50/50 dark:bg-[#080d16]/50 border-b border-slate-100 dark:border-slate-800/80">
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-100 ease-linear rounded-full"
              style={{ 
                width: `${((currentStep + simTime / 100) / STEPS_META.length) * 100}%` 
              }}
            />
          </div>

          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {STEPS_META.map((meta, idx) => {
              const isActive = idx === currentStep;
              const isPassed = idx < currentStep;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  className={`text-left p-2 rounded-xl transition-all cursor-pointer flex flex-col justify-between border ${
                    isActive
                      ? 'bg-white dark:bg-slate-800/95 shadow-xs border-emerald-500 ring-2 ring-emerald-500/20'
                      : isPassed
                      ? 'bg-slate-100/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-200/60'
                      : 'bg-transparent border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] sm:text-xs font-black ${
                      isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
                    }`}>
                      0{meta.id}
                    </span>
                    <span className={`text-[8px] sm:text-[9px] px-1 py-0.2 rounded font-extrabold uppercase ${
                      meta.role === 'MAPEL'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                    }`}>
                      {meta.role}
                    </span>
                  </div>
                  <div className="truncate text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1 hidden sm:block">
                    {meta.shortTitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN SIMULATION STAGE */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            
            {/* LEFT: Contextual Explanations for the Teacher */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${stepMeta.roleBadgeColor}`}>
                  {stepMeta.roleLabel}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  Langkah {stepMeta.id} dari 6
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {stepMeta.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {stepMeta.description}
                </p>
              </div>

              {/* Functional Points */}
              <div className="space-y-2 pt-1">
                {stepMeta.keyPoints.map((pt, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              {/* Benefit Callout */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Nilai Manfaat:</strong> {stepMeta.benefit}
                </span>
              </div>
            </div>

            {/* RIGHT: LIVE INTERACTIVE APPLET SIMULATOR */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl bg-slate-900 text-white p-4 sm:p-5 shadow-2xl border border-slate-800 overflow-hidden select-none min-h-[360px] flex flex-col justify-between">
                
                {/* Simulated Operating Window Titlebar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
                      dadu.kemenag.go.id/workspace
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400">
                      Simulasi Pengoperasian
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                </div>

                {/* DYNAMIC SIMULATION SCENARIOS BASED ON STEP */}
                <div className="relative py-3 flex-1">
                  {currentStep === 0 && <SimulationStep1Attendance simTime={simTime} />}
                  {currentStep === 1 && <SimulationStep2Journal simTime={simTime} />}
                  {currentStep === 2 && <SimulationStep3Assessment simTime={simTime} />}
                  {currentStep === 3 && <SimulationStep4Homeroom simTime={simTime} />}
                  {currentStep === 4 && <SimulationStep5Legger simTime={simTime} />}
                  {currentStep === 5 && <SimulationStep6PrintShare simTime={simTime} />}
                </div>

                {/* Simulation Status Bar */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Status Operasi: {simTime < 90 ? 'Sedang Dijalankan Guru...' : 'Selesai & Tersimpan Otomatis'}
                  </span>
                  <span className="font-mono">
                    {Math.min(Math.round(simTime), 100)}%
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-5 sm:px-8 py-3.5 bg-slate-50 dark:bg-[#080d16] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={handlePrev}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs text-slate-500 font-bold px-2">
              Langkah {currentStep + 1} / {STEPS_META.length}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup Simulasi
            </button>

            {onStartSignUp && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartSignUp();
                }}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Daftar Akun Guru Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

/* =========================================================================
 * VIRTUAL USER CURSOR WITH CLICK RIPPLE
 * ========================================================================= */
const VirtualCursor: React.FC<{ x: number; y: number; clicking: boolean; label?: string }> = ({ 
  x, 
  y, 
  clicking, 
  label 
}) => {
  return (
    <motion.div 
      className="absolute pointer-events-none z-30 flex items-start gap-1"
      animate={{ x, y }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="relative">
        <MousePointer2 className={`w-5 h-5 text-emerald-400 drop-shadow-md transition-transform duration-100 ${
          clicking ? 'scale-75 text-emerald-300' : 'scale-100'
        }`} />
        {clicking && (
          <span className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping" />
        )}
      </div>
      {label && (
        <span className="bg-slate-950/90 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded text-[10px] font-bold shadow-md whitespace-nowrap">
          {label}
        </span>
      )}
    </motion.div>
  );
};

/* =========================================================================
 * SCENARIO 1: PRESENSI MAPEL (Klik tombol Hadir & Izin, Angka Live Naik)
 * ========================================================================= */
const SimulationStep1Attendance: React.FC<{ simTime: number }> = ({ simTime }) => {
  // Phase 1 (0-30): Cursor moves to student 1 & clicks HADIR
  // Phase 2 (31-65): Cursor moves to student 2 & clicks IZIN
  // Phase 3 (66-100): Stats counter updates
  const s1Clicked = simTime >= 25;
  const s2Clicked = simTime >= 60;

  // Cursor coordinates
  let cursorX = 180;
  let cursorY = 80;
  let clicking = false;
  let cursorLabel = 'Pilih Kelas';

  if (simTime < 30) {
    cursorX = 260;
    cursorY = 98;
    clicking = simTime >= 20 && simTime <= 26;
    cursorLabel = 'Klik Hadir';
  } else if (simTime < 65) {
    cursorX = 295;
    cursorY = 145;
    clicking = simTime >= 55 && simTime <= 62;
    cursorLabel = 'Klik Izin';
  } else {
    cursorX = 220;
    cursorY = 210;
    clicking = false;
    cursorLabel = 'Tersimpan';
  }

  const presentCount = 30 + (s1Clicked ? 1 : 0);
  const permittedCount = s2Clicked ? 1 : 0;
  const percentage = (((presentCount) / 32) * 100).toFixed(1);

  return (
    <div className="relative space-y-3">
      <VirtualCursor x={cursorX} y={cursorY} clicking={clicking} label={cursorLabel} />

      {/* Class & Session Bar */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">KBM Tatap Muka</div>
          <div className="text-xs font-bold text-slate-100">Kelas IX-A • Fikih (Pertemuan Ke-6)</div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">08.00 - 09.20</span>
        </div>
      </div>

      {/* Live Counter Widget */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
          <div className="text-[10px] text-emerald-400">Hadir (H)</div>
          <div className="text-sm font-black text-emerald-300 transition-all">{presentCount} Siswa</div>
        </div>
        <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-800/40">
          <div className="text-[10px] text-amber-400">Izin / Sakit</div>
          <div className="text-sm font-black text-amber-300 transition-all">{permittedCount} Siswa</div>
        </div>
        <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-800/40">
          <div className="text-[10px] text-sky-400">Persentase</div>
          <div className="text-sm font-black text-sky-300">{percentage}%</div>
        </div>
      </div>

      {/* Interactive Student Rows */}
      <div className="space-y-1.5 pt-1">
        {/* Student 1 */}
        <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Ahmad Faiz Al-Faruq</div>
            <div className="text-[10px] text-slate-400">NIS: 20260901 • Laki-laki</div>
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              s1Clicked 
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {s1Clicked ? '✓ Hadir' : 'Hadir'}
            </span>
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-400">S</span>
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-400">I</span>
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-400">A</span>
          </div>
        </div>

        {/* Student 2 */}
        <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Fatimah Azzahra</div>
            <div className="text-[10px] text-slate-400">NIS: 20260902 • Perempuan</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-400">H</span>
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-400">S</span>
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
              s2Clicked 
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/30' 
                : 'bg-slate-700 text-slate-300'
            }`}>
              {s2Clicked ? '✓ Izin (Lomba MTQ)' : 'Izin'}
            </span>
            <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-700/50 text-slate-400">A</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
 * SCENARIO 2: JURNAL MENGAJAR (Simulasi Mengetik Materi & Klik Simpan)
 * ========================================================================= */
const SimulationStep2Journal: React.FC<{ simTime: number }> = ({ simTime }) => {
  const fullText = "Ketentuan & Tata Cara Shalat Jamak Qashar";
  // Typewriter effect between time 10 to 60
  const charsToShow = simTime < 10 ? 0 : Math.min(Math.floor(((simTime - 10) / 45) * fullText.length), fullText.length);
  const typedText = fullText.substring(0, charsToShow);
  const isSaved = simTime >= 75;

  let cursorX = 140;
  let cursorY = 110;
  let clicking = false;
  let cursorLabel = 'Ketik Materi';

  if (simTime < 60) {
    cursorX = 120 + Math.min(charsToShow * 3, 140);
    cursorY = 95;
    clicking = false;
    cursorLabel = 'Mengetik...';
  } else if (simTime < 80) {
    cursorX = 250;
    cursorY = 215;
    clicking = simTime >= 70 && simTime <= 76;
    cursorLabel = 'Klik Simpan Jurnal';
  } else {
    cursorX = 270;
    cursorY = 190;
    clicking = false;
    cursorLabel = 'Tersimpan';
  }

  return (
    <div className="relative space-y-3">
      <VirtualCursor x={cursorX} y={cursorY} clicking={clicking} label={cursorLabel} />

      {/* Jurnal Header */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-amber-400 font-bold uppercase">Buku Jurnal Agenda Guru</div>
          <div className="text-xs font-bold text-slate-100">Pertemuan Ke-6 • 14 September 2026</div>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
          Terlaksana
        </span>
      </div>

      {/* Simulated Form Input */}
      <div className="space-y-2 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Materi Pokok / Bahasan</label>
          <div className="mt-1 p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 flex items-center min-h-[34px]">
            <span>{typedText}</span>
            {simTime < 65 && <span className="w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse" />}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Aktivitas & Metode Pembelajaran</label>
          <div className="mt-1 p-2 rounded-lg bg-slate-900/60 border border-slate-700 text-[11px] text-slate-300">
            Diskusi studi kasus rukhsah shalat safar & praktik menghitung jarak qashar
          </div>
        </div>

        {/* Action Button with click ripple */}
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Absensi Otomatis: 31 Hadir, 1 Izin</span>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isSaved 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-amber-600 text-white hover:bg-amber-500'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Jurnal Tersimpan!</span>
              </>
            ) : (
              <span>Simpan Agenda KBM</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
 * SCENARIO 3: ASESMEN NILAI (Input Skor, KKM Otomatis & Predikat Tuntas)
 * ========================================================================= */
const SimulationStep3Assessment: React.FC<{ simTime: number }> = ({ simTime }) => {
  const s1Filled = simTime >= 25;
  const s2Filled = simTime >= 65;

  let cursorX = 220;
  let cursorY = 110;
  let clicking = false;
  let cursorLabel = 'Input Nilai';

  if (simTime < 35) {
    cursorX = 220;
    cursorY = 95;
    clicking = simTime >= 20 && simTime <= 26;
    cursorLabel = 'Input Skor 92';
  } else if (simTime < 75) {
    cursorX = 220;
    cursorY = 145;
    clicking = simTime >= 60 && simTime <= 66;
    cursorLabel = 'Input Skor 88';
  } else {
    cursorX = 180;
    cursorY = 210;
    clicking = false;
    cursorLabel = 'KKM Dihitung';
  }

  return (
    <div className="relative space-y-3">
      <VirtualCursor x={cursorX} y={cursorY} clicking={clicking} label={cursorLabel} />

      {/* Assessment Settings Bar */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-indigo-400 font-bold uppercase">Asesmen Sumatif Lingkup Materi</div>
          <div className="text-xs font-bold text-slate-100">Mata Pelajaran: Fikih (Batas KKM: 75)</div>
        </div>
        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
          Bobot: 30%
        </span>
      </div>

      {/* Student Score Grid */}
      <div className="space-y-1.5">
        {/* Student 1 */}
        <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
          <div className="max-w-[45%] truncate">
            <div className="text-xs font-bold text-slate-200">Ahmad Faiz Al-Faruq</div>
            <div className="text-[10px] text-slate-400">TP-1: Shalat Jamak & Qashar</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-lg font-mono text-xs font-black transition-all ${
              s1Filled ? 'bg-slate-900 text-emerald-300 border border-emerald-500/50' : 'bg-slate-700 text-slate-400'
            }`}>
              {s1Filled ? '92' : '-'}
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              s1Filled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'opacity-30 bg-slate-800'
            }`}>
              {s1Filled ? 'Tuntas (A)' : 'Menunggu'}
            </span>
          </div>
        </div>

        {/* Student 2 */}
        <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
          <div className="max-w-[45%] truncate">
            <div className="text-xs font-bold text-slate-200">Fatimah Azzahra</div>
            <div className="text-[10px] text-slate-400">TP-1: Shalat Jamak & Qashar</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-lg font-mono text-xs font-black transition-all ${
              s2Filled ? 'bg-slate-900 text-emerald-300 border border-emerald-500/50' : 'bg-slate-700 text-slate-400'
            }`}>
              {s2Filled ? '88' : '-'}
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              s2Filled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'opacity-30 bg-slate-800'
            }`}>
              {s2Filled ? 'Tuntas (A)' : 'Menunggu'}
            </span>
          </div>
        </div>
      </div>

      {/* Auto Calculation summary */}
      <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-200 flex items-center justify-between">
        <span>Rata-rata Kelas Sementara:</span>
        <span className="font-mono font-bold text-indigo-300">{s2Filled ? '90.0' : s1Filled ? '92.0' : '0.0'} (100% Tuntas)</span>
      </div>
    </div>
  );
};

/* =========================================================================
 * SCENARIO 4: WALI KELAS - PRESENSI HARIAN ROMBEL (Deteksi Alpa & WhatsApp)
 * ========================================================================= */
const SimulationStep4Homeroom: React.FC<{ simTime: number }> = ({ simTime }) => {
  const isWarningClicked = simTime >= 50;

  let cursorX = 250;
  let cursorY = 140;
  let clicking = false;
  let cursorLabel = 'Pantau Siswa';

  if (simTime < 55) {
    cursorX = 260;
    cursorY = 150;
    clicking = simTime >= 45 && simTime <= 52;
    cursorLabel = 'Klik Info Absensi';
  } else {
    cursorX = 220;
    cursorY = 210;
    clicking = false;
    cursorLabel = 'Laporan Siap';
  }

  return (
    <div className="relative space-y-3">
      <VirtualCursor x={cursorX} y={cursorY} clicking={clicking} label={cursorLabel} />

      {/* Homeroom Header */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-blue-400 font-bold uppercase">Rekapitulasi Harian Wali Kelas</div>
          <div className="text-xs font-bold text-slate-100">Kelas Bimbingan: IX-A (32 Siswa)</div>
        </div>
        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
          Semester Ganjil
        </span>
      </div>

      {/* Student List with Warnings */}
      <div className="space-y-1.5">
        <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Ahmad Faiz Al-Faruq</div>
            <div className="text-[10px] text-slate-400">Kehadiran: 78 Hari • Sakit: 1 • Izin: 0 • Alpa: 0</div>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
            98.7% (Sangat Baik)
          </span>
        </div>

        <div className={`p-2 rounded-xl border transition-all ${
          isWarningClicked 
            ? 'bg-amber-950/60 border-amber-500/70 ring-2 ring-amber-500/30' 
            : 'bg-slate-800/50 border-slate-700/50'
        } flex items-center justify-between`}>
          <div>
            <div className="text-xs font-bold text-slate-200">Zulham Efendi</div>
            <div className="text-[10px] text-amber-400 font-semibold">Kehadiran: 70 Hari • Sakit: 4 • Alpa: 2</div>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
            88.6% (Perhatian)
          </span>
        </div>
      </div>

      {/* Simulated Quick Action Toast */}
      {isWarningClicked && (
        <div className="p-2.5 rounded-xl bg-slate-800 border border-amber-500/50 flex items-center justify-between text-xs text-slate-200 animate-in fade-in slide-in-from-bottom-2">
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            Notifikasi WhatsApp Siap Dikirim ke Wali Murid
          </span>
          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
            Kirim WA
          </span>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
 * SCENARIO 5: WALI KELAS - LEGGER NILAI & PERINGKAT OTOMATIS
 * ========================================================================= */
const SimulationStep5Legger: React.FC<{ simTime: number }> = ({ simTime }) => {
  const isRankCalculated = simTime >= 40;

  let cursorX = 240;
  let cursorY = 80;
  let clicking = false;
  let cursorLabel = 'Hitung Peringkat';

  if (simTime < 45) {
    cursorX = 260;
    cursorY = 55;
    clicking = simTime >= 35 && simTime <= 42;
    cursorLabel = 'Klik Urutkan Ranking';
  } else {
    cursorX = 220;
    cursorY = 190;
    clicking = false;
    cursorLabel = 'Peringkat Tersusun';
  }

  return (
    <div className="relative space-y-3">
      <VirtualCursor x={cursorX} y={cursorY} clicking={clicking} label={cursorLabel} />

      {/* Legger Header */}
      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-purple-400 font-bold uppercase">Legger Nilai Terpadu Rombel</div>
          <div className="text-xs font-bold text-slate-100">14 Mata Pelajaran Terhimpun</div>
        </div>
        <button
          type="button"
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
            isRankCalculated 
              ? 'bg-purple-600 text-white ring-2 ring-purple-400/40' 
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          {isRankCalculated ? '✓ Peringkat Selesai' : 'Hitung Peringkat'}
        </button>
      </div>

      {/* Legger Ranks Table */}
      <div className="space-y-1.5">
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center border border-amber-500/40">
              1
            </span>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <span>Ahmad Faiz Al-Faruq</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-[10px] text-slate-400">Total Nilai: 1.185 • Rata-rata: 89.2</div>
            </div>
          </div>
          <span className="text-[11px] font-black text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
            Juara 1 🥇
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-500/20 text-slate-300 font-black text-xs flex items-center justify-center border border-slate-500/40">
              2
            </span>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <span>Fatimah Azzahra</span>
                <Award className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <div className="text-[10px] text-slate-400">Total Nilai: 1.170 • Rata-rata: 88.5</div>
            </div>
          </div>
          <span className="text-[11px] font-black text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            Juara 2 🥈
          </span>
        </div>
      </div>

      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
        <span>Ekspor Legger:</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Format Excel (.xlsx) Siap Diunduh
        </span>
      </div>
    </div>
  );
};

/* =========================================================================
 * SCENARIO 6: CETAK RESMI KOP KEMENAG & TAUTAN PUBLIK
 * ========================================================================= */
const SimulationStep6PrintShare: React.FC<{ simTime: number }> = ({ simTime }) => {
  const isLinkCopied = simTime >= 55;

  let cursorX = 230;
  let cursorY = 150;
  let clicking = false;
  let cursorLabel = 'Bagikan Link';

  if (simTime < 60) {
    cursorX = 260;
    cursorY = 155;
    clicking = simTime >= 50 && simTime <= 57;
    cursorLabel = 'Klik Salin Link';
  } else {
    cursorX = 140;
    cursorY = 190;
    clicking = false;
    cursorLabel = 'Siap Dibagikan';
  }

  return (
    <div className="relative space-y-3">
      <VirtualCursor x={cursorX} y={cursorY} clicking={clicking} label={cursorLabel} />

      {/* Simulated Document Preview Card */}
      <div className="p-3 rounded-xl bg-slate-100 text-slate-900 border border-slate-300 shadow-md">
        <div className="text-center pb-2 border-b border-slate-300 mb-2">
          <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
          <div className="text-xs font-black text-slate-900">MADRASAH TSANAWIYAH NEGERI 1</div>
          <div className="text-[8px] text-slate-500">Jl. Pangeran Diponegoro No. 12 • Akreditasi A (Unggul)</div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 pb-1">
          <span>REKAPITULASI RESMI TAHUN AJARAN 2026/2027</span>
          <span className="text-emerald-700 font-black">TERVALIDASI</span>
        </div>

        {/* Signature Box */}
        <div className="pt-2 mt-1 border-t border-slate-200 grid grid-cols-2 text-[8px] text-center">
          <div>
            <div>Mengetahui, Kepala Madrasah</div>
            <div className="font-bold pt-4 text-slate-900">H. Ahmad Fauzi, M.Pd.I</div>
          </div>
          <div>
            <div>Guru Pengampu / Wali Kelas</div>
            <div className="font-bold pt-4 text-slate-900">Ustadz Rahmat, S.Pd.I</div>
          </div>
        </div>
      </div>

      {/* Share via Link Box */}
      <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
        <div className="truncate max-w-[65%]">
          <div className="text-[9px] text-emerald-400 font-bold uppercase">Tautan Publik Aman (Read-Only)</div>
          <div className="text-[11px] font-mono text-slate-200 truncate">dadu.app/?share=legger-ix-a-2026</div>
        </div>
        <button
          type="button"
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
            isLinkCopied 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
          }`}
        >
          {isLinkCopied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
