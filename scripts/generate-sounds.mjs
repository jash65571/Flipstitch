#!/usr/bin/env node
/**
 * FlipStitch sound generator
 *
 * Synthesizes every sound effect used by the game as an original 16-bit PCM
 * WAV file. The generator is deterministic: the same input produces the same
 * files, so the checked-in assets can always be reproduced.
 *
 * Design goals (from docs/RESEARCH-MILESTONE-3.md):
 *  - Every file is original synthesis. No samples were downloaded.
 *  - Sounds are short (60-500 ms), subtle, and pleasant on phone speakers.
 *  - Peaks stay below -6 dBFS so nothing clips, and RMS levels are kept in a
 *    consistent band so the mix feels even.
 *  - Safe for repeated playback (fast decay, no harsh transients).
 *
 * Run: node scripts/generate-sounds.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "sounds");
const SAMPLE_RATE = 44100;

// Deterministic PRNG (mulberry32) so noise is reproducible.
function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a sample buffer of the given length (seconds) filled with silence. */
function buffer(seconds) {
  return new Float64Array(Math.floor(seconds * SAMPLE_RATE));
}

/** Add a damped sine tone. Returns the buffer for chaining. */
function tone(out, freq, startAt, duration, amp, decay = 6) {
  const start = Math.floor(startAt * SAMPLE_RATE);
  const len = Math.floor(duration * SAMPLE_RATE);
  const phase = (2 * Math.PI * freq) / SAMPLE_RATE;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-decay * t);
    const sample = Math.sin(phase * i) * amp * env;
    const idx = start + i;
    if (idx < out.length) out[idx] += sample;
  }
  return out;
}

/** Add a short sine glissando (frequency sweep). */
function sweep(out, fromFreq, toFreq, startAt, duration, amp, decay = 8) {
  const start = Math.floor(startAt * SAMPLE_RATE);
  const len = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / duration;
    const freq = fromFreq + (toFreq - fromFreq) * t;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const env = Math.exp(-decay * (i / SAMPLE_RATE));
    const idx = start + i;
    if (idx < out.length) out[idx] += Math.sin(phase) * amp * env;
  }
  return out;
}

/**
 * Add a low-pass-filtered noise burst. `cutoff` is a fraction of Nyquist
 * (0..1); lower values sound softer and more "cloth-like".
 */
function filteredNoise(out, rng, startAt, duration, amp, cutoff = 0.08, decay = 10) {
  const start = Math.floor(startAt * SAMPLE_RATE);
  const len = Math.floor(duration * SAMPLE_RATE);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const white = rng() * 2 - 1;
    prev += cutoff * (white - prev); // one-pole low pass
    const env = Math.exp(-decay * (i / SAMPLE_RATE));
    const idx = start + i;
    if (idx < out.length) out[idx] += prev * amp * env;
  }
  return out;
}

/** Normalize peaks to `target` (e.g. 0.5) and return a scaled copy. */
function normalizePeak(samples, target = 0.5) {
  let peak = 0;
  for (const s of samples) {
    const a = Math.abs(s);
    if (a > peak) peak = a;
  }
  if (peak === 0) return samples;
  const gain = target / peak;
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
  return out;
}

/** Apply a gentle fade-in/fade-out over the first/last n ms to avoid clicks. */
function fadeEdges(samples, ms = 3) {
  const n = Math.min(samples.length, Math.floor((ms / 1000) * SAMPLE_RATE));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    samples[i] *= g;
    samples[samples.length - 1 - i] *= g;
  }
  return samples;
}

/** True RMS in dBFS (used only for documentation). */
function rmsDb(samples) {
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / samples.length);
  return 20 * Math.log10(rms || 1e-9);
}

