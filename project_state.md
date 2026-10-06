# Project State & Handoff Snapshot: DADU Workspace

**Versi Dokumen:** 1.4.0
**Tanggal Update:** 6 Oktober 2026 (23:30 WIB)
**Tujuan:** Bahan serah-terima (handoff) untuk developer/AI berikutnya. Baca bagian 1 dan 5 dulu.

---

## 1. Status Singkat
- **Kode:** stabil. Perubahan belum di-commit (34 file berubah, 3 file baru, lihat bagian 6).
- **Gerbang kualitas (diukur 6 Okt 2026, 23:28 WIB):**
  - `npx tsc --noEmit`: 0 error
  - `npm run check` (tsc + biome + depcruise): 0 error, 282 modul, 993 dependensi, 0 pelanggaran
  - `npm test`: 28 file, 194/194 tes lulus
  - `npm run build`: **belum dijalankan** pada snapshot ini
- **Bug diketahui yang belum terverifikasi/terperbaiki:** lihat bagian 4.

## 2. Lingkungan
- **Aplikasi:** `dadu-workspace@2.4.0` | **Branch:** `main` | **HEAD:** `bc577a6`
- **Stack:** React 19, Vite 6, TypeScript 5.8, Tailwind v4, Biome, Vitest, Firebase (Firestore/Auth)
- **Dev server:** port 3000
- **Shell:** Windows PowerShell (tidak ada `grep`/`sed`/`tail`; pakai `Select-String`, `Select-Object`)

## 3. Pekerjaan Selesai (belum di-commit)
**Phase 1-3 (cetak, domain, kop dokumen)**
- `PrintActionBar.tsx` dipasang di `PrintDocumentLayout.tsx`; header & katalog laporan dirapikan.
- Domain presensi (`src/domain/attendance/attendanceAggregation.ts`) dan nilai (`src/domain/grading/grading.service.ts`, interval KKM `(100 - KKM) / 3`) dengan tes.
- Kop surat dipusatkan di `src/domain/reports/letterhead.ts` (tes ada).
- Isolasi cetak modal di `src/index.css`.

**Phase 4A (filter periode presensi)**
- Filter bulan/tahun pada `AttendanceReportPage` dan `SubjectAttendancePage` (tab Matriks).

**Phase 4B (format tanggal & impor Excel)**
- Sanitasi tanggal `DD/MM/YYYY` di `excelImportSanitizer.ts`; format tampilan lewat `src/utils/date.ts`. DB tetap ISO `YYYY-MM-DD`.

**Standarisasi UI presensi**
- Pola filter: Mapel `[Rombel & Mapel] | [Bulan] | [Tahun]` (tab Matriks); Wali Kelas `[Kelas] | [Bulan] | [Tahun]`; gaya `rounded-lg`.
- Bug cetak diperbaiki: `HomeroomTeacherAttendancePage` (pratinjau resmi, bukan `window.print()` buta) dan `TeacherPersonalSchedulePage` (UI utama disembunyikan saat mode cetak).

**Indikator "Draf / belum disimpan" (baru)**
- File: `SubjectAttendancePage.tsx` (banner di bar spektrum) dan `HomeroomDailyAttendancePage.tsx` (lencana di samping tombol Simpan).
- Logika: `isNewRecord` (belum ada data di DB) dan `isDirty` (ada perubahan belum disimpan). Tombol Simpan aktif/berdenyut hanya bila salah satunya benar; reset setelah simpan.
- Token warna: `--ds-warning-bg/-fg`. Animasi memakai `motion-safe:`.
- **Belum ada tes** untuk perilaku ini (lihat bagian 5).

## 4. Temuan Terbuka (JANGAN anggap sudah beres)
1. **Dropdown `homeroom/teacher-attendance` di tema `shadcn-ui` dark mode:** dilaporkan pengguna, **penyebab belum dibuktikan**. Dugaan: warna teks aksen (`--ds-accent`, putih di shadcn dark) pada `<select>`/`<option>` dengan latar semi-transparan. Verifikasi visual dulu sebelum menambal.
2. **Tombol Simpan di shadcn dark:** teks kini memakai `--ds-accent-fg` (benar), tetapi **belum dicek ulang di browser** untuk 6 kombinasi tema/mode.
3. **Audit UX & tema belum dijalankan.** Rencana ada di `audit-plan.md` (v2), disimpan di folder artifact percakapan, bukan di repo. Salin ke `docs/` bila ingin dibawa serah-terima.
4. Risiko perilaku yang **belum diaudit** (jangan klaim aman): reset flag turunan di jalur cache-hit/ganti kelas-tanggal, race antar efek, error boundary.

## 5. Aturan & Jebakan (penting)
- **Urutan verifikasi:** `tsc --noEmit` â†’ `npm run check` â†’ `npm test` â†’ `npm run build` (build hanya sebelum rilis). `tsc` hijau **tidak** membuktikan logika/visual benar.
- **Repo CRLF:** jangan `replace_file_content` multi-baris dari tampilan editor. Pakai skrip Node **strict-match** (gagal keras jika target tak ditemukan/ambigu). Regex longgar pernah diam-diam melewati target dan menimbulkan bug (flag tidak di-reset).
- **Design system = satu sumber:** `DesignSystemContext`. `ThemeContext` hanya shim. Jangan taruh warna teks tetap (`text-white`/`text-black`) di atas latar bertoken (`--ds-accent`, dll.); pakai pasangan `--ds-accent` + `--ds-accent-fg`.
- **CSS tema membajak kelas Tailwind** (`bg-white`, `text-slate-*`, `border-slate-*`) lewat `src/index.css`. Dokumen cetak dikecualikan oleh `.printable-document`, `.print-sheet`, `#printable-progress-report`.
- **Firestore:** UI tidak boleh impor `firebase/firestore` (akses lewat repositori). `firebase/auth` hanya di `AuthContext`.
- **Tiga tema:** `paper-craft`, `shadcn-ui`, `neo-brutalism`, masing-masing light/dark = 6 kombinasi untuk verifikasi visual.
- **Izin dulu** sebelum mengubah kode bila diminta pengguna.

## 6. Status Git
- 34 file termodifikasi, 3 file baru yang **wajib ikut commit** (dipakai file terlacak, tanpa ini clone baru gagal build):
  - `src/components/common/PrintActionBar.tsx`
  - `src/domain/reports/` (`letterhead.ts` dan tesnya)
  - `project_state.md` (dokumen ini; untuk handoff)
- Skrip tambalan sementara (`patch-*.cjs`, `fix-imports.cjs`) sudah dihapus.
- Sebelum commit: jalankan `npm run build`, lalu `git add` per kelompok (jangan `git add .` buta).

## 7. Langkah Berikutnya
1. Verifikasi visual bug dropdown shadcn-dark dan tombol Simpan di 6 kombinasi (bagian 4, butir 1-2).
2. Tambah tes untuk indikator Draf (baru â†’ simpan â†’ hilang; ubah â†’ muncul).
3. Jalankan audit `audit-plan.md` v2 (mulai A1 Token & Contrast, lalu A2 Native Form).
4. `npm run build`, lalu commit per kelompok.
