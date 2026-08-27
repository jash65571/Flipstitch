# Technical foundation

## Stack decision

FlipStitch uses Expo SDK 57, React Native, TypeScript, and npm.

This is a strong fit because the game is a focused 2D touch puzzle. It also keeps Android and iOS in one codebase. npm avoids adding another package manager requirement for Windows contributors.

The current board uses SVG for fast iteration. The production-slice audit kept SVG because gradients, weave patterns, thread highlights, a visible needle, and smooth transforms all fit the current renderer. Skia would add binary and maintenance cost without a measured gain on this level. The rule engine has no React Native imports, so a later renderer change still does not affect level rules.

## Boundaries

```text
app/                  Routes and screen entry points
src/screens/          Screen composition and input flow
src/components/       Renderers and reusable controls
src/game/             Pure rules, solver, analyzer, synthetic scale fixtures
src/content/          Content hierarchy: catalog, navigation, chapter pacing
src/progress/         Versioned local progress model and storage boundary
src/feedback/         Semantic feedback mapping, audio, and haptic services
src/settings/         Versioned sound/haptic preferences and storage boundary
src/playtest/         Local playtest events, bounded store, and report engine
src/theme/            Color, spacing, radius, and type tokens
```

## Level model

A level is an alternating-edge trail across one set of physical holes. Each required edge belongs to the front or back. A valid stitch:

1. Starts at the needle's current hole.
2. Uses an unfinished edge on the active side.
3. Ends at another physical hole.
4. Moves play to the opposite side.

That model gives us deterministic validation, hints, undo, replay, and future procedural generation.

## Content hierarchy

`src/content/` owns everything about *where a level lives*:

```text
Catalog -> Collection -> Chapter -> ChapterEntry -> Level
```

A `Level` (in `src/game/types.ts`) describes only the puzzle. It carries no
collection, chapter, position, or progression role; the `collection: string`
display field was removed in Prompt 7. A `ChapterEntry` pairs a level with its
`PacingRole`, the curriculum concepts it teaches, and an optional `pacingNote`.

`catalog.ts` assembles the deterministic flat play order (collections by
`order`, chapters by `order`, entries as authored) and throws at import time on
duplicate collection/chapter/level ids, non-ascending order, empty units, or a
capstone that is not a chapter's last level. `navigation.ts` is the only source
of previous/next/resume and chapter/collection progress; screens never index the
level array. `pacing.ts` validates chapter pacing, separating hard invariants
(which fail the build) from design warnings (which do not).

`src/content/` imports no storage and no progress module — completion is passed
in as a predicate — so the whole content layer is pure and testable in Node.

Full detail: `docs/CONTENT-ARCHITECTURE.md` and `docs/PROGRESSION-PACING.md`.

## Solver and validation

`src/game/solver.ts` holds two deliberately different algorithms.

**Path finding** (`solveLevel`, `solveFromState`) enumerates real stitch
sequences and is used where an actual path is needed — hints, tests. It is
always called with a small limit.

**Counting and reachability** (`countSolutions`, `analyzeStranding`) never build
a path. They memoise over the state `(current hole, active side, used-edge set)`
— a bitmask over target-edge indices — which turns an exponential walk over
*paths* into a linear walk over *states*. `analyzeLevel` folds solution counting
into its single state walk for the same reason.

Exactness is explicit, never assumed: `SolutionCount.exact` and
`LevelMetrics.solutionCountExact` / `exhaustive` are false whenever a count cap
or state budget was hit, and the reported figure is then a lower bound. Nothing
labels a partial answer as exact. Solver state contains no React Native, Expo,
SVG, or storage imports.

`src/game/synthetic.ts` provides tooling-only fixtures (forced chain, N-petal
hub, hub-plus-runner) whose branching grows on a dial. They are never registered
in the catalog; they exist so `npm run bench:analyzer` and
`src/game/analyzer-scale.test.ts` can measure authoring-tool behaviour on hoops
far denser than anything shipped.

