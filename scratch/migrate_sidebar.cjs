const fs = require('fs');

const file = 'src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  {
    from: "? 'text-accent-text font-bold'\n                            : 'hover:text-slate-900 dark:hover:text-accent-text active:scale-[0.98]'",
    to: "? 'text-[var(--ds-accent)] font-bold'\n                            : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] active:scale-[0.98]'"
  },
  {
    from: 'bg-accent-primary-soft border border-accent-primary-border shadow-2xs',
    to: 'bg-[var(--ds-accent-soft)] border border-[var(--ds-border)] shadow-2xs'
  },
  {
    from: 'w-1 rounded-r-full bg-accent-primary',
    to: 'w-1 rounded-r-full bg-[var(--ds-accent)]'
  },
  {
    from: "isDirectParentActive \n                            ? 'text-accent-primary' \n                            : 'text-slate-500 dark:text-slate-400'",
    to: "isDirectParentActive \n                            ? 'text-[var(--ds-accent)]' \n                            : 'text-[var(--ds-text-muted)]'"
  },
  {
    from: 'border-2 border-slate-50 dark:border-slate-900',
    to: 'border-2 border-[var(--ds-surface)]'
  },
  {
    from: "? 'text-accent-text font-bold'\n                                : 'hover:text-slate-900 dark:hover:text-accent-text'",
    to: "? 'text-[var(--ds-accent)] font-bold'\n                                : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'"
  },
  {
    from: 'bg-accent-primary-soft border border-accent-primary-border shadow-2xs',
    to: 'bg-[var(--ds-accent-soft)] border border-[var(--ds-border)] shadow-2xs'
  },
  {
    from: 'w-0.5 rounded-r-full bg-accent-primary',
    to: 'w-0.5 rounded-r-full bg-[var(--ds-accent)]'
  },
  {
    from: "isSubActive \n                                  ? 'text-accent-primary' \n                                  : 'text-slate-500 dark:text-slate-500'",
    to: "isSubActive \n                                  ? 'text-[var(--ds-accent)]' \n                                  : 'text-[var(--ds-text-muted)]'"
  },
  {
    from: 'bg-slate-900/60 backdrop-blur-xs transition-opacity',
    to: 'bg-black/60 backdrop-blur-xs transition-opacity'
  }
];

// Normalize newlines in content for matching
let isCRLF = content.includes('\r\n');
let normalizedContent = content.replace(/\r\n/g, '\n');

replacements.forEach((r, idx) => {
  if (!normalizedContent.includes(r.from)) {
    console.error(`Replacement ${idx} NOT found: ${r.from}`);
  } else {
    normalizedContent = normalizedContent.replace(r.from, r.to);
    console.log(`Replacement ${idx} applied successfully.`);
  }
});

let finalContent = isCRLF ? normalizedContent.replace(/\n/g, '\r\n') : normalizedContent;
fs.writeFileSync(file, finalContent, 'utf8');
console.log('Sidebar.tsx updated successfully.');
