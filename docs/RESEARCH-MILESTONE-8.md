# Research — Milestone 8 (Collection 02 & Multi-Collection UX)

Research backing Prompt 8's design decisions: the new collection's theme and
curriculum, campaign pacing after a first mastery chapter, collection-select
UX in premium puzzle games, and completion-gallery patterns. Findings are
recorded as source → finding → adopted/rejected → decision affected, per this
project's research convention (see `docs/RESEARCH-MILESTONE-6.md` and `-7`).

## Puzzle references

| Source | Finding | Adopted | Rejected | Decision affected |
|---|---|---|---|---|
| **The Witness** (Blow, Thekla, 2016) | Teaches every new symbol/rule in a small, safe, isolated garden before it is combined with anything else — the player never meets a new idea and a new danger in the same puzzle. | Yes. `nested-obligation` and `asymmetric-hub` are each introduced trap-free (Root Knot, Bark Hollow's twist framing) before Deep Taproot combines them with real danger. | The Witness also withholds explicit hint text almost entirely, trusting the environment. FlipStitch's staged-hint system is a deliberate product commitment from earlier milestones; not revisited here. | Chapter 1's teach/practice/twist/combine/capstone sequencing (Goal 5). |
| **Patrick's Parabox** (Baba, 2022) | Later worlds reuse a mechanic from an earlier world inside a *new* container (a box containing a box containing the player) rather than inventing a new symbol — depth comes from nesting the old idea, not adding vocabulary. | Yes, directly. `nested-obligation`'s design principle ("depth from nesting, not width" per `docs/PUZZLE-CURRICULUM.md`) is this exact move, applied to return-loops instead of boxes. | Parabox's recursive self-reference (a box containing itself) has no honest analogue in an edge-alternation graph and was not pursued. | Root Knot / Twin Roots / Old Growth's shared-hub nesting shape. |
| **Baba Is You** (Teikari, Hempuli, 2019) | Rules are physically visible as manipulable objects on the board — there is never a rule the player can't see. | Yes, as a fairness check, not a mechanic. Every new Tier 2 structure (asymmetric hub, converging opening) is fully drawn from the first frame; nothing is inferred from an unseen state. | Baba's core loop (rewriting rules by pushing word-blocks) is a second mechanic and is explicitly out of bounds for FlipStitch. | Reaffirms the product rule in Goal-setting: no hidden information (curriculum doc "what is explicitly out of bounds"). |
| **Railbound** (Afterburn, 2022) | Converging track pieces near the start that all look equally promising, narrowing to one workable route by the midgame — the *early* freedom is real, the *late* constraint is real, and the game never lies about either. | Yes. This is `converging-openings`'s exact shape and was the strongest single reference for that concept. Bramble Fork's three safe front-facing openings, all genuinely safe, all funneling through one hub, is modeled directly on this. | Railbound also uses discrete forward-motion timing (trains moving on rails); FlipStitch has no time pressure and none was added. | Bramble Fork / Thicket Path / Snared Vine design (Goal 6). |
| **Cosmic Express** (Draknek & Friends, 2018) | "Two passengers with different, incompatible ordering requirements sharing one track" is the game's signature late-game trap: symmetric-looking choices with one hidden asymmetry the player must deduce from context, never from an arbitrary rule. | Yes, this is `interacting-runners` almost verbatim — Twin Thorns' two loops-plus-runner is the same shape (two things that look equal, one has a constraint the other lacks). | Cosmic Express is a routing/placement game with discrete passenger types; no placement mechanic was introduced. | Twin Thorns / Snared Vine design (Goal 6). |
| **Bonfire Peaks** (Corncob, 2022) | Later levels reuse early rooms' geometry almost exactly, recontextualized — proof that a puzzle engine's *depth* budget is better spent on structure than on new content volume. | Yes, informed the decision to reuse proven topologies (Forked Needle → Bark Hollow, Laced Window → Thicket Path/Snared Vine, Master Sampler → Knot's End) with new geometry and framing rather than inventing ten unrelated graphs from scratch. | N/A | Level authoring approach (Goal 9: "prefer deeper consequences... avoid... huge boards with little thought"). |
| **A Good Snowman Is Hard To Build** (Tomorrow Corporation, 2015) | A short, gentle, almost entirely safe opening arc (rolling snowballs with no failure state) precedes any real difficulty — the "onboarding" is the first third of the whole game, not a single tutorial screen. | Yes. Chapter 1's `TUTORIAL_OPENER_MAX` ceiling (opener ≤ 25) plus two consecutive trap-free `teach`/`practice` levels before any danger mirrors this pacing choice. | N/A | Chapter 1 pacing wave (Goal 3). |
| **Linelight** / **Snakebird** | Both reviewed for graph/path readability at small scale; neither offered a pattern not already covered by the above. Recorded for completeness. | No specific adoption. | N/A | N/A |

**No mechanic was copied.** Every adoption above is a *principle* (pacing
shape, fairness rule, reuse-of-structure philosophy) translated into
FlipStitch's single alternating-thread rule — never a second interaction
type.

## Nested dependency puzzles

Puzzle games that use literal nesting (Parabox's boxes, Sokobond's molecule
bonds) universally introduce the shape *safely* before making it dangerous.
This directly informed Root Knot and Twin Roots being fully trap-free
(`allowDeadEnds: false`) — the first two Tangled Root levels demonstrate the
shape of a nested return with zero cost for exploring it, matching the
"danger follows safety" sequencing rule already established in
`docs/PUZZLE-CURRICULUM.md` for Collection 01.

## Fair asymmetric puzzles

The recurring failure mode researched (and avoided) across the reference
list: an asymmetry the player cannot perceive until told, then still cannot
verify by looking (Cosmic Express avoids this by making passenger colors and
destinations always visible; The Witness avoids it by never gating a puzzle
on off-screen state). Bark Hollow's asymmetric hub is fully drawn — both the
front-side and back-side edge counts at the hub are visible edges on the
board from the first frame, never inferred. This is the same fairness bar
Collection 01's `dangerous-fork` levels were held to.

## Visual readability of graph puzzles

Reused findings from Milestone 6/7 research (hole spacing, line-crossing
minimization, front-solid/back-dashed distinction) applied unchanged. No new
readability research was needed because Collection 02 introduces no new
visual grammar — see "why every level exists" in
`docs/COLLECTION-02-DESIGN.md` for the specific layout choices made per
level to keep the Tier 2 structures legible at 40mm hoop scale.

## Campaign pacing after a first mastery chapter

Researched pattern across the reference list (The Witness's per-area resets,
Snowman's slow open, Railbound's per-world escalation): a genuinely new
learning arc almost always **drops** measured difficulty at its open, even
following a hard capstone, because the player is about to be asked to think
in an unfamiliar way and needs slack to do it. This directly justified
Chapter 1 opening at 23 (versus Master Sampler's 80) and Chapter 2's
`pacingNote`-covered dip when its second new concept (`converging-openings`)
is introduced (31, versus Chapter 1's capstone at 66).

## Collection-select UX in premium puzzle games

Surveyed pattern in mobile/premium puzzle titles with multi-chapter content
(word- and grid-puzzle games with named "packs" or "books"): a single
top-level library screen showing each pack's title, a short thematic
descriptor, and a locked/unlocked/progress state, with the actual puzzle
list living one level deeper. This is the shape `CollectionLibraryScreen` →
`/collection/[id]` implements. The one consistent anti-pattern found across
surveyed titles — currency/star-gated unlocks with manipulative copy ("Only
3 stars away!") — was explicitly avoided; Collection 02's lock reason is a
single plain sentence ("Finish Day & Night to unfold this sampler.") with no
progress-bait framing.

## Completion-gallery patterns

Surveyed pattern: "sticker book" / "finished piece" galleries in craft and
puzzle apps almost always separate the *journey* view (where you are, what's
next) from the *finished-work* view (what you made), and the finished-work
view intentionally slows down — larger imagery, less UI chrome, per-item
detail — rather than reusing the dense list layout of the journey screen.
This shaped `GalleryScreen`'s one-row-per-finished-hoop layout (front and
back as two separate, larger artifacts) as distinct from
`LevelSelectScreen`'s compact per-stop rail.

## Embroidery and sampler references for Knot & Bramble's motif

- **Celtic interlace / knotwork embroidery**: strands that visually pass over
  and under each other, closing into loops — a real textile tradition that
  supplies both the collection's name and its core visual metaphor (a loop
  that must close before another can lock in place maps directly onto
  `nested-obligation`).
- **Crewelwork bramble and vine motifs**: 17th–18th century English
  crewelwork samplers commonly feature climbing bramble/thorn vines with
  short offshoot stitches that visually "run off" the main design — the
  direct visual ancestor of Chapter 2's runner concept.
- **Root/rhizome sampler borders**: used in the Chapter 1 naming ("Tangled
  Root", "Old Growth", "Deep Taproot") for their natural "nested, hidden
  structure beneath a visible surface" reading, without introducing any
  new rendering system beyond the existing code-native SVG hole/edge grammar.