Validation rejects missing holes, self-loops, same-side duplicate edges, wrong solution starts, broken side alternation, edge reuse, incomplete authored paths, unsolvable graphs, and unexpected solution counts. Authored-solution checking stays exact and stitch-by-stitch; solution counting is capped one above the authored expectation, which is all that is needed to tell "exactly N" from "more than N"; dead-end intent is checked by exhaustive state reachability rather than by enumerating dead-end paths. Levels marked unique must produce exactly one full trail. Levels that teach recovery declare whether dead-end branches are intended, so accidental traps fail authoring checks while planned backtracking remains measurable.

## Local progression

`src/progress/model.ts` is a pure, versioned progress reducer. It stores completed level IDs, best move counts, and the last played level. `ProgressProvider` is the only Async Storage boundary. Corrupt or stale data falls back to a fresh state, and storage failure never blocks offline play.

Unlocking is linear and derived from contiguous completed levels in the catalog's flat play order, so it crosses chapter and collection boundaries seamlessly. A completion unlocks the next hoop, every prior hoop remains replayable, and the gallery resumes at the last useful unlocked level.

`PROGRESS_VERSION` remains **1**. The Prompt 7 content refactor kept every level
id and its position, so the storage schema did not change and no migration was
needed or written. `src/progress/model.test.ts` proves it, loading hard-coded
version-1 payloads (including one spanning the new chapter seam) rather than
re-serialising current code.

## Feedback, sound, and haptics

`src/feedback/mapping.ts` is a pure table from semantic events (`stitchPlaced`, `sideChanged`, `invalidMove`, `undo`, `hint`, `levelCompleted`, `levelUnlocked`, `gallerySelected`) to sound and haptic plans. `controller.ts` applies the mapping through injected audio/haptic services and the persisted preferences, and deduplicates haptics when one action triggers several state changes (stitch → flip, completion → unlock).

`audio.ts` plays nine original WAV files through `expo-audio`, creating one player per sound lazily, throttling per-sound repeats, and releasing everything on teardown. `haptics.ts` uses `performAndroidHapticsAsync` on Android and the impact/notification/selection family elsewhere; all calls fail safely. Screens never choose raw filenames or platform constants.

## Settings

`src/settings/model.ts` is a pure, versioned preferences reducer (sound and haptics). `SettingsProvider` is the Async Storage boundary. Reduced motion is deliberately not stored: it follows the system setting through `AccessibilityInfo`, which is the accessible default.

## Local playtest

`src/playtest/events.ts` defines the schema-versioned event set with an
optional `attemptId`. `store.ts` provides pure bounded-store operations
(5000-event cap, oldest-first eviction, corrupt-data fallback) plus a debounced
AsyncStorage adapter: `flush()` drains **all** pending batches in order, a
generation counter makes `clear()` safe during in-flight writes, and the
provider flushes on AppState background and teardown. `tracker.ts` stamps
events with session id, per-session sequence, epoch timestamp, and monotonic
elapsed time.

`attempt.ts` is the pure attempt lifecycle: `LevelVisit` guarantees exactly one
`level_opened` and exactly one terminal event (`level_completed`, `level_exited`,
or `restart_used`) per attempt, allows replay after completion as a fresh
attempt, and is idempotent under StrictMode-style repeated setup. The level
route owns one visit per genuine visit and stamps every gameplay event with the
current attempt id.

`report.ts` is a pure, attempt-based summary engine (completion rates, time to
first stitch, completion time, exit rate all per attempt) with explicit
small-sample warnings. Version-one legacy events without attempt ids are
reconstructed into inferred attempts and flagged, never treated as precise.

The playtest store collects no names, emails, accounts, location, contacts, advertising identifiers, device fingerprints, or unrelated device data, and performs no network requests. `scripts/scan-analytics.mjs` enforces this in CI.

## Builds

