# DADU — TARGETED CLOSURE / HARDENING PROMPT
## Layered Architecture Closure → Quality Gates Closure → Final Theme Closure

Repository target:

https://github.com/fso2cool-design/dadu-app-imp

Current HEAD baseline:

`ea52da849aeed15a5e8bcf92d6586d2d5d460dd3`

Commit terakhir:
`refactor(arch): close theme system and enforce layered architecture boundaries`

Pekerjaan ini adalah **lanjutan langsung** dari Master Debug Audit sebelumnya.

JANGAN mengulang full rewrite.
JANGAN membuat framework baru.
JANGAN mengganti React, TypeScript, Firebase, Firestore, Vite, atau struktur database.
JANGAN mengubah business logic yang sudah benar.

Tujuan task ini adalah menutup celah yang masih tersisa pada repository saat ini.

==================================================
PRIORITAS UTAMA
==================================================

PRIORITY 1
LAYERED ARCHITECTURE CLOSURE

PRIORITY 2
QUALITY GATES CLOSURE + VERIFIED EXECUTION

PRIORITY 3
FINAL THEME CLOSURE TO 100%

Urutan tersebut WAJIB dipertahankan.

Jangan menghabiskan sebagian besar pekerjaan untuk kosmetik theme sebelum boundary architecture dan quality gate benar-benar selesai.

==================================================
CURRENT AUDIT BASELINE
==================================================

Audit sebelumnya menunjukkan kondisi berikut.

THEME SYSTEM
Mostly closed.
Fondasi sudah benar:
- tiga design system tersedia
- single design-system source
- ThemeContext sudah shim
- light/dark sudah terintegrasi
- CSS token sudah tersedia

Tetapi masih terdapat:
- compatibility CSS bridge
- beberapa legacy visual coercion
- beberapa hardcoded/derived visual rules
- ThemeContext masih memiliki metadata yang secara semantik redundant
- theme coverage belum dibuktikan 100% secara source-level

Target akhir:
THEME SYSTEM = FULLY CLOSED

---

LAYERED ARCHITECTURE
Belum tertutup sepenuhnya.

Masalah utama yang harus dianggap nyata dan diprioritaskan:

1. `container` masih dapat diakses langsung dari feature/context.
2. Feature masih dapat melakukan:
   `container.repos.*`
3. Context masih dapat melakukan:
   `container.repos.*`
4. `WorkspaceContext` belum benar-benar memakai use case sebagai application boundary.
5. `AuthContext` masih melakukan repository access langsung melalui container.
6. `DesignSystemContext` masih melakukan repository access langsung melalui container.
7. `AdminUserManagementPage`, `GradesPage`, `DeduplicateStudentsModal` dan kemungkinan feature lain masih mengakses concrete repository melalui container.
8. `application/ports/container.ts` sekaligus berfungsi sebagai DI/composition root tetapi juga diekspos ke UI.
9. Beberapa use case masih memiliki fallback/probing yang tidak diperlukan.
10. Application/domain type ownership masih belum sepenuhnya canonical.
11. Masih ada `any` pada area application-related yang seharusnya dapat dibuat typed.

Target akhir:

```text
UI / Feature / Context
        ↓
Application Use Case
        ↓
Application Port
        ↓
Infrastructure Repository
        ↓
Firestore / Firebase
```

dan BUKAN:

```text
UI / Feature / Context
        ↓
container
        ↓
repository
        ↓
Firestore
```

---

QUALITY GATES
Infrastructure sudah tersedia, tetapi hasil eksekusi penuh terbaru belum terverifikasi.

Saat ini sudah tersedia:
- TypeScript check
- Biome lint
- dependency-cruiser
- Vitest
- production build
- GitHub Actions
- Vercel deployment

Namun target final adalah memastikan SEMUA gate benar-benar berjalan dan konsisten antara:
- local check
- local CI script
- GitHub Actions

Dan tidak boleh ada keadaan:
"script mengatakan PASS tetapi sebenarnya step penting tidak dijalankan."

---

==================================================
PHASE 1 — ARCHITECTURE FORENSIC CHECK
==================================================

Sebelum mengubah kode, lakukan audit khusus terhadap architecture boundary berdasarkan HEAD saat ini.

Telusuri SEMUA source file, bukan hanya file yang sebelumnya disebut.

Cari:

