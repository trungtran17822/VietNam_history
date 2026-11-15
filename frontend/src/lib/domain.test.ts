// SC-002 (determinism over all 256 combinations), SC-008 (no grading words), FR-006 (numbers trace
// to coefficients), FR-020 (visibility), the lesson contract and the v1 → v2 storage migration.
import { beforeEach, describe, expect, test } from 'vitest';
import pilotJson from '../content/lessons/ngoc-hoi-ha-hoi-1789.json';
import { calculate, generateExplanation, originalChoices, type Choices } from './engine';
import { comparisonRows } from './comparison';
import { MODE_LABELS, isTimelineMode, modeLabel, playabilityIssues, validateLesson, type Lesson } from './lesson-schema';
import { chapterAt, sectionProgress, stepAt, stepProgress, timelineSteps } from './timeline';
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
// Trung's four SGK lessons (ported from origin/Process): one variable x two options each, timeline
// mode except Stalingrad. They are held to their own contract below, not the 3x3 one of the other six.
const SGK_IDS = ['bai-1-lien-xo', 'bai-2-chau-au-my', 'bai-3-chau-a', 'bai-4-chien-tranh-the-gioi-2'];
const idOf = (path: string) => path.split('/').pop()!.replace('.json', '');
const fullLessons = Object.entries(lessonFiles).filter(([path]) => !SGK_IDS.includes(idOf(path)));
const sgkLessons = Object.entries(lessonFiles).filter(([path]) => SGK_IDS.includes(idOf(path)));

