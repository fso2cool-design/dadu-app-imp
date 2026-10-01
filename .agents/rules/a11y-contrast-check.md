---
trigger: model_decision
description: Hitung rasio kontras WCAG sebelum mengklaim pasangan warna lolos aksesibilitas.
---

## A11y Contrast Check

Jangan pernah klaim pasangan warna lolos WCAG tanpa komputasi — mata melebih-lebihkan kontras pasangan abu-abu.

### Rules

1. Hitung rasio via formula WCAG 2.x: linearisasi tiap channel sRGB (`c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`), luminance `L = 0.2126R+0.7152G+0.0722B`, rasio `(L1+0.05)/(L2+0.05)`. Ambang: teks normal **4.5:1**, teks besar (18px+) **3:1**.
2. Skrip Python 8-baris cukup (lihat riwayat: `python -c` inline). Jangan eyeball.
3. Rujukan terverifikasi sesi 1 Okt 2026: hitam/`#FFE500` = 16.46:1 ✅ · putih/`#0051D5` = 6.69:1 ✅ · putih/`#007AFF` = 4.02:1 ❌ (gagal AA) · `#FFE500`/putih = 1.28:1 ❌.
