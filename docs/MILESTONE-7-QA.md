# Milestone 7 QA — Content architecture, pacing, and authoring scale

Verification record for Prompt 7. Everything below was actually run on the
commit that ships this milestone. Where something could not be tested, it says
so plainly and says why.

Environment: Windows 11, Node v25.2.1, Expo SDK 57, npm.

---

## 1. Automated gates

All run locally on the final tree.

| Command | Result |
|---|---|
| `npm test` | **206 tests, 206 pass, 0 fail** (909 ms). Was 143 before this milestone. |
| `npm run typecheck` | Clean, no errors. |
| `npm run analyze:levels` | 10 levels measured, **0 invariant violations, 0 design warnings**, exit 0. |
| `npm run doctor` | 21/21 checks passed. |
| `npm run validate:audio` | All 9 required sounds validated. |
| `npm run scan:analytics` | No analytics SDK, advertising identifier, device fingerprint, or network call found. |
| `npm run export:android` | Exported to `dist/android`. |
| `npm run export:ios` | Exported to `dist/ios`. |
| `npm run export:web` | Exported to `dist/web`; 5 static routes. |
| `npm run bench:analyzer` | Completed; figures in §4. |

`npm run analyze:levels` is new and is wired into both `npm run check` and the
CI workflow, so a pacing invariant violation now fails the build.

---

## 2. Tests added (63 new)

| File | Covers |
|---|---|
| `src/content/catalog.test.ts` | Unique collection / chapter / level ids; one chapter per level; one collection per chapter; deterministic flat order; the ten shipped ids in their exact order; every production level still passes full solver validation with an **exact** solution count; lookups; capstone placement; display copy present. Plus seven negative tests proving duplicate ids, a level in two chapters, a misplaced capstone, an empty chapter/collection, and non-ascending chapter order all **fail loudly**. |
| `src/content/navigation.test.ts` | Every level resolves to a context; prev/next across the whole catalog; the chapter seam (5 ↔ 6) traversed in both directions; catalog start/end boundaries; continuous player-facing numbering with per-chapter positions; chapter/collection lookups; chapter endpoints; chapter and collection progress rollups; **resume across a chapter boundary**; resume at the final level. |
| `src/content/pacing.test.ts` | Shipped catalog violates no invariant; its warning set is exactly the reviewed set (currently empty); invariants and warnings are separated and only invariants gate the build. Plus eight negative tests proving the validator really catches a non-peak capstone, strengthening guidance, an unexplained drop (and that an authored `pacingNote` satisfies it), a too-hard tutorial opener, a false reset claim, a silent continuation, and a trapping tutorial teach level — and that a downward trend is a *warning*, not a failure. |
| `src/game/analyzer-scale.test.ts` | The `safeAlternativeCount` fix, with a hand-derived expected value; `unsafeChoiceCount` excludes forced moves; internal consistency of danger/doom/dead-end metrics; memoised counting agrees exactly with full enumeration on all ten levels and on a 720-solution fixture; a capped count never claims to be exact; a budget-limited analysis reports itself non-exhaustive; stranding analysis matches the analyzer; scale budgets. |
| `src/progress/model.test.ts` (extended) | Six new tests loading **hard-coded version-1 payloads** (not re-serialised from current code): a mid-collection save, a save spanning the new chapter seam, a full-catalog save, a save naming a retired level, and corrupt records inside a valid save. |

---

## 3. Analyzer metric audit

Every metric was read against its own documentation. Findings:

**Bug found and fixed — `safeAlternativeCount`.** Documented as "safe stitches
available at dangerous-decision states"; the implementation incremented it for
every safe child at *every* decision state, dangerous or not. Trap-free levels
therefore reported "safe alternatives" to a danger that does not exist.

Measured before and after, all ten levels:

