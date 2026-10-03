const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/features/students/StudentCustomPrintModal.tsx');
let text = fs.readFileSync(target, 'utf8');

// 1. Replace undefined --ds-text-secondary with --ds-text
text = text.replaceAll(
  '<label className="block text-[10px] font-semibold text-[var(--ds-text-secondary)] mb-0.5">',
  '<label className="block text-[10px] font-semibold text-[var(--ds-text)] mb-0.5">'
);

// 2. Remove redundant text-white alongside btn-primary
text = text.replace(
  "orientation === 'portrait' ? 'btn-primary text-white shadow-xs' :",
  "orientation === 'portrait' ? 'btn-primary shadow-xs' : "
);

text = text.replace(
  "orientation === 'landscape' ? 'btn-primary text-white shadow-xs' :",
  "orientation === 'landscape' ? 'btn-primary shadow-xs' : "
);

text = text.replace(
  "isExact ? 'btn-primary text-white shadow-xs border border-transparent' :",
  "isExact ? 'btn-primary shadow-xs border border-transparent' :"
);

text = text.replace(
  'className="px-2.5 py-1 rounded-lg btn-primary hover:opacity-90 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"',
  'className="px-2.5 py-1 rounded-lg btn-primary hover:opacity-90 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"'
);

text = text.replace(
  'className="px-3 py-1 rounded-lg btn-primary hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"',
  'className="px-3 py-1 rounded-lg btn-primary hover:opacity-90 disabled:opacity-50 text-xs font-semibold cursor-pointer"'
);

text = text.replace(
  'className="px-4 py-2 rounded-xl btn-primary hover:opacity-90 text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition"',
  'className="px-4 py-2 rounded-xl btn-primary hover:opacity-90 text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition"'
);

fs.writeFileSync(target, text, 'utf8');
console.log('StudentCustomPrintModal.tsx updated successfully.');
