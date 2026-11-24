// The 3D wooden tabletop wargame diorama. Everything lesson-specific comes from `simulation.scene`
// (terrain preset, features, labels, formations, routes) so a new lesson needs data, not code.
// Loaded as its own chunk (three.js) through SceneView.
import {
  ACESFilmicToneMapping, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, ConeGeometry,
  CylinderGeometry, DirectionalLight, DodecahedronGeometry, DoubleSide, ExtrudeGeometry, Fog, FogExp2, Group, HemisphereLight,
  InstancedMesh, Line, LineBasicMaterial, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, OrthographicCamera, PCFSoftShadowMap,
  PerspectiveCamera, PlaneGeometry, PointLight, RepeatWrapping, RingGeometry, SRGBColorSpace, Scene as ThreeScene, Shape, SphereGeometry,
  SpotLight, Sprite, SpriteMaterial, Texture, TorusGeometry, Vector3, WebGLRenderer
} from 'three';
import type { Lesson, Point } from '../lib/lesson-schema';
import { computeLessonDuration } from '../lib/timeline';
import { normalizeCounts } from './counts';
import { TABLE, paintBuildingTexture, paintMap, paintRoutes, paintTerrainBump, palette, routeReveal, type Palette, type SpriteKind } from './artwork';

export type Quality = 'high' | 'low';
export type PresetName = 'overview' | 'first_person' | 'follow_troops' | 'close_up' | 'top_down';
export const CAVEAT_TEXT = 'Trang phục và màu sắc chỉ là minh họa, chờ chuyên gia thẩm định';
type SceneLesson = Required<Pick<Lesson, 'simulation' | 'factions'>> & Partial<Pick<Lesson, 'sections'>>;
type Options = { quality?: Quality; lesson: SceneLesson; onProgressUpdate?: (progress: number) => void };

type DioramaPiece = {
  mesh: Group;
  baseX: number;
  baseZ: number;
  offsetX: number;
  offsetZ: number;
  curve?: CatmullRomCurve3;
  from: number;
  to: number;
  troop: boolean;
  phase: number;
};

type PieceGroup = {
  key: string;
  kind: SpriteKind;
  side: 'a' | 'b';
  troops: boolean;
  pieces: DioramaPiece[];
};

// 40-45 degree isometric tabletop angle by default so mountain height, tanks, bridge and war-room props read clearly.
const PRESETS: Record<PresetName, { pos: [number, number, number]; target: [number, number, number]; fov: number; ortho?: boolean }> = {
  overview: { pos: [0, 78, 95], target: [0, 0, 0], fov: 44 },
  first_person: { pos: [-38, 2.2, 58], target: [26, 2.8, 2], fov: 58 },
  follow_troops: { pos: [-38, 72, 82], target: [0, 0, 4], fov: 32 },
  close_up: { pos: [18, 46, 54], target: [26, 2, 2], fov: 30 },
  top_down: { pos: [0, 210, 0], target: [0, 0, 0], fov: 30, ortho: true }
};
const PRESET_ALIASES: Record<string, PresetName> = {
  'Toàn cảnh': 'overview',
  overview_map: 'overview',
  'Toàn cảnh sa bàn': 'overview',
  'Góc nhìn thứ nhất': 'first_person',
  'Góc nhìn chiến sĩ': 'first_person',
  'Theo quân': 'follow_troops',
  'Cận cảnh': 'close_up',
  'Từ trên': 'top_down'
};

const PROP_GROUPS: Record<string, string[]> = {
  elephants: ['aSpecial', 'bSpecial'],
  banners: ['bannersA', 'bannersB'],
  tents: ['tents'],
  palisade: ['palisade', 'watchtower'],
  fire: ['torches'],
  village: ['village'],
  bamboo: ['bamboo']
};

const DEFAULT_FORMATIONS = { a: { from: [-2, 52] as Point, to: [0, -2] as Point }, b: { from: [0, -19] as Point, to: [0, -48] as Point } };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);

export class SilkMapScene {
  private container: HTMLElement;
  private options: Required<Pick<Options, 'quality'>> & Options;
  private theme: Palette;
  private scene = new ThreeScene();
  private renderer: WebGLRenderer;
  private camera: PerspectiveCamera | OrthographicCamera;
  private target = new Vector3(0, 0, 2);
  private aspect: number;
  private fogSettings: Fog;
  private battleFog: FogExp2;
  private warRoomBackdrop!: Texture;
  private warRoomGroup = new Group();
  private tacticalGuideGroup = new Group();
  private skyDome!: Mesh;
  private sunLight!: DirectionalLight;
  private groups: Record<string, PieceGroup> = {};
  private geometries: BufferGeometry[] = [];
  private textures: Texture[] = [];
  private materials: Material[] = [];
  private factionMaterials: Record<'a' | 'b', MeshStandardMaterial[]> = { a: [], b: [] };
  private fogCards: Mesh[] = [];
  private smokeParticles: { sprite: Sprite; baseX: number; baseZ: number; speed: number; phase: number; maxH: number; rotSpeed: number; baseScale: number }[] = [];
  private emberSparks: { sprite: Sprite; baseX: number; baseZ: number; speed: number; phase: number; maxH: number }[] = [];
  private wavingFlags: { geo: BufferGeometry; baseZ: Float32Array }[] = [];
  private riverFlowTextures: Texture[] = [];
  private spearheadRings: { mesh: Mesh; curve: CatmullRomCurve3; from: number; to: number; phase: number }[] = [];
  private fireLight?: PointLight;
  private primaryCurve?: CatmullRomCurve3;
  private primaryFrom = 0;
  private primaryTo = 1;
  private targetCenter = new Vector3(0, 2, 0);
  private fpLookOffset = { yaw: 0, pitch: 0 };
  private labels: { element: HTMLElement; position: Vector3; minTime?: number; maxTime?: number }[] = [];
  private popover: HTMLElement | null = null;
  private popoverTrigger: HTMLElement | null = null;
  private colors: { a: string; b: string };
  private random = Math.random;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private last = performance.now();
  private transition: { started: number; from: Vector3; to: Vector3; fromTarget: Vector3; toTarget: Vector3; fromFov: number; toFov: number } | null = null;
  private orbit = { on: false, angle: 0 };
  private destroyed = false;
  private labelsDirty = true;
  private pointer: { x: number; y: number } | null = null;
  private routeLayer?: { context: CanvasRenderingContext2D; texture: Texture; drawn: string };
  currentTime = 0;
  isPlaying = false;
  playbackSpeed = 1;
  durationSeconds = 36;
  activePreset: PresetName = 'overview';

