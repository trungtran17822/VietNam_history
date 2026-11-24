// Per-device display preferences shared by every view (header menu and player toolbars).
import { useSyncExternalStore } from 'react';
import type { Quality } from '../scene/silk-map';

const QUALITY_KEY = 'history_sim_quality';
const listeners = new Set<() => void>();
let quality: Quality = (() => {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
})();

export function setQuality(next: Quality) {
  quality = next;
  try {
    localStorage.setItem(QUALITY_KEY, next);
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

export const useQuality = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => quality
  );

/** Projector mode: header and footer hide, the page goes fullscreen when the browser allows it. */
export function togglePresentation() {
  const on = document.documentElement.classList.toggle('presentation-mode');
  if (on) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  return on;
}
