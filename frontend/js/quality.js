/* Quality Tier & Dynamic Motion Performance System.
   Manages 3 tiers: 'high', 'medium', 'low' via document.documentElement.dataset.quality.
   Supports preference ('auto', 'high', 'medium', 'low'), initial 2-3s FPS detection,
   periodic light sampling, non-blocking toast with Undo, and dev debug HUD. */
(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'suviet:quality';
  const TIERS = ['low', 'medium', 'high'];
  const PREFERENCES = ['auto', 'high', 'medium', 'low'];
  const LABELS = {
    auto: 'Tự động',
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp'
  };

  let currentTier = 'high';
  let currentPreference = 'auto';
  let downgradeCount = 0;
  let lastMeasuredFps = 60;
  let hasDowngradedSession = false;
  let monitoringInterval = null;
  let toastElement = null;
  let debugHudElement = null;

  function safeStorageGet(key, fallback) {
    try {
      if (window.localStorage) {
        return window.localStorage.getItem(key) || fallback;
      }
    } catch (e) {}
    return fallback;
  }

  function safeStorageSet(key, value) {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
  }

  function isWeakGpu() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      return /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(r);
    } catch (e) {
      return false;
    }
  }

  function detect() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return 'low';
      }
      const nav = window.navigator || {};
      const cores = nav.hardwareConcurrency || 8;
      const mem = nav.deviceMemory || 8; // Safari / Firefox don't report -> assume sufficient
      const save = nav.connection && nav.connection.saveData;
      if (save || cores <= 2 || mem <= 2 || isWeakGpu()) return 'low';
      if (cores <= 4 || mem <= 4) return 'medium';
      return 'high';
    } catch (e) {
      return 'medium';
    }
  }

  function downgrade(tier) {
    const idx = TIERS.indexOf(tier);
    return TIERS[Math.max(0, idx - 1)];
  }

  function apply(tier) {
    currentTier = tier;
    if (document.documentElement) {
      document.documentElement.dataset.quality = tier;
    }
    // Also keep legacy storage sync for backwards compatibility
    safeStorageSet('history_sim_quality', tier === 'low' ? 'low' : 'high');

    try {
      window.dispatchEvent(new CustomEvent('quality-change', { detail: tier }));
    } catch (e) {}

    updateDebugHud();
  }

  function getPreference() {
    const raw = safeStorageGet(STORAGE_KEY, null);
    if (raw && PREFERENCES.includes(raw)) return raw;

    // Fallback: migrate legacy 'history_sim_quality' if present
    const legacy = safeStorageGet('history_sim_quality', null);
    if (legacy === 'high' || legacy === 'low') {
      safeStorageSet(STORAGE_KEY, legacy);
      return legacy;
    }
    return 'auto';
  }

  function setPreference(pref) {
    if (!PREFERENCES.includes(pref)) pref = 'auto';
    currentPreference = pref;
    safeStorageSet(STORAGE_KEY, pref);

    if (pref === 'auto') {
      apply(detect());
    } else {
      apply(pref);
    }
  }

  function cyclePreference() {
    const idx = PREFERENCES.indexOf(currentPreference);
    const next = PREFERENCES[(idx + 1) % PREFERENCES.length];
    setPreference(next);
    return next;
  }

  function getPreferenceLabel(pref) {
    return LABELS[pref || currentPreference] || 'Tự động';
  }

  function getCurrentTier() {
    return currentTier;
  }

  function measureFps(ms) {
    const duration = ms || 2500;
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame !== 'function') {
        return resolve(60);
      }
      let frames = 0;
      let start = 0;
      function frame(now) {
        if (document.visibilityState === 'hidden') {
          // Tab is hidden, skip counting
          start = 0;
          frames = 0;
          return setTimeout(() => requestAnimationFrame(frame), 500);
        }
        if (!start) start = now;
        frames++;
        if (now - start < duration) {
          requestAnimationFrame(frame);
        } else {
          const fps = (frames * 1000) / (now - start);
          resolve(Math.round(fps * 10) / 10);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function showDowngradeToast(previousTier, newTier) {
    if (toastElement) {
      toastElement.remove();
      toastElement = null;
    }
    const toast = document.createElement('div');
    toast.className = 'quality-downgrade-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const msg = document.createElement('span');
    msg.textContent = 'Đã giảm hiệu ứng để mượt hơn';

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.textContent = 'Hoàn tác';
    undoBtn.addEventListener('click', () => {
      // User pressed undo: revert to previous tier and freeze auto-downgrade
      setPreference(previousTier);
      hasDowngradedSession = true;
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
    });

    toast.appendChild(msg);
    toast.appendChild(undoBtn);
    document.body.appendChild(toast);
    toastElement = toast;

    setTimeout(() => {
      if (toastElement === toast) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 300ms ease';
        setTimeout(() => {
          if (toastElement === toast) {
            toast.remove();
            toastElement = null;
          }
        }, 320);
      }
    }, 6000);
  }

  function handleAutoDowngrade(targetTier) {
    if (currentPreference !== 'auto') return;
    if (TIERS.indexOf(targetTier) >= TIERS.indexOf(currentTier)) return;

    const prev = currentTier;
    downgradeCount++;
    hasDowngradedSession = true;
    apply(targetTier);
    showDowngradeToast(prev, targetTier);
  }

  async function runInitialBenchmark() {
    if (currentPreference !== 'auto') return;
    if (document.visibilityState === 'hidden') return;

    const fps = await measureFps(2200);
    lastMeasuredFps = fps;
    updateDebugHud();

    if (fps < 28) {
      handleAutoDowngrade('low');
    } else if (fps < 45) {
      handleAutoDowngrade(downgrade(currentTier));
    }
  }

  function startLightMonitoring() {
    if (monitoringInterval) clearInterval(monitoringInterval);

    // Sample lightly: measure a short 800ms window every 12 seconds
    monitoringInterval = setInterval(async () => {
      if (currentPreference !== 'auto') return;
      if (document.visibilityState === 'hidden') return;
      if (currentTier === 'low') return; // Cannot downgrade further
      if (hasDowngradedSession) return; // Do not downgrade repeatedly in the same session

      const sample = await measureFps(800);
      lastMeasuredFps = sample;
      updateDebugHud();

      // If persistent sustained stutter (< 32 FPS)
      if (sample < 32) {
        handleAutoDowngrade(downgrade(currentTier));
      }
    }, 12000);
  }

  function isDevEnvironment() {
    try {
      const host = window.location.hostname;
      return host === 'localhost' || host === '127.0.0.1' || window.location.port !== '';
    } catch (e) {
      return false;
    }
  }

  function createDebugHud() {
    if (!isDevEnvironment()) return;
    if (debugHudElement) return;

    const hud = document.createElement('div');
    hud.className = 'quality-debug-hud';
    hud.id = 'quality-debug-hud';
    hud.setAttribute('aria-hidden', 'true');
    document.body.appendChild(hud);
    debugHudElement = hud;
    updateDebugHud();
  }

  function updateDebugHud() {
    if (!debugHudElement) return;
    debugHudElement.innerHTML = `[Quality Tier: <strong>${currentTier.toUpperCase()}</strong>]<br>` +
      `Pref: ${currentPreference} (${getPreferenceLabel()})<br>` +
      `FPS: ${lastMeasuredFps}<br>` +
      `Downgrades: ${downgradeCount}`;
  }

  function init() {
    currentPreference = getPreference();
    if (currentPreference === 'auto') {
      apply(detect());
    } else {
      apply(currentPreference);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createDebugHud();
        setTimeout(runInitialBenchmark, 800);
        setTimeout(startLightMonitoring, 3500);
      });
    } else {
      createDebugHud();
      setTimeout(runInitialBenchmark, 800);
      setTimeout(startLightMonitoring, 3500);
    }

    // Listen to prefers-reduced-motion changes live
    if (window.matchMedia) {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mql.addEventListener) {
        mql.addEventListener('change', (e) => {
          if (e.matches && currentPreference === 'auto') {
            apply('low');
          }
        });
      }
    }
  }

  init();

  window.SuVietQuality = {
    TIERS,
    PREFERENCES,
    getPreference,
    setPreference,
    cyclePreference,
    getPreferenceLabel,
    getCurrentTier,
    detect,
    apply,
    downgrade,
    measureFps,
    isWeakGpu,
    getDowngradeCount: () => downgradeCount,
    getLastMeasuredFps: () => lastMeasuredFps
  };
})(window, document);
