// The silk-map table scene. Everything lesson-specific comes from `simulation.scene`
// (terrain preset, features, labels, formations) so a new lesson needs data, not code.
// Loaded as its own chunk (three.js) through SceneView.
import {
  CanvasTexture, Color, DoubleSide, Fog, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera,
  PerspectiveCamera, PlaneGeometry, SRGBColorSpace, Scene as ThreeScene, Texture, Vector3, WebGLRenderer
} from 'three';
import type { Lesson, Point } from '../lib/lesson-schema';
import { normalizeCounts } from './counts';
import { TABLE, paintMap, paintSprite, palette, type Palette, type SpriteKind } from './artwork';

export type Quality = 'high' | 'low';
export type PresetName = 'overview' | 'follow_troops' | 'close_up' | 'top_down';
type SceneLesson = Pick<Lesson, 'simulation' | 'factions'>;
type Options = { quality?: Quality; lesson: SceneLesson; onProgressUpdate?: (progress: number) => void };
type UnitRecord = { x: number; z: number; startX?: number; startZ?: number; endX?: number; endZ?: number; phase: number; scale: number; rotation: number };
type Batch = { mesh: InstancedMesh; shadows: InstancedMesh; records: UnitRecord[]; material: MeshBasicMaterial };
type UnitGroup = { kind: SpriteKind; side: 'a' | 'b'; troops: boolean; batches: Batch[]; baseCount: number; visibleCount: number };

const PRESETS: Record<PresetName, { pos: [number, number, number]; target: [number, number, number]; fov: number; ortho?: boolean }> = {
  overview: { pos: [0, 158, 70], target: [0, 0, 0], fov: 30 },
  follow_troops: { pos: [-42, 116, 50], target: [-8, 0, 5], fov: 32 },
  close_up: { pos: [-9, 78, 28], target: [-8, 0, -22], fov: 30 },
  top_down: { pos: [0, 210, 0], target: [0, 0, 0], fov: 30, ortho: true }
};
const PRESET_ALIASES: Record<string, PresetName> = { 'Toàn cảnh': 'overview', overview_map: 'overview', 'Toàn cảnh sa bàn': 'overview', 'Theo quân': 'follow_troops', 'Cận cảnh': 'close_up', 'Từ trên': 'top_down' };


// Which unit groups each prop toggle in the editor shows or hides.
const PROP_GROUPS: Record<string, string[]> = { elephants: ['aSpecial', 'bSpecial'], banners: ['bannersA', 'bannersB'], tents: ['tents'], palisade: ['palisade', 'watchtower'], fire: ['torches'], village: ['village'], bamboo: ['bamboo'] };

// Optional PNG art: only files that exist get bundled. See ./sprites/README.md.
const SPRITE_FILES = import.meta.glob<string>('./sprites/*.png', { eager: true, query: '?url', import: 'default' });
function spriteOverride(kind: SpriteKind, side: 'a' | 'b') {
  const name = kind === 'soldier' || kind === 'banner' ? `${kind}_${side}` : kind;
  return SPRITE_FILES[`./sprites/${name}.png`];
}

