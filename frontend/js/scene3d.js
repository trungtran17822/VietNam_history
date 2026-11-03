/**
 * scene3d.js - Stylized Low-Poly 3D Historical Battle Simulation in Three.js
 * Redesigned for classroom deployment and teacher authoring:
 * - NO BoxGeometry used anywhere (organic low-poly primitives: cylinders, cones, spheres, tubes, dodecahedrons)
 * - Distinctly Vietnamese historical setting cues:
 *   + Northern Vietnamese tropical landscape: bamboo groves, banana & areca palms, village ponds, earthen dikes
 *   + Thatched and curved-tile village houses (built with timber lim pillars, curved roofs, no boxes)
 *   + Authentic wooden palisades with pointed stakes, watchtowers, bronze war drums, ceremonial banners
 *   + Tây Sơn army in lacquer-red uniforms and golden conical hats (nón lá), war elephants with brass cannons
 *   + Qing forces in blue coats and mandarin hats
 *   + Drifting smoke and fire embers, flickering torchlight, birds circling above
 * - InstancedMesh and group optimizations for high performance (60 FPS on school devices)
 * - Dynamic live updates for Teacher Editor: props toggle, unit counts, faction colors, camera presets, keyframes
 * - Seamless replay for Student Area with synced milestones and camera presets
 */

