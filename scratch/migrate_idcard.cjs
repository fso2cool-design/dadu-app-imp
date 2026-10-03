const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/features/students/StudentIdCardModal.tsx');
let text = fs.readFileSync(target, 'utf8');

// 1. Title wrapper
text = text.replace(
  '<div className="space-y-5 text-slate-800 dark:text-slate-100">',
  '<div className="space-y-5 text-[var(--ds-text)]">'
);

// 2. Toolbar gradient background
const oldGrad = 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-slate-50 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-[#161a26] border border-emerald-100 dark:border-emerald-900/50';
const newGrad = 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-[var(--ds-surface-muted)] dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-[var(--ds-surface-elevated)] border border-emerald-200/60 dark:border-emerald-900/50';
text = text.replace(oldGrad, newGrad);

// 3. Tab switcher container
const oldTabBox = 'flex items-center gap-1.5 p-1 bg-white dark:bg-[#121622] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs';
const newTabBox = 'flex items-center gap-1.5 p-1 bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border)] shadow-2xs';
text = text.replace(oldTabBox, newTabBox);

// 4. Inactive tab buttons
const oldTabBtn = "'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'";
const newTabBtn = "'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'";
text = text.replaceAll(oldTabBtn, newTabBtn);

// 5. Target mode button
const oldModeBtn = 'className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"';
const newModeBtn = 'className="px-3 py-1.5 rounded-xl bg-[var(--ds-surface)] border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-semibold hover:bg-[var(--ds-surface-muted)] transition-all cursor-pointer shadow-2xs"';
text = text.replace(oldModeBtn, newModeBtn);

// 6. Checkbox labels in toolbar
const oldCheckLabel = 'className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none"';
const newCheckLabel = 'className="flex items-center gap-1.5 cursor-pointer text-[var(--ds-text)] font-medium select-none"';
text = text.replaceAll(oldCheckLabel, newCheckLabel);

// 7. Issue date input
const oldDateLabel = '<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Tgl Terbit:</span>';
const newDateLabel = '<span className="text-[11px] font-semibold text-[var(--ds-text-muted)]">Tgl Terbit:</span>';
text = text.replace(oldDateLabel, newDateLabel);

const oldDateInput = 'className="px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#121622] text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs focus:ring-2 focus:ring-emerald-500"';
const newDateInput = 'className="px-2 py-0.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] text-xs font-semibold text-[var(--ds-text)] shadow-2xs focus:ring-2 focus:ring-[var(--ds-accent)]"';
text = text.replace(oldDateInput, newDateInput);

// 8. Stepper wrapper & buttons
const oldStepperBox = '<div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">';
const newStepperBox = '<div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ds-text-muted)]">';
text = text.replace(oldStepperBox, newStepperBox);

const oldStepBtn = 'className="p-1 rounded-lg bg-white dark:bg-[#121622] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"';
const newStepBtn = 'className="p-1 rounded-lg bg-[var(--ds-surface)] border border-[var(--ds-border)] disabled:opacity-40 hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] cursor-pointer disabled:cursor-not-allowed"';
text = text.replaceAll(oldStepBtn, newStepBtn);

// 9. Hint text & empty state in virtual tab
const oldHint = '<p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">';
const newHint = '<p className="text-center text-[11px] text-[var(--ds-text-muted)] mt-3 font-medium">';
text = text.replace(oldHint, newHint);

const oldEmptyVirtual = '<div className="py-12 text-center text-slate-400">';
const newEmptyVirtual = '<div className="py-12 text-center text-[var(--ds-text-muted)]">';
text = text.replace(oldEmptyVirtual, newEmptyVirtual);

// 10. Empty state in print sheet
const oldEmptyPrint = '<div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">';
const newEmptyPrint = '<div className="col-span-full py-12 text-center text-[var(--ds-text-muted)] bg-[var(--ds-surface-muted)] rounded-2xl border border-dashed border-[var(--ds-border)]">';
text = text.replace(oldEmptyPrint, newEmptyPrint);

fs.writeFileSync(target, text, 'utf8');
console.log('StudentIdCardModal.tsx migrated successfully via Node script.');
