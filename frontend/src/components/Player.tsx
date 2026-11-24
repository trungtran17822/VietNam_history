// The silk-map player: lazy three.js scene plus camera pills, timeline and play controls.
// One component for every surface (lesson page, stages 2 and 4, editor preview); `prefix` keeps
// the element ids the E2E suite and docs refer to (#btn-play-original, #timeline-slider-custom…).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isTimelineMode, type Lesson } from '../lib/lesson-schema';
import { useQuality } from '../lib/prefs';
import { chapterAt, computeLessonDuration, sectionProgress, stageBoundaries } from '../lib/timeline';
import type { PresetName, SilkMapScene } from '../scene/silk-map';
import { TimelinePlayer, type SceneHandle, type TimelineLesson } from './TimelinePlayer';
import { DongSonWatermark, Icon } from './ui';

export type { SceneHandle };

export const CAMERA_LABELS: [PresetName, string][] = [
  ['overview', 'Toàn cảnh'],
  ['first_person', 'Thứ nhất'],
  ['follow_troops', 'Theo quân'],
  ['close_up', 'Cận cảnh'],
  ['top_down', 'Từ trên']
];

type SceneLesson = Pick<Lesson, 'baseline'> &
  Required<Pick<Lesson, 'simulation' | 'factions'>> &
  Partial<Pick<Lesson, 'sections' | 'simulationDisclaimer'>>;

