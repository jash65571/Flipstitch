# Vertical-slice UI research

Research date: 2026-08-26

## Decisions

- Keep one large hoop as the visual anchor. Status, progress, and three tools support it.
- Teach the rule in the first prompt: “Every stitch flips the hoop.”
- Show side state with color, text, and position. Color is never the only cue.
- Make every hole target 48 by 48 points. Toolbar controls are at least 64 points tall.
- Use a 125 ms flip to the midpoint, then a short spring settle. Lock input during the swap.
- Replace the transform with an instant state swap when reduced motion is enabled.
- Keep preview read-only and label it “Looking only.”
- Use a restrained completion card instead of coins, streaks, confetti, or store prompts.
- Keep SVG for this milestone. It already delivers cloth weave, wood depth, thread highlights, and scalable hit areas.

## Platform sources

- [Expo Font](https://docs.expo.dev/versions/latest/sdk/font/) supports local TTF assets on Android, iOS, and web. Runtime loading keeps Expo Go and web previews aligned.
- [Expo SVG](https://docs.expo.dev/versions/latest/sdk/svg/) supports the current `react-native-svg` renderer across the target platforms.
- [React Native AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo) provides reduced-motion state, change events, and screen-reader announcements.
- [Apple: Design great interfaces for handheld games](https://developer.apple.com/videos/play/meet-with-apple/243/) recommends readable game text and 44 by 44 point touch targets.
- [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/apps) recommends at least 48 by 48 dp focusable touch areas.

## Puzzle interface review

- [Meowdoku on the App Store](https://apps.apple.com/us/app/meowdoku/id6761760135) centers a short logic loop, quick learning, offline play, and tactile feedback. FlipStitch keeps that focus while using a different rule, material, layout, and brand.
- [Magic Sort on Google Play](https://play.google.com/store/apps/details?id=com.grandgames.magicsort) uses clear move feedback and nearby undo help. Its boosters and meta systems are outside this milestone.

No competitor art, copy, layout, or brand element was reproduced.

## Font licensing

As of Milestone 5, FlipStitch ships **Fraunces** (editorial display) and
**Atkinson Hyperlegible Next** (UI/body), replacing Bricolage Grotesque and
Manrope. Both are distributed under the SIL Open Font License 1.1; the full
notices are stored in `assets/licenses/` and ship with the source. Package,
weight, size, cross-platform, and web-bundle verification is recorded in
`RESEARCH-MILESTONE-5.md`.

---

## Milestone 5 — The Living Sampler (visual identity + UX rebuild)

Full research, the 12-reference log, font verification, accessibility findings,
and device risks live in [`RESEARCH-MILESTONE-5.md`](./RESEARCH-MILESTONE-5.md).
The resulting system is codified in [`DESIGN-BIBLE.md`](./DESIGN-BIBLE.md); the
first difficulty pass is in [`DIFFICULTY-MATRIX.md`](./DIFFICULTY-MATRIX.md).

Headline conclusions carried into implementation:

- **Front/back as the object** (Art of Fauna, ADA 2025) — legitimises FlipStitch's
  two-sided hoop and "accessibility is a solving path" stance.
- **Reward is the artifact** (Rytmos, ADA 2024) — completion shows a finished
  sampler + seal, never confetti or coins.
- **Wordless teaching** (The Witness) + **"three reads"** (Zach Gage) — drive the
  guidance ramp (full → reduced → minimal) and the staged hint (concept → region
  → exact).
- **Invest in identity; techniques over trends** (Railbound) — reject
  glassmorphism/neon; commit to code-native SVG craft.
- **Character distinction** (Atkinson Hyperlegible Next) — chosen for dense UI
  legibility.

No competitor art, copy, layout, colour, or interaction was reproduced.
