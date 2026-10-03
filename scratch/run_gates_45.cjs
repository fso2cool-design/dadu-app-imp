const fs = require('fs');

const files = [
  'src/features/students/StudentProgressReportModal.tsx',
  'src/features/grades/PasteExcelModal.tsx',
  'src/features/grades/ScoreNoteModal.tsx',
];

console.log('=== GATE A AUDIT (Stage 4.5 — Hex Check) ===');
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
  console.log('Gate A PASSED: 0 unmigrated hex matches.');
} else {
  console.error(`Gate A FAILED: ${gateAFailures} unexpected hex matches.`);
}

console.log('\n=== GATE B AUDIT (Stage 4.5 — Screen UI Token Normalization) ===');
let gateBFailures = 0;

const legacyPattern = /bg-white|border-slate-[0-9]+|bg-slate-[0-9]+|text-slate-[0-9]+|dark:bg-slate-[0-9]+|dark:border-slate-[0-9]+|dark:text-slate-[0-9]+|text-indigo-[0-9]+|border-indigo-[0-9]+|bg-indigo-[0-9]+|dark:text-indigo-[0-9]+|dark:border-indigo-[0-9]+|dark:bg-indigo-[0-9]+/;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  let inPrintReportArea = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Boundary tracking for StudentProgressReportModal physical print document
    if (line.includes('id="printable-progress-report"')) {
      inPrintReportArea = true;
    }

    // Skip physical print document container from Gate B
    if (inPrintReportArea) {
      return;
    }

    if (!legacyPattern.test(line)) return;

    console.log(`[GATE B MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateBFailures++;
  });
});

if (gateBFailures === 0) {
  console.log('Gate B PASSED: 0 unexpected legacy tokens in screen UI targets.');
} else {
  console.error(`Gate B FAILED: ${gateBFailures} unexpected legacy tokens.`);
}

console.log('\n=== GATE C AUDIT (Stage 4.5 — Defined Token Existence Check) ===');
let gateCFailures = 0;

// Gather officially defined tokens from DesignSystemContext and index.css
const dsContext = fs.readFileSync('src/context/DesignSystemContext.tsx', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');
const setPropMatches = [...dsContext.matchAll(/setProperty\(['"](--ds-[a-z0-9-]+)['"]/g)].map(m => m[1]);
const cssPropMatches = [...indexCss.matchAll(/(--ds-[a-z0-9-]+)\s*:/g)].map(m => m[1]);
const validTokens = new Set([...setPropMatches, ...cssPropMatches]);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const matches = [...line.matchAll(/var\((--ds-[a-z0-9-]+)\)/g)];
    matches.forEach(m => {
      const token = m[1];
      if (!validTokens.has(token)) {
        console.log(`[GATE C MATCH] ${file}:${lineNum}: Undefined token "${token}" in line: ${line.trim()}`);
        gateCFailures++;
      }
    });
  });
});

if (gateCFailures === 0) {
  console.log('Gate C PASSED: 100% of var(--ds-*) tokens are officially defined in DesignSystemContext or index.css.');
} else {
  console.error(`Gate C FAILED: ${gateCFailures} undefined token occurrences found.`);
}

if (gateAFailures > 0 || gateBFailures > 0 || gateCFailures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
