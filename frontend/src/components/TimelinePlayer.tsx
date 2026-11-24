// Player for timeline-mode lessons (explorationMode set and not "*_3d"): the lesson's timeline
// events as a stepped, keyboard-accessible strip with the same controls as the 3D table (play,
// rewind, slider, speed). It never loads three.js. Element ids mirror Player.tsx.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { modeLabel, type Lesson } from '../lib/lesson-schema';
import { chapterAt, stepAt, stepProgress, timelineSteps } from '../lib/timeline';
import { Icon } from './ui';

/** What the lesson page and the 6-stage loop need from either player (the 3D scene has more). */
export type SceneHandle = { seek(progress: number): void; play(): void; pause(): void };

export type TimelineLesson = Pick<Lesson, 'id' | 'timeline' | 'sections' | 'title' | 'introSummary' | 'explorationMode' | 'sourceCitation'>;

type Props = {
  lesson: TimelineLesson;
  prefix: string;
  badge?: ReactNode;
  initialProgress?: number;
  onProgress?: (progress: number) => void;
  onScene?: (scene: SceneHandle | null) => void;
  extraControls?: ReactNode;
  speed?: boolean;
};

/** Dynamic documentary scene duration (10-15s) scaled to text length so students can read comfortably. */
function sceneDurationMs(text: string): number {
  return Math.min(15000, Math.max(10000, 8000 + text.length * 45));
}