```text
container.repos
container.useCases
from '../../application/ports/container'
from '../application/ports/container'
from '@/application/ports/container'
from infrastructure
from services/firestore
from services/firebase
```

Petakan seluruh consumer.

Buat klasifikasi:

```text
ALLOWED
WARNING
VIOLATION
COMPOSITION ROOT
```

Komposisi dependency harus jelas.

Composition root boleh mengetahui implementation concrete.

UI tidak boleh.

==================================================
PHASE 2 — DEFINE THE FINAL ARCHITECTURE
==================================================

Jangan hanya "menyembunyikan" container.

Kita membutuhkan boundary yang benar-benar nyata.

Target final:

```text
                     ┌──────────────────────┐
                     │  Composition Root     │
                     │  App / DI bootstrap   │
                     └──────────┬───────────┘
                                │
                       constructs dependencies
                                │
              ┌─────────────────▼─────────────────┐
              │          Application               │
              │ Use Cases + Ports + App contracts │
              └─────────────────┬─────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Domain / Types     │
                    └───────────────────────┘

UI / Feature / Context
        ↓
Application-facing dependency
        ↓
Use Case
        ↓
Port
        ↓
Infrastructure adapter
        ↓
Firestore / Firebase
```

PENTING:

Jangan mengganti `container.repos` dengan bentuk baru yang secara substantif sama seperti:

```text
container.services.*
container.api.*
container.data.*
```

yang masih memberikan concrete repository kepada UI.

Itu bukan closure.

==================================================
PHASE 3 — CONVERT CONTAINER INTO TRUE COMPOSITION ROOT
==================================================

`src/application/ports/container.ts` saat ini mengetahui concrete infrastructure repository.

Hal tersebut boleh DIPERTAHANKAN hanya sebagai composition root.

Namun:

FEATURE DAN CONTEXT TIDAK BOLEH MENGIMPOR FILE INI.

Jika diperlukan, buat mekanisme application dependency injection yang benar, misalnya melalui:
- ApplicationProvider
- application context
- injected use-case hooks
- atau pola setara yang paling sederhana untuk project saat ini.

Pilih SATU pola yang konsisten.

Jangan membuat dependency injection framework.

Target:

```text
container
    ↓
ApplicationProvider / App bootstrap
    ↓
use cases
    ↓
Feature / Context
```

Bukan:

```text
Feature
    ↓
container
```

==================================================
PHASE 4 — WORKSPACE CONTEXT CLOSURE
==================================================

Refactor:

`src/context/WorkspaceContext.tsx`

Current problem:

Context masih melakukan secara langsung:

```text
container.repos.academicYear
container.repos.class
container.repos.subject
container.repos.teachingAssignment
container.repos.settings
```

Padahal:

`src/application/workspace/loadWorkspace.usecase.ts`

sudah tersedia.

Gunakan use case tersebut sebagai application boundary.

Target:

```text
WorkspaceContext
        ↓
loadWorkspaceUseCase
        ↓
typed repository ports
```

Context tetap bertanggung jawab atas:
- React state
- selected state
- sync UI state
- browser online/offline state
- lifecycle

Context TIDAK bertanggung jawab menjadi repository orchestrator.

Jangan mengubah hasil akhir workspace selection behavior.

Pertahankan:
- active academic year
- active semester
- selected class
- selected assignment
- attendance settings
- preferences

==================================================
PHASE 5 — AUTH CONTEXT CLOSURE
==================================================

Refactor:

`src/features/auth/AuthContext.tsx`

Current problem:

AuthContext masih menggunakan:

```text
container.repos.user.getProfile()
container.repos.user.createProfile()
container.repos.user.recordLastLogin()
```

Target arsitektur:

```text
Auth UI / AuthContext
        ↓
Auth application behavior
        ↓
Auth/User port
        ↓
Infrastructure
```

Firebase Auth SDK boleh tetap berada pada infrastructure/auth adapter.

AuthContext boleh tetap menangani:
- React authentication state
- `onAuthStateChanged`
- loading state
- session lifecycle
- UI-facing authentication state

Tetapi jangan menjadikan AuthContext sebagai direct repository consumer.

Jangan merusak:
- login
- signup
- logout
- reset password
- profile loading
- last login recording
- onboarding initialization.

==================================================
PHASE 6 — DESIGN SYSTEM CONTEXT CLOSURE
==================================================

Refactor:

`src/context/DesignSystemContext.tsx`

Current problem:

