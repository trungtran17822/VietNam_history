// Pieces the atlas views share: kind marks, the credit, the lesson links and the place card. No map code (no scene.ts, no three.js), so the
// illustration atlas can use them without loading the 3D map; the 3D AtlasView (on hold) uses them too.
import { Link } from '@tanstack/react-router';
import type { ReactNode, RefObject } from 'react';
import { Icon } from '../../components/ui';
import { currentUser } from '../../lib/auth';
import { getAllLessons, isVisibleForStudent } from '../../lib/storage';
import { ARCHIPELAGOS, KIND_COLORS, KIND_LABEL, LANDMARKS, PROVINCES, REGIONS } from './places';
import type { Kind } from './search';

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
        <Link key={x.id} to="/lesson/$id" params={{ id: x.id }} className="btn btn-primary justify-start text-left">
          <Icon name="book" /> Mở bài giảng: {x.title}
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
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 t-xl font-bold">{arch.name}</h2>
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
        <h2 ref={headingRef} tabIndex={-1} className="mt-1 t-xl font-bold">{unit.name}</h2>
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
