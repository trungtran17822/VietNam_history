// Multiple-choice answers of a lesson without a simulation: what a student sends to the class, which
// lessons use the opinion summary, and that the bundled quiz options are well-formed.
import { describe, expect, test } from 'vitest';
import pilotJson from '../content/lessons/ngoc-hoi-ha-hoi-1789.json';
import { usesOpinionSummary, type Lesson } from './lesson-schema';
import { quizChoicesPayload } from './storage';

const mc = (id: string, ids: string[]) => ({ id, type: 'multiple_choice' as const, text: id, options: ids.map((o) => ({ id: o, text: o })) });
const lesson = {
  questions: [mc('q1', ['a', 'b']), { id: 'open', type: 'open_discussion' as const, text: 'mở' }, mc('q2', ['c', 'd'])]
} as unknown as Pick<Lesson, 'questions'>;

describe('quizChoicesPayload', () => {
  test('keeps only answered multiple-choice questions whose option exists', () => {
    expect(quizChoicesPayload(lesson, { q1: 'b', open: 'x', q2: 'zzz', other: 'a' })).toEqual({ q1: 'b' });
  });

  test('sends at most 10 answers (the class API limit)', () => {
    const many = { questions: Array.from({ length: 14 }, (_, i) => mc(`q${i}`, ['a', 'b'])) } as unknown as Pick<Lesson, 'questions'>;
    const answers = Object.fromEntries(many.questions.map((q) => [q.id, 'a']));
    expect(Object.keys(quizChoicesPayload(many, answers))).toHaveLength(10);
  });

  test('every id fits the API id rule', () => {
    for (const [k, v] of Object.entries(quizChoicesPayload(lesson, { q1: 'a', q2: 'd' }))) expect(`${k}${v}`).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('usesOpinionSummary', () => {
  const withVars = { question: { variables: [{}] } };
  test('timeline-mode lessons (Bài 1-3) and lessons without variables use it', () => {
    expect(usesOpinionSummary({ explorationMode: 'ussr_charts', ...withVars })).toBe(true);
    expect(usesOpinionSummary({ question: { variables: [] } })).toBe(true);
    expect(usesOpinionSummary({})).toBe(true);
  });
  test('a 3D lesson with variables keeps the comparison', () => {
    expect(usesOpinionSummary({ explorationMode: 'stalingrad_3d', ...withVars })).toBe(false);
    expect(usesOpinionSummary(withVars)).toBe(false);
  });
});

describe('the pilot quiz', () => {
  const pilot = pilotJson as unknown as Lesson;
  test('every multiple-choice question has unique option ids and exactly one correct answer', () => {
    for (const q of pilot.questions.filter((x) => x.type === 'multiple_choice')) {
      const ids = q.options!.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(q.options!.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });
  test('every simulation variable has unique option ids and exactly one original', () => {
    for (const v of pilot.question!.variables) {
      const ids = v.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(v.options.filter((o) => o.isOriginal)).toHaveLength(1);
    }
  });
});
