# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

The feel and playtest proof milestone is complete on `main`. It answers: **Does FlipStitch feel satisfying on a real phone, and can we measure where players struggle?**

- Original synthesized sound effects for every action: needle pierce, thread tightening, hoop flip, invalid stitch, undo, hint, completion, unlock, and gallery selection.
- Controlled haptics through one feedback controller, using each platform's recommended haptic APIs.
- A minimal Settings screen: sound and haptics toggles, reduced-motion status, playtest data view/export/clear, progress reset, and about/license info.
- Local playtest instrumentation with a bounded on-device store — no accounts, no ads, no network, no external analytics.
- A pure playtest report engine with small-sample warnings, exportable from Settings.

The complete ten-level collection from the previous milestone remains:

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

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices, [docs/RESEARCH-MILESTONE-3.md](docs/RESEARCH-MILESTONE-3.md) for feel/playtest research, and [docs/MILESTONE-3-QA.md](docs/MILESTONE-3-QA.md) for this milestone's QA evidence.

UI sources and earlier test matrices live in [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md), [docs/RESEARCH-MILESTONE-2.md](docs/RESEARCH-MILESTONE-2.md), [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md), and [docs/MILESTONE-2-QA.md](docs/MILESTONE-2-QA.md). Real-device instructions for the Samsung Galaxy S25 Ultra are in [docs/S25-ULTRA-PLAYTEST.md](docs/S25-ULTRA-PLAYTEST.md).
