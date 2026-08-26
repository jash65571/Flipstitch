# FlipStitch product foundation

## Product promise

FlipStitch turns embroidery into a spatial logic puzzle. One continuous thread must complete two different patterns. Each placed stitch moves the needle to the other side.

The rule must be understood within five seconds: **every stitch forces you to play the other side.**

## Audience

The first audience is mobile puzzle players who want short, calm sessions. The tone is warm and tactile, not loud or toy-like. The game must work without reading, timers, lives, or exact dragging.

## First proof

We start with one polished level, not a large menu. It must prove five things:

1. Players always know which side is active.
2. The flip feels rewarding without slowing play.
3. A wrong choice is understood without a tutorial wall.
4. Undo and preview remove fear from experimentation.
5. Completing both sides creates a strong reveal.

## Visual direction

The **Living Sampler** is the visual source of truth (see `docs/DESIGN-BIBLE.md`; the Prompt 5 overhaul made it current). In brief:

- Warm paper and dyed fabric grounds, a large wood hoop with brass fittings.
- Brick-vermilion thread on the front and deep-indigo thread on the back, distinguished by shape and written labels, never by hue alone.
- Fraunces for titles and the completion reveal; Atkinson Hyperlegible Next for controls, state, and instructions.
- Large touch targets around small visual holes; restrained brass/ochre and sage accents.
- Both font families are bundled for offline use under the SIL Open Font License.

The puzzle takes most of the screen. The only play controls are Undo, Preview, and Hint. Reduced motion replaces the flip with an instant side swap.

## Growth path

### Phase 1: mechanic proof

- One clear tutorial level.
- Nine harder handcrafted levels.
- Local progress only.
- Event logging for move, invalid move, undo, hint, restart, completion, and session exit.

### Phase 1.5: feel and playtest proof (complete)

- Original synthesized sound effects for every action, generated in-repo.
- One feedback controller that maps semantic events to sound and haptics and
  honors Sound Off and Haptics Off.
- A minimal Settings screen: sound, haptics, reduced-motion status, playtest
  data view/export/clear, progress reset, and about/license info.
- Local, bounded playtest events with session, sequence, timestamp, and
  monotonic elapsed time. No accounts, ads, network, or external analytics.
- A pure playtest report engine with small-sample warnings, exported from
  Settings.

### Phase 1.6: stabilization and Android device proof (current)

- Attempt identity on every level event: restarts, replays, exits, and
  completions are distinct, reported per attempt, and honest about legacy
  Milestone 3 data.
- Hardened storage (full batch drains, background flush, safe clear), hardened
  audio (independent delayed timers, promise-safe playback), and WCAG-AA
  destructive confirmations.
- A repeatable internal Android APK build profile (`eas.json`) so the S25
  Ultra device pass can be run from any machine with an Expo account.

### Phase 2: content proof

- 20-level Day & Night collection.
- Level validator and solver.
- Completion gallery with both sides.
- Daily Double Take puzzle.

### Phase 3: retention proof

- Weekly collections.
- Forgiving streak with one missed day.
- Cosmetic thread and needle styles.
- Share card showing both completed patterns.

### Phase 4: business proof

- Soft launch in a small English-speaking market.
- Test retention before paid user growth.
- No forced ad during the first 20 levels.
- Later ads appear after several wins, never after failure.
- Offer an ad-free purchase and cosmetic packs.

## Measures

The prototype gate is behavioral, not opinion-based:

- At least 80% of testers complete the first level without spoken help.
- Median time to the first valid stitch stays under 10 seconds.
- Fewer than 20% exit during the first three levels.
- At least 60% choose to start level four.

Feel gates for the playtest milestone:

- Sound Off and Haptics Off each leave the game fully playable.
- Reduced motion keeps clear nonvisual feedback (sounds and haptics).
- Invalid moves feel distinct but never harsh.
- The playtest report shows honest small-sample warnings instead of
  pretending data exists.

These are early decision gates. Launch targets will be set after real test data exists.

## Content proof collection

The first collection is ten handcrafted Day & Night hoops. It grows one reasoning skill at a time:

1. First Thread and Kite Tail teach the flip from both starting sides — each with one safe, visible choice so the tutorial is never autoplay.
2. Twin Petals and Butterfly Turn show that some choices are equally safe, and introduce shared holes (figure-8 center, hub).
3. Forked Needle and Echo Stairs introduce branches that reward Undo and planning — the first genuine traps.
4. Orbit Bloom and Laced Window use shared holes, alternating loops, and runners that never return — genuinely trap-capable planning levels.
5. Moonlit Return and Master Sampler require closing short returns before moving onward, ending in a dense multi-loop capstone.

The curve is measured and strictly rising (see `docs/DIFFICULTY-MATRIX.md`); the analyzer in `src/game/analyzer.ts` and the regression tests in `src/game/difficulty.test.ts` keep it that way. Difficulty comes from path planning. It never comes from timers, lives, hidden rules, or smaller touch targets. The collection gallery shows a mini hoop, a written difficulty, clear lock state, best completion, and one direct Continue action.

## Non-negotiable rules

- No limited lives.
- Unlimited undo.
- No pay-to-solve pressure.
- No copied level art or close competitor skin.
- UI and store research happens before each major feature set.
- Accessibility, battery use, device heat, and low-end Android performance are release checks.
