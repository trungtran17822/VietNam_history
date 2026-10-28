/* Painted 2.5D tabletop map renderer. Reads its palette from css/theme.css. */
(function (window, document) {
  'use strict';

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    return {
      silk: read('--silk-ivory', '#EFE5CD'),
      light: read('--silk-light', '#F6EEDB'),
      mist: read('--mist', '#D9D3C1'),
      ink: read('--ink', '#2B2926'),
      sepia: read('--sepia', '#7A5C3E'),
      ochre: read('--ochre', '#B79B5E'),
      celadon: read('--celadon-grey', '#7C8F7A'),
      green: read('--deep-green', '#4F6355'),
      indigo: read('--muted-indigo', '#3E5C76'),
      water: read('--water-grey-blue', '#9DB0B3'),
      red: read('--vermilion', '#A8412F'),
      washes: [read('--scene-wash-celadon', '#9EAA8D'), read('--scene-wash-green', '#AAB19A'), read('--scene-wash-ochre', '#B89D76'), read('--scene-wash-earth', '#B9A47A')],
      mountains: [read('--water-grey-blue', '#9DB0B3'), read('--scene-mountain-soft', '#B5B9AB'), read('--scene-mountain-light', '#C6C4B4'), read('--scene-mountain-pale', '#D5CEBC')],
      waterGlint: read('--scene-water-glint', '#E6E0D0'),
      paddy: [read('--scene-paddy-green', '#87927A'), read('--scene-paddy-ochre', '#B59E6D')],
      track: read('--scene-track', '#B19B7C'),
      skin: read('--scene-skin-placeholder', '#C7A47D'),
      headwear: [read('--scene-headwear-placeholder', '#C7B890'), read('--scene-headwear-dark', '#A89573')],
      sideA: [read('--vermilion', '#A8412F'), read('--scene-side-a-muted', '#B65F4F'), read('--scene-side-a-light', '#C08169'), read('--scene-side-a-dark', '#884F43')],
      sideB: [read('--muted-indigo', '#3E5C76'), read('--scene-side-b-muted', '#536C80'), read('--scene-side-b-light', '#70808A'), read('--scene-side-b-dark', '#46596A')],
      elephant: read('--scene-elephant', '#858879'),
      elephantLight: read('--scene-elephant-light', '#909184'),
      shellHighlight: read('--scene-shell-highlight', '#E5D9C3'),
      roof: read('--scene-roof', '#9A8064'),
      structure: read('--scene-structure', '#75634D')
    };
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function makeMapArtwork(target, colors, seed) {
    const canvas = target || document.createElement('canvas');
    const width = canvas.width = 1800;
    const height = canvas.height = 1400;
    const context = canvas.getContext('2d');
    const random = seededRandom(seed || 1789);
    context.fillStyle = colors.silk;
    context.fillRect(0, 0, width, height);

    const wash = (x, y, radius, color, alpha) => {
      const gradient = context.createRadialGradient(x, y, radius * .12, x, y, radius);
      gradient.addColorStop(0, `${color}${alpha}`);
      gradient.addColorStop(.72, `${color}55`);
      gradient.addColorStop(1, `${color}00`);
      context.fillStyle = gradient;
      context.beginPath();
      context.ellipse(x, y, radius * 1.3, radius * .75, random() * .5, 0, Math.PI * 2);
      context.fill();
    };

    wash(310, 830, 420, colors.washes[0], '66');
    wash(1310, 890, 470, colors.washes[1], '70');
    wash(910, 610, 520, colors.washes[2], '45');
    wash(860, 1170, 330, colors.washes[3], '46');

    // Distant mountain washes recede into the silk horizon.
    for (let layer = 0; layer < 4; layer++) {
      const baseline = 250 + layer * 72;
      context.beginPath();
      context.moveTo(0, baseline + 150);
      for (let x = 0; x <= width; x += 16) {
        const ridge = Math.sin(x * .009 + layer * 1.8) * (48 - layer * 6) + Math.sin(x * .022 + layer) * 17;
        context.lineTo(x, baseline + ridge);
      }
      context.lineTo(width, baseline + 250);
      context.lineTo(0, baseline + 250);
      context.closePath();
      context.fillStyle = colors.mountains[layer];
      context.globalAlpha = [.38, .32, .25, .18][layer];
      context.fill();
      context.globalAlpha = 1;
    }

    // Waterways and their broken, pale brush glints.
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(20, 520);
    context.bezierCurveTo(470, 560, 650, 400, 1000, 480);
    context.bezierCurveTo(1280, 555, 1460, 420, 1790, 505);
    context.strokeStyle = colors.water;
    context.globalAlpha = .68;
    context.lineWidth = 94;
    context.stroke();
    context.globalAlpha = .38;
    context.lineWidth = 46;
    context.strokeStyle = colors.waterGlint;
    context.stroke();
    context.globalAlpha = .48;
    context.lineWidth = 3;
    for (let line = 0; line < 28; line++) {
      const y = 470 + random() * 75;
      context.beginPath();
      context.moveTo(random() * width, y);
      context.quadraticCurveTo(random() * width, y + (random() - .5) * 14, random() * width, y + (random() - .5) * 12);
      context.stroke();
    }
    context.restore();

    // Soft, irregular rice-paddy washes with broken ink edges.
    for (let index = 0; index < 58; index++) {
      const x = 35 + random() * (width - 70);
      const y = 610 + random() * 720;
      const rx = 35 + random() * 115;
      const ry = 17 + random() * 48;
      context.save();
      context.translate(x, y);
      context.rotate((random() - .5) * .5);
      context.beginPath();
      for (let point = 0; point <= 24; point++) {
        const angle = point / 24 * Math.PI * 2;
        const wobble = .84 + random() * .22;
        const px = Math.cos(angle) * rx * wobble;
        const py = Math.sin(angle) * ry * wobble;
        if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.closePath();
      context.fillStyle = colors.paddy[random() > .5 ? 0 : 1];
      context.globalAlpha = .16 + random() * .12;
      context.fill();
      context.globalAlpha = .3;
      context.lineWidth = 2 + random() * 2;
      context.strokeStyle = colors.sepia;
      context.stroke();
      context.restore();
    }

    // Earth tracks and dikes are painted strokes, not raised geometry.
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const paths = [
      [[895, 1360], [850, 1120], [930, 930], [870, 760], [920, 580]],
      [[1510, 1030], [1330, 920], [1120, 780], [950, 690]],
      [[390, 1050], [560, 960], [740, 930], [870, 780]]
    ];
    paths.forEach((points, index) => {
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach((point, pointIndex) => context.quadraticCurveTo(points[pointIndex][0], points[pointIndex][1], point[0], point[1]));
      context.strokeStyle = index ? colors.track : colors.sepia;
      context.globalAlpha = index ? .42 : .5;
      context.lineWidth = index ? 12 : 20;
      context.stroke();
      context.globalAlpha = .25;
      context.lineWidth = 2;
      context.strokeStyle = colors.light;
      context.stroke();
    });
    context.restore();

    // Small ink-roof village marks and bamboo brush clusters.
    for (let house = 0; house < 17; house++) {
      const x = 170 + random() * 440;
      const y = 930 + random() * 340;
      context.save();
      context.translate(x, y);
      context.rotate((random() - .5) * .3);
      context.fillStyle = colors.sepia;
      context.globalAlpha = .72;
      context.beginPath();
      context.moveTo(-15, 2); context.lineTo(0, -10); context.lineTo(17, 2); context.lineTo(12, 4); context.lineTo(0, -5); context.lineTo(-11, 5); context.closePath();
      context.fill();
      context.fillStyle = colors.ink;
      context.globalAlpha = .45;
      context.fillRect(-10, 4, 20, 8);
      context.restore();
    }
    for (let grove = 0; grove < 36; grove++) {
      const x = 60 + random() * 1680;
      const y = 720 + random() * 640;
      context.strokeStyle = random() > .5 ? colors.green : colors.ink;
      context.globalAlpha = .27;
      context.lineWidth = 2 + random() * 2;
      context.beginPath();
      context.moveTo(x, y + 22);
      context.quadraticCurveTo(x + (random() - .5) * 18, y, x + (random() - .5) * 38, y - 25);
      context.moveTo(x + 4, y + 18);
      context.quadraticCurveTo(x - 18, y + 3, x - 25, y - 8);
      context.stroke();
    }

    // Warm ink advance strokes and spaced arrowheads.
    context.save();
    context.strokeStyle = colors.red;
    context.globalAlpha = .66;
    context.lineWidth = 7;
    context.setLineDash([26, 13]);
    context.beginPath();
    context.moveTo(895, 1320); context.bezierCurveTo(870, 1100, 970, 920, 905, 690);
    context.stroke();
    context.setLineDash([]);
    for (let arrow = 0; arrow < 5; arrow++) {
      const y = 1240 - arrow * 112;
      context.beginPath(); context.moveTo(895, y + 18); context.lineTo(895, y - 12); context.lineTo(883, y + 1); context.moveTo(895, y - 12); context.lineTo(907, y + 1); context.stroke();
    }
    context.strokeStyle = colors.indigo;
    context.globalAlpha = .48;
    context.lineWidth = 5;
    context.beginPath(); context.moveTo(1460, 900); context.quadraticCurveTo(1250, 820, 1010, 680); context.stroke();
    context.restore();

    // Faint silk fibers.
    context.save();
    context.globalAlpha = .09;
    context.strokeStyle = colors.sepia;
    context.lineWidth = 1;
    for (let fiber = 0; fiber < 3600; fiber++) {
      const x = random() * width;
      const y = random() * height;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + 2 + random() * 8, y + (random() - .5) * 2); context.stroke();
    }
    context.restore();

    // Hand-drawn map margin with corner rosettes.
    context.save();
    context.strokeStyle = colors.sepia;
    context.globalAlpha = .5;
    context.lineWidth = 3;
    context.strokeRect(28, 28, width - 56, height - 56);
    context.globalAlpha = .28;
    context.lineWidth = 1;
    context.strokeRect(39, 39, width - 78, height - 78);
    [[56, 56], [width - 56, 56], [56, height - 56], [width - 56, height - 56]].forEach(([x, y]) => {
      context.beginPath(); context.arc(x, y, 14, 0, Math.PI * 2); context.stroke();
      context.beginPath(); context.moveTo(x - 8, y); context.lineTo(x + 8, y); context.moveTo(x, y - 8); context.lineTo(x, y + 8); context.stroke();
    });
    context.restore();
    return canvas;
  }

  function makeSpriteCanvas(kind, colors, variant, factionColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const ink = colors.ink;
    const team = factionColor || colors.red;
    const jitter = variant * 2.1;
    const sideTones = (team === colors.indigo || team === colors.sideB[0] ? colors.sideB : colors.sideA).slice();
    sideTones[0] = team;
    const garment = sideTones[variant % sideTones.length];
    const oval = (x, y, rx, ry, fill, stroke) => {
      context.beginPath(); context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); context.fillStyle = fill; context.fill();
      if (stroke) { context.lineWidth = 4; context.strokeStyle = stroke; context.stroke(); }
    };
    context.lineCap = 'round'; context.lineJoin = 'round';
    if (kind === 'soldier' || kind === 'officer' || kind === 'drummer' || kind === 'banner') {
      // Top-down figure glyph; costume and faction pigment are illustrative placeholders.
      oval(64, 69, 25 + jitter, 34, garment, ink);
      oval(64, 36, 20, 17, colors.skin, ink);
      oval(64, 34, kind === 'officer' ? 23 : 19 + variant % 3, 10 + variant % 3, kind === 'officer' ? colors.ochre : colors.headwear[variant % 2], ink);
      context.strokeStyle = ink; context.lineWidth = 6;
      context.beginPath(); context.moveTo(45, 59); context.lineTo(28, 78); context.moveTo(83, 59); context.lineTo(100, 78); context.stroke();
      context.strokeStyle = colors.sepia; context.lineWidth = 4;
      context.beginPath(); context.moveTo(56, 95); context.lineTo(50, 119); context.moveTo(72, 95); context.lineTo(78, 119); context.stroke();
      context.strokeStyle = variant % 2 ? colors.shellHighlight : colors.sepia; context.lineWidth = 3;
      context.beginPath(); context.moveTo(52, 69); context.quadraticCurveTo(64, 77 + variant % 4, 76, 69); context.stroke();
      context.strokeStyle = colors.ink; context.lineWidth = 4;
      context.beginPath(); context.moveTo(96, 93); context.lineTo(112, 14); context.stroke();
      context.fillStyle = kind === 'banner' ? team : colors.ochre;
      context.beginPath(); context.moveTo(110, 18); context.quadraticCurveTo(125, 22, 113, 48); context.quadraticCurveTo(108, 38, 104, 35); context.fill();
      if (kind === 'drummer') { oval(64, 70, 13, 13, colors.ochre, ink); oval(64, 70, 8, 8, colors.silk, ink); }
      if (kind === 'officer') { oval(64, 34, 7, 7, colors.red, ink); }
    } else if (kind === 'elephant') {
      oval(64, 68, 34, 44, colors.elephant, ink); oval(64, 30, 25, 23, colors.elephantLight, ink);
      context.strokeStyle = colors.shellHighlight; context.lineWidth = 7; context.beginPath(); context.moveTo(53, 38); context.quadraticCurveTo(43, 61, 55, 62); context.moveTo(75, 38); context.quadraticCurveTo(85, 61, 73, 62); context.stroke();
      oval(64, 62, 18, 19, colors.ochre, ink);
      context.strokeStyle = team; context.lineWidth = 5; context.beginPath(); context.moveTo(64, 8); context.lineTo(64, 27); context.stroke();
      context.fillStyle = team; context.beginPath(); context.moveTo(64, 9); context.lineTo(88, 12); context.lineTo(65, 24); context.fill();
    } else if (kind === 'tent' || kind === 'watchtower') {
      context.fillStyle = kind === 'tent' ? colors.sepia : colors.structure;
      context.beginPath(); context.moveTo(64, 15); context.lineTo(110, 105); context.quadraticCurveTo(65, 120, 18, 105); context.closePath(); context.fill();
      context.strokeStyle = ink; context.lineWidth = 4; context.stroke();
      context.strokeStyle = colors.silk; context.lineWidth = 3; context.beginPath(); context.moveTo(64, 24); context.lineTo(64, 109); context.stroke();
      if (kind === 'watchtower') { oval(64, 64, 18, 18, colors.ochre, ink); }
    } else if (kind === 'village') {
      for (let house = 0; house < 3; house++) {
        const x = 25 + house * 36;
        context.fillStyle = colors.roof; context.strokeStyle = ink; context.lineWidth = 3;
        context.beginPath(); context.moveTo(x, 58); context.lineTo(x + 14, 43); context.lineTo(x + 29, 58); context.lineTo(x + 25, 61); context.lineTo(x + 14, 51); context.lineTo(x + 4, 61); context.closePath(); context.fill(); context.stroke();
        context.fillStyle = colors.silk; context.fillRect(x + 6, 60, 17, 15);
      }
    } else if (kind === 'bamboo') {
      context.strokeStyle = colors.green; context.lineWidth = 5;
      for (let stem = 0; stem < 5; stem++) {
        const x = 34 + stem * 14;
        context.beginPath(); context.moveTo(x, 112); context.quadraticCurveTo(x + (stem - 2) * 2, 60, x + (stem - 2) * 4, 18); context.stroke();
        context.lineWidth = 3;
        for (let leaf = 0; leaf < 3; leaf++) {
          const y = 42 + leaf * 19;
          context.beginPath(); context.moveTo(x, y); context.quadraticCurveTo(x + (stem % 2 ? 28 : -28), y - 18, x + (stem % 2 ? 40 : -40), y - 5); context.stroke();
        }
        context.lineWidth = 5;
      }
    } else if (kind === 'palisade') {
      context.strokeStyle = colors.sepia; context.lineWidth = 10;
      for (let post = 0; post < 4; post++) { context.beginPath(); context.moveTo(24 + post * 26, 102); context.lineTo(24 + post * 26, 26 + (post % 2) * 7); context.stroke(); }
      context.strokeStyle = ink; context.lineWidth = 3; context.beginPath(); context.moveTo(15, 75); context.lineTo(111, 75); context.stroke();
    } else if (kind === 'torch') {
      oval(64, 88, 19, 10, colors.sepia, ink);
      context.fillStyle = colors.red; context.beginPath(); context.moveTo(64, 16); context.quadraticCurveTo(101, 55, 64, 81); context.quadraticCurveTo(28, 55, 64, 16); context.fill();
      oval(64, 58, 12, 18, colors.ochre);
    }
    return canvas;
  }

  function toWorld(x, z, y) {
    return new THREE.Vector3(x, y || .2, z);
  }

  class SilkMapScene {
    constructor(container, options) {
      this.container = container;
      this.options = Object.assign({ quality: 'high', lessonConfig: null, isCustomScenario: false, studentChoices: null, onProgressUpdate: null }, options || {});
      this.theme = palette();
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.theme.silk);
      this.aspect = (container.clientWidth || 640) / (container.clientHeight || 360);
      this.renderer = new THREE.WebGLRenderer({ antialias: this.options.quality === 'high', alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.options.quality === 'high' ? 1.5 : 1));
      this.renderer.setSize(container.clientWidth || 640, container.clientHeight || 360);
      this.renderer.shadowMap.enabled = false;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace || this.renderer.outputColorSpace;
      container.appendChild(this.renderer.domElement);
      this.target = new THREE.Vector3(0, 0, 0);
      this.camera = new THREE.PerspectiveCamera(30, this.aspect, 1, 900);
      this.camera.position.set(0, 158, 70);
      this.camera.lookAt(this.target);
      this.controls = { target: this.target, update: () => this.camera.lookAt(this.target) };
      this.fogSettings = new THREE.Fog(this.theme.mist, 245, 460);
      this.scene.fog = this.fogSettings;
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
      this.units = { taySonSoldiers: [], qingSoldiers: [], taySonElephants: [], taySonFlank: [] };
      this.propsGroups = { palisade: { visible: true }, tents: { visible: true }, elephants: { visible: true }, banners: { visible: true }, fire: { visible: true }, village: { visible: true }, bamboo: { visible: true } };
      this.meshGroups = {};
      this.displayCounts = {};
      this.flags = [];
      this.floatingLabels = [];
      this.factionColors = this.getFactionColors();
      this.spriteMaterials = [];
      this.fogCards = [];
      this.buildMap();
      this.buildSprites();
      this.buildFog();
      this.buildSceneLabels();
      this.bindMapCamera();
      this.setQuality(this.options.quality);
      this.updateTimeline(0);
      this.animate = this.animate.bind(this);
      this.onResizeBound = this.onResize.bind(this);
      window.addEventListener('resize', this.onResizeBound);
      this.animationFrameId = requestAnimationFrame(this.animate);
    }

    getFactionColors() {
      return { taySon: this.theme.red, qing: this.theme.indigo };
    }

    buildMap() {
      const canvas = makeMapArtwork(null, this.theme, 1789);
      this.mapTexture = new THREE.CanvasTexture(canvas);
      this.mapTexture.colorSpace = THREE.SRGBColorSpace || this.mapTexture.colorSpace;
      this.mapTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.MeshBasicMaterial({ map: this.mapTexture });
      const map = new THREE.Mesh(new THREE.PlaneGeometry(240, 186), material);
      map.rotation.x = -Math.PI / 2;
      map.position.y = -.25;
      this.scene.add(map);
      this.map = map;
      this.mapCanvas = canvas;
    }

    mapPosition(x, z) {
      const width = 240;
      const depth = 186;
      return { x: x / width * 1800 + 900, y: (1 - (z + depth / 2) / depth) * 1400 };
    }

    drawSprite(kind, variant, color) {
      const source = makeSpriteCanvas(kind, this.theme, variant, color);
      const overrides = {
        soldier: color === this.factionColors.qing ? 'soldier_b.png' : 'soldier_a.png',
        elephant: 'elephant.png', tent: 'tent.png', banner: color === this.factionColors.qing || color === this.theme.indigo ? 'banner_b.png' : 'banner_a.png', palisade: 'palisade.png', watchtower: 'watchtower.png', torch: 'torch.png', village: 'village.png', bamboo: 'bamboo.png'
      };
      const file = overrides[kind];
      if (!file) return source;
      const image = new Image();
      image.onload = () => {
        source.width = image.naturalWidth;
        source.height = image.naturalHeight;
        source.getContext('2d').drawImage(image, 0, 0);
        const textures = this.spriteTextures && this.spriteTextures.get(kind) || [];
        textures.forEach((texture) => { texture.needsUpdate = true; });
      };
      image.onerror = () => {};
      image.src = `assets/sprites/${file}`;
      return source;
    }

    createInstancedGroup(name, kind, count, color, groupName, positionFactory, initialCount) {
      const records = [];
      for (let index = 0; index < count; index++) {
        const record = positionFactory(index);
        record.scale = record.scale || (.72 + Math.random() * .45);
        record.rotation = record.rotation == null ? (Math.random() - .5) * .42 : record.rotation;
        records.push(record);
      }
      const group = new THREE.Group();
      const variantCount = kind === 'soldier' ? 4 : 1;
      const meshes = [];
      for (let variant = 0; variant < variantCount; variant++) {
        const variantRecords = records.filter((record, index) => index % variantCount === variant);
        const canvas = this.drawSprite(kind, variant, color);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace || texture.colorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .08, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.8, 4.8), material, Math.max(1, variantRecords.length));
        const shadowMaterial = new THREE.MeshBasicMaterial({ map: this.getShadowTexture(), transparent: true, depthWrite: false, opacity: .35 });
        const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(5.2, 2.8), shadowMaterial, Math.max(1, variantRecords.length));
        mesh.frustumCulled = false; shadows.frustumCulled = false;
        const dummy = new THREE.Object3D();
        variantRecords.forEach((record, index) => {
          dummy.position.set(record.x, .38, record.z);
          dummy.rotation.set(-Math.PI / 2, 0, record.rotation);
          dummy.scale.set(record.scale, record.scale, record.scale);
          dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
          dummy.position.set(record.x, .08, record.z);
          dummy.scale.set(record.scale * 1.1, record.scale * .56, 1);
          dummy.updateMatrix(); shadows.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
        mesh.userData.records = variantRecords; shadows.userData.records = variantRecords;
        group.add(shadows, mesh);
        meshes.push({ mesh, shadows, records: variantRecords, material });
        this.spriteMaterials.push(material, shadowMaterial);
        if (!this.spriteTextures) this.spriteTextures = new Map();
        if (!this.spriteTextures.has(kind)) this.spriteTextures.set(kind, []);
        this.spriteTextures.get(kind).push(texture);
      }
      this.scene.add(group);
      const result = { mesh: meshes[0].mesh, shadows: meshes[0].shadows, meshes, records, kind, groupName, baseCount: count, color, visibleCount: initialCount == null ? count : initialCount };
      this.meshGroups[name] = result;
      return result;
    }

    getShadowTexture() {
      if (this.shadowTexture) return this.shadowTexture;
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 72;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(64, 36, 4, 64, 36, 36);
      gradient.addColorStop(0, 'rgba(43,41,38,.44)');
      gradient.addColorStop(1, 'rgba(43,41,38,0)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 72);
      this.shadowTexture = new THREE.CanvasTexture(canvas);
      return this.shadowTexture;
    }

    buildSprites() {
      const config = this.options.lessonConfig && this.options.lessonConfig.simulation || {};
      const requested = config.unitCounts || {};
      const countA = Math.min(230, Math.max(120, (Number(requested.taySonInfantry) || 48) * 3));
      const countB = Math.min(200, Math.max(105, (Number(requested.qingInfantry) || 54) * 3));
      this.displayCounts = { sideA: countA, sideB: countB };
      const makeFormation = (count, side) => (index) => {
        const squad = Math.floor(index / 10);
        const rank = index % 10;
        const centerX = side === 'a' ? -44 + (squad % 7) * 14 : -42 + (squad % 6) * 17;
        const centerZ = side === 'a' ? 43 + Math.floor(squad / 7) * 13 : -31 + Math.floor(squad / 6) * 12;
        const angle = squad * 2.17 + (rank % 3) * .23;
        const radius = 2.7 + Math.floor(rank / 3) * 1.4;
        const kind = index % 31 === 0 ? 'officer' : index % 27 === 0 ? 'drummer' : index % 19 === 0 ? 'banner' : 'soldier';
        return { x: centerX + Math.cos(angle) * radius + (Math.random() - .5) * 2.7, z: centerZ + Math.sin(angle) * radius + (Math.random() - .5) * 2.5, startX: centerX + Math.cos(angle) * radius, startZ: centerZ + Math.sin(angle) * radius, endX: centerX + Math.cos(angle) * radius * .52, endZ: side === 'a' ? -15 + Math.random() * 26 : -54 + Math.random() * 12, phase: Math.random() * Math.PI * 2, kind };
      };
      this.createInstancedGroup('sideA', 'soldier', countA, this.factionColors.taySon, 'troops', makeFormation(countA, 'a'), countA);
      this.createInstancedGroup('sideB', 'soldier', countB, this.factionColors.qing, 'troops', makeFormation(countB, 'b'), countB);
      const addProps = (name, kind, count, factory, groupName, color) => this.createInstancedGroup(name, kind, count, color, groupName, factory, count);
      addProps('elephants', 'elephant', 7, (i) => ({ x: -40 + i * 13, z: 62 + Math.random() * 4, startX: -40 + i * 13, startZ: 62, endX: -24 + i * 8, endZ: -8 + Math.random() * 14, phase: i }), 'elephants');
      addProps('banners', 'banner', 13, (i) => ({ x: -64 + i * 10, z: 50 + Math.random() * 22, startX: -64 + i * 10, startZ: 50 + Math.random() * 22, endX: -64 + i * 10, endZ: 50 + Math.random() * 22, phase: i }), 'banners');
      addProps('bannersB', 'banner', 8, (i) => ({ x: 54 + i * 9, z: -30 + Math.random() * 13, phase: i }), 'banners', this.factionColors.qing);
      addProps('tents', 'tent', 11, (i) => ({ x: -78 + (i % 6) * 17, z: 67 + Math.floor(i / 6) * 12 }), 'tents');
      addProps('village', 'village', 9, (i) => ({ x: -94 + (i % 5) * 12, z: 72 + Math.floor(i / 5) * 10 }), 'village');
      addProps('bamboo', 'bamboo', 18, (i) => ({ x: -106 + (i % 9) * 24, z: 79 - Math.floor(i / 9) * 12 }), 'bamboo');
      addProps('palisade', 'palisade', 18, (i) => ({ x: -37 + i * 4.4, z: -24 + Math.sin(i * .5) * 5 }), 'palisade');
      addProps('watchtower', 'watchtower', 3, (i) => ({ x: -34 + i * 33, z: -35 + (i % 2) * 5 }), 'palisade');
      addProps('torches', 'torch', 8, (i) => ({ x: -48 + i * 13, z: -21 + (i % 2) * 12, phase: Math.random() * 6 }), 'fire');
      this.units.taySonSoldiers = this.meshGroups.sideA.records;
      this.units.qingSoldiers = this.meshGroups.sideB.records;
      this.units.taySonElephants = this.meshGroups.elephants.records;
      this.units.taySonFlank = this.meshGroups.sideA.records.slice(0, Math.floor(countA * .18));
      this.applyPropConfig(config.propsConfig || {});
    }

    buildFog() {
      const makeCloudTexture = () => {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(128, 64, 5, 128, 64, 125);
        g.addColorStop(0, 'rgba(246,238,219,.58)'); g.addColorStop(.5, 'rgba(217,211,193,.34)'); g.addColorStop(1, 'rgba(217,211,193,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
        return new THREE.CanvasTexture(canvas);
      };
      this.fogTexture = makeCloudTexture();
      for (let index = 0; index < 8; index++) {
        const sprite = new THREE.Mesh(new THREE.PlaneGeometry(42 + (index % 3) * 12, 16 + (index % 2) * 8), new THREE.MeshBasicMaterial({ map: this.fogTexture, transparent: true, depthWrite: false, opacity: .25 + (index % 3) * .08, side: THREE.DoubleSide }));
        sprite.rotation.x = -Math.PI / 2;
        sprite.position.set(-96 + index * 27, .7 + index * .12, -75 + (index % 4) * 36);
        sprite.userData.phase = index * 1.7;
        this.scene.add(sprite); this.fogCards.push(sprite);
      }
    }

    buildSceneLabels() {
      const definitions = [
        { text: 'Vùng bố trí', position: [0, .7, -27] },
        { text: 'Địa hình trũng', position: [72, .7, 18] },
        { text: 'Dải nước', position: [-82, .7, -55] }
      ];
      definitions.forEach((definition) => {
        const label = document.createElement('span');
        label.className = 'lesson-scene-label';
        label.textContent = window.normalizeVietnamese ? window.normalizeVietnamese(definition.text) : definition.text;
        this.container.appendChild(label);
        this.floatingLabels.push({ element: label, position: new THREE.Vector3(...definition.position) });
      });
      this.costumeNote = document.createElement('span');
      this.costumeNote.className = 'lesson-scene-caveat';
      this.costumeNote.textContent = 'Trang phục và màu sắc chỉ là minh họa, chờ chuyên gia thẩm định';
      this.container.appendChild(this.costumeNote);
    }

    bindMapCamera() {
      const canvas = this.renderer.domElement;
      this.pointer = null;
      canvas.addEventListener('pointerdown', (event) => { this.pointer = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
      canvas.addEventListener('pointerup', () => { this.pointer = null; });
      canvas.addEventListener('pointermove', (event) => {
        if (!this.pointer) return;
        const dx = event.clientX - this.pointer.x; const dy = event.clientY - this.pointer.y;
        this.target.x -= dx * .12; this.target.z += dy * .12;
        this.pointer = { x: event.clientX, y: event.clientY };
        this.camera.lookAt(this.target);
      });
      canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const factor = event.deltaY > 0 ? 1.08 : .92;
        this.camera.position.sub(this.target).multiplyScalar(factor).add(this.target);
        const distance = this.camera.position.distanceTo(this.target);
        if (distance < 75 || distance > 240) this.camera.position.copy(this.target).add(new THREE.Vector3(0, distance < 75 ? 75 : 240, distance < 75 ? 33 : 106));
        this.camera.lookAt(this.target);
      }, { passive: false });
    }

    setCameraPreset(name) {
      const presets = {
        overview: { pos: [0, 158, 70], target: [0, 0, 0], fov: 30, ortho: false },
        follow_troops: { pos: [-42, 116, 50], target: [-8, 0, 5], fov: 32, ortho: false },
        close_up: { pos: [-9, 78, 28], target: [-8, 0, -22], fov: 30, ortho: false },
        top_down: { pos: [0, 210, 0], target: [0, 0, 0], fov: 30, ortho: true }
      };
      const aliases = { 'Toàn cảnh': 'overview', overview_map: 'overview', 'Toàn cảnh sa bàn': 'overview', 'Theo quân': 'follow_troops', 'Cận cảnh': 'close_up', 'Từ trên': 'top_down', overview: 'overview', follow_troops: 'follow_troops', close_up: 'close_up', top_down: 'top_down' };
      const preset = presets[aliases[name] || name] || presets.overview;
      if (preset.ortho && !(this.camera instanceof THREE.OrthographicCamera)) {
        const old = this.camera;
        const height = 172;
        this.camera = new THREE.OrthographicCamera(-height * this.aspect / 2, height * this.aspect / 2, height / 2, -height / 2, 1, 900);
        this.camera.position.copy(old.position);
      } else if (!preset.ortho && this.camera instanceof THREE.OrthographicCamera) {
        const old = this.camera;
        this.camera = new THREE.PerspectiveCamera(preset.fov, this.aspect, 1, 900);
        this.camera.position.copy(old.position);
      }
      if (this.camera.fov !== undefined) this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
      this.isCinematicOrbit = false;
      this.activePreset = name;
      this.cameraTransition = { started: performance.now(), duration: 1450, startPosition: this.camera.position.clone(), endPosition: new THREE.Vector3(...preset.pos), startTarget: this.target.clone(), endTarget: new THREE.Vector3(...preset.target) };
    }

    toggleCinematicOrbit() { this.isCinematicOrbit = !this.isCinematicOrbit; return this.isCinematicOrbit; }

    updateTimeline(progress) {
      this.currentTime = Math.max(0, Math.min(1, Number(progress) || 0));
      const time = this.currentTime;
      const keyframes = this.options.lessonConfig && this.options.lessonConfig.simulation && this.options.lessonConfig.simulation.keyframes || [];
      const keyframe = keyframes.filter((frame) => time >= Number(frame.time || 0)).pop();
      if (keyframe && keyframe.preset && keyframe.preset !== this.activePreset && time > 0) this.setCameraPreset(keyframe.preset);
      Object.keys(this.meshGroups).forEach((key) => {
        const group = this.meshGroups[key];
        const dummy = new THREE.Object3D();
        group.meshes.forEach((batch) => {
          for (let index = 0; index < batch.mesh.count; index++) {
            const record = batch.records[index];
            const moving = record.startX !== undefined && record.endX !== undefined;
            const localProgress = moving ? Math.max(0, Math.min(1, (time - .2) / .72)) : 0;
            const x = moving ? record.startX + (record.endX - record.startX) * localProgress : record.x;
            const z = moving ? record.startZ + (record.endZ - record.startZ) * localProgress : record.z;
            const bob = group.groupName === 'troops' ? Math.sin(time * 16 + record.phase) * .22 : Math.sin(performance.now() * .0014 + record.phase) * .07;
            dummy.position.set(x, .38 + bob, z);
            dummy.rotation.set(-Math.PI / 2, 0, record.rotation + Math.sin(performance.now() * .001 + record.phase) * .035);
            dummy.scale.set(record.scale, record.scale, record.scale);
            dummy.updateMatrix(); batch.mesh.setMatrixAt(index, dummy.matrix);
            dummy.position.set(x, .07, z);
            dummy.rotation.set(-Math.PI / 2, 0, record.rotation);
            dummy.scale.set(record.scale * 1.1, record.scale * .56, 1);
            dummy.updateMatrix(); batch.shadows.setMatrixAt(index, dummy.matrix);
          }
          batch.mesh.instanceMatrix.needsUpdate = true; batch.shadows.instanceMatrix.needsUpdate = true;
        });
      });
      if (this.options.onProgressUpdate) this.options.onProgressUpdate(this.currentTime);
    }

    updatePropsVisibility(config) {
      Object.keys(config || {}).forEach((key) => { if (this.propsGroups[key]) this.propsGroups[key].visible = !!config[key]; });
      this.applyPropConfig(config || {});
    }

    applyPropConfig(config) {
      const map = { elephants: ['elephants'], banners: ['banners', 'bannersB'], tents: ['tents'], palisade: ['palisade', 'watchtower'], fire: ['torches'], village: ['village'], bamboo: ['bamboo'] };
      Object.keys(map).forEach((prop) => map[prop].forEach((name) => {
        if (!this.meshGroups[name]) return;
        this.meshGroups[name].meshes.forEach((batch) => {
          batch.mesh.visible = config[prop] !== false;
          batch.shadows.visible = config[prop] !== false;
        });
      }));
    }

    updateFactionColors(colors) {
      if (colors.taySon) this.factionColors.taySon = colors.taySon;
      if (colors.qing) this.factionColors.qing = colors.qing;
      [['sideA', this.factionColors.taySon], ['banners', this.factionColors.taySon], ['sideB', this.factionColors.qing], ['bannersB', this.factionColors.qing]].forEach(([key, color]) => {
        const group = this.meshGroups[key];
        if (!group) return;
        group.meshes.forEach((batch, index) => {
          const variantCanvas = this.drawSprite(group.kind, index, color);
          const variantTexture = new THREE.CanvasTexture(variantCanvas);
          variantTexture.colorSpace = THREE.SRGBColorSpace || variantTexture.colorSpace;
          batch.material.map.dispose(); batch.material.map = variantTexture; batch.material.needsUpdate = true;
          this.spriteMaterials.push(batch.material);
        });
      });
    }

    updateUnitCounts(counts) {
      const setCount = (key, value, factor, maximum) => {
        const group = this.meshGroups[key];
        if (!group || value == null) return;
        const visible = Math.min(group.baseCount, Math.max(0, Math.round(Number(value) * factor)));
        group.visibleCount = Math.min(visible, maximum || visible);
        group.meshes.forEach((batch, variant) => {
          const batchCount = Math.max(0, Math.ceil((group.visibleCount - variant) / group.meshes.length));
          batch.mesh.count = Math.min(batch.records.length, batchCount);
          batch.shadows.count = batch.mesh.count;
        });
      };
      setCount('sideA', counts.taySonInfantry, 3, 230);
      setCount('sideB', counts.qingInfantry, 3, 200);
      if (counts.taySonInfantry != null) this.displayCounts.sideA = this.meshGroups.sideA.visibleCount;
      if (counts.qingInfantry != null) this.displayCounts.sideB = this.meshGroups.sideB.visibleCount;
    }

    setQuality(quality) {
      this.options.quality = quality;
      const low = quality === 'low';
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
      this.renderer.shadowMap.enabled = false;
      this.scene.fog = low ? null : this.fogSettings;
      this.fogCards.forEach((card, index) => { card.visible = !low && index < 8; });
      [['sideA', 90], ['sideB', 75]].forEach(([name, lowLimit]) => {
        const group = this.meshGroups[name];
        if (!group) return;
        const visibleCount = Math.min(this.displayCounts[name] || group.baseCount, low ? lowLimit : group.baseCount);
        group.visibleCount = visibleCount;
        group.meshes.forEach((batch, variant) => {
          batch.mesh.count = Math.min(batch.records.length, Math.max(0, Math.ceil((visibleCount - variant) / group.meshes.length)));
          batch.shadows.count = batch.mesh.count;
        });
      });
      this.renderer.setSize(this.container.clientWidth || 640, this.container.clientHeight || 360);
    }

    play() { this.isPlaying = true; }
    pause() { this.isPlaying = false; }
    seek(progress) { this.updateTimeline(progress); }
    setSpeed(speed) { this.playbackSpeed = Number(speed) || 1; }

    updateLabels() {
      this.floatingLabels.forEach((label) => {
        const point = label.position.clone().project(this.camera);
        label.element.style.display = point.z < 1 ? 'block' : 'none';
        label.element.style.left = `${(point.x * .5 + .5) * this.container.clientWidth}px`;
        label.element.style.top = `${(-point.y * .5 + .5) * this.container.clientHeight}px`;
        label.element.style.transform = 'translate(-50%, -50%)';
      });
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
      if (this.cameraTransition) {
        const raw = Math.min(1, (now - this.cameraTransition.started) / this.cameraTransition.duration);
        const eased = raw * raw * (3 - 2 * raw);
        this.camera.position.lerpVectors(this.cameraTransition.startPosition, this.cameraTransition.endPosition, eased);
        this.target.lerpVectors(this.cameraTransition.startTarget, this.cameraTransition.endTarget, eased);
        if (raw >= 1) this.cameraTransition = null;
      }
      if (this.isCinematicOrbit) {
        this.orbitAngle += delta * .045;
        this.camera.position.x = Math.sin(this.orbitAngle) * 26;
        this.camera.position.z = 70 + Math.cos(this.orbitAngle) * 26;
      }
      this.fogCards.forEach((card) => { card.position.x += delta * .45; if (card.position.x > 124) card.position.x = -124; });
      this.camera.lookAt(this.target);
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth; const height = this.container.clientHeight;
      if (!width || !height) return;
      this.camera.aspect = width / height;
      this.aspect = width / height;
      if (this.camera instanceof THREE.OrthographicCamera) {
        const halfHeight = (this.camera.top - this.camera.bottom) / 2;
        this.camera.left = -halfHeight * this.camera.aspect; this.camera.right = halfHeight * this.camera.aspect;
      }
      this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height);
    }

    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this.animationFrameId);
      window.removeEventListener('resize', this.onResizeBound);
      this.floatingLabels.forEach((label) => label.element.remove());
      if (this.costumeNote) this.costumeNote.remove();
      this.scene.traverse((object) => { if (object.geometry) object.geometry.dispose(); });
      this.spriteMaterials.forEach((material) => { if (material.map) material.map.dispose(); material.dispose(); });
      if (this.mapTexture) this.mapTexture.dispose();
      if (this.fogTexture) this.fogTexture.dispose();
      if (this.shadowTexture) this.shadowTexture.dispose();
      this.renderer.dispose(); this.renderer.domElement.remove();
    }

    static paintMapThumbnail(canvas) {
      makeMapArtwork(canvas, palette(), 1789);
    }
  }

  window.BattleScene3D = SilkMapScene;
})(window, document);
