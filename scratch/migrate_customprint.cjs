const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/features/students/StudentCustomPrintModal.tsx');
let text = fs.readFileSync(target, 'utf8');

// 1. Toolbar main container & header
text = text.replace(
  'className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 no-print text-xs"',
  'className="p-4 sm:p-5 rounded-2xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] space-y-4 no-print text-xs"'
);

text = text.replace(
  'pb-3 border-b border-slate-200 dark:border-slate-800',
  'pb-3 border-b border-[var(--ds-border)]'
);

text = text.replace(
  '<GearFine className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />',
  '<GearFine className="w-4 h-4 text-[var(--ds-accent)]" />'
);

text = text.replace(
  '<span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Pengaturan Format & Kustomisasi Kolom</span>',
  '<span className="font-bold text-[var(--ds-text)] text-sm">Pengaturan Format & Kustomisasi Kolom</span>'
);

text = text.replace(
  '<span className="text-slate-500 dark:text-slate-400 font-medium">Orientasi Kertas:</span>',
  '<span className="text-[var(--ds-text-muted)] font-medium">Orientasi Kertas:</span>'
);

text = text.replace(
  '<div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">',
  '<div className="inline-flex rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] p-0.5">'
);

text = text.replaceAll(
  "'text-slate-600 dark:text-slate-300 hover:text-slate-900'",
  "'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'"
);

// 2. Presets section
text = text.replace(
  '<span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 text-xs">',
  '<span className="text-[var(--ds-text)] font-semibold flex items-center gap-1.5 text-xs">'
);

text = text.replace(
  '<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">',
  '<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] border border-[var(--ds-border)]">'
);

text = text.replaceAll(
  'className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer transition"',
  'className="px-2.5 py-1 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-border)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-[11px] font-medium cursor-pointer transition"'
);

text = text.replace(
  "'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-cyan-300 border border-indigo-300 dark:border-indigo-700'",
  "'bg-[var(--ds-accent-soft)] text-[var(--ds-text)] border border-[var(--ds-accent)]'"
);

text = text.replace(
  "'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200'",
  "'bg-[var(--ds-surface)] border border-[var(--ds-border)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)]'"
);

text = text.replace(
  '<p className="text-[11px] text-slate-500 dark:text-slate-400">',
  '<p className="text-[11px] text-[var(--ds-text-muted)]">'
);

// 3. Column toggles grid
text = text.replace(
  '<div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">',
  '<div className="space-y-2 pt-2 border-t border-[var(--ds-border)]">'
);

text = text.replace(
  '<span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">',
  '<span className="text-[11px] font-bold text-[var(--ds-text)] uppercase tracking-wider">'
);

text = text.replace(
  "? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-cyan-200 font-medium'",
  "? 'bg-[var(--ds-accent-soft)] border-[var(--ds-accent)] text-[var(--ds-text)] font-medium'"
);

text = text.replace(
  ": 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'",
  ": 'bg-[var(--ds-surface)] border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-surface-muted)]'"
);

text = text.replaceAll(
  '<CheckSquare className="w-4 h-4 text-indigo-600 dark:text-cyan-400 shrink-0" />',
  '<CheckSquare className="w-4 h-4 text-[var(--ds-accent)] shrink-0" />'
);

text = text.replaceAll(
  '<Square className="w-4 h-4 text-slate-400 shrink-0" />',
  '<Square className="w-4 h-4 text-[var(--ds-text-muted)] shrink-0" />'
);

// 4. Custom user columns
text = text.replace(
  '<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">',
  '<span className="text-[10px] font-bold text-[var(--ds-text-muted)] uppercase tracking-wider block mb-1.5">'
);

text = text.replace(
  ": 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'",
  ": 'bg-[var(--ds-surface)] border-[var(--ds-border)] text-[var(--ds-text-muted)]'"
);

text = text.replace(
  '<span className="text-[10px] text-slate-400 block">',
  '<span className="text-[10px] text-[var(--ds-text-muted)] block">'
);

text = text.replace(
  'className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"',
  'className="p-1 text-[var(--ds-text-muted)] hover:text-rose-600 transition cursor-pointer shrink-0"'
);

// 5. Add custom column form
text = text.replace(
  'className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 mt-2 space-y-3"',
  'className="p-3.5 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent)] mt-2 space-y-3"'
);

