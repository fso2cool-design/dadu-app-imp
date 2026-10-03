const fs = require('fs');

const file = 'src/components/layout/Header.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  // 1. Assignment button text
  {
    from: "? 'bg-accent-primary text-accent-primary-text font-bold shadow-xs'\n            : 'hover:bg-slate-100 dark:hover:bg-[var(--ds-surface)] text-slate-700 dark:text-slate-300'",
    to: "? 'bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] font-bold shadow-xs'\n            : 'hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)]'"
  },
  // 2. Assignment badge
  {
    from: "? 'bg-white/20 text-white'\n                : 'bg-slate-100 dark:bg-[var(--ds-surface)] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[var(--ds-border)]'",
    to: "? 'bg-[color-mix(in_srgb,var(--ds-accent-fg)_20%,transparent)] text-[var(--ds-accent-fg)]'\n                : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)] border border-[var(--ds-border)]'"
  },
  // 3. Assignment subject title
  {
    from: "className={`truncate ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}",
    to: "className={`truncate ${isSelected ? 'text-[var(--ds-accent-fg)]' : 'text-[var(--ds-text-muted)]'}`}"
  },
  // 4. Assignment timeslot when selected
  {
    from: "? 'bg-white/20 text-white'\n                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'",
    to: "? 'bg-[color-mix(in_srgb,var(--ds-accent-fg)_20%,transparent)] text-[var(--ds-accent-fg)]'\n                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'"
  },
  // 5. Header tag
  {
    from: '<header className="h-14 lg:h-16 bg-white/95 dark:bg-[var(--ds-surface-elevated)]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-[var(--ds-border)] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 select-none transition-colors shadow-2xs">',
    to: '<header className="h-14 lg:h-16 bg-[color-mix(in_srgb,var(--ds-surface-elevated)_95%,transparent)] backdrop-blur-md border-b border-[var(--ds-border)] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 select-none transition-colors shadow-2xs">'
  },
  // 6. Mobile branding button
  {
    from: 'className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[var(--ds-accent-soft)] text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"',
    to: 'className="p-1 rounded-xl hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] transition-colors flex items-center gap-1.5 cursor-pointer"'
  },
  // 7. Mobile DADU text
  {
    from: '<span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight hidden xs:inline">',
    to: '<span className="font-extrabold text-sm text-[var(--ds-text)] tracking-tight hidden xs:inline">'
  },
  // 8. Class focus switcher button
  {
    from: 'className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[var(--ds-surface-elevated)] hover:bg-slate-50 dark:hover:bg-[var(--ds-surface)] border border-slate-200/90 dark:border-[var(--ds-border)] text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs group"',
    to: 'className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--ds-surface-elevated)] hover:bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-semibold transition-all cursor-pointer shadow-xs group"'
  },
  // 9. Class focus text
  {
    from: '<span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">',
    to: '<span className="font-bold text-[var(--ds-text)] whitespace-nowrap text-xs">'
  },
  // 10. Separator dot
  {
    from: '<span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>',
    to: '<span className="text-[var(--ds-text-muted)] hidden sm:inline">•</span>'
  },
  // 11. Placeholder Pilih Rombel
  {
    from: '<span className="text-slate-500 dark:text-slate-400 font-medium">Pilih Rombel & Mapel</span>',
    to: '<span className="text-[var(--ds-text-muted)] font-medium">Pilih Rombel & Mapel</span>'
  },
  // 12. Caret icon
  {
    from: '<CaretDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform ${showClassDropdown ? \'rotate-180\' : \'\'}`} />',
    to: '<CaretDown className={`w-3.5 h-3.5 text-[var(--ds-text-muted)] group-hover:text-[var(--ds-text)] transition-transform ${showClassDropdown ? \'rotate-180\' : \'\'}`} />'
  },
  // 13. Class dropdown box
  {
    from: 'className="absolute left-0 mt-2 w-72 sm:w-84 rounded-2xl bg-white dark:bg-[var(--ds-surface-elevated)] p-3 shadow-2xl border border-slate-200 dark:border-[var(--ds-border)] z-50 animate-in fade-in slide-in-from-top-2"',
    to: 'className="absolute left-0 mt-2 w-72 sm:w-84 rounded-2xl bg-[var(--ds-surface-elevated)] p-3 shadow-2xl border border-[var(--ds-border)] z-50 animate-in fade-in slide-in-from-top-2"'
  },
  // 14. Class dropdown header divider
  {
    from: '<div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--ds-border)] pb-2.5 mb-2.5">',
    to: '<div className="flex items-center justify-between border-b border-[var(--ds-border)] pb-2.5 mb-2.5">'
  },
  // 15. Class dropdown title
  {
    from: '<h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">',
    to: '<h4 className="text-xs font-bold text-[var(--ds-text)] uppercase tracking-wider">'
  },
  // 16. Class dropdown subtitle
  {
    from: '<p className="text-[10px] text-slate-500 dark:text-slate-400">',
    to: '<p className="text-[10px] text-[var(--ds-text-muted)]">'
  },
  // 17. TA box
  {
    from: '<div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[var(--ds-surface)] border border-slate-200/80 dark:border-[var(--ds-border)] mb-3 space-y-2">',
    to: '<div className="p-2.5 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] mb-3 space-y-2">'
  },
  // 18. TA label
  {
    from: '<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Tahun Ajaran:</span>',
    to: '<span className="text-[10px] font-bold text-[var(--ds-text-muted)] block mb-1">Tahun Ajaran:</span>'
  },
  // 19. Year button
  {
    from: "? 'bg-accent-primary text-accent-primary-text border-accent-primary font-bold shadow-xs'\n                              : 'bg-white dark:bg-[var(--ds-surface-elevated)] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[var(--ds-border)]'",
    to: "? 'bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] border-[var(--ds-accent)] font-bold shadow-xs'\n                              : 'bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] border border-[var(--ds-border)]'"
  },
  // 20. Semester label
  {
    from: '<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Semester:</span>',
    to: '<span className="text-[10px] font-bold text-[var(--ds-text-muted)] block mb-1">Semester:</span>'
  },
  // 21. Semester button
  {
    from: "? 'bg-accent-primary text-accent-primary-text border-accent-primary font-bold shadow-xs'\n                              : 'bg-white dark:bg-[var(--ds-surface-elevated)] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[var(--ds-border)]'",
    to: "? 'bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] border-[var(--ds-accent)] font-bold shadow-xs'\n                              : 'bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] border border-[var(--ds-border)]'"
  },
  // 22. Empty rombel text
  {
    from: '<div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">',
    to: '<div className="text-center py-6 text-xs text-[var(--ds-text-muted)]">'
  },
  // 23. Other assignments header divider
  {
    from: '<div className="px-2 pt-2.5 pb-1 border-t border-slate-100 dark:border-[var(--ds-border)] flex items-center justify-between">',
    to: '<div className="px-2 pt-2.5 pb-1 border-t border-[var(--ds-border)] flex items-center justify-between">'
  },
  // 24. Other assignments header label
  {
    from: '<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">',
    to: '<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)]">'
  },
  // 25. Other assignments header count
  {
    from: '<span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">',
    to: '<span className="text-[10px] font-mono text-[var(--ds-text-muted)]">'
  },
  // 26. Clock widget container
  {
    from: '<div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-[var(--ds-surface-elevated)] border border-slate-200/90 dark:border-[var(--ds-border)] text-slate-700 dark:text-slate-300 text-xs font-mono font-bold shadow-2xs shrink-0">',
    to: '<div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ds-surface-muted)] border border-[var(--ds-border)] text-[var(--ds-text)] text-xs font-mono font-bold shadow-2xs shrink-0">'
  },
  // 27. Clock icon
  {
    from: '<Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />',
    to: '<Clock className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />'
  },
  // 28. Clock timezone
  {
    from: '<span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans font-semibold">',
    to: '<span className="text-[10px] text-[var(--ds-text-muted)] font-sans font-semibold">'
  },
  // 29. Dark mode toggle button
  {
    from: 'className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-[var(--ds-surface-elevated)] dark:hover:bg-[var(--ds-surface)] border border-slate-200/90 dark:border-[var(--ds-border)] text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"',
    to: 'className="p-2 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] transition-all cursor-pointer shadow-2xs"'
  },
  // 30. Moon icon
  {
    from: '<Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 animate-in spin-in-180 duration-200" />',
    to: '<Moon className="w-3.5 h-3.5 text-[var(--ds-text)] animate-in spin-in-180 duration-200" />'
  },
  // 31. Fullscreen toggle button
  {
    from: 'className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-[var(--ds-surface-elevated)] dark:hover:bg-[var(--ds-surface)] border border-slate-200/90 dark:border-[var(--ds-border)] text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"',
    to: 'className="p-2 rounded-xl bg-[var(--ds-surface-muted)] hover:bg-[var(--ds-surface-elevated)] border border-[var(--ds-border)] text-[var(--ds-text)] transition-all cursor-pointer shadow-2xs"'
  },
  // 32. ArrowsOut icon
  {
    from: '<ArrowsOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />',
    to: '<ArrowsOut className="w-3.5 h-3.5 text-[var(--ds-text-muted)]" />'
  },
  // 33. Profile button
  {
    from: 'className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[var(--ds-accent-soft)] text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"',
    to: 'className="flex items-center gap-2 p-1 rounded-xl hover:bg-[var(--ds-surface-muted)] text-[var(--ds-text)] text-xs transition-colors cursor-pointer"'
  },
  // 34. Profile display name
  {
    from: '<div className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-none">',
    to: '<div className="font-bold text-[var(--ds-text)] text-xs leading-none">'
  },
  // 35. Profile role label
  {
    from: '<div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">',
    to: '<div className="text-[10px] text-[var(--ds-text-muted)] mt-0.5">'
  },
  // 36. Profile CaretDown
  {
    from: '<CaretDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />',
    to: '<CaretDown className="w-3.5 h-3.5 text-[var(--ds-text-muted)] hidden md:block" />'
  },
  // 37. User dropdown container
  {
    from: 'className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[var(--ds-surface-elevated)] p-2 shadow-2xl border border-slate-200 dark:border-[var(--ds-border)] z-50 animate-in fade-in slide-in-from-top-2"',
    to: 'className="absolute right-0 mt-2 w-64 rounded-2xl bg-[var(--ds-surface-elevated)] p-2 shadow-2xl border border-[var(--ds-border)] z-50 animate-in fade-in slide-in-from-top-2"'
  },
  // 38. User dropdown info card divider
  {
    from: '<div className="p-3 border-b border-slate-100 dark:border-[var(--ds-border)] mb-1">',
    to: '<div className="p-3 border-b border-[var(--ds-border)] mb-1">'
  },
  // 39. User dropdown name
  {
    from: '<p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{profile?.displayName}</p>',
    to: '<p className="text-xs font-bold text-[var(--ds-text)] truncate">{profile?.displayName}</p>'
  },
  // 40. User dropdown email
  {
    from: '<p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{profile?.email}</p>',
    to: '<p className="text-[11px] text-[var(--ds-text-muted)] truncate">{profile?.email}</p>'
  },
  // 41. User dropdown NIP
  {
    from: '<p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">NIP: {profile.nip}</p>',
    to: '<p className="text-[10px] text-[var(--ds-text-muted)] mt-1 font-mono">NIP: {profile.nip}</p>'
  },
  // 42. Feedback item in dropdown
  {
    from: 'className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[var(--ds-surface)] transition-colors cursor-pointer"',
    to: 'className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"'
  },
  // 43. Settings item in dropdown
  {
    from: 'className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[var(--ds-surface)] transition-colors cursor-pointer"',
    to: 'className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] transition-colors cursor-pointer"'
  },
  // 44. Settings Gear icon
  {
    from: '<Gear className="w-4 h-4 text-slate-400 shrink-0" />',
    to: '<Gear className="w-4 h-4 text-[var(--ds-text-muted)] shrink-0" />'
  },
  // 45. User dropdown bottom divider
  {
    from: '<div className="border-t border-slate-100 dark:border-[var(--ds-border)] my-1" />',
    to: '<div className="border-t border-[var(--ds-border)] my-1" />'
  }
];

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
console.log('Header.tsx updated successfully.');
