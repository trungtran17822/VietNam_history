// Class session client (F10, F11). Contract: specs/001-classroom-sim-demo/contracts/api.md.
// The lesson never depends on this module: every failure is a ClassSessionError whose message is
// ready to show in Vietnamese.

// Deployed API origin (docs/devops/DEPLOY.md). Empty string turns class features off.
const DEPLOYED_API_BASE = 'https://sv-class-api.suviet.workers.dev';
const host = typeof location === 'undefined' ? '' : location.hostname;
const isLocal = ['localhost', '127.0.0.1', '', '[::1]'].includes(host);

export const API_CONFIG = {
  apiBase: (import.meta.env?.VITE_API_BASE as string | undefined) ?? (isLocal ? 'http://localhost:8787' : DEPLOYED_API_BASE),
  pollIntervalMs: 4000,
  backoffMs: 15000,
  requestTimeoutMs: 6000
};

const TEACHER_KEY_PREFIX = 'sv_class_teacher_';
const STUDENT_KEY = 'sv_class_student';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const MESSAGES = {
  not_configured: 'Máy chủ lớp học chưa được cấu hình cho trang này; bài học vẫn chạy bình thường trên máy này.',
  offline: 'Chưa kết nối được máy chủ lớp học; bài học vẫn chạy bình thường trên máy này.',
  invalid_code: 'Mã phiên gồm 6 ký tự, ví dụ K7M2QX.',
  wrong_lesson: 'Mã phiên này dành cho bài học khác.',
  not_joined: 'Thiết bị này chưa vào phiên lớp.',
  no_session: 'Chưa mở phiên lớp cho bài học này.'
} as const;

export class ClassSessionError extends Error {
  constructor(public code: string, message?: string | null, public status = 0) {
    super(message || MESSAGES[code as keyof typeof MESSAGES] || MESSAGES.offline);
    this.name = 'ClassSessionError';
  }
}

export type TeacherSession = { code: string; teacherKey: string; expiresAt: number };
export type Joined = { code: string; lessonId: string; clientId: string; joinedAt: number; expiresAt: number };
export type Summary = {
  code: string;
  lessonId: string;
  expiresAt: number;
  open: boolean;
  count: number;
  distribution: Record<string, Record<string, number>>;
  ratings?: Record<string, { n: number; avg: number }>;
};
export type Answer = { choices?: Record<string, string>; durationSec?: number; ratings?: Record<string, number | null> };

export const isConfigured = () => Boolean(API_CONFIG.apiBase);

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode: session state lasts for this page only. */
  }
}

export const normalizeCode = (input: string) => String(input || '').toUpperCase().replace(/[\s-]/g, '');
const isValidCode = (code: string) => code.length === 6 && [...code].every((c) => CODE_ALPHABET.includes(c));
export const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

async function request(method: string, path: string, options: { body?: unknown; teacherKey?: string; etag?: string | null } = {}) {
  if (!isConfigured()) throw new ClassSessionError('not_configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.requestTimeoutMs);
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.teacherKey) headers['X-Teacher-Key'] = options.teacherKey;
  if (options.etag) headers['If-None-Match'] = options.etag;
  let response: Response;
  try {
    response = await fetch(API_CONFIG.apiBase + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: 'no-store'
    });
  } catch {
    throw new ClassSessionError('offline');
  } finally {
    clearTimeout(timer);
  }
  if (response.ok || response.status === 304) return response;
  let data: { error?: string; message?: string } | null = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON error body */
  }
  throw new ClassSessionError(data?.error || 'server_error', data?.message, response.status);
}

// ---- Teacher -------------------------------------------------------------------------------

export function getTeacherSession(lessonId: string): TeacherSession | null {
  const saved = readJson<TeacherSession>(TEACHER_KEY_PREFIX + lessonId);
  return saved?.code && saved.teacherKey ? saved : null;
}

