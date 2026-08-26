# Milestone 6 QA — Puzzle Depth & Difficulty Curve

What was actually tested for the Prompt 6 milestone, and how. This report
distinguishes **engine-level playthrough** (driving the real game logic), the
**web build smoke test** (headless Chrome), and **hardware/emulator
playtesting** (not performed in this environment — stated honestly at the
bottom).

---

## 1. Automated checks (all run, all green)

| Check | Result |
|---|---|
| `npm test` | ✅ 143 tests, 0 failures |
| `npm run typecheck` | ✅ clean |
| `npm run doctor` | ✅ 21/21 checks passed (after aligning SDK 57 patch pins) |
| `npm run validate:audio` | ✅ all 9 sounds validated |
| `npm run scan:analytics` | ✅ no analytics/ad ID/network calls found |
| `npm run export:android` | ✅ exported to `dist/android` |
| `npm run export:ios` | ✅ exported to `dist/ios` |
| `npm run export:web` | ✅ exported to `dist/web` |

## 2. New tests added

- **`src/game/analyzer.test.ts`** (7 tests) — determinism; forced-chain
  autoplay detection; fork-with-trap metrics; "a branching trap puzzle scores
  far above a longer forced path" (length can never dominate); score
  transparency (component shares + total reconciliation); tier boundaries;
  authored label == measured tier.
- **`src/game/difficulty.test.ts`** (12 tests) — the ten-level curve is
  strictly monotonic and pinned to `[15, 22, 28, 31, 39, 54, 60, 64, 77, 80]`;
  levels 1–2 stay tutorial-safe (full guidance, no trap, ≥1 safe choice,
  score < 25); the first true trap appears intentionally at level 5; trap
  intent matches reachability for every level; Tricky/Expert require real
  planning (≥3 solution decisions, ≥1 dangerous decision, ≥2 consequence
  depth, ≥55 score); 7 and 8 are both harder than 6 and trap-capable; level 10
  is the strongest capstone; guidance only ever tightens; every stage-3 hint
  names a legal hole at every position of every authored solution; no level is
  autoplay; solution counts stay intentional; stranded threads never offer a
  hole and point at Undo.
- Updated tests that pinned old structures: `engine.test.ts` (tutorial now
  offers two legal rays), `solver.test.ts` (orbit-bloom now has 2 solutions;
  the side-alternation and unsolvable fixtures rebuilt against the new
  level-one geometry), `stuck.test.ts` + `hints.test.ts` (level 5's runner
  strands at the far end `h`; one Undo frees it).

## 3. Engine-level playthrough (the real game logic)

The test suite drives the actual gameplay engine (`playMove`, `undoMove`,
`stagedHint`, `isGameStuck`, progress/unlock) through every level:

- **Intended solve:** every authored solution was walked and completes both
  sides with every edge used exactly once, never transiently stuck
  (`solver.test.ts`, `stuck.test.ts`).
- **Alternative routes:** multi-solution levels (1, 2, 3, 4, 7, 8, 9) have
  their counts verified against `expectedSolutionCount` — the alternatives are
  real trails, not validator noise.
- **Wrong moves:** invalid stitches (same hole, no stitch, reused edge,
  post-completion) leave the state untouched (`engine.test.ts`).
- **Trap behavior:** every `allowDeadEnds` level provably strands
  (`stuck.test.ts` exhaustively searches the whole reachable state space), and
  every non-trap level provably cannot (`canTrap === allowDeadEnds` in
  `difficulty.test.ts`).
- **Undo from a trap:** level 5's wrong branch (b→d runner) strands at `h`;
  **one Undo frees the needle** — verified in `stuck.test.ts`.
- **Restart from a trap:** a fresh game is never stuck (`stuck.test.ts`).
- **All three hint stages:** concept reveals no holes; region marks exactly the
  legal targets; exact names a legal hole at every state of every level;
  stranded threads get no hole at any stage and an Undo message at stage 3
  (`hints.test.ts`, `difficulty.test.ts`).
- **Progression unlock / replay:** the ten-level unlock-and-complete flow is
  covered by `content-flow.test.ts`; attempt lifecycle by `playtest/*`.
- **Analyzer ↔ gameplay agreement:** the analyzer's `canTrap` matches the
  engine's reachable-stuck search on every level — two independent walks (one
  memoised graph analysis, one engine DFS) agree.

## 4. Web build smoke test (headless Chrome)

- `npm run export:web` succeeds; the exported app was served locally and
  loaded in headless Chrome.
- The **gallery** renders all ten levels with correct titles and difficulty
  labels (e.g. "Level 1, First Thread, Easy", "Level 5, Forked Needle,
  Moderate", "Level 7, Orbit Bloom, Tricky", "Level 10, Master Sampler,
  Expert"), plus "Collection progress" and locked-state labels — the new
  `levels.ts` data flows through to the UI.
- Both Living Sampler font families (Fraunces + Atkinson Hyperlegible Next)
  are bundled and referenced by the page — the Prompt 5 visual identity is
  intact (no drift back to the old type system).
- A screenshot was captured from the exported web build (gallery at a phone
  viewport).

## 5. Visual QA performed

- Hoop/gallery render in the exported web build (headless Chrome).
- Fonts, level titles, difficulty labels, and lock states verified in the DOM.
- The trapped-thread presentation was reviewed in code: `GameScreen` shows the
  trap card ("The thread is caught … Nothing is lost") with Undo stitch +
  Restart, `role="alert"`, a screen-reader announcement on strand, and a
  `thread_trapped` playtest event — and the toolbar hides while stuck. No
  lives, ads, or answer-reveal anywhere in the loop (Goal 4).

## 6. What could NOT be tested honestly here

- **No physical-device or emulator playtesting.** Touch input, flip
  animations, haptics, and audio were not exercised on a real Android/iOS
  device in this environment. Android/iOS/web **bundle exports** succeed, and
  the previous device-proof pass (Milestone 4, S25 Ultra) covers the device
  plumbing, but Prompt 6's level edits were not played on hardware.
- **No interactive in-browser playthrough.** The headless Chrome CLI can load
  and dump the gallery, but cannot tap stitches, so the hoop-board screens
  were not played by hand in the web build; engine-level playthrough (above)
  is the substitute, and the analyzer's metrics match the engine's behavior.
- No new real-device performance measurements were taken.

## 7. Unresolved issues

- None known in the game logic or the milestone's checks. `expo-doctor`
  flagged SDK 57 patch-pin drift (pre-existing); pins were aligned to the
  current expected versions and doctor now passes 21/21.
- On-device confirmation of the re-authored levels remains outstanding until a
  device/emulator pass is run.