describe('lesson contract (plan §4.1)', () => {
  test.each(Object.entries(lessonFiles))('%s is a valid v2 lesson in NFC', (path, lesson) => {
    expect(validateLesson(lesson)).toEqual([]);
    expect((lesson as Lesson).id).toBe(path.split('/').pop()!.replace('.json', ''));
    expect(JSON.stringify(lesson)).toBe(JSON.stringify(nfc(lesson)));
  });

  test('pilot runs all 6 stages: 4 variables x 4 options, one original with zero deltas', () => {
    expect(playabilityIssues(pilot)).toEqual([]);
    expect(variables.map((v) => v.options.length)).toEqual([4, 4, 4, 4]);
    expect(combos).toHaveLength(256);
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
  test.each(fullLessons)('%s has full content, sources and scene', (_, json) => {
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
    expect(Object.keys(l.simulation!.outcomes ?? {}).sort()).toEqual(['challenging', 'moderate', 'perfect', 'positive']);
    expect(l.simulation!.keyframes?.length).toBeGreaterThan(0);
    expect(l.factions).toBeTruthy();
    expect(l.simulation!.scene?.features.length).toBeGreaterThan(0);
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
    expect(ownAfter.factions!.a.color).toBe('#111111');
    expect(ownAfter.simulation!.scene.terrain).toBe('plain');
    // v1 knew the other seeds; they were absent here, so the teacher had deleted them: they stay deleted.
    // Lessons added after v1 (Điện Biên Phủ, 1975, the four SGK lessons) are new to this browser and arrive.
    expect(storage.getAllLessons().map((l) => l.id).sort()).toEqual([...SGK_IDS, 'chien-dich-ho-chi-minh-1975', 'dien-bien-phu-1954', 'lesson-abc', 'ngoc-hoi-ha-hoi-1789']);
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

// ---- Trung's SGK lessons, timeline mode, comparison metrics (S5) ----

describe('exploration mode and the timeline lesson fields', () => {
  test('absent or "*_3d" is the 3D table, anything else is the timeline player', () => {
    expect(isTimelineMode({})).toBe(false);
    expect(isTimelineMode({ explorationMode: '' })).toBe(false);
    expect(isTimelineMode({ explorationMode: 'stalingrad_3d' })).toBe(false);
    expect(isTimelineMode({ explorationMode: 'ussr_charts' })).toBe(true);
    expect(isTimelineMode({ explorationMode: 'asia_map' })).toBe(true);
  });

  test('the mode label comes from the table, with a neutral fallback', () => {
    for (const mode of Object.keys(MODE_LABELS)) expect(modeLabel({ explorationMode: mode })).toBe(MODE_LABELS[mode]);
    expect(modeLabel({ explorationMode: 'something_new' })).toBe('Trục thời gian tư liệu tương tác');
  });

  test('a timeline lesson needs no table; a 3D lesson without one is rejected', () => {
    const timeline = structuredClone(lessonFiles['../content/lessons/bai-1-lien-xo.json'] as Lesson);
    expect(timeline.simulation).toBeUndefined();
    expect(timeline.factions).toBeUndefined();
    expect(validateLesson(timeline)).toEqual([]);
    const noMode = structuredClone(timeline);
    delete noMode.explorationMode;
    const issues = validateLesson(noMode).join(' ');
    expect(issues).toContain('simulation');
    expect(issues).toContain('factions');
  });

  test('new optional fields are type-checked', () => {
    const base = structuredClone(lessonFiles['../content/lessons/bai-1-lien-xo.json'] as Lesson);
    expect(validateLesson({ ...base, timeline: [{ year: '1921' }] })).not.toEqual([]);
    expect(validateLesson({ ...base, reviewFlags: [1] })).not.toEqual([]);
    expect(validateLesson({ ...base, comparisonMetrics: [{ label: '' }] })).not.toEqual([]);
    expect(validateLesson({ ...base, comparisonMetrics: Array(4).fill({ label: 'x' }) })).not.toEqual([]);
    expect(validateLesson({ ...base, timeline: [], reviewFlags: [], comparisonMetrics: [] })).toEqual([]);
  });
});

describe('timeline helpers', () => {
  const sections = [{ id: 'a', title: 'A', narration: '', timelineRange: 0.1, timeLabel: '1918' }, { id: 'b', title: 'B', narration: '', timelineRange: 0.8, timeLabel: '1928' }];
  test('steps come from the events, else from the sections, else from the title', () => {
    expect(timelineSteps({ timeline: [{ year: '1921', event: 'NEP' }], sections, title: 'T' })).toEqual([{ label: '1921', text: 'NEP' }]);
    expect(timelineSteps({ sections, title: 'T' }).map((s) => s.label)).toEqual(['1918', '1928']);
    expect(timelineSteps({ sections: [], title: 'T', introSummary: 'Tóm tắt' })).toEqual([{ label: '', text: 'Tóm tắt' }]);
  });
  test('step ↔ progress round-trips and clamps', () => {
    for (const n of [1, 2, 8]) for (let i = 0; i < n; i++) expect(stepAt(stepProgress(i, n), n)).toBe(i);
    expect(stepAt(-1, 8)).toBe(0);
    expect(stepAt(2, 8)).toBe(7);
  });
  test('the chapter at a progress follows the sections ranges', () => {
    expect(chapterAt(sections, 0)).toBe(0);
    expect(chapterAt(sections, 0.5)).toBe(0);
    expect(chapterAt(sections, 0.9)).toBe(1);
    expect(sectionProgress({ ...sections[0], timelineRange: 0 }, 1, 4)).toBe(0.5);
  });
});

describe('comparison rows', () => {
  test('default rows keep the battle wording', () => {
    const rows = comparisonRows({});
    expect(rows.map((r) => r.label)).toEqual(['Thời gian chiến dịch', 'Tổn thất ước tính', 'Điểm thế trận']);
    expect(rows[0].value(36)).toBe('36 giờ (~1,5 ngày)');
    expect(rows[2].value(95)).toBe('95 / 100');
    expect(rows[2].delta(0)).toBe('như cách gốc');
    expect(rows[2].delta(-10)).toBe('−10 điểm so với cách gốc');
  });
  test('comparisonMetrics relabel the rows and their units', () => {
    const lesson = lessonFiles['../content/lessons/bai-1-lien-xo.json'] as Lesson;
    const rows = comparisonRows(lesson);
    expect(rows[0].label).toBe('Sản lượng công nghiệp nặng');
    expect(rows[0].original(90)).toBe('90 / 100');
    expect(rows[0].value(80)).toBe('80 / 100');
    expect(rows[0].delta(-10)).toBe('−10 điểm so với cách gốc');
  });
});

describe('the four SGK lessons (ported from origin/Process)', () => {
  test('there are four, none is the pilot, none points at the Viet Nam atlas', () => {
    expect(sgkLessons.map(([path]) => idOf(path)).sort()).toEqual([...SGK_IDS].sort());
    for (const [, json] of sgkLessons) {
      const l = json as Lesson;
      expect(l.isPilot).toBe(false);
      expect(l.atlasPlaceIds).toBeUndefined();
      expect(l.revision).toBe(1);
    }
  });

  test.each(sgkLessons)('%s keeps its sources, review flags, timeline and metrics', (_, json) => {
    const l = json as Lesson;
    expect(l.sourceCitation).toBeTruthy();
    expect(l.reviewFlags?.length).toBeGreaterThan(0);
    expect(l.timeline?.length).toBeGreaterThan(0);
    expect(l.comparisonMetrics).toHaveLength(3);
    expect(l.sections.length).toBeGreaterThanOrEqual(2);
    for (const s of l.sections) expect(s.source?.book, s.id).toBeTruthy();
    expect(l.questions.length).toBeGreaterThan(0);
    // One variable with two options each, as written; the missing 3x3 is advisory, not an error.
    expect(l.question?.variables).toHaveLength(1);
    expect(l.question?.variables[0].options).toHaveLength(2);
    expect(playabilityIssues(l).length).toBeGreaterThan(0);
  });

  test.each(sgkLessons)('%s: the original choice reproduces its /100 baseline and speaks neutrally', (_, json) => {
    const l = json as Lesson;
    const r = calculate(l, originalChoices(l));
    expect([r.student.durationHours, r.student.casualties, r.student.positionScore]).toEqual([l.baseline!.durationHours, l.baseline!.casualties, l.baseline!.positionScore]);
    expect(r.student.outcomeSummary).toBe(`Tái hiện phương án lịch sử: ${l.baseline!.ratingText}.`);
    expect(r.student.outcomeSummary).not.toContain('đối phương');
  });

  test('three are timeline lessons, Stalingrad is a 3D table with a valid scene', () => {
    const mode = Object.fromEntries(sgkLessons.map(([path, json]) => [idOf(path), isTimelineMode(json as Lesson)]));
    expect(mode).toEqual({ 'bai-1-lien-xo': true, 'bai-2-chau-au-my': true, 'bai-3-chau-a': true, 'bai-4-chien-tranh-the-gioi-2': false });
    const stalingrad = lessonFiles['../content/lessons/bai-4-chien-tranh-the-gioi-2.json'] as Lesson;
    expect(stalingrad.factions?.a.name).toBe('Liên Xô');
    expect(stalingrad.simulation?.scene.routes.length).toBeGreaterThan(0);
    expect(stalingrad.simulation?.schematicNotice).toContain('Lược đồ 4.4');
  });
});
