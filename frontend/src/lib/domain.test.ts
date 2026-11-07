// SC-002 (determinism over all 81 combinations), SC-008 (no grading words), FR-006 (numbers trace
// to coefficients), FR-020 (visibility), the lesson contract and the v1 → v2 storage migration.
import { beforeEach, describe, expect, test } from 'vitest';
import pilotJson from '../content/lessons/ngoc-hoi-ha-hoi-1789.json';
import { calculate, generateExplanation, originalChoices, type Choices } from './engine';
import { playabilityIssues, validateLesson, type Lesson } from './lesson-schema';
import { nfc, today } from './text';

const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, String(v)),
    removeItem: (k: string) => void memory.delete(k)
  }
});
const storage = await import('./storage');

const pilot = pilotJson as unknown as Lesson;
const variables = pilot.question!.variables;
const combos: Choices[] = variables.reduce<Choices[]>((acc, v) => acc.flatMap((c) => v.options.map((o) => ({ ...c, [v.id]: o.id }))), [{}]);
const lessonFiles = import.meta.glob('../content/lessons/*.json', { eager: true, import: 'default' });

describe('lesson contract (plan §4.1)', () => {
  test.each(Object.entries(lessonFiles))('%s is a valid v2 lesson in NFC', (path, lesson) => {
    expect(validateLesson(lesson)).toEqual([]);
    expect((lesson as Lesson).id).toBe(path.split('/').pop()!.replace('.json', ''));
    expect(JSON.stringify(lesson)).toBe(JSON.stringify(nfc(lesson)));
  });

  test('pilot runs all 6 stages: 4 variables x 3 options, one original with zero deltas', () => {
    expect(playabilityIssues(pilot)).toEqual([]);
    expect(combos).toHaveLength(81);
  });

  test('a variable with two originals or a non-zero original is rejected', () => {
    const broken = structuredClone(pilot);
    broken.question!.variables[0].options[1].isOriginal = true;
    expect(validateLesson(broken).join(' ')).toContain('đúng 1 phương án gốc');
    const nonZero = structuredClone(pilot);
    nonZero.question!.variables[0].options[0].timeDelta = 3;
    expect(validateLesson(nonZero).join(' ')).toContain('bằng 0');
  });
});

const allCombos = (l: Lesson) => (l.question?.variables ?? []).reduce<Choices[]>((acc, v) => acc.flatMap((c) => v.options.map((o) => ({ ...c, [v.id]: o.id }))), [{}]);
const gradingWords = new RegExp(`(^|[^\\p{L}])(${['sai lầm', 'sai', 'thất bại', 'kém', 'tệ', 'dở', 'ngu'].join('|')})(?=$|[^\\p{L}])`, 'iu');

