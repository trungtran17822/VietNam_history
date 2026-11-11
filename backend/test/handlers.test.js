import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { handle, purgeExpired, CODE_ALPHABET, MAX_ANSWERS, SESSION_TTL_MS, RETENTION_MS } from '../src/handlers.js';
import { MemoryStore } from '../src/store.js';

globalThis.crypto ??= webcrypto;

function setup(start = Date.UTC(2026, 10, 3, 1, 0, 0)) {
  const clock = { t: start };
  const ctx = { store: new MemoryStore(), now: () => clock.t, allowedOrigins: 'http://localhost:8080,https://*.vercel.app' };
  const call = async (method, path, { body, key, origin, raw, headers: extra } = {}) => {
    const headers = { ...extra };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (key) headers['X-Teacher-Key'] = key;
    if (origin) headers.Origin = origin;
    const res = await handle(
      new Request(`http://api.test${path}`, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) }),
      ctx
    );
    const type = res.headers.get('Content-Type') || '';
    const data = res.status === 204 || res.status === 304 ? null : type.includes('json') ? await res.json() : new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, data };
  };
  const open = async () => (await call('POST', '/api/sessions', { body: { lessonId: 'bai-1-lien-xo' } })).data;
  return { ctx, clock, call, open };
}

const CLIENT_A = 'aaaaaaaa-1111-4111-8111-111111111111';
const CLIENT_B = 'bbbbbbbb-2222-4222-8222-222222222222';

test('health', async () => {
  const { call } = setup();
  const r = await call('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { ok: true });
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
});

test('create session returns a readable code and a 32-hex teacher key; only the hash is stored', async () => {
  const { ctx, call } = setup();
  const r = await call('POST', '/api/sessions', { body: { lessonId: 'bai-1-lien-xo' } });
  assert.equal(r.status, 201);
  assert.match(r.data.code, new RegExp(`^[${CODE_ALPHABET}]{6}$`));
  assert.doesNotMatch(r.data.code, /[01OIL]/);
  assert.match(r.data.teacherKey, /^[0-9a-f]{32}$/);
  const stored = await ctx.store.getSession(r.data.code);
  assert.notEqual(stored.teacherKeyHash, r.data.teacherKey);
  assert.match(stored.teacherKeyHash, /^[0-9a-f]{64}$/);
  assert.equal(stored.expiresAt - stored.createdAt, SESSION_TTL_MS);
});

test('create session rejects a bad lesson id', async () => {
  const { call } = setup();
  for (const body of [{}, { lessonId: '' }, { lessonId: 'Bad Id!' }, { lessonId: 5 }]) {
    const r = await call('POST', '/api/sessions', { body });
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.data.error, 'bad_request');
    assert.ok(r.data.message);
  }
});

test('public session read shows lesson and open state but no answers; code is case-insensitive', async () => {
  const { call, open } = setup();
  const s = await open();
  const r = await call('GET', `/api/sessions/${s.code.toLowerCase()}`);
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.data).sort(), ['code', 'expiresAt', 'lessonId', 'open']);
  assert.equal(r.data.open, true);
  assert.equal((await call('GET', '/api/sessions/ZZZZZZ')).status, 404);
  assert.equal((await call('GET', '/api/sessions/0OIL11')).status, 404);
});

test('answers insert, merge and replace per client; summary counts each device once', async () => {
  const { call, open } = setup();
  const s = await open();
  const base = `/api/sessions/${s.code}/answers`;
  assert.equal((await call('PUT', `${base}/${CLIENT_A}`, { body: { choices: { direction: 'frontal_allout', timing: 'dawn_tet5' }, durationSec: 100 } })).status, 200);
  assert.equal((await call('PUT', `${base}/${CLIENT_B}`, { body: { choices: { direction: 'flanking_multidirectional', timing: 'dawn_tet5' } } })).status, 200);
  // A changes their mind: replaces choices, keeps duration until a new one is sent
  await call('PUT', `${base}/${CLIENT_A}`, { body: { choices: { direction: 'siege_starvation', timing: 'dawn_tet5' } } });
  // A sends survey only: merges
  await call('PUT', `${base}/${CLIENT_A}`, { body: { ratings: { interest: 5, visualize: 4 }, durationSec: 999999 } });

  const r = await call('GET', `/api/sessions/${s.code}/summary`, { key: s.teacherKey });
  assert.equal(r.status, 200);
  assert.equal(r.data.count, 2);
  assert.deepEqual(r.data.distribution, {
    direction: { siege_starvation: 1, flanking_multidirectional: 1 },
    timing: { dawn_tet5: 2 }
  });
  assert.deepEqual(r.data.ratings.interest, { n: 1, avg: 5 });
  assert.deepEqual(r.data.ratings.again, { n: 0, avg: null });
});

