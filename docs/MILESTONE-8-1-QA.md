# Milestone 8.1 QA — Preview → Peek Rescue and Collection 02 Content Repair

Corrective milestone. Scope: fix Preview's contradictory mode UX (Issue B)
and repair Collection 02's exact-duplicate puzzle graphs (Issue A). No
Prompt 9 features were touched.

## Automated checks

| Command | Result |
|---|---|
| `npm test` | 238/238 passing (up from 216 pre-milestone; 22 new: 10 for `src/game/peek.ts`'s state model, 12 for `src/content/topology.ts`'s duplicate detector, plus 2 existing tests updated for the corrected content roster) |
| `npm run typecheck` | Clean |
| `npm run analyze:levels` | 20/20 levels valid, **0 invariant violations**, 1 reviewed design warning (`ONE_SIDED_CHAPTER`, carried over from Milestone 8, still judged intentional). **Topology report: 0 exact, 0 mirrored, 2 near (advisory), 0 unapproved.** |
| `npm run bench:analyzer` | Unaffected (synthetic benchmark, not content-dependent) |
| `npm run doctor` | **21/21** checks pass locally this session (Milestone 8 recorded 20/21 locally with a documented Windows/OneDrive-adjacent package-drift note; that has since cleared — see "Doctor and web export" below) |
| `npm run validate:audio` | 9/9 — unaffected, no new audio added (Peek is deliberately silent) |
| `npm run scan:analytics` | Clean |
| `npm run export:android` | Succeeded, `dist/android` |
| `npm run export:ios` | Succeeded, `dist/ios` |
| `npm run export:web` | Blocked against the tracked `dist/web` by the same Windows/OneDrive file lock Milestone 8 documented — **not a code defect**. Re-ran against an unsynced output directory and it succeeded cleanly, producing all 7 static routes. |

## Doctor and web export: local-workstation vs. repo health

Milestone 8's QA correctly distinguished "local Windows/OneDrive issue" from
"repo defect" for the web export lock, but left `expo-doctor`'s local
20/21 result stated as if it might still be a live repo issue. This
session's local `npm run doctor` run passed 21/21 without any dependency
changes beyond the `uuid` override below, so the prior package-drift note
was already stale — GitHub Actions' clean-runner result (21/21) was the
accurate signal the whole time, and the local gap has since closed on its
own (patch releases catching up). No action was needed; recorded here so a
future reader doesn't need to re-derive this.

## npm audit

**Before:** 11 moderate vulnerabilities, all tracing to one root cause:
`uuid@7.0.3` — "Missing buffer bounds check in v3/v5/v6 when `buf` is
provided" ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)),
fixed in `uuid@11.1.1+`. The dependency chain: `expo-splash-screen` →
`@expo/config-plugins` → `xcode@3.0.1` → `uuid@7.0.3`. `xcode` has no newer
stable release that bumps its `uuid` pin (only nightly prereleases exist),
and `npm audit fix`'s only offered fix was `expo-splash-screen@55.0.25` — a
semver-major Expo SDK downgrade, explicitly the kind of blind fix this
milestone was told not to apply.

**Analysis:** all 11 affected packages are Expo's own build/config tooling
(native project generation via `expo prebuild`/EAS build), not runtime code
shipped inside the app bundle — `xcode` never runs on a player's device.
The vulnerable `uuid` code path additionally requires the *caller* to pass
an explicit `buf` argument, which `xcode`'s own usage does not do based on
its public API surface, so the practical exploit relevance to FlipStitch was
already low even before a fix.

**Fix applied:** an `overrides` entry in `package.json` pins `uuid` to
`^14.0.2` (patched) across the whole dependency tree, without touching the
Expo SDK version, `xcode`, or any other package version. `uuid`'s common
no-`buf` API (`v4()`, etc.) is stable across major versions, so this is a
targeted, non-breaking fix. **`npm audit` now reports 0 vulnerabilities.**
Verified: `npm test` (238/238), `npm run typecheck`, and `npm run doctor`
(21/21) all still pass after the override.

## Part A — Preview → Peek

### Before vs. after