  constructor(container: HTMLElement, options: Options) {
    this.container = container;
    this.options = { quality: 'high', ...options };
    this.durationSeconds = computeLessonDuration(options.lesson.sections);
    this.theme = palette();
    this.colors = { a: '#9E2A22', b: '#2C3E50' };
    // Warm walnut gallery room background (#3A2D22) with subtle wood-grain texture
    this.warRoomBackdrop = this.createWalnutBackdrop();
    this.scene.background = this.warRoomBackdrop;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 360;
    this.aspect = width / height;
    this.renderer = new WebGLRenderer({ antialias: this.options.quality === 'high', powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = this.options.quality === 'high';
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera(PRESETS.overview.fov, this.aspect, 0.5, 900);
    this.camera.position.set(...PRESETS.overview.pos);
    this.target.set(...PRESETS.overview.target);
    this.camera.lookAt(this.target);

    this.fogSettings = new Fog(0x2c2017, 380, 760);
    this.battleFog = new FogExp2(0x9e9482, 0.0025);
    this.scene.fog = this.fogSettings;
    this.scene.add(this.tacticalGuideGroup);

    this.buildLights();
    this.buildSkyDome();
    this.buildMap();
    this.buildRiverFlow();
    this.buildRouteLayer();
    this.buildRouteRibbons3D();
    this.buildDioramaProps();
    this.buildGroundMicroDetails();
    this.buildUnits();
    this.buildFog();
    this.buildBattleEffects();
    this.buildLabels();
    this.bindPointer();
    this.setQuality(this.options.quality);
    this.updateTimeline(0);

    // Warm-up: compile shaders and upload textures immediately on mount so first Play has zero stall.
    try {
      this.renderer.compile(this.scene, this.camera);
      this.renderer.render(this.scene, this.camera);
    } catch {
      /* best effort */
    }
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
    this.frame = requestAnimationFrame(this.animate);
  }

  private get sim() {
    return this.options.lesson.simulation;
  }

  private geo<T extends BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private texture(canvas: HTMLCanvasElement) {
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }

  private stdMat(params: ConstructorParameters<typeof MeshStandardMaterial>[0], trackSide?: 'a' | 'b') {
    const mat = new MeshStandardMaterial(params);
    this.materials.push(mat);
    if (trackSide) this.factionMaterials[trackSide].push(mat);
    return mat;
  }

  private basicMat(params: ConstructorParameters<typeof MeshBasicMaterial>[0]) {
    const mat = new MeshBasicMaterial(params);
    this.materials.push(mat);
    return mat;
  }

  private createWalnutBackdrop() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
    grad.addColorStop(0, '#4A392B');
    grad.addColorStop(1, '#2D2219');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(28, 20, 14, 0.22)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + Math.sin(y * 0.05) * 8, 340, y - Math.cos(y * 0.04) * 8, 512, y);
      ctx.stroke();
    }
    return this.texture(c);
  }

  private buildLights() {
    // Museum-grade 3-point studio lighting: bright soft sky + warm ground bounce + 45° warm key light + cool rim.
    const hemi = new HemisphereLight(0xe8f1f5, 0x8c7a5b, 1.1);
    this.scene.add(hemi);

    this.sunLight = new DirectionalLight(0xfff4e0, 2.2);
    this.sunLight.position.set(95, 115, 85);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.left = -135;
    this.sunLight.shadow.camera.right = 135;
    this.sunLight.shadow.camera.top = 105;
    this.sunLight.shadow.camera.bottom = -105;
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 360;
    this.sunLight.shadow.bias = -0.003;
    this.sunLight.shadow.normalBias = 0.08;
    this.scene.add(this.sunLight);

    const rim = new DirectionalLight(0xd4e4f2, 0.5);
    rim.position.set(-95, 65, -80);
    this.scene.add(rim);

    // Warm overhead war-room spotlight focused on the diorama center for natural vignette falloff
    const warSpot = new SpotLight(0xffe6b8, 2.4, 380, Math.PI / 3.0, 0.58, 1.1);
    warSpot.position.set(70, 165, 60);
    warSpot.target.position.set(0, 0, 0);
    this.scene.add(warSpot, warSpot.target);
  }

  /** Battlefield sky dome (smoky overcast winter/dusk gradient) shown in First-Person eye-level view. */
  private buildSkyDome() {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#44464A');
    grad.addColorStop(0.28, '#6B6A66');
    grad.addColorStop(0.47, '#9E9482'); // horizon matches battleFog 0x9e9482
    grad.addColorStop(0.55, '#8E8371');
    grad.addColorStop(1.0, '#4A4035');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Soft smoky battle clouds & subtle amber horizon glow
    const glow = ctx.createRadialGradient(540, 245, 18, 540, 245, 220);
    glow.addColorStop(0, 'rgba(225, 145, 78, 0.34)');
    glow.addColorStop(0.5, 'rgba(180, 120, 82, 0.14)');
    glow.addColorStop(1, 'rgba(158, 148, 130, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 80, 1024, 240);

    for (let i = 0; i < 42; i++) {
      const cx = (i * 97) % 1024;
      const cy = 65 + ((i * 53) % 150);
      const rx = 55 + (i % 5) * 28;
      const ry = 14 + (i % 3) * 10;
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
      cg.addColorStop(0, i % 2 === 0 ? 'rgba(210, 204, 192, 0.16)' : 'rgba(65, 62, 58, 0.18)');
      cg.addColorStop(1, 'rgba(158, 148, 130, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const skyTex = this.texture(c);
    const skyMat = this.basicMat({ map: skyTex, side: BackSide, fog: false, depthWrite: false });
    this.skyDome = new Mesh(this.geo(new SphereGeometry(410, 32, 20)), skyMat);
    this.skyDome.visible = false;
    this.scene.add(this.skyDome);
  }

  private createOakTableTexture(): Texture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
    grad.addColorStop(0, '#3C2C1F');
    grad.addColorStop(1, '#20160F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(18, 12, 8, 0.28)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(170, y + Math.sin(y * 0.04) * 6, 340, y - Math.cos(y * 0.05) * 6, 512, y);
      ctx.stroke();
    }
    const tex = this.texture(c);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  private buildMap() {
    // War-room dark oak table base, expansive surrounding tabletop, raised wooden rails & staff props.
    const oakMat = this.stdMat({ color: 0x2c221a, roughness: 0.72, metalness: 0.06 });
    const brassMat = this.stdMat({ color: 0xc59b47, roughness: 0.32, metalness: 0.55 });
    const parchmentMat = this.stdMat({ color: 0xeadbc0, roughness: 0.85, metalness: 0.02 });
    const ribbonMat = this.stdMat({ color: 0x9e2a22, roughness: 0.65 });

    // Giant 600x600 walnut war-room tabletop covering 100% of the viewport corners at y = -0.5
    const outerTableGeo = this.geo(new PlaneGeometry(600, 600));
    outerTableGeo.rotateX(-Math.PI / 2);
    const outerTable = new Mesh(
      outerTableGeo,
      this.stdMat({ map: this.createOakTableTexture(), roughness: 0.72, metalness: 0.05 })
    );
    outerTable.position.y = -0.5;
    outerTable.receiveShadow = true;
    this.warRoomGroup.add(outerTable);

    const tableBase = new Mesh(this.geo(new BoxGeometry(TABLE.width + 16, 2.2, TABLE.depth + 16)), oakMat);
    tableBase.position.y = -1.65;
    tableBase.receiveShadow = true;
    this.warRoomGroup.add(tableBase);

    // 4 raised oak table rails framing the map
    const railH = 2.6;
    const railW = 6.5;
    const horizRailGeo = this.geo(new BoxGeometry(TABLE.width + railW * 2, railH, railW));
    const vertRailGeo = this.geo(new BoxGeometry(railW, railH, TABLE.depth));
    for (const zSign of [-1, 1]) {
      const r = new Mesh(horizRailGeo, oakMat);
      r.position.set(0, -0.1, zSign * (TABLE.depth / 2 + railW / 2));
      r.castShadow = true;
      r.receiveShadow = true;
      this.warRoomGroup.add(r);
    }
    for (const xSign of [-1, 1]) {
      const r = new Mesh(vertRailGeo, oakMat);
      r.position.set(xSign * (TABLE.width / 2 + railW / 2), -0.1, 0);
      r.castShadow = true;
      r.receiveShadow = true;
      this.warRoomGroup.add(r);
    }

    // 4 Đông Sơn brass corner brackets
    const cornerGeo = this.geo(new BoxGeometry(9.5, 2.9, 9.5));
    for (const xSign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const c = new Mesh(cornerGeo, brassMat);
        c.position.set(xSign * (TABLE.width / 2 + 2.8), -0.02, zSign * (TABLE.depth / 2 + 2.8));
        c.castShadow = true;
        this.warRoomGroup.add(c);
      }
    }

    // 3D Brass Staff Compass on the front tabletop
    const compassGroup = new Group();
    const cCase = new Mesh(this.geo(new CylinderGeometry(4.4, 4.8, 1.1, 24)), brassMat);
    const cFace = new Mesh(this.geo(new CylinderGeometry(3.6, 3.6, 1.18, 24)), this.stdMat({ color: 0xf6eedb, roughness: 0.6 }));
    const cNeedle = new Mesh(this.geo(new BoxGeometry(0.45, 1.25, 5.4)), ribbonMat);
    cCase.castShadow = true;
    compassGroup.add(cCase, cFace, cNeedle);
    compassGroup.position.set(58, 0.05, TABLE.depth / 2 + 12);
    this.warRoomGroup.add(compassGroup);

    // 3D Wooden Scale Ruler on the front tabletop
    const ruler = new Mesh(this.geo(new BoxGeometry(42, 0.6, 3.4)), this.stdMat({ color: 0xd4b37b, roughness: 0.5 }));
    ruler.position.set(2, -0.2, TABLE.depth / 2 + 12);
    ruler.castShadow = true;
    this.warRoomGroup.add(ruler);

    // Rolled Giấy Dó parchment maps on the front & side tabletop
    const scrollPositions: [number, number, number][] = [
      [-58, TABLE.depth / 2 + 12, 0.08],
      [-48, TABLE.depth / 2 + 17, -0.14],
      [138, -58, 0.25]
    ];
    for (const [sx, sz, rot] of scrollPositions) {
      const scroll = new Group();
      const body = new Mesh(this.geo(new CylinderGeometry(2.1, 2.1, 26, 16)), parchmentMat);
      body.rotation.z = Math.PI / 2;
      body.castShadow = true;
      const tie = new Mesh(this.geo(new CylinderGeometry(2.25, 2.25, 2.2, 16)), ribbonMat);
      tie.rotation.z = Math.PI / 2;
      scroll.add(body, tie);
      scroll.position.set(sx, 1.6, sz);
      scroll.rotation.y = rot;
      this.warRoomGroup.add(scroll);
    }

    // Brass staff desk lamp at upper-left corner casting warm golden PointLight onto the sand table
    const lampGroup = new Group();
    const lampBase = new Mesh(this.geo(new CylinderGeometry(5.5, 6.5, 1.8, 20)), brassMat);
    const lampStem = new Mesh(this.geo(new CylinderGeometry(0.75, 0.95, 22, 12)), brassMat);
    lampStem.position.y = 11;
    const lampArm = new Mesh(this.geo(new CylinderGeometry(0.6, 0.6, 9, 10)), brassMat);
    lampArm.rotation.z = Math.PI / 3;
    lampArm.position.set(3.8, 21.5, 0);
    const lampShade = new Mesh(this.geo(new ConeGeometry(7.0, 5.5, 18, 1, true)), this.stdMat({ color: 0x1e4d35, roughness: 0.35, metalness: 0.2, side: DoubleSide }));
    lampShade.position.set(7.5, 20.0, 0);
    const lampLight = new PointLight(0xffcf75, 2.2, 175, 1.3);
    lampLight.position.set(7.5, 17.0, 0);
    lampGroup.add(lampBase, lampStem, lampArm, lampShade, lampLight);
    lampGroup.position.set(-134, 0.4, -64);
    lampGroup.rotation.y = -0.6;
    this.warRoomGroup.add(lampGroup);

    // Field binoculars on lower-right outer tabletop
    const binoGroup = new Group();
    const darkMetal = this.stdMat({ color: 0x22201e, roughness: 0.45, metalness: 0.55 });
    for (const oz of [-2.1, 2.1]) {
      const barrel = new Mesh(this.geo(new CylinderGeometry(1.4, 1.8, 8.5, 14)), darkMetal);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.z = oz;
      barrel.castShadow = true;
      const lensRing = new Mesh(this.geo(new TorusGeometry(1.75, 0.25, 8, 16)), brassMat);
      lensRing.rotation.y = Math.PI / 2;
      lensRing.position.set(-4.2, 0, oz);
      binoGroup.add(barrel, lensRing);
    }
    const bridge = new Mesh(this.geo(new BoxGeometry(2.2, 0.8, 4.2)), brassMat);
    binoGroup.add(bridge);
    binoGroup.position.set(142, -0.4, 62);
    binoGroup.rotation.y = -0.65;
    this.warRoomGroup.add(binoGroup);

    this.scene.add(this.warRoomGroup);

    const map = this.texture(paintMap(document.createElement('canvas'), this.sim.scene, this.theme));
    map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    const bumpTex = new CanvasTexture(paintTerrainBump(this.sim.scene));
    this.textures.push(bumpTex);
    // High-resolution displaced terrain mesh (128x128) for natural clay-like relief without hemisphere blobs.
    const mapGeo = this.geo(new PlaneGeometry(TABLE.width, TABLE.depth, 128, 128));
    mapGeo.rotateX(-Math.PI / 2);
    const pos = mapGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, -0.25 + this.terrainHeight(vx, vz));
    }
    mapGeo.computeVertexNormals();
    const mesh = new Mesh(
      mapGeo,
      this.stdMat({ map, bumpMap: bumpTex, bumpScale: 0.95, roughness: 0.88, metalness: 0.05 })
    );
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  /** Smooth procedural elevation for North & Southwest mountain ranges (2.5x height); keeps river, city and plain low. */
  private terrainHeight(x: number, z: number): number {
    const radial = Math.hypot(x / 72, z / 50);
    const edgeMask = clamp((radial - 0.78) / 0.48, 0, 1);
    // Boost Northern (z < -36) and Southwestern (x < -36, z > 20) mountain ranges
    const northBoost = clamp((-z - 34) / 42, 0, 1);
    const swBoost = clamp((-x - 30) / 50, 0, 1) * clamp((z - 18) / 48, 0, 1);
    const ridgeMask = Math.max(edgeMask, northBoost * 1.15, swBoost * 1.15);
    const riverFlat = x > 80 && !this.sim.scene.features.some((f) => f.type === 'river') ? clamp((90 - x) / 10, 0, 1) : 1;
    const fbm =
      Math.sin(x * 0.042 + 0.5) * Math.cos(z * 0.048) * 0.72 +
      Math.sin(x * 0.088 + 1.4) * Math.sin(z * 0.082 + 0.7) * 0.42 +
      Math.cos((x - z) * 0.036) * 0.36;
    let h = Math.max(0, fbm + 0.65) * 14.5 * ridgeMask * riverFlat;
    for (const f of this.sim.scene.features) {
      if (f.type === 'hill' && f.at) {
        const d = Math.hypot(x - f.at[0], z - f.at[1]);
        const r = f.size ?? 18;
        if (d < r * 1.5) h += Math.pow(1 - d / (r * 1.5), 2) * 14.0;
      }
    }
    return h;
  }

  /** Continuous flowing water shimmer ribbon along river channels (zero static dashed road lines). */
  private buildRiverFlow() {
    const riverCanvas = document.createElement('canvas');
    riverCanvas.width = 128;
    riverCanvas.height = 128;
    const rc = riverCanvas.getContext('2d')!;
    const grad = rc.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(139,179,194,0)');
    grad.addColorStop(0.5, 'rgba(184,212,222,0.45)');
    grad.addColorStop(1, 'rgba(139,179,194,0)');
    rc.fillStyle = grad;
    rc.fillRect(0, 0, 128, 128);
    rc.strokeStyle = 'rgba(235, 246, 248, 0.55)';
    rc.lineWidth = 2;
    for (let y = 16; y < 128; y += 32) {
      rc.beginPath();
      rc.moveTo(28, y);
      rc.quadraticCurveTo(64, y + 8, 100, y);
      rc.stroke();
    }
    const flowTex = this.texture(riverCanvas);
    flowTex.wrapS = RepeatWrapping;
    flowTex.wrapT = RepeatWrapping;
    flowTex.repeat.set(1, 7);
    this.riverFlowTextures.push(flowTex);

    const flowMat = this.stdMat({
      color: 0x3b6678,
      map: flowTex,
      bumpMap: flowTex,
      bumpScale: 0.38,
      roughness: 0.15,
      metalness: 0.3,
      transparent: true,
      depthWrite: false,
      opacity: 0.86,
      side: DoubleSide
    });
    const riverFeatures = this.sim.scene.features.filter((f) => f.type === 'river' && f.points && f.points.length >= 2);
    const hasCamp = this.sim.scene.features.some((f) => f.type === 'camp');
    const paths: Point[][] = riverFeatures.length
      ? riverFeatures.map((f) => f.points!)
      : this.sim.scene.terrain === 'plain' && hasCamp
        ? [[[104, -93], [94, -55], [105, -18], [93, 20], [104, 58], [96, 93]]]
        : [];

    for (const pts of paths) {
      const curve = new CatmullRomCurve3(pts.map(([x, z]) => new Vector3(x, -0.18, z)));
      const segs = 64;
      const cPts = curve.getSpacedPoints(segs);
      const positions = new Float32Array((segs + 1) * 2 * 3);
      const uvs = new Float32Array((segs + 1) * 2 * 2);
      const indices: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const p = cPts[i];
        const t = i / segs;
        const tan = curve.getTangentAt(t);
        const len = Math.hypot(-tan.z, tan.x) || 1;
        const ox = (-tan.z / len) * 3.8;
        const oz = (tan.x / len) * 3.8;
        positions[i * 6] = p.x - ox; positions[i * 6 + 1] = -0.18; positions[i * 6 + 2] = p.z - oz;
        positions[i * 6 + 3] = p.x + ox; positions[i * 6 + 4] = -0.18; positions[i * 6 + 5] = p.z + oz;
        uvs[i * 4] = 0; uvs[i * 4 + 1] = t;
        uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = t;
        if (i < segs) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const g = this.geo(new BufferGeometry());
      g.setAttribute('position', new BufferAttribute(positions, 3));
      g.setAttribute('uv', new BufferAttribute(uvs, 2));
      g.setIndex(indices);
      g.computeVertexNormals();
      this.scene.add(new Mesh(g, flowMat));
    }
  }

  // Dashed planned-route preview layer on the map surface.
  private buildRouteLayer() {
    if (!this.sim.scene.routes.length) return;
    const canvas = document.createElement('canvas');
    canvas.width = TABLE.canvasWidth / 2;
    canvas.height = TABLE.canvasHeight / 2;
    const context = canvas.getContext('2d')!;
    const texture = this.texture(canvas);
    const mesh = new Mesh(
      this.geo(new PlaneGeometry(TABLE.width, TABLE.depth)),
      this.basicMat({ map: texture, transparent: true, depthWrite: false, opacity: 0.65 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.14;
    this.scene.add(mesh);
    this.routeLayer = { context, texture, drawn: '' };
  }

  private paintRouteLayer(time: number) {
    const layer = this.routeLayer;
    if (!layer) return;
    const routes = this.sim.scene.routes;
    const key = `${this.colors.a}${this.colors.b}${routes.map((r) => Math.round(routeReveal(r, time) * 40)).join()}`;
    if (key === layer.drawn) return;
    layer.drawn = key;
    const { context } = layer;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.setTransform(0.5, 0, 0, 0.5, 0, 0);
    paintRoutes(context, routes, this.colors, time);
    layer.texture.needsUpdate = true;
  }

  /** Subtle glowing tactical waypoint lines (shown in overview, automatically hidden in First-Person). */
  private buildRouteRibbons3D() {
    const lineMatA = new LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55 });
    const lineMatB = new LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.45 });
    this.materials.push(lineMatA, lineMatB);

    for (const route of this.sim.scene.routes) {
      const curvePts = route.points.map(([x, z]) => new Vector3(x, 0.25 + this.terrainHeight(x, z) * 0.45, z));
      const curve = new CatmullRomCurve3(curvePts);
      const sampled = curve.getSpacedPoints(72).map((p) => new Vector3(p.x, 0.22 + this.terrainHeight(p.x, p.z) * 0.45, p.z));
      const geo = this.geo(new BufferGeometry().setFromPoints(sampled));
      const line = new Line(geo, route.faction === 'a' ? lineMatA : lineMatB);
      this.tacticalGuideGroup.add(line);
    }
  }

  /** Miniature 3D wooden/terracotta buildings for cities/strongholds + 3D pine trees & hills. */
  private buildDioramaProps() {
    const texWarm = this.texture(paintBuildingTexture(true));
    const texCool = this.texture(paintBuildingTexture(false));
    const wallMatLight = this.stdMat({ map: texWarm, roughness: 0.78 });
    const wallMatWarm = this.stdMat({ map: texCool, roughness: 0.8 });
    const roofTerracotta = this.stdMat({ color: 0xa45a3f, roughness: 0.72 });
    const roofSlate = this.stdMat({ color: 0x5c5349, roughness: 0.75 });
    const rubbleMat = this.stdMat({ color: 0x453f3a, roughness: 0.92 });
    const trunkMat = this.stdMat({ color: 0x4f3629, roughness: 0.85 });
    const pineMat1 = this.stdMat({ color: 0x2d4a36, roughness: 0.82 });
    const pineMat2 = this.stdMat({ color: 0x3b5e45, roughness: 0.8 });
    const pineMat3 = this.stdMat({ color: 0x4a6b4e, roughness: 0.78 });

    const r = this.random;
    const addBuildingCluster = (cx: number, cz: number, count: number, radius: number) => {
      const boxGeo = this.geo(new BoxGeometry(1, 1, 1));
      const roofGeo = this.geo(new ConeGeometry(0.78, 0.7, 4));
      roofGeo.rotateY(Math.PI / 4);
      const stackGeo = this.geo(new CylinderGeometry(0.28, 0.38, 1, 8));
      const domeGeo = this.geo(new SphereGeometry(0.7, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2));

      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + r() * 0.5;
        const dist = (0.12 + r() * 0.88) * radius;
        const bx = cx + Math.cos(ang) * dist;
        const bz = cz + Math.sin(ang) * dist;
        const th = this.terrainHeight(bx, bz);
        const bldg = new Group();

        if (i === 0) {
          // Central Command HQ / Civic Building with watchtower & dome
          const hall = new Mesh(boxGeo, wallMatLight);
          hall.scale.set(5.4, 3.6, 4.2);
          hall.position.y = 1.55;
          hall.castShadow = hall.receiveShadow = true;
          const tower = new Mesh(boxGeo, wallMatWarm);
          tower.scale.set(2.2, 5.8, 2.2);
          tower.position.y = 2.65;
          tower.castShadow = tower.receiveShadow = true;
          const dome = new Mesh(domeGeo, roofSlate);
          dome.scale.set(1.5, 1.4, 1.5);
          dome.position.y = 5.5;
          dome.castShadow = true;
          bldg.add(hall, tower, dome);
        } else if (i % 4 === 1) {
          // Industrial Factory with sawtooth roof & brick smokestack
          const w = 4.6 + r() * 1.4;
          const d = 3.4 + r() * 1.0;
          const h = 2.8 + r() * 1.2;
          const body = new Mesh(boxGeo, wallMatWarm);
          body.scale.set(w, h, d);
          body.position.y = h / 2 - 0.25;
          body.castShadow = body.receiveShadow = true;
          bldg.add(body);
          for (let bay = -1; bay <= 1; bay++) {
            const saw = new Mesh(roofGeo, roofSlate);
            saw.scale.set(w * 0.34, 1.2, d * 0.95);
            saw.position.set(bay * (w * 0.3), h - 0.25 + 0.4, 0);
            saw.castShadow = true;
            bldg.add(saw);
          }
          const stack = new Mesh(stackGeo, roofTerracotta);
          stack.scale.set(1, 5.6, 1);
          stack.position.set(w * 0.36, 2.55, d * 0.28);
          stack.castShadow = true;
          bldg.add(stack);
        } else {
          // Textured Townhouse + pitched roof
          const w = 2.5 + r() * 2.1;
          const d = 2.2 + r() * 1.8;
          const h = 2.4 + r() * 3.4;
          const body = new Mesh(boxGeo, i % 2 ? wallMatLight : wallMatWarm);
          body.scale.set(w, h, d);
          body.position.y = h / 2 - 0.25;
          body.castShadow = body.receiveShadow = true;
          const roof = new Mesh(roofGeo, i % 3 === 0 ? roofSlate : roofTerracotta);
          roof.scale.set(w, h * 0.5, d);
          roof.position.y = h - 0.25 + (h * 0.5) / 2;
          roof.castShadow = true;
          bldg.add(body, roof);
        }

        // Rubble debris chunks scattered around damaged building bases
        for (let rb = 0; rb < 3; rb++) {
          const deb = new Mesh(boxGeo, rubbleMat);
          deb.scale.set(0.6 + r() * 0.8, 0.35 + r() * 0.45, 0.6 + r() * 0.8);
          deb.position.set((r() - 0.5) * 4.5, -0.05, (r() - 0.5) * 4.5);
          deb.rotation.set(r() * 0.4, r() * 2, r() * 0.4);
          deb.castShadow = true;
          bldg.add(deb);
        }

        bldg.position.set(bx, th, bz);
        bldg.rotation.y = (r() - 0.5) * 0.45;
        this.scene.add(bldg);
      }
    };

    // Instanced 3-tiered 3D pine/conifer trees (4 draw calls total instead of ~350)
    const trunkGeo = this.geo(new CylinderGeometry(0.22, 0.35, 1.6, 6));
    const coneBotGeo = this.geo(new ConeGeometry(1.75, 2.3, 8));
    const coneMidGeo = this.geo(new ConeGeometry(1.35, 2.1, 8));
    const coneTopGeo = this.geo(new ConeGeometry(0.9, 1.8, 8));
    const treeTransforms: { x: number; y: number; z: number; scale: number }[] = [];
    const addPineTree = (x: number, z: number, scale = 1) => {
      treeTransforms.push({ x, y: -0.25 + this.terrainHeight(x, z), z, scale });
    };

    // Rustic earthwork bunkers & timber stakes along the defensive frontline
    const bunkerGeo = this.geo(new BoxGeometry(3.4, 0.9, 1.5));
    const bunkerMat = this.stdMat({ color: 0x6b5b45, roughness: 0.9 });
    const stakeGeo = this.geo(new CylinderGeometry(0.12, 0.16, 1.8, 5));
    const addBunkersAlong = (points: Point[], every = 2) => {
      for (let i = 0; i < points.length - 1; i += every) {
        const [x1, z1] = points[i];
        const [x2, z2] = points[i + 1];
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const ang = Math.atan2(x2 - x1, z2 - z1);
        const by = this.terrainHeight(mx, mz);
        const b = new Mesh(bunkerGeo, bunkerMat);
        b.position.set(mx, 0.2 + by, mz);
        b.rotation.y = ang;
        b.castShadow = true;
        b.receiveShadow = true;
        this.scene.add(b);
        // Crossed timber stakes beside each bunker
        for (const sOff of [-1.8, 1.8]) {
          const st = new Mesh(stakeGeo, trunkMat);
          st.position.set(mx + Math.cos(ang) * sOff, 0.4 + by, mz - Math.sin(ang) * sOff);
          st.rotation.z = sOff > 0 ? 0.35 : -0.35;
          st.castShadow = true;
          this.scene.add(st);
        }
      }
    };

    for (const feature of this.sim.scene.features) {
      const [ax, az] = feature.at ?? feature.points?.[0] ?? [0, 0];
      if (feature.type === 'camp' || feature.type === 'fort') {
        addBuildingCluster(ax, az, 32, Math.min(28, (feature.size ?? 28) * 0.92));
      } else if (feature.type === 'village') {
        addBuildingCluster(ax, az, 7, 14);
      } else if (feature.type === 'road' && feature.points && feature.points.length >= 4) {
        const first = feature.points[0];
        const last = feature.points[feature.points.length - 1];
        if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 5) addBunkersAlong(feature.points, 1);
      } else if (feature.type === 'forest' && feature.points && feature.points.length >= 2) {
        const [[x0, z0], [x1, z1]] = [feature.points[0], feature.points[feature.points.length - 1]];
        for (let i = 0; i < 24; i++) {
          addPineTree(x0 + r() * (x1 - x0), Math.min(z0, z1) + r() * Math.abs(z1 - z0), 0.7 + r() * 0.65);
        }
      }
    }

    // Dense natural 3D conifer groves along the displaced outer ridges & riverbanks
    const treeGroves: Point[] = [
      [-104, -68], [-98, -60], [-92, -72], [-86, -56], [-80, -66], [-100, -48], [-74, -58], [-66, -68], [-90, -44],
      [68, -66], [76, -72], [82, -58], [88, -64], [80, -48], [64, -54], [72, -60], [86, -42], [60, -66],
      [78, 64], [86, 56], [72, 72], [66, 60], [82, 70], [60, 68], [88, 44],
      [-84, 58], [-92, 64], [-78, 50], [-96, 48], [-88, 70], [-70, 62], [-102, 58],
      [-104, -12], [-98, 12], [86, -12], [84, 24]
    ];
    for (const [tx, tz] of treeGroves) {
      addPineTree(tx + (r() - 0.5) * 4, tz + (r() - 0.5) * 4, 0.7 + r() * 0.65);
      if (r() > 0.45) addPineTree(tx + (r() - 0.5) * 7, tz + (r() - 0.5) * 7, 0.6 + r() * 0.5);
    }

    if (treeTransforms.length) {
      const n = treeTransforms.length;
      const instTrunk = new InstancedMesh(trunkGeo, trunkMat, n);
      const instC1 = new InstancedMesh(coneBotGeo, pineMat1, n);
      const instC2 = new InstancedMesh(coneMidGeo, pineMat2, n);
      const instC3 = new InstancedMesh(coneTopGeo, pineMat3, n);
      instTrunk.castShadow = instC1.castShadow = instC2.castShadow = instC3.castShadow = true;
      const dummy = new Object3D();
      treeTransforms.forEach((t, i) => {
        dummy.scale.setScalar(t.scale);
        dummy.position.set(t.x, t.y + 0.7 * t.scale, t.z);
        dummy.updateMatrix();
        instTrunk.setMatrixAt(i, dummy.matrix);
        dummy.position.y = t.y + 2.0 * t.scale;
        dummy.updateMatrix();
        instC1.setMatrixAt(i, dummy.matrix);
        dummy.position.y = t.y + 3.2 * t.scale;
        dummy.updateMatrix();
        instC2.setMatrixAt(i, dummy.matrix);
        dummy.position.y = t.y + 4.3 * t.scale;
        dummy.updateMatrix();
        instC3.setMatrixAt(i, dummy.matrix);
      });
      this.scene.add(instTrunk, instC1, instC2, instC3);
    }
  }

  /** Ground-level micro-details (grass tufts, sandbag fortifications, anti-tank hedgehogs) for eye-level immersion. */
  private buildGroundMicroDetails() {
    const r = this.random;
    const grassMatA = this.stdMat({ color: 0x6b7847, roughness: 0.92 });
    const grassMatB = this.stdMat({ color: 0x8c7e4e, roughness: 0.94 });
    const grassGeo = this.geo(new ConeGeometry(0.45, 1.35, 4));

    // Low steppe grass tufts via 2 InstancedMeshes (2 draw calls total instead of 110)
    const tuftsA: Object3D[] = [];
    const tuftsB: Object3D[] = [];
    for (let i = 0; i < 110; i++) {
      const gx = (r() - 0.5) * (TABLE.width - 36);
      const gz = (r() - 0.5) * (TABLE.depth - 28);
      if (gx > 82) continue;
      const th = this.terrainHeight(gx, gz) * 0.45;
      const o = new Object3D();
      o.position.set(gx, 0.3 + th, gz);
      o.scale.set(0.8 + r() * 0.8, 0.7 + r() * 0.8, 0.8 + r() * 0.8);
      o.rotation.set((r() - 0.5) * 0.25, r() * Math.PI, (r() - 0.5) * 0.25);
      o.updateMatrix();
      (i % 2 === 0 ? tuftsA : tuftsB).push(o);
    }
    for (const [list, mat] of [[tuftsA, grassMatA], [tuftsB, grassMatB]] as [Object3D[], MeshStandardMaterial][]) {
      if (!list.length) continue;
      const inst = new InstancedMesh(grassGeo, mat, list.length);
      list.forEach((o, i) => inst.setMatrixAt(i, o.matrix));
      this.scene.add(inst);
    }

    // Sandbag fortifications, semi-buried concrete pillboxes & anti-tank steel hedgehogs along the perimeter
    const targetFeature = this.sim.scene.features.find((f) => f.type === 'camp' || f.type === 'fort');
    const [cx, cz] = targetFeature?.at ?? [0, 0];
    const sandbagMat = this.stdMat({ color: 0xa89778, roughness: 0.92 });
    const bagGeo = this.geo(new BoxGeometry(1.5, 0.65, 0.85));
    const steelMat = this.stdMat({ color: 0x3b3835, roughness: 0.5, metalness: 0.6 });
    const concreteMat = this.stdMat({ color: 0x7a7770, roughness: 0.88, metalness: 0.05 });
    const slitMat = this.stdMat({ color: 0x181715, roughness: 0.95 });
    const beamGeo = this.geo(new BoxGeometry(0.28, 2.3, 0.28));

    for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2 + 0.2;
      const dist = 24 + (k % 2) * 5;
      const bx = cx + Math.cos(ang) * dist;
      const bz = cz + Math.sin(ang) * dist * 0.82;
      const bh = this.terrainHeight(bx, bz) * 0.45;

      // Alternate semi-buried concrete pillbox (lô cốt bê tông bán âm) & sandbag bunker wall
      if (k % 3 === 0) {
        const pillbox = new Group();
        const dome = new Mesh(this.geo(new CylinderGeometry(2.0, 2.5, 1.35, 8)), concreteMat);
        dome.position.y = 0.5;
        dome.castShadow = true;
        dome.receiveShadow = true;
        const cap = new Mesh(this.geo(new CylinderGeometry(1.75, 2.05, 0.4, 8)), concreteMat);
        cap.position.y = 1.35;
        const slit = new Mesh(this.geo(new BoxGeometry(1.8, 0.32, 0.5)), slitMat);
        slit.position.set(0, 0.72, 1.95);
        pillbox.add(dome, cap, slit);
        pillbox.position.set(bx, -0.25 + bh, bz);
        pillbox.rotation.y = -ang + Math.PI / 2;
        this.scene.add(pillbox);
      } else {
        const wall = new Group();
        for (let b = -1; b <= 1; b++) {
          const bag = new Mesh(bagGeo, sandbagMat);
          bag.position.set(b * 1.45, 0.25, Math.abs(b) * 0.25);
          bag.castShadow = true;
          bag.receiveShadow = true;
          wall.add(bag);
        }
        const topBag = new Mesh(bagGeo, sandbagMat);
        topBag.position.set(0, 0.82, 0.08);
        topBag.castShadow = true;
        wall.add(topBag);
        wall.position.set(bx, -0.15 + bh, bz);
        wall.rotation.y = -ang + Math.PI / 2;
        this.scene.add(wall);
      }

      // Steel Czech anti-tank X-barricade
      if (k % 2 === 0) {
        const hedge = new Group();
        const b1 = new Mesh(beamGeo, steelMat); b1.rotation.set(0.65, 0, 0.65);
        const b2 = new Mesh(beamGeo, steelMat); b2.rotation.set(-0.65, 0, 0.65);
        const b3 = new Mesh(beamGeo, steelMat); b3.rotation.set(0.65, 0, -0.65);
        b1.castShadow = b2.castShadow = b3.castShadow = true;
        hedge.add(b1, b2, b3);
        hedge.position.set(bx + Math.cos(ang) * 4.5, 0.7 + bh, bz + Math.sin(ang) * 4.5);
        this.scene.add(hedge);
      }
    }

    // 3D Steel Truss Bridge spanning the Volga River on the eastern plain
    const hasRiver = this.sim.scene.features.some((f) => f.type === 'river');
    const hasCamp = this.sim.scene.features.some((f) => f.type === 'camp');
    if (hasRiver || (this.sim.scene.terrain === 'plain' && hasCamp)) {
      const bridge = new Group();
      const deckMat = this.stdMat({ color: 0x5c4a38, roughness: 0.85 });
      const deck = new Mesh(this.geo(new BoxGeometry(26, 0.7, 5.4)), deckMat);
      deck.position.y = 1.65;
      deck.castShadow = true;
      deck.receiveShadow = true;
      bridge.add(deck);

      // Stone river piers
      for (const px of [-8.5, 0, 8.5]) {
        const pier = new Mesh(this.geo(new BoxGeometry(2.0, 3.0, 5.8)), concreteMat);
        pier.position.set(px, 0.1, 0);
        pier.castShadow = true;
        bridge.add(pier);
      }

      // Steel truss side girders & cross-bracing
      const topChordGeo = this.geo(new BoxGeometry(24, 0.35, 0.35));
      const postGeo = this.geo(new BoxGeometry(0.3, 2.8, 0.3));
      const braceGeo = this.geo(new BoxGeometry(0.24, 3.8, 0.24));
      for (const sz of [-2.45, 2.45]) {
        const topChord = new Mesh(topChordGeo, steelMat);
        topChord.position.set(0, 4.4, sz);
        topChord.castShadow = true;
        bridge.add(topChord);
        for (let px = -10; px <= 10; px += 4) {
          const post = new Mesh(postGeo, steelMat);
          post.position.set(px, 3.0, sz);
          bridge.add(post);
          if (px < 10) {
            const brace = new Mesh(braceGeo, steelMat);
            brace.position.set(px + 2, 3.0, sz);
            brace.rotation.z = px % 8 === 0 ? 0.68 : -0.68;
            bridge.add(brace);
          }
        }
      }
      bridge.position.set(98, -0.2, 2);
      bridge.rotation.y = -0.12;
      this.scene.add(bridge);
    }

    // Lowland village cottages (red/blue tile roofs), train station & water tower along the foothill railway
    const timberMat = this.stdMat({ color: 0x7d634a, roughness: 0.85 });
    const redRoofMat = this.stdMat({ color: 0x8e3b2e, roughness: 0.75 });
    const blueRoofMat = this.stdMat({ color: 0x465a69, roughness: 0.75 });
    const addCottage = (vx: number, vz: number, rot: number, blueRoof: boolean) => {
      const h = new Group();
      const body = new Mesh(this.geo(new BoxGeometry(3.4, 2.1, 2.6)), timberMat);
      body.position.y = 1.05;
      body.castShadow = true;
      body.receiveShadow = true;
      const roof = new Mesh(this.geo(new ConeGeometry(2.6, 1.5, 4)), blueRoof ? blueRoofMat : redRoofMat);
      roof.position.y = 2.85;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      h.add(body, roof);
      h.position.set(vx, -0.25 + this.terrainHeight(vx, vz) * 0.45, vz);
      h.rotation.y = rot;
      this.scene.add(h);
    };
    const villageCoords: [number, number, number, boolean][] = [
      [-32, 62, 0.3, false],
      [-25, 55, -0.4, true],
      [-18, 65, 0.1, false],
      [-6, 48, 0.5, true],
      [2, 43, -0.2, false],
      [35, 17, 0.4, false],
      [43, 19, -0.3, true]
    ];
    for (const [vx, vz, rot, blue] of villageCoords) addCottage(vx, vz, rot, blue);

    // Train station along the lowland railway
    const station = new Group();
    const stBody = new Mesh(this.geo(new BoxGeometry(7.2, 2.6, 3.4)), this.stdMat({ color: 0xb89678, roughness: 0.8 }));
    stBody.position.y = 1.3;
    stBody.castShadow = true;
    const stRoof = new Mesh(this.geo(new BoxGeometry(7.8, 0.6, 4.2)), redRoofMat);
    stRoof.position.y = 2.8;
    stRoof.castShadow = true;
    const canopy = new Mesh(this.geo(new BoxGeometry(7.4, 0.2, 1.8)), steelMat);
    canopy.position.set(0, 1.9, 2.4);
    station.add(stBody, stRoof, canopy);
    station.position.set(18, -0.25 + this.terrainHeight(18, 29) * 0.45, 29);
    station.rotation.y = 0.68;
    this.scene.add(station);

    // Railway water tower (4-legged trestle + cylindrical tank + conical cap)
    const tower = new Group();
    const legGeo = this.geo(new CylinderGeometry(0.18, 0.22, 3.8, 6));
    for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
      const leg = new Mesh(legGeo, timberMat);
      leg.position.set(lx, 1.9, lz);
      leg.castShadow = true;
      tower.add(leg);
    }
    const tank = new Mesh(this.geo(new CylinderGeometry(1.55, 1.55, 2.2, 14)), timberMat);
    tank.position.y = 4.6;
    tank.castShadow = true;
    const cap = new Mesh(this.geo(new ConeGeometry(1.75, 1.1, 14)), steelMat);
    cap.position.y = 6.2;
    tower.add(tank, cap);
    tower.position.set(10, -0.25 + this.terrainHeight(10, 34) * 0.45, 34);
    this.scene.add(tower);

    // Angular mountain rocks (DodecahedronGeometry) along northern & southwestern ridges via InstancedMesh
    const rockGeo = this.geo(new DodecahedronGeometry(1.4, 0));
    const rockMat = this.stdMat({ color: 0x686159, roughness: 0.92, metalness: 0.04 });
    const rockNodes: Object3D[] = [];
    for (let i = 0; i < 42; i++) {
      const rx = i < 26 ? (r() - 0.5) * 210 : -110 + r() * 72;
      const rz = i < 26 ? -48 - r() * 38 : 30 + r() * 54;
      const rh = this.terrainHeight(rx, rz);
      if (rh < 1.2) continue;
      const o = new Object3D();
      o.position.set(rx, -0.3 + rh, rz);
      o.scale.set(0.8 + r() * 1.4, 0.55 + r() * 0.8, 0.8 + r() * 1.3);
      o.rotation.set(r() * 2, r() * 3, r() * 2);
      o.updateMatrix();
      rockNodes.push(o);
    }
    if (rockNodes.length) {
      const rockInst = new InstancedMesh(rockGeo, rockMat, rockNodes.length);
      rockInst.castShadow = true;
      rockInst.receiveShadow = true;
      rockNodes.forEach((o, i) => rockInst.setMatrixAt(i, o.matrix));
      this.scene.add(rockInst);
    }
  }

  /** 3D Tank model: olive-drab / steel-grey armor, raised track lugs, beveled turret & barrel with muzzle brake. */
  private createTankMesh(side: 'a' | 'b'): Group {
    const g = new Group();
    const isA = side === 'a';
    const bodyMat = this.stdMat({ color: isA ? 0x4e5b3c : 0x4c5359, roughness: 0.55, metalness: 0.35 }, side);
    const trackMat = this.stdMat({ color: 0x1d1c1a, roughness: 0.82, metalness: 0.25 });
    const trimMat = this.stdMat({ color: isA ? 0x9e2a22 : 0x94a3b8, roughness: 0.4, metalness: 0.45 });

    // Sloped hull profile extruded sideways
    const hullShape = new Shape();
    hullShape.moveTo(-1.35, 0.15);
    hullShape.lineTo(1.15, 0.15);
    hullShape.lineTo(1.45, 0.55); // sloped front glacis
    hullShape.lineTo(1.05, 0.88);
    hullShape.lineTo(-1.25, 0.88);
    hullShape.closePath();
    const hullGeo = this.geo(new ExtrudeGeometry(hullShape, { depth: 1.25, bevelEnabled: false }));
    hullGeo.translate(0, 0, -0.625);
    hullGeo.rotateY(Math.PI / 2); // face -Z forward
    const hull = new Mesh(hullGeo, bodyMat);
    hull.castShadow = true;
    hull.receiveShadow = true;

    // 2 black caterpillar track pods with raised road-wheel lugs
    const trackGeo = this.geo(new BoxGeometry(0.36, 0.48, 2.75));
    const lugGeo = this.geo(new CylinderGeometry(0.18, 0.18, 0.42, 8));
    lugGeo.rotateZ(Math.PI / 2);
    for (const tx of [-0.74, 0.74]) {
      const track = new Mesh(trackGeo, trackMat);
      track.position.set(tx, 0.24, 0);
      track.castShadow = true;
      g.add(track);
      for (const lz of [-0.95, -0.32, 0.32, 0.95]) {
        const lug = new Mesh(lugGeo, bodyMat);
        lug.position.set(tx, 0.22, lz);
        g.add(lug);
      }
    }

    // Beveled rotating turret + long gun barrel + muzzle brake
    const turret = new Mesh(this.geo(new CylinderGeometry(0.52, 0.72, 0.48, 8)), bodyMat);
    turret.position.set(0, 1.1, 0.05);
    turret.castShadow = true;
    const hatch = new Mesh(this.geo(new CylinderGeometry(0.22, 0.22, 0.12, 8)), trimMat);
    hatch.position.set(0.14, 1.36, 0.12);
    const barrel = new Mesh(this.geo(new CylinderGeometry(0.08, 0.11, 2.15, 8)), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.12, -1.25);
    barrel.castShadow = true;
    const muzzle = new Mesh(this.geo(new CylinderGeometry(0.12, 0.12, 0.26, 8)), trackMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 1.12, -2.35);

    g.add(hull, turret, hatch, barrel, muzzle);
    return g;
  }

  /** 3D Artillery battery: 2 wheels, steel gun shield, 30° pitched barrel with muzzle brake & curved sandbag arc. */
  private createArtilleryMesh(side: 'a' | 'b'): Group {
    const g = new Group();
    const isA = side === 'a';
    const bodyMat = this.stdMat({ color: isA ? 0x4e5b3c : 0x4c5359, roughness: 0.55, metalness: 0.35 }, side);
    const steelMat = this.stdMat({ color: 0x353738, roughness: 0.5, metalness: 0.55 });
    const sandbagMat = this.stdMat({ color: 0xa89778, roughness: 0.92 });

    // 2 carriage wheels
    const wheelGeo = this.geo(new CylinderGeometry(0.46, 0.46, 0.18, 14));
    wheelGeo.rotateZ(Math.PI / 2);
    for (const wx of [-0.72, 0.72]) {
      const wheel = new Mesh(wheelGeo, steelMat);
      wheel.position.set(wx, 0.46, 0);
      wheel.castShadow = true;
      g.add(wheel);
    }
    const axle = new Mesh(this.geo(new CylinderGeometry(0.08, 0.08, 1.5, 6)), steelMat);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.46, 0);

    // Split trail legs
    for (const tx of [-0.35, 0.35]) {
      const trail = new Mesh(this.geo(new BoxGeometry(0.14, 0.14, 1.45)), bodyMat);
      trail.position.set(tx, 0.22, 0.72);
      trail.rotation.y = tx < 0 ? -0.22 : 0.22;
      trail.rotation.x = 0.22;
      g.add(trail);
    }

    // Angled steel gun shield
    const shield = new Mesh(this.geo(new BoxGeometry(1.3, 0.85, 0.12)), bodyMat);
    shield.position.set(0, 0.78, -0.22);
    shield.rotation.x = -0.18;
    shield.castShadow = true;

    // Gun barrel pitched up at 30 degrees (Math.PI / 6)
    const barrel = new Mesh(this.geo(new CylinderGeometry(0.09, 0.14, 2.25, 10)), steelMat);
    barrel.rotation.x = Math.PI / 2 - Math.PI / 6;
    barrel.position.set(0, 1.05, -0.78);
    barrel.castShadow = true;

    // Curved protective sandbag arc in front of the gun
    const bagGeo = this.geo(new BoxGeometry(0.75, 0.36, 0.42));
    for (const [bx, bz, rot] of [[-0.95, -1.25, 0.45], [-0.32, -1.52, 0.12], [0.32, -1.52, -0.12], [0.95, -1.25, -0.45]] as [number, number, number][]) {
      const bag = new Mesh(bagGeo, sandbagMat);
      bag.position.set(bx, 0.18, bz);
      bag.rotation.y = rot;
      bag.castShadow = true;
      g.add(bag);
    }

    g.add(axle, shield, barrel);
    return g;
  }

  /** Compact circular wooden infantry token (radius = 0.6, height = 0.4) with gold-bronze rim. */
  private createInfantryUnitMesh(side: 'a' | 'b'): Group {
    const g = new Group();
    const isA = side === 'a';
    const bodyMat = this.stdMat({ color: isA ? 0x9e2a22 : 0x2c3e50, roughness: 0.32, metalness: 0.1 }, side);
    const rimMat = this.stdMat({ color: 0xc59b47, roughness: 0.3, metalness: 0.55 });
    const topMat = this.stdMat({ color: isA ? 0xfde68a : 0xe2e8f0, roughness: 0.35 });

    const body = new Mesh(this.geo(new CylinderGeometry(0.6, 0.6, 0.4, 20)), bodyMat);
    body.position.y = 0.2;
    body.castShadow = true;
    body.receiveShadow = true;
    const rim = new Mesh(this.geo(new CylinderGeometry(0.64, 0.64, 0.1, 20)), rimMat);
    rim.position.y = 0.36;
    const emblem = new Mesh(this.geo(new CylinderGeometry(0.28, 0.28, 0.08, isA ? 5 : 4)), topMat);
    emblem.position.y = 0.43;
    g.add(body, rim, emblem);
    return g;
  }

  /** Waving command flag for each 3-4 unit infantry squad. */
  private createCommandFlagMesh(side: 'a' | 'b'): Group {
    const g = new Group();
    const isA = side === 'a';
    const bodyMat = this.stdMat({ color: isA ? 0x9e2a22 : 0x2c3e50, roughness: 0.42 }, side);
    const rimMat = this.stdMat({ color: 0xc59b47, roughness: 0.32, metalness: 0.5 });

    const plinth = new Mesh(this.geo(new CylinderGeometry(0.65, 0.72, 0.32, 16)), bodyMat);
    plinth.position.y = 0.16;
    plinth.castShadow = true;
    const pole = new Mesh(this.geo(new CylinderGeometry(0.08, 0.1, 4.8, 8)), this.stdMat({ color: 0x5c4033, roughness: 0.7 }));
    pole.position.y = 2.4;
    pole.castShadow = true;
    const finial = new Mesh(this.geo(new SphereGeometry(0.2, 8, 8)), rimMat);
    finial.position.y = 4.9;

    const flagGeo = this.geo(new PlaneGeometry(2.6, 1.35, 10, 4));
    flagGeo.translate(1.3, 0, 0);
    const posAttr = flagGeo.attributes.position;
    const baseZ = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) baseZ[i] = posAttr.getZ(i);
    this.wavingFlags.push({ geo: flagGeo, baseZ });
    const flagMat = this.stdMat({ color: isA ? 0xb91c1c : 0x334155, roughness: 0.5, side: DoubleSide }, side);
    const flag = new Mesh(flagGeo, flagMat);
    flag.position.set(0.06, 4.05, 0);
    flag.castShadow = true;
    g.add(plinth, pole, finial, flag);
    return g;
  }

  private createUnitMesh(kind: SpriteKind, side: 'a' | 'b'): Group {
    if (kind === 'banner') return this.createCommandFlagMesh(side);
    if (kind === 'tank' || kind === 'elephant') return this.createTankMesh(side);
    if (kind === 'cannon') return this.createArtilleryMesh(side);
    return this.createInfantryUnitMesh(side);
  }

  private addPieceGroup(keyName: string, kind: SpriteKind, side: 'a' | 'b', placements: Omit<DioramaPiece, 'mesh' | 'phase'>[], troops = false) {
    if (!placements.length) return;
    const pieces: DioramaPiece[] = placements.map((p) => {
      const mesh = this.createUnitMesh(kind, side);
      mesh.position.set(p.baseX + p.offsetX, -0.25, p.baseZ + p.offsetZ);
      this.scene.add(mesh);
      return { ...p, mesh, phase: this.random() * Math.PI * 2 };
    });
    let key = keyName;
    for (let n = 2; this.groups[key]; n++) key = `${keyName}-${n}`;
    this.groups[key] = { key, kind, side, troops, pieces };
  }

  /** Well-separated combined-arms formations (tanks leading, infantry squad + flag mid, artillery support rear). */
  private buildUnits() {
    const scene = this.sim.scene;
    const counts = normalizeCounts(this.sim.unitCounts);
    const formations = { a: scene.formations?.a ?? DEFAULT_FORMATIONS.a, b: scene.formations?.b ?? DEFAULT_FORMATIONS.b };
    const sideRoutes = (side: 'a' | 'b') => scene.routes.filter((route) => route.faction === side);

    // Combined-arms spacing (minimum >= 3.0 units between any two units, zero overlap)
    const tankOffsets: Point[] = [[-4.4, -5.2], [0, -6.4], [4.4, -5.2]];
    const infantryOffsets: Point[] = [[-4.8, 0.8], [-1.6, 2.2], [1.6, 2.2], [4.8, 0.8]];
    const artilleryOffsets: Point[] = [[-3.8, 7.2], [3.8, 7.2]];

    const routesA = sideRoutes('a');
    const aPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const flagAPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const tankAPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const cannonAPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const ringGeo = this.geo(new RingGeometry(3.2, 4.0, 32));
    ringGeo.rotateX(-Math.PI / 2);

    const pushAxisFormation = (
      start: Point,
      curve: CatmullRomCurve3,
      from: number,
      to: number,
      tanks: Omit<DioramaPiece, 'mesh' | 'phase'>[],
      infantry: Omit<DioramaPiece, 'mesh' | 'phase'>[],
      cannons: Omit<DioramaPiece, 'mesh' | 'phase'>[],
      flags: Omit<DioramaPiece, 'mesh' | 'phase'>[]
    ) => {
      for (const [ox, oz] of tankOffsets) tanks.push({ baseX: start[0], baseZ: start[1], offsetX: ox, offsetZ: oz, curve, from, to, troop: true });
      for (const [ox, oz] of infantryOffsets) infantry.push({ baseX: start[0], baseZ: start[1], offsetX: ox, offsetZ: oz, curve, from, to, troop: true });
      for (const [ox, oz] of artilleryOffsets) cannons.push({ baseX: start[0], baseZ: start[1], offsetX: ox, offsetZ: oz, curve, from, to, troop: true });
      flags.push({ baseX: start[0], baseZ: start[1], offsetX: 0, offsetZ: -0.6, curve, from, to, troop: false });
    };

    if (routesA.length) {
      routesA.forEach((route, idx) => {
        const curve = new CatmullRomCurve3(route.points.map(([x, z]) => new Vector3(x, -0.25, z)));
        const start = route.points[0];
        const isFirst = idx === 0 && route.from <= 0.15;
        const from = isFirst ? 0 : route.from;
        const to = Math.max(route.to, from + 0.15);
        if (idx === 0) {
          this.primaryCurve = curve;
          this.primaryFrom = from;
          this.primaryTo = to;
        }
        pushAxisFormation(start, curve, from, to, tankAPlacements, aPlacements, cannonAPlacements, flagAPlacements);

        const ringMat = this.basicMat({ color: 0xfde68a, transparent: true, opacity: 0.72, side: DoubleSide, depthWrite: false });
        const ringMesh = new Mesh(ringGeo, ringMat);
        ringMesh.position.set(start[0], 0.15, start[1]);
        this.tacticalGuideGroup.add(ringMesh);
        this.spearheadRings.push({ mesh: ringMesh, curve, from, to, phase: idx * 1.7 });
      });
    } else {
      const curve = new CatmullRomCurve3([new Vector3(formations.a.from[0], -0.25, formations.a.from[1]), new Vector3(formations.a.to[0], -0.25, formations.a.to[1])]);
      this.primaryCurve = curve;
      this.primaryFrom = 0;
      this.primaryTo = 1;
      pushAxisFormation(formations.a.from, curve, 0, 1, tankAPlacements, aPlacements, cannonAPlacements, flagAPlacements);
    }
    this.addPieceGroup('sideA', 'soldier', 'a', aPlacements, true);
    this.addPieceGroup('bannersA', 'banner', 'a', flagAPlacements, false);
    this.addPieceGroup('aSpecial', scene.aSpecialKind ?? 'tank', 'a', tankAPlacements, true);
    if (cannonAPlacements.length) this.addPieceGroup('aArtillery', 'cannon', 'a', cannonAPlacements, true);

    // Side B: well-spaced defensive units inside stronghold + combined-arms relief corps on routesB
    const bPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const flagBPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const tankBPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const cannonBPlacements: Omit<DioramaPiece, 'mesh' | 'phase'>[] = [];
    const campFeature = scene.features.find((f) => f.type === 'camp' || f.type === 'fort');
    const bCenter: Point = campFeature?.at ?? formations.b.from;
    this.targetCenter.set(bCenter[0], 2.5, bCenter[1]);
    for (const [ox, oz] of infantryOffsets) {
      bPlacements.push({ baseX: bCenter[0], baseZ: bCenter[1], offsetX: ox * 1.6, offsetZ: oz - 5.5, from: 0, to: 1, troop: true });
    }
    tankBPlacements.push({ baseX: bCenter[0], baseZ: bCenter[1], offsetX: -7.5, offsetZ: -9.0, from: 0, to: 1, troop: true });
    tankBPlacements.push({ baseX: bCenter[0], baseZ: bCenter[1], offsetX: 7.5, offsetZ: -9.0, from: 0, to: 1, troop: true });
    cannonBPlacements.push({ baseX: bCenter[0], baseZ: bCenter[1], offsetX: -6.5, offsetZ: 5.5, from: 0, to: 1, troop: false });
    cannonBPlacements.push({ baseX: bCenter[0], baseZ: bCenter[1], offsetX: 6.5, offsetZ: 5.5, from: 0, to: 1, troop: false });
    flagBPlacements.push({ baseX: bCenter[0], baseZ: bCenter[1], offsetX: 0, offsetZ: -1.5, from: 0, to: 1, troop: false });

    const routesB = sideRoutes('b');
    for (const route of routesB) {
      const curve = new CatmullRomCurve3(route.points.map(([x, z]) => new Vector3(x, -0.25, z)));
      pushAxisFormation(route.points[0], curve, route.from, route.to, tankBPlacements, bPlacements, cannonBPlacements, flagBPlacements);
    }
    this.addPieceGroup('sideB', 'soldier', 'b', bPlacements, true);
    this.addPieceGroup('bannersB', 'banner', 'b', flagBPlacements, false);
    if (tankBPlacements.length) this.addPieceGroup('bTanks', 'tank', 'b', tankBPlacements, true);
    if (cannonBPlacements.length) this.addPieceGroup('bArtillery', 'cannon', 'b', cannonBPlacements, false);

    if ((counts.aSpecial ?? 0) > 0 && !routesA.length) {
      const aKind = scene.aSpecialKind ?? 'tank';
      const fa = formations.a;
      this.addPieceGroup('aSpecial', aKind, 'a', [
        { baseX: fa.from[0] - 9, baseZ: fa.from[1] + 4, offsetX: 0, offsetZ: 0, from: 0, to: 0.85, troop: true },
        { baseX: fa.from[0] + 9, baseZ: fa.from[1] + 4, offsetX: 0, offsetZ: 0, from: 0, to: 0.85, troop: true }
      ], true);
    }

    this.applyPropConfig(this.sim.propsConfig ?? {});
  }

  private buildFog() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(128, 64, 5, 128, 64, 125);
    gradient.addColorStop(0, 'rgba(246,238,219,.45)');
    gradient.addColorStop(0.5, 'rgba(217,211,193,.22)');
    gradient.addColorStop(1, 'rgba(217,211,193,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 128);
    const map = this.texture(canvas);
    const cardGeo = this.geo(new PlaneGeometry(48, 20));
    for (let index = 0; index < 6; index++) {
      const card = new Mesh(cardGeo, this.basicMat({ map, transparent: true, depthWrite: false, opacity: 0.18 + (index % 2) * 0.07, side: DoubleSide }));
      card.rotation.x = -Math.PI / 2;
      card.position.set(-90 + index * 34, 1.4 + index * 0.15, -70 + (index % 3) * 42);
      this.scene.add(card);
      this.fogCards.push(card);
    }
  }

  /** Battlefield smoke plumes & warm firelight glow at the contested stronghold/city center. */
  private buildBattleEffects() {
    const targetFeature = this.sim.scene.features.find((f) => f.type === 'camp' || f.type === 'fort');
    const [cx, cz] = targetFeature?.at ?? [0, 0];

    // Warm orange-red firelight casting dramatic combat glow onto nearby 3D buildings
    this.fireLight = new PointLight(0xff5a1f, 3.8, 56, 1.6);
    this.fireLight.position.set(cx, 5.5, cz);
    this.scene.add(this.fireLight);

    // Dark-grey rising smoke sprite texture
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 128;
    smokeCanvas.height = 128;
    const sc = smokeCanvas.getContext('2d')!;
    const sGrad = sc.createRadialGradient(64, 64, 6, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(34, 30, 28, 0.72)');
    sGrad.addColorStop(0.5, 'rgba(54, 48, 44, 0.38)');
    sGrad.addColorStop(1, 'rgba(34, 30, 28, 0)');
    sc.fillStyle = sGrad;
    sc.fillRect(0, 0, 128, 128);
    const smokeTex = this.texture(smokeCanvas);

    // Warm orange-red ember/fire glow sprite texture
    const fireCanvas = document.createElement('canvas');
    fireCanvas.width = 64;
    fireCanvas.height = 64;
    const fc = fireCanvas.getContext('2d')!;
    const fGrad = fc.createRadialGradient(32, 32, 2, 32, 32, 30);
    fGrad.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
    fGrad.addColorStop(0.4, 'rgba(255, 95, 25, 0.65)');
    fGrad.addColorStop(1, 'rgba(180, 30, 10, 0)');
    fc.fillStyle = fGrad;
    fc.fillRect(0, 0, 64, 64);
    const fireTex = this.texture(fireCanvas);

    const r = this.random;
    for (let i = 0; i < 16; i++) {
      const mat = new SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.42 });
      this.materials.push(mat);
      const sprite = new Sprite(mat);
      const bx = cx + (r() - 0.5) * 28;
      const bz = cz + (r() - 0.5) * 24;
      const phase = r() * 14;
      const maxH = 16 + r() * 12;
      const baseScale = 6 + r() * 6;
      sprite.position.set(bx, 1.5 + (phase % maxH), bz);
      sprite.scale.setScalar(baseScale);
      this.scene.add(sprite);
      this.smokeParticles.push({ sprite, baseX: bx, baseZ: bz, speed: 2.0 + r() * 1.6, phase, maxH, rotSpeed: (r() - 0.5) * 0.6, baseScale });
    }

    // Tiny rising glowing ember sparks (no flat static ground circles)
    for (let i = 0; i < 12; i++) {
      const mat = new SpriteMaterial({ map: fireTex, transparent: true, depthWrite: false, opacity: 0.9 });
      this.materials.push(mat);
      const spark = new Sprite(mat);
      const bx = cx + (r() - 0.5) * 22;
      const bz = cz + (r() - 0.5) * 18;
      const phase = r() * 8;
      const maxH = 8 + r() * 7;
      spark.position.set(bx, 1.0 + (phase % maxH), bz);
      spark.scale.setScalar(0.65 + r() * 0.55);
      this.scene.add(spark);
      this.emberSparks.push({ sprite: spark, baseX: bx, baseZ: bz, speed: 3.4 + r() * 2.5, phase, maxH });
    }
  }

  // Terrain labels are HTML overlays so Vietnamese diacritics render crisply with page fonts.
  private buildLabels() {
    document.addEventListener('keydown', this.onPopoverKey);
    document.addEventListener('pointerdown', this.onOutsidePointer);
    for (const label of this.sim.scene.labels) {
      const text = label.text.normalize('NFC');
      const info = label.info?.normalize('NFC');
      if (!info && (/bị bao vây/i.test(text) || text.length > 26)) continue;
      // Stage-gate date labels so "19-11-1942" and "30-11-1942" never collide on screen.
      const minTime = /30-11-1942/.test(text) ? 0.25 : undefined;
      const maxTime = /19-11-1942/.test(text) ? 0.35 : undefined;
      const element = document.createElement('span');
      element.className = 'lesson-scene-label';
      element.textContent = text;
      if (info) {
        element.classList.add('lesson-scene-label-info');
        element.setAttribute('role', 'button');
        element.tabIndex = 0;
        element.setAttribute('aria-haspopup', 'dialog');
        element.addEventListener('click', (event) => {
          event.stopPropagation();
          this.openPopover(element.textContent ?? '', info, element);
        });
        element.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          this.openPopover(element.textContent ?? '', info, element);
        });
      }
      this.container.appendChild(element);
      this.labels.push({ element, position: new Vector3(label.at[0], 1.2, label.at[1]), minTime, maxTime });
    }
  }

  private openPopover(title: string, info: string, trigger: HTMLElement) {
    this.closePopover(false);
    const card = document.createElement('div');
    card.className = 'lesson-scene-popover';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', title);
    const heading = document.createElement('strong');
    heading.className = 'lesson-scene-popover-title';
    heading.textContent = title;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lesson-scene-popover-close';
    close.setAttribute('aria-label', 'Đóng');
    close.textContent = '×';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      this.closePopover();
    });
    const body = document.createElement('p');
    body.textContent = info;
    card.append(close, heading, body);
    card.addEventListener('pointerdown', (event) => event.stopPropagation());
    card.addEventListener('wheel', (event) => event.stopPropagation());
    this.container.appendChild(card);
    this.popover = card;
    this.popoverTrigger = trigger;
    close.focus();
  }

  private closePopover(restoreFocus = true) {
    this.popover?.remove();
    this.popover = null;
    if (restoreFocus && this.popoverTrigger?.isConnected) this.popoverTrigger.focus();
    this.popoverTrigger = null;
  }

  private onPopoverKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.popover) this.closePopover();
  };

  private onOutsidePointer = (event: PointerEvent) => {
    if (!this.popover) return;
    const target = event.target as Element | null;
    if (target?.closest('.lesson-scene-popover, .lesson-scene-label-info')) return;
    this.closePopover(false);
  };

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
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      if (this.activePreset === 'first_person') {
        this.fpLookOffset.yaw = clamp(this.fpLookOffset.yaw - dx * 0.0035, -0.65, 0.65);
        this.fpLookOffset.pitch = clamp(this.fpLookOffset.pitch + dy * 0.0025, -0.25, 0.35);
      } else {
        this.target.x = clamp(this.target.x - dx * 0.12, -120, 120);
        this.target.z = clamp(this.target.z + dy * 0.12, -93, 93);
      }
      this.pointer = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        if (this.activePreset === 'first_person') return;
        const position = this.camera.position.sub(this.target).multiplyScalar(event.deltaY > 0 ? 1.08 : 0.92);
        const distance = position.length();
        if (distance < 36 || distance > 250) position.setLength(clamp(distance, 36, 250));
        position.add(this.target);
        this.labelsDirty = true;
      },
      { passive: false }
    );
  }

  /** Computes eye-level soldier/command-post pose along the primary advance route with subtle combat shake. */
  private getFirstPersonPose(time: number, now: number): { pos: Vector3; target: Vector3 } {
    if (!this.primaryCurve) {
      return { pos: new Vector3(...PRESETS.first_person.pos), target: new Vector3(...PRESETS.first_person.target) };
    }
    const local = clamp((time - this.primaryFrom) / Math.max(0.05, this.primaryTo - this.primaryFrom), 0, 1);
    const travel = clamp(easeOutCubic(local) * 0.84, 0, 0.84);
    const pt = this.primaryCurve.getPointAt(travel);
    const tan = this.primaryCurve.getTangentAt(travel).normalize();

    // Position eye-level camera slightly behind and left of the spearhead tank/formation
    const sideX = -tan.z;
    const sideZ = tan.x;
    const camX = clamp(pt.x - tan.x * 15 + sideX * 2.5, -108, 108);
    const camZ = clamp(pt.z - tan.z * 15 + sideZ * 2.5, -82, 82);
    const groundY = this.terrainHeight(camX, camZ) * 0.45;
    let camY = Math.max(1.95, 2.25 + groundY);

    // Subtle marching & artillery concussion shake when playing
    let shakeX = 0;
    let shakeY = 0;
    if (this.isPlaying) {
      const intensity = local > 0 && local < 1 ? 0.14 : 0.05;
      shakeX = Math.sin(now * 0.017) * intensity * 0.6;
      shakeY = Math.abs(Math.sin(now * 0.011)) * intensity + Math.sin(now * 0.031) * intensity * 0.45;
      camY += shakeY;
    }

    const pos = new Vector3(camX + shakeX, camY, camZ);
    // Look forward along advance blended toward the burning stronghold center, plus user look-around
    const forward = new Vector3(pt.x + tan.x * 36, 2.8 + groundY * 0.5, pt.z + tan.z * 36);
    const lookDir = forward.lerp(this.targetCenter, 0.45).sub(pos).normalize();
    if (this.fpLookOffset.yaw !== 0 || this.fpLookOffset.pitch !== 0) {
      const cosY = Math.cos(this.fpLookOffset.yaw);
      const sinY = Math.sin(this.fpLookOffset.yaw);
      const rx = lookDir.x * cosY - lookDir.z * sinY;
      const rz = lookDir.x * sinY + lookDir.z * cosY;
      lookDir.x = rx;
      lookDir.z = rz;
      lookDir.y = clamp(lookDir.y + this.fpLookOffset.pitch, -0.35, 0.55);
      lookDir.normalize();
    }
    const target = pos.clone().addScaledVector(lookDir, 42);
    return { pos, target };
  }

  private applyCameraAtmosphere(preset: PresetName) {
    const isFp = preset === 'first_person';
    const low = this.options.quality === 'low';
    this.skyDome.visible = isFp;
    this.warRoomGroup.visible = !isFp;
    this.tacticalGuideGroup.visible = !isFp;
    this.scene.background = isFp ? null : this.warRoomBackdrop;
    this.scene.fog = low ? null : isFp ? this.battleFog : this.fogSettings;
  }

  setCameraPreset(name: string) {
    const key = (PRESET_ALIASES[name] ?? (name in PRESETS ? name : 'overview')) as PresetName;
    const preset = PRESETS[key];
    const isOrtho = this.camera instanceof OrthographicCamera;
    const prevFov = this.camera instanceof PerspectiveCamera ? this.camera.fov : preset.fov;
    if (preset.ortho && !isOrtho) {
      const half = 86;
      const next = new OrthographicCamera(-half * this.aspect, half * this.aspect, half, -half, 1, 900);
      next.position.copy(this.camera.position);
      this.camera = next;
    } else if (!preset.ortho && isOrtho) {
      const next = new PerspectiveCamera(prevFov, this.aspect, 0.5, 900);
      next.position.copy(this.camera.position);
      this.camera = next;
    }
    this.orbit.on = false;
    this.activePreset = key;
    if (key === 'first_person') this.fpLookOffset = { yaw: 0, pitch: 0 };
    this.applyCameraAtmosphere(key);

    const dest = key === 'first_person' ? this.getFirstPersonPose(this.currentTime, performance.now()) : { pos: new Vector3(...preset.pos), target: new Vector3(...preset.target) };
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant && this.camera instanceof PerspectiveCamera) {
      this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
    }
    this.transition = {
      started: instant ? -Infinity : performance.now(),
      from: this.camera.position.clone(),
      to: dest.pos,
      fromTarget: this.target.clone(),
      toTarget: dest.target,
      fromFov: prevFov,
      toFov: preset.fov
    };
    this.labelsDirty = true;
  }

  toggleCinematicOrbit() {
    this.orbit.on = !this.orbit.on;
    return this.orbit.on;
  }

  updateTimeline(progress: number) {
    this.currentTime = clamp(Number(progress) || 0, 0, 1);
    const time = this.currentTime;
    const keyframe = (this.sim.keyframes ?? []).filter((frame) => time >= frame.time).pop();
    if (this.activePreset !== 'first_person' && keyframe && keyframe.preset !== this.activePreset && time > 0) {
      this.setCameraPreset(keyframe.preset);
    }

    const now = performance.now();
    // Advance 3D wooden game pieces smoothly along their route curves
    for (const group of Object.values(this.groups)) {
      for (const piece of group.pieces) {
        if (piece.curve) {
          const local = clamp((time - piece.from) / Math.max(0.05, piece.to - piece.from), 0, 1);
          const travel = easeOutCubic(local);
          const pos = piece.curve.getPointAt(travel);
          const tan = piece.curve.getTangentAt(travel);
          const angle = Math.atan2(tan.x, tan.z);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const rx = piece.offsetX * cos + piece.offsetZ * sin;
          const rz = -piece.offsetX * sin + piece.offsetZ * cos;
          const bob = piece.troop && local > 0 && local < 1 ? Math.abs(Math.sin(time * 24 + piece.phase)) * 0.35 : 0;
          piece.mesh.position.set(pos.x + rx, -0.25 + bob, pos.z + rz);
          piece.mesh.rotation.y = angle + Math.PI;
        } else {
          const idleBob = piece.troop ? Math.sin(now * 0.002 + piece.phase) * 0.06 : 0;
          piece.mesh.position.y = -0.25 + idleBob;
        }
      }
    }

    // Update spearhead tactical radar rings along their curves
    for (const ring of this.spearheadRings) {
      const local = clamp((time - ring.from) / Math.max(0.05, ring.to - ring.from), 0, 1);
      const travel = easeOutCubic(local);
      const pt = ring.curve.getPointAt(travel);
      ring.mesh.position.set(pt.x, 0.18 + this.terrainHeight(pt.x, pt.z) * 0.45, pt.z);
    }

    this.paintRouteLayer(time);
    this.labelsDirty = true;
    this.options.onProgressUpdate?.(this.currentTime);
  }

  applyPropConfig(config: Record<string, boolean | undefined>) {
    for (const [prop, names] of Object.entries(PROP_GROUPS)) {
      for (const [key, group] of Object.entries(this.groups)) {
        if (!names.some((name) => key === name || key.startsWith(`${name}-`))) continue;
        for (const p of group.pieces) p.mesh.visible = config[prop] !== false;
      }
    }
  }

  updatePropsVisibility(config: Record<string, boolean | undefined>) {
    this.applyPropConfig(config);
  }

  updateFactionColors(colors: { a?: string; b?: string; taySon?: string; qing?: string }) {
    const next = { a: colors.a ?? colors.taySon, b: colors.b ?? colors.qing };
    for (const side of ['a', 'b'] as const) {
      if (!next[side] || next[side] === this.colors[side]) continue;
      this.colors[side] = next[side]!;
      for (const mat of this.factionMaterials[side]) mat.color.set(this.colors[side]);
      this.paintRouteLayer(this.currentTime);
    }
  }

  updateUnitCounts(_counts: Record<string, number | undefined>) {
    // Consolidated diorama clusters stay fixed per axis so formations never pile up.
    this.updateTimeline(this.currentTime);
  }

  setQuality(quality: Quality) {
    this.options.quality = quality;
    const low = quality === 'low';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
    this.renderer.shadowMap.enabled = !low;
    this.sunLight.castShadow = !low;
    this.applyCameraAtmosphere(this.activePreset);
    for (const card of this.fogCards) card.visible = !low;
    this.renderer.setSize(this.container.clientWidth || 640, this.container.clientHeight || 360);
  }

  play() {
    if (this.currentTime >= 1) this.updateTimeline(0);
    this.last = performance.now();
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
    const placed: { x: number; y: number; hw: number; hh: number }[] = [];
    for (const label of this.labels) {
      const style = label.element.style;
      const inPhase =
        (label.minTime === undefined || this.currentTime >= label.minTime) &&
        (label.maxTime === undefined || this.currentTime <= label.maxTime);
      if (!inPhase) {
        style.display = 'none';
        continue;
      }
      const point = label.position.clone().project(this.camera);
      const visible = point.z < 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1;
      style.display = visible ? 'block' : 'none';
      if (!visible) continue;
      const halfW = label.element.offsetWidth / 2 + 4;
      const halfH = label.element.offsetHeight / 2 + 4;
      const x = Math.min(Math.max((point.x * 0.5 + 0.5) * width, halfW), width - halfW);
      let y = Math.min(Math.max((-point.y * 0.5 + 0.5) * height, halfH + 8), height - halfH);
      // Screen-space collision avoidance so two labels never overlap
      for (const box of placed) {
        if (Math.abs(x - box.x) < halfW + box.hw && Math.abs(y - box.y) < halfH + box.hh) {
          y = box.y + halfH + box.hh + 4;
        }
      }
      y = Math.min(Math.max(y, halfH + 8), height - halfH);
      placed.push({ x, y, hw: halfW, hh: halfH });
      style.left = `${x}px`;
      style.top = `${y}px`;
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
      if (this.camera instanceof PerspectiveCamera && this.transition.fromFov !== this.transition.toFov) {
        this.camera.fov = this.transition.fromFov + (this.transition.toFov - this.transition.fromFov) * eased;
        this.camera.updateProjectionMatrix();
      }
      if (raw >= 1) this.transition = null;
    } else if (this.activePreset === 'first_person') {
      const fp = this.getFirstPersonPose(this.currentTime, now);
      this.camera.position.lerp(fp.pos, 0.14);
      this.target.lerp(fp.target, 0.16);
    }
    if (this.orbit.on) {
      this.orbit.angle += delta * 0.045;
      this.camera.position.x = Math.sin(this.orbit.angle) * 26;
      this.camera.position.z = 115 + Math.cos(this.orbit.angle) * 26;
    }

    // Only run heavy vertex/particle/texture loops when simulation is playing (idle = 60 FPS light render)
    if (this.isPlaying) {
      for (const card of this.fogCards) {
        card.position.x += delta * 0.45;
        if (card.position.x > 124) card.position.x = -124;
      }
      for (const flag of this.wavingFlags) {
        const pos = flag.geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const vx = pos.getX(i);
          pos.setZ(i, flag.baseZ[i] + Math.sin(vx * 1.35 - now * 0.0065) * (vx / 4.2) * 0.45);
        }
        pos.needsUpdate = true;
      }
      for (const tex of this.riverFlowTextures) {
        tex.offset.y -= delta * 0.16;
      }
      for (const ring of this.spearheadRings) {
        const s = 1 + ((now * 0.001 + ring.phase) % 1) * 0.45;
        ring.mesh.scale.setScalar(s);
        (ring.mesh.material as MeshBasicMaterial).opacity = 0.78 * (1 - ((now * 0.001 + ring.phase) % 1));
      }
      for (const p of this.smokeParticles) {
        const cycle = ((now * 0.001 * p.speed + p.phase) % p.maxH) / p.maxH;
        p.sprite.position.y = 1.4 + cycle * p.maxH;
        p.sprite.position.x = p.baseX + Math.sin(now * 0.0012 + p.phase) * 2.4;
        p.sprite.scale.setScalar(p.baseScale * (0.75 + cycle * 0.85));
        p.sprite.material.rotation += delta * p.rotSpeed;
        p.sprite.material.opacity = Math.sin(cycle * Math.PI) * 0.46;
      }
      for (const sp of this.emberSparks) {
        const cycle = ((now * 0.001 * sp.speed + sp.phase) % sp.maxH) / sp.maxH;
        sp.sprite.position.y = 1.0 + cycle * sp.maxH;
        sp.sprite.position.x = sp.baseX + Math.cos(now * 0.003 + sp.phase) * 1.1;
        sp.sprite.material.opacity = (1 - cycle) * (0.65 + Math.sin(now * 0.02 + sp.phase) * 0.35);
      }
      if (this.fireLight) {
        this.fireLight.intensity = 3.2 + Math.sin(now * 0.014) * 0.7 + Math.cos(now * 0.023) * 0.4;
      }
    }

    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
    if (this.isPlaying || this.transition || this.orbit.on || this.pointer || this.labelsDirty) {
      this.updateLabels();
      this.labelsDirty = false;
    }
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
    this.labelsDirty = true;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    document.removeEventListener('keydown', this.onPopoverKey);
    document.removeEventListener('pointerdown', this.onOutsidePointer);
    this.closePopover(false);
    for (const label of this.labels) label.element.remove();
    for (const g of this.geometries) g.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