test('answer validation rejects bad input and stores nothing', async () => {
  const { ctx, call, open } = setup();
  const s = await open();
  const url = `/api/sessions/${s.code}/answers/${CLIENT_A}`;
  const bad = [
    {},
    { choices: [] },
    { choices: { 'bad key': 'x' } },
    { choices: { a: '<script>' } },
    { choices: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`v${i}`, 'o'])) },
    { ratings: { interest: 6 } },
    { ratings: { interest: 2.5 } },
    { ratings: { name: 3 } },
    { durationSec: -1 },
    { durationSec: '10' }
  ];
  for (const body of bad) assert.equal((await call('PUT', url, { body })).status, 400, JSON.stringify(body));
  assert.equal((await call('PUT', url, { raw: '{not json' })).status, 400);
  assert.equal((await call('PUT', `/api/sessions/${s.code}/answers/short`, { body: { durationSec: 1 } })).status, 400);
  assert.equal((await ctx.store.listAnswers(s.code)).length, 0);
});

test('oversized body is refused with 413', async () => {
  const { call, open } = setup();
  const s = await open();
  const r = await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_A}`, { raw: JSON.stringify({ choices: { a: 'b' }, pad: 'x'.repeat(5000) }) });
  assert.equal(r.status, 413);
});

test('session is capped at MAX_ANSWERS new devices; existing devices can still update', async () => {
  const { call, open } = setup();
  const s = await open();
  const id = (i) => `client-${String(i).padStart(4, '0')}`;
  for (let i = 0; i < MAX_ANSWERS; i += 1) {
    assert.equal((await call('PUT', `/api/sessions/${s.code}/answers/${id(i)}`, { body: { durationSec: i } })).status, 200);
  }
  const full = await call('PUT', `/api/sessions/${s.code}/answers/${id(999)}`, { body: { durationSec: 1 } });
  assert.equal(full.status, 409);
  assert.equal(full.data.message, 'Phiên đã đủ số lượng.');
  assert.equal((await call('PUT', `/api/sessions/${s.code}/answers/${id(0)}`, { body: { durationSec: 5 } })).status, 200);
});

test('the cap holds when many new devices submit at the same time', async () => {
  const { call, open } = setup();
  const s = await open();
  const results = await Promise.all(
    Array.from({ length: MAX_ANSWERS + 10 }, (_, i) =>
      call('PUT', `/api/sessions/${s.code}/answers/burst-${String(i).padStart(4, '0')}`, { body: { durationSec: i } })
    )
  );
  assert.equal(results.filter((r) => r.status === 200).length, MAX_ANSWERS);
  assert.equal(results.filter((r) => r.status === 409).length, 10);
  assert.equal((await call('GET', `/api/sessions/${s.code}/summary`, { key: s.teacherKey })).data.count, MAX_ANSWERS);
});

test('summary answers 304 until an answer changes or the session closes', async () => {
  const { clock, call, open } = setup();
  const s = await open();
  const url = `/api/sessions/${s.code}/summary`;
  const first = await call('GET', url, { key: s.teacherKey });
  const etag = first.headers.get('ETag');
  assert.ok(etag);
  assert.equal((await call('GET', url, { key: s.teacherKey, headers: { 'If-None-Match': etag } })).status, 304);
  // Cloudflare turns the ETag weak when it compresses the response; the browser sends that back.
  assert.equal((await call('GET', url, { key: s.teacherKey, headers: { 'If-None-Match': `W/${etag}` } })).status, 304);
  // The ETag never stands in for the teacher key.
  assert.equal((await call('GET', url, { headers: { 'If-None-Match': etag } })).status, 403);

  await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_A}`, { body: { choices: { direction: 'frontal_allout' } } });
  const changed = await call('GET', url, { key: s.teacherKey, headers: { 'If-None-Match': etag } });
  assert.equal(changed.status, 200);
  assert.equal(changed.data.count, 1);
  const etag2 = changed.headers.get('ETag');
  assert.notEqual(etag2, etag);

  // Resubmitting the same answer still counts as a change (updatedAt moves).
  await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_A}`, { body: { choices: { direction: 'frontal_allout' } } });
  assert.equal((await call('GET', url, { key: s.teacherKey, headers: { 'If-None-Match': etag2 } })).status, 200);

  const etag3 = (await call('GET', url, { key: s.teacherKey })).headers.get('ETag');
  clock.t += SESSION_TTL_MS;
  const closed = await call('GET', url, { key: s.teacherKey, headers: { 'If-None-Match': etag3 } });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.open, false);
});

test('a partial update keeps the other fields', async () => {
  const { call, open } = setup();
  const s = await open();
  const url = `/api/sessions/${s.code}/answers/${CLIENT_A}`;
  await call('PUT', url, { body: { choices: { direction: 'frontal_allout' }, durationSec: 30 } });
  await call('PUT', url, { body: { ratings: { interest: 4 } } });
  await call('PUT', url, { body: { ratings: { visualize: 3 } } });
  const sum = (await call('GET', `/api/sessions/${s.code}/summary`, { key: s.teacherKey })).data;
  assert.deepEqual(sum.distribution, { direction: { frontal_allout: 1 } });
  assert.deepEqual(sum.ratings.interest, { n: 1, avg: 4 });
  assert.deepEqual(sum.ratings.visualize, { n: 1, avg: 3 });
  const csv = (await call('GET', `/api/sessions/${s.code}/export.csv`, { key: s.teacherKey })).data;
  assert.ok(csv.split('\r\n')[1].includes(',frontal_allout,30,4,3,,'));
});

test('expired session refuses answers with 410 but the teacher can still read and export', async () => {
  const { clock, call, open } = setup();
  const s = await open();
  await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_A}`, { body: { choices: { direction: 'frontal_allout' } } });
  clock.t += SESSION_TTL_MS;
  const r = await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_B}`, { body: { durationSec: 1 } });
  assert.equal(r.status, 410);
  assert.equal(r.data.message, 'Mã phiên không đúng hoặc đã hết hạn.');
  const summary = await call('GET', `/api/sessions/${s.code}/summary`, { key: s.teacherKey });
  assert.equal(summary.data.open, false);
  assert.equal(summary.data.count, 1);
});

test('teacher-only endpoints need the right key', async () => {
  const { call, open } = setup();
  const s = await open();
  const other = await open();
  for (const [method, path] of [
    ['GET', `/api/sessions/${s.code}/summary`],
    ['GET', `/api/sessions/${s.code}/export.csv`],
    ['DELETE', `/api/sessions/${s.code}`]
  ]) {
    assert.equal((await call(method, path)).status, 403);
    assert.equal((await call(method, path, { key: other.teacherKey })).status, 403);
    assert.equal((await call(method, path, { key: 'not-a-key' })).status, 403);
  }
});

test('CSV export: BOM, anonymous ids, one column per variable, formula-safe, no client ids', async () => {
  const { call, open } = setup();
  const s = await open();
  await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_A}`, { body: { choices: { direction: 'frontal_allout', timing: '-x' }, durationSec: 300, ratings: { interest: 4, visualize: 3, again: 5 } } });
  await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_B}`, { body: { choices: { direction: 'flanking_multidirectional' } } });
  const r = await call('GET', `/api/sessions/${s.code}/export.csv`, { key: s.teacherKey });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('Content-Type'), /text\/csv/);
  assert.match(r.headers.get('Content-Disposition'), new RegExp(`phien-${s.code}\\.csv`));
  assert.equal(r.data.charCodeAt(0), 0xfeff);
  const lines = r.data.slice(1).trim().split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'session_code,lesson_id,anonymous_id,direction,timing,duration_sec,rating_interest,rating_visualize,rating_again,updated_at_iso');
  assert.ok(lines[1].startsWith(`${s.code},bai-1-lien-xo,A01,frontal_allout,'-x,300,4,3,5,`));
  assert.ok(lines[2].includes(',A02,flanking_multidirectional,,,,,'));
  assert.ok(!r.data.includes(CLIENT_A) && !r.data.includes(CLIENT_B));
});

