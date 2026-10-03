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

  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [docSettings, setDocSettings] = useState<DocumentSettings>({
    documentFont: 'Inter',
    paperSize: 'A4',
    defaultOrientation: 'PORTRAIT',
    headerEnabled: true,
    signatureEnabled: true,
    city: 'Jakarta',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const [school, doc] = await Promise.all([
          app.settings.getSchoolSettings(user.uid),
          app.settings.getDocumentSettings(user.uid),
        ]);
        setSchoolSettings(school);
        if (doc) {
          setDocSettings(doc);
        } else if (school?.district || school?.regency) {
          setDocSettings(prev => ({
            ...prev,
            city: school.district || school.regency || 'Kota',
          }));
        }
      } catch (err) {
        console.error('Error loading report center settings:', err);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingSettings(true);
    try {
      await app.settings.saveDocumentSettings(user.uid, docSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving document settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {reportCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-2xl p-5 shadow-2xs hover:shadow-sm hover:border-[var(--ds-accent)] transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={card.badgeColor as any} size="sm">
                        {card.badge}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--ds-text-muted)] tracking-wider block">
                        {card.category}
                      </span>
                      <h4 className="font-bold text-sm text-[var(--ds-text)] group-hover:text-[var(--ds-accent)] transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs text-[var(--ds-text-muted)] mt-1.5 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[var(--ds-border)] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onNavigate(card.route)}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--ds-accent-soft)] hover:opacity-90 text-[var(--ds-accent)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer w-full justify-center"
                    >
                      <span>Buka & Cetak Laporan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Document Gear & Format Customizer */}
        <div className="space-y-4">
          <div className="bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--ds-border)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--ds-text)]">Format Default Dokumen</h3>
                <p className="text-[11px] text-[var(--ds-text-muted)]">Pengaturan kop, kertas & tanda tangan</p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-3.5 text-xs">
              {/* Paper Size */}
              <div>
                <label className="font-semibold text-[var(--ds-text)] block mb-1">Ukuran Kertas Standar</label>
                <select
                  value={docSettings.paperSize}
                  onChange={(e) => setDocSettings({ ...docSettings, paperSize: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-text)] focus:bg-[var(--ds-surface-elevated)] focus:outline-none focus:border-[var(--ds-accent)]"
                >
                  {(Object.keys(PAPER) as Array<keyof typeof PAPER>).map((key) => (
                    <option key={key} value={key}>{PAPER[key].label}</option>
                  ))}
                </select>
              </div>

              {/* Default Orientation */}
              <div>
                <label className="font-semibold text-[var(--ds-text)] block mb-1">Orientasi Kertas Default</label>
                <select
                  value={docSettings.defaultOrientation}
                  onChange={(e) => setDocSettings({ ...docSettings, defaultOrientation: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-text)] focus:bg-[var(--ds-surface-elevated)] focus:outline-none focus:border-[var(--ds-accent)]"
                >
                  <option value="PORTRAIT">Tegak (Portrait)</option>
                  <option value="LANDSCAPE">Mendatar (Landscape)</option>
                </select>
              </div>

              {/* City for signature */}
              <div>
                <label className="font-semibold text-[var(--ds-text)] block mb-1">Kota Titimangsa Tanda Tangan</label>
                <input
                  type="text"
                  value={docSettings.city || ''}
                  onChange={(e) => setDocSettings({ ...docSettings, city: e.target.value })}
                  placeholder="Contoh: Surabaya, Malang, Jakarta"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] font-medium text-[var(--ds-text)] focus:bg-[var(--ds-surface-elevated)] focus:outline-none focus:border-[var(--ds-accent)]"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docSettings.headerEnabled}
                    onChange={(e) => setDocSettings({ ...docSettings, headerEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[var(--ds-text)] font-medium">Sertakan Kop Surat Madrasah</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docSettings.signatureEnabled}
                    onChange={(e) => setDocSettings({ ...docSettings, signatureEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-[var(--ds-text)] font-medium">Sertakan Blok Tanda Tangan Resmi</span>
                </label>
              </div>

              {/* School identity status info */}
              <div className="p-3 bg-[var(--ds-surface-muted)] rounded-xl border border-[var(--ds-border)] text-[11px] text-[var(--ds-text-muted)]">
                <div className="flex items-center gap-1.5 font-semibold text-[var(--ds-text)] mb-1">
                  <Buildings className="w-3.5 h-3.5 text-[var(--ds-accent)]" />
                  <span>Identitas Terdaftar:</span>
                </div>
                <p className="text-[var(--ds-text)] font-medium truncate">
                  {schoolSettings?.schoolName || 'Madrasah Tsanawiyah Negeri 1'}
                </p>
                <p className="text-[10px] text-[var(--ds-text-muted)] font-mono mt-0.5">
                  Kepala: {schoolSettings?.headmasterName || 'H. Ahmad Fauzi, M.Pd.I'}
                </p>
              </div>

              {saveSuccess && (
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Format dokumen berhasil disimpan!
                </div>
              )}

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2 px-3 rounded-xl bg-[var(--ds-accent)] hover:opacity-90 text-[var(--ds-accent-fg)] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Gear className="w-3.5 h-3.5" />
                <span>{savingSettings ? 'Menyimpan...' : 'Simpan Format Dokumen'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
