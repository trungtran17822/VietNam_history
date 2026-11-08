// Refreshes frontend/src/content/atlas/landmarks.json in place. The file is hand-edited (id, name,
// kind, tags, aliases, era, summary, lessonIds, qid, and coords + coordsFrom when Wikidata has no
// coordinates); this script fills in the rest:
//   coords      from Wikidata P625 (CC0) unless coordsFrom says where they came from instead
//   provinceId  the 2025 unit whose polygon contains the point (coastal points: nearest within 10 km)
//   sources     Wikidata, the Vietnamese Wikipedia article used to check the summary, the UNESCO
//               list entry (P757), the special-relic list when the summary claims that status, and
//               OpenStreetMap when coordsFrom is osm:…
//   illustrative  always true: written for this prototype, not reviewed by a historian
// Usage: node scripts/atlas/build-landmarks.mjs   (run build-boundaries first)
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { feature } from 'topojson-client';
import { CONTENT, coordOf, inGeometry, kmToGeometry, wikidata } from './lib.mjs';

const COAST_KM = Number(process.env.COAST_KM || 10);
const SPECIAL = {
  title: 'Wikipedia tiếng Việt: Di tích quốc gia đặc biệt (Việt Nam), danh sách xếp hạng',
  url: 'https://vi.wikipedia.org/wiki/Di_t%C3%ADch_qu%E1%BB%91c_gia_%C4%91%E1%BA%B7c_bi%E1%BB%87t_(Vi%E1%BB%87t_Nam)',
  license: 'CC BY-SA 4.0',
};
const KEYS = ['id', 'name', 'kind', 'tags', 'aliases', 'provinceId', 'coords', 'coordsFrom', 'coordsNote', 'era', 'summary', 'lessonIds', 'qid', 'sources', 'illustrative'];

const path = join(CONTENT, 'landmarks.json');
const landmarks = JSON.parse(await readFile(path, 'utf8'));
const topo = JSON.parse(await readFile(join(CONTENT, 'provinces.topo.json'), 'utf8'));
const provinces = feature(topo, topo.objects.provinces).features;
const entities = await wikidata([...new Set(landmarks.map((l) => l.qid).filter(Boolean))].sort());

const out = landmarks.map((l) => {
  const e = l.qid && entities[l.qid];
  if (l.qid && !e) throw new Error(`${l.id}: unknown ${l.qid}`);
  const coords = l.coordsFrom ? l.coords : coordOf(e);
  if (!coords) throw new Error(`${l.id}: no coordinates (add coords + coordsFrom)`);
  const point = [coords[1], coords[0]];
  let province = provinces.find((p) => inGeometry(p.geometry, point));
  if (!province) {
    const [d, p] = provinces.map((p) => [kmToGeometry(p.geometry, point), p]).sort((a, b) => a[0] - b[0])[0];
    if (d > COAST_KM) throw new Error(`${l.id}: ${d.toFixed(1)} km from the nearest province`);
    console.log(`  ${l.id}: ${d.toFixed(1)} km off the coast of ${p.properties.id}`);
    province = p;
  }
  const sources = [];
  if (e) sources.push({ title: `Wikidata ${l.qid}${l.coordsFrom ? '' : ' (toạ độ)'}`, url: `https://www.wikidata.org/wiki/${l.qid}`, license: 'CC0 1.0' });
  const [kind, ref] = (l.coordsFrom || '').split(':');
  if (kind === 'osm') sources.push({ title: `OpenStreetMap ${ref} (toạ độ)`, url: `https://www.openstreetmap.org/${ref}`, license: 'ODbL 1.0' });
  const article = e?.sitelinks?.viwiki?.title;
  if (article) sources.push({ title: `Wikipedia tiếng Việt: ${article} (đối chiếu, không chép)`, url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(article.replaceAll(' ', '_'))}`, license: 'CC BY-SA 4.0' });
  const whc = e?.claims?.P757?.[0]?.mainsnak?.datavalue?.value;
  if (whc) sources.push({ title: `UNESCO World Heritage List ${whc}`, url: `https://whc.unesco.org/en/list/${whc.split('-')[0]}`, license: 'CC BY-SA 3.0 IGO' });
  if (/di tích quốc gia đặc biệt/i.test(l.summary)) sources.push(SPECIAL);
  const entry = { ...l, provinceId: province.properties.id, coords, sources, illustrative: true };
  return Object.fromEntries(KEYS.filter((k) => entry[k] !== undefined).map((k) => [k, entry[k]]));
});

await writeFile(path, JSON.stringify(out, null, 2) + '\n');
const byProvince = new Set(out.map((l) => l.provinceId));
console.log(`landmarks.json: ${out.length} landmarks in ${byProvince.size} of ${provinces.length} units`);
