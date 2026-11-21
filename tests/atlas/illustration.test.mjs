import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { coverStyle, cropStyle, spotAt, spotCentre, spotOf } from '../../frontend/src/features/atlas/illustration.ts';

// The data paths can be overridden with ATLAS_LANDMARKS, ATLAS_TOPO and ATLAS_ILLUSTRATION (used when the file is run from outside the repo).
const read = (env, rel) => JSON.parse(readFileSync(process.env[env] ?? fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const landmarks = read('ATLAS_LANDMARKS', '../../frontend/src/content/atlas/landmarks.json');
const topo = read('ATLAS_TOPO', '../../frontend/src/content/atlas/provinces.topo.json');
const real = read('ATLAS_ILLUSTRATION', '../../frontend/src/content/atlas/illustration-v2.json');
const archipelagoIds = topo.objects.archipelagos.geometries.map((g) => g.properties.id);

const m = { version: 1, size: [1000, 2000], spots: [
  { id: 'big', box: [100, 100, 500, 500], confidence: 'ro' },
  { id: 'small', box: [200, 200, 300, 300], confidence: 'doan' }, // inside "big"
  { id: 'far', box: [600, 1000, 700, 1100], confidence: 'ro' },
] };

test('unknown id maps to null everywhere', () => {
  assert.equal(spotOf(m, 'zzz'), null);
  assert.equal(cropStyle(m, 'zzz', 120), null);
  assert.equal(spotOf(m, ''), null);
});

test('cropStyle gives a crop that scales with its container', () => {
  const crop = cropStyle(m, 'far', 200);
  assert.equal(crop.width, '200px');
  assert.equal(crop.maxWidth, '100%');
  assert.equal(crop.aspectRatio, '100 / 100');
  assert.equal(crop.backgroundSize, '1000% 2000%');
  assert.equal(crop.scale, 2);
  const [x, y] = crop.backgroundPosition.split(' ').map(parseFloat);
  assert.ok(Math.abs(x / 100 * 900 - 600) < 0.01);
  assert.ok(Math.abs(y / 100 * 1900 - 1000) < 0.01);
  assert.equal(cropStyle(m, 'far', 0), null);
  assert.equal(cropStyle(m, 'far', -5), null);
  assert.equal(cropStyle({ ...m, spots: [{ id: 'flat', box: [10, 10, 10, 50], confidence: 'ro' }] }, 'flat', 100), null);
});

test('spotAt: smallest box wins on overlap, edges, outside, bad input', () => {
  const W = 500, H = 1000; // the picture shown at half size
  assert.equal(spotAt(m, 125, 125, W, H), 'small'); // image (250, 250): inside both, the small one wins
  assert.equal(spotAt(m, 75, 75, W, H), 'big'); // image (150, 150)
  assert.equal(spotAt(m, 325, 525, W, H), 'far');
  assert.equal(spotAt(m, 10, 10, W, H), null);
  assert.equal(spotAt(m, 125, 125, 0, H), null);
  assert.equal(spotAt(m, Number.NaN, 125, W, H), null);
});

test('spotCentre is in percent of the image', () => {
  assert.deepEqual(spotCentre(m, m.spots[0]), { left: '30%', top: '15%' });
});

test('the real manifest: every spot id is a landmark or an archipelago id, ids unique', () => {
  const known = new Set([...landmarks.map((l) => l.id), ...archipelagoIds]);
  assert.ok(real.spots.length > 0);
  for (const s of real.spots) assert.ok(known.has(s.id), `spot id "${s.id}" is not a landmark or archipelago id`);
  assert.equal(new Set(real.spots.map((s) => s.id)).size, real.spots.length, 'duplicate spot ids');
  for (const s of real.spots) assert.ok(s.confidence === 'ro' || s.confidence === 'doan', `${s.id}: confidence`);
});

test('the real manifest: every box is inside the image and has positive area', () => {
  const [W, H] = real.size;
  for (const s of real.spots) {
    const [x0, y0, x1, y1] = s.box;
    assert.ok(x0 >= 0 && y0 >= 0 && x1 <= W && y1 <= H, `${s.id}: box outside ${W}×${H}`);
    assert.ok(x1 > x0 && y1 > y0, `${s.id}: empty box`);
  }
});

test('the real manifest: spotAt at a box centre returns that id', () => {
  const [W, H] = real.size;
  for (const s of real.spots) {
    const cx = (s.box[0] + s.box[2]) / 2, cy = (s.box[1] + s.box[3]) / 2;
    assert.equal(spotAt(real, cx, cy, W, H), s.id, `${s.id}: centre claimed by another spot`);
    // and when the picture is shown at another size
    assert.equal(spotAt(real, (cx / W) * 480, (cy / H) * 720, 480, 720), s.id);
  }
});

test('coverStyle fills a frame from the box and stays inside the image', () => {
  const c = coverStyle(m, 'far', 240, 180); // box 100 × 100 in a 4:3 frame: factor 2.4 (the width must be covered)
  assert.equal(c.width, '240px');
  assert.equal(c.height, '180px');
  assert.ok(c.scale >= 2.4);
  assert.equal(coverStyle(m, 'zzz', 240, 180), null);
  // a box at the image corner never scrolls the background past the edge
  const corner = coverStyle({ ...m, spots: [{ id: 'c', box: [0, 0, 48, 36], confidence: 'ro' }] }, 'c', 240, 180);
  assert.equal(corner.backgroundPosition, '0px 0px');
});

test('the real manifest: a place the picture does not show has no spot', () => {
  assert.equal(spotOf(real, 'dong-da'), null);
  assert.equal(cropStyle(real, 'dong-da', 100), null);
});
