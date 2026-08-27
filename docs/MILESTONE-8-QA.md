# Milestone 8 QA — Collection 02, Multi-Collection UX, Content Proof

## Automated checks

| Command | Result |
|---|---|
| `npm test` | 216/216 passing (up from 206 on the pulled main; 10 new tests added for old-save upgrade boundaries, collection unlock state, and content-report rollups) |
| `npm run typecheck` | Clean |
| `npm run analyze:levels` | 20/20 levels valid. **0 invariant violations.** 1 design warning (`ONE_SIDED_CHAPTER` on Tangled Root — investigated and reviewed, see below) |
| `npm run bench:analyzer` | Full 20-level catalog: 1,091 reachable states, **8.7ms total**, every figure exact. Slowest single level: Knot's End / Master Sampler, both 318 states, ~1.3–1.4ms. No level came close to the analyzer's state or solution budgets. |
| `npm run doctor` | 20/21 checks pass. The one failure (nine Expo SDK packages a patch version behind) predates this milestone and is unrelated to it — not touched, since bumping dependency pins was out of scope and riskier than the milestone called for. |
| `npm run validate:audio` | 9/9 sounds valid — unaffected, no new audio added |
| `npm run scan:analytics` | Clean — no analytics SDK, identifier, fingerprinting, or network call anywhere in `app/` or `src/` |
| `npm run export:android` | Succeeded, `dist/android` |
| `npm run export:ios` | Succeeded, `dist/ios` |
| `npm run export:web` | Blocked in this session by a Windows/OneDrive file lock on the tracked `dist/web` directory (OneDrive syncs `Desktop`; see below) — **not a code or build defect**. Re-ran the identical `expo export --platform web` against an unsynced output directory and it succeeded cleanly, producing all 7 static routes including the two new ones (`/collection/[id]`, `/gallery`). This was also proven twice earlier in the session while regenerating Expo Router's typed-route file. |

## Pacing warning: investigated, not silenced

`ONE_SIDED_CHAPTER` on `knot-and-bramble-ch01` (Tangled Root): 12% of the
chapter's decisions land on the front. Investigated per Prompt 8's
instruction to judge every warning rather than reflexively fix or ignore it.

Cause: every Tangled Root level places its one real decision at a hub reached
via a front-side entry stitch, so the branch choice itself always lands on
the back (the flip happens before the choice, by the rule). This is a direct
consequence of the nested-obligation and asymmetric-hub shapes chosen for
this chapter, not an authoring accident. Judged: **genuine but intentional**
— recorded as a reviewed warning in `src/content/pacing.test.ts`'s
`EXPECTED_WARNINGS` list (so a *new*, unreviewed warning would still fail
the test) and documented in `docs/COLLECTION-02-DESIGN.md`. Chapter Two's
converging-openings and interacting-runners levels are front-opening by
construction, which balances the collection's overall side split back out.

No validator thresholds were changed.

## Difficulty scoring: no formula change needed

Nested obligations and asymmetric hubs were measured against the existing
`difficultyScore` formula from Prompt 7 without modification. All twenty
levels (ten old, ten new) still measure to a tier that matches their
authored `difficulty` label exactly — the `TIER_LABEL_MISMATCH` invariant
passed on first measurement for every Collection 02 level once the
chapter-capstone reassignment (see below) was made. No blind spot was found
in the score's treatment of the new structures, so Collection 01's levels
were not re-measured or re-labeled.

