// VietnamAtlasScene: the 3D atlas of Viet Nam (34 province-level units, relief, Hoàng Sa and
// Trường Sa, landmarks). Framework-agnostic: give it a container element, it owns a canvas and an
// HTML label overlay inside it. Same rules as the battle scene: palette from CSS variables, text only
// in HTML overlays (never in canvas or geometry), one renderer per view, destroy() on unmount.
import {
  AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry,
  DirectionalLight, IcosahedronGeometry, InstancedMesh, LineBasicMaterial, LineSegments, MathUtils,
  Matrix4, Mesh, MeshLambertMaterial, NoColorSpace, PerspectiveCamera, PlaneGeometry, Quaternion, Raycaster, Scene,
  ShaderMaterial, SRGBColorSpace, Texture, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import topoJson from '../../content/atlas/provinces.topo.json';
import landmarkJson from '../../content/atlas/landmarks.json';
import { filterLandmarks, type Filter, type Kind, type Landmark, type Province } from './search';

export type Quality = 'high' | 'low';
export interface AtlasSceneOptions {
  quality?: Quality;
  /** Called with a landmark id, a province id, or null (click on the sea). */
  onSelect?: (id: string | null) => void;
  /** Base URL of frontend/public (terrain.png lives at <base>atlas/terrain.png). */
  assetBase?: string;
}

// Must match scripts/atlas/build-terrain.mjs.
const BBOX = { west: 101.5, east: 117.5, south: 7, north: 24 };
const MAX_H = 3200;
const LAT0 = (BBOX.north + BBOX.south) / 2;
const KX = Math.cos((LAT0 * Math.PI) / 180);
const S = 10; // scene units per degree of latitude
const EXAG = 14; // vertical exaggeration of the relief
const WIDTH = (BBOX.east - BBOX.west) * KX * S;
const DEPTH = (BBOX.north - BBOX.south) * S;
const HOME = { lat: 15.6, lng: (BBOX.west + BBOX.east) / 2, fit: [WIDTH, DEPTH * 0.98] as const };
const QUALITY = {
  high: { segments: 256, mask: 2048, pixelRatio: 1.5, labels: 60 },
  low: { segments: 128, mask: 1024, pixelRatio: 1, labels: 26 },
};

export const LANDMARKS = landmarkJson as Landmark[];
type Ring = number[][]; // [lng, lat][]
interface Unit { props: Province & { label: [number, number] }; polygons: Ring[][]; bbox: [number, number, number, number] }
interface Archipelago { id: string; name: string; provinceId: string; label: [number, number]; islands: { name: string; coords: [number, number] }[] }

// Minimal TopoJSON decoder (Polygon / MultiPolygon only); topojson-client is not needed at runtime.
interface Topo { transform: { scale: [number, number]; translate: [number, number] }; arcs: number[][][]; objects: Record<string, { geometries: { type: string; arcs: number[][] | number[][][]; properties: Record<string, unknown> }[] }> }
function decode(topo: Topo, name: string) {
  const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]); });
  const ring = (ids: number[]) => ids.flatMap((i, k) => { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; return k ? a.slice(1) : a; });
  return topo.objects[name].geometries.map((g) => ({
    properties: g.properties,
    polygons: g.type === 'Polygon' ? [(g.arcs as number[][]).map(ring)] : g.type === 'MultiPolygon' ? (g.arcs as number[][][]).map((p) => p.map(ring)) : [],
  }));
}
export const UNITS: Unit[] = decode(topoJson as unknown as Topo, 'provinces').map(({ properties, polygons }) => {
  const pts = polygons.flat(2).filter((p) => p[0] < 110.5);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { props: properties as unknown as Unit['props'], polygons, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
});
export const ARCHIPELAGOS = decode(topoJson as unknown as Topo, 'archipelagos').map((a) => a.properties as unknown as Archipelago);

function inRing(ring: Ring, x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function unitAt(lng: number, lat: number): Unit | undefined {
  return UNITS.find((u) => u.polygons.some(([outer, ...holes]) => inRing(outer, lng, lat) && !holes.some((h) => inRing(h, lng, lat))));
}

const toXZ = (lat: number, lng: number): [number, number] => [(lng - (BBOX.west + BBOX.east) / 2) * KX * S, ((BBOX.north + BBOX.south) / 2 - lat) * S];
const toLatLng = (x: number, z: number): [number, number] => [(BBOX.north + BBOX.south) / 2 - z / S, x / (KX * S) + (BBOX.west + BBOX.east) / 2];

/** Marker colour per kind: [CSS variable, fallback]. The view's legend uses the same pair. */
export const KIND_COLORS: Record<Kind, [string, string]> = {
  'chien-truong': ['--vermilion', '#A8412F'],
  'kinh-do': ['--ochre', '#B79B5E'],
  unesco: ['--muted-indigo', '#3E5C76'],
  'di-tich': ['--sepia', '#7A5C3E'],
  'danh-thang': ['--deep-green', '#4F6355'],
};

function palette() {
  const css = getComputedStyle(document.documentElement);
  const c = (name: string, fallback: string) => new Color(css.getPropertyValue(name).trim() || fallback);
  return {
    paper: c('--color-page', '#F4EEDD'),
    seaShallow: c('--water-grey-blue', '#9DB0B3'),
    seaDeep: c('--muted-indigo', '#3E5C76'),
    low: c('--scene-wash-celadon', '#9EAA8D'),
    high: c('--scene-paddy-green', '#87927A'),
    peak: c('--scene-mountain-light', '#C6C4B4'),
    foreign: c('--mist', '#D9D3C1'),
    ink: c('--ink', '#2B2926'),
    sepia: c('--sepia', '#7A5C3E'),
    select: c('--vermilion', '#A8412F'),
    island: c('--scene-wash-earth', '#B9A47A'),
    kinds: Object.fromEntries(Object.entries(KIND_COLORS).map(([k, [v, f]]) => [k, c(v, f)])) as Record<Kind, Color>,
    font: css.getPropertyValue('--font-serif').trim() || '"Noto Serif", serif',
  };
}

// One shape per kind, so kinds differ by form as well as colour (colour-blind safe).
function markerGeometry(kind: Kind): BufferGeometry {
  const stem = new CylinderGeometry(0.06, 0.06, 1.1, 6).translate(0, 0.55, 0);
  const head = {
    'chien-truong': () => new ConeGeometry(0.5, 0.9, 4).rotateX(Math.PI).translate(0, 1.55, 0),
    'kinh-do': () => new CylinderGeometry(0.5, 0.5, 0.36, 6).translate(0, 1.3, 0),
    unesco: () => new IcosahedronGeometry(0.42, 0).translate(0, 1.4, 0),
    'di-tich': () => new BoxGeometry(0.62, 0.62, 0.62).translate(0, 1.35, 0),
    'danh-thang': () => new ConeGeometry(0.46, 0.85, 10).translate(0, 1.45, 0),
  }[kind]();
  const merged = mergeGeometries([stem.toNonIndexed(), head.toNonIndexed()])!;
  stem.dispose(); head.dispose();
  return merged;
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAGMENT = /* glsl */ `
uniform sampler2D uTerrain; uniform sampler2D uMask; uniform float uHasTerrain;
uniform vec3 uPaper, uSeaShallow, uSeaDeep, uLow, uHigh, uPeak, uForeign, uSelect;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec4 t = mix(vec4(0.0, 0.25, 0.71, 1.0), texture2D(uTerrain, vUv), uHasTerrain);
  vec4 m = texture2D(uMask, vUv);
  float h = t.r * t.r, depth = t.g * t.g;
  float land = max(step(0.02, t.r), m.r);
  vec3 sea = mix(uSeaShallow * 1.08, mix(uSeaShallow, uSeaDeep, 0.55), smoothstep(0.0, 0.45, depth));
  vec3 home = mix(uLow, uHigh, smoothstep(0.0, 0.3, h));
  home = mix(home, uPeak, smoothstep(0.32, 0.85, h));
  vec3 ground = mix(uForeign, home, m.r) * mix(0.8, 1.1, t.b);
  vec3 c = mix(sea, ground, land);
  c = mix(c, uSelect, m.b * 0.38);
  c *= 0.975 + 0.05 * hash(floor(vUv * 1600.0));
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  gl_FragColor = vec4(mix(uPaper, c, smoothstep(0.0, 0.035, e)), 1.0);
  #include <colorspace_fragment>
}`;

interface Label { el: HTMLElement; pos: Vector3; w: number; h: number; priority: number; kind: 'province' | 'sea' | 'landmark'; id: string; visible: boolean }

export class VietnamAtlasScene {
  readonly ready: Promise<void>;
  private container: HTMLElement;
  private onSelect?: (id: string | null) => void;
  private quality: Quality;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.5, 2000);
  private controls: MapControls;
  private colors = palette();
  private terrain?: Mesh<PlaneGeometry, ShaderMaterial>;
  private heights?: { data: Uint8ClampedArray; w: number; h: number };
  private maskCanvas = document.createElement('canvas');
  private maskTexture: CanvasTexture;
  private terrainTexture?: Texture;
  private borderLines?: LineSegments;
  private markers = new Map<Kind, { mesh: InstancedMesh; items: Landmark[] }>();
  private islands?: InstancedMesh;
  private labels: Label[] = [];
  private overlay = document.createElement('div');
  private selected: string | null = null;
  private visibleIds = new Set(LANDMARKS.map((l) => l.id));
  private flight?: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; t0: number; ms: number };
  private dirty = true;
  private frame = 0;
  private lastScale = 0;
  private resizeObserver: ResizeObserver;
  private down?: Vector2;
  private raycaster = new Raycaster();
  private destroyed = false;
  private insetBottom = 0; // px of the canvas hidden under the view's bottom sheet
  private reserved: number[][] = []; // [x0, y0, x1, y1] boxes of view controls that labels must avoid
  /** Frames actually rendered; the harness reads it to measure FPS. */
  renderedFrames = 0;

  constructor(container: HTMLElement, options: AtlasSceneOptions = {}) {
    this.container = container;
    this.onSelect = options.onSelect;
    this.quality = options.quality ?? (matchMedia('(max-width: 640px), (pointer: coarse)').matches ? 'low' : 'high');
    try {
      this.renderer = new WebGLRenderer({ antialias: this.quality === 'high', powerPreference: 'high-performance' });
    } catch {
      throw new Error('Trình duyệt không hỗ trợ WebGL nên không hiển thị được bản đồ 3D.');
    }
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(this.colors.paper);
    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Bản đồ 3D Việt Nam: kéo để di chuyển, cuộn hoặc chụm hai ngón để phóng to, phím mũi tên để dịch chuyển.');
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; // anchors the label overlay
    container.append(canvas);
    this.overlay.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none';
    this.overlay.setAttribute('aria-hidden', 'true'); // names repeat the view's list, which is the accessible path
    container.append(this.overlay);

    this.controls = new MapControls(this.camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.12, screenSpacePanning: false, minDistance: 6, maxDistance: 330, maxPolarAngle: 1.15, zoomToCursor: true });
    this.controls.listenToKeyEvents(canvas);
    this.controls.addEventListener('start', () => { this.flight = undefined; });
    this.controls.addEventListener('change', () => { this.dirty = true; });

    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(-40, 80, -30);
    this.scene.add(new AmbientLight(0xffffff, 1.6), sun);
    this.maskTexture = new CanvasTexture(this.maskCanvas);
    this.maskTexture.colorSpace = NoColorSpace; // data channels, not colour
    this.drawMask();
    this.buildGround();
    this.buildMarkers();
    this.buildLabels();
    this.home(false);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.ready = this.loadTerrain(options.assetBase ?? './');
    this.frame = requestAnimationFrame(this.tick);
  }

  // --- public API (plan §4.2)

  setQuality(quality: Quality) {
    if (quality === this.quality) return;
    this.quality = quality;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY[quality].pixelRatio));
    this.drawMask();
    this.buildGround();
    this.resize();
  }

  /** Fly to a landmark or province id; null flies back to the whole country. Returns false for unknown ids. */
  focusPlace(id: string | null, animate = !matchMedia('(prefers-reduced-motion: reduce)').matches): boolean {
    this.select(id);
    if (!id) { this.home(animate); return true; }
    const landmark = LANDMARKS.find((l) => l.id === id);
    const unit = UNITS.find((u) => u.props.id === id);
    const arch = ARCHIPELAGOS.find((a) => a.id === id);
    if (!landmark && !unit && !arch) return false;
    const [lat, lng] = landmark?.coords ?? unit?.props.label ?? arch!.label;
    let distance = 26;
    if (unit) distance = Math.max(30, Math.hypot((unit.bbox[2] - unit.bbox[0]) * KX, unit.bbox[3] - unit.bbox[1]) * S * 2.1);
    if (arch) distance = 90;
    this.flyTo(lat, lng, distance, animate);
    return true;
  }

  /**
   * UI drawn over the canvas: `bottom` px hidden under a bottom sheet (the camera centres on what stays
   * visible) and `reserved` boxes (buttons) that labels must not sit under. Pixels relative to the container.
   */
  setViewInsets({ bottom = 0, reserved = [] }: { bottom?: number; reserved?: { x: number; y: number; width: number; height: number }[] }) {
    this.reserved = reserved.map((b) => [b.x, b.y, b.x + b.width, b.y + b.height]);
    this.dirty = true;
    if (Math.abs(bottom - this.insetBottom) < 1) return;
    this.insetBottom = bottom;
    this.resize();
  }

  setFilter(filter: Filter) {
    this.visibleIds = new Set(filterLandmarks(LANDMARKS, filter).map((h) => h.item.id));
    this.lastScale = 0; // forces instance matrices to be rewritten
    this.dirty = true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    this.scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []).forEach((x) => x.dispose());
    });
    this.maskTexture.dispose();
    this.terrainTexture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
    this.overlay.remove();
  }

  // --- building

  private drawMask() {
    const size = QUALITY[this.quality].mask;
    const w = size, h = Math.round((size * DEPTH) / WIDTH);
    const cv = this.maskCanvas;
    if (cv.width !== w) { cv.width = w; cv.height = h; this.maskTexture?.dispose(); }
    const ctx = cv.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter'; // red = Viet Nam, blue = selection
    const px = ([lng, lat]: number[]) => [((lng - BBOX.west) / (BBOX.east - BBOX.west)) * w, ((BBOX.north - lat) / (BBOX.north - BBOX.south)) * h];
    const path = (unit: Unit) => {
      const p = new Path2D();
      for (const poly of unit.polygons) for (const ring of poly) ring.forEach((pt, i) => { const [x, y] = px(pt); if (i) p.lineTo(x, y); else p.moveTo(x, y); });
      return p;
    };
    for (const unit of UNITS) {
      const p = path(unit);
      ctx.fillStyle = '#ff0000';
      ctx.fill(p, 'evenodd');
      if (unit.props.id === this.selected) { ctx.fillStyle = '#0000ff'; ctx.fill(p, 'evenodd'); }
    }
    if (this.maskTexture) this.maskTexture.needsUpdate = true;
    this.dirty = true;
  }

  private buildGround() {
    if (this.terrain) { this.scene.remove(this.terrain); this.terrain.geometry.dispose(); this.terrain.material.dispose(); }
    const seg = QUALITY[this.quality].segments;
    const geometry = new PlaneGeometry(WIDTH, DEPTH, seg, Math.round((seg * DEPTH) / WIDTH)).rotateX(-Math.PI / 2);
    const c = this.colors;
    const material = new ShaderMaterial({
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, // borders win the depth test
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTerrain: { value: this.terrainTexture ?? null }, uMask: { value: this.maskTexture },
        uHasTerrain: { value: this.terrainTexture ? 1 : 0 },
        uPaper: { value: c.paper }, uSeaShallow: { value: c.seaShallow }, uSeaDeep: { value: c.seaDeep }, uLow: { value: c.low },
        uHigh: { value: c.high }, uPeak: { value: c.peak }, uForeign: { value: c.foreign }, uSelect: { value: c.select },
      },
    });
    this.terrain = new Mesh(geometry, material);
    this.scene.add(this.terrain);
    this.displace();
  }

  private async loadTerrain(base: string) {
    const img = new Image();
    img.decoding = 'async';
    img.src = new URL('atlas/terrain.png', new URL(base, document.baseURI)).href;
    try { await img.decode(); } catch { return; } // flat silk map is the fallback
    if (this.destroyed) return;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    this.heights = { data: ctx.getImageData(0, 0, cv.width, cv.height).data, w: cv.width, h: cv.height };
    this.terrainTexture = new Texture(img);
    this.terrainTexture.colorSpace = NoColorSpace; // height, depth and shade, not colour
    this.terrainTexture.needsUpdate = true;
    if (this.terrain) {
      this.terrain.material.uniforms.uTerrain.value = this.terrainTexture;
      this.terrain.material.uniforms.uHasTerrain.value = 1;
    }
    this.displace();
  }

  /** Height in scene units at a lat/lng (0 for sea or before the terrain has loaded). */
  private heightAt(lat: number, lng: number): number {
    if (!this.heights) return 0;
    const { data, w, h } = this.heights;
    const x = MathUtils.clamp(((lng - BBOX.west) / (BBOX.east - BBOX.west)) * (w - 1), 0, w - 1);
    const y = MathUtils.clamp(((BBOX.north - lat) / (BBOX.north - BBOX.south)) * (h - 1), 0, h - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
    const r = (i: number, j: number) => { const v = data[(j * w + i) * 4] / 255; return v * v; };
    const v = MathUtils.lerp(MathUtils.lerp(r(x0, y0), r(x1, y0), x - x0), MathUtils.lerp(r(x0, y1), r(x1, y1), x - x0), y - y0);
    return ((v * MAX_H) / 111320) * S * EXAG;
  }

  private displace() {
    if (this.terrain) {
      const pos = this.terrain.geometry.attributes.position as BufferAttribute;
      for (let i = 0; i < pos.count; i++) { const [lat, lng] = toLatLng(pos.getX(i), pos.getZ(i)); pos.setY(i, this.heightAt(lat, lng)); }
      pos.needsUpdate = true;
      this.terrain.geometry.computeBoundingSphere();
      this.terrain.geometry.computeBoundingBox();
    }
    this.buildBorderLines();
    for (const l of this.labels) if (l.kind !== 'sea') { const [lat, lng] = toLatLng(l.pos.x, l.pos.z); l.pos.y = this.heightAt(lat, lng) + (l.kind === 'landmark' ? 2.2 : 0.4); }
    this.lastScale = 0;
    this.dirty = true;
  }

  // Borders are line segments draped over the relief: crisp at every zoom, unlike borders baked into
  // the mask texture (measured in notes/s3.md).
  private buildBorderLines() {
    if (this.borderLines) { this.scene.remove(this.borderLines); this.borderLines.geometry.dispose(); (this.borderLines.material as LineBasicMaterial).dispose(); }
    const pts: number[] = [];
    for (const unit of UNITS) for (const poly of unit.polygons) for (const ring of poly) for (let i = 1; i < ring.length; i++) {
      for (const [lng, lat] of [ring[i - 1], ring[i]]) { const [x, z] = toXZ(lat, lng); pts.push(x, this.heightAt(lat, lng) + 0.08, z); }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    this.borderLines = new LineSegments(g, new LineBasicMaterial({ color: this.colors.sepia, transparent: true, opacity: 0.75 }));
    this.scene.add(this.borderLines);
  }

  private buildMarkers() {
    const kinds = [...new Set(LANDMARKS.map((l) => l.kind))];
    for (const kind of kinds) {
      const items = LANDMARKS.filter((l) => l.kind === kind);
      const mesh = new InstancedMesh(markerGeometry(kind), new MeshLambertMaterial({ color: 0xffffff }), items.length);
      items.forEach((_, i) => mesh.setColorAt(i, this.colors.kinds[kind]));
      mesh.userData.kind = kind;
      this.markers.set(kind, { mesh, items });
      this.scene.add(mesh);
    }
    const islands = ARCHIPELAGOS.flatMap((a) => a.islands);
    this.islands = new InstancedMesh(new CylinderGeometry(0.32, 0.32, 0.12, 12), new MeshLambertMaterial({ color: this.colors.island }), islands.length);
    this.scene.add(this.islands);
  }

  /** Markers keep a roughly constant on-screen size: their scale follows the camera distance. */
  private placeMarkers(scale: number) {
    const m = new Matrix4(), s = new Vector3(), p = new Vector3(), q = new Quaternion();
    for (const { mesh, items } of this.markers.values()) {
      items.forEach((l, i) => {
        const [x, z] = toXZ(...l.coords);
        const k = this.visibleIds.has(l.id) ? scale * (l.id === this.selected ? 1.6 : 1) : 0;
        mesh.setMatrixAt(i, m.compose(p.set(x, this.heightAt(...l.coords), z), q, s.setScalar(k)));
        mesh.setColorAt(i, l.id === this.selected ? this.colors.select.clone().lerp(new Color(1, 1, 1), 0.25) : this.colors.kinds[l.kind]);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    ARCHIPELAGOS.flatMap((a) => a.islands).forEach((isl, i) => {
      const [x, z] = toXZ(...isl.coords);
      this.islands!.setMatrixAt(i, m.compose(p.set(x, 0.03, z), q, s.set(scale, 1, scale)));
    });
    this.islands!.instanceMatrix.needsUpdate = true;
    this.islands!.computeBoundingSphere();
  }

  private buildLabels() {
    const font = this.colors.font;
    const make = (text: string, kind: Label['kind'], id: string, lat: number, lng: number, priority: number) => {
      const el = document.createElement('span');
      el.textContent = text;
      el.dataset.id = id;
      const base = 'position:absolute;left:0;top:0;white-space:nowrap;will-change:transform;user-select:none;';
      const halo = `text-shadow:0 0 3px #${this.colors.paper.getHexString()},0 0 2px #${this.colors.paper.getHexString()},0 0 1px #${this.colors.paper.getHexString()};`;
      el.style.cssText = base + halo + ({
        province: `font:600 12px/1 ${font};letter-spacing:.06em;text-transform:uppercase;color:#${this.colors.ink.getHexString()};opacity:.78`,
        sea: `font:italic 600 13px/1 ${font};color:#${this.colors.seaDeep.getHexString()}`,
        landmark: `font:500 12px/1.1 ${font};color:#${this.colors.ink.getHexString()};pointer-events:auto;cursor:pointer;padding:2px 4px`,
      })[kind];
      if (kind === 'landmark') el.addEventListener('click', () => { this.focusPlace(id); this.onSelect?.(id); });
      this.overlay.append(el);
      const [x, z] = toXZ(lat, lng);
      this.labels.push({ el, pos: new Vector3(x, 0, z), w: 0, h: 0, priority, kind, id, visible: true });
    };
    for (const a of ARCHIPELAGOS) make(a.name, 'sea', a.id, a.label[0] + 0.9, a.label[1], 950);
    make('Biển Đông', 'sea', 'bien-dong', 13.5, 112.2, 940);
    for (const u of UNITS) {
      const area = (u.bbox[2] - u.bbox[0]) * (u.bbox[3] - u.bbox[1]);
      make(u.props.name, 'province', u.props.id, u.props.label[0], u.props.label[1], 500 + Math.min(300, area * 60));
    }
    const rank: Record<Kind, number> = { 'kinh-do': 60, unesco: 50, 'chien-truong': 45, 'di-tich': 20, 'danh-thang': 10 };
    for (const l of LANDMARKS) make(l.name, 'landmark', l.id, l.coords[0], l.coords[1], 300 + rank[l.kind] + (l.lessonIds?.length ? 30 : 0));
    const measure = () => { for (const l of this.labels) { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; } this.dirty = true; };
    measure();
    document.fonts?.ready.then(() => !this.destroyed && measure());
  }

  /** Greedy collision culling, highest priority first; landmarks outrank provinces when close. */
  private layoutLabels() {
    const w = this.container.clientWidth, h = this.visibleHeight();
    const dist = this.camera.position.distanceTo(this.controls.target);
    const near = dist < 70;
    const max = QUALITY[this.quality].labels;
    const placed: number[][] = [...this.reserved];
    const v = new Vector3();
    const order = this.labels.map((l) => {
      let p = l.priority;
      if (l.id === this.selected) p = 10000;
      else if (l.kind === 'landmark') p = !this.visibleIds.has(l.id) || dist > 140 ? -1 : near ? p + 400 : p;
      else if (l.kind === 'province' && near && dist < 30) p -= 300;
      return [p, l] as const;
    }).sort((a, b) => b[0] - a[0]);
    let shown = 0;
    for (const [p, l] of order) {
      v.copy(l.pos).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h - (l.kind === 'landmark' ? 10 : 0);
      const box = [x - l.w / 2 - 3, y - l.h / 2 - 2, x + l.w / 2 + 3, y + l.h / 2 + 2];
      const ok = p >= 0 && v.z < 1 && box[2] > 0 && box[0] < w && box[3] > 0 && box[1] < h && shown < max &&
        !placed.some((b) => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1]);
      if (ok) { placed.push(box); shown++; l.el.style.transform = `translate(${(x - l.w / 2).toFixed(1)}px,${(y - l.h / 2).toFixed(1)}px)`; }
      if (ok !== l.visible) { l.el.style.visibility = ok ? 'visible' : 'hidden'; l.visible = ok; }
      if (l.kind === 'landmark') l.el.style.fontWeight = l.id === this.selected ? '700' : '500';
    }
  }

  // --- camera

  private fitDistance(width: number, depth: number) {
    const aspect = this.container.clientWidth / Math.max(1, this.visibleHeight());
    const vfov = MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    return Math.max(depth / 2 / Math.tan(vfov / 2), width / 2 / Math.tan(hfov / 2));
  }

  private visibleHeight() {
    const h = this.container.clientHeight;
    return h - MathUtils.clamp(this.insetBottom, 0, h * 0.7);
  }

  private home(animate: boolean) {
    this.flyTo(HOME.lat, HOME.lng, this.fitDistance(...HOME.fit), animate, 0.42);
  }

  private flyTo(lat: number, lng: number, distance: number, animate: boolean, tilt = 0.62) {
    const [x, z] = toXZ(lat, lng);
    const target = new Vector3(x, this.heightAt(lat, lng), z);
    const position = target.clone().add(new Vector3(0, Math.cos(tilt), Math.sin(tilt)).multiplyScalar(distance));
    if (!animate) {
      this.flight = undefined;
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
      this.dirty = true;
      return;
    }
    this.flight = { from: [this.camera.position.clone(), this.controls.target.clone()], to: [position, target], t0: performance.now(), ms: 1100 };
  }

  private resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY[this.quality].pixelRatio));
    this.renderer.setSize(w, h, false);
    // A view offset taller than the frustum keeps the projection centre in the visible strip above the sheet.
    const visible = this.visibleHeight();
    this.camera.aspect = w / visible;
    if (visible < h) this.camera.setViewOffset(w, visible, 0, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  // --- interaction

  private select(id: string | null) {
    const wasUnit = UNITS.some((u) => u.props.id === this.selected);
    this.selected = id;
    if (wasUnit || UNITS.some((u) => u.props.id === id)) this.drawMask();
    this.lastScale = 0;
    this.dirty = true;
  }

  private pick(e: PointerEvent): { id: string | null; marker: boolean } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), this.camera);
    const meshes = [...this.markers.values()].map((m) => m.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (hit && hit.instanceId != null) {
      const { items } = this.markers.get(hit.object.userData.kind as Kind)!;
      return { id: items[hit.instanceId].id, marker: true };
    }
    const ground = this.raycaster.intersectObjects([this.terrain!], false)[0];
    if (!ground) return { id: null, marker: false };
    const [lat, lng] = toLatLng(ground.point.x, ground.point.z);
    return { id: unitAt(lng, lat)?.props.id ?? null, marker: false };
  }

  private onPointerDown = (e: PointerEvent) => { this.down = new Vector2(e.clientX, e.clientY); };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.down || this.down.distanceTo(new Vector2(e.clientX, e.clientY)) > 6) return;
    this.down = undefined;
    const { id } = this.pick(e);
    this.focusPlace(id);
    this.onSelect?.(id);
  };

  private hoverAt = 0;
  private onPointerMove = (e: PointerEvent) => {
    if (e.buttons || performance.now() - this.hoverAt < 80) return;
    this.hoverAt = performance.now();
    this.renderer.domElement.style.cursor = this.pick(e).marker ? 'pointer' : '';
  };

  private tick = (now: number) => {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.tick);
    if (this.flight) {
      const t = Math.min(1, (now - this.flight.t0) / this.flight.ms);
      const k = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      this.camera.position.lerpVectors(this.flight.from[0], this.flight.to[0], k);
      this.controls.target.lerpVectors(this.flight.from[1], this.flight.to[1], k);
      if (t === 1) this.flight = undefined;
      this.dirty = true;
    }
    this.controls.update();
    if (!this.dirty) return;
    this.dirty = false;
    const scale = MathUtils.clamp(this.camera.position.distanceTo(this.controls.target) / 55, 0.45, 4);
    if (Math.abs(scale - this.lastScale) > 0.01) { this.placeMarkers(scale); this.lastScale = scale; }
    this.renderer.render(this.scene, this.camera);
    this.renderedFrames++;
    this.layoutLabels();
  };
}

