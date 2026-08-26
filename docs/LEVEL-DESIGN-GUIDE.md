# Level Design Guide — FlipStitch

The authoring reference for every future collection. FlipStitch is an
embroidery logic puzzle: **one continuous thread travels through one hoop, and
every valid stitch forces the player onto the opposite side.** That rule is
the game. Difficulty must come from planning the thread path across the two
sides — never from worse controls, hidden information, timers, or randomness.

This guide pairs with three tools:

- `src/game/analyzer.ts` — pure, deterministic measurement of any level.
- `scripts/analyze-levels.mjs` — prints the whole collection's measurements.
- `src/game/difficulty.test.ts` — regression tests that protect the curve.

---

## 1. What makes a good FlipStitch puzzle

A good level makes the player **think about the flip**. Concretely:

1. **Both sides matter.** If a level can be solved without ever reading the
   other side, it is not a FlipStitch puzzle yet.
2. **Choices are real.** Every decision point offers ≥2 legal stitches, and at
   least some of those choices matter later (see §6 fake choices).
3. **Failure is fair.** Wrong routes strand *because of the thread rule*, and
   the stranded point is understandable after the fact.
4. **Calm.** The Living Sampler look stays calm even when the puzzle is hard.
5. **Measurable.** The level's authored difficulty label matches its measured
   tier (see §11). Labels are claims; the analyzer verifies them.

A level is *not* made harder by: smaller holes, tinier touch targets, hidden
information, lower contrast, color-only signals, faster animation, or timers.
Difficulty is intellectual.

---

## 2. How tutorial levels teach concepts

Levels 1–2 are the tutorial. They keep `guidance: "full"` — every legal
destination glows — and they must **never trap** (`allowDeadEnds: false`, no
reachable dead end).

Rules for tutorials:

- **One concept per level.** L1 teaches "every stitch flips the hoop."
  L2 teaches "the hoop can begin on the back."
- **Autoplay is a trap for the game, not the player.** Even a tutorial should
  contain **at least one safe choice** (`solutionDecisionStates ≥ 1`). The
  choice rehearses the rule it teaches: in L1, two rays share a base and either
  ray is a legal first stitch; whichever you pick, the flip returns you home.
  The player thinks briefly and is never punished.
- **Never introduce a hard failure before the mechanic is understood.** No
  trap, no consequence, no hint of punishment in levels 1–4.

Tutorial checklist (regression-tested for 1–2):

- [ ] `guidance: "full"`
- [ ] `allowDeadEnds: false` and `canTrap === false`
- [ ] no dangerous decisions (`dangerousDecisions === 0`)
- [ ] at least one safe decision (`solutionDecisionStates ≥ 1`)
- [ ] score below 25 (Easy band, clearly not accidental)

---

## 3. Safe branches vs. dangerous branches

A **safe branch** is a legal stitch that leaves at least one full solution
reachable. A **dangerous decision** is a state where at least one legal stitch
leads (immediately or later) to a doomed state. The analyzer counts both.

- Safe branches teach structure without risk (levels 3–4, and the final
  two-way-safe cluster in L9). They let players experiment freely.
- Dangerous branches teach foresight (levels 5+). They exist so a wrong route
  is *believable*.

Design rule: **dangerous decisions must always have at least one safe
alternative.** If every option strands, the level is a lottery, not a puzzle.
The analyzer reports `safeAlternativeCount` per level; keep it ≥ 1 on every
trap level.

---

## 4. What makes a trap fair

A trap (genuine dead end) is fair when all of these hold:

1. **It results from the thread rule.** The stranded state is a hole with no
   legal unused stitch on the current side — nothing arbitrary was added.
2. **It is reachable by a reasonable route.** A player who misreads the
   pattern can land there; a player who reads carefully cannot.
3. **It is recoverable.** Undo (one or a few stitches) frees the needle, and
   Restart is always available. No lives, no ads, no punishment.
4. **It is understandable in hindsight.** After seeing the thread caught, the
   player can see *why*: a loop was left behind, a runner was taken too early,
   a shared hole was spent.
