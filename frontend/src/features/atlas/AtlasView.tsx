// Atlas Việt Nam, 3D version: the 3D map plus a search panel (a bottom sheet on phones). ON HOLD ("tạm thời"): since the
// illustration atlas (IllustrationAtlas.tsx) the route no longer uses this view and nothing imports it, so three.js is not loaded.
// Kept on disk with scene.ts and public/atlas/terrain.png for when the 3D map returns. URL state lives in the
// route (`#/atlas?place=&kind=&q=`); this view reads it and asks the route to change it.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../../components/ui';
import { useQuality } from '../../lib/prefs';
import { Attribution, KindMark, NOTICE, PlaceCard, ProvinceList, unitTitle } from './AtlasParts';
import { ARCHIPELAGOS, KIND_LABEL, LANDMARKS, PROVINCES, provinceName } from './places';
import { VietnamAtlasScene } from './scene';
import { decodeAtlasState, encodeAtlasState, filterLandmarks, KINDS, searchProvinces, type AtlasSearch, type AtlasState, type Kind } from './search';


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
  const panelRef = useRef<HTMLElement>(null);
  const homeRef = useRef<HTMLButtonElement>(null);

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

  // On phones the panel is a sheet over the map: the scene centres the camera above it and keeps
  // labels out from under the "Toàn quốc" button.
  useEffect(() => {
    const panel = panelRef.current!, map = mapRef.current!, home = homeRef.current!;
    const ro = new ResizeObserver(() => {
      const origin = map.getBoundingClientRect(), b = home.getBoundingClientRect();
      sceneRef.current?.setViewInsets({
        bottom: getComputedStyle(panel).position === 'absolute' ? panel.offsetHeight : 0,
        reserved: [{ x: b.left - origin.left, y: b.top - origin.top, width: b.width, height: b.height }],
      });
    });
    [panel, map, home].forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  useEffect(() => sceneRef.current?.setQuality(quality), [quality]);
  const kindKey = state.kinds.join();
  useEffect(() => sceneRef.current?.setFilter({ kinds: state.kinds, query: state.q }), [kindKey, state.q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const target = state.place ?? null;
    if (target) setSheetOpen(true); // also when the URL changes under us (back/forward, a pasted link)
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
        ref={panelRef}
        aria-label="Tìm và chọn địa danh"
        data-open={sheetOpen}
        className="atlas-panel absolute inset-x-0 bottom-0 z-20 flex max-h-[62%] flex-col rounded-t-2xl border-t border-rule bg-card shadow-[0_-8px_28px_rgb(43_41_38/0.16)] data-[open=false]:max-h-[12.5rem] md:static md:max-h-none md:w-[23rem] md:flex-none md:rounded-none md:border-t-0 md:border-r md:shadow-none md:data-[open=false]:max-h-none"
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
              className="field pl-10 placeholder:text-muted"
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
          <Attribution className="mt-1.5 md:hidden" />
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
        <button ref={homeRef} type="button" className="btn-cam-pill absolute right-3 top-3 z-10 inline-flex items-center gap-1.5" onClick={goHome}>
          <Icon name="map" /> Toàn quốc
        </button>
        <Attribution className="absolute bottom-1 right-2 z-10 hidden rounded bg-card/85 px-1.5 md:block" />
      </div>
    </main>
  );
}
