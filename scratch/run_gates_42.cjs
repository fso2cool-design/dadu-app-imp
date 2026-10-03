const fs = require('fs');

const files = [
  'src/components/common/FeedbackModal.tsx',
  'src/components/common/GlobalSearchModal.tsx',
  'src/components/common/AttendanceHolidaysModal.tsx',
  'src/components/common/SignaturePadModal.tsx',
];

console.log('=== GATE A AUDIT (Stage 4.2) ===');
let gateAFailures = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const matches = line.match(/#[0-9A-Fa-f]{3,8}\b/g);
    if (!matches) return;

    // Targeted exclusion for physical ink palette in SignaturePadModal.tsx
    if (file.endsWith('SignaturePadModal.tsx')) {
      const isInkDefault = line.includes("useState('#0f172a')");
      const isInkPalette = /color:\s*'(#0f172a|#1e3a8a|#2563eb)'/.test(line);
      if (isInkDefault || isInkPalette) {
        // Excluded physical ink palette
        return;
      }
    }

    console.log(`[GATE A MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateAFailures++;
  });
});

if (gateAFailures === 0) {
  console.log('Gate A PASSED: 0 legacy hex matches outside physical ink declaration.');
} else {
  console.error(`Gate A FAILED: ${gateAFailures} unexpected hex matches.`);
}

console.log('\n=== GATE B AUDIT (Stage 4.2) ===');
let gateBFailures = 0;
const gateBRegex = /bg-white|border-slate-200|border-slate-100|bg-slate-50|bg-slate-900|bg-slate-950|border-slate-700|text-white|text-slate-[a-zA-Z0-9/-]+|dark:bg-neutral-[a-zA-Z0-9/-]+|dark:border-neutral-[a-zA-Z0-9/-]+|text-indigo-[a-zA-Z0-9/-]+|focus:border-indigo-[a-zA-Z0-9/-]+/;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (!gateBRegex.test(line)) return;

    // Targeted exclusion for SignaturePadModal canvas surface locked to bg-white
    if (file.endsWith('SignaturePadModal.tsx')) {
      if (line.includes('cursor-crosshair') && line.includes('bg-white')) {
        // Excluded locked canvas drawing area
        return;
      }
    }

    console.log(`[GATE B MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateBFailures++;
  });
});

if (gateBFailures === 0) {
  console.log('Gate B PASSED: 0 matches on screen UI target outside locked canvas surface.');
} else {
  console.error(`Gate B FAILED: ${gateBFailures} unexpected unmigrated screen tokens.`);
}

if (gateAFailures > 0 || gateBFailures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
