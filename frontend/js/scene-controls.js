/* Upgrades the sand-table player controls with inline SVG icons (Lucide, ISC licence) instead of
   emoji/glyphs. Works on static and dynamically rendered players without changing app.js handlers:
   app.js may keep setting textContent ('▶ Phát' / '⏸ Dừng'); we re-decorate after each change. */
(function (window, document) {
  'use strict';

  const svg = (body) => `<svg class="sv-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    play: svg('<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>'),
    pause: svg('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'),
    rewind: svg('<polygon points="19 20 9 12 19 4 19 20" fill="currentColor"/><line x1="5" x2="5" y1="19" y2="5"/>'),
    overview: svg('<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/><path d="M9 4v13"/><path d="M15 7v13"/>'),
    follow_troops: svg('<path d="M4 22V4"/><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>'),
    close_up: svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>'),
    top_down: svg('<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>'),
    orbit: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
    quality: svg('<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="m17 20.66-1-1.73"/><path d="M11 10.27 7 3.34"/><path d="m20.66 17-1.73-1"/><path d="m3.34 7 1.73 1"/><path d="M14 12h8"/><path d="M2 12h2"/>'),
    present: svg('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>'),
    flag: svg('<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>'),
    camera: svg('<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>')
  };

  // Leading emoji / pictographs / arrow glyphs (and the "?" left by broken encodings) are stripped.
  const LEADING = /^[\s\u2190-\u2BFF\uFE0F\u200D?\p{Extended_Pictographic}]+/u;
  const clean = (text) => { let t = String(text || ''); let prev; do { prev = t; t = t.replace(LEADING, ''); } while (t !== prev); return t.trim().normalize('NFC'); };

  function roleOf(el) {
    const id = el.id || '';
    if (el.dataset.preset) return el.dataset.preset;
    if (id === 'btn-student-orbit') return 'orbit';
    if (/^btn-(student-)?play|^btn-play-/.test(id) || el.dataset.playerAction === 'play') return 'play';
    if (/rewind/.test(id) || el.dataset.playerAction === 'rewind') return 'rewind';
    if (el.hasAttribute('data-toggle-player-quality')) return 'quality';
    if (el.hasAttribute('data-presentation')) return 'present';
    if (el.classList.contains('hud-pill')) return 'flag';
    return null;
  }

  function decorate(el) {
    const role = roleOf(el);
    if (!role) return;
    const first = el.firstElementChild;
    if (first && first.classList && first.classList.contains('sv-icon') && el.dataset.svDecorated === el.textContent) return;
    let label = clean(el.textContent);
    let icon = role;
    if (role === 'play') { const playing = /dừng/i.test(label); icon = playing ? 'pause' : 'play'; label = label || (playing ? 'Tạm dừng' : 'Phát'); el.classList.toggle('is-playing', playing); el.setAttribute('aria-pressed', String(playing)); }
    if (role === 'rewind') { label = ''; el.setAttribute('aria-label', 'Về đầu'); el.title = 'Về đầu'; }
    if (role === 'flag' && el.classList.contains('hud-pill') && /xem trước/i.test(label)) icon = 'camera';
    if (role === 'flag') label = label.replace(/\s*\(Live Preview\)\s*/i, '');
    el.innerHTML = `${ICONS[icon] || ''}${label ? `<span class="sv-btn-label"></span>` : ''}`;
    if (label) el.lastElementChild.textContent = label;
    el.classList.add('sv-iconified');
    el.dataset.svDecorated = el.textContent;
  }

  const SELECTOR = ['.btn-cam-pill', '.hud-pill', '#btn-student-play', '#btn-student-rewind', '[id^="btn-play-"]', '[id^="btn-rewind-"]', '[data-player-action]', '[data-toggle-player-quality]', '[data-presentation]'].join(',');

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(SELECTOR)) decorate(root);
    root.querySelectorAll(SELECTOR).forEach(decorate);
  }

  function start() {
    scan(document.body);
    let queued = false; const pending = new Set();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        const node = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (node) pending.add(node.closest ? (node.closest(SELECTOR) || node) : node);
        m.addedNodes.forEach((added) => { if (added.nodeType === 1) pending.add(added); });
      });
      if (queued) return;
      queued = true;
      Promise.resolve().then(() => { queued = false; const nodes = Array.from(pending); pending.clear(); nodes.forEach(scan); });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.SceneControls = { decorate, scan, ICONS };
})(window, document);
