/**
 * audio.js - Procedural WebAudio ambient generator
 * Provides subtle historical battlefield atmosphere:
 * - Wind gusts (filtered white noise + LFO)
 * - Distant battle drums (procedural sine sweep + low-pass)
 * - Mute / unmute control
 * - 100% offline, zero external sound files.
 */

(function (window) {
  'use strict';

  class ProceduralBattleAudio {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.windGain = null;
      this.drumGain = null;
      this.isEnabled = false;
      this.drumIntervalId = null;
      this.isInitialized = false;
    }

    initContext() {
      if (this.isInitialized) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('WebAudio not supported in this browser.');
        return;
      }

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupWindGenerator();
      this.isInitialized = true;
    }

    setupWindGenerator() {
      if (!this.ctx) return;
      // White noise buffer
      const bufferSize = this.ctx.sampleRate * 3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-ish noise filter
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Bandpass filter for wind howl
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Low frequency oscillator (LFO) for gentle wind swelling
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(windFilter.frequency);
      lfo.start();

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

      whiteNoise.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      whiteNoise.start();

      // Drum master gain
      this.drumGain = this.ctx.createGain();
      this.drumGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.drumGain.connect(this.masterGain);
    }

    triggerBattleDrum(isHeavy = false) {
      if (!this.ctx || !this.isEnabled) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const baseFreq = isHeavy ? 65 : 85;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.38);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);

        gain.gain.setValueAtTime(isHeavy ? 0.6 : 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.75 : 0.45));

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);

        osc.start(now);
        osc.stop(now + 0.8);
      } catch (e) {
        // Safe fail
      }
    }

    startDrumLoop() {
      if (this.drumIntervalId) clearInterval(this.drumIntervalId);
      let beatCounter = 0;
      this.drumIntervalId = setInterval(() => {
        if (!this.isEnabled) return;
        beatCounter++;
        const isDownbeat = beatCounter % 4 === 1;
        this.triggerBattleDrum(isDownbeat);

        // Occasional syncopated drum hit
        if (beatCounter % 8 === 6 && Math.random() > 0.4) {
          setTimeout(() => {
            if (this.isEnabled) this.triggerBattleDrum(false);
          }, 240);
        }
      }, 1400);
    }

    stopDrumLoop() {
      if (this.drumIntervalId) {
        clearInterval(this.drumIntervalId);
        this.drumIntervalId = null;
      }
    }

    toggle() {
      if (!this.isInitialized) {
        this.initContext();
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isEnabled = !this.isEnabled;

      if (this.isEnabled) {
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.masterGain.gain.linearRampToValueAtTime(0.7, this.ctx.currentTime + 1.2);
        }
        this.startDrumLoop();
      } else {
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
        }
        this.stopDrumLoop();
      }

      return this.isEnabled;
    }

    getState() {
      return this.isEnabled;
    }
  }

  window.BattleAudio = new ProceduralBattleAudio();
})(window);
