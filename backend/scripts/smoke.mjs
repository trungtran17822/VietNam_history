// End-to-end smoke test against a running API (wrangler dev, or the deployed Worker).
// Usage: node backend/scripts/smoke.mjs <base-url> [origin]
// Opens a session, sends a burst of MAX_ANSWERS + 10 new devices at once, checks the cap,
// partial updates, the 304 summary path, CSV and CORS, then deletes the session.
const base = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
const origin = process.argv[3] || 'https://example.vercel.app';
const MAX = 60;

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures += 1;
}

async function call(method, path, { body, key, headers = {} } = {}) {
  const h = { Origin: origin, ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (key) h['X-Teacher-Key'] = key;
  const res = await fetch(base + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const type = res.headers.get('Content-Type') || '';
  const data = res.status === 204 || res.status === 304 ? null : type.includes('json') ? await res.json() : await res.text();
  return { status: res.status, headers: res.headers, data };
}

const health = await call('GET', '/api/health');
check('health', health.status === 200);
check('CORS echoes allowed origin', health.headers.get('Access-Control-Allow-Origin') === origin);

const opened = await call('POST', '/api/sessions', { body: { lessonId: 'ngoc-hoi-ha-hoi-1789' } });
check('open session', opened.status === 201, opened.data && opened.data.code);
const { code, teacherKey } = opened.data;
const answer = (id) => `/api/sessions/${code}/answers/${id}`;
const summaryUrl = `/api/sessions/${code}/summary`;

const t0 = Date.now();
const ids = Array.from({ length: MAX + 10 }, (_, i) => `smoke-${String(i).padStart(4, '0')}`);
const burst = await Promise.all(
  ids.map((id, i) =>
    call('PUT', answer(id), {
      body: { choices: { direction: i % 2 ? 'frontal_allout' : 'flanking_multidirectional' }, durationSec: i }
    })
  )
);
const ms = Date.now() - t0;
const ok200 = burst.filter((r) => r.status === 200).length;
const full409 = burst.filter((r) => r.status === 409).length;
check(`burst of ${MAX + 10} concurrent new devices`, ok200 === MAX && full409 === 10, `${ok200}×200, ${full409}×409, ${ms} ms`);
// Which devices got in is a race; later steps use two that did.
const [inA, inB] = ids.filter((_, i) => burst[i].status === 200);

const first = await call('GET', summaryUrl, { key: teacherKey });
check('summary count is capped', first.data.count === MAX, String(first.data.count));
const etag = first.headers.get('ETag');
check('summary has an ETag', Boolean(etag), etag);
const same = await call('GET', summaryUrl, { key: teacherKey, headers: { 'If-None-Match': etag } });
check('unchanged summary answers 304', same.status === 304);

await call('PUT', answer(inA), { body: { ratings: { interest: 5 } } });
await call('PUT', answer(inA), { body: { ratings: { again: 4 } } });
const after = await call('GET', summaryUrl, { key: teacherKey, headers: { 'If-None-Match': etag } });
check('summary changes after an update', after.status === 200);
check('partial updates merge', after.data.ratings.interest.avg === 5 && after.data.ratings.again.avg === 4 && after.data.count === MAX);
const upd = await call('PUT', answer(inB), { body: { durationSec: 1 } });
check('existing device can update when full', upd.status === 200, `${upd.status} ${JSON.stringify(upd.data)}`);

const csv = await call('GET', `/api/sessions/${code}/export.csv`, { key: teacherKey });
const rows = csv.data.trim().split('\r\n');
check('CSV has one row per device, no client ids', rows.length === MAX + 1 && !csv.data.includes('smoke-'));

check('delete', (await call('DELETE', `/api/sessions/${code}`, { key: teacherKey })).status === 204);
check('deleted code is gone', (await call('GET', `/api/sessions/${code}`)).status === 404);

console.log(failures ? `${failures} check(s) failed` : 'all checks passed');
process.exit(failures ? 1 : 0);
