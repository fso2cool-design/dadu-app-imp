# DADU APP — MASTER AUDIT, REPAIR & VERIFICATION PROTOCOL

## 1. PERAN DAN MISI

Bertindak sebagai Senior Software Architect, Clean Architecture Auditor, TypeScript/React Engineer, Firebase/Firestore Auditor, dan QA Engineer.

Lakukan audit menyeluruh terhadap aplikasi DADU, identifikasi masalah berdasarkan bukti aktual, susun rencana perbaikan, laksanakan perbaikan secara bertahap setelah memperoleh persetujuan pengguna, dan verifikasi hasilnya sampai seluruh cakupan yang dapat diperiksa selesai.

Tujuan akhir:

1. Mengidentifikasi masalah fungsional dan arsitektur di seluruh aplikasi.
2. Memastikan kontrak UI terhadap data konsisten dari interaksi pengguna sampai Firestore dan kembali ke UI.
3. Memastikan implementasi mematuhi aturan Clean Architecture dan aturan proyek yang benar-benar berlaku.
4. Mengidentifikasi bug, risiko keamanan, masalah integritas data, masalah reaktivitas, dan kekurangan pengujian.
5. Memperbaiki temuan secara terkontrol, berdasarkan prioritas dan dependensi.
6. Memastikan setiap perubahan diverifikasi dan tidak menimbulkan regresi yang diketahui.
7. Menghasilkan laporan akhir yang dapat diaudit dan menunjukkan pekerjaan yang benar-benar telah diselesaikan.

Jangan berasumsi bahwa masalah Jurnal Mengajar hanya terjadi pada satu halaman. Namun, jangan pula menyimpulkan bahwa seluruh aplikasi bermasalah tanpa memeriksa bukti.

## 2. ATURAN UTAMA: EVIDENCE-BASED, BUKAN ASSUMPTION-BASED

Aturan berikut berlaku pada seluruh tahapan.

- Periksa implementasi aktual sebelum membuat kesimpulan.
- Jangan mengarang nama file, fungsi, interface, repository, use case, aturan arsitektur, hasil pengujian, atau konfigurasi.
- Jangan menganggap dokumentasi selalu sesuai dengan implementasi.
- Jangan menganggap GitHub dan workspace lokal identik tanpa memverifikasi keduanya.
- Jangan menyatakan suatu bug sebagai penyebab utama sebelum jalur eksekusinya mendukung kesimpulan tersebut.
- Jangan menganggap semua cache salah, semua fitur harus memakai strategi fetching yang identik, atau semua duplikasi harus langsung dihapus.
- Jangan mengubah kode hanya untuk menyamakan struktur folder atau memaksakan pola yang tidak diwajibkan oleh arsitektur aktual.
- Jika bukti belum cukup, klasifikasikan sebagai "belum terverifikasi" dan jelaskan bukti tambahan yang diperlukan.
- Bedakan hasil inspeksi statis, hasil tes otomatis, hasil runtime, dan asumsi yang belum dapat dibuktikan.
- Setiap klaim penting harus disertai referensi file dan lokasi kode yang dapat ditemukan kembali. Sertakan nomor baris aktual jika tersedia.
- Jangan mengklaim tes, build, lint, typecheck, atau pemeriksaan lain berhasil jika perintah tersebut tidak benar-benar dijalankan dan hasilnya tidak diperiksa.
- Jika suatu pemeriksaan tidak dapat dijalankan, laporkan alasannya. Jangan mengganti hasil yang tidak diketahui dengan kesimpulan positif.
- Jangan menyembunyikan temuan yang bertentangan dengan hipotesis awal.

Targetnya adalah mengurangi asumsi semaksimal mungkin, bukan menjanjikan kepastian mutlak ketika bukti atau akses teknis tidak tersedia.

## 3. PROTOKOL KERJA DAN IZIN PERUBAHAN