DesignSystemContext masih melakukan:

```text
container.repos.user.updateDesignSystem(...)
container.repos.user.updateProfile(...)
```

Theme/design state harus tetap berada di UI/application boundary.

Persistence operation diarahkan melalui application-level dependency.

Target:

```text
DesignSystemContext
        ↓
application-facing action
        ↓
User/Profile port or use case
        ↓
repository
```

Jangan membuat design system bergantung langsung pada Firestore implementation.

Pastikan perubahan theme tetap:
- instant
- persisted
- per-user
- light/dark aware

==================================================
PHASE 7 — CLOSE FEATURE DIRECT REPOSITORY ACCESS
==================================================

Lakukan repository-wide search terhadap:

```text
container.repos
```

di:

```text
src/features
src/context
src/components
src/hooks
```

Setiap occurrence harus diklasifikasikan.

Jika merupakan application behavior:
→ pindahkan ke use case / application dependency.

Contoh yang sudah diketahui:

```text
AdminUserManagementPage
GradesPage
DeduplicateStudentsModal
AuthContext
DesignSystemContext
WorkspaceContext
```

Jangan hanya mengganti:

```ts
container.repos.assessment
```

menjadi:

```ts
application.repos.assessment
```

Itu bukan architecture closure.

UI harus menerima operation, bukan concrete persistence implementation.

==================================================
PHASE 8 — ADMIN OPERATIONS
==================================================

Admin feature membutuhkan operasi seperti:

- get all users
- update account
- set account status
- set role
- storage stats
- purge workspace
- orphan scan
- orphan cleanup
- feedback count

Operasi ini boleh tetap menggunakan repository implementation di infrastructure.

Tetapi Admin UI harus menerima application-facing API/use cases.

Jangan membocorkan:

```text
userRepository concrete methods
```

ke React component.

Buat application contracts yang sesuai, tidak perlu memecah menjadi puluhan use case kecil jika itu justru membuat architecture terlalu verbose.

Gunakan granularitas yang masuk akal.

==================================================
PHASE 9 — GRADES / STUDENT / ATTENDANCE CLOSURE
==================================================

Cari semua feature yang masih mengakses repository melalui container.

Prioritaskan behavior-heavy feature:

- Grades
- Students
- Attendance
- Homeroom
- Journal
- Master Data
- Reports
- Settings
- Admin

Pindahkan application behavior yang relevan ke use case.

Namun:

Jangan membuat use case untuk operasi visual murni.

Contoh yang TETAP UI:

```text
open modal
close modal
set selected tab
set input value
show toast
toggle UI state
```

Contoh yang merupakan application behavior:

```text
load data
save data
delete data
archive data
check integrity
import data
persist settings
generate application-level report data
```

==================================================
PHASE 10 — REMOVE WEAK APPLICATION CONTRACTS
==================================================

Audit:

`src/application/*`

Cari:

```text
any
as any
feature detection
optional repository method probing
```

Secara khusus:

`searchStudents.usecase.ts`

Jangan melakukan:

```ts
if (deps.studentRepo.searchByExactIdentifier)
```

jika method tersebut sudah menjadi bagian contract port.

Gunakan typed interface secara langsung.

Begitu juga:

`importStudents.usecase.ts`

Saat ini terdapat fallback:

```text
atomicImport
→ batchCreate
→ one-by-one create
```

dan beberapa cast `as any`.

Evaluasi dengan hati-hati.

Tujuan:

- typed application contract
- no fake optional capabilities
- no silent downgrade ke path yang tidak setara
- business behavior tetap sama

Jangan menghilangkan fallback yang memang diperlukan oleh produk tanpa bukti.

Jika memang diperlukan, formalize contract-nya dengan benar.

==================================================
PHASE 11 — CANONICAL DOMAIN / TYPE OWNERSHIP
==================================================

Audit seluruh `src/domain`.

Pastikan domain type file bukan sekadar wrapper kosong.

Cari file seperti:

```text
student.types.ts
user.types.ts
academicYear.types.ts
class.types.ts
teachingAssignment.types.ts
assessment.types.ts
attendance.types.ts
backup.types.ts
diagnostics.types.ts
homeroomAttendance.types.ts
onboarding.types.ts
teacherAttendance.types.ts
```

Hilangkan import kosong seperti:

```ts
import {
  // TODO: Add missing imports here
} from '../types';
```

jika memang tidak dibutuhkan.

