// Atlas data contract (plan §4.2). Run: node --test tests/atlas/
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { feature } from 'topojson-client';
import { inGeometry, kmToGeometry, polygons } from '../../scripts/atlas/lib.mjs';

const dir = new URL('../../frontend/src/content/atlas/', import.meta.url);
const pub = new URL('../../frontend/public/atlas/', import.meta.url);
const topo = JSON.parse(readFileSync(new URL('provinces.topo.json', dir), 'utf8'));
const landmarks = JSON.parse(readFileSync(new URL('landmarks.json', dir), 'utf8'));
const provinces = feature(topo, topo.objects.provinces).features;
const archipelagos = feature(topo, topo.objects.archipelagos).features;
const byId = new Map(provinces.map((p) => [p.properties.id, p]));
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = ['di-tich', 'danh-thang', 'unesco', 'chien-truong', 'kinh-do'];
const lessonDir = new URL('../../frontend/src/content/lessons/', import.meta.url);
const lessons = readdirSync(lessonDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, lessonDir), 'utf8')));
const LESSONS = lessons.map((l) => l.id);
const COAST_KM = 10; // coastal points may sit just off a simplified, ~200 m-quantized coastline

test('exactly 34 province-level units with the 2025 shape', () => {
  assert.equal(provinces.length, 34);
  for (const p of provinces) {
    const { id, name, type, region } = p.properties;
    assert.match(id, KEBAB);
    assert.ok(name && region, id);
    assert.ok(['tinh', 'thanh-pho'].includes(type), id);
    assert.ok(polygons(p.geometry).length > 0, `${id} has geometry`);
  }
  const cities = provinces.filter((p) => p.properties.type === 'thanh-pho').map((p) => p.properties.id).sort();
  assert.deepEqual(cities, ['bac-ninh', 'can-tho', 'da-nang', 'dong-nai', 'ha-noi', 'hai-phong', 'ho-chi-minh', 'hue', 'quang-ninh']);
});

test('Hoàng Sa belongs to Đà Nẵng and Trường Sa to Khánh Hòa', () => {
  const want = { 'hoang-sa': ['da-nang', 15.5, 17.2, 111, 113], 'truong-sa': ['khanh-hoa', 7.5, 11.6, 111.5, 116] };
  assert.deepEqual(archipelagos.map((a) => a.properties.id).sort(), Object.keys(want));
  for (const a of archipelagos) {
    const [province, s, n, w, e] = want[a.properties.id];
    assert.equal(a.properties.provinceId, province);
    assert.ok(a.properties.islands.length >= 5, `${a.properties.id} islands`);
    for (const { name, coords: [lat, lng] } of a.properties.islands) {
      assert.ok(name && lat > s && lat < n && lng > w && lng < e, `${name} inside ${a.properties.id}`);
    }
    // The province's own geometry includes the archipelago rings.
    const east = polygons(byId.get(province).geometry).filter((poly) => poly[0][0][0] > 110.5);
    assert.ok(east.length > 0, `${province} geometry reaches the archipelago`);
  }
});

test('landmark ids are unique kebab-case and the required ones exist', () => {
  const ids = landmarks.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, KEBAB);
  for (const id of ['ngoc-hoi', 'dong-da', 'ha-hoi', 'rach-gam', 'xoai-mut', 'chi-lang', 'xuong-giang', 'bach-dang',
    'dien-bien-phu', 'dinh-doc-lap', 'co-loa', 'hoang-thanh-thang-long', 'kinh-thanh-hue']) assert.ok(ids.includes(id), id);
});

