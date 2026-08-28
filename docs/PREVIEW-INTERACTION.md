# Preview → Peek — Interaction Design (Milestone 8.1, superseded by Milestone 10)

> **Milestone 10 addendum (current model):** everything below this banner
> describes the Milestone 8.1 **floating panel** design — a smaller,
> corner-offset second circle (`size * 0.86`, `top: 7%`, `left: 13%`) with
> no needle and no completed-stitch detail. It was technically safe (state
> separation held, tests passed, no contradictory copy) but it **failed the
> desired mental model**: live screenshots showed a second hoop that didn't
> line up with the first, and the panel needed three stacked labels to
> explain itself. Milestone 10 replaced it with **Through-Cloth Peek** —
> the exact same hoop bounds, holes aligned pixel-for-pixel with the live
> layer, completed reverse stitches rendered strongly, and the real needle
> staying visible throughout. See `docs/NEEDLE-INTERACTION.md` for the
> current model and geometry rule, and `docs/RESEARCH-MILESTONE-10.md` for
> the research behind the change. This document is kept as history — the
> *problem* it solved (state separation, no contradictory PLAYING/PEEKING
> copy) is still solved the same way; only the *visual* changed.
>
> **Milestone 8.2 addendum:** everything below describes the Milestone 8.1
> design and fix. Milestone 8.2's job was to verify it against the running
> app rather than trust the design doc — live screenshots of the corrected
> label stacking, both Peek directions, reduced-motion, and large-text; a
> single-tester five-second clarity pass; and a judgment on whether Peek
> needs a needle-anchor marker on its dimmed play layer. See
> `docs/MILESTONE-8-2-QA.md` → "Browser proof" and "Human usability proof"
> for the results and the needle-anchor decision.

## What was wrong

Milestone 8's Preview blended two different facts into one variable:

```ts
const visibleSide = previewSide ?? game.activeSide;
```

`visibleSide` drove the hoop's rendering. `message` (the status text) was
driven separately, straight off `game.activeSide`, and was only updated on
real moves. The result, reproduced from the Milestone 8.1 QA screenshots:

- player is actually on the Back side (a real stitch just landed there),
- status copy: *"Back side. Read the pattern for your next stitch."*
- player taps **Preview**,
- the hoop visibly flips to show **FRONT**,
- the status copy still says **"Back side..."**

Two competing truths on one screen, for a game whose entire mechanic is
"know which side your needle is actually on." `handlePreview` also called
the same `animateSwap` used for a real stitch and emitted the same
`sideChanged` feedback (hoop-flip sound, soft haptic) — so a temporary,
read-only inspection used the identical visual and feedback language as a
permanent, real side change.

## The fix: two structurally separate facts

`src/game/peek.ts` is the single source of truth for both:

```ts
export type PeekState = Side | null; // null = not peeking

function togglePeek(activeSide: Side, peekSide: PeekState): PeekState
function displayMode(peekSide: PeekState): "playing" | "peeking"
function playingStatus(activeSide: Side): string   // "PLAYING · FRONT"
function peekingStatus(peekSide: PeekState): string | null // "PEEKING · BACK" | null
```

`GameScreen.tsx` holds `peekSide` as a separate `useState` from `game`
(`GameState`). Nothing in `peek.ts` can read or mutate `GameState` — the
module's functions only take and return `Side` values. This is a structural
guarantee, not a convention: the contradictory-copy bug is impossible to
reintroduce by accident because there is no shared "visible side" variable
left to blur.

**PLAYING is always visible; PEEKING only appears alongside it, never
instead of it.** The player never has to infer where the needle actually
is — `PLAYING · <activeSide>` is rendered by the play layer at all times,
peeking or not.

## Board layering, not board flipping

`HoopBoard.tsx` now renders two independent layers instead of one
side-swappable one:

- **Play layer** (`PlayLayer`) always renders `game.activeSide`. It never
  reads `peekSide`. This is the only layer that ever shows the needle, legal
  destination glow, or hint rings, and the only one whose holes are ever
  interactive.
- **Peek layer** (`PeekLayer`), rendered only when `peekSide !== null`, is a
  visually distinct read-only panel offset toward one corner of the hoop
  (`peekWrap` — a partial overlay, not a full replacement, so the play layer
  stays visible underneath). It shows the opposite side's stitch pattern
  as muted outline holes and dashed lines, with **no needle** and **no
  legal-move glow**, tagged with a `PEEKING · <side>` tab and an anchored
  `Needle stays on <activeSide>` note.
