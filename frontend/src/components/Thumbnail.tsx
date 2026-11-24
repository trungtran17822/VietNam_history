// Realistic oil-painting lesson cover art loaded from public/lessons/<id>.webp,
// with a default heritage painting fallback for teacher-authored lessons.
import { useState } from 'react';
import type { Lesson } from '../lib/lesson-schema';

type ThumbnailLesson = Pick<Lesson, 'simulation' | 'factions' | 'explorationMode' | 'timeline' | 'sections' | 'title' | 'introSummary' | 'era'> & { id?: string };

const DEFAULT_COVER = './lessons/default-heritage.webp';

export function Thumbnail({ lesson, className = '' }: { lesson: ThumbnailLesson; className?: string }) {
  const primarySrc = lesson.id ? `./lessons/${lesson.id}.webp` : DEFAULT_COVER;
  const [src, setSrc] = useState(primarySrc);

  return (
    <div
      className={`relative h-full w-full overflow-hidden border-b border-[#C59B47] bg-[#2C221A] ${className}`}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        onError={() => {
          if (src !== DEFAULT_COVER) setSrc(DEFAULT_COVER);
        }}
      />
      {/* Subtle dark oil-painting vignette & fine canvas weave */}
      <div
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_32px_rgba(18,14,10,0.58)] ring-1 ring-inset ring-[#C59B47]/55"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 3px)'
        }}
      />
      {/* Top-left Giấy Dó era seal stamp with Đông Sơn bronze border */}
      {lesson.era && (
        <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-[3px] border border-[#C59B47] bg-[#F7F2E7]/95 px-2.5 py-0.5 font-serif text-xs font-bold tracking-wider text-[#163A2C] shadow-sm">
          {lesson.era}
        </span>
      )}
    </div>
  );
}