| # | Level | Before | After |
|---|---|---|---|
| 1 | First Thread | 2 | **0** |
| 2 | Kite Tail | 5 | **0** |
| 3 | Twin Petals | 8 | **0** |
| 4 | Butterfly Turn | 9 | **0** |
| 5 | Forked Needle | 1 | 1 |
| 6 | Echo Stairs | 2 | 2 |
| 7 | Orbit Bloom | 4 | 4 |
| 8 | Laced Window | 4 | 4 |
| 9 | Moonlit Return | 6 | 6 |
| 10 | Master Sampler | 6 | 6 |

Only the four trap-free levels moved, and all four moved to zero — the correct
answer. **No difficulty score changed**, because `difficultyScore` never read
this metric (it reads `solutionDecisionStates`, `maxBranching`,
`forcedMovePercent`, `dangerousDecisions`, `maxConsequenceDepth`,
`distinctDeadEnds`, `totalStitches`). Verified by capturing the analyzer output
before the change and diffing after: the curve is still exactly
**15 · 22 · 28 · 31 · 39 · 54 · 60 · 64 · 77 · 80**, and every planning / risk /
length component is identical. **No tier threshold needed adjusting.**

**Renamed for accuracy — `unsafeMoveCount` → `unsafeChoiceCount`.** It counts
doomed stitches offered *at decision states*; forced moves are excluded, because
a move with no alternative is not a choice a player can get wrong. Values did
not change.

**Audited and correct as documented, unchanged:** `decisionStates`,
`solutionDecisionStates`, `forcedMoveStates`, `forcedMovePercent`,
`maxBranching`, `avgBranching`, `distinctDeadEnds`, `doomedStates`,
`earliestDoomDepth`, `dangerousDecisions`, `maxConsequenceDepth`, `sharedHoles`,
`hubCount`, `averageDegree`, `frontEdges`, `backEdges`, `frontDecisionShare`,
`canTrap`, `reachableStates`, `totalStitches`.

**Added:** `solutionCountExact`, `exhaustive`, and the `SolutionCount` /
`StrandingAnalysis` shapes in the solver, so an inexact answer can never be
mistaken for an exact one.

---

## 4. Performance

`npm run bench:analyzer`, Node v25.2.1, this machine. These are recorded
measurements, not guarantees; the tests use deliberately loose budgets because
CI hardware differs.

### Production catalog

| Level | Stitches | States | Solutions | Exact | ms |
|---|---|---|---|---|---|
| 1 First Thread | 4 | 8 | 2 | yes | 0.04 |
| 2 Kite Tail | 5 | 14 | 4 | yes | 0.03 |
| 3 Twin Petals | 6 | 15 | 6 | yes | 0.06 |
| 4 Butterfly Turn | 7 | 21 | 6 | yes | 0.06 |
| 5 Forked Needle | 8 | 14 | 1 | yes | 0.04 |
| 6 Echo Stairs | 8 | 18 | 1 | yes | 0.05 |
| 7 Orbit Bloom | 9 | 25 | 2 | yes | 0.32 |
| 8 Laced Window | 12 | 33 | 2 | yes | 0.07 |
| 9 Moonlit Return | 13 | 74 | 2 | yes | 0.14 |
| 10 Master Sampler | 20 | 318 | 1 | yes | 0.73 |

**Whole catalog: 540 reachable states, 2.2 ms.** Memory is bounded by the state
count; the largest shipped hoop holds 318 memo entries.

### Synthetic scale — forced chain (linear)

| Stitches | States | ms |
|---|---|---|
| 10 | 11 | 0.13 |
| 40 | 41 | 0.25 |
| 80 | 81 | 0.66 |
| 160 | 161 | 2.21 |

Length alone is cheap: states grow exactly linearly.

### Synthetic scale — N-petal hub (exponential states, N! solutions)

Counting via state memoisation vs. the old full path enumeration:

| Spokes | States | Solutions | Exact | count ms | enumerate ms | speedup |
|---|---|---|---|---|---|---|
| 3 | 21 | 6 | yes | 0.11 | 0.25 | 2.2× |
| 4 | 49 | 24 | yes | 0.05 | 0.31 | 5.8× |
| 5 | 113 | 120 | yes | 0.14 | 1.04 | 7.4× |
| 6 | 257 | 720 | yes | 0.31 | 6.11 | 19.4× |
| 7 | 577 | 5,040 | yes | 1.06 | 39.02 | 37.0× |
| 8 | 1,281 | 40,320 | yes | 2.97 | 324.96 | 109.4× |
| 9 | 2,817 | 362,880 | yes | 3.44 | 3,062.04 | **890.3×** |

