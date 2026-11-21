// Atlas Việt Nam as an AI illustration ("tạm thời": the 3D map, scene.ts, is on hold and not imported here, so three.js is not loaded).
// The picture has hotspots on the places it shows; a side panel has the search, the kind chips and the place card. URL state lives in
// the route (`#/atlas?place=&kind=&q=`), the same contract as the 3D view, so lessons' atlasPlaceIds links keep working.
// ANY atlas id opens a card (71 landmarks, 34 province-level units, Hoàng Sa, Trường Sa): a place the picture shows gets its crop and its
// hotspot lit, any other place gets the card without a picture and a note (images for those will be added later).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Icon, Modal } from '../../components/ui';
import illustration from '../../content/atlas/illustration-v2.json';
import { Attribution, KindMark, NOTICE, PlaceCard, ProvinceList, unitTitle } from './AtlasParts';
import { coverStyle, cropStyle, spotCentre, spotOf, type IllustrationManifest, type IllustrationSpot } from './illustration';
import { ARCHIPELAGOS, KIND_LABEL, LANDMARKS, PROVINCES, placeOf, provinceName } from './places';
import { decodeAtlasState, encodeAtlasState, filterLandmarks, KINDS, searchProvinces, type AtlasSearch, type AtlasState, type Kind } from './search';

const MANIFEST = illustration as unknown as IllustrationManifest;
const IMAGE = `${import.meta.env.BASE_URL}atlas/illustration-v2.webp`; // frontend/public/atlas/, 1024 × 1535
const PICTURE_STYLE = {
  aspectRatio: `${MANIFEST.size[0]} / ${MANIFEST.size[1]}`,
  '--atlas-picture-fit': `${100 * MANIFEST.size[0] / MANIFEST.size[1]}cqh`,
} as CSSProperties;
const CAPTION = 'Ảnh minh hoạ do AI tạo, chưa kiểm duyệt: hình dạng lãnh thổ và vị trí công trình không theo tỉ lệ địa lý.';
const NOT_IN_PICTURE = 'Địa danh này chưa có trong ảnh minh hoạ';
const LOWRES = 'Ảnh gốc độ phân giải thấp.';
const STRONG = 100; // search score from which a hotspot lights up: name, alias, word or province matches (fuzzy matches only show in the list)

type Option = { id: string; name: string; detail: string; kind?: Kind; score: number };
type Lightbox = { id: string } | 'all' | null;

/** A crop of the illustration as a CSS background: its own aspect (`height` omitted) or a cover tile (`height` given). */
function Crop({ id, width, height, label }: { id: string; width: number; height?: number; label?: string }) {
  const c = height ? coverStyle(MANIFEST, id, width, height) : cropStyle(MANIFEST, id, width);
  if (!c) return null;
  const { scale: _scale, ...css } = c;
  return <div role="img" aria-label={label ?? `Ảnh minh hoạ: ${placeOf(id)?.name ?? id}`} className="atlas-crop flex-none" style={{ ...css, backgroundImage: `url(${IMAGE})` }} />;
}
const cropWidth = (spot: IllustrationSpot, max: number) => Math.min(max, (spot.box[2] - spot.box[0]) * 3); // never above ~3× the source: it is only 1024 px wide

function Picture({ id, onZoom }: { id: string; onZoom: () => void }) {
  const spot = spotOf(MANIFEST, id);
  if (!spot) return <p className="atlas-no-pic mt-2 t-sm font-semibold muted">{NOT_IN_PICTURE}</p>;
  const w = cropWidth(spot, 336);
  return (
    <figure className="mt-2">
      <button type="button" className="atlas-zoom block max-w-full cursor-zoom-in" style={{ width: w }} aria-label={`Phóng to ảnh: ${placeOf(id)?.name ?? id}`} onClick={onZoom}><Crop id={id} width={w} /></button>
      <figcaption className="mt-1 t-xs muted">
        Ảnh minh hoạ do AI tạo, cắt từ ảnh lớn.{w / (spot.box[2] - spot.box[0]) > 2 ? ` ${LOWRES}` : ''}
        {spot.confidence === 'doan' && <span className="atlas-guess ml-1">? vị trí trong ảnh là phỏng đoán, chờ xác nhận</span>}
      </figcaption>
    </figure>
  );
}