test('delete removes the session and its answers', async () => {
  const { ctx, call, open } = setup();
  const s = await open();
  await call('PUT', `/api/sessions/${s.code}/answers/${CLIENT_A}`, { body: { durationSec: 1 } });
  assert.equal((await call('DELETE', `/api/sessions/${s.code}`, { key: s.teacherKey })).status, 204);
  assert.equal((await call('GET', `/api/sessions/${s.code}`)).status, 404);
  assert.equal((await ctx.store.listAnswers(s.code)).length, 0);
});

test('purge deletes only sessions older than the retention window', async () => {
  const { ctx, clock, open } = setup();
  const old = await open();
  clock.t += RETENTION_MS - 1000;
  const recent = await open();
  clock.t += 2000;
  assert.equal(await purgeExpired(ctx.store, clock.t), 1);
  assert.equal(await ctx.store.getSession(old.code), null);
  assert.ok(await ctx.store.getSession(recent.code));
});

test('CORS: allowed origins (incl. wildcard) are echoed, others get no CORS headers', async () => {
  const { call } = setup();
  const ok = await call('GET', '/api/health', { origin: 'http://localhost:8080' });
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8080');
  const preview = await call('OPTIONS', '/api/sessions', { origin: 'https://vietnam-history-git-staging-abc.vercel.app' });
  assert.equal(preview.status, 204);
  assert.equal(preview.headers.get('Access-Control-Allow-Origin'), 'https://vietnam-history-git-staging-abc.vercel.app');
  assert.match(preview.headers.get('Access-Control-Allow-Headers'), /X-Teacher-Key/);
  const evil = await call('GET', '/api/health', { origin: 'https://evil.example' });
  assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
  const tricky = await call('GET', '/api/health', { origin: 'https://x.vercel.app.evil.example' });
  assert.equal(tricky.headers.get('Access-Control-Allow-Origin'), null);
});

test('unknown routes and methods', async () => {
  const { call } = setup();
  assert.equal((await call('GET', '/nope')).status, 404);
  assert.equal((await call('GET', '/api/sessions')).status, 405);
  assert.equal((await call('POST', '/api/health')).status, 405);
});