The gap widens without limit: enumeration is O(solutions), counting is
O(states). At 9 petals a level that took **3 seconds** to count now takes
**3.4 ms**, and the answer is exact both ways (cross-checked in
`analyzer-scale.test.ts`).

### Synthetic scale — hub + runner (danger and stranding)

| Spokes | States | Dead ends | Dangerous decisions | Safe alternatives | analyze ms | strand ms |
|---|---|---|---|---|---|---|
| 3 | 37 | 7 | 7 | 12 | 0.14 | 0.06 |
| 4 | 81 | 15 | 15 | 32 | 0.19 | 0.06 |
| 5 | 177 | 31 | 31 | 80 | 0.44 | 0.13 |
| 6 | 385 | 63 | 63 | 192 | 0.95 | 0.29 |
| 7 | 833 | 127 | 127 | 448 | 2.17 | 0.75 |
| 8 | 1,793 | 255 | 255 | 1,024 | 4.56 | 2.00 |

The 3-petal row (7 dangerous decisions, 7 unsafe choices, 12 safe alternatives)
is derived by hand in the test rather than read off the implementation.

### Honesty of capped results

`countSolutions(level, cap, stateBudget)` returns `exact: false` whenever the
count reaches `cap` or the state budget runs out, and `analyzeLevel` sets
`exhaustive: false` / `solutionCountExact: false` in the same situations. The
pacing validator treats a non-exact measurement as a **hard invariant
violation** (`MEASUREMENT_NOT_EXACT`) — content is never paced from an estimate.
Tested directly.

---

## 5. Manual interaction QA — web

Run against `expo start --web` on `http://localhost:8090` in Chrome, driven
through Chrome DevTools, at 412×915 (large Android portrait) and 1280×900.
All observations are from the accessibility tree and screenshots.

| Check | Result |
|---|---|
| Gallery copy is content-driven | Reads `COLLECTION ONE` / `Day & Night` / the collection description from `collection.ts`. No hard-coded `CHAPTER ONE` or `Ten hoops` anywhere. |
| Chapter dividers render | `First Light` and `After Dark` render with stitched chapter mark, Fraunces title, subtitle, and brass `N of 5 stitched` count, each exposed as a heading to assistive tech. |
| Living Sampler preserved | The rail thread runs **straight through** both dividers — the journey is unbroken across the seam. No cards, grids, glass, neon, or emoji introduced. |
| Level numbering | Continuous 1-10 across both chapters, as designed. |
| Lock state | Only level 1 unlocked on a fresh profile; all others `Folded — finish the previous hoop`, disabled. |
| Open a level | Level 1 opens; header reads `LEVEL 1 · EASY` and `Day & Night · First Light` from the content layer. |
| Play to completion | Played `a→b→a→c→a`; completion reveal appeared with the authored message "Your first sunrise is stitched." |
| Completion unlock | `Play next level 2` offered and worked; level 2 opened with a `Play previous level 1` control that level 1 correctly did not have. |
| Chapter-boundary Next | With levels 1-5 complete, level 6 (`echo-stairs-06`) opened showing `Day & Night · After Dark`. |
| Chapter-boundary Previous | From level 6, Previous went to level 5 and the header flipped back to `First Light`. |
| Resume across the seam | Progress with chapters 1-5 complete resumed on **Echo Stairs**, the first level of chapter 2 — not stalled at the chapter's last completed hoop. |
| Gallery progress | `5 of 10 hoops stitched`; `First Light 5 of 5` with a completion seal on the divider; `After Dark 0 of 5`; stitch row shows 5 done + 1 current. |
| Trapped state | On Forked Needle, played the runner branch `a→b→d→e→f→g→h`: the trapped-thread alert appeared ("The thread is caught… Nothing is lost") with Undo and Restart, and revealed no answer. |
| Settings | Opens; playtest summary still resolves and reports all ten catalog level ids in play order. |
| Wide layout | 1280×900 keeps the centred sampler column and gutters; dividers and rail scale correctly. |

