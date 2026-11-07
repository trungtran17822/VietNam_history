// Lesson v2 contract (specs/002-v2-tanstack-atlas/plan.md §4.1). One JSON file per lesson in
// src/content/lessons/. Validation never rewrites data: callers keep their own object and use the
// issues list, so fields this schema does not know (old drafts, intake metadata) survive.
import { z } from 'zod';
import vi from 'zod/v4/locales/vi.js';

// zod's built-in messages (wrong type, missing field) in Vietnamese, like our own.
z.config(vi());

const text = z.string();
const point = z.tuple([z.number().min(-120).max(120), z.number().min(-93).max(93)]);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu phải ở dạng #RRGGBB');
const progress = z.number().min(0).max(1);
const faction = z.enum(['a', 'b']);

export const STATUSES = ['Nháp', 'Đã lên lịch', 'Đã dạy'] as const;
export const TERRAINS = ['plain', 'river', 'mountain-pass', 'basin', 'coast-river', 'urban'] as const;
export const FEATURE_TYPES = ['river', 'hill', 'fort', 'village', 'forest', 'road', 'marsh', 'airfield', 'camp'] as const;
export const SPECIAL_KINDS = ['elephant', 'cannon', 'boat', 'tank'] as const;
export const CAMERA_PRESETS = ['overview', 'follow_troops', 'close_up', 'top_down'] as const;
const LINE_FEATURES = new Set(['river', 'road']);

const source = z.object({
  book: text,
  chapter: text.optional(),
  quote: text.optional(),
  note: text.optional(),
  url: text.optional(),
  publisher: text.optional()
});

const section = z.object({
  id: text.min(1),
  title: text.min(1, 'Giai đoạn cần tiêu đề'),
  narration: text,
  caption: text.optional(),
  timelineRange: progress,
  timeLabel: text,
  source: source.optional()
});

const questionOption = z.object({ id: text.min(1), text, isCorrect: z.boolean(), explanation: text });

const question = z.object({
  id: text.min(1),
  text: text.min(1, 'Câu hỏi không được để trống'),
  type: z.enum(['multiple_choice', 'open_discussion']),
  sectionId: text.optional(),
  isEmperorQuestion: z.boolean().optional(),
  isExplanationReleased: z.boolean().optional(),
  options: z.array(questionOption).optional(),
  guide: text.optional()
});

export const optionSchema = z.object({
  id: text.regex(/^[a-z0-9_-]+$/i, 'Mã phương án chỉ gồm chữ không dấu, số, - và _'),
  isOriginal: z.boolean(),
  name: text.min(1, 'Phương án cần tên'),
  shortName: text.optional(),
  desc: text.optional(),
  timeDelta: z.number().finite(),
  casualtyDelta: z.number().finite(),
  positionScoreDelta: z.number().finite(),
  assumptions: text
});

export const variableSchema = z
  .object({
    id: text.regex(/^[a-z0-9_-]+$/i, 'Mã biến chỉ gồm chữ không dấu, số, - và _'),
    title: text.min(1, 'Biến số cần tên'),
    description: text.optional(),
    options: z.array(optionSchema).min(2, 'Mỗi biến cần ít nhất 2 phương án')
  })
  .superRefine((v, ctx) => {
    const originals = v.options.filter((o) => o.isOriginal);
    if (originals.length !== 1) ctx.addIssue({ code: 'custom', path: ['options'], message: `Biến "${v.title}" cần đúng 1 phương án gốc (đang có ${originals.length})` });
    for (const o of originals) {
      if (o.timeDelta || o.casualtyDelta || o.positionScoreDelta) ctx.addIssue({ code: 'custom', path: ['options'], message: `Phương án gốc "${o.name}" phải có cả 3 hệ số bằng 0` });
    }
    const ids = v.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['options'], message: `Biến "${v.title}" có mã phương án trùng nhau` });
  });

const feature = z
  .object({ type: z.enum(FEATURE_TYPES), points: z.array(point).optional(), at: point.optional(), size: z.number().positive().optional(), faction: faction.optional() })
  .refine((f) => (LINE_FEATURES.has(f.type) ? (f.points?.length ?? 0) >= 2 : Boolean(f.at) || (f.points?.length ?? 0) >= 2), {
    message: 'Sông/đường cần ít nhất 2 điểm; đặc điểm khác cần "at" hoặc "points"'
  });

export const sceneSchema = z.object({
  terrain: z.enum(TERRAINS),
  labels: z.array(z.object({ text: text.min(1, 'Nhãn không được để trống'), at: point })),
  features: z.array(feature),
  routes: z.array(z.object({ faction, points: z.array(point).min(2), from: progress, to: progress })),
  // Where each side's troops start and where they end up as the timeline runs (world units).
  formations: z.object({ a: z.object({ from: point, to: point }).optional(), b: z.object({ from: point, to: point }).optional() }).optional(),
  aSpecialKind: z.enum(SPECIAL_KINDS).optional(),
  bSpecialKind: z.enum(SPECIAL_KINDS).optional()
});

