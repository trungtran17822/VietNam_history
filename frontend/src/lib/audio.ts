// Procedural battlefield ambience (wind + distant drums) with Web Audio. No sound files.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let drums: GainNode | null = null;
let drumTimer: ReturnType<typeof setInterval> | null = null;
let enabled = false;

function setup() {
  const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx() as AudioContext;
  master = ctx.createGain();
  master.gain.setValueAtTime(0.001, ctx.currentTime);
  master.connect(ctx.destination);

  // Pink-ish noise through a swelling band-pass: wind.
  const size = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < size; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(320, ctx.currentTime);
  band.Q.setValueAtTime(1.8, ctx.currentTime);
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(140, ctx.currentTime);
  lfo.connect(lfoGain).connect(band.frequency);
  lfo.start();
  const wind = ctx.createGain();
  wind.gain.setValueAtTime(0.25, ctx.currentTime);
  noise.connect(band).connect(wind).connect(master);
  noise.start();

  drums = ctx.createGain();
  drums.gain.setValueAtTime(0.35, ctx.currentTime);
  drums.connect(master);
}

function drum(heavy: boolean) {
  if (!ctx || !drums || !enabled) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const low = ctx.createBiquadFilter();
  osc.frequency.setValueAtTime(heavy ? 65 : 85, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.38);
  low.type = 'lowpass';
  low.frequency.setValueAtTime(280, now);
  gain.gain.setValueAtTime(heavy ? 0.6 : 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.75 : 0.45));
  osc.connect(low).connect(gain).connect(drums);
  osc.start(now);
  osc.stop(now + 0.8);
}

/** Turns the ambience on or off; returns the new state. Must be called from a user gesture. */
export function toggleAudio(): boolean {
  if (!ctx) setup();
  if (!ctx || !master) return false;
  if (ctx.state === 'suspended') void ctx.resume();
  enabled = !enabled;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(enabled ? 0.7 : 0.0001, ctx.currentTime + (enabled ? 1.2 : 0.6));
  if (drumTimer) clearInterval(drumTimer);
  drumTimer = null;
  if (enabled) {
    let beat = 0;
    drumTimer = setInterval(() => {
      beat++;
      drum(beat % 4 === 1);
      if (beat % 8 === 6 && Math.random() > 0.4) setTimeout(() => drum(false), 240);
    }, 1400);
  }
  return enabled;
}

export const isAudioOn = () => enabled;