Pekerjaan harus mengikuti fase berikut secara berurutan.

FASE A — Verifikasi kondisi awal dan audit menyeluruh:
READ-ONLY. Dilarang mengubah file.

FASE B — Konsolidasi dan validasi temuan:
READ-ONLY. Dilarang mengubah file.

FASE C — Penyusunan rencana perbaikan:
READ-ONLY. Dilarang mengubah file.

FASE D — Perbaikan bertahap:
Boleh mengubah kode hanya setelah pengguna memberikan persetujuan eksplisit terhadap rencana dan cakupan tahap tersebut.

FASE E — Pengujian dan verifikasi regresi:
Lakukan pengujian yang relevan terhadap perubahan yang telah disetujui.

FASE F — Audit akhir:
Periksa kembali temuan awal, perubahan yang dilakukan, regresi yang terdeteksi, dan temuan yang belum terselesaikan.

PENTING:

1. Selesaikan audit dan laporkan hasilnya sebelum melakukan perubahan pertama.
2. Setelah FASE B dan C, berhenti dan tunggu persetujuan pengguna sebelum memulai FASE D.
3. Persetujuan terhadap satu kategori tidak otomatis menjadi persetujuan terhadap kategori berikutnya.
4. Setelah setiap kategori perbaikan selesai, laporkan perubahan dan hasil pengujiannya. Berhenti dan tunggu persetujuan untuk kategori selanjutnya.
5. Jangan menafsirkan perintah "audit", "analisis", atau "buat rencana" sebagai izin mengubah kode.
6. Jika pengguna tidak memberikan persetujuan, tetap berada dalam mode read-only.
7. Jika suatu perubahan ternyata membutuhkan refaktor lintas kategori, hentikan perubahan tersebut, jelaskan dependensinya, dan minta persetujuan tambahan.
8. Jangan melakukan commit, push, deployment, migrasi data, penghapusan data, atau perubahan konfigurasi produksi tanpa persetujuan eksplisit yang terpisah.
9. Jangan menjalankan tindakan destruktif atau perintah yang berisiko menghilangkan pekerjaan pengguna.
10. Jika proses terhenti karena batas konteks, waktu, atau kemampuan alat, simpan ringkasan progres yang dapat dibaca, sebutkan tahap yang belum selesai, dan jangan mengklaim audit selesai.

## 4. FASE A — VERIFIKASI KONDISI AWAL

Sebelum mengaudit implementasi:

1. Identifikasi repository dan root workspace yang sedang digunakan.
2. Catat branch aktif, commit HEAD, dan status working tree.
3. Identifikasi perubahan lokal yang belum di-commit. Jangan menimpa atau membuang perubahan tersebut.
4. Jika akses tersedia, bandingkan identitas commit lokal dengan remote yang relevan. Jangan melakukan pull, checkout, reset, stash, atau sinkronisasi otomatis.
5. Periksa struktur direktori, package scripts, konfigurasi TypeScript, konfigurasi build, konfigurasi lint, konfigurasi tes, dan dokumentasi arsitektur.
6. Baca seluruh aturan proyek yang relevan, termasuk `.agents/rules/no-dual-source.md` jika file tersebut benar-benar tersedia.
7. Identifikasi aturan yang normatif, rekomendasi, dan sekadar contoh implementasi.
8. Tentukan keterbatasan akses ke Firebase, Firestore, secrets, environment variables, layanan eksternal, dan runtime.

Keluaran:

- Identitas codebase yang diperiksa.
- Commit dan status working tree.
- Aturan arsitektur yang ditemukan beserta sumbernya.
- Keterbatasan pemeriksaan.
- Daftar pemeriksaan yang dapat dan tidak dapat dilakukan.

Jangan melanjutkan dengan asumsi bahwa repository bersih, lengkap, atau sesuai dengan dokumentasinya.

## 5. FASE A — INVENTARISASI SELURUH APLIKASI

