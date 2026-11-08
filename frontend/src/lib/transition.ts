// The post-login curtain: shown for 2 s (250 ms with reduced motion), skippable.
import { useSyncExternalStore } from 'react';

let state = { active: false, title: '' };
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function playTransition(title: string) {
  clearTimeout(timer);
  state = { active: true, title };
  emit();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  timer = setTimeout(endTransition, reduced ? 250 : 2000);
}

export function endTransition() {
  clearTimeout(timer);
  state = { ...state, active: false };
  emit();
}

export const useTransitionState = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state);
