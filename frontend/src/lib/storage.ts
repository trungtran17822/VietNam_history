// Lessons live in localStorage (key kept from v1). Bundled lessons come from
// src/content/lessons/<id>.json and are only fetched when a browser needs to seed or update one.
import { nfc, today } from './text';
import { validateLesson, type Lesson, type Scene, type Status } from './lesson-schema';
import type { SimulationResult } from './engine';

export const STORAGE_KEY = 'history_sim_lessons_db_v2';
const SEEN_KEY = 'history_sim_seed_ids';
const RUNS_KEY = 'history_sim_student_runs';
const V1_SEEDS = ['ngoc-hoi-ha-hoi-1789', 'rach-gam-xoai-mut-1785', 'chi-lang-xuong-giang-1427', 'khang-chien-mong-nguyen-vuon-khong'];

export type SourceReview = {
  sourceRecognition: string;
  recognizedReference: string;
  claimStatus: 'pending' | 'teacher-reviewed';
  claim: string;
  sourceUrl: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};
export type AppLesson = Lesson & { sourceReview?: SourceReview; aiEditPrompt?: string };

// Plan fields a teacher owns: a newer bundled revision never overwrites them.
const PLAN_FIELDS = ['status', 'date', 'class', 'teacher', 'privateNotes', 'period'] as const;

// File name = lesson id. Revisions are read eagerly (a few bytes), content lazily.
const loaders = import.meta.glob<AppLesson>('../content/lessons/*.json', { import: 'default' });
const revisions = import.meta.glob<number | undefined>('../content/lessons/*.json', { import: 'revision', eager: true });
const idOf = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');
const bundledIds = () => Object.keys(loaders).map(idOf);
const pathOf = (id: string) => Object.keys(loaders).find((p) => idOf(p) === id);

async function loadBundled(id: string): Promise<AppLesson> {
  return nfc(structuredClone(await loaders[pathOf(id)!]()));
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (nfc(JSON.parse(raw)) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or blocked: the session keeps working, nothing persists. */
  }
}

export const DEFAULT_SCENE: Scene = { terrain: 'plain', labels: [], features: [], routes: [] };

/** v1 lesson (no schemaVersion) → v2 shape. Fields this app never wrote are left alone. */
export function upgradeV1(old: Record<string, any>): AppLesson {
  const sim = old.simulation ?? {};
  const colors = sim.factionColors ?? {};
  return {
    ...old,
    schemaVersion: 2,
    era: old.era ?? old.year ?? '',
    title: old.title ?? 'Bài học',
    teacher: old.teacher ?? '',
    class: old.class ?? '',
    date: old.date ?? today(),
    subject: old.subject ?? 'Lịch sử',
    grade: old.grade ?? '',
    objectives: old.objectives ?? '',
    focusQuestion: old.focusQuestion ?? '',
    status: old.status ?? 'Nháp',
    sections: old.sections ?? [],
    keyNotes: Array.isArray(old.keyNotes) ? old.keyNotes : [],
    privateNotes: old.privateNotes ?? '',
    questions: old.questions ?? [],
    factions: old.factions ?? {
      a: { name: 'Phe A', color: colors.taySon ?? colors.a ?? '#a8412f' },
      b: { name: 'Phe B', color: colors.qing ?? colors.b ?? '#3e5c76' }
    },
    simulation: { ...sim, scene: sim.scene ?? DEFAULT_SCENE }
  } as AppLesson;
}

function keepPlan(bundled: AppLesson, stored: Record<string, any>): AppLesson {
  const out: Record<string, unknown> = { ...bundled };
  for (const field of PLAN_FIELDS) if (stored[field] !== undefined) out[field] = stored[field];
  return out as AppLesson;
}

/**
 * Seeds, migrates and updates stored lessons. Idempotent: run once at startup.
 * - v1 lessons are upgraded once (a bundled lesson with the same id replaces content, keeps plan fields).
 * - A bundled lesson with a higher `revision` replaces stored content, keeping plan fields.
 * - A bundled lesson this browser has never seen is added; one the teacher deleted stays deleted.
 */
