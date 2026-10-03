const fs = require('fs');

const filePath = 'src/features/settings/tabs/SchoolTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const isCrlf = content.includes('\r\n');
let normalized = content.replace(/\r\n/g, '\n');

// 1. Header icon and title
normalized = normalized.replace(
  '<ImageIcon className="w-4 h-4 text-orange-500 dark:text-cyan-400" />\n          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Logo Resmi Dokumen (Kemenag & Madrasah)</span>',
  '<ImageIcon className="w-4 h-4 text-[var(--ds-accent)]" />\n          <span className="text-xs font-bold text-[var(--ds-text)]">Logo Resmi Dokumen (Kemenag & Madrasah)</span>'
);

// 2. Logo 1 card container
normalized = normalized.replace(
  '<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">\n            <div className="flex items-start justify-between">\n              <div>\n                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Kemenag (Sisi Kiri)</span>\n                <span className="text-[10px] text-slate-400">Tingkat 1 Instansi Kementerian Agama RI</span>',
  '<div className="p-4 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] space-y-3">\n            <div className="flex items-start justify-between">\n              <div>\n                <span className="text-xs font-bold text-[var(--ds-text)] block">Logo Kemenag (Sisi Kiri)</span>\n                <span className="text-[10px] text-[var(--ds-text-muted)]">Tingkat 1 Instansi Kementerian Agama RI</span>'
);

// Default resmi badge
normalized = normalized.replace(
  '<span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">Default Resmi</span>',
  '<span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] font-medium">Default Resmi</span>'
);

// Logo 1 frame
normalized = normalized.replace(
  '<div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs">',
  '<div className="w-20 h-20 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border)] flex items-center justify-center p-2 shrink-0 shadow-2xs">'
);

// Logo 1 upload button label
normalized = normalized.replace(
  '<label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors">\n                  <Upload className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />',
  '<label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs font-semibold border border-[var(--ds-border)] shadow-2xs cursor-pointer transition-colors">\n                  <Upload className="w-3.5 h-3.5 text-[var(--ds-accent)]" />'
);

// Logo 1 helper text
normalized = normalized.replace(
  '<p className="text-[10px] text-slate-400 leading-tight">Mendukung file PNG transparan, JPG, atau SVG.</p>',
  '<p className="text-[10px] text-[var(--ds-text-muted)] leading-tight">Mendukung file PNG transparan, JPG, atau SVG.</p>'
);

// Logo 2 card container
normalized = normalized.replace(
  '<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">\n            <div className="flex items-start justify-between">\n              <div>\n                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Madrasah (Sisi Kanan)</span>\n                <span className="text-[10px] text-slate-400">Lambang satuan kerja / madrasah</span>',
  '<div className="p-4 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] space-y-3">\n            <div className="flex items-start justify-between">\n              <div>\n                <span className="text-xs font-bold text-[var(--ds-text)] block">Logo Madrasah (Sisi Kanan)</span>\n                <span className="text-[10px] text-[var(--ds-text-muted)]">Lambang satuan kerja / madrasah</span>'
);

// Logo 2 frame
normalized = normalized.replace(
  '<div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0 shadow-2xs">',
  '<div className="w-20 h-20 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border)] flex items-center justify-center p-2 shrink-0 shadow-2xs">'
);

// Logo 2 empty fallback
normalized = normalized.replace(
  '<div className="text-center text-slate-300 dark:text-slate-600 flex flex-col items-center">',
  '<div className="text-center text-[var(--ds-text-muted)] opacity-60 flex flex-col items-center">'
);

// Logo 2 upload button label
normalized = normalized.replace(
  '<label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer transition-colors">\n                  <Upload className="w-3.5 h-3.5 text-orange-500 dark:text-cyan-400" />',
  '<label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ds-surface)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs font-semibold border border-[var(--ds-border)] shadow-2xs cursor-pointer transition-colors">\n                  <Upload className="w-3.5 h-3.5 text-[var(--ds-accent)]" />'
);

// Logo 2 helper text
normalized = normalized.replace(
  '<p className="text-[10px] text-slate-400 leading-tight">Otomatis disinkronkan ke seluruh dokumen cetak.</p>',
  '<p className="text-[10px] text-[var(--ds-text-muted)] leading-tight">Otomatis disinkronkan ke seluruh dokumen cetak.</p>'
);

// Inputs in Section 2:
// Baris ke-2 kop surat helper
normalized = normalized.replace(
  '<p className="text-[10px] text-slate-400 mt-1">Baris ke-2 kop surat. Jika kosong, akan otomatis dibuat dari nama Kota/Kabupaten.</p>',
  '<p className="text-[10px] text-[var(--ds-text-muted)] mt-1">Baris ke-2 kop surat. Jika kosong, akan otomatis dibuat dari nama Kota/Kabupaten.</p>'
);

// All label elements
normalized = normalized.replaceAll(
  'text-slate-700 dark:text-slate-300',
  'text-[var(--ds-text)]'
);

// All input/select border and bg
normalized = normalized.replaceAll(
  'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900',
  'border border-[var(--ds-border)] bg-[var(--ds-surface)]'
);

// All input/select text color
normalized = normalized.replaceAll(
  'text-slate-900 dark:text-slate-100',
  'text-[var(--ds-text)]'
);

// TTD section
normalized = normalized.replace(
  '<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">\n          <div className="flex items-center justify-between">\n            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tanda Tangan Kepala Madrasah</span>\n            <button\n              type="button"\n              onClick={() => setIsHeadmasterSigModalOpen(true)}\n              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"',
  '<div className="p-4 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] space-y-2.5">\n          <div className="flex items-center justify-between">\n            <span className="text-xs font-bold text-[var(--ds-text)]">Tanda Tangan Kepala Madrasah</span>\n            <button\n              type="button"\n              onClick={() => setIsHeadmasterSigModalOpen(true)}\n              className="text-[11px] font-semibold text-[var(--ds-accent)] hover:opacity-80 cursor-pointer"'
);

normalized = normalized.replace(
  '<div className="h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">',
  '<div className="h-16 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border)] flex items-center justify-center p-1">'
);

normalized = normalized.replace(
  '<p className="text-[11px] text-slate-400 italic">Belum diatur (Opsional)</p>',
  '<p className="text-[11px] text-[var(--ds-text-muted)] italic">Belum diatur (Opsional)</p>'
);

// Stamp section
normalized = normalized.replace(
  '<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">\n          <div className="flex items-center justify-between">\n            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cap / Stempel Resmi Madrasah</span>\n            <button\n              type="button"\n              onClick={() => setIsStampModalOpen(true)}\n              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"',
  '<div className="p-4 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] space-y-2.5">\n          <div className="flex items-center justify-between">\n            <span className="text-xs font-bold text-[var(--ds-text)]">Cap / Stempel Resmi Madrasah</span>\n            <button\n              type="button"\n              onClick={() => setIsStampModalOpen(true)}\n              className="text-[11px] font-semibold text-[var(--ds-accent)] hover:opacity-80 cursor-pointer"'
);

normalized = normalized.replace(
  '<div className="h-16 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">',
  '<div className="h-16 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border)] flex items-center justify-center p-1">'
);

normalized = normalized.replace(
  '<p className="text-[11px] text-slate-400 italic">Belum diatur (Opsional)</p>',
  '<p className="text-[11px] text-[var(--ds-text-muted)] italic">Belum diatur (Opsional)</p>'
);

const finalContent = isCrlf ? normalized.replace(/\n/g, '\r\n') : normalized;
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Successfully updated SchoolTab.tsx');
