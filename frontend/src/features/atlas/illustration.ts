// "One illustration, many crops" for the AI picture of Viet Nam (render/out/illustration-v2.webp). Pure functions, no DOM:
// the view, the tests and the harness share them. The manifest (illustration-v2.json) lists, per place id, a box in the
// image's own pixels; only places the picture really shows have a spot, so a missing id means "no crop", never a guess.
// Same idea as thumbs.ts, but boxes are free-form (not a grid) and carry how sure the match is.

export type Confidence = 'ro' | 'doan'; // ro = clearly recognisable, doan = a guess that a person must confirm

export interface IllustrationSpot {
  /** A landmark id or an archipelago id ('hoang-sa', 'truong-sa'). */
  id: string;
  /** [x0, y0, x1, y1] in image pixels. */
  box: [number, number, number, number];
  confidence: Confidence;
}

export interface IllustrationManifest {
  version: number;
  /** [width, height] of the image in px. */
  size: [number, number];
  spots: IllustrationSpot[];
}

export interface CropStyle {
  width: string;
  height: string;
  backgroundSize: string;
  backgroundPosition: string;
}

const area = (s: IllustrationSpot) => (s.box[2] - s.box[0]) * (s.box[3] - s.box[1]);
const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/** The spot of `id`, or null when the picture does not show that place. */
export function spotOf(m: IllustrationManifest, id: string): IllustrationSpot | null {
  return m.spots.find((s) => s.id === id) ?? null;
}

/**
 * Place id under a point of the picture shown at w × h CSS px (x/y relative to its top-left corner).
 * When boxes overlap the smallest one wins, so a small building inside a larger scene stays reachable.
 * Null outside every box or for unusable input.
 */
export function spotAt(m: IllustrationManifest, x: number, y: number, w: number, h: number): string | null {
  if (!(w > 0) || !(h > 0) || Number.isNaN(x) || Number.isNaN(y)) return null;
  const ix = (x / w) * m.size[0], iy = (y / h) * m.size[1];
  let best: IllustrationSpot | null = null;
  for (const s of m.spots) {
    if (ix < s.box[0] || ix >= s.box[2] || iy < s.box[1] || iy >= s.box[3]) continue;
    if (!best || area(s) < area(best)) best = s;
  }
  return best?.id ?? null;
}

/** Centre of a spot as percentages of the image, for positioning a hotspot over the picture. */
export function spotCentre(m: IllustrationManifest, spot: IllustrationSpot): { left: string; top: string } {
  const cx = (spot.box[0] + spot.box[2]) / 2, cy = (spot.box[1] + spot.box[3]) / 2;
  return { left: `${(cx / m.size[0]) * 100}%`, top: `${(cy / m.size[1]) * 100}%` };
}

/**
 * CSS for a crop up to `displayW` CSS px wide. The relative background size and position keep the crop aligned
 * if the available width shrinks. Add `backgroundImage: url(image)` and `backgroundRepeat: 'no-repeat'`.
 * `scale` is the enlargement of the source (display px per image px): above ~3 the picture is visibly soft.
 */
export function cropStyle(m: IllustrationManifest, id: string, displayW: number) {
  const spot = spotOf(m, id);
  if (!spot || !(displayW > 0)) return null;
  const [x0, y0, x1, y1] = spot.box, bw = x1 - x0, bh = y1 - y0;
  if (!(bw > 0) || !(bh > 0)) return null;
  const [imageW, imageH] = m.size;
  // CSS offsets a background by (frame size − image size) × its position percentage.
  const position = (start: number, remaining: number) => remaining ? `${start / remaining * 100}%` : '0%';
  return {
    width: px(displayW),
    maxWidth: '100%',
    aspectRatio: `${bw} / ${bh}`,
    backgroundSize: `${imageW / bw * 100}% ${imageH / bh * 100}%`,
    backgroundPosition: `${position(x0, imageW - bw)} ${position(y0, imageH - bh)}`,
    scale: displayW / bw,
  };
}

/**
 * Like cropStyle but for a fixed frame (w × h CSS px): the picture is scaled so the box covers the frame and the box's
 * centre sits in the middle, clamped so the background never leaves the image. For uniform tiles (cards, list rows).
 */
export function coverStyle(m: IllustrationManifest, id: string, w: number, h: number): (CropStyle & { scale: number }) | null {
  const spot = spotOf(m, id);
  if (!spot || !(w > 0) || !(h > 0)) return null;
  const [x0, y0, x1, y1] = spot.box, bw = x1 - x0, bh = y1 - y0;
  if (!(bw > 0) || !(bh > 0)) return null;
  const k = Math.max(w / bw, h / bh);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const left = clamp(w / 2 - ((x0 + x1) / 2) * k, w - m.size[0] * k, 0);
  const top = clamp(h / 2 - ((y0 + y1) / 2) * k, h - m.size[1] * k, 0);
  return { width: px(w), height: px(h), backgroundSize: `${px(m.size[0] * k)} ${px(m.size[1] * k)}`, backgroundPosition: `${px(left)} ${px(top)}`, scale: k };
}