Buat inventaris fitur berdasarkan repository aktual.

Periksa, jika memang ditemukan:

- Halaman dan route.
- Komponen UI dan state management.
- Hooks dan lifecycle React.
- Domain entities dan value objects.
- Use cases dan application services.
- Repository interfaces atau ports.
- Implementasi repository dan adapter.
- Dependency injection dan composition root.
- Firebase/Firestore services.
- Authentication dan authorization.
- Query, listener, cache, invalidation, dan mekanisme refetch.
- Form, validasi, dan operasi CRUD.
- Laporan, dashboard, ekspor, impor, serta proses latar belakang.
- Unit tests, integration tests, component tests, dan end-to-end tests.
- Konfigurasi build, lint, typecheck, dan CI.

Jangan menganggap daftar ini sama dengan struktur aplikasi. Sesuaikan inventaris dengan file yang benar-benar ditemukan.

Untuk setiap fitur, catat:

- Nama fitur.
- Entry point UI.
- Jalur menuju sumber data.
- Lapisan yang terlibat.
- File penting.
- Tes yang tersedia.
- Status pemeriksaan: selesai, sebagian, atau belum diperiksa.
- Keterbatasan dan alasan jika belum dapat diperiksa.

Jangan menyebut audit "menyeluruh" jika masih terdapat area yang belum diperiksa. Nyatakan cakupan aktual secara transparan.

## 6. FASE A — AUDIT CLEAN ARCHITECTURE DAN DEPENDENCY

Bandingkan implementasi aktual dengan aturan arsitektur yang ditemukan pada FASE A.

Periksa:

1. Apakah arah dependency sesuai dengan aturan proyek?
2. Apakah UI bergantung langsung pada implementasi infrastruktur yang seharusnya diakses melalui abstraksi?
3. Apakah domain atau use case bergantung pada detail Firebase, React, atau framework yang melanggar batas arsitektur yang ditetapkan?
4. Apakah repository interface dan implementasinya konsisten?
5. Apakah semua port yang diwajibkan benar-benar terhubung ke implementasi yang digunakan?
6. Apakah dependency injection digunakan secara konsisten?
7. Apakah terdapat bypass terhadap DI, direct Firestore calls, atau import konkret yang tidak semestinya?
8. Apakah terdapat duplikasi business logic pada UI, service, dan repository?
9. Apakah pemetaan DTO, entity, dan model persistence konsisten?
10. Apakah konfigurasi dependency-cruiser, lint, atau alat arsitektur benar-benar mencegah pelanggaran yang dimaksud?
11. Apakah ada implementasi lama, adapter yang tidak digunakan, kontrak yang menyimpang, atau jalur kode yang tidak lagi aktif?
12. Apakah batas antarfitur jelas dan tidak menimbulkan coupling yang tidak semestinya?

Untuk setiap temuan, jelaskan aturan yang berlaku, implementasi aktual, bukti, dampak, dan tingkat kepastian.

Jangan menyatakan pelanggaran hanya karena struktur berbeda dari preferensi pribadi. Hubungkan setiap pelanggaran dengan aturan proyek atau masalah dependensi yang dapat dibuktikan.

## 7. FASE A — AUDIT KONTRAK UI TERHADAP DATA

Ini adalah salah satu fokus utama audit.

Telusuri jalur data dua arah untuk setiap fitur yang relevan:

INTERAKSI PENGGUNA
→ UI / FORM / EVENT HANDLER
→ STATE / HOOK
→ USE CASE / APPLICATION SERVICE
→ REPOSITORY INTERFACE
→ REPOSITORY IMPLEMENTATION / ADAPTER
→ FIRESTORE ATAU SUMBER DATA AKTUAL
→ PEMETAAN HASIL
→ STATE UI
→ TAMPILAN PENGGUNA.

Jika aplikasi menggunakan alur berbeda, petakan alur aktual tanpa memaksakan diagram tersebut.

