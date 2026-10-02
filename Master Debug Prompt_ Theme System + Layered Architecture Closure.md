# DADU — MASTER DEBUG PROMPT
## Theme System + Layered Architecture Closure / Hardening / Production Readiness

Anda bekerja pada repository DADU berikut:

Repository:
https://github.com/fso2cool-design/dadu-app-imp

DADU adalah aplikasi administrasi guru berbasis React + TypeScript + Firebase/Firestore yang ditargetkan untuk deployment production di Vercel.

Tugas Anda adalah melakukan **satu audit dan hardening terintegrasi** untuk dua area sekaligus:

1. **Theme System Closure**
2. **Layered Architecture Closure**

Tujuan akhirnya bukan melakukan rewrite besar-besaran, tetapi memastikan implementasi yang sekarang benar-benar konsisten, memiliki satu sumber kebenaran, dependency direction yang sehat, dan siap dikembangkan lebih lanjut tanpa menambah technical debt.

---

# ATURAN UTAMA

1. Jangan langsung mengubah kode.
2. Lakukan audit repository terlebih dahulu.
3. Petakan kondisi aktual berdasarkan kode yang benar-benar ada.
4. Bedakan dengan jelas:
   - PASS
   - NEEDS FIX
   - RISK
   - INFORMATIONAL
5. Setelah audit selesai, lakukan perbaikan yang memang diperlukan.
6. Jangan membuat refactor besar hanya demi “terlihat bersih”.
7. Pertahankan business logic, struktur data Firestore, route, UI behavior, dan fitur yang sudah berjalan kecuali ada alasan teknis yang jelas.
8. Jangan mengganti framework.
9. Jangan mengganti Firebase/Firestore.
10. Jangan membuat sistem theme baru apabila sistem yang sekarang masih dapat disempurnakan.
11. Jangan membuat duplicate source of truth.
12. Semua perubahan harus seminimal mungkin tetapi menyelesaikan akar masalah.
13. Jangan menghapus kode hanya karena terlihat legacy sebelum memastikan tidak lagi digunakan.
14. Jangan mengubah schema database atau struktur collection Firestore kecuali audit membuktikan hal tersebut mutlak diperlukan.
15. Jangan melakukan silent breaking changes.
16. Setelah perubahan selesai, lakukan build/type-check/lint/test yang tersedia dan perbaiki regression yang muncul.

---

# BAGIAN A — AUDIT THEME SYSTEM

Audit seluruh repository untuk mengetahui bagaimana theme bekerja dari sumber hingga komponen UI.

Sistem yang harus ditemukan dan diverifikasi antara lain:

- `DesignSystemContext`
- `ThemeContext`
- CSS variables
- `data-design-system`
- light/dark mode
- Tailwind classes
- CSS overrides
- hardcoded colors
- persistence theme
- theme switching
- theme-dependent component styles

Saat audit, identifikasi seluruh theme yang tersedia.

Target saat ini adalah tiga design system:

- `paper-craft`
- `minimalist`
- `atelier`

Verifikasi bahwa ketiganya benar-benar:
- terdaftar
- dapat dipilih
- disimpan
- dimuat kembali
- menghasilkan token yang lengkap
- digunakan secara konsisten oleh seluruh UI

Jangan hanya memeriksa context. Telusuri sampai ke komponen feature.

---

# BAGIAN B — THEME SINGLE SOURCE OF TRUTH

Pastikan hanya ada **satu sumber kebenaran utama** untuk theme/design-system.

Target arsitektur:

Feature Component
→ semantic design token
→ Design System Context / CSS Variables

Bukan:

Feature Component
→ hardcoded orange/cyan/etc.

dan bukan:

Feature Component
→ ThemeContext
→ DesignSystemContext
→ duplicate state

Verifikasi hubungan `ThemeContext` dan `DesignSystemContext`.

Apabila `ThemeContext` hanya merupakan compatibility shim dan tidak diperlukan sebagai state kedua, pertahankan pendekatan tersebut dan jangan membuat state theme kedua.

Periksa properti seperti:

```ts
category: 'light'
```

Jika property tersebut sudah tidak merepresentasikan keadaan sebenarnya karena light/dark sudah merupakan konsep terpisah, perbaiki secara tepat atau hapus jika memang redundant.

---

# BAGIAN C — THEME TOKEN CLOSURE

Audit seluruh token design system.

Minimal kelompok token yang harus dapat direpresentasikan secara konsisten:

