const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/features/settings/tabs/SchoolTab.tsx',
  'src/features/settings/tabs/ProfileTab.tsx',
  'src/features/settings/tabs/DocumentTab.tsx'
];

let hasErrors = false;

// ==========================================
// GATE A: RAW HEX AUDIT
// ==========================================
console.log('=== GATE A AUDIT (Stage 5.2 — Hex Check) ===');
let gateAHexMatches = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);

  lines.forEach((line, idx) => {
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
console.log('\n=== GATE B AUDIT (Stage 5.2 — Screen UI Token Normalization with Print Zone Protection) ===');
const legacyRegex = /\b(bg-white|slate-[0-9]+|zinc-[0-9]+|neutral-[0-9]+)\b/;

let gateBMatches = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);

  let inProtectedPrintZone = false;

  lines.forEach((line, idx) => {
    // In DocumentTab.tsx, protect the Kop Surat Live Preview area (representing official paper)
    if (relPath.includes('DocumentTab.tsx')) {
      if (line.includes('Kop Surat Live Preview')) {
        inProtectedPrintZone = true;
      }
      if (inProtectedPrintZone) {
        if (line.includes('<button') && line.includes('submit')) {
          inProtectedPrintZone = false;
        } else {
          // Exempt lines in protected physical paper preview
          return;
        }
      }
    }

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
  gateBMatches.slice(0, 15).forEach(m => console.error(`  [${m.file}:${m.lineNum}] ${m.line}`));
  if (gateBMatches.length > 15) console.error(`  ... and ${gateBMatches.length - 15} more.`);
  hasErrors = true;
} else {
  console.log('Gate B PASSED: 0 unexpected legacy tokens in Stage 5.2 target files.');
}

// ==========================================
// GATE C: DEFINED TOKEN EXISTENCE CHECK
// ==========================================
console.log('\n=== GATE C AUDIT (Stage 5.2 — Defined Token Existence Check) ===');

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
  let match;
  while ((match = tokenRegex.exec(content)) !== null) {
    const token = match[1];
    if (!definedTokens.has(token)) {
      gateCInvalidTokens.push({ file: relPath, token });
    }
  }
}

if (gateCInvalidTokens.length > 0) {
  console.error(`Gate C FAILED: Found ${gateCInvalidTokens.length} undefined --ds-* tokens:`);
  gateCInvalidTokens.forEach(t => console.error(`  [${t.file}] ${t.token}`));
  hasErrors = true;
} else {
  console.log('Gate C PASSED: 100% of var(--ds-*) tokens are officially defined in DesignSystemContext or index.css.');
}

// ==========================================
// SUMMARY
// ==========================================
if (hasErrors) {
  console.error('\n>>> FAILURE: ONE OR MORE GATES FAILED <<<');
  process.exit(1);
} else {
  console.log('\n>>> ALL GATES PASSED (100% VERIFIED) <<<');
  process.exit(0);
}
