// Museum-grade 2048x2048 procedural battlefield terrain & tactical map painting (no three.js, no text).
// Combines multi-octave FBM steppe geology, winter ridge frost dusting, rocky cliff hachures,
// railways, marching dirt roads, deep-water rivers and dense artillery craters.
import type { Point, Scene } from '../lib/lesson-schema';

export type Palette = ReturnType<typeof palette>;

export function palette() {
  const styles = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles?.getPropertyValue(name).trim() || fallback;
  return {
    silk: read('--silk-ivory', '#5F744C'),
    light: read('--silk-light', '#F6EEDB'),
    mist: read('--mist', '#3A2D22'),
    ink: read('--ink', '#2B2926'),
    sepia: read('--sepia', '#6E5A44'),
    ochre: read('--ochre', '#A6945E'),
    green: read('--deep-green', '#5F744C'),
    water: read('--water-grey-blue', '#3B6678'),
    red: read('--vermilion', '#B91C1C'),
    indigo: read('--muted-indigo', '#2C3E50'),
    washes: ['#5F744C', '#748A5A', '#A6945E', '#6E5A44'],
    mountains: ['#5A5248', '#6B6257', '#7C7266', '#8C8174'],
    waterGlint: '#8BB3C2',
    paddy: ['#5F744C', '#748A5A'],
    track: '#7A684E',
    skin: '#C7A47D',
    headwear: ['#C7B890', '#A89573'],
    sideA: ['#B91C1C', '#9E2A22', '#7F1D1D'],
    sideB: ['#2C3E50', '#334155', '#1E293B'],
    elephant: '#858879',
    elephantLight: '#909184',
    shellHighlight: '#E5D9C3',
    roof: '#9A8064',
    structure: '#75634D'
  };
}

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// 240 x 186 world units painted on a 2048 x 2048 high-resolution cartographic canvas.
export const TABLE = { width: 240, depth: 186, canvasWidth: 2048, canvasHeight: 2048 };
const PX = TABLE.canvasWidth / TABLE.width;
const toCanvas = ([x, z]: Point): Point => [(x + TABLE.width / 2) * PX, (z + TABLE.depth / 2) * (TABLE.canvasHeight / TABLE.depth)];

function hash2(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < 4; o++) {
    sum += valueNoise(x * freq, y * freq, seed + o * 17) * amp;
    freq *= 2.05;
    amp *= 0.5;
  }
  return sum;
}