5. **It is not immediate.** A trap should not fire on the very first decision
   of a level unless the level exists to teach exactly that (L5 is the
   exception: it teaches the fork). Later levels delay the consequence so the
   player must plan ahead.

The analyzer's `earliestDoomDepth`, `maxConsequenceDepth`, and
`distinctDeadEnds` tell you how fair the trap is. Levels marked
`allowDeadEnds: true` must measure `canTrap === true` (regression-tested).

---

## 5. Building delayed consequences

The most valuable FlipStitch moment: the player makes a wrong-looking-but-
reasonable choice, then discovers stitches later that the thread is caught.

How to build one:

- **Separate the decision from the doom.** The dangerous choice lives at one
  hole; the strand fires several stitches later. L5's fork is at `b`, but the
  thread is caught at the far end of the runner (`h`), after the player has
  invested five stitches. Consequence depth 5, yet one Undo frees it because
  the runner retraces.
- **The wrong route must look like the main route.** The runner is long and
  tempting; the safe loop is small and easy to defer. That is the temptation.
- **Keep recovery cheap.** A long, linear runner retraces stitch-by-stitch, so
  Undo is the obvious fix. If recovery required undoing a branching tangle,
  the player would feel robbed.

`maxConsequenceDepth` = the longest gap between a wrong choice and the nearest
dead end. It is also the lookahead a player needs to *avoid* the trap.

---

## 6. Shared holes and planning depth

A **shared hole** is touched by ≥2 edges (the analyzer counts these); a **hub**
is touched by ≥3. Shared holes are where FlipStitch thinking lives, because the
thread can pass through the same hole on both sides at different times.

- A shared hole makes a *return* possible: stitch out, flip, stitch back
  through the same hole on the other side. L3's figure-8 and L4's hub are pure
  return structures.
- Shared holes create *ordering* constraints: which return you close first can
  determine whether another branch stays reachable.
- Two shared holes linked by a rail (L8) force the player to think about *both*
  holes at once: use the rail while the far hole is still open, then close the
  near returns.

Planning depth comes from **stacking** these obligations:

- Level 5: one fork, one obligation (close the loop).
- Level 6: two echoes, must resolve the local echo before climbing.
- Level 7: three returns plus a runner; ordering among returns.
- Level 8: two shared holes plus a runner; the runner goes last.
- Level 9: linked left-to-right returns, five meaningful decisions.
- Level 10: six small loops chained by long stitches — each loop closed before
  moving on.

Increase planning depth by adding *dependencies* between regions, not by adding
more stitches to a single path.

---

## 7. Avoiding fake choices

A fake choice is a decision where every option is equivalent (same outcome,
same future, same risk). They inflate the "decision" count without adding
thought.

Signs of fake choices:

- The analyzer shows high `decisionStates` but low `solutionDecisionStates`
  (most decisions sit off the solution path or all lead to the same result).
- Every branch at a decision leads to a solution and nothing is ever at stake.
- The branch order is commutative everywhere (all returns interchangeable with
  no consequence).

Fix by making at least one option **bind a future obligation**: it consumes a
shared hole, leaves a loop behind, or strands a runner. If you cannot make the
choice matter, cut the branch — a shorter honest puzzle beats a longer fake one.

---

## 8. Avoiding forced-path filler and length-based difficulty

A forced path (every state has exactly one legal stitch) adds stitches without
adding thought. The analyzer reports `forcedMovePercent`; the difficulty score
penalizes it (`15 × (1 − forced share)`).

Rules:

- Do **not** make a level harder by extending its chains. A 20-stitch forced
  path scores ~8–10; a 10-stitch branching trap puzzle scores far higher.
- The `length` component of the score is capped at 10/100 precisely so length
  can never dominate (see `docs/DIFFICULTY-MATRIX.md`).
- Some forced stitching is fine — the *setup* of a level can be guided — but
  the decisions are the puzzle. If a level's forced share is above ~90%,
  question whether it earns its tier.

---

