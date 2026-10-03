Koreksi penting terhadap instruksi sebelumnya:

Setelah mempertimbangkan struktur aplikasi, saya TIDAK ingin mempertahankan nama internal `atelier` dan `minimalist`.

Saya ingin melakukan **true design-system rename**, bukan hanya mengganti display name.

Target final internal architecture harus menjadi:

```text
paper-craft
neo-brutalism
shadcn-ui
```

dengan display name:

```text
Paper Craft
Neo-Brutalism
Shadcn UI
```

Jadi jangan menghasilkan mapping seperti:

```text
atelier     → Neo-Brutalism
minimalist  → Shadcn UI
```

karena itu menciptakan semantic mismatch antara internal code dan visual identity.

==================================================
1. RENAME INTERNAL KEY SECARA MENYELURUH
==================================================

Ubah:

```text
atelier
```

menjadi:

```text
neo-brutalism
```

dan:

```text
minimalist
```

menjadi:

```text
shadcn-ui
```

Pertahankan:

```text
paper-craft
```

Semua reference internal harus diaudit.

Cari seluruh penggunaan:

```text
atelier
minimalist
```

termasuk tetapi tidak terbatas pada:

- `DesignSystemKey`
- `ThemeKey`
- `DESIGN_SYSTEMS`
- `DesignSystemContext`
- theme selector
- `data-design-system`
- CSS selectors
- CSS variables jika theme-specific
- localStorage
- persisted settings
- Firebase/Firestore preference jika ada
- tests
- fixtures
- snapshots
- constants
- changelog
- documentation
- comments
- accessibility labels
- preview configuration

Jangan melakukan rename parsial.

==================================================
2. MIGRATION / BACKWARD COMPATIBILITY
==================================================

Sebelum menghapus identifier lama, audit terlebih dahulu apakah:

```text
atelier
minimalist
```

pernah disimpan sebagai persisted user preference.

Periksa:

- localStorage
- sessionStorage
- IndexedDB
- Firestore
- user profile/preferences
- URL/query state
- exported configuration
- test fixtures

Jika nilai lama memang dapat ditemukan sebagai persisted data, buat migration:

```text
atelier     → neo-brutalism
minimalist  → shadcn-ui
```

Migration harus dijalankan hanya ketika membaca nilai lama.

Setelah berhasil dimigrasikan, sistem harus menyimpan dan menggunakan identifier baru.

Jangan mempertahankan `atelier` dan `minimalist` sebagai active design-system keys hanya demi compatibility.

Compatibility harus diselesaikan melalui migration.

Contoh konseptual:

```ts
const legacyThemeMap = {
  atelier: 'neo-brutalism',
  minimalist: 'shadcn-ui',
};
```

Migration tersebut hanya diperlukan sebagai compatibility layer terhadap data lama.

Jangan memasukkan `atelier` atau `minimalist` kembali ke:

```ts
DesignSystemKey
```

sebagai design-system aktif.

==================================================
3. FINAL DESIGN SYSTEM KEY
==================================================

Target:

```ts
type DesignSystemKey =
  | 'paper-craft'
  | 'neo-brutalism'
  | 'shadcn-ui';
```

Tidak boleh lagi:

```ts
'at​​elier'
'minimalist'
```

sebagai active design-system key.

==================================================
4. DATA ATTRIBUTE
==================================================

Jika architecture menggunakan:

```html
data-design-system="atelier"
```

ubah menjadi:

```html
data-design-system="neo-brutalism"
```

Jika menggunakan:

```html
data-design-system="minimalist"
```

ubah menjadi:

```html
data-design-system="shadcn-ui"
```

Seluruh CSS theme selector harus mengikuti identifier baru.

Contoh:

```css
[data-design-system="neo-brutalism"] {
  ...
}

[data-design-system="shadcn-ui"] {
  ...
}
```

Jangan meninggalkan selector aktif:

```css
[data-design-system="atelier"]
[data-design-system="minimalist"]
```

kecuali selector tersebut secara eksplisit diperlukan sementara untuk migration dan tidak digunakan sebagai active theme.

==================================================
5. NEO-BRUTALISM
==================================================

`neo-brutalism` adalah pengganti penuh Atelier.

Pertahankan hasil implementasi Neo-Brutalism yang sudah dibuat, tetapi audit kembali seluruh selector agar sekarang menggunakan:

```text
neo-brutalism
```

bukan:

```text
atelier
```

Pastikan visual identity tetap:

- bold
- high contrast
- strong borders
- hard offset shadows
- compact radius
- tactile controls
- graphic surfaces
- strong typography

==================================================
6. SHADCN UI
==================================================

`shadcn-ui` adalah pengganti penuh Minimalist.

Gunakan referensi:

https://github.com/birobirobiro/awesome-shadcn-ui

dan:

https://github.com/shadcn-ui/ui

Gunakan keduanya sebagai referensi design language/component patterns.

Jangan menjadikan `awesome-shadcn-ui` sebagai runtime dependency.

Jangan clone repository tersebut.

Jangan rewrite aplikasi.

Rombak design system `minimalist` yang sekarang menjadi `shadcn-ui`.

Target visual:

- clean
- modern
- neutral-first
- structured
- component-oriented
- accessible
- restrained
- crisp borders
- consistent spacing
- polished controls
- professional dashboard UI

==================================================
7. THEME SELECTOR
==================================================

Dropdown final HARUS menampilkan:

```text
Paper Craft
Shadcn UI
Neo-Brutalism
```

Tidak boleh lagi menampilkan:

```text
Minimalist
Atelier
Atelier (Neo-Brutalism)
```

Pastikan label, description, tagline, preview, tooltip, dan accessibility label juga menggunakan identity baru.

==================================================
8. NO THEME LEAKAGE
==================================================

Semua theme-specific CSS harus scoped.

Gunakan:

```css
[data-design-system="paper-craft"]
[data-design-system="shadcn-ui"]
[data-design-system="neo-brutalism"]
```

Jangan menggunakan global selectors yang menyebabkan satu theme mengubah theme lainnya.

Audit secara khusus perubahan sebelumnya terhadap:

```text
.card
.bg-white
.border-slate-*
.shadow-*
.rounded-*
```

Jika perubahan tersebut bersifat global dan memengaruhi theme lain, perbaiki dengan token atau scoped selector.

==================================================
9. PRINT ISOLATION
==================================================

Pertahankan print isolation.

Theme identifier baru tidak boleh memengaruhi:

- printable documents
- official document headers
- progress reports
- signature areas
- print tables
- print sheets

Jalankan test aktual.

Jangan hanya menyimpulkan bahwa print isolation aman berdasarkan code inspection.

==================================================
10. TEST DAN MIGRATION VALIDATION
==================================================

Tambahkan/update test untuk memastikan:

### Active keys

```text
paper-craft
neo-brutalism
shadcn-ui
```

### Legacy migration

```text
atelier → neo-brutalism
minimalist → shadcn-ui
```

### Display names

```text
paper-craft → Paper Craft
neo-brutalism → Neo-Brutalism
shadcn-ui → Shadcn UI
```

### Theme isolation

Ketiga theme tidak saling memengaruhi.

### Print isolation

Theme styling tidak bocor ke print.

==================================================
11. JANGAN MENYIMPAN LEGACY KEY SEBAGAI ACTIVE TYPE
==================================================

Ini sangat penting.

Jangan menyelesaikan compatibility dengan membuat:

```ts
type DesignSystemKey =
  | 'paper-craft'
  | 'atelier'
  | 'minimalist'
  | 'neo-brutalism'
  | 'shadcn-ui';
```

Itu bukan target yang saya inginkan.

Saya ingin architecture final tetap bersih:

```ts
type DesignSystemKey =
  | 'paper-craft'
  | 'neo-brutalism'
  | 'shadcn-ui';
```

Legacy mapping hanya digunakan pada migration boundary.

==================================================
12. VALIDATION
==================================================

Setelah rename dan redesign selesai, jalankan:

- TypeScript type-check
- lint
- unit tests
- design-system tests
- theme isolation/leakage tests
- migration tests
- print isolation tests
- production build

Jika ada error karena reference lama masih menggunakan:

```text
atelier
minimalist
```

perbaiki reference tersebut.

Jangan mempertahankan legacy identifier hanya untuk menghindari error.

==================================================
13. FINAL REPORT
==================================================

Laporkan:

1. seluruh file yang terkena rename
2. seluruh active design-system keys
3. migration yang dibuat
4. lokasi persistence yang ditemukan
5. hasil migration test
6. perubahan Neo-Brutalism
7. perubahan Shadcn UI
8. theme isolation result
9. print isolation result
10. type-check
11. lint
12. unit/design-system tests
13. production build
14. dependency baru jika ada

Target final architecture:

```text
                 DESIGN SYSTEMS

┌─────────────────┬───────────────────┐
│ Internal Key    │ Display Name      │
├─────────────────┼───────────────────┤
│ paper-craft     │ Paper Craft       │
│ shadcn-ui       │ Shadcn UI         │
│ neo-brutalism   │ Neo-Brutalism     │
└─────────────────┴───────────────────┘
```

Sekali lagi: jangan mempertahankan `atelier` atau `minimalist` sebagai active internal theme key.

Jika data lama membutuhkan compatibility, selesaikan dengan migration:

```text
atelier → neo-brutalism
minimalist → shadcn-ui
```

Setelah migration, seluruh aplikasi harus menggunakan identifier baru secara konsisten.