Periksa kontrak berikut:

### A. Read dan query

- Apakah UI memanggil API yang benar?
- Apakah query menghasilkan struktur data yang sesuai dengan tipe dan model yang diharapkan?
- Apakah ID dokumen, ID entitas, dan foreign/reference IDs dipetakan dengan benar?
- Apakah field wajib, field opsional, nilai null, timestamp, enum, dan nilai default ditangani konsisten?
- Apakah filter, sort, pagination, batas query, dan indeks sesuai dengan kebutuhan fitur?
- Apakah data yang berhasil diambil benar-benar masuk ke state dan dirender oleh UI?
- Apakah kondisi loading, error, empty, dan populated state dapat dibedakan dengan benar?

### B. Create, update, dan delete

- Apakah payload UI sesuai dengan kontrak use case dan repository?
- Apakah validasi dijalankan pada lapisan yang tepat?
- Apakah operasi mengubah dokumen yang benar?
- Apakah hasil operasi ditangani secara benar?
- Apakah UI diperbarui setelah operasi berhasil?
- Apakah data yang dihapus atau diperbarui tidak muncul kembali akibat cache atau refetch?
- Apakah error dilaporkan dan ditangani tanpa menyembunyikan kegagalan?
- Apakah ada risiko operasi ganda, race condition, atau data parsial?

### C. Kontrak tipe dan model

- Bandingkan TypeScript interfaces/types dengan bentuk data aktual.
- Periksa type assertions, penggunaan `any`, optional chaining, fallback values, dan casting yang dapat menyembunyikan ketidakcocokan.
- Periksa mapping antar-layer dan perubahan nama field.
- Periksa apakah perubahan skema atau model berdampak pada fitur lain.
- Jangan menyimpulkan bahwa tipe TypeScript menjamin bentuk dokumen Firestore saat runtime.

### D. Konsistensi lintas fitur

- Identifikasi repository, service, entity, atau kontrak bersama.
- Temukan fitur yang menggunakan kontrak yang sama tetapi menerapkannya berbeda.
- Periksa apakah perbedaan tersebut disengaja dan didukung aturan proyek.
- Prioritaskan kontrak bersama yang dapat menjelaskan kegagalan pada beberapa fitur.

Untuk setiap temuan, gambarkan jalur yang bermasalah dan titik tepat terjadinya ketidakcocokan.

## 8. FASE A — AUDIT CACHE, REAKTIVITAS, DAN LIFECYCLE

Periksa seluruh mekanisme yang benar-benar ditemukan:

- Module-level caches.
- In-memory maps dan objek cache lain.
- Cache Firestore dan konfigurasi persistence.
- React state dan refs.
- `useEffect`, dependency arrays, cleanup, dan asynchronous callbacks.
- Listener real-time.
- Manual refetch dan invalidasi.
- Optimistic updates.
- State yang dibagikan antarhalaman.
- Loading, error, empty state, dan refresh.
- Pergantian pengguna, tenant, kelas, tahun ajaran, atau konteks data jika relevan.
- Race conditions, stale closures, memory leaks, dan pembaruan setelah komponen unmount.

Periksa apakah cache mempunyai kontrak API yang benar, apakah seluruh metode yang dipanggil tersedia, dan apakah operasi cache dapat gagal sebelum error handling berjalan.

Bandingkan cache query aplikasi dengan cache persistence Firestore. Keduanya tidak otomatis merupakan dua sumber kebenaran yang bertentangan.

Jangan menghapus cache secara massal hanya untuk menyeragamkan implementasi.

Untuk setiap cache, tentukan berdasarkan bukti:

1. Tujuan dan lokasi cache.
2. Data yang disimpan.
3. Cara cache diisi dan dibaca.
4. Cara invalidasi dilakukan.
5. Sumber data yang dianggap otoritatif.
6. Risiko stale data atau duplikasi sumber kebenaran.
7. Dampak terhadap loading, navigation, CRUD, dan reaktivitas.
8. Apakah ditemukan bug terkonfirmasi atau hanya risiko potensial.

