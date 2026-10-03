const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/features/settings/tabs/StatsTab.tsx',
  'src/features/settings/tabs/BackupTab.tsx',
  'src/features/settings/tabs/MaintenanceTab.tsx',
  'src/features/settings/RelationshipRecoverySection.tsx'
];

let hasErrors = false;

// ==========================================
// GATE A: RAW HEX AUDIT
// ==========================================
console.log('=== GATE A AUDIT (Stage 5.3 — Hex Check) ===');
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
console.log('\n=== GATE B AUDIT (Stage 5.3 — Screen UI Token Normalization) ===');
const legacyRegex = /\b(bg-white|slate-[0-9]+|zinc-[0-9]+|neutral-[0-9]+)\b/;

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
  gateBMatches.slice(0, 15).forEach(m => console.error(`  [${m.file}:${m.lineNum}] ${m.line}`));
  if (gateBMatches.length > 15) console.error(`  ... and ${gateBMatches.length - 15} more.`);
  hasErrors = true;
} else {
  console.log('Gate B PASSED: 0 unexpected legacy tokens in Stage 5.3 target files.');
}

// ==========================================
// GATE C: DEFINED TOKEN EXISTENCE CHECK
// ==========================================
console.log('\n=== GATE C AUDIT (Stage 5.3 — Defined Token Existence Check) ===');

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

console.log(`Loaded ${definedTokens.size} unique design tokens from DesignSystemContext & index.css.`);

let gateCInvalidTokens = [];

for (const relPath of targetFiles) {
  const fullPath = path.resolve(relPath);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);

  lines.forEach((line, idx) => {
    const tokenUsageRegex = /--ds-[a-z0-9-]+/g;
    let match;
    while ((match = tokenUsageRegex.exec(line)) !== null) {
      const token = match[0];
      if (!definedTokens.has(token)) {
        gateCInvalidTokens.push({
          file: relPath,
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
  console.error('STAGE 5.3 GATES AUDIT: ❌ FAILED');
  process.exit(1);
} else {
  console.log('STAGE 5.3 GATES AUDIT: ✅ ALL GATES PASSED (A, B, C)');
  process.exit(0);
}
