# Milestone 3 research: feel and playtest proof

Research checked on August 26, 2026. The goal was to inform FlipStitch's sound,
haptics, settings, and local playtest tracking — not to copy another game.

## Platform guidance (technical decisions)

- [Expo Audio (expo-audio) SDK 57](https://docs.expo.dev/versions/latest/sdk/audio/): playback uses
  `createAudioPlayer`/`useAudioPlayer`; players must be `release()`d; the
  `expo-audio` config plugin can disable microphone, recording, and background
  playback. Docs note audio stops automatically when headphones/Bluetooth
  disconnect, which the device test pass must cover. Installed with
  `npx expo install expo-audio` so the version matches SDK 57 (`~57.0.4`).
- [Expo Haptics SDK 57](https://docs.expo.dev/versions/latest/sdk/haptics/): `impactAsync`,
  `notificationAsync`, `selectionAsync`, and — on Android — `performAndroidHapticsAsync`,
  which Expo recommends over the Vibrator-based APIs because it uses the device
  haptics engine and needs no VIBRATE permission. On iOS the Taptic Engine is
  silent under Low Power Mode or if the user disabled haptics; all haptic calls
  therefore fail safely.
- [Apple: Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics):
  haptics should confirm discrete actions, be subtle, and never be the only cue.
- [Apple: Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games):
  game feedback should match the feel of the interaction; Core Haptics can pair
  audio and haptics, which supports our "one feedback controller" decision.
- [Apple: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility):
  when audio cues carry meaning (success chime, error sound), pair them with
  haptics and visible state so no sense is required alone.
- [Android accessibility principles](https://developer.android.com/guide/topics/ui/accessibility/principles):
  feedback must not rely on any single channel; haptics and audio complement
  each other. Settings must be reachable without a screen reader.

## Sound design guidance

- [GameAnalytics: 9 sound design tips](https://www.gameanalytics.com/blog/9-sound-design-tips-to-improve-your-games-audio):
  keep feedback sounds short ("KISS"), export at low volume (~9–12 dB headroom)
  so layered effects stay clear, and focus on gameplay-essential sounds only.
  FlipStitch has exactly one sound per semantic event, all under 0.5 s, with
  peaks at -6 dBFS and an even RMS band.
- [Audiokinetic: UI audio from a UI design perspective](https://www.audiokinetic.com/en/community/blog/approaching-ui-audio-ui-design-perspective-1):
  interface sounds should map to states and confirm interactions without
  narrating every pixel. We map sounds to semantic game events, not raw taps.

## Ethical offline playtest tracking

- Game telemetry that contains no personal data (no IPs, emails, usernames,
  advertising IDs, or device fingerprints) is anonymous game data and avoids
  the consent burden of personal-data analytics.
- [Ixie: ethical considerations in game analytics](https://www.ixiegaming.com/blog/ethical-considerations-in-game-analytics/)
  and [TelemetryDeck: analytics without identifiers](https://telemetrydeck.com/app-analytics-tools-you-should-know-about/)
  both describe the pattern we follow: collect only behavioral playtest events,
  keep them on-device, never identify the player, and let the player inspect,
  export, and delete everything from Settings.
- FlipStitch goes further than "no personal data": the store is bounded, local,
  exportable, and clearable, with no network request anywhere in the code path
  (enforced by `scripts/scan-analytics.mjs`).

## Observed patterns in calm puzzle games

- Meowdoku (App Store) centers one short logic loop with tactile feedback and
  offline play; FlipStitch keeps its own loop and adds feedback per action.
- Old Man's Journey and Rubek reinforce calm, pressure-free feedback: no harsh
  error stingers, no timers, gentle confirmation for success. Invalid moves in
  FlipStitch use a low, warm double-thud, never a loud buzz.
- Puzzle games that let players undo freely pair a restrained "reverse" sound
  with an equally restrained haptic. FlipStitch's undo is a quiet downward blip
  plus a selection-level haptic.

No competitor sound, visual, or layout was reproduced.

## Decisions applied

1. **One feedback controller** (`src/feedback/`): gameplay code emits semantic
   events (`stitchPlaced`, `sideChanged`, `invalidMove`, `undo`, `hint`,
   `levelCompleted`, `levelUnlocked`, `gallerySelected`); the controller maps
   them to sounds and haptics and honors Sound Off / Haptics Off.
2. **Original synthesized sounds**, generated deterministically in-repo
   (`scripts/generate-sounds.mjs`) and committed under `assets/sounds/`.
   Nine required sounds, all ≤ 0.5 s, peaks below -6 dBFS, validated by
   `scripts/validate-audio.mjs`. No background music.
3. **Platform-recommended haptics**: Android uses `performAndroidHapticsAsync`
   (haptics engine, no VIBRATE permission); iOS/web use the impact/notification/
   selection family. All calls fail safely.
4. **Haptic dedupe**: one action that triggers several state changes (stitch →
   flip, completion → unlock) fires one haptic, via per-group cooldowns.
5. **Audio preloads lazily** on first play, so nothing delays the first
   playable screen; per-sound throttling prevents overlap during rapid taps;
   `release()` cleans up on teardown.
6. **Reduced motion keeps nonvisual feedback**: haptics and sounds still fire in
   reduced-motion mode (it only removes the flip animation). This matches the
   Apple guidance to never make a single sense carry all meaning.
7. **Settings are minimal and accessible**: one Settings button on the gallery
   (never in the puzzle toolbar), text-labeled switches, reduced motion follows
   the system setting, and destructive actions use a two-tap confirm.
8. **Local, bounded playtest store** (`src/playtest/`): schema-versioned events
   with session id, sequence, timestamp, and monotonic elapsed time; capped at
   5000 events with oldest-first eviction; debounced writes; duplicate
   protection for exit/completion; readable report + raw JSON export and clear
   from Settings.
9. **CI confirmed working**: the workflow file is valid and GitHub Actions runs
   exist (latest run on `main` passed). Added `workflow_dispatch` and
   audio/analytics validation steps while keeping push-on-main and
   pull-request triggers.

## Patterns rejected

- **Background music**: out of scope; music would need mixing work and risk
  breaking the calm, and the milestone question is feel, not atmosphere.
- **A settings button in the puzzle toolbar**: rejected to keep the hoop the
  focus; settings live on the gallery only.
- **Reduced-motion as a stored toggle**: rejected; the system setting is the
  accessible default and removes a settings decision.
- **Vibrator-based haptics on Android**: rejected in favor of the haptics
  engine (`performAndroidHapticsAsync`), per Expo guidance.
- **External analytics (Firebase/Amplitude/Mixpanel)**: rejected; this milestone
  is local playtest proof with no personal data and no network.
- **Loud/harsh error sounds**: rejected; invalid moves use warm low tones.
- **One write per event to AsyncStorage**: rejected in favor of debounced
  batching so rapid tapping never saturates the storage path.

## Accessibility effects

- Sound Off and Haptics Off are independent switches; players can combine them
  freely.
- Invalid moves are communicated by sound, haptic, screen-reader announcement,
  and a visible shake (shake removed under reduced motion).
- Haptics and sounds fire under reduced motion, giving nonvisual feedback when
  the flip animation is disabled.
- Settings rows use text labels plus switches, and every destructive action
  requires a two-tap confirmation.
- Playtest data is viewable and exportable as plain text/JSON — no reading
  required to trust it.

## Performance risks

- **Audio player count**: one `AudioPlayer` per sound (nine total) — negligible
  memory, created lazily.
- **Rapid taps**: mitigated by per-sound 60 ms throttling and a guarded delayed
  layer for thread-tighten.
- **Storage writes**: debounced batching (1.5 s, 100 events max per flush);
  bounded at 5000 events (~1–2 MB worst case), oldest dropped first.
- **Haptics on Android**: uses the haptics engine, which does not add the
  VIBRATE permission and is battery-friendlier than the Vibrator.
- **Background audio**: disabled (`enableBackgroundPlayback: false`); short
  feedback sounds stop in the background, which is correct for this game.
