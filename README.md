# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

The puzzle-depth milestone (Prompt 6) is complete on `main`. It turns the ten-level Day & Night collection into a measured, strictly-rising difficulty curve:

- A pure, deterministic analyzer (`src/game/analyzer.ts`) measures every level: real decisions, branching, forced-move share, reachable traps, dangerous decisions, and planning depth.
- A transparent 0–100 difficulty score (planning + risk + capped length) replaces vibes with numbers — a 20-stitch forced path can never outscore a short branching trap puzzle. `scripts/analyze-levels.mjs` prints the whole matrix.
- The ten levels were re-authored into a monotonic curve (15 → 22 → 28 → 31 → 39 → 54 → 60 → 64 → 77 → 80): tutorials keep one safe choice, levels 7–8 are now genuinely trap-capable, and level 10 stays the strongest capstone.
- Regression tests (`src/game/difficulty.test.ts`) fail if the curve ever drops, a trap level stops trapping, or a safe level starts stranding.
- New authoring reference (`docs/LEVEL-DESIGN-GUIDE.md`) and honest research record (`docs/RESEARCH-MILESTONE-6.md`); the measured matrix lives in `docs/DIFFICULTY-MATRIX.md`.

Earlier milestones also live on `main`: the Living Sampler design overhaul (Prompt 5, now the visual source of truth — see `docs/DESIGN-BIBLE.md`), the stabilization and Android device-proof pass (Milestone 4), and the feel/playtest work (Milestone 3: original synthesized sounds, controlled haptics, a Settings screen, and local-only playtest instrumentation — no accounts, no ads, no network, no external analytics).

The complete ten-level collection remains:

- Tap a valid hole to place one stitch.
- The active side changes after every stitch.
- Preview the reverse without moving the needle.
- Undo freely or ask a staged hint (concept → region → exact).
- Finish every marked stitch on both sides.
- Choose from ten validated handcrafted hoops.
- Unlock, replay, and resume levels with local progress.
- Reject broken content through a deterministic pure TypeScript solver.

## Run it

Requirements: Node.js 22 or newer, npm, Android Studio or Xcode for a simulator.

```bash
npm install
npm run start
```

Then press `a` for Android or `i` for iOS. The web target is useful for quick layout checks, but device builds are the product target.

## Checks

```bash
npm test
npm run typecheck
npm run doctor
npm run validate:audio
npm run scan:analytics
```

`npm run check` runs tests, TypeScript, Expo Doctor, audio validation, and the analytics scan in sequence. Android, iOS, and web bundles export in CI on every push to `main`. Fraunces and Atkinson Hyperlegible Next are bundled for offline use, and all sound effects are original and generated in-repo (see `assets/sounds/README.md`).

## Product rules

- The puzzle stays central. No store clutter appears during play.
- Input uses large tap targets and unlimited undo.
- Motion respects the device's reduced-motion setting; sounds and haptics keep working when it is on.
- Game rules live outside the renderer, so levels can be solved and tested without a device.
- Playtest data stays local, bounded, viewable, and clearable from Settings.
- Monetization comes after retention testing, never before the core is proven.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices, [docs/DESIGN-BIBLE.md](docs/DESIGN-BIBLE.md) for the Living Sampler design system, [docs/LEVEL-DESIGN-GUIDE.md](docs/LEVEL-DESIGN-GUIDE.md) for how levels are authored, and [docs/DIFFICULTY-MATRIX.md](docs/DIFFICULTY-MATRIX.md) for the measured curve. Milestone-specific research and QA: [docs/RESEARCH-MILESTONE-6.md](docs/RESEARCH-MILESTONE-6.md) and [docs/MILESTONE-6-QA.md](docs/MILESTONE-6-QA.md) (puzzle depth), [docs/RESEARCH-MILESTONE-5.md](docs/RESEARCH-MILESTONE-5.md) and [docs/MILESTONE-5-QA.md](docs/MILESTONE-5-QA.md) (design overhaul), and [docs/RESEARCH-MILESTONE-4.md](docs/RESEARCH-MILESTONE-4.md) with [docs/MILESTONE-4-QA.md](docs/MILESTONE-4-QA.md) (stabilization).

Earlier research and test matrices: [docs/RESEARCH-MILESTONE-3.md](docs/RESEARCH-MILESTONE-3.md), [docs/MILESTONE-3-QA.md](docs/MILESTONE-3-QA.md), [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md), [docs/RESEARCH-MILESTONE-2.md](docs/RESEARCH-MILESTONE-2.md), [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md), and [docs/MILESTONE-2-QA.md](docs/MILESTONE-2-QA.md). Real-device instructions for the Samsung Galaxy S25 Ultra (including the EAS internal-APK handoff) are in [docs/S25-ULTRA-PLAYTEST.md](docs/S25-ULTRA-PLAYTEST.md).