| | Before (Milestone 8) | After (Milestone 8.1) |
|---|---|---|
| State | `visibleSide = previewSide ?? game.activeSide` — one blended value | `game.activeSide` (real) and `peekSide` (`src/game/peek.ts`) — two structurally separate values |
| Board | Single side-swappable layer; flips to show the previewed side | Two layers: `PlayLayer` always shows `activeSide`; `PeekLayer` overlays the opposite side read-only |
| Status copy | `message` derived only from real moves — could read "Back side..." while the hoop showed FRONT | Persistent `PLAYING · <activeSide>` (never changes for Peek) plus `PEEKING · <peekSide>` only while peeking |
| Animation | Preview used `animateSwap`, the same flip-scale transform as a real stitch | Peek never calls `animateSwap`; only a real stitch flips the hoop |
| Feedback | Preview emitted `sideChanged` (hoop-flip sound + soft haptic) | New silent `peekToggled` event (no sound, no haptic) |
| Needle | Rendered at the previewed position when previewing | Peek layer never renders a needle |
| Board affordance | Same glow/tappable holes as real play | Peek layer: outline holes, no glow, no `Pressable`s at all |
| Control label | Static "Preview" / "Return" | Dynamic `Peek Front` / `Peek Back` / `Return to <side>` |
| Exit | Tap the same button again | Same, but now unambiguous — the label always names the return side |
| Accessibility | No distinct enter/exit announcement; interactive holes remained in the tree while previewing | `peekEnterAnnouncement`/`peekExitAnnouncement`; play-layer holes `accessibilityElementsHidden` + disabled while peeking; peek layer has one accessible summary node, no interactive children |
| Reduced motion | Shared code path with the real flip's reduced-motion branch | Not applicable — Peek has no animation to begin with; state and labels are identical regardless of the setting |

Full design rationale: `docs/PREVIEW-INTERACTION.md`. Research backing each
decision: `docs/RESEARCH-MILESTONE-8-1.md`.

### Human Preview/Peek confusion QA

Performed against the corrected web export
(`npx expo export --platform web`, served locally). For each frame, the
five required questions:

**Normal Front play (First Thread, opening state):**
1. Which side am I playing? → `PLAYING · FRONT` label, solid rim. Clear.
2. Which side am I inspecting? → None; no Peek UI present. Clear.
3. Can I stitch now? → Yes, two glowing holes. Clear.
4. Where is my real needle? → At the visible needle icon on the hoop. Clear.
5. How do I return? → N/A (not in a temporary state). Clear.

**Normal Back play (after one real stitch):**
1. `PLAYING · BACK`, dashed rim. Clear.
2–5. Same as above, mirrored to Back. Clear.

**Peek Front while playing Back** (screenshot captured live in this
session — see "Browser QA" below for the one defect this actually caught
and fixed):
1. Which side am I playing? → `PLAYING · BACK` pill is still visible on
   the base layer, unchanged. Clear once the overlap defect below was fixed.
2. Which side am I inspecting? → `PEEKING · FRONT` tab on the lifted panel.
   Clear.
3. Can I stitch now? → No: the peek panel's holes are outline-only with no
   glow, and status copy reads "Peek is read-only." Clear.
4. Where is my real needle? → No needle drawn anywhere on screen; the
   anchor note "Needle stays on Back" answers it in words instead. This is
   an honest tradeoff (no visual needle marker on the peek layer) — flagged
   as a remaining risk below, not silently accepted.
5. How do I return? → Toolbar button reads "Return to Back," and is
   visually active (filled/dark). Clear.

**Peek Back while playing Front:** same structure, mirrored. Not
independently screenshotted in this session (see Known Remaining Risks);
verified by code symmetry (`peek.ts`'s functions are side-symmetric, and
`peek.test.ts` asserts both directions) rather than a second live capture.

**Reduced-motion Peek, large-text Peek, trapped state after returning from
Peek:** verified by code reading (Peek has no motion-dependent path, and
`maxFontSizeMultiplier` is unaffected by Peek's new components since they
reuse the same `Text` styling conventions as the rest of the board) — **not
independently screenshotted**, a stated gap (see Known Remaining Risks).

### Five-second confusion test

Run against the one live-captured Peek screenshot (Peek Front while playing
Back, post-fix): shown cold, without prior context, the question "which
side would your next stitch happen on?" is answerable within the required
window from the `PLAYING · BACK` label alone, which remains visible and is
never contradicted by the peek panel's `PEEKING · FRONT` tab. This is a
single-rater, single-frame pass, not a multi-tester study — stated
explicitly as a scope limit, matching this milestone's available tooling
(no separate human testers were available in this environment).

### A defect this QA actually caught

The first Peek screenshot taken during this pass showed the peek panel's
"Needle stays on Back" anchor tag overlapping and partially hiding the base
layer's own "PLAYING · BACK" pill underneath it — the exact two labels this
milestone exists to keep unambiguous, colliding with each other. Fixed by
moving both Peek pills (`PEEKING · <side>` and the needle anchor note) to
stack above the panel instead of splitting one to the top and one to the
bottom (`src/components/HoopBoard.tsx`, `peekTabStack`). Re-verified via
`npm run typecheck`; a second live screenshot to confirm the fix visually
was blocked by a browser-tooling connectivity issue in this session (see
below) — the fix is code-verified but not re-screenshotted.

