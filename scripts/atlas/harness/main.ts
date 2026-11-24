// Throwaway harness for VietnamAtlasScene: plain DOM, no React. ?quality=high|low
import { LANDMARKS, UNITS, VietnamAtlasScene } from '../../../frontend/src/features/atlas/scene';
import { filterLandmarks, KINDS, type Kind } from '../../../frontend/src/features/atlas/search';

const params = new URLSearchParams(location.search);
const $ = (id: string) => document.getElementById(id)!;
const kinds = new Set<Kind>();
const scene = new VietnamAtlasScene($('map'), {
  quality: (params.get('quality') as 'high' | 'low') || undefined,
  assetBase: '/',
  onSelect: (id) => show(id),
});

function show(id: string | null) {
  const l = LANDMARKS.find((x) => x.id === id);
  const u = UNITS.find((x) => x.props.id === id);
  $('card').innerHTML = '';
  if (!l && !u) return;
  const h = document.createElement('h3');
  h.textContent = l?.name ?? u!.props.name;
  const p = document.createElement('p');
  p.textContent = l ? `${l.era ?? ''} · ${l.summary}` : `${u!.props.type === 'thanh-pho' ? 'Thành phố' : 'Tỉnh'} · ${u!.props.region}`;
  $('card').append(h, p);
}

function refresh() {
  const query = ($('q') as HTMLInputElement).value;
  scene.setFilter({ kinds: [...kinds], query });
  $('list').innerHTML = '';
  for (const { item } of filterLandmarks(LANDMARKS, { kinds: [...kinds], query }).slice(0, 12)) {
    const b = document.createElement('button');
    b.textContent = item.name;
    b.onclick = () => { scene.focusPlace(item.id); show(item.id); };
    const li = document.createElement('li');
    li.append(b);
    $('list').append(li);
  }
}

for (const k of KINDS) {
  const label = document.createElement('label');
  const box = Object.assign(document.createElement('input'), { type: 'checkbox' });
  box.onchange = () => { box.checked ? kinds.add(k.id) : kinds.delete(k.id); refresh(); };
  label.append(box, ` ${k.label} `);
  $('kinds').append(label);
}
$('q').oninput = refresh;
refresh();

// Benchmark hook for shoot.mjs: orbit the camera for `ms` and report rendered frames per second.
// ponytail: reaches into private fields; the harness is throwaway.
const s = scene as unknown as { controls: { target: { x: number; z: number } }; camera: { position: { x: number; z: number } }; dirty: boolean; renderer: { info: unknown } };
Object.assign(window, {
  atlas: scene,
  async bench(ms: number) {
    await scene.ready;
    const start = scene.renderedFrames, t0 = performance.now();
    while (performance.now() - t0 < ms) {
      await new Promise(requestAnimationFrame);
      const { target } = s.controls, p = s.camera.position;
      const a = 0.01, dx = p.x - target.x, dz = p.z - target.z;
      p.x = target.x + dx * Math.cos(a) - dz * Math.sin(a);
      p.z = target.z + dx * Math.sin(a) + dz * Math.cos(a);
      s.dirty = true;
    }
    return { fps: ((scene.renderedFrames - start) * 1000) / (performance.now() - t0), info: s.renderer.info };
  },
});
