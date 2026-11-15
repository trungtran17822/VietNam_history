#!/usr/bin/env node
/**
 * Grounding audit (ported from Trung's origin/Process branch, now reading the v2 lesson JSON).
 *
 * For every bundled lesson that has a grounding target below, checks that the years, dates,
 * transliterated proper nouns and decimal statistics it uses also appear in the textbook extract
 * in history_data/, and that no term known to be outside the source slipped in. Lessons without a
 * target (the Viet Nam lessons) are not audited here; their quotes carry their own source notes.
 *
 * Exit 0 when clean (or when history_data/ is absent); exit 1 on ungrounded tokens.
 * Usage: node scripts/check-lesson-grounding.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const historyDir = path.join(rootDir, 'history_data');
const lessonDir = path.join(rootDir, 'frontend', 'src', 'content', 'lessons');

if (!fs.existsSync(historyDir)) {
  console.log('[check-lesson-grounding] history_data/ not found (CI or deploy without it). Skipping.');
  process.exit(0);
}

// lesson id -> textbook extract in history_data/. Add a line here to audit a new SGK lesson.
export const GROUNDING_TARGETS = {
  'bai-1-lien-xo': 'bai-1-nuoc-nga-va-lien-xo.md',
  'bai-2-chau-au-my': 'bai-2-chau-au-va-nuoc-my.md',
  'bai-3-chau-a': 'bai-3-chau-a.md',
  'bai-4-chien-tranh-the-gioi-2': 'bai-4-chien-tranh-the-gioi-thu-hai.md'
};

// Names and numbers that are NOT in the textbook extracts; a lesson using them is inventing.
const FORBIDDEN_UNGROUNDED_TERMS = ['Sabarmati', 'Dandi', 'Uranus', 'Romania', 'Hungary', 'Kalach', '23-11', 'Paulus', 'sông Volga', 'mũi giải vây Don', 'bảo hiểm tiền gửi'];

const normalize = (str) => (str ?? '').normalize('NFC').replace(/[–—]/g, '-').replace(/ /g, ' ').replace(/(\d+)\.(\d+)/g, '$1,$2');

// Strings that are identifiers or plan data, not historical claims.
const skipKey = (keyPath) =>
  keyPath === 'id' || keyPath.endsWith('.id') || ['status', 'class', 'date', 'explorationMode'].includes(keyPath) || keyPath.endsWith('Delta') || keyPath.includes('comparisonMetrics');

function collect(obj, keyPath, out) {
  if (!obj) return;
  if (typeof obj === 'string') {
    if (!skipKey(keyPath)) out.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => collect(item, `${keyPath}[${i}]`, out));
  } else if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) collect(obj[k], keyPath ? `${keyPath}.${k}` : k, out);
  }
}

const uniq = (list) => [...new Set(list)];
let failures = 0;
let audited = 0;
const lines = [];

for (const [id, sourceFile] of Object.entries(GROUNDING_TARGETS)) {
  const lessonPath = path.join(lessonDir, `${id}.json`);
  const sourcePath = path.join(historyDir, sourceFile);
  if (!fs.existsSync(lessonPath)) {
    console.error(`FAIL: no lesson file for grounding target "${id}" (${lessonPath})`);
    failures++;
    continue;
  }
  if (!fs.existsSync(sourcePath)) {
    console.error(`FAIL: source extract missing: ${sourcePath}`);
    failures++;
    continue;
  }
  audited++;
  const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
  const source = normalize(fs.readFileSync(sourcePath, 'utf8'));
  const strings = [];
  collect(lesson, '', strings);
  const text = normalize(strings.join(' '));

  const forbidden = FORBIDDEN_UNGROUNDED_TERMS.filter((t) => text.toLowerCase().includes(normalize(t).toLowerCase()));
  const years = uniq(text.match(/\b(18\d\d|19\d\d)\b/g) ?? []);
  const dates = uniq([...(text.match(/\b\d{1,2}-\d{1,2}-\d{4}\b/g) ?? []), ...(text.match(/\b\d{1,2}-\d{4}\b/g) ?? [])]);
  // Transliterated proper nouns: Lê-nin, Xta-lin-grát, Ru-dơ-ven, Hít-le...
  const names = uniq(text.match(/\b[A-ZÀ-Ỹ][a-zà-ỹ]+(?:-[a-zà-ỹ]+)+\b/g) ?? []);
  const decimals = uniq(text.match(/\b\d+,\d+\b/g) ?? []);
  const missing = { years: years.filter((t) => !source.includes(t)), dates: dates.filter((t) => !source.includes(t)), names: names.filter((t) => !source.includes(t)), decimals: decimals.filter((t) => !source.includes(t)) };
  const bad = forbidden.length > 0 || Object.values(missing).some((m) => m.length);
  if (bad) failures++;

  lines.push(`${bad ? 'FAIL' : 'PASS'} [${id}] <- ${sourceFile}`);
  lines.push(`  years ${years.length}, dates ${dates.length}, transliterations ${names.length}, decimals ${decimals.length}`);
  for (const [kind, list] of Object.entries(missing)) if (list.length) lines.push(`  missing ${kind}: ${list.join(', ')}`);
  if (forbidden.length) lines.push(`  forbidden terms: ${forbidden.join(', ')}`);
}

console.log(lines.join('\n'));
if (failures) {
  console.error(`Grounding audit FAILED: ${failures} lesson(s) with ungrounded tokens.`);
  process.exit(1);
}
console.log(`Grounding audit OK: ${audited} lessons grounded in history_data/.`);