// Sprites painted in the faction color; recolored when the teacher changes it.
const TEAM_KINDS = new Set<SpriteKind>(['soldier', 'banner', 'elephant', 'cannon', 'boat', 'tank']);
const DEFAULT_FORMATIONS = { a: { from: [-2, 52] as Point, to: [0, -2] as Point }, b: { from: [0, -19] as Point, to: [0, -48] as Point } };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export class SilkMapScene {
  private container: HTMLElement;
  private options: Required<Pick<Options, 'quality'>> & Options;
  private theme: Palette;
  private scene = new ThreeScene();
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera | OrthographicCamera;
  private target = new Vector3();
  private aspect: number;
  private fogSettings: Fog;
  private groups: Record<string, UnitGroup> = {};
  private textures: Texture[] = [];
  private materials: MeshBasicMaterial[] = [];
  private fogCards: Mesh[] = [];
  private labels: { element: HTMLElement; position: Vector3 }[] = [];
  private caveat: HTMLElement;
  private colors: { a: string; b: string };
  private random = Math.random;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private last = performance.now();
  private transition: { started: number; from: Vector3; to: Vector3; fromTarget: Vector3; toTarget: Vector3 } | null = null;
  private orbit = { on: false, angle: 0 };
  private destroyed = false;
  private pointer: { x: number; y: number } | null = null;
  private infantry = { a: 0, b: 0 };
  currentTime = 0;
  isPlaying = false;
  playbackSpeed = 1;
  durationSeconds = 36;
  activePreset: PresetName = 'overview';

  constructor(container: HTMLElement, options: Options) {
    this.container = container;
    this.options = { quality: 'high', ...options };
    this.theme = palette();
    this.colors = { a: options.lesson.factions?.a.color ?? this.theme.red, b: options.lesson.factions?.b.color ?? this.theme.indigo };
    this.scene.background = new Color(this.theme.silk);
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;
    this.aspect = width / height;
    this.renderer = new WebGLRenderer({ antialias: this.options.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);
    this.camera = new PerspectiveCamera(30, this.aspect, 1, 900);
    this.camera.position.set(...PRESETS.overview.pos);
    this.camera.lookAt(this.target);
    this.fogSettings = new Fog(this.theme.mist, 245, 460);
    this.scene.fog = this.fogSettings;

    this.buildMap();
    this.buildUnits();
    this.buildFog();
    this.caveat = this.buildLabels();
    this.bindPointer();
    this.setQuality(this.options.quality);
    this.updateTimeline(0);
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
    this.frame = requestAnimationFrame(this.animate);
  }

  private get sim() {
    return this.options.lesson.simulation;
  }

  private texture(canvas: HTMLCanvasElement) {
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }

  private material(params: ConstructorParameters<typeof MeshBasicMaterial>[0]) {
    const material = new MeshBasicMaterial(params);
    this.materials.push(material);
    return material;
  }

  private buildMap() {
    const map = this.texture(paintMap(document.createElement('canvas'), this.sim.scene, this.theme));
    map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    const mesh = new Mesh(new PlaneGeometry(TABLE.width, TABLE.depth), this.material({ map }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.25;
    this.scene.add(mesh);
  }

  private spriteCanvas(kind: SpriteKind, variant: number, side: 'a' | 'b') {
    const canvas = paintSprite(kind, this.theme, variant, this.colors[side], side);
    const url = spriteOverride(kind, side);
    if (url) {
      const image = new Image();
      image.onload = () => {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d')!.drawImage(image, 0, 0);
        for (const group of Object.values(this.groups)) if (group.kind === kind) group.batches.forEach((b) => b.material.map && (b.material.map.needsUpdate = true));
      };
      image.src = url;
    }
    return canvas;
  }

  private shadowTexture?: Texture;
  private getShadowTexture() {
    if (this.shadowTexture) return this.shadowTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 72;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(64, 36, 4, 64, 36, 36);
    gradient.addColorStop(0, 'rgba(43,41,38,.44)');
    gradient.addColorStop(1, 'rgba(43,41,38,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 72);
    return (this.shadowTexture = this.texture(canvas));
  }

  private addGroup(name: string, kind: SpriteKind, side: 'a' | 'b', count: number, place: (index: number) => Omit<UnitRecord, 'scale' | 'rotation' | 'phase'> & { phase?: number }, troops = false) {
    if (count <= 0) return;
    const records: UnitRecord[] = [];
    for (let index = 0; index < count; index++) {
      const placed = place(index);
      records.push({ phase: this.random() * Math.PI * 2, ...placed, scale: 0.72 + this.random() * 0.45, rotation: (this.random() - 0.5) * 0.42 });
    }
    const group = new Group();
    const variants = kind === 'soldier' ? 4 : 1;
    const batches: Batch[] = [];
    for (let variant = 0; variant < variants; variant++) {
      const own = records.filter((_, index) => index % variants === variant);
      const material = this.material({ map: this.texture(this.spriteCanvas(kind, variant, side)), transparent: true, alphaTest: 0.08, depthWrite: false, side: DoubleSide });
      const mesh = new InstancedMesh(new PlaneGeometry(4.8, 4.8), material, Math.max(1, own.length));
      const shadows = new InstancedMesh(new PlaneGeometry(5.2, 2.8), this.material({ map: this.getShadowTexture(), transparent: true, depthWrite: false, opacity: 0.35 }), Math.max(1, own.length));
      mesh.frustumCulled = shadows.frustumCulled = false;
      group.add(shadows, mesh);
      batches.push({ mesh, shadows, records: own, material });
    }
    this.scene.add(group);
    this.groups[name] = { kind, side, troops, batches, baseCount: count, visibleCount: count };
  }

  /** Troops and props, placed from the scene's formations and features. */
  private buildUnits() {
    const scene = this.sim.scene;
    const counts = normalizeCounts(this.sim.unitCounts);
    const formations = { a: scene.formations?.a ?? DEFAULT_FORMATIONS.a, b: scene.formations?.b ?? DEFAULT_FORMATIONS.b };
    const r = this.random;
    // Squads of 10 in loose rings; a: 7 squads per row 14 apart, b: 6 per row 17 apart (as in v1).
    const formation = (side: 'a' | 'b', count: number) => {
      const { from, to } = formations[side];
      const [perRow, dx, dz] = side === 'a' ? [7, 14, 13] : [6, 17, 12];
      const rows = Math.ceil(count / 10 / perRow);
      return (index: number) => {
        const squad = Math.floor(index / 10);
        const rank = index % 10;
        const cx = from[0] + ((squad % perRow) - (perRow - 1) / 2) * dx;
        const cz = from[1] + (Math.floor(squad / perRow) - (rows - 1) / 2) * dz;
        const angle = squad * 2.17 + (rank % 3) * 0.23;
        const radius = 2.7 + Math.floor(rank / 3) * 1.4;
        const sx = cx + Math.cos(angle) * radius;
        const sz = cz + Math.sin(angle) * radius;
        const spread = side === 'a' ? 26 : 12;
        return { x: sx + (r() - 0.5) * 2.7, z: sz + (r() - 0.5) * 2.5, startX: sx, startZ: sz, endX: to[0] + (cx - from[0]) + Math.cos(angle) * radius * 0.52, endZ: to[1] + (r() - 0.5) * spread };
      };
    };
    const countA = clamp((counts.aInfantry || 48) * 3, 120, 230);
    const countB = clamp((counts.bInfantry || 54) * 3, 105, 200);
    this.infantry = { a: countA, b: countB };
    this.addGroup('sideA', 'soldier', 'a', countA, formation('a', countA), true);
    this.addGroup('sideB', 'soldier', 'b', countB, formation('b', countB), true);

    const fa = formations.a;
    const fb = formations.b;
    const aKind = scene.aSpecialKind ?? 'elephant';
    const aSpecial = counts.aSpecial ?? 7;
    this.addGroup('aSpecial', aKind, 'a', aSpecial, (i) => {
      const x = fa.from[0] - 38 + (i - (aSpecial - 7) / 2) * 13;
      return { x, z: fa.from[1] + 10 + r() * 4, startX: x, startZ: fa.from[1] + 10, endX: fa.to[0] - 22 + i * 8, endZ: fa.to[1] - 6 + r() * 14 };
    });
    if (scene.bSpecialKind) {
      const n = counts.bArtillery ?? 4;
      this.addGroup('bSpecial', scene.bSpecialKind, 'b', n, (i) => ({ x: fb.from[0] + (i - (n - 1) / 2) * 12, z: fb.from[1] - 16 + (i % 2) * 4 }));
    }
    this.addGroup('bannersA', 'banner', 'a', 13, (i) => ({ x: fa.from[0] - 62 + i * 10, z: fa.from[1] - 2 + r() * 22 }));

    for (const feature of scene.features) {
      const [ax, az] = feature.at ?? feature.points?.[0] ?? [0, 0];
      const s = (feature.size ?? 40) / 40;
      if (feature.type === 'camp') {
        this.addGroup('tents', 'tent', feature.faction ?? 'a', 11, (i) => ({ x: ax - 42 * s + (i % 6) * 17 * s, z: az - 6 + Math.floor(i / 6) * 12 }));
      } else if (feature.type === 'fort') {
        const side = feature.faction ?? 'b';
        this.addGroup('palisade', 'palisade', side, 18, (i) => ({ x: ax - 39 * s + i * 4.4 * s, z: az + 2 + Math.sin(i * 0.5) * 5 }));
        this.addGroup('watchtower', 'watchtower', side, 3, (i) => ({ x: ax - 36 * s + i * 33 * s, z: az - 9 + (i % 2) * 5 }));
        this.addGroup('torches', 'torch', side, 8, (i) => ({ x: ax - 50 * s + i * 13 * s, z: az + 5 + (i % 2) * 12 }));
        this.addGroup('bannersB', 'banner', side, 8, (i) => ({ x: ax + 52 * s + i * 9 * s, z: az - 4 + r() * 13 }));
      } else if (feature.type === 'village') {
        this.addGroup('village', 'village', 'a', 9, (i) => ({ x: ax - 24 + (i % 5) * 12, z: az + 10 + Math.floor(i / 5) * 10 }));
      } else if (feature.type === 'forest' && feature.points && feature.points.length >= 2) {
        const [[x0, z0], [x1, z1]] = [feature.points[0], feature.points[feature.points.length - 1]];
        this.addGroup('bamboo', 'bamboo', 'a', 18, (i) => ({ x: x0 + ((i % 9) / 8) * (x1 - x0), z: Math.max(z0, z1) - Math.floor(i / 9) * Math.max(12, Math.abs(z1 - z0)) }));
      }
    }
    this.applyPropConfig(this.sim.propsConfig ?? {});
  }

  private buildFog() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(128, 64, 5, 128, 64, 125);
    gradient.addColorStop(0, 'rgba(246,238,219,.58)');
    gradient.addColorStop(0.5, 'rgba(217,211,193,.34)');
    gradient.addColorStop(1, 'rgba(217,211,193,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 128);
    const map = this.texture(canvas);
    for (let index = 0; index < 8; index++) {
      const card = new Mesh(new PlaneGeometry(42 + (index % 3) * 12, 16 + (index % 2) * 8), this.material({ map, transparent: true, depthWrite: false, opacity: 0.25 + (index % 3) * 0.08, side: DoubleSide }));
      card.rotation.x = -Math.PI / 2;
      card.position.set(-96 + index * 27, 0.7 + index * 0.12, -75 + (index % 4) * 36);
      this.scene.add(card);
      this.fogCards.push(card);
    }
  }

  // Terrain labels are HTML so Vietnamese diacritics render with the page fonts.
  private buildLabels() {
    for (const label of this.sim.scene.labels) {
      const element = document.createElement('span');
      element.className = 'lesson-scene-label';
      element.textContent = label.text.normalize('NFC');
      this.container.appendChild(element);
      this.labels.push({ element, position: new Vector3(label.at[0], 0.7, label.at[1]) });
    }
    const caveat = document.createElement('span');
    caveat.className = 'lesson-scene-caveat';
    caveat.textContent = 'Trang phục và màu sắc chỉ là minh họa, chờ chuyên gia thẩm định';
    this.container.appendChild(caveat);
    return caveat;
  }

  private bindPointer() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (event) => {
      this.pointer = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointerup', () => (this.pointer = null));
    canvas.addEventListener('pointercancel', () => (this.pointer = null));
    canvas.addEventListener('pointermove', (event) => {
      if (!this.pointer) return;
      this.target.x = clamp(this.target.x - (event.clientX - this.pointer.x) * 0.12, -120, 120);
      this.target.z = clamp(this.target.z + (event.clientY - this.pointer.y) * 0.12, -93, 93);
      this.pointer = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const position = this.camera.position.sub(this.target).multiplyScalar(event.deltaY > 0 ? 1.08 : 0.92);
        const distance = position.length();
        if (distance < 75 || distance > 240) position.setLength(clamp(distance, 75, 240));
        position.add(this.target);
      },
      { passive: false }
    );
  }

  setCameraPreset(name: string) {
    const key = (PRESET_ALIASES[name] ?? (name in PRESETS ? name : 'overview')) as PresetName;
    const preset = PRESETS[key];
    const isOrtho = this.camera instanceof OrthographicCamera;
    if (preset.ortho && !isOrtho) {
      const half = 86;
      const next = new OrthographicCamera(-half * this.aspect, half * this.aspect, half, -half, 1, 900);
      next.position.copy(this.camera.position);
      this.camera = next;
    } else if (!preset.ortho && isOrtho) {
      const next = new PerspectiveCamera(preset.fov, this.aspect, 1, 900);
      next.position.copy(this.camera.position);
      this.camera = next;
    }
    if (this.camera instanceof PerspectiveCamera) this.camera.fov = preset.fov;
    this.camera.updateProjectionMatrix();
    this.orbit.on = false;
    this.activePreset = key;
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.transition = { started: instant ? -Infinity : performance.now(), from: this.camera.position.clone(), to: new Vector3(...preset.pos), fromTarget: this.target.clone(), toTarget: new Vector3(...preset.target) };
  }

  toggleCinematicOrbit() {
    this.orbit.on = !this.orbit.on;
    return this.orbit.on;
  }

  updateTimeline(progress: number) {
    this.currentTime = clamp(Number(progress) || 0, 0, 1);
    const time = this.currentTime;
    const keyframe = (this.sim.keyframes ?? []).filter((frame) => time >= frame.time).pop();
    if (keyframe && keyframe.preset !== this.activePreset && time > 0) this.setCameraPreset(keyframe.preset);
    const now = performance.now();
    const dummy = new Object3D();
    const travel = clamp((time - 0.2) / 0.72, 0, 1);
    for (const group of Object.values(this.groups)) {
      for (const batch of group.batches) {
        for (let index = 0; index < batch.mesh.count; index++) {
          const record = batch.records[index];
          const moving = record.endX !== undefined;
          const x = moving ? record.startX! + (record.endX! - record.startX!) * travel : record.x;
          const z = moving ? record.startZ! + (record.endZ! - record.startZ!) * travel : record.z;
          const bob = group.troops ? Math.sin(time * 16 + record.phase) * 0.22 : Math.sin(now * 0.0014 + record.phase) * 0.07;
          dummy.position.set(x, 0.38 + bob, z);
          dummy.rotation.set(-Math.PI / 2, 0, record.rotation + Math.sin(now * 0.001 + record.phase) * 0.035);
          dummy.scale.setScalar(record.scale);
          dummy.updateMatrix();
          batch.mesh.setMatrixAt(index, dummy.matrix);
          dummy.position.set(x, 0.07, z);
          dummy.rotation.set(-Math.PI / 2, 0, record.rotation);
          dummy.scale.set(record.scale * 1.1, record.scale * 0.56, 1);
          dummy.updateMatrix();
          batch.shadows.setMatrixAt(index, dummy.matrix);
        }
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.shadows.instanceMatrix.needsUpdate = true;
      }
    }
    this.options.onProgressUpdate?.(this.currentTime);
  }

  applyPropConfig(config: Record<string, boolean | undefined>) {
    for (const [prop, names] of Object.entries(PROP_GROUPS)) {
      for (const name of names) for (const batch of this.groups[name]?.batches ?? []) batch.mesh.visible = batch.shadows.visible = config[prop] !== false;
    }
  }
  /** v1 name, kept for callers that toggle a single prop. */
  updatePropsVisibility(config: Record<string, boolean | undefined>) {
    this.applyPropConfig(config);
  }

  updateFactionColors(colors: { a?: string; b?: string; taySon?: string; qing?: string }) {
    const next = { a: colors.a ?? colors.taySon, b: colors.b ?? colors.qing };
    for (const side of ['a', 'b'] as const) {
      if (!next[side] || next[side] === this.colors[side]) continue;
      this.colors[side] = next[side]!;
      for (const group of Object.values(this.groups)) {
        if (group.side !== side || !TEAM_KINDS.has(group.kind)) continue;
        group.batches.forEach((batch, variant) => {
          batch.material.map?.dispose();
          batch.material.map = this.texture(this.spriteCanvas(group.kind, variant, side));
          batch.material.needsUpdate = true;
        });
      }
    }
  }

  private setVisible(name: string, visible: number) {
    const group = this.groups[name];
    if (!group) return;
    group.visibleCount = clamp(Math.round(visible), 0, group.baseCount);
    group.batches.forEach((batch, variant) => {
      batch.mesh.count = batch.shadows.count = Math.min(batch.records.length, Math.max(0, Math.ceil((group.visibleCount - variant) / group.batches.length)));
    });
  }

  /** Infantry counts are shown as 3 markers per declared unit. Accepts v1 and v2 keys. */
  updateUnitCounts(counts: Record<string, number | undefined>) {
    const next = normalizeCounts(counts);
    if (next.aInfantry != null) this.infantry.a = next.aInfantry * 3;
    if (next.bInfantry != null) this.infantry.b = next.bInfantry * 3;
    this.setQuality(this.options.quality);
    if (next.aSpecial != null) this.setVisible('aSpecial', next.aSpecial);
    if (next.bArtillery != null) this.setVisible('bSpecial', next.bArtillery);
    this.updateTimeline(this.currentTime);
  }

  setQuality(quality: Quality) {
    this.options.quality = quality;
    const low = quality === 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
    this.scene.fog = low ? null : this.fogSettings;
    for (const card of this.fogCards) card.visible = !low;
    this.setVisible('sideA', Math.min(this.infantry.a, low ? 90 : Infinity));
    this.setVisible('sideB', Math.min(this.infantry.b, low ? 75 : Infinity));
    this.renderer.setSize(this.container.clientWidth || 640, this.container.clientHeight || 360);
  }

  play() {
    if (this.currentTime >= 1) this.updateTimeline(0);
    this.isPlaying = true;
  }
  pause() {
    this.isPlaying = false;
  }
  seek(progress: number) {
    this.updateTimeline(progress);
  }
  setSpeed(speed: number) {
    this.playbackSpeed = Number(speed) || 1;
  }

  private updateLabels() {
    const { clientWidth: width, clientHeight: height } = this.container;
    for (const label of this.labels) {
      const point = label.position.clone().project(this.camera);
      const style = label.element.style;
      const visible = point.z < 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1;
      style.display = visible ? 'block' : 'none';
      if (!visible) continue;
      // Keep the whole label inside the frame instead of cutting it at the edge.
      const halfW = label.element.offsetWidth / 2 + 4;
      const halfH = label.element.offsetHeight / 2 + 4;
      const x = (point.x * 0.5 + 0.5) * width;
      const y = (-point.y * 0.5 + 0.5) * height;
      style.left = `${Math.min(Math.max(x, halfW), width - halfW)}px`;
      style.top = `${Math.min(Math.max(y, halfH), height - halfH)}px`;
    }
  }

  private animate = () => {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.isPlaying) {
      this.updateTimeline(this.currentTime + (delta / this.durationSeconds) * this.playbackSpeed);
      if (this.currentTime >= 1) this.pause();
    }
    if (this.transition) {
      const raw = Math.min(1, (now - this.transition.started) / 1450);
      const eased = raw * raw * (3 - 2 * raw);
      this.camera.position.lerpVectors(this.transition.from, this.transition.to, eased);
      this.target.lerpVectors(this.transition.fromTarget, this.transition.toTarget, eased);
      if (raw >= 1) this.transition = null;
    }
    if (this.orbit.on) {
      this.orbit.angle += delta * 0.045;
      this.camera.position.x = Math.sin(this.orbit.angle) * 26;
      this.camera.position.z = 70 + Math.cos(this.orbit.angle) * 26;
    }
    for (const card of this.fogCards) {
      card.position.x += delta * 0.45;
      if (card.position.x > 124) card.position.x = -124;
    }
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  };

  private onResize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height || this.destroyed) return;
    this.aspect = width / height;
    if (this.camera instanceof OrthographicCamera) {
      this.camera.left = -this.camera.top * this.aspect;
      this.camera.right = this.camera.top * this.aspect;
    } else this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    for (const label of this.labels) label.element.remove();
    this.caveat.remove();
    this.scene.traverse((object) => (object as Mesh).geometry?.dispose());
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
