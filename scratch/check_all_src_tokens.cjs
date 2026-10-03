const fs = require('fs');
const path = require('path');

// 1. Get all valid defined tokens
const dsContext = fs.readFileSync('src/context/DesignSystemContext.tsx', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');

const setPropMatches = [...dsContext.matchAll(/setProperty\(['"](--ds-[a-z0-9-]+)['"]/g)].map(m => m[1]);
const cssPropMatches = [...indexCss.matchAll(/(--ds-[a-z0-9-]+)\s*:/g)].map(m => m[1]);

const validTokens = new Set([...setPropMatches, ...cssPropMatches]);

// 2. Scan all files in src/
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('src');
let invalidCount = 0;

console.log('=== AUDITING ALL var(--ds-*) IN src/ ===');

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [...content.matchAll(/var\((--ds-[a-z0-9-]+)\)/g)];
  matches.forEach(m => {
    const token = m[1];
    if (!validTokens.has(token)) {
      console.log(`[INVALID TOKEN] ${file}: ${token}`);
      invalidCount++;
    }
  });
});

console.log(`\nTotal invalid tokens found across src/: ${invalidCount}`);
