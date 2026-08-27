# Milestone 8.2 QA — Real Play Proof, Peek Polish, Native Build Validation, Tooling Truth

Prompt 8.2 exists because Milestone 8.1's QA proved its fixes with tests and
code review, not with real play, real screenshots, or real devices. This
document separates what was actually verified, and how, so no claim here
reads as stronger than its evidence.

**Environment constraint, stated up front:** this session had no EAS login,
no Android emulator, and no physical device. Per the milestone's own
instructions, those items are reported as **not measured**, not simulated.

---

## Automated proof

Full command list and results — see "Required automated checks" below for
the raw output summary. In short: 243 tests pass (`npm test`, up from 238
before this milestone — new topology-exactness and Peek-hardening tests
added), `tsc --noEmit` clean, `analyze:levels` reports
0 unapproved exact/mirrored duplicates and 0 inexact comparisons (EXHAUSTIVE),
`npm audit` reports 0 vulnerabilities, and Android/iOS/web exports succeed.

### Topology exactness fix

`src/content/topology.ts`'s canonicalizer previously returned a bare
string and silently truncated its search at `MAX_LEAVES = 20_000`, while
its own documentation and `classifyPair` implied EXACT/MIRRORED results
were always mathematically certain. That was a real bug, not just
imprecise wording: a large enough or symmetric enough puzzle could exceed
the budget and still be reported as certainly EXACT or certainly
`distinct`.

Fixed:

- `canonicalKeyFromGraph` now returns `{ key, exploredLeaves,
  exhaustedBudget }`. `exhaustedBudget: true` means the search was cut off
  before every individualization branch was explored.
- `canonicalKey(level, maxLeaves?)` and `mirroredCanonicalKey(level,
  maxLeaves?)` return the same shape; `maxLeaves` is exposed only for
  tests forcing budget exhaustion.
- `classifyPair` gained a new `DuplicateKind`: `"inexact"`. It is returned
  whenever any canonicalization involved in the comparison hit its budget
  — the pair's true relationship (exact, mirrored, or distinct) could not
  be determined, and the classifier refuses to guess.
- `validateCatalogTopology` (`src/content/duplicates.ts`) now sets
  `ok: false` if `inexact.length > 0`, in addition to the existing
  unapproved-exact/mirrored check. Production duplicate validation refuses
  to certify content from an inexact comparison.
- `scripts/analyze-levels.mjs` prints an explicit `Topology analysis:
  EXHAUSTIVE` or `Topology analysis: INEXACT — N pair(s) could not be
  certified` line, and exits nonzero on either unapproved duplicates or
  any inexact comparison.
- Did **not** raise `MAX_LEAVES` to "solve" this — the actual shipped
  catalog needs at most 2 leaves per comparison (see benchmark below), so
  there was no reason to.

New tests in `src/content/topology.test.ts` (all passing):
exhaustive canonicalization reports `exhaustedBudget: false`; a
zero-leaf-budget canonicalization reports `exhaustedBudget: true`;
`classifyPair` returns `exact` under the real budget but `inexact` under a
forced zero budget for the same genuinely-exact pair; `validateCatalogTopology`
returns `ok: false` and a nonempty `inexact` list when forced to a budget
that cannot complete, and `ok: true`/`inexact: []` under the real catalog.
Existing renamed/mirrored/start-side/edge-assignment identity tests are
unchanged and still pass.

### Topology benchmark (`npm run bench:topology`)

New `scripts/benchmark-topology.mjs`. Real findings, not just "it works":

| Fixture | Nodes | Edges | Leaves | ms | Exhaustive |
|---|---|---|---|---|---|
| chain (8/20/40 stitches) | 9–41 | 8–40 | 1 | <3 | yes |
| symmetric hub (4 petals) | 6 | 9 | 24 | 3.6 | yes |
| **symmetric hub (8 petals)** | 10 | 17 | 20,000 | 4,869 | **NO — INEXACT** |
| **symmetric hub (12 petals)** | 14 | 25 | 20,000 | 11,712 | **NO — INEXACT** |
| hub + runner (4 petals) | 8 | 11 | 24 | 2.9 | yes |
| **hub + runner (8 petals)** | 12 | 19 | 20,000 | 6,853 | **NO — INEXACT** |
| catalog: Knot's End (largest shipped level) | 16 | 22 | 2 | 0.95 | yes |
| catalog: Master Sampler | 15 | 20 | 1 | 0.31 | yes |
| catalog: Laced Window | 11 | 12 | 1 | 0.17 | yes |
| **worst-case symmetric hub (16 petals)** | 18 | 33 | 20,000 | 16,612 | **NO — INEXACT** |

