# DADU — P0 RUNTIME WIRING FIX + FINAL CLOSURE VERIFICATION

Repository:
https://github.com/fso2cool-design/dadu-app-imp

Current HEAD:
`d2de38276fde508fbd0949328611049017dc3dc0`

Current commit:
`refactor(arch): complete layered architecture closure, quality gates, and theme system`

Ini adalah TARGETED FINAL FIX berdasarkan verifikasi repository terhadap HEAD saat ini.

JANGAN melakukan full refactor.
JANGAN mengubah schema Firestore.
JANGAN mengubah business logic.
JANGAN mengganti framework.
JANGAN membuat architecture layer baru kecuali benar-benar diperlukan untuk memperbaiki runtime wiring.

==================================================
P0 — TEMUAN YANG WAJIB DIPERBAIKI
==================================================

Repository saat ini sudah memiliki:

`src/application/ApplicationContext.tsx`

dengan:

```tsx
ApplicationProvider
useApplication()
```

dan `src/application/types.ts` dengan `ApplicationOperations`.

Konsumen UI/context/hooks sudah diarahkan ke:

```tsx
useApplication()
```

Masalah kritis:

`src/App.tsx` mengimpor:

```tsx
import { ApplicationProvider, useApplication } from './application/ApplicationContext';
import { container } from './application/ports/container';
```

tetapi tree production saat ini BELUM membungkus application dengan:

```tsx
<ApplicationProvider app={container.app}>
```

Akibatnya `useApplication()` dapat berjalan tanpa provider pada production runtime.

Ini adalah P0 runtime wiring defect.

==================================================
TASK 1 — FIX PRODUCTION COMPOSITION ROOT
==================================================

Perbaiki `src/App.tsx`.

Pastikan `ApplicationProvider` berada DI LUAR seluruh provider yang menggunakan `useApplication()`.

Target minimal:

```tsx
<ErrorBoundary isRoot ...>
  <BrowserRouter>
    <ApplicationProvider app={container.app}>
      <AuthProvider>
        <DesignSystemProvider>
          <ThemeProvider>
            <ToastProvider>
              <MainApp />
            </ToastProvider>
          </ThemeProvider>
        </DesignSystemProvider>
      </AuthProvider>
    </ApplicationProvider>
  </BrowserRouter>
</ErrorBoundary>
```

Poin penting:

`ApplicationProvider` HARUS berada di atas:

- `AuthProvider`
- `DesignSystemProvider`
- `ThemeProvider` bila ThemeProvider/DesignSystem chain membutuhkan application dependency
- `WorkspaceProvider` yang dirender lebih dalam
- seluruh feature dan hooks yang menggunakan `useApplication()`

JANGAN menaruh `ApplicationProvider` di dalam `AuthenticatedApp`.

JANGAN menaruh `ApplicationProvider` di dalam `WorkspaceProvider`.

JANGAN membuat provider kedua.

Gunakan:

```tsx
app={container.app}
```

sebagai satu-satunya application composition wiring.

==================================================
TASK 2 — VERIFY PROVIDER ORDER
==================================================

Setelah perubahan, audit dependency order.

Target:

```text
ApplicationProvider
      ↓
AuthProvider
      ↓
DesignSystemProvider
      ↓
ThemeProvider
      ↓
ToastProvider
      ↓
MainApp
      ↓
WorkspaceProvider / Features / Hooks
```

Pastikan tidak ada consumer `useApplication()` yang mounted di luar `ApplicationProvider`.

Cari semua:

```text
useApplication()
```

dan buat daftar consumer.

Consumer yang diketahui antara lain:

```text
AuthContext
DesignSystemContext
WorkspaceContext
GradesPage
feature pages
hooks
components
```

Tidak boleh ada pengecualian yang tidak disengaja.

==================================================
TASK 3 — ADD A RUNTIME COMPOSITION REGRESSION TEST
==================================================

Jangan hanya mengandalkan:

```text
tsc
lint
dependency-cruiser
build
```

karena semuanya dapat PASS walaupun provider runtime belum terpasang.

Tambahkan test ringan yang secara khusus mencegah regression:

`ApplicationProvider missing from App root`

Tujuan test:

Jika `ApplicationProvider` dihapus dari composition root, test harus gagal.

Test tidak perlu menjalankan Firebase nyata.

Gunakan mocking/stubbing seperlunya.

Minimal verifikasi:

1. App root dapat di-render dengan dependency mocks.
2. `useApplication()` mendapatkan `ApplicationOperations`.
3. Tidak muncul error:

```text
useApplication must be used within an ApplicationProvider
```

4. `AuthProvider` dan `DesignSystemProvider` dapat di-mount dalam composition root.

Jangan membuat integration test yang memerlukan Firestore production.

