import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  atlasQueryString, decodeAtlasState, encodeAtlasState, filterLandmarks, fold, levenshtein, score, searchProvinces,
} from '../../frontend/src/features/atlas/search.ts';

const landmarks = JSON.parse(readFileSync(new URL('../../frontend/src/content/atlas/landmarks.json', import.meta.url), 'utf8'));
const names = { 'ha-noi': 'Hà Nội', hue: 'Huế' };
const ids = (hits) => hits.map((h) => h.item.id);

test('fold strips Vietnamese diacritics and đ', () => {
  assert.equal(fold('  Hạ   Hồi '), 'ha hoi');
  assert.equal(fold('Đống Đa'), 'dong da');
  assert.equal(fold('Thành Cổ Loa'), fold('thanh co loa'));
  assert.equal(fold('Hạ Hồi'.normalize('NFD')), 'ha hoi'); // decomposed input folds the same
});

test('levenshtein', () => {
  assert.equal(levenshtein('dong', 'dong'), 0);
  assert.equal(levenshtein('dien', 'dein'), 2);
  assert.equal(levenshtein('', 'abc'), 3);
});

test('GeoGnos tiers: exact > prefix > alias > word prefix > contains > region > fuzzy', () => {
  const item = { name: 'Gò Đống Đa', aliases: ['Đống Đa'] };
  assert.equal(score(item, 'go dong da'), 1000);
  assert.equal(score(item, 'gò'), 550); // prefix + exact diacritics bonus
  assert.equal(score(item, 'dong da'), 400);
  assert.equal(score(item, 'dong'), 350);
  assert.equal(score({ name: 'Hoàng thành Thăng Long' }, 'thanh thang'), 200);
  assert.equal(score({ name: 'Văn Miếu' }, 'ha noi', 'Hà Nội'), 100);
  assert.equal(score({ name: 'Điện Biên Phủ' }, 'dein'), 10); // 4+ letters, distance 2
  assert.equal(score({ name: 'Điện Biên Phủ' }, 'xyz'), 0);
  assert.equal(score(item, '   '), 0);
});

test('diacritic-insensitive search finds the right landmark first', () => {
  const top = (q) => ids(filterLandmarks(landmarks, { query: q }, (id) => names[id] ?? ''))[0];
  assert.equal(top('dong da'), 'dong-da');
  assert.equal(top('Hạ Hồi'), 'ha-hoi');
  assert.equal(top('ha hoi'), 'ha-hoi');
  assert.equal(top('dien bien'), 'dien-bien-phu');
  assert.equal(top('dien bein phu'), 'dien-bien-phu'); // typo
  assert.equal(top('ho guom'), 'ho-hoan-kiem'); // alias
  assert.equal(top('thang long'), 'hoang-thanh-thang-long');
});

test('kind filter matches kind or tags and always applies', () => {
  const capitals = ids(filterLandmarks(landmarks, { kinds: ['kinh-do'] }));
  assert.ok(capitals.includes('co-loa') && capitals.includes('kinh-thanh-hue'));
  const unesco = ids(filterLandmarks(landmarks, { kinds: ['unesco'] }));
  assert.ok(unesco.includes('hoang-thanh-thang-long'), 'tagged capital shows under UNESCO');
  assert.ok(!ids(filterLandmarks(landmarks, { kinds: ['danh-thang'], query: 'dong da' })).includes('dong-da'));
  assert.equal(filterLandmarks(landmarks, {}).length, landmarks.length);
});

test('province search', () => {
  const provinces = [{ id: 'quang-tri', name: 'Quảng Trị', type: 'tinh', region: 'Trung Bộ' }, { id: 'quang-ngai', name: 'Quảng Ngãi', type: 'tinh', region: 'Trung Bộ' }];
  assert.equal(searchProvinces(provinces, 'quang ngai')[0].item.id, 'quang-ngai');
  assert.equal(searchProvinces(provinces, 'quang').length, 2);
});

test('URL state round-trips and rejects junk', () => {
  const state = { place: 'dong-da', kinds: ['chien-truong', 'kinh-do'], q: 'Đống Đa' };
  assert.deepEqual(decodeAtlasState(atlasQueryString(state)), state);
  assert.deepEqual(decodeAtlasState(new URLSearchParams(encodeAtlasState(state))), state);
  assert.deepEqual(decodeAtlasState({ place: 'Bad Id!', kind: 'unesco,nope,unesco', q: 42 }), { place: undefined, kinds: ['unesco'], q: '42' });
  assert.deepEqual(decodeAtlasState({ kind: ['kinh-do', 'unesco'] }).kinds, ['kinh-do', 'unesco']);
  assert.equal(atlasQueryString({ kinds: [], q: '  ' }), '');
  assert.equal(decodeAtlasState('q=' + 'x'.repeat(200)).q.length, 80);
});
