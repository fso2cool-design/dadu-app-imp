# UI Reactivity & Form State Audit Plan

## 1. Tujuan
Menemukan dan memperbaiki *Missing State Dependency Bugs* (seperti insiden "Tombol Simpan Presensi terkunci saat dropdown Jurnal diubah") di seluruh *codebase*. Memastikan setiap interaksi *input* pengguna secara reaktif mengaktifkan (melepas *disabled*) tombol *submit*.

## 2. Lingkup Audit
Semua komponen React di `src/features/` dan `src/components/` yang mengandung form, *modal* input, atau manipulasi state sebelum pengiriman data (*save/submit*).

## 3. Metodologi (Mekanis)

### Tahap 1: Ekstraksi Kondisi Disabled
* Gunakan pencarian global untuk mendata seluruh tombol pengirim:
  `Select-String -Pattern "disabled=\{.*\}" -Path src\ -Recurse`
* Identifikasi variabel-variabel penentu (contoh: `!isDirty`, `!isValid`, `loading`).

### Tahap 2: Pemetaan Dependency Input
* Untuk setiap *file* yang ditemukan di Tahap 1, daftarkan semua elemen input interaktif (`<select>`, `<input>`, fungsi `handleStatusChange`, `onClick`).
* Evaluasi variabel *state* apa yang diubah oleh input tersebut.

### Tahap 3: Validasi Silang (Deteksi Anomali)
Bandingkan hasil Tahap 1 & Tahap 2. Jika ada input mengubah *state* X, namun X **tidak** berada dalam kondisi logika `disabled` tombol (atau tidak dihitung dalam `useMemo`/`isDirty`), maka itu adalah **Bug Potensial**.

## 4. Daftar Modul Prioritas Tinggi
Berdasarkan arsitektur aplikasi ini, periksa secara intensif modul berikut:
1. `src/features/teacher/MeetingFormModal.tsx`
2. `src/features/homeroom/AddTeacherAttendanceModal.tsx`
3. `src/features/reports/ShareReportModal.tsx`
4. `src/features/teacher/SubjectAttendancePage.tsx` (Verifikasi regresi)
5. `src/features/curriculum/AcademicYearModal.tsx` (Jika ada)
6. Seluruh halaman di `src/features/admin/`

## 5. Eksekusi untuk AI Berikutnya
**Instruksi (Prompt) untuk AI:**
"Baca rencana audit di `.agents/plans/ui-reactivity-audit.md`. Lakukan Tahap 1 dan 2 menggunakan *Node.js Regex Script* atau *PowerShell Select-String* untuk mengekstrak data dari komponen form. Laporkan komponen mana saja yang memiliki *missing dependency* pada tombol simpannya, lalu terapkan *patch* secara *batch*."
