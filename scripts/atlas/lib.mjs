// Shared helpers for the atlas data pipeline (node >= 20, no deps).
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RAW = join(ROOT, 'scripts', 'atlas', '.raw');
export const CONTENT = join(ROOT, 'frontend', 'src', 'content', 'atlas');
export const PUBLIC = join(ROOT, 'frontend', 'public', 'atlas');
const UA = { 'User-Agent': 'su-viet-atlas-build/0.2 (educational prototype; https://github.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Download once into scripts/atlas/.raw (gitignored). A pinned sha256 makes rebuilds reproducible.
export async function cached(name, url, sha256) {
  const path = join(RAW, name);
  let buf = await readFile(path).catch(() => null);
  if (!buf) {
    console.log(`  download ${url}`);
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buf);
  }
  const hash = createHash('sha256').update(buf).digest('hex');
  if (sha256 && hash !== sha256) throw new Error(`sha256 mismatch for ${name}: ${hash}`);
  return buf;
}

// Wikidata entities (CC0) by QID, 50 per request, cached per QID list.
export async function wikidata(qids) {
  const path = join(RAW, `wikidata-${createHash('sha1').update(qids.join()).digest('hex').slice(0, 12)}.json`);
  const hit = await readFile(path, 'utf8').catch(() => null);
  if (hit) return JSON.parse(hit);
  const out = {};
  for (let i = 0; i < qids.length; i += 50) {
    const ids = qids.slice(i, i + 50).join('|');
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims|sitelinks&languages=vi|en&sitefilter=viwiki&ids=${ids}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: UA });
      if (res.ok) { Object.assign(out, (await res.json()).entities); break; }
      if (attempt > 4) throw new Error(`wikidata ${res.status}`);
      await sleep(5000 * (attempt + 1));
    }
    await sleep(1500);
  }
  await mkdir(RAW, { recursive: true });
  await writeFile(path, JSON.stringify(out));
  return out;
}

export function coordOf(entity) {
  const v = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  return v ? [round(v.latitude, 5), round(v.longitude, 5)] : null;
}

export const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

// Planar ray casting on [lng, lat] rings. Fine at country scale; the poles and the antimeridian are not in play.
export function inRing(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polygons(geometry) {
  if (!geometry) return [];
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
}

export function inGeometry(geometry, point) {
  return polygons(geometry).some(([outer, ...holes]) => inRing(outer, point) && !holes.some((h) => inRing(h, point)));
}

// Distance in km from a point to the nearest edge of a geometry (equirectangular, good to ~1% here).
export function kmToGeometry(geometry, [x, y]) {
  const k = Math.cos((y * Math.PI) / 180);
  let best = Infinity;
  for (const poly of polygons(geometry)) for (const ring of poly) for (let i = 1; i < ring.length; i++) {
    const ax = (ring[i - 1][0] - x) * k, ay = ring[i - 1][1] - y, bx = (ring[i][0] - x) * k, by = ring[i][1] - y;
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best * 111.32;
}
