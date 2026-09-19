import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Layers, CalendarCheck2, CheckSquare, Award, Users, BarChart3, FileSpreadsheet, StickyNote, Printer } from 'lucide-react';
import { Badge } from './Badge';

interface PhaseShellPageProps {
  route: string;
  onNavigate: (route: string) => void;
}

export const PhaseShellPage: React.FC<PhaseShellPageProps> = ({ route, onNavigate }) => {
  const { activeAcademicYear, activeSemester, selectedAssignment } = useWorkspace();

  const configs: Record<string, { title: string; subtitle: string; icon: any; phase: string; desc: string }> = {
    'teaching': {
      title: 'Pengajaran Saya',
      subtitle: 'Daftar penugasan kelas dan mata pelajaran aktif',
      icon: Layers,
      phase: 'Phase 3 — Teacher Module',
      desc: 'Modul ini menampilkan daftar detail pertemuan, absensi, dan penilaian per kelas yang Anda ajar.',
    },
    'meetings': {
      title: 'Pertemuan & Jurnal Mengajar',
      subtitle: 'Catatan agenda kegiatan belajar, materi, dan tujuan pembelajaran',
      icon: CalendarCheck2,
      phase: 'Phase 3 — Teacher Module',
      desc: 'Pencatatan jurnal per pertemuan terhubung langsung dengan kehadiran siswa pada kelas & mapel aktif.',
    },
    'attendance-subject': {
      title: 'Presensi Mata Pelajaran',
      subtitle: 'Presensi cepat siswa per jam pertemuan mapel',
      icon: CheckSquare,
      phase: 'Phase 3 — Teacher Module',
      desc: 'Alur 1-klik Hadir Semua, rekap H/S/I/A/D, dan pencatatan riwayat kehadiran langsung ke Firestore.',
    },
    'grades': {
      title: 'Nilai Akademik & Penilaian',
      subtitle: 'Input tugas, kuis, praktik, sumatif & formula perhitungan otomatis',
      icon: Award,
      phase: 'Phase 5 — Assessment',
      desc: 'Spreadsheet modern dengan dukungan paste Excel, weighted average calculation engine, dan validasi nilai.',
    },
    'homeroom-dashboard': {
      title: 'Dashboard Wali Kelas',
      subtitle: 'Ringkasan komprehensif kehadiran dan perkembangan siswa binaan',
      icon: Users,
      phase: 'Phase 4 — Homeroom Module',
      desc: 'Statistik harian, rekap ketidakhadiran, grafik tren, dan pemantauan siswa.',
    },
    'homeroom-attendance-daily': {
      title: 'Presensi Harian Kelas',
      subtitle: 'Buku absensi harian wali kelas per tanggal',
      icon: CheckSquare,
      phase: 'Phase 4 — Homeroom Module',
      desc: 'Pencatatan kehadiran harian seluruh siswa kelas dengan status Hadir, Sakit, Izin, Alpa, Dispensasi.',
    },
    'homeroom-attendance-monthly': {
      title: 'Presensi Bulanan (Matriks)',
      subtitle: 'Tampilan buku presensi bulanan tanggal 1 s.d. 31',
      icon: BarChart3,
      phase: 'Phase 4 — Homeroom Module',
      desc: 'Matriks kehadiran bulanan interaktif dengan rekap otomatis per siswa.',
    },
    'homeroom-students': {
      title: 'Data Siswa Kelas',
      subtitle: 'Daftar induk siswa, biodata, NIS/NISN, dan status enrollment',
      icon: FileSpreadsheet,
      phase: 'Phase 4 — Homeroom Module',
      desc: 'Profil lengkap siswa, rekap kehadiran individual, catatan kepribadian, dan import Excel.',
    },
    'homeroom-notes': {
      title: 'Catatan & Konseling Siswa',
      subtitle: 'Pencatatan pembinaan karakter, prestasi, dan kejadian khusus',
      icon: StickyNote,
      phase: 'Phase 4 — Homeroom Module',
      desc: 'Log catatan berkategori (Akademik, Perilaku, Prestasi, Kedisiplinan) dengan penanda penting.',
    },
    'reports-attendance': {
      title: 'Laporan Rekap Presensi',
      subtitle: 'Dokumen rekap presensi mapel dan presensi harian',
      icon: BarChart3,
      phase: 'Phase 6 — Reports & Legger',
      desc: 'Rekapitulasi kehadiran siap cetak & ekspor dengan kop madrasah dan tanda tangan.',
    },
    'reports-grades': {
      title: 'Laporan Daftar Nilai',
      subtitle: 'Daftar nilai akhir per komponen penilaian',
      icon: Award,
      phase: 'Phase 6 — Reports & Legger',
      desc: 'Format cetak daftar nilai resmi per semester untuk pengarsipan kurikulum.',
    },
    'reports-legger': {
      title: 'Legger Nilai Akademik',
      subtitle: 'Tabel legger terpadu hasil olahan seluruh nilai',
      icon: BarChart3,
      phase: 'Phase 6 — Reports & Legger',
      desc: 'Legger otomatis tanpa input ulang, siap ekspor ke Excel dan PDF.',
    },
    'reports-journal': {
      title: 'Laporan Jurnal Mengajar',
      subtitle: 'Rekapitulasi jurnal kegiatan belajar mengajar per semester',
      icon: CalendarCheck2,
      phase: 'Phase 6 — Reports & Legger',
      desc: 'Dokumen bukti fisik keterlaksanaan kurikulum dan materi pembelajaran.',
    },
    'reports-center': {
      title: 'Report Center',
      subtitle: 'Pusat unduhan dan cetak dokumen resmi madrasah',
      icon: Printer,
      phase: 'Phase 6 & 7 — Export Center',
      desc: 'Ekspor berformat PDF, PNG, Excel berkualitas tinggi dengan layout presisi.',
    },
    'master-students': {
      title: 'Master Data Siswa & Enrollment',
      subtitle: 'Kelola basis data seluruh siswa dan penempatan kelas',
      icon: Users,
      phase: 'Phase 2 — Master Data',
      desc: 'Import Excel, pencarian NIS/NISN, aktivasi/arsip siswa, dan validasi nomor absen unik.',
    },
  };

  const item = configs[route] || {
    title: 'Halaman Modul',
    subtitle: 'Modul Dadu Workspace',
    icon: Layers,
    phase: 'Pengembangan Bertahap',
    desc: 'Modul ini siap dikembangkan pada tahapan fase berikutnya sesuai arsitektur master prompt.',
  };

  const Icon = item.icon;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="success" size="sm">{item.phase}</Badge>
          <span className="text-xs text-slate-400">• Konteks: {activeAcademicYear?.label || '2026/2027'} ({activeSemester})</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Icon className="w-5 h-5 text-emerald-600" />
          {item.title}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{item.subtitle}</p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-2xs text-center max-w-xl mx-auto my-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="font-bold text-base text-slate-800">{item.title}</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          {item.desc}
        </p>

        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 my-5 text-left border border-slate-100">
          <p className="font-semibold text-slate-700 mb-1">Pondasi Phase 1 Aktif:</p>
          <p className="text-[11px] text-slate-500">
            • Database Firestore terisolasi per user (/users/{'{uid}'}/...)<br />
            • Autentikasi email/password aktif & terproteksi<br />
            • Context Selector tahun ajaran, kelas, dan mapel berjalan otomatis
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          ← Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
};
