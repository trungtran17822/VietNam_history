// A painted picture of a lesson's map (no three.js). Purely decorative. Timeline-mode lessons
// have no map: they get a strip of their milestones instead.
import { useEffect, useRef } from 'react';
import { isTimelineMode, type Lesson } from '../lib/lesson-schema';
import { paintThumbnail } from '../scene/artwork';
import { timelineSteps } from '../lib/timeline';

type ThumbnailLesson = Pick<Lesson, 'simulation' | 'factions' | 'explorationMode' | 'timeline' | 'sections' | 'title' | 'introSummary' | 'era'>;

export function Thumbnail({ lesson, className = '' }: { lesson: ThumbnailLesson; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = lesson.simulation?.scene;
  const colors = lesson.factions ? { a: lesson.factions.a.color, b: lesson.factions.b.color } : null;
  const key = JSON.stringify([scene, colors]);
  const hasMap = Boolean(scene && colors) && !isTimelineMode(lesson);
  useEffect(() => {
    if (hasMap && canvas.current) paintThumbnail(canvas.current, scene!, colors!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hasMap]);
  if (!hasMap) return <TimelineThumbnail lesson={lesson} className={className} />;
  return <canvas ref={canvas} className={`block h-full w-full object-cover ${className}`} aria-hidden />;
}

function TimelineThumbnail({ lesson, className }: { lesson: ThumbnailLesson; className: string }) {
  const steps = timelineSteps(lesson);
  return (
    <div className={`timeline-thumbnail flex h-full w-full flex-col items-center justify-center gap-3 bg-silk px-4 ${className}`} aria-hidden>
      <span className="font-serif t-xl font-bold text-lacquer">{lesson.era}</span>
      <span className="flex w-full max-w-[16rem] items-center">
        {steps.slice(0, 8).map((_, i, list) => (
          <span key={i} className="flex flex-1 items-center last:flex-none">
            <span className="h-2.5 w-2.5 flex-none rounded-full bg-lacquer" />
            {i < list.length - 1 && <span className="h-px flex-1 bg-rule" />}
          </span>
        ))}
      </span>
    </div>
  );
}