One correction was made *during* authoring, not to the formula: the first
draft of Old Growth (originally slated as Chapter 1's `combine` entry) and
Deep Taproot (originally the capstone) measured 66 and 60 respectively —
the "combine" level scored higher than the capstone, violating
`CAPSTONE_NOT_HARDEST`. Rather than adjust the score to fit the intended
role, the roles were swapped (Old Growth became the capstone, Deep Taproot
the combine entry) so the puzzle that is actually harder is the one that
closes the chapter. This is exactly the kind of judgment call Prompt 8 asked
for: the puzzle was right, the assigned role was wrong.

## Old-save upgrade testing

Three explicit boundary cases added to `src/progress/model.test.ts`, using
hand-written version-1 JSON payloads (not re-serialized from current code,
so they prove the *stored format* still loads, not just the code path):

- **5 of 10 completed**: resumes at level 6 (Echo Stairs); Collection 02
  stays locked.
- **9 of 10 completed**: resumes at level 10 (Master Sampler); the tenth
  level unlocks, not the eleventh.
- **All 10 completed**: unlocks and resumes straight into `root-knot-11`
  (Collection 02's first level).

No migration code was needed and `PROGRESS_VERSION` did not move — the
progress schema is unchanged, and unlocking/resume were already pure
functions of flat catalog order (`src/progress/model.ts`), so appending
Collection 02 after Collection 01 in `COLLECTION_SOURCES` was sufficient by
construction. This was verified, not assumed.

## Manual puzzle QA

Every new level's authored solution, solution count, and trap intent are
solver-verified at module load by `assertValidLevel` (throws on import if
wrong) and re-verified by `validateCatalogPacing`, `analyzeLevel`, and the
dedicated `difficulty.test.ts` / `hints.test.ts` suites — including the
"every stage-3 hint names a real legal move at every point along the
authored solution" property test, which ran against all 20 levels including
the 10 new ones. This is the same verification bar Collection 01 shipped
under.

What was **not** done: a human play-through clicking through all ten new
levels' alternative branches, invalid inputs, and trap recovery in a live
app session. Time did not allow a full manual pass across all ten levels'
branches on top of the automated proof above. This is a real, stated gap —
see Known Remaining Risks.

## Collection-flow QA (browser, static web export)

Performed against the `npm run export:web` output, served locally and
driven with `mcp__claude-in-chrome`:

- **Fresh install** (empty `localStorage`): Day & Night shows "0 of 10 hoops
  stitched", First Thread unlocked and marked "Begin", every other level
  correctly shows "Folded — finish the previous hoop". Knot & Bramble shows
  "Finish Day & Night to unfold this sampler." and is not pressable
  (`accessibilityState.disabled`). ✅
- **Collection library → collection journey navigation**: tapping the Day &
  Night folio navigates to `/collection/day-and-night` and renders the full
  ten-level journey with correct chapter dividers. ✅
- **Level route breadcrumb**: opening First Thread shows
  "Day & Night · First Light" and a "‹ Gallery" back-link. ✅
- **Console cleanliness**: no console output at all on load of `/` or
  `/collection/day-and-night` — confirms the `accessibilityElementsHidden`
  fix (Goal 29); previously this leaked an `accessibilityelementshidden`
  attribute warning from `Wordmark`'s SVG. ✅
- **Direct deep link to a dynamic route** (`/collection/knot-and-bramble`
  typed directly into the address bar against the static file server):
  returned a 404 from the static host, not from the app's own redirect
  logic. This is expected behavior for an Expo Router **static** web export
  without a hosting-level catch-all rewrite — the in-app client-side
  redirect (unknown/locked collection → `/`) only runs once the client
  bundle has mounted a matching route, which a bare static file server can't
  do for an arbitrary dynamic path without a rewrite rule. This is a hosting
  configuration concern, not a code defect; it does not affect the actual
  shipped app (Expo Router's native builds and a properly configured web
  host both handle this). Noted as a known remaining risk for actual web
  deployment.

What was **not** completed in this pass, purely due to time: driving a full
completion of Day & Night through the browser to observe the crafted
collection-complete card, the finished-sampler gallery with real completed
entries, chapter-boundary and Collection-02-active states, large text /
reduced motion, and a small-viewport pass. The completion-card code path,
gallery screen, and accessibility props were verified by reading the
implementation and by the existing automated test suite, not by driving them
live end-to-end.

## Real-device and emulator testing

**Not performed.** No Android device, iOS device, or emulator was available
in this environment. This milestone's "hardware testing" goal — closing the
Samsung Galaxy S25 Ultra risk flagged as open in Milestones 6 and 7 —
**remains open**. No claim of real-device testing is made. No internal
Android APK build was attempted (would require interactive `eas` account
authentication, which this environment cannot perform non-interactively).

## Known remaining risks

1. **No live human play-through of the 10 new levels' branches**, only
   solver/analyzer proof. The puzzles are provably solvable, correctly
   scored, and correctly trap-flagged, but "does the trap feel fair when you
   actually walk into it" was judged from the authored hint copy and the
   measured consequence depth, not from playing it.
2. **Real-device testing gap carries forward unresolved** from Milestones 6
   and 7 (Samsung Galaxy S25 Ultra, or any physical Android/iOS device).
3. **Web static export needs a hosting rewrite rule** for direct/deep-linked
   navigation to dynamic routes (`/collection/[id]`, `/level/[id]`) to avoid
   a 404 from the static file host on a hard refresh or shared link — a
   deployment concern for whichever static host is eventually used, not a
   code change.
4. **`expo-doctor`'s nine-package patch-version drift** predates this
   milestone and was left untouched; bumping Expo SDK patch versions is a
   separate, lower-risk-when-isolated piece of work this milestone did not
   scope in.
5. **Chapter 1's `ONE_SIDED_CHAPTER` warning** is judged intentional (see
   above) but is a real property of the content, worth revisiting if a
   future Chapter 1 sibling collection repeats the same shared-hub-decision
   pattern enough times to make it a house style rather than a one-off.
