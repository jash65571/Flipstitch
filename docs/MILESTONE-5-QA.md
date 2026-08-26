# Milestone 5 QA — The Living Sampler

## Automated gates (all green locally)

| Check | Result |
|---|---|
| `npm test` | **124 passing**, 0 failing |
| `npm run typecheck` | clean (`tsc --noEmit`) |
| `npm run doctor` | 21/21 checks passed |
| `npm run validate:audio` | all 9 sounds valid |
| `npm run scan:analytics` | no analytics SDK / ad id / fingerprint / network call |
| `npm run export:android` | bundled to `dist/android` |
| `npm run export:ios` | bundled to `dist/ios` |
| `npm run export:web` | 5 routes exported; 7 font ttf present in bundle |

New tests added this milestone: `src/game/stuck.test.ts`,
`src/game/hints.test.ts`, `src/game/guidance.test.ts`, plus palette pairs in
`src/theme/contrast.test.ts` and layout/journey cases in
`src/screens/{layout,gallery-layout}.test.ts`.

## Web-preview visual QA (method + honesty)

Captured with **Claude-in-Chrome** driving the real `expo export --platform web`
build served locally, hydrated React app (client-side routing). These are
**web-preview** screenshots, attached in the working session; they are not
committed as binaries. Deep-linking dynamic routes (`/level/[id]`) via a plain
static server 404s, so gameplay was reached by clicking through the hydrated
gallery, as a real user would.

To reach gameplay states reliably (the layout re-centres between captures, so
pixel-hunting missed), holes were clicked by their **accessibility label**
("Hole X, valid stitch") via `find` — which also demonstrates the a11y tree is
correct. Level 1 (a forced 5-stitch path) was played end-to-end.

Captured and verified rendering:

1. **Gallery (sampler journey, in progress)** — custom Wordmark (stitch mark +
   two-tone "FlipStitch"), `CHAPTER ONE` eyebrow, `Day & Night` in Fraunces, the
   continuous thread rail connecting stops, per-level stitched vignettes, the
   current stop in focus with a `✎ Begin` tag, and locked stops rendered as
   folded/dashed pattern pieces with the folded-corner + locked node mark. Woven
   progress row. Settings is the secondary spool icon.
2. **Gallery (completed state)** — all ten stops show the finished cross-stitch
   node, full-colour vignettes, and the **fully-travelled sage thread rail**;
   progress row all filled (10/10).
3. **Gameplay — front** — the header no longer repeats the side (the old
   `STITCH ON FRONT` badge is gone); side identity is the vermilion **solid**
   inner rim + the single `FRONT` woven label. Brass needle with red thread
   tail; custom Undo/Preview/Hint tool marks; guidance-full glow on level 1.
4. **Gameplay — back side after a flip** — after one stitch the hoop rim turns
   **indigo and dashed** (shape differs from the front's solid vermilion), the
   single label reads `BACK`, Undo enables, and the message is "Back side.
   Choose the next glowing hole." Confirms front/back is never colour-only.
5. **Invalid move** — clicking a wrong hole shows "That line is not available on
   this side." with the shake/haptic path.
6. **Completion reveal** — finishing level 1 renders the crafted card: the
   finished-sampler vignette with a **brass seal**, "Thread complete" in
   Fraunces, "Your first sunrise is stitched.", and Again / Gallery / Next — no
   confetti, no coins.
7. **Settings (workbox)** — `Make it yours` in Fraunces; sewing-icon section
   headers (Feel/Motion/Playtest/Progress/About); teal switches; danger-bordered
   confirm buttons. The **Reduced motion** row correctly read "on — flips swap
   instantly" because the preview environment had reduce-motion enabled,
   exercising the reduced-motion branch.

Verified by tests, not pixel-captured (the only unshot state):

- **Trapped-thread state:** logic proven by `stuck.test.ts` (strand on
  forked-needle `a,b,d,e`; undo/restart recovery; never on completion). The UI
  is an `accessibilityRole="alert"` card with Undo + Restart. It was not
  screenshotted because Forked Needle is Level 5, gated behind levels 1–4 (which
  provably cannot trap), so reaching it live is disproportionate; captured
  states 4 and 6 above exercise the same footer/card rendering machinery.

## Responsive / large-text

- The gallery is a single centred column bounded by `contentWidth`; wrapping,
  gutters, and reading measure are asserted across small Android / iPhone / S25
  Ultra / tablet / wide web at 1×/1.4×/2× font in `gallery-layout.test.ts`.
- Hoop sizing across the same devices, plus explicit S25 Ultra portrait at normal
  and large text, is asserted in `layout.test.ts` (board stays ≥320 on the tall
  S25 Ultra and never overflows).

## Honest device-testing limitation

**No physical device, emulator, or screen-reader hardware run was performed.**
VoiceOver / TalkBack semantics are implemented (roles, labels, live regions,
`accessibilityRole="alert"` on the trap state) and reasoned about, but were not
exercised on real assistive tech this milestone. Dark system-accessibility
theming was not separately validated. These are carried to Prompt 6.

## Accessibility summary

- Front/back distinguished by **shape** (solid vs dashed) + written label + rim,
  never colour alone.
- Guidance reduction dims only the **visual** glow; every valid move stays in the
  screen-reader label (`HoopBoard` a11y is independent of the glow flag).
- Staged hints keep the exact answer opt-in; trapped state announces and offers
  Undo/Restart.
- All text/control colour pairs pass WCAG AA 4.5:1 (`contrast.test.ts`).
