# Milestone 10 QA — Needle, Through-Cloth Peek

This document separates what was actually verified, and how, from what
was not. Environment constraint stated up front, matching
`docs/MILESTONE-8-2-QA.md`'s own honesty rule: this session had **no EAS
login, no Android emulator, no iOS simulator, and no physical device.**
Those items are reported as **not measured**, not simulated. What *was*
available and used: the full automated test/lint/export pipeline, and a
real `expo start --web` session driven through a real Chromium browser
(Claude in Chrome), with real screenshots below.

---

## Automated proof

All commands below were actually run this session, in this environment.

| Command | Result |
|---|---|
| `npm test` | **334 / 334 pass** (327 pre-existing + 7 new in `boardGeometry.test.ts`) |
| `npm run typecheck` | Clean, 0 errors. (A stale, gitignored local `.expo/types` cache initially produced 2 unrelated errors in `CollectionLibraryScreen.tsx`/`SettingsScreen.tsx` about the Prompt 9 `/playtest/wrapup` route; confirmed pre-existing on `main` via `git stash`, and confirmed to not reproduce on a clean checkout with `.expo` deleted. Not a regression from this milestone.) |
| `npm run analyze:levels` | 0 invariant violations, 1 pre-existing design warning (`ONE_SIDED_CHAPTER`, unchanged from before this milestone — no level content or topology was touched). |
| `npm run bench:analyzer` | Runs clean, all synthetic counts exact. Informational, non-gating. |
| `npm run bench:topology` | Runs clean; same pre-existing budget-exhaustion rows as before (informational, not a build failure, unrelated to this milestone's changes). |
| `npm run doctor` | 21 / 21 checks passed. |
| `npm run validate:audio` | 9 / 9 required sounds validated. No new sounds were added — Goal 13 ("use existing assets") was followed; `needle-pierce`, `thread-tighten`, `hoop-flip` timing/sequencing was left as-is. |
| `npm run scan:analytics` | No analytics SDK, ad id, fingerprint, or network call found. |
| `npm audit` | 0 vulnerabilities. |
| `npm run export:android` / `export:ios` / `export:web` | All three succeeded. Local note: the default `dist/android`, `dist/ios`, `dist/web` output paths were transiently locked by the Windows sandbox this session ran in (empty directories Windows refused to delete, reproducible even via `robocopy /MIR` and `Remove-Item -Force`) — this is a local environment artifact, not an app or build issue. Worked around by exporting to `dist/*_export` instead; all three bundlers completed with 0 errors, correct route lists (including `/playtest/wrapup`), and correct asset manifests. `dist/` is gitignored either way, so nothing here affects the commit. |
| Prompt 9 playtest rehearsal (`playtest:fixtures` + `playtest:cohort`) | Ran clean: 17 synthetic bundles generated (including a corrupt file, a future version, a duplicate, and a developer-channel bundle), analyzer accepted/rejected them correctly, ledger and gate output printed normally. Confirms Prompt 9 infrastructure is untouched and still works. |

GitHub Actions on the final pushed commit is the authoritative confirmation
of all of the above on a clean Ubuntu runner — see the commit note at the
end of this document for the run link/status once pushed.

---

## Real browser QA (expo web + Chromium, this session)

This is genuine evidence, not a description of intended behavior: `expo
start --web` was run locally and driven through an actual Chromium browser
via the Claude-in-Chrome tools, clicking real buttons and reading real
rendered pixels.

### First Thread (level 1), initial state

Needle rests at the start hole with its tip exactly on the hole's puncture
ring, thread visibly running from the hole, alongside the shaft, through
the eye. This directly replaces the old fixed-pose, position-only inline
needle — the ring plus the thread's continuous path together answer "did
this needle just arrive here" without any text.

### First stitch (Front → Back)

Tapped the left hole. The result: the board flipped to **BACK** (dashed
tension ring, indigo palette), the `PLAYING · BACK` pill updated
correctly, and the needle reappeared exactly on the mirrored destination
hole — its shaft oriented back along the vector of the stitch just placed,
not at a fixed angle. This is the needle-pose rule
(`needlePoseFor`) working as designed, observed live, not just asserted in
a unit test.

### Through-Cloth Peek (peeking Front while playing Back)

Tapped "Peek Front." Result, read directly off the screenshot:

- **Same hoop, same bounds, no second frame.** The wood ring, clamp, and
  cloth circle are pixel-identical to the live view — nothing moved,
  resized, or appeared as a floating panel.
- **Holes align exactly.** The two holes visible in this simple level sit
  at the identical screen coordinates they occupied when that side was
  actually being played, confirming the alignment invariant
  (`boardGeometry.test.ts`) visually, not just algebraically.
- **Completed stitch reads strongly.** The one front stitch already placed
  renders as a solid vermilion line — clearly "already done" — while the
  remaining front route renders as a soft dashed guide. This directly
  answers Goal 19 ("Peek must show meaningful thread state"); the earlier
  floating panel treated every opposite-side line identically.
- **The real needle stays visible**, anchored on Back, above the
  translucent overlay — visible proof of Goal 20.
- **One secondary label**: `SEEING FRONT THROUGH CLOTH`, alongside the
  permanent `PLAYING · BACK` pill. No `PEEKING · <side>` / `Needle stays
  on <side>` two-pill stack.
- **Button reads `Close Peek`**, not `Return to Front` — confirmed by
  clicking it and reading the resulting announcement text live: *"Peek
  closed. Continue stitching on Back."* — matching the updated
  `peekExitAnnouncement` copy exactly.

### Second stitch (Back → Front)

Closed Peek, tapped the remaining hole. Board correctly flipped to
**FRONT**, progress advanced to 2/4, and the needle's shaft visibly
pointed back along the just-placed stitch line — again live confirmation
of the pose rule, not just a unit test.

**What this real session did *not* reach**, stated honestly: a denser
level's Peek (e.g. Master Sampler, Knot's End) with many completed
stitches on both sides — later levels were still locked by normal
progression within this session's play, and reaching them would have
required completing multiple full levels first. First Thread's Peek
screenshot above already demonstrates the "not blank, shows real state"
property directly (one completed + one remaining edge), but a denser
board was not captured. The trapped-thread state was also not manually
reached this session.

