const fs = require('fs');
const path = require('path');

// 1. MaintenanceTab.tsx
const maintenancePath = path.join(__dirname, '..', 'src', 'features', 'settings', 'tabs', 'MaintenanceTab.tsx');
let maintContent = fs.readFileSync(maintenancePath, 'utf8');

// Replace bg-white in semester toggle dots
maintContent = maintContent.replace(
  /\? 'bg-white' : 'bg-rose-400'/g,
  "? 'bg-[var(--ds-surface)]' : 'bg-rose-400'"
);

fs.writeFileSync(maintenancePath, maintContent, 'utf8');
console.log('MaintenanceTab.tsx secondary pass completed.');

// 2. RelationshipRecoverySection.tsx
const recoveryPath = path.join(__dirname, '..', 'src', 'features', 'settings', 'RelationshipRecoverySection.tsx');
let recContent = fs.readFileSync(recoveryPath, 'utf8');

// Replace all remaining border-b border-slate-100 dark:border-slate-800
recContent = recContent.split('border-b border-slate-100 dark:border-slate-800').join('border-b border-[var(--ds-border)]');

// Replace all remaining border-t border-slate-100 dark:border-slate-800
recContent = recContent.split('border-t border-slate-100 dark:border-slate-800').join('border-t border-[var(--ds-border)]');

// Replace close button classes
recContent = recContent.split('text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer').join('text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] p-1 rounded-lg cursor-pointer');

// Replace text-slate-600 dark:text-slate-400 font-mono
recContent = recContent.split('text-slate-600 dark:text-slate-400 font-mono').join('text-[var(--ds-text-muted)] font-mono');

// Replace text-[11px] text-slate-400 mt-1
recContent = recContent.split('text-[11px] text-slate-400 mt-1').join('text-[11px] text-[var(--ds-text-muted)] mt-1');

// Replace modal cancel button
recContent = recContent.split('px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50')
  .join('px-4 py-2 rounded-xl border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-semibold hover:bg-[var(--ds-surface-muted)] cursor-pointer disabled:opacity-50');

fs.writeFileSync(recoveryPath, recContent, 'utf8');
console.log('RelationshipRecoverySection.tsx secondary pass completed.');
