# Puzzle Curriculum

The reasoning FlipStitch can teach, and how far it goes without ever adding a
second mechanic.

## The constraint this document works inside

FlipStitch has exactly one rule:

> **One continuous thread completes two sides of one hoop. Every valid stitch
> forces play onto the opposite side.**

There is no second mechanic and there will not be one. No hidden rules, no
special holes, no modal states, no per-level exceptions. Everything below is a
*structure* built from holes and side-labelled edges — a property of the graph,
not a new law the player must be told.

The test for any entry here: **could a player who understands the one rule
work it out by looking?** If it needs an explanation, it is a new mechanic and
does not belong.

## Vocabulary

A level is an alternating-edge trail. The reachable state is
`(current hole, active side, used-edge set)`. Every concept below is a named
shape in that state space, and every one is measurable by
`src/game/analyzer.ts` — which is what keeps this a curriculum rather than a
wish list.

`ConceptId` values in `src/content/types.ts` are the machine-readable form; a
`ChapterEntry.teaches` array tags each level, and the pacing validator uses it
to check that lessons are paid off.

---

## Tier 1 — Foundations (shipped in Collection 01)

### `forced-flip`
The rule itself. Every stitch hands play to the other side, so a hole reachable
now may be unreachable next stitch.
**Measures as:** nothing special — it is the substrate.
**Shipped in:** levels 1-2 explicitly; every level implicitly. Exempt from the
lesson-payoff rule for that reason.

### `safe-branch`
Two or more legal stitches, all of which keep a complete solution open. The
player chooses and cannot be punished.
**Measures as:** `solutionDecisionStates ≥ 1` with `dangerousDecisions = 0`.
**Why it matters:** it makes a tutorial a decision instead of autoplay, without
risk. **Shipped in:** 1, 2, and the final cluster of 9.

### `return-loop`
An out-and-back: front edge out, back edge home. The flip does the returning.
**Measures as:** paired edges on a hole with degree ≥ 2, low branching.
**Shipped in:** 2, 3, 4.

### `shared-hole`
One hole carrying edges on both sides, so a stitch consumed on the front changes
what the back can do there later.
**Measures as:** `sharedHoles`, and rising `averageDegree`.
**Shipped in:** 3 (figure-8 centre), 8 (two laced shared holes).

### `hub`
A hole of degree ≥ 3: the junction where most decisions live.
**Measures as:** `hubCount`, and higher `maxBranching`.
**Shipped in:** 4, 7, 10.

### `dangerous-fork`
A decision where at least one legal stitch dooms the thread.
**Measures as:** `dangerousDecisions ≥ 1`.
**Fairness rule:** it must be understandable *after the fact* — the player has
to be able to see what they did. **Shipped in:** 5 (the first), 6.

### `runner`
An edge chain that leaves a region and never comes back. Taking it before the
region is closed strands everything behind it.
**Measures as:** `maxConsequenceDepth` well above 1.
**Shipped in:** 5, 7, 8.

### `delayed-trap`
The wrong stitch and the visible failure are several stitches apart, so the
lookahead has to happen *before* the mistake.
**Measures as:** `maxConsequenceDepth` (the exact lookahead required) versus
`earliestDoomDepth` (when doom first becomes possible).
**Shipped in:** 5 (depth 5), 9, 10 (depth 8).

### `linked-return`
A chain of returns where each must be closed before the next is entered.
**Measures as:** many `doomedStates` relative to `distinctDeadEnds`.
**Shipped in:** 6, 9, 10.

### `ordering-discipline`
The set of stitches is fixed; only the order is in question, and most orders
fail. **Measures as:** low `solutionCount` with high `decisionStates`.
**Shipped in:** 7, 8, 10.

### `multi-region`
Several loosely coupled clusters, each with its own obligations, joined by a few
bridges. **Measures as:** high `reachableStates` with moderate `avgBranching`.
**Shipped in:** 9, 10.

---

## Tier 2 — Collection 02 (Knot & Bramble)

`nested-obligation`, `asymmetric-hub`, `interacting-runners`, and
`converging-openings` are shipped in Collection 02. See
`docs/COLLECTION-02-DESIGN.md` for which levels teach and exercise each one.
The remaining Tier 2 entries below stay designed-but-unauthored; Prompt 8
deliberately does not use `long-distance-dependency` (see that entry) and
found `false-symmetry`, `two-stage-return`, `irreversible-looking-route`, and
the front-heavy-setup mirror were not needed to teach nested obligation,
asymmetric hubs, interacting runners, or converging openings cleanly — they
remain candidate material for a future collection rather than forced in here.

### `nested-obligation`
A return loop whose own return passes through a second loop that must itself be
closed first. Closing the outer loop is only legal once the inner one is done —
so the player must recognise a dependency *order*, not just a set.
**Structure:** hub A's back return runs through hub B; B's return runs through
C. **Measures as:** `maxConsequenceDepth` rising with a low `maxBranching` —
depth from nesting, not from width. **Fair because:** the nesting is drawn; the
lines are all visible from the first frame.
**Shipped in:** Root Knot, Twin Roots, Old Growth, Deep Taproot (Collection 02
Chapter 1) — see the design doc for level order.

