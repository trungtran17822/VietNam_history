// Atlas Việt Nam: the 3D map plus a search panel (a bottom sheet on phones). URL state lives in the
// route (`#/atlas?place=&kind=&q=`); this view reads it and asks the route to change it.
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Icon } from '../../components/ui';
import { currentUser } from '../../lib/auth';
import { useQuality } from '../../lib/prefs';
import { getAllLessons, isVisibleForStudent } from '../../lib/storage';
import { ARCHIPELAGOS, KIND_COLORS, LANDMARKS, UNITS, VietnamAtlasScene } from './scene';
import { decodeAtlasState, encodeAtlasState, filterLandmarks, KINDS, searchProvinces, type AtlasSearch, type AtlasState, type Kind } from './search';

const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<Kind, string>;
const REGIONS = ['Bắc Bộ', 'Trung Bộ', 'Nam Bộ'];
const PROVINCES = UNITS.map((u) => u.props).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
const provinceName = (id: string) => PROVINCES.find((p) => p.id === id)?.name ?? '';
const unitTitle = (id: string) => {
  const p = PROVINCES.find((x) => x.id === id);
  return p ? `${p.type === 'thanh-pho' ? 'Thành phố' : 'Tỉnh'} ${p.name}` : '';
};
const NOTICE = 'Nội dung minh họa, chưa được chuyên gia duyệt.';

// Same silhouettes as the 3D markers, so the legend works without colour.
const SHAPES: Record<Kind, string> = {
  'chien-truong': 'M2 3h8L6 10.5z',
  'kinh-do': 'M3.5 1.7h5L11 6l-2.5 4.3h-5L1 6z',
  unesco: 'M6 1l5 5-5 5-5-5z',
  'di-tich': 'M2 2h8v8H2z',
  'danh-thang': 'M6 1.5L10.5 10h-9z',
};
function KindMark({ kind }: { kind: Kind }) {
  const [v, f] = KIND_COLORS[kind];
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className="flex-none">
      <path d={SHAPES[kind]} fill={`var(${v}, ${f})`} />
    </svg>
  );
}

type Option = { id: string; name: string; detail: string; kind?: Kind };

