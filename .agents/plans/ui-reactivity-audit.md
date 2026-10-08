# Master UI Reactivity Audit Plan (Revisi Ekstensif)

## 1. Tujuan
Memastikan seluruh sistem reaktivitas UI merespons perubahan *state* secara akurat. Mengeliminasi *bug* tombol terkunci, data basi (*stale cache*), dan *dropdown* nyangkut.

## 2. Inventarisasi Pola Reactivity Aplikasi (Kategori Audit)
Aplikasi Dadu menggunakan 3 pola reaktivitas yang rentan putus rantai (Missed Dependency):

### Kategori A: Form & Button Reactivity (Validasi & Submit)
* **Pola:** Tombol simpan `disabled={!isDirty || loading}`.
* **Titik Kritis:** Perubahan elemen `<select>`, *checkbox*, atau *custom button* gagal memicu `setIsDirty(true)`.

### Kategori B: Cascading State Reactivity (Chaining Dropdown)
* **Pola:** Dropdown B bergantung pada Dropdown A (Cth: Pilih Kelas -> Filter Mapel).
* **Titik Kritis:** Saat Dropdown A diubah, Dropdown B atau *state* turunannya gagal di-*reset* ke *null*/kosong, menyebabkan pengiriman data *invalid* (ID mapel dari kelas yang salah).

### Kategori C: Cross-Page In-Memory Cache Reactivity (Sinkronisasi Antar Tab)
* **Pola:** Penggunaan konstan SWR *Cache* manual (`const moduleCache = new Map()`) di luar *Context*.
* **Titik Kritis:** Tab Presensi meng-update *database*, tetapi *cache* `Map` di Tab Jurnal tidak di-*invalidate*, sehingga tulisan "Belum Diisi" tetap muncul meski data sudah masuk.

## 3. Metodologi Eksekusi (Mekanis)

### Tahap 1: Ekstraksi Kategori A (Form/Button)
* **Skrip:** `Select-String "disabled=\{.*\}" -Path src\ -Recurse`
* **Cek:** Bandingkan fungsi `onChange` setiap *input* dengan pemicu `isDirty`/`useMemo` untuk tombol submit.

### Tahap 2: Ekstraksi Kategori B (Cascading)
* **Skrip:** Cari blok `useEffect` yang memantau perubahan ID parent: `Select-String "useEffect.*\[.*Id\]" -Path src\ -Recurse`
* **Cek:** Pastikan ada mekanisme `setChildState(null)` atau `childCache.clear()` saat *parent dependency* berubah.

### Tahap 3: Ekstraksi Kategori C (Cache)
* **Skrip:** Cari pola deklarasi *cache* global: `Select-String "new Map<.*>" -Path src\features\ -Recurse`
* **Cek:** Analisis kapan fungsi `.set()` dan `.delete()`/`.clear()` dipanggil. Verifikasi apakah fungsi simpan (mutasi) memicu pembersihan *cache* di *file* lain, atau perlukah *cache* dipusatkan ke `ApplicationContext`.

## 4. Prioritas Eksekusi
- `src/features/teacher/` (Kategori A & C)
- `src/features/homeroom/` (Kategori A)
- `src/features/admin/` (Kategori B)

## 5. Instruksi AI
Mulai dari **Tahap 1**. Gunakan *Node.js Regex* untuk memetakan tombol `disabled` dan pasangannya di direktori `src/features`. Laporkan anomali, lalu berikan *patch*. Lanjut ke Tahap 2 dan 3.
