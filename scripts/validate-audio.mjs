#!/usr/bin/env node
/**
 * Audio asset validation.
 *
 * Checks every bundled sound effect:
 *  - Valid RIFF/WAVE PCM header, 16-bit, mono, 44100 Hz.
 *  - Short enough for UI feedback (<= 1 second).
 *  - Peaks below -6 dBFS and no sample at the 16-bit limit (no clipping).
 *  - Consistent loudness: RMS within a documented band so the mix feels even.
 *
 * Run: node scripts/validate-audio.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOUNDS_DIR = join(ROOT, "assets", "sounds");
const SAMPLE_RATE = 44100;
const BITS = 16;
const CHANNELS = 1;
const MAX_DURATION_S = 1.0;
const MAX_PEAK = 0.5; // -6 dBFS
const RMS_BAND_DB = [-30, -10];

const REQUIRED_SOUNDS = [
  "needle-pierce.wav",
  "thread-tighten.wav",
  "hoop-flip.wav",
  "invalid-stitch.wav",
  "undo.wav",
  "hint.wav",
  "level-complete.wav",
  "next-level-unlock.wav",
  "gallery-selection.wav"
];

function parseWav(buffer) {
  if (buffer.length < 44) return { error: "file too small for a WAV header" };
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return { error: "missing RIFF tag" };
  if (buffer.toString("ascii", 8, 12) !== "WAVE") return { error: "missing WAVE tag" };
  if (buffer.toString("ascii", 12, 16) !== "fmt ") return { error: "missing fmt chunk" };
  const audioFormat = buffer.readUInt16LE(20);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  if (audioFormat !== 1) return { error: `expected PCM (format 1), got ${audioFormat}` };
  if (channels !== CHANNELS) return { error: `expected mono, got ${channels} channels` };
  if (sampleRate !== SAMPLE_RATE) return { error: `expected ${SAMPLE_RATE} Hz, got ${sampleRate}` };
  if (bitsPerSample !== BITS) return { error: `expected ${BITS}-bit, got ${bitsPerSample}` };
  const dataIndex = 36;
  const chunkId = buffer.toString("ascii", dataIndex, dataIndex + 4);
  if (chunkId !== "data") return { error: `expected data chunk, got ${chunkId}` };
  const dataSize = buffer.readUInt32LE(dataIndex + 4);
  const dataStart = dataIndex + 8;
  const samples = [];
  for (let i = dataStart; i + 2 <= buffer.length && i < dataStart + dataSize; i += 2) {
    samples.push(buffer.readInt16LE(i));
  }
  return { samples };
}

let failures = 0;
const files = readdirSync(SOUNDS_DIR).filter((f) => f.endsWith(".wav")).sort();

for (const required of REQUIRED_SOUNDS) {
  if (!files.includes(required)) {
    console.error(`FAIL: missing required sound ${required}`);
    failures += 1;
  }
}

for (const file of files) {
  const buffer = readFileSync(join(SOUNDS_DIR, file));
  const parsed = parseWav(buffer);
  const label = `assets/sounds/${file}`;
  if (parsed.error) {
    console.error(`FAIL: ${label} — ${parsed.error}`);
    failures += 1;
    continue;
  }
  const { samples } = parsed;
  const duration = samples.length / SAMPLE_RATE;
  if (duration > MAX_DURATION_S) {
    console.error(`FAIL: ${label} — ${duration.toFixed(3)}s is longer than ${MAX_DURATION_S}s`);
    failures += 1;
  }
  let peak = 0;
  let clipped = false;
  let sumSquares = 0;
  for (const sample of samples) {
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    if (abs >= 32767) clipped = true;
    sumSquares += (sample / 32768) ** 2;
  }
  const peakDb = 20 * Math.log10(peak / 32768);
  const rmsDb = 20 * Math.log10(Math.sqrt(sumSquares / samples.length) || 1e-9);
  if (peakDb > -6.0) {
    console.error(`FAIL: ${label} — peak ${peakDb.toFixed(1)} dBFS is above -6 dBFS`);
    failures += 1;
  }
  if (clipped) {
    console.error(`FAIL: ${label} — contains clipped samples at the 16-bit limit`);
    failures += 1;
  }
  if (rmsDb < RMS_BAND_DB[0] || rmsDb > RMS_BAND_DB[1]) {
    console.error(`FAIL: ${label} — RMS ${rmsDb.toFixed(1)} dBFS is outside the ${RMS_BAND_DB[0]}..${RMS_BAND_DB[1]} dBFS band`);
    failures += 1;
  }
  if (peak === 0) {
    console.error(`FAIL: ${label} — silent file`);
    failures += 1;
  }
  console.log(`ok   ${label} (${duration.toFixed(3)}s, peak ${peakDb.toFixed(1)} dBFS, RMS ${rmsDb.toFixed(1)} dBFS)`);
}

if (failures > 0) {
  console.error(`\n${failures} audio validation failure(s)`);
  process.exit(1);
}
console.log(`\nAll ${REQUIRED_SOUNDS.length} required sounds validated.`);
