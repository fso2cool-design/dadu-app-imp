const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/features/students/DeduplicateStudentsModal.tsx',
  'src/features/students/TransferClassModal.tsx',
  'src/features/students/ManageCustomFieldsModal.tsx',
  'src/features/teacher/MeetingFormModal.tsx'
];

let hasErrors = false;

// ==========================================
// GATE A: RAW HEX AUDIT
// ==========================================
console.log('=== GATE A AUDIT (Stage 4.6 — Hex Check) ===');
let gateAHexMatches = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);

  lines.forEach((line, idx) => {
    // Check for hex color pattern #[0-9a-fA-F]{3,8}
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    let match;
    while ((match = hexRegex.exec(line)) !== null) {
      gateAHexMatches.push({
        file: relPath,
        lineNum: idx + 1,
        match: match[0],
        line: line.trim()
      });
    }
  });
}

if (gateAHexMatches.length > 0) {
  console.error(`Gate A FAILED: Found ${gateAHexMatches.length} raw hex matches:`);
  gateAHexMatches.forEach(m => console.error(`  [${m.file}:${m.lineNum}] ${m.match} in "${m.line}"`));
  hasErrors = true;
} else {
  console.log('Gate A PASSED: 0 unmigrated hex matches.');
}

// ==========================================
// GATE B: SCREEN UI TOKEN NORMALIZATION AUDIT
// ==========================================
console.log('\n=== GATE B AUDIT (Stage 4.6 — Screen UI Token Normalization) ===');
// Detect legacy classes: bg-white, slate-*, indigo-*, orange-*, cyan-*
const legacyRegex = /\b(bg-white|slate-[0-9]+|indigo-[0-9]+|text-orange-[0-9]+|bg-orange-[0-9]+|border-orange-[0-9]+|text-cyan-[0-9]+|bg-cyan-[0-9]+|border-cyan-[0-9]+)\b/;

let gateBMatches = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);

  lines.forEach((line, idx) => {
    if (legacyRegex.test(line)) {
      gateBMatches.push({
        file: relPath,
        lineNum: idx + 1,
        line: line.trim()
      });
    }
  });
}

if (gateBMatches.length > 0) {
  console.error(`Gate B FAILED: Found ${gateBMatches.length} legacy styling matches:`);
  gateBMatches.slice(0, 10).forEach(m => console.error(`  [${m.file}:${m.lineNum}] ${m.line}`));
  if (gateBMatches.length > 10) console.error(`  ... and ${gateBMatches.length - 10} more.`);
  hasErrors = true;
} else {
  console.log('Gate B PASSED: 0 unexpected legacy tokens in Stage 4.6 target files.');
}

// ==========================================
// GATE C: DEFINED TOKEN EXISTENCE CHECK
// ==========================================
console.log('\n=== GATE C AUDIT (Stage 4.6 — Defined Token Existence Check) ===');

// Extract valid tokens from DesignSystemContext.tsx and src/index.css
const designSystemCtx = fs.readFileSync('src/context/DesignSystemContext.tsx', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');

const definedTokens = new Set();
const defRegex = /(--ds-[a-z0-9-]+)/g;
let m;
while ((m = defRegex.exec(designSystemCtx)) !== null) definedTokens.add(m[1]);
while ((m = defRegex.exec(indexCss)) !== null) definedTokens.add(m[1]);

let gateCInvalidTokens = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  const tokenRegex = /var\((--ds-[a-z0-9-]+)\)/g;
  let tMatch;
  while ((tMatch = tokenRegex.exec(content)) !== null) {
    const token = tMatch[1];
    if (!definedTokens.has(token)) {
      gateCInvalidTokens.push({ file: relPath, token });
    }
  }
}

if (gateCInvalidTokens.length > 0) {
  console.error(`Gate C FAILED: ${gateCInvalidTokens.length} undefined tokens found:`);
  gateCInvalidTokens.forEach(item => console.error(`  [${item.file}] Undefined token: ${item.token}`));
  hasErrors = true;
} else {
  console.log(`Gate C PASSED: 100% of var(--ds-*) tokens are officially defined in DesignSystemContext or index.css.`);
}

if (hasErrors) {
  process.exit(1);
} else {
  console.log('\n>>> ALL GATES PASSED (100% VERIFIED) <<<');
  process.exit(0);
}
