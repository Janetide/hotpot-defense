// Boiling Defense — WebAudio sound effects, synthesised, no audio files.
// A tiny synth: short oscillator blips with envelopes, plus a noise burst
// for splashes. Mute persists in localStorage.
import { MUTE_KEY } from './config.js';

function readMuted() {
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function createAudio() {
  let ctx = null;
  let muted = readMuted();
  let noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.25);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (muted) return;
    const c = ensure();
    if (!c || !noiseBuf) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 1200;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    isMuted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
      return muted;
    },
    unlock() { ensure(); },
    click() { tone(660, 0.07, 'square', 0.06); },
    place() { tone(220, 0.12, 'triangle', 0.14, 440); tone(440, 0.1, 'sine', 0.08, 660); },
    upgrade() { tone(523, 0.09, 'triangle', 0.12); setTimeout(() => tone(784, 0.12, 'triangle', 0.12), 70); },
    sell() { tone(500, 0.1, 'sine', 0.1, 250); },
    shoot() { tone(880, 0.05, 'square', 0.03, 620); },
    hit() { noise(0.08, 0.08, 900); },
    coin() { tone(1320, 0.08, 'sine', 0.09); setTimeout(() => tone(1760, 0.1, 'sine', 0.07), 50); },
    leak() { tone(160, 0.3, 'sawtooth', 0.16, 70); noise(0.25, 0.12, 500); },
    wave() { tone(392, 0.14, 'triangle', 0.14); setTimeout(() => tone(523, 0.18, 'triangle', 0.14), 110); },
    boss() { tone(98, 0.5, 'sawtooth', 0.18, 55); noise(0.4, 0.14, 300); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.14), i * 130)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'sawtooth', 0.1), i * 160)); },
    deny() { tone(180, 0.12, 'square', 0.08, 120); },
  };
}
