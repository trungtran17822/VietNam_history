// Class session API (contract: specs/001-classroom-sim-demo/contracts/api.md).
// `handle(request, ctx)` takes a standard Request and returns a Response, so the same code runs
// on Cloudflare Workers (index.js) and in Node (dev-server.js, tests).
// ctx = { store, now?: () => number, allowedOrigins?: string }

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
export const MAX_ANSWERS = 60;
export const MAX_BODY_BYTES = 4096;
export const MAX_DURATION_SEC = 7200;
const RATING_KEYS = ['interest', 'visualize', 'again'];

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const LESSON_RE = /^[a-z0-9-]{1,64}$/;
const CLIENT_RE = /^[A-Za-z0-9-]{8,64}$/;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{6}$`);
const KEY_RE = /^[0-9a-f]{32}$/;

const MESSAGES = {
  bad_request: 'Dữ liệu gửi lên không hợp lệ.',
  forbidden: 'Không có quyền xem phiên này.',
  not_found: 'Mã phiên không đúng hoặc đã hết hạn.',
  closed: 'Mã phiên không đúng hoặc đã hết hạn.',
  full: 'Phiên đã đủ số lượng.',
  too_large: 'Dữ liệu gửi lên quá lớn.',
  method_not_allowed: 'Phương thức không được hỗ trợ.',
  server_error: 'Máy chủ lớp học đang gặp sự cố.'
};
const STATUS = {
  bad_request: 400,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  full: 409,
  closed: 410,
  too_large: 413,
  server_error: 500
};

class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function randomString(alphabet, length) {
  // Rejection sampling keeps the distribution uniform.
  const out = [];
  const limit = 256 - (256 % alphabet.length);
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join('');
}

function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

async function readJson(request) {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) throw new ApiError('too_large');
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new ApiError('too_large');
  try {
    const body = JSON.parse(text || '{}');
    if (!isPlainObject(body)) throw new Error('not an object');
    return body;
  } catch {
    throw new ApiError('bad_request');
  }
}

function parseChoices(raw) {
  if (!isPlainObject(raw)) throw new ApiError('bad_request');
  const entries = Object.entries(raw);
  if (entries.length > 10) throw new ApiError('bad_request');
  for (const [k, v] of entries) {
    if (!ID_RE.test(k) || typeof v !== 'string' || !ID_RE.test(v)) throw new ApiError('bad_request');
  }
  return Object.fromEntries(entries);
}

function parseRatings(raw) {
  if (!isPlainObject(raw)) throw new ApiError('bad_request');
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!RATING_KEYS.includes(k)) throw new ApiError('bad_request');
    if (v === null) {
      out[k] = null;
      continue;
    }
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new ApiError('bad_request');
    out[k] = v;
  }
  return out;
}

function parseDuration(raw) {
  if (!Number.isInteger(raw) || raw < 0) throw new ApiError('bad_request');
  return Math.min(raw, MAX_DURATION_SEC);
}

async function loadSession(store, code) {
  if (!CODE_RE.test(code)) throw new ApiError('not_found');
  const session = await store.getSession(code);
  if (!session) throw new ApiError('not_found');
  return session;
}

async function requireTeacher(request, session) {
  const key = request.headers.get('X-Teacher-Key') || '';
  if (!KEY_RE.test(key) || !timingSafeEqual(await sha256Hex(key), session.teacherKeyHash)) {
    throw new ApiError('forbidden');
  }
}

// Weak comparison (RFC 9110 §13.1.2): Cloudflare marks ETags weak (W/"…") when it compresses
// a response, and the browser sends that form back.
function etagMatches(header, etag) {
  if (!header) return false;
  return header.split(',').some((t) => t.trim().replace(/^W\//, '') === etag);
}

function publicSession(session, now) {
  return { code: session.code, lessonId: session.lessonId, expiresAt: session.expiresAt, open: now < session.expiresAt };
}

function summarize(session, answers, now) {
  const distribution = {};
  const sums = Object.fromEntries(RATING_KEYS.map((k) => [k, { n: 0, total: 0 }]));
  let updatedAt = session.createdAt;
  for (const a of answers) {
    for (const [variable, option] of Object.entries(a.choices)) {
      distribution[variable] ??= {};
      distribution[variable][option] = (distribution[variable][option] || 0) + 1;
    }
    for (const k of RATING_KEYS) {
      if (a.ratings[k] != null) {
        sums[k].n += 1;
        sums[k].total += a.ratings[k];
      }
    }
    updatedAt = Math.max(updatedAt, a.updatedAt);
  }
  const ratings = Object.fromEntries(
    RATING_KEYS.map((k) => [k, { n: sums[k].n, avg: sums[k].n ? Math.round((sums[k].total / sums[k].n) * 10) / 10 : null }])
  );
  return { ...publicSession(session, now), count: answers.length, distribution, ratings, updatedAt };
}

function csvCell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(session, answers) {
  const variables = [...new Set(answers.flatMap((a) => Object.keys(a.choices)))].sort();
  const header = [
    'session_code',
    'lesson_id',
    'anonymous_id',
    ...variables,
    'duration_sec',
    'rating_interest',
    'rating_visualize',
    'rating_again',
    'updated_at_iso'
  ];
  const rows = answers.map((a, i) => [
    session.code,
    session.lessonId,
    `A${String(i + 1).padStart(2, '0')}`,
    ...variables.map((v) => a.choices[v] ?? ''),
    a.durationSec,
    a.ratings.interest,
    a.ratings.visualize,
    a.ratings.again,
    new Date(a.updatedAt).toISOString()
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// ---- endpoints -------------------------------------------------------------

async function createSession(request, { store, now }) {
  const body = await readJson(request);
  if (typeof body.lessonId !== 'string' || !LESSON_RE.test(body.lessonId)) throw new ApiError('bad_request');
  const teacherKey = randomHex(16);
  const teacherKeyHash = await sha256Hex(teacherKey);
  const createdAt = now();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const session = {
      code: randomString(CODE_ALPHABET, 6),
      lessonId: body.lessonId,
      teacherKeyHash,
      createdAt,
      expiresAt: createdAt + SESSION_TTL_MS
    };
    if (await store.createSession(session)) {
      return json(201, { code: session.code, teacherKey, lessonId: session.lessonId, expiresAt: session.expiresAt });
    }
  }
  throw new ApiError('server_error');
}

async function putAnswer(request, { store, now }, code, clientId) {
  if (!CLIENT_RE.test(clientId)) throw new ApiError('bad_request');
  const body = await readJson(request);
  const session = await loadSession(store, code);
  const t = now();
  if (t >= session.expiresAt) throw new ApiError('closed');

  const patch = {};
  if ('choices' in body) patch.choices = parseChoices(body.choices);
  if ('durationSec' in body) patch.durationSec = parseDuration(body.durationSec);
  if ('ratings' in body) patch.ratings = parseRatings(body.ratings);
  if (!Object.keys(patch).length) throw new ApiError('bad_request');

  if (!(await store.saveAnswer(code, clientId, patch, t, MAX_ANSWERS))) throw new ApiError('full');
  return json(200, { ok: true });
}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

function errorResponse(code) {
  return json(STATUS[code] || 500, { error: code, message: MESSAGES[code] || MESSAGES.server_error });
}

async function route(request, ctx) {
  const { pathname } = new URL(request.url);
  const parts = pathname.split('/').filter(Boolean); // ['api', 'sessions', code, ...]
  const method = request.method;
  if (parts[0] !== 'api') throw new ApiError('not_found');

  if (parts.length === 2 && parts[1] === 'health') {
    if (method !== 'GET') throw new ApiError('method_not_allowed');
    return json(200, { ok: true });
  }
  if (parts[1] !== 'sessions') throw new ApiError('not_found');

  if (parts.length === 2) {
    if (method !== 'POST') throw new ApiError('method_not_allowed');
    return createSession(request, ctx);
  }

  const code = (parts[2] || '').toUpperCase();
  if (parts.length === 3) {
    if (method === 'GET') return json(200, publicSession(await loadSession(ctx.store, code), ctx.now()));
    if (method === 'DELETE') {
      const session = await loadSession(ctx.store, code);
      await requireTeacher(request, session);
      await ctx.store.deleteSession(code);
      return new Response(null, { status: 204 });
    }
    throw new ApiError('method_not_allowed');
  }
  if (parts.length === 5 && parts[3] === 'answers') {
    if (method !== 'PUT') throw new ApiError('method_not_allowed');
    return putAnswer(request, ctx, code, parts[4]);
  }
  if (parts.length === 4 && (parts[3] === 'summary' || parts[3] === 'export.csv')) {
    if (method !== 'GET') throw new ApiError('method_not_allowed');
    const session = await loadSession(ctx.store, code);
    await requireTeacher(request, session);
    if (parts[3] === 'summary') {
      // The teacher polls every few seconds; most polls change nothing. The ETag comes from the
      // session row (version bumps on every answer write), so a 304 costs no answer reads.
      const now = ctx.now();
      const etag = `"v${session.version}-${now < session.expiresAt ? 1 : 0}"`;
      if (etagMatches(request.headers.get('If-None-Match'), etag)) return new Response(null, { status: 304, headers: { ETag: etag } });
      return json(200, summarize(session, await ctx.store.listAnswers(code), now), { ETag: etag });
    }
    const answers = await ctx.store.listAnswers(code);
    return new Response(toCsv(session, answers), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="phien-${code}.csv"`
      }
    });
  }
  throw new ApiError('not_found');
}

function corsHeaders(request, allowedOrigins) {
  const origin = request.headers.get('Origin');
  const allowed = (allowedOrigins || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Entries may use one leading wildcard label, e.g. https://*.vercel.app
  const matches = (pattern) =>
    pattern === '*' ||
    pattern === origin ||
    (pattern.includes('*') &&
      new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('*', '[a-z0-9-]+')}$`).test(origin));
  if (!origin || !allowed.some(matches)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Teacher-Key, If-None-Match',
    'Access-Control-Expose-Headers': 'Content-Disposition, ETag',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

export async function handle(request, ctx) {
  const fullCtx = { now: Date.now, ...ctx };
  const cors = corsHeaders(request, ctx.allowedOrigins);
  let response;
  if (request.method === 'OPTIONS') {
    response = new Response(null, { status: 204 });
  } else {
    try {
      response = await route(request, fullCtx);
    } catch (err) {
      if (!(err instanceof ApiError)) console.error('handler error', err && err.message);
      response = errorResponse(err instanceof ApiError ? err.code : 'server_error');
    }
  }
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status, headers });
}

export async function purgeExpired(store, now = Date.now()) {
  return store.purgeBefore(now - RETENTION_MS);
}
