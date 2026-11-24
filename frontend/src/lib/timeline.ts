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

/**
 * Dynamic total duration (in seconds) for a 3D sand-table lesson, driven by its stages and text length.
 * Each stage runs 8–15 s depending on narration/caption length, scaling total playback to ~45–90 s.
 */
export function computeLessonDuration(sections: Pick<Section, 'title' | 'narration' | 'caption'>[] = []): number {
  if (!sections.length) return 36;
  const total = sections.reduce((sum, sec) => {
    const chars = (sec.title?.length ?? 0) + (sec.narration?.length ?? 0) + (sec.caption?.length ?? 0);
    const stageSeconds = Math.min(15, Math.max(8, Math.round(8 + chars / 45)));
    return sum + stageSeconds;
  }, 0);
  return Math.max(24, total);
}

/** Normalized 0..1 positions for each section's tick on the segmented timeline. */
export function stageBoundaries(sections: Section[]): number[] {
  if (!sections.length) return [];
  return sections.map((s, i) => sectionProgress(s, i, sections.length));
}
