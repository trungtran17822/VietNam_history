import { describe, expect, it } from 'vitest';
import illustration from '../../content/atlas/illustration-v2.json';
import { ARCHIPELAGOS, KIND_COLORS, LANDMARKS, PROVINCES, REGIONS, placeOf } from './places';
import { KINDS } from './search';

describe('places: one id space for the whole atlas', () => {
  it('has 71 landmarks, 34 province-level units and the two archipelagos', () => {
    expect(LANDMARKS).toHaveLength(71);
    expect(PROVINCES).toHaveLength(34);
    expect(ARCHIPELAGOS.map((a) => a.id).sort()).toEqual(['hoang-sa', 'truong-sa']);
    expect(PROVINCES.every((p) => REGIONS.includes(p.region))).toBe(true);
    expect(new Set([...LANDMARKS, ...PROVINCES, ...ARCHIPELAGOS].map((x) => x.id)).size).toBe(107); // no id is used twice
  });

  it('placeOf opens every id (lessons link to #/atlas?place=<id>) and nothing else', () => {
    for (const l of LANDMARKS) expect(placeOf(l.id)).toMatchObject({ id: l.id, type: 'landmark', name: l.name });
    for (const p of PROVINCES) expect(placeOf(p.id)).toMatchObject({ type: 'province', name: p.name });
    for (const a of ARCHIPELAGOS) expect(placeOf(a.id)).toMatchObject({ type: 'archipelago', name: a.name });
    expect(placeOf('khong-co-id')).toBeNull();
    expect(placeOf('')).toBeNull();
    expect(placeOf(undefined)).toBeNull();
  });

  it('every spot of the illustration is a place of the atlas, and some places are not in the picture', () => {
    const spotIds = new Set(illustration.spots.map((s) => s.id));
    for (const id of spotIds) expect(placeOf(id), id).not.toBeNull();
    expect(placeOf('dong-da')).not.toBeNull();
    expect(spotIds.has('dong-da')).toBe(false); // such a place opens a card without a picture
    expect(spotIds.has('hoang-sa') && spotIds.has('truong-sa')).toBe(true); // both archipelagos are on the picture
  });

  it('has a colour for every kind', () => {
    for (const k of KINDS) expect(KIND_COLORS[k.id]).toHaveLength(2);
  });
});
