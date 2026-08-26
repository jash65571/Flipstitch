# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

The **scalable content foundation** milestone (Prompt 7) is complete on `main`.
It turns a ten-level prototype into a content system that can hold hundreds of
handcrafted hoops:

- A real content hierarchy — **Catalog → Collection → Chapter → Level**
  (`src/content/`). Collections and chapters carry their own titles, subtitles,
  descriptions, ordering, and capstones, so no screen hard-codes content copy.
  See `docs/CONTENT-ARCHITECTURE.md`.
- The ten Day & Night levels moved into that model as two chapters — *First
  Light* (1-5) and *After Dark* (6-10) — with **every level id, geometry,
  authored solution, difficulty score, hint, and best-move record unchanged**.
  Saved progress is untouched: `PROGRESS_VERSION` stays at 1 and version-1
  payloads are regression-tested.
- Content-aware navigation (`src/content/navigation.ts`) is the one source of
  truth for previous/next/resume and for chapter and collection progress. No
  screen indexes a level array any more.
- Global monotonic difficulty is retired as a rule of the game and replaced by a
  **chapter pacing system**: six progression roles, chapter-scoped hard
  invariants, and separate advisory design warnings.
  See `docs/PROGRESSION-PACING.md`.
- Analyzer correctness fix: `safeAlternativeCount` now counts safe stitches at
  *dangerous* decisions only, as its documentation always said. No difficulty
  score changed.
- Analyzer and solver now scale: solution counting is memoised over states
  instead of enumerating paths, and is **exact or honestly labelled as capped**,
  never silently partial. On a synthetic 9-petal hub (362,880 solutions) that is
  ~890× faster than enumeration. `npm run bench:analyzer` measures it.
- New authoring commands: `npm run analyze:levels` (one measurement per level
  plus pacing findings, non-zero exit on an invariant violation) and
  `npm run bench:analyzer`.
- New docs: `docs/CONTENT-ARCHITECTURE.md`, `docs/PUZZLE-CURRICULUM.md`,
  `docs/PROGRESSION-PACING.md`, `docs/RESEARCH-MILESTONE-7.md`,
  `docs/MILESTONE-7-QA.md`.

Earlier milestones also live on `main`: the puzzle-depth pass (Prompt 6 — the
analyzer, the transparent 0-100 difficulty score, and the re-authored curve
15 → 22 → 28 → 31 → 39 → 54 → 60 → 64 → 77 → 80, all unchanged here), the Living
Sampler design overhaul (Prompt 5, the visual source of truth — see
`docs/DESIGN-BIBLE.md`), the stabilization and Android device-proof pass
(Milestone 4), and the feel/playtest work (Milestone 3: original synthesized
sounds, controlled haptics, a Settings screen, and local-only playtest
instrumentation — no accounts, no ads, no network, no external analytics).

The game itself is unchanged:

- Tap a valid hole to place one stitch.
- The active side changes after every stitch.
- Preview the reverse without moving the needle.
- Undo freely or ask a staged hint (concept → region → exact).
- Finish every marked stitch on both sides.
- Choose from ten validated handcrafted hoops across two chapters.
- Unlock, replay, and resume levels with local progress, across chapter seams.
- Reject broken content through a deterministic pure TypeScript solver, and
  broken *pacing* through a chapter pacing validator.

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
npm run analyze:levels
npm run doctor
npm run validate:audio
npm run scan:analytics
```

`npm run check` runs tests, TypeScript, level measurement and pacing validation, Expo Doctor, audio validation, and the analytics scan in sequence. `npm run bench:analyzer` reports authoring-tool performance. Android, iOS, and web bundles export in CI on every push to `main`. Fraunces and Atkinson Hyperlegible Next are bundled for offline use, and all sound effects are original and generated in-repo (see `assets/sounds/README.md`).

## Product rules

- The puzzle stays central. No store clutter appears during play.
- Input uses large tap targets and unlimited undo.
- Motion respects the device's reduced-motion setting; sounds and haptics keep working when it is on.
- Game rules live outside the renderer, so levels can be solved and tested without a device.
- Playtest data stays local, bounded, viewable, and clearable from Settings.
- Monetization comes after retention testing, never before the core is proven.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices, [docs/CONTENT-ARCHITECTURE.md](docs/CONTENT-ARCHITECTURE.md) for the collection/chapter/level model, [docs/PROGRESSION-PACING.md](docs/PROGRESSION-PACING.md) for how difficulty is paced, [docs/PUZZLE-CURRICULUM.md](docs/PUZZLE-CURRICULUM.md) for the long-term skill map, [docs/DESIGN-BIBLE.md](docs/DESIGN-BIBLE.md) for the Living Sampler design system, [docs/LEVEL-DESIGN-GUIDE.md](docs/LEVEL-DESIGN-GUIDE.md) for how levels are authored, and [docs/DIFFICULTY-MATRIX.md](docs/DIFFICULTY-MATRIX.md) for the measured curve. Milestone-specific research and QA: [docs/RESEARCH-MILESTONE-7.md](docs/RESEARCH-MILESTONE-7.md) and [docs/MILESTONE-7-QA.md](docs/MILESTONE-7-QA.md) (content architecture), [docs/RESEARCH-MILESTONE-6.md](docs/RESEARCH-MILESTONE-6.md) and [docs/MILESTONE-6-QA.md](docs/MILESTONE-6-QA.md) (puzzle depth), [docs/RESEARCH-MILESTONE-5.md](docs/RESEARCH-MILESTONE-5.md) and [docs/MILESTONE-5-QA.md](docs/MILESTONE-5-QA.md) (design overhaul), and [docs/RESEARCH-MILESTONE-4.md](docs/RESEARCH-MILESTONE-4.md) with [docs/MILESTONE-4-QA.md](docs/MILESTONE-4-QA.md) (stabilization).

Earlier research and test matrices: [docs/RESEARCH-MILESTONE-3.md](docs/RESEARCH-MILESTONE-3.md), [docs/MILESTONE-3-QA.md](docs/MILESTONE-3-QA.md), [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md), [docs/RESEARCH-MILESTONE-2.md](docs/RESEARCH-MILESTONE-2.md), [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md), and [docs/MILESTONE-2-QA.md](docs/MILESTONE-2-QA.md). Real-device instructions for the Samsung Galaxy S25 Ultra (including the EAS internal-APK handoff) are in [docs/S25-ULTRA-PLAYTEST.md](docs/S25-ULTRA-PLAYTEST.md).