text = text.replace(
  '<span className="font-bold text-slate-900 dark:text-slate-100 text-xs">',
  '<span className="font-bold text-[var(--ds-text)] text-xs">'
);

text = text.replace(
  'className="text-slate-400 hover:text-slate-600 cursor-pointer"',
  'className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] cursor-pointer"'
);

text = text.replaceAll(
  '<label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">',
  '<label className="block text-[10px] font-semibold text-[var(--ds-text-secondary)] mb-0.5">'
);

text = text.replaceAll(
  'className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"',
  'className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-[var(--ds-text)] text-xs"'
);

text = text.replace(
  'className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"',
  'className="px-3 py-1 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-semibold cursor-pointer"'
);

// 6. Reorder columns section
text = text.replace(
  '<div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">',
  '<div className="space-y-2 pt-3 border-t border-[var(--ds-border)]">'
);

text = text.replace(
  '<span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">',
  '<span className="text-[11px] font-bold text-[var(--ds-text)] uppercase tracking-wider flex items-center gap-1.5">'
);

text = text.replace(
  '<SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />',
  '<SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ds-accent)]" />'
);

text = text.replace(
  'className="text-[11px] text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"',
  'className="text-[11px] text-[var(--ds-accent)] hover:underline flex items-center gap-1 cursor-pointer font-medium"'
);

text = text.replace(
  '<p className="text-[11px] text-slate-500 dark:text-slate-400">\r\n              Gunakan tombol panah',
  '<p className="text-[11px] text-[var(--ds-text-muted)]">\r\n              Gunakan tombol panah'
);
text = text.replace(
  '<p className="text-[11px] text-slate-500 dark:text-slate-400">\n              Gunakan tombol panah',
  '<p className="text-[11px] text-[var(--ds-text-muted)]">\n              Gunakan tombol panah'
);

text = text.replace(
  'className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto"',
  'className="flex flex-wrap gap-1.5 p-2 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border)] max-h-40 overflow-y-auto"'
);

text = text.replace(
  'className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 shadow-2xs"',
  'className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] rounded-lg text-xs font-medium text-[var(--ds-text)] shadow-2xs"'
);

text = text.replace(
  'className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0"',
  'className="w-4 h-4 rounded-full bg-[var(--ds-surface)] text-[var(--ds-text-muted)] text-[10px] font-bold flex items-center justify-center shrink-0"'
);

text = text.replaceAll(
  'className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-25 cursor-pointer text-slate-600 dark:text-slate-300"',
  'className="p-1 rounded hover:bg-[var(--ds-surface-muted)] disabled:opacity-25 cursor-pointer text-[var(--ds-text-muted)]"'
);

// 7. Extra options (Doc title, subtitle, kop, signatures)
text = text.replace(
  '<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">',
  '<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--ds-border)]">'
);

text = text.replaceAll(
  '<label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">',
  '<label className="block text-[11px] font-semibold text-[var(--ds-text)] mb-1">'
);

text = text.replace(
  'className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"',
  'className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs font-semibold text-[var(--ds-text)]"'
);

text = text.replace(
  'className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"',
  'className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs text-[var(--ds-text)]"'
);

text = text.replaceAll(
  '<label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">',
  '<label className="flex items-center gap-1.5 cursor-pointer text-[var(--ds-text)] font-medium select-none">'
);

text = text.replaceAll(
  'className="rounded border-slate-300 text-indigo-600"',
  'className="rounded border-[var(--ds-border)] text-[var(--ds-accent)] focus:ring-[var(--ds-accent)]"'
);

// 8. Toolbar footer (action buttons & summary)
text = text.replace(
  '<div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">',
  '<div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--ds-border)]">'
);

text = text.replace(
  '<span className="text-slate-500 dark:text-slate-400">\r\n              Total Siap Cetak:',
  '<span className="text-[var(--ds-text-muted)]">\r\n              Total Siap Cetak:'
);
text = text.replace(
  '<span className="text-slate-500 dark:text-slate-400">\n              Total Siap Cetak:',
  '<span className="text-[var(--ds-text-muted)]">\n              Total Siap Cetak:'
);

text = text.replace(
  'className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"',
  'className="px-3.5 py-2 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border)] hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs font-semibold cursor-pointer"'
);

fs.writeFileSync(target, text, 'utf8');
console.log('StudentCustomPrintModal.tsx toolbar migrated successfully.');