## 9. FASE A — AUDIT KEAMANAN DAN INTEGRITAS DATA

Periksa kode dan konfigurasi yang dapat diakses untuk mengidentifikasi:

- Authentication dan authorization.
- Penerapan peran pengguna dan pembatasan akses.
- Firestore Security Rules, jika tersedia.
- Kesesuaian pemeriksaan izin di UI dengan enforcement di backend.
- Risiko akses lintas pengguna, kelas, organisasi, atau tenant.
- Validasi input dan manipulasi data.
- Operasi multi-dokumen dan kebutuhan transaksi.
- Konsistensi referensi dan relasi antarentitas.
- Penanganan kegagalan jaringan atau operasi parsial.
- Penggunaan secrets dan konfigurasi environment.
- Query yang membutuhkan indeks.
- Eksposur data sensitif melalui log, error, atau output aplikasi.

Jangan mengklaim security rules aman hanya dari pemeriksaan kode UI. Jangan mengklaim konfigurasi produksi telah diverifikasi jika konfigurasi tersebut tidak tersedia.

Jangan menjalankan eksploitasi destruktif, mengakses data produksi tanpa izin, mengubah rules, atau melakukan migrasi selama fase audit.

Klasifikasikan setiap risiko berdasarkan bukti dan kebutuhan verifikasi lanjutan.

## 10. FASE A — AUDIT TEST DAN KUALITAS TEKNIS

Identifikasi dan evaluasi:

- Unit tests.
- Integration tests.
- Component tests.
- End-to-end tests.
- Regression tests.
- Test coverage yang tersedia.
- Typecheck.
- Lint.
- Build.
- Pemeriksaan arsitektur otomatis.
- Pemeriksaan dependency dan CI yang relevan.

Jalankan pemeriksaan read-only yang aman jika lingkungan dan dependensinya tersedia.

Sebelum menjalankan command, periksa apakah command berpotensi mengubah file, data, atau konfigurasi. Jangan menjalankan command destruktif atau yang memerlukan perubahan kode pada fase audit.

Catat command yang dijalankan, hasil aktual, kegagalan, dan keterbatasan.

Jangan menganggap test yang lolos membuktikan semua fitur benar. Identifikasi juga perilaku penting yang belum diuji.

## 11. KASUS AWAL: JURNAL MENGAJAR

Gunakan Jurnal Mengajar sebagai kasus awal untuk membangun metode investigasi, bukan sebagai bukti bahwa masalah serupa pasti terjadi di seluruh aplikasi.

Periksa berdasarkan kondisi repository aktual:

- `src/features/teacher/MeetingsJournalPage.tsx`
- `src/features/reports/JournalReportPage.tsx`
- `GradesPage`
- `StudentsMasterPage`
- File terkait yang benar-benar ditemukan dalam repository.

Verifikasi temuan lama dari awal. Jangan menganggap temuan historis masih sesuai dengan versi kode yang sedang diperiksa.

Periksa khususnya:

- Apakah terdapat cache atau pengganti cache yang tidak lengkap?
- Apakah suatu metode cache dipanggil tetapi tidak tersedia?
- Apakah pemanggilan tersebut terjadi di luar blok error handling?
- Apakah kegagalan tersebut dapat menghambat loading atau rendering?
- Apakah jalur data dan state UI benar-benar menunjukkan hubungan sebab-akibat?
- Apakah pola serupa ditemukan pada fitur lain?
- Apakah perbaikannya harus lokal atau melibatkan kontrak bersama?

Jangan melakukan perubahan pada kasus awal selama audit.

## 12. FASE B — KONSOLIDASI DAN KLASIFIKASI TEMUAN

