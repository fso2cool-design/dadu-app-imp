# Changelog — DADU

Format changelog ini mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) dan mematuhi prinsip [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] — 2026-10-01

Rilis Tampilan Baru, Mode Gelap & Architectural Rename:
- Penyempurnaan 3 tema aktif: `paper-craft` (Paper Craft), `shadcn-ui` (Shadcn UI, default), dan `neo-brutalism` (Neo-Brutalism).
- Penambahan mode gelap (Dark Mode) untuk seluruh tema dengan flipping token dinamis `--ds-*` berstandar WCAG AAA.
- True architectural rename: menghapus penuh `atelier` dan `minimalist` dari active `DesignSystemKey` union type dengan fallback legacy migration transparan pada read boundary.
- Standardisasi keluarga ikon Phosphor dan tipografi lokal Geist Sans & Geist Mono.
- Isolasi cetak dokumen dinas (`.printable-document`, `@media print`) 100% formal dan terlindungi dari kebocoran tema.

### Changed
- **Design System Keys (Breaking Internal Architecture)**:
  - `DesignSystemKey`: `'paper-craft' | 'neo-brutalism' | 'shadcn-ui'` (default: `'shadcn-ui'`).
  - `THEME_OPTIONS`: Pilihan dropdown menampilkan secara bersih: `Paper Craft`, `Shadcn UI`, dan `Neo-Brutalism`.
  - Migrasi transparan pada `resolveDesignSystem` dan `mapLegacyThemeToDesignSystem` untuk data lama di Firestore dan `localStorage`.
- **Styling & Scoping**:
  - `src/index.css`: Seluruh scoped selector diperbarui menggunakan `[data-design-system="neo-brutalism"]` dan `[data-design-system="shadcn-ui"]`.
  - Input focus ring dan tactile button press physics diisolasi tanpa kebocoran global.

### Verification
- `tsc --noEmit`: 0 errors.
- `biome lint`: 248 files checked, 0 errors.
- `depcruise`: 266 modules, 943 dependencies, 0 violations.
- `vitest`: 25 test suites, 136 tests passed (100% pass).
- `vite build`: 5165 modules transformed, production bundle built cleanly in ~20s.

---

## [2.3.0] — 2026-09-30

Rilis Theme Consolidation: ganti 5 tema legacy menjadi 3 tema modern dengan arsitektur layered tetap terjaga.

### Added
- **Theme Architecture**:
  - `DesignSystemContext` (`src/context/DesignSystemContext.tsx`) dengan injeksi CSS var `--ds-*`, persistensi Firestore `designSystemPreference`, dan mapping legacy theme.
  - 3 Tema: `paper-craft` (kertas & tinta, bayangan tajam), `shadcn-ui` (dashboard netral, border crisp), `neo-brutalism` (border tegas 2px, hard offset shadow, grafis berani).
  - Token lengkap per tema: `accent`, `background`, `surface`, `text`, `border`, radius, shadow.

### Changed
- **Theme System (Breaking)**:
  - `ThemeKey` disederhanakan dari 9 nilai (6 legacy + 3 baru) menjadi hanya 3: `paper-craft | shadcn-ui | neo-brutalism`.
  - `THEME_OPTIONS` di `src/context/ThemeContext.tsx` 5 → 3 opsi dropdown.
  - `ThemeContext` sekarang thin wrapper di atas `DesignSystemContext` untuk backward compatibility.
  - `src/index.css` 5 blok tema legacy dihapus, 3 blok baru, `data-design-system` attribute.
  - `SettingsPage` heading `Pilihan Skema Tema Workspace` → `Pilihan Tema`, grid `lg:grid-cols-12` → `md:grid-cols-3`.

### Removed
- 5 tema legacy: `light`, `dark-crimson`, `obsidian-tactile`, `swiss-manuscript`, `solarized-comfort`, `chalkboard-school` (6 literal termasuk `light` default).
- `src/domain/shared/result.ts` (dead code `Result<T,E>`, 0 referensi).

### Verification
- `tsc --noEmit` ✓, `biome lint` 218 files ✓, `depcruise` 235 modules / 874 deps 0 violation ✓
- `vite build` 2255 modules 17.64s ✓, `vitest` 21 suites / 111 tests 100% pass ✓
- Layered architecture intact (modular monolith + hexagonal lite).

## [2.2.0] — 2026-09-23

Rilis modernisasi komprehensif DADU (Phases 1 s/d 8) yang meningkatkan kestabilan tipe, efisiensi bundle, arsitektur routing berbasis URL, infrastruktur pengujian otomatis, pipeline CI/CD, dan performa runtime.

