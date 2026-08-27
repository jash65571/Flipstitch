# FlipStitch product foundation

## Product promise

FlipStitch turns embroidery into a spatial logic puzzle. One continuous thread must complete two different patterns. Each placed stitch moves the needle to the other side.

The rule must be understood within five seconds: **every stitch forces you to play the other side.**

## Audience

The first audience is mobile puzzle players who want short, calm sessions. The tone is warm and tactile, not loud or toy-like. The game must work without reading, timers, lives, or exact dragging.

## First proof

We start with one polished level, not a large menu. It must prove five things:

1. Players always know which side is active.
2. The flip feels rewarding without slowing play.
3. A wrong choice is understood without a tutorial wall.
4. Undo and Peek remove fear from experimentation.
5. Completing both sides creates a strong reveal.

## Visual direction

The **Living Sampler** is the visual source of truth (see `docs/DESIGN-BIBLE.md`; the Prompt 5 overhaul made it current). In brief:

- Warm paper and dyed fabric grounds, a large wood hoop with brass fittings.
- Brick-vermilion thread on the front and deep-indigo thread on the back, distinguished by shape and written labels, never by hue alone.
- Fraunces for titles and the completion reveal; Atkinson Hyperlegible Next for controls, state, and instructions.
- Large touch targets around small visual holes; restrained brass/ochre and sage accents.
- Both font families are bundled for offline use under the SIL Open Font License.

The puzzle takes most of the screen. The only play controls are Undo, Peek, and Hint. Reduced motion replaces the flip with an instant side swap.

## Growth path

### Phase 1: mechanic proof

- One clear tutorial level.
- Nine harder handcrafted levels.
- Local progress only.
- Event logging for move, invalid move, undo, hint, restart, completion, and session exit.

### Phase 1.5: feel and playtest proof (complete)

- Original synthesized sound effects for every action, generated in-repo.
- One feedback controller that maps semantic events to sound and haptics and
  honors Sound Off and Haptics Off.
- A minimal Settings screen: sound, haptics, reduced-motion status, playtest
  data view/export/clear, progress reset, and about/license info.
- Local, bounded playtest events with session, sequence, timestamp, and
  monotonic elapsed time. No accounts, ads, network, or external analytics.
- A pure playtest report engine with small-sample warnings, exported from
  Settings.

### Phase 1.6: stabilization and Android device proof (complete)

- Attempt identity on every level event: restarts, replays, exits, and
  completions are distinct, reported per attempt, and honest about legacy
  Milestone 3 data.
- Hardened storage (full batch drains, background flush, safe clear), hardened
  audio (independent delayed timers, promise-safe playback), and WCAG-AA
  destructive confirmations.
- A repeatable internal Android APK build profile (`eas.json`) so the S25
  Ultra device pass can be run from any machine with an Expo account.

### Phase 1.7: design system (Prompt 5, complete)

- The Living Sampler visual language is the source of truth
  (`docs/DESIGN-BIBLE.md`): warm paper and cloth, a real hoop, a code-native
  icon set, Fraunces + Atkinson Hyperlegible Next, and a gallery that reads as a
  sampler book rather than a dashboard.

### Phase 1.8: puzzle-depth foundation (Prompt 6, complete)

- A pure analyzer measures every level's state space, and a transparent 0-100
  difficulty score turns grading into measurement.
- The ten levels were re-authored so each holds real decisions, fair traps, and
  delayed consequences. Difficulty regression tests protect the result.
- `docs/LEVEL-DESIGN-GUIDE.md` is the authoring reference.

### Phase 1.9: scalable content foundation (Prompt 7, complete)

- A real content hierarchy: **Catalog → Collection → Chapter → Level**, with
  loud registry validation and deterministic ordering
  (`docs/CONTENT-ARCHITECTURE.md`).
- Day & Night is now one collection of two chapters — *First Light* (1-5) and
  *After Dark* (6-10). No level id, geometry, solution, score, or saved
  progress changed.
- Difficulty became a **pacing system** rather than one endlessly rising line
  (`docs/PROGRESSION-PACING.md`): six progression roles, chapter-scoped
  invariants that fail the build, and advisory design warnings that do not.
- A long-term skill map (`docs/PUZZLE-CURRICULUM.md`) shows how hundreds of
  puzzles come from the one existing rule — no second mechanic.
- Authoring tools scale: solution counting is memoised over states and is exact
  or explicitly capped, never silently partial.

### Phase 2: content proof (content built and repaired; behavioral proof not yet measured)

- Grow the catalog **by chapter**, not to a fixed level count. The old
  "20-level Day & Night collection" target is retired: it was a prototype
  number, and the chapter model makes the unit of content a coherent teaching
  arc rather than a quota. A chapter ships when its concepts are taught,
  practised, twisted, and closed by a capstone — typically five to eight hoops.
- Collection 02 opens a new learning arc (`resetsDifficulty: true`) drawing on
  the Tier 2 concepts in `docs/PUZZLE-CURRICULUM.md`. **Built (Prompt 8) and
  repaired (Prompt 8.1: seven levels that were exact/near-exact topology
  clones were redesigned; Prompt 8.2: those repairs were played through the
  real UI and their geometry/hints/traps visually verified — see
  `docs/MILESTONE-8-2-QA.md`).**