export function TimelinePlayer({ lesson, prefix, badge, initialProgress = 0, onProgress, onScene, extraControls, speed }: Props) {
  const steps = timelineSteps(lesson);
  const count = steps.length;
  const [rawIndex, setIndex] = useState(() => stepAt(initialProgress, count));
  const index = Math.min(rawIndex, count - 1); // the editor may delete steps while previewing
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const report = useRef(onProgress);
  report.current = onProgress;

  const go = (next: number, focus = false) => {
    const i = Math.max(0, Math.min(count - 1, next));
    setIndex(i);
    report.current?.(stepProgress(i, count));
    if (focus) dots.current[i]?.focus();
  };

  // Handle for callers that seek from outside (the chapter list); always acts on the latest state.
  const api = useRef({ go });
  api.current = { go };
  useEffect(() => {
    const handle: SceneHandle = {
      seek: (p) => api.current.go(stepAt(p, count)),
      play: () => setPlaying(true),
      pause: () => setPlaying(false)
    };
    onScene?.(handle);
    return () => onScene?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const step = steps[index];
  const currentDurationMs = sceneDurationMs(step.text);

  useEffect(() => {
    if (!playing) return;
    if (index >= count - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => api.current.go(index + 1), currentDurationMs / rate);
    return () => clearTimeout(timer);
  }, [playing, index, count, rate, currentDurationMs]);

  const onKey = (event: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: count - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    go(keys[event.key], true);
  };

  const sections = lesson.sections;
  const section = sections.length ? sections[chapterAt(sections, stepProgress(index, count))] : null;
  const label = modeLabel(lesson);
  const base = import.meta.env.BASE_URL;
  const stepImg = `${base}lessons/${lesson.id}-step-${index + 1}.webp`;
  const coverImg = `${base}lessons/${lesson.id}.webp`;
  const fallbackImg = `${base}lessons/default-heritage.webp`;
  const [imgSrc, setImgSrc] = useState(stepImg);

  useEffect(() => {
    setImgSrc(`${base}lessons/${lesson.id}-step-${index + 1}.webp`);
  }, [base, lesson.id, index]);

  return (
    <div className="player-frame timeline-player @container" id={`viewport-${prefix}-timeline`}>
      <div className="flex flex-col gap-3 bg-silk px-4 py-4 @2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="t-xs font-semibold uppercase tracking-wide text-[var(--sepia)]">Phim tư liệu lịch sử tương tác</p>
          {badge && <span className="max-w-full truncate rounded-full bg-card/90 px-3 py-1 t-xs font-semibold">{badge}</span>}
        </div>
        <p className="timeline-mode-label t-xs muted">{label}</p>

        {/* 16:9 Cinema Frame with Ken Burns motion, vintage film grain/vignette & synced subtitle bar */}
        <figure className="doc-cinema-frame relative aspect-video w-full overflow-hidden rounded-lg border-2 border-[#C59B47] bg-[#140e0a] shadow-lg outline outline-1 -outline-offset-4 outline-[#C59B47]/45" aria-live="polite" aria-atomic="true">
          <img
            key={`${lesson.id}-${index}`}
            src={imgSrc}
            alt={step.text}
            className={`doc-ken-burns ${index % 2 === 0 ? 'ken-a' : 'ken-b'}${playing ? ' is-playing' : ''} size-full object-cover`}
            style={{ animationDuration: `${Math.round(currentDurationMs / rate)}ms` }}
            onError={() => {
              if (imgSrc !== coverImg && imgSrc !== fallbackImg) setImgSrc(coverImg);
              else if (imgSrc !== fallbackImg) setImgSrc(fallbackImg);
            }}
          />
          <div className="doc-film-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="doc-film-grain pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* Top-left Year Seal */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
            <span className="timeline-year rounded border border-[#C59B47] bg-[#9E2A22]/95 px-3 py-1 font-display t-sm font-bold tabular-nums text-[#F7F2E7] shadow-md">
              {step.label || '—'}
            </span>
            <span className="rounded bg-black/65 px-2.5 py-1 text-xs font-semibold tabular-nums text-[#F7F2E7] backdrop-blur-xs">
              Cảnh {index + 1} / {count}
            </span>
          </div>

          {/* Cinematic Subtitle Bar */}
          <figcaption key={`sub-${index}`} className="doc-subtitle-fade absolute inset-x-0 bottom-0 z-10 border-t border-[#C59B47]/40 bg-black/75 px-4 py-3 text-[#FAF6EE] backdrop-blur-sm">
            {section && <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E6C77A]">{section.title}</p>}
            <p className="timeline-event mt-0.5 font-serif text-sm leading-snug sm:text-base">{step.text}</p>
          </figcaption>
        </figure>

        {lesson.sourceCitation && (
          <p className="t-xs italic muted">Nguồn tham chiếu: {lesson.sourceCitation}</p>
        )}

        <ol className="timeline-steps flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Các mốc thời gian" onKeyDown={onKey}>
          {steps.map((s, i) => (
            <li key={i} className="flex-none">
              <button
                ref={(el) => void (dots.current[i] = el)}
                type="button"
                className={`timeline-dot${i === index ? ' active' : ''}${i < index ? ' passed' : ''}`}
                data-step-index={i}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Mốc ${i + 1}: ${s.label}`}
                tabIndex={i === index ? 0 : -1}
                onClick={() => go(i)}
              >
                <span className="tabular-nums">{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2 border-t border-rule bg-card px-3 py-2.5">
        <div className="flex items-center gap-3">
          <input
            id={`timeline-slider-${prefix}`}
            className="player-slider"
            type="range"
            min={0}
            max={Math.max(1, count - 1)}
            step={1}
            value={index}
            disabled={count < 2}
            aria-label="Mốc thời gian"
            aria-valuetext={`Mốc ${index + 1} trên ${count}: ${step.label}`}
            onChange={(e) => go(Number(e.target.value))}
          />
          <span id={`time-readout-${prefix}`} className="time-readout !min-w-[4.5rem]">{step.label || `${index + 1}/${count}`}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button id={`btn-rewind-${prefix}`} type="button" className="btn btn-secondary btn-sm" aria-label="Về đầu" onClick={() => (setPlaying(false), go(0))}>
              <Icon name="rewind" />
            </button>
            <button id={`btn-prev-${prefix}`} type="button" className="btn btn-secondary btn-sm" aria-label="Cảnh trước" disabled={index === 0} onClick={() => go(index - 1)}>
              <Icon name="back" />
              <span className="hidden sm:inline">Cảnh trước</span>
            </button>
            <button id={`btn-next-${prefix}`} type="button" className="btn btn-secondary btn-sm" aria-label="Cảnh sau" disabled={index >= count - 1} onClick={() => go(index + 1)}>
              <span className="hidden sm:inline">Cảnh sau</span>
              <Icon name="next" />
            </button>
            <button
              id={`btn-play-${prefix}`}
              type="button"
              className="btn btn-play-cinnabar btn-sm min-w-[9.5rem]"
              onClick={() => {
                if (!playing && index >= count - 1) go(0);
                setPlaying(!playing);
              }}
            >
              <Icon name={playing ? 'pause' : 'play'} />
              {playing ? 'Tạm dừng' : 'Phát phim tư liệu'}
            </button>
            {speed && (
              <select className="field !min-h-9 !w-auto !py-1 t-sm" aria-label="Tốc độ phát" defaultValue="1" onChange={(e) => setRate(Number(e.target.value))}>
                {['1', '1.25', '1.5', '2'].map((v) => (
                  <option key={v} value={v}>{v.replace('.', ',')}×</option>
                ))}
              </select>
            )}
          </div>
          {extraControls}
        </div>
      </div>
    </div>
  );
}