export async function openSession(lessonId: string): Promise<TeacherSession> {
  const data = await (await request('POST', '/api/sessions', { body: { lessonId } })).json();
  const saved = { code: data.code, teacherKey: data.teacherKey, expiresAt: data.expiresAt };
  writeJson(TEACHER_KEY_PREFIX + lessonId, saved);
  return saved;
}

function requireTeacher(lessonId: string): TeacherSession {
  const saved = getTeacherSession(lessonId);
  if (!saved) throw new ClassSessionError('no_session');
  return saved;
}

// Last summary per lesson: a poll where nothing changed (304) costs the server no answer reads.
const lastSummary: Record<string, { code: string; etag: string; summary: Summary } | null> = {};

export async function fetchSummary(lessonId: string): Promise<Summary> {
  const saved = requireTeacher(lessonId);
  const cached = lastSummary[lessonId]?.code === saved.code ? lastSummary[lessonId] : null;
  try {
    const response = await request('GET', `/api/sessions/${saved.code}/summary`, { teacherKey: saved.teacherKey, etag: cached?.etag });
    if (response.status === 304 && cached) return cached.summary;
    const summary = (await response.json()) as Summary;
    const etag = response.headers.get('ETag');
    lastSummary[lessonId] = etag ? { code: saved.code, etag, summary } : null;
    return summary;
  } catch (error) {
    // Deleted elsewhere or purged: forget it on this device.
    if (error instanceof ClassSessionError && (error.status === 404 || error.status === 403)) writeJson(TEACHER_KEY_PREFIX + lessonId, null);
    throw error;
  }
}

export async function exportCsv(lessonId: string): Promise<{ blob: Blob; filename: string }> {
  const saved = requireTeacher(lessonId);
  const response = await request('GET', `/api/sessions/${saved.code}/export.csv`, { teacherKey: saved.teacherKey });
  return { blob: await response.blob(), filename: `phien-${saved.code}.csv` };
}

export async function deleteSession(lessonId: string) {
  const saved = requireTeacher(lessonId);
  try {
    await request('DELETE', `/api/sessions/${saved.code}`, { teacherKey: saved.teacherKey });
  } catch (error) {
    if (!(error instanceof ClassSessionError) || error.status !== 404) throw error;
  }
  writeJson(TEACHER_KEY_PREFIX + lessonId, null);
}

// ---- Student -------------------------------------------------------------------------------

export function getJoined(lessonId?: string): Joined | null {
  const joined = readJson<Joined>(STUDENT_KEY);
  if (!joined || (lessonId && joined.lessonId !== lessonId)) return null;
  if (joined.expiresAt && Date.now() >= joined.expiresAt) {
    writeJson(STUDENT_KEY, null);
    return null;
  }
  return joined;
}

export async function join(rawCode: string, lessonId: string): Promise<Joined> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) throw new ClassSessionError('invalid_code');
  const data = await (await request('GET', `/api/sessions/${code}`)).json();
  if (!data.open) throw new ClassSessionError('closed', null, 410);
  if (data.lessonId !== lessonId) throw new ClassSessionError('wrong_lesson');
  const previous = getJoined(lessonId);
  const joined: Joined = {
    code,
    lessonId,
    // A new anonymous id per session, so a device cannot be linked across sessions.
    // getRandomValues also works on plain-http LAN addresses, where randomUUID is missing.
    clientId: previous?.code === code ? previous.clientId : [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''),
    joinedAt: Date.now(),
    expiresAt: data.expiresAt
  };
  writeJson(STUDENT_KEY, joined);
  return joined;
}

export const leave = () => writeJson(STUDENT_KEY, null);

export async function submit(lessonId: string, answer: Answer) {
  const joined = getJoined(lessonId);
  if (!joined) throw new ClassSessionError('not_joined');
  try {
    await request('PUT', `/api/sessions/${joined.code}/answers/${joined.clientId}`, { body: answer });
  } catch (error) {
    if (error instanceof ClassSessionError && (error.status === 404 || error.status === 410)) leave();
    throw error;
  }
}
