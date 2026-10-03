const fs = require('fs');

const dsContext = fs.readFileSync('src/context/DesignSystemContext.tsx', 'utf8');
const indexCss = fs.readFileSync('src/index.css', 'utf8');

const setPropMatches = [...dsContext.matchAll(/setProperty\(['"](--ds-[a-z0-9-]+)['"]/g)].map(m => m[1]);
const cssPropMatches = [...indexCss.matchAll(/(--ds-[a-z0-9-]+)\s*:/g)].map(m => m[1]);

const allDefinedTokens = new Set([...setPropMatches, ...cssPropMatches]);

console.log('Defined tokens count:', allDefinedTokens.size);
console.log('Defined tokens:', [...allDefinedTokens].sort());
