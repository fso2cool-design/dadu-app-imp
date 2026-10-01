---
trigger: always_on
---

## Verify Before Commit (tsc-first)

Setelah setiap batch edit (regex massal, codemod, rewrite file), jalankan `npx tsc --noEmit` DULU sebelum lint/test/build.

### Rules

1. Urutan verifikasi wajib: `tsc --noEmit` → `npm run check` (biome + depcruise) → `npm test` → `npm run build`.
2. Jangan commit jika `tsc` merah. Batch regex (`.Replace()` massal) sering menanam token literal/duplikasi yang hanya ketahuan via tsc.
3. `npm test` (~40 dtk) hanya dijalankan setelah tsc EXIT 0.
4. `npm run build` hanya sebelum push/release, bukan tiap commit kecil.
