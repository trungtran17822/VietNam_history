// A painted picture of a lesson's map (no three.js). Purely decorative.
import { useEffect, useRef } from 'react';
import type { Lesson } from '../lib/lesson-schema';
import { paintThumbnail } from '../scene/artwork';

export function Thumbnail({ lesson, className = '' }: { lesson: Pick<Lesson, 'simulation' | 'factions'>; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([lesson.simulation.scene, lesson.factions.a.color, lesson.factions.b.color]);
  useEffect(() => {
    if (canvas.current) paintThumbnail(canvas.current, lesson.simulation.scene, { a: lesson.factions.a.color, b: lesson.factions.b.color });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={canvas} className={`block h-full w-full object-cover ${className}`} aria-hidden />;
}
