// Builds frontend/src/content/atlas/provinces.topo.json: the 34 province-level units in force since
// 2025-07-01, with Hoàng Sa (Đà Nẵng) and Trường Sa (Khánh Hòa).
//
//   borders      OpenStreetMap admin_level=4 relations (ODbL), via polygons.openstreetmap.fr
//   coastline    Natural Earth 10m land + minor islands (public domain) plus OSM place=island outlines
//                (ODbL): OSM provinces reach into the sea, so each one is clipped to land
//   archipelagos Natural Earth 10m disputed areas (public domain); island points from Wikidata (CC0)
//   check        the 63 pre-2025 provinces (geoBoundaries, public domain) must each fall inside the
//                unit Nghị quyết 202/2025/QH15 merged them into; ATLAS_BOUNDARIES=dissolve builds the
//                map from that dissolve instead (coarser, public domain, no network to OSM)
//
// Usage: node scripts/atlas/build-boundaries.mjs   (downloads go to scripts/atlas/.raw, ~25 MB)
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import polygonClipping from 'polygon-clipping';
import { topology } from 'topojson-server';
import { feature, mergeArcs } from 'topojson-client';
import { presimplify, quantile, simplify } from 'topojson-simplify';
import { CONTENT, cached, coordOf, inGeometry, kmToGeometry, polygons, round, wikidata } from './lib.mjs';

const GB_URL = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/VNM/ADM1/geoBoundaries-VNM-ADM1.geojson';
const GB_SHA = '25dbc2fec9862016710118fc98042d3e803830c72361c91c4e864ae668fa9541';
const NE = (name) => `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_${name}.geojson`;
const OSM = (rel) => `https://polygons.openstreetmap.fr/get_geojson.py?id=${rel}&params=0`;
// OSM place=island outlines: Natural Earth misses near-shore islands such as Cù Lao Chàm. Slow (minutes).
const ISLANDS = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(
  '[out:json][timeout:600];(way["place"="island"](7,102,23.5,110);rel["place"="island"]["type"="multipolygon"](7,102,23.5,110););out geom qt;');

