import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PAPER } from '../../constants/print';
import { useApplication } from '../../application/ApplicationContext';
import { Badge } from '../../components/common/Badge';
import { SchoolSettings, DocumentSettings } from '../../types';
import { Printer, CreditCard, FileText, ChartBar, Table, CalendarCheck, Medal, Users, Notepad, CheckCircle, Sliders, ArrowRight, FileCsv, Buildings, Download, Gear, Sparkle, GraduationCap } from '@phosphor-icons/react';

interface ReportCenterPageProps {
  onNavigate: (route: string) => void;
}

export const ReportCenterPage: React.FC<ReportCenterPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const app = useApplication();
  const { activeAcademicYear, activeSemester } = useWorkspace();
const reportCards = [
    {
      id: 'reports-rapor',
      title: 'Cetak Rapor & Hasil Belajar Siswa',
      category: 'Rapor Resmi Madrasah',
      desc: 'Lembar resmi Rapor Semester dan Rapor Sisipan (STS) per siswa atau batch cetak 1 kelas lengkap dengan Kop 4-Tingkat dan tanda tangan 3 pihak.',
      icon: GraduationCap,
      badge: 'Prioritas',
      badgeColor: 'emerald',
      route: 'reports-rapor',
    },
    {
      id: 'reports-attendance',
      title: 'Laporan Rekap Presensi',
      category: 'Presensi & Kehadiran',
      desc: 'Rekapitulasi persentase kehadiran siswa per mapel atau presensi harian wali kelas lengkap dengan statistik H/S/I/A.',
      icon: ChartBar,
      badge: 'Resmi',
      badgeColor: 'blue',
      route: 'reports-attendance',
    },
    {
      id: 'reports-grades',
      title: 'Laporan Daftar Nilai Mapel',
      category: 'Penilaian Akademik',
      desc: 'Daftar nilai semesteran per komponen tugas, ulangan harian, STS, SAS, nilai akhir berbobot, dan keterangan ketuntasan KKTP.',
      icon: Medal,
      badge: 'Kurikulum',
      badgeColor: 'purple',
      route: 'reports-grades',
    },
    {
      id: 'reports-legger',
      title: 'Legger Nilai Akademik Rombel',
      category: 'Evaluasi Terpadu',
      desc: 'Tabel legger terpadu hasil olahan seluruh mata pelajaran, rekap total nilai, rata-rata kelas, dan perankingan siswa otomatis.',
      icon: Table,
      badge: 'Wali Kelas',
      badgeColor: 'amber',
      route: 'reports-legger',
    },
    {
      id: 'reports-journal',
      title: 'Buku Jurnal Agenda Mengajar',
      category: 'Bukti Fisik KBM',
      desc: 'Rekapitulasi pelaksanaan pembelajaran (KBM), materi, tujuan pembelajaran, keterlaksanaan, dan absensi per pertemuan.',
      icon: CalendarCheck,
      badge: 'Administrasi',
      badgeColor: 'emerald',
      route: 'reports-journal',
    },
    {
      id: 'homeroom-students',
      title: 'Daftar Induk & Biodata Siswa',
      category: 'Data Kesiswaan',
      desc: 'Buku induk siswa kelas, nomor NIS/NISN, jenis kelamin, dan kontak orang tua wali siswa.',
      icon: Users,
      badge: 'Kesiswaan',
      badgeColor: 'slate',
      route: 'homeroom-students',
    },
    {
      id: 'student-progress-report',
      title: 'Rapor Sisipan / Lembar Kemajuan STS',
      category: 'Laporan Wali Kelas',
      desc: 'Lembar evaluasi capaian tengah semester per siswa, rekap presensi H/S/I/A, catatan pembinaan, dan teks pesan WhatsApp untuk wali santri.',
      icon: FileText,
      badge: 'Baru',
      badgeColor: 'emerald',
      route: 'homeroom-students',
    },
    {
      id: 'student-id-card',
      title: 'Kartu Pelajar Siswa (Virtual & Cetak)',
      category: 'Identitas Siswa',
      desc: 'Kartu identitas resmi siswa madrasah dengan avatar karakter, QR Code kode akses mandiri, info tanggal lahir, dan format cetak fisik siap potong A4.',
      icon: CreditCard,
      badge: 'Digital',
      badgeColor: 'emerald',
      route: 'homeroom-students',
    },
    {
      id: 'homeroom-notes',
      title: 'Rekap Catatan & Bimbingan Siswa',
      category: 'Bimbingan Karakter',
      desc: 'Log catatan prestasi, kedisiplinan, tindak lanjut wali kelas, dan pembinaan kepribadian siswa.',
      icon: Notepad,
      badge: 'Konseling',
      badgeColor: 'rose',
      route: 'homeroom-notes',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--ds-text)] tracking-tight flex items-center gap-2">
          <Printer className="w-5 h-5 text-[var(--ds-accent)]" />
          Pusat Laporan & Cetak Dokumen
        </h1>
        <p className="text-xs text-[var(--ds-text-muted)] mt-1">
          Pusat pencetakan dan ekspor dokumen resmi madrasah, kustomisasi kop surat, dan manajemen format laporan.
        </p>
      </div>

      {/* Main Grid: Catalog and Document Gear */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Report Catalog Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--ds-text)] flex items-center gap-2">
              <FileCsv className="w-4 h-4 text-[var(--ds-accent)]" />
              Katalog Dokumen Resmi Siap Cetak
            </h3>
            <span className="text-xs text-[var(--ds-text-muted)] font-medium">6 Format Laporan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportCards.map(card => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onNavigate(card.route)}
                    className="w-full text-left bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-xl p-3 shadow-xs hover:shadow-sm hover:border-[var(--ds-accent)] hover:bg-[var(--ds-surface-muted)] transition-all flex items-center gap-3 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-xs text-[var(--ds-text)] truncate">{card.title}</h4>
                      </div>
                      <p className="text-[10px] text-[var(--ds-text-muted)] line-clamp-1">
                        {card.desc}
                      </p>
                    </div>

                    <div className="shrink-0 pl-1">
                      <ArrowRight className="w-4 h-4 text-[var(--ds-text-muted)] group-hover:text-[var(--ds-accent)] transition-colors group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
        </div>

        {/* Right 1 Col: Master Identity Settings Shortcut */}
          <div className="space-y-4">
            <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--ds-border)]">
                <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] flex items-center justify-center">
                  <Buildings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--ds-text)]">Format Master Dokumen</h3>
                  <p className="text-[11px] text-[var(--ds-text-muted)]">Kop, logo & identitas madrasah</p>
                </div>
              </div>
              
              <div className="text-xs text-[var(--ds-text-muted)] mb-4">
                Pengaturan utama identitas dokumen, logo, dan file scan tanda tangan kini dikelola terpusat agar lebih rapi dan konsisten.
              </div>
              
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-border)] text-[var(--ds-text)] border border-[var(--ds-border)] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Gear className="w-4 h-4" />
                <span>Buka Pengaturan Identitas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
};