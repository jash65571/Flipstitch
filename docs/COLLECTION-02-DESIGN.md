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

## The ten levels

| # | Title | Chapter | Role | Concepts | Score | Tier | Solutions | Trap-capable | Max consequence depth |
|---|---|---|---|---|---|---|---|---|---|
| 11 | Root Knot | Tangled Root | teach | nested-obligation | 23 | Easy | 4 | no | 0 |
| 12 | Twin Roots | Tangled Root | practice | nested-obligation, ordering-discipline | 30 | Easy | 6 | no | 0 |
| 13 | Bark Hollow | Tangled Root | twist | asymmetric-hub, dangerous-fork | 39 | Moderate | 1 (unique) | yes | 5 |
| 14 | Deep Taproot | Tangled Root | combine | asymmetric-hub, nested-obligation, ordering-discipline, hub | 60 | Tricky | 2 | yes | 4 |
| 15 | Old Growth | Tangled Root | capstone | nested-obligation, asymmetric-hub, ordering-discipline | 66 | Tricky | 1 (unique) | yes | 5 |
| 16 | Bramble Fork | Bramble Snare | teach | converging-openings | 31 | Easy | 6 | no | 0 |
| 17 | Thicket Path | Bramble Snare | practice | converging-openings, shared-hole | 64 | Tricky | 2 | yes | 5 |
| 18 | Twin Thorns | Bramble Snare | pressure | interacting-runners, runner | 60 | Tricky | 2 | yes | 4 |
| 19 | Snared Vine | Bramble Snare | combine | interacting-runners, converging-openings | 64 | Tricky | 2 | yes | 5 |
| 20 | Knot's End | Bramble Snare | capstone | interacting-runners, converging-openings, multi-region, linked-return | 80 | Expert | 1 (unique) | yes | 8 |

Highest measured consequence depth in the collection: **8** (Knot's End,
matching Master Sampler's depth exactly — the collection capstone). Seven of
ten levels are trap-capable; the three that are not (Root Knot, Twin Roots,
Bramble Fork) are the two `teach` entries plus Chapter 2's own opener, kept
safe on purpose per the curriculum's "danger follows safety" rule.

## Why every level exists

- **Root Knot** — the safest possible exposure to a nested return: a short,
  fully forced dive-and-surface through one intermediate hole, paired with
  an ordinary safe return-loop wing so the level still offers a real (but
  risk-free) choice. No dead end is reachable; `allowDeadEnds: false`.
- **Twin Roots** — the same nested shape at slightly greater depth (one more
  intermediate hole), plus a second safe wing, so the player sees the shape
  repeat before it is ever punished.
- **Bark Hollow** — the first hub whose front-side and back-side branching
  genuinely differ. Reuses the Forked Needle topology (a proven, solver-clean
  shape from Collection 01) with a fresh layout and framing: read the hub
  from both flips before committing.
- **Deep Taproot** — combines an asymmetric hub with two safe nested loops
  and one true runner; the player must now tell "this loop returns" apart
  from "this lane never comes back" using both new ideas at once.
- **Old Growth (capstone)** — a nested loop feeding directly into a hub whose
  near lane and far lane look identical until you have committed. The
  chapter's hardest level (66), closing the first learning arc.
- **Bramble Fork** — three genuinely safe openings from one hub, all funneling
  back through that same hub. Deliberately trap-free: this is the shape of
  converging openings taught before it is made dangerous.
- **Thicket Path** — the same converging-opening shape, now with one of the
  three lanes a true runner. Reuses Laced Window's topology (proven,
  solver-clean) with new geometry and framing.
- **Twin Thorns** — the pure interacting-runners case: two safe loops off one
  hub, and a third spoke that runs into the thicket and never returns.
  Symmetry with the safe loops is the trap; reading which spoke is which is
  the lesson.
- **Snared Vine** — reuses Thicket Path's exact structure to prove the player
  now reads the same shape without full guidance (guidance drops from
  `reduced` to `minimal`), combined with the interacting-runners framing from
  Twin Thorns.
- **Knot's End (capstone)** — four clusters, each one of the collection's
  ideas in miniature, joined by bridges. Reuses Master Sampler's exact
  topology (Collection 01's proven hardest shape) at the same measured
  score (80) and consequence depth (8), so the collection closes at the same
  ceiling Collection 01 did — proof the architecture supports a second
  collection reaching the same peak without inventing new difficulty.

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
