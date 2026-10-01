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
    version: 'ver. 2.4.0-JRA',
    versionCode: '2.4.0-JRA',
    releaseDate: '1 Oktober 2026',
    title: 'Tampilan Baru: Paper-Craft, Minimalist & Atelier + Mode Gelap',
    badge: 'Tampilan',
    highlights: [
      {
        category: 'Gaya Visual Baru',
        items: [
          'Tiga gaya baru menggantikan yang lama: Paper-Craft (kertas hangat), Minimalist (bersih dan rapi), dan Atelier (premium) — ganti instan via menu Pengaturan.',
          'Setiap gaya kini punya mode gelap: tombol bulan/matahari di pengaturan untuk beralih terang-gelap.',
          'Pilihan lama Anda tetap terbawa otomatis ke gaya baru yang sepadan.',
        ],
      },
      {
        category: 'Keterbacaan & Ikon',
        items: [
          'Huruf baru (Geist dan Newsreader) tersimpan di aplikasi — tetap bagus walau tanpa internet.',
          'Seluruh ikon diganti ke keluarga Phosphor agar tampil seragam di semua halaman.',
          'Semua kombinasi warna teks sudah diuji kontrasnya agar tetap terbaca jelas, termasuk mode gelap.',
        ],
      },
    ],
  },
  {
    version: 'ver. 2.3.1-JRA',
    versionCode: '2.3.1-JRA',
    releaseDate: '1 Oktober 2026',
    title: 'Keamanan & Kinerja: Satu Superadmin, Cetakan Formal, dan Aplikasi Lebih Ringan',
    badge: 'Keamanan',
    highlights: [
      {
        category: 'Keamanan',
        items: [
          'Satu akun superadmin dengan klaim admin resmi — atur pengguna dan peran hanya dari akun utama.',
          'Aturan database diperketat dan sudah aktif di server: tiap pengguna hanya mengakses datanya sendiri.',
          'Dukungan App Check disiapkan (opsional) sebagai lapisan anti-penyalahgunaan kuota.',
        ],
      },
      {
        category: 'Kinerja & Cetakan',
        items: [
          'Pustaka Excel dimuat hanya saat dibutuhkan — aplikasi dibuka lebih cepat.',
          'Dokumen cetak (A4/F4) selalu tampil formal: tanpa bayangan dan sudut gaya aplikasi.',
          'Kontras tombol diperbaiki agar teks selalu terbaca jelas di semua gaya visual.',
        ],
      },
    ],
  },
  {
    version: 'ver. 2.3-JRA',
    versionCode: '2.3.0-JRA',
    releaseDate: '30 September 2026',
    title: 'Evolusi Design System: 3 Gaya Visual — Brutalism, Apple Glass & Neo-Skeuomorphic',
    badge: 'Design System',
    highlights: [
      {
        category: 'Design System Modern',
        items: [
          'Tiga pilihan gaya visual: Brutalism (tegas, kontras tinggi), Apple Glass (transparan elegan), dan Neo-Skeuomorphic (emboss lembut) — ganti instan via menu Pengaturan.',
        ],
      },
      {
        category: 'Performa & Arsitektur',
        items: [
          'Hapus 5 tema lama, ringankan CSS, dan rapikan arsitektur layered — tetap cepat, tetap stabil saat offline.',
        ],
      },
    ],
  },
  {
    version: 'ver. 2.2-JRA',
    versionCode: '2.2.0-JRA',
    releaseDate: '12 September 2026',
    title: 'Pembaruan Antarmuka: Akses Cepat 1-Klik, Penataan Hirarki & Stabilitas Matriks',
    badge: 'Pembaruan UI/UX',
    highlights: [
      {
        category: 'Navigasi Efisien 1-Klik (Sidebar Accordion)',
        items: [
          'Akses langsung ke Jurnal KBM, Presensi Sesi, Input Nilai, dan Roster Wali Kelas langsung dari bilah sisi (Sidebar) tanpa harus masuk melalui tab bertingkat ganda.',
          'Sub-menu cerdas yang otomatis terbuka sesuai modul aktif dan dapat diperluas/diciutkan sesuai kebutuhan guru.',
        ]
      },
      {
        category: 'Pengalaman Pengguna & Tata Letak Bersih',
        items: [
          'Pengelompokan aksi yang lebih lapang dan bebas distraksi, dengan prioritas utama pada KBM hari ini.',
          'Penyempurnaan kontras warna dan ukuran target sentuh (touch target) yang ramah perangkat tablet dan smartphone.',
        ]
      },
      {
        category: 'Kenyamanan Tabel & Matriks Lebar',
        items: [
          'Kolom nomor urut dan nama siswa pada Rekap Presensi Bulanan terkunci presisi (sticky) saat tabel digulir secara horizontal.',
          'Dukungan penuh tema gelap dan terang pada kolom terkunci tanpa distorsi visual.',
        ]
      },
      {
        category: 'Konektivitas & Keandalan Basis Data',
        items: [
          'Konfigurasi Firestore dengan protokol HTTP long-polling adaptif untuk mencegah kendala koneksi pada lingkungan iframe/proxy jaringan sekolah.',
        ]
      }
    ]
  },
  {
    version: 'ver. 2.1-JRA',
    versionCode: '2.1.0-JRA',
    releaseDate: '9 September 2026',
    title: 'Peningkatan Keamanan, Integritas Relasi & Pencadangan Data',
    badge: 'Hardening & Stabilitas',
    highlights: [
      {
        category: 'Cadangan & Pemulihan Sistem',
        items: [
          'Dukungan penuh pencadangan dan pemulihan data presensi guru mapel (15 subkoleksi data).',
        ]
      },
      {
        category: 'Integritas Relasi & Skala Nilai',
        items: [
          'Standarisasi batas penilaian madrasah pada rentang skala 1–100 di seluruh modul asesmen.',
          'Pencegahan penghapusan data Tahun Ajaran dan Tugas Mengajar yang memiliki keterkaitan rekam presensi.',
          'Format identitas deterministik pada penempatan siswa untuk mencegah risiko data duplikat.',
        ]
      },
      {
        category: 'Keamanan Firestore',
        items: [
          'Pengetatan aturan proteksi penghapusan data master aktif dan data arsip pada basis data.',
        ]
      }
    ]
  },
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
