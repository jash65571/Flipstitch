# Collection 02 Design — Knot & Bramble

Prompt 8's content-proof collection. This document was drafted before the ten
levels were finalized and updated as each was authored and measured; every
number below comes from `npm run analyze:levels`, not estimation.

## Why "Knot & Bramble"

Day & Night's motif is celestial (sunrise rays, moonlit returns) — a single
day's arc. Collection 02 needed a distinct visual and conceptual identity
that still belongs to the Living Sampler world: warm paper, cloth, wooden
hoops, brass, stitched thread.

**Knotwork and embroidered bramble/vine motifs** fit the new curriculum
better than any other researched option (see `docs/RESEARCH-MILESTONE-8.md`
for the comparison):

- Celtic-style interlace knotwork is a real, centuries-old sampler tradition
  — it belongs in this world without inventing a new visual language.
- A knot's structure *is* nested obligation: a strand loops through itself,
  and the inner loop must close before the outer one can be pulled tight.
  The metaphor is not decorative — it is the mechanic.
- Bramble and thorn motifs (climbing, tangled vines with occasional thorned
  offshoots that "run" away from the main vine and never rejoin it) map
  directly onto interacting runners and converging openings: several safe
  paths into the thicket, only one true way through.
- Root systems (used for the nested-obligation chapter) are a natural,
  legible "things nest inside other things, front growth above and hidden
  structure below" image that pairs with the front/back rule without adding
  a new mechanic.

Accent token: **brass** (`palette.brass` / `palette.brassDeep`), distinct
from Day & Night's gold. Motif line: *"Root cords on the front, thorned
brambles on the back."*

## Curriculum

New concepts (Tier 2, `src/content/types.ts` `ConceptId`):

| Concept | Chapter | What it teaches |
|---|---|---|
| `nested-obligation` | 1 | A return can nest inside another return; order, not just presence, matters. |
| `asymmetric-hub` | 1 | The same hole is a wide junction from one side and a bottleneck from the other. |
| `converging-openings` | 2 | Several genuinely safe openings can still funnel into one narrow, unforgiving middle. |
| `interacting-runners` | 2 | Two runners from one hub can't both go last — symmetry is not identity. |

`long-distance-dependency` was deliberately **not used** — the curriculum
document flags it as the sharpest, easiest-to-misuse tool in the Tier 2 set,
reserved for a collection that has already earned it. `false-symmetry`,
`two-stage-return`, and `irreversible-looking-route` were considered and
dropped: none were needed to teach the four concepts above cleanly, and
forcing them in would have been complexity for its own sake.

## Chapters

### Chapter 1 — Tangled Root (`role: tutorial`, `resetsDifficulty: true`)

*"A return that nests inside another return, and a hub that wears two
faces."* Opens well below Master Sampler's 80 (Root Knot measures 23) —
this is a fresh learning arc, not a continuation of Day & Night's difficulty.

### Chapter 2 — Bramble Snare (`role: mastery`, `resetsDifficulty: false`)

*"Safe openings that narrow fast, and two thorns that cannot both go last."*
Continues Chapter 1's arc rather than resetting; its opener (Bramble Fork,
31) is deliberately gentler than Chapter 1's capstone (Old Growth, 66)
because it introduces a second brand-new concept — see the `pacingNote` on
its first entry.

## The ten levels (Milestone 8.1 revision)

> **This section was rewritten in Milestone 8.1.** The version of this table
> shipped in Milestone 8 described seven of these ten levels as reusing
> Collection 01 graphs "with a fresh layout and framing." On inspection that
> was not framing — it was the same graph under renamed holes, which
> `src/content/topology.ts` (built in 8.1) confirms is an exact structural
> duplicate, not a new puzzle. All seven were redesigned. See
> `docs/MILESTONE-8-1-QA.md` for the full before/after audit, and the
> "Corrected in Milestone 8.1" note below each entry that changed.

| # | Title | Chapter | Role | Concepts | Score | Tier | Solutions | Trap-capable | Max consequence depth |
|---|---|---|---|---|---|---|---|---|---|
| 11 | Root Knot | Tangled Root | teach | nested-obligation | 23 | Easy | 4 | no | 0 |
| 12 | Twin Roots | Tangled Root | practice | nested-obligation, ordering-discipline | 30 | Easy | 6 | no | 0 |
| 13 | Bark Hollow | Tangled Root | twist | asymmetric-hub, dangerous-fork | 55 | Tricky | 2 | yes | 2 |
| 14 | Deep Taproot | Tangled Root | combine | asymmetric-hub, nested-obligation, ordering-discipline, hub | 42 | Moderate | 4 | yes | 2 |
| 15 | Old Growth | Tangled Root | capstone | nested-obligation, asymmetric-hub, ordering-discipline | 66 | Tricky | 1 (unique) | yes | 5 |
| 16 | Bramble Fork | Bramble Snare | teach | converging-openings | 42 | Moderate | 24 | no | 0 |
| 17 | Thicket Path | Bramble Snare | practice | converging-openings, shared-hole | 57 | Tricky | 2 | yes | 3 |
| 18 | Twin Thorns | Bramble Snare | pressure | interacting-runners, runner | 69 | Tricky | 12 | yes | 2 |
| 19 | Snared Vine | Bramble Snare | combine | interacting-runners, converging-openings | 45 | Moderate | 4 | yes | 3 |
| 20 | Knot's End | Bramble Snare | capstone | interacting-runners, converging-openings, multi-region, linked-return | 84 | Expert | 2 | yes | 8 |

