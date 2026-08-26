# Samsung Galaxy S25 Ultra playtest runbook

Target: **Samsung Galaxy S25 Ultra** (Android 15/16, One UI). Host: **Windows**.
This runbook is written so anyone with the phone and a USB cable can execute the
Milestone 3 real-device pass exactly.

> Status: **not yet executed**. The milestone delivery environment has no
> attached device or emulator, so this pass must be run by hand. Do not claim
> real-device results until the checklist below is completed on hardware.

## 1. Prerequisites

- Windows with Node.js 22+, npm, and Android Studio (for USB debugging tools).
- Galaxy S25 Ultra with Developer Options enabled:
  Settings → About phone → Software information → tap **Build number** 7 times.
- Turn on **USB debugging**: Settings → Developer options → USB debugging.
- A USB-C cable that supports data.

## 2. Prepare the build

```bash
npm ci
npm run typecheck
npm test
npm run doctor
```

Then build a development or production APK with Expo:

```bash
npx expo run:android
```

or a production release:

```bash
npx expo prebuild --platform android
cd android && gradlew.bat assembleRelease
```

## 3. Install and launch

1. Connect the phone. Authorize the "Allow USB debugging" prompt.
2. Install the APK: `adb install -r <path-to-apk>.apk`.
3. Launch FlipStitch from the app drawer.
4. Grant nothing (the app requests no permissions).

## 4. Playtest checklist

Run through all ten levels. Record results in `docs/MILESTONE-3-QA.md` as you go.

| # | Test | Pass criteria |
| --- | --- | --- |
| 1 | Install and launch | Clean install opens the gallery; only level one is unlocked |
| 2 | All ten levels | Each level can be completed with the authored solution; completion reveal appears |
| 3 | Sound via phone speaker | Pierces, flips, invalid, undo, hint, completion, and unlock sounds are audible and pleasant, no clipping or buzzing |
| 4 | Haptics | Light tick on stitch, soft flip, distinct warning on invalid, stronger success on completion |
| 5 | Sound Off | No audio at all; haptics still work; game fully playable |
| 6 | Haptics Off | No vibration at all; sounds still work |
| 7 | Reduced motion | Settings → system reduced motion on: flips swap instantly, sounds and haptics still fire |
| 8 | Background and resume | Press Home mid-level; return; state (thread, side, progress) is intact |
| 9 | Progress after kill | Force-stop the app, reopen; completions and unlocks persist |
| 10 | Rapid taps during a flip | Rapid hole tapping during the flip animation: no crash, no double stitches, sounds stay clean |
| 11 | Headphones connect/disconnect | Sounds route to headphones; on disconnect audio stops without crash and gameplay continues |
| 12 | Android back navigation | Back from game → gallery; back from settings → gallery; back does not double-record exits |
| 13 | TalkBack | Focus order: gallery cards, settings, switches, hoop holes, toolbar; every control has a label; announcements for invalid moves and completions |
| 14 | Frame/memory/heat/battery | Play 15 minutes; observe no jank, no heat spike, battery usage normal (log observations) |
| 15 | Screenshots | Capture gallery, game (front + back), completion card, and settings screens; store them with the QA doc |

## 5. Settings verification

1. Gallery → **Settings** button.
2. Toggle Sound off/on — verify immediate effect and persisted across app restarts.
3. Toggle Haptics off/on — same.
4. Reduced motion row reports the live system value.
5. **View report** shows a readable summary; **View raw events** shows JSON.
6. **Export report** and **Export JSON** open the Android share sheet; share to a
   file app and confirm the contents.
7. **Clear playtest data** requires two taps; after clearing, report is empty.
8. **Reset game progress** requires two taps; gallery resets to level one only.

## 6. Playtest data sanity checks

After a session, open Settings → View report and confirm:

- Sessions count matches app launches (each launch = one session).
- Level 1 time-to-first-stitch and completion metrics match what you played.
- Invalid moves you made appear in the invalid-move rate.
- Exits before completion appear in the exit-before-completion rate.
- Percent reaching level four matches how far you got.

## 7. Failure report format

For any failed step, record in `docs/MILESTONE-3-QA.md`:

```text
Step: <number + name>
Device: Galaxy S25 Ultra (One UI <version>)
Observed: <what happened>
Expected: <what should have happened>
Steps to reproduce: <exact taps>
Logs/screenshot: <path>
```