**Console:** one pre-existing dev-only React warning —
`React does not recognize the accessibilityElementsHidden prop on a DOM element`
from `src/components/Wordmark.tsx:16`, where an SVG receives a React Native prop
that react-native-web does not map on web. It predates this milestone,
`Wordmark.tsx` was not touched here, it is dev-build only, and it does not
affect native or the exported bundle. **Not fixed in this milestone** — it is
outside its scope; logged here so it is not lost.

No other console error or warning was produced during the pass.

---

## 6. Device and emulator testing — not performed

Stated plainly rather than implied:

- **No physical Android device** was available. `adb devices` reports an empty
  device list.
- **No Android emulator** was available. `emulator -list-avds` returns nothing —
  no AVD is configured on this machine.
- **No iOS simulator is possible.** The development machine is Windows 11;
  `xcrun` does not exist. iOS was verified only to the extent that
  `npm run export:ios` bundles successfully.

So the content refactor has been verified by **web interaction and by the
automated suite only**. The same honest limitation applied to Prompt 6, and it
still applies: the re-authored and now re-homed levels have not been played on
real hardware.

`docs/S25-ULTRA-PLAYTEST.md` and the `internal` EAS profile remain the route to
a real Android pass, and `npm run build:android:internal` will produce a
shareable APK from any machine with an Expo account. That pass is still open.

---

## 7. What was deliberately not done

- **No new production levels.** Prompt 7 is a foundation milestone; padding the
  catalog would have made it look larger without making it better.
- **No visual redesign.** The gallery gained chapter dividers in the existing
  Living Sampler grammar and nothing else.
- **No retention systems.** No daily puzzle, streaks, accounts, cloud sync, ads,
  purchases, cosmetics, sharing, leaderboards, energy, or lives.
- **No new mechanic.** Depth in `docs/PUZZLE-CURRICULUM.md` comes entirely from
  graph structure under the one existing rule.
- **No progress version bump.** The schema did not change, so bumping it would
  have destroyed real saves for nothing. Compatibility is proven by test instead.
- **No procedural generation, no AI-generated art.**

---

## 8. Unresolved risks

1. **No hardware pass.** The highest-standing risk, carried over from Prompt 6
   and not closed here. Touch accuracy, flip feel, heat, and battery on a real
   phone remain unverified for the current build.
2. **Chapter dividers are unverified on a real screen.** They render correctly
   in a browser at phone dimensions, but font rendering, spacing, and the rail
   alignment through a divider have not been seen on a physical device.
3. **The pacing model is validated against one collection.** Two chapters and
   ten levels is a thin sample. Rules like `TUTORIAL_OPENER_MAX = 25` and
   `MAX_UNEXPLAINED_DROP = 8` are reasoned from research and from this
   collection's shape; the first genuinely new collection will be the real test,
   and some constants will probably need to move.
4. **Design warnings are currently pinned at zero.** `pacing.test.ts` asserts the
   warning set is exactly empty. That is deliberate — a new warning becomes a
   visible decision — but it does mean adding content will require a conscious
   choice each time a warning appears, rather than silently accumulating.
5. **`ONE_SIDED_CHAPTER` uses a weighted approximation.** It weights each level's
   `frontDecisionShare` by its decision count rather than recounting states
   across the chapter. Good enough to flag a lopsided chapter, not a precise
   figure.
6. **Analyzer budgets are untested at their limits.** `DEFAULT_STATE_BUDGET` is
   2,000,000 states. No shipped or synthetic fixture comes near it (the largest
   real hoop is 318 states), so the budget-exceeded path is covered only by
   tests that force a tiny budget artificially.
7. **The pre-existing `Wordmark.tsx` web warning** (§5) is still open.
