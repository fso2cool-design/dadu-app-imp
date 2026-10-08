# UI Reactivity & Form State Audit Plan (v3 — Evidence-Based)

> Dokumen ini dibuat dari hasil scan langsung `src/features/**` pada 2026-10-08.

---

## 1. Tujuan
Mengeliminasi **3 kelas bug reaktivitas** yang ditemukan hidup di codebase ini:
- **Kategori A:** Tombol `disabled` tidak merespons semua jenis input (Stale Disabled State)
- **Kategori B:** Dropdown *parent* diubah → *child state* tidak di-reset (Cascading Stale)
- **Kategori C:** Mutasi data di satu halaman tidak membersihkan *in-memory cache* halaman lain (Cross-Page Stale Cache)

---

## 2. Inventarisasi Lengkap (Berdasarkan Scan Real)

### 2A. File yang Menggunakan Pola `isDirty` + `disabled` (Kategori A — Langsung Rawan)

| File | Pattern Tombol Simpan | Catatan |
|---|---|---|
| `SubjectAttendancePage.tsx` | `!isDirty && !isNewRecord && selectedMeetingId !== initialMeetingIdRef.current` | **SUDAH DIPATCH** — model referensi |
| `HomeroomDailyAttendancePage.tsx` | `(!isDirty && !isNewRecord) \|\| saving \|\| loading` | ⚠️ Cek: apakah `initialSnapshotRef` sudah meng-cover semua input (`selectedDate`, `selectedClass`)? |
| `GradesPage.tsx` | `saving \|\| !isDirty` | ⚠️ Cek: `setIsDirty(true)` di 4 lokasi — apakah semua *cell input* tercover? Terutama saat pindah `activeAssignment`? |
| `SettingsPage.tsx` | (tidak ada tombol submit langsung, tapi ada 8 hit isDirty) | Cek apakah `isDirty` guard form profil berfungsi saat input `<select>` sekolah diubah |

### 2B. File yang Menggunakan `disabled=` Sederhana tanpa `isDirty` (Kategori A — Potensial Aman)

File-file ini **tidak pakai isDirty**, tapi potensi bug tetap ada jika ada input form yang tidak melepas tombol simpan:

| File | Titik Disabled Penting | Risiko |
|---|---|---|
| `MeetingFormModal.tsx` | `disabled={loading}` di tombol Simpan | 🟡 Rendah — cek apakah field date/topic membuat tombol aktif secara otomatis |
| `AddTeacherAttendanceModal.tsx` | Tidak terlihat `disabled` kompleks | 🟡 Rendah — form sederhana |
| `StudentFormModal.tsx` | `disabled={loading}` di Submit | 🟡 Rendah |
| `ShareReportModal.tsx` | `disabled={loading}` dan `disabled={isActionLoading}` | 🟡 Rendah |
| `TransferClassModal.tsx` | `disabled={loading \|\| availableClasses.length === 0}` | ⚠️ Cek: jika kelas dipilih tapi siswa tidak, apakah tetap bisa submit? |
| `SubjectAttendanceModal.tsx` | `disabled={saving \|\| rows.length === 0}` | 🟡 Rendah |

### 2C. In-Memory Cache Module-Level (Kategori C — Cross-Page Staleness)

Ini adalah **semua cache `new Map<>()` yang dideklarasikan di scope module** (luar komponen = persisten sepanjang sesi browser):

| File | Cache Name | Dibersihkan saat? | Risiko Staleness |
|---|---|---|---|
| `MeetingsJournalPage.tsx` | `meetingsJournalCache` | Tidak pernah di-clear | 🔴 TINGGI — halaman presensi save meeting summary tapi cache ini tidak tahu |
| `SubjectAttendancePage.tsx` | `subjectMeetingsCache`, `classEnrollmentsCache`, `subjectAttendanceCache` | `.set()` ulang saat save | 🟡 Sedang — perlu verifikasi apakah invalidasi konsisten |
| `HomeroomDailyAttendancePage.tsx` | `dailyEnrollmentsCache`, `dailyAttendanceCache` | Tidak jelas | ⚠️ Cek |
| `HomeroomMonthlyAttendancePage.tsx` | `homeroomMonthlyRosterCache`, `homeroomMonthlyRecordsCache` | Tidak jelas | ⚠️ Cek |
| `AttendanceReportPage.tsx` | `subjectReportCache`, `homeroomReportCache` | Tidak jelas | ⚠️ Cek — laporan bisa menampilkan data lama |
| `GradesReportPage.tsx` | `gradesReportCache` | Tidak jelas | ⚠️ Cek |
| `JournalReportPage.tsx` | `journalReportCache` | Tidak jelas | ⚠️ Cek |