describe('lesson contract: every bundled lesson reaches stage 6 (plan §4.1, S2)', () => {
  test.each(Object.entries(lessonFiles))('%s has full content, sources and scene', (_, json) => {
    const l = json as Lesson;
    expect(playabilityIssues(l)).toEqual([]);
    expect(l.introSummary?.length).toBeGreaterThan(0);
    expect(l.sections.length).toBeGreaterThanOrEqual(4);
    for (const s of l.sections) {
      expect(s.source?.book, s.id).toBeTruthy();
      // An unread quote stays empty and says so; never a paraphrase in its place.
      if (!s.source?.quote) expect(s.source?.note, s.id).toContain('Cần bổ sung trích dẫn nguyên văn');
    }
    expect(l.keyNotes?.length).toBeGreaterThan(0);
    expect(l.privateNotes).toBeTruthy();
    expect(l.question?.character?.name).toBeTruthy();
    expect(l.questions.some((q) => q.type === 'open_discussion')).toBe(true);
    for (const q of l.questions) {
      if (q.type === 'multiple_choice') for (const o of q.options ?? []) expect(o.explanation, o.id).toBeTruthy();
    }
    expect(l.baseline).toBeTruthy();
    expect(Object.keys(l.simulation.outcomes ?? {}).sort()).toEqual(['challenging', 'moderate', 'perfect', 'positive']);
    expect(l.simulation.keyframes?.length).toBeGreaterThan(0);
    expect(l.factions).toBeTruthy();
    expect(l.simulation.scene?.features.length).toBeGreaterThan(0);
    expect(l.atlasPlaceIds?.length).toBeGreaterThan(0);
  });

  test.each(Object.entries(lessonFiles))('%s: every combination is sane, explained and never grades', (_, json) => {
    const l = json as Lesson;
    const b = l.baseline!;
    const combos = allCombos(l);
    expect(combos.filter((c) => calculate(l, c).isIdenticalToOriginal)).toEqual([originalChoices(l)]);
    for (const choices of combos) {
      const r = calculate(l, choices);
      // Unclamped: the declared deltas alone keep every result in range.
      expect(b.durationHours + r.student.timeDelta).toBeGreaterThanOrEqual(b.minDurationHours ?? 12);
      expect(b.casualties + r.student.casualtyDelta).toBeGreaterThanOrEqual(b.minCasualties ?? 500);
      expect(b.positionScore + r.student.scoreDelta).toBeLessThanOrEqual(100);
      // ponytail: the pilot's worst combination dips below the score floor (raw -2, shown as 10); S2 lessons stay above it.
      if (!l.isPilot) expect(b.positionScore + r.student.scoreDelta).toBeGreaterThanOrEqual(10);
      const e = generateExplanation(l, choices);
      expect(e.variablePoints).toHaveLength(l.question!.variables.length);
      for (const t of [r.student.outcomeSummary, e.intro, e.encouragement, ...e.variablePoints.map((p) => p.text)]) {
        expect(t, t).toBeTruthy();
        expect(t.normalize('NFC').match(gradingWords), t).toBeNull();
      }
    }
  });
});

describe('engine', () => {
  test('deterministic: every combination gives identical numbers on a second run (SC-002)', () => {
    for (const choices of combos) expect(calculate(structuredClone(pilot), { ...choices })).toEqual(calculate(pilot, choices));
  });

  test('exactly one combination equals the original, and it reproduces the baseline', () => {
    const identical = combos.filter((c) => calculate(pilot, c).isIdenticalToOriginal);
    expect(identical).toEqual([originalChoices(pilot)]);
    const r = calculate(pilot, identical[0]);
    expect([r.student.durationHours, r.student.casualties, r.student.positionScore]).toEqual([36, 1800, 95]);
  });

  test('every number traces back to declared coefficients (FR-006)', () => {
    const b = pilot.baseline!;
    for (const choices of combos) {
      const r = calculate(pilot, choices);
      expect(r.appliedAssumptions).toHaveLength(variables.length);
      const picked = variables.map((v) => v.options.find((o) => o.id === choices[v.id])!);
      const sum = (k: 'timeDelta' | 'casualtyDelta' | 'positionScoreDelta') => picked.reduce((s, o) => s + o[k], 0);
      expect(r.student.durationHours).toBe(Math.max(12, b.durationHours + sum('timeDelta')));
      expect(r.student.casualties).toBe(Math.max(500, b.casualties + sum('casualtyDelta')));
      expect(r.student.positionScore).toBe(Math.min(100, Math.max(10, b.positionScore + sum('positionScoreDelta'))));
    }
  });

  test('no explanation or outcome text grades the student (SC-008)', () => {
    const words = ['sai lầm', 'sai', 'thất bại', 'kém', 'tệ', 'dở', 'ngu'];
    const pattern = new RegExp(`(^|[^\\p{L}])(${words.join('|')})(?=$|[^\\p{L}])`, 'iu');
    for (const lesson of [pilot, { question: pilot.question }] as Lesson[]) {
      for (const choices of combos) {
        const r = calculate(lesson, choices);
        const e = generateExplanation(lesson, choices);
        expect(e.variablePoints.length).toBe(lesson.explanations ? 4 : 0);
        for (const t of [r.student.outcomeSummary, e.intro, e.encouragement, ...e.variablePoints.map((p) => p.text)]) {
          expect(t.normalize('NFC').match(pattern), t).toBeNull();
        }
      }
    }
  });
});