```text
surface
surface-muted
surface-elevated
text
text-muted
border
accent
accent-hover
accent-soft
focus
selection
input
card
shadow
radius
```

Tambahkan semantic status token apabila memang diperlukan:

```text
success
warning
error
info
```

Pisahkan secara konseptual:

### 1. Theme-dependent tokens

Contoh:

- accent
- primary action
- selected item
- focus ring
- active navigation
- branded highlight

Token jenis ini HARUS berasal dari design system.

### 2. Semantic status tokens

Contoh:

- success
- warning
- error
- info

Token ini boleh memiliki warna yang relatif konsisten antar-theme, tetapi tetap sebaiknya berasal dari semantic token, bukan hardcoded secara tersebar.

Jangan mengganti semua `green`, `red`, `amber`, `blue`, dan sejenisnya secara membabi buta.

Bedakan warna yang benar-benar merupakan:

- brand/theme accent

dari:

- semantic status.

---

# BAGIAN D — LEGACY COLOR LEAKAGE

Lakukan repository-wide search untuk hardcoded theme colors.

Contoh yang harus diperiksa:

```text
orange-*
cyan-*
blue-*
emerald-*
rose-*
amber-*
slate-*
gray-*
```

Periksa apakah warna tersebut:

1. merupakan semantic status yang sah,
2. merupakan visual theme,
3. merupakan sisa implementasi lama,
4. atau merupakan workaround CSS.

Temuan yang memang theme-dependent harus dimigrasikan ke semantic design tokens.

Jangan mengganti warna semantic status dengan accent theme jika itu akan mengubah makna UI.

---

# BAGIAN E — DUPLICATE TOKEN / CSS SOURCE OF TRUTH

Audit `src/index.css` dan stylesheet terkait.

Cari:

- duplicate CSS variables
- duplicate theme declarations
- obsolete variables
- legacy overrides
- selectors seperti:

```css
[data-design-system="..."]
[class*="bg-white"]
[class*="text-slate-800"]
```

Evaluasi apakah rule tersebut masih diperlukan.

Target akhirnya:

- design system token menjadi sumber utama
- legacy compatibility hanya dipertahankan jika benar-benar dibutuhkan
- tidak ada token yang didefinisikan di dua tempat dengan makna yang sama
- tidak ada CSS override yang diam-diam mengalahkan design-system token tanpa alasan

Temuan `--accent-glow` atau token serupa harus diperiksa secara khusus.

Jika terdapat duplicate definition dengan makna sama, konsolidasikan menjadi satu sumber kebenaran.

---

# BAGIAN F — THEME COVERAGE MATRIX

Buat audit matrix internal:

```text
Theme × UI Surface
```

Minimal periksa:

- App shell
- Sidebar
- Topbar/header
- Dashboard
- Forms
- Inputs
- Buttons
- Cards
- Tables
- Modal
- Dropdown
- Tabs
- Navigation
- Attendance
- Students
- Classes
- Subjects
- Schedule
- Journal
- Grades
- Reports/Print
- Settings
- Authentication
- Empty states
- Loading states
- Error states

Untuk setiap area, tentukan:

```text
Theme token driven
Hardcoded
Legacy override
Semantic status color
Mixed
```

Perbaiki area yang tidak konsisten.

Target:

```text
paper-craft → konsisten
minimalist → konsisten
atelier → konsisten
light/dark → konsisten
```

---

# BAGIAN G — AUDIT LAYERED ARCHITECTURE

Repository saat ini memiliki struktur konseptual seperti:

```text
src/
├── features/
├── context/
├── application/
│   ├── ports/
│   ├── students/
│   ├── workspace/
│   └── attendance/
├── domain/
├── infrastructure/
│   └── firestore/
│       └── repositories/
├── services/
│   ├── firebase/
│   └── firestore/
└── types/
```

Target dependency direction:

```text
FEATURE / UI
      ↓
APPLICATION / USE CASE
      ↓
PORT
      ↓
INFRASTRUCTURE REPOSITORY
      ↓
FIRESTORE / FIREBASE
```

Domain harus tetap menjadi bagian dari core dan tidak bergantung pada infrastructure.

---

# BAGIAN H — IDENTIFIKASI LEGACY ARCHITECTURE

Cari semua pola berikut:

```text
Feature → services/firestore → Firebase
Feature → Firebase
Context → repository concrete
Context → infrastructure
Application → infrastructure
Application Port → services/firestore
Domain → infrastructure
```

Catat seluruh pelanggaran yang ditemukan.

