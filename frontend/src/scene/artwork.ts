// Canvas painting for the silk map: the table artwork (terrain preset + lesson features) and the
// unit/prop sprites. No three.js here, so lesson thumbnails can paint without loading the 3D chunk.
// Never draw text here: labels are HTML overlays (Vietnamese diacritics, accessibility).
import type { Point, Scene } from '../lib/lesson-schema';

export type Palette = ReturnType<typeof palette>;

/** Colors come from CSS variables (src/styles.css); add a token there, not a hex here. */
export function palette() {
  const styles = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles?.getPropertyValue(name).trim() || fallback;
  return {
    silk: read('--silk-ivory', '#EFE5CD'),
    light: read('--silk-light', '#F6EEDB'),
    mist: read('--mist', '#D9D3C1'),
    ink: read('--ink', '#2B2926'),
    sepia: read('--sepia', '#7A5C3E'),
    ochre: read('--ochre', '#B79B5E'),
    green: read('--deep-green', '#4F6355'),
    water: read('--water-grey-blue', '#9DB0B3'),
    red: read('--vermilion', '#A8412F'),
    indigo: read('--muted-indigo', '#3E5C76'),
    washes: [read('--scene-wash-celadon', '#9EAA8D'), read('--scene-wash-green', '#AAB19A'), read('--scene-wash-ochre', '#B89D76'), read('--scene-wash-earth', '#B9A47A')],
    mountains: [read('--water-grey-blue', '#9DB0B3'), read('--scene-mountain-soft', '#B5B9AB'), read('--scene-mountain-light', '#C6C4B4'), read('--scene-mountain-pale', '#D5CEBC')],
    waterGlint: read('--scene-water-glint', '#E6E0D0'),
    paddy: [read('--scene-paddy-green', '#87927A'), read('--scene-paddy-ochre', '#B59E6D')],
    track: read('--scene-track', '#B19B7C'),
    skin: read('--scene-skin-placeholder', '#C7A47D'),
    headwear: [read('--scene-headwear-placeholder', '#C7B890'), read('--scene-headwear-dark', '#A89573')],
    sideA: [read('--scene-side-a-muted', '#B65F4F'), read('--scene-side-a-light', '#C08169'), read('--scene-side-a-dark', '#884F43')],
    sideB: [read('--scene-side-b-muted', '#536C80'), read('--scene-side-b-light', '#70808A'), read('--scene-side-b-dark', '#46596A')],
    elephant: read('--scene-elephant', '#858879'),
    elephantLight: read('--scene-elephant-light', '#909184'),
    shellHighlight: read('--scene-shell-highlight', '#E5D9C3'),
    roof: read('--scene-roof', '#9A8064'),
    structure: read('--scene-structure', '#75634D')
  };
}

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// The table is 240 x 186 world units painted on an 1800 x 1400 canvas; +z points at the viewer.
export const TABLE = { width: 240, depth: 186, canvasWidth: 1800, canvasHeight: 1400 };
const PX = TABLE.canvasWidth / TABLE.width;
const toCanvas = ([x, z]: Point): Point => [(x + TABLE.width / 2) * PX, (z + TABLE.depth / 2) * (TABLE.canvasHeight / TABLE.depth)];

type Terrain = Scene['terrain'];
// Per-preset base painting. ponytail: six presets cover the planned lessons; add one when a lesson needs it.
const PRESETS: Record<Terrain, { mountains: 'far' | 'sides' | 'ring' | 'none'; paddies: number; sea?: boolean; blocks?: boolean }> = {
  plain: { mountains: 'far', paddies: 58 },
  river: { mountains: 'far', paddies: 36 },
  'mountain-pass': { mountains: 'sides', paddies: 14 },
  basin: { mountains: 'ring', paddies: 44 },
  'coast-river': { mountains: 'far', paddies: 30, sea: true },
  urban: { mountains: 'none', paddies: 12, blocks: true }
};

function smoothPath(context: CanvasRenderingContext2D, points: Point[]) {
  const pts = points.map(toCanvas);
  context.beginPath();
  context.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mid: Point = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
    context.quadraticCurveTo(pts[i][0], pts[i][1], mid[0], mid[1]);
  }
  context.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}