Tentukan secara jelas:

```text
domain-owned type
application-owned type
persistence DTO
UI-specific type
```

Jangan memindahkan semua isi `src/types/index.ts` secara besar-besaran tanpa kebutuhan.

Tujuannya adalah ownership yang lebih jelas, bukan mass migration.

==================================================
PHASE 12 — TYPE SAFETY TARGET
==================================================

Jangan mencoba menghapus seluruh `any` repository secara global.

Prioritaskan:

1. application layer
2. domain layer
3. repository contracts
4. architecture boundary
5. newly touched code

Firestore timestamp typing boleh ditangani dengan strategi yang sudah konsisten dengan project.

Jangan membuat type system lebih rumit daripada kebutuhan aplikasinya.

Target:

```text
No unnecessary any in application contracts
No repository contract weakening
No any used to bypass architecture
```

==================================================
PHASE 13 — DEPENDENCY-CRUISER FINAL RULES
==================================================

Perkuat:

`.dependency-cruiser.cjs`

Minimal enforcement:

```text
domain
  ❌ infrastructure
  ❌ services/firestore
  ❌ services/firebase
  ❌ features
  ❌ context

application
  ❌ infrastructure
  ❌ services/firestore
  ❌ services/firebase
  ❌ features
  ❌ context

ports
  ❌ concrete repository implementations
  ❌ services/firestore
  ❌ Firebase SDK

features
  ❌ infrastructure
  ❌ services/firestore
  ❌ application/ports/container

context
  ❌ infrastructure
  ❌ services/firestore
  ❌ application/ports/container

components
  ❌ infrastructure
  ❌ services/firestore
  ❌ application/ports/container

hooks
  ❌ infrastructure
  ❌ services/firestore
  ❌ application/ports/container
```

Composition root adalah exception yang sah.

Jangan membuat rule yang menyebabkan valid composition-root imports gagal.

Setelah enforcement ditambahkan:

```text
npm run check:boundaries
```

HARUS benar-benar pass.

==================================================
PHASE 14 — QUALITY GATE CLOSURE
==================================================

Setelah architecture refactor selesai, lakukan quality gate.

Wajib jalankan:

```text
npm run type-check
npm run lint
npm run check:boundaries
npm test
npm run build
```

Jangan menyatakan PASS berdasarkan source inspection.

Gunakan hasil command aktual.

==================================================
PHASE 15 — FIX TEST FAILURE FIRST
==================================================

Audit saat ini sebelumnya menemukan:

`src/services/firestore/users.test.ts`

pernah gagal karena `createUserProfile()` sekarang memanggil `getDoc()` sebelum `setDoc()`, sementara test tidak mem-mock `getDoc()`.

Pastikan test tersebut sekarang benar-benar pass.

Tambahkan test yang relevan untuk behavior:

1. existing user document
   → tidak overwrite
2. new user document
   → create
3. normal user
   → TEACHER
4. configured admin email
   → ADMIN
5. update profile
   → role tidak dapat diubah melalui regular profile update

Jangan melemahkan implementation hanya demi membuat test pass.

Test harus mengikuti intended governance behavior.

==================================================
PHASE 16 — APPLICATION TEST BASELINE
==================================================

Coverage saat ini rendah pada application/infrastructure/features.

Jangan mengejar angka coverage secara artifisial.

Prioritas test tambahan:

### Application

Minimal test:

```text
loadWorkspaceUseCase
searchStudentsUseCase
importStudentsUseCase
checkHolidayUseCase
```

Test:
- normal path
- empty state
- fallback/default behavior
- repository call contract
- invalid/edge input yang relevan

### Infrastructure

Tidak perlu langsung menguji seluruh 18 repository secara exhaustive.

Prioritaskan repository yang:
- dipakai oleh new use cases
- punya governance-sensitive behavior
- punya write/delete behavior
- menjadi adapter utama

### Context

Minimal test untuk:
- DesignSystemContext
- WorkspaceContext
- AuthContext
- persistence behavior yang sudah dipindahkan

==================================================
PHASE 17 — CI CONSISTENCY
==================================================

Bandingkan:

```text
package.json
.github/workflows/ci.yml
```

Pastikan local quality pipeline dan CI menggunakan gate yang sama.

Target:

```text
lint
type-check
boundary check
test
build
```

Idealnya hindari dua definisi pipeline yang divergen.

Perbaiki:

```text
npm run ci
```