- Completion gallery showing both sides. **Built (Prompt 7/8).**
- No daily puzzle yet; retention systems wait for content proof.
- **What "content proof" still means and is not yet true:** the two
  collections existing, passing automated validation, and playing correctly
  in manual/browser testing is necessary but not sufficient. The actual
  Phase 2 gate (see Measures, below) is behavioral: real testers completing
  Level 1 unaided, reaching Level 4, not exiting early. That data does not
  exist yet — `docs/MILESTONE-8-2-QA.md` records this explicitly as **"not
  measured yet"** rather than assuming content quality implies it. Phase 2
  does not close, and Phase 3 does not start, until a real tester sample
  exists and the Measures gates below are evaluated against it.

### Phase 3: retention proof

- Weekly collections.
- Forgiving streak with one missed day.
- Cosmetic thread and needle styles.
- Share card showing both completed patterns.

### Phase 4: business proof

- Soft launch in a small English-speaking market.
- Test retention before paid user growth.
- No forced ad during the first 20 levels.
- Later ads appear after several wins, never after failure.
- Offer an ad-free purchase and cosmetic packs.

## Measures

The prototype gate is behavioral, not opinion-based:

- At least 80% of testers complete the first level without spoken help.
- Median time to the first valid stitch stays under 10 seconds.
- Fewer than 20% exit during the first three levels.
- At least 60% choose to start level four.

Feel gates for the playtest milestone:

- Sound Off and Haptics Off each leave the game fully playable.
- Reduced motion keeps clear nonvisual feedback (sounds and haptics).
- Invalid moves feel distinct but never harsh.
- The playtest report shows honest small-sample warnings instead of
  pretending data exists.

These are early decision gates. Launch targets will be set after real test data exists.

## Content proof collection

The first collection is ten handcrafted Day & Night hoops. It grows one reasoning skill at a time:

1. First Thread and Kite Tail teach the flip from both starting sides — each with one safe, visible choice so the tutorial is never autoplay.
2. Twin Petals and Butterfly Turn show that some choices are equally safe, and introduce shared holes (figure-8 center, hub).
3. Forked Needle and Echo Stairs introduce branches that reward Undo and planning — the first genuine traps.
4. Orbit Bloom and Laced Window use shared holes, alternating loops, and runners that never return — genuinely trap-capable planning levels.
5. Moonlit Return and Master Sampler require closing short returns before moving onward, ending in a dense multi-loop capstone.

Since Prompt 7 those ten hoops are two chapters of one collection: *First Light* (1-5, tutorial, capstone Forked Needle) and *After Dark* (6-10, mastery, capstone Master Sampler). The measured curve is unchanged and still rises the whole way (see `docs/DIFFICULTY-MATRIX.md`) — but that is now a property of *this* collection, not a rule imposed on future content. Chapter pacing rules in `src/content/pacing.ts` govern what comes next. Difficulty comes from path planning. It never comes from timers, lives, hidden rules, or smaller touch targets. The collection gallery shows a mini hoop, a written difficulty, clear lock state, best completion, and one direct Continue action.

### Collection 02 — Knot & Bramble (Prompt 8)

The content-proof milestone: a second full collection, ten more handcrafted
hoops, proving the Collection → Chapter → Level architecture and the pacing
validator survive a real expansion rather than only describing the content
they were built alongside. *Tangled Root* (11-15, tutorial, capstone Old
Growth) teaches that a return can nest inside another return and that a hub
can offer different exits depending on which side you arrive from. *Bramble
Snare* (16-20, mastery, capstone Knot's End) turns those ideas into pressure
with converging openings and two runners that cannot both go last. See
`docs/COLLECTION-02-DESIGN.md` for the full level table and rationale, and
`docs/RESEARCH-MILESTONE-8.md` for the puzzle and UX research behind it.

The player-facing home screen is now a **collection library** — a folio per
collection, showing progress and (for a locked collection) a single plain
sentence explaining what unfolds it, never a currency- or star-gated tease.
Finishing a collection shows a crafted "sampler finished" state, distinct
from an ordinary level completion, with a path into a **finished-sampler
gallery**: every completed hoop's front and back shown as two separate,
larger artifacts (solid front, dashed back — the same non-color distinction
used throughout), replayable without disturbing best results or relocking
anything.

## Non-negotiable rules

- No limited lives.
- Unlimited undo.
- No pay-to-solve pressure.
- No copied level art or close competitor skin.
- UI and store research happens before each major feature set.
- Accessibility, battery use, device heat, and low-end Android performance are release checks.
- Every shipped level must be structurally new content, not a renamed
  reskin of an existing graph — enforced by `npm run analyze:levels`'
  topology duplicate check since Milestone 8.1 (`docs/COLLECTION-02-DESIGN.md`).
- A temporary inspection state (Peek) must never be visually or
  semantically confusable with a real, committed game-state change
  (`docs/PREVIEW-INTERACTION.md`).