Arsitektur lama dan baru saat ini dapat hidup berdampingan selama masa migrasi, tetapi tujuan audit ini adalah menutup boundary yang belum selesai.

Jangan melakukan full rewrite.

Migrasikan hanya dependency yang memang menyebabkan boundary violation.

---

# BAGIAN I — COMPOSITION ROOT

Periksa:

```text
src/application/ports/container.ts
```

`container` boleh mengetahui concrete infrastructure repository apabila file tersebut benar-benar berfungsi sebagai **composition root**.

Namun:

- feature tidak boleh bergantung langsung pada concrete repository melalui container
- context tidak boleh menggunakan `container.repos.*` sebagai shortcut menuju infrastructure
- application port tidak boleh mengimpor concrete infrastructure
- domain tidak boleh mengetahui container

Jika perlu, gunakan composition root untuk membangun dependency:

```text
Infrastructure implementations
        ↓
Application use cases
        ↓
UI/context
```

Bukan:

```text
UI/context
        ↓
container.repos
        ↓
Infrastructure
```

---

# BAGIAN J — AUTH ARCHITECTURE

Audit khusus:

```text
src/features/auth/AuthContext.tsx
```

Periksa apakah AuthContext melakukan hal seperti:

```ts
container.repos.user.getProfile()
container.repos.user.createProfile()
container.repos.user.recordLastLogin()
```

dan akses langsung Firebase Auth/config.

Target yang lebih bersih:

```text
AuthContext
   ↓
Auth Use Cases
   ↓
UserRepository Port
   ↓
Firestore Repository
```

Firebase Auth implementation dapat tetap berada di infrastructure.

Jangan memindahkan business logic ke UI.

AuthContext boleh tetap mengelola React state/session lifecycle, tetapi operasi aplikasi yang bersifat business/application behavior seharusnya tidak menjadikannya repository consumer secara langsung.

---

# BAGIAN K — WORKSPACE CONTEXT

Audit `WorkspaceContext` dan context lain.

Cari import langsung seperti:

```text
infrastructure/firestore/repositories/*
services/firestore/*
firebase/*
```

Jika context mengimpor default configuration atau data helper dari infrastructure hanya karena dianggap “praktis”, pindahkan default tersebut ke layer yang tepat.

Contoh:

Pure application/domain default
→ application/domain/shared

Firestore implementation
→ infrastructure

Target:

```text
Context ≠ Infrastructure consumer
```

---

# BAGIAN L — PORT PURITY

Audit semua file:

```text
src/application/ports/*
```

Port tidak boleh bergantung pada:

```text
Firebase
Firestore
services/firestore
repository implementation
React
UI feature
```

Semua type yang diperlukan port harus berasal dari:

```text
domain
application
shared
```

Periksa secara khusus type seperti:

```ts
StudentUsageSummary
```

apabila masih berasal dari:

```text
services/firestore/students
```

Jangan biarkan application port mengimpor type dari Firestore service.

Pindahkan type tersebut ke lokasi yang sesuai, misalnya:

```text
domain/students
```

atau:

```text
application/students
```

berdasarkan tanggung jawab sebenarnya.

Kemudian sesuaikan semua import tanpa mengubah behavior.

---

# BAGIAN M — USE CASE TYPE SAFETY

Audit use case seperti:

```text
searchStudents.usecase.ts
```

Cari pola:

```ts
const repo: any = deps.studentRepo;
```

dan feature detection seperti:

```ts
if (repo.searchByExactIdentifier)
```

Jika contract port memang sudah memiliki method tersebut, gunakan interface typed secara langsung.

Target:

```ts
const repo = deps.studentRepo;
```

tanpa `any`.

Jangan memperlemah contract hanya untuk kompatibilitas dengan implementasi lama.

Jika method memang opsional secara arsitektur, formalize sebagai optional interface contract. Jangan menggunakan `any` sebagai workaround.

Target akhir:

```text
Application code
→ strongly typed port
→ no any-based repository probing
```

---

# BAGIAN N — FEATURE → USE CASE ENFORCEMENT

Audit seluruh `src/features`.

Cari apakah feature masih langsung memanggil:

```text
services/firestore/*
Firebase SDK
concrete repositories
container.repos.*
```

Jika operasi tersebut sebenarnya merupakan application behavior, arahkan ke use case.

Target:

```text
Feature
→ useCase.execute(...)
```

atau pola equivalent yang konsisten dengan arsitektur repository.

Jangan memaksakan use case untuk operasi UI-only yang memang tidak memiliki business/application responsibility.

