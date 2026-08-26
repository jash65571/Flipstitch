# Milestone 4 QA evidence

Checked on August 26, 2026 on top of Milestone 3 head `9f192c5`.

## Issues reproduced

| # | Issue | Reproduced? | Root cause | Fix |
| --- | --- | --- | --- | --- |
| 1 | Render/effect loop from `eventCount` recreating the playtest context | Yes (code audit; already fixed in `b501f94`) | Context value identity changed with display state; route effect depended on the whole context object | Provider value memoized exactly once; counts derived on demand; `LevelVisit` lifecycle made idempotent and regression-tested |
| 2 | Playtest data cannot distinguish attempts, restarts, replays | Yes | No attempt identity on events; raw opens vs deduplicated completions | `attemptId` on every level event; pure `LevelVisit` state machine; attempt-based report |
| 3 | `PlaytestEventStore.flush()` drains only one batch | Yes | `splice(0, maxBatch)` executed once per flush | `flush()` loops until all pending batches are drained in order |
| 4 | Delayed audio uses one timer reference | Yes | Single `timer` variable overwritten by later delayed sounds | `TimerSet` tracks every timer; `release()` clears all |
| 5 | Promise rejection safety around audio seek/play/release | Verified by inspection | No rejection handler on native calls | `safeInvoke` catches throws and attaches rejection handlers |
| 6 | Armed destructive button: danger text on danger fill | Yes | `confirmButtonArmed` filled danger while text stayed danger | White text on danger fill: measured **4.51:1** (WCAG AA ≥ 4.5); busy state disables and announces |
| 7 | Confirmation timers not cleaned up on unmount | Yes | `setTimeout` in the press handler with no cleanup | Effect-owned timer with cleanup; pure state machine |
| 8 | Stale pre-push CI wording in `MILESTONE-3-QA.md` | Yes | Doc written before the push run completed | Updated to reference successful run 32995533029 on `9f192c5` |
| 9 | No `eas.json` / repeatable internal APK profile | Yes | Missing | Added `internal` (APK) and `production` (AAB) profiles + npm scripts |
| 10 | S25 Ultra checklist unexecuted | Yes (no device/Android tooling) | Hardware/credential blocked | Exact EAS + adb handoff in `docs/S25-ULTRA-PLAYTEST.md` |

## Attempt lifecycle definition

An **attempt** is one play-through of one level.

1. **Starts** when a level is opened (`level_opened`) or when the player
   restarts (`restart_used` closes the old attempt; the new attempt begins with
   the next event carrying its id).
2. **Ends** with exactly one terminal event: `level_completed` (success),
   `level_exited` (left unfinished), or `restart_used` (abandoned or replayed).
3. Every level event carries the `attemptId`; reports group stitches, invalid
   moves, and tool use per attempt.

Replays after completion start a fresh attempt; the completed attempt stays
recorded as completed. Version-one legacy events without `attemptId` are
reconstructed into inferred attempts and flagged in report warnings — never
crashed on and never treated as precise.

## Tests added (16 new, suite now 99)

- `src/playtest/attempt.test.ts` (8): exactly one open per visit; completion
  never yields an exit; one exit when unfinished; restart boundaries; replay
  after completion; StrictMode-style repeated setup.
- `src/playtest/store.test.ts` (+5): multi-batch flush drains all in order;
  background flush persists pending events; clear during in-flight writes;
  appends during flush stay ordered; legacy events readable.
- `src/playtest/report.test.ts` (rewritten, 14): attempt-based completion
  rates, time to first stitch, completion time, exit rate; replay/restart do
  not corrupt earlier attempts; legacy inference + warning; small-sample
  warnings by attempt.
- `src/feedback/timers.test.ts` (3): independent timer firing; clearAll
  cancels everything; timers scheduled after clearAll still work.
- `src/settings/confirm.test.ts` (5): arm → confirm → busy; busy ignores
  presses (no double execution); finished resets; expiry never interrupts
  busy work.

## Verification results (exact commands)

| Command | Result |
| --- | --- |
| `npm ci` | Pass |
| `npm test` | 99/99 pass |
| `npm run typecheck` | Pass |
| `npm run doctor` | 21/21 checks pass |
| `npm run validate:audio` | 9/9 sounds valid |
| `npm run scan:analytics` | Clean |
| `npm run export:android` | Pass |
| `npm run export:ios` | Pass |
| `npm run export:web` | Pass (5 routes incl. `/settings`) |

## Android build artifact status

**Not built locally**: the delivery environment has no Android SDK, no `adb`,
and no Java, and EAS requires credentials. A repeatable internal-distribution
APK is one command away on a machine with an Expo account:

```bash
npm run build:android:internal   # eas build --platform android --profile internal
npx eas-cli build:run --platform android   # installs to a connected device
```

Package identifier stays `com.jashpatel.flipstitch`.

## Real-device status (Samsung Galaxy S25 Ultra)

**Blocked, not claimed.** No device, emulator, or Android tooling is available
in this environment. The full runbook (15 steps: speaker sound, haptics,
Sound/Haptics Off, reduced motion, background/resume, kill-and-reopen, rapid
taps during flip, headphone connect/disconnect, back navigation, TalkBack,
frame/memory/heat/battery, screenshots) is in `docs/S25-ULTRA-PLAYTEST.md` and
must be executed on hardware.

## Remaining risks

- Haptics intensity, real speaker quality, and TalkBack focus order are
  unverified on hardware.
- EAS internal builds require an Expo account and a few minutes of cloud build
  time on first run.
- Legacy playtest data from Milestone 3 builds is reported with inferred
  attempt boundaries (flagged), not precise attempt metrics.
- `npm audit` still reports 11 moderate dev-dependency advisories (pre-existing).
