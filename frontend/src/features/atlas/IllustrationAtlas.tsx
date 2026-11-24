// Full-viewport 3D Perspective Atlas Việt Nam: the Vietnam relief map is radially alpha-masked
// and mounted directly onto the inner face of a 3D Đông Sơn (Ngọc Lũ) Bronze Drum pedestal,
// with zero rectangular edges, native wheel-to-cursor zoom, floating Giấy Dó search drawer,
// and a contained real-photo heritage modal.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, Modal } from '../../components/ui';
import illustration from '../../content/atlas/illustration-v2.json';
import { AtlasDetailModal, Attribution, KindMark, NOTICE, ProvinceList, unitTitle } from './AtlasParts';
import { coverStyle, spotCentre, zoomTransform, type IllustrationManifest } from './illustration';
import { ARCHIPELAGOS, KIND_LABEL, LANDMARKS, PROVINCES, placeOf, provinceName } from './places';
import { decodeAtlasState, encodeAtlasState, filterLandmarks, KINDS, searchProvinces, type AtlasSearch, type AtlasState, type Kind } from './search';

const MANIFEST = illustration as unknown as IllustrationManifest;
const IMAGE = `${import.meta.env.BASE_URL}atlas/illustration-v2.webp`;
const CAPTION = 'Ảnh minh hoạ do AI tạo, chưa kiểm duyệt: hình dạng lãnh thổ và vị trí công trình không theo tỉ lệ địa lý.';
const STRONG = 100;

type Option = { id: string; name: string; detail: string; kind?: Kind; score: number };

