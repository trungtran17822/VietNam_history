// Builds frontend/public/atlas/terrain.png from AWS Terrain Tiles (Terrarium encoding; over Viet Nam
// and the East Sea they come from SRTM, GMTED2010 and ETOPO1, all public domain).
// Output: an equirectangular grid over BBOX, one RGB pixel per cell:
//   R = land elevation, sqrt-encoded: h = (R/255)² · MAX_H m (finer steps in the lowlands)
//   G = sea depth, sqrt-encoded:      d = (G/255)² · MAX_D m
//   B = hillshade (sun from the north-west, 45°), the "texture" the shader tints with the palette
// Usage: node scripts/atlas/build-terrain.mjs   (downloads ~42 tiles, ~4 MB, into scripts/atlas/.raw)
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { PUBLIC, cached } from './lib.mjs';

export const BBOX = { west: 101.5, east: 117.5, south: 7.0, north: 24.0 }; // keep in sync with scene.ts
export const MAX_H = 3200, MAX_D = 5000;
const Z = 7, W = 1024;
const LAT0 = (BBOX.north + BBOX.south) / 2;
const H = Math.round((W * (BBOX.north - BBOX.south)) / ((BBOX.east - BBOX.west) * Math.cos((LAT0 * Math.PI) / 180)));

const n = 2 ** Z;
const tileX = (lng) => ((lng + 180) / 360) * n;
const tileY = (lat) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n; };
const tiles = new Map();
for (let x = Math.floor(tileX(BBOX.west)); x <= Math.floor(tileX(BBOX.east)); x++)
  for (let y = Math.floor(tileY(BBOX.north)); y <= Math.floor(tileY(BBOX.south)); y++) {
    const buf = await cached(`terrarium-${Z}-${x}-${y}.png`, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${Z}/${x}/${y}.png`);
    tiles.set(`${x}/${y}`, PNG.sync.read(buf));
  }

function elevAt(fx, fy) { // fractional global tile coords → metres
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const t = tiles.get(`${tx}/${ty}`);
  const px = Math.min(255, Math.floor((fx - tx) * 256)), py = Math.min(255, Math.floor((fy - ty) * 256));
  const i = (py * 256 + px) * 4, d = t.data;
  return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
}

// Resample to the equirectangular grid (2×2 supersampling per cell).
const elev = new Float32Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  let s = 0;
  for (const [a, b] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
    const lng = BBOX.west + ((i + a) / W) * (BBOX.east - BBOX.west);
    const lat = BBOX.north - ((j + b) / H) * (BBOX.north - BBOX.south);
    s += elevAt(tileX(lng), tileY(lat));
  }
  elev[j * W + i] = s / 4;
}

// Hillshade on the land surface only (sea is flat water in the scene).
const cell = (((BBOX.east - BBOX.west) / W) * 111320 * Math.cos((LAT0 * Math.PI) / 180));
const az = (315 * Math.PI) / 180, alt = (45 * Math.PI) / 180, exag = 3;
const at = (i, j) => Math.max(0, elev[Math.min(H - 1, Math.max(0, j)) * W + Math.min(W - 1, Math.max(0, i))]);
const png = new PNG({ width: W, height: H, colorType: 2 });
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const e = elev[j * W + i], o = (j * W + i) * 4;
  const dzdx = ((at(i + 1, j) - at(i - 1, j)) * exag) / (2 * cell);
  const dzdy = ((at(i, j + 1) - at(i, j - 1)) * exag) / (2 * cell);
  const slope = Math.atan(Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
  const shade = Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - aspect);
  png.data[o] = Math.round(Math.sqrt(Math.min(1, Math.max(0, e) / MAX_H)) * 255);
  png.data[o + 1] = Math.round(Math.sqrt(Math.min(1, Math.max(0, -e) / MAX_D)) * 255);
  png.data[o + 2] = Math.round(Math.max(0, Math.min(1, shade)) * 255);
  png.data[o + 3] = 255;
}
const out = PNG.sync.write(png, { colorType: 2, deflateLevel: 9 });
await writeFile(join(PUBLIC, 'terrain.png'), out);
console.log(`terrain.png: ${W}×${H}, ${(out.length / 1024).toFixed(0)} KB`);
