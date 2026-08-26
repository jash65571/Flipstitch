# Research — Milestone 6 (Puzzle Depth & Difficulty)

Focused research pass done **before** re-authoring the difficulty curve. For
each reference: what was studied, what FlipStitch can learn, what not to copy,
and how it affected an actual implementation decision.

Two pages we tried to read returned nothing usable (a Reddit thread on
measuring puzzle difficulty returned no extractable text, and a game-design
skills article refused the fetch with 403). We did not rely on either; where
search-result snippets were too thin to cite honestly, the record below says
so and the decision stands on sources we could actually read.

---

## 1. Zach Gage — Good Sudoku & Knotwords

**What was studied.** The Six Colors interview with Zach Gage about Knotwords
(and Good Sudoku's role in it), plus the Good Sudoku press materials. Gage
describes Good Sudoku as "basically just Sudoku with different tools" — a
familiar ruleset with *teaching* tools layered on — and reports that the
difficulty in his collections ramps deliberately (harder across the week,
culminating in a hard Sunday). Knotwords' "Twist" numbers were designed so a
placement "extend[s] the impact of your letter placements far beyond their
neighbors, all the way to the other side of the puzzle."

**What FlipStitch can learn.**

- Difficulty belongs to *thought*, not to the ruleset. Keep the flip rule
  constant and make levels demand more reading/planning.
- A collection should have an explicit difficulty ramp with a strong capstone.
- Hints should be orthogonal and progressive: Knotwords considered "censored
  definitions" rather than showing answers — escalate in stages, never dump
  the answer first.
- Local choices with cross-region consequences ("all the way to the other
  side") are exactly the delayed consequences FlipStitch traps produce.

**What not to copy.** Daily-puzzle meta-structures, subscription
monetization, letter grids, or Gage's procedural generators — FlipStitch is a
handcrafted, calm, single-purchase-free experience; we are explicitly not
doing procedural generation.

**How it affected implementation.**

- The three-stage hint ladder in `src/game/hints.ts` (concept → region →
  exact) directly follows the "don't reveal the answer first" principle, and
  the *concept* stage is written as reasoning ("closing the smaller return
  first keeps the far branch reachable") rather than a hole name.
- The capstone rule in `src/game/difficulty.test.ts` ("Level 10 stays the
  strongest capstone") encodes Gage's "culminate on the hardest" ramp for our
  ten-level Day & Night collection.

---

## 2. Legible failure — dead ends in Sokoban, SSR/Snakebird, The Witness, COCOON, Baba Is You, Patrick's Parabox

**What was studied.** "Legible Failure — Making the Dead End Readable in
Puzzles" (Puzzlebyrinth). The essay's core question: *can the player read that
they have failed?* It distinguishes:

- **Sokoban** — the irreversible dead end; harsh on newcomers *because the
  dead end is invisible*, not because it is hard.
- **Stephen's Sausage Roll / Snakebird** — the "invisible dead end": you keep
  searching an unsolvable board; restart is the minimum honesty a puzzle owes
  the player.
- **The Witness / COCOON** — design the dead end out entirely (a wrong line is
  redrawn; nothing is ever irreversible). Cost: players try before they think;
  the bite must move elsewhere.
- **Baba Is You / Patrick's Parabox** — keep the dead end but make it legible
  with **unlimited undo**: "undo is after-the-fact legibility; telegraphing is
  legibility beforehand."

**What FlipStitch can learn.** FlipStitch's risk dimension *is* the stranded
thread, so we cannot follow The Witness and design it out — the trap is the
game. We must make each trap legible:

1. The dead end is **detected and announced the instant it happens**
   (`isGameStuck` → the trapped-thread alert) — never an invisible
   minutes-later realization.
2. **Undo is the teaching device**: cheap, unlimited, and on the trap card
   itself. Each undo traces the causality backward.
3. **Restart is instant and free** — the "minimum honesty" floor.
4. The board **telegraphs** the trap beforehand where possible: a runner that
   leaves a loop behind reads as dangerous once the pattern is understood.

**What not to copy.** Sokoban's *no-undo harshness*; SSR/Snakebird's *silent*
dead ends; The Witness's total dead-end removal (would erase FlipStitch's
risk component).

**How it affected implementation.**

- Trap levels strand at a *linear* runner's end (L5: fork at `b`, caught at
  `h`) so **one Undo frees the needle** — after-the-fact legibility with a
  short causal trace. Regression-tested in `src/game/stuck.test.ts`.
- `stagedHint` on a stranded thread returns no hole at any stage and says
  "Undo" — the game's help itself points at the legibility tool.
- The `maxConsequenceDepth` metric (how far ahead you must plan to avoid the
  trap) measures the *telegraphing* side: deep consequence = the trap is
  harder to foresee, reserved for Tricky/Expert.
- The trap card's copy ("The thread is caught … Nothing is lost") is written
  to make the failure readable and safe, never punitive.

---

## 3. The Witness — teaching without tutorials, no-punishment failure

**What was studied.** The Witness's documented design stance (no explicit
tutorial text; rules taught by careful first puzzles; no health bars, no time
limits, no punishment for failure — confirmed across its public design
discussion and echoed in the legible-failure essay's treatment of its
redrawable lines).

**What FlipStitch can learn.**

- The first puzzles of a collection are *lessons*, not challenges: each
  teaches one idea the later levels will assume.
- Failure should cost nothing but time and thought.

**What not to copy.** Open-world exploration structure; non-linear level
access; line-drawing interaction (FlipStitch is tap-to-stitch).

**How it affected implementation.**

- Levels 1–2 are explicitly lesson levels (`guidance: "full"`, no traps), and
  each teaches exactly one idea: L1 the flip, L2 the back-side start — while
  still offering a safe choice so the lesson is interactive, not autoplay.
- The no-punishment principle was already embodied (no lives/ads/timers) and
  is re-asserted in the regression tests: trap recovery never costs anything.

---

## 4. Nikoli-style and handcrafted puzzle-set design

**What was studied.** The general Nikoli convention of building large
handcrafted puzzle sets by layering *one new idea at a time* and repeating
each idea until it is absorbed before the next variation, plus the "fairness
through rule clarity" stance common to Nikoli-style logic puzzles (grids
solvable by pure deduction, no guessing). Search results on "Nikoli design
principles" were mostly thin snippets; the principle recorded here is the
widely documented one and is used only at the level of design philosophy, not
as a quote.