Highest measured consequence depth in the collection: **8** (Knot's End, the
collection capstone — it now legitimately exceeds Master Sampler's own
score of 80, see below). Seven of ten levels are trap-capable; the three
that are not (Root Knot, Twin Roots, Bramble Fork) are the two `teach`
entries plus Chapter 2's own opener, kept safe on purpose per the
curriculum's "danger follows safety" rule.

## Why every level exists

- **Root Knot** — the safest possible exposure to a nested return: a short,
  fully forced dive-and-surface through one intermediate hole, paired with
  an ordinary safe return-loop wing so the level still offers a real (but
  risk-free) choice. No dead end is reachable; `allowDeadEnds: false`.
- **Twin Roots** — the same nested shape at slightly greater depth (one more
  intermediate hole), plus a second safe wing, so the player sees the shape
  repeat before it is ever punished.
- **Bark Hollow** *(corrected in Milestone 8.1 — was an exact clone of
  Forked Needle)* — a hub with three spokes, two of which return to the hub
  and one of which (`c-d`) leads only forward to a dead end. The trap is
  genuinely readable: the hub offers three choices, but only one of them
  costs you the other two if taken early.
- **Deep Taproot** *(corrected — was an exact clone of Orbit Bloom, and also
  isomorphic to the shipped Twin Thorns)* — a hub with a safe wing, a nested
  dive-and-surface pair, and a runner. Combines nested-obligation and a
  trap-capable hub in one graph distinct from Bark Hollow's.
- **Old Growth (capstone)** — unchanged: a nested loop feeding directly into
  a hub whose near lane and far lane look identical until you have
  committed. The chapter's hardest level (66), closing the first learning
  arc.
- **Bramble Fork** *(corrected — was an exact clone of Butterfly Turn)* —
  now four genuinely safe openings (not three) from one hub, all funneling
  back through that same hub. Still deliberately trap-free.
- **Thicket Path** *(corrected — was an exact clone of Laced Window, and the
  shipped Snared Vine was in turn an exact clone of this)* — two safe wings
  off a hub, and a third path that runs three holes deep into the thicket
  before dead-ending — a longer, more deliberate "point of no return" than
  the single-hop runners elsewhere in the collection.
- **Twin Thorns** *(corrected — was isomorphic to Orbit Bloom/Deep Taproot's
  old graph)* — two safe wings plus a matched pair: a two-hop loop that
  *looks* like a runner but safely returns, and a genuine one-hop runner
  that doesn't. The twin symmetry between the loop and the runner is the
  lesson, not just the flavor text.
- **Snared Vine** *(corrected — was an exact clone of the shipped Thicket
  Path)* — combines a safe wing, the twin loop-vs-runner idea from Twin
  Thorns, and a longer three-hop runner, so the player must recognize both
  prior ideas operating in one hoop, on a graph distinct from both of them.
- **Knot's End (capstone)** *(corrected — was an exact clone of Master
  Sampler)* — four clusters (a nested dive, an asymmetric multi-wing hub, a
  converging-opening cluster, and a runner cluster) joined by bridges, on a
  16-hole graph one wing larger than Master Sampler's 15-hole chain and
  structurally distinct from it. It measures 84 — four points *above*
  Master Sampler's 80. Milestone 8's design note framed matching Master
  Sampler's exact score as "proof the architecture supports a second
  collection reaching the same peak" — that framing depended on literally
  cloning the graph, which is the bug this milestone fixed. A later
  collection's capstone legitimately scoring higher than an earlier one's is
  expected content growth, not a broken invariant (see the updated test in
  `src/game/difficulty.test.ts`).

Two pairs in the corrected collection are flagged by the topology
detector as `near` (advisory, not exact/mirrored — reviewed, not silenced):
`deep-taproot-14` / `thicket-path-17` and `orbit-bloom-07` / `snared-vine-19`
share a similar degree signature (both are small hub-plus-branch graphs of
the same size) without being isomorphic. This is the expected shape of the
`near` category: coincidental structural resemblance between genuinely
different puzzles, not a hidden duplicate.

## Fair traps

Every trap in this collection is the same shape as Collection 01's: a legal
stitch that is understandable *in hindsight*. "I took the hub's near lane
before finishing the nested loop behind it" or "I ran the thorn before
closing the two safe loops" are both readable failures — the player can
retrace the exact decision that cost them. No level has a "secretly wrong"
hole; `npm test` enforces `TRAP_INTENT_MISMATCH` (a level's `allowDeadEnds`
must match what the solver actually finds) for all twenty shipped levels.

## Hint philosophy

Stage 1 clues name the *idea* ("the inner ring must fully close before the
trunk continues") without naming a hole. Stage 2 narrows to a region ("the
nested ring nearest the start still owes its return"). Stage 3 is
solver-backed and points at the exact next legal hole that keeps a complete
solution reachable — verified for every level by
`hint targets stay legal everywhere` in `src/game/difficulty.test.ts`.

## Known design tradeoff: Chapter 1 skews back-side

`npm run analyze:levels` reports one pacing warning: `ONE_SIDED_CHAPTER` on
Tangled Root (12% of the chapter's decisions land on the front). This was
investigated, not silenced. Every Tangled Root level places its decision hub
at the *front-entry* point, so the actual branch choice always falls on the
back side by construction (the flip happens before the choice). It is judged
an honest property of teaching nested-obligation and asymmetric-hub through
a shared-hub shape, not a bug. Chapter 2's converging-openings and
interacting-runners levels balance the collection's overall side split back
out. See `docs/MILESTONE-8-QA.md` and the reviewed-warning entry in
`src/content/pacing.test.ts`.
