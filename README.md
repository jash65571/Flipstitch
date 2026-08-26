# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

This repository starts with a playable vertical slice of the core rule:

- Tap a valid hole to place one stitch.
- The active side changes after every stitch.
- Preview the reverse without moving the needle.
- Undo freely or ask for a hint.
- Finish every marked stitch on both sides.

The first milestone exists to answer one product question: **Is the forced flip clear and satisfying enough to support a full game?**

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
```

The milestone branch also exports Android, iOS, and web bundles in CI. Bricolage Grotesque and Manrope are bundled for offline use.

## Product rules

- The puzzle stays central. No store clutter appears during play.
- Input uses large tap targets and unlimited undo.
- Motion respects the device's reduced-motion setting.
- Game rules live outside the renderer, so levels can be solved and tested without a device.
- Monetization comes after retention testing, never before the core is proven.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices.

UI sources and the vertical-slice test matrix live in [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md) and [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md).
