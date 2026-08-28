# Needle & Through-Cloth Peek — Interaction Design (Milestone 10)

Prompt 10's diagnosis: FlipStitch's puzzle rules were never the clarity
problem. The interface was. Live screenshots from before this milestone
showed a needle that looked randomly placed next to a hole (no visible
connection to how it got there) and a Peek panel that looked like a second,
misaligned hoop floating over the first. This document is the current
source of truth for the two systems that fix that: the **threaded needle**
and **Through-Cloth Peek**. See `docs/RESEARCH-MILESTONE-10.md` for the
research behind these decisions and `docs/PREVIEW-INTERACTION.md` for the
Milestone 8.1 design this supersedes (kept as history, not deleted).

## The hard invariant

```
needle.tip === projectForSide(holeById(level, game.currentHole), game.activeSide, size)
```

This holds for every reachable state of every production level, asserted
exactly (not "visually close") in `src/game/boardGeometry.test.ts`. No
layer is allowed to offset the tip "for visual convenience" — that was
exactly the failure mode this milestone fixes.

## Architecture: one geometry module, one needle component, four board layers

### `src/game/boardGeometry.ts` — pure, tested geometry

- `projectForSide(hole, side, size)` — the one physical mirror rule in the
  app. Front uses `hole.x`; back mirrors to `100 - hole.x`. `y` never
  mirrors (a hoop viewed from behind reverses left/right, not up/down).
  This replaces the old `pointFor` that was duplicated inline once per
  board layer, at two different `size` arguments, and had silently drifted
  out of alignment.
- `projectThroughFabric(hole, viewingSide, size)` — deliberately identical
  to `projectForSide(hole, viewingSide, size)`. See "Real flip vs.
  Through-Cloth Peek" below for why that equality is the entire point.
- `needleTipFor(level, game, size)` — the hard invariant above, as a
  function.
- `needlePoseFor(level, game, size)` — tip (same as above) plus a shaft
  angle derived from the vector of the most recent stitch, or a fixed
  default angle before any stitch exists.

Every layer that needs a hole's screen position calls one of these. Nothing
recomputes the mirror math locally anymore.

### `src/components/ThreadedNeedle.tsx` — the needle, as its own component

A small local SVG canvas (its own `<Svg>`, own `<Defs>`) with a metal
shaft, a visible eye, and one continuous working-thread path: **tip
(the fabric hole) → alongside the shaft → through the eye → a short loose
tail.** Every segment has a physical reason; there is no decorative,
disconnected curve. The tip is pinned at a fixed local ratio
(`NEEDLE_TIP_RATIO`) within the canvas — callers position the *canvas*,
never the tip directly, so the tip can be placed exactly on a board
coordinate by offsetting the canvas by `-tipX, -tipY`.

### `HoopBoard.tsx` — four layers, not one

| Layer | Dims for Peek? | Purpose |
|---|---|---|
| `HoopFrame` | Never | Wood rings, clamp, cloth base texture. The physical hoop itself — never moves, resizes, or dims for Peek. |
| `TensionRing` | Never | The thread-colored ring dyeing the hoop to the active side. Side *identity*, not puzzle content — stays a ground truth fact regardless of Peek. |
| `PatternLayer` | Yes (→ 0.4 opacity) | This side's stitch lines and hole marks. Recedes while peeking so the eye can read the opposite side through it, but never disappears. |
| `PeekOverlay` | — (is the peek) | Only rendered while peeking. See below. |
| `TouchLayer` | Disabled while peeking | Hit targets, decoupled from drawing so geometry and touch can never drift apart. |
| `NeedleLayer` | Never | The one real needle, full opacity always — see below. |

`SideStatusLabel` (`PLAYING · <side>`) and `PeekStatusLabel` (`SEEING
<side> THROUGH CLOTH`) are further siblings at full opacity, for the same
reason documented in the code: RN opacity below 1 creates its own stacking
context, so anything living inside a dimmed subtree can never out-paint a
sibling layer regardless of `zIndex` (a real Milestone 8.2 regression this
architecture prevents by construction).

## Real flip vs. Through-Cloth Peek

These are different transformations and must never share a coordinate
helper:

- **Real flip** (a stitch, or Undo): the hoop actually turns. Left and
  right physically reverse. `game.activeSide` changes.
  `projectForSide(hole, newSide, size)` differs from
  `projectForSide(hole, oldSide, size)` by the mirror rule.
- **Peek**: the player does not turn anything. They are looking *through*
  the fabric they are already facing, like holding embroidery over a
  lightbox. `game.activeSide` is untouched (`src/game/peek.ts` guarantees
  this structurally — nothing in `peek.ts` can read or write `GameState`).
  So a peeked hole's screen position must equal its position under the
  side actually being viewed, never the peeked side's own mirrored
  projection: `projectThroughFabric(hole, viewingSide, size) ===
  projectForSide(hole, viewingSide, size)`, asserted per hole, per
  production level, in `boardGeometry.test.ts`. Only the *content* drawn
  at that position — which edges, which used-state — comes from the
  peeked side.

Confusing these two was the geometric root of the old floating panel's
misalignment. Keeping them as two named functions instead of one
overloaded helper makes that confusion a type-level non-issue going
forward.