---

## Five-second comprehension test — honestly reported as author self-assessment, N = 0 external testers

Per this milestone's own instruction ("do not recruit the real gate
cohort yet"), no external tester was used. The five questions below are
answered against the actual rendered screenshots captured above, by the
author, not by an independent viewer — reported as such, not dressed up as
user research:

1. *Which side are you currently playing?* — Answerable from the
   `PLAYING · BACK` pill, present and unobscured in every Peek screenshot.
2. *Which side are you looking at?* — Answerable from `SEEING FRONT
   THROUGH CLOTH`.
3. *Where is your needle?* — Visible directly: it never disappeared in any
   captured frame, peeking or not.
4. *Can you stitch while this view is open?* — The board's holes render
   with no glow/hint ring while peeking, and `Close Peek` is the only
   active-looking control; this was not tested against an actual tap
   attempt into a hole during Peek in this session (the code path
   (`interactionDisabled`/`TouchLayer` disabling) is unit-covered by
   `peek.test.ts`'s non-interactivity expectations, not re-verified by a
   live click this session).
5. *Does the reverse pattern line up with the current fabric?* — Directly
   observable: the two holes in the Peek screenshot sit at the same pixel
   coordinates as the live layer's own holes.

## Needle comprehension test — same honesty caveat

Author self-assessment against the "before stitch → after stitch"
screenshot pair captured above: the needle's shaft, after the first
stitch, visibly points back along the line just stitched, and its tip
sits exactly on the new current hole with a puncture ring around it. Read
naturally as "the needle went through the fabric at that hole," not
"teleported." No external tester confirmed this; N = 0, stated plainly
per this milestone's own QA standard.

---

## Manual level play

**Played this session (real, via browser):** First Thread — start,
stitch 1 (Front→Back), Peek Front, close Peek, stitch 2 (Back→Front).

**Not played this session, stated honestly:** Forked Needle, Orbit Bloom,
Master Sampler, Bark Hollow, Twin Thorns, Knot's End — the prompt's
suggested representative set. Reaching most of these requires finishing
earlier levels first (normal progression), which this session's time
budget did not cover after the redesign, automated checks, and documented
QA above. The **pure-logic correctness** for every one of these levels
(and all 20 production levels) *is* covered exactly, not approximately, by
`boardGeometry.test.ts`'s alignment and needle-anchor invariant tests,
which walk each level's authored solution end to end. What is *not*
covered by that: the live visual read of a dense, many-stitch board while
peeking, which is a genuinely different question from "is the math
correct" and is the one honest gap in this milestone's QA.

**Not attempted at all this session:** Undo mid-animation screenshot (the
motion is transient; its correctness is covered by the same needle-anchor
tests plus code review of `NeedleLayer`'s effect, not a live capture),
trapped-thread state, completion screen with the new needle, reduced
motion (no live OS-level toggle attempted), large text, phone/tablet
device-size screenshots, real Android/iOS device or emulator.

---

## Unresolved risks

- **Dense-board Peek legibility is asserted geometrically, not eyeballed.**
  The alignment math is proven exact for every hole of every level, but
  whether a 15-22-hole board's Peek overlay reads as "not blank" rather
  than "visually busy" at that density was not checked by eye this
  session — First Thread (4 holes) clearly reads well; Knot's End (22
  holes, the collection capstone) is the real stress case and is
  unverified.
- **Reduced motion is code-reviewed, not observed.** The `reduceMotion`
  branch in `NeedleLayer` was read and reasoned through, and is structurally
  identical to the existing, already-tested `animateSwap` reduced-motion
  branch, but no OS-level reduced-motion toggle was exercised live this
  session.
- **No device/emulator QA**, matching the same honest gap Milestone 8.2
  reported. Battery/heat/perf on low-end Android is unverified.
- **Zero external playtesters.** All comprehension-test results above are
  author self-assessment, explicitly labeled as such.