agar tidak menghilangkan architecture boundary check.

Bila sesuai dengan struktur project, gunakan:

```text
npm run check
npm test
npm run build
```

atau equivalent yang lebih jelas.

Jangan menghasilkan recursive script.

==================================================
PHASE 18 — VERIFY GITHUB ACTIONS
==================================================

Setelah perubahan selesai:

- pastikan workflow YAML valid
- push/current repository state harus memicu CI
- periksa hasil GitHub Actions terbaru
- jangan menyatakan CI PASS jika hanya file YAML yang terlihat benar

Output harus membedakan:

```text
CONFIGURATION VERIFIED
vs
EXECUTION VERIFIED
```

Execution verified hanya jika workflow run benar-benar berhasil.

==================================================
PHASE 19 — VERCEL
==================================================

Pastikan production build tetap kompatibel dengan Vercel.

Jangan mengubah deployment architecture.

Verifikasi:

```text
npm run build
```

terlebih dahulu.

Jika status Vercel tersedia, catat hasil aktual.

Jangan menyatakan production deployment sehat hanya karena source code build secara lokal.

==================================================
PHASE 20 — FINAL THEME CLOSURE
==================================================

LAKUKAN SETELAH ARCHITECTURE DAN QUALITY GATES SELESAI.

Tujuan:

THEME SYSTEM = FULLY CLOSED

Audit terakhir terhadap:

```text
paper-craft
minimalist
atelier
```

dan:

```text
light
dark
```

Pastikan:

- single source of theme truth
- no duplicate theme state
- no redundant `category: 'light'` metadata
- no accidental duplicate CSS token
- no accidental legacy accent leakage
- no cross-theme color leakage
- accent/focus/selection/button states use semantic token
- semantic status colors remain semantically correct
- print/document isolation remains independent dari app theme

==================================================
PHASE 21 — THEME CSS BRIDGE REVIEW
==================================================

Review `src/index.css`.

Legacy selectors seperti:

```css
[data-design-system="..."] .bg-white
[data-design-system="..."] .text-slate-800
```

tidak boleh dihapus secara membabi buta.

Untuk setiap bridge:

```text
USED
NECESSARY
LEGACY BUT SAFE
OBSOLETE
```

Jika obsolete:
→ remove.

Jika masih diperlukan:
→ keep temporarily, but document purpose.

Jangan mempertahankan duplicate implementation tanpa alasan.

==================================================
PHASE 22 — FINAL THEME TOKEN COMPLETENESS
==================================================

Evaluasi apakah semantic token berikut perlu ditambahkan:

```text
success
warning
error
info
```

Jika memang diperlukan, implementasikan dengan konsisten.

Namun jangan mengganti semantic status colors menjadi accent theme.

Contoh:

```text
accent = theme identity
error = semantic meaning
success = semantic meaning
warning = semantic meaning
info = semantic meaning
```

==================================================
PHASE 23 — FINAL REGRESSION CHECK
==================================================

Verifikasi tidak ada regresi pada:

```text
Authentication
Dashboard
Master Data
Students
Attendance
Homeroom
Journal
Grades
Reports
Settings
Admin
Theme switching
Light/Dark
Print
Offline/local persistence
```

Jangan melakukan redesign UI dalam task ini.

==================================================
PHASE 24 — FINAL ARCHITECTURE ACCEPTANCE TEST
==================================================

Source-level search terakhir.

Target:

Tidak boleh terdapat UI/application boundary seperti:

```text
src/features/* → infrastructure/*
src/features/* → services/firestore/*
src/features/* → application/ports/container
src/context/* → infrastructure/*
src/context/* → services/firestore/*
src/context/* → application/ports/container
src/components/* → infrastructure/*
src/components/* → services/firestore/*
src/hooks/* → infrastructure/*
src/hooks/* → services/firestore/*
src/application/* → infrastructure/*
src/application/* → services/firestore/*
src/domain/* → infrastructure/*
src/domain/* → services/*
```

Kecuali explicit and justified composition-root exception.

==================================================
PHASE 25 — FINAL QUALITY ACCEPTANCE
==================================================

Final commands:

```text
npm run check
npm test
npm run build
```

Jika `npm run check` sudah mencakup:

```text
tsc
biome
depcruise
```

jangan menjalankan check duplicate tanpa alasan.

Setelah semua selesai, tampilkan hasil command aktual.