## 9. Symmetry without obviousness

Symmetry is a great teaching tool: mirrored patterns are easy to read and
invite systematic solutions. But perfect symmetry makes puzzles *obvious* —
solve one side, mirror the other.

How to use symmetry well:

- Use symmetry for the *safe* scaffolding (petals, wings, returns).
- **Break symmetry at the decision points.** Give one branch a runner, or make
  one shared hole carry the return, so the mirrored reading fails at exactly
  the moment choice matters.
- L8 is the model: a window that reads as symmetric, but the loose crossing
  must finish last because only one route keeps both shared holes open.

---

## 10. Front/back dependencies

The flip rule means a hole can be entered on the front and left on the back —
or entered twice, once per side, if both sides have edges there. These
cross-side dependencies are the game's depth.

Design patterns that build them:

- **The return:** stitch out on one side, return through the same hole on the
  other. The dependency: the hole must stay reachable until the return.
- **The runner:** a chain that leaves a region; once started, it cannot come
  back. The dependency: nothing it leaves behind may still owe a stitch.
- **The rail through two shared holes:** moving between regions consumes the
  far hole's availability. The dependency: order the rail before the far
  region's returns close.
- **The hub:** many returns meet at one hole. The dependency: track which
  wings still owe a return (L4 teaches; L7–10 punish).

`frontDecisionShare` (share of decision states on the front) is a balance
signal: if every decision happens on one side, the other side is scenery.
Aim for meaningful decisions on both sides across a collection.

---

## 11. Grading difficulty

Grading is measurement, not vibes. Run `scripts/analyze-levels.mjs` (or call
`measureLevel` from `src/game/analyzer.ts`) and compare to the tier bands:

| Tier | Score | Expected profile |
|---|---|---|
| Gentle | < 15 | Autoplay or near-autoplay; only for meta content, not the collection |
| Easy | 15–34 | Safe choices, no traps, guidance full or reduced |
| Moderate | 35–54 | First traps; few decisions, one or two dangerous |
| Tricky | 55–74 | Multiple dangerous decisions, delayed consequences, shared-hole structure |
| Expert | 75+ | Dense danger, deep planning, multi-region dependencies |

Then ask the score's questions:

- Is this level harder than the previous one? (**The curve must never drop** —
  regression-tested in `src/game/difficulty.test.ts`.)
- Is it hard because of thought (`planning` + `risk`) or length (`length`)?
- Does it contain real decisions? (`solutionDecisionStates ≥ 1` always; ≥ 3 for
  Tricky+.)
- Can the player make believable mistakes? (`dangerousDecisions ≥ 1` on trap
  levels.)
- How far ahead must the player plan? (`maxConsequenceDepth`.)
- Is it longer than it is thoughtful? (forced share, length share.)

Every level's authored `difficulty` label **must equal** its measured tier
(regression-tested) — a label is a promise the analyzer checks.

---

## 12. Expected ranges for each tier (collection guidance)

Within a collection, aim for a strictly rising curve, and:

