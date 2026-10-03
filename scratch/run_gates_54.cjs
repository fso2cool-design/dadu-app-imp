const fs = require('fs');
const path = require('path');

const targetFile = 'src/features/reports/PrintDocumentLayout.tsx';
const fullPath = path.resolve(targetFile);

let hasErrors = false;

// ==========================================
// GATE A: RAW HEX AUDIT
// ==========================================
console.log('=== GATE A AUDIT (Stage 5.4 — Hex Check) ===');
let gateAHexMatches = [];

if (fs.existsSync(fullPath)) {
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
    let match;
    while ((match = hexRegex.exec(line)) !== null) {
      gateAHexMatches.push({
        file: targetFile,
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
  console.log('Gate A PASSED: 0 unmigrated hex matches in PrintDocumentLayout.tsx.');
}

// ==========================================
// GATE B: SCREEN UI TOKEN NORMALIZATION AUDIT (TOOLBAR ONLY)
// ==========================================
console.log('\n=== GATE B AUDIT (Stage 5.4 — Toolbar Normalization with Physical Sheet Protection) ===');
const legacyRegex = /\b(bg-white|slate-[0-9]+|zinc-[0-9]+|neutral-[0-9]+)\b/;

let gateBMatches = [];

if (fs.existsSync(fullPath)) {
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  let inToolbarZone = false;

  lines.forEach((line, idx) => {
    if (line.includes('Document Control Bar (Hidden on Print)')) {
      inToolbarZone = true;
    }
    if (inToolbarZone && line.includes('Printable Sheet Wrapper')) {
      inToolbarZone = false;
    }

    if (inToolbarZone) {
      if (legacyRegex.test(line)) {
        gateBMatches.push({
          file: targetFile,
          lineNum: idx + 1,
          line: line.trim()
        });
      }
    }
  });
}

if (gateBMatches.length > 0) {
  console.error(`Gate B FAILED: Found ${gateBMatches.length} legacy styling matches in toolbar zone:`);
  gateBMatches.forEach(m => console.error(`  [${m.file}:${m.lineNum}] ${m.line}`));
  hasErrors = true;
} else {
  console.log('Gate B PASSED: 0 unexpected legacy tokens in screen toolbar (physical sheet protected).');
}

// ==========================================
// GATE C: DEFINED TOKEN EXISTENCE CHECK (DYNAMIC COUNT)
// ==========================================
console.log('\n=== GATE C AUDIT (Stage 5.4 — Dynamic Defined Token Existence Check) ===');

const designSystemCtx = fs.readFileSync('src/context/DesignSystemContext.tsx', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');

const definedTokens = new Set();
const tokenDefRegex = /--ds-[a-z0-9-]+/g;

let defMatch;
while ((defMatch = tokenDefRegex.exec(designSystemCtx)) !== null) {
  definedTokens.add(defMatch[0]);
}
while ((defMatch = tokenDefRegex.exec(indexCss)) !== null) {
  definedTokens.add(defMatch[0]);
}

console.log(`Loaded dynamic count of ${definedTokens.size} unique design tokens from DesignSystemContext & index.css.`);

let gateCInvalidTokens = [];

if (fs.existsSync(fullPath)) {
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    const tokenUsageRegex = /--ds-[a-z0-9-]+/g;
    let match;
    while ((match = tokenUsageRegex.exec(line)) !== null) {
      const token = match[0];
      if (!definedTokens.has(token)) {
        gateCInvalidTokens.push({
          file: targetFile,
          lineNum: idx + 1,
          token,
          line: line.trim()
        });
      }
    }
  });
}

if (gateCInvalidTokens.length > 0) {
  console.error(`Gate C FAILED: Found ${gateCInvalidTokens.length} references to undefined tokens:`);
  gateCInvalidTokens.forEach(item => {
    console.error(`  [${item.file}:${item.lineNum}] ${item.token} in "${item.line}"`);
  });
  hasErrors = true;
} else {
  console.log('Gate C PASSED: 100% of used tokens are officially defined in the Design System.');
}

// ==========================================
// FINAL STATUS
// ==========================================
console.log('\n==========================================');
if (hasErrors) {
  console.error('STAGE 5.4 GATES AUDIT: ❌ FAILED');
  process.exit(1);
} else {
  console.log('STAGE 5.4 GATES AUDIT: ✅ ALL GATES PASSED (A, B, C)');
  process.exit(0);
}