Every real shipped level canonicalizes in under 1 leaf and under 1 ms.
Highly symmetric synthetic hubs (8+ interchangeable petals — the shape a
future "many-armed hub" puzzle could plausibly use) blow through the
budget and correctly report INEXACT rather than a false EXACT/distinct.
This is the honesty fix working as intended, not a new bug: before this
milestone, those same fixtures would have silently returned a
possibly-wrong EXACT/MIRRORED/distinct verdict. **Risk carried forward:**
if a future collection ships a puzzle shaped like an 8+-petal symmetric
hub, `analyze:levels` will report INEXACT and fail CI loudly — which is
correct, but the algorithm has no orbit-pruning, so it will also be slow
(multi-second). Documented here so it isn't a surprise; not fixed in this
milestone (no such puzzle exists in the shipped catalog).

### Stale "Preview" wording cleanup

Renamed the internal playtest event `"preview_used"` → `"peek_used"`
across `src/playtest/events.ts`, `src/playtest/report.ts`
(`previewUsage`→`peekUsage`, `previewCounts`→`peekCounts`,
`totalPreviews`→`totalPeeks`, the `"Preview:"` report line → `"Peek:"`),
`src/playtest/report.test.ts`, and `src/screens/GameScreen.tsx`. No
migration shim was added — this is pre-launch, no real user data exists
under the old event name (see Content Revision Policy). Renamed the
misleadingly-titled `src/feedback/controller.test.ts` test ("preview
toggle" → describes an independent side change, unrelated to Peek's
actually-silent `peekToggled` event). Updated `README.md`'s "Preview the
reverse" line to "Peek at the reverse." Left every dated milestone/QA/
research doc's historical "Preview" references untouched — they correctly
describe what Milestone 8 built and 8.1 fixed.

### Peek toolbar-interaction hardening

- Confirmed (already true, verified by reading `GameScreen.tsx`): Peek
  closes automatically on Undo, Hint, Restart, and level change (including
  next/previous-level navigation, since `peekSide` resets in the level
  effect). Exiting the level entirely unmounts the screen, so there is no
  local state to leak.
- **New:** Peek now also closes on app backgrounding. `GameScreen.tsx`
  gained an `AppState` listener that sets `peekSide` to `null` whenever the
  app leaves the `"active"` state — previously there was no such listener,
  so a backgrounded app mid-Peek would resume still peeking.
- **New test:** rapid repeated open/close toggling in `src/game/peek.test.ts`
  asserts `togglePeek` alternates cleanly across 20 calls and never gets
  stuck peeking.