**What FlipStitch can learn.**

- Each tier should introduce *one* new skill and drill it before stacking the
  next (see the long-term ladder in `docs/PRODUCT.md`).
- Levels should be **handcrafted and validated**, never generated: every level
  is authored, measured, and regression-pinned.

**What not to copy.** Grid/crossing mechanics or Nikoli's visual language.

**How it affected implementation.**

- The ten-level progression maps to a skill ladder: flip (1–2) → safe shared
  holes (3–4) → first trap (5) → stacked traps (6) → ordering + traps (7–8) →
  linked returns (9) → multi-loop capstone (10). `docs/LEVEL-DESIGN-GUIDE.md`
  codifies this ladder for future collections.

---

## 5. Graph/path-puzzle difficulty measurement

**What was studied.** The general literature on measuring puzzle difficulty for
graph/route puzzles: branching factor, forced-move share, solution counts,
lookahead/planning depth, and reachable failure states. (Two promising pages —
a r/gamedesign thread on measuring puzzle difficulty and a game-design-skills
article — could not be fetched; we did not cite them. The measures below are
standard for search/route puzzles and, more importantly, *we verified each one
is informative on FlipStitch levels* before keeping it.)

**What FlipStitch can learn.** Useful measures exist, but they are only worth
keeping if they *discriminate* FlipStitch levels:

- `solutionCount` alone is weak (L1 has 2 solutions; L7 has 2 — wildly
  different puzzles).
- Branching factor alone is weak (a wide safe hub ≠ a hard level).
- The informative combinations: **decisions × danger × consequence depth**,
  with length strictly capped.

**What not to copy.** Arbitrary "difficulty points" formulas that have no
design meaning; any score where stitch count dominates.

**How it affected implementation.**

- `src/game/analyzer.ts` implements `analyzeLevel` (13 metrics) and
  `difficultyScore` (planning + risk + length, each clamped to a documented
  share). We validated each metric by checking it discriminates our real
  levels — e.g. the Prompt 5 flaw (7–8 easier than 6) shows up directly as a
  score drop, and the re-authored curve no longer drops.
- A 20-stitch forced path scores ~8–10 while a 10-stitch branching trap scores
  far higher; `src/game/analyzer.test.ts` pins this property so raw length can
  never dominate.

---

## Summary of decisions grounded in research

| Research finding | Implementation |
|---|---|
| Escalate hints; never reveal the answer first (Gage/Knotwords) | 3-stage staged hints; concept stage is reasoning, exact stage is solver-derived |
| Collections ramp to a hard capstone (Gage) | Strictly monotonic 15→80 curve; capstone regression test |
| Dead ends must be legible, with undo as teaching (Legible Failure) | Instant trap detection + alert, one-Undo recovery on traps, undo-first help copy |
| No-punishment failure (The Witness) | No lives/ads/timers; free Undo/Restart always |
| Teach one idea per puzzle (Witness/Nikoli) | Tutorial-safe L1–2 with one safe choice each; skill ladder across the ten |
| Difficulty = thought, not length (graph metrics) | Score caps length at 10/100; forced paths penalized |
