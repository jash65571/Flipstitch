# FlipStitch

**One thread. Two sides. Every stitch changes everything.**

FlipStitch is a calm mobile puzzle game for Android and iOS. A player completes two patterns on opposite sides of one embroidery hoop. Every stitch pushes the needle through the cloth and forces play to continue on the other side.

## Current milestone

The **external playtest infrastructure** milestone (Prompt 9) is complete on
`main`. FlipStitch has been tested only by the people building it; this
milestone builds the way to change that, and deliberately changes nothing about
the experience being measured.

- A separate **playtest build mode** (`EXPO_PUBLIC_PLAYTEST_MODE=true`, EAS
  profile `playtest`). It runs the real game from a fresh progression, reuses
  the existing local event stream, and shows no developer or debug data during
  play. The normal consumer build is untouched: no consent screen, no test
  identity, no wrap-up UI.
- **Consent before anything is recorded.** Four plain sentences saying what is
  recorded, what is not, and that nothing is sent until the tester chooses to
  share. Declining is real — recording stays off for the whole run and the game
  is fully playable.
- An **anonymous test identity**: a random, app-scoped, resettable UUID minted
  locally. No hardware id, no advertising id, no account, nothing derived from
  the device. It answers one question — whether two shared files came from the
  same installation — so one tester who exports twice is not two testers.
- A **versioned playtest bundle** (`docs/PLAYTEST-BUNDLE-SPEC.md`) carrying the
  event stream, progress, post-test answers, and build identity — app version,
  content revision plus a derived structural fingerprint, build id, channel, and
  platform *category* only. A future bundle version is refused, never
  reinterpreted.
- A **local cohort analyzer**: `npm run playtest:cohort -- ./playtests/`. It
  validates and deduplicates bundles, joins moderator observation records,
  excludes our own QA by build channel, splits mobile from web, and computes the
  four product gates. No server, no database, no analytics SDK.
- **Uncertainty instead of checkmarks.** Every proportion carries a 95% Wilson
  interval with an adjusted-Wald cross-check; the median carries a
  distribution-free interval; zero-event samples print their rule-of-three
  bound. Gates resolve to *insufficient sample* / *promising* / *concerning* /
  *not met* / *met with meaningful evidence*, and no verdict at all is offered
  below ten testers.
- The four product gates now have **exact, locked definitions**
  (`docs/PRODUCT.md`, `docs/PLAYTEST-PROTOCOL.md`), written and tested before
  any real data existed so a denominator cannot be quietly redefined afterwards.
- Level 1 and the onboarding were **not changed**. Adding a tutorial, arrows, or
  an explanation popup before collecting a baseline would measure the fix
  instead of the design.
- New docs: `docs/RESEARCH-MILESTONE-9.md`, `docs/PLAYTEST-PROTOCOL.md`,
  `docs/PLAYTEST-TESTER-INSTRUCTIONS.md`, `docs/PLAYTEST-DATA.md`,
  `docs/PLAYTEST-BUNDLE-SPEC.md`, `docs/MILESTONE-9-QA.md`.

> **External behavioural sample: not measured yet.** No external human has
> played FlipStitch. None of the four product gates has been evaluated against
> real players, and Phase 2 does not close. See `docs/MILESTONE-9-QA.md`.

Earlier milestones also live on `main`: the second collection and the
Collection → Chapter → Level expansion with topology duplicate protection and a
state-separated Peek (Prompts 8, 8.1, 8.2), the scalable content foundation
(Prompt 7), the puzzle-depth pass and measured difficulty curve (Prompt 6), the
Living Sampler design overhaul (Prompt 5 — the visual source of truth, see
`docs/DESIGN-BIBLE.md`), the stabilization and Android device-proof pass
(Milestone 4), and the feel/playtest work (Milestone 3: original synthesized
sounds, controlled haptics, a Settings screen, and local-only playtest
instrumentation — no accounts, no ads, no network, no external analytics).

The game itself is unchanged:

- Tap a valid hole to place one stitch.
- The active side changes after every stitch.
- Peek at the reverse without moving the needle.
- Undo freely or ask a staged hint (concept → region → exact).
- Finish every marked stitch on both sides.
- Work through **20 validated handcrafted hoops** across **four chapters** in **two collections** — Day & Night and Knot & Bramble.
- Unlock, replay, and resume levels with local progress, across chapter seams.
- Reject broken content through a deterministic pure TypeScript solver, and
  broken *pacing* through a chapter pacing validator.

## Run it

Requirements: Node.js 22 or newer, npm, Android Studio or Xcode for a simulator.

```bash
npm install
npm run start
```

Then press `a` for Android or `i` for iOS. The web target is useful for quick layout checks, but device builds are the product target.

## Checks

```bash
npm test
npm run typecheck
npm run analyze:levels
npm run doctor
npm run validate:audio
npm run scan:analytics
```

`npm run check` runs tests, TypeScript, level measurement and pacing validation, Expo Doctor, audio validation, and the analytics scan in sequence. `npm run bench:analyzer` and `npm run bench:topology` report authoring-tool performance.