describe('storage', () => {
  beforeEach(() => memory.clear());

  test('students only see lessons that are published and not in the future (FR-020)', () => {
    const visible = storage.isVisibleForStudent;
    expect(visible({ status: 'Đã dạy', date: '2020-01-01' })).toBe(true);
    expect(visible({ status: 'Đã dạy', date: today() })).toBe(true);
    expect(visible({ status: 'Đã dạy', date: '2999-01-01' })).toBe(false);
    expect(visible({ status: 'Nháp', date: '2020-01-01' })).toBe(false);
    expect(visible({ status: 'Đã lên lịch', date: '2020-01-01' })).toBe(false);
  });

  test('a fresh browser is seeded with every bundled lesson', async () => {
    await storage.initStorage();
    expect(storage.getAllLessons().map((l) => l.id).sort()).toEqual(Object.keys(lessonFiles).map((p) => p.split('/').pop()!.replace('.json', '')).sort());
  });

  test('v1 data migrates once: bundled content wins, the teacher plan and own lessons stay', async () => {
    const v1Pilot = { id: 'ngoc-hoi-ha-hoi-1789', title: 'Cũ', status: 'Nháp', date: '2026-01-02', privateNotes: 'ghi chú của tôi', simulation: {} };
    const own = { id: 'lesson-abc', title: 'Bài của tôi', status: 'Nháp', sections: [], simulation: { factionColors: { taySon: '#111111', qing: '#222222' } } };
    memory.set(storage.STORAGE_KEY, JSON.stringify([v1Pilot, own]));
    await storage.initStorage();
    const pilotAfter = storage.getLesson('ngoc-hoi-ha-hoi-1789')!;
    expect(pilotAfter.schemaVersion).toBe(2);
    expect(pilotAfter.title).toBe(pilot.title);
    expect([pilotAfter.status, pilotAfter.date, pilotAfter.privateNotes]).toEqual(['Nháp', '2026-01-02', 'ghi chú của tôi']);
    const ownAfter = storage.getLesson('lesson-abc')!;
    expect(ownAfter.factions.a.color).toBe('#111111');
    expect(ownAfter.simulation.scene.terrain).toBe('plain');
    // v1 knew the other seeds; they were absent here, so the teacher had deleted them: they stay deleted.
    // Lessons added after v1 (Điện Biên Phủ, 1975) are new to this browser and arrive.
    expect(storage.getAllLessons().map((l) => l.id).sort()).toEqual(['chien-dich-ho-chi-minh-1975', 'dien-bien-phu-1954', 'lesson-abc', 'ngoc-hoi-ha-hoi-1789']);
    const once = memory.get(storage.STORAGE_KEY);
    await storage.initStorage();
    expect(memory.get(storage.STORAGE_KEY)).toBe(once);
  });

  test('a newer bundled revision updates content but keeps the plan fields', async () => {
    await storage.initStorage();
    const stale = { ...storage.getLesson('ngoc-hoi-ha-hoi-1789')!, revision: 0, title: 'cũ', status: 'Nháp' as const };
    storage.saveLesson(stale);
    await storage.initStorage();
    const after = storage.getLesson('ngoc-hoi-ha-hoi-1789')!;
    expect([after.title, after.status]).toEqual([pilot.title, 'Nháp']);
  });

  test('import validates every lesson and export round-trips', async () => {
    await storage.initStorage();
    const exported = storage.exportJSON();
    expect(storage.importJSON('{oops').ok).toBe(false);
    expect(storage.importJSON(JSON.stringify([{ ...pilot, factions: { a: { name: 'x', color: 'red' } } }])).ok).toBe(false);
    expect(storage.importJSON(exported)).toEqual({ ok: true, message: `Nhập thành công ${JSON.parse(exported).length} bài giảng!` });
  });
});
