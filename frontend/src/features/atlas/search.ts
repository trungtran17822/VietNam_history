// Atlas search, filter and URL state. Pure functions, no DOM: the scene, the React view and the
// tests share them. Scoring follows the pattern in the GeoGnos report §4.1, on diacritic-folded text.

export type Kind = 'di-tich' | 'danh-thang' | 'unesco' | 'chien-truong' | 'kinh-do';

export const KINDS: { id: Kind; label: string }[] = [
  { id: 'chien-truong', label: 'Chiến trường' },
  { id: 'kinh-do', label: 'Kinh đô' },
  { id: 'unesco', label: 'Di sản UNESCO' },
  { id: 'di-tich', label: 'Di tích' },
  { id: 'danh-thang', label: 'Danh thắng' },
];

export interface Source { title: string; url: string; license: string }

export interface Landmark {
  id: string;
  name: string;
  kind: Kind;
  tags?: Kind[];
  aliases?: string[];
  provinceId: string;
  coords: [number, number]; // [lat, lng]
  coordsFrom?: string;
  coordsNote?: string;
  era?: string;
  summary: string;
  lessonIds?: string[];
  qid?: string;
  sources: Source[];
  illustrative: true;
}

export interface Province { id: string; name: string; type: 'tinh' | 'thanh-pho'; region: string }

export interface Filter { kinds?: Kind[]; query?: string }

export interface Hit<T> { item: T; score: number }

/** Lowercase, strip Vietnamese diacritics (đ → d), collapse spaces: "Hạ Hồi" → "ha hoi". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const words = (s: string) => s.split(/[\s\-–(),.]+/).filter(Boolean);

/**
 * GeoGnos-style score on folded text. name: exact 1000, prefix 500, alias exact 400, a word starts
 * with q 350, contains 200; alias contains 150; region (the province name) contains 100; otherwise
 * for q of 4+ letters the closest word of 3+ letters within Levenshtein 2 scores 30 - 10·d (several
 * query words: every word within 2, scored by the mean distance so a one-letter typo wins).
 * Matching the diacritics exactly adds 50, so "Hạ Hồi" ranks above "Hà Hồi" for that query.
 */
export function score(item: { name: string; aliases?: string[] }, query: string, region = ''): number {
  const q = fold(query);
  if (!q) return 0;
  const name = fold(item.name);
  const aliases = (item.aliases ?? []).map(fold);
  let s = 0;
  if (name === q) s = 1000;
  else if (name.startsWith(q)) s = 500;
  else if (aliases.includes(q)) s = 400;
  else if ([name, ...aliases].some((t) => words(t).some((w) => w.startsWith(q)))) s = 350;
  else if (name.includes(q)) s = 200;
  else if (aliases.some((a) => a.includes(q))) s = 150;
  else if (region && fold(region).includes(q)) s = 100;
  else if (q.length >= 4) {
    const qw = words(q);
    const pool = [name, ...aliases].flatMap(words).filter((w) => w.length >= 3);
    const d = qw.map((w) => Math.min(...pool.map((p) => levenshtein(w, p)), Infinity));
    if (Math.max(...d) <= 2) s = Math.round(30 - (10 * d.reduce((a, b) => a + b, 0)) / d.length);
  }
  if (s && [item.name, ...(item.aliases ?? [])].some((t) => t.toLowerCase().normalize('NFC').includes(query.trim().toLowerCase().normalize('NFC')))) s += 50;
  return s;
}

export function matchesKinds(l: Landmark, kinds?: Kind[]): boolean {
  return !kinds?.length || kinds.includes(l.kind) || (l.tags ?? []).some((t) => kinds.includes(t));
}

/** Kind chips always apply; with a query, results are ranked by score, otherwise listed by name. */
export function filterLandmarks(list: Landmark[], filter: Filter, provinceName: (id: string) => string = () => ''): Hit<Landmark>[] {
  const pool = list.filter((l) => matchesKinds(l, filter.kinds));
  if (!filter.query?.trim()) return pool.map((item) => ({ item, score: 0 })).sort((a, b) => a.item.name.localeCompare(b.item.name, 'vi'));
  return pool
    .map((item) => ({ item, score: score(item, filter.query!, provinceName(item.provinceId)) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'vi'));
}

export function searchProvinces(list: Province[], query: string): Hit<Province>[] {
  return list
    .map((item) => ({ item, score: score(item, query, item.region) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
}

// --- URL state: #/atlas?place=<id>&kind=a,b&q=<text>

export interface AtlasState { place?: string; kinds: Kind[]; q: string }

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KIND_IDS = new Set<string>(KINDS.map((k) => k.id));

/** Accepts URLSearchParams, a query string, or the object TanStack Router hands to validateSearch. */
export function decodeAtlasState(raw: URLSearchParams | string | Record<string, unknown>): AtlasState {
  const params = typeof raw === 'string' || raw instanceof URLSearchParams ? new URLSearchParams(raw) : null;
  const get = (k: string) => {
    const v = params ? params.get(k) : (raw as Record<string, unknown>)[k];
    return Array.isArray(v) ? v.join(',') : v == null ? '' : String(v);
  };
  const place = get('place');
  const kinds = [...new Set(get('kind').split(',').filter((k) => KIND_IDS.has(k)))] as Kind[];
  return { place: ID.test(place) ? place : undefined, kinds, q: get('q').normalize('NFC').slice(0, 80) };
}

/** The URL form: what TanStack Router's validateSearch returns and `navigate({ search })` takes. */
export interface AtlasSearch { place?: string; kind?: string; q?: string }

/** Empty values are dropped so URLs stay short. */
export function encodeAtlasState(state: Partial<AtlasState>): AtlasSearch {
  const out: AtlasSearch = {};
  if (state.place) out.place = state.place;
  if (state.kinds?.length) out.kind = state.kinds.join(',');
  if (state.q?.trim()) out.q = state.q.trim();
  return out;
}

export function atlasQueryString(state: Partial<AtlasState>): string {
  const s = new URLSearchParams(encodeAtlasState(state) as Record<string, string>).toString();
  return s ? `?${s}` : '';
}