- Keep the first two levels tutorial-safe (see §2).
- Introduce the first trap at a deliberate, documented level (L5 is the
  collection's "first trap" — the regression test pins it there).
- Once introduced, **never let the trap skill vanish** (the Prompt 5 flaw was
  7–8 being trap-free after 5–6). If a later level is trap-free, it must be
  *intentionally* a planning puzzle and documented as such.
- Guidance should only ever tighten (full → reduced → minimal) as the
  collection proceeds — never strengthen again late.
- Keep the final level the strongest (the capstone must have the max score).

---

## 13. Validating a new level (automated)

Before shipping any level, it must pass:

- **`validateLevel(level)`** from `src/game/solver.ts` — structural checks
  (holes exist, no duplicate edges, valid coordinates), authored-solution
  checks (starts at `startHole`, correct side alternation, uses every edge
  exactly once), solver checks (exactly `expectedSolutionCount` solutions,
  `UNSOLVABLE` never, `unique` means exactly one).
- **`measureLevel(level)`** — the level's metrics land in the tier it claims,
  and `canTrap` matches `allowDeadEnds`.
- **The collection checks** in `src/game/difficulty.test.ts` — the new level
  must not flatten the curve.

Every production level runs through `assertValidLevel` at import time
(`src/game/levels.ts`), so an invalid level breaks the build immediately.

## 14. Testing intended solutions

- The **authored solution** must be a real solution: walk it with `playMove`
  and assert it completes with every edge used exactly once. The validator's
  `authoredSolutionIssues` does this.
- Play it in the **actual UI**, not just the engine: hole positions must sit on
  the hoop, edges must read as stitches, and the flip must be visible on
  Preview.
- Assert the authored solution never transiently reports "stuck"
  (`src/game/stuck.test.ts` walks every intermediate state).

## 15. Testing unintended solutions

- The analyzer's `solutionCount` is the ground truth. If the level claims
  `unique: true`, the count must be exactly 1; otherwise it must equal
  `expectedSolutionCount`. `src/game/solver.test.ts` and
  `src/game/difficulty.test.ts` both assert this.
- If a level is *not* unique, decide whether the extra solutions are fine
  (safe alternative orders, like L3/L4) or a design leak (e.g., an unintended
  short-circuit). Do not mark a multi-solution level unique to paper over it —
  validation will fail loudly.

## 16. Testing dead ends

- Levels with `allowDeadEnds: true` must expose **at least one reachable stuck
  state** (`src/game/stuck.test.ts` searches the whole state space).
- Levels with `allowDeadEnds: false` must **never** strand.
- For each trap level, know the *minimum* and *typical* path into the trap
  (`earliestDoomDepth`, `maxConsequenceDepth`), and confirm **one Undo frees
  the needle** on the intended wrong route — the trap must not bury the player.

## 17. Testing accessibility

- Visual guidance may fade, but **screen-reader access to valid moves must
  never be removed**. The board's accessibility labels always expose legal
  stitches regardless of `guidance`.
- Never use color alone: front/back thread deeps are distinguishable by more
  than hue (theme tests assert this).
- Text scales: UI text must survive `maxFontSizeMultiplier` (layout tests
  cover the board at large text sizes).
- Difficulty never comes from shrinking holes, lowering contrast, or hiding
  needed information.

## 18. Writing hints

Hints are staged and opt-in (see `src/game/hints.ts` and `stagedHint`):

1. **Concept** — teaches the reasoning principle, reveals no holes.
2. **Region** — points at the relevant branch; softly marks the legal targets.
3. **Exact** — names the single next hole that keeps a full solution open
   (always derived from the solver, so it can never go stale).

Authoring rules:

- Stage 1 must never name a hole, and must describe *why*, not *what*:
  - Bad: "Choose hole C."
  - Good: "Closing the smaller return first keeps the far branch reachable."
- Stage 2 should say where to look, not what to do: "From the hub, the open
  wings are the holes with a line back to the center."
- Stage 3 is generated from the solver; authors don't write it.
- On a stranded thread, all stages point at **Undo**, never at a hole (the
  engine handles this automatically; the hint tests pin it).
- After any level edit, re-run the hint tests — stage 3 must always name a
  legal hole and stage 1 must never leak it.

---

## 19. Checklist before a level ships

- [ ] `validateLevel` passes (structure, solution, counts, uniqueness).
- [ ] `measureLevel` metrics match the authored tier label.
- [ ] The curve still rises (no level easier than its predecessor).
- [ ] Tutorials (1–2): full guidance, no trap, ≥ 1 safe choice.
- [ ] Trap levels: `canTrap === allowDeadEnds`, safe alternative exists,
      one-Undo recovery on the intended wrong route.
- [ ] Guidance only tightened since the previous level.
- [ ] Hints: concept reveals no hole; exact hole is always legal; stranded
      threads point to Undo.
- [ ] Played in the real UI: intended solve, an alternative route, a wrong
      route into the trap, Undo, Restart, Preview, completion, replay.
- [ ] Screen-reader and large-text passes.
