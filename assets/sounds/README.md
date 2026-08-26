# FlipStitch sound assets

All nine sound effects in this directory are **original, generated in-repo
synthesis**. No samples were downloaded or copied from any game or library.

## License and ownership

These files were synthesized by the project's own deterministic generator
(`scripts/generate-sounds.mjs`) and are owned by the FlipStitch project. They
are committed so builds are reproducible and work fully offline. The generator
is the source of truth: run `npm run generate:sounds` to regenerate identical
files at any time.

## How each sound was made

All files are 16-bit PCM, 44.1 kHz, mono WAV. Peaks are normalized to -6 dBFS
(no clipping), RMS levels sit in a consistent band, and every file fades its
edges to avoid clicks.

| File | Length | Idea | Synthesis recipe |
| --- | ---: | --- | --- |
| `needle-pierce.wav` | 90 ms | Needle breaking through cloth | High sine tick (~2.6 kHz) with a fast decay, a lower body tone, and a short noise transient |
| `thread-tighten.wav` | 160 ms | Thread pulled taut after the pierce | Soft upward glissando (480 → 920 Hz) with quiet filtered noise |
| `hoop-flip.wav` | 220 ms | Cloth movement and hoop turning | Low-pass filtered noise "cloth swish" plus two damped wooden tones (190/120 Hz) |
| `invalid-stitch.wav` | 220 ms | A gentle "not this line" | Two low damped tones (175/138 Hz) — warm and soft, never harsh |
| `undo.wav` | 100 ms | Thread pulling back | Restrained downward sweep (780 → 380 Hz) |
| `hint.wav` | 200 ms | Light attention ping | Two short soft high notes (1.24/1.65 kHz) |
| `level-complete.wav` | 500 ms | Warm completion chime | Ascending C-major arpeggio (523/659/784 Hz) with a high octave sparkle |
| `next-level-unlock.wav` | 240 ms | Bright unlock sparkle | Two quick high notes (1.17/1.57 kHz) |
| `gallery-selection.wav` | 90 ms | Selecting a hoop in the gallery | Short cloth tap (damped 260 Hz tone plus a noise tick) |

## Design rules enforced here

- Short and subtle: nothing exceeds 0.5 s; most feedback is under 0.25 s.
- No clipping: peaks are normalized below -6 dBFS and the validator rejects any
  sample at the 16-bit limit.
- Consistent volume: the validator enforces an RMS band so the mix stays even.
- Safe for repeated playback: fast decays and gentle transients, plus runtime
  per-sound throttling in `src/feedback/audio.ts`.

See `scripts/validate-audio.mjs` for the automated checks.