Playtest tooling:

```bash
npm run playtest:cohort -- ./playtests/bundles --observations ./playtests/observers.csv
npm run playtest:fixtures -- ./tmp/rehearsal   # synthetic bundles; never evidence
```

Android, iOS, and web bundles export in CI on every push to `main`. Fraunces and Atkinson Hyperlegible Next are bundled for offline use, and all sound effects are original and generated in-repo (see `assets/sounds/README.md`).

## Product rules

- The puzzle stays central. No store clutter appears during play.
- Input uses large tap targets and unlimited undo.
- Motion respects the device's reduced-motion setting; sounds and haptics keep working when it is on.
- Game rules live outside the renderer, so levels can be solved and tested without a device.
- Playtest data stays local, bounded, viewable, and clearable from Settings.
- Monetization comes after retention testing, never before the core is proven.

See [docs/PRODUCT.md](docs/PRODUCT.md) for the product plan, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical choices, [docs/CONTENT-ARCHITECTURE.md](docs/CONTENT-ARCHITECTURE.md) for the collection/chapter/level model, [docs/PROGRESSION-PACING.md](docs/PROGRESSION-PACING.md) for how difficulty is paced, [docs/PUZZLE-CURRICULUM.md](docs/PUZZLE-CURRICULUM.md) for the long-term skill map, [docs/DESIGN-BIBLE.md](docs/DESIGN-BIBLE.md) for the Living Sampler design system, [docs/LEVEL-DESIGN-GUIDE.md](docs/LEVEL-DESIGN-GUIDE.md) for how levels are authored, and [docs/DIFFICULTY-MATRIX.md](docs/DIFFICULTY-MATRIX.md) for the measured curve. Running an external playtest: [docs/PLAYTEST-PROTOCOL.md](docs/PLAYTEST-PROTOCOL.md) (the facilitator's guide), [docs/PLAYTEST-TESTER-INSTRUCTIONS.md](docs/PLAYTEST-TESTER-INSTRUCTIONS.md) (what you read to the player), [docs/PLAYTEST-DATA.md](docs/PLAYTEST-DATA.md) (what is recorded and how files are handled), and [docs/PLAYTEST-BUNDLE-SPEC.md](docs/PLAYTEST-BUNDLE-SPEC.md) (the export format).

Milestone-specific research and QA: [docs/RESEARCH-MILESTONE-9.md](docs/RESEARCH-MILESTONE-9.md) and [docs/MILESTONE-9-QA.md](docs/MILESTONE-9-QA.md) (external playtest infrastructure), [docs/COLLECTION-02-DESIGN.md](docs/COLLECTION-02-DESIGN.md) with [docs/RESEARCH-MILESTONE-8.md](docs/RESEARCH-MILESTONE-8.md), [docs/MILESTONE-8-QA.md](docs/MILESTONE-8-QA.md), [docs/RESEARCH-MILESTONE-8-1.md](docs/RESEARCH-MILESTONE-8-1.md), [docs/MILESTONE-8-1-QA.md](docs/MILESTONE-8-1-QA.md), and [docs/MILESTONE-8-2-QA.md](docs/MILESTONE-8-2-QA.md) (Collection 02 and Peek), [docs/RESEARCH-MILESTONE-7.md](docs/RESEARCH-MILESTONE-7.md) and [docs/MILESTONE-7-QA.md](docs/MILESTONE-7-QA.md) (content architecture), [docs/RESEARCH-MILESTONE-6.md](docs/RESEARCH-MILESTONE-6.md) and [docs/MILESTONE-6-QA.md](docs/MILESTONE-6-QA.md) (puzzle depth), [docs/RESEARCH-MILESTONE-5.md](docs/RESEARCH-MILESTONE-5.md) and [docs/MILESTONE-5-QA.md](docs/MILESTONE-5-QA.md) (design overhaul), and [docs/RESEARCH-MILESTONE-4.md](docs/RESEARCH-MILESTONE-4.md) with [docs/MILESTONE-4-QA.md](docs/MILESTONE-4-QA.md) (stabilization).

Earlier research and test matrices: [docs/RESEARCH-MILESTONE-3.md](docs/RESEARCH-MILESTONE-3.md), [docs/MILESTONE-3-QA.md](docs/MILESTONE-3-QA.md), [docs/UI_RESEARCH.md](docs/UI_RESEARCH.md), [docs/RESEARCH-MILESTONE-2.md](docs/RESEARCH-MILESTONE-2.md), [docs/VERTICAL_SLICE_QA.md](docs/VERTICAL_SLICE_QA.md), and [docs/MILESTONE-2-QA.md](docs/MILESTONE-2-QA.md). Real-device instructions for the Samsung Galaxy S25 Ultra (including the EAS internal-APK handoff) are in [docs/S25-ULTRA-PLAYTEST.md](docs/S25-ULTRA-PLAYTEST.md).