### 2D. Cascading State (Kategori B) — Dropdown Berantai

Halaman dengan pemilihan berantai yang rentan:

| File | Chain | Risiko |
|---|---|---|
| `GradesPage.tsx` | Kelas → Mapel → AssessmentItem → Data Nilai | 🔴 TINGGI — jika `activeAssignment` berubah, apakah score state di-reset? |
| `AttendanceReportPage.tsx` | Semester → Kelas → Mapel → Data Laporan | ⚠️ Cek — apakah ada reset `activeSummaries` saat filter berubah? |
| `LeggerReportPage.tsx` | Semester → Kelas → Data Legger | ⚠️ Cek |
| `HomeroomDailyAttendancePage.tsx` | Kelas → Tanggal → Siswa | ⚠️ Cek |
| `TeachingAssignmentsPage.tsx` | Tahun Ajaran → Kelas → Mapel | Dropdown A+B `disabled` saat sedang `editingAssignment` — cek reset perilaku saat `editingAssignment` null |

---

## 3. Urutan Eksekusi Audit

### Prioritas 1 (Langsung Audit + Patch)
1. `GradesPage.tsx` — Kategori A + B (dual risk)
2. `HomeroomDailyAttendancePage.tsx` — Kategori A + C
3. `MeetingsJournalPage.tsx` — Kategori C (`meetingsJournalCache` tidak pernah di-invalidate)

### Prioritas 2 (Audit Lebih Dalam)
4. `AttendanceReportPage.tsx`, `GradesReportPage.tsx`, `JournalReportPage.tsx` — Kategori C (laporan basi)
5. `HomeroomMonthlyAttendancePage.tsx` — Kategori C

### Prioritas 3 (Spot-Check)
6. `TransferClassModal.tsx`, `MeetingFormModal.tsx` — Kategori A (low risk, quick check)

---

## 4. Instruksi Eksekusi untuk AI

### Langkah 1 — GradesPage Audit (Kategori A + B)
Buka `src/features/grades/GradesPage.tsx`. Cari `setIsDirty(true)` di 4 lokasi (baris 332, 340, 349, 803). Pastikan:
- Semua perubahan input (termasuk `PasteExcelModal` callback dan `AssessmentItemModal` callback) memanggil `setIsDirty(true)`.
- Saat `selectedAssignmentId` berubah → `setIsDirty(false)` dan semua cell scores di-reset.

### Langkah 2 — MeetingsJournalCache Invalidation (Kategori C)
Buka `src/features/teacher/MeetingsJournalPage.tsx`. `meetingsJournalCache` tidak pernah `clear()`. Solusi:
- Setelah `updateMeetingAttendanceSummary` berhasil (dipanggil dari `SubjectAttendancePage` via `attendance.ts`), panggil `meetingsJournalCache.delete(key)` atau ekspos event untuk invalidasi.
- Atau pindahkan seluruh module-level cache ke `ApplicationContext`/`WorkspaceContext` agar bisa di-share dan di-invalidate secara terpusat.

### Langkah 3 — Report Caches (Kategori C)
Scan `AttendanceReportPage`, `GradesReportPage`, `JournalReportPage`. Verifikasi kapan `.clear()` dipanggil. Jika tidak ada, tambahkan `cache.delete(currentKey)` setelah setiap operasi mutasi yang relevan.

### Catatan Teknis Eksekusi
- Gunakan **Node.js `.cjs` script** untuk patch multi-baris (bukan `replace_file_content` langsung — CRLF mismatch di Windows).
- Jalankan `npx tsc --noEmit` setelah setiap batch patch.
- Commit per kategori bug: `fix(reactivity/catA)`, `fix(reactivity/catB)`, `fix(reactivity/catC)`.