// [id, name, type, region, OSM relation, pre-2025 provinces merged into it (geoBoundaries shapeName)].
// Mergers: Nghị quyết 202/2025/QH15 (12/6/2025, effective 1/7/2025): 28 tỉnh + 6 thành phố.
// type is the status in force today: Đồng Nai (30/4/2026), Quảng Ninh (1/9/2026) and Bắc Ninh
// (20/9/2026) became centrally-run cities without boundary changes, so 25 tỉnh + 9 thành phố.
// region is a coarse three-part grouping (Bắc Bộ / Trung Bộ / Nam Bộ) for the list UI only.
const UNITS = [
  ['ha-noi', 'Hà Nội', 'thanh-pho', 'Bắc Bộ', 1903516, ['Hà Nội']],
  ['cao-bang', 'Cao Bằng', 'tinh', 'Bắc Bộ', 1844412, ['Cao Bằng']],
  ['tuyen-quang', 'Tuyên Quang', 'tinh', 'Bắc Bộ', 1903418, ['Hà Giang', 'Tuyên Quang']],
  ['lao-cai', 'Lào Cai', 'tinh', 'Bắc Bộ', 1903400, ['Lào Cai', 'Yên Bái']],
  ['thai-nguyen', 'Thái Nguyên', 'tinh', 'Bắc Bộ', 1902967, ['Bắc Kạn', 'Thái Nguyên']],
  ['phu-tho', 'Phú Thọ', 'tinh', 'Bắc Bộ', 1902930, ['Vĩnh Phúc', 'Hòa Bình', 'Phú Thọ']],
  ['bac-ninh', 'Bắc Ninh', 'thanh-pho', 'Bắc Bộ', 1902690, ['Bắc Giang', 'Bắc Ninh']],
  ['hung-yen', 'Hưng Yên', 'tinh', 'Bắc Bộ', 1901032, ['Thái Bình', 'Hưng Yên']],
  ['hai-phong', 'Hải Phòng', 'thanh-pho', 'Bắc Bộ', 1902682, ['Hải Phòng', 'Hải Dương']],
  ['ninh-binh', 'Ninh Bình', 'tinh', 'Bắc Bộ', 1900963, ['Hà Nam', 'Nam Định', 'Ninh Bình']],
  ['lai-chau', 'Lai Châu', 'tinh', 'Bắc Bộ', 1903322, ['Lai Châu']],
  ['dien-bien', 'Điện Biên', 'tinh', 'Bắc Bộ', 1903340, ['Điện Biên']],
  ['son-la', 'Sơn La', 'tinh', 'Bắc Bộ', 1903291, ['Sơn La']],
  ['lang-son', 'Lạng Sơn', 'tinh', 'Bắc Bộ', 5522596, ['Lạng Sơn']],
  ['quang-ninh', 'Quảng Ninh', 'thanh-pho', 'Bắc Bộ', 1902947, ['Quảng Ninh']],
  ['thanh-hoa', 'Thanh Hóa', 'tinh', 'Trung Bộ', 1898590, ['Thanh Hóa']],
  ['nghe-an', 'Nghệ An', 'tinh', 'Trung Bộ', 1898509, ['Nghệ An']],
  ['ha-tinh', 'Hà Tĩnh', 'tinh', 'Trung Bộ', 1898458, ['Hà Tĩnh']],
  ['quang-tri', 'Quảng Trị', 'tinh', 'Trung Bộ', 1895630, ['Quảng Bình', 'Quảng Trị']],
  ['hue', 'Huế', 'thanh-pho', 'Trung Bộ', 1891483, ['Thừa Thiên Huế']],
  ['da-nang', 'Đà Nẵng', 'thanh-pho', 'Trung Bộ', 1891418, ['Đà Nẵng', 'Quảng Nam']],
  ['quang-ngai', 'Quảng Ngãi', 'tinh', 'Trung Bộ', 1890793, ['Kon Tum', 'Quảng Ngãi']],
  ['gia-lai', 'Gia Lai', 'tinh', 'Trung Bộ', 1884018, ['Bình Định', 'Gia Lai']],
  ['dak-lak', 'Đắk Lắk', 'tinh', 'Trung Bộ', 1884034, ['Phú Yên', 'Đắk Lắk']],
  ['khanh-hoa', 'Khánh Hòa', 'tinh', 'Trung Bộ', 1887959, ['Ninh Thuận', 'Khánh Hòa']],
  ['lam-dong', 'Lâm Đồng', 'tinh', 'Trung Bộ', 1885367, ['Đắk Nông', 'Bình Thuận', 'Lâm Đồng']],
  ['ho-chi-minh', 'Hồ Chí Minh', 'thanh-pho', 'Nam Bộ', 1973756, ['Ho Chi Minh', 'Bà Rịa–Vũng Tàu', 'Côn Đảo', 'Bình Dương']],
  ['dong-nai', 'Đồng Nai', 'thanh-pho', 'Nam Bộ', 1904421, ['Bình Phước', 'Đồng Nai']],
  ['tay-ninh', 'Tây Ninh', 'tinh', 'Nam Bộ', 1898961, ['Long An', 'Tây Ninh']],
  ['can-tho', 'Cần Thơ', 'thanh-pho', 'Nam Bộ', 1874283, ['Cần Thơ', 'Sóc Trăng', 'Hậu Giang']],
  ['vinh-long', 'Vĩnh Long', 'tinh', 'Nam Bộ', 1875887, ['Bến Tre', 'Trà Vinh', 'Vĩnh Long']],
  ['dong-thap', 'Đồng Tháp', 'tinh', 'Nam Bộ', 1875866, ['Tiền Giang', 'Đồng Tháp']],
  ['ca-mau', 'Cà Mau', 'tinh', 'Nam Bộ', 1873490, ['Bạc Liêu', 'Cà Mau']],
  ['an-giang', 'An Giang', 'tinh', 'Nam Bộ', 1875748, ['Kiên Giang', 'An Giang']],
];

// Island points (Wikidata QIDs) are for dots and labels; most islets vanish at country scale.
const ARCHIPELAGOS = [
  { id: 'hoang-sa', name: 'Quần đảo Hoàng Sa', provinceId: 'da-nang', ne: 'Paracel Is.',
    islands: ['Q6750981', 'Q393044', 'Q974329', 'Q1098039', 'Q6788625', 'Q3235143', 'Q6856844', 'Q814618'] },
  { id: 'truong-sa', name: 'Quần đảo Trường Sa', provinceId: 'khanh-hoa', ne: 'Spratly Is.',
    islands: ['Q3273381', 'Q3137837', 'Q1005307', 'Q1005341', 'Q701264', 'Q7521519', 'Q987764', 'Q1006110', 'Q2232625', 'Q1932207', 'Q6769005', 'Q1089447'] },
];
const ARCHIPELAGO_LNG = 110.5; // everything east of this is archipelago, not mainland
const nfc = (s) => s.normalize('NFC').trim();
// Closed rings of an Overpass `out geom` way, or of a multipolygon relation's outer ways joined end to end.
function islandRings(e) {
  const line = (g) => g.map((n) => [n.lon, n.lat]);
  const ways = e.type === 'way' ? [line(e.geometry)] : e.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => line(m.geometry));
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const rings = [];
  while (ways.length) {
    let ring = ways.shift();
    for (let grew = true; grew && !same(ring[0], ring.at(-1));) {
      grew = false;
      for (let i = 0; i < ways.length; i++) {
        const w = ways[i];
        if (same(ring.at(-1), w[0])) ring = ring.concat(w.slice(1));
        else if (same(ring.at(-1), w.at(-1))) ring = ring.concat(w.slice(0, -1).reverse());
        else continue;
        ways.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length >= 4 && same(ring[0], ring.at(-1))) rings.push(ring);
  }
  return rings;
}
const multi = (g) => (g.type === 'GeometryCollection' ? g.geometries.flatMap(polygons) : polygons(g));