==================================================
TASK 4 — AUDIT APPLICATION CONTEXT
==================================================

Periksa:

`src/application/ApplicationContext.tsx`

Pastikan:

- tidak mengimpor infrastructure
- tidak membuat repository sendiri
- tidak membuat state ganda
- hanya menyediakan `ApplicationOperations`
- tidak bergantung pada React component tertentu

Target:

```text
ApplicationContext
→ application contract only
```

==================================================
TASK 5 — AUDIT COMPOSITION ROOT
==================================================

Periksa:

`src/application/ports/container.ts`

`container.ts` boleh tetap mengetahui concrete repositories karena ia berfungsi sebagai composition root.

Namun pastikan:

```text
UI ❌ container
Context ❌ container
Hooks ❌ container
Components ❌ container
```

dan hanya composition root yang melakukan wiring:

```text
repositories
→ application operations
→ ApplicationProvider
```

Jangan mengganti `container` dengan alias lain yang mempunyai masalah sama.

==================================================
TASK 6 — FINAL FEATURE / CONTEXT / HOOKS SCAN
==================================================

Lakukan repository-wide source scan.

Cari:

```text
container.repos
container.useCases
application/ports/container
services/firestore
services/firebase
infrastructure/firestore/repositories
```

di:

```text
src/features
src/context
src/components
src/hooks
```

Target:

```text
container direct access = 0
direct concrete repository access = 0
direct services/firestore dependency = 0
direct infrastructure dependency = 0
```

Untuk `src/App.tsx`, direct import ke composition root DIPERBOLEHKAN karena App adalah composition root.

==================================================
TASK 7 — DO NOT OVER-REFACTOR APPLICATION OPERATIONS
==================================================

Jangan melakukan refactor besar terhadap `ApplicationOperations` hanya untuk mengejar teori Clean Architecture.

Current model:

```text
UI
↓
ApplicationOperations
↓
Repository / Use Case
```

boleh dipertahankan.

Prioritas task ini:

1. runtime correctness
2. dependency isolation
3. testability
4. regression safety

Bukan:

"semua repository method wajib memiliki use case terpisah."

==================================================
TASK 8 — MINIMAL TYPE HARDENING
==================================================

Lakukan hanya perbaikan type safety yang low-risk.

Cari `any` di:

```text
src/application/*
src/domain/*
```

Prioritaskan:

- `as any`
- repository contract workaround
- fake optional methods
- `Record<string, any>` yang dapat diganti dengan type yang sudah tersedia

JANGAN melakukan global type rewrite.

Jangan mengubah Firestore timestamp typing secara besar-besaran.

Contoh:

```text
customAttributes: Record<string, any>
```

hanya diubah jika dapat dilakukan tanpa mengubah behavior/import compatibility.

==================================================
TASK 9 — FINAL THEME CLOSURE
==================================================

Setelah P0 runtime wiring selesai, lakukan theme verification terakhir.

Target:

```text
paper-craft
minimalist
atelier
```

masing-masing:

```text
light
dark
```

Verifikasi:

- active theme berubah
- mode berubah
- persistence bekerja
- token berubah
- accent berubah sesuai design system
- focus state sesuai token
- selected state sesuai token
- button primary sesuai token
- card/surface sesuai token
- text sesuai token
- print document tetap terisolasi

Jangan menghapus fixed colors yang memang dibutuhkan oleh:

- official print/document isolation
- semantic status
- paper-craft note palette
- intentional visual effect

Bedakan:

```text
theme token
semantic color
document-fixed color
legacy accidental color
```

Hanya accidental leakage yang harus dihapus.

==================================================
TASK 10 — THEME SOURCE OF TRUTH
==================================================

Pastikan:

```text
DesignSystemContext
```

tetap menjadi source of truth untuk:

```text
activeSystem
mode
tokens
```

`ThemeContext` tetap hanya compatibility shim.

Tidak boleh ada:

```text
second theme state
second localStorage state
second DOM theme state
```

Jangan membuat ThemeContext kembali menjadi state owner.

==================================================
TASK 11 — QUALITY GATE EXECUTION
==================================================

Setelah seluruh perubahan selesai, jalankan secara aktual:

```bash
npm run type-check
npm run lint
npm run check:boundaries
npm test
npm run build
npm run ci
```

Semua harus PASS.

Jangan menuliskan PASS jika command tidak benar-benar dijalankan.

==================================================
TASK 12 — BOUNDARY CHECK
==================================================

`npm run check:boundaries`

HARUS memastikan minimal:

```text
features → application/ports/container      ❌
context → application/ports/container       ❌
components → application/ports/container    ❌
hooks → application/ports/container         ❌

features → infrastructure                   ❌
context → infrastructure                    ❌
hooks → services/firestore                  ❌
domain → infrastructure                     ❌
domain → services                           ❌
application/ports → services/firestore      ❌
```