/** Mounts a SilkMapScene; destroys it on unmount so renderers never pile up. */
export function SceneView({ lesson, id, onReady, onProgress }: { lesson: SceneLesson; id: string; onReady?: (scene: SilkMapScene | null) => void; onProgress?: (p: number) => void }) {
  const mount = useRef<HTMLDivElement>(null);
  const quality = useQuality();
  const scene = useRef<SilkMapScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const progress = useRef(onProgress);
  progress.current = onProgress;

  useEffect(() => {
    let cancelled = false;
    import('../scene/silk-map')
      .then(({ SilkMapScene }) => {
        if (cancelled || !mount.current) return;
        try {
          scene.current = new SilkMapScene(mount.current, { lesson, quality, onProgressUpdate: (p) => progress.current?.(p) });
          setReady(true);
          onReady?.(scene.current);
        } catch {
          setFailed(true); // No WebGL: the lesson text and every stage still work.
        }
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      scene.current?.destroy();
      scene.current = null;
      onReady?.(null);
    };
    // The scene is rebuilt only when the caller changes `key`; live edits go through the instance API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => scene.current?.setQuality(quality), [quality]);

  return (
    <div id={id} ref={mount} className="player-canvas-mount" role="img" aria-label="Sa bàn minh họa diễn biến trận đánh">
      {!ready && <div className="scene-loading">{failed ? 'Thiết bị này chưa hiển thị được sa bàn 3D. Nội dung bài học vẫn đầy đủ bên dưới.' : 'Đang trải sa bàn…'}</div>}
    </div>
  );
}

export function formatReadout(progress: number, totalSeconds = 60) {
  const secs = Math.max(0, Math.round(progress * totalSeconds));
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

type ScenePlayerProps = {
  lesson: SceneLesson;
  prefix: string;
  badge?: ReactNode;
  initialProgress?: number;
  onProgress?: (progress: number) => void;
  onScene?: (scene: SilkMapScene | null) => void;
  extraControls?: ReactNode;
  speed?: boolean;
};

/** The 3D table with camera segmented control, chapter-synced timeline and play controls. */
export function ScenePlayer({ lesson, prefix, badge, initialProgress = 0, onProgress, onScene, extraControls, speed }: ScenePlayerProps) {
  const scene = useRef<SilkMapScene | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState<PresetName>('overview');
  const [infoOpen, setInfoOpen] = useState(false);
  const sections = lesson.sections ?? [];
  const totalSeconds = computeLessonDuration(sections);
  const boundaries = stageBoundaries(sections);
  const activeStage = sections.length ? chapterAt(sections, progress) : -1;
  const currentSection = activeStage >= 0 ? sections[activeStage] : null;
  const statusNotes = (lesson.simulation.scene.labels ?? [])
    .filter((l) => !l.info && (/bị bao vây/i.test(l.text) || l.text.length > 26))
    .map((l) => l.text);

  const last = useRef(-1);
  const handleProgress = (p: number) => {
    // The scene reports every frame; re-render only when the readout can change.
    const step = Math.round(p * 1000);
    if (step === last.current) return;
    last.current = step;
    setProgress(p);
    if (p >= 1) setPlaying(false);
    if (scene.current) setPreset(scene.current.activePreset);
    onProgress?.(p);
  };
  const toggle = () => {
    const s = scene.current;
    if (!s) return;
    if (s.isPlaying) s.pause();
    else s.play();
    setPlaying(s.isPlaying);
  };
  const jumpStage = (nextIndex: number) => {
    if (!sections.length) return;
    const clamped = Math.max(0, Math.min(sections.length - 1, nextIndex));
    const target = clamped === 0 ? 0 : sectionProgress(sections[clamped], clamped, sections.length);
    scene.current?.seek(target);
    setProgress(target);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="player-frame @container">
        <div className="relative">
          <SceneView
            lesson={lesson}
            id={`viewport-${prefix}-canvas`}
            onProgress={handleProgress}
            onReady={(s) => {
              scene.current = s;
              if (s && initialProgress) s.seek(initialProgress);
              onScene?.(s);
            }}
          />
          <button
            type="button"
            className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full border border-[var(--bronze)] bg-card/90 text-ink shadow-sm transition-colors hover:bg-card"
            aria-label="Lưu ý về sa bàn mô phỏng"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          >
            <Icon name="info" className="h-4 w-4" />
          </button>
          {infoOpen && (
            <div className="lesson-scene-popover" role="dialog" aria-label="Lưu ý mô phỏng">
              <button type="button" className="lesson-scene-popover-close" aria-label="Đóng" onClick={() => setInfoOpen(false)}>×</button>
              <strong className="lesson-scene-popover-title">Lưu ý minh họa</strong>
              <p>{lesson.simulationDisclaimer || 'Trang phục và màu sắc chỉ là minh họa, chờ chuyên gia thẩm định. Sa bàn mô phỏng mang tính sư phạm, chưa phải kết luận lịch sử chính thức.'}</p>
            </div>
          )}
        </div>

        {/* 5 camera angles in 1 compact single-row segmented bar */}
        <div id={`cam-controls-${prefix}`} className="cam-segmented flex flex-nowrap overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Góc nhìn">
          {CAMERA_LABELS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn-cam-pill text-xs sm:text-sm whitespace-nowrap${preset === key ? ' active' : ''}`}
              data-preset={key}
              aria-pressed={preset === key}
              onClick={() => {
                scene.current?.setCameraPreset(key);
                setPreset(key);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 bg-card px-3 py-2.5 rounded-b-[6px]">
          <div className="flex items-center gap-3">
            <div className="timeline-track-wrap">
              <input
                id={`timeline-slider-${prefix}`}
                className="player-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(progress * 100)}
                aria-label="Tiến trình mô phỏng"
                aria-valuetext={`${formatReadout(progress, totalSeconds)} trên ${formatReadout(1, totalSeconds)}`}
                onChange={(e) => {
                  const p = Number(e.target.value) / 100;
                  scene.current?.seek(p);
                  setProgress(p);
                }}
              />
              {boundaries.slice(0, -1).map((pos, idx) => (
                <span key={idx} className="timeline-tick" style={{ left: `${Math.round(pos * 100)}%` }} aria-hidden="true" />
              ))}
            </div>
            <span id={`time-readout-${prefix}`} className="time-readout whitespace-nowrap">
              {formatReadout(progress, totalSeconds)} / {formatReadout(1, totalSeconds)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                id={`btn-rewind-${prefix}`}
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label="Về đầu"
                onClick={() => {
                  scene.current?.seek(0);
                  scene.current?.pause();
                  setPlaying(false);
                }}
              >
                <Icon name="rewind" />
              </button>
              {sections.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  aria-label="Bước trước"
                  title="Bước trước"
                  disabled={activeStage <= 0}
                  onClick={() => jumpStage(activeStage - 1)}
                >
                  <Icon name="stepPrev" />
                  <span className="hidden sm:inline">Bước trước</span>
                </button>
              )}
              <button id={`btn-play-${prefix}`} type="button" className="btn btn-play-cinnabar btn-sm min-w-[6.2rem]" onClick={toggle}>
                <Icon name={playing ? 'pause' : 'play'} />
                {playing ? 'Dừng' : 'Phát'}
              </button>
              {sections.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  aria-label="Bước sau"
                  title="Bước sau"
                  disabled={activeStage >= sections.length - 1}
                  onClick={() => jumpStage(activeStage + 1)}
                >
                  <span className="hidden sm:inline">Bước sau</span>
                  <Icon name="stepNext" />
                </button>
              )}
              {speed && (
                <select className="field !min-h-9 !w-auto !py-1 t-sm" aria-label="Tốc độ phát" defaultValue="1" onChange={(e) => scene.current?.setSpeed(Number(e.target.value))}>
                  {['0.5', '1', '1.5', '2'].map((v) => (
                    <option key={v} value={v}>{v.replace('.', ',')}×</option>
                  ))}
                </select>
              )}
            </div>
            {extraControls}
          </div>
        </div>
      </div>

      {/* Title & current stage summary card separated cleanly below the sand table */}
      {(currentSection || badge || statusNotes.length > 0) && (
        <article className="card relative overflow-hidden p-4" aria-live="polite">
          <DongSonWatermark className="absolute -bottom-6 -right-6 h-32 w-32 text-[var(--color-lacquer)] opacity-[0.045]" />
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            {currentSection?.timeLabel && <span className="seal-stamp">{currentSection.timeLabel}</span>}
            {badge && <span className="t-xs font-semibold muted">{badge}</span>}
            {sections.length > 0 && (
              <span className="ml-auto t-xs font-semibold tabular-nums muted">
                Giai đoạn {activeStage + 1}/{sections.length}
              </span>
            )}
          </div>
          {statusNotes.length > 0 && (
            <p className="relative z-10 mt-2 inline-flex items-center gap-1.5 rounded bg-[var(--color-silk)] px-2.5 py-1 t-xs font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-[var(--color-action)]" aria-hidden="true" />
              {statusNotes.join(' · ')}
            </p>
          )}
          {currentSection && (
            <div className="relative z-10 mt-2">
              <h3 className="font-serif t-lg font-bold text-ink">{currentSection.title}</h3>
              {currentSection.narration && <p className="mt-1 t-sm leading-relaxed text-ink/90">{currentSection.narration}</p>}
            </div>
          )}
        </article>
      )}
    </div>
  );
}

type PlayerLesson = TimelineLesson & Pick<Lesson, 'baseline' | 'simulation' | 'factions' | 'simulationDisclaimer'>;
type PlayerProps = Omit<ScenePlayerProps, 'lesson' | 'onScene'> & { lesson: PlayerLesson; onScene?: (scene: SceneHandle | null) => void };

/** Every surface uses this one: the 3D table, or the timeline player for timeline-mode lessons. */
export function Player({ lesson, ...rest }: PlayerProps) {
  if (isTimelineMode(lesson) || !lesson.simulation || !lesson.factions) return <TimelinePlayer lesson={lesson} {...rest} />;
  return (
    <ScenePlayer
      lesson={{
        baseline: lesson.baseline,
        simulation: lesson.simulation,
        factions: lesson.factions,
        sections: lesson.sections,
        simulationDisclaimer: lesson.simulationDisclaimer
      }}
      {...rest}
    />
  );
}
