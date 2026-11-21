// The atlas's places without any map code: the 71 landmarks, the 34 province-level units and the two archipelagos, read straight from the
// atlas JSON (no scene.ts, so no three.js). One id space, as in the 3D scene: lessons link to #/atlas?place=<id> and ANY of these ids opens a card.
import landmarkJson from '../../content/atlas/landmarks.json';
import topoJson from '../../content/atlas/provinces.topo.json';
import { KINDS, type Kind, type Landmark, type Province } from './search';

export const LANDMARKS = landmarkJson as Landmark[];
interface TopoObject { geometries: { properties: Record<string, unknown> }[] }
const objects = (topoJson as unknown as { objects: Record<string, TopoObject> }).objects;
export const PROVINCES = (objects.provinces.geometries.map((g) => g.properties) as unknown as Province[]).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
export const REGIONS = ['Bắc Bộ', 'Trung Bộ', 'Nam Bộ'];
export interface Archipelago { id: string; name: string; provinceId: string; islands: { name: string }[] }
export const ARCHIPELAGOS = objects.archipelagos.geometries.map((g) => g.properties as unknown as Archipelago);

export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<Kind, string>;
/** Marker colour per kind: [CSS variable, fallback]. The legend marks use the same pair. */
export const KIND_COLORS: Record<Kind, [string, string]> = {
  'chien-truong': ['--vermilion', '#A8412F'],
  'kinh-do': ['--ochre', '#B79B5E'],
  unesco: ['--muted-indigo', '#3E5C76'],
  'di-tich': ['--sepia', '#7A5C3E'],
  'danh-thang': ['--deep-green', '#4F6355'],
};

export const provinceName = (id: string) => PROVINCES.find((p) => p.id === id)?.name ?? '';

export type PlaceType = 'landmark' | 'archipelago' | 'province';
export interface Place { id: string; type: PlaceType; name: string }
/** Any atlas id to its name and type; null for an unknown id. */
export function placeOf(id: string | null | undefined): Place | null {
  if (!id) return null;
  const l = LANDMARKS.find((x) => x.id === id);
  if (l) return { id, type: 'landmark', name: l.name };
  const a = ARCHIPELAGOS.find((x) => x.id === id);
  if (a) return { id, type: 'archipelago', name: a.name };
  const p = PROVINCES.find((x) => x.id === id);
  return p ? { id, type: 'province', name: p.name } : null;
}