(function (window) {
  'use strict';

  class BattleScene3D {
    constructor(containerElement, options = {}) {
      this.container = containerElement;
      this.options = Object.assign(
        {
          isCustomScenario: false,
          studentChoices: null,
          lessonConfig: null,
          quality: window.localStorage ? window.localStorage.getItem('history_sim_quality') || 'high' : 'high',
          onProgressUpdate: null,
          onMilestoneTrigger: null
        },
        options
      );

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.controls = null;
      this.animationFrameId = null;

      // Simulation timeline state
      this.currentTime = 0; // 0.0 to 1.0
      this.isPlaying = false;
      this.playbackSpeed = 1.0;
      this.durationSeconds = 24;
      this.lastTimestamp = 0;

      // Camera transition state
      this.cameraTransition = null;
      this.isCinematicOrbit = false;
      this.orbitAngle = 0;

      // Quality state
      this.quality = this.options.quality; // 'high' | 'low'

      // 3D Objects & Formations
      this.units = {
        taySonSoldiers: [],
        taySonElephants: [],
        taySonFlank: [],
        qingSoldiers: [],
        qingCannons: []
      };

      // Groups for teacher editing toggles
      this.propsGroups = {
        palisade: new THREE.Group(),
        tents: new THREE.Group(),
        elephants: new THREE.Group(),
        banners: new THREE.Group(),
        fire: new THREE.Group(),
        village: new THREE.Group(),
        bamboo: new THREE.Group()
      };

      this.landmarks = {};
      this.tacticalMarkers = [];
      this.lights = {};
      this.torches = [];
      this.particles = null;
      this.flags = [];
      this.floatingLabels = [];
      this.birds = [];

      // Faction colors
      const lessonColors = (this.options.lessonConfig && this.options.lessonConfig.simulation && this.options.lessonConfig.simulation.factionColors) || {};
      this.factionColors = {
        taySon: lessonColors.taySon || '#962d22',
        qing: lessonColors.qing || '#1e3a8a'
      };

      this.init();
    }

    init() {
      // 1. Scene setup
      this.scene = new THREE.Scene();
      const skyDawn = new THREE.Color(0x241d1a); // Warm dawn historical film grading
      this.scene.background = skyDawn;
      this.scene.fog = new THREE.FogExp2(0x2a221e, 0.0058);

      // Add props groups into scene
      Object.values(this.propsGroups).forEach((grp) => {
        this.scene.add(grp);
      });

      // 2. Camera setup
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 500;
      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      this.camera.position.set(0, 72, 115);

      // 3. Renderer setup
      this.renderer = new THREE.WebGLRenderer({
        antialias: this.quality === 'high',
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 2 : 1));

      if (this.quality === 'high') {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      } else {
        this.renderer.shadowMap.enabled = false;
      }
      this.container.appendChild(this.renderer.domElement);

      // 4. OrbitControls
      if (typeof THREE.OrbitControls !== 'undefined') {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.07;
        this.controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera from going under ground
        this.controls.minDistance = 16;
        this.controls.maxDistance = 220;
        this.controls.target.set(0, 5, -8);
      }

      // 5. Build Environment, Battlefield & Forces
      this.setupLighting();
      this.buildTerrain();
      this.buildVietnameseVillageAndLandscape();
      this.buildEnvironmentProps();
      this.buildFortifications();
      this.buildTroopFormations();
      this.buildTacticalDecals();
      this.buildFloatingLabels();
      this.buildBirdFlock();

      // Apply initial props visibility if provided
      if (this.options.lessonConfig && this.options.lessonConfig.simulation && this.options.lessonConfig.simulation.propsConfig) {
        this.updatePropsVisibility(this.options.lessonConfig.simulation.propsConfig);
      }

      // 6. Responsive listener
      this.onResizeBound = this.onResize.bind(this);
      window.addEventListener('resize', this.onResizeBound);

      // 7. Start render loop
      this.lastTimestamp = performance.now();
      this.animate();
    }

    /**
     * Lighting: Warm sunrise atmosphere with lacquer tones
     */
    setupLighting() {
      const isDay = this.options.studentChoices && this.options.studentChoices.timing === 'midday_light';

      // Hemisphere Fill light
      const skyTone = isDay ? 0xdfe9f3 : 0x8a6e55;
      const groundTone = isDay ? 0x8a7258 : 0x3d2719;
      this.lights.hemi = new THREE.HemisphereLight(skyTone, groundTone, isDay ? 0.95 : 0.72);
      this.scene.add(this.lights.hemi);

      // Directional Sun Light (Low-angle rising dawn over the eastern horizon)
      const sunColor = isDay ? 0xfffaea : 0xffa044;
      this.lights.sun = new THREE.DirectionalLight(sunColor, isDay ? 1.3 : 1.1);
      this.lights.sun.position.set(55, 75, 45);

      if (this.quality === 'high') {
        this.lights.sun.castShadow = true;
        this.lights.sun.shadow.mapSize.width = 1024;
        this.lights.sun.shadow.mapSize.height = 1024;
        this.lights.sun.shadow.camera.near = 10;
        this.lights.sun.shadow.camera.far = 240;
        this.lights.sun.shadow.camera.left = -95;
        this.lights.sun.shadow.camera.right = 95;
        this.lights.sun.shadow.camera.top = 95;
        this.lights.sun.shadow.camera.bottom = -95;
        this.lights.sun.shadow.bias = -0.0008;
      }
      this.scene.add(this.lights.sun);

      // Ambient boost
      this.lights.ambient = new THREE.AmbientLight(0x422f22, 0.55);
      this.scene.add(this.lights.ambient);

      // Campfire & Torches
      this.createCampTorch(-32, 1.2, 58, 0xff6611, 20);
      this.createCampTorch(0, 3.8, -14, 0xff8822, 24);
      this.createCampTorch(38, 1.0, 18, 0x38bdf8, 18); // Lantern at Đầm Mực
      this.createCampTorch(-12, 1.0, 12, 0xff5511, 16);
      this.createCampTorch(16, 1.0, 12, 0xff5511, 16);
    }

    createCampTorch(x, y, z, colorHex, distance) {
      const torchGroup = new THREE.Group();
      torchGroup.position.set(x, y, z);

      // Wooden torch post (Cylinder)
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.26, 3.2, 6),
        new THREE.MeshLambertMaterial({ color: 0x422a16, flatShading: true })
      );
      post.position.y = 1.6;
      torchGroup.add(post);

      // Braziers / iron bowl (Cone inverted)
      const bowl = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.5, 6),
        new THREE.MeshLambertMaterial({ color: 0x1f2421 })
      );
      bowl.rotation.x = Math.PI;
      bowl.position.y = 3.2;
      torchGroup.add(bowl);

      // Flame core (Dodecahedron with emissive glow)
      const flameMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const flame = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), flameMat);
      flame.position.y = 3.6;
      torchGroup.add(flame);

      let pLight = null;
      if (this.quality === 'high') {
        pLight = new THREE.PointLight(colorHex, 1.4, distance);
        pLight.position.y = 3.8;
        torchGroup.add(pLight);
      }

      this.propsGroups.fire.add(torchGroup);
      this.torches.push({ flame, light: pLight, baseIntensity: 1.4, seed: Math.random() * 10 });
    }

    /**
     * 1. Terrain: Subtle height-varied displaced plane with flat-shaded low-poly faces.
     * No BoxGeometry: vertex colored zones for ricefields, dikes, roads, and Đầm Mực.
     */
    buildTerrain() {
      const planeWidth = 260;
      const planeDepth = 260;
      const segs = 58;
      const groundGeo = new THREE.PlaneGeometry(planeWidth, planeDepth, segs, segs);
      groundGeo.rotateX(-Math.PI / 2);

      const pos = groundGeo.attributes.position;
      const colors = [];

      const colorLush = new THREE.Color(0x355e2d); // Ricefield terrace green
      const colorHill = new THREE.Color(0x4a7337); // Ridge grass
      const colorEarth = new THREE.Color(0x6e5239); // Red-brown earthen paths & dikes
      const colorMarsh = new THREE.Color(0x23382c); // Dark wetland mud Đầm Mực
      const colorRiver = new THREE.Color(0x523f30); // Alluvial silt Nhị Hà riverbank

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);

        let y = 0;
        // 1. Natural gentle undulations
        y += Math.sin(x * 0.035) * Math.cos(z * 0.035) * 1.5;

        // 2. High defensive ridge around Đồn Ngọc Hồi (z ~ -15)
        const distNgocHoi = Math.hypot(x, z + 15);
        if (distNgocHoi < 42) {
          y += Math.cos(distNgocHoi * 0.075) * 3.6;
        }

        // 3. Earthen dikes flanking the central march
        if (Math.abs(x) > 10 && Math.abs(x) < 16 && z > -25 && z < 70) {
          y += 1.2;
        }

        // 4. Rolling hillocks flanking the road
        if (x < -30 && z > -20 && z < 60) {
          y += Math.sin((x + 40) * 0.06) * 2.2;
        }

        // 5. Đầm Mực marsh depression (x > 18, z > -5 && z < 52)
        if (x > 18 && z > -5 && z < 52) {
          const marshDist = Math.hypot((x - 40) * 0.7, z - 22);
          if (marshDist < 28) {
            y -= (1.0 - marshDist / 28) * 3.2;
          }
        }

        // 6. Sông Nhị Hà riverbed in the far north (z < -65)
        if (z < -65) {
          const depth = Math.min(1.0, (-65 - z) / 20);
          y -= depth * 3.8;
        }

        pos.setY(i, y);

        // Compute vertex color based on features
        const vertexCol = new THREE.Color();
        if (z < -68) {
          vertexCol.copy(colorRiver);
        } else if (x > 22 && z > 0 && z < 48) {
          vertexCol.copy(colorMarsh);
        } else if (Math.abs(x) < 7 && z > -35 && z < 80) {
          // Central dirt road
          vertexCol.copy(colorEarth).lerp(colorLush, Math.abs(x) / 7);
        } else if (y > 2.2) {
          vertexCol.copy(colorHill);
        } else {
          vertexCol.copy(colorLush);
        }
        colors.push(vertexCol.r, vertexCol.g, vertexCol.b);
      }

      groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      groundGeo.computeVertexNormals();

      const groundMat = new THREE.MeshLambertMaterial({
        vertexColors: true,
        flatShading: true
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.receiveShadow = this.quality === 'high';
      this.scene.add(ground);

      // Đầm Mực (Misty marshland water plane)
      const marshGeo = new THREE.PlaneGeometry(62, 58, 8, 8);
      marshGeo.rotateX(-Math.PI / 2);
      const marshMat = new THREE.MeshLambertMaterial({
        color: 0x1d3630,
        transparent: true,
        opacity: 0.88,
        flatShading: true
      });
      const marsh = new THREE.Mesh(marshGeo, marshMat);
      marsh.position.set(40, -1.35, 22);
      this.scene.add(marsh);

      // Reeds at Đầm Mực
      const reedMat = new THREE.MeshLambertMaterial({ color: 0x415b32, flatShading: true });
      for (let r = 0; r < 32; r++) {
        const reed = new THREE.Mesh(new THREE.ConeGeometry(0.24, 2.5 + Math.random() * 2, 4), reedMat);
        reed.position.set(24 + Math.random() * 32, -0.6, 6 + Math.random() * 36);
        reed.rotation.z = (Math.random() - 0.5) * 0.25;
        this.scene.add(reed);
      }

      // Sông Nhị Hà (Red River in the distance north)
      const riverGeo = new THREE.PlaneGeometry(250, 36, 16, 4);
      riverGeo.rotateX(-Math.PI / 2);
      const riverMat = new THREE.MeshLambertMaterial({
        color: 0x6e3c25, // Alluvial silt tone
        transparent: true,
        opacity: 0.92,
        flatShading: true
      });
      const river = new THREE.Mesh(riverGeo, riverMat);
      river.position.set(0, -2.1, -85);
      this.scene.add(river);

      // Dirt road ribbon leading from south through Hạ Hồi to Ngọc Hồi
      const roadGeo = new THREE.PlaneGeometry(9.5, 155, 6, 32);
      roadGeo.rotateX(-Math.PI / 2);
      const roadMat = new THREE.MeshLambertMaterial({
        color: 0x5e4c36,
        flatShading: true
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.position.set(0, 0.12, 5);
      this.scene.add(road);
    }

    /**
     * Northern Vietnamese setting cues:
     * Bamboo groves, areca palms, banana clusters, traditional village houses with curved eaves,
     * village ponds, and war drums (NO BoxGeometry!).
     */
    buildVietnameseVillageAndLandscape() {
      // 1. Bamboo Groves (Bụi tre làng Bắc Bộ)
      const bambooCoords = [
        [-42, 1.2, 50],
        [-38, 1.0, 72],
        [-48, 1.4, 20],
        [26, 0.8, 65],
        [32, 0.8, -10],
        [-45, 1.6, -20]
      ];
      bambooCoords.forEach((bc) => {
        const grove = this.createBambooGrove(bc[0], bc[1], bc[2]);
        this.propsGroups.bamboo.add(grove);
      });

      // 2. Banana & Areca Palms (Cây cau & rặng chuối bờ ao)
      const palmCoords = [
        [-20, 0.5, 75],
        [-28, 0.6, 78],
        [18, 0.4, 72],
        [22, 0.5, 78],
        [-52, 1.2, 35]
      ];
      palmCoords.forEach((pc) => {
        const palm = this.createArecaPalm(pc[0], pc[1], pc[2]);
        this.propsGroups.bamboo.add(palm);
      });

      // 3. Traditional Vietnamese Village Houses (Nhà ngói cổ & nhà mái tranh - NO BoxGeometry!)
      // Near Hạ Hồi (South-West)
      const house1 = this.createVillageHouse(-35, 1.0, 78, 'tile');
      const house2 = this.createVillageHouse(-45, 1.2, 72, 'thatched');
      const house3 = this.createVillageHouse(-52, 1.5, 62, 'thatched');
      this.propsGroups.village.add(house1, house2, house3);

      // Village Pond (Ao làng)
      const pondGeo = new THREE.CylinderGeometry(8.5, 9.0, 0.4, 16);
      const pondMat = new THREE.MeshLambertMaterial({ color: 0x1e3f34, flatShading: true });
      const pond = new THREE.Mesh(pondGeo, pondMat);
      pond.position.set(-30, 0.2, 85);
      this.propsGroups.village.add(pond);

      // 4. War Drums (Trống trận Tây Sơn)
      const drum1 = this.createWarDrum(-18, 0.4, 48);
      const drum2 = this.createWarDrum(18, 0.4, 48);
      this.propsGroups.banners.add(drum1, drum2);
    }

    /**
     * Create Bamboo Grove (Bụi tre): Slender green cylinders with joint nodes and leafy clusters
     * NO BoxGeometry!
     */
    createBambooGrove(x, y, z) {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const stalkMat = new THREE.MeshLambertMaterial({ color: 0x3d702d, flatShading: true });
      const leafMat = new THREE.MeshLambertMaterial({ color: 0x5a943a, flatShading: true });

      const numStalks = 7;
      for (let s = 0; s < numStalks; s++) {
        const stalkGroup = new THREE.Group();
        const offsetX = (Math.random() - 0.5) * 3.2;
        const offsetZ = (Math.random() - 0.5) * 3.2;
        const height = 7 + Math.random() * 4.5;

        stalkGroup.position.set(offsetX, 0, offsetZ);

        // Segmented bamboo stalk
        const segCount = 4;
        for (let seg = 0; seg < segCount; seg++) {
          const segH = height / segCount;
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, segH, 5), stalkMat);
          stalk.position.y = seg * segH + segH / 2;
          stalkGroup.add(stalk);

          // Bamboo joint ring
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 5), stalkMat);
          ring.position.y = seg * segH;
          stalkGroup.add(ring);
        }

        // Leaf tuft at top (Cones & small clusters)
        const leafTuft = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 5), leafMat);
        leafTuft.position.y = height + 1.0;
        stalkGroup.add(leafTuft);

        // Gentle lean
        stalkGroup.rotation.z = (Math.random() - 0.5) * 0.2;
        stalkGroup.rotation.x = (Math.random() - 0.5) * 0.2;

        group.add(stalkGroup);
      }
      return group;
    }

    /**
     * Create Areca Palm (Cây cau): Slender curved trunk and radiating fan fronds
     * NO BoxGeometry!
     */
    createArecaPalm(x, y, z) {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4838, flatShading: true });
      const frondMat = new THREE.MeshLambertMaterial({ color: 0x3e7a32, flatShading: true });

      const trunkHeight = 11 + Math.random() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, trunkHeight, 6), trunkMat);
      trunk.position.y = trunkHeight / 2;
      group.add(trunk);

      // Fronds (6 radiating elongated cones)
      for (let f = 0; f < 6; f++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.8, 4), frondMat);
        frond.rotation.z = Math.PI / 3.2;
        frond.rotation.y = (f * Math.PI) / 3;
        frond.position.set(0, trunkHeight - 0.5, 0);
        group.add(frond);
      }

      return group;
    }

    /**
     * Traditional Vietnamese Village House:
     * Built entirely with cylinders (lim wood columns), cones and cylindrical roof prisms.
     * Absolutely NO BoxGeometry!
     */
    createVillageHouse(x, y, z, style = 'tile') {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const woodMat = new THREE.MeshLambertMaterial({ color: 0x4a3220, flatShading: true });
      const wallMat = new THREE.MeshLambertMaterial({ color: 0xdfd3be, flatShading: true });
      const roofColor = style === 'tile' ? 0x9b3822 : 0x826c48; // Clay tile vs Thatched straw
      const roofMat = new THREE.MeshLambertMaterial({ color: roofColor, flatShading: true });

      // 1. Raised earthen foundation / stylobate (Cylinder with 6 sides)
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.6, 6), woodMat);
      base.position.y = 0.3;
      group.add(base);

      // 2. Lim wood pillars (6 round columns)
      const colCoords = [
        [-3.2, -1.8],
        [0, -1.8],
        [3.2, -1.8],
        [-3.2, 1.8],
        [0, 1.8],
        [3.2, 1.8]
      ];
      colCoords.forEach((cc) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.6, 6), woodMat);
        col.position.set(cc[0], 2.1, cc[1]);
        group.add(col);
      });

      // 3. Walls (Wattle & daub earthen panels using flat cylinder segments)
      const wallFront = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 4), wallMat);
      wallFront.position.set(0, 1.8, -1.7);
      wallFront.scale.set(18, 1, 1);
      group.add(wallFront);

      // 4. Curved Vietnamese traditional roof (Mái ngói cong cổ truyền / Mái lá)
      // Formed by a 4-sided pitched cone with flared lower edges
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.6, 4), roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 4.6, 0);
      roof.scale.set(1.15, 1.0, 0.78);
      group.add(roof);

      return group;
    }

    /**
     * War Drum (Trống đồng / Trống lệnh Tây Sơn):
     * Barrel cylinder mounted on a rustic wood tripod
     */
    createWarDrum(x, y, z) {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      const woodMat = new THREE.MeshLambertMaterial({ color: 0x482c19, flatShading: true });
      const drumMat = new THREE.MeshLambertMaterial({ color: 0x8b2518, flatShading: true });
      const brassMat = new THREE.MeshLambertMaterial({ color: 0xc8963e, flatShading: true });

      // Tripod legs (3 angled cylinders)
      for (let l = 0; l < 3; l++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 5), woodMat);
        const angle = (l * 2 * Math.PI) / 3;
        leg.position.set(Math.cos(angle) * 1.0, 1.5, Math.sin(angle) * 1.0);
        leg.rotation.z = Math.cos(angle) * 0.25;
        leg.rotation.x = Math.sin(angle) * 0.25;
        group.add(leg);
      }

      // Drum body (Bulging cylinder)
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.8, 12), drumMat);
      drum.position.y = 3.2;
      group.add(drum);

      // Brass drum skin rings
      const rimTop = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.15, 12), brassMat);
      rimTop.position.y = 4.1;
      const rimBottom = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.15, 12), brassMat);
      rimBottom.position.y = 2.3;
      group.add(rimTop, rimBottom);

      return group;
    }

    /**
     * Environment: Low-poly trees, rocks, instanced grass tufts, and floating particle system
     */
    buildEnvironmentProps() {
      // 1. Stylized trees (Cylinder trunk + Icosahedron foliage clusters)
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x48321e, flatShading: true });
      const greenTones = [0x2f542c, 0x3d6638, 0x4f7c46];

      const treePositions = [
        [-52, 2.5, 45],
        [-62, 1.8, 15],
        [-45, 1.2, -35],
        [-58, 2.8, -50],
        [55, 1.5, -45],
        [65, 1.0, -25],
        [60, 0.8, 60],
        [-35, 1.0, 85],
        [28, 0.6, 75],
        [-18, 0.5, -60],
        [22, 0.6, -62],
        [-65, 2.0, 70]
      ];

      treePositions.forEach((tp, idx) => {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(tp[0], tp[1], tp[2]);

        const scale = 0.85 + Math.random() * 0.45;
        treeGroup.scale.set(scale, scale, scale);

        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 5, 5), woodMat);
        trunk.position.y = 2.5;
        treeGroup.add(trunk);

        // Foliage blobs (3 clustered icosahedrons)
        const folColor = greenTones[idx % greenTones.length];
        const folMat = new THREE.MeshLambertMaterial({ color: folColor, flatShading: true });

        const blob1 = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 0), folMat);
        blob1.position.set(0, 5.8, 0);
        treeGroup.add(blob1);

        const blob2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 0), folMat);
        blob2.position.set(-1.0, 4.6, 0.8);
        treeGroup.add(blob2);

        const blob3 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 0), folMat);
        blob3.position.set(1.1, 4.8, -0.6);
        treeGroup.add(blob3);

        this.scene.add(treeGroup);
      });

      // 2. Low-poly boulders / rocks (Dodecahedrons)
      const rockMat = new THREE.MeshLambertMaterial({ color: 0x5a636e, flatShading: true });
      const rockCoords = [
        [-28, 1.0, -10],
        [18, 0.8, -8],
        [24, 0.2, 8],
        [-15, 0.3, 35],
        [20, 0.4, 52],
        [-38, 1.4, 30]
      ];
      rockCoords.forEach((rc) => {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + Math.random() * 0.9, 0), rockMat);
        rock.position.set(rc[0], rc[1], rc[2]);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        this.scene.add(rock);
      });

      // 3. Instanced Grass Tufts
      const grassCount = this.quality === 'high' ? 80 : 35;
      const grassGeo = new THREE.ConeGeometry(0.2, 0.8, 3);
      const grassMat = new THREE.MeshLambertMaterial({ color: 0x527a3c, flatShading: true });
      const grassInstanced = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
      const dummy = new THREE.Object3D();

      for (let g = 0; g < grassCount; g++) {
        const gx = (Math.random() - 0.5) * 160;
        const gz = (Math.random() - 0.5) * 160;
        dummy.position.set(gx, 0.4, gz);
        dummy.scale.set(1 + Math.random() * 0.5, 0.8 + Math.random() * 0.8, 1);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        grassInstanced.setMatrixAt(g, dummy.matrix);
      }
      this.scene.add(grassInstanced);

      // 4. Drifting dust/ember particles (Fire sparks & mist)
      if (this.quality === 'high') {
        const particleCount = 140;
        const partGeo = new THREE.BufferGeometry();
        const partPos = [];
        for (let p = 0; p < particleCount; p++) {
          partPos.push((Math.random() - 0.5) * 150, 1.5 + Math.random() * 14, (Math.random() - 0.5) * 150);
        }
        partGeo.setAttribute('position', new THREE.Float32BufferAttribute(partPos, 3));
        const partMat = new THREE.PointsMaterial({
          color: 0xef8833, // Warm fire spark amber
          size: 0.9,
          transparent: true,
          opacity: 0.55
        });
        this.particles = new THREE.Points(partGeo, partMat);
        this.scene.add(this.particles);
      }
    }

    /**
     * Birds circling above the battlefield
     */
    buildBirdFlock() {
      const birdMat = new THREE.MeshBasicMaterial({ color: 0x221a15 });
      for (let b = 0; b < 6; b++) {
        const birdGroup = new THREE.Group();
        const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 3), birdMat);
        wingL.rotation.z = Math.PI / 2.6;
        wingL.position.x = -0.6;
        const wingR = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 3), birdMat);
        wingR.rotation.z = -Math.PI / 2.6;
        wingR.position.x = 0.6;
        birdGroup.add(wingL, wingR);

        birdGroup.position.set(-20 + Math.random() * 40, 48 + Math.random() * 12, -10 + Math.random() * 40);
        birdGroup.userData = {
          angle: Math.random() * Math.PI * 2,
          radius: 35 + Math.random() * 25,
          speed: 0.4 + Math.random() * 0.25,
          altitude: birdGroup.position.y
        };
        this.scene.add(birdGroup);
        this.birds.push(birdGroup);
      }
    }

    /**
     * Fortifications: Authentic timber palisade, watchtower with pitched roof,
     * tents, and cannons. NO BoxGeometry used anywhere!
     */
    buildFortifications() {
      const woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1a, flatShading: true });
      const stakeMat = new THREE.MeshLambertMaterial({ color: 0x4f3721, flatShading: true });
      const roofMat = new THREE.MeshLambertMaterial({ color: 0x962d22, flatShading: true });
      const tentMat = new THREE.MeshLambertMaterial({ color: 0x8a7f6c, flatShading: true });

      // ==========================================
      // 1. ĐỒN HẠ HỒI (Southern outpost: x ≈ -25, z ≈ 60)
      // ==========================================
      const haHoiGroup = new THREE.Group();
      haHoiGroup.position.set(-25, 0.4, 60);

      // Palisade stakes around Hạ Hồi
      for (let s = -10; s <= 10; s += 1.8) {
        const stake = this.createPointedStake(0.24, 3.4 + Math.sin(s) * 0.4, stakeMat);
        stake.position.set(s, 0, 0);
        haHoiGroup.add(stake);
      }

      // Conical canvas tents (ConeGeometry)
      [-7, 0, 7].forEach((tx) => {
        const tent = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 6), tentMat);
        tent.position.set(tx, 1.6, -5);
        haHoiGroup.add(tent);
        this.propsGroups.tents.add(tent.clone());
      });
      this.propsGroups.palisade.add(haHoiGroup);
      this.landmarks.haHoi = haHoiGroup;

      // ==========================================
      // 2. ĐỒN NGỌC HỒI (Central fortress: x ≈ 0, z ≈ -15)
      // ==========================================
      const ngocHoiGroup = new THREE.Group();
      ngocHoiGroup.position.set(0, 0, -15);

      // Main earthen rampart berm: curved bank using a segmented cylindrical prism (NO BoxGeometry!)
      const bermGeo = new THREE.CylinderGeometry(24, 25, 3.8, 20, 1, false, 0, Math.PI);
      const bermMat = new THREE.MeshLambertMaterial({ color: 0x4f3c2b, flatShading: true });
      const berm = new THREE.Mesh(bermGeo, bermMat);
      berm.rotation.z = Math.PI / 2;
      berm.rotation.y = Math.PI / 2;
      berm.position.set(0, 1.6, 0);
      berm.scale.set(0.65, 1.0, 0.45);
      ngocHoiGroup.add(berm);

      // Wooden Palisade: Two tiers of pointed stakes with slight angle and height variation
      for (let x = -24; x <= 24; x += 1.3) {
        if (Math.abs(x) < 4.0) continue; // Gate opening
        const height = 3.6 + Math.sin(x * 1.5) * 0.4;
        const stake = this.createPointedStake(0.25, height, stakeMat);
        stake.position.set(x, 2.2, 1.8);
        stake.rotation.x = 0.08;
        stake.rotation.z = (Math.random() - 0.5) * 0.08;
        ngocHoiGroup.add(stake);
      }

      // Defensive anti-cavalry chông sắt stakes in front
      const ironStakeMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
      for (let cx = -22; cx <= 22; cx += 2.2) {
        const chong = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.4, 4), ironStakeMat);
        chong.rotation.x = Math.PI / 3.5;
        chong.position.set(cx, 0.6, 5.0);
        ngocHoiGroup.add(chong);
      }

      // Fortress Gate posts (Log pillars + cross timber)
      const gateL = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 7.5, 6), woodDarkMat);
      gateL.position.set(-4.2, 3.75, 1.8);
      const gateR = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 7.5, 6), woodDarkMat);
      gateR.position.set(4.2, 3.75, 1.8);
      const gateBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 9.2, 6), woodDarkMat);
      gateBeam.rotation.z = Math.PI / 2;
      gateBeam.position.set(0, 7.2, 1.8);
      ngocHoiGroup.add(gateL, gateR, gateBeam);

      // Watchtowers on flanks (Four log pillars + timber platform + 4-sided pitched roof)
      [-24, 24].forEach((tx) => {
        const towerGroup = new THREE.Group();
        towerGroup.position.set(tx, 0, 0);

        // 4 pillars
        [-1.8, 1.8].forEach((px) => {
          [-1.8, 1.8].forEach((pz) => {
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 10.5, 5), woodDarkMat);
            pillar.position.set(px, 5.25, pz);
            towerGroup.add(pillar);
          });
        });

        // Platform logs
        for (let l = -1.6; l <= 1.6; l += 0.5) {
          const plank = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 4), woodDarkMat);
          plank.rotation.z = Math.PI / 2;
          plank.position.set(0, 8.5, l);
          towerGroup.add(plank);
        }

        // Pitched pagoda-style roof (Cone with 4 segments rotated 45 deg)
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.2, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(0, 11.2, 0);
        towerGroup.add(roof);

        ngocHoiGroup.add(towerGroup);
      });

      // Cannons (Đại bác Mãn Thanh)
      const cannonMat = new THREE.MeshLambertMaterial({ color: 0x1f2326, flatShading: true });
      [-14, -8, 8, 14].forEach((cx) => {
        const cannon = this.createCannonModel(cannonMat);
        cannon.position.set(cx, 3.0, 0.2);
        cannon.rotation.y = Math.PI; // Aimed south towards oncoming Tây Sơn
        ngocHoiGroup.add(cannon);
        this.units.qingCannons.push(cannon);
      });

      // Qing Garrison Command Tents inside fortress
      [-12, 0, 12].forEach((tx, i) => {
        const tent = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.8, 6), tentMat);
        tent.position.set(tx, 2.5, -9 - i * 2);
        ngocHoiGroup.add(tent);
      });

      this.propsGroups.palisade.add(ngocHoiGroup);
      this.landmarks.ngocHoi = ngocHoiGroup;

      // ==========================================
      // 3. CẦU PHAO SÔNG NHỊ HÀ (Thăng Long bridge: z ≈ -85)
      // ==========================================
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(0, -1.8, -85);

      // Wooden boats (composed of tapered cylindrical hulls, NO BoxGeometry)
      for (let bx = -36; bx <= 36; bx += 7.2) {
        const boat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 1.1, 8.5, 6),
          new THREE.MeshLambertMaterial({ color: 0x3d2719, flatShading: true })
        );
        boat.rotation.x = Math.PI / 2;
        boat.position.set(bx, 0, 0);
        boat.scale.set(1.4, 0.7, 1);
        bridgeGroup.add(boat);
      }

      // Wooden planks across boats
      for (let px = -38; px <= 38; px += 0.8) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 4), woodDarkMat);
        log.rotation.x = Math.PI / 2;
        log.position.set(px, 0.6, 0);
        bridgeGroup.add(log);
      }

      this.scene.add(bridgeGroup);
      this.landmarks.bridge = bridgeGroup;
    }

    /**
     * Helper to create pointed wooden stakes without BoxGeometry
     */
    createPointedStake(radius, height, material) {
      const stakeGroup = new THREE.Group();
      const bodyH = height * 0.78;
      const tipH = height * 0.22;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, bodyH, 5), material);
      body.position.y = bodyH / 2;
      stakeGroup.add(body);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(radius, tipH, 5), material);
      tip.position.y = bodyH + tipH / 2;
      stakeGroup.add(tip);

      return stakeGroup;
    }

    /**
     * Cannon Model: Tapered cylinder barrel on wooden wheeled carriage (NO BoxGeometry)
     */
    createCannonModel(material) {
      const group = new THREE.Group();
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x4f3721, flatShading: true });

      // Barrel: Tapered cylinder
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 2.6, 8), material);
      barrel.rotation.x = Math.PI / 2.3;
      barrel.position.set(0, 0.7, 0);
      group.add(barrel);

      // Wheels: Thin flat cylinders
      [-0.55, 0.55].forEach((wx) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 8), woodMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.45, 0.1);
        group.add(wheel);
      });

      return group;
    }

    /**
     * Build Forces & Units using NO BoxGeometry!
     * Stylized low-poly soldiers (cylinders + spheres + cones) with organic instancing,
     * walking bobs, and sculptured war elephants.
     */
    buildTroopFormations() {
      const isCustom = this.options.isCustomScenario;
      const choices = this.options.studentChoices || {};

      // ===================================================
      // 1. TÂY SƠN WAR ELEPHANTS (Tượng binh dũng mãnh)
      // ===================================================
      const useCavalryInstead = isCustom && choices.elephants === 'cavalry_instead';
      const keepInReserve = isCustom && choices.elephants === 'elephants_reserve';

      if (!useCavalryInstead) {
        const elephantCount = 5;
        for (let i = 0; i < elephantCount; i++) {
          const elephant = this.createWarElephantModel();
          const startZ = keepInReserve ? 75 : 46;
          const startX = (i - 2) * 8.5;
          elephant.position.set(startX, 0.2, startZ);
          elephant.userData = {
            baseX: startX,
            baseZ: startZ,
            targetZ: keepInReserve ? 22 : -6,
            legs: elephant.userData.legs
          };
          this.propsGroups.elephants.add(elephant);
          this.units.taySonElephants.push(elephant);
        }
      }

      // ===================================================
      // 2. TÂY SƠN INFANTRY & SHIELDS (Bộ binh Tây Sơn)
      // ===================================================
      const shieldType = isCustom ? choices.shield : 'wet_straw_shields';
      const isDispersed = shieldType === 'dispersed_rush';
      const rows = isDispersed ? 4 : 3;
      const cols = isDispersed ? 9 : 7;
      const spacingX = isDispersed ? 5.2 : 3.8;
      const spacingZ = isDispersed ? 4.8 : 3.2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const soldier = this.createSoldierModel({
            faction: 'tayson',
            shieldType: shieldType,
            hasBanner: r === 0 && c === Math.floor(cols / 2)
          });

          // Organic jitter in position and facing
          const jitterX = (Math.random() - 0.5) * 0.9;
          const jitterZ = (Math.random() - 0.5) * 0.9;
          const startX = (c - cols / 2 + 0.5) * spacingX + jitterX;
          const startZ = 52 + r * spacingZ + jitterZ;

          soldier.position.set(startX, 0.1, startZ);
          soldier.rotation.y = (Math.random() - 0.5) * 0.18;

          soldier.userData = {
            baseX: startX,
            baseZ: startZ,
            targetZ: -8 + (Math.random() - 0.5) * 3,
            strideSeed: Math.random() * 10
          };

          this.scene.add(soldier);
          this.units.taySonSoldiers.push(soldier);
        }
      }

      // ===================================================
      // 3. ĐẠO QUÂN ĐÔ ĐỐC BẢO VU HỒI TẠI ĐẦM MỰC
      // ===================================================
      const hasFlankAmbush = !(isCustom && choices.direction === 'frontal_allout');
      if (hasFlankAmbush) {
        for (let f = 0; f < 8; f++) {
          const flankSoldier = this.createSoldierModel({
            faction: 'tayson',
            shieldType: 'standard_wood_shields',
            hasBanner: f === 0
          });
          const fx = 38 + (f % 3) * 3.8 + (Math.random() - 0.5) * 0.6;
          const fz = 12 + Math.floor(f / 3) * 5.2 + (Math.random() - 0.5) * 0.6;
          flankSoldier.position.set(fx, 0.1, fz);
          flankSoldier.rotation.y = -Math.PI / 2.1;
          this.scene.add(flankSoldier);
          this.units.taySonFlank.push(flankSoldier);
        }
      }

      // ===================================================
      // 4. QUÂN MÃN THANH CỐ THỦ (Qing Garrison)
      // ===================================================
      for (let q = 0; q < 22; q++) {
        const qingSoldier = this.createSoldierModel({
          faction: 'qing',
          shieldType: 'none',
          hasBanner: q === 5 || q === 16
        });

        const qx = ((q % 11) - 5) * 4.2 + (Math.random() - 0.5) * 0.7;
        const qz = -14 + Math.floor(q / 11) * 4.5 + (Math.random() - 0.5) * 0.7;
        qingSoldier.position.set(qx, 2.5, qz);
        qingSoldier.userData = {
          baseX: qx,
          baseZ: qz,
          seed: q
        };
        this.scene.add(qingSoldier);
        this.units.qingSoldiers.push(qingSoldier);
      }
    }

    /**
     * Soldier Model: Built completely without BoxGeometry!
     * Capsule/cylinder body, sphere head, conical hat/nón lá or Qing helmet,
     * thin cylinder spear, curved wet straw shield or round buckler.
     */
    createSoldierModel(cfg = {}) {
      const group = new THREE.Group();
      const faction = cfg.faction || 'tayson';
      const shieldType = cfg.shieldType || 'wet_straw_shields';

      const isTaySon = faction === 'tayson';
      const tunicHex = isTaySon ? this.factionColors.taySon : this.factionColors.qing;
      const tunicColor = new THREE.Color(tunicHex);
      const skinColor = 0xd6a374;
      const darkPants = 0x221a15;

      const tunicMat = new THREE.MeshLambertMaterial({ color: tunicColor, flatShading: true });
      const skinMat = new THREE.MeshLambertMaterial({ color: skinColor, flatShading: true });
      const pantsMat = new THREE.MeshLambertMaterial({ color: darkPants, flatShading: true });

      // 1. Torso: Tapered Cylinder
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 1.25, 6), tunicMat);
      torso.position.y = 1.35;
      group.add(torso);

      // 2. Legs: Two small cylinders
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.9, 5), pantsMat);
      legL.position.set(-0.2, 0.45, 0);
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.9, 5), pantsMat);
      legR.position.set(0.2, 0.45, 0);
      group.add(legL, legR);

      // 3. Head: Low-poly sphere
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), skinMat);
      head.position.y = 2.22;
      group.add(head);

      // 4. Headwear: Authentic Nón Lá (Cone) for Tây Sơn or Mandarin Hat for Qing
      if (isTaySon) {
        const nonLaMat = new THREE.MeshLambertMaterial({ color: 0xdeb887, flatShading: true });
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.48, 8), nonLaMat);
        hat.position.y = 2.52;
        group.add(hat);
      } else {
        const qingHatMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.38, 8), qingHatMat);
        hat.position.y = 2.45;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 4, 4), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        knob.position.y = 2.68;
        group.add(hat, knob);
      }

      // 5. Weapon: Spear (Giáo dài - Cylinder)
      const spearMat = new THREE.MeshLambertMaterial({ color: 0x5a4430, flatShading: true });
      const tipMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, flatShading: true });
      const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 4), spearMat);
      spearShaft.position.set(0.48, 1.6, 0.2);
      spearShaft.rotation.x = -0.15;
      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), tipMat);
      spearTip.position.set(0.48, 3.25, 0.0);
      group.add(spearShaft, spearTip);

      // 6. Shield based on tactical option (NO BoxGeometry)
      if (isTaySon && shieldType !== 'none' && shieldType !== 'dispersed_rush') {
        if (shieldType === 'wet_straw_shields') {
          // Curved wet-straw wicker pavise: Segment of a large cylinder
          const shieldGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.2, 8, 1, true, 0, Math.PI / 2.5);
          const shieldMat = new THREE.MeshLambertMaterial({
            color: 0x6e5b41, // Damp dark straw thatch
            side: THREE.DoubleSide,
            flatShading: true
          });
          const shield = new THREE.Mesh(shieldGeo, shieldMat);
          shield.rotation.y = Math.PI / 1.3;
          shield.position.set(0, 1.25, 0.65);
          group.add(shield);
        } else if (shieldType === 'standard_wood_shields') {
          // Round buckler shield (Thin flat cylinder or disc)
          const shieldGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 8);
          const shieldMat = new THREE.MeshLambertMaterial({ color: 0x543a24, flatShading: true });
          const shield = new THREE.Mesh(shieldGeo, shieldMat);
          shield.rotation.x = Math.PI / 2;
          shield.position.set(-0.45, 1.35, 0.4);
          group.add(shield);
        }
      }

      // 7. Tactical Banner / Cờ ngũ sắc Tây Sơn
      if (cfg.hasBanner) {
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 5.2, 5), spearMat);
        flagPole.position.set(-0.45, 2.6, -0.2);
        group.add(flagPole);

        const flagMat = new THREE.MeshLambertMaterial({
          color: isTaySon ? 0xcc292b : 0x1d4ed8,
          side: THREE.DoubleSide,
          flatShading: true
        });
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 4, 1), flagMat);
        flag.position.set(0.45, 4.4, -0.2);
        group.add(flag);
        this.flags.push(flag);
        this.propsGroups.banners.add(flag.clone());
      }

      return group;
    }

    /**
     * War Elephant Model: Built entirely from rounded and low-poly primitives without BoxGeometry!
     * Ellipsoid body, sphere head, tapered tube curved trunk, cone tusks, cylinder legs,
     * octagonal howdah (bành voi), mounted brass swivel cannon.
     */
    createWarElephantModel() {
      const elephantGroup = new THREE.Group();
      const hideMat = new THREE.MeshLambertMaterial({ color: 0x585652, flatShading: true });
      const tuskMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e1, flatShading: true });
      const howdahMat = new THREE.MeshLambertMaterial({ color: 0x7c2d12, flatShading: true });
      const cannonMat = new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true });

      // 1. Torso: Sphere scaled into a muscular ellipsoid (NO BoxGeometry)
      const bodyGeo = new THREE.SphereGeometry(2.8, 8, 7);
      const body = new THREE.Mesh(bodyGeo, hideMat);
      body.scale.set(1.15, 1.0, 1.6);
      body.position.set(0, 3.8, 0);
      elephantGroup.add(body);

      // 2. Head: Rounded sphere
      const head = new THREE.Mesh(new THREE.SphereGeometry(1.65, 7, 6), hideMat);
      head.position.set(0, 4.8, -3.2);
      elephantGroup.add(head);

      // 3. Trunk: Curved tube formed by a quadratic bezier curve
      const trunkCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 4.6, -4.2),
        new THREE.Vector3(0, 2.0, -5.8),
        new THREE.Vector3(0, 3.0, -6.8)
      );
      const trunkGeo = new THREE.TubeGeometry(trunkCurve, 8, 0.42, 6, false);
      const trunk = new THREE.Mesh(trunkGeo, hideMat);
      elephantGroup.add(trunk);

      // 4. Tusks: Sharp conical ivory tusks curving forward
      [-0.85, 0.85].forEach((tx) => {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.2, 2.2, 5), tuskMat);
        tusk.position.set(tx, 4.0, -4.8);
        tusk.rotation.x = -Math.PI / 3.2;
        elephantGroup.add(tusk);
      });

      // 5. Ears: Flapping fan cones
      [-1.4, 1.4].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.4, 0.12, 6), hideMat);
        ear.rotation.z = Math.PI / 2.2;
        ear.rotation.y = ex > 0 ? -0.3 : 0.3;
        ear.position.set(ex, 5.0, -2.8);
        elephantGroup.add(ear);
      });

      // 6. Legs: 4 thick pillars (Cylinders)
      const legGeo = new THREE.CylinderGeometry(0.68, 0.8, 3.2, 6);
      const legFL = new THREE.Mesh(legGeo, hideMat);
      legFL.position.set(-1.45, 1.6, -1.8);
      const legFR = new THREE.Mesh(legGeo, hideMat);
      legFR.position.set(1.45, 1.6, -1.8);
      const legBL = new THREE.Mesh(legGeo, hideMat);
      legBL.position.set(-1.45, 1.6, 1.8);
      const legBR = new THREE.Mesh(legGeo, hideMat);
      legBR.position.set(1.45, 1.6, 1.8);
      elephantGroup.add(legFL, legFR, legBL, legBR);

      elephantGroup.userData.legs = [legFL, legFR, legBL, legBR];

      // 7. Howdah (Bành voi Tây Sơn: octagonal open cylinder basket, NO BoxGeometry)
      const howdahGeo = new THREE.CylinderGeometry(1.6, 1.4, 1.3, 8, 1, true);
      const howdah = new THREE.Mesh(howdahGeo, howdahMat);
      howdah.position.set(0, 6.8, -0.3);
      elephantGroup.add(howdah);

      // Floor of howdah (flat circular cylinder)
      const howdahFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 8), howdahMat);
      howdahFloor.position.set(0, 6.2, -0.3);
      elephantGroup.add(howdahFloor);

      // 8. Mounted Swivel Cannon (Đại pháo lưng voi)
      const elephantCannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.2, 7), cannonMat);
      elephantCannon.rotation.x = Math.PI / 2.15;
      elephantCannon.position.set(0, 7.3, -1.2);
      elephantGroup.add(elephantCannon);

      // 9. Flag on elephant howdah
      const flagPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 4.0, 4),
        new THREE.MeshLambertMaterial({ color: 0x3d2719 })
      );
      flagPole.position.set(-1.1, 8.5, 0.8);
      elephantGroup.add(flagPole);

      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.0, 3, 1),
        new THREE.MeshLambertMaterial({ color: 0xd97706, side: THREE.DoubleSide })
      );
      flag.position.set(-0.3, 9.8, 0.8);
      elephantGroup.add(flag);
      this.flags.push(flag);

      return elephantGroup;
    }

    /**
     * Tactical Advance Ribbons & Ground Paths
     */
    buildTacticalDecals() {
      // Main central advance ribbon: Gold/crimson arrow path on ground
      const pathCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.25, 65),
        new THREE.Vector3(-3, 0.25, 35),
        new THREE.Vector3(0, 0.25, 10),
        new THREE.Vector3(0, 1.8, -12)
      ]);

      const ribbonGeo = new THREE.TubeGeometry(pathCurve, 24, 0.65, 4, false);
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.82
      });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      this.scene.add(ribbon);
      this.tacticalMarkers.push(ribbon);

      // Flank ambush path to Đầm Mực
      const flankCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(38, 0.25, 30),
        new THREE.Vector3(26, 0.25, 12),
        new THREE.Vector3(8, 0.25, -5)
      ]);
      const flankGeo = new THREE.TubeGeometry(flankCurve, 16, 0.45, 4, false);
      const flankMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75
      });
      const flankRibbon = new THREE.Mesh(flankGeo, flankMat);
      this.scene.add(flankRibbon);
      this.tacticalMarkers.push(flankRibbon);
    }

    /**
     * Floating Labels: Small floating 3D beacons at key historical positions
     */
    buildFloatingLabels() {
      const labelData = [
        { name: 'Đồn then chốt Ngọc Hồi', pos: [0, 13.5, -15], color: 0xf5b041 },
        { name: 'Đầm Mực (Phục kích)', pos: [40, 7.5, 22], color: 0x38bdf8 },
        { name: 'Cầu phao sông Nhị Hà', pos: [0, 7.5, -85], color: 0x94a3b8 }
      ];

      labelData.forEach((ld) => {
        const beaconGroup = new THREE.Group();
        beaconGroup.position.set(ld.pos[0], ld.pos[1], ld.pos[2]);

        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.7, 0),
          new THREE.MeshBasicMaterial({ color: ld.color, wireframe: false })
        );
        beaconGroup.add(gem);
        beaconGroup.userData = { gem: gem };

        this.scene.add(beaconGroup);
        this.floatingLabels.push(beaconGroup);
      });
    }

    /**
     * Timeline animation step (0.0 to 1.0)
     */
    updateTimeline(progress) {
      this.currentTime = Math.max(0, Math.min(1, progress));
      const t = this.currentTime;
      const choices = this.options.studentChoices || {};
      const isDay = choices.timing === 'midday_light';

      // 1. Lighting transition: Dawn sunrise
      if (this.lights.sun && !isDay) {
        const dawnR = 0.5 + t * 0.45;
        const dawnG = 0.45 + t * 0.45;
        const dawnB = 0.35 + t * 0.45;
        this.lights.sun.color.setRGB(dawnR, dawnG, dawnB);
        this.lights.sun.intensity = 0.75 + t * 0.6;
      }

      // 2. War Elephants Stride & Advance
      this.units.taySonElephants.forEach((ele, idx) => {
        const u = ele.userData;
        const chargeProgress = Math.max(0, Math.min(1, (t - 0.28) / 0.58));
        const curZ = u.baseZ + (u.targetZ - u.baseZ) * chargeProgress;
        ele.position.z = curZ;

        // Walking stride: swing legs and gentle sway
        if (chargeProgress > 0 && chargeProgress < 1) {
          const strideCycle = t * 35 + idx;
          ele.rotation.z = Math.sin(strideCycle) * 0.04;
          ele.position.y = 0.2 + Math.abs(Math.sin(strideCycle)) * 0.25;

          if (u.legs) {
            u.legs[0].rotation.x = Math.sin(strideCycle) * 0.4;
            u.legs[1].rotation.x = -Math.sin(strideCycle) * 0.4;
            u.legs[2].rotation.x = -Math.sin(strideCycle) * 0.4;
            u.legs[3].rotation.x = Math.sin(strideCycle) * 0.4;
          }
        } else {
          ele.rotation.z = 0;
          ele.position.y = 0.2;
          if (u.legs) {
            u.legs.forEach((l) => (l.rotation.x = 0));
          }
        }
      });

      // 3. Tây Sơn Infantry Charge & Walking Bob
      this.units.taySonSoldiers.forEach((inf, idx) => {
        const u = inf.userData;
        const infantryProgress = Math.max(0, Math.min(1, (t - 0.25) / 0.65));
        const curZ = u.baseZ + (u.targetZ - u.baseZ) * infantryProgress;
        inf.position.z = curZ;

        // Walking bob animation
        if (infantryProgress > 0 && infantryProgress < 1) {
          inf.position.y = 0.1 + Math.abs(Math.sin(t * 45 + u.strideSeed)) * 0.28;
          inf.rotation.z = Math.sin(t * 30 + u.strideSeed) * 0.05;
        } else {
          inf.position.y = 0.1;
          inf.rotation.z = 0;
        }

        // Breaching fortress at end
        if (t > 0.88) {
          inf.position.z = u.targetZ - (t - 0.88) * 38;
        }
      });

      // 4. Đô đốc Bảo Flank Ambush from Đầm Mực
      this.units.taySonFlank.forEach((sol, idx) => {
        if (t > 0.55) {
          const flankProgress = (t - 0.55) / 0.45;
          sol.position.x = 38 - flankProgress * 28;
          sol.position.z = 12 - flankProgress * 22;
          sol.position.y = 0.1 + Math.abs(Math.sin(t * 40 + idx)) * 0.25;
        } else {
          sol.position.x = 38 + (idx % 3) * 3.8;
          sol.position.z = 12 + Math.floor(idx / 3) * 5.2;
          sol.position.y = 0.1;
        }
      });

      // 5. Qing Defenders retreat in panic
      this.units.qingSoldiers.forEach((q, idx) => {
        const u = q.userData;
        if (t > 0.72) {
          const fleeProgress = (t - 0.72) / 0.28;
          q.position.z = u.baseZ - fleeProgress * 55;
          q.rotation.y = Math.PI + Math.sin(t * 20 + idx) * 0.4;
          q.position.y = 2.5 + Math.abs(Math.sin(t * 50 + idx)) * 0.3;
        } else {
          q.position.z = u.baseZ;
          q.rotation.y = 0;
          q.position.y = 2.5;
        }
      });

      // Progress callback
      if (typeof this.options.onProgressUpdate === 'function') {
        this.options.onProgressUpdate(this.currentTime);
      }
    }

    /**
     * Camera Presets with Smooth Transitions
     */
    setCameraPreset(presetName) {
      if (!this.controls) return;

      let targetPos = { x: 0, y: 72, z: 115 };
      let lookTarget = { x: 0, y: 5, z: -8 };

      switch (presetName) {
        case 'overview':
          targetPos = { x: 0, y: 75, z: 115 };
          lookTarget = { x: 0, y: 5, z: -8 };
          break;
        case 'follow_troops':
          targetPos = { x: -8, y: 22, z: 70 };
          lookTarget = { x: 0, y: 6, z: 5 };
          break;
        case 'close_up':
          targetPos = { x: -16, y: 14, z: 12 };
          lookTarget = { x: 0, y: 4, z: -15 };
          break;
        case 'top_down':
          targetPos = { x: 0, y: 115, z: 8 };
          lookTarget = { x: 0, y: 0, z: -5 };
          break;
        default:
          targetPos = { x: 0, y: 75, z: 115 };
          lookTarget = { x: 0, y: 5, z: -8 };
      }

      this.isCinematicOrbit = false;
      this.transitionCameraTo(targetPos, lookTarget, 1200);
    }

    transitionCameraTo(endPos, endLook, durationMs = 1200) {
      this.cameraTransition = {
        startTime: performance.now(),
        duration: durationMs,
        startPos: this.camera.position.clone(),
        endPos: new THREE.Vector3(endPos.x, endPos.y, endPos.z),
        startLook: this.controls.target.clone(),
        endLook: new THREE.Vector3(endLook.x, endLook.y, endLook.z)
      };
    }

    toggleCinematicOrbit() {
      this.isCinematicOrbit = !this.isCinematicOrbit;
      if (this.isCinematicOrbit) {
        this.orbitAngle = Math.atan2(this.camera.position.x, this.camera.position.z);
      }
      return this.isCinematicOrbit;
    }

    /**
     * LIVE AUTHORING METHODS FOR TEACHER AREA
     */
    updatePropsVisibility(config = {}) {
      if (!config) return;
      Object.keys(config).forEach((propKey) => {
        if (this.propsGroups[propKey]) {
          this.propsGroups[propKey].visible = !!config[propKey];
        }
      });
    }

    updateFactionColors(colors = {}) {
      if (!colors) return;
      if (colors.taySon) this.factionColors.taySon = colors.taySon;
      if (colors.qing) this.factionColors.qing = colors.qing;
      // Re-tint soldiers
      const taySonColor = new THREE.Color(this.factionColors.taySon);
      const qingColor = new THREE.Color(this.factionColors.qing);

      this.units.taySonSoldiers.forEach((s) => {
        s.traverse((child) => {
          if (child.isMesh && child.material && child.material.color) {
            // If it's the torso
            if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.position.y > 1.0) {
              child.material.color.copy(taySonColor);
            }
          }
        });
      });
      this.units.qingSoldiers.forEach((s) => {
        s.traverse((child) => {
          if (child.isMesh && child.material && child.material.color) {
            if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.position.y > 1.0) {
              child.material.color.copy(qingColor);
            }
          }
        });
      });
    }

    updateUnitCounts(counts = {}) {
      if (!counts) return;
      // Adjust visible soldiers according to count
      if (counts.taySonInfantry !== undefined) {
        const limit = Math.min(this.units.taySonSoldiers.length, counts.taySonInfantry);
        this.units.taySonSoldiers.forEach((s, idx) => {
          s.visible = idx < limit;
        });
      }
      if (counts.qingInfantry !== undefined) {
        const limit = Math.min(this.units.qingSoldiers.length, counts.qingInfantry);
        this.units.qingSoldiers.forEach((s, idx) => {
          s.visible = idx < limit;
        });
      }
    }

    setQuality(quality) {
      this.quality = quality;
      if (this.renderer) {
        if (this.quality === 'high') {
          this.renderer.shadowMap.enabled = true;
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          if (this.lights.sun) this.lights.sun.castShadow = true;
          if (this.particles) this.particles.visible = true;
        } else {
          this.renderer.shadowMap.enabled = false;
          this.renderer.setPixelRatio(1);
          if (this.lights.sun) this.lights.sun.castShadow = false;
          if (this.particles) this.particles.visible = false;
        }
      }
    }

    play() {
      this.isPlaying = true;
    }

    pause() {
      this.isPlaying = false;
    }

    seek(progress) {
      this.updateTimeline(progress);
    }

    setSpeed(speed) {
      this.playbackSpeed = speed;
    }

    animate() {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

      const now = performance.now();
      const delta = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;

      // Handle timeline progression
      if (this.isPlaying) {
        const step = (delta / this.durationSeconds) * this.playbackSpeed;
        let nextTime = this.currentTime + step;
        if (nextTime > 1.0) {
          nextTime = 1.0;
          this.isPlaying = false;
        }
        this.updateTimeline(nextTime);
      }

      // Handle smooth camera interpolation
      if (this.cameraTransition) {
        const elapsed = now - this.cameraTransition.startTime;
        const alpha = Math.min(1.0, elapsed / this.cameraTransition.duration);
        const ease = alpha < 0.5 ? 4 * alpha * alpha * alpha : 1 - Math.pow(-2 * alpha + 2, 3) / 2;

        this.camera.position.lerpVectors(this.cameraTransition.startPos, this.cameraTransition.endPos, ease);
        this.controls.target.lerpVectors(this.cameraTransition.startLook, this.cameraTransition.endLook, ease);
        this.controls.update();

        if (alpha >= 1.0) {
          this.cameraTransition = null;
        }
      } else if (this.isCinematicOrbit && this.controls) {
        this.orbitAngle += delta * 0.12;
        const radius = 105;
        this.camera.position.x = Math.sin(this.orbitAngle) * radius;
        this.camera.position.z = Math.cos(this.orbitAngle) * radius + 10;
        this.camera.position.y = 62 + Math.sin(this.orbitAngle * 0.5) * 8;
        this.controls.target.set(0, 5, -8);
        this.controls.update();
      } else if (this.controls) {
        this.controls.update();
      }

      // Torch flame flicker
      this.torches.forEach((t) => {
        const flicker = Math.sin(now * 0.01 + t.seed) * 0.18 + Math.cos(now * 0.02 + t.seed * 2) * 0.12;
        if (t.light) {
          t.light.intensity = t.baseIntensity + flicker;
        }
        if (t.flame) {
          t.flame.scale.set(1 + flicker * 0.4, 1 + flicker * 0.6, 1 + flicker * 0.4);
        }
      });

      // Birds circling animation
      this.birds.forEach((b) => {
        const ud = b.userData;
        ud.angle += delta * ud.speed;
        b.position.x = Math.sin(ud.angle) * ud.radius;
        b.position.z = Math.cos(ud.angle) * ud.radius;
        b.position.y = ud.altitude + Math.sin(ud.angle * 2) * 2;
        b.rotation.y = ud.angle + Math.PI / 2;
      });

      // Waving flags animation
      if (this.flags.length > 0) {
        const wave = Math.sin(now * 0.005) * 0.15;
        this.flags.forEach((f) => {
          f.rotation.y = wave;
        });
      }

      // Floating labels crystal spin
      this.floatingLabels.forEach((fl) => {
        if (fl.userData && fl.userData.gem) {
          fl.userData.gem.rotation.y += delta * 1.2;
          fl.userData.gem.position.y = Math.sin(now * 0.003) * 0.35;
        }
      });

      this.renderer.render(this.scene, this.camera);
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width === 0 || height === 0) return;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    destroy() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      window.removeEventListener('resize', this.onResizeBound);
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  window.BattleScene3D = BattleScene3D;
})(window);