`eas.json` defines an `internal` profile (shareable Android APK via
`distribution: internal`, `buildType: apk`) and a `production` profile (Play
Store AAB). npm scripts `build:android:internal` and `build:android:production`
wrap the `eas build` invocations; EAS requires an Expo account and never runs
without explicit invocation.

## Planned engineering gates

1. Prove the core interaction on real iOS and Android devices (S25 runbook exists; hardware pass pending).
2. Add a solver that rejects impossible or multi-solution levels.
3. Add persisted progress and local playtest tracking behind small interfaces.
4. Add audio and richer haptics behind one feedback controller. (Skia rendering remains a later option; the SVG renderer still meets current needs.)
5. Add purchases and ads only after retention data supports them.

## Quality rules

- Pure game rules require unit tests.
- Every level must pass the solver and a schema check.
- A replay seed must reproduce any reported puzzle failure.
- Keep the first playable frame fast and work offline.
- Test small phones, tablets, safe areas, large text, reduced motion, and screen readers.
- Profile frame time, memory, heat, and battery before soft launch.

## Vertical-slice runtime choices

- Fonts load from local package assets through `expo-font`; no network request is required.
- The side swap locks board input until its midpoint and settle animation finish.
- Reduced motion commits the same state change with no transform animation.
- Small-phone, large-phone, large-text, phone-landscape, and tablet-landscape layout rules are pure and unit tested.
- Android, iOS, and web export checks run before delivery.

## Routing (Prompt 8: multi-collection)

```
/                    CollectionLibraryScreen — one folio per collection
/collection/[id]     LevelSelectScreen(collectionId) — that collection's sampler journey
/level/[id]          GameScreen — gameplay (unchanged route shape)
/gallery             GalleryScreen — every completed level's front/back artifacts
/settings            unchanged
```

`app/collection/[id].tsx` resolves the id through `getCollection` and
`getCollectionUnlockState` (`src/content/navigation.ts`); an unknown or
locked collection id redirects to `/` rather than rendering a broken or
bypassable screen. `LevelSelectScreen` no longer indexes
`catalog.collections[0]` — it takes `collectionId` as a prop, so adding a
third collection requires no route or screen change, only a new entry in
`COLLECTION_SOURCES` (`src/content/catalog.ts`). Unlock and resume logic
needed no changes at all: `src/progress/model.ts` was already a pure
function of flat catalog order, so a second collection appended after the
first unlocks and resumes correctly with zero migration code.

## Peek state model (added Milestone 8.1)

`src/game/peek.ts` holds the entire inspection state machine as pure
functions over `Side | null` — it has no dependency on `GameState`
(`src/game/types.ts`) and cannot read or mutate it. `GameScreen.tsx` holds
`peekSide` as a `useState` sibling to `game`, never derived from it and
never folded into it (Milestone 8's bug was exactly that folding —
`visibleSide = previewSide ?? game.activeSide`). `HoopBoard.tsx` renders two
independent layers (`PlayLayer`, always `game.activeSide`; `PeekLayer`, only
when peeking) instead of one side-swappable layer. See
`docs/PREVIEW-INTERACTION.md` for the full interaction design.

## Topology fingerprinting (added Milestone 8.1)

`src/content/topology.ts` provides a dependency-free canonical graph
labeling (individualization-refinement, exhaustive for FlipStitch's small
sparse level graphs) that detects EXACT and MIRRORED topology duplicates
across the catalog under hole renaming, coordinate movement, and
front/back-respecting isomorphism. `src/content/duplicates.ts` wraps it into
a catalog-wide pass/fail policy, wired into `npm run analyze:levels`
(`scripts/analyze-levels.mjs`), which now fails the build on any unapproved
exact/mirrored duplicate. This exists because Milestone 8 shipped Collection
02 levels that were exact clones of Collection 01 levels under renamed
holes, and no prior tooling would have caught it — see
`docs/COLLECTION-02-DESIGN.md`.