---

# BAGIAN O — SERVICES/FIRESTORE

Audit:

```text
src/services/firestore/*
```

Tentukan satu per satu apakah file tersebut:

1. benar-benar infrastructure adapter,
2. legacy service,
3. shared Firestore helper,
4. masih dipakai feature secara langsung,
5. masih dipakai application,
6. hanya dipakai oleh infrastructure.

Target akhir bukan harus menghapus folder tersebut.

Targetnya adalah:

```text
Feature/Application
        ↓
tidak langsung bergantung pada legacy Firestore service
```

Jika service masih diperlukan oleh repository adapter, pertahankan.

Jika hanya wrapper legacy yang sudah tidak diperlukan, hapus setelah seluruh references dipastikan aman.

---

# BAGIAN P — DEPENDENCY RULES

Setelah refactor, definisikan boundary yang dapat ditegakkan secara otomatis.

Minimal aturan konseptual:

```text
domain
  ❌ infrastructure
  ❌ services/firestore
  ❌ firebase
  ❌ features

application
  ❌ infrastructure
  ❌ services/firestore
  ❌ firebase
  ❌ features

features
  ❌ concrete infrastructure repository
  ❌ services/firestore
  ❌ firebase SDK untuk business logic

infrastructure
  ✅ firebase
  ✅ firestore
  ✅ domain
  ✅ application ports
```

Composition root adalah pengecualian yang sah untuk wiring dependency.

Bila project sudah menggunakan ESLint, gunakan mekanisme lint yang sesuai seperti restricted imports atau rule equivalent.

Jangan menambahkan dependency-management framework baru hanya untuk tujuan ini.

---

# BAGIAN Q — DO NOT BREAK EXISTING BUSINESS LOGIC

Selama hardening:

Jangan mengubah:

- Firestore collection structure
- field names
- user data isolation
- academic year logic
- enrollment logic
- attendance business rules
- grading calculation
- existing print behavior
- routing
- authentication behavior

kecuali audit menunjukkan bug nyata sebagai konsekuensi langsung dari refactor.

Prioritas:

```text
architecture improvement
>
behavior preservation
>
minimal code movement
```

---

# BAGIAN R — VALIDATION

Setelah perubahan:

1. TypeScript/type-check
2. ESLint
3. Build production
4. Existing tests
5. Tambahkan test architecture jika tooling project mendukung
6. Verifikasi theme switching
7. Verifikasi persistence theme
8. Verifikasi light/dark mode
9. Verifikasi authentication flow
10. Verifikasi feature utama

Minimal lakukan smoke test terhadap:

```text
Login
Dashboard
Master Data
Students
Attendance
Journal
Grades
Reports
Settings
Theme switching
```

---

# BAGIAN S — THEME REGRESSION TEST

Pastikan tidak ada lagi regresi seperti:

- satu theme memakai accent milik theme lain
- dark mode menghasilkan text/background dengan contrast buruk
- component tertentu tetap orange/cyan walaupun theme berubah
- selected state tidak mengikuti theme
- focus state tidak mengikuti theme
- modal/input/button menggunakan token yang berbeda dari global design system
- legacy CSS mengalahkan token baru

Bila testing UI otomatis belum tersedia, minimal buat deterministic checks melalui source-level audit.

---

# BAGIAN T — ARCHITECTURE REGRESSION TEST

Buat pemeriksaan yang dapat mencegah masalah berikut kembali muncul:

```text
application → infrastructure
application → services/firestore
domain → infrastructure
feature → services/firestore
feature → concrete repository
context → infrastructure
port → Firestore service type
```

Jangan membuat enforcement yang terlalu agresif sampai memblokir legitimate composition-root imports.

---

# BAGIAN U — REQUIRED OUTPUT

Sebelum melakukan perubahan, tampilkan ringkasan audit:

```text
========================================
DADU DEBUG AUDIT
========================================

THEME SYSTEM
- Theme definitions:
- Theme state:
- Token source:
- Duplicate tokens:
- Hardcoded theme colors:
- Legacy overrides:
- Coverage status:

LAYERED ARCHITECTURE
- Domain:
- Application:
- Ports:
- Infrastructure:
- Feature boundaries:
- Context boundaries:
- Legacy service dependency:
- Type leakage:
- any / weak contracts:
- Enforcement:

OVERALL
- Critical:
- High:
- Medium:
- Low:

Recommended changes:
1.
2.
3.
...
```

Setelah audit, lakukan implementation.

Kemudian tampilkan:

