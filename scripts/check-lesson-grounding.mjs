#!/usr/bin/env node
/**
 * scripts/check-lesson-grounding.mjs
 *
 * Verifies that all historical facts, years, dates, statistics, proper nouns,
 * and transliterations in `frontend/js/lesson-data.js` are grounded in the
 * source textbook markdown files in `history_data/`.
 *
 * Exits with 0 if clean (or if history_data/ is absent on CI/deploy environments).
 * Exits with 1 if ungrounded data or forbidden terms are detected.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const historyDir = path.join(rootDir, 'history_data');
const lessonDataPath = path.join(rootDir, 'frontend', 'js', 'lesson-data.js');

// If history_data/ is not present (e.g., CI or production deployment), exit 0 gracefully
if (!fs.existsSync(historyDir)) {
  console.log('⚠️ [check-lesson-grounding] history_data/ not found (likely in ignored/CI environment). Skipping check.');
  process.exit(0);
}

const fileMapping = {
  'bai-1-lien-xo': 'bai-1-nuoc-nga-va-lien-xo.md',
  'bai-2-chau-au-my': 'bai-2-chau-au-va-nuoc-my.md',
  'bai-3-chau-a': 'bai-3-chau-a.md',
  'bai-4-chien-tranh-the-gioi-2': 'bai-4-chien-tranh-the-gioi-thu-hai.md'
};

const FORBIDDEN_UNGROUNDED_TERMS = [
  'Sabarmati',
  'Dandi',
  'Uranus',
  'Romania',
  'Hungary',
  'Kalach',
  '23-11',
  'Paulus',
  'sông Volga',
  'mũi giải vây Don',
  'bảo hiểm tiền gửi'
];

function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFC')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/(\d+)\.(\d+)/g, '$1,$2');
}

// Load lesson data
await import(pathToFileURL(lessonDataPath).href);
const lessons = globalThis.SEED_LESSONS;

if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
  console.error('❌ Failed to load SEED_LESSONS from lesson-data.js');
  process.exit(1);
}

let totalErrors = 0;
const report = [];

for (const lesson of lessons) {
  const sourceFileName = fileMapping[lesson.id];
  if (!sourceFileName) {
    console.error(`❌ No source file mapping defined for lesson ID "${lesson.id}"`);
    totalErrors++;
    continue;
  }

  const sourceFilePath = path.join(historyDir, sourceFileName);
  if (!fs.existsSync(sourceFilePath)) {
    console.error(`❌ Source file missing: ${sourceFilePath}`);
    totalErrors++;
    continue;
  }

  const sourceRaw = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceNorm = normalize(sourceRaw);

  // Extract all text content from the lesson
  const strings = [];
  function collect(obj, keyPath = '') {
    if (!obj) return;
    if (typeof obj === 'string') {
      if (
        keyPath.endsWith('.id') ||
        keyPath === 'id' ||
        keyPath === 'status' ||
        keyPath === 'class' ||
        keyPath === 'date' ||
        keyPath === 'isPilot' ||
        keyPath === 'explorationMode' ||
        keyPath.endsWith('Delta') ||
        keyPath.includes('comparisonMetrics')
      ) {
        return;
      }
      strings.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, idx) => collect(item, `${keyPath}[${idx}]`));
    } else if (typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        collect(obj[k], keyPath ? `${keyPath}.${k}` : k);
      }
    }
  }
  collect(lesson);
  const lessonText = strings.join(' ');
  const lessonNorm = normalize(lessonText);

  // 1. Check for forbidden terms
  const foundForbidden = [];
  for (const term of FORBIDDEN_UNGROUNDED_TERMS) {
    const termNorm = normalize(term);
    if (lessonNorm.toLowerCase().includes(termNorm.toLowerCase())) {
      foundForbidden.push(term);
    }
  }

  // 2. Extract 4-digit years (18xx, 19xx)
  const years = [...new Set(lessonNorm.match(/\b(18\d\d|19\d\d)\b/g) || [])];
  const missingYears = years.filter((y) => !sourceNorm.includes(y));

  // 3. Extract dates (d-m-yyyy, m-yyyy)
  const dates = [
    ...new Set(lessonNorm.match(/\b\d{1,2}-\d{1,2}-\d{4}\b/g) || []),
    ...new Set(lessonNorm.match(/\b\d{1,2}-\d{4}\b/g) || [])
  ];
  const missingDates = dates.filter((d) => !sourceNorm.includes(d));

  // 4. Extract transliterated proper nouns (e.g. Lê-nin, Xta-lin, Ru-dơ-ven, Hít-le...)
  const transliterated = [...new Set(lessonNorm.match(/\b[A-ZÀ-Ỹ][a-zà-ỹ]+(?:-[a-zà-ỹ]+)+\b/g) || [])];
  // Filter out non-historical transliterations if any
  const missingTrans = transliterated.filter((t) => !sourceNorm.includes(t));

  // 5. Extract decimal statistics (e.g. 2,0; 48,3; 4,2; 18,3; 53,8; 32,1...)
  const decimals = [...new Set(lessonNorm.match(/\b\d+,\d+\b/g) || [])];
  const missingDecimals = decimals.filter((d) => !sourceNorm.includes(d));

  const hasError =
    foundForbidden.length > 0 ||
    missingYears.length > 0 ||
    missingDates.length > 0 ||
    missingTrans.length > 0 ||
    missingDecimals.length > 0;

  if (hasError) totalErrors++;

  report.push({
    id: lesson.id,
    source: sourceFileName,
    years: { total: years.length, missing: missingYears },
    dates: { total: dates.length, missing: missingDates },
    transliterations: { total: transliterated.length, missing: missingTrans },
    decimals: { total: decimals.length, missing: missingDecimals },
    forbidden: foundForbidden,
    passed: !hasError
  });
}

// Print report
console.log('='.repeat(70));
console.log('📘 LESSON GROUNDING AUDIT REPORT (history_data/ vs lesson-data.js)');
console.log('='.repeat(70));

for (const r of report) {
  const icon = r.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${icon} [${r.id}] -> ${r.source}`);
  console.log(`   - 4-digit Years:       ${r.years.total} verified (${r.years.missing.length} missing)`);
  if (r.years.missing.length > 0) console.log(`     ⚠️ Missing years: ${r.years.missing.join(', ')}`);

  console.log(`   - Historical Dates:    ${r.dates.total} verified (${r.dates.missing.length} missing)`);
  if (r.dates.missing.length > 0) console.log(`     ⚠️ Missing dates: ${r.dates.missing.join(', ')}`);

  console.log(`   - Transliterations:    ${r.transliterations.total} verified (${r.transliterations.missing.length} missing)`);
  if (r.transliterations.missing.length > 0) console.log(`     ⚠️ Missing transliterations: ${r.transliterations.missing.join(', ')}`);

  console.log(`   - Decimal Statistics:  ${r.decimals.total} verified (${r.decimals.missing.length} missing)`);
  if (r.decimals.missing.length > 0) console.log(`     ⚠️ Missing decimals: ${r.decimals.missing.join(', ')}`);

  if (r.forbidden.length > 0) {
    console.log(`   ❌ FORBIDDEN TERMS DETECTED: ${r.forbidden.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(70));
if (totalErrors === 0) {
  console.log('🎉 ALL 4 LESSONS ARE 100% GROUNDED IN TEXTBOOK SOURCES!');
  console.log('='.repeat(70));
  process.exit(0);
} else {
  console.error(`💥 GROUNDING VERIFICATION FAILED: ${totalErrors} lesson(s) have ungrounded tokens.`);
  console.log('='.repeat(70));
  process.exit(1);
}
