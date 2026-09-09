export interface ChangeLogItem {
  version: string;
  versionCode: string;
  releaseDate: string; // Format Indonesia: 7 September 2026
  title: string;
  badge?: string;
  highlights: {
    category: string;
    items: string[];
  }[];
}

export const APP_CHANGELOGS: ChangeLogItem[] = [
  {
    version: 'ver. 2.0-JRA',
    versionCode: '2.0.0-JRA',
    releaseDate: '7 September 2026',
    title: 'Pembaruan Besar: Sistem Ekosistem Guru Terpadu & Multi-Rombel Cerdas',
    badge: 'Rilis Utama',
    highlights: [
      {
        category: 'Data Master Siswa & Impor Excel Cerdas',
        items: [
          'Template Excel resmi kini dilengkapi kolom "Kelas/Rombel" untuk pengisian multi-kelas dalam satu berkas.',
          'Deteksi Otomatis Rombel: Sistem otomatis mencocokkan nama kelas di Excel dengan rombel aktif di sistem.',
          'Resolusi Kelas Tidak Ditemukan: Muncul opsi pemetaan cepat dan fleksibel jika penamaan kelas di file belum terdaftar.',
          'Sanitasi Tanggal Lahir Cerdas: Otomatis mengenali angka seri Excel, format DD/MM/YYYY, teks bulan, dan ISO YYYY-MM-DD.',
          'Deteksi Alamat Fleksibel: Mendukung berbagai alias kolom alamat (Alamat, Alamat Siswa, Domisili) & penayangan langsung di tabel.',
          'Preservasi Urutan Alfabetis (A–Z): Nomor absen dihitung otomatis per-kelas mengikuti urutan data nama yang sudah terurut.',
          'Tombol cepat "Unduh Template" langsung di halaman utama Data Master Siswa.'
        ]
      },
      {
        category: 'Administrasi Rapor & Ujian Resmi',
        items: [
          'Fitur Cetak Kartu Ujian Siswa terpadu dengan QR Code verifikasi resmi madrasah.',
          'Pencetakan Massal Buku Rapor (Batch Printing) untuk satu rombel kelas sekaligus.',
          'Layout cetak dokumen berstandar Kemenag (Legger Nilai, Rekap Jurnal Mengajar, dan Presensi).'
        ]
      },
      {
        category: 'Ruang Guru & Wali Kelas',
        items: [
          'Jurnal Mengajar Harian terintegrasi Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP).',
          'Sistem Penilaian Cepat dengan fitur salin-tempel (Paste Grid) langsung dari spreadsheet.',
          'Monitoring Kehadiran Harian & Bulanan lengkap dengan kalkulasi persentase otomatis.'
        ]
      },
      {
        category: 'Keamanan & Ketahanan Data',
        items: [
          'Fitur Relationship Recovery untuk perbaikan dan sinkronisasi data siswa yang belum memiliki rombel.',
          'Sinkronisasi real-time berbasis Firebase Firestore dengan indikator status sinkronisasi aktif.'
        ]
      }
    ]
  }
];

export const LATEST_CHANGELOG = APP_CHANGELOGS[0];
export const CHANGELOG_STORAGE_KEY = `dadu_seen_changelog_${LATEST_CHANGELOG.versionCode}`;
