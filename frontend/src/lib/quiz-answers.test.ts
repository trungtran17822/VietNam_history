// Per-device multiple-choice tally used by the opinion summary of lessons without a simulation.
import { describe, expect, test } from 'vitest';
import { recordQuizAnswer, type QuizAnswers } from './storage';

const empty: QuizAnswers = { mine: {}, tally: {} };

describe('recordQuizAnswer', () => {
  test('the first answer counts once and is remembered as mine', () => {
    const a = recordQuizAnswer(empty, 'q1', 'a');
    expect(a.mine).toEqual({ q1: 'a' });
    expect(a.tally).toEqual({ q1: { a: 1 } });
  });

  test('choosing the same option again does not count twice', () => {
    const a = recordQuizAnswer(empty, 'q1', 'a');
    expect(recordQuizAnswer(a, 'q1', 'a')).toBe(a);
  });

  test('changing the answer moves the count to the new option', () => {
    const b = recordQuizAnswer(recordQuizAnswer(empty, 'q1', 'a'), 'q1', 'b');
    expect(b.mine.q1).toBe('b');
    expect(b.tally.q1).toEqual({ a: 0, b: 1 });
  });

  test('questions are tallied independently and the input is never mutated', () => {
    const a = recordQuizAnswer(empty, 'q1', 'a');
    const snapshot = JSON.stringify(a);
    const b = recordQuizAnswer(a, 'q2', 'c');
    expect(JSON.stringify(a)).toBe(snapshot);
    expect(b.tally).toEqual({ q1: { a: 1 }, q2: { c: 1 } });
  });
});