## Part B — Collection 02 content repair

### Topology detector

`src/content/topology.ts`: dependency-free individualization-refinement
canonical graph labeling. Correctness proven by 9 adversarial unit tests in
`src/content/topology.test.ts` (hole renaming, coordinate movement,
front/back-edge-difference sensitivity, mirrored-vs-exact distinction,
start-side/start-hole sensitivity, a genuinely distinct puzzle not being
flagged), plus 3 catalog-level tests asserting the shipped content is clean
and that the two most important repairs (Knot's End, Snared Vine) are
provably distinct from what they used to clone.

### Exact duplicates found (before repair)

Running the detector against the shipped Milestone 8 catalog found **9**
exact-topology-duplicate pairs — more than the design doc's own confession:

| Pair | Notes |
|---|---|
| `forked-needle-05` ↔ `bark-hollow-13` | Confessed in the design doc |
| `orbit-bloom-07` ↔ `deep-taproot-14` | Confessed |
| `orbit-bloom-07` ↔ `twin-thorns-18` | **Not previously documented** — Twin Thorns was also an exact clone of Orbit Bloom |
| `deep-taproot-14` ↔ `twin-thorns-18` | Consequence of the above: all three were the same graph |
| `laced-window-08` ↔ `thicket-path-17` | Confessed |
| `laced-window-08` ↔ `snared-vine-19` | Consequence |
| `thicket-path-17` ↔ `snared-vine-19` | Confessed ("Snared Vine reuses Thicket Path's exact structure") |
| `master-sampler-10` ↔ `knots-end-20` | Confessed |
| `butterfly-turn-04` ↔ `bramble-fork-16` | **Not previously documented** as an *exact* clone (design doc called it a shared "hub structure," which undersold it — it was a full isomorphism) |

Net: the ten new Collection 02 levels reduced, under the hood, to **three**
distinct graph shapes wearing ten names.

### Levels replaced

All seven flagged in the corrective brief were confirmed true exact
duplicates by the detector (none were false positives, none were spared) —
**Bark Hollow, Deep Taproot, Bramble Fork, Thicket Path, Twin Thorns,
Snared Vine, Knot's End**. Full before/after graphs, new difficulty scores,
solution counts, and design rationale: `docs/COLLECTION-02-DESIGN.md`
("The ten levels (Milestone 8.1 revision)" and "Why every level exists").

Summary of the new numbers (old → new):

| Level | Old score/tier | New score/tier | Old solutions | New solutions | Old allowDeadEnds | New allowDeadEnds |
|---|---|---|---|---|---|---|
| Bark Hollow | 39 Moderate | 55 Tricky | 1 | 2 | true | true |
| Deep Taproot | 60 Tricky | 42 Moderate | 2 | 4 | true | true |
| Bramble Fork | 31 Easy | 42 Moderate | 6 | 24 | false | false |
| Thicket Path | 64 Tricky | 57 Tricky | 2 | 2 | true | true |
| Twin Thorns | 60 Tricky | 69 Tricky | 2 | 12 | true | true |
| Snared Vine | 64 Tricky | 45 Moderate | 2 | 4 | true | true |
| Knot's End | 80 Expert | 84 Expert | 1 | 2 | true | true |

Every new level's `allowDeadEnds` matches the solver's actual
`analyzeStranding` result (`TRAP_INTENT_MISMATCH` invariant, enforced by
`npm test` and `npm run analyze:levels`) and every new level's
`expectedSolutionCount` matches the solver's exact count
(`SOLUTION_COUNT_DRIFT`/`assertValidLevel`, enforced at module import time —
a broken level fails the build, never reaches a player).

Two follow-on pacing notes were required and added
(`src/content/collections/knot-and-bramble/chapter-01-tangled-root.ts` and
`chapter-02-bramble-snare.ts`): Deep Taproot and Snared Vine both score
meaningfully below the level immediately before them in their chapter, which
is intentional (a `combine` entry recombining known ideas, not introducing
new pressure) but is only a legitimate design shape and not a build
invariant when it is deliberate — hence the reviewed `pacingNote`, exactly
the mechanism `src/content/pacing.ts` provides for this.

### Human puzzle QA (repaired levels)

Manual play-through of each repaired level's intended solution and its
`allowDeadEnds`-flagged trap branch was performed **against the puzzle
graphs directly, using the solver as referee** (`scripts/scratch-design.mjs`
during authoring — deleted after use; the same guarantees now live in
`assertValidLevel` and the test suite): every intended solution was
confirmed to be a real path the solver accepts, every declared trap branch
was confirmed to reach a genuine dead-end state, and for each level the
answer to "could I explain why I became trapped without reading the
solution?" is yes — each trap is a single, nameable wrong turn (see the
level-by-level rationale in `docs/COLLECTION-02-DESIGN.md`), matching the
"fair traps" bar Collection 01 and the original Collection 02 shipped
under.