/** Raised 3D Đông Sơn (Ngọc Lũ) Bronze Drum Rim SVG (~11% outer ring thickness, 88% hollow center r < 440). */
function DongSonBronzeDrumRim() {
  const lacBirds = useMemo(() => Array.from({ length: 14 }, (_, i) => (i * 360) / 14), []);
  const sawTeeth = useMemo(() => Array.from({ length: 60 }, (_, i) => i * 6), []);

  return (
    <svg viewBox="0 0 1000 1000" className="pointer-events-none absolute inset-0 z-20 size-full" aria-hidden="true">
      <defs>
        <radialGradient id="drum-ring-bezel" cx="50%" cy="50%" r="50%">
          <stop offset="86%" stopColor="#261B11" />
          <stop offset="95%" stopColor="#3B2B1B" />
          <stop offset="100%" stopColor="#1B130B" />
        </radialGradient>
        <linearGradient id="bronze-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E6C276" />
          <stop offset="50%" stopColor="#B88E42" />
          <stop offset="100%" stopColor="#7A5822" />
        </linearGradient>
        <mask id="hollow-center-mask">
          <rect width="1000" height="1000" fill="white" />
          <circle cx="500" cy="500" r="440" fill="black" />
        </mask>
      </defs>

      <g mask="url(#hollow-center-mask)">
        <circle cx="500" cy="500" r="492" fill="url(#drum-ring-bezel)" stroke="url(#bronze-gold)" strokeWidth="10" />

        {/* Outer Comb-tooth Ring (Răng cưa) */}
        <g stroke="#C59B47" strokeWidth="1.4" strokeOpacity="0.55" fill="none">
          {sawTeeth.map((deg) => (
            <polygon key={deg} points="496,16 504,16 500,28" transform={`rotate(${deg} 500 500)`} />
          ))}
        </g>

        <circle cx="500" cy="500" r="480" fill="none" stroke="#C59B47" strokeWidth="2" strokeOpacity="0.75" />

        {/* 14 Counter-Clockwise Flying Lạc Birds along the compact 11% rim */}
        <g fill="url(#bronze-gold)" fillOpacity="0.8">
          {lacBirds.map((deg) => (
            <path
              key={deg}
              d="M476,40 C488,35 498,38 508,43 L526,38 L513,48 C520,53 524,57 528,59 L509,54 C501,51 495,50 486,53 L496,45 Z"
              transform={`rotate(${deg} 500 500)`}
            />
          ))}
        </g>

        {/* Crisp 1.5px Inner Gold-Bronze Lip framing the 88% Map Basin */}
        <circle cx="500" cy="500" r="440" fill="none" stroke="#C59B47" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function IllustrationAtlas({ search, onSearch }: { search: AtlasSearch; onSearch: (next: AtlasSearch, replace?: boolean) => void }) {
  const state = useMemo(() => decodeAtlasState({ ...search }), [search]);
  const [draft, setDraft] = useState({ url: state.q, value: state.q });
  const draftQuery = draft.value.trim().normalize('NFC');
  if (draft.url !== state.q) {
    setDraft({ url: state.q, value: draftQuery === state.q ? draft.value : state.q });
  }
  const query = draft.value;
  const [active, setActive] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const place = state.place;

  const update = useCallback(
    (patch: Partial<AtlasState>, replace = false) => onSearch(encodeAtlasState({ ...state, q: draftQuery, ...patch }), replace),
    [state, draftQuery, onSearch]
  );

  useEffect(() => {
    if (draftQuery === state.q) return;
    const t = setTimeout(() => onSearch(encodeAtlasState({ ...state, q: draftQuery }), true), 200);
    return () => clearTimeout(t);
  }, [draftQuery, state, onSearch]);

  const kinds = state.kinds;
  const options = useMemo<Option[]>(() => {
    const landmarks = filterLandmarks(LANDMARKS, { kinds, query }, provinceName).map(({ item, score }) => ({
      score,
      id: item.id,
      name: item.name,
      kind: item.kind,
      detail: [KIND_LABEL[item.kind], item.era, provinceName(item.provinceId)].filter(Boolean).join(' · '),
    }));
    const arch = (a: (typeof ARCHIPELAGOS)[number], score: number): Option => ({
      score,
      id: a.id,
      name: a.name,
      detail: `Quần đảo · thuộc ${provinceName(a.provinceId)}`,
    });
    if (!query.trim()) return kinds.length ? landmarks : [...ARCHIPELAGOS.map((a) => arch(a, 1)), ...landmarks];
    const places = searchProvinces(
      [...PROVINCES, ...ARCHIPELAGOS.map((a) => ({ id: a.id, name: a.name, type: 'tinh' as const, region: provinceName(a.provinceId) }))],
      query
    )
      .slice(0, 4)
      .map(({ item, score }) =>
        ARCHIPELAGOS.some((a) => a.id === item.id)
          ? arch(ARCHIPELAGOS.find((a) => a.id === item.id)!, score)
          : { score, id: item.id, name: item.name, detail: unitTitle(item.id) }
      );
    return [...places, ...landmarks].sort((a, b) => b.score - a.score);
  }, [query, kinds]);

  useEffect(() => setActive(0), [options]);

  const filtering = Boolean(query.trim()) || state.kinds.length > 0;
  const lit = useMemo(() => new Set(options.filter((o) => !query.trim() || o.score >= STRONG).map((o) => o.id)), [options, query]);

  const choose = (id: string) => update({ place: id });
  const resetZoom = useCallback(() => {
    setPan({ x: 0, y: 0, scale: 1 });
    if (place) update({ place: undefined });
  }, [place, update]);

  // Native non-passive wheel listener: prevents page scrolling and zooms cleanly around the cursor
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (place) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const factor = e.deltaY > 0 ? 0.86 : 1.16;

      setPan((prev) => {
        const nextScale = Math.max(1, Math.min(4, Number((prev.scale * factor).toFixed(3))));
        if (nextScale <= 1.05) return { x: 0, y: 0, scale: 1 };
        const ratio = nextScale / prev.scale;
        const maxPanX = (rect.width * (nextScale - 1)) / 2 + 60;
        const maxPanY = (rect.height * (nextScale - 1)) / 2 + 60;
        const nx = Math.max(-maxPanX, Math.min(maxPanX, dx - (dx - prev.x) * ratio));
        const ny = Math.max(-maxPanY, Math.min(maxPanY, dy - (dy - prev.y) * ratio));
        return { x: nx, y: ny, scale: nextScale };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [place]);

  useEffect(() => {
    if (!place && pan.scale === 1 && pan.x === 0 && pan.y === 0) return;
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !lightboxOpen) resetZoom();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [place, pan, lightboxOpen, resetZoom]);

  const changeQuery = (value: string) => {
    setDraft({ url: state.q, value });
    if (!drawerOpen) setDrawerOpen(true);
    if (place) update({ place: undefined, q: value.normalize('NFC') }, true);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (place) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % Math.max(1, options.length));
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      choose(options[active].id);
    } else if (e.key === 'Escape' && query) changeQuery('');
  };

  const toggleKind = (kind: Kind) => update({ kinds: state.kinds.includes(kind) ? state.kinds.filter((k) => k !== kind) : [...state.kinds, kind] }, true);

  const mapZoom = place ? zoomTransform(MANIFEST, place, 2.8) : null;
  const tiltDeg = place || pan.scale > 1.25 ? 0 : 18;
  const discTransform = `perspective(1450px) rotateX(${tiltDeg}deg) translate(${pan.x}px, ${pan.y}px) scale(${pan.scale})`;

  return (
    <main
      id="view-atlas"
      className="atlas-view relative h-[calc(100vh-64px)] min-h-[540px] w-full overflow-hidden bg-[radial-gradient(circle_at_50%_46%,#3D2C1E_0%,#21170F_56%,#100A06_100%)] select-none"
    >
      {/* Full-Viewport 3D Perspective Stage */}
      <div
        ref={stageRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden [container-type:size] cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input, aside, [role="dialog"]')) return;
          dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragRef.current || place || !stageRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
          const rect = stageRef.current.getBoundingClientRect();
          const maxPanX = (rect.width * (pan.scale - 1)) / 2 + 80;
          const maxPanY = (rect.height * (pan.scale - 1)) / 2 + 80;
          setPan((p) => ({
            ...p,
            x: Math.max(-maxPanX, Math.min(maxPanX, dragRef.current!.origX + dx)),
            y: Math.max(-maxPanY, Math.min(maxPanY, dragRef.current!.origY + dy)),
          }));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {/* Oversized Full-Viewport Bronze Drum Pedestal (115vh x 115vh) + 88% Bright Inner Sea & Crisp Map */}
        <div
          className="relative flex aspect-square h-[115vh] w-[115vh] max-h-[96vw] max-w-[96vw] items-center justify-center rounded-full"
          style={{
            transform: discTransform,
            transition: dragRef.current ? 'none' : 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: '0 36px 70px rgba(0,0,0,0.85)',
          }}
        >
          {/* Layer 1: Bright Uniform Sea-Blue Basin (88% of drum diameter, thin 1.5px bronze border, zero dark edge shadow) */}
          <div
            id="atlas-map-frame"
            className="relative z-10 flex h-[88%] w-[88%] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-[#C59B47] bg-[#0B3B59]"
            style={{
              clipPath: 'circle(50% at 50% 50%)',
            }}
          >
            <div
              className={`atlas-picture relative mx-auto my-auto${mapZoom ? ' is-zoomed' : ''}`}
              style={{
                height: '92%',
                width: `${((MANIFEST.size[0] / MANIFEST.size[1]) * 92).toFixed(2)}%`,
                transform: mapZoom ?? 'scale(1) translate(0%, 0%)',
                transition: 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <img
                src={IMAGE}
                width={MANIFEST.size[0]}
                height={MANIFEST.size[1]}
                alt="Khối bản đồ nổi 3D Việt Nam đúc trong lòng mặt Trống Đồng Đông Sơn"
                className="pointer-events-none block h-full w-full object-contain"
                style={{
                  filter: 'contrast(1.08) saturate(1.12) brightness(1.04)',
                }}
                decoding="async"
                fetchPriority="high"
                draggable={false}
              />
              <div className="absolute inset-0 h-full w-full">
                {MANIFEST.spots.map((s) => {
                  const c = spotCentre(MANIFEST, s),
                    name = placeOf(s.id)?.name ?? s.id;
                  const thumb = coverStyle(MANIFEST, s.id, 42, 42);
                  const isSelected = s.id === place;
                  const dimmed = (filtering && !isSelected && !lit.has(s.id)) || (Boolean(mapZoom) && !isSelected);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={name}
                      data-id={s.id}
                      data-conf={s.confidence}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`atlas-hot${dimmed ? ' dim' : filtering && !isSelected && lit.has(s.id) ? ' match' : ''}`}
                      style={{ left: c.left, top: c.top }}
                      onClick={() => choose(s.id)}
                    >
                      <span
                        className="diorama-medallion"
                        style={thumb ? { backgroundImage: `url(${IMAGE})`, backgroundSize: thumb.backgroundSize, backgroundPosition: thumb.backgroundPosition } : undefined}
                        aria-hidden="true"
                      />
                      {s.confidence === 'doan' && <b className="q" aria-hidden="true">?</b>}
                      <span className="tip" data-side={parseFloat(c.left) < 22 ? 'l' : parseFloat(c.left) > 78 ? 'r' : undefined}>
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Layer 2: Raised 3D Đông Sơn Bronze Drum Rim overlapping the outer edge of the circular map */}
          <DongSonBronzeDrumRim />
        </div>
      </div>

      {/* Top-Left Floating Collapsible Giấy Dó Search & Filter Drawer */}
      {!drawerOpen ? (
        <button
          type="button"
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border-2 border-[#C59B47] bg-[#F7F2E7]/95 px-4 py-2.5 text-sm font-bold text-ink shadow-xl ring-1 ring-[#C59B47]/40 backdrop-blur-md transition-transform hover:scale-[1.02]"
          aria-expanded={false}
          aria-label="Mở rộng bảng tra cứu địa danh"
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="search" className="h-4 w-4 text-[#8C6A2E]" />
          <span>Tra cứu địa danh</span>
        </button>
      ) : (
        <aside
          aria-label="Tra cứu và lọc địa danh"
          className="absolute left-4 top-4 z-20 flex max-h-[calc(100vh-110px)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border-2 border-[#C59B47] bg-[#F7F2E7]/95 shadow-2xl ring-1 ring-[#C59B47]/40 backdrop-blur-md sm:w-96"
        >
          <div className="flex-none px-3.5 pb-3 pt-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display text-lg font-bold text-ink">Atlas Việt Nam</h1>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-[#C59B47]/60 bg-card/80 px-2.5 py-1 text-xs font-semibold text-ink hover:bg-card"
                aria-expanded={true}
                aria-label="Thu gọn bảng tra cứu"
                onClick={() => setDrawerOpen(false)}
              >
                « Thu gọn
              </button>
            </div>
            <label htmlFor="atlas-q" className="sr-only">
              Tìm địa danh, tỉnh, thành phố
            </label>
            <div className="relative mt-2.5">
              <Icon name="search" className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" />
              <input
                id="atlas-q"
                type="search"
                className="field pl-10 placeholder:text-muted"
                placeholder="Tìm địa danh, tỉnh, thành phố…"
                autoComplete="off"
                role="combobox"
                aria-expanded={!place && drawerOpen}
                aria-controls={!place && drawerOpen ? 'atlas-results' : undefined}
                aria-autocomplete="list"
                aria-activedescendant={!place && options[active] ? `atlas-opt-${options[active].id}` : undefined}
                maxLength={80}
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                onKeyDown={onKey}
              />
            </div>
            <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap" role="group" aria-label="Lọc theo loại địa danh">
              {KINDS.map((k) => (
                <button key={k.id} type="button" className="chip inline-flex flex-none items-center gap-1 text-xs" aria-pressed={state.kinds.includes(k.id)} onClick={() => toggleKind(k.id)}>
                  <KindMark kind={k.id} /> {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#C59B47]/35 px-3.5 py-2.5">
            <p className="text-xs font-medium muted" aria-live="polite">
              {query.trim() ? `${options.length} kết quả` : `${options.length} địa danh${state.kinds.length ? ' theo bộ lọc' : ''}`}
            </p>
            <ul id="atlas-results" role="listbox" aria-label="Kết quả" className="mt-1 space-y-0.5">
              {options.map((o, i) => (
                <li
                  key={o.id}
                  id={`atlas-opt-${o.id}`}
                  role="option"
                  aria-selected={i === active}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 aria-selected:bg-[#EFE6D5] hover:bg-[#EFE6D5]"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.id)}
                >
                  <span className="mt-1">{o.kind ? <KindMark kind={o.kind} /> : <Icon name="map" className="h-3.5 w-3.5 text-lacquer" />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{o.name}</span>
                    <span className="block truncate text-xs muted">{o.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            {!options.length && <p className="mt-2 text-xs muted">Không có địa danh nào khớp. Thử bỏ dấu, viết ngắn hơn, hoặc bỏ bớt bộ lọc.</p>}
            {!query.trim() && <ProvinceList onChoose={choose} />}
          </div>
        </aside>
      )}

      {/* Top-Right Camera Reset & Fullscreen Map Lightbox */}
      <div className="absolute right-4 top-4 z-20 flex flex-wrap items-center gap-2">
        {(place || pan.scale > 1 || pan.x !== 0 || pan.y !== 0) && (
          <button type="button" className="btn-cam-pill active inline-flex items-center gap-1.5 shadow-lg" onClick={resetZoom}>
            <Icon name="back" /> Thu nhỏ toàn cảnh
          </button>
        )}
        <button type="button" className="btn-cam-pill inline-flex items-center gap-1.5 bg-[#F7F2E7]/90 shadow-md" onClick={() => setLightboxOpen(true)}>
          <Icon name="map" /> Toàn đồ
        </button>
      </div>

      {/* Bottom-Left Compact (i) Attribution & Disclaimer Button */}
      <div className="absolute bottom-4 left-4 z-20">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#C59B47] bg-[#F7F2E7]/92 text-ink shadow-lg backdrop-blur-sm hover:bg-[#F7F2E7]"
          aria-label="Thông tin bản đồ và bản quyền"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          <Icon name="info" className="h-4 w-4" />
        </button>
        {infoOpen && (
          <div className="absolute bottom-11 left-0 w-72 rounded-xl border border-[#C59B47] bg-[#F7F2E7]/98 p-3 text-xs text-ink shadow-2xl">
            <p className="font-semibold">{CAPTION}</p>
            <p className="mt-1 muted">{NOTICE}</p>
            <Attribution className="mt-2 border-t border-[#C59B47]/35 pt-1.5" />
          </div>
        )}
      </div>

      {/* Contained Scrollable Real-Photo Heritage Modal */}
      {place && <AtlasDetailModal id={place} onClose={resetZoom} onChoose={choose} />}

      <Modal id="atlas-lightbox" open={lightboxOpen} title="Bản đồ Atlas Việt Nam" onClose={() => setLightboxOpen(false)}>
        <img src={IMAGE} alt="Ảnh minh hoạ Việt Nam" className="mx-auto max-h-[calc(100dvh-14rem)] w-auto rounded-lg" />
        <p className="mt-3 t-sm">{CAPTION}</p>
        <p className="mt-1 t-xs muted">{NOTICE}</p>
      </Modal>
    </main>
  );
}
