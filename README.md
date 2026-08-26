# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

The content-proof branch expands the polished vertical slice into a complete ten-level collection:

- Tap a valid hole to place one stitch.
- The active side changes after every stitch.
- Preview the reverse without moving the needle.
- Undo freely or ask for a hint.
- Finish every marked stitch on both sides.
- Choose from ten validated handcrafted hoops.
- Unlock, replay, and resume levels with local progress.
- Reject broken content through a deterministic pure TypeScript solver.

This milestone answers the next product question: **Can the forced flip create a clear, varied difficulty curve across a full first collection?**

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

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices, and [docs/RESEARCH-MILESTONE-2.md](docs/RESEARCH-MILESTONE-2.md) for current interface research.

UI sources and the vertical-slice test matrix live in [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md) and [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md).