```text
========================================
DADU HARDENING RESULT
========================================

THEME
- Fixed:
- Preserved:
- Remaining:

ARCHITECTURE
- Fixed:
- Preserved:
- Remaining:

FILES CHANGED
- path/to/file
  reason

VALIDATION
- Typecheck:
- Lint:
- Build:
- Tests:
- Theme smoke test:
- Architecture check:

FINAL STATUS
PASS
PASS WITH WARNINGS
NEEDS FOLLOW-UP
```

Untuk setiap file yang diubah, jelaskan secara singkat:

```text
FILE
WHAT CHANGED
WHY
RISK
```

---

# BAGIAN V — DEFINITION OF DONE

Pekerjaan dianggap selesai hanya jika seluruh kondisi berikut terpenuhi:

### Theme

- [ ] Tiga design system aktif dan konsisten.
- [ ] Tidak ada duplicate theme state.
- [ ] Tidak ada duplicate token yang tidak disengaja.
- [ ] Theme-dependent visual tidak lagi hardcoded tersebar.
- [ ] Semantic colors dibedakan dari theme accent.
- [ ] Legacy CSS override hanya tersisa jika benar-benar diperlukan.
- [ ] Light/dark bekerja pada ketiga design system.
- [ ] Theme persistence tetap bekerja.
- [ ] Feature utama mengikuti design tokens.

### Layered Architecture

- [ ] Domain tidak bergantung infrastructure.
- [ ] Application tidak bergantung infrastructure.
- [ ] Application port tidak mengimpor Firebase/Firestore service type.
- [ ] Feature tidak bergantung langsung pada legacy Firestore services untuk application behavior.
- [ ] Context tidak mengakses concrete repository secara langsung kecuali benar-benar justified oleh composition-root design.
- [ ] AuthContext boundary diperbaiki.
- [ ] WorkspaceContext boundary diperbaiki.
- [ ] `any` pada repository/use-case contract yang tidak diperlukan dihilangkan.
- [ ] Use case menggunakan typed ports.
- [ ] Legacy service architecture tidak lagi bocor ke layer atas.
- [ ] Dependency boundary dapat ditegakkan secara otomatis sejauh tooling project memungkinkan.

### Safety

- [ ] Tidak ada perubahan schema Firestore yang tidak diperlukan.
- [ ] Tidak ada perubahan terhadap data isolation.
- [ ] Tidak ada regression pada existing business logic.
- [ ] Production build berhasil.

---

# IMPLEMENTATION PRINCIPLE

Gunakan prinsip berikut selama seluruh pekerjaan:

```text
AUDIT FIRST
→ IDENTIFY ROOT CAUSE
→ MINIMAL REFACTOR
→ PRESERVE BEHAVIOR
→ ENFORCE BOUNDARIES
→ VERIFY
```

Jangan hanya memperbaiki gejala di UI.

Contoh:

SALAH:

```tsx
className="text-orange-500"
```

diganti menjadi warna lain.

BENAR:

```text
hardcoded theme color
→ semantic token
→ DesignSystemContext/CSS variable
→ seluruh theme mengontrol nilainya
```

Contoh arsitektur:

SALAH:

```text
AuthContext
→ container.repos.user
```

BENAR:

```text
AuthContext
→ Auth application use case
→ UserRepository port
→ Firestore repository
```

Contoh type:

SALAH:

```text
application port
→ services/firestore/students.ts
→ StudentUsageSummary
```

BENAR:

```text
application/domain type
→ application port
→ infrastructure implementation
```

---

# IMPORTANT

Jangan menyatakan pekerjaan “production ready” hanya karena build berhasil.

Production readiness dalam task ini berarti:

```text
THEME CONSISTENCY
+
DEPENDENCY DIRECTION
+
TYPE BOUNDARY
+
LEGACY ISOLATION
+
REGRESSION SAFETY
```

Jika terdapat masalah yang tidak dapat diperbaiki tanpa perubahan arsitektur besar, jangan memaksakan refactor.

Tandai secara eksplisit:

```text
BLOCKED / DEFERRED
```

dan jelaskan:

- akar masalah,
- mengapa tidak aman diperbaiki sekarang,
- dampaknya,
- perubahan minimal yang diperlukan pada tahap berikutnya.

Prioritaskan correctness dan maintainability daripada jumlah file yang berubah.

Mulai sekarang dari **repository-wide audit**, tampilkan hasil audit terlebih dahulu, lalu lanjutkan ke hardening berdasarkan temuan tersebut.