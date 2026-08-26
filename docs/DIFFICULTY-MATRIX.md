# Difficulty Matrix — Collection 01 "Day & Night"

Prompt 6 re-authored the ten-level curve and built the measuring system behind
it. Every figure below is **measured**, not asserted: `scripts/analyze-levels.mjs`
walks each level's entire reachable state space (position × side × used-edge
set) with the pure, deterministic analyzer in `src/game/analyzer.ts`.

## The FlipStitch difficulty score (transparent, not a mystery number)

`difficultyScore(level, metrics)` in `src/game/analyzer.ts` produces a 0–100
score from three documented components. Each component is clamped to its own
share so no single metric can dominate — a 20-stitch forced path can never
outscore a 10-stitch branching trap puzzle.

```
total = planning + risk + length        (0..100)

planning (0..50) — how much thought the *choices* demand
  = 20 × min(1, meaningful decisions / 6)     solution-path decision states
  + 15 × min(1, max branching factor / 4)     how wide choices get
  + 15 × (1 − forced-move share)              freedom from autoplay filler

risk (0..40) — how much danger the *traps* demand
  = 15 × min(1, dangerous decisions / 4)      decisions with a doomed branch
  + 15 × min(1, max consequence depth / 5)    how far ahead you must plan
  + 10 × min(1, reachable dead ends / 2)      genuine stranded-thread states

length (0..10) — capped stitch count; presence, never dominance
  = 10 × min(1, total stitches / 24)
```

Measured tiers: **Gentle** < 15 · **Easy** 15–34 · **Moderate** 35–54 ·
**Tricky** 55–74 · **Expert** ≥ 75. `tierForScore()` maps the total; every
level's authored label must equal its measured tier (regression-tested).

## Measured matrix (Prompt 6, post re-author)

| # | Level | Difficulty | Stitches | Solutions | Meaningful decisions¹ | Forced share | Max branch | Dead ends | Dangerous decisions | Consequence depth | Score | Can trap? | Guidance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | First Thread | Easy | 4 | 2 | 1 | 86% | 2 | 0 | 0 | 0 | 15 | no | full |
| 2 | Kite Tail | Easy | 5 | 4 | 2 | 85% | 3 | 0 | 0 | 0 | 22 | no | full |
| 3 | Twin Petals | Easy | 6 | 6 | 4 | 71% | 2 | 0 | 0 | 0 | 28 | no | reduced |
| 4 | Butterfly Turn | Easy | 7 | 6 | 4 | 80% | 3 | 0 | 0 | 0 | 31 | no | reduced |
| 5 | Forked Needle | Moderate | 8 | 1 | 1 | 92% | 2 | 1 | 1 | 5 | 39 | **yes** | reduced |
| 6 | Echo Stairs | Moderate | 8 | 1 | 2 | 79% | 2 | 3 | 3 | 4 | 54 | **yes** | reduced |
| 7 | Orbit Bloom | Tricky | 9 | 2 | 3 | 86% | 3 | 3 | 3 | 4 | 60 | **yes** | reduced |
| 8 | Laced Window | Tricky | 12 | 2 | 3 | 90% | 3 | 3 | 3 | 5 | 64 | **yes** | minimal |
| 9 | Moonlit Return | Expert | 13 | 2 | 5 | 74% | 3 | 15 | 15 | 5 | 77 | **yes** | minimal |
| 10 | Master Sampler | Expert | 20 | 1 | 6 | 75% | 2 | 63 | 63 | 8 | 80 | **yes** | minimal |

¹ "Meaningful decisions" = distinct reachable states on at least one full
solution path with ≥2 legal stitches (the old column, now called
`solutionDecisionStates`). Forced share, branching, dead ends, dangerous
decisions, and consequence depth are defined in `src/game/analyzer.ts` and in
`docs/LEVEL-DESIGN-GUIDE.md`.

The curve **15 → 22 → 28 → 31 → 39 → 54 → 60 → 64 → 77 → 80** is strictly
monotonic: no level is easier than the one before it, and every tier boundary
is crossed only when the measurements say so. `src/game/difficulty.test.ts`
fails if this curve ever drops.

## What changed per level (old → new)