==================================================
DEFINITION OF DONE
==================================================

PROJECT ACCEPTED FOR THIS CLOSURE ONLY IF:

### ARCHITECTURE

- [ ] UI tidak mengakses `container.repos`
- [ ] Context tidak mengakses `container.repos`
- [ ] Application behavior melewati use case atau application-facing service
- [ ] Use case menggunakan typed ports
- [ ] Domain tetap pure
- [ ] Application tetap bebas infrastructure
- [ ] Port tidak mengetahui Firestore implementation
- [ ] Concrete repository hanya berada di infrastructure/composition root
- [ ] Dependency-cruiser menegakkan boundary
- [ ] Tidak ada architecture loophole melalui container alias

### QUALITY GATES

- [ ] `npm run type-check` PASS
- [ ] `npm run lint` PASS
- [ ] `npm run check:boundaries` PASS
- [ ] `npm test` PASS
- [ ] `npm run build` PASS
- [ ] `npm run ci` konsisten dengan quality policy
- [ ] GitHub Actions execution verified
- [ ] Vercel build/deployment compatibility verified

### THEME

- [ ] paper-craft PASS
- [ ] minimalist PASS
- [ ] atelier PASS
- [ ] light PASS
- [ ] dark PASS
- [ ] single source of truth PASS
- [ ] no accidental duplicate token
- [ ] no cross-theme leakage
- [ ] semantic colors remain semantic
- [ ] print isolation preserved

==================================================
IMPORTANT NON-GOALS
==================================================

JANGAN:

- rewrite seluruh repository
- membuat Clean Architecture framework baru
- membuat dependency injection library
- memindahkan semua type secara massal
- menghapus semua `any` secara global
- mengejar 80–100% test coverage secara artifisial
- mengganti business logic
- mengganti schema Firestore
- mengganti collection names
- mengganti field names
- mengganti routing
- mengubah UI hanya demi arsitektur
- menghapus CSS compatibility bridge tanpa dependency verification
- mengganti semantic status colors dengan accent theme

==================================================
REQUIRED FINAL REPORT
==================================================

Setelah seluruh perubahan selesai, berikan laporan berikut.

```text
============================================
DADU TARGETED CLOSURE REPORT
============================================

1. LAYERED ARCHITECTURE

Before:
- container leaked to UI: YES
- context direct repository access: YES
- use-case bypass: YES
- boundary enforcement partial

After:
- container leaked to UI:
- context direct repository access:
- feature direct repository access:
- application → infrastructure:
- port purity:
- typed use cases:
- architecture enforcement:

Status:
PASS / PASS WITH WARNINGS / NEEDS FOLLOW-UP
```

```text
2. QUALITY GATES

Type-check:
Lint:
Boundary:
Tests:
Build:
Local CI:
GitHub Actions:
Vercel:

Status:
PASS / PASS WITH WARNINGS / NEEDS FOLLOW-UP
```

```text
3. THEME

paper-craft:
minimalist:
atelier:

light:
dark:

single source:
token duplication:
legacy leakage:
semantic colors:
print isolation:

Status:
PASS / PASS WITH WARNINGS / NEEDS FOLLOW-UP
```

```text
4. FILES CHANGED

path:
change:
reason:
risk:
```

```text
5. REMAINING ISSUES

Only list issues that are real and verified.

Separate:
BLOCKER
HIGH
MEDIUM
LOW
DEFERRED
```

```text
6. FINAL ACCEPTANCE

Architecture:
Quality Gates:
Theme:

Overall:
CLOSED
or
CLOSED WITH VERIFIED WARNINGS
or
NOT CLOSED
```

==================================================
FINAL RULE
==================================================

Jangan menyatakan "CLOSED" hanya karena:

- TypeScript pass
- build pass
- dependency-cruiser pass
- Vercel pass

CLOSED berarti:

```text
REAL ARCHITECTURE BOUNDARY
+
REAL QUALITY EXECUTION
+
THEME CONSISTENCY
+
NO HIDDEN UI → INFRASTRUCTURE LEAK
```

Mulai dengan forensic check terhadap HEAD saat ini.

Kemudian lakukan implementasi secara berurutan:

```text
ARCHITECTURE
    ↓
QUALITY GATES
    ↓
THEME FINALIZATION
    ↓
FULL VERIFICATION
```

Jangan melompat ke final verdict sebelum seluruh command verification benar-benar dijalankan.