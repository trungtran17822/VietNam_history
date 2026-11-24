// Pieces the atlas views share: kind marks, the credit, the lesson links and the place card. No map code (no scene.ts, no three.js), so the
// illustration atlas can use them without loading the 3D map; the 3D AtlasView (on hold) uses them too.
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from '../../components/ui';
import { currentUser } from '../../lib/auth';
import { getAllLessons, isVisibleForStudent } from '../../lib/storage';
import { ARCHIPELAGOS, ARCHIPELAGO_DETAILS, KIND_COLORS, KIND_LABEL, LANDMARKS, PROVINCES, REGIONS } from './places';
import { fold, type BattleEvent, type Kind, type Source } from './search';

const photoCache = new Map<string, string[]>();
const isRealPhotoUrl = (url: string) =>
  /\.(jpe?g|png|webp)(\?|$)/i.test(url) && !/(flag|coat|logo|icon|locator|blank|emblem|map_of|province)/i.test(url);

function useRealPhotos(id: string, queryName: string, qid: string | undefined, presetPhotos: string[], retryNonce: number) {
  const presetKey = presetPhotos.join('|');
  const [photos, setPhotos] = useState<string[]>(() => photoCache.get(id) ?? presetPhotos);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = presetKey ? presetKey.split('|') : [];
    const cached = photoCache.get(id);
    if (cached && cached.length >= 4 && retryNonce === 0) {
      setPhotos(cached);
      setLoading(false);
      return;
    }
    setPhotos(initial);
    if (initial.length >= 4 && retryNonce === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);

    const load = async () => {
      setLoading(true);
      const found = [...initial];
      const pushUnique = (u?: string) => {
        if (!u) return;
        const normalized = u.startsWith('//') ? `https:${u}` : u;
        if (isRealPhotoUrl(normalized) && !found.includes(normalized)) found.push(normalized);
      };

      try {
        const folded = fold(queryName);
        const tasks: Promise<void>[] = [];

        // 1. Wikidata Entity Claims P18
        if (qid) {
          tasks.push(
            fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(qid)}&props=claims&format=json&origin=*`, { signal: ctrl.signal })
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                const fileName = d?.entities?.[qid]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value as string | undefined;
                if (fileName) pushUnique(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1200`);
              })
              .catch(() => {})
          );
        }

        // 2. Wikipedia VI REST summary & media-list
        tasks.push(
          fetch(`https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(queryName)}`, { signal: ctrl.signal })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => pushUnique(d?.originalimage?.source ?? d?.thumbnail?.source))
            .catch(() => {})
        );
        tasks.push(
          fetch(`https://vi.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(queryName)}`, { signal: ctrl.signal })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              for (const item of d?.items ?? []) {
                if (item?.type !== 'image') continue;
                const src = item?.srcset?.[0]?.src;
                if (src) pushUnique(src);
              }
            })
            .catch(() => {})
        );

        // 3. Wikimedia Commons Search (both Vietnamese & diacritic-stripped query)
        for (const q of Array.from(new Set([folded, queryName]))) {
          tasks.push(
            fetch(
              `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size&iiurlwidth=1200&format=json&origin=*`,
              { signal: ctrl.signal }
            )
              .then((r) => (r.ok ? r.json() : null))
              .then((cData) => {
                const pages = Object.values(cData?.query?.pages ?? {}) as { imageinfo?: { thumburl?: string; url?: string; width?: number }[] }[];
                for (const p of pages) {
                  const info = p.imageinfo?.[0];
                  if (info && (info.width ?? 0) >= 400) pushUnique(info.thumburl ?? info.url);
                }
              })
              .catch(() => {})
          );
        }

        await Promise.allSettled(tasks);
      } finally {
        clearTimeout(timer);
        if (!cancelled) {
          const finalList = found.slice(0, 6);
          if (finalList.length > 0) photoCache.set(id, finalList);
          setPhotos(finalList);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [id, queryName, qid, presetKey, retryNonce]);

  return { photos, loading };
}

export const NOTICE = 'Nội dung minh họa, chưa được chuyên gia duyệt.';
export const unitTitle = (id: string) => {
  const p = PROVINCES.find((x) => x.id === id);
  return p ? `${p.type === 'thanh-pho' ? 'Thành phố' : 'Tỉnh'} ${p.name}` : '';
};