- Reduced-motion-changed while peeking: no code path exists for this to
  affect Peek (Peek has no animation to begin with, confirmed in
  Milestone 8.1's own doc) — no change needed, and this remains true after
  8.2's changes.

### `PLAYING` pill fix (found live, fixed, verified live)

Milestone 8.1 fixed the two Peek pills overlapping each other. It did not
re-screenshot the fix. This milestone did, and found a **different**,
real visual bug: the `PLAYING · <side>` pill — the ground-truth status the
whole Peek design exists to keep visible — was clipped by the Peek
panel's circular boundary, nearly unreadable, on every level tested.

Root cause: the pill lived inside `PlayLayer`'s `opacity: dimmed ? 0.4 : 1`
subtree. CSS/React Native opacity below 1 creates its own stacking
context, so no `zIndex` on the pill could ever paint it above the Peek
layer sibling — an earlier same-session attempt to fix this with
`zIndex: 5` alone did not work, confirmed by re-screenshotting.

Fixed by extracting the pill into its own `SideStatusLabel` component,
rendered as a full-opacity sibling of the Peek layer in `HoopBoardView`
rather than as a descendant of the dimmed `PlayLayer`. Verified by
re-screenshotting Bark Hollow and Knot's End with Peek open before and
after the fix — see Browser proof below.

---

## Browser proof

Ran `npx expo start --web` and drove the real running app with Chrome
browser automation (`mcp__claude-in-chrome__*`). This is real UI
interaction against the actual `GameScreen`/`HoopBoard` code, not a
graph-traversal substitute.

**Note on progress shortcuts:** Collection 02 and most of its own levels
are gated behind completing earlier content. Rather than manually
solving all 10 Day & Night levels plus Root Knot/Twin Roots/Old Growth
(none of which are Milestone 8.1 repairs) to reach the seven target
levels, `localStorage`'s `flipstitch.progress.v1` was directly written
with completion records for those non-target levels — a standard,
transparent QA shortcut for the app under test itself (not a third-party
site, no credentials, no privacy concern), documented here rather than
hidden. All seven **repaired** levels below were played stitch-by-stitch
through the real UI, not shortcut.

### Real playthrough of all seven repaired levels

For each: navigated via the real collection journey (`/collection/knot-and-bramble`
→ level card → `/level/<id>`), read the accessibility tree for exact hole
state (`Hole X, valid stitch` / `not available` / `needle position`),
clicked real holes in sequence, and observed the real `GameScreen` state
machine (progress counter, side-flip color/label changes, trap/complete
panels).

| Level | Trap triggered | Undo | Restart | Peek (both dirs) | Hints 1–3 | Completed |
|---|---|---|---|---|---|---|
| Bark Hollow | yes (`h→c→d`, dead branch) | yes | yes | yes | yes | yes, 7/7 |
| Deep Taproot | attempted invalid move (`h→r` on wrong side), correctly rejected; real solution completed | n/a this pass | n/a this pass | not re-tested here (tested on Bark Hollow/Knot's End) | not re-tested here | yes, 8/8 |
| Bramble Fork | no trap exists by design (`allowDeadEnds: false`, every branch returns) | — | — | — | — | yes, 9/9 |
| Thicket Path | not separately triggered (same trap shape as Bark Hollow, already demonstrated) | — | — | — | — | yes, 8/8 |
| Twin Thorns | not separately triggered | — | — | — | — | yes, 10/10 |
| Snared Vine | not separately triggered | — | — | — | — | yes, 9/9 |
| Knot's End (capstone) | not separately triggered | — | — | yes | — | yes, 22/22 |

The trapped-thread UI ("The thread is caught — No stitch leaves this hole
on this side. Nothing is lost — step back a stitch, or start the hoop
fresh," with **Undo stitch** / **Restart** buttons) was verified once in
depth on Bark Hollow: Undo correctly returned to the pre-trap state and
allowed continuing; Restart correctly returned to 0/7. An invalid-move
attempt on Deep Taproot (clicking a hole not currently reachable on the
active side) was correctly rejected with "That line is not available on
this side" and no state change — a real, useful finding: the UI degrades
gracefully on a wrong click, it doesn't silently corrupt state.

Given the time budget for a single milestone, trap/undo/restart/Peek/hint
coverage was demonstrated in full depth on Bark Hollow and Knot's End
(the simplest and most complex of the seven) rather than repeated
identically on all seven — the remaining five were verified for correct
solving, readable geometry, and clean completion, which is the weaker but
still real claim stated in the table above.

### Hint visual verification (Bark Hollow)

All three stages read correctly against the actual rendered board:

1. **Concept** ("Two of the hub's branches return the way they came; the
   third does not") — no highlight, matches the level's `clues.concept`.
2. **Region** — a single ring highlight appeared exactly on hole H (the
   hub), matching `clues.region`'s description.
3. **Exact** — "Stitch to hole H — it keeps a full solution open," with a
   filled ring exactly on hole H.

No stale geometry, no hidden marker, no region broader than useful.

### Peek visual QA matrix

Captured and inspected:

| State | Result |
|---|---|
| Normal Front play | correct, no Peek elements rendered |
| Normal Back play | correct (Deep Taproot, Bramble Fork etc. observed mid-back-side play) |
| Peek Back while playing Front | verified (Bark Hollow, Knot's End) — dashed muted back pattern, no needle, no glow |
| Peek Front while playing Back | verified via toolbar label flip (`Peek Front` shown correctly when active side is Back) |
| Label overlap (Milestone 8.1 fix) | **re-verified live**: `PEEKING · BACK` and `Needle stays on Front` stack cleanly with no overlap, at default viewport |
| `PLAYING` pill during Peek | **found broken, fixed, re-verified live** — see fix section above |
| Peek on the dense capstone (Knot's End, 16 holes) | verified — panel remains legible, all 4 clusters' back-side pattern visible and distinct |
| Reduced-motion Peek | not independently re-tested this session (Peek has no animation code path at all per Milestone 8.1's design — confirmed by code read, not by toggling a live reduced-motion setting in this browser session) |
| Large-text Peek | **not measured** — browser zoom does not exercise the app's actual `maxFontSizeMultiplier`/OS text-scale code path, and no live device/emulator with OS text-scale was available; stated honestly rather than approximated |
| Small/S25/tablet viewport | **not reliably measured** — the browser-automation window-resize tool did not reflow the page's layout in this session (page kept desktop-width layout after a resize call); recorded as a tooling limitation, not a passed test. FlipStitch's existing `src/screens/layout.test.ts` unit-tests small-phone/large-phone/tablet breakpoints in isolation and those pass, but that is not the same as a live visual check |

### Five-second clarity test (single tester, self-administered)

**Only one tester (this session) — not a multi-person study, stated
honestly per the milestone's own instructions.**

Using the Bark Hollow and Knot's End Peek screenshots, cold (no prior
context load beyond what a first-time screenshot viewer would have):

- "Which side would your next stitch happen on?" — answered correctly
  from the `PLAYING · <side>` pill in well under five seconds on both
  screenshots, both before and after the pill-clipping fix in the *front-
  facing, not-yet-peeked* case; the *while-peeking* case was only
  reliably answerable **after** the pill-clipping fix (before the fix the
  pill's remaining visible fragment was ambiguous).
- "Where is your needle right now?" — answered correctly from the
  `Needle stays on <side>` anchor note in the Peek panel, in both cases.
- No confusion between PLAYING and PEEKING labels in either screenshot;
  the two never share a color or a location.

### Needle-anchor marker decision

**Not added.** The existing `needleAnchorNote` text plus the always-present
`PLAYING · <side>` pill (now reliably visible after the fix above) were
sufficient for the single-tester five-second test in both directions. No
tester confusion was observed that a visual anchor marker on the dimmed
play layer would have resolved. Per the milestone's instruction not to
add decoration without evidence, and given the evidence available (one
tester, one session) points at "already clear enough" rather than
"needs a marker," this is documented as a null result, not implemented.
If a future milestone gets a larger tester sample and finds needle-location
confusion, revisit.

### Finished-sampler gallery

Verified live: completing Knot's End triggered the distinct "Knot & Bramble
— finished" panel (not the ordinary "Thread complete" panel), with
**Samplers** and **Collection** actions. The `/gallery` route rendered
every completed level (both Day & Night and Knot & Bramble) as front/back
artifact pairs, replayable via a **Replay** action, using the same
non-color front/back distinction (brick-vermilion vs. deep-indigo,
labeled "Front"/"Back") used throughout the app.

### Geometry judgment (all seven repaired levels)

All seven read as legible embroidery-style motifs at default viewport:
holes visually separated (confirmed by direct pixel inspection/zoom on
the densest cluster in Knot's End), pattern lines do not visually cross
in confusing ways, front/back patterns are each readable on their own,
shared hub holes are visually identifiable without reading labels (the
hub is always the highest-degree, most-central node in each level's
layout). No coordinate changes were made — the shipped geometry passed
this visual review as-is.

### Near-duplicate and one-sided-chapter judgment

See the "Milestone 8.2 near-judgment (real play)" and
"Milestone 8.2 re-judgment (real play)" sections added to
`docs/COLLECTION-02-DESIGN.md`. Summary: both advisory `near` pairs
(Deep Taproot↔Thicket Path, Orbit Bloom↔Snared Vine) read as genuinely
distinct puzzles in play; Tangled Root's `ONE_SIDED_CHAPTER` warning
reads, in play, as the intended nested-obligation lesson rather than one
side feeling like transportation. No redesign was made to either.

---

## Android emulator proof

**Not measured.** No Android emulator was available in this environment.

## Physical-device proof

**Not measured.** No Samsung Galaxy S25 Ultra or any physical Android
device was available in this environment.

## Human usability proof

**n = 1 (this session, self-administered).** See "Five-second clarity
test" above. The milestone's original product gates —

- at least 80% of testers complete Level 1 without spoken help,
- median time to first valid stitch under 10 seconds,
- fewer than 20% exit in the first three levels,
- at least 60% start Level 4 —

are **not measured yet**. No real external tester sample exists. This is
stated directly, not implied by content quality: a good-looking, well-play-tested-by-one-developer
collection is not the same evidence as real player behavior data. This
should directly inform Prompt 9 — retention systems should not proceed on
an assumption that content-level proof equals player-behavior proof.

---

## Native tooling / build validation

### `uuid@14` override vs. real native tooling

The `package.json` `overrides` block forces `uuid@^14.0.2` across the
dependency tree, including inside `xcode` (which itself declares
`uuid: ^7.0.3`). Tested for real, not just via clean CI exports:

1. Copied the repo to a disposable workspace outside the working tree,
   ran a clean `npm ci` there (a first robocopy-based copy corrupted
   `node_modules`'s symlink structure — not a `uuid` issue, a Windows
   copy-tool artifact; a clean `npm ci` resolved it).
2. Ran `npx expo prebuild --clean --no-install` — succeeded, generated a
   real `android/` project (Windows cannot generate `ios/` — expected
   platform limitation, not a failure).
3. Directly exercised `xcode`'s actual `uuid`-dependent code path:
   `pbxProject.prototype.generateUuid()` (the exact function Expo's
   config-plugin pipeline calls when mutating a `.pbxproj` file) —
   called it directly and got a well-formed 24-character hex UUID back.
   Confirmed the resolved `uuid` module (hoisted to `uuid@14.0.2` by the
   override) exposes `v4` as a named export function, which is exactly
   what `xcode/lib/pbxProject.js:22,90` calls (`uuid.v4()`).

**Result: the override does not break native tooling.** This is a real,
positive confirmation (the exact function exercised, not just "no error
during export"), not an assumption. No mitigation change needed.

### EAS internal Android build

**Attempted, failed at the earliest possible point, recorded honestly:**
`npm run build:android:internal` runs `eas build --platform android
--profile internal`; in this environment `eas` (the EAS CLI) is not
installed, so the command fails immediately with `'eas' is not
recognized`. A separate attempt to install and authenticate `eas-cli` via
`npx eas-cli whoami` timed out, consistent with the CLI prompting for an
interactive login that this non-interactive environment cannot satisfy.
No build ID, no artifact, no build duration — none of these were
fabricated. **Not measured.**

---

## Content revision policy

New `docs/CONTENT-REVISION-POLICY.md`. Summary: coordinate/hint-copy/
cosmetic edits keep the same level ID and existing completion stays
valid; topology/solution/difficulty-via-graph-change edits require a new
level ID going forward. The seven Milestone 8.1 repairs are explicitly
grandfathered as pre-launch development history (no real users exist
yet) — not a precedent for post-launch behavior.

## Web deployment note

Added to `docs/ARCHITECTURE.md`: whichever host is eventually chosen must
serve an SPA fallback (rewrite unmatched paths to `dist/web/index.html`)
for `expo-router`'s client-side dynamic routes (`/collection/[id]`,
`/level/[id]`) to survive a hard refresh or a cold-opened shared link. No
hosting provider chosen yet — this is a requirement note, not a decision.

## Roadmap status

`docs/PRODUCT.md`'s Phase 2 entry updated: content is built and repaired
(Prompt 8 / 8.1 / 8.2), but Phase 2's actual behavioral gates are
explicitly marked "not measured yet." Phase 2 does not close, and Phase 3
does not start, until a real tester sample exists.

---

## Required automated checks — results

```
npm test                 243 tests, 243 pass, 0 fail (238 pre-existing + 5 new)
npm run typecheck         clean
npm run analyze:levels    0 unapproved exact/mirrored; 0 inexact; topology EXHAUSTIVE; 0 pacing invariant violations; 1 reviewed warning (ONE_SIDED_CHAPTER, re-judged above)
npm run bench:analyzer    informational, no regressions vs. Milestone 8.1 baseline
npm run bench:topology    new script — see benchmark table above
npm run doctor            21/21 Expo Doctor checks pass
npm run validate:audio    pass
npm run scan:analytics    pass, 0 network analytics SDKs found
npm audit                 0 vulnerabilities
npm run export:android    pass
npm run export:ios        pass
npm run export:web        pass
```

(Exact pass/fail counts and command names as actually run — see the
commit's CI run for the authoritative log.)

---

## Remaining risks

- Topology canonicalizer has no orbit-based pruning; a future puzzle
  shaped like an 8+-petal symmetric hub will correctly fail CI as
  INEXACT but will also be slow (multi-second). Not a problem for the
  current catalog; worth a real algorithm review before a puzzle design
  intentionally uses that shape.
- No component-level tests exist for `HoopBoard`/`GameScreen` — the
  `PLAYING` pill clipping bug was only caught by live screenshotting, not
  by any automated test, and nothing prevents a similar regression from
  reintroducing it silently. Out of scope for this milestone to build a
  full component test harness, but noted.
- Large-text and OS-level reduced-motion Peek behavior, and small/tablet
  viewport layout, were not reliably re-verified live this session
  (tooling limitations, not skipped intentionally) — layout unit tests
  cover the breakpoints in isolation, which is weaker evidence than a
  live screenshot.
- No real human tester sample exists. Phase 2's actual product gates are
  unmeasured.
- Android emulator, physical device, and a real EAS build artifact are
  all unmeasured — this environment has none of the three available.

## Is Phase 2 ready to close?

**No — and this document does not claim it is.** CI is green, the content
is built, repaired, and played correctly by hand. That is necessary but
not sufficient. The actual gate (real player behavior data) has not been
measured. Say so plainly, per the milestone's own instruction: **not
measured yet.**
