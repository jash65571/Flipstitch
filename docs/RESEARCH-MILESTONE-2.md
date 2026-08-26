# Milestone 2 research: content proof

Research checked on August 26, 2026. The goal was to inform FlipStitch, not copy another game.

## Platform guidance

- [Expo SDK 57 reference](https://docs.expo.dev/versions/latest/) pairs SDK 57 with React Native 0.86, React 19.2.3, and Node 22.13 or newer. The project stays on that supported set and uses Expo-compatible packages.
- [Expo Async Storage guidance](https://docs.expo.dev/versions/latest/sdk/async-storage/) recommends `@react-native-async-storage/async-storage` 2.2.0 for asynchronous, unencrypted, persistent key-value data. Progress contains no secrets, so this is the right local store. Reads fail safely to fresh progress, and play remains available if a write fails.
- [React Native accessibility guidance](https://reactnative.dev/docs/accessibility) calls for useful labels, roles, state, values, and platform screen-reader testing. Level cards state their number, title, difficulty, and lock or completion state. Game changes use polite announcements and a progress value.
- [Apple guidance for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) favors touch controls suited to iPhone and iPad. The hoop remains the largest object, navigation stays secondary, and the three play tools remain within thumb reach.
- [Material 3 icon-button guidance](https://m3.material.io/components/icon-buttons/accessibility) requires at least a 48 dp touch target. Hoop holes, navigation controls, gallery cards, and completion actions meet or exceed 48 points/dp.

## Puzzle interface and progression scan

- [Old Man's Journey](https://apps.apple.com/us/app/old-mans-journey/id1634426493) presents handcrafted, pressure-free puzzles through a strong visual world. This supports FlipStitch's calm pace and visual reward without timers or lives.
- [Rubek](https://apps.apple.com/us/app/rubek/id1120181386) pairs a minimal interface with handcrafted levels and color-blind support. FlipStitch also communicates state through text, shape, and side labels, not thread color alone.
- [Arrow Puzzle](https://play.google.com/store/apps/details?id=com.easybrain.arrow.puzzle.game) uses gradually harder handcrafted levels, hints, clear board progress, no timer, and restrained visuals. FlipStitch keeps those useful patterns while avoiding its maze and live-event systems.
- [The Player's Progress](https://www.gamedeveloper.com/design/the-player-s-progress-designing-levels-for-mobile-puzzle-games) separates visible board change from goal progress. FlipStitch shows both: thread accumulates directly on the hoop, while a small stitch counter tracks the full two-sided goal.

## Decisions applied

1. Use a compact crafted-hoop gallery, not a winding map or reward-heavy home screen.
2. Put one clear Continue card above the gallery and persist the last useful level.
3. Show difficulty with words. Never rely on color or tiny symbols alone.
4. Lock levels in a linear sequence, but keep replay and prior levels open.
5. Make completion reveal the authored message, replay, gallery, and next-level actions.
6. Let level logic create difficulty through branches, loops, shared holes, and recovery.
7. Keep Undo, Preview, and Hint as the only play tools.
