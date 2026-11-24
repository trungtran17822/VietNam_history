// The public homepage and classroom each get a 200 KB gzip initial JS budget.
// Three.js and atlas data stay in lazy chunks.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../frontend/dist/', import.meta.url);
const limit = 200 * 1024;
let failed = false;

for (const entry of ['index.html', 'classroom.html']) {
  const html = readFileSync(new URL(entry, dist), 'utf8');
  const files = new Set([...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.js)"/g)].map(match => match[1]));
  let total = 0;

  console.log(entry);
  if (!files.size) {
    console.error(`FAIL: no initial JavaScript found in ${entry}`);
    failed = true;
  }

  for (const file of files) {
    const code = readFileSync(new URL(file, dist));
    const bytes = gzipSync(code).length;
    total += bytes;
    console.log(`${(bytes / 1024).toFixed(1).padStart(7)} KB gzip  ${file}`);
    if (/three\.module|atlas|terrain\.png|provinces/.test(file) || code.includes('THREE.WebGLRenderer')) {
      console.error(`FAIL: ${file} pulls three.js or atlas data into the initial visit`);
      failed = true;
    }
  }

  console.log(`${(total / 1024).toFixed(1).padStart(7)} KB gzip  initial JS (budget ${limit / 1024} KB)`);
  if (total > limit) {
    console.error(`FAIL: ${entry} is over its initial JavaScript budget`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