### Added
- **Performance & UX (Phase 8)**:
  - Komponen `ErrorBoundary` bertingkat dengan UI berbahasa Indonesia, tombol *Coba Lagi*, tombol *Ke Dashboard*, dan panel diagnostik error lipat.
  - Loading skeleton (`Skeleton`, `SkeletonTable`, `SkeletonCardGrid`) pada Dashboard, Master Siswa, Siswa Binaan, dan Legger Nilai untuk mengeliminasi *Cumulative Layout Shift* (CLS).
  - File definisi indeks komposit Cloud Firestore [`firestore.indexes.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/firestore.indexes.json) untuk mempercepat query `meetings`, `teacherAttendanceRecords`, `studentNotes`, `students`, `teachingAssignments`, dan `assessmentItems`.
  - Konfigurasi `VITE_FIRESTORE_FORCE_LONG_POLLING` di `.env.example` dengan default `false` untuk mengaktifkan koneksi streaming WebChannel cepat.
- **CI/CD Pipeline (Phase 7)**:
  - Workflow GitHub Actions [`.github/workflows/ci.yml`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/.github/workflows/ci.yml) yang mengeksekusi 4 gerbang kualitas otomatis (Lint, Type-check, Test, Build) pada setiap push dan PR.
  - Skrip baru `npm run type-check` (`tsc --noEmit`) dan `npm run ci` pada `package.json`.
  - Panduan proteksi branch dan preview deployment Vercel pada [`docs/GITHUB-WORKFLOW-GUIDE.md`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/docs/GITHUB-WORKFLOW-GUIDE.md).
- **Infrastruktur Pengujian (Phase 6)**:
  - Konfigurasi Vitest + React Testing Library + JSDOM pada [`vitest.config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/vitest.config.ts) dan [`src/test/setup.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/test/setup.ts).
  - 12 unit & component test suites (67 pengujian dengan tingkat kelulusan 100%):
    - `paths.test.ts`, `reportCrypto.test.ts`, `syncEvents.test.ts`, `date.test.ts`, `formatOfficialName.test.ts`.
    - `config.test.ts`, `users.test.ts`, `AuthContext.test.tsx`.
    - `Badge.test.tsx`, `Alert.test.tsx`, `NotFoundPage.test.tsx`, `ErrorBoundary.test.tsx`.
  - Skrip `npm test`, `npm run test:watch`, dan `npm run test:coverage`.
- **Routing Berbasis URL (Phase 5)**:
  - Integrasi `react-router-dom` v7 dengan dukungan bookmarking, riwayat tombol maju/mundur peramban, dan sinkronisasi rute URL (`/dashboard`, `/teacher`, `/homeroom`, `/reports`, `/master`, `/settings`, `/admin`, `/login`).
  - Modul adapter dua arah [`src/routes/paths.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/routes/paths.ts) untuk menjaga kompatibilitas mundur dengan handler navigasi berbasis state lama.
  - Halaman 404 modern [`src/components/common/NotFoundPage.tsx`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/components/common/NotFoundPage.tsx) dengan navigasi kembali ke dashboard.
- **Code-Splitting & Visualizer (Phase 4)**:
  - Lazy loading menggunakan `React.lazy` dan `Suspense` untuk seluruh rute halaman utama.
  - Konfigurasi `rollup-plugin-visualizer` untuk analisis visual ukuran bundle.
- **Linting & Type Tooling (Phase 2)**:
  - Integrasi linter & formatter Biome berkecepatan sub-detik melalui [`biome.json`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/biome.json).

### Changed
- **Optimasi Ukuran Bundle (Phase 4)**:
  - Memisahkan vendor chunks di [`vite.config.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/vite.config.ts) (`vendor-firebase-firestore`, `vendor-firebase-auth`, `vendor-firebase-core`, `vendor-react`, `vendor-router`, `vendor-xlsx`, `vendor-motion`, `vendor-lucide`).
  - Mengurangi ukuran *entry chunk* sebesar **95%** (dari 2.89 MB menjadi hanya ~145 kB).
- **Transport Firestore (Phase 8)**:
  - Mengubah pengaturan default transport Firestore dari long-polling paksa menjadi streaming WebChannel native berkecepatan tinggi.
- **Aksesibilitas Seluler (Phase 3)**:
  - Memperbarui tag viewport di `index.html` dengan menghapus batasan `maximum-scale=1, user-scalable=no` guna memenuhi standar aksesibilitas WCAG 2.2 Level AA.
- **Prioritas Konfigurasi Storage Bucket (Phase 3)**:
  - Memberikan prioritas utama pada environment variable `VITE_FIREBASE_STORAGE_BUCKET` sebelum fallback ke file blueprint statis.

### Fixed
- Memperbaiki sekitar 25 inkonsistensi tipe data, prop types usang, dan strict null checks pada `StudentsMasterPage.tsx`, `StudentProgressReportModal.tsx`, `PrintDocumentLayout.tsx`, `SettingsPage.tsx`, dan `AppLayout.tsx`.
- Memperbaiki dukungan React 19 type declarations (`@types/react` dan `@types/react-dom`).

### Removed
- **Pembersihan Dependensi (Phase 1)**:
  - Menghapus 9 package usang/redundant dari `package.json` (`canvas-confetti`, `class-variance-authority`, `clsx`, `tailwind-merge`, `recharts`, `jspdf`, `html2canvas`, `@types/canvas-confetti`, `@tailwindcss/vite`).
  - Memindahkan 2 plugin Vite ke `devDependencies`.
  - Memangkas 119 package dari `node_modules` tanpa ada dampak negatif pada fitur operasional.

---

## [2.0.0] — 2026-09-01

### Added
- Rilis baseline modular aplikasi DADU dengan arsitektur multi-tenant berbasis UID Firestore.
- Modul Master Data (Tahun Ajaran, Kelas, Mapel, Penugasan).
- Modul Guru Pengajar (Jurnal Pertemuan, Absensi Mapel, Jadwal).
- Modul Wali Kelas (Absensi Harian, Rekap Kehadiran Guru, Catatan Pembinaan Santri).
- Modul Penilaian, Legger, Cetak Rapor, dan Berbagi Laporan Publik Terenkripsi.
- Dukungan tema gelap (*Dark Crimson*) dan panel administrasi pengguna.