function areaOf(feature: Scene['features'][number]): { cx: number; cy: number; rx: number; ry: number } {
  if (feature.points && feature.points.length >= 2) {
    const [a, b] = [toCanvas(feature.points[0]), toCanvas(feature.points[feature.points.length - 1])];
    return { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, rx: Math.abs(a[0] - b[0]) / 2 + 40, ry: Math.abs(a[1] - b[1]) / 2 + 40 };
  }
  const [cx, cy] = toCanvas(feature.at ?? [0, 0]);
  const r = (feature.size ?? 20) * PX;
  return { cx, cy, rx: r, ry: r * 0.8 };
}

export function paintMap(canvas: HTMLCanvasElement, scene: Scene, colors: Palette = palette(), seed = 1789) {
  const { canvasWidth: width, canvasHeight: height } = TABLE;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const random = seededRandom(seed);
  const preset = PRESETS[scene.terrain] ?? PRESETS.plain;
  context.fillStyle = colors.silk;
  context.fillRect(0, 0, width, height);

  const wash = (x: number, y: number, radius: number, color: string, alpha: string) => {
    const gradient = context.createRadialGradient(x, y, radius * 0.12, x, y, radius);
    gradient.addColorStop(0, `${color}${alpha}`);
    gradient.addColorStop(0.72, `${color}55`);
    gradient.addColorStop(1, `${color}00`);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radius * 1.3, radius * 0.75, random() * 0.5, 0, Math.PI * 2);
    context.fill();
  };
  wash(310, 830, 420, colors.washes[0], '66');
  wash(1310, 890, 470, colors.washes[1], '70');
  wash(910, 610, 520, colors.washes[2], '45');
  wash(860, 1170, 330, colors.washes[3], '46');

  // Mountain washes: receding ridges along the far edge, the sides, or all around.
  const ridge = (layer: number, orient: 'top' | 'left' | 'right' | 'bottom') => {
    const alpha = [0.38, 0.32, 0.25, 0.18][layer];
    context.beginPath();
    const along = orient === 'top' || orient === 'bottom' ? width : height;
    const base = 250 + layer * 72;
    for (let s = 0; s <= along; s += 16) {
      const h = Math.sin(s * 0.009 + layer * 1.8) * (48 - layer * 6) + Math.sin(s * 0.022 + layer) * 17;
      const d = orient === 'top' ? base + h : orient === 'bottom' ? height - base + 150 - h : base - 120 + h;
      const [x, y] = orient === 'top' || orient === 'bottom' ? [s, d] : orient === 'left' ? [d, s] : [width - d, s];
      if (s === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    if (orient === 'top') { context.lineTo(width, 0); context.lineTo(0, 0); }
    if (orient === 'bottom') { context.lineTo(width, height); context.lineTo(0, height); }
    if (orient === 'left') { context.lineTo(0, height); context.lineTo(0, 0); }
    if (orient === 'right') { context.lineTo(width, height); context.lineTo(width, 0); }
    context.closePath();
    context.fillStyle = colors.mountains[layer];
    context.globalAlpha = alpha;
    context.fill();
    context.globalAlpha = 1;
  };
  for (let layer = 0; layer < 4; layer++) {
    if (preset.mountains === 'far') {
      // The v1 far ridge: a band from y≈250 to the top edge, fading.
      context.beginPath();
      const baseline = 250 + layer * 72;
      context.moveTo(0, baseline + 150);
      for (let x = 0; x <= width; x += 16) context.lineTo(x, baseline + Math.sin(x * 0.009 + layer * 1.8) * (48 - layer * 6) + Math.sin(x * 0.022 + layer) * 17);
      context.lineTo(width, baseline + 250);
      context.lineTo(0, baseline + 250);
      context.closePath();
      context.fillStyle = colors.mountains[layer];
      context.globalAlpha = [0.38, 0.32, 0.25, 0.18][layer];
      context.fill();
      context.globalAlpha = 1;
    }
    if (preset.mountains === 'sides' || preset.mountains === 'ring') { ridge(layer, 'left'); ridge(layer, 'right'); }
    if (preset.mountains === 'ring') { ridge(layer, 'top'); ridge(layer, 'bottom'); }
  }

  if (preset.sea) {
    const gradient = context.createLinearGradient(0, height * 0.7, 0, height);
    gradient.addColorStop(0, `${colors.water}00`);
    gradient.addColorStop(1, `${colors.water}cc`);
    context.fillStyle = gradient;
    context.fillRect(0, height * 0.7, width, height * 0.3);
  }

  // Rice-paddy washes with broken ink edges.
  for (let index = 0; index < preset.paddies; index++) {
    const x = 35 + random() * (width - 70);
    const y = 610 + random() * 720;
    const rx = 35 + random() * 115;
    const ry = 17 + random() * 48;
    context.save();
    context.translate(x, y);
    context.rotate((random() - 0.5) * 0.5);
    context.beginPath();
    for (let point = 0; point <= 24; point++) {
      const angle = (point / 24) * Math.PI * 2;
      const wobble = 0.84 + random() * 0.22;
      if (point === 0) context.moveTo(Math.cos(angle) * rx * wobble, Math.sin(angle) * ry * wobble);
      else context.lineTo(Math.cos(angle) * rx * wobble, Math.sin(angle) * ry * wobble);
    }
    context.closePath();
    context.fillStyle = colors.paddy[random() > 0.5 ? 0 : 1];
    context.globalAlpha = 0.16 + random() * 0.12;
    context.fill();
    context.globalAlpha = 0.3;
    context.lineWidth = 2 + random() * 2;
    context.strokeStyle = colors.sepia;
    context.stroke();
    context.restore();
  }

  if (preset.blocks) {
    for (let i = 0; i < 70; i++) {
      context.globalAlpha = 0.18 + random() * 0.15;
      context.fillStyle = random() > 0.5 ? colors.roof : colors.structure;
      context.fillRect(400 + random() * 1000, 450 + random() * 600, 20 + random() * 50, 14 + random() * 36);
    }
    context.globalAlpha = 1;
  }

  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const feature of scene.features) {
    const size = (feature.size ?? 0) * PX;
    context.save();
    if (feature.type === 'river' && feature.points) {
      smoothPath(context, feature.points);
      context.strokeStyle = colors.water;
      context.globalAlpha = 0.68;
      context.lineWidth = size || 94;
      context.stroke();
      context.globalAlpha = 0.38;
      context.lineWidth = (size || 94) * 0.49;
      context.strokeStyle = colors.waterGlint;
      context.stroke();
      // Broken pale brush glints along the water.
      context.globalAlpha = 0.48;
      context.lineWidth = 3;
      const pts = feature.points.map(toCanvas);
      for (let line = 0; line < 28; line++) {
        const i = Math.floor(random() * (pts.length - 1));
        const t = random();
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
        const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t + (random() - 0.5) * (size || 94) * 0.6;
        context.beginPath();
        context.moveTo(x - 30 - random() * 60, y);
        context.quadraticCurveTo(x, y + (random() - 0.5) * 10, x + 30 + random() * 60, y + (random() - 0.5) * 8);
        context.stroke();
      }
    } else if (feature.type === 'road' && feature.points) {
      smoothPath(context, feature.points);
      const main = (feature.size ?? 1.6) >= 2.5;
      context.strokeStyle = main ? colors.sepia : colors.track;
      context.globalAlpha = main ? 0.5 : 0.42;
      context.lineWidth = size || 12;
      context.stroke();
      context.globalAlpha = 0.25;
      context.lineWidth = 2;
      context.strokeStyle = colors.light;
      context.stroke();
    } else if (feature.type === 'village') {
      const { cx, cy, rx, ry } = areaOf(feature);
      for (let house = 0; house < 17; house++) {
        context.save();
        context.translate(cx + (random() - 0.5) * 2 * rx, cy + (random() - 0.5) * 2 * ry);
        context.rotate((random() - 0.5) * 0.3);
        context.fillStyle = colors.sepia;
        context.globalAlpha = 0.72;
        context.beginPath();
        context.moveTo(-15, 2); context.lineTo(0, -10); context.lineTo(17, 2); context.lineTo(12, 4); context.lineTo(0, -5); context.lineTo(-11, 5);
        context.closePath();
        context.fill();
        context.fillStyle = colors.ink;
        context.globalAlpha = 0.45;
        context.fillRect(-10, 4, 20, 8);
        context.restore();
      }
    } else if (feature.type === 'forest') {
      const { cx, cy, rx, ry } = areaOf(feature);
      for (let grove = 0; grove < 36; grove++) {
        const x = cx + (random() - 0.5) * 2 * (rx + 300);
        const y = cy + (random() - 0.5) * 2 * (ry + 200);
        context.strokeStyle = random() > 0.5 ? colors.green : colors.ink;
        context.globalAlpha = 0.27;
        context.lineWidth = 2 + random() * 2;
        context.beginPath();
        context.moveTo(x, y + 22);
        context.quadraticCurveTo(x + (random() - 0.5) * 18, y, x + (random() - 0.5) * 38, y - 25);
        context.moveTo(x + 4, y + 18);
        context.quadraticCurveTo(x - 18, y + 3, x - 25, y - 8);
        context.stroke();
      }
    } else if (feature.type === 'hill') {
      const { cx, cy, rx, ry } = areaOf(feature);
      for (let ring = 0; ring < 4; ring++) {
        context.beginPath();
        context.ellipse(cx, cy - ring * ry * 0.12, rx * (1 - ring * 0.2), ry * (0.7 - ring * 0.13), 0, 0, Math.PI * 2);
        context.fillStyle = colors.mountains[ring];
        context.globalAlpha = 0.35;
        context.fill();
        context.globalAlpha = 0.3;
        context.strokeStyle = colors.sepia;
        context.lineWidth = 2;
        context.stroke();
      }
    } else if (feature.type === 'marsh') {
      const { cx, cy, rx, ry } = areaOf(feature);
      context.strokeStyle = colors.water;
      context.lineWidth = 3;
      for (let i = 0; i < 60; i++) {
        const x = cx + (random() - 0.5) * 2 * rx;
        const y = cy + (random() - 0.5) * 2 * ry;
        context.globalAlpha = 0.35 + random() * 0.25;
        context.beginPath(); context.moveTo(x - 14, y); context.lineTo(x + 14, y); context.stroke();
        context.strokeStyle = random() > 0.6 ? colors.green : colors.water;
        context.beginPath(); context.moveTo(x, y); context.lineTo(x + 3, y - 12); context.stroke();
      }
    } else if (feature.type === 'airfield') {
      const { cx, cy, rx } = areaOf(feature);
      context.translate(cx, cy);
      context.rotate(-0.15);
      context.fillStyle = colors.track;
      context.globalAlpha = 0.55;
      context.fillRect(-rx, -22, rx * 2, 44);
      context.strokeStyle = colors.light;
      context.globalAlpha = 0.8;
      context.lineWidth = 3;
      context.setLineDash([24, 18]);
      context.beginPath(); context.moveTo(-rx + 20, 0); context.lineTo(rx - 20, 0); context.stroke();
    } else if (feature.type === 'stakes') {
      // A field of sharpened stakes in the water: short slanted ink strokes in staggered rows.
      const { cx, cy, rx, ry } = areaOf(feature);
      context.strokeStyle = colors.ink;
      context.lineWidth = 4;
      for (let i = 0; i < 70; i++) {
        const x = cx + (random() - 0.5) * 2 * rx;
        const y = cy + (random() - 0.5) * 2 * ry;
        context.globalAlpha = 0.45 + random() * 0.3;
        context.beginPath(); context.moveTo(x, y + 9); context.lineTo(x + 4, y - 9); context.stroke();
      }
    }
    context.restore();
  }

  // Faint silk fibers, then the hand-drawn margin with corner rosettes.
  context.save();
  context.globalAlpha = 0.09;
  context.strokeStyle = colors.sepia;
  context.lineWidth = 1;
  for (let fiber = 0; fiber < 3600; fiber++) {
    const x = random() * width;
    const y = random() * height;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 2 + random() * 8, y + (random() - 0.5) * 2);
    context.stroke();
  }
  context.globalAlpha = 0.5;
  context.lineWidth = 3;
  context.strokeRect(28, 28, width - 56, height - 56);
  context.globalAlpha = 0.28;
  context.lineWidth = 1;
  context.strokeRect(39, 39, width - 78, height - 78);
  for (const [x, y] of [[56, 56], [width - 56, 56], [56, height - 56], [width - 56, height - 56]]) {
    context.beginPath(); context.arc(x, y, 14, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.moveTo(x - 8, y); context.lineTo(x + 8, y); context.moveTo(x, y - 8); context.lineTo(x, y + 8); context.stroke();
  }
  context.restore();
  return canvas;
}

