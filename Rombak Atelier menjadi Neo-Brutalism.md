Ubah design system `atelier` pada aplikasi DADU menjadi tema **Neo-Brutalism**, dengan referensi visual utama:

https://www.neobrutalism.dev/

TUJUAN UTAMA

Saya tidak ingin membuat design system baru.

Saya ingin **merombak `atelier` menjadi Neo-Brutalism**, sehingga seluruh UI yang saat ini menggunakan:

`data-design-system="atelier"`

secara visual berubah menjadi design language Neo-Brutalism.

Pertahankan key/id `atelier` agar kompatibilitas dengan preference/theme state yang sudah ada tetap terjaga.

JANGAN mengubah:
- business logic
- Firebase/authentication
- Firestore/data model
- routing
- permission/role system
- API/data fetching
- form behavior
- validation logic
- print/document generation logic
- domain logic
- component contracts/API kecuali benar-benar diperlukan
- `paper-craft`
- `minimalist`

Gunakan repository yang sedang terbuka sebagai source of truth. Jangan membuat ulang aplikasi dari awal.

---

## 1. INSPEKSI SEBELUM EDIT

Sebelum mengubah kode:

1. Baca `src/types/index.ts`.
2. Identifikasi seluruh definisi:
   - `DesignSystemKey`
   - `DesignSystemTokens`
   - `DesignSystemColorTokens`
   - `DESIGN_SYSTEMS`
   - typography tokens
   - spacing tokens
   - border tokens
   - elevation/shadow tokens
   - radius tokens
   - transition tokens
3. Baca `src/index.css`.
4. Identifikasi seluruh CSS variable bridge antara design-system token dengan variable aplikasi seperti:
   - `--app-bg`
   - `--card-bg`
   - `--card-border`
   - `--text-main`
   - dan variable terkait lainnya.
5. Identifikasi bagaimana `atelier` dipilih dan diterapkan oleh `DesignSystemContext` atau mekanisme theme yang digunakan aplikasi.
6. Cari hardcoded color, border-radius, shadow, border-width, dan background yang menyebabkan komponen Atelier mengabaikan token design-system.
7. Identifikasi komponen UI utama yang paling banyak menggunakan style Atelier:
   - Button
   - Card
   - Input
   - Select
   - Dialog/Modal
   - Tabs
   - Table
   - Badge
   - Dropdown
   - Navigation
   - PageHeader
   - Sidebar
   - Dashboard cards
   - Empty state
   - Loading state
   - Toast/feedback
8. Periksa test yang berhubungan dengan design-system/theme/leakage/print isolation sebelum melakukan perubahan.

Jangan langsung melakukan refactor besar sebelum memahami dependency tersebut.

---

## 2. REFERENSI NEO-BRUTALISM

Gunakan:

https://www.neobrutalism.dev/

sebagai referensi visual.

Jika NeedMCP tersedia di environment ini, gunakan NeedMCP untuk mengambil design information yang relevan sebelum menentukan token final.

Jika style/reference Neo-Brutalism tersedia melalui NeedMCP, gunakan tool yang tersedia untuk:
- mengambil design system/style information
- mengambil component guidance
- mengambil palette/typography/radius/border/shadow rules

Jangan mengarang token berdasarkan nama "Neo-Brutalism" saja jika data design system tersedia dari NeedMCP.

Jika NeedMCP tidak menyediakan style tersebut, gunakan situs resmi Neo-Brutalism sebagai visual reference dan turunkan token secara konsisten dari karakter visualnya.

---

## 3. KARAKTER VISUAL TARGET

Atelier yang sekarang memiliki karakter:

- soft
- premium
- restrained
- nested/double-bezel cards
- squircle
- soft shadows
- editorial/high-end aesthetic

harus diubah secara nyata menjadi:

- bold
- high-contrast
- graphic
- playful tetapi tetap profesional
- strong black/dark borders
- hard/offset shadows
- flat surfaces
- distinctive accent colors
- stronger typography hierarchy
- more visible component boundaries
- less "luxury soft UI"
- more "graphic interface"

Jangan hanya mengganti warna.

Visual target harus terasa seperti Neo-Brutalism sejak pertama kali halaman dibuka.

---

## 4. TOKEN DESIGN SYSTEM

Ubah token `atelier` agar menjadi sumber utama Neo-Brutalism.

Pertahankan struktur token yang sudah ada.

Jangan membuat styling terpisah untuk setiap halaman jika token dapat menyelesaikannya secara global.

