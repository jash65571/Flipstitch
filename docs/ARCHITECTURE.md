# Technical foundation

## Stack decision

FlipStitch uses Expo SDK 57, React Native, TypeScript, and npm.

This is a strong fit because the game is a focused 2D touch puzzle. It also keeps Android and iOS in one codebase. npm avoids adding another package manager requirement for Windows contributors.

The current board uses SVG for fast iteration. The production-slice audit kept SVG because gradients, weave patterns, thread highlights, a visible needle, and smooth transforms all fit the current renderer. Skia would add binary and maintenance cost without a measured gain on this level. The rule engine has no React Native imports, so a later renderer change still does not affect level rules.

## Boundaries

```text
app/                  Routes and screen entry points
src/screens/          Screen composition and input flow
src/components/       Renderers and reusable controls
src/game/             Pure rules, level data, solver-ready types
src/progress/         Versioned local progress model and storage boundary
src/theme/            Color, spacing, radius, and type tokens
```

## Level model

A level is an alternating-edge trail across one set of physical holes. Each required edge belongs to the front or back. A valid stitch:

1. Starts at the needle's current hole.
2. Uses an unfinished edge on the active side.
3. Ends at another physical hole.
4. Moves play to the opposite side.

That model gives us deterministic validation, hints, undo, replay, and future procedural generation.

## Solver and validation

`src/game/solver.ts` performs depth-first enumeration over unused, side-labeled edges. Solver state contains only the current hole, active side, used edge keys, and path. It has no React Native, Expo, SVG, or storage imports.

Validation rejects missing holes, self-loops, same-side duplicate edges, wrong solution starts, broken side alternation, edge reuse, incomplete authored paths, unsolvable graphs, and unexpected solution counts. Levels marked unique must produce exactly one full trail. Levels that teach recovery declare whether dead-end branches are intended, so accidental traps fail authoring checks while planned backtracking remains measurable.

## Local progression

`src/progress/model.ts` is a pure, versioned progress reducer. It stores completed level IDs, best move counts, and the last played level. `ProgressProvider` is the only Async Storage boundary. Corrupt or stale data falls back to a fresh state, and storage failure never blocks offline play.

Unlocking is linear and derived from contiguous completed levels. A completion unlocks the next hoop, every prior hoop remains replayable, and the gallery resumes at the last useful unlocked level.

## Planned engineering gates

1. Prove the core interaction on real iOS and Android devices.
2. Add a solver that rejects impossible or multi-solution levels.
3. Add persisted progress and analytics behind small interfaces.
4. Add audio, richer haptics, and Skia rendering after mechanic validation.
5. Add purchases and ads only after retention data supports them.

## Quality rules

- Pure game rules require unit tests.
- Every level must pass the solver and a schema check.
- A replay seed must reproduce any reported puzzle failure.
- Keep the first playable frame fast and work offline.
- Test small phones, tablets, safe areas, large text, reduced motion, and screen readers.
- Profile frame time, memory, heat, and battery before soft launch.

## Vertical-slice runtime choices

- Fonts load from local package assets through `expo-font`; no network request is required.
- The side swap locks board input until its midpoint and settle animation finish.
- Reduced motion commits the same state change with no transform animation.
- Small-phone, large-phone, large-text, phone-landscape, and tablet-landscape layout rules are pure and unit tested.
- Android, iOS, and web export checks run before delivery.