function lerpRgb(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
}

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
    return { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, rx: Math.abs(a[0] - b[0]) / 2 + 48, ry: Math.abs(a[1] - b[1]) / 2 + 48 };
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

  // 1. High-detail procedural geological terrain (640x640 FBM upscaled crisply to 2048x2048).
  // Steppe gold/moss + trench earth + rocky cliff stone + light winter frost on high ridges.
  const res = 640;
  const off = document.createElement('canvas');
  off.width = res;
  off.height = res;
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(res, res);
  const data = img.data;

  const dryGrassBase: [number, number, number] = [139, 130, 94];  // #8B825E thảo nguyên cỏ úa vàng nâu
  const dryGrassWarm: [number, number, number] = [156, 142, 98];  // #9C8E62
  const steppeEarth: [number, number, number] = [110, 94, 70];    // #6E5E46
  const scorchedSoil: [number, number, number] = [74, 63, 53];    // #4A3F35 đất cày xới / hố bom nâu sẫm
  const rockGrey: [number, number, number] = [88, 80, 72];        // #585048
  const snowPatch: [number, number, number] = [232, 236, 239];    // #E8ECEF vệt tuyết trắng loang nhẹ

  const campFeature = scene.features.find((f) => f.type === 'camp' || f.type === 'fort');
  const [campX, campZ] = campFeature?.at ?? [26, 2];

  for (let y = 0; y < res; y++) {
    const nz = (y / res - 0.5) * 2;
    const wz = (y / res - 0.5) * TABLE.depth;
    for (let x = 0; x < res; x++) {
      const nx = (x / res - 0.5) * 2;
      const wx = (x / res - 0.5) * TABLE.width;
      const n1 = fbm(x * 0.013, y * 0.013, seed);
      const n2 = fbm(x * 0.036 + 11.3, y * 0.036 + 7.1, seed + 99);
      const grain = (hash2(x, y, seed) - 0.5) * 14;

      let rgb = n1 < 0.5 ? lerpRgb(steppeEarth, dryGrassBase, n1 / 0.5) : lerpRgb(dryGrassBase, dryGrassWarm, (n1 - 0.5) / 0.5);
      if (n2 > 0.56) rgb = lerpRgb(rgb, scorchedSoil, ((n2 - 0.56) / 0.44) * 0.55);

      // Scorched cratered earth (#4A3F35) around Stalingrad / contested stronghold
      const distCamp = Math.hypot(wx - campX, wz - campZ);
      if (distCamp < 44) {
        const scorchMask = Math.pow(1 - distCamp / 44, 1.4) * (0.55 + n2 * 0.45);
        rgb = lerpRgb(rgb, scorchedSoil, Math.min(0.88, scorchMask));
      }

      // Rocky cliffs & light winter snow patches (#E8ECEF) on northern (nz < -0.4) & southwestern high ridges
      const edgeDist = Math.hypot(nx * 0.92, nz * 1.05);
      const northRidge = Math.max(0, (-nz - 0.38) / 0.62);
      const swRidge = Math.max(0, (-nx - 0.35) / 0.65) * Math.max(0, (nz - 0.25) / 0.75);
      const ridgeFactor = Math.max(northRidge, swRidge, Math.max(0, (edgeDist - 0.78) / 0.4));

      if (ridgeFactor > 0.05) {
        const rockMix = Math.min(1, ridgeFactor * (0.55 + n2 * 0.45));
        rgb = lerpRgb(rgb, rockGrey, rockMix);
        // Directional cliff-face shading
        const slope = (fbm((x + 2) * 0.018, (y + 2) * 0.018, seed) - n1) * 115;
        rgb = [rgb[0] + slope, rgb[1] + slope, rgb[2] + slope];
        // Light winter snow patches on high northern & outer slopes
        if (ridgeFactor > 0.28 && (n2 > 0.42 || northRidge > 0.35)) {
          const frost = Math.min(0.78, (ridgeFactor - 0.28) * 1.25 * Math.max(0.35, n2 - 0.25));
          rgb = lerpRgb(rgb, snowPatch, frost);
        }
      }

      const idx = (y * res + x) * 4;
      data[idx] = Math.min(255, Math.max(0, rgb[0] + grain));
      data[idx + 1] = Math.min(255, Math.max(0, rgb[1] + grain));
      data[idx + 2] = Math.min(255, Math.max(0, rgb[2] + grain));
      data[idx + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  context.drawImage(off, 0, 0, width, height);

  // 2. Crisp cliff-face rock striations on North & Southwest ridges
  const drawRockySlopes = (pts: Point[], spread: number) => {
    const cPts = pts.map(toCanvas);
    context.save();
    context.strokeStyle = '#362E26';
    context.lineCap = 'round';
    for (let i = 0; i < cPts.length - 1; i++) {
      const [x1, y1] = cPts[i];
      const [x2, y2] = cPts[i + 1];
      const seg = Math.hypot(x2 - x1, y2 - y1);
      const count = Math.max(6, Math.floor(seg / 20));
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      for (let k = 0; k <= count; k++) {
        const t = k / count;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        const len = spread * (0.55 + random() * 0.65);
        const dir = k % 2 === 0 ? 1 : -1;
        context.globalAlpha = 0.34 + random() * 0.24;
        context.lineWidth = 2.0 + random() * 1.4;
        context.beginPath();
        context.moveTo(px + nx * 4 * dir, py + ny * 4 * dir);
        context.lineTo(px + nx * len * dir + (random() - 0.5) * 10, py + ny * len * dir + (random() - 0.5) * 10);
        context.stroke();
      }
    }
    context.restore();
  };
  drawRockySlopes([[-114, -76], [-64, -64], [-10, -76], [48, -66], [104, -76]], 44);
  drawRockySlopes([[-114, 52], [-86, 44], [-64, 68], [-38, 76]], 40);
  drawRockySlopes([[64, 72], [88, 60], [114, 74]], 34);

  // 3. Network of dirt marching roads & railway line running near the city
  const drawDirtRoad = (pts: Point[]) => {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    smoothPath(context, pts);
    context.strokeStyle = '#6B573F';
    context.globalAlpha = 0.62;
    context.lineWidth = 18;
    context.stroke();
    smoothPath(context, pts);
    context.strokeStyle = '#9E8963';
    context.globalAlpha = 0.5;
    context.lineWidth = 7;
    context.stroke();
    context.restore();
  };
  drawDirtRoad([[-115, 2], [-64, 8], [-16, 2], [28, 0]]);
  drawDirtRoad([[-75, -72], [-34, -42], [12, -22], [32, -4]]);
  drawDirtRoad([[-68, 74], [-26, 44], [14, 22], [32, 4]]);

  // Railway line with steel rails & wooden crossties along the eastern/southern approach
  const drawRailway = (pts: Point[]) => {
    const cPts = pts.map(toCanvas);
    context.save();
    context.strokeStyle = '#4A3C2E';
    context.lineWidth = 14;
    context.globalAlpha = 0.7;
    context.setLineDash([4, 10]);
    smoothPath(context, pts);
    context.stroke();
    context.setLineDash([]);
    context.strokeStyle = '#2B2B2B';
    context.lineWidth = 3.5;
    context.globalAlpha = 0.85;
    context.beginPath();
    cPts.forEach(([x, y], i) => (i === 0 ? context.moveTo(x - 3, y - 3) : context.lineTo(x - 3, y - 3)));
    context.stroke();
    context.beginPath();
    cPts.forEach(([x, y], i) => (i === 0 ? context.moveTo(x + 3, y + 3) : context.lineTo(x + 3, y + 3)));
    context.stroke();
    context.restore();
  };
  drawRailway([[-46, 78], [-12, 54], [22, 24], [52, 6], [66, -16], [76, -28]]);

  // 4. Deep steel-blue river helper (#2E5A6B) with muddy/sandy brown banks (#7A684E)
  const paintBattleRiver = (points: Point[], widthPx: number) => {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    smoothPath(context, points);
    context.strokeStyle = '#7A684E';
    context.globalAlpha = 0.88;
    context.lineWidth = widthPx + 42;
    context.stroke();
    smoothPath(context, points);
    context.strokeStyle = '#1E3C47';
    context.globalAlpha = 0.85;
    context.lineWidth = widthPx + 10;
    context.stroke();
    smoothPath(context, points);
    context.strokeStyle = '#2E5A6B';
    context.globalAlpha = 0.96;
    context.lineWidth = widthPx;
    context.stroke();
    smoothPath(context, points);
    context.strokeStyle = '#4B7D91';
    context.globalAlpha = 0.65;
    context.lineWidth = widthPx * 0.52;
    context.stroke();
    context.restore();
  };

  const hasRiver = scene.features.some((f) => f.type === 'river');
  const hasCamp = scene.features.some((f) => f.type === 'camp');
  if (!hasRiver && scene.terrain === 'plain' && hasCamp) {
    paintBattleRiver([[104, -93], [94, -55], [105, -18], [93, 20], [104, 58], [96, 93]], 104);
  }

  // 5. Scene features (rivers, frontline arcs, dense craters & scorch marks around Stalingrad)
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const feature of scene.features) {
    const size = (feature.size ?? 0) * PX;
    context.save();
    if (feature.type === 'river' && feature.points) {
      paintBattleRiver(feature.points, size || 110);
    } else if (feature.type === 'road' && feature.points) {
      const pts = feature.points.map(toCanvas);
      const first = pts[0];
      const last = pts[pts.length - 1];
      const isClosedLoop = pts.length >= 4 && Math.hypot(first[0] - last[0], first[1] - last[1]) < 24;
      const isFrontlineArc = !isClosedLoop && hasCamp && (feature.size ?? 1.6) <= 1.5;
      if (isClosedLoop || isFrontlineArc) {
        context.strokeStyle = '#1E3A5F';
        context.fillStyle = '#1E3A5F';
        context.globalAlpha = 0.92;
        context.lineWidth = isClosedLoop ? 7 : 5.5;
        smoothPath(context, feature.points);
        if (isClosedLoop) context.closePath();
        context.stroke();
        const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          const segLen = Math.hypot(x2 - x1, y2 - y1);
          const steps = Math.max(2, Math.floor(segLen / 40));
          const ang = Math.atan2(y2 - y1, x2 - x1);
          for (let s = 1; s < steps; s++) {
            const t = s / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            let nx = -Math.sin(ang);
            let ny = Math.cos(ang);
            if (isClosedLoop) {
              if (nx * (cx - px) + ny * (cy - py) < 0) { nx = -nx; ny = -ny; }
            } else if (nx < 0) {
              nx = -nx; ny = -ny;
            }
            const tx = Math.cos(ang);
            const ty = Math.sin(ang);
            context.beginPath();
            context.moveTo(px - tx * 8, py - ty * 8);
            context.lineTo(px + nx * 16, py + ny * 16);
            context.lineTo(px + tx * 8, py + ty * 8);
            context.closePath();
            context.fill();
          }
        }
      } else {
        drawDirtRoad(feature.points);
      }
    } else if (feature.type === 'camp' || feature.type === 'fort') {
      const { cx, cy, rx, ry } = areaOf(feature);
      const bw = Math.max(rx * 1.15, 220);
      const bh = Math.max(ry * 1.15, 200);
      // Dense artillery craters & scorched earth around the contested city
      for (let s = 0; s < 28; s++) {
        const sx = cx + (random() - 0.5) * bw * 2.3;
        const sy = cy + (random() - 0.5) * bh * 2.3;
        const sr = 32 + random() * 64;
        const grad = context.createRadialGradient(sx, sy, 3, sx, sy, sr);
        grad.addColorStop(0, 'rgba(26, 22, 18, 0.52)');
        grad.addColorStop(0.55, 'rgba(42, 36, 30, 0.26)');
        grad.addColorStop(1, 'rgba(26, 22, 18, 0)');
        context.fillStyle = grad;
        context.beginPath();
        context.arc(sx, sy, sr, 0, Math.PI * 2);
        context.fill();
        if (s % 2 === 0) {
          context.strokeStyle = 'rgba(20, 18, 16, 0.55)';
          context.lineWidth = 2.2;
          context.beginPath();
          context.arc(sx, sy, 8 + random() * 10, 0, Math.PI * 2);
          context.stroke();
        }
      }
      // Fine street grid underneath 3D buildings
      context.strokeStyle = 'rgba(225, 210, 180, 0.38)';
      context.lineWidth = 2;
      const step = 38;
      for (let gx = -bw; gx <= bw; gx += step) {
        context.beginPath();
        context.moveTo(cx + gx, cy - bh * 0.8);
        context.lineTo(cx + gx, cy + bh * 0.8);
        context.stroke();
      }
      for (let gy = -bh; gy <= bh; gy += step) {
        context.beginPath();
        context.moveTo(cx - bw * 0.8, cy + gy);
        context.lineTo(cx + bw * 0.8, cy + gy);
        context.stroke();
      }
    } else if (feature.type === 'stakes') {
      const { cx, cy, rx, ry } = areaOf(feature);
      context.strokeStyle = '#2B241E';
      context.lineWidth = 4;
      for (let i = 0; i < 60; i++) {
        const x = cx + (random() - 0.5) * 2 * rx;
        const y = cy + (random() - 0.5) * 2 * ry;
        context.globalAlpha = 0.55;
        context.beginPath(); context.moveTo(x, y + 10); context.lineTo(x + 4, y - 10); context.stroke();
      }
    }
    context.restore();
  }

  // 6. Subtle cartographic coordinate grid & bronze border
  context.save();
  const gridStep = 256;
  context.strokeStyle = '#E5DEC9';
  for (let gx = gridStep; gx < width; gx += gridStep) {
    context.globalAlpha = gx % 512 === 0 ? 0.14 : 0.07;
    context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(gx, 28); context.lineTo(gx, height - 28); context.stroke();
  }
  for (let gy = gridStep; gy < height; gy += gridStep) {
    context.globalAlpha = gy % 512 === 0 ? 0.14 : 0.07;
    context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(28, gy); context.lineTo(width - 28, gy); context.stroke();
  }
  context.strokeStyle = '#C59B47';
  context.globalAlpha = 0.5;
  context.lineWidth = 3.5;
  context.strokeRect(20, 20, width - 40, height - 40);
  context.restore();
  void colors;
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
    context.strokeStyle = route.faction === 'a' ? '#B91C1C' : factionColors[route.faction];
    context.globalAlpha = 0.85;
    context.lineWidth = 12;
    context.setLineDash([28, 14]);
    context.stroke();
  }
  return canvas;
}

