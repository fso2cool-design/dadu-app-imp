/**
 * S4.8 — Konstanta kertas dinas terpusat.
 * Satuan: milimeter, sesuai spesifikasi ukuran kertas Indonesia.
 */
export const PAPER = {
  A4: {
    label: 'A4 (210 x 297 mm)',
    widthMm: 210,
    heightMm: 297,
    /** Margin cetak aman untuk kop + tabel rapor. */
    margin: '12mm 10mm',
    /** Lebar maksimum pratinjau layar (bukan ukuran cetak). */
    previewMaxWidth: 'max-w-5xl',
  },
  F4: {
    label: 'F4 / Folio (215 x 330 mm)',
    widthMm: 215,
    heightMm: 330,
    margin: '12mm 10mm',
    previewMaxWidth: 'max-w-5xl',
  },
  LETTER: {
    label: 'Letter (216 x 279 mm)',
    widthMm: 216,
    heightMm: 279,
    margin: '12mm 10mm',
    previewMaxWidth: 'max-w-5xl',
  },
} as const;

export type PaperSizeKey = keyof typeof PAPER;