**What this did not include:** a live, in-app play-through of all seven
repaired levels' UI (tapping through the actual `GameScreen`/`HoopBoard`
rendering, Undo, Restart, all three hint stages, and replay) — the browser
tooling instability documented below cut that pass short after the Peek
screenshots. This is a real, stated gap. The puzzles are provably solvable,
correctly trap-flagged, and their hint copy was authored against the actual
graph (not reused from the old, different puzzle), but "does the UI render
each hoop's holes at readable, non-overlapping positions" was checked by
eye against the authored coordinates, not by rendering every one.

## Browser QA

Performed against `npx expo export --platform web`, served locally
(`npx serve`), driven with `mcp__claude-in-chrome`:

- Fresh install → Day & Night → First Thread: confirmed matching Milestone 8's
  documented fresh-install state (0 of 10 stitched, correct locked/unlocked
  folio states).
- **First Thread, real stitch, Peek Front while playing Back**: captured
  live (see "A defect this QA actually caught" above) — `PLAYING · BACK`
  persists, `PEEKING · FRONT` appears alongside it (not instead of it),
  status copy reads "Peeking at Front. Your needle stays on Back. Peek is
  read-only," toolbar control reads "Return to Back" and is visually active.
- Direct deep link to a dynamic route (`/collection/day-and-night`) against
  the static file server: 404, reproducing Milestone 8's already-documented,
  already-understood static-host limitation (not a regression, not
  re-investigated further this session).

**What this session could not complete:** partway through capturing the
remaining required screenshots (Peek Back while playing Front,
reduced-motion Peek, large-text Peek, trapped-state-after-Peek, and a
pass through the seven repaired Collection 02 levels), the Chrome
extension bridge began failing to reach `localhost` dev servers
(`ERR_CONNECTION_REFUSED` inside the browser while the same servers
answered `curl` from the host shell instantly) across multiple fresh tabs
and multiple ports, while unrelated external sites loaded normally in the
same tabs — indicating a session-local browser-automation networking fault,
not an application or server defect. This is stated plainly rather than
worked around with an unverified claim: the remaining screenshots in the
required list were **not captured**. The underlying behavior they would
have shown is code-reviewed and unit-tested (`peek.test.ts` covers both
Peek directions symmetrically; reduced motion has no Peek-specific code
path to fail; hint/Undo/Restart all explicitly clear `peekSide` in
`GameScreen.tsx`), but that is not the same standard of proof as a live
screenshot, and this document does not claim it is.

## Real-device and emulator testing

**Not performed**, same as Milestone 6, 7, and 8. No Android device, iOS
device, or emulator was available in this environment. This risk carries
forward unresolved; no claim of device testing is made.

## Known remaining risks

1. **Peek's needle-position gap**: while peeking, no visual needle marker is
   drawn anywhere (the play layer's needle only shows the real position, and
   the peek layer deliberately never draws one, per the brief's "no active
   needle in Preview" instruction). The real position is communicated only
   in text ("Needle stays on Back"). This was a deliberate reading of the
   brief ("a muted pin, a thread shadow, an outline, or not at all" — this
   milestone chose "not at all" over adding a new marker style), but it is
   worth a follow-up human test to confirm text alone is sufficient before
   treating this as fully settled.
2. **Incomplete live browser QA**: as detailed above, roughly half of the
   required Preview/Peek screenshot matrix and all of the in-app repaired-level
   playtesting were blocked by a browser-tooling connectivity fault
   discovered mid-session, not completed by another method, and not
   silently skipped — the gap is stated here and the underlying claims rest
   on code review and unit tests instead.
3. **Real-device testing gap** carries forward unresolved from Milestones 6,
   7, and 8.
4. **Web static export still needs a hosting rewrite rule** for direct/deep
   navigation to dynamic routes — unchanged from Milestone 8, not
   re-investigated this session (out of this milestone's scope).
5. **The `near` topology findings** (`deep-taproot-14`/`thicket-path-17` and
   `orbit-bloom-07`/`snared-vine-19`) are advisory by design — reviewed and
   accepted as coincidental degree-signature resemblance, not silenced by
   raising the detector's threshold. If a future collection adds a level
   that trips a `near` finding against one of these, it deserves a fresh
   look, not an assumption that "near is always fine."
6. **`APPROVED_EXACT_DUPLICATES` is empty** (`src/content/duplicates.ts`) —
   correct for this milestone, but if a future level genuinely needs an
   intentional exact-topology reuse (the brief allows this "for a strong
   tutorial reason"), it must be added there explicitly with a reason, not
   worked around by disabling the check.
