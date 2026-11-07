// Rule-based, deterministic simulation: baseline + the deltas declared on each chosen option.
// Identical choices always give identical numbers. Tune coefficients in lesson data, not here.
import type { Baseline, Lesson } from './lesson-schema';

export type Choices = Record<string, string>;
type EngineLesson = Pick<Lesson, 'baseline' | 'question' | 'explanations'> & { simulation?: Pick<Lesson['simulation'], 'outcomes'> };

const DEFAULT_BASELINE: Baseline = { durationHours: 36, casualties: 1800, positionScore: 95, ratingText: 'Chuẩn mực thần tốc' };

// Generic texts for lessons that do not declare simulation.outcomes. They never grade (SC-008).
const DEFAULT_OUTCOMES = {
  perfect: 'Phương án của em trùng với cách đã diễn ra trong lịch sử.',
  positive: 'Kế sách vẫn giành thắng lợi nhưng phải trả giá thêm về thời gian và lực lượng.',
  moderate: 'Thế trận giằng co; đối phương có thêm cơ hội để chống đỡ.',
  challenging: 'Thế trận mất yếu tố bất ngờ; đối phương có thời gian củng cố và phản công.'
};

export function calculate(lesson: EngineLesson, choices: Choices = {}) {
  const baseline = lesson.baseline ?? DEFAULT_BASELINE;
  const variables = lesson.question?.variables ?? [];
  let timeDelta = 0;
  let casualtyDelta = 0;
  let scoreDelta = 0;
  let isIdenticalToOriginal = true;

  const appliedAssumptions = variables.map((variable) => {
    const option = variable.options.find((o) => o.id === choices[variable.id]) ?? variable.options[0];
    if (!option.isOriginal) isIdenticalToOriginal = false;
    timeDelta += option.timeDelta;
    casualtyDelta += option.casualtyDelta;
    scoreDelta += option.positionScoreDelta;
    return {
      variableId: variable.id,
      variable: variable.title,
      optionId: option.id,
      choice: option.name,
      isOriginal: option.isOriginal,
      timeDelta: option.timeDelta,
      casualtyDelta: option.casualtyDelta,
      scoreDelta: option.positionScoreDelta,
      explanation: option.assumptions
    };
  });

  const durationHours = Math.max(baseline.minDurationHours ?? 12, baseline.durationHours + timeDelta);
  const casualties = Math.max(baseline.minCasualties ?? 500, baseline.casualties + casualtyDelta);
  const positionScore = Math.max(10, Math.min(100, baseline.positionScore + scoreDelta));

  const outcomes = lesson.simulation?.outcomes ?? DEFAULT_OUTCOMES;
  const outcomeTone = isIdenticalToOriginal ? 'perfect' : positionScore >= 75 ? 'positive' : positionScore >= 55 ? 'moderate' : 'challenging';

  return {
    isIdenticalToOriginal,
    original: { durationHours: baseline.durationHours, casualties: baseline.casualties, positionScore: baseline.positionScore, ratingText: baseline.ratingText },
    student: { durationHours, casualties, positionScore, timeDelta, casualtyDelta, scoreDelta, outcomeSummary: outcomes[outcomeTone], outcomeTone },
    appliedAssumptions
  };
}

export type SimulationResult = ReturnType<typeof calculate>;

export function generateExplanation(lesson: EngineLesson, choices: Choices = {}) {
  const explanations = lesson.explanations;
  const feedbacks = explanations?.variableFeedbacks ?? {};
  const variablePoints = Object.entries(choices)
    .filter(([variableId, optionId]) => feedbacks[variableId]?.[optionId])
    .map(([variableId, optionId]) => ({ variableId, optionId, text: feedbacks[variableId][optionId] }));
  return {
    intro: explanations?.intro || 'Rất đáng khen cho tinh thần tìm tòi sáng tạo của các em.',
    variablePoints,
    encouragement: explanations?.encouragingConclusion || 'Hãy tiếp tục khám phá và suy ngẫm về những bài học từ lịch sử của cha ông!'
  };
}

/** The original option of every variable: the default choices when the loop starts. */
export function originalChoices(lesson: Pick<Lesson, 'question'>): Choices {
  const choices: Choices = {};
  for (const v of lesson.question?.variables ?? []) {
    const original = v.options.find((o) => o.isOriginal) ?? v.options[0];
    if (original) choices[v.id] = original.id;
  }
  return choices;
}
