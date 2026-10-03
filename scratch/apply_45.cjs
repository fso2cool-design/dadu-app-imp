const fs = require('fs');

// 1. StudentProgressReportModal.tsx
{
  const file = 'src/features/students/StudentProgressReportModal.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const replacements = [
    [
      '<div className="space-y-5 text-slate-800">',
      '<div className="space-y-5 text-[var(--ds-text)]">'
    ],
    [
      '<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border border-emerald-100 shadow-2xs no-print">',
      '<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-[var(--ds-surface-muted)] dark:from-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 shadow-2xs no-print">'
    ],
    [
      '<p className="text-[11px] text-slate-600">Dapat dicetak langsung atau dikirimkan ke orang tua/wali melalui WhatsApp.</p>',
      '<p className="text-[11px] text-[var(--ds-text-muted)]">Dapat dicetak langsung atau dikirimkan ke orang tua/wali melalui WhatsApp.</p>'
    ],
    [
      'className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"',
      'className="px-3 py-1.5 rounded-xl bg-[var(--ds-surface)] border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-[var(--ds-surface-muted)] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"'
    ],
    [
      'className="px-3.5 py-1.5 rounded-xl btn-primary hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"',
      'className="px-3.5 py-1.5 rounded-xl btn-primary hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"'
    ]
  ];

  for (let i = 0; i < replacements.length; i++) {
    const [t, r] = replacements[i];
    if (!content.includes(t)) {
      console.error(`Target not found in ${file} at index ${i}: ${t}`);
      process.exit(1);
    }
    content = content.replace(t, r);
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file} successfully.`);
}
