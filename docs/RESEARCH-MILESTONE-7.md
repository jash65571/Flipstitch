# Research — Milestone 7 (Content architecture, progression pacing, authoring scale)

Every source below was actually fetched and read during this milestone. Where a
source did **not** support something I was looking for, that is recorded too —
an absence is a finding. Nothing here is invented, and no citation stands in for
a page I could not open.

Two sources I attempted and could not read are listed at the bottom with the
reason, rather than being quietly cited.

---

## 1. The Level Design Book — "Pacing"

- **Source:** <https://book.leveldesignbook.com/process/preproduction/pacing>
- **What was studied:** the vocabulary for structuring intensity over time in a
  level or campaign.
- **Findings:**
  - "Teach, test, twist" is described as "a common 3-beat pattern in level
    design": **teach** "teach the player about a game activity"; **test** "test
    whether the player can repeat and recognize the activity, with prompting";
    **twist** "twist the frame of the activity; with less prompting, can the
    player recall it?"
  - Pacing borrows musical structure: **pulse** ("establish a regular recurring
    pattern of beats"), **accent/stress** ("emphasize or intensify certain
    beats"), and **rest** ("incorporate periods of weaker beats or silence,
    sensitize audience to accents again").
  - On breathers: "Players adjust to prolonged periods of high intensity… To
    keep it fresh, use occasional downtime as a contrast and palette cleanser,
    otherwise the player will simply go numb."
  - On openings: "Begin your game or level with something low intensity."
- **What FlipStitch adopts:** the beat vocabulary directly. `PacingRole` in
  `src/content/types.ts` is teach/test/twist widened to six roles —
  `teach`, `practice` (their "test"), `twist`, `pressure`, `combine`,
  `capstone`. The "rest" idea is why a difficulty *drop* is legal at all in the
  new model, and the "low intensity opening" idea is the
  `TUTORIAL_OPENER_MAX = 25` invariant.
- **What FlipStitch avoids:** treating the three beats as a rigid repeating
  cycle. A ten-level chapter is not three beats, and forcing the literal
  teach/test/twist triple would produce filler — which the next source warns
  against explicitly.
- **Code/product decision affected:** `PacingRole`, `MAX_UNEXPLAINED_DROP`,
  `TUTORIAL_OPENER_MAX`, and the `CHAPTER_TRENDS_DOWN` warning, all in
  `src/content/pacing.ts`.

---

## 2. Game Developer — "Designing the mind-bending puzzles in Patrick's Parabox"

- **Source:** <https://www.gamedeveloper.com/design/patrick-s-parabox->
  (John Harris, 18 January 2023)
- **What was studied:** how a 350-puzzle handcrafted game orders its content and
  keeps it free of padding.
- **Findings:**
  - Traynor: "every puzzle serves to communicate or reinforce some new concept,
    there is no filler!"
  - On difficulty: "make the easiest possible version of a puzzle, that still
    features the interesting idea and still showcases it with a lot of impact."
    He accepts that players sometimes stumble onto a solution without full
    comprehension, provided later puzzles reinforce it.
  - On culling: he was "pretty ruthless when it came to iterating on puzzles" —
    "big batches of puzzles were added; but at other times, big batches were
    removed", citing "Perfection is achieved… when there is nothing left to take
    away."
- **What FlipStitch adopts:** "no filler" is made *machine-checkable*. Two
  pacing rules come straight from it: `AUTOPLAY_LEVEL` (every shipped level must
  offer at least one real decision on a solution path) is a hard invariant, and
  `LATE_FORCED_FILLER` (a heavily forced, danger-free, one-decision level
  appearing late in a chapter) is a design warning. The "reinforce later" idea
  became `TAUGHT_CONCEPT_NEVER_REUSED`: a concept introduced by a `teach` level
  and never exercised again is flagged.
- **What FlipStitch avoids:** Traynor's target of *approachable* difficulty
  throughout ("showcase, not stump") is right for a recursion showcase and only
  partly right here. FlipStitch keeps genuine Expert puzzles; it borrows the
  *easiest-honest-version* principle for `teach` levels specifically, not for
  the whole game.
- **Code/product decision affected:** `AUTOPLAY_LEVEL`, `LATE_FORCED_FILLER`,
  `TAUGHT_CONCEPT_NEVER_REUSED` in `src/content/pacing.ts`; the "no new
  production levels this milestone" constraint held rather than padding the
  catalog to look larger.

---

## 3. Wikipedia — *The Witness* (2016), gameplay and development sections

- **Source:** <https://en.wikipedia.org/wiki/The_Witness_(2016_video_game)>
- **What was studied:** how puzzle sets are regionalised and how difficulty
  escalates inside a region without a tutorial.
- **Findings (as stated there, with the article's own sourcing):**
  - "The rules are taught to the player throughout the course of the game by the
    puzzles themselves, as such, there is no text or dialogue directly
    explaining a puzzle's rules."
  - Blow's stated concern that explaining a new idea immediately "kills epiphany
    and related things like the joy of discovery."
  - Regions are thematically coherent: "the puzzles within each region are
    similar to one another (e.g. their solutions may all involve symmetry)", and
    "the game map was divided into sections so that the information the player
    needed to understand the puzzles in that section would be segregated to one
    general location."
  - Within a region, "the complexity of the puzzles increases as the player works
    towards unlocking the region's yellow box (the size of the grids may
    increase, the region's rules may be refined, or new rules may be created)."
  - On being stuck: Blow "recognized a common issue among most adventure games
    was punishing the player for being stuck, so he created the island as an
    open world, allowing players to abandon puzzles they were stuck on."
- **What FlipStitch adopts:** the region model is the chapter model. A chapter
  is a thematically coherent set whose complexity rises toward a capstone — which
  is exactly the `CAPSTONE_NOT_HARDEST` invariant, and why chapters are the unit
  of pacing validation rather than the whole game. The one-location-per-idea rule
  became the `teaches: ConceptId[]` field, so a chapter's concept footprint is
  inspectable data rather than an author's intention.
- **What FlipStitch avoids:** the open world. FlipStitch is a linear mobile
  sampler and unlocking stays linear; a player stuck on a hoop is served by
  unlimited Undo, staged hints, and the trapped-thread recovery card, not by
  wandering to a different island. Adding a level-skip is a retention decision,
  and Prompt 7 explicitly defers retention systems.
- **Code/product decision affected:** `ChapterRole`, `capstoneLevelId`,
  `CAPSTONE_NOT_HARDEST`; chapter-scoped rather than catalog-scoped validation in
  `validateChapterPacing`.

---

## 4. Apple Developer — "Behind the Design: Railbound" (Afterburn)

- **Source:** <https://developer.apple.com/news/?id=0x08hncy>
- **What was studied:** mechanic introduction pacing in a cosy mobile puzzle
  game with a comparable audience to FlipStitch.
- **Findings:**
  - On withholding a mechanic until it is needed: "You're not even taught how to
    delete tiles until several levels in, because you don't need to yet. It's all
    a dance of introducing and reinforcing concepts at the right pace."
  - Level 1 has "only one way to place track", making failure impossible.
  - On constraint: "In games like *Stephen's Sausage Roll* or *A Monster's
    Expedition*, the size of the level is exactly what you need to solve it… I
    try to constrain our puzzles and space as much as I can, and leave only the
    stuff you need."
  - On onboarding text, from their earlier game: "Every single person I handed a
    phone to tapped right past the blocks of onboarding text. It was kind of a
    shock."
- **What FlipStitch adopts:** confirmation of two existing decisions and one new
  one. Existing: no onboarding text wall, and the guidance ladder
  (full → reduced → minimal) rather than instructions. New: the
  `TUTORIAL_TEACH_TRAPS` invariant — a `teach` level in a tutorial chapter may
  never be able to strand the thread, which is the FlipStitch equivalent of
  "impossible to fail" at level 1.
- **What FlipStitch avoids:** an *unfailable* level 1. Railbound's first level
  has one legal move; Prompt 6 deliberately gave FlipStitch's first level a real
  (but always safe) choice, so the tutorial is not autoplay. The two goals are
  reconciled as: level 1 may not *trap*, but it must still *decide*.
- **Code/product decision affected:** `TUTORIAL_TEACH_TRAPS` invariant; the
  existing `AUTOPLAY_LEVEL` invariant kept as the counterweight.

---

## 5. Game Developer — "Puzzmo co-creator Zach Gage on building newspaper games that can last forever"

- **Source:** <https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever>
  (Chris Kerr, 9 November 2023)
- **What was studied:** daily-puzzle pacing, and whether the widely repeated
  "difficulty rises across the week, hardest on Sunday" structure is
  attributable to Gage directly.
- **Findings:**
  - Gage on teaching: "I'm interested in getting people to have strong critical
    thought capabilities, to be good problem solvers."
  - On sandbox framing: "Every game I design is meant to be a sandbox. At the
    lowest level, someone coming in should just feel comfortable playing around."
  - On session shape: "These aren't games designed to be played for hours on your
    couch. If a game is fun for 10 hours, it'll be good enough."
  - **Negative finding:** this article contains **no** claim about difficulty
    escalating across the week. A search summary attributed a Good Sudoku
    "harder through the week, hardest Sunday" structure to Gage, and I could not
    open a primary source confirming it (see *Unverified*, below). It is
    therefore **not** used as a basis for any decision in this milestone.
- **What FlipStitch adopts:** nothing structural. The one thing carried forward
  is the framing that long-term value comes from many short sessions, which
  reinforces the existing decision to keep hoops short and Undo free.
- **What FlipStitch avoids:** a weekly difficulty rhythm, and daily puzzles
  generally. Prompt 7 defers all retention systems, and I will not build a
  pacing rule on an attribution I could not verify.
- **Code/product decision affected:** none. Recorded so the absence is visible.

---

## 6. The Indie Game Website — Arvi Teikari (Baba Is You) interview

- **Source:** <https://www.indiegamewebsite.com/2019/07/19/baba-is-you-developer-arvi-teikari-talks-indie-innovation-influences-and-puzzle-design/>
  (19 July 2019, author not credited)
- **What was studied:** how a rule-manipulation puzzle game keeps hundreds of
  levels honest.
- **Findings:**
  - On generating levels: "I usually consider the words I have (or word ideas in
    my head) and think of interactions between them until I run into something
    that seems like it might be 'cool'."
  - On fairness: "I decided to try to avoid red herrings and the like just for
    their own sake; they make the levels needlessly more difficult."
  - **Negative finding:** this interview does **not** contain concrete claims
    about teaching progression, difficulty curves, non-linearity, or level
    skipping. A search summary suggested it did; reading it showed otherwise.
- **What FlipStitch adopts:** the anti-red-herring rule, as a reinforcement of an
  existing FlipStitch principle: difficulty comes from real structure, never from
  hiding information or from fake choices. This is already documented in
  `docs/LEVEL-DESIGN-GUIDE.md` §7 ("Avoiding fake choices"); nothing new was
  needed.
- **What FlipStitch avoids:** interaction-first authoring as the *primary*
  method. Baba's depth comes from many interacting rules; FlipStitch has exactly
  one rule and gets depth from graph structure instead — which is what
  `docs/PUZZLE-CURRICULUM.md` had to be written to map.
- **Code/product decision affected:** none directly; confirmed an existing rule
  rather than adding one.

---

## Unverified — attempted and not read

Listed so that nothing here is mistaken for a source I actually used.

- **GDC 2024, "System-Centric Puzzle Design in *Patrick's Parabox*"** (Patrick
  Traynor). The session listing exists at
  <https://gdcvault.com/play/1034415/System-Centric-Puzzle-Design-in> and the
  slide deck at
  <https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Traynor_Patrick_SystemCentricPuzzle.pdf>.
  The PDF is a deck of rasterised slide images with no extractable text, so I
  could not read its content. **No claim in this milestone is sourced from it.**
  Where Traynor is quoted above, the quote comes from source 2, which I did read.
- **"Let's Study The Witness"** (intermittentmechanism.blog, 18 August 2017)
  returned HTTP 403. Witness material above comes from source 3 instead.
- **Six Colors on Knotwords** returned HTTP 403, which is why the weekly
  difficulty claim in source 5 remains unverified and unused.

---

## Summary of what this research changed in the repository

| Research finding | Where it landed |
|---|---|
| Teach / test / twist beats; rest beats are legitimate | `PacingRole`, and difficulty drops made legal (`MAX_UNEXPLAINED_DROP`) |
| Low-intensity openings | `TUTORIAL_OPENER_MAX` invariant |
| "There is no filler" | `AUTOPLAY_LEVEL` invariant, `LATE_FORCED_FILLER` warning |
| Concepts must be reinforced later | `TAUGHT_CONCEPT_NEVER_REUSED` warning, `teaches: ConceptId[]` |
| Region-coherent sets that escalate to a gate | Chapter model, `CAPSTONE_NOT_HARDEST` invariant |
| Early levels are impossible to fail | `TUTORIAL_TEACH_TRAPS` invariant |
| No red herrings; difficulty from structure | Confirmed existing guide rules; no change |
| Weekly difficulty rhythms, daily puzzles | Deliberately not adopted; unverified and out of scope |
