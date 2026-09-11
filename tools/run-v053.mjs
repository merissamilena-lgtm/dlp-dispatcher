import fs from 'node:fs';

const source = fs.readFileSync('tools/apply-v053.mjs', 'utf8').replaceAll('` ,', '`,');
const fixedPath = '/tmp/apply-v053-fixed.mjs';
fs.writeFileSync(fixedPath, source);
await import(`file://${fixedPath}`);