test('every landmark has the §4.2 fields, sources with licenses, and the illustrative mark', () => {
  for (const l of landmarks) {
    assert.ok(l.name && l.summary.length >= 30 && l.summary.length <= 400, `${l.id} summary`);
    assert.ok(KINDS.includes(l.kind), `${l.id} kind`);
    for (const t of l.tags ?? []) assert.ok(KINDS.includes(t) && t !== l.kind, `${l.id} tag ${t}`);
    for (const id of l.lessonIds ?? []) assert.ok(LESSONS.includes(id), `${l.id} lesson ${id}`);
    assert.equal(l.illustrative, true, `${l.id} illustrative`);
    assert.ok(l.sources.length >= 1, `${l.id} sources`);
    for (const s of l.sources) assert.ok(s.title && /^https:\/\//.test(s.url) && s.license, `${l.id} source ${s.url}`);
    assert.ok(l.coordsFrom || l.sources.some((s) => s.url.includes('wikidata.org')), `${l.id} coordinate source`);
  }
});

test('the World Heritage sites are all there', () => {
  const unesco = landmarks.filter((l) => l.kind === 'unesco' || l.tags?.includes('unesco'));
  const whc = new Set(unesco.flatMap((l) => l.sources.filter((s) => s.url.includes('whc.unesco.org')).map((s) => s.url)));
  // 8 sites inscribed 1993-2014, plus Yên Tử – Vĩnh Nghiêm – Côn Sơn, Kiếp Bạc (12/7/2025).
  assert.equal(whc.size, 9, [...whc].join(' '));
});

test('every landmark lies in its province polygon (coastal points within 10 km)', () => {
  for (const l of landmarks) {
    const p = byId.get(l.provinceId);
    assert.ok(p, `${l.id} province ${l.provinceId}`);
    const point = [l.coords[1], l.coords[0]];
    const inside = inGeometry(p.geometry, point);
    if (inside) continue;
    assert.ok(!provinces.some((q) => inGeometry(q.geometry, point)), `${l.id} lies in another province`);
    assert.ok(kmToGeometry(p.geometry, point) <= COAST_KM, `${l.id} is ${kmToGeometry(p.geometry, point).toFixed(1)} km off ${l.provinceId}`);
  }
});

test('all strings are NFC', () => {
  const walk = (v, path) => {
    if (typeof v === 'string') assert.equal(v, v.normalize('NFC'), path);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(landmarks, 'landmarks');
  walk(topo.objects, 'provinces');
});

test('size budget: boundaries ≤ 400 KB gzip, terrain ≤ 2 MB', () => {
  const gz = gzipSync(readFileSync(new URL('provinces.topo.json', dir))).length;
  assert.ok(gz <= 400 * 1024, `provinces.topo.json ${gz} B gzip`);
  const terrain = statSync(new URL('terrain.png', pub)).size;
  assert.ok(terrain <= 2 * 1024 * 1024, `terrain.png ${terrain} B`);
});

test('province, archipelago and landmark ids never collide (onSelect gets one id space)', () => {
  const all = [...provinces, ...archipelagos].map((f) => f.properties.id).concat(landmarks.map((l) => l.id));
  assert.equal(new Set(all).size, all.length);
});

test('every unit has a label point on its own land', () => {
  for (const p of provinces) {
    const [lat, lng] = p.properties.label;
    assert.ok(inGeometry(p.geometry, [lng, lat]), `${p.properties.id} label ${lat},${lng}`);
  }
  for (const a of archipelagos) assert.equal(a.properties.label.length, 2);
});

test('lessons and places link both ways: every atlasPlaceIds value is a landmark, unit or archipelago', () => {
  assert.ok(LESSONS.length >= 6, 'bundled lessons found');
  const places = new Set([...provinces, ...archipelagos].map((f) => f.properties.id).concat(landmarks.map((l) => l.id)));
  for (const lesson of lessons) {
    assert.ok(lesson.atlasPlaceIds?.length, `${lesson.id} has atlasPlaceIds`);
    for (const id of lesson.atlasPlaceIds) assert.ok(places.has(id), `${lesson.id} → unknown atlas place "${id}"`);
  }
  // The other direction (landmark.lessonIds → a bundled lesson) is checked in the §4.2 fields test above.
});