// --- 63 → 34 dissolve (public domain); the merger check below needs it either way.
const gb = JSON.parse(await cached('geoBoundaries-VNM-ADM1.geojson', GB_URL, GB_SHA));
const owner = new Map(UNITS.flatMap(([id, , , , , from]) => from.map((n) => [nfc(n), id])));
const oldProvinces = gb.features.map((f) => {
  const id = owner.get(nfc(f.properties.shapeName));
  if (!id) throw new Error(`unmapped province: ${f.properties.shapeName}`);
  const mainland = polygons(f.geometry).filter((poly) => poly[0][0][0] < ARCHIPELAGO_LNG);
  return { type: 'Feature', properties: { id, old: nfc(f.properties.shapeName) }, geometry: { type: 'MultiPolygon', coordinates: mainland } };
});
if (oldProvinces.length !== 64) throw new Error(`expected 63 provinces + Côn Đảo, got ${oldProvinces.length}`);

let mainland;
if (process.env.ATLAS_BOUNDARIES === 'dissolve') {
  const t = topology({ p: { type: 'FeatureCollection', features: oldProvinces } }, 1e6);
  mainland = new Map(UNITS.map(([id]) => [id, feature(t, mergeArcs(t, t.objects.p.geometries.filter((g) => g.properties.id === id))).geometry.coordinates]));
} else {
  // Land mask around Viet Nam; OSM units are intersected with it to drop territorial waters.
  const box = [[[100, 4], [120, 4], [120, 25], [100, 25], [100, 4]]];
  const land = [];
  for (const name of ['land', 'minor_islands']) {
    const fc = JSON.parse(await cached(`ne_10m_${name}.geojson`, NE(name)));
    for (const f of fc.features) land.push(...polygonClipping.intersection(multi(f.geometry), box));
  }
  const osmIslands = JSON.parse(await cached('osm-islands.json', ISLANDS)).elements;
  for (const e of osmIslands) for (const ring of islandRings(e)) land.push([ring]);
  const mask = polygonClipping.union(...land.map((p) => [p]));
  mainland = new Map();
  for (const [id, , , , rel] of UNITS) {
    const osm = JSON.parse(await cached(`osm-${rel}.geojson`, OSM(rel)));
    mainland.set(id, polygonClipping.intersection(multi(osm), mask).filter((p) => p[0][0][0] < ARCHIPELAGO_LNG));
  }
}

// Merger check: random points in each pre-2025 province (only those that land in some 2025 unit,
// since coastlines differ between sources) must land mostly in the unit it was merged into. A
// wrong mapping scores ~0%. The 2008 outlines are coarse and predate Mê Linh moving to Hà Nội,
// so honest scores run 50-100%; the mapped unit must at least be the most common one.
const ne = JSON.parse(await cached('ne_10m_admin_0_disputed_areas.geojson', NE('admin_0_disputed_areas')));
let rand = 2025, worst = [1, ''];
const random = () => ((rand = (rand * 1664525 + 1013904223) >>> 0) / 2 ** 32);
for (const f of oldProvinces) {
  const pts = f.geometry.coordinates.flat(2), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const tally = {};
  let n = 0;
  for (let i = 0; n < 80 && i < 1e5; i++) {
    const p = [Math.min(...xs) + random() * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + random() * (Math.max(...ys) - Math.min(...ys))];
    if (!inGeometry(f.geometry, p)) continue;
    const unit = [...mainland].find(([, c]) => inGeometry({ type: 'MultiPolygon', coordinates: c }, p));
    if (!unit) continue;
    n++;
    tally[unit[0]] = (tally[unit[0]] || 0) + 1;
  }
  const share = (tally[f.properties.id] || 0) / n;
  if (Math.max(...Object.values(tally)) !== tally[f.properties.id]) throw new Error(`${f.properties.old} → ${f.properties.id}? ${JSON.stringify(tally)}`);
  if (share < 0.8) console.log(`  note: ${f.properties.old} → ${f.properties.id} ${(100 * share).toFixed(0)}% ${JSON.stringify(tally)}`);
  if (share < worst[0]) worst = [share, f.properties.old];
}
console.log(`  merger check passed for all 64 pre-2025 units (lowest: ${worst[1]} ${(100 * worst[0]).toFixed(0)}%)`);

