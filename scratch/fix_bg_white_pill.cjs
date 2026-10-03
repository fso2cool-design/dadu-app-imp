const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/features/students/StudentCustomPrintModal.tsx');
let text = fs.readFileSync(target, 'utf8');

// Replace the preset pill background
text = text.replace(
  '<span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">',
  '<span className="text-[9px] bg-[color-mix(in_srgb,currentColor_20%,transparent)] px-1.5 py-0.2 rounded-full font-bold">'
);

fs.writeFileSync(target, text, 'utf8');
console.log('bg-white/20 replaced successfully.');
