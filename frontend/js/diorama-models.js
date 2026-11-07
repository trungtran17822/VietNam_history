/* Low-poly miniature figures for the diorama. Each kind is merged into one BufferGeometry with a
   per-vertex "role" so a faction palette can recolor it in place. Models face -Z (forward). */
(function (window) {
  'use strict';

  const ROLES = ['primary', 'trim', 'skin', 'dark', 'wood', 'hat', 'horse', 'elephant', 'elephantDark', 'ivory', 'canvas', 'wall', 'thatch', 'foliage', 'stem', 'flag', 'flagTrim'];
  const ROLE_INDEX = ROLES.reduce((acc, role, index) => { acc[role] = index; return acc; }, {});

  const matrix = (x, y, z, rx, ry, rz, sx, sy, sz) => {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || sx || 1, sz || sx || 1));
    return m;
  };

  function builder() {
    const parts = [];
    const api = {
      add(geometry, role, x, y, z, rx, ry, rz, sx, sy, sz) {
        const g = geometry.index ? geometry.toNonIndexed() : geometry;
        g.applyMatrix4(matrix(x, y, z, rx, ry, rz, sx, sy, sz));
        parts.push({ g, role: ROLE_INDEX[role] || 0 });
        if (g !== geometry) geometry.dispose();
        return api;
      },
      addMatrix(geometry, role, m) {
        const g = geometry.index ? geometry.toNonIndexed() : geometry;
        g.applyMatrix4(m); parts.push({ g, role: ROLE_INDEX[role] || 0 });
        if (g !== geometry) geometry.dispose();
        return api;
      },
      build() {
        let total = 0;
        parts.forEach((part) => { total += part.g.attributes.position.count; });
        const position = new Float32Array(total * 3); const normal = new Float32Array(total * 3);
        const roles = new Uint8Array(total); let offset = 0;
        parts.forEach((part) => {
          const count = part.g.attributes.position.count;
          position.set(part.g.attributes.position.array, offset * 3);
          if (!part.g.attributes.normal) part.g.computeVertexNormals();
          normal.set(part.g.attributes.normal.array, offset * 3);
          roles.fill(part.role, offset, offset + count);
          offset += count; part.g.dispose();
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
        geometry.userData.roles = roles;
        geometry.computeBoundingSphere();
        return geometry;
      }
    };
    return api;
  }

  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || 6);
  const cone = (r, h, s) => new THREE.ConeGeometry(r, h, s || 6);

  function pennant(length, height, depth) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(length, -height * .45); shape.lineTo(length * .78, -height * .5); shape.lineTo(length, -height * .62); shape.lineTo(0, -height); shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth: depth || .06, bevelEnabled: false });
  }

  function flagFor(b, faction, x, y, z, scale) {
    const s = scale || 1;
    if (faction === 'b') {
      // Quân Thanh: square banner with a light border.
      b.add(box(1.75 * s, 1.25 * s, .04), 'flagTrim', x + .88 * s, y - .62 * s, z);
      b.add(box(1.5 * s, 1.0 * s, .08), 'flag', x + .88 * s, y - .62 * s, z);
    } else {
      // Tây Sơn: swallow-tail pennant in vermilion with a bronze-gold edge.
      b.add(pennant(2.1 * s, 1.35 * s, .04), 'flagTrim', x, y + .06 * s, z - .02);
      b.add(pennant(1.85 * s, 1.1 * s, .08), 'flag', x, y - .06 * s, z - .04);
    }
  }

  function soldierBody(b, faction, y0) {
    const y = y0 || 0;
    b.add(box(.55, .9, .34), 'dark', 0, y + .45, 0);
    b.add(cyl(.3, .43, 1.0, 6), 'primary', 0, y + 1.4, 0);
    b.add(cyl(.44, .44, .13, 6), 'trim', 0, y + .96, 0);
    b.add(icosa(.27), 'skin', 0, y + 2.15, 0);
    if (faction === 'b') {
      b.add(new THREE.SphereGeometry(.31, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 'hat', 0, y + 2.24, 0);
      b.add(icosa(.1), 'trim', 0, y + 2.58, 0);
      b.add(box(.75, .16, .36), 'dark', 0, y + 1.86, 0);
    } else {
      b.add(cone(.64, .34, 8), 'hat', 0, y + 2.45, 0);
      b.add(box(.92, .18, .4), 'trim', 0, y + 1.86, 0);
    }
  }
  const icosa = (r) => new THREE.IcosahedronGeometry(r, 0);

  function spear(b, x, y, height) {
    b.add(box(.08, height, .08), 'wood', x, y + height / 2, 0);
    b.add(cone(.11, .4, 4), 'trim', x, y + height + .2, 0);
  }

  const MAKERS = {
    soldier(faction) {
      const b = builder(); soldierBody(b, faction); spear(b, .5, .2, 3.0);
      if (faction !== 'b') b.add(cyl(.42, .42, .08, 8), 'trim', -.42, 1.4, -.05, 0, 0, Math.PI / 2);
      return b.build();
    },
    drummer(faction) {
      const b = builder(); soldierBody(b, faction);
      b.add(cyl(.42, .42, .5, 10), 'trim', 0, 1.35, -.5, Math.PI / 2, 0, 0);
      b.add(cyl(.43, .43, .06, 10), 'canvas', 0, 1.35, -.77, Math.PI / 2, 0, 0);
      return b.build();
    },
    banner(faction) {
      const b = builder(); soldierBody(b, faction);
      b.add(box(.1, 4.8, .1), 'wood', .5, 2.4, 0);
      flagFor(b, faction, .55, 4.75, 0, 1);
      return b.build();
    },
    officer(faction) {
      // Mounted officer / cavalry.
      const b = builder();
      b.add(box(.82, .78, 2.0), 'horse', 0, 1.3, 0);
      b.add(box(.42, .9, .46), 'horse', 0, 1.85, -.95, -.55, 0, 0);
      b.add(box(.36, .38, .78), 'horse', 0, 2.25, -1.35);
      [[-.28, .7], [.28, .7], [-.28, -.7], [.28, -.7]].forEach(([x, z]) => b.add(box(.2, 1.0, .22), 'dark', x, .5, z));
      b.add(box(.14, .8, .14), 'dark', 0, 1.2, 1.05, .5, 0, 0);
      b.add(box(.9, .14, 1.0), 'trim', 0, 1.74, .05);
      b.add(cyl(.27, .36, .86, 6), 'primary', 0, 2.24, .1);
      b.add(icosa(.26), 'skin', 0, 2.88, .1);
      if (faction === 'b') b.add(new THREE.SphereGeometry(.3, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), 'hat', 0, 2.96, .1);
      else b.add(cone(.6, .32, 8), 'hat', 0, 3.17, .1);
      b.add(box(.08, 3.6, .08), 'wood', .5, 2.9, -.2, -.25, 0, 0);
      flagFor(b, faction, .54, 4.6, .3, .6);
      return b.build();
    },
    elephant(faction) {
      const b = builder();
      b.add(box(2.3, 2.1, 3.6), 'elephant', 0, 2.65, 0);
      [[-.78, 1.2], [.78, 1.2], [-.78, -1.2], [.78, -1.2]].forEach(([x, z]) => b.add(cyl(.42, .48, 1.75, 6), 'elephant', x, .88, z));
      b.add(box(1.7, 1.65, 1.35), 'elephant', 0, 3.05, -2.25);
      b.add(box(.16, 1.4, 1.15), 'elephantDark', -.98, 3.1, -1.95, 0, .35, 0);
      b.add(box(.16, 1.4, 1.15), 'elephantDark', .98, 3.1, -1.95, 0, -.35, 0);
      b.add(cyl(.32, .24, 1.2, 6), 'elephant', 0, 2.1, -2.95);
      b.add(cyl(.24, .16, 1.0, 6), 'elephant', 0, 1.15, -3.15, .3, 0, 0);
      b.add(cone(.13, 1.15, 5), 'ivory', -.48, 2.3, -3.15, -2.0, 0, 0);
      b.add(cone(.13, 1.15, 5), 'ivory', .48, 2.3, -3.15, -2.0, 0, 0);
      b.add(box(2.5, .16, 2.3), 'trim', 0, 3.75, .1);
      b.add(box(1.9, .95, 1.8), 'primary', 0, 4.25, .2);
      b.add(cone(1.55, 1.0, 4), 'trim', 0, 5.2, .2, 0, Math.PI / 4, 0);
      b.add(box(.09, 2.6, .09), 'wood', .7, 5.9, .6);
      flagFor(b, faction, .74, 7.15, .6, .85);
      return b.build();
    },
    tent() {
      const b = builder();
      b.add(cone(2.3, 2.9, 4), 'canvas', 0, 1.45, 0, 0, Math.PI / 4, 0);
      b.add(box(.9, 1.2, .1), 'dark', 0, .6, -1.62);
      b.add(box(.07, 1.2, .07), 'wood', 0, 3.3, 0);
      b.add(box(.9, .5, .05), 'primary', .45, 3.6, 0);
      return b.build();
    },
    village() {
      const b = builder();
      const roof = new THREE.Shape(); roof.moveTo(-1.95, 0); roof.lineTo(1.95, 0); roof.lineTo(0, 1.55); roof.closePath();
      b.add(box(3.2, 1.5, 2.4), 'wall', 0, .75, 0);
      b.add(new THREE.ExtrudeGeometry(roof, { depth: 3.0, bevelEnabled: false }), 'thatch', 0, 1.45, -1.5);
      b.add(box(.7, 1.0, .06), 'dark', 0, .5, 1.22);
      return b.build();
    },
    bamboo() {
      const b = builder();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2; const x = Math.cos(a) * .55; const z = Math.sin(a) * .55;
        const lean = .12 + (i % 3) * .05;
        b.add(cyl(.08, .12, 5.2, 4), 'stem', x, 2.6, z, Math.sin(a) * lean, 0, -Math.cos(a) * lean);
        b.add(cone(1.0, 2.8, 6), 'foliage', x + Math.cos(a) * .7, 5.0 + (i % 2) * .5, z + Math.sin(a) * .7, Math.sin(a) * .3, 0, -Math.cos(a) * .3);
      }
      b.add(icosa(1.3), 'foliage', 0, 4.4, 0);
      return b.build();
    },
    palisade() {
      const b = builder();
      for (let i = 0; i < 6; i++) {
        const x = -1.25 + i * .5; const h = 2.2 + (i % 2) * .35;
        b.add(cyl(.17, .2, h, 5), 'wood', x, h / 2, 0);
        b.add(cone(.17, .4, 5), 'wood', x, h + .2, 0);
      }
      b.add(box(3.0, .16, .16), 'dark', 0, 1.5, .18);
      b.add(box(3.0, .16, .16), 'dark', 0, .7, .18);
      return b.build();
    },
    watchtower(faction) {
      const b = builder();
      [[-.95, -.95], [.95, -.95], [-.95, .95], [.95, .95]].forEach(([x, z]) => b.add(box(.24, 5.2, .24), 'wood', x, 2.6, z));
      b.add(box(2.6, .26, 2.6), 'wood', 0, 5.1, 0);
      b.add(box(2.6, .7, .1), 'dark', 0, 5.55, -1.25);
      b.add(box(2.6, .7, .1), 'dark', 0, 5.55, 1.25);
      b.add(cone(2.2, 1.5, 4), 'thatch', 0, 6.7, 0, 0, Math.PI / 4, 0);
      b.add(box(.08, 1.8, .08), 'wood', 0, 8.0, 0);
      flagFor(b, faction || 'b', .04, 8.85, 0, .7);
      return b.build();
    },
    torch() {
      const b = builder();
      b.add(box(.14, 2.3, .14), 'wood', 0, 1.15, 0);
      b.add(cyl(.34, .18, .34, 6), 'trim', 0, 2.4, 0);
      return b.build();
    }
  };

  const colorCache = new Map();
  function toColor(value) {
    if (!colorCache.has(value)) colorCache.set(value, new THREE.Color(value));
    return colorCache.get(value);
  }

  function recolor(geometry, palette) {
    const roles = geometry.userData.roles;
    const attribute = geometry.attributes.color;
    const array = attribute.array;
    const lookup = ROLES.map((role) => toColor(palette[role] || palette.primary || '#888888'));
    for (let i = 0; i < roles.length; i++) {
      const c = lookup[roles[i]];
      array[i * 3] = c.r; array[i * 3 + 1] = c.g; array[i * 3 + 2] = c.b;
    }
    attribute.needsUpdate = true;
    return geometry;
  }

  function build(kind, faction, palette) {
    const maker = MAKERS[kind] || MAKERS.soldier;
    const geometry = maker(faction);
    if (palette) recolor(geometry, palette);
    return geometry;
  }

  window.DioramaModels = { build, recolor, ROLES, KINDS: Object.keys(MAKERS) };
})(window);