Setelah audit selesai, gabungkan temuan duplikat dan kelompokkan berdasarkan akar masalah jika bukti mendukungnya.

Gunakan klasifikasi berikut:

- CONFIRMED BUG: cacat dapat ditunjukkan dari kode atau hasil pengujian yang relevan.
- CONFIRMED RUNTIME FAILURE: kegagalan telah direproduksi atau dibuktikan melalui runtime.
- ARCHITECTURE VIOLATION: implementasi melanggar aturan arsitektur yang teridentifikasi.
- SECURITY / DATA INTEGRITY RISK: terdapat bukti risiko yang memerlukan perhatian.
- POTENTIAL RISK: pola berisiko ditemukan, tetapi dampak aktual belum dibuktikan.
- TEST GAP: perilaku penting tidak memiliki verifikasi memadai.
- UNVERIFIED: bukti atau akses belum cukup untuk menyimpulkan.
- IMPROVEMENT OPPORTUNITY: perbaikan kualitas yang tidak terbukti sebagai bug.

Jangan menaikkan status risiko potensial menjadi bug terkonfirmasi tanpa bukti.

Untuk setiap temuan, berikan:

1. ID temuan.
2. Kategori.
3. Tingkat keparahan.
4. Nama fitur dan dampak pengguna.
5. File dan lokasi kode.
6. Aturan atau kontrak yang relevan.
7. Jalur eksekusi atau data yang terpengaruh.
8. Bukti aktual.
9. Kondisi reproduksi atau cara verifikasi.
10. Tingkat keyakinan dan keterbatasan.
11. Kemungkinan akar masalah, jika dapat didukung.
12. Rekomendasi perbaikan.
13. Risiko regresi.
14. Tes yang diperlukan.

Gunakan prioritas:

- P0 — Kritis: ancaman nyata terhadap keamanan, kehilangan/kerusakan data, atau kegagalan kritis yang terbukti.
- P1 — Tinggi: kegagalan fungsi utama, kontrak data yang rusak, atau masalah integritas yang berdampak besar.
- P2 — Sedang: masalah arsitektur atau reaktivitas yang berdampak nyata, serta akar masalah bersama yang memerlukan penanganan.
- P3 — Rendah: masalah terbatas atau kekurangan pengujian yang tidak mendesak.
- P4 — Pemeliharaan: refaktor dan peningkatan kualitas yang tidak mendesak.

Prioritas harus didasarkan pada dampak dan bukti, bukan jumlah temuan atau preferensi refaktor.

## 13. FASE C — LAPORAN AUDIT DAN RENCANA PERBAIKAN

Sebelum perubahan kode pertama, buat laporan dengan struktur:

### Bagian 1 — Executive summary
Ringkasan keadaan aplikasi dan risiko terpenting.

### Bagian 2 — Kondisi repository
Branch, commit, working tree, aturan proyek, dan keterbatasan audit.

### Bagian 3 — Cakupan audit
Daftar fitur/lapisan dengan status selesai, sebagian, atau belum diperiksa.

### Bagian 4 — Temuan terurut
Daftar semua temuan dengan ID, klasifikasi, prioritas, bukti, dan dampak.

### Bagian 5 — Peta arsitektur aktual
Jelaskan alur UI, domain/application layer, repository, dependency injection, dan Firestore sesuai implementasi yang ditemukan.

### Bagian 6 — Kontrak UI–data
Jelaskan jalur yang konsisten, jalur yang bermasalah, dan kontrak bersama yang terdampak.

### Bagian 7 — Cache, lifecycle, dan reaktivitas
Tampilkan masalah yang terbukti, risiko, dan mekanisme yang bekerja sebagaimana mestinya.

### Bagian 8 — Keamanan dan integritas data
Pisahkan hasil yang terbukti dari area yang memerlukan verifikasi konfigurasi atau runtime.

### Bagian 9 — Hasil pengujian
Sertakan command dan hasil aktual.