export function routeReveal(route: Scene['routes'][number], time: number) {
  return Math.min(1, Math.max(0, (time - route.from) / Math.max(0.001, route.to - route.from)));
}

export function paintRoutes(context: CanvasRenderingContext2D, routes: Scene['routes'], factionColors: { a: string; b: string }, _time: number) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const route of routes) {
    const color = route.faction === 'a' ? '#B91C1C' : (factionColors.b || '#2C3E50');
    smoothPath(context, route.points);
    context.setLineDash([20, 16]);
    context.strokeStyle = color;
    context.globalAlpha = 0.28;
    context.lineWidth = 6;
    context.stroke();
  }
  context.restore();
}

export type SpriteKind = 'soldier' | 'elephant' | 'cannon' | 'boat' | 'tank' | 'tent' | 'watchtower' | 'village' | 'bamboo' | 'palisade' | 'torch' | 'banner';

export function paintSprite(_kind: SpriteKind, _colors: Palette, _variant: number, _team: string, _side: 'a' | 'b') {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  return canvas;
}

/** High-resolution 1024x1024 brick/plaster facade texture with arched windows, weathered mortar & soot. */
export function paintBuildingTexture(warm = true): HTMLCanvasElement {
  const S = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext('2d')!;
  const r = seededRandom(warm ? 1942 : 1943);
  c.fillStyle = warm ? '#D4B496' : '#A65D4E';
  c.fillRect(0, 0, S, S);

  // Fine brick courses & weathered mortar
  c.strokeStyle = 'rgba(40, 28, 22, 0.24)';
  c.lineWidth = 2;
  for (let y = 0; y < S; y += 24) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(S, y); c.stroke();
    const off = (y / 24) % 2 ? 24 : 0;
    for (let x = off; x < S; x += 48) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 24); c.stroke();
      if (r() > 0.72) {
        c.fillStyle = r() > 0.5 ? 'rgba(60, 42, 32, 0.14)' : 'rgba(240, 226, 204, 0.14)';
        c.fillRect(x + 2, y + 2, 44, 20);
      }
    }
  }

  // Cracks & chipped plaster patches
  c.strokeStyle = 'rgba(28, 22, 18, 0.35)';
  c.lineWidth = 2.5;
  for (let k = 0; k < 28; k++) {
    let cx = r() * S;
    let cy = r() * S;
    c.beginPath();
    c.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (r() - 0.5) * 48;
      cy += r() * 34;
      c.lineTo(cx, cy);
    }
    c.stroke();
  }

  // Arched recessed windows with sills & mullions
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = 68 + col * 236;
      const wy = 72 + row * 230;
      const ww = 96;
      const wh = 132;
      c.fillStyle = r() > 0.2 ? '#1E1B18' : '#5E422C';
      c.beginPath();
      c.moveTo(wx, wy + wh);
      c.lineTo(wx, wy + ww / 2);
      c.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
      c.lineTo(wx + ww, wy + wh);
      c.closePath();
      c.fill();

      c.strokeStyle = '#7A6856';
      c.lineWidth = 5;
      c.stroke();
      // Window mullions & sill
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh);
      c.moveTo(wx, wy + wh * 0.55); c.lineTo(wx + ww, wy + wh * 0.55);
      c.stroke();
      c.fillStyle = '#8C7A66';
      c.fillRect(wx - 8, wy + wh, ww + 16, 12);
    }
  }

  // Heavy lower-wall soot & combat weathering gradient
  const grad = c.createLinearGradient(0, S * 0.58, 0, S);
  grad.addColorStop(0, 'rgba(30, 26, 22, 0)');
  grad.addColorStop(1, 'rgba(24, 20, 16, 0.62)');
  c.fillStyle = grad;
  c.fillRect(0, S * 0.58, S, S * 0.42);
  return canvas;
}