Composition root exception:

```text
src/App.tsx
src/application/ports/container.ts
```

boleh mengetahui wiring concrete dependency sesuai tanggung jawabnya.

==================================================
TASK 13 — CI EXECUTION VERIFICATION
==================================================

Pastikan GitHub Actions workflow:

`.github/workflows/ci.yml`

menjalankan:

```text
lint
type-check
check:boundaries
test
build
```

Pastikan latest run untuk commit hasil perubahan benar-benar:

```text
completed
success
```

Bedakan:

```text
workflow configuration valid
```

dari:

```text
workflow execution verified
```

==================================================
TASK 14 — VERCEL VERIFICATION
==================================================

Production build harus tetap berhasil.

Jika Vercel status dapat diperiksa, verifikasi deployment untuk commit hasil perubahan.

Jangan menyamakan:

```text
Vercel build success
```

dengan:

```text
application runtime verified
```

Runtime provider issue harus dicegah melalui regression test.

==================================================
TASK 15 — FINAL ACCEPTANCE TEST
==================================================

Sebelum menyatakan selesai, lakukan source-level verification:

### Composition

```text
App.tsx
  ↓
ApplicationProvider
  ↓
AuthProvider
  ↓
DesignSystemProvider
  ↓
ThemeProvider
  ↓
ToastProvider
  ↓
MainApp
```

### Runtime dependency

```text
Feature / Context / Hook
        ↓
useApplication()
        ↓
ApplicationOperations
        ↓
Repository / Use Case
        ↓
Infrastructure
        ↓
Firestore
```

Tidak boleh terdapat:

```text
Feature → container
Context → container
Hook → container
Component → container
```

### Theme

```text
DesignSystemContext
        ↓
--ds-* tokens
        ↓
UI
```

Tidak boleh ada second theme state.

==================================================
DEFINITION OF DONE
==================================================

P0:

- [ ] `ApplicationProvider` benar-benar terpasang di production composition root.
- [ ] Provider berada sebelum semua consumer `useApplication()`.
- [ ] Tidak ada consumer `useApplication()` yang mounted di luar provider.
- [ ] Runtime composition regression test tersedia.
- [ ] Test mencegah hilangnya ApplicationProvider di masa depan.

Architecture:

- [ ] Feature direct container access = 0.
- [ ] Context direct container access = 0.
- [ ] Hooks direct container access = 0.
- [ ] Components direct container access = 0.
- [ ] No unintended UI → infrastructure dependency.
- [ ] Composition root tetap terisolasi.

Quality:

- [ ] type-check PASS
- [ ] lint PASS
- [ ] boundary PASS
- [ ] tests PASS
- [ ] build PASS
- [ ] npm run ci PASS
- [ ] GitHub Actions execution PASS
- [ ] Vercel verification PASS bila tersedia

Theme:

- [ ] paper-craft light/dark PASS
- [ ] minimalist light/dark PASS
- [ ] atelier light/dark PASS
- [ ] single source of truth PASS
- [ ] no accidental theme leakage
- [ ] print isolation preserved

==================================================
FINAL REPORT
==================================================

Berikan laporan aktual:

```text
============================================
DADU FINAL CLOSURE VERIFICATION
============================================

P0 RUNTIME WIRING
ApplicationProvider present:
Provider order:
Runtime composition test:
Status:

LAYERED ARCHITECTURE
Feature → container:
Context → container:
Hooks → container:
Components → container:
UI → infrastructure:
Boundary check:
Status:

QUALITY GATES
Type-check:
Lint:
Boundary:
Tests:
Build:
npm run ci:
GitHub Actions:
Vercel:
Status:

THEME
paper-craft light:
paper-craft dark:
minimalist light:
minimalist dark:
atelier light:
atelier dark:
Single source:
Leakage:
Print isolation:
Status:

FILES CHANGED
[path] — [reason]

REMAINING VERIFIED ISSUES
[only real findings]

FINAL STATUS
CLOSED
CLOSED WITH VERIFIED WARNINGS
NOT CLOSED
```

ATURAN FINAL:

Jangan gunakan label:

```text
PRODUCTION READY
```

sebelum P0 runtime wiring telah diperbaiki dan regression test telah membuktikan bahwa `ApplicationProvider` benar-benar tersedia pada production composition tree.

Jangan melakukan perubahan besar setelah semua gate PASS hanya demi meningkatkan "nilai arsitektur".

Prioritas akhir:

```text
RUNTIME CORRECTNESS
→ ARCHITECTURE INTEGRITY
→ QUALITY GATES
→ THEME FINALIZATION
→ NO UNNECESSARY REFACTOR
```

Mulai dari `src/App.tsx`, perbaiki P0, buat regression test, lalu jalankan seluruh quality gate secara aktual.