/* Museum-style diorama sand table renderer (window.BattleScene3D).
   Display layer only: lesson data, timeline semantics and the public API are unchanged.
   Colors come from css/theme.css tokens; Vietnamese text lives in HTML overlays only. */
(function (window, document) {
  'use strict';

  const T = window.DioramaTextures;
  const M = window.DioramaModels;
  const TABLE = T.TABLE;
  const FRAME_W = 12;
  const FRAME_TOP = 3.2;
  const FRAME_BOTTOM = -10;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const nfc = (text) => (window.normalizeVietnamese ? window.normalizeVietnamese(text) : String(text || '').normalize('NFC'));

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
      backdrop: read('--diorama-backdrop', '#0E1B15'), backdropGlow: read('--diorama-backdrop-glow', '#2A3F31'), backdropDeep: read('--diorama-backdrop-deep', '#07100C'),
      wood: read('--diorama-wood', '#4A2819'), woodDark: read('--diorama-wood-dark', '#24130B'), woodLight: read('--diorama-wood-light', '#6E3F25'),
      bronze: read('--diorama-bronze', '#9A7440'), bronzeDark: read('--diorama-bronze-dark', '#4E3820'), bronzeLight: read('--diorama-bronze-light', '#C79E5C'), patina: read('--diorama-patina', '#5F9483'),
      earth: read('--diorama-earth', '#7B5B37'), earthLight: read('--diorama-earth-light', '#A88452'),
      moss: read('--diorama-moss', '#56662F'), mossDark: read('--diorama-moss-dark', '#38451F'), meadow: read('--diorama-meadow', '#6C7A38'), forest: read('--diorama-forest', '#2F3E22'),
      paddy: read('--diorama-paddy', '#7A8340'), paddyWater: read('--diorama-paddy-water', '#55705E'),
      waterDeep: read('--diorama-water-deep', '#1E4746'), waterShallow: read('--diorama-water-shallow', '#4F8577'), waterGlint: read('--diorama-water-glint', '#CFE3D6'),
      sideA: read('--diorama-side-a', '#B5381F'), sideATrim: read('--diorama-side-a-trim', '#D4A646'),
      sideB: read('--diorama-side-b', '#2B4A80'), sideBTrim: read('--diorama-side-b-trim', '#DCD6C4'),
      arrowA: read('--diorama-arrow-a', '#D9542F'), arrowB: read('--diorama-arrow-b', '#4A74C0'),
      paper: read('--diorama-paper', '#EFE2C2'), ink: read('--diorama-ink', '#2A2119'),
      fire: read('--diorama-fire', '#FFB04A'), smoke: read('--diorama-smoke', '#3B3631')
    };
  }

  function canvasTexture(canvas, anisotropy) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = anisotropy || 1;
    return texture;
  }

  function factionPalette(theme, faction, primary) {
    const a = faction !== 'b';
    return {
      primary, flag: primary,
      trim: a ? theme.sideATrim : theme.sideBTrim, flagTrim: a ? theme.sideATrim : theme.sideBTrim,
      hat: a ? '#2E241B' : '#1B2330', skin: '#C59A6E', dark: '#2A231D', wood: '#6B4A2B',
      horse: a ? '#6A4126' : '#8B8174', elephant: '#7F817A', elephantDark: '#686A62', ivory: '#ECE1C6',
      canvas: '#D8CBAA', wall: '#B49A6C', thatch: '#7A6238', foliage: '#4A6B2A', stem: '#7E8B3C'
    };
  }

  /** Lucide-style inline icons (ISC licence) used by the HTML legend. */
  const ICON = {
    pennant: (color) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 3v18" stroke="#3A2A1C" stroke-width="2" stroke-linecap="round"/><path d="M6 4l13 4-5 1.5 5 2.5-13 3z" fill="${color}" stroke="#D4A646" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    square: (color) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 3v18" stroke="#3A2A1C" stroke-width="2" stroke-linecap="round"/><rect x="6" y="4" width="13" height="9" fill="${color}" stroke="#DCD6C4" stroke-width="1.6"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 18c4-1 8-5 11-10" fill="none" stroke="#D9542F" stroke-width="2.4" stroke-dasharray="3 2.2" stroke-linecap="round"/><path d="M11 6.5l5.5-1.5-.6 5.6z" fill="#D9542F"/></svg>`,
    compass: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#7A5A30" stroke-width="1.6"/><path d="M12 3.5l2.6 8.5h-5.2z" fill="#B5381F"/><path d="M12 20.5l-2.6-8.5h5.2z" fill="#2A2119"/></svg>`
  };

  class DioramaScene {
    constructor(container, options) {
      this.container = container;
      this.options = Object.assign({ quality: 'high', lessonConfig: null, isCustomScenario: false, studentChoices: null, onProgressUpdate: null }, options || {});
      this.theme = palette();
      this.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.buildQuality = this.options.quality === 'low' ? 'low' : 'high';
      this.currentTime = 0;
      this.isPlaying = false;
      this.playbackSpeed = 1;
      this.durationSeconds = 36;
      this.lastTimestamp = performance.now();
      this.cameraTransition = null;
      this.activePreset = 'overview';
      this.orbitAngle = 0;
      this.isCinematicOrbit = false;
      this.destroyed = false;
      this.isVisible = true;
      this.units = { taySonSoldiers: [], qingSoldiers: [], taySonElephants: [], taySonFlank: [] };
      this.propsGroups = { palisade: { visible: true }, tents: { visible: true }, elephants: { visible: true }, banners: { visible: true }, fire: { visible: true }, village: { visible: true }, bamboo: { visible: true }, river: { visible: true } };
      this.meshGroups = {};
      this.displayCounts = {};
      this.factionColors = this.getFactionColors();
      this.disposables = [];
      this.labels = [];
      this.dummy = new THREE.Object3D();
      this.tmp = new THREE.Vector3();

      container.classList.add('diorama-host');
      const width = container.clientWidth || 640; const height = container.clientHeight || 360;
      this.aspect = width / height;
      this.renderer = new THREE.WebGLRenderer({ antialias: this.buildQuality === 'high', alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(this.pixelRatioFor(this.options.quality));
      this.renderer.setSize(width, height);
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.domElement.setAttribute('aria-label', 'Sa bàn lịch sử ba chiều');
      this.renderer.domElement.setAttribute('role', 'img');
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.theme.backdropDeep);
      this.target = new THREE.Vector3(0, 0, 2);
      this.camera = new THREE.PerspectiveCamera(30, this.aspect, 1, 2000);
      this.controls = { target: this.target, update: () => this.camera.lookAt(this.target) };

      const segX = this.buildQuality === 'high' ? 240 : 120;
      const segZ = this.buildQuality === 'high' ? 186 : 93;
      this.field = T.buildHeightField(segX, segZ);

      this.buildEnvironment();
      this.buildTerrain();
      this.buildWater();
      this.buildFrame();
      this.buildSprites();
      this.buildArrows();
      this.buildParticles();
      this.buildOverlays();
      this.bindMapCamera();
      this.setQuality(this.options.quality);
      this.setCameraPreset('overview', true);
      this.updateTimeline(0);

      this.animate = this.animate.bind(this);
      this.onResizeBound = this.onResize.bind(this);
      window.addEventListener('resize', this.onResizeBound);
      if (window.ResizeObserver) { this.resizeObserver = new ResizeObserver(this.onResizeBound); this.resizeObserver.observe(container); }
      if (window.IntersectionObserver) {
        this.visibilityObserver = new IntersectionObserver((entries) => { this.isVisible = entries.some((entry) => entry.isIntersecting); });
        this.visibilityObserver.observe(container);
      }
      this.animationFrameId = requestAnimationFrame(this.animate);
    }

    getFactionColors() { return { taySon: this.theme.sideA, qing: this.theme.sideB }; }

    pixelRatioFor(quality) {
      const dpr = window.devicePixelRatio || 1;
      return Math.min(dpr, quality === 'low' ? 1 : 1.75);
    }

    track(resource) { this.disposables.push(resource); return resource; }

    /* ---------- Stage 1: table environment, terrain, water, light ---------- */

    buildEnvironment() {
      const floorTexture = this.track(canvasTexture(T.floorTexture(this.theme)));
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), this.track(new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 1, metalness: 0 })));
      floor.rotation.x = -Math.PI / 2; floor.position.y = FRAME_BOTTOM - .05; floor.receiveShadow = true;
      this.scene.add(floor);

      this.hemi = new THREE.HemisphereLight(0xf7e6c4, 0x1d2b23, .52);
      this.scene.add(this.hemi);
      // Warm museum key light with soft shadows.
      this.sun = new THREE.DirectionalLight(0xffdcae, 1.05);
      this.sun.position.set(-95, 175, 115);
      this.sun.target.position.set(0, 0, 0);
      const cam = this.sun.shadow.camera;
      cam.left = -165; cam.right = 165; cam.top = 135; cam.bottom = -135; cam.near = 40; cam.far = 460;
      this.sun.shadow.bias = -.0006; this.sun.shadow.normalBias = .35; this.sun.shadow.radius = 3;
      this.scene.add(this.sun, this.sun.target);
      const rim = new THREE.DirectionalLight(0x9fb8c8, .28);
      rim.position.set(120, 90, -160);
      this.scene.add(rim);
    }

    buildTerrain() {
      const field = this.field;
      const geometry = new THREE.PlaneGeometry(TABLE.width, TABLE.depth, field.segX, field.segZ);
      geometry.rotateX(-Math.PI / 2);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) position.setY(i, field.heightAt(position.getX(i), position.getZ(i)));
      geometry.computeVertexNormals();
      const paintSize = this.buildQuality === 'high' ? [768, 595] : [448, 347];
      const canvas = document.createElement('canvas'); canvas.width = paintSize[0]; canvas.height = paintSize[1];
      T.paintTerrain(canvas, field, this.theme);
      this.terrainTexture = this.track(canvasTexture(canvas, Math.min(8, this.renderer.capabilities.getMaxAnisotropy())));
      this.terrainTexture.flipY = false;
      // PlaneGeometry UV v runs north->south after rotation; flipY=false keeps canvas rows aligned with +z.
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, (position.getZ(i) + TABLE.depth / 2) / TABLE.depth);
      const material = this.track(new THREE.MeshStandardMaterial({ map: this.terrainTexture, roughness: .92, metalness: 0, flatShading: false }));
      this.terrain = new THREE.Mesh(this.track(geometry), material);
      this.terrain.receiveShadow = true; this.terrain.castShadow = true;
      this.scene.add(this.terrain);
      // Plinth under the relief so no gaps show through low ground at the edges.
      const plinth = new THREE.Mesh(this.track(new THREE.BoxGeometry(TABLE.width, 1, TABLE.depth)), this.track(new THREE.MeshStandardMaterial({ color: this.theme.woodDark, roughness: 1 })));
      plinth.position.y = -3; this.scene.add(plinth);
    }

    buildWater() {
      const c = (hex) => new THREE.Color(hex);
      this.waterMaterial = this.track(new THREE.ShaderMaterial({
        transparent: true,
        uniforms: { uTime: { value: 0 }, uDeep: { value: c(this.theme.waterDeep) }, uShallow: { value: c(this.theme.waterShallow) }, uGlint: { value: c(this.theme.waterGlint) } },
        vertexShader: 'varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: [
          'uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uGlint; varying vec3 vPos;',
          'void main(){',
          '  float r = sin(vPos.x*.55 + uTime*1.1) * sin(vPos.z*.8 - uTime*.8) + .5*sin((vPos.x+vPos.z)*1.25 + uTime*1.6);',
          '  vec3 col = mix(uDeep, uShallow, .42 + r*.12);',
          '  col += uGlint * smoothstep(1.05, 1.4, r) * .35;',
          '  gl_FragColor = vec4(col, .86);',
          '}'
        ].join('\n')
      }));
      this.water = new THREE.Mesh(this.track(new THREE.PlaneGeometry(TABLE.width, TABLE.depth)), this.waterMaterial);
      this.water.rotation.x = -Math.PI / 2; this.water.position.y = T.WATER_LEVEL;
      this.scene.add(this.water);
    }

    /* ---------- Stage 2: lim wood frame, bronze corners, plaque, compass ---------- */

    buildFrame() {
      const c = this.theme;
      const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      const wood = this.track(canvasTexture(T.woodTexture(c), aniso));
      const band = T.carvedBand(c, 2048, 104);
      const carved = this.track(canvasTexture(band.color, aniso));
      const bump = this.track(canvasTexture(band.bump, aniso));
      const carvedShort = this.track(carved.clone()); carvedShort.needsUpdate = true;
      const bumpShort = this.track(bump.clone()); bumpShort.needsUpdate = true;
      [carvedShort, bumpShort].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.repeat.set(.72, 1); });
      const woodMat = this.track(new THREE.MeshStandardMaterial({ map: wood, roughness: .5, metalness: .02 }));
      const carvedLong = this.track(new THREE.MeshStandardMaterial({ map: carved, bumpMap: bump, bumpScale: .9, roughness: .5 }));
      const carvedShortMat = this.track(new THREE.MeshStandardMaterial({ map: carvedShort, bumpMap: bumpShort, bumpScale: .9, roughness: .5 }));
      const patina = this.track(canvasTexture(T.patinaTexture(c)));
      this.bronzeMaterial = this.track(new THREE.MeshStandardMaterial({ map: patina, roughness: .42, metalness: .35 }));
      const drum = this.track(canvasTexture(T.drumFace(c, 512), aniso));
      const drumMat = this.track(new THREE.MeshStandardMaterial({ map: drum, roughness: .45, metalness: .3 }));

      const height = FRAME_TOP - FRAME_BOTTOM; const cy = (FRAME_TOP + FRAME_BOTTOM) / 2;
      const group = new THREE.Group();
      const piece = (length, outerMat, x, z, rotationY) => {
        // Box faces: +x, -x, +y, -y, +z (inner), -z (outer, carved).
        const mesh = new THREE.Mesh(this.track(new THREE.BoxGeometry(length, height, FRAME_W)), [woodMat, woodMat, woodMat, woodMat, woodMat, outerMat]);
        mesh.position.set(x, cy, z); mesh.rotation.y = rotationY;
        mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
        const inlay = new THREE.Mesh(this.track(new THREE.BoxGeometry(length - FRAME_W * 2 + 1.6, .5, .9)), this.bronzeMaterial);
        inlay.position.set(0, height / 2 + .25, FRAME_W / 2 - 1.4); mesh.add(inlay);
      };
      const longLen = TABLE.width + FRAME_W * 2;
      piece(longLen, carvedLong, 0, -(TABLE.depth / 2 + FRAME_W / 2), 0);
      piece(longLen, carvedLong, 0, TABLE.depth / 2 + FRAME_W / 2, Math.PI);
      piece(TABLE.depth, carvedShortMat, -(TABLE.width / 2 + FRAME_W / 2), 0, Math.PI / 2);
      piece(TABLE.depth, carvedShortMat, TABLE.width / 2 + FRAME_W / 2, 0, -Math.PI / 2);

      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const x = sx * (TABLE.width / 2 + FRAME_W / 2); const z = sz * (TABLE.depth / 2 + FRAME_W / 2);
        const cap = new THREE.Mesh(this.track(new THREE.BoxGeometry(FRAME_W + 2.4, height + .8, FRAME_W + 2.4)), this.bronzeMaterial);
        cap.position.set(x, cy + .2, z); cap.castShadow = true; group.add(cap);
        const disc = new THREE.Mesh(this.track(new THREE.CylinderGeometry(FRAME_W * .48, FRAME_W * .5, .7, 40)), [this.bronzeMaterial, drumMat, this.bronzeMaterial]);
        disc.position.set(x, FRAME_TOP + .95, z); disc.castShadow = true; group.add(disc);
      });

      // Bronze title plaque standing on the far rail; the title is an HTML overlay.
      const plaqueCanvas = document.createElement('canvas'); plaqueCanvas.width = 1024; plaqueCanvas.height = 150;
      const pctx = plaqueCanvas.getContext('2d');
      pctx.drawImage(T.patinaTexture(c), 0, 0, 1024, 150);
      pctx.strokeStyle = c.bronzeDark; pctx.lineWidth = 6; pctx.strokeRect(10, 10, 1004, 130);
      pctx.lineWidth = 2; pctx.strokeRect(22, 22, 980, 106);
      const medallion = T.drumFace(c, 128);
      pctx.drawImage(medallion, 34, 27, 96, 96); pctx.drawImage(medallion, 894, 27, 96, 96);
      const plaqueTex = this.track(canvasTexture(plaqueCanvas, aniso));
      const plaqueFront = this.track(new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: .4, metalness: .35 }));
      this.plaque = new THREE.Mesh(this.track(new THREE.BoxGeometry(100, 14.6, 1.4)), [this.bronzeMaterial, this.bronzeMaterial, this.bronzeMaterial, this.bronzeMaterial, plaqueFront, this.bronzeMaterial]);
      this.plaque.position.set(0, FRAME_TOP + 10.6, -(TABLE.depth / 2 + FRAME_W / 2));
      this.plaque.rotation.x = -.22; this.plaque.castShadow = true; group.add(this.plaque);
      [-38, 38].forEach((x) => {
        const post = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.2, 6, 2.2)), woodMat);
        post.position.set(x, FRAME_TOP + 2.6, -(TABLE.depth / 2 + FRAME_W / 2) - .6); post.castShadow = true; group.add(post);
      });

      // Compass resting on the near rail.
      const compassTex = this.track(canvasTexture(T.compassTexture(c), aniso));
      const compassMat = this.track(new THREE.MeshStandardMaterial({ map: compassTex, roughness: .5, metalness: .2 }));
      const compass = new THREE.Mesh(this.track(new THREE.CylinderGeometry(5.2, 5.4, .9, 40)), [this.bronzeMaterial, compassMat, this.bronzeMaterial]);
      compass.position.set(TABLE.width / 2 - 14, FRAME_TOP + .45, TABLE.depth / 2 + FRAME_W / 2);
      compass.castShadow = true; group.add(compass);
      this.scene.add(group);
      this.frameGroup = group;
    }

    /* ---------- Stage 3: miniatures, formations, advance arrows, fire and smoke ---------- */

    unitMaterial() {
      if (!this._unitMaterial) this._unitMaterial = this.track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .72, metalness: .04, flatShading: true }));
      return this._unitMaterial;
    }

    paletteFor(faction) {
      return factionPalette(this.theme, faction, faction === 'b' ? this.factionColors.qing : this.factionColors.taySon);
    }

    createGroup(name, groupName, faction, records, initialCount) {
      const kinds = [];
      records.forEach((record, index) => { record.order = index; record.kind = record.kind || 'soldier'; if (!kinds.includes(record.kind)) kinds.push(record.kind); });
      const group = { name, groupName, faction, records, batches: [], baseCount: records.length, visibleCount: initialCount == null ? records.length : initialCount, centroid: new THREE.Vector3(), dynamic: records.some((r) => r.endX !== undefined), visible: true };
      kinds.forEach((kind) => {
        const batchRecords = records.filter((record) => record.kind === kind);
        const geometry = this.track(M.build(kind, faction, this.paletteFor(faction)));
        const mesh = new THREE.InstancedMesh(geometry, this.unitMaterial(), Math.max(1, batchRecords.length));
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(mesh);
        group.batches.push({ kind, mesh, geometry, records: batchRecords });
      });
      this.meshGroups[name] = group;
      this.applyCount(group);
      this.layoutGroup(group, 0);
      return group;
    }

    applyCount(group) {
      group.batches.forEach((batch) => {
        let count = 0;
        while (count < batch.records.length && batch.records[count].order < group.visibleCount) count++;
        batch.mesh.count = count;
      });
    }

    layoutGroup(group, time) {
      const dummy = this.dummy; const field = this.field;
      const now = performance.now();
      let sx = 0; let sz = 0; let n = 0;
      group.batches.forEach((batch) => {
        for (let k = 0; k < batch.mesh.count; k++) {
          const r = batch.records[k];
          let x = r.x; let z = r.z; let yaw = r.faceYaw || 0; let moving = false;
          if (r.endX !== undefined) {
            const local = clamp01((time - .2 - (r.delay || 0)) / (r.span || .72));
            const eased = local * local * (3 - 2 * local);
            x = r.startX + (r.endX - r.startX) * eased; z = r.startZ + (r.endZ - r.startZ) * eased;
            const dx = r.endX - r.startX; const dz = r.endZ - r.startZ;
            if (local > 0 && dx * dx + dz * dz > .5) yaw = Math.atan2(-dx, -dz);
            moving = local > 0 && local < 1;
          }
          const bob = moving && !this.reducedMotion ? Math.abs(Math.sin(now * .011 + r.phase)) * .22 : 0;
          dummy.position.set(x, field.heightAt(x, z) + bob, z);
          dummy.rotation.set(0, yaw + (r.rotation || 0), 0);
          dummy.scale.setScalar(r.scale || 1);
          dummy.updateMatrix(); batch.mesh.setMatrixAt(k, dummy.matrix);
          sx += x; sz += z; n++;
        }
        batch.mesh.instanceMatrix.needsUpdate = true;
      });
      if (n) group.centroid.set(sx / n, field.heightAt(sx / n, sz / n), sz / n);
      group.liveCount = n;
    }

    buildSprites() {
      const config = this.options.lessonConfig && this.options.lessonConfig.simulation || {};
      const requested = config.unitCounts || {};
      const countA = Math.min(230, Math.max(120, (Number(requested.taySonInfantry) || 48) * 3));
      const countB = Math.min(200, Math.max(105, (Number(requested.qingInfantry) || 54) * 3));
      this.displayCounts = { sideA: countA, sideB: countB };
      const random = T.seededRandom(1789);
      const kindFor = (index) => (index % 31 === 0 ? 'officer' : index % 27 === 0 ? 'drummer' : index % 19 === 0 ? 'banner' : 'soldier');

      // Tây Sơn: wedge of squads (12 men) in five columns; the outer columns are flanking wings.
      const colX = [-66, -26, -8, 10, 46];
      const recordsA = [];
      for (let i = 0; i < countA; i++) {
        const squad = Math.floor(i / 12); const col = squad % 5; const row = Math.floor(squad / 5);
        const file = i % 4; const rank = Math.floor(i / 4) % 3;
        const ox = (file - 1.5) * 1.75 + (random() - .5) * .3; const oz = rank * 1.9 + (random() - .5) * .3;
        const wedge = col === 0 || col === 4 ? 6 : col === 2 ? -4 : 0;
        const startX = colX[col] + ox; const startZ = 48 + row * 8.5 + wedge + oz;
        let endX; let endZ; let delay;
        if (col === 0) { endX = -60 + ox + row * 1.5; endZ = -34 - row * 3.2 + oz; delay = 0; }
        else if (col === 4) { endX = 44 + ox - row * 1.5; endZ = -38 - row * 3.2 + oz; delay = .02; }
        else { endX = colX[col] * .7 + ox; endZ = -16 + row * 7 + oz; delay = .07 + row * .012; }
        recordsA.push({ x: startX, z: startZ, startX, startZ, endX, endZ, delay, span: .58, phase: random() * 6.28, rotation: (random() - .5) * .16, scale: .96 + random() * .1, faceYaw: 0, kind: kindFor(i) });
      }
      // Quân Thanh: square blocks (16 men) behind the palisade, later falling back to the river dike.
      const recordsB = [];
      for (let i = 0; i < countB; i++) {
        const block = Math.floor(i / 16); const col = block % 6; const row = Math.floor(block / 6);
        const file = i % 4; const rank = Math.floor(i / 4) % 4;
        const ox = (file - 1.5) * 1.7; const oz = (rank - 1.5) * 1.7;
        const startX = -46 + col * 18 + ox; const startZ = -34 - row * 9 + oz;
        const endX = startX * .82 + (col - 2.5) * 2 + (random() - .5) * 3; const endZ = -50 - row * 2.2 + oz * .6 + (random() - .5) * 2;
        recordsB.push({ x: startX, z: startZ, startX, startZ, endX, endZ, delay: .3 + row * .02, span: .42, phase: random() * 6.28, rotation: (random() - .5) * .1, scale: .96 + random() * .08, faceYaw: Math.PI, kind: kindFor(i + 7) });
      }
      this.createGroup('sideA', 'troops', 'a', recordsA, countA);
      this.createGroup('sideB', 'troops', 'b', recordsB, countB);

      const props = (name, groupName, faction, kind, count, factory) => {
        const records = [];
        for (let i = 0; i < count; i++) records.push(Object.assign({ kind, phase: random() * 6.28, rotation: (random() - .5) * .3, scale: 1 }, factory(i)));
        return this.createGroup(name, groupName, faction, records, count);
      };
      props('elephants', 'elephants', 'a', 'elephant', 7, (i) => ({ x: -22 + i * 6.6, z: 40, startX: -22 + i * 6.6, startZ: 40 + (i % 2) * 3, endX: -24 + i * 8, endZ: -20 + (i % 2) * 4, delay: .04, span: .52, faceYaw: 0, rotation: 0 }));
      props('banners', 'banners', 'a', 'banner', 13, (i) => ({ x: -64 + i * 9.5, z: 70 + (i % 3) * 3, faceYaw: 0 }));
      props('bannersB', 'banners', 'b', 'banner', 8, (i) => ({ x: -40 + i * 12, z: -46 + (i % 2) * 2, faceYaw: Math.PI }));
      props('tents', 'tents', 'a', 'tent', 11, (i) => ({ x: -82 + (i % 6) * 13, z: 76 + Math.floor(i / 6) * 9, rotation: random() * 1.2 }));
      props('village', 'village', 'a', 'village', 9, (i) => ({ x: -104 + (i % 3) * 9 + (random() - .5) * 3, z: 50 + Math.floor(i / 3) * 9 + (random() - .5) * 2, rotation: (random() - .5) * .6 }));
      const bambooSpots = [];
      for (let i = 0; i < 18; i++) bambooSpots.push({ x: -112 + (i % 9) * 3.4 + (i > 8 ? 2 : 0), z: 82 - Math.floor(i / 9) * 38 });
      for (let i = 0; i < 26; i++) { const x = -112 + i * 9 + (random() - .5) * 3; bambooSpots.push({ x, z: T.riverZ(x) + 18 + (random() - .5) * 2.5 }); }
      for (let i = 0; i < 10; i++) bambooSpots.push({ x: 64 + (i % 5) * 4.5, z: 44 + Math.floor(i / 5) * 5 });
      props('bamboo', 'bamboo', 'a', 'bamboo', bambooSpots.length, (i) => ({ x: bambooSpots[i].x, z: bambooSpots[i].z, scale: .8 + random() * .45, rotation: random() * 6 }));
      props('palisade', 'palisade', 'b', 'palisade', 18, (i) => ({ x: -37 + i * 4.4, z: -24 + Math.sin(i * .5) * 3, scale: 1.45, rotation: Math.cos(i * .5) * -.33 }));
      props('watchtower', 'palisade', 'b', 'watchtower', 3, (i) => ({ x: -34 + i * 33, z: -31 + (i % 2) * 3, faceYaw: Math.PI, rotation: 0 }));
      props('torches', 'fire', 'b', 'torch', 8, (i) => ({ x: -46 + i * 12.5, z: -21 + (i % 2) * 2, rotation: 0 }));

      this.units.taySonSoldiers = this.meshGroups.sideA.records;
      this.units.qingSoldiers = this.meshGroups.sideB.records;
      this.units.taySonElephants = this.meshGroups.elephants.records;
      this.units.taySonFlank = this.meshGroups.sideA.records.filter((r, i) => Math.floor(i / 12) % 5 === 0 || Math.floor(i / 12) % 5 === 4);
      this.applyPropConfig(config.propsConfig || {});
    }

    buildArrows() {
      const groupCentroid = (records, filter, useEnd) => {
        let x = 0; let z = 0; let n = 0;
        records.forEach((r, i) => { if (!filter || filter(r, i)) { x += useEnd ? r.endX : r.startX; z += useEnd ? r.endZ : r.startZ; n++; } });
        return n ? [x / n, z / n] : [0, 0];
      };
      const a = this.meshGroups.sideA.records; const b = this.meshGroups.sideB.records;
      const col = (i) => Math.floor(i / 12) % 5;
      const specs = [
        { key: 'center', side: 'a', from: groupCentroid(a, (r, i) => col(i) > 0 && col(i) < 4), to: groupCentroid(a, (r, i) => col(i) > 0 && col(i) < 4, true), bend: 6, width: 1.4, start: .2, end: .78 },
        { key: 'left', side: 'a', from: groupCentroid(a, (r, i) => col(i) === 0), to: groupCentroid(a, (r, i) => col(i) === 0, true), bend: -14, width: 1.1, start: .2, end: .76 },
        { key: 'right', side: 'a', from: groupCentroid(a, (r, i) => col(i) === 4), to: groupCentroid(a, (r, i) => col(i) === 4, true), bend: 14, width: 1.1, start: .22, end: .78 },
        { key: 'elephants', side: 'a', from: [0, 46], to: [4, -14], bend: -4, width: 1.2, start: .24, end: .76, prop: 'elephants' },
        { key: 'retreat', side: 'b', from: groupCentroid(b), to: groupCentroid(b, null, true), bend: 8, width: 1.1, start: .5, end: .92 }
      ];
      this.arrows = specs.map((spec) => this.makeArrow(spec));
    }

    makeArrow(spec) {
      const [x0, z0] = spec.from; const [x1, z1] = spec.to;
      const dx = x1 - x0; const dz = z1 - z0; const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len; const nz = dx / len;
      const curve = new THREE.QuadraticBezierCurve(new THREE.Vector2(x0, z0), new THREE.Vector2((x0 + x1) / 2 + nx * spec.bend, (z0 + z1) / 2 + nz * spec.bend), new THREE.Vector2(x1 - dx / len * 3, z1 - dz / len * 3));
      const points = curve.getSpacedPoints(Math.max(24, Math.round(len)));
      const lift = .55;
      const ribbon = (width, dashed) => {
        const verts = []; const ends = []; let arc = 0;
        for (let i = 0; i < points.length - 1; i++) {
          const p = points[i]; const q = points[i + 1];
          const seg = p.distanceTo(q); const on = !dashed || (arc % 5.2) < 3.3; arc += seg;
          if (!on) continue;
          const tx = (q.x - p.x) / seg; const tz = (q.y - p.y) / seg; const ox = -tz * width / 2; const oz = tx * width / 2;
          const hp = this.field.heightAt(p.x, p.y) + lift; const hq = this.field.heightAt(q.x, q.y) + lift;
          const hpw = Math.max(hp, T.WATER_LEVEL + .3); const hqw = Math.max(hq, T.WATER_LEVEL + .3);
          verts.push(p.x + ox, hpw, p.y + oz, p.x - ox, hpw, p.y - oz, q.x + ox, hqw, q.y + oz, q.x - ox, hpw, p.y - oz, q.x - ox, hqw, q.y - oz, q.x + ox, hqw, q.y + oz);
          ends.push(arc);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        return { geometry: this.track(g), ends, total: arc };
      };
      const colorHex = spec.side === 'b' ? this.theme.arrowB : this.theme.arrowA;
      const mat = this.track(new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: .95, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      const outlineMat = this.track(new THREE.MeshBasicMaterial({ color: this.theme.ink, transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
      const body = ribbon(spec.width, true); const outline = ribbon(spec.width + 1.1, true);
      const bodyMesh = new THREE.Mesh(body.geometry, mat); const outlineMesh = new THREE.Mesh(outline.geometry, outlineMat);
      bodyMesh.renderOrder = 6; outlineMesh.renderOrder = 5;
      const headShape = new THREE.Shape(); headShape.moveTo(0, -spec.width * 2.6); headShape.lineTo(spec.width * 1.9, spec.width * .8); headShape.lineTo(-spec.width * 1.9, spec.width * .8); headShape.closePath();
      const headGeometry = this.track(new THREE.ShapeGeometry(headShape)); headGeometry.rotateX(Math.PI / 2);
      const head = new THREE.Mesh(headGeometry, mat); head.renderOrder = 7;
      const headOutline = new THREE.Mesh(headGeometry, outlineMat); headOutline.scale.setScalar(1.35); headOutline.renderOrder = 5; head.add(headOutline); headOutline.position.y = -.05;
      const group = new THREE.Group(); group.add(outlineMesh, bodyMesh, head); this.scene.add(group);
      return { spec, group, body, outline, bodyMesh, outlineMesh, head, points, mat };
    }

    updateArrows(time) {
      (this.arrows || []).forEach((arrow) => {
        const { spec } = arrow;
        const visible = !spec.prop || this.propsGroups[spec.prop].visible !== false;
        arrow.group.visible = visible;
        if (!visible) return;
        const fraction = .22 + .78 * smoothstep(spec.start, spec.end, time);
        const reveal = (part, mesh) => {
          const limit = part.total * fraction; let quads = 0;
          while (quads < part.ends.length && part.ends[quads] <= limit) quads++;
          mesh.geometry.setDrawRange(0, quads * 6);
        };
        reveal(arrow.body, arrow.bodyMesh); reveal(arrow.outline, arrow.outlineMesh);
        const idx = Math.min(arrow.points.length - 1, Math.max(1, Math.round(fraction * (arrow.points.length - 1))));
        const p = arrow.points[idx]; const q = arrow.points[idx - 1];
        arrow.head.position.set(p.x, Math.max(this.field.heightAt(p.x, p.y), T.WATER_LEVEL) + .7, p.y);
        arrow.head.rotation.y = Math.atan2(-(p.x - q.x), -(p.y - q.y));
      });
    }

    buildParticles() {
      const sprite = this.track(canvasTexture(T.particleTexture()));
      const make = (count, color, blending) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
        const material = new THREE.ShaderMaterial({
          transparent: true, depthWrite: false, blending,
          uniforms: { uMap: { value: sprite }, uColor: { value: new THREE.Color(color) }, uScale: { value: 400 } },
          vertexShader: 'attribute float size; attribute float alpha; varying float vAlpha; uniform float uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / max(1.0, -mv.z); vAlpha = alpha; gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform sampler2D uMap; uniform vec3 uColor; varying float vAlpha; void main(){ float a = texture2D(uMap, gl_PointCoord).a * vAlpha; if (a < .01) discard; gl_FragColor = vec4(uColor, a); }'
        });
        const points = new THREE.Points(this.track(geometry), this.track(material));
        points.frustumCulled = false; points.renderOrder = 8; this.scene.add(points);
        const state = []; for (let i = 0; i < count; i++) state.push({ life: 0, age: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0 });
        return { points, geometry, material, state, count, active: count };
      };
      this.fire = make(160, this.theme.fire, THREE.AdditiveBlending);
      this.smoke = make(160, this.theme.smoke, THREE.NormalBlending);
      this.particleRandom = T.seededRandom(99);
    }

    emitters(time) {
      const list = [];
      if (this.propsGroups.fire.visible !== false) this.meshGroups.torches.records.forEach((r) => list.push({ x: r.x, z: r.z, y: this.field.heightAt(r.x, r.z) + 2.6, w: .35, spread: .3 }));
      const battle = smoothstep(.36, .55, time) * (1 - smoothstep(.97, 1, time) * .4);
      if (battle > 0) {
        for (let i = 0; i < 6; i++) { const x = -34 + i * 14; const z = -24 + Math.sin(i) * 3; list.push({ x, z, y: this.field.heightAt(x, z) + 1, w: battle, spread: 3 }); }
        if (time > .62 && this.propsGroups.palisade.visible !== false) this.meshGroups.watchtower.records.forEach((r) => list.push({ x: r.x, z: r.z, y: this.field.heightAt(r.x, r.z) + 6, w: smoothstep(.62, .8, time), spread: 1.5 }));
      }
      return list;
    }

    updateParticles(delta) {
      const emitters = this.emitters(this.currentTime);
      const total = emitters.reduce((sum, e) => sum + e.w, 0);
      const random = this.particleRandom;
      const pick = () => { let r = random() * total; for (let i = 0; i < emitters.length; i++) { r -= emitters[i].w; if (r <= 0) return emitters[i]; } return emitters[emitters.length - 1]; };
      [[this.fire, true], [this.smoke, false]].forEach(([sys, isFire]) => {
        const pos = sys.geometry.attributes.position.array; const size = sys.geometry.attributes.size.array; const alpha = sys.geometry.attributes.alpha.array;
        for (let i = 0; i < sys.count; i++) {
          const p = sys.state[i];
          p.age += delta;
          if (p.age >= p.life) {
            if (i >= sys.active || !total || random() > .6) { alpha[i] = 0; p.life = .2 + random() * .5; p.age = 0; p.y = -999; pos[i * 3 + 1] = -999; continue; }
            const e = pick();
            p.x = e.x + (random() - .5) * e.spread * 2; p.z = e.z + (random() - .5) * e.spread * 2; p.y = e.y;
            p.vx = (random() - .5) * .6 + (isFire ? 0 : .9); p.vz = (random() - .5) * .6; p.vy = isFire ? 2.6 + random() * 2 : 1.6 + random() * 1.2;
            p.life = isFire ? .45 + random() * .45 : 2.4 + random() * 1.8; p.age = 0;
          }
          const t = p.age / p.life;
          p.x += p.vx * delta; p.y += p.vy * delta; p.z += p.vz * delta;
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          size[i] = isFire ? 2.4 * (1 - t) + .5 : 2 + t * 6.5;
          alpha[i] = isFire ? (1 - t) * .9 : Math.sin(t * Math.PI) * .28;
        }
        sys.geometry.attributes.position.needsUpdate = true; sys.geometry.attributes.size.needsUpdate = true; sys.geometry.attributes.alpha.needsUpdate = true;
      });
    }

    /* ---------- Stage 4: HTML overlays (plaque, legend scroll, paper labels) ---------- */

    buildOverlays() {
      const lesson = this.options.lessonConfig || {};
      const names = lesson.simulation && lesson.simulation.factionNames || {};
      this.factionNames = { a: nfc(names.a || names.taySon || 'Phe A'), b: nfc(names.b || names.qing || 'Phe B') };
      const root = document.createElement('div'); root.className = 'diorama-overlay';
      root.innerHTML = '<div class="diorama-vignette"></div>';
      // Plaque title.
      const rawTitle = nfc(lesson.title || 'Sa bàn lịch sử');
      const match = rawTitle.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
      const title = match ? match[1] : rawTitle;
      const year = nfc(match ? match[2] : (lesson.year || ''));
      this.plaqueEl = document.createElement('div'); this.plaqueEl.className = 'diorama-plaque';
      this.plaqueEl.innerHTML = '<span class="diorama-plaque__title"></span><span class="diorama-plaque__year"></span>';
      this.plaqueEl.children[0].textContent = title; this.plaqueEl.children[1].textContent = year;
      if (!year) this.plaqueEl.children[1].remove();
      root.appendChild(this.plaqueEl);
      // Legend scroll (always visible).
      this.legendEl = document.createElement('div'); this.legendEl.className = 'diorama-legend'; this.legendEl.setAttribute('role', 'note'); this.legendEl.setAttribute('aria-label', 'Chú giải sa bàn');
      root.appendChild(this.legendEl);
      this.renderLegend();
      // Paper labels.
      const place = (text, x, z) => ({ text, kind: 'place', priority: 2, anchor: () => this.tmp.set(x, Math.max(this.field.heightAt(x, z), T.WATER_LEVEL) + 1, z) });
      const unit = (text, groupName, side, priority, visibleKey) => ({ text, kind: 'unit', side, priority, anchor: () => {
        const group = this.meshGroups[groupName];
        if (!group || !group.liveCount || (visibleKey && this.propsGroups[visibleKey].visible === false)) return null;
        return this.tmp.set(group.centroid.x, group.centroid.y + (groupName === 'elephants' ? 9 : 5), group.centroid.z);
      } });
      const definitions = [
        unit(this.factionNames.a, 'sideA', 'a', 0), unit(this.factionNames.b, 'sideB', 'b', 0),
        unit('Voi chiến', 'elephants', 'a', 1, 'elephants'),
        Object.assign(unit('Đồn lũy', 'watchtower', 'b', 1, 'palisade'), { kind: 'place' }),
        place('Vùng bố trí', 0, -27), place('Địa hình trũng', 74, 18), place('Dải nước', -82, T.riverZ(-82))
      ];
      definitions.forEach((definition) => {
        const element = document.createElement('div');
        element.className = `diorama-label diorama-label--${definition.kind}${definition.side ? ` diorama-label--${definition.side}` : ''}`;
        element.textContent = nfc(definition.text);
        root.appendChild(element);
        this.labels.push(Object.assign(definition, { element, width: 0, height: 0, shown: false }));
      });
      this.costumeNote = document.createElement('span');
      this.costumeNote.className = 'lesson-scene-caveat diorama-caveat';
      this.costumeNote.textContent = nfc('Trang phục và màu sắc chỉ là minh họa, chờ chuyên gia thẩm định');
      root.appendChild(this.costumeNote);
      this.container.appendChild(root);
      this.overlayRoot = root;
      this.measureLabels();
    }

    renderLegend() {
      if (!this.legendEl) return;
      const row = (icon, text) => `<li>${icon}<span>${text}</span></li>`;
      const escape = (text) => String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
      this.legendEl.innerHTML = `<div class="diorama-legend__title">Chú giải</div><ul>${
        row(ICON.pennant(this.factionColors.taySon), escape(this.factionNames.a))
      }${row(ICON.square(this.factionColors.qing), escape(this.factionNames.b))}${row(ICON.arrow, 'Hướng tiến quân')}${row(ICON.compass, 'Mũi đỏ chỉ hướng Bắc')}</ul>`;
    }

    measureLabels() {
      this.labels.forEach((label) => {
        label.element.style.visibility = 'hidden'; label.element.classList.add('is-measuring');
        label.width = label.element.offsetWidth; label.height = label.element.offsetHeight;
        label.element.classList.remove('is-measuring'); label.element.style.visibility = '';
      });
      const width = this.container.clientWidth;
      this.container.classList.toggle('diorama-compact', width < 560);
      this.measureInsets();
    }

    /** Space covered by the host page's HUD (top) and control strip (bottom), in px. */
    measureInsets() {
      const box = this.container.parentElement;
      const height = this.container.clientHeight || 1;
      let top = 0; let bottom = 0;
      if (box) {
        const hud = box.querySelector('.player-hud-overlay');
        const controls = box.querySelector('.player-controls-bottom, .lesson-player-controls');
        if (hud) top = Math.min(height * .25, hud.offsetHeight + 18);
        if (controls && controls.offsetHeight) bottom = Math.min(height * .62, controls.offsetHeight + 12);
      }
      this.insets = { top, bottom };
      this.container.style.setProperty('--diorama-inset-top', `${Math.round(top)}px`);
      this.container.style.setProperty('--diorama-inset-bottom', `${Math.round(bottom)}px`);
      this.applyViewOffset();
    }

    viewFraction() {
      const height = this.container.clientHeight || 1;
      const insets = this.insets || { top: 0, bottom: 0 };
      return Math.max(.3, (height - insets.top - insets.bottom) / height);
    }

    applyViewOffset() {
      const width = this.container.clientWidth; const height = this.container.clientHeight;
      if (!this.camera || !width || !height) return;
      const insets = this.insets || { top: 0, bottom: 0 };
      const shift = Math.round((insets.bottom - insets.top) / 2);
      if (shift) this.camera.setViewOffset(width, height, 0, shift, width, height); else this.camera.clearViewOffset();
    }

    project(vector) {
      const p = vector.clone().project(this.camera);
      return { x: (p.x * .5 + .5) * this.container.clientWidth, y: (-p.y * .5 + .5) * this.container.clientHeight, behind: p.z > 1 };
    }

    updateLabels() {
      const width = this.container.clientWidth; const height = this.container.clientHeight;
      if (!width || !height) return;
      const maxLabels = width < 480 ? 3 : width < 820 ? 5 : 7;
      const placed = [];
      const insets = this.insets || { top: 0, bottom: 0 };
      const reserved = [{ x: 0, y: 0, w: width, h: insets.top }, { x: 0, y: height - insets.bottom, w: width, h: insets.bottom }];
      if (this.legendEl) reserved.push({ x: this.legendEl.offsetLeft, y: this.legendEl.offsetTop, w: this.legendEl.offsetWidth, h: this.legendEl.offsetHeight });
      const overlaps = (r) => placed.concat(reserved).some((o) => r.x < o.x + o.w + 4 && r.x + r.w + 4 > o.x && r.y < o.y + o.h + 4 && r.y + r.h + 4 > o.y);
      const order = this.labels.slice().sort((a, b) => a.priority - b.priority);
      order.forEach((label) => {
        const anchor = label.anchor();
        let show = false;
        if (anchor && placed.length < maxLabels) {
          const p = this.project(anchor);
          const rect = { x: p.x - label.width / 2, y: p.y - label.height - 9, w: label.width, h: label.height };
          if (!p.behind && rect.x > 4 && rect.x + rect.w < width - 4 && rect.y > 4 && !overlaps(rect)) {
            show = true; placed.push(rect);
            label.element.style.transform = `translate3d(${Math.round(rect.x)}px, ${Math.round(rect.y)}px, 0)`;
          }
        }
        if (show !== label.shown) { label.element.classList.toggle('is-visible', show); label.shown = show; }
      });
      // Plaque follows the bronze plate; hidden when seen edge-on (top view) or too small.
      const halfWidth = 46;
      const left = this.project(this.tmp.set(-halfWidth, this.plaque.position.y, this.plaque.position.z));
      const right = this.project(this.tmp.set(halfWidth, this.plaque.position.y, this.plaque.position.z));
      const center = this.project(this.tmp.set(0, this.plaque.position.y, this.plaque.position.z + .8));
      const span = right.x - left.x;
      const facing = this.camera.position.y - this.target.y < 2.4 * Math.hypot(this.camera.position.x - this.target.x, this.camera.position.z - this.target.z) + 1;
      const showPlaque = span > 120 && facing && !center.behind && center.y > 30;
      this.plaqueEl.classList.toggle('is-visible', showPlaque);
      if (showPlaque) {
        this.plaqueEl.style.width = `${Math.round(span * .8)}px`;
        this.plaqueEl.style.fontSize = `${Math.max(9, Math.min(24, span * .034)).toFixed(1)}px`;
        this.plaqueEl.style.transform = `translate3d(${Math.round(center.x - span * .4)}px, ${Math.round(center.y)}px, 0) translateY(-50%)`;
      }
    }

    /* ---------- Camera ---------- */

    fitDistance(spanX, spanZ, elevation, fov) {
      const half = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
      const fraction = this.viewFraction();
      const byWidth = (spanX / 2) / (half * this.aspect);
      const byDepth = (spanZ * Math.sin(elevation) / 2 + 12) / (half * fraction);
      return Math.max(byWidth, byDepth) * 1.06;
    }

    presetPose(name) {
      const deg = THREE.MathUtils.degToRad;
      const pose = (target, elevation, azimuth, spanX, spanZ, fov) => {
        const e = deg(elevation); const a = deg(azimuth); const d = this.fitDistance(spanX, spanZ, e, fov);
        return { target, position: new THREE.Vector3(target.x + Math.sin(a) * Math.cos(e) * d, target.y + Math.sin(e) * d, target.z + Math.cos(a) * Math.cos(e) * d), fov, ortho: false };
      };
      if (name === 'follow_troops') {
        const c = this.meshGroups.sideA ? this.meshGroups.sideA.centroid.clone() : new THREE.Vector3(-8, 0, 20);
        return pose(c, 40, -24, 120, 96, 32);
      }
      if (name === 'close_up') return pose(new THREE.Vector3(-4, 2, -22), 32, 16, 78, 60, 32);
      if (name === 'top_down') return { target: new THREE.Vector3(0, 0, 0), position: new THREE.Vector3(0, 420, .01), ortho: true };
      return pose(new THREE.Vector3(0, 0, 4), 47, 0, TABLE.width + FRAME_W * 2 + 6, TABLE.depth + FRAME_W * 2 + 8, 30);
    }

    makeOrtho() {
      const viewHeight = Math.max((TABLE.depth + FRAME_W * 2 + 14) / this.viewFraction(), (TABLE.width + FRAME_W * 2 + 14) / this.aspect);
      return new THREE.OrthographicCamera(-viewHeight * this.aspect / 2, viewHeight * this.aspect / 2, viewHeight / 2, -viewHeight / 2, 1, 2000);
    }

    setCameraPreset(name, instant) {
      const aliases = { 'Toàn cảnh': 'overview', overview_map: 'overview', 'Toàn cảnh sa bàn': 'overview', 'Theo quân': 'follow_troops', 'Cận cảnh': 'close_up', 'Từ trên': 'top_down', 'Trên cao': 'top_down', overview: 'overview', follow_troops: 'follow_troops', close_up: 'close_up', top_down: 'top_down' };
      const key = aliases[name] || 'overview';
      const pose = this.presetPose(key);
      if (pose.ortho && !(this.camera instanceof THREE.OrthographicCamera)) {
        const old = this.camera; this.camera = this.makeOrtho(); this.camera.position.copy(old.position);
      } else if (!pose.ortho && this.camera instanceof THREE.OrthographicCamera) {
        const old = this.camera; this.camera = new THREE.PerspectiveCamera(pose.fov, this.aspect, 1, 2000); this.camera.position.copy(old.position);
      }
      if (!pose.ortho) this.camera.fov = pose.fov;
      this.applyViewOffset();
      this.camera.updateProjectionMatrix();
      this.isCinematicOrbit = false;
      this.activePreset = name;
      this.activeKey = key;
      this.userMoved = false;
      const duration = instant || this.reducedMotion ? 0 : 1300;
      this.cameraTransition = { started: performance.now(), duration, startPosition: this.camera.position.clone(), endPosition: pose.position, startTarget: this.target.clone(), endTarget: pose.target };
      if (!duration) this.finishTransition();
    }

    finishTransition() {
      this.camera.position.copy(this.cameraTransition.endPosition);
      this.target.copy(this.cameraTransition.endTarget);
      this.cameraTransition = null;
    }

    bindMapCamera() {
      const canvas = this.renderer.domElement;
      this.pointer = null;
      this.onPointerDown = (event) => { this.pointer = { x: event.clientX, y: event.clientY }; if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId); };
      this.onPointerUp = () => { this.pointer = null; };
      this.onPointerMove = (event) => {
        if (!this.pointer) return;
        const scale = this.camera.position.distanceTo(this.target) / 900;
        const dx = (event.clientX - this.pointer.x) * scale; const dz = (event.clientY - this.pointer.y) * scale;
        const nx = Math.max(-130, Math.min(130, this.target.x - dx)); const nz = Math.max(-100, Math.min(100, this.target.z - dz));
        this.camera.position.x += nx - this.target.x; this.camera.position.z += nz - this.target.z;
        this.target.x = nx; this.target.z = nz;
        this.pointer = { x: event.clientX, y: event.clientY }; this.userMoved = true; this.cameraTransition = null;
      };
      this.onWheel = (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 1.08 : .92;
        if (this.camera instanceof THREE.OrthographicCamera) { this.camera.zoom = Math.max(.6, Math.min(4, this.camera.zoom / factor)); this.camera.updateProjectionMatrix(); return; }
        const offset = this.camera.position.clone().sub(this.target);
        const distance = Math.max(45, Math.min(720, offset.length() * factor));
        this.camera.position.copy(this.target).add(offset.setLength(distance));
        this.userMoved = true; this.cameraTransition = null;
      };
      canvas.addEventListener('pointerdown', this.onPointerDown);
      canvas.addEventListener('pointerup', this.onPointerUp);
      canvas.addEventListener('pointercancel', this.onPointerUp);
      canvas.addEventListener('pointermove', this.onPointerMove);
      canvas.addEventListener('wheel', this.onWheel, { passive: false });
    }

    toggleCinematicOrbit() { this.isCinematicOrbit = !this.isCinematicOrbit; return this.isCinematicOrbit; }

    /* ---------- Timeline and public API (unchanged contract) ---------- */

    updateTimeline(progress) {
      this.currentTime = clamp01(Number(progress) || 0);
      const time = this.currentTime;
      const keyframes = this.options.lessonConfig && this.options.lessonConfig.simulation && this.options.lessonConfig.simulation.keyframes || [];
      const keyframe = keyframes.filter((frame) => time >= Number(frame.time || 0)).pop();
      if (keyframe && keyframe.preset && keyframe.preset !== this.activePreset && time > 0) this.setCameraPreset(keyframe.preset);
      Object.keys(this.meshGroups).forEach((key) => { const group = this.meshGroups[key]; if (group.dynamic) this.layoutGroup(group, time); });
      this.updateArrows(time);
      if (this.options.onProgressUpdate) this.options.onProgressUpdate(this.currentTime);
    }

    updatePropsVisibility(config) {
      Object.keys(config || {}).forEach((key) => { if (this.propsGroups[key]) this.propsGroups[key].visible = !!config[key]; });
      this.applyPropConfig(config || {});
    }

    applyPropConfig(config) {
      const map = { elephants: ['elephants'], banners: ['banners', 'bannersB'], tents: ['tents'], palisade: ['palisade', 'watchtower'], fire: ['torches'], village: ['village'], bamboo: ['bamboo'] };
      Object.keys(map).forEach((prop) => {
        if (config[prop] !== undefined && this.propsGroups[prop]) this.propsGroups[prop].visible = config[prop] !== false;
        map[prop].forEach((name) => {
          const group = this.meshGroups[name];
          if (!group) return;
          group.visible = config[prop] !== false;
          group.batches.forEach((batch) => { batch.mesh.visible = group.visible; });
          group.liveCount = group.visible ? group.liveCount : 0;
          if (group.visible) this.layoutGroup(group, this.currentTime);
        });
      });
      if (config.river !== undefined) { this.propsGroups.river.visible = config.river !== false; if (this.water) this.water.visible = config.river !== false; }
      if (this.arrows) this.updateArrows(this.currentTime);
    }

    updateFactionColors(colors) {
      if (colors.taySon) this.factionColors.taySon = colors.taySon;
      if (colors.qing) this.factionColors.qing = colors.qing;
      Object.keys(this.meshGroups).forEach((key) => {
        const group = this.meshGroups[key];
        group.batches.forEach((batch) => M.recolor(batch.geometry, this.paletteFor(group.faction)));
      });
      this.renderLegend();
    }

    updateUnitCounts(counts) {
      const setCount = (key, value, factor, maximum) => {
        const group = this.meshGroups[key];
        if (!group || value == null) return;
        const visible = Math.min(group.baseCount, Math.max(0, Math.round(Number(value) * factor)));
        group.visibleCount = Math.min(visible, maximum || visible);
        this.applyCount(group); this.layoutGroup(group, this.currentTime);
      };
      setCount('sideA', counts.taySonInfantry, 3, 230);
      setCount('sideB', counts.qingInfantry, 3, 200);
      if (counts.taySonInfantry != null) this.displayCounts.sideA = this.meshGroups.sideA.visibleCount;
      if (counts.qingInfantry != null) this.displayCounts.sideB = this.meshGroups.sideB.visibleCount;
    }

    setQuality(quality) {
      this.options.quality = quality;
      const low = quality === 'low';
      this.renderer.setPixelRatio(this.pixelRatioFor(quality));
      const shadows = !low;
      if (this.renderer.shadowMap.enabled !== shadows) {
        this.renderer.shadowMap.enabled = shadows;
        this.scene.traverse((object) => { const m = object.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.needsUpdate = true; }); });
      }
      this.sun.castShadow = shadows;
      const size = low ? 1024 : 2048;
      if (this.sun.shadow.mapSize.x !== size) { this.sun.shadow.mapSize.set(size, size); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
      if (this.fire) { this.fire.active = low ? 50 : this.fire.count; this.smoke.active = low ? 40 : this.smoke.count; }
      [['sideA', 90], ['sideB', 75]].forEach(([name, lowLimit]) => {
        const group = this.meshGroups[name];
        if (!group) return;
        group.visibleCount = Math.min(this.displayCounts[name] || group.baseCount, low ? lowLimit : group.baseCount);
        this.applyCount(group); this.layoutGroup(group, this.currentTime);
      });
      this.renderer.setSize(this.container.clientWidth || 640, this.container.clientHeight || 360);
      this.updateParticleScale();
    }

    play() { this.isPlaying = true; }
    pause() { this.isPlaying = false; }
    seek(progress) { this.updateTimeline(progress); }
    setSpeed(speed) { this.playbackSpeed = Number(speed) || 1; }

    updateParticleScale() {
      if (!this.fire) return;
      const height = this.renderer.domElement.height || 400;
      const fov = this.camera.fov || 30;
      const scale = this.camera instanceof THREE.OrthographicCamera ? height / 2.2 : height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
      this.fire.material.uniforms.uScale.value = scale; this.smoke.material.uniforms.uScale.value = scale;
    }

    animate() {
      if (this.destroyed) return;
      this.animationFrameId = requestAnimationFrame(this.animate);
      const now = performance.now();
      const delta = Math.min(.05, (now - this.lastTimestamp) / 1000);
      this.lastTimestamp = now;
      if (this.isPlaying) {
        this.updateTimeline(this.currentTime + delta / this.durationSeconds * this.playbackSpeed);
        if (this.currentTime >= 1) this.pause();
      }
      if (!this.isVisible) return;
      if (this.cameraTransition) {
        const raw = Math.min(1, (now - this.cameraTransition.started) / this.cameraTransition.duration);
        const eased = raw * raw * (3 - 2 * raw);
        this.camera.position.lerpVectors(this.cameraTransition.startPosition, this.cameraTransition.endPosition, eased);
        this.target.lerpVectors(this.cameraTransition.startTarget, this.cameraTransition.endTarget, eased);
        if (raw >= 1) this.cameraTransition = null;
      } else if (this.activeKey === 'follow_troops' && !this.userMoved && this.meshGroups.sideA) {
        const c = this.meshGroups.sideA.centroid;
        const dx = (c.x - this.target.x) * Math.min(1, delta * 2.5); const dz = (c.z - this.target.z) * Math.min(1, delta * 2.5);
        this.target.x += dx; this.target.z += dz; this.camera.position.x += dx; this.camera.position.z += dz;
      }
      if (this.isCinematicOrbit && !this.reducedMotion && !(this.camera instanceof THREE.OrthographicCamera)) {
        this.orbitAngle = delta * .09;
        const offset = this.camera.position.clone().sub(this.target);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.orbitAngle);
        this.camera.position.copy(this.target).add(offset);
      }
      const animated = !this.reducedMotion;
      if (animated && this.options.quality !== 'low') this.waterMaterial.uniforms.uTime.value = now / 1000;
      if (animated || !this.particlesSeeded) { this.updateParticles(animated ? delta : .6); this.particlesSeeded = true; }
      this.camera.lookAt(this.target);
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera || this.destroyed) return;
      const width = this.container.clientWidth; const height = this.container.clientHeight;
      if (!width || !height) return;
      this.aspect = width / height;
      if (this.camera instanceof THREE.OrthographicCamera) {
        const fresh = this.makeOrtho();
        Object.assign(this.camera, { left: fresh.left, right: fresh.right, top: fresh.top, bottom: fresh.bottom });
      } else {
        this.camera.aspect = this.aspect;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.updateParticleScale();
      this.measureLabels();
      if (!this.userMoved && !this.cameraTransition && this.activeKey && this.activeKey !== 'follow_troops') {
        const pose = this.presetPose(this.activeKey);
        this.camera.position.copy(pose.position); this.target.copy(pose.target);
      }
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      cancelAnimationFrame(this.animationFrameId);
      window.removeEventListener('resize', this.onResizeBound);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.visibilityObserver) this.visibilityObserver.disconnect();
      const canvas = this.renderer.domElement;
      canvas.removeEventListener('pointerdown', this.onPointerDown); canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerUp); canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('wheel', this.onWheel);
      if (this.overlayRoot) this.overlayRoot.remove();
      this.container.classList.remove('diorama-host', 'diorama-compact');
      this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        const m = object.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
        if (object.isInstancedMesh && object.dispose) object.dispose();
      });
      this.disposables.forEach((resource) => { if (resource && resource.dispose) resource.dispose(); });
      if (this.sun && this.sun.shadow.map) this.sun.shadow.map.dispose();
      this.renderer.dispose();
      if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
      canvas.remove();
    }

    static paintMapThumbnail(canvas) {
      if (!canvas) return;
      canvas.width = 480; canvas.height = 372;
      T.paintTerrain(canvas, T.buildHeightField(120, 93), palette());
    }
  }

  window.BattleScene3D = DioramaScene;
})(window, document);
