# Panduan Kontribusi — DADU

Terima kasih atas minat Anda untuk berkontribusi pada pengembangan **DADU (Digitalisasi Data Guru)**! Dokumen ini memuat panduan, standar teknis, dan alur kerja agar proses kolaborasi berjalan tertib, aman, dan berkualitas tinggi.

---

## 🎯 Prinsip Utama

1. **Integritas Data Produksi**: Seluruh data yang berada di Firestore diperlakukan sebagai data operasional riil. Tidak diperkenankan melakukan script modifikasi atau penghapusan data tanpa persetujuan eksplisit.
2. **Kualitas Tanpa Kompromi**: Setiap kode baru wajib lolos 4 gerbang kualitas (`npm run ci`): linting Biome, pemeriksaan tipe TypeScript, pengujian unit Vitest, dan build produksi.
3. **No Direct Push to Main**: Branch `main` diproteksi secara ketat. Semua pembaruan wajib melalui Pull Request (PR) yang telah divalidasi oleh CI.

---

## 🌿 Strategi Percabangan (Branching Model)

Gunakan format nama branch yang konsisten dan deskriptif:

| Pola Branch | Tujuan | Contoh |
|---|---|---|
| `feature/<nama-fitur>` | Penambahan fungsionalitas atau halaman baru | `feature/export-excel-rekap` |
| `bugfix/<nama-bug>` | Perbaikan kesalahan atau perilaku tidak terduga | `bugfix/fix-student-sorting` |
| `perf/<target-optimasi>` | Peningkatan performa atau efisiensi bundle | `perf/optimize-report-queries` |
| `test/<cakupan-tes>` | Penambahan atau perbaikan unit/integration tests | `test/add-attendance-tests` |
| `docs/<topik-dokumen>` | Pembaruan dokumentasi atau panduan teknis | `docs/update-readme-setup` |
| `refactor/<komponen>` | Restrukturisasi kode tanpa mengubah fungsionalitas | `refactor/extract-score-hooks` |

---

## 💬 Konvensi Pesan Commit (Conventional Commits)

Format pesan commit mengikuti standar [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <deskripsi singkat imperative>

[opsional: body penjelasan detail perubahan]
```

### Jenis Type yang Didukung:
- `feat`: Fungsionalitas atau fitur baru untuk pengguna.
- `fix`: Perbaikan bug atau penanganan kesalahan logika.
- `perf`: Optimasi performa kode, memori, atau bundle size.
- `test`: Penambahan atau perbaikan unit test dan setup testing.
- `refactor`: Refaktor struktur kode tanpa perubahan perilaku.
- `docs`: Perubahan atau penambahan dokumentasi.
- `chore`: Tugas rutin pemeliharaan, pembaruan config, atau tooling.

### Contoh Commit yang Baik:
```bash
git commit -m "feat(homeroom): tambah skeleton loader pada daftar siswa binaan"
git commit -m "fix(auth): cegah infinite redirect pada saat sesi token kedaluwarsa"
git commit -m "perf(firestore): gunakan WebChannel streaming sebagai default transport"
git commit -m "test(common): tambah pengujian ErrorBoundary dan fallback reset"
```

---

## 🛠 Standar Koding & Kualitas

### 1. Linter & Formatter (Biome)
- Proyek ini menggunakan **Biome** untuk linting dan formatting.
- Jalankan pemeriksaan lokal:
  ```bash
  npm run lint
  ```
- Biome dikonfigurasi untuk memeriksa kepatuhan `src/` dengan aturan ketat (`diagnostic-level=error`). Pastikan tidak ada warning atau error sebelum commit.

### 2. TypeScript Strict Mode
- Tipe data harus didefinisikan secara eksplisit.
- Hindari penggunaan tipe `any`. Gunakan interface yang tersedia di [`src/types/index.ts`](file:///c:/Users/Administrator/Documents/ai/dadu/dadu-app-imp/src/types/index.ts) atau buat tipe domain baru yang spesifik.
- Jalankan verifikasi tipe:
  ```bash
  npm run type-check
  ```

### 3. Pengujian Unit (Vitest)
- Setiap fungsi utilitas baru, context, routing adapter, atau komponen logika wajib disertai unit test.
- Letakkan file tes berdampingan dengan file implementasi menggunakan ekstensi `.test.ts` atau `.test.tsx` (misal: `Badge.test.tsx`).
- Jalankan tes:
  ```bash
  # Menjalankan seluruh tes satu kali
  npm test

  # Mode watch saat mengembangkan fitur
  npm run test:watch

  # Memeriksa cakupan kode
  npm run test:coverage
  ```

---

## 🚀 Alur Kerja Berkontribusi (Step-by-Step)

### 1. Sinkronisasi Branch
```bash
git checkout main
git pull origin main
```

### 2. Buat Branch Baru
```bash
git checkout -b feature/nama-fitur-anda
```

### 3. Lakukan Pengembangan & Tes Lokal
Implementasikan perubahan Anda, lalu pastikan seluruh test lokal lulus:
```bash
npm run test:watch
```

### 4. Jalankan Pipeline Validasi Lengkap
Sebelum melakukan commit dan push, jalankan gerbang kualitas gabungan:
```bash
npm run ci
```
Perintah ini akan mengeksekusi secara otomatis:
1. `npm run lint` (Biome linting)
2. `npm run type-check` (`tsc --noEmit`)
3. `npm test` (Vitest unit tests)
4. `npm run build` (Vite production build)

Jika ada salah satu tahapan yang gagal, perbaiki terlebih dahulu sebelum melangkah ke tahap berikutnya.

### 5. Push & Buat Pull Request (PR)
```bash
git add .
git commit -m "feat(modul): deskripsi perubahan Anda"
git push origin feature/nama-fitur-anda
```

Buka repositori GitHub dan buat **Pull Request** ke branch `main`:
- Berikan judul yang jelas sesuai konvensi Conventional Commits.
- Deskripsikan latar belakang, perubahan yang dilakukan, dan bukti verifikasi (screenshot jika mengubah antarmuka pengguna).
- Tunggu workflow GitHub Actions (`Verify Quality Gates`) selesai dan berstatus hijau (✅).
- Mintalah review dari tim pengembang / maintainer sebelum proses *merge*.