function writeWav(filePath, samples) {
  const len = samples.length;
  const dataSize = len * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  const pcm = Buffer.alloc(dataSize);
  for (let i = 0; i < len; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  writeFileSync(filePath, Buffer.concat([header, pcm]));
}

const sounds = {
  // A short, bright needle tick. High transient, fast decay, tiny body.
  "needle-pierce.wav": (rng) => {
    const out = buffer(0.09);
    tone(out, 2600, 0, 0.05, 0.5, 60);
    tone(out, 1900, 0.001, 0.07, 0.28, 38);
    filteredNoise(out, rng, 0, 0.02, 0.12, 0.5, 90);
    return out;
  },
  // A soft upward "zip" as the thread is pulled taut after the pierce.
  "thread-tighten.wav": (rng) => {
    const out = buffer(0.16);
    sweep(out, 480, 920, 0, 0.13, 0.3, 9);
    filteredNoise(out, rng, 0.01, 0.09, 0.05, 0.12, 26);
    return out;
  },
  // Cloth movement and a gentle wooden knock as the hoop flips.
  "hoop-flip.wav": (rng) => {
    const out = buffer(0.22);
    filteredNoise(out, rng, 0, 0.16, 0.2, 0.07, 16);
    tone(out, 190, 0.02, 0.12, 0.22, 22);
    tone(out, 120, 0.03, 0.14, 0.16, 18);
    return out;
  },
  // A low, soft double thud for an invalid stitch. Warm, never harsh.
  "invalid-stitch.wav": (rng) => {
    const out = buffer(0.22);
    tone(out, 175, 0, 0.12, 0.24, 24);
    tone(out, 138, 0.03, 0.12, 0.16, 22);
    filteredNoise(out, rng, 0.005, 0.05, 0.05, 0.06, 60);
    return out;
  },
  // A restrained downward blip: the thread gently pulling back.
  "undo.wav": (rng) => {
    const out = buffer(0.1);
    sweep(out, 780, 380, 0, 0.08, 0.2, 14);
    return out;
  },
  // A light two-note attention ping for hints.
  "hint.wav": (rng) => {
    const out = buffer(0.2);
    tone(out, 1240, 0, 0.08, 0.16, 30);
    tone(out, 1650, 0.09, 0.1, 0.14, 26);
    return out;
  },
  // Warm ascending chime for level completion.
  "level-complete.wav": (rng) => {
    const out = buffer(0.5);
    tone(out, 523.25, 0, 0.22, 0.28, 10);
    tone(out, 659.25, 0.12, 0.24, 0.26, 9);
    tone(out, 783.99, 0.24, 0.3, 0.24, 8);
    tone(out, 1046.5, 0.36, 0.18, 0.12, 12);
    return out;
  },
  // A bright two-note sparkle when the next hoop unlocks.
  "next-level-unlock.wav": (rng) => {
    const out = buffer(0.24);
    tone(out, 1174.66, 0, 0.1, 0.18, 26);
    tone(out, 1567.98, 0.08, 0.16, 0.16, 20);
    return out;
  },
  // A small cloth tap when a gallery hoop is selected.
  "gallery-selection.wav": (rng) => {
    const out = buffer(0.09);
    tone(out, 260, 0, 0.07, 0.24, 30);
    filteredNoise(out, rng, 0, 0.04, 0.07, 0.1, 70);
    return out;
  }
};

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];
for (const [name, synth] of Object.entries(sounds)) {
  const rng = makeRng(name.length * 2654435761 % 4294967296);
  let samples = synth(rng);
  samples = normalizePeak(samples, 0.5); // -6 dBFS peak, no clipping
  samples = fadeEdges(samples);
  const filePath = join(OUT_DIR, name);
  writeWav(filePath, samples);
  const seconds = samples.length / SAMPLE_RATE;
  manifest.push({ name, seconds: Number(seconds.toFixed(3)), peakDb: -6, rmsDb: Number(rmsDb(samples).toFixed(1)) });
  console.log(`wrote ${name} (${seconds.toFixed(3)}s, ${rmsDb(samples).toFixed(1)} dBFS RMS)`);
}
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify({ sampleRate: SAMPLE_RATE, bitDepth: 16, channels: 1, sounds: manifest }, null, 2) + "\n");
console.log(`\n${manifest.length} sounds written to ${OUT_DIR}`);
