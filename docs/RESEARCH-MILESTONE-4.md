# Milestone 4 research: stabilization and Android device proof

Research checked on August 26, 2026. This milestone stabilizes the Milestone 3
playtest/feel work and prepares a repeatable internal Android build. Findings
below drove the implementation; rejected alternatives are recorded too.

## Stable React context and effect dependencies

- [React Hooks API reference](https://legacy.reactjs.org/docs/hooks-reference.html)
  and the widely documented context pattern confirm that a context value should
  keep a **stable identity** unless its meaning changed. Recreating a context
  object on unrelated state (like an event counter) makes every consumer see a
  new reference, which re-runs effects that list the context in their
  dependency array.
- Root cause reproduced: Milestone 3's `PlaytestProvider` recreated its value
  on every `eventCount` change; the level route's effect depended on the whole
  context object, so each `track()` produced a new reference, re-ran the
  effect, recorded `level_exited`, and looped. (Already fixed in `b501f94`;
  this milestone keeps the provider value memoized exactly once and adds
  lifecycle regression tests.)
- Decision: the playtest context exposes only stable function identities and
  derives display data (counts) on demand through `loadEvents()`. Never push
  reactive counters through context.
- Rejected: suppressing React dependency warnings, or keying the route effect
  on a subset of the context (fragile and easy to regress).

## React StrictMode-style repeated effect setup

- React's development StrictMode double-invokes effects (mount → cleanup →
  mount). The milestone asked for this to be safe.
- Decision: `LevelVisit` transitions are idempotent (at most one `level_opened`,
  at most one terminal event), and the route defers the exit by one tick so a
  StrictMode re-setup for the *same* level cancels it instead of recording a
  bogus exit. A real unmount or level change lets the deferred exit fire.

## Expo Audio lifecycle and promise/error behavior

- [Expo Audio (SDK 57)](https://docs.expo.dev/versions/latest/sdk/audio/):
  `createAudioPlayer` returns a player that must be `release()`d; playback is
  fire-and-forget but native calls can reject or throw. Expo's guidance is to
  release players and treat audio as non-critical.
- Decision: every native call goes through `safeInvoke` (catches synchronous
  throws and attaches a rejection handler to returned promises), so seek/play/
  release can never produce an unhandled rejection or block gameplay.
- Decision: delayed sounds use a `TimerSet` that tracks every pending timer
  independently; `release()` clears all of them. Rejected the previous single
  `timer` reference, which a second delayed sound would overwrite and leak.

## React Native AppState and background persistence

- [React Native AppState](https://reactnative.dev/docs/appstate) exposes
  `addEventListener("change", ...)`. Backgrounding is the last reliable moment
  before a process may be suspended or killed.
- Decision: `PlaytestProvider` subscribes to AppState and flushes buffered
  playtest events whenever the app leaves `active`, and again on provider
  teardown. The store drains *all* pending batches in order (not one batch),
  with a generation counter so a clear during in-flight writes cannot resurrect
  stale data.

## EAS internal Android APK builds

- [EAS Build configuration (eas.json)](https://docs.expo.dev/build/eas-json/)
  and [internal distribution](https://docs.expo.dev/build/internal-distribution/)
  define the profile shape: `distribution: "internal"` with
  `android.buildType: "apk"` produces a shareable APK; `distribution: "store"`
  with `buildType: "app-bundle"` produces a production AAB.
- Decision: add `eas.json` with an `internal` APK profile and a `production`
  AAB profile, plus `build:android:internal` / `build:android:production` npm
  scripts. Keep the existing package identifier (`com.jashpatel.flipstitch`).
- The delivery environment has no Android SDK, no `adb`, and no Java, so a
  local APK build is impossible here and EAS requires credentials — the exact
  handoff is in `docs/S25-ULTRA-PLAYTEST.md`.

## Android accessibility: touch targets, large text, predictive back

- [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/apps)
  recommends 48×48 dp touch targets; Apple's 44 pt floor also applies. All
  settings controls and confirmation buttons are ≥ 48 dp.
- Large font scaling is handled with `maxFontSizeMultiplier` on every settings
  text node, matching the rest of the app.
- Predictive back (`predictiveBackGestureEnabled: true` in app.json) means the
  system back gesture drives the same route exit path as the Gallery button —
  the attempt lifecycle's deferred end covers it, so back navigation records a
  single exit.
- WCAG contrast check for the armed destructive button: white text on
  `#C54F5E` (danger) measures **4.51:1**, above the 4.5:1 AA threshold for
  normal text. The previous armed state (danger text on danger fill) was
  unreadable and is fixed.

## Calm puzzle settings and first-session patterns

- Studied settings placement and destructive-action patterns in current calm
  puzzle games (Meowdoku, Old Man's Journey, Rubek from the prior milestones).
  Common patterns we kept: settings reachable from the gallery, not the
  gameplay toolbar; two-tap confirmation for destructive actions; every
  destructive action clearly labeled; nothing alarming in the armed state.
- Rejected: icon-only settings entry, single-tap destructive actions, and
  animated/flashing confirm states (visually cheap and anxiety-inducing for a
  calm game). The armed confirm is a solid danger fill with white text and a
  plain label change.

## Decisions applied

1. Attempt identity: `attemptId` on every level event; `LevelVisit` pure state
   machine guarantees one open and one terminal event per attempt; restart
   closes an attempt and starts a new one (including replay after completion).
2. Reports are attempt-based: completion rates, time to first stitch, and
   completion time use attempts; legacy version-one events (no `attemptId`) are
   reconstructed into inferred attempts and flagged in warnings.
3. Store: full drain of all pending batches, generation-guarded clear, ordering
   preserved across concurrent append/flush/snapshot/clear, background flush
   via AppState.
4. Audio: independent delayed timers, promise-safe native calls, per-sound
   throttle retained.
5. Confirmation UI: pure two-tap state machine, WCAG-AA armed contrast, timer
   cleanup on unmount, busy guard against double execution.
6. `eas.json` internal APK + production AAB profiles with npm scripts; no
   credentials or cloud build triggered automatically.

## Rejected alternatives

- Suppressing dependency warnings to "fix" the render loop (rejected).
- Pushing event counts through context (rejected; derived on demand).
- A single audio timer reference (rejected; leaks layered sounds).
- Danger-on-danger armed confirm (rejected; fails contrast).
- Single-tap destructive confirms (rejected; too easy to trigger by accident).
- Claiming a device pass without hardware (rejected; documented as blocked).

## Accessibility effects

- Armed destructive buttons keep WCAG-AA contrast and are still text-labeled
  for screen readers; busy state is announced and disabled.
- Attempt identity does not change any visible behavior; it only makes the
  local playtest report honest.
- Background flush has no visible effect and no performance cost.

## Performance risks

- Storing events with `attemptId` adds a short string per event (negligible).
- Background flush writes at most a few hundred small events once per
  backgrounding.
- No new native modules were added; `eas.json` only configures builds.
