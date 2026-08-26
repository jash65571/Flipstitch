# Vertical-slice QA

## Automated checks

Run from the repository root:

```bash
npm ci
npm test
npm run typecheck
npm run doctor
npm run export:android
npm run export:ios
npm run export:web
```

The test suite covers the alternating-side rule, invalid-state safety, unlimited undo, hint purity, completion, responsive layout states, and key text contrast pairs.

## Manual device steps

1. Open the level on one small phone and one large phone.
2. Confirm the coral front state is clear before the first move.
3. Tap hole B. Confirm one stitch appears, haptics fire, and the back side replaces the front.
4. Tap an unavailable hole. Confirm state and progress do not change.
5. Use Undo. Confirm the prior side, needle, thread, and progress return.
6. Tap Preview. Confirm the opposite pattern appears without moving the needle or progress.
7. Use Hint. Confirm one valid hole is highlighted and no move is made.
8. Complete B, C, D, E, F, G, H, I. Confirm both sides are complete and the reveal appears.
9. Turn on reduced motion. Repeat one move and Preview; both must swap without transform motion.
10. Turn on a screen reader. Confirm hole state, toolbar state, progress, and move results are announced.
11. Increase system text size. Confirm the board stays playable and controls remain readable.
12. Try landscape. Phones show portrait guidance; wide tablets use the two-column layout.

## Environment limit

The delivery environment can compile all three platform bundles but has no Android emulator, iOS simulator, or browser binary. Real-device haptics, native screen-reader order, GPU frame timing, and final screenshots still require the manual steps above.