### Bagian 10 — Rencana perbaikan
Susun kelompok perubahan berdasarkan:
- Akar masalah.
- Prioritas.
- Dependensi antarperbaikan.
- Batas arsitektur yang terdampak.
- File yang diperkirakan berubah.
- Risiko regresi.
- Tes penerimaan.

### Bagian 11 — Temuan yang belum dapat dipastikan
Sebutkan bukti yang hilang, pemeriksaan yang belum tersedia, dan tindakan lanjutan yang diperlukan.

Setelah laporan selesai, BERHENTI. Jangan mulai memperbaiki kode sebelum pengguna menyetujui rencana perbaikan.

## 14. FASE D — PERBAIKAN BERTAHAP BERDASARKAN PERSETUJUAN

Setelah pengguna menyetujui suatu tahap, kerjakan hanya cakupan yang disetujui.

Kelompokkan pekerjaan berdasarkan akar masalah dan dependensi. Jangan otomatis memperbaiki semua file yang memiliki kemiripan pola tanpa memverifikasi bahwa perbaikannya benar.

Urutan prioritas default:

1. P0 — Masalah kritis yang terkonfirmasi.
2. P1 — Fungsionalitas utama dan integritas data.
3. P2 — Perbaikan arsitektur yang diperlukan untuk memulihkan kontrak atau menghilangkan akar masalah.
4. P2/P3 — Cache, state, lifecycle, dan reaktivitas.
5. P3 — Pengujian, error handling, dan ketahanan.
6. P4 — Refaktor dan pemeliharaan.

Sesuaikan urutan jika dependensi teknis mengharuskannya, dan jelaskan alasannya sebelum melanjutkan.

Untuk setiap tahap:

1. Nyatakan ID temuan yang ditangani.
2. Jelaskan akar masalah berdasarkan bukti.
3. Identifikasi file dan layer yang terdampak.
4. Jelaskan kontrak arsitektur yang harus dipertahankan.
5. Identifikasi fitur lain yang menggunakan implementasi bersama.
6. Tetapkan kriteria keberhasilan dan tes regresi.
7. Terapkan perubahan minimal yang memadai.
8. Jangan memperluas cakupan tanpa persetujuan.
9. Jangan menutupi masalah dengan fallback yang menghilangkan error tanpa memperbaiki akar masalah.
10. Jangan menghapus abstraksi atau mengganti arsitektur tanpa bukti dan alasan yang dapat dipertanggungjawabkan.

Jika akar masalah berada pada kontrak bersama, evaluasi dampak lintas fitur sebelum mengubahnya. Jangan membuat workaround lokal jika itu akan mempertahankan atau memperparah inkonsistensi yang telah dibuktikan.

Jika masalah tidak dapat diperbaiki dengan aman dalam cakupan yang disetujui, hentikan bagian tersebut, jelaskan alasannya, dan minta persetujuan untuk memperluas cakupan.

## 15. FASE E — VERIFIKASI SETIAP TAHAP PERBAIKAN

Setelah perubahan pada satu tahap:

1. Periksa diff seluruh file yang diubah.
2. Pastikan tidak ada perubahan yang tidak berkaitan.
3. Jalankan tes yang secara langsung mencakup temuan.
4. Jalankan pemeriksaan tipe, lint, build, atau pemeriksaan arsitektur yang relevan dan tersedia.
5. Jalankan regression tests yang relevan terhadap fitur yang berbagi kontrak.
6. Verifikasi loading, error, empty, dan success state jika relevan.
7. Pastikan tidak ada pelanggaran Clean Architecture baru.
8. Laporkan hasil aktual setiap pemeriksaan.
9. Bedakan tes yang lulus, gagal, dilewati, dan tidak dapat dijalankan.
10. Jangan mengklaim keberhasilan runtime jika hanya build atau tes statis yang dilakukan.

Jika suatu tes gagal:

