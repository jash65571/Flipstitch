# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

The stabilization and Android device-proof milestone is complete on `main`. It hardens the playtest and feel work from Milestone 3:

- Attempt identity on every level event: restarts, replays, exits, and completions are distinct and reported per attempt, with legacy Milestone 3 events flagged honestly.
- Stable playtest lifecycle: exactly one open and one terminal event per attempt, safe under route replacement, Android back, backgrounding, and StrictMode-style remounts.
- Hardened storage: all pending events drain in order, background flushes, clear-during-write is safe, 5,000-event bound kept.
- Hardened audio: every delayed sound tracked and cleared, promise-safe native calls, no overlap on rapid taps.
- Accessible destructive confirms: WCAG-AA armed contrast, timer cleanup, no double execution.
- Repeatable builds: `eas.json` with an internal Android APK profile and a production AAB profile (`npm run build:android:internal` / `build:android:production`).

Milestone 3 (feel and playtest proof) also lives on `main`: original synthesized sound effects, controlled haptics through one feedback controller, a Settings screen, and local-only playtest instrumentation with a bounded store and a pure report engine — no accounts, no ads, no network, no external analytics.

The complete ten-level collection from the earlier milestone remains:

- Tap a valid hole to place one stitch.
- The active side changes after every stitch.
- Preview the reverse without moving the needle.
- Undo freely or ask for a hint.
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

`npm run check` runs tests, TypeScript, Expo Doctor, audio validation, and the analytics scan in sequence. Android, iOS, and web bundles export in CI on every push to `main`. Bricolage Grotesque and Manrope are bundled for offline use, and all sound effects are original and generated in-repo (see `assets/sounds/README.md`).

## Product rules

- The puzzle stays central. No store clutter appears during play.
- Input uses large tap targets and unlimited undo.
- Motion respects the device's reduced-motion setting; sounds and haptics keep working when it is on.
- Game rules live outside the renderer, so levels can be solved and tested without a device.
- Playtest data stays local, bounded, viewable, and clearable from Settings.
- Monetization comes after retention testing, never before the core is proven.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices, [docs/RESEARCH-MILESTONE-4.md](docs/RESEARCH-MILESTONE-4.md) for stabilization research, and [docs/MILESTONE-4-QA.md](docs/MILESTONE-4-QA.md) for this milestone's QA evidence.

Earlier research and test matrices: [docs/RESEARCH-MILESTONE-3.md](docs/RESEARCH-MILESTONE-3.md), [docs/MILESTONE-3-QA.md](docs/MILESTONE-3-QA.md), [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md), [docs/RESEARCH-MILESTONE-2.md](docs/RESEARCH-MILESTONE-2.md), [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md), and [docs/MILESTONE-2-QA.md](docs/MILESTONE-2-QA.md). Real-device instructions for the Samsung Galaxy S25 Ultra (including the EAS internal-APK handoff) are in [docs/S25-ULTRA-PLAYTEST.md](docs/S25-ULTRA-PLAYTEST.md).