/** 1024x1024 grayscale micro-bump map (soil grain, grass tufts, tank tracks & crater rims) for ground-level PBR realism. */
export function paintTerrainBump(scene: Scene, seed = 1789): HTMLCanvasElement {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = seededRandom(seed + 99);

  // Base mid-grey soil elevation
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Fine soil & rock grit
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 112 + Math.floor(rand() * 34);
    d[i] = n;
    d[i + 1] = n;
    d[i + 2] = n;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Micro grass tuft bumps
  for (let i = 0; i < 1600; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const gr = 1.5 + rand() * 3.5;
    ctx.fillStyle = rand() > 0.45 ? 'rgba(210, 210, 210, 0.28)' : 'rgba(65, 65, 65, 0.25)';
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tank track ruts along marching routes
  const scaleX = size / TABLE.canvasWidth;
  const scaleY = size / TABLE.canvasHeight;
  ctx.save();
  ctx.scale(scaleX, scaleY);
  for (const route of scene.routes) {
    if (route.points.length < 2) continue;
    smoothPath(ctx, route.points);
    ctx.strokeStyle = 'rgba(42, 42, 42, 0.35)';
    ctx.lineWidth = 18;
    ctx.setLineDash([7, 7]);
    ctx.stroke();
  }

  // Crater rims around contested stronghold/city
  for (const f of scene.features) {
    if ((f.type === 'camp' || f.type === 'fort') && f.at) {
      const [cx, cy] = toCanvas(f.at);
      for (let i = 0; i < 48; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = 25 + rand() * 210;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist * 0.8;
        const r = 8 + rand() * 14;
        const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        g.addColorStop(0, 'rgba(30, 30, 30, 0.65)');
        g.addColorStop(0.7, 'rgba(220, 220, 220, 0.45)');
        g.addColorStop(1, 'rgba(128, 128, 128, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  return canvas;
}
