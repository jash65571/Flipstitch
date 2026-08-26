# Progression Pacing

How FlipStitch orders content over hundreds of levels, and what the build
enforces about it. Written in Prompt 7 to replace a rule that could not scale.

## What was wrong with "always harder"

Prompt 6 measured the first ten levels and locked in a strict rule:

```
every level must score higher than the previous level
15 → 22 → 28 → 31 → 39 → 54 → 60 → 64 → 77 → 80
```

That was the right rule for one ten-level learning arc, and it is the wrong rule
for the game. The score is capped at 100. Collection 01 alone consumes 80 points
of it. Under a global monotonic rule, collection 02 would have to start at 81
and the game would run out of headroom before its second chapter — with no room
left to *teach* anything, because a teaching level is by definition easier than
the puzzle that precedes it.

So the monotonic rule is retired as a law of the game. It survives only as a
regression pin on Collection 01's authored content
(`src/game/difficulty.test.ts`), clearly labelled as a property of that content
rather than a rule for future content.

## The replacement: two independent axes

| | describes | lives in | required to rise? |
|---|---|---|---|
| **Measured difficulty** (0-100) | the puzzle's graph | `src/game/analyzer.ts` | no |
| **Progression role** | the level's job where it sits | `ChapterEntry.role` | n/a |

A level's score is a fact about its state space: decisions, branching,
dangerous choices, consequence depth, length. It says nothing about where the
level belongs. A chapter arranges *roles*; the scores follow from the puzzles,
and the validator checks that the two tell the same story.

## The six roles