- **`SideStatusLabel`** (the `PLAYING · <side>` pill) is its own component,
  rendered as a full-opacity sibling of the Peek layer, not as a descendant
  of the dimmed `PlayLayer`. Milestone 8.2 QA found the pill visually
  clipped by the Peek panel in live screenshots when it lived inside
  `PlayLayer`'s `opacity: 0.4` subtree — opacity below 1 creates its own
  CSS/RN stacking context, so no `zIndex` on the pill could paint it above
  the Peek layer. Extracting it as a sibling was the actual fix (see
  `docs/MILESTONE-8-2-QA.md`).

A real stitch still uses `animateSwap` (the flip-scale transform,
`hoop-flip` sound, `soft` haptic). Peek uses none of these — entering or
exiting Peek is a direct state change with no shared animation path, so the
two can never be visually confused. See `docs/RESEARCH-MILESTONE-8-1.md`'s
"Motion" and "Feedback" entries for why.

## Non-interactivity is enforced, not just visual

While peeking:

- the play layer's holes are `disabled` and `accessibilityElementsHidden`
  (real interaction is blocked, not just visually discouraged),
- the peek layer has no `Pressable` elements at all — it is rendered
  entirely as non-interactive `View`/`Svg`,
- the peek layer's single accessible node announces
  `"PEEKING · <side>. Read only. Needle stays on <activeSide>."`

## Control label (Milestone 8.1 values — see note)

The toolbar control (`Icon name="peek"`, formerly `"preview"`) is dynamic
and always names the exact next action:

| State | Label (Milestone 8.1) |
|---|---|
| Not peeking | `Peek Front` / `Peek Back` (names the side you'd see) |
| Peeking | `Return to Front` / `Return to Back` (names the side you'd return to) |

> **Superseded in Milestone 10:** the active-state label is now `Close
> Peek`, not `Return to <side>`. Through-Cloth Peek never moves the player
> anywhere — the hoop never turns — so "return to" implied a trip that
> never happened. The idle-state label (`Peek Front` / `Peek Back`) is
> unchanged. See `src/game/peek.ts#peekControlLabel` and
> `docs/NEEDLE-INTERACTION.md`.

## Feedback

`peekToggled` (`src/feedback/mapping.ts`) is a new, deliberately silent
feedback event (no sound, no haptic). Milestone 8.1 considered a distinct
subtle cue for entering/exiting Peek and rejected it: silence reads more
clearly as "the real game state did not just change" than any new sound
would, and the prompt's instruction not to add audio "just because we can"
weighed against it.

## Accessibility announcements (Milestone 8.1 wording — see note)

`say()` (via `AccessibilityInfo.announceForAccessibility`) fires on every
Peek transition:

- enter: `peekEnterAnnouncement(peekSide, activeSide)` — e.g. *"Peeking at
  Front. Your needle stays on Back. Peek is read-only."*
- exit: `peekExitAnnouncement(activeSide)` — e.g. *"Returned to Back.
  Continue stitching."*

> **Superseded in Milestone 10:** the copy now matches the through-cloth
> model — enter: *"Viewing Front through the fabric. Needle remains on
> Back. Read-only."*; exit: *"Peek closed. Continue stitching on Back."*
> The mechanism (fires on every transition, names both sides, states
> read-only) is unchanged; only the wording moved from "peeking at"/
> "returned to" (implying travel) to "viewing through"/"closed" (implying
> inspection only). See `src/game/peek.ts`.

## Reduced motion

Peek never had a motion-dependent code path to begin with (it does not use
`animateSwap`), so reduced motion changes nothing about Peek's behavior —
the `PLAYING`/`PEEKING` labels, the noninteractive board, and the needle
anchor note are identical either way. This satisfies "motion is optional,
meaning is not" by construction rather than via a `reduceMotion` branch.

## Deliberately not built

Per the prompt's scope limits and the "only if it improves clarity" framing
for optional ideas:

- **Press-and-hold Peek shortcut** — not added. A normal tap remains the
  only way to Peek; a hold-only interaction risks accessibility and
  motor-control issues the prompt explicitly flagged, and there was no
  human-testing signal in this milestone that a hold shortcut was needed.
- **Tablet/wide-layout side-by-side reference** — not added. The current
  wide layout (`horizontal` in `GameScreen.tsx`) already places the hoop and
  footer side by side; adding a second permanent mini-hoop would introduce a
  second mental model for wide screens only, which the prompt explicitly
  warned against ("Do not create different mental models on different
  devices").
- **Literal cloth-peel 3D rendering** — not built. The Peek panel is a
  plain offset `View`/`Svg` layer (no transform-based "lift" animation
  beyond appear/disappear). This is a scope cut given the milestone's time
  budget, not a rejection of the idea — see Known Remaining Risks in
  `docs/MILESTONE-8-1-QA.md`.