// Same silhouettes as the 3D markers, so the legend works without colour.
const SHAPES: Record<Kind, string> = {
  'chien-truong': 'M2 3h8L6 10.5z',
  'kinh-do': 'M3.5 1.7h5L11 6l-2.5 4.3h-5L1 6z',
  unesco: 'M6 1l5 5-5 5-5-5z',
  'di-tich': 'M2 2h8v8H2z',
  'danh-thang': 'M6 1.5L10.5 10h-9z',
};
export function KindMark({ kind }: { kind: Kind }) {
  const [v, f] = KIND_COLORS[kind];
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className="flex-none">
      <path d={SHAPES[kind]} fill={`var(${v}, ${f})`} />
    </svg>
  );
}

// ODbL: the borders and islands are an OpenStreetMap derivative, so the credit stays visible.
export function Attribution({ className }: { className: string }) {
  return (
    <p className={`t-xs text-notice-ink ${className}`}>
      Bản đồ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, Natural Earth, SRTM
    </p>
  );
}

export function ProvinceList({ onChoose }: { onChoose: (id: string) => void }) {
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

// Both directions: a landmark's lessonIds and lessons that list one of `ids` in atlasPlaceIds.
// Students only see lessons that are published to them.
export function lessonsFor(ids: string[], lessonIds: string[] = []) {
  const user = currentUser();
  return getAllLessons().filter(
    (x) => (lessonIds.includes(x.id) || x.atlasPlaceIds?.some((p) => ids.includes(p))) && (user?.role === 'teacher' || isVisibleForStudent(x))
  );
}

export function LessonLinks({ lessons }: { lessons: ReturnType<typeof lessonsFor> }) {
  if (!lessons.length) return null;
  return (
    <div className="atlas-lessons mt-4 flex flex-col gap-2">
      {lessons.map((x) => (
        <Link key={x.id} to="/lesson/$id" params={{ id: x.id }} className="btn btn-primary justify-start text-left shadow-sm ring-1 ring-[#C59B47]/50">
          <Icon name="book" /> Mở bài giảng liên quan: {x.title}
        </Link>
      ))}
    </div>
  );
}

export function PlaceCard({ id, headingRef, onBack, onChoose, picture }: { id: string; headingRef: RefObject<HTMLHeadingElement | null>; onBack: () => void; onChoose: (id: string) => void; picture?: ReactNode }) {
  const landmark = LANDMARKS.find((l) => l.id === id);
  const unit = PROVINCES.find((p) => p.id === id);
  const arch = ARCHIPELAGOS.find((a) => a.id === id);
  const back = (
    <button type="button" className="btn btn-quiet btn-sm -ml-2.5" onClick={onBack}>
      <Icon name="back" /> Danh sách
    </button>
  );
  if (!landmark && !unit && !arch) return <div>{back}<p className="mt-2">Không tìm thấy địa danh này.</p></div>;

  if (arch) {
    return (
      <article>
        {back}
        {picture}
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#C59B47]/60 bg-[#F7F2E7] px-2.5 py-0.5 text-xs font-semibold text-[#6E4F1D]">
          <Icon name="map" className="h-3 w-3" /> Chủ quyền biển đảo
        </p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-1.5 font-display t-xl font-bold text-ink">{arch.name}</h2>
        <p className="t-sm muted">Quần đảo · thuộc {unitTitle(arch.provinceId)}</p>
        <h3 className="mt-3 t-sm font-semibold">Một số đảo</h3>
        <p className="t-sm">{arch.islands.map((i) => i.name).join(', ')}</p>
        <LessonLinks lessons={lessonsFor([arch.id])} />
      </article>
    );
  }

  if (unit) {
    const inside = LANDMARKS.filter((l) => l.provinceId === unit.id);
    return (
      <article>
        {back}
        {picture}
        <h2 ref={headingRef} tabIndex={-1} className="mt-1.5 font-display t-xl font-bold text-ink">{unit.name}</h2>
        <p className="t-sm muted">{unit.type === 'thanh-pho' ? 'Thành phố' : 'Tỉnh'} · {unit.region}</p>
        {ARCHIPELAGOS.filter((a) => a.provinceId === unit.id).map((a) => (
          <p key={a.id} className="mt-2 t-sm">Bao gồm <button type="button" className="font-semibold text-action underline underline-offset-3" onClick={() => onChoose(a.id)}>{a.name}</button>.</p>
        ))}
        <LessonLinks lessons={lessonsFor([unit.id, ...inside.map((l) => l.id)], inside.flatMap((l) => l.lessonIds ?? []))} />
        <h3 className="mt-3 t-sm font-semibold">{inside.length ? `Địa danh trong atlas (${inside.length})` : 'Chưa có địa danh nào trong atlas'}</h3>
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
  return (
    <article>
      {back}
      {picture}
      <p className="mt-2 flex flex-wrap items-center gap-1.5 t-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B47]/60 bg-[#F7F2E7] px-2.5 py-0.5 font-semibold text-ink"><KindMark kind={l.kind} /> {KIND_LABEL[l.kind]}</span>
        {l.tags?.map((t) => <span key={t} className="rounded-full bg-silk px-2 py-0.5 muted">{KIND_LABEL[t]}</span>)}
        {l.era && <span className="rounded-full bg-silk px-2 py-0.5 font-medium text-ink/80">{l.era}</span>}
      </p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-1.5 font-display t-xl font-bold text-ink">{l.name}</h2>
      <p className="t-sm muted">
        <button type="button" className="underline underline-offset-3 hover:text-ink" onClick={() => onChoose(l.provinceId)}>{unitTitle(l.provinceId)}</button>
      </p>
      <p className="mt-3 leading-relaxed">{l.summary}</p>
      {l.coordsNote && <p className="mt-2 t-xs muted">Vị trí: {l.coordsNote}</p>}
      <LessonLinks lessons={lessonsFor([l.id], l.lessonIds)} />
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

/** Contained, scrollable Giấy Dó Heritage Modal for Atlas landmarks, provinces & archipelagos. */
export function AtlasDetailModal({
  id,
  onClose,
  onChoose,
}: {
  id: string;
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  const landmark = LANDMARKS.find((l) => l.id === id);
  const unit = PROVINCES.find((p) => p.id === id);
  const arch = ARCHIPELAGOS.find((a) => a.id === id);
  const archInfo = arch ? ARCHIPELAGO_DETAILS[arch.id] : undefined;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [retryNonce, setRetryNonce] = useState(0);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIdx(0);
    setFailedUrls({});
    setRetryNonce(0);
    setZoomedUrl(null);
  }, [id]);

  const title = landmark?.name ?? arch?.name ?? unit?.name ?? '';
  const presetPhotos = useMemo(() => {
    const raw = [
      ...(landmark?.realPhotos ?? []),
      ...(archInfo?.realPhotos ?? []),
      ...(landmark?.gallery?.map((g) => g.url) ?? [])
    ];
    return Array.from(new Set(raw)).filter(isRealPhotoUrl);
  }, [landmark, archInfo]);

  const { photos: fetchedPhotos, loading: photosLoading } = useRealPhotos(id, title, landmark?.qid, presetPhotos, retryNonce);

  if (!landmark && !unit && !arch) return null;

  const subtitle = landmark
    ? unitTitle(landmark.provinceId)
    : arch
      ? `Quần đảo · thuộc ${unitTitle(arch.provinceId)}`
      : `${unit!.type === 'thanh-pho' ? 'Thành phố' : 'Tỉnh'} · ${unit!.region}`;

  const battles: BattleEvent[] = landmark?.battles ?? archInfo?.battles ?? [];
  const sources: Source[] = landmark?.sources ?? archInfo?.sources ?? [];
  const summary = landmark?.summary ?? archInfo?.summary ?? '';
  const validPhotos = fetchedPhotos.filter((u) => !failedUrls[u]);
  const activeUrl = validPhotos[Math.min(selectedIdx, Math.max(0, validPhotos.length - 1))];
  const lessons = landmark
    ? lessonsFor([landmark.id], landmark.lessonIds)
    : arch
      ? lessonsFor([arch.id])
      : (() => {
          const inside = LANDMARKS.filter((l) => l.provinceId === unit!.id);
          return lessonsFor([unit!.id, ...inside.map((l) => l.id)], inside.flatMap((l) => l.lessonIds ?? []));
        })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#140d08]/75 p-3 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[85vh] w-[92vw] max-w-2xl flex-col overflow-hidden rounded-xl border-2 border-[#C59B47] bg-[#F7F2E7] text-ink shadow-[0_24px_60px_rgba(0,0,0,0.65)] ring-1 ring-[#C59B47]/40">
        {/* Fixed Header */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#C59B47]/45 bg-[#EFE6D5]/75 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {landmark && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C59B47]/70 bg-[#F7F2E7] px-2.5 py-0.5 font-semibold text-ink">
                  <KindMark kind={landmark.kind} /> {KIND_LABEL[landmark.kind]}
                </span>
              )}
              {landmark?.tags?.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[#C59B47]/50 bg-[#F7F2E7] px-2 py-0.5 font-medium text-ink">
                  <KindMark kind={t} /> {KIND_LABEL[t]}
                </span>
              ))}
              {(landmark?.heritageYear || archInfo?.heritageYear) && (
                <span className="rounded-full bg-[#C59B47]/15 px-2.5 py-0.5 font-semibold text-[#6E4F1D]">
                  {landmark?.heritageYear ?? archInfo?.heritageYear}
                </span>
              )}
              {landmark?.era && <span className="rounded-full bg-card px-2 py-0.5 font-medium muted">{landmark.era}</span>}
            </div>
            <h2 id="atlas-modal-title" className="mt-1.5 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
              {title}
            </h2>
            <p className="mt-0.5 text-sm font-medium muted">
              {landmark ? (
                <button type="button" className="underline underline-offset-3 hover:text-ink" onClick={() => onChoose(landmark.provinceId)}>
                  {subtitle}
                </button>
              ) : (
                subtitle
              )}
            </p>
          </div>
          <button
            type="button"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#C59B47]/60 bg-[#F7F2E7] text-lg font-bold text-ink transition-colors hover:bg-[#C59B47]/20"
            aria-label="Đóng"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* 1. Overview */}
          {summary && (
            <section aria-label="Tổng quan địa danh">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5C3E]">Tổng quan &amp; Giá trị Lịch sử – Văn hóa</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/95 sm:text-[15px]">{summary}</p>
              {landmark?.coordsNote && <p className="mt-1.5 text-xs muted">Vị trí: {landmark.coordsNote}</p>}
            </section>
          )}

          {/* Province landmarks or Archipelago islands */}
          {arch && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5C3E]">Các đảo tiêu biểu</h3>
              <p className="mt-1 text-sm text-ink/90">{arch.islands.map((i) => i.name).join(', ')}</p>
            </section>
          )}

          {unit && (
            <section>
              {ARCHIPELAGOS.filter((a) => a.provinceId === unit.id).map((a) => (
                <p key={a.id} className="mb-2 text-sm">
                  Bao gồm quần đảo <button type="button" className="font-semibold text-action underline underline-offset-3" onClick={() => onChoose(a.id)}>{a.name}</button>.
                </p>
              ))}
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5C3E]">
                Địa danh trong tỉnh/thành phố ({LANDMARKS.filter((l) => l.provinceId === unit.id).length})
              </h3>
              <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {LANDMARKS.filter((l) => l.provinceId === unit.id).map((l) => (
                  <li key={l.id}>
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-[#C59B47]/35 bg-card/70 px-3 py-2 text-left text-sm font-medium hover:bg-card" onClick={() => onChoose(l.id)}>
                      <KindMark kind={l.kind} /> <span className="truncate">{l.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 2. Historical Battles & Military Events */}
          {battles.length > 0 && (
            <section aria-label="Các cuộc chiến lịch sử">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C2D23]">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Các cuộc chiến &amp; Sự kiện quân sự lịch sử
              </h3>
              <div className="mt-2.5 space-y-2.5">
                {battles.map((b, idx) => (
                  <div key={idx} className="rounded-lg border border-[#C59B47]/45 bg-card/85 px-3.5 py-2.5 shadow-xs">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-semibold text-ink text-sm">{b.name}</h4>
                      <span className="rounded bg-[#9E2A22]/10 px-2 py-0.5 text-xs font-bold text-[#9E2A22]">{b.period}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink/85 sm:text-sm">{b.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. High-Res Real-World Photo Gallery (strictly real photos, zero blurred map crops) */}
          <section aria-label="Thư viện ảnh chụp thực tế">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5C3E]">Ảnh chụp thực tế &amp; Tư liệu ({validPhotos.length})</h3>
              {photosLoading && <span className="text-xs muted">Đang tải thêm ảnh…</span>}
            </div>
            <div className="mt-2.5 overflow-hidden rounded-lg border border-[#C59B47]/65 bg-[#EFE6D5] p-2">
              {activeUrl ? (
                <div className="relative">
                  <img
                    src={activeUrl}
                    alt={`${title} — ảnh thực tế ${selectedIdx + 1}`}
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full rounded object-cover"
                    onError={() => setFailedUrls((prev) => ({ ...prev, [activeUrl]: true }))}
                  />
                  <button
                    type="button"
                    className="absolute bottom-2 right-2 rounded-full border border-[#C59B47]/80 bg-[#1b130e]/80 px-3 py-1 text-xs font-semibold text-[#F7F2E7] shadow-md hover:bg-[#1b130e]"
                    onClick={() => setZoomedUrl(activeUrl)}
                  >
                    Phóng to toàn màn hình
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <p className="text-sm font-medium text-ink/85">
                    {photosLoading ? 'Đang kết nối Wikimedia Commons để tải ảnh thực địa…' : 'Cần kết nối Internet để tải ảnh chụp thực địa.'}
                  </p>
                  {!photosLoading && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setFailedUrls({});
                        setRetryNonce((n) => n + 1);
                      }}
                    >
                      Thử tải lại ảnh
                    </button>
                  )}
                </div>
              )}
            </div>

            {validPhotos.length > 1 && (
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {validPhotos.map((u, idx) => (
                  <button
                    key={u}
                    type="button"
                    className={`overflow-hidden rounded-lg border-2 p-0.5 transition-all ${selectedIdx === idx ? 'border-[#9E2A22] bg-card shadow-sm' : 'border-[#C59B47]/45 bg-card/60 hover:border-[#C59B47]'}`}
                    onClick={() => setSelectedIdx(idx)}
                  >
                    <img
                      src={u}
                      alt={`${title} góc chụp ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="aspect-video w-full rounded object-cover"
                      loading="lazy"
                      onError={() => setFailedUrls((prev) => ({ ...prev, [u]: true }))}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          {zoomedUrl && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
              role="dialog"
              aria-label={`Ảnh phóng to: ${title}`}
              onClick={() => setZoomedUrl(null)}
            >
              <button
                type="button"
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-[#C59B47] bg-[#1b130e] text-xl font-bold text-[#F7F2E7]"
                aria-label="Đóng ảnh phóng to"
                onClick={() => setZoomedUrl(null)}
              >
                ×
              </button>
              <img src={zoomedUrl} alt={title} referrerPolicy="no-referrer" className="max-h-[90vh] max-w-[94vw] rounded-lg object-contain shadow-2xl" />
            </div>
          )}

          {/* 4. Authoritative Sources */}
          {sources.length > 0 && (
            <section aria-label="Nguồn tham khảo uy tín" className="border-t border-[#C59B47]/35 pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A5C3E]">Nguồn tham khảo uy tín</h3>
              <ul className="mt-1.5 space-y-1 text-xs">
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-action">{s.title}</a>{' '}
                    <span className="muted">({s.license})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Fixed Footer */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#C59B47]/45 bg-[#EFE6D5]/85 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {lessons.map((x) => (
              <Link key={x.id} to="/lesson/$id" params={{ id: x.id }} className="btn btn-primary btn-sm shadow-xs ring-1 ring-[#C59B47]/50">
                <Icon name="book" /> Mở bài giảng: {x.title}
              </Link>
            ))}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Thu nhỏ toàn cảnh
          </button>
        </footer>
      </div>
    </div>
  );
}
