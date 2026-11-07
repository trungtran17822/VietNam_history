// The silk-map player: lazy three.js scene plus camera pills, timeline and play controls.
// One component for every surface (lesson page, stages 2 and 4, editor preview); `prefix` keeps
// the element ids the E2E suite and docs refer to (#btn-play-original, #timeline-slider-custom…).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Lesson } from '../lib/lesson-schema';
import { useQuality } from '../lib/prefs';
import type { PresetName, SilkMapScene } from '../scene/silk-map';
import { Icon } from './ui';

export const CAMERA_LABELS: [PresetName, string][] = [
  ['overview', 'Toàn cảnh sa bàn'],
  ['follow_troops', 'Theo quân'],
  ['close_up', 'Cận cảnh'],
  ['top_down', 'Từ trên']
];

type SceneLesson = Pick<Lesson, 'simulation' | 'factions' | 'baseline'>;

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

export function formatReadout(progress: number, hours = 36) {
  const minutes = Math.round(progress * hours * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

type PlayerProps = {
  lesson: SceneLesson;
  prefix: string;
  badge?: ReactNode;
  initialProgress?: number;
  onProgress?: (progress: number) => void;
  onScene?: (scene: SilkMapScene | null) => void;
  extraControls?: ReactNode;
  speed?: boolean;
};

export function Player({ lesson, prefix, badge, initialProgress = 0, onProgress, onScene, extraControls, speed }: PlayerProps) {
  const scene = useRef<SilkMapScene | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState<PresetName>('overview');
  const hours = lesson.baseline?.durationHours ?? 36;

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

  return (
    <div className="player-frame">
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
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
          {badge ? <span className="pointer-events-auto rounded-full bg-card/90 px-3 py-1 t-xs font-semibold">{badge}</span> : <span />}
          <div id={`cam-controls-${prefix}`} className="pointer-events-auto flex flex-wrap gap-1.5" role="group" aria-label="Góc nhìn">
            {CAMERA_LABELS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn-cam-pill${preset === key ? ' active' : ''}`}
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
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-rule bg-card px-3 py-2.5">
        <div className="flex items-center gap-3">
          <input
            id={`timeline-slider-${prefix}`}
            className="player-slider"
            type="range"
            min={0}
            max={100}
            value={Math.round(progress * 100)}
            aria-label="Tiến trình mô phỏng"
            aria-valuetext={`${formatReadout(progress, hours)} trên ${hours} giờ`}
            onChange={(e) => {
              const p = Number(e.target.value) / 100;
              scene.current?.seek(p);
              setProgress(p);
            }}
          />
          <span id={`time-readout-${prefix}`} className="time-readout">{formatReadout(progress, hours)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
            <button id={`btn-play-${prefix}`} type="button" className="btn btn-primary btn-sm min-w-[6.5rem]" onClick={toggle}>
              <Icon name={playing ? 'pause' : 'play'} />
              {playing ? 'Dừng' : 'Phát'}
            </button>
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
  );
}
