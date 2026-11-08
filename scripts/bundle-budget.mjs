// Bundle budget (plan §5), run after `npm run build`: the JS a first visit loads (the entry script
// plus its modulepreloads in frontend/dist/index.html) must be ≤ 200 KB gzip, and three.js and the
// atlas must stay in lazy chunks. Usage: node scripts/bundle-budget.mjs
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../frontend/dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const files = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const LIMIT = 200 * 1024;
let total = 0, fail = false;
for (const f of files) {
  const code = readFileSync(new URL(f, dist));
  const gz = gzipSync(code).length;
  total += gz;
  console.log(`${(gz / 1024).toFixed(1).padStart(7)} KB gzip  ${f}`);
  // three.js logs with this prefix; the chunk-name list for lazy imports may mention three.module.
  if (/three\.module/.test(f) || code.includes('THREE.WebGLRenderer')) {
    console.error(`FAIL: ${f} is loaded on first visit but contains three.js`); fail = true;
  }
  if (/atlas|terrain\.png|provinces/.test(f)) { console.error(`FAIL: ${f} (atlas) is loaded on first visit`); fail = true; }
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB gzip  initial JS (budget ${LIMIT / 1024} KB)`);
if (total > LIMIT) { console.error('FAIL: initial JS is over budget'); fail = true; }
process.exit(fail ? 1 : 0);
