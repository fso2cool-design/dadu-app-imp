import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MagnifyingGlass, Stack, CalendarCheck, CheckSquare, Medal, Users, ChartBar, FileCsv, Notepad, Printer, BookOpen, ArrowRight, User, GraduationCap, Buildings, Database, Sliders, X } from '@phosphor-icons/react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string, state?: any) => void;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'MENU' | 'KELAS' | 'MAPEL' | 'LAPORAN' | 'PENGATURAN';
  icon: any;
  route: string;
  state?: any;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { classes, teachingAssignments, setSelectedAssignment } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static Navigation Items
  const staticItems: SearchResultItem[] = [
    { id: 'nav-dashboard', title: 'Dashboard Utama', subtitle: 'Ikhtisar aktivitas mengajar & statistik', category: 'MENU', icon: Stack, route: 'dashboard' },
    { id: 'nav-teaching', title: 'Pengajaran Saya', subtitle: 'Daftar penugasan rombel dan mapel aktif', category: 'MENU', icon: BookOpen, route: 'teaching' },
    { id: 'nav-meetings', title: 'Pertemuan & Jurnal KBM', subtitle: 'Catatan agenda mengajar & materi', category: 'MENU', icon: CalendarCheck, route: 'meetings' },
    { id: 'nav-attendance-subject', title: 'Presensi Mata Pelajaran', subtitle: 'Absensi cepat pertemuan mapel H/S/I/A/D', category: 'MENU', icon: CheckSquare, route: 'attendance-subject' },
    { id: 'nav-grades', title: 'Buku Nilai & Asesmen', subtitle: 'Penginputan nilai formatif, sumatif & bobot', category: 'MENU', icon: Medal, route: 'grades' },
    { id: 'nav-homeroom-dashboard', title: 'Dashboard Wali Kelas', subtitle: 'Ringkasan kelas binaan & absensi', category: 'MENU', icon: Users, route: 'homeroom-dashboard' },
    { id: 'nav-homeroom-attendance-daily', title: 'Presensi Harian Kelas', subtitle: 'Absensi harian rombongan belajar', category: 'MENU', icon: CheckSquare, route: 'homeroom-attendance-daily' },
    { id: 'nav-homeroom-attendance-monthly', title: 'Presensi Bulanan (Matriks)', subtitle: 'Buku absensi bulanan tanggal 1-31', category: 'MENU', icon: ChartBar, route: 'homeroom-attendance-monthly' },
    { id: 'nav-homeroom-students', title: 'Data Siswa Binaan', subtitle: 'Daftar biodata siswa kelas wali', category: 'MENU', icon: Users, route: 'homeroom-students' },
    { id: 'nav-homeroom-notes', title: 'Catatan & Konseling Siswa', subtitle: 'Jurnal kejadian & bimbingan siswa', category: 'MENU', icon: Notepad, route: 'homeroom-notes' },
    { id: 'nav-reports-attendance', title: 'Laporan Rekap Presensi', subtitle: 'Cetak dokumen rekap kehadiran resmi', category: 'LAPORAN', icon: ChartBar, route: 'reports-attendance' },
    { id: 'nav-reports-grades', title: 'Laporan Daftar Nilai', subtitle: 'Cetak daftar nilai per mapel', category: 'LAPORAN', icon: Medal, route: 'reports-grades' },
    { id: 'nav-reports-legger', title: 'Legger Nilai Rombel', subtitle: 'Matriks legger nilai terpadu & ranking', category: 'LAPORAN', icon: FileCsv, route: 'reports-legger' },
    { id: 'nav-reports-journal', title: 'Laporan Jurnal Mengajar', subtitle: 'Buku rekapitulasi KBM semester', category: 'LAPORAN', icon: CalendarCheck, route: 'reports-journal' },
    { id: 'nav-reports-center', title: 'Pusat Format Dokumen & Cetak', subtitle: 'Report Center & pengaturan kop', category: 'LAPORAN', icon: Printer, route: 'reports-center' },
    { id: 'nav-master-students', title: 'Master Data Siswa & Rombel', subtitle: 'Database induk seluruh siswa madrasah', category: 'MENU', icon: GraduationCap, route: 'master-students' },
    { id: 'nav-settings-profile', title: 'Profil Guru & Tanda Tangan', subtitle: 'Biodata & tanda tangan digital resmi', category: 'PENGATURAN', icon: User, route: 'settings-profile' },
    { id: 'nav-settings-school', title: 'Identitas Madrasah & Stempel', subtitle: 'Nama lembaga, NSM, NPSN & Kepala', category: 'PENGATURAN', icon: Buildings, route: 'settings-school' },
    { id: 'nav-settings-document', title: 'Format Dokumen & Kop Surat', subtitle: 'Ukuran kertas, margin & kop Kemenag', category: 'PENGATURAN', icon: Printer, route: 'settings-document' },
    { id: 'nav-settings-backup', title: 'Backup & Restore Database', subtitle: 'Ekspor/impor seluruh data JSON 1-klik', category: 'PENGATURAN', icon: Database, route: 'settings-backup' },
    { id: 'nav-settings-stats', title: 'Kesehatan Database Firestore', subtitle: 'Metrik latensi & jumlah dokumen', category: 'PENGATURAN', icon: Sliders, route: 'settings-stats' },
  ];

  // Dynamic Teaching Class items
  const dynamicTeachingItems: SearchResultItem[] = teachingAssignments.map(asg => ({
    id: `asg-${asg.id}`,
    title: `Kelas ${asg.className || 'Rombel'} • ${asg.subjectName || 'Mapel'}`,
    subtitle: `Pengajaran ${asg.semester} • Kode: ${asg.subjectCode || '-'}`,
    category: 'KELAS',
    icon: BookOpen,
    route: 'meetings',
    state: { assignmentId: asg.id },
  }));

  // Dynamic Classes
  const dynamicClassItems: SearchResultItem[] = classes.map(c => ({
    id: `cls-${c.id}`,
    title: `Rombel Kelas ${c.name}`,
    subtitle: `Tingkat ${c.gradeLevel} ${c.major ? `(${c.major})` : ''}`,
    category: 'KELAS',
    icon: Users,
    route: 'homeroom-students',
    state: { classId: c.id },
  }));

  // Filter items based on query
  const allItems = [...dynamicTeachingItems, ...dynamicClassItems, ...staticItems];

  const filteredItems = query.trim() === ''
    ? staticItems.slice(0, 10)
    : allItems.filter(item => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }).slice(0, 12);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelectItem = (item: SearchResultItem) => {
    if (item.category === 'KELAS' && item.state?.assignmentId) {
      const asg = teachingAssignments.find(a => a.id === item.state.assignmentId);
      if (asg) setSelectedAssignment(asg);
    }
    onNavigate(item.route, item.state);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        className="bg-[var(--ds-surface-elevated)] rounded-3xl border border-[var(--ds-border)] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* MagnifyingGlass Bar Input */}
        <div className="p-4 border-b border-[var(--ds-border)] flex items-center gap-3">
          <MagnifyingGlass className="w-5 h-5 text-[var(--ds-accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari menu, kelas, mapel, siswa, laporan, atau pengaturan... (Ketik kata kunci)"
            className="w-full text-xs font-semibold text-[var(--ds-text)] placeholder-[var(--ds-text-muted)] focus:outline-hidden bg-transparent"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] text-[10px] font-mono text-[var(--ds-text-muted)]">ESC</kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-[var(--ds-border)]">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-[var(--ds-text-muted)] text-xs">
              Tidak ditemukan hasil untuk <span className="font-semibold text-[var(--ds-text)]">"{query}"</span>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]' 
                      : 'hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? 'bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] shadow-xs' 
                        : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] border border-[var(--ds-border)]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate text-[var(--ds-text)]">{item.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider ${
                          item.category === 'KELAS' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/30' :
                          item.category === 'LAPORAN' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30' :
                          item.category === 'PENGATURAN' ? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] border border-[var(--ds-border)]' :
                          'bg-[var(--ds-accent-soft)] text-[var(--ds-accent)] border border-[var(--ds-border)]'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--ds-text-muted)] truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${
                    isSelected ? 'opacity-100 text-[var(--ds-accent)]' : 'opacity-0'
                  }`} />
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer / Shortcuts Help */}
        <div className="p-3 border-t border-[var(--ds-border)] bg-[var(--ds-surface-muted)] flex items-center justify-between text-[11px] text-[var(--ds-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[9px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[9px] font-mono">↓</kbd>
              <span>Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[9px] font-mono">↵</kbd>
              <span>Buka</span>
            </span>
          </div>
          <span>Dadu Workspace Quick Nav</span>
        </div>
      </div>
    </div>
  );
};