Prioritaskan:

### Colors

Gunakan:
- high-contrast foreground/background
- bold accent palette
- strong neutral base
- accent colors yang jelas dan intentional

Jangan membuat semua komponen berwarna-warni sekaligus.

Gunakan accent color secara hierarkis:
- primary action
- active state
- important information
- selected state
- notification/emphasis

Pastikan text contrast tetap memenuhi accessibility.

### Borders

Neo-Brutalism harus memiliki border yang terlihat.

Prioritaskan:
- border gelap/tegas
- border width yang lebih kuat dibanding Atelier
- consistent border treatment

Hindari hairline border yang terlalu halus.

### Shadows

Ganti soft luxury shadow Atelier dengan shadow yang lebih graphic/hard.

Contoh prinsip:

`box-shadow: offset-x offset-y 0 currentColor;`

atau variasi offset yang konsisten.

Shadow harus terasa seperti elemen fisik/graphic offset, bukan floating glassmorphism.

### Radius

Kurangi radius besar/squircle Atelier.

Gunakan radius yang lebih kecil dan konsisten.

Jangan membuat seluruh UI menjadi pill-shaped.

### Typography

Pertahankan font infrastructure yang sudah ada jika memungkinkan.

Namun ubah hierarchy agar:
- heading lebih kuat
- label lebih tegas
- button lebih assertive
- important values lebih prominent

Jangan menambahkan font dependency baru hanya untuk kosmetik jika tidak diperlukan.

### Spacing

Pertahankan spacing token architecture yang ada.

Sesuaikan hanya jika diperlukan untuk mencapai karakter Neo-Brutalism.

---

## 5. COMPONENT TRANSFORMATION

Audit dan sesuaikan komponen UI utama.

### Buttons

Target:
- strong border
- visible offset shadow
- bold label
- clear hover
- clear active/pressed state
- visible focus state

Hover jangan hanya mengubah opacity.

Pressed state harus terasa seperti tombol benar-benar ditekan, misalnya dengan mengurangi shadow offset/mentranslasikan element.

### Cards

Ubah:
- soft elevated card
- nested bezel
- large squircle

menjadi:

- flat graphic surface
- strong border
- hard offset shadow
- clear hierarchy

Jangan memberikan shadow berlapis-lapis yang menyerupai Atelier.

### Inputs

Gunakan:
- strong border
- clear focus state
- high contrast
- obvious active state

Jangan gunakan subtle border yang hampir tidak terlihat.

### Modal/Dialog

Modal harus mempertahankan accessibility dan behavior yang sekarang.

Yang berubah hanya visual:
- strong border
- graphic shadow
- stronger title
- clear action hierarchy

### Tabs

Active tab harus sangat jelas secara visual.

Gunakan border/background/offset treatment yang sesuai Neo-Brutalism.

### Tables

Pertahankan struktur data dan behavior.

Perkuat:
- header
- row boundaries
- active/hover states
- important cells

### Badges

Gunakan bentuk dan palette yang lebih graphic.

Hindari badge yang terlalu soft/pastel jika tidak diperlukan.

### Navigation / Sidebar

Pastikan active navigation terlihat jelas.

Jangan membuat navigation menjadi dekoratif berlebihan.

---

## 6. HARD-CODED STYLE AUDIT

Setelah token diubah, cari komponen yang masih memiliki:

- `bg-white`
- `bg-black`
- hardcoded hex colors
- `shadow-*`
- custom box-shadow
- large rounded corners
- inline colors
- Atelier-specific visual treatment

yang membuat komponen tidak mengikuti design-system.

Refactor hanya yang memang menghambat konsistensi theme.

Jangan melakukan global search-and-replace secara membabi buta.

---

## 7. DARK MODE

Periksa apakah aplikasi saat ini mendukung:

`light`
`dark`

Jika `atelier` mempunyai `darkColors`, jangan menghapus architecture tersebut tanpa alasan.

Jika Neo-Brutalism versi referensi saat ini memang light-oriented, jangan memaksakan dark mode yang merusak karakter visual.

Namun tetap pertahankan API dan struktur dark theme yang sudah digunakan aplikasi.

Jika dark mode tetap dipertahankan, buat versi Neo-Brutalism yang coherent:
- high contrast
- strong border
- hard shadow
- readable typography
- accessible controls

Jangan sekadar invert warna.

---

## 8. PRINT ISOLATION — SANGAT PENTING

Jangan biarkan perubahan Neo-Brutalism merusak dokumen resmi atau printable UI.