export async function initStorage(): Promise<void> {
  const stored = read<Record<string, any>[] | null>(STORAGE_KEY, null);
  const seen = new Set(read<string[]>(SEEN_KEY, []));
  const bundled = bundledIds();
  if (!stored) {
    write(STORAGE_KEY, await Promise.all(bundled.map(loadBundled)));
    write(SEEN_KEY, bundled);
    return;
  }
  // A v1 store was seeded with these four without recording it; a missing one was deleted by the teacher.
  if (!localStorage.getItem(SEEN_KEY)) V1_SEEDS.forEach((id) => seen.add(id));
  const revisionOf = (id: string) => revisions[pathOf(id)!] ?? 1;
  const next = await Promise.all(
    stored.map(async (lesson) => {
      const isBundled = bundled.includes(lesson.id);
      if (lesson.schemaVersion !== 2) return isBundled ? keepPlan(await loadBundled(lesson.id), lesson) : upgradeV1(lesson);
      if (isBundled && revisionOf(lesson.id) > (lesson.revision ?? 1)) return keepPlan(await loadBundled(lesson.id), lesson);
      return lesson as AppLesson;
    })
  );
  for (const id of bundled) {
    if (!seen.has(id) && !next.some((l) => l.id === id)) next.push(await loadBundled(id));
    seen.add(id);
  }
  write(STORAGE_KEY, next);
  write(SEEN_KEY, [...seen]);
}

export function getAllLessons(): AppLesson[] {
  const all = read<AppLesson[]>(STORAGE_KEY, []);
  return Array.isArray(all) ? all : [];
}

export function getLesson(id: string): AppLesson | null {
  return getAllLessons().find((l) => l.id === id) ?? null;
}

export function saveLesson(lesson: AppLesson): AppLesson {
  const all = getAllLessons();
  const clean = nfc(lesson);
  const index = all.findIndex((l) => l.id === clean.id);
  if (index >= 0) all[index] = clean;
  else all.push(clean);
  write(STORAGE_KEY, all);
  return clean;
}

export function deleteLesson(id: string) {
  write(STORAGE_KEY, getAllLessons().filter((l) => l.id !== id));
}

export const newId = (prefix = 'lesson') => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function duplicateLesson(id: string): AppLesson | null {
  const source = getLesson(id);
  if (!source) return null;
  const copy = structuredClone(source);
  copy.id = newId();
  copy.title = `${copy.title} (Bản sao)`;
  copy.status = 'Nháp';
  delete copy.revision;
  return saveLesson(copy);
}

/** FR-020: students see a lesson only when it is published and its date is today or earlier. */
export function isVisibleForStudent(lesson: Pick<Lesson, 'status' | 'date'> | null | undefined): boolean {
  if (!lesson || lesson.status !== ('Đã dạy' satisfies Status) || !lesson.date) return false;
  return String(lesson.date).trim().slice(0, 10) <= today();
}

export function getVisibleForStudent(): AppLesson[] {
  return getAllLessons().filter(isVisibleForStudent);
}

export function exportJSON(): string {
  return JSON.stringify(getAllLessons(), null, 2);
}

/** Replaces the stored lessons with a file's content after validating every lesson (trust boundary). */
export function importJSON(json: string): { ok: boolean; message: string } {
  let parsed: unknown;
  try {
    parsed = nfc(JSON.parse(json));
  } catch (error) {
    return { ok: false, message: `Lỗi đọc tệp JSON: ${(error as Error).message}` };
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray((parsed as any)?.lessons) ? (parsed as any).lessons : (parsed as any)?.id ? [parsed] : null;
  if (!list) return { ok: false, message: 'Định dạng JSON không hợp lệ. Phải là mảng danh sách bài học.' };
  const lessons = list.filter((l: any) => l && l.id && l.title).map((l: any) => (l.schemaVersion === 2 ? l : upgradeV1(l)));
  if (!lessons.length) return { ok: false, message: 'Không tìm thấy bài giảng hợp lệ trong tệp JSON đã tải.' };
  for (const lesson of lessons) {
    const issues = validateLesson(lesson);
    if (issues.length) return { ok: false, message: `Bài "${lesson.title}" chưa hợp lệ: ${issues.slice(0, 3).join('; ')}` };
  }
  write(STORAGE_KEY, lessons);
  return { ok: true, message: `Nhập thành công ${lessons.length} bài giảng!` };
}

export async function resetToDefaults(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SEEN_KEY);
  await initStorage();
}

/** Where the lesson page's player was left, per lesson (resume on next visit). */
export type LessonProgress = { progress: number; chapter: number };
export const getLessonProgress = (lessonId: string) => read<LessonProgress>(`history_lesson_progress_${lessonId}`, { progress: 0, chapter: 0 });
export const saveLessonProgress = (lessonId: string, value: LessonProgress) => write(`history_lesson_progress_${lessonId}`, value);

export type StudentRun = SimulationResult & { timestamp: string };

export function saveStudentRun(lessonId: string, run: SimulationResult) {
  const runs = read<Record<string, StudentRun>>(RUNS_KEY, {});
  runs[lessonId] = { ...run, timestamp: new Date().toISOString() };
  write(RUNS_KEY, runs);
}

export function getStudentRun(lessonId: string): StudentRun | null {
  return read<Record<string, StudentRun>>(RUNS_KEY, {})[lessonId] ?? null;
}