### `asymmetric-hub`
A hub whose front and back degrees differ (say four front edges, two back). The
side you *arrive on* decides how many exits you have, so the same hole is a wide
junction on one flip and a bottleneck on the next.
**Measures as:** a large gap between front and back branching at one hole;
visible as a skewed `frontDecisionShare` for that region.
**Teaches:** that a hole's identity is side-dependent — the deepest consequence
of the core rule.
**Shipped in:** Bark Hollow, Old Growth, Deep Taproot (Collection 02 Chapter 1).

### `interacting-runners`
Two runners from the same hub. Each is safe *if* it is the last thing done in
its own region — but they cannot both be last. One of them has an ordering
constraint the other does not.
**Measures as:** `dangerousDecisions` high with `solutionCount` small.
**Fair because:** symmetry invites the player to treat them identically, and the
board shows why one differs.
**Shipped in:** Twin Thorns, Snared Vine, Knot's End (Collection 02 Chapter 2).

### `converging-openings`
Several genuinely safe opening moves that all funnel into one narrow middle
game. The opening is free; the middle is not.
**Measures as:** high `maxBranching` early, collapsing to a low
`avgBranching` at mid-depth. **Teaches:** that early freedom is not evidence of
a forgiving puzzle — the reverse of the habit levels 1-4 build.
**Shipped in:** Bramble Fork, Thicket Path, Snared Vine, Knot's End
(Collection 02 Chapter 2).

### `false-symmetry`
A pattern that *looks* mirror-symmetric but whose two halves differ by one edge
being on the opposite side. The mirror reading is wrong in one place only.
**Measures as:** high `decisionStates` with a much lower
`solutionDecisionStates` — many plausible choices, few surviving ones.
**Risk to manage:** this is close to a red herring, which
`docs/LEVEL-DESIGN-GUIDE.md` §7 forbids. It stays legitimate only while the
asymmetry is *drawn plainly* — a visibly dashed-vs-solid edge, not a hidden
one. If a playtester cannot see the difference after being told it exists, the
level is unfair and gets cut.

### `two-stage-return`
A return that cannot be completed in one out-and-back because its home edge is
consumed on the wrong side. The thread must leave, do something else, and come
back to finish. **Measures as:** long `maxConsequenceDepth` on a small hole
count. **Teaches:** that "I will come back for it" is a plan, not a hope.

### `long-distance-dependency`
The first stitch of a hoop determines whether a cluster twelve stitches away is
solvable — and nothing between them signals it.
**Measures as:** `earliestDoomDepth` very low (1-2) while the nearest actual
strand is far away. **Fairness rule:** this is the sharpest tool in the set and
the easiest to misuse. It belongs only in `capstone` levels, with `minimal`
guidance and after `ordering-discipline` is fluent, and the doomed opening must
be *visible* in hindsight — the region it strands has to be on screen.

### `irreversible-looking-route`
A route that reads as a commitment but is not, next to one that reads as
reversible and is not. Teaches the player to verify rather than to pattern-match
on shape. **Measures as:** `safeAlternativeCount` high at states that *look*
dangerous — the fixed metric from Prompt 7 makes this directly checkable.

### `front-heavy setup / back-side resolution` (and its mirror)
A hoop where nearly all the front edges are consumable early but the back edges
impose the real constraint — and its inverse.
**Measures as:** a deliberately skewed `frontDecisionShare`, at the level scale.
**Chapter-scale rule:** the `ONE_SIDED_CHAPTER` warning exists so this stays a
*level* device. A whole chapter that leans one way is a design smell; a single
level that does is a lesson.

---

## Sequencing rules

1. **One new concept per `teach` level.** Two at once means neither is learned.
2. **A concept must be practised before it is twisted.** The twist only lands if
   the habit exists. Enforced socially by the role order, and checked by
   `TAUGHT_CONCEPT_NEVER_REUSED`.
3. **Danger follows safety.** A concept is introduced safe (`safe-branch` shape)
   before a level makes it dangerous. Levels 3-4 teach shared holes and hubs
   with no risk; 7-8 punish exactly those structures.
4. **Combination levels reuse, never introduce.** A `combine` level may not carry
   a concept that has not already appeared.
5. **Depth before width.** Prefer raising `maxConsequenceDepth` over raising
   `totalStitches`. The difficulty score caps length at 10 points for this
   reason: a longer hoop is not a harder one.
6. **Both sides think.** Over a chapter, decisions should not sit 80% on one
   side (`ONE_SIDED_CHAPTER`).

## What is explicitly out of bounds

- New mechanics of any kind: special holes, locks, colours that mean something,
  limited undo, ordered targets, timers.
- Hidden information. Every edge, hole, and side is on screen from the first
  frame.
- Red herrings placed for their own sake.
- Procedural generation. Every hoop is authored and measured.
- Difficulty from precision, speed, or small touch targets.
- Difficulty from length alone.