const camera = z.object({ pos: z.tuple([z.number(), z.number(), z.number()]), target: z.tuple([z.number(), z.number(), z.number()]) });

const simulation = z.object({
  propsConfig: z.record(z.string(), z.boolean()).optional(),
  unitCounts: z.record(z.string(), z.number().int().min(0).max(300)).optional(),
  factionColors: z.record(z.string(), hex).optional(),
  cameraPresets: z.record(z.string(), camera).optional(),
  keyframes: z.array(z.object({ time: progress, preset: z.enum(CAMERA_PRESETS) })).optional(),
  outcomes: z.object({ perfect: text, positive: text, moderate: text, challenging: text }).optional(),
  scene: sceneSchema
});

export const baselineSchema = z.object({
  durationHours: z.number().positive('Thời gian gốc phải lớn hơn 0'),
  casualties: z.number().min(0),
  positionScore: z.number().min(0).max(100),
  ratingText: text,
  minDurationHours: z.number().min(0).optional(),
  minCasualties: z.number().min(0).optional()
});

export const lessonSchema = z
  .object({
    schemaVersion: z.literal(2),
    revision: z.number().int().min(1).optional(),
    id: text.regex(/^[a-z0-9-]+$/, 'Mã bài chỉ gồm chữ thường không dấu, số và -'),
    title: text.min(1, 'Bài học cần tiêu đề'),
    subtitle: text.optional(),
    commander: text.optional(),
    opponent: text.optional(),
    year: text.optional(),
    era: text,
    atlasPlaceIds: z.array(text).optional(),
    teacher: text,
    class: text,
    date: text.regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày dạng YYYY-MM-DD'),
    subject: text,
    grade: text,
    period: text.optional(),
    objectives: text,
    focusQuestion: text,
    status: z.enum(STATUSES),
    isPilot: z.boolean().optional(),
    disclaimer: text.optional(),
    simulationDisclaimer: text.optional(),
    introSummary: text.optional(),
    factions: z.object({ a: z.object({ name: text.min(1), color: hex }), b: z.object({ name: text.min(1), color: hex }) }),
    sections: z.array(section),
    keyNotes: z.array(text),
    privateNotes: text,
    questions: z.array(question),
    baseline: baselineSchema.optional(),
    simulation,
    question: z
      .object({
        character: z.object({ name: text.min(1), dynasty: text.optional(), avatarSvg: text.optional(), greeting: text.optional(), speech: text.optional() }),
        originalLabel: text.optional(),
        variables: z.array(variableSchema)
      })
      .optional(),
    explanations: z
      .object({ intro: text, variableFeedbacks: z.record(z.string(), z.record(z.string(), text)), encouragingConclusion: text })
      .optional()
  })
  .superRefine((l, ctx) => {
    const vars = l.question?.variables ?? [];
    if (vars.length && !l.baseline) ctx.addIssue({ code: 'custom', path: ['baseline'], message: 'Bài có biến số cần số liệu gốc (baseline)' });
    const ids = vars.map((v) => v.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['question', 'variables'], message: 'Mã biến số bị trùng' });
  });

export type Lesson = z.infer<typeof lessonSchema>;
export type Variable = z.infer<typeof variableSchema>;
export type VariableOption = z.infer<typeof optionSchema>;
export type Section = z.infer<typeof section>;
export type Source = z.infer<typeof source>;
export type Question = z.infer<typeof question>;
export type Scene = z.infer<typeof sceneSchema>;
export type Baseline = z.infer<typeof baselineSchema>;
export type Status = (typeof STATUSES)[number];
export type Point = [number, number];

/** Vietnamese, human-readable issues; empty when the lesson is valid. */
export function validateLesson(lesson: unknown): string[] {
  const result = lessonSchema.safeParse(lesson);
  if (result.success) return [];
  return result.error.issues.map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message));
}

/** Content rule for a lesson that runs all 6 stages (plan §4.1). Variables-free lessons are drafts. */
export function playabilityIssues(lesson: Pick<Lesson, 'question'>): string[] {
  const vars = lesson.question?.variables ?? [];
  if (!vars.length) return ['Chưa có biến số: học sinh chưa thể thử cách khác (bước 4-6).'];
  const issues: string[] = [];
  if (vars.length < 3) issues.push(`Nên có tối thiểu 3 biến số (đang có ${vars.length}).`);
  for (const v of vars) if (v.options.length < 3) issues.push(`Biến "${v.title}" nên có 3 phương án (đang có ${v.options.length}).`);
  return issues;
}