export function AtlasView({ search, onSearch }: { search: AtlasSearch; onSearch: (next: AtlasSearch, replace?: boolean) => void }) {
  const state = decodeAtlasState(search as Record<string, unknown>);
  const quality = useQuality();
  const mapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VietnamAtlasScene | null>(null);
  const focused = useRef<string | null | undefined>(undefined); // last place the scene flew to
  const latest = useRef({ state, onSearch });
  latest.current = { state, onSearch };
  const [error, setError] = useState('');
  const [query, setQuery] = useState(state.q);
  const [active, setActive] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(Boolean(state.place || state.q));
  const cardHeading = useRef<HTMLHeadingElement>(null);

  const update = (patch: Partial<AtlasState>, replace = false) => onSearch(encodeAtlasState({ ...latest.current.state, ...patch }), replace);

  useEffect(() => {
    let scene: VietnamAtlasScene;
    try {
      scene = new VietnamAtlasScene(mapRef.current!, {
        quality,
        onSelect: (id) => {
          focused.current = id;
          setSheetOpen(Boolean(id));
          latest.current.onSearch(encodeAtlasState({ ...latest.current.state, place: id ?? undefined }));
        },
      });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
      focused.current = undefined;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one scene per mount; quality is applied below

  useEffect(() => sceneRef.current?.setQuality(quality), [quality]);
  const kindKey = state.kinds.join();
  useEffect(() => sceneRef.current?.setFilter({ kinds: state.kinds, query: state.q }), [kindKey, state.q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const target = state.place ?? null;
    if (!sceneRef.current || focused.current === target) return;
    focused.current = target;
    sceneRef.current.focusPlace(target);
  }, [state.place]);

  // Typing updates the URL in place (no history entry per keystroke).
  useEffect(() => {
    if (query === state.q) return;
    const t = setTimeout(() => update({ q: query }, true), 200);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo<Option[]>(() => {
    const landmarks = filterLandmarks(LANDMARKS, { kinds: state.kinds, query }, provinceName).map(({ item, score }) => ({
      score, id: item.id, name: item.name, kind: item.kind, detail: [KIND_LABEL[item.kind], item.era, provinceName(item.provinceId)].filter(Boolean).join(' · '),
    }));
    if (!query.trim()) return landmarks;
    const places = searchProvinces([...PROVINCES, ...ARCHIPELAGOS.map((a) => ({ id: a.id, name: a.name, type: 'tinh' as const, region: provinceName(a.provinceId) }))], query)
      .slice(0, 4)
      .map(({ item, score }) => ({ score, id: item.id, name: item.name, detail: ARCHIPELAGOS.some((a) => a.id === item.id) ? `Quần đảo · thuộc ${item.region}` : unitTitle(item.id) }));
    return [...places, ...landmarks].sort((a, b) => b.score - a.score); // stable: a province wins a tie
  }, [query, kindKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [options]);

  const choose = (id: string) => {
    setSheetOpen(true);
    update({ place: id });
    requestAnimationFrame(() => cardHeading.current?.focus());
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % Math.max(1, options.length));
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      choose(options[active].id);
    } else if (e.key === 'Escape' && query) {
      setQuery('');
    }
  };

  const toggleKind = (kind: Kind) =>
    update({ kinds: state.kinds.includes(kind) ? state.kinds.filter((k) => k !== kind) : [...state.kinds, kind] }, true);

  const goHome = () => {
    focused.current = null;
    sceneRef.current?.focusPlace(null);
    update({ place: undefined });
  };

  const place = state.place;
  return (
    <main id="view-atlas" className="atlas-view relative flex h-[calc(100dvh-5.5rem)] min-h-[520px] flex-col-reverse md:flex-row">
      <section
        aria-label="Tìm và chọn địa danh"
        data-open={sheetOpen}
        className="atlas-panel absolute inset-x-0 bottom-0 z-20 flex max-h-[62%] flex-col rounded-t-2xl border-t border-rule bg-card shadow-[0_-8px_28px_rgb(43_41_38/0.16)] data-[open=false]:max-h-[11.5rem] md:static md:max-h-none md:w-[23rem] md:flex-none md:rounded-none md:border-t-0 md:border-r md:shadow-none md:data-[open=false]:max-h-none"
      >
        <button
          type="button"
          className="mx-auto mt-1.5 flex min-h-[28px] w-24 items-center justify-center md:hidden"
          aria-label={sheetOpen ? 'Thu gọn bảng tìm kiếm' : 'Mở rộng bảng tìm kiếm'}
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen(!sheetOpen)}
        >
          <span className="h-1.5 w-10 rounded-full bg-rule" />
        </button>
        <div className="flex-none px-4 pb-3 pt-1 md:pt-5">
          <h1 className="t-xl font-bold max-md:sr-only">Atlas Việt Nam</h1>
          <label htmlFor="atlas-q" className="sr-only">Tìm địa danh, tỉnh, thành phố</label>
          <div className="relative md:mt-3">
            <Icon name="search" className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" />
            <input
              id="atlas-q"
              type="search"
              className="field pl-10"
              placeholder="Tìm địa danh, tỉnh, thành phố…"
              autoComplete="off"
              role="combobox"
              aria-expanded={!place}
              aria-controls="atlas-results"
              aria-autocomplete="list"
              aria-activedescendant={!place && options[active] ? `atlas-opt-${options[active].id}` : undefined}
              value={query}
              onChange={(e) => (setQuery(e.target.value), setSheetOpen(true), place && update({ place: undefined }, true))}
              onFocus={() => setSheetOpen(true)}
              onKeyDown={onKey}
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap" role="group" aria-label="Lọc theo loại địa danh">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className="chip inline-flex flex-none items-center gap-1.5" aria-pressed={state.kinds.includes(k.id)} onClick={() => toggleKind(k.id)}>
                <KindMark kind={k.id} /> {k.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule px-4 py-3">
          {place ? (
            <PlaceCard id={place} headingRef={cardHeading} onBack={() => update({ place: undefined })} onChoose={choose} />
          ) : (
            <>
              <p className="t-sm muted" aria-live="polite">
                {query.trim() ? `${options.length} kết quả` : `${options.length} địa danh${state.kinds.length ? ' theo bộ lọc' : ''}`}
              </p>
              <ul id="atlas-results" role="listbox" aria-label="Kết quả" className="mt-1">
                {options.map((o, i) => (
                  <li
                    key={o.id}
                    id={`atlas-opt-${o.id}`}
                    role="option"
                    aria-selected={i === active}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 aria-selected:bg-silk hover:bg-silk"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o.id)}
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

      <div className="relative min-h-0 flex-1 bg-silk">
        <div ref={mapRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center" role="alert">
            <p className="max-w-sm">{error} Danh sách địa danh bên cạnh vẫn dùng được.</p>
          </div>
        )}
        <button type="button" className="btn-cam-pill absolute right-3 top-3 z-10 inline-flex items-center gap-1.5" onClick={goHome}>
          <Icon name="map" /> Toàn quốc
        </button>
        <p className="pointer-events-auto absolute bottom-1 right-2 z-10 t-xs text-[#4d3a20] max-md:bottom-[11.75rem]">
          Bản đồ ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
          {' '}contributors, Natural Earth, SRTM
        </p>
      </div>
    </main>
  );
}

function ProvinceList({ onChoose }: { onChoose: (id: string) => void }) {
  return (
    <details className="mt-4 rule-top pt-3">
      <summary className="cursor-pointer font-semibold">34 tỉnh, thành phố và hai quần đảo</summary>
      {REGIONS.map((region) => (
        <div key={region} className="mt-3">
          <h2 className="t-sm font-semibold muted">{region}</h2>
          <ul className="mt-1 grid grid-cols-2 gap-x-2">
            {PROVINCES.filter((p) => p.region === region).map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full rounded-md px-2 py-1.5 text-left t-sm hover:bg-silk" onClick={() => onChoose(p.id)}>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <ul className="mt-3 grid grid-cols-2 gap-x-2">
        {ARCHIPELAGOS.map((a) => (
          <li key={a.id}>
            <button type="button" className="w-full rounded-md px-2 py-1.5 text-left t-sm hover:bg-silk" onClick={() => onChoose(a.id)}>
              {a.name}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function PlaceCard({ id, headingRef, onBack, onChoose }: { id: string; headingRef: RefObject<HTMLHeadingElement | null>; onBack: () => void; onChoose: (id: string) => void }) {
  const landmark = LANDMARKS.find((l) => l.id === id);
  const unit = PROVINCES.find((p) => p.id === id);
  const arch = ARCHIPELAGOS.find((a) => a.id === id);
  const back = (
    <button type="button" className="btn btn-quiet btn-sm -ml-2.5" onClick={onBack}>
      <Icon name="back" /> Danh sách
    </button>
  );
  if (!landmark && !unit && !arch) return <div>{back}<p className="mt-2">Không tìm thấy địa danh này trên bản đồ.</p></div>;

  if (arch) {
    return (
      <article>
        {back}
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 t-xl font-bold">{arch.name}</h2>
        <p className="t-sm muted">Quần đảo · thuộc {unitTitle(arch.provinceId)}</p>
        <h3 className="mt-3 t-sm font-semibold">Một số đảo</h3>
        <p className="t-sm">{arch.islands.map((i) => i.name).join(', ')}</p>
      </article>
    );
  }

  if (unit) {
    const inside = LANDMARKS.filter((l) => l.provinceId === unit.id);
    return (
      <article>
        {back}
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 t-xl font-bold">{unit.name}</h2>
        <p className="t-sm muted">{unit.type === 'thanh-pho' ? 'Thành phố' : 'Tỉnh'} · {unit.region}</p>
        {ARCHIPELAGOS.filter((a) => a.provinceId === unit.id).map((a) => (
          <p key={a.id} className="mt-2 t-sm">Bao gồm <button type="button" className="font-semibold text-action underline underline-offset-3" onClick={() => onChoose(a.id)}>{a.name}</button>.</p>
        ))}
        <h3 className="mt-3 t-sm font-semibold">{inside.length ? `Địa danh trên bản đồ (${inside.length})` : 'Chưa có địa danh nào trên bản đồ'}</h3>
        <ul className="mt-1">
          {inside.map((l) => (
            <li key={l.id}>
              <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-silk" onClick={() => onChoose(l.id)}>
                <KindMark kind={l.kind} /> {l.name}
              </button>
            </li>
          ))}
        </ul>
      </article>
    );
  }

  const l = landmark!;
  const user = currentUser();
  // Both directions: the landmark's lessonIds and lessons that list this place in atlasPlaceIds.
  const lessons = getAllLessons().filter(
    (x) => (l.lessonIds?.includes(x.id) || x.atlasPlaceIds?.includes(l.id)) && (user?.role === 'teacher' || isVisibleForStudent(x))
  );
  return (
    <article>
      {back}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 t-sm muted">
        <span className="inline-flex items-center gap-1.5"><KindMark kind={l.kind} /> {KIND_LABEL[l.kind]}</span>
        {l.tags?.map((t) => <span key={t}>· {KIND_LABEL[t]}</span>)}
        {l.era && <span>· {l.era}</span>}
      </p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-1 t-xl font-bold">{l.name}</h2>
      <p className="t-sm muted">
        <button type="button" className="underline underline-offset-3 hover:text-ink" onClick={() => onChoose(l.provinceId)}>{unitTitle(l.provinceId)}</button>
      </p>
      <p className="mt-3">{l.summary}</p>
      {l.coordsNote && <p className="mt-2 t-xs muted">Vị trí: {l.coordsNote}</p>}
      {lessons.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {lessons.map((x) => (
            <Link key={x.id} to="/lesson/$id" params={{ id: x.id }} className="btn btn-primary justify-start text-left">
              <Icon name="book" /> Mở bài giảng: {x.title}
            </Link>
          ))}
        </div>
      )}
      <h3 className="mt-4 t-sm font-semibold">Nguồn</h3>
      <ul className="mt-1 space-y-1 t-xs">
        {l.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> <span className="muted">({s.license})</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