const entities = await wikidata(ARCHIPELAGOS.flatMap((a) => a.islands));
const archipelagos = ARCHIPELAGOS.map((a) => ({
  type: 'Feature',
  properties: {
    id: a.id, name: a.name, provinceId: a.provinceId,
    islands: a.islands.map((q) => ({ qid: q, name: nfc(entities[q].labels.vi?.value || entities[q].labels.en.value), coords: coordOf(entities[q]) })),
  },
  geometry: ne.features.find((f) => f.properties.NAME === a.ne).geometry,
}));
const provinces = UNITS.map(([id, name, type, region]) => {
  const islands = archipelagos.filter((a) => a.properties.provinceId === id).flatMap((a) => polygons(a.geometry));
  return { type: 'Feature', properties: { id, name, type, region }, geometry: { type: 'MultiPolygon', coordinates: [...mainland.get(id), ...islands] } };
});

// Simplify on a shared topology; island rings stay whole (a 4-point islet must not collapse).
let topo = topology({ provinces: { type: 'FeatureCollection', features: provinces }, archipelagos: { type: 'FeatureCollection', features: archipelagos } }, 1e6);
topo = presimplify(topo);
for (const arc of topo.arcs) {
  const xs = arc.map((p) => p[0]), ys = arc.map((p) => p[1]);
  const small = Math.max(...xs) - Math.min(...xs) < 0.05 && Math.max(...ys) - Math.min(...ys) < 0.05;
  const closed = arc[0][0] === arc.at(-1)[0] && arc[0][1] === arc.at(-1)[1];
  if (small && closed) for (const p of arc) p[2] = Infinity;
}
const keep = Number(process.env.ATLAS_KEEP || 0.3); // share of vertices kept
topo = simplify(topo, quantile(topo, keep));
// Rebuild from the simplified features so arcs are re-quantized (1e4 grid ≈ 200 m here) and
// specks left by the land clip (< ~1 km²) are dropped.
const tiny = (r) => Math.abs(area(r)) < 1e-4;
const clean = (name) => {
  const fc = feature(topo, topo.objects[name]);
  if (name === 'provinces') for (const f of fc.features) {
    f.geometry.coordinates = polygons(f.geometry).filter((p) => p[0][0][0] >= ARCHIPELAGO_LNG || !tiny(p[0]));
    f.geometry.type = 'MultiPolygon';
  }
  return fc;
};
// Label anchor [lat, lng]: the point of the largest mainland polygon farthest from its edges (grid search),
// so concave units like Quảng Ninh keep their name on land.
function labelPoint(geometry) {
  const [poly] = polygons(geometry).filter((p) => p[0][0][0] < ARCHIPELAGO_LNG)
    .sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])));
  const g = { type: 'Polygon', coordinates: poly };
  const xs = poly[0].map((p) => p[0]), ys = poly[0].map((p) => p[1]);
  let best = [0, poly[0][0]];
  for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
    const p = [Math.min(...xs) + (i / 40) * (Math.max(...xs) - Math.min(...xs)), Math.min(...ys) + (j / 40) * (Math.max(...ys) - Math.min(...ys))];
    if (inGeometry(g, p)) { const d = kmToGeometry(g, p); if (d > best[0]) best = [d, p]; }
  }
  return [round(best[1][1], 3), round(best[1][0], 3)]; // [lat, lng] like landmark coords
}
function area(r) { return r.reduce((a, p, i) => a + (i ? r[i - 1][0] * p[1] - p[0] * r[i - 1][1] : 0), 0) / 2; }
const provincesOut = clean('provinces');
for (const f of provincesOut.features) f.properties.label = labelPoint(f.geometry);
const archOut = clean('archipelagos');
for (const f of archOut.features) {
  const pts = f.properties.islands.map((i) => i.coords);
  f.properties.label = [round(pts.reduce((a, p) => a + p[0], 0) / pts.length, 3), round(pts.reduce((a, p) => a + p[1], 0) / pts.length, 3)];
}
const out = topology({ provinces: provincesOut, archipelagos: archOut }, 1e4);
out.bbox = out.bbox.map((v) => round(v, 4));

const json = JSON.stringify(out);
await writeFile(join(CONTENT, 'provinces.topo.json'), json + '\n');
console.log(`provinces.topo.json: ${UNITS.length} units, ${(json.length / 1024).toFixed(1)} KB, ${(gzipSync(json).length / 1024).toFixed(1)} KB gzip`);