/** A static picture of the lesson map, with routes painted at their final extent (thumbnails). */
export function paintThumbnail(canvas: HTMLCanvasElement, scene: Scene, factionColors: { a: string; b: string }) {
  const colors = palette();
  paintMap(canvas, scene, colors);
  const context = canvas.getContext('2d')!;
  context.lineCap = 'round';
  for (const route of scene.routes) {
    smoothPath(context, route.points);
    context.strokeStyle = factionColors[route.faction];
    context.globalAlpha = 0.66;
    context.lineWidth = 9;
    context.setLineDash([26, 13]);
    context.stroke();
  }
  return canvas;
}

/** How far along each route is drawn at timeline `time` (0 before `from`, 1 after `to`). */
export function routeReveal(route: Scene['routes'][number], time: number) {
  return Math.min(1, Math.max(0, (time - route.from) / Math.max(0.001, route.to - route.from)));
}

/**
 * Advance arrows on the table (canvas coordinates of TABLE): each route grows from its first point
 * as the timeline passes from `from` to `to`, with an arrowhead at the tip.
 */
export function paintRoutes(context: CanvasRenderingContext2D, routes: Scene['routes'], factionColors: { a: string; b: string }, time: number) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const route of routes) {
    const reveal = routeReveal(route, time);
    if (reveal <= 0) continue;
    const pts = route.points.map(toCanvas);
    const lengths = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    // Only the first `reveal` of the smoothed path is stroked (a dash as long as the visible part).
    smoothPath(context, route.points);
    context.setLineDash([total * reveal, total * 2]);
    context.strokeStyle = factionColors[route.faction];
    context.globalAlpha = 0.72;
    context.lineWidth = 11;
    context.stroke();
    // Arrowhead where the drawn part ends, pointing along that segment.
    let left = total * reveal;
    let i = 0;
    while (i < lengths.length - 1 && left > lengths[i]) left -= lengths[i++];
    const t = lengths[i] ? Math.min(1, left / lengths[i]) : 1;
    const tip: Point = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
    const angle = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
    context.setLineDash([]);
    context.globalAlpha = 0.85;
    context.fillStyle = factionColors[route.faction];
    context.beginPath();
    context.moveTo(tip[0] + Math.cos(angle) * 22, tip[1] + Math.sin(angle) * 22);
    context.lineTo(tip[0] + Math.cos(angle + 2.5) * 22, tip[1] + Math.sin(angle + 2.5) * 22);
    context.lineTo(tip[0] + Math.cos(angle - 2.5) * 22, tip[1] + Math.sin(angle - 2.5) * 22);
    context.closePath();
    context.fill();
  }
  context.restore();
}

