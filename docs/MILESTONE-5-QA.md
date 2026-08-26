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

Captured and verified rendering:

1. **Gallery (sampler journey)** — custom Wordmark (stitch mark + two-tone
   "FlipStitch"), `CHAPTER ONE` eyebrow, `Day & Night` in Fraunces, the
   continuous thread rail connecting stops, per-level stitched vignettes, the
   current stop ("First Thread") in focus with a `✎ Begin` tag, and locked stops
   rendered as folded/dashed pattern pieces with the folded-corner + locked
   node mark. Woven progress row (0/10). Settings is the secondary spool icon.
2. **Gameplay — front** — the header no longer repeats the side (the old
   `STITCH ON FRONT` badge is gone); side identity is the vermilion **solid**
   inner rim + the single `FRONT` woven label. Brass needle with red thread
   tail; custom Undo/Preview/Hint tool marks; guidance-full glow on level 1.
3. **Invalid move** — clicking a wrong hole shows "That line is not available on
   this side." with the shake/haptic path.
4. **Settings (workbox)** — `Make it yours` in Fraunces; sewing-icon section
   headers (Feel/Motion/Playtest/Progress/About); teal switches; danger-bordered
   confirm buttons. The **Reduced motion** row correctly read "on — flips swap
   instantly" because the test environment had reduce-motion enabled, exercising
   the reduced-motion branch.

Verified by tests + SSR rather than pixel-captured (static-server routing +
animation-driven capture timeouts made these flaky to screenshot cleanly):

- **Gameplay — back side after a flip:** the flip commit, side swap, and dashed
  back-rim identity are covered by `engine.test.ts` / `content-flow.test.ts`;
  the back-side render path is the same component branch as the (captured) front.
- **Trapped-thread state:** logic proven by `stuck.test.ts` (strand on
  forked-needle `a,b,d,e`; undo/restart recovery; never on completion). The UI
  is an `accessibilityRole="alert"` card with Undo + Restart.
- **Completion reveal:** the finished front+back sampler + brass seal renders
  from the same `LevelThumbnail` proven in the gallery; reduced-motion shows it
  without animation.

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