export function IllustrationAtlas({ search, onSearch }: { search: AtlasSearch; onSearch: (next: AtlasSearch, replace?: boolean) => void }) {
  const state = useMemo(() => decodeAtlasState({ ...search }), [search]);
  const [draft, setDraft] = useState({ url: state.q, value: state.q });
  const draftQuery = draft.value.trim().normalize('NFC');
  // Keep the input responsive while typing and pick up URL changes when navigating within the atlas.
  if (draft.url !== state.q) {
    setDraft({ url: state.q, value: draftQuery === state.q ? draft.value : state.q });
  }
  const query = draft.value;
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<Lightbox>(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelBody = useRef<HTMLDivElement>(null);
  const requestedCard = useRef<string | undefined>(undefined);
  const place = state.place;

  const update = (patch: Partial<AtlasState>, replace = false) => onSearch(encodeAtlasState({ ...state, q: draftQuery, ...patch }), replace);
  // Typing replaces the current history entry. Selecting a place also saves the latest draft.
  useEffect(() => {
    if (draftQuery === state.q) return;
    const t = setTimeout(() => onSearch(encodeAtlasState({ ...state, q: draftQuery }), true), 200);
    return () => clearTimeout(t);
  }, [draftQuery, state, onSearch]);

  const kinds = state.kinds;
  const options = useMemo<Option[]>(() => {
    const landmarks = filterLandmarks(LANDMARKS, { kinds, query }, provinceName).map(({ item, score }) => ({
      score, id: item.id, name: item.name, kind: item.kind, detail: [KIND_LABEL[item.kind], item.era, provinceName(item.provinceId)].filter(Boolean).join(' · '),
    }));
    const arch = (a: (typeof ARCHIPELAGOS)[number], score: number): Option => ({ score, id: a.id, name: a.name, detail: `Quần đảo · thuộc ${provinceName(a.provinceId)}` });
    if (!query.trim()) return kinds.length ? landmarks : [...ARCHIPELAGOS.map((a) => arch(a, 1)), ...landmarks];
    const places = searchProvinces([...PROVINCES, ...ARCHIPELAGOS.map((a) => ({ id: a.id, name: a.name, type: 'tinh' as const, region: provinceName(a.provinceId) }))], query)
      .slice(0, 4)
      .map(({ item, score }) => (ARCHIPELAGOS.some((a) => a.id === item.id) ? arch(ARCHIPELAGOS.find((a) => a.id === item.id)!, score) : { score, id: item.id, name: item.name, detail: unitTitle(item.id) }));
    return [...places, ...landmarks].sort((a, b) => b.score - a.score); // stable: a province wins a tie
  }, [query, kinds]);
  useEffect(() => setActive(0), [options]);

  // The search and the chips light the matching hotspots and dim the others.
  const filtering = Boolean(query.trim()) || state.kinds.length > 0;
  const lit = useMemo(() => new Set(options.filter((o) => !query.trim() || o.score >= STRONG).map((o) => o.id)), [options, query]);

  const focusCard = useCallback(() => {
    if (matchMedia('(max-width: 767px)').matches) panelRef.current?.scrollIntoView({ block: 'start' });
    cardHeading.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (panelBody.current) panelBody.current.scrollTop = 0;
    if (place && requestedCard.current === place) focusCard();
    requestedCard.current = undefined;
  }, [place, focusCard]);

  const choose = (id: string) => {
    if (place === id) {
      focusCard();
      return;
    }
    requestedCard.current = id;
    update({ place: id });
  };
  const changeQuery = (value: string) => {
    setDraft({ url: state.q, value });
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

  // The picture's places, in strip order: clearly recognised first, then the guessed ones.
  const strip = useMemo(() => MANIFEST.spots.slice().sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'ro' ? -1 : 1)).filter((s) => placeOf(s.id)).slice(0, 12), []);
  const box = lightbox && lightbox !== 'all' ? spotOf(MANIFEST, lightbox.id) : null;
  const lightboxWidth = box ? cropWidth(box, Math.min(600, Math.floor(innerWidth * 0.8))) : 0;

  return (
    <main id="view-atlas" className="atlas-view relative flex flex-col md:h-[calc(100dvh-5.5rem)] md:min-h-[560px] md:flex-row">
      <section ref={panelRef} aria-label="Tìm và chọn địa danh" className="atlas-panel flex min-h-0 scroll-mt-16 flex-col border-t border-rule bg-card md:w-[23rem] md:flex-none md:border-r md:border-t-0">
        <div className="flex-none px-4 pb-3 pt-4">
          <h1 className="t-xl font-bold">Atlas Việt Nam</h1>
          <label htmlFor="atlas-q" className="sr-only">Tìm địa danh, tỉnh, thành phố</label>
          <div className="relative mt-3">
            <Icon name="search" className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input
              id="atlas-q" type="search" className="field pl-10 placeholder:text-muted" placeholder="Tìm địa danh, tỉnh, thành phố…" autoComplete="off"
              role="combobox" aria-expanded={!place} aria-controls={place ? undefined : 'atlas-results'} aria-autocomplete="list" aria-activedescendant={!place && options[active] ? `atlas-opt-${options[active].id}` : undefined}
              maxLength={80} value={query} onChange={(e) => changeQuery(e.target.value)} onKeyDown={onKey}
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap" role="group" aria-label="Lọc theo loại địa danh">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className="chip inline-flex flex-none items-center gap-1.5" aria-pressed={state.kinds.includes(k.id)} onClick={() => toggleKind(k.id)}>
                <KindMark kind={k.id} /> {k.label}
              </button>
            ))}
          </div>
          <Attribution className="mt-1.5" />
        </div>

        <div ref={panelBody} className="min-h-0 flex-1 overflow-y-auto border-t border-rule px-4 py-3">
          {place ? (
            <PlaceCard id={place} headingRef={cardHeading} onBack={() => update({ place: undefined })} onChoose={choose} picture={placeOf(place) ? <Picture id={place} onZoom={() => setLightbox({ id: place })} /> : undefined} />
          ) : (
            <>
              {!query.trim() && !state.kinds.length && (
                <section aria-label="Địa danh trong ảnh minh hoạ" className="mb-3">
                  <h2 className="t-sm font-semibold muted">Địa danh trong ảnh ({MANIFEST.spots.length})</h2>
                  <ul className="atlas-strip mt-1.5 flex gap-2 overflow-x-auto pb-2">
                    {strip.map((s) => (
                      <li key={s.id} className="flex-none">
                        <button type="button" className="atlas-strip-card block w-[7.5rem] text-left" onClick={() => choose(s.id)}>
                          <Crop id={s.id} width={120} height={90} />
                          <span className="mt-1 block t-xs font-semibold leading-tight">{placeOf(s.id)?.name}{s.confidence === 'doan' ? ' ?' : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <p className="t-sm muted" aria-live="polite">
                {query.trim() ? `${options.length} kết quả` : `${options.length} địa danh${state.kinds.length ? ' theo bộ lọc' : ''}`}
              </p>
              <ul id="atlas-results" role="listbox" aria-label="Kết quả" className="mt-1">
                {options.map((o, i) => (
                  <li
                    key={o.id} id={`atlas-opt-${o.id}`} role="option" aria-selected={i === active}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 aria-selected:bg-silk hover:bg-silk"
                    onMouseEnter={() => setActive(i)} onClick={() => choose(o.id)}
                  >
                    <span className="mt-1.5">{o.kind ? <KindMark kind={o.kind} /> : <Icon name="map" className="h-3 w-3 text-lacquer" />}</span>
                    <span>
                      <span className="block font-semibold leading-snug">{o.name}</span>
                      <span className="block t-xs muted">{o.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {!options.length && <p className="mt-2 t-sm">Không có địa danh nào khớp. Thử bỏ dấu, viết ngắn hơn, hoặc bỏ bớt bộ lọc.</p>}
              {!query.trim() && <ProvinceList onChoose={choose} />}
            </>
          )}
          <p className="mt-4 t-xs muted">{NOTICE}</p>
        </div>
      </section>

      <div className="atlas-stage flex min-h-0 flex-1 flex-col bg-[#1b130e] max-md:order-first">
        <div className="relative flex min-h-0 flex-1 items-center justify-center md:[container-type:size]">
          <div className="atlas-picture relative w-full md:w-[min(100%,var(--atlas-picture-fit))]" style={PICTURE_STYLE}>
            <img src={IMAGE} width={MANIFEST.size[0]} height={MANIFEST.size[1]} alt="Ảnh minh hoạ Việt Nam do AI tạo: đất nước trên bàn gỗ với các công trình và danh thắng, Hoàng Sa và Trường Sa" className="absolute inset-0 size-full object-cover" decoding="async" fetchPriority="high" />
            {MANIFEST.spots.map((s) => {
              const c = spotCentre(MANIFEST, s), name = placeOf(s.id)?.name ?? s.id;
              return (
                <button
                  key={s.id} type="button" aria-label={name} data-id={s.id} data-conf={s.confidence} aria-current={s.id === place ? 'true' : undefined}
                  className={`atlas-hot${filtering && s.id !== place ? (lit.has(s.id) ? ' match' : ' dim') : ''}`} style={{ left: c.left, top: c.top }} onClick={() => choose(s.id)}
                >
                  <i className="dot" />
                  {s.confidence === 'doan' && <b className="q" aria-hidden="true">?</b>}
                  <span className="tip" data-side={parseFloat(c.left) < 22 ? 'l' : parseFloat(c.left) > 78 ? 'r' : undefined}>{name}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="btn-cam-pill absolute right-3 top-3 z-10 inline-flex items-center gap-1.5" onClick={() => setLightbox('all')}>
            <Icon name="map" /> Phóng to
          </button>
        </div>
        <div className="flex-none border-t border-warn-rule bg-warn-tint px-3 py-2 text-warn-ink">
          <p className="atlas-caption t-sm font-semibold">{CAPTION}</p>
          <p className="t-xs">Chấm đỏ: địa danh nhận ra rõ. Chấm vàng có dấu ?: vị trí phỏng đoán.</p>
        </div>
      </div>

      <Modal id="atlas-lightbox" open={lightbox !== null} title={lightbox && lightbox !== 'all' ? placeOf(lightbox.id)?.name ?? '' : 'Ảnh minh hoạ Việt Nam'} onClose={closeLightbox}>
        {lightbox === 'all' && <img src={IMAGE} alt="Ảnh minh hoạ Việt Nam do AI tạo" className="mx-auto max-h-[calc(100dvh-14rem)] w-auto rounded-lg" />}
        {lightbox && lightbox !== 'all' && <div className="mx-auto max-w-full" style={{ width: lightboxWidth }}><Crop id={lightbox.id} width={lightboxWidth} label={`Ảnh minh hoạ phóng to: ${placeOf(lightbox.id)?.name ?? ''}`} /></div>}
        <p className="mt-3 t-sm">{CAPTION}{box && lightboxWidth / (box.box[2] - box.box[0]) > 2 ? ` ${LOWRES}` : ''}</p>
        <p className="mt-1 t-xs muted">{NOTICE}</p>
      </Modal>
    </main>
  );
}