## Needle pose rule

```
tip = projectForSide(holeById(level, game.currentHole), game.activeSide, size)
angleDeg = lastMove
  ? atan2Degrees(tip - projectForSide(holeById(level, lastMove.from), game.activeSide, size))
  : DEFAULT_NEEDLE_ANGLE_DEG  // -42°, before any stitch exists
```

The shaft trails in the *opposite* direction of that angle (`angleDeg +
180` inside `ThreadedNeedle`), so the needle visually points back along
the thread it just pulled through, rather than sitting at an arbitrary
fixed tilt every frame.

## Stitch animation timeline

Driven entirely inside `HoopBoard`'s `NeedleLayer` (a self-contained
`useEffect` reacting to `game` changes), independent of
`GameScreen.animateSwap`'s existing board-flip transform — these are two
separate motion concepts sharing one moment in time, not one shared
animation:

1. **Advance (~140ms).** The needle animates from its old tip toward the
   destination hole, projected on the side just stitched from
   (`projectForSide(destinationHole, oldSide, size)`) — i.e. it visibly
   travels across the cloth still on screen, toward where it's about to
   pierce.
2. **Pierce (instant).** At the end of the advance, the anchor snaps to the
   true post-flip tip (`projectForSide(destinationHole, newSide, size)`) —
   the moment of crossing the mirror discontinuity, timed to land under
   `GameScreen.animateSwap`'s existing 125ms shrink-to-trough, where the
   board is visually near-zero width.
3. **Emerge (~110-120ms).** A spring scale (0.55 → 1) and fade (0.5 → 1)
   play as the board's existing spring-settle brings the flip back up —
   the needle visibly emerges through the new side's cloth at the mirrored
   position.

Total: roughly 350-420ms end to end, chosen against Nielsen Norman Group's
documented response-time thresholds (0.1s reads as instantaneous, 1s keeps
the user's flow of thought unbroken) — see `docs/RESEARCH-MILESTONE-10.md`.
It stays under the 1s "flow" threshold with meaningful margin, rather than
becoming a cutscene.

**Undo** reuses the exact same effect and math — it's driven generically by
detecting a hole/side change on the `game` prop, not by special-casing
direction, so a reverse stitch gets the same physically-coherent motion
without a slower, bespoke Undo animation.

**Restart, level change, or `game.moves.length === 0`** skip the animation
entirely and snap the tip straight to `startHole` — no replay of removed
stitches (Goal 30).

## Reduced motion

`NeedleLayer` checks `reduceMotion` (passed down from
`GameScreen`'s existing `AccessibilityInfo.isReduceMotionEnabled()` state,
already plumbed through `animateSwap`) before starting either animated
phase. When true, the anchor and emergence values are set synchronously to
their final resting state — the tip is still exactly on the new hole,
instantly. Motion is optional; the hard invariant is not.

Through-Cloth Peek was never motion-dependent to begin with (no
`animateSwap` call, same as Milestone 8.1) — this is unchanged.

## Accessibility

- Screen-reader announcements (`say()` /
  `AccessibilityInfo.announceForAccessibility`) fire on Peek transitions
  with updated, through-cloth-accurate copy:
  - enter: *"Viewing &lt;side&gt; through the fabric. Needle remains on
    &lt;activeSide&gt;. Read-only."*
  - exit: *"Peek closed. Continue stitching on &lt;activeSide&gt;."*
- The needle itself is `pointerEvents="none"` and carries no accessibility
  node of its own — hole state (`"needle position"` / `"valid stitch"` /
  `"not available"`) is still exposed per-hole by `TouchLayer`, unchanged
  from Milestone 8.1.
- Touch targets are unaffected: `TouchLayer` positions and sizes (48×48,
  `hitSlop: 4`) are identical to before; the needle canvas is decorative
  and non-interactive.

## Labels simplified

Milestone 8.1's Peek panel needed three stacked facts to explain itself:
`PLAYING · <side>`, `PEEKING · <side>`, and `Needle stays on <side>`.
Through-Cloth Peek needs one secondary label — `SEEING <side> THROUGH
CLOTH` — because the visual now does most of the explaining: same hoop,
aligned holes, the real needle still visible. `PLAYING · <side>` remains
the one permanent, ground-truth pill. The active toolbar label changed from
`Return to <side>` to `Close Peek`, since Through-Cloth Peek never moved
the player anywhere to "return" from.

## What changed vs. what didn't

**Changed:** the needle is now a real component with an exact,
tested-anchor position and a derived pose; Peek is drawn inside the exact
same hoop bounds with exact geometric alignment instead of a smaller,
offset panel; Peek shows completed reverse stitches strongly instead of a
uniform muted schematic; the real needle stays visible during Peek; label
copy shrank from three stacked facts to one secondary label.

**Unchanged:** `PeekState` (`src/game/peek.ts`) is still structurally
separate from `GameState` — nothing in `peek.ts` can read or write
`activeSide`/`currentHole`/`moves`/`usedEdges`, the same guarantee that
prevented the Milestone 8 contradictory-copy bug. Peek is still silent
(`peekToggled` has no sound/haptic) and still never calls `animateSwap` —
only a real stitch turns the hoop. Puzzle topology, level IDs, and
difficulty are untouched.
