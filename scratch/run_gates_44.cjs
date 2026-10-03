const fs = require('fs');

const files = [
  'src/features/students/StudentDetailModal.tsx',
  'src/features/students/StudentIdCardModal.tsx',
  'src/features/students/StudentCustomPrintModal.tsx',
];

console.log('=== GATE A AUDIT (Stage 4.4 — Context-Based Hex Check) ===');
let gateAFailures = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let inPrintStyleBlock = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Track dangerouslySetInnerHTML @media print style block in StudentCustomPrintModal.tsx
    if (line.includes('@media print') || line.includes('dangerouslySetInnerHTML')) {
      inPrintStyleBlock = true;
    }
    if (inPrintStyleBlock && (line.includes('}} />') || line.includes('</style>'))) {
      inPrintStyleBlock = false;
    }

    const matches = line.match(/#[0-9A-Fa-f]{3,8}\b/g);
    if (!matches) return;

    // Contextual Exclusions:
    // 1. QR code scanner SVG optical contrast fill="#064E3B"
    if (line.includes('fill="#064E3B"')) {
      return;
    }
    // 2. Virtual digital pass subtle radial dot pattern (#10b981)
    if (line.includes('radial-gradient(#10b981')) {
      return;
    }
    // 3. Print CSS stylesheet monochrome overrides (#fff, #000) inside print style block
    if (inPrintStyleBlock && (line.includes('#fff') || line.includes('#000'))) {
      return;
    }

    console.log(`[GATE A MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateAFailures++;
  });
});

if (gateAFailures === 0) {
  console.log('Gate A PASSED: 0 unmigrated hex matches outside contextual exclusions.');
} else {
  console.error(`Gate A FAILED: ${gateAFailures} unexpected hex matches.`);
}

console.log('\n=== GATE B AUDIT (Stage 4.4 — Screen UI Token Normalization) ===');
let gateBFailures = 0;

const legacyPattern = /bg-white|border-slate-[0-9]+|bg-slate-[0-9]+|text-slate-[0-9]+|dark:bg-slate-[0-9]+|dark:border-slate-[0-9]+|dark:text-slate-[0-9]+|dark:from-slate-[0-9]+|dark:to-slate-[0-9]+|text-indigo-[0-9]+|border-indigo-[0-9]+|bg-indigo-[0-9]+|dark:text-indigo-[0-9]+|dark:border-indigo-[0-9]+|dark:bg-indigo-[0-9]+|dark:text-cyan-[0-9]+/;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  let inPrintIdArea = false;
  let inPrintSheetArea = false;
  let inVirtualPass = false;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Context tracking for StudentIdCardModal physical print area
    if (line.includes('id="printable-student-id-area"')) {
      inPrintIdArea = true;
    }
    // Context tracking for StudentCustomPrintModal physical print area
    if (line.includes('className="print-sheet')) {
      inPrintSheetArea = true;
    }
    // Context tracking for Virtual Pass in StudentIdCardModal
    if (line.includes('Virtual ID Card Preview Frame') || line.includes('KARTU TANDA SISWA (DIGITAL PASS)')) {
      inVirtualPass = true;
    }
    if (inVirtualPass && line.includes('Petunjuk Ekosistem Masa Depan')) {
      inVirtualPass = false;
    }

    // Skip physical print document containers from Gate B
    if (inPrintIdArea || inPrintSheetArea) {
      return;
    }

    // Skip virtual card preview internal design elements
    if (inVirtualPass) {
      return;
    }

    if (!legacyPattern.test(line)) return;

    // Functional semantic exclusions
    // 1. Gender avatars (bg-emerald-600, bg-pink-600)
    if (line.includes('bg-emerald-600') || line.includes('bg-pink-600')) {
      return;
    }
    // 2. Chat WA link (text-emerald-600)
    if (line.includes('text-emerald-600') && line.includes('Chat WA')) {
      return;
    }
    // 3. QR code optical scanner SVG container (bg-white required for optical barcode contrast)
    if (line.includes('StudentQrPattern') || line.includes('QR Code Token') || (line.includes('bg-white') && line.includes('shadow-2xs shrink-0'))) {
      return;
    }
    // 4. Teacher notes & warning banner (amber-*, orange-*)
    if (line.includes('amber-') || line.includes('orange-')) {
      return;
    }
    // 5. Print error banner (rose-*)
    if (line.includes('rose-')) {
      return;
    }

    console.log(`[GATE B MATCH] ${file}:${lineNum}: ${line.trim()}`);
    gateBFailures++;
  });
});

if (gateBFailures === 0) {
  console.log('Gate B PASSED: 0 unexpected legacy tokens in screen UI targets.');
} else {
  console.error(`Gate B FAILED: ${gateBFailures} unexpected legacy tokens.`);
}

console.log('\n=== GATE C AUDIT (Stage 4.4 — Defined Token Existence Check) ===');
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
