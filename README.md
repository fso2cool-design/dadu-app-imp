# DADU — Digitalisasi Data Guru

[![CI Quality Gates](https://github.com/fso2cool-design/dadu-app-imp/actions/workflows/ci.yml/badge.svg)](https://github.com/fso2cool-design/dadu-app-imp/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.0.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-~5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-6.2.3+-646CFF.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-Private-red.svg)]()

> **Sistem Informasi Manajemen Pembelajaran & Administrasi Guru Madrasah**  
> Solusi digital terintegrasi untuk pendataan santri/siswa, jurnal mengajar, presensi harian & mapel, penilaian formatif/sumatif, legger nilai, cetak rapor, dan pelaporan terenkripsi.

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Teknologi & Arsitektur](#-teknologi--arsitektur)
- [Struktur Proyek](#-struktur-proyek)
- [Pra-syarat](#-pra-syarat)
- [Panduan Memulai (Quick Start)](#-panduan-memulai-quick-start)
- [Konfigurasi Environment Variable](#-konfigurasi-environment-variable)
- [Daftar Perintah (NPM Scripts)](#-daftar-perintah-npm-scripts)
- [Alur Pengujian & CI/CD](#-alur-pengujian--cicd)
- [Alur Deployment](#-alur-deployment)
- [Dokumentasi Lanjutan](#-dokumentasi-lanjutan)

---

## ✨ Fitur Utama

- **Master Data Terpadu**: Pengelolaan Tahun Ajaran, Semester, Rombel/Kelas, Mata Pelajaran, dan Pembagian Tugas Mengajar (*Teaching Assignments*).
- **Manajemen Santri / Siswa**: Pendataan induk siswa, status mutasi/lulus, filter gender, kartu ujian, import/export data via Excel, dan pemulihan relasi data (*Relationship Recovery*).
- **Teacher Hub**:
  - Jurnal tatap muka / pertemuan harian (*Meetings*).
  - Presensi kehadiran siswa per jam pelajaran (*Subject Attendance*).
  - Jadwal mengajar mingguan terintegrasi.
- **Homeroom Hub (Wali Kelas)**:
  - Presensi harian kelas binaan (*Daily Homeroom Attendance*).
  - Rekap absensi guru pengajar (*Teacher Attendance Tracking*).
  - Buku catatan/bimbingan santri (*Student Notes/Guidance*).
- **Penilaian & Rapor**:
  - Input nilai formatif, sumatif, PTS, dan PAS dengan integrasi paste Excel cepat.
  - Rekap Legger Nilai otomatis berdasarkan bobot dan rentang KKM.
  - Cetak Rapor Siswa resmi dengan format layout cetak siap pakai (*PrintDocumentLayout*).
- **Public Shared Reports**:
  - Berbagi dokumen/laporan secara aman kepada wali murid melalui tautan publik unik berenkripsi AES-GCM (*read-only* tanpa perlu login).
- **Resiliensi & Performa Modern**:
  - Rute modular berbasis URL dengan code-splitting (`React.lazy`).
  - Loading skeleton pada halaman beban tinggi untuk meminimalkan *Cumulative Layout Shift* (CLS).
  - *Multi-tier Error Boundary* dengan laci diagnostik error dan pemulihan sesi.
  - Dukungan offline cache multi-tab Firestore dengan streaming WebChannel cepat.

---

## 🛠 Teknologi & Arsitektur

| Lapisan | Teknologi | Versi | Peran |
|---|---|---|---|
| **UI Framework** | React | 19.0.1 | Deklaratif UI dengan StrictMode & Server Component types |
| **Language** | TypeScript | ~5.8.2 | Type-safety ketat (`strict`, `noUncheckedIndexedAccess`) |
| **Routing** | React Router | 7.13.0 | Navigasi berbasis URL, riwayat peramban, dan bookmarking |
| **Bundler** | Vite | 6.2.3+ | Bundling ultra-cepat dengan optimasi chunking dinamis |
| **Styling** | Tailwind CSS | 4.1.14 | Sistem desain modern dengan plugin Vite native |
| **Linter / Formatter** | Biome | 2.4.6 | Linter Rust berkecepatan sub-detik |
| **Testing** | Vitest + RTL | 5.0.1 | Unit & component testing native Vite dengan JSDOM |
| **Database & Auth** | Firebase | 12.18.0 | Cloud Firestore (multi-tab cache) & Firebase Authentication |
| **Animasi** | motion | 12.23.24 | Animasi transisi mikro dan modal |
| **Spreadsheet** | xlsx (SheetJS) | 0.18.5 | Parser dan generator file Excel |

---

## 📂 Struktur Proyek

```text
dadu-app-imp/
├── .github/
│   └── workflows/ci.yml         # Pipeline CI GitHub Actions (Lint, Type-check, Test, Build)
├── docs/
│   ├── DADU-ARCHITECTURE.md     # Dokumen arsitektur sistem menyeluruh
│   ├── DADU-UPGRADE-ROADMAP.md  # Roadmap peningkatan berkala (Phases 1-9)
│   ├── DADU-ERD.md              # Diagram visual model data Firestore (Mermaid ERD)
│   └── GITHUB-WORKFLOW-GUIDE.md # Panduan branch protection & preview Vercel
├── public/                      # Asset statis, logo, manifest PWA
├── src/
│   ├── components/              # Komponen UI bersama (AppLayout, ErrorBoundary, Modal, dll.)
│   ├── context/                 # React Contexts (WorkspaceContext, ThemeContext, ToastContext)
│   ├── features/                # Modul fitur berbasis domain (auth, teacher, homeroom, reports, dll.)
│   ├── routes/                  # Definisi rute, mapping path, dan bidirectional adapter
│   ├── services/
│   │   ├── firebase/            # Inisialisasi Firebase App, Auth, dan Firestore
│   │   └── firestore/           # Service module CRUD per collection Firestore
│   ├── test/                    # Setup testing, mock DOM window, dan utilitas tes
│   ├── types/                   # Definisi interface TypeScript terpusat
│   └── utils/                   # Utilitas helper (format nama, tanggal, crypto, sync)
├── firestore.indexes.json       # Definisi composite index Firestore untuk query optimal
├── firestore.rules              # Aturan keamanan data multi-tenant Cloud Firestore
├── biome.json                   # Konfigurasi Biome linter dan formatter
├── tsconfig.json                # Konfigurasi compiler TypeScript
├── vite.config.ts               # Konfigurasi Vite, vendor chunks, visualizer
└── vitest.config.ts             # Konfigurasi unit testing Vitest
```

---

## ⚙️ Pra-syarat

Pastikan lingkungan kerja lokal Anda telah terpasang:
- **Node.js**: Versi `>= 20.0.0` (disarankan Node.js 22 LTS).
- **NPM**: Versi `>= 10.0.0` (bawaan Node.js).
- **Git**: Versi `>= 2.30.0`.

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Clone Repositori
```bash
git clone https://github.com/fso2cool-design/dadu-app-imp.git
cd dadu-app-imp
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin template konfigurasi `.env.example` ke file `.env.local` atau `.env`:
```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# Linux / macOS
cp .env.example .env.local
```
Sesuaikan nilai variabel dengan kredensial Firebase proyek Anda (lihat bagian [Konfigurasi Environment Variable](#-konfigurasi-environment-variable)).

### 4. Jalankan Development Server
```bash
npm run dev
```
Aplikasi akan berjalan di `http://localhost:5173`.

---

## 🔐 Konfigurasi Environment Variable

Daftar environment variable yang didukung:

| Variabel | Deskripsi | Default / Catatan |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | API Key Firebase Web Client | Kredensial Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domain otentikasi Firebase | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID Google Cloud / Firebase | Misal: `dadu-app` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket Cloud Storage | `<project-id>.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging Sender ID | Angka numerik proyek |
| `VITE_FIREBASE_APP_ID` | Web App Client ID | `1:xxx:web:xxx` |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | ID Database Firestore | `(default)` atau named DB |
| `VITE_FIRESTORE_FORCE_LONG_POLLING` | Paksa koneksi HTTP long-polling | `false` (gunakan streaming WebChannel) |

> **Catatan Keamanan**: Jangan pernah commit file `.env.local` atau file kredensial privat ke repository publik.

---

## 📜 Daftar Perintah (NPM Scripts)

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server lokal Vite dengan HMR aktif. |
| `npm run build` | Melakukan kompilasi TypeScript dan bundling Vite ke direktori `dist/`. |
| `npm run preview` | Menjalankan preview lokal dari bundle produksi `dist/`. |
| `npm test` | Menjalankan seluruh unit test menggunakan Vitest dalam mode sekali jalan (*CI mode*). |
| `npm run test:watch` | Menjalankan Vitest dalam mode interaktif *watch* otomatis saat file diubah. |
| `npm run test:coverage` | Menjalankan tes dan menghasilkan laporan cakupan kode (*code coverage report*). |
| `npm run lint` | Menjalankan pemeriksaan Biome linter pada seluruh kode sumber `src/`. |
| `npm run type-check` | Menjalankan validasi tipe TypeScript murni tanpa menghasilkan file output (`tsc --noEmit`). |
| `npm run ci` | Menjalankan seluruh gerbang kualitas secara berurutan: `lint` ➔ `type-check` ➔ `test` ➔ `build`. |

---

## 🧪 Alur Pengujian & CI/CD

Proyek ini menerapkan standar mutu tinggi melalui 4 gerbang kualitas otomatis (*Quality Gates*):

1. **Linting Cepat**: Biome memeriksa kepatuhan sintaksis dan best practice dalam waktu < 400ms.
2. **Type Safety**: TypeScript compiler memastikan tidak ada *type mismatches* atau *implicit any*.
3. **Unit & Component Testing**: Vitest menjalankan 12+ test suites (67+ skenario pengujian) mencakup utilitas, cryptography, routing adapter, auth context, dan error boundary.
4. **Bundle Verification**: Vite memastikan kompilasi bundle bersih tanpa warning batas ukuran chunk.

Sebelum melakukan commit atau push ke GitHub, pastikan Anda menjalankan perintah:
```bash
npm run ci
```

Setiap *pull request* yang ditargetkan ke branch `main` akan diuji secara otomatis oleh GitHub Actions Workflow (`.github/workflows/ci.yml`).

---

## 🚢 Alur Deployment

- **Hosting Platform**: Vercel (Static Single Page Application).
- **Continuous Deployment (CD)**:
  - Branch `main` terhubung langsung dengan Vercel Production Environment.
  - Setiap Pull Request menghasilkan **Preview Deployment** otomatis untuk keperluan staging/review visual sebelum digabungkan.
- **Routing Rewrite**: Konfigurasi routing client-side ditangani oleh file [`vercel.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/vercel.json) dengan rewrite rule `/(.*) ➔ /index.html`.

---

## 📚 Dokumentasi Lanjutan

- 🏗 **[Arsitektur Sistem (DADU-ARCHITECTURE.md)](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ARCHITECTURE.md)**: Analisis menyeluruh mengenai arsitektur, provider, dan modularisasi.
- 🗺 **[Roadmap Upgrade (DADU-UPGRADE-ROADMAP.md)](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-UPGRADE-ROADMAP.md)**: Riwayat dan rencana peningkatan teknis dari Phase 1 hingga Phase 9.
- 📊 **[Model Data & ERD (DADU-ERD.md)](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/DADU-ERD.md)**: Diagram visual relasi entitas Firestore.
- 🤝 **[Panduan Kontribusi (CONTRIBUTING.md)](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/CONTRIBUTING.md)**: Aturan branching, konvensi commit, dan panduan pull request.
- 📝 **[Catatan Rilis (CHANGELOG.md)](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/CHANGELOG.md)**: Riwayat pembaruan dan rilis versi aplikasi.
- 🔒 **[Panduan Workflow GitHub (GITHUB-WORKFLOW-GUIDE.md)](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/GITHUB-WORKFLOW-GUIDE.md)**: Pengaturan branch protection dan Vercel staging.