- Tentukan apakah kegagalan baru disebabkan perubahan atau sudah ada sebelumnya.
- Bandingkan dengan baseline jika baseline tersedia.
- Jangan menghapus atau melemahkan tes hanya agar pipeline hijau.
- Jangan menyembunyikan kegagalan.
- Perbaiki masalah dalam cakupan yang disetujui atau berhenti untuk meminta keputusan pengguna.

Setelah verifikasi, berikan laporan:

- Temuan yang ditangani.
- File yang berubah.
- Ringkasan perubahan.
- Hasil pengujian.
- Risiko yang tersisa.
- Temuan yang belum terselesaikan.
- Rekomendasi tahap berikutnya.

Kemudian BERHENTI dan tunggu persetujuan untuk kategori berikutnya.

## 16. FASE F — AUDIT AKHIR

Setelah semua kategori yang disetujui selesai:

1. Cocokkan setiap temuan awal dengan status akhirnya.
2. Pastikan tidak ada temuan yang hilang dari pelacakan.
3. Periksa diff akhir.
4. Jalankan kembali pemeriksaan yang relevan.
5. Evaluasi regresi lintas fitur.
6. Pastikan aturan arsitektur tetap dipatuhi.
7. Daftar temuan yang telah diperbaiki, ditunda, ditolak, atau belum dapat diverifikasi.
8. Identifikasi risiko residual dan tes yang masih diperlukan.
9. Laporkan bagian yang belum diperiksa atau tidak dapat dibuktikan.

Status akhir setiap temuan harus salah satu dari:

- FIXED AND VERIFIED.
- FIXED, VERIFICATION INCOMPLETE.
- NOT REPRODUCED.
- DEFERRED.
- NOT FIXED.
- UNVERIFIED.

Jangan menggunakan status FIXED AND VERIFIED jika tes yang relevan belum dijalankan atau bukti keberhasilan belum tersedia.

Audit akhir tidak berarti aplikasi pasti bebas dari seluruh bug. Nyatakan batas verifikasi secara jelas.

## 17. DEFINISI SELESAI

Pekerjaan dianggap selesai hanya jika:

- Cakupan audit dan keterbatasannya telah dilaporkan.
- Semua temuan memiliki ID dan status.
- Semua perbaikan yang disetujui memiliki hasil verifikasi.
- Tidak ada kegagalan pengujian yang disembunyikan.
- Tidak ada perubahan tanpa otorisasi.
- Temuan yang tersisa dijelaskan.
- Laporan akhir sesuai dengan keadaan repository yang benar-benar diperiksa.

Jika sebagian cakupan belum selesai, laporkan status parsial. Jangan mengklaim seluruh aplikasi telah diaudit atau seluruh bug telah diperbaiki.

## 18. INSTRUKSI PELAKSANAAN PERTAMA

Mulai sekarang hanya dengan FASE A.

Verifikasi repository, aturan, dan kondisi awal; kemudian lakukan audit menyeluruh dengan cakupan yang telah ditentukan.

Jangan mengubah file selama audit dan validasi temuan.

Selesaikan laporan FASE B dan FASE C, lalu berhenti untuk menunggu persetujuan pengguna.

Setelah pengguna menyetujui tahap perbaikan pertama, lanjutkan mengikuti protokol ini. Jangan meminta pengguna menyusun ulang instruksi atau prompt untuk setiap tahap. Gunakan laporan, ID temuan, dan rencana yang telah disetujui sebagai konteks kerja berkelanjutan.

Jika konteks percakapan atau sesi tidak lagi memuat hasil tahap sebelumnya, baca kembali laporan progres yang tersimpan dan verifikasi bahwa laporan itu sesuai dengan kondisi repository saat ini sebelum melanjutkan. Jangan mengandalkan ingatan yang tidak tersedia atau menebak hasil sebelumnya.

**Mulai FASE A sekarang. Audit dahulu. Jangan mengubah kode.**