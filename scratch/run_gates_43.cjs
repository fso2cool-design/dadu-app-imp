const fs = require('fs');

const files = [
  'src/components/layout/BottomNav.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Header.tsx',
];

console.log('=== GATE A AUDIT (Stage 4.3) ===');
let gateAFailures = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const matches = line.match(/#[0-9A-Fa-f]{3,8}\b/g);
    if (!matches) return;

    console.log(`[GATE A MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateAFailures++;
  });
});

if (gateAFailures === 0) {
  console.log('Gate A PASSED: 0 legacy hex matches.');
} else {
  console.error(`Gate A FAILED: ${gateAFailures} unexpected hex matches.`);
}

console.log('\n=== GATE B AUDIT (Stage 4.3) ===');
let gateBFailures = 0;
const gateBRegex = /bg-white|border-slate-200|border-slate-100|bg-slate-50|bg-slate-900|bg-slate-950|border-slate-700|border-slate-800|text-white|text-slate-[a-zA-Z0-9/-]+|dark:bg-neutral-[a-zA-Z0-9/-]+|dark:border-neutral-[a-zA-Z0-9/-]+|text-indigo-[a-zA-Z0-9/-]+|focus:border-indigo-[a-zA-Z0-9/-]+|hover:bg-slate-[a-zA-Z0-9/-]+|hover:text-slate-[a-zA-Z0-9/-]+/;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (!gateBRegex.test(line)) return;

    // Targeted exclusion for functional notification badges on bg-rose-600 text-white
    if (line.includes('bg-rose-600') && line.includes('text-white')) {
      return;
    }

    console.log(`[GATE B MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateBFailures++;
  });
});

if (gateBFailures === 0) {
  console.log('Gate B PASSED: 0 matches on screen UI target outside functional rose badges.');
} else {
  console.error(`Gate B FAILED: ${gateBFailures} unexpected unmigrated screen tokens.`);
}

if (gateAFailures > 0 || gateBFailures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
