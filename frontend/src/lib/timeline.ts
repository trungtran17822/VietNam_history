// Steps of the timeline player (timeline-mode lessons) and the section ↔ progress mapping that
// the lesson page, the 6-stage loop and both players share. UI-free.
import type { Lesson, Section } from './lesson-schema';

export type TimelineStep = { label: string; text: string };

/** Where a section sits on the 0..1 timeline: its own range, or an even spread when unset. */
export const sectionProgress = (section: Section, index: number, count: number) => (section.timelineRange > 0 ? section.timelineRange : (index + 1) / count);

export function chapterAt(sections: Section[], progress: number) {
  let active = 0;
  sections.forEach((s, i) => sectionProgress(s, i, sections.length) <= progress && (active = i));
  return active;
}

/** The lesson's `timeline` events; without them one step per section, so a draft still plays. */
export function timelineSteps(lesson: Pick<Lesson, 'timeline' | 'sections' | 'title' | 'introSummary'>): TimelineStep[] {
  if (lesson.timeline?.length) return lesson.timeline.map((e) => ({ label: e.year, text: e.event }));
  if (lesson.sections.length) return lesson.sections.map((s, i) => ({ label: s.timeLabel || `Mục ${i + 1}`, text: s.title }));
  return [{ label: '', text: lesson.introSummary || lesson.title }];
}

/** Step i of n as progress 0..1 (the first step is 0, the last is 1). */
export const stepProgress = (index: number, count: number) => (count > 1 ? index / (count - 1) : 0);
export const stepAt = (progress: number, count: number) => Math.max(0, Math.min(count - 1, Math.round(progress * (count - 1))));