Adapted from the "teach, test, twist" beat pattern in
[The Level Design Book](https://book.leveldesignbook.com/process/preproduction/pacing),
widened because a ten-level chapter is not three beats.

| Role | Job | Typical shape |
|---|---|---|
| `teach` | Introduce **one** new idea in its easiest honest form | Low score, no trap, guidance on |
| `practice` | Reuse that idea with nothing new attached — a safe win | Slightly higher, still safe |
| `twist` | Reframe a learned idea so the habit it built is now wrong | First danger; score steps up |
| `pressure` | Same ideas, higher cost of a mistake | Deeper consequence, wider branching |
| `combine` | Require two or more previously separate ideas at once | High planning + high risk |
| `capstone` | Close the chapter; must be among its hardest | Chapter peak |

Roles are not a mandatory cycle. A chapter picks the beats it needs.

## Chapter roles and the reset flag

A `Chapter` also declares:

- `role`: `tutorial` (first contact — must open approachable), `development`
  (widen a known skill set), or `mastery` (combination and planning depth).
- `resetsDifficulty`: **true** when the chapter opens a fresh learning arc and is
  expected to start below the previous chapter's peak; **false** when it
  deliberately continues one arc across the seam.

That flag is what makes "difficulty may breathe" checkable instead of vague. A
chapter that claims a reset and does not reset fails the build. A chapter that
does *not* reset must say why, in the opening entry's `pacingNote`.

Day & Night uses `resetsDifficulty: false` on After Dark, with the reason
recorded on Echo Stairs: the collection is one continuous arc split into a light
half and a dark half, so the chapter boundary is a scene change, not a reset.

## Hard invariants — these fail the build

Objective, checkable, and non-negotiable. `src/content/pacing.ts`,
run by `src/content/pacing.test.ts` and by `npm run analyze:levels` in CI.

| Code | Rule |
|---|---|
| `MEASUREMENT_NOT_EXACT` | Pacing may not be judged from an estimate. If the analyzer did not measure a level exhaustively, that is a failure, not a caveat. |
| `AUTOPLAY_LEVEL` | Every shipped level must offer at least one real decision on a solution path, and must not be 100% forced. |
| `TIER_LABEL_MISMATCH` | The authored `difficulty` label must equal the measured tier. |
| `TRAP_INTENT_MISMATCH` | `allowDeadEnds` must equal whether the level can actually strand the thread. |
| `SOLUTION_COUNT_DRIFT` | The measured solution count must equal `expectedSolutionCount`. |
| `TUTORIAL_TEACH_TRAPS` | A `teach` level in a `tutorial` chapter may never strand a beginner. |
| `TUTORIAL_OPENER_TOO_HARD` | A `tutorial` chapter must open at or below **25**. |
| `CLAIMED_RESET_DID_NOT_RESET` | A chapter with `resetsDifficulty: true` must open below the previous chapter's peak. |
| `CONTINUATION_WITHOUT_REASON` | A chapter with `resetsDifficulty: false` must carry an authored `pacingNote` on its opener. |
| `GUIDANCE_STRENGTHENED` | Guidance may fade (`full → reduced → minimal`) but never strengthen — within a chapter or across a chapter seam. |
| `UNEXPLAINED_DIFFICULTY_DROP` | A fall of more than **8** points inside a chapter requires an authored `pacingNote`. |
| `CAPSTONE_NOT_HARDEST` | The declared capstone must be the chapter's peak score. |
| `CAPSTONE_ROLE_MISMATCH` / `CAPSTONE_MISSING` | The declared capstone must exist and carry the `capstone` role. |

Note what is *not* an invariant: "the score must rise". A drop of up to 8 points
is free, and any drop is legal with a written reason. That is the breathing room
the old rule did not have — the "rest beat" the pacing literature calls for.

## Design warnings — reported, never fatal

Subjective calls. A human should look; a build should not stop.

| Code | Suspicion |
|---|---|
| `CHAPTER_TRENDS_DOWN` | The chapter ends easier than it starts. |
| `NO_DANGER_IN_CHAPTER` | A non-tutorial chapter contains no dangerous decision anywhere. |
| `LATE_FORCED_FILLER` | Late in a chapter, a level is >90% forced with no danger and one decision. |
| `EXPERT_FOLLOWED_BY_FILLER` | An Expert puzzle is followed by a much easier one that is not a `teach` level. |
| `REPEATED_TRAP_SIGNATURE` | Three or more trap-capable levels in a chapter teach exactly the same concept set — the danger is repeating itself. |
| `ONE_SIDED_CHAPTER` | More than 80% (or fewer than 20%) of a chapter's decisions happen on one side. FlipStitch is a two-sided game. |
| `TAUGHT_CONCEPT_NEVER_REUSED` | A concept introduced by a `teach` level is never exercised again in its collection. A lesson with no payoff is filler. |

`forced-flip` is exempt from the last rule (`UNIVERSAL_CONCEPTS`): it is the core
rule itself, exercised by every legal stitch in the game, so "was it reused?" is
not a meaningful question for it.

**The separation is the point.** Objective facts gate the build; judgement calls
inform the author. `pacing.test.ts` additionally pins the *current* warning set
(today: empty), so a new warning surfaces as a test failure and gets a decision,
rather than scrolling past in CI output.

## Collection 01 under the new model

| # | Level | Chapter | Role | Score | Guidance |
|---|---|---|---|---|---|
| 1 | First Thread | First Light (`tutorial`) | teach | 15 | full |
| 2 | Kite Tail | First Light | teach | 22 | full |
| 3 | Twin Petals | First Light | practice | 28 | reduced |
| 4 | Butterfly Turn | First Light | practice | 31 | reduced |
| 5 | Forked Needle | First Light | **capstone** | 39 | reduced |
| 6 | Echo Stairs | After Dark (`mastery`) | twist | 54 | reduced |
| 7 | Orbit Bloom | After Dark | pressure | 60 | reduced |
| 8 | Laced Window | After Dark | pressure | 64 | minimal |
| 9 | Moonlit Return | After Dark | combine | 77 | minimal |
| 10 | Master Sampler | After Dark | **capstone** | 80 | minimal |

The scores are unchanged from Prompt 6 — the puzzles were not touched. What
changed is that the shape is now *described* (roles, chapters, capstones) and
*checked* (invariants) instead of being asserted by one monotonic loop.

## Guidance for the next collection

A new collection should set `resetsDifficulty: true` on its first chapter and
open with `teach` levels scoring in the 15-30 band. That will look like a
difficulty collapse on a global chart, and it is correct: the player is learning
a new idea, and the chapter validator — not a global line — is what judges it.

Guidance is the one thing that may not reset. It fades across the whole game and
never strengthens again inside a skill arc; a genuinely new mechanic would need
a design decision, not a silent exception.
