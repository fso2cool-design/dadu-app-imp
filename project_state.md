# Project State & Handoff Snapshot: DADU Workspace

**Versi Dokumen:** 2.0.0 (Post-Audit V4)
**Tanggal Update:** 7 Oktober 2026 (00:51 WIB)
**Tujuan:** Cetak biru kondisi arsitektur, keamanan, dan *tech debt* untuk AI/Developer berikutnya.

---

## 1. Status Utama: STABIL & TERKUNCI
- **Security Audit (OWASP):** BERSIH. `serviceAccountKey.json` dihapus. `0` XSS (`dangerouslySetInnerHTML`).
- **Cleanliness:** BERSIH. `0` *commented code*, `0` `console.log`. 5 Komponen mati (`PhaseShellPage.tsx` dkk) dan 2 *hooks* mati telah dicabut (529 baris dihapus).
- **Gerbang Kualitas:**
  - `npx tsc --noEmit`: 0 error
  - `npm run check`: 0 error
  - `npm run build`: Lulus (24 detik).
- **Git State:** Seluruh kode sudah di-*commit* (`chore(security): purge service account key & dead code`). *Working tree clean*.

## 2. Resolusi Bug & Performa Sesi Sebelumnya
- **Context API Re-render Leaks (A):** Keempat penyedia *Context* (Workspace, DesignSystem, Toast, Auth) telah direfaktor. Objek dibungkus `useMemo` dan fungsi `useCallback`. Status tersinkronisasi `syncStatus` dipisah menjadi `WorkspaceSyncContext` terisolasi sehingga komponen header tidak lagi merender ulang seluruh komponen child.
- **Memory Leaks & Race Conditions (B1):** 10 Komponen raksasa yang melakukan *fetch* data berat (seperti `AttendanceReportPage`) telah di-*patch* menggunakan AST Transformer. Injeksi `let isMounted = true;` dan pencegahan pembaruan *state* asinkron pada komponen mati terbukti berhasil tanpa merusak tipe.
- **Bug Native UI (A2):** Dropdown `<select>` gelap di Windows pada *shadcn dark mode* teratasi menggunakan `bg-[var(--ds-surface)] text-[var(--ds-text)]`.

## 3. 📌 PENDING ARCHITECTURAL DEBT (Tugas Untuk Sesi Berikutnya)
Berdasarkan "Ultimate Security & Architecture Audit Report v4", tersisa **1 Hutang Teknis Skala Besar**:

### B. Spreadsheet Matrix Bottleneck (Prioritas: [MEMOIZE])
Komponen rekapitulasi nilai merender >400 blok `<input>` yang tidak dibungkus `React.memo`. Setiap pengetikan satu karakter menyebabkan re-kalkulasi brutal $O(N \times M)$.
- **Tugas:** Ekstrak sel matriks atau baris *table* menjadi *child component* independen dengan `React.memo(..., propsAreEqual)`. Konversi 9 modal raksasa ke `React.lazy()`.
- **Lokasi Utama:** 
  - `src/features/grades/GradesPage.tsx` (1.503 baris)
  - `src/features/teacher/SubjectAttendancePage.tsx` (1.353 baris)
  - `src/features/students/StudentsMasterPage.tsx` (1.443 baris)

## 4. Aturan Wajib (Handoff)
- **Zero-Assumption Mandate:** Dilarang mengasumsikan nama komponen atau struktur data. Gunakan alat pelacak berbasis baris (*line-number*).
- **Bedah Jantung UI:** Saat menangani poin 3 (Debt), Anda wajib memvalidasi bahwa sinkronisasi state ke *backend* tidak ikut patah akibat salah *Dependency Array* pada `useMemo`. 
- **CRLF Safe Edit:** *Workspace* berada di Windows. Gunakan Node skrip *strict-replace* untuk modifikasi multi-baris demi menghindari perusakan *line-endings*.