export type SpriteKind = 'soldier' | 'elephant' | 'cannon' | 'boat' | 'tank' | 'tent' | 'watchtower' | 'village' | 'bamboo' | 'palisade' | 'torch' | 'banner';

/** Top-down ink glyphs. Costumes and faction pigments are illustrative placeholders. */
export function paintSprite(kind: SpriteKind, colors: Palette, variant: number, team: string, side: 'a' | 'b') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const ink = colors.ink;
  const tones = [team, ...(side === 'b' ? colors.sideB : colors.sideA)];
  const garment = tones[variant % tones.length];
  const oval = (x: number, y: number, rx: number, ry: number, fill: string, stroke?: string) => {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.lineWidth = 4; c.strokeStyle = stroke; c.stroke(); }
  };
  const line = (color: string, width: number, ...pts: number[]) => {
    c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.stroke();
  };
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (kind === 'soldier' || kind === 'banner') {
    oval(64, 69, 25 + variant * 2.1, 34, garment, ink);
    oval(64, 36, 20, 17, colors.skin, ink);
    oval(64, 34, 19 + (variant % 3), 10 + (variant % 3), colors.headwear[variant % 2], ink);
    c.strokeStyle = ink; c.lineWidth = 6;
    c.beginPath(); c.moveTo(45, 59); c.lineTo(28, 78); c.moveTo(83, 59); c.lineTo(100, 78); c.stroke();
    c.strokeStyle = colors.sepia; c.lineWidth = 4;
    c.beginPath(); c.moveTo(56, 95); c.lineTo(50, 119); c.moveTo(72, 95); c.lineTo(78, 119); c.stroke();
    c.strokeStyle = variant % 2 ? colors.shellHighlight : colors.sepia; c.lineWidth = 3;
    c.beginPath(); c.moveTo(52, 69); c.quadraticCurveTo(64, 77 + (variant % 4), 76, 69); c.stroke();
    line(ink, 4, 96, 93, 112, 14);
    c.fillStyle = kind === 'banner' ? team : colors.ochre;
    c.beginPath(); c.moveTo(110, 18); c.quadraticCurveTo(125, 22, 113, 48); c.quadraticCurveTo(108, 38, 104, 35); c.fill();
  } else if (kind === 'elephant') {
    oval(64, 68, 34, 44, colors.elephant, ink); oval(64, 30, 25, 23, colors.elephantLight, ink);
    c.strokeStyle = colors.shellHighlight; c.lineWidth = 7;
    c.beginPath(); c.moveTo(53, 38); c.quadraticCurveTo(43, 61, 55, 62); c.moveTo(75, 38); c.quadraticCurveTo(85, 61, 73, 62); c.stroke();
    oval(64, 62, 18, 19, colors.ochre, ink);
    line(team, 5, 64, 8, 64, 27);
    c.fillStyle = team; c.beginPath(); c.moveTo(64, 9); c.lineTo(88, 12); c.lineTo(65, 24); c.fill();
  } else if (kind === 'cannon') {
    oval(42, 86, 15, 15, colors.structure, ink); oval(86, 86, 15, 15, colors.structure, ink);
    c.fillStyle = colors.ink; c.save(); c.translate(64, 70); c.rotate(-0.5); c.fillRect(-10, -44, 20, 70); c.restore();
    oval(64, 74, 12, 12, team, ink);
  } else if (kind === 'boat') {
    c.fillStyle = colors.structure; c.strokeStyle = ink; c.lineWidth = 4;
    c.beginPath(); c.moveTo(64, 8); c.quadraticCurveTo(100, 50, 88, 118); c.lineTo(40, 118); c.quadraticCurveTo(28, 50, 64, 8); c.closePath(); c.fill(); c.stroke();
    line(colors.shellHighlight, 3, 64, 30, 64, 104);
    c.fillStyle = team; c.beginPath(); c.moveTo(64, 40); c.lineTo(96, 62); c.lineTo(64, 80); c.fill();
  } else if (kind === 'tank') {
    c.fillStyle = colors.structure; c.strokeStyle = ink; c.lineWidth = 4;
    c.fillRect(30, 26, 68, 86); c.strokeRect(30, 26, 68, 86);
    c.fillStyle = ink; c.fillRect(22, 22, 10, 94); c.fillRect(96, 22, 10, 94);
    oval(64, 70, 18, 18, team, ink);
    line(ink, 8, 64, 62, 64, 6);
  } else if (kind === 'tent' || kind === 'watchtower') {
    c.fillStyle = kind === 'tent' ? colors.sepia : colors.structure;
    c.beginPath(); c.moveTo(64, 15); c.lineTo(110, 105); c.quadraticCurveTo(65, 120, 18, 105); c.closePath(); c.fill();
    c.strokeStyle = ink; c.lineWidth = 4; c.stroke();
    line(colors.silk, 3, 64, 24, 64, 109);
    if (kind === 'watchtower') oval(64, 64, 18, 18, colors.ochre, ink);
  } else if (kind === 'village') {
    for (let house = 0; house < 3; house++) {
      const x = 25 + house * 36;
      c.fillStyle = colors.roof; c.strokeStyle = ink; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, 58); c.lineTo(x + 14, 43); c.lineTo(x + 29, 58); c.lineTo(x + 25, 61); c.lineTo(x + 14, 51); c.lineTo(x + 4, 61); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = colors.silk; c.fillRect(x + 6, 60, 17, 15);
    }
  } else if (kind === 'bamboo') {
    for (let stem = 0; stem < 5; stem++) {
      const x = 34 + stem * 14;
      c.strokeStyle = colors.green; c.lineWidth = 5;
      c.beginPath(); c.moveTo(x, 112); c.quadraticCurveTo(x + (stem - 2) * 2, 60, x + (stem - 2) * 4, 18); c.stroke();
      c.lineWidth = 3;
      for (let leaf = 0; leaf < 3; leaf++) {
        const y = 42 + leaf * 19;
        const dir = stem % 2 ? 1 : -1;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + dir * 28, y - 18, x + dir * 40, y - 5); c.stroke();
      }
    }
  } else if (kind === 'palisade') {
    for (let post = 0; post < 4; post++) line(colors.sepia, 10, 24 + post * 26, 102, 24 + post * 26, 26 + (post % 2) * 7);
    line(ink, 3, 15, 75, 111, 75);
  } else if (kind === 'torch') {
    oval(64, 88, 19, 10, colors.sepia, ink);
    c.fillStyle = colors.red; c.beginPath(); c.moveTo(64, 16); c.quadraticCurveTo(101, 55, 64, 81); c.quadraticCurveTo(28, 55, 64, 16); c.fill();
    oval(64, 58, 12, 18, colors.ochre);
  }
  return canvas;
}
