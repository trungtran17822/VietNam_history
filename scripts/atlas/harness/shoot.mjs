// Drives the harness in headless Chromium: screenshots (1280×720 and 360×800), FPS while orbiting,
// GPU objects and JS heap. Run: npm run atlas:shoot  → scripts/atlas/harness/shots/
// FPS comes from SwiftShader (software WebGL): compare runs, don't read it as device FPS.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = `${here}shots/`;
await mkdir(out, { recursive: true });
const server = await createServer({ configFile: `${here}vite.config.mjs`, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const viewports = { desktop: { width: 1280, height: 720 }, phone: { width: 360, height: 800 } };

for (const [device, viewport] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const t0 = Date.now();
  await page.goto('http://localhost:5174/');
  await page.evaluate(() => window.atlas.ready);
  const readyMs = Date.now() - t0;
  await page.waitForTimeout(800);
  const shot = (name) => page.screenshot({ path: `${out}${device}-${name}.png` });
  await shot('home');
  const { fps, info } = await page.evaluate(() => window.bench(3000));
  const heap = await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576));
  for (const id of ['ngoc-hoi', 'quang-ninh', 'truong-sa']) {
    await page.evaluate((x) => window.atlas.focusPlace(x, false), id);
    await page.waitForTimeout(500);
    await shot(id);
  }
  const labels = await page.evaluate(() => [...document.querySelectorAll('#map span')].filter((s) => s.style.visibility !== 'hidden').length);
  results.push({ device, readyMs, fps: Math.round(fps * 10) / 10, calls: info.render.calls, triangles: info.render.triangles,
    geometries: info.memory.geometries, textures: info.memory.textures, heapMB: heap, labels, errors });
  await page.evaluate(() => window.atlas.destroy());
  await page.close();
}
await browser.close();
await server.close();
await writeFile(`${out}results.json`, JSON.stringify(results, null, 2));
console.table(results.map(({ errors, ...r }) => ({ ...r, errors: errors.length })));
for (const r of results) for (const e of r.errors) console.log(`${r.device}: ${e}`);