| # | Old state (Prompt 5) | New state (Prompt 6) |
|---|---|---|
| 1 | 5 st, 1 solution, **0 decisions**, autoplay | 4 st, 2 solutions, **1 safe choice** (two rays share the base; either is safe) |
| 2 | 7 st, 1 solution, 0 decisions | 5 st, 4 solutions, 2 safe choices (two unequal wings from the base) |
| 3 | 4 st, 2 solutions, 1 decision | 6 st, 6 solutions, figure-8 twin petals with a shared center — first shared-hole reading |
| 4 | 9 st, 2 solutions, 1 decision | 7 st, 6 solutions, three wings around one hub — safe out-and-backs in any order |
| 5 | 5 st, 1 solution, 1 decision, trap | 8 st, 1 solution, fork with a **longer runaway branch**: taking the runner before closing the loop strands the thread at the far end (undo depth 1) |
| 6 | 8 st, 1 solution, 2 decisions, trap | unchanged structure, re-validated: two echo decisions, four doomed stitches |
| 7 | 7 st, **6 solutions, no trap**, forgiving | 9 st, **2 solutions, real trap**: two petals plus a runner that never returns; close the returns first |
| 8 | 9 st, 4 solutions, no trap | 12 st, 2 solutions, **real trap**: return rail + petal + loose runner through two shared holes; the runner must finish last |
| 9 | 11 st, 3 decisions, trap | 13 st, 2 solutions, 5 meaningful decisions, linked returns L→R, final two-way-safe cluster |
| 10 | 17 st, 1 solution, 5 decisions, trap | 20 st, 1 solution, 6 meaningful decisions, 63 dangerous decisions, six hubs — still the strongest capstone |

## Per-level design intent

- **1–2 (Easy):** tutorials keep **full** guidance and cannot trap. They are no
  longer autoplay: each offers at least one safe, deliberately visible choice
  that rehearses the flip rule ("stitch out along a ray, the flip returns you
  to the base"). A beginner can think briefly and never be punished.
- **3–4 (Easy):** the bridge into planning. Guidance drops to **reduced** so
  the player reads the pattern. Every branch is safe — but the shared-hole
  structure they teach (figure-8 center, hub) is exactly what 7–10 will punish.
- **5–6 (Moderate):** the first genuine traps. Level 5 teaches *why* a branch
  strands: taking the long runner before closing the small loop leaves the loop
  unreachable, and the thread is caught at the end of the run — one Undo frees
  it. Level 6 layers two echo decisions with reachable traps.
- **7–8 (Tricky):** now genuinely harder than 6 and trap-capable. Orbit Bloom
  hides a runner among returning petals; Laced Window weaves two shared holes
  and demands the loose crossing go last. Neither needs new rules — the strand
  is a pure consequence of the thread rule, and it is understandable after the
  fact.
- **9–10 (Expert):** planning depth and delayed consequence. Level 9 climbs
  left-to-right through linked returns and ends in a two-way-safe cluster
  (a designed, documented safe choice among danger). Level 10 chains six small
  loops, each needing to be closed before the long stitch onward.

## Safety and fairness (unchanged, verified)

- No lives, no timers, no ads, no purchases, no streaks — failure is always
  free and reversible.
- **Safe retry:** every level offers unlimited Undo and Restart; trap levels
  surface the trapped-thread alert ("The thread is caught … Nothing is lost"),
  never reveal the answer, and never punish experimentation.
- Accessibility is never traded for difficulty: guidance *visually* fades
  (full → reduced → minimal) while screen-reader access to valid moves stays
  intact at every level.
- **Can trap?** = `allowDeadEnds`, confirmed by exhaustive search and by
  `src/game/difficulty.test.ts`: trap-capable levels must really trap; safe
  levels must never strand.

## Previous measurements (Prompt 5, kept for history)

The old matrix honestly flagged 1–2 as zero-decision autoplay and 7–8 as
"Tricky but forgiving" (6 and 4 solutions, no trap), with a risk-skill dip in
the middle of the curve. Those findings are what drove the Prompt 6 re-author;
the numbers above replace them. Historical text of that pass lives in the
Prompt 5 milestone docs and git history.
