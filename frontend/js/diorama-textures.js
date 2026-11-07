/* Procedural resources for the diorama sand table: heightfield, terrain paint, wood, bronze,
   Đông Sơn carving bands, compass and particle sprites. Everything is generated in code. */
(function (window, document) {
  'use strict';

  const TABLE = { width: 240, depth: 186 };
  const WATER_LEVEL = -0.35;

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function valueNoise(x, y) {
    const xi = Math.floor(x); const yi = Math.floor(y);
    const xf = x - xi; const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf); const v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi); const b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1); const d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, octaves) {
    let sum = 0; let amp = .5; let freq = 1; let norm = 0;
    for (let i = 0; i < (octaves || 4); i++) {
      sum += valueNoise(x * freq, y * freq) * amp;
      norm += amp; amp *= .5; freq *= 2.03;
    }
    return sum / norm;
  }

  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const riverZ = (x) => -64 + 5 * Math.sin(x * .028 + .6) + 2.5 * Math.sin(x * .071);

  const HILLS = [
    { x: -98, z: -12, r: 34, h: 15 }, { x: -72, z: -34, r: 17, h: 7 },
    { x: 100, z: -30, r: 36, h: 17 }, { x: 108, z: 54, r: 26, h: 11 },
    { x: -112, z: 40, r: 18, h: 6 }, { x: -24, z: -88, r: 30, h: 9 },
    { x: 64, z: -88, r: 28, h: 11 }, { x: 40, z: 80, r: 16, h: 4 }
  ];

  /** Analytic height in table units. The scene samples a baked grid of this for consistency. */
  function rawHeight(x, z) {
    const n = fbm(x * .035 + 11, z * .035 + 7, 4);
    let h = .55 + n * 1.5;
    // The battle zone stays open so formations remain readable.
    const bx = (x + 8) / 76; const bz = (z - 14) / 64;
    const battleMask = 1 - smooth(.75, 1.15, Math.sqrt(bx * bx + bz * bz));
    let hills = 0;
    HILLS.forEach((hill) => {
      const dx = x - hill.x; const dz = z - hill.z;
      hills += hill.h * Math.exp(-(dx * dx + dz * dz) / (hill.r * hill.r) * 2.2) * (.72 + .56 * n);
    });
    h += hills * (1 - battleMask * .92);
    // Low marshland ("địa hình trũng") with scattered pools.
    const mx = x - 74; const mz = z - 18;
    const marsh = 1 - smooth(10, 24, Math.sqrt(mx * mx + mz * mz));
    if (marsh > 0) h = h * (1 - marsh) + (-1.1 + fbm(x * .12, z * .12, 3) * 1.9) * marsh;
    // River channel and the raised dike on its southern bank.
    const rz = riverZ(x); const d = Math.abs(z - rz);
    const bank = smooth(4.5, 11, d);
    h = -2.4 * (1 - bank) + h * bank;
    if (z > rz) h += 1.5 * Math.exp(-Math.pow((d - 13.5) / 2.1, 2));
    return h;
  }

  /** Baked heightfield grid shared by the mesh, the paint and unit placement. */
  function buildHeightField(segX, segZ) {
    const cols = segX + 1; const rows = segZ + 1;
    const data = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      const z = -TABLE.depth / 2 + r / segZ * TABLE.depth;
      for (let c = 0; c < cols; c++) {
        const x = -TABLE.width / 2 + c / segX * TABLE.width;
        data[r * cols + c] = rawHeight(x, z);
      }
    }
    const sample = (x, z) => {
      const fx = Math.max(0, Math.min(segX, (x + TABLE.width / 2) / TABLE.width * segX));
      const fz = Math.max(0, Math.min(segZ, (z + TABLE.depth / 2) / TABLE.depth * segZ));
      const c = Math.min(segX - 1, Math.floor(fx)); const r = Math.min(segZ - 1, Math.floor(fz));
      const tx = fx - c; const tz = fz - r;
      const i = r * cols + c;
      const a = data[i]; const b = data[i + 1]; const cc = data[i + cols]; const dd = data[i + cols + 1];
      return (a * (1 - tx) + b * tx) * (1 - tz) + (cc * (1 - tx) + dd * tx) * tz;
    };
    return { segX, segZ, cols, rows, data, heightAt: sample };
  }

  function hexToRgb(hex) {
    const value = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function distanceToPolyline(x, z, points) {
    let best = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i]; const [bx, bz] = points[i + 1];
      const vx = bx - ax; const vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      const dx = x - (ax + vx * t); const dz = z - (az + vz * t);
      best = Math.min(best, dx * dx + dz * dz);
    }
    return Math.sqrt(best);
  }

  const ROADS = [
    [[-4, 93], [-8, 70], [2, 46], [-6, 20], [2, -4], [-2, -30], [6, -50]],
    [[-120, 22], [-80, 26], [-46, 18], [-6, 20]],
    [[120, 6], [86, -4], [44, -10], [2, -4]]
  ];

  /** Paints terrain albedo with baked cavity AO into a canvas (also used for thumbnails). */
  function paintTerrain(canvas, field, colors) {
    const width = canvas.width; const height = canvas.height;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(width, height);
    const px = image.data;
    const c = {
      bed: hexToRgb(colors.waterDeep), shallow: hexToRgb(colors.waterShallow),
      paddy: hexToRgb(colors.paddy), paddyWater: hexToRgb(colors.paddyWater), meadow: hexToRgb(colors.meadow),
      moss: hexToRgb(colors.moss), mossDark: hexToRgb(colors.mossDark), forest: hexToRgb(colors.forest),
      earth: hexToRgb(colors.earth), earthLight: hexToRgb(colors.earthLight), bund: hexToRgb(colors.mossDark)
    };
    const stepX = TABLE.width / width; const stepZ = TABLE.depth / height;
    for (let j = 0; j < height; j++) {
      const z = -TABLE.depth / 2 + (j + .5) * stepZ;
      for (let i = 0; i < width; i++) {
        const x = -TABLE.width / 2 + (i + .5) * stepX;
        const h = field.heightAt(x, z);
        const hx = field.heightAt(x + 1.2, z) - field.heightAt(x - 1.2, z);
        const hz = field.heightAt(x, z + 1.2) - field.heightAt(x, z - 1.2);
        const slope = Math.min(1, Math.sqrt(hx * hx + hz * hz) / 2.4);
        const grain = hash2(i, j) * .12 - .06;
        const n = valueNoise(x * .22, z * .22);
        let col;
        if (h < WATER_LEVEL) {
          col = mix(c.bed, c.shallow, smooth(-2.4, WATER_LEVEL, h) * .6);
        } else if (h < 2.2) {
          // Paddy grid in rotated coordinates; the trodden battle zone is meadow and earth.
          const u = x * .94 + z * .34; const v = -x * .34 + z * .94;
          const cu = Math.floor(u / 9); const cv = Math.floor(v / 6.5);
          const fu = u / 9 - cu; const fv = v / 6.5 - cv;
          const bx = (x + 8) / 70; const bz = (z - 14) / 58;
          const battle = 1 - smooth(.7, 1.05, Math.sqrt(bx * bx + bz * bz));
          const cell = hash2(cu + 400, cv + 900);
          let field2 = cell < .33 ? c.paddyWater : cell < .7 ? c.paddy : c.meadow;
          if (fu < .07 || fv < .09) field2 = c.bund;
          const meadow = mix(c.meadow, c.earth, smooth(.45, .8, n) * .7);
          col = mix(field2, meadow, battle);
          col = mix(col, c.moss, smooth(1.2, 2.2, h));
        } else {
          const t = smooth(2.2, 9, h);
          col = mix(c.moss, c.forest, t);
          col = mix(col, c.earth, smooth(.35, .8, slope) * .85);
          col = mix(col, c.earthLight, smooth(11, 16, h) * .6);
          if (n > .62 && h > 4) col = mix(col, c.mossDark, .5);
        }
        const road = distanceToPolyline(x, z, ROADS[0]) < 1.6 || distanceToPolyline(x, z, ROADS[1]) < 1.2 || distanceToPolyline(x, z, ROADS[2]) < 1.2;
        if (road && h > WATER_LEVEL) col = mix(col, c.earthLight, .75);
        // Cavity AO: darken where neighbours stand higher.
        const around = (field.heightAt(x + 3, z) + field.heightAt(x - 3, z) + field.heightAt(x, z + 3) + field.heightAt(x, z - 3)) / 4;
        const ao = Math.max(.62, Math.min(1.08, 1 - (around - h) * .13));
        const shade = (1 + grain) * ao;
        const o = (j * width + i) * 4;
        px[o] = Math.min(255, col[0] * shade); px[o + 1] = Math.min(255, col[1] * shade); px[o + 2] = Math.min(255, col[2] * shade); px[o + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  function makeCanvas(w, h) { const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; return canvas; }

  /** Dark lim wood grain. */
  function paintWood(ctx, w, h, colors, seed) {
    const random = seededRandom(seed || 7);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colors.woodLight); g.addColorStop(.5, colors.wood); g.addColorStop(1, colors.woodDark);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let line = 0; line < h / 2.2; line++) {
      const y0 = random() * h; const amp = 1 + random() * 5; const freq = .004 + random() * .01;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin(x * freq + line) * amp + Math.sin(x * freq * 3.1) * amp * .3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = random() > .5 ? colors.woodDark : colors.woodLight;
      ctx.globalAlpha = .12 + random() * .22; ctx.lineWidth = .6 + random() * 1.6; ctx.stroke();
    }
    for (let knot = 0; knot < w / 400; knot++) {
      const x = random() * w; const y = random() * h;
      for (let ring = 1; ring < 6; ring++) {
        ctx.beginPath(); ctx.ellipse(x, y, ring * 9, ring * 2.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = colors.woodDark; ctx.globalAlpha = .25; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function woodTexture(colors) {
    const canvas = makeCanvas(1024, 256);
    paintWood(canvas.getContext('2d'), 1024, 256, colors, 31);
    return canvas;
  }

  /** Lạc bird silhouette (stylised, flying left-to-right), drawn around origin. */
  function lacBird(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-1.6 * s, 0);
    ctx.quadraticCurveTo(-.6 * s, -.32 * s, .2 * s, -.18 * s);
    ctx.lineTo(1.25 * s, -.42 * s); // long beak
    ctx.lineTo(.42 * s, -.02 * s);
    ctx.quadraticCurveTo(.1 * s, .3 * s, -.6 * s, .26 * s);
    ctx.lineTo(-1.05 * s, .7 * s); // tail feathers
    ctx.lineTo(-1.0 * s, .22 * s);
    ctx.closePath();
    ctx.moveTo(-.4 * s, -.12 * s); ctx.lineTo(-.1 * s, -.85 * s); ctx.lineTo(.08 * s, -.15 * s); // crest/wing
  }

  function sawtooth(ctx, x0, x1, y, size, up) {
    ctx.beginPath();
    for (let x = x0; x < x1; x += size) { ctx.moveTo(x, y); ctx.lineTo(x + size / 2, y + (up ? -size : size) * .8); ctx.lineTo(x + size, y); }
  }

  /** Carved Đông Sơn band on lim wood. Returns { color, bump } canvases of the same size. */
  function carvedBand(colors, width, height) {
    const w = width || 2048; const h = height || 128;
    const color = makeCanvas(w, h); const bump = makeCanvas(w, h);
    const cc = color.getContext('2d'); const bc = bump.getContext('2d');
    paintWood(cc, w, h, colors, 77);
    bc.fillStyle = '#9a9a9a'; bc.fillRect(0, 0, w, h);
    const motif = (ctx, fill, stroke, offset) => {
      ctx.save(); ctx.translate(offset, offset);
      ctx.strokeStyle = stroke; ctx.fillStyle = fill; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeRect(6, 8, w - 12, h - 16);
      ctx.lineWidth = 2;
      sawtooth(ctx, 10, w - 10, 14, 12, false); ctx.stroke();
      sawtooth(ctx, 10, w - 10, h - 14, 12, true); ctx.stroke();
      const unit = 176; const mid = h / 2;
      for (let x = unit / 2; x < w; x += unit) {
        for (let r = 6; r <= 28; r += 7) { ctx.beginPath(); ctx.arc(x, mid, r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.moveTo(x, mid); ctx.lineTo(x + Math.cos(a) * 5, mid + Math.sin(a) * 5); } ctx.stroke();
        ctx.save(); ctx.translate(x + 58, mid + 2); lacBird(ctx, 16); ctx.fill(); ctx.restore();
        // Water scroll waves between medallions.
        ctx.beginPath();
        for (let k = 0; k < 2; k++) { const sx = x - 70 + k * 22; ctx.moveTo(sx - 9, mid + 10); ctx.bezierCurveTo(sx - 9, mid - 14, sx + 13, mid - 14, sx + 9, mid); ctx.arc(sx + 3, mid, 5.5, 0, Math.PI * 1.4); }
        ctx.stroke();
      }
      ctx.restore();
    };
    // Carved grooves: dark fill plus a light lip to read as relief.
    motif(cc, 'rgba(255,226,170,.16)', 'rgba(255,226,170,.16)', 1.5);
    motif(cc, colors.woodDark, colors.woodDark, 0);
    motif(bc, '#2a2a2a', '#2a2a2a', 0);
    return { color, bump };
  }

  function patinaTexture(colors) {
    const canvas = makeCanvas(256, 256); const ctx = canvas.getContext('2d');
    const random = seededRandom(42);
    ctx.fillStyle = colors.bronze; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = random() > .5 ? colors.bronzeDark : colors.bronzeLight;
      ctx.globalAlpha = .08 + random() * .12; ctx.fillRect(random() * 256, random() * 256, 2 + random() * 6, 2 + random() * 6);
    }
    for (let i = 0; i < 26; i++) {
      const x = random() * 256; const y = random() * 256; const r = 6 + random() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, colors.patina); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = .35 + random() * .3; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    return canvas;
  }

  /** Bronze drum tympanum: star, concentric rings, birds and sawtooth bands. */
  function drumFace(colors, size) {
    const s = size || 512; const canvas = makeCanvas(s, s); const ctx = canvas.getContext('2d');
    const cx = s / 2; const R = s / 2;
    ctx.drawImage(patinaTexture(colors), 0, 0, s, s);
    ctx.strokeStyle = colors.bronzeDark; ctx.fillStyle = colors.bronzeDark; ctx.lineWidth = s / 160;
    ctx.beginPath();
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; const r = k % 2 ? R * .07 : R * .2; ctx.lineTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    [.24, .3, .42, .48, .66, .72, .9, .96].forEach((r) => { ctx.beginPath(); ctx.arc(cx, cx, R * r, 0, Math.PI * 2); ctx.stroke(); });
    for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .3, cx + Math.sin(a) * R * .3); ctx.lineTo(cx + Math.cos(a + .05) * R * .36, cx + Math.sin(a + .05) * R * .36); ctx.lineTo(cx + Math.cos(a + .1) * R * .3, cx + Math.sin(a + .1) * R * .3); ctx.stroke(); }
    for (let k = 0; k < 10; k++) {
      const a = k / 10 * Math.PI * 2;
      ctx.save(); ctx.translate(cx + Math.cos(a) * R * .81, cx + Math.sin(a) * R * .81); ctx.rotate(a + Math.PI / 2); lacBird(ctx, R * .065); ctx.fill(); ctx.restore();
    }
    for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * .57, cx + Math.sin(a) * R * .57, R * .03, 0, Math.PI * 2); ctx.stroke(); }
    return canvas;
  }

  function compassTexture(colors) {
    const s = 512; const canvas = drumFace(colors, s); const ctx = canvas.getContext('2d'); const c = s / 2;
    ctx.fillStyle = colors.paper; ctx.beginPath(); ctx.arc(c, c, s * .4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = colors.ink; ctx.lineWidth = 2;
    for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2; const r0 = k % 9 === 0 ? s * .33 : s * .37; ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); ctx.lineTo(c + Math.cos(a) * s * .39, c + Math.sin(a) * s * .39); ctx.stroke(); }
    const point = (angle, length, widthPx, fill) => {
      ctx.beginPath(); ctx.moveTo(c + Math.cos(angle) * length, c + Math.sin(angle) * length);
      ctx.lineTo(c + Math.cos(angle + Math.PI / 2) * widthPx, c + Math.sin(angle + Math.PI / 2) * widthPx);
      ctx.lineTo(c + Math.cos(angle - Math.PI / 2) * widthPx, c + Math.sin(angle - Math.PI / 2) * widthPx);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke();
    };
    for (let k = 0; k < 4; k++) point(Math.PI / 4 + k * Math.PI / 2, s * .2, s * .03, colors.bronzeDark);
    point(Math.PI / 2, s * .31, s * .045, colors.ink);
    point(0, s * .31, s * .045, colors.ink);
    point(Math.PI, s * .31, s * .045, colors.ink);
    point(-Math.PI / 2, s * .34, s * .05, colors.sideA); // North (towards -z, top of texture)
    ctx.beginPath(); ctx.arc(c, c, s * .025, 0, Math.PI * 2); ctx.fillStyle = colors.bronze; ctx.fill(); ctx.stroke();
    return canvas;
  }

  function floorTexture(colors) {
    const s = 512; const canvas = makeCanvas(s, s); const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, s * .05, s / 2, s / 2, s * .5);
    g.addColorStop(0, colors.backdropGlow); g.addColorStop(.55, colors.backdrop); g.addColorStop(1, colors.backdropDeep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return canvas;
  }

  function particleTexture() {
    const s = 64; const canvas = makeCanvas(s, s); const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return canvas;
  }

  window.DioramaTextures = {
    TABLE, WATER_LEVEL, seededRandom, fbm, riverZ, rawHeight, buildHeightField, paintTerrain,
    woodTexture, carvedBand, patinaTexture, drumFace, compassTexture, floorTexture, particleTexture, ROADS
  };
})(window, document);
