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
- **Memory Leaks & Race Conditions (B1):** 10 Komponen raksasa yang melakukan *fetch* data berat (seperti `AttendanceReportPage`) telah di-*patch* menggunakan AST Transformer. Injeksi `let isMounted = true;` dan pencegahan pembaruan *state* asinkron pada komponen mati terbukti berhasil tanpa merusak tipe.
- **Bug Native UI (A2):** Dropdown `<select>` gelap di Windows pada *shadcn dark mode* teratasi menggunakan `bg-[var(--ds-surface)] text-[var(--ds-text)]`.

## 3. 📌 PENDING ARCHITECTURAL DEBT (Tugas Untuk Sesi Berikutnya)
Berdasarkan "Ultimate Security & Architecture Audit Report v4", ada **2 Hutang Teknis Skala Besar** yang *sengaja ditunda* untuk mencegah regresi stabilitas (memerlukan sesi operasi khusus):

### A. Context API Re-render Leaks (Prioritas: [OPTIMIZE])
Keempat penyedia *Context* membocorkan objek *literal* tanpa `useMemo`. Setiap sinkronisasi atau kemunculan *Toast* memaksa 100% pohon UI me- *render* ulang dirinya sendiri.
- **Tugas:** Bungkus objek di `value={...}` dengan `useMemo` dan fungsi aksi dengan `useCallback`. Pisahkan status `syncStatus`/`isOnline` dari domain statis di `WorkspaceContext.tsx`.
- **Lokasi Utama:** 
  - `src/context/WorkspaceContext.tsx:241-268`
  - `src/context/DesignSystemContext.tsx:191-202`
  - `src/context/ToastContext.tsx:93`
  - `src/features/auth/AuthContext.tsx:146-158`

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