Audit:
- `printable-document`
- `print-sheet`
- official document headers
- signature areas
- document tables
- print-only elements

Tema aplikasi boleh Neo-Brutalism.

Dokumen cetak tidak boleh tiba-tiba memiliki:
- neon accent
- hard offset shadow
- decorative border
- brutalist card styling

kecuali memang secara eksplisit bagian dari desain dokumen.

Pertahankan print isolation yang sudah ada.

---

## 9. JANGAN MEMASANG SELURUH LIBRARY NEO-BRUTALISM SECARA OTOMATIS

Referensi:

https://www.neobrutalism.dev/

memiliki banyak komponen React/Tailwind.

Jangan mengganti seluruh component architecture DADU hanya karena library tersebut tersedia.

Gunakan library tersebut hanya jika:
1. komponen existing DADU memang tidak memadai,
2. API/behavior dapat dipertahankan,
3. dependency tambahan benar-benar diperlukan,
4. perubahan tidak merusak architecture yang sudah ada.

Prioritas:

**existing DADU architecture + Neo-Brutalism styling**

bukan:

**rewrite DADU menjadi library Neo-Brutalism.**

---

## 10. COMPATIBILITY

Pastikan:

`paper-craft` tetap Paper Craft.

`minimalist` tetap Minimalist.

Hanya:

`atelier`

yang berubah menjadi Neo-Brutalism.

Jangan membuat CSS global seperti:

`.card { ... }`

yang menyebabkan theme lain ikut berubah.

Gunakan:
- design-system tokens
- CSS variables
- `[data-design-system="atelier"]`
- atau mekanisme theme existing

agar perubahan terisolasi.

---

## 11. TESTING

Setelah implementasi:

1. TypeScript type-check.
2. Lint.
3. Unit tests.
4. Design-system tests.
5. Theme leakage tests.
6. Print isolation tests.
7. Production build.

Jika ada test existing yang gagal karena assertion visual/token lama, update test hanya jika behavior yang diuji memang sengaja berubah.

Jangan menghapus test hanya untuk membuat test suite hijau.

---

## 12. VISUAL QA

Lakukan audit minimal terhadap:

- Login
- Dashboard
- Sidebar/navigation
- Page header
- Cards
- Forms
- Tables
- Search
- Modal
- Dropdown
- Tabs
- Notifications/feedback
- Loading state
- Empty state
- Error state
- Official documents
- Print preview

Pastikan semuanya terasa berasal dari satu design language.

Yang dicari bukan sekadar "warna sudah berubah", tetapi:

**Apakah pengguna langsung dapat melihat bahwa Atelier telah berubah menjadi Neo-Brutalism?**

Jika jawabannya belum, lanjutkan visual refinement pada token dan shared components, bukan menambahkan CSS acak per halaman.

---

## 13. ACCEPTANCE CRITERIA

Implementasi dianggap selesai jika:

- `atelier` tetap menjadi key yang digunakan aplikasi.
- Atelier secara visual berubah menjadi Neo-Brutalism.
- Paper Craft tidak berubah.
- Minimalist tidak berubah.
- Business logic tidak berubah.
- Firebase/auth tidak berubah.
- Routing tidak berubah.
- Data model tidak berubah.
- Print isolation tetap aman.
- Light/dark behavior tetap coherent sesuai architecture.
- Shared components mengikuti Neo-Brutalism.
- Hardcoded Atelier styling yang bypass token sudah diaudit.
- Tidak ada theme leakage.
- Type-check berhasil.
- Test suite relevan berhasil.
- Production build berhasil.
- Tidak ada dependency baru yang ditambahkan tanpa alasan teknis yang jelas.

---

## OUTPUT YANG SAYA INGINKAN

Sebelum coding, berikan audit singkat:

1. file utama yang akan diubah
2. token Atelier yang akan diubah
3. shared components yang terdampak
4. apakah ada hardcoded styling yang harus diperbaiki
5. apakah ada risiko terhadap print isolation
6. apakah ada dependency yang benar-benar perlu ditambahkan

Setelah itu implementasikan perubahan.

Pada akhir pekerjaan berikan:

- daftar file yang diubah
- ringkasan perubahan visual
- dependency yang ditambahkan jika ada
- hasil type-check
- hasil lint
- hasil test
- hasil build
- hasil audit theme leakage
- hasil audit print isolation

Jangan menyatakan pekerjaan selesai sebelum benar-benar menjalankan validation yang tersedia di repository.