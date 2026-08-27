# Playtest bundle specification (v1)

The file a tester shares at the end of a playtest session. One JSON object, one
tester, one export.

Implementation: `src/playtest/bundle.ts`. Tests: `src/playtest/bundle.test.ts`.
Data-handling rules: `docs/PLAYTEST-DATA.md`.

---

## Design rules this format follows

1. **Versioned, and strict about it.** A bundle declares `bundleVersion`. The
   analyzer accepts exactly version 1 and refuses anything else with a distinct
   reason code. A *newer* bundle is never read as though it were version 1: a
   later exporter may have changed what a field means, and silently
   reinterpreting it corrupts a cohort in a way nobody would notice.
2. **Minimal.** Every field has to earn its place by being needed for the study.
   Platform is a category, never a device model.
3. **No fingerprinting surface.** Nothing here can be combined into a device
   fingerprint — see *What is deliberately absent*, below.
4. **Existing telemetry, unchanged.** `events` is the same local event stream
   FlipStitch has recorded since Milestone 3 (`src/playtest/events.ts`). Nothing
   is re-recorded for the bundle.
5. **Deduplicable.** Two identifiers make a re-share recognisable without
   discarding a genuinely later session.
6. **Never crashes the reader.** Corrupt input is reported and skipped. One bad
   file must not cost a whole cohort.

---

## Envelope

```jsonc
{
  "bundleVersion": 1,
  "bundleId": "b-35a8f14e-5464-4d4d-82c9-f4ba13951764",
  "eventSchemaVersion": 1,
  "appVersion": "0.1.0",
  "contentRevision": "2c20l.2026-08-27",
  "contentFingerprint": "76ae7eae",
  "buildId": "3689a8f",
  "buildChannel": "playtest",
  "cohortId": "pilot-a",
  "platform": "web",
  "playtestInstallId": "pi-10d50c96-0c8f-42d1-951f-20f58b3bd28f",
  "installResetCount": 0,
  "exportedAt": "2026-08-27T23:38:53.332Z",
  "eventsFingerprint": "687f3015",
  "events": [ /* … */ ],
  "progress": { "completed": { "first-thread-01": 4 }, "lastPlayedLevelId": "first-thread-01" },
  "responses": { "version": 1, "respondedAt": 1787873933331, "answers": { /* … */ } }
}
```

### Fields

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `bundleVersion` | integer | yes | Envelope version. Must be `1`. |
| `bundleId` | string | yes | Random id for *this export*. Two exports of identical data still differ here. |
| `eventSchemaVersion` | integer | yes | Version of the `events` array schema. Must match `PLAYTEST_SCHEMA_VERSION` (`1`). |
| `appVersion` | string | yes | From `app.json` via `expo-constants`. |
| `contentRevision` | string | yes | Hand-maintained content label (`src/content/version.ts`). |
| `contentFingerprint` | string | no | 8-hex digest over level structure. Catches content edits nobody labelled. |
| `buildId` | string | no | Git commit SHA or EAS build id, injected at build time. Defaults to `"unknown"`. |
| `buildChannel` | `production` \| `development` \| `playtest` | yes | Which build produced this. Only `playtest` counts as external evidence. |
| `cohortId` | string \| null | no | Optional label locking a group of bundles to one build revision. |
| `platform` | `android` \| `ios` \| `web` \| `unknown` | yes | Platform **category** only. |
| `playtestInstallId` | string | yes | Anonymous random install id, `pi-<uuid>`. See below. |
| `installResetCount` | integer | no | How many times a researcher reset this device's identity. |
| `exportedAt` | ISO 8601 string | yes | When the tester exported. |
| `eventsFingerprint` | string | no | Digest over the event stream; recognises a re-share of identical data. |
| `events` | array | yes | The local event stream. Individually invalid entries are dropped with a warning. |
| `progress` | object | no | `completed` maps level id → best move count; `lastPlayedLevelId`. Missing or malformed degrades to empty. |
| `responses` | object \| null | no | Post-test questionnaire. A mismatched questionnaire version is dropped with a warning, not guessed at. |

### `contentRevision` and `contentFingerprint`

Two values doing one job: knowing *which puzzles* a tester played.

- `CONTENT_REVISION` is written by hand and bumped when content changes
  (`docs/CONTENT-REVISION-POLICY.md`). Format: `<collections>c<levels>l.<date>`.
- `contentFingerprint(catalog)` is **derived** — an FNV-1a digest over every
  level's id, start side, start hole, hole count, edge counts, and authored
  solution length, in catalog order. If a puzzle's graph changes and nobody
  bumps the label, the fingerprint moves anyway and the cohort analyzer reports
  the split instead of pooling two different Level 1s into one rate.

The fingerprint deliberately covers *structure*, not copy: fixing a typo in a
hint does not invalidate a cohort; changing a graph does.

### `playtestInstallId`

`pi-` followed by a lowercase v4 UUID. Full rationale in
`src/playtest/install.ts` and `docs/PLAYTEST-DATA.md`.

- Randomly generated on this device, app-scoped, resettable, gone on uninstall.
- Derived from **nothing** — not the device, clock, locale, screen, or any
  hardware or advertising identifier. Two fresh installs on one phone give two
  unrelated ids.
- Written into bundles **only** in playtest builds.
- It is not an account. It answers exactly one question: "did these two files
  come from the same test installation?"

This follows Android's own guidance for non-advertising, app-internal
identifiers: a randomly generated GUID in internal storage rather than a
hardware id (https://developer.android.com/identity/user-data-ids).

---

## Events

`events` is the existing stream, unchanged. Event names in use:

`app_session_started`, `app_backgrounded`, `app_foregrounded`, `level_opened`,
`first_valid_stitch`, `valid_stitch`, `invalid_stitch`, `peek_used`,
`undo_used`, `hint_used`, `thread_trapped`, `restart_used`, `level_exited`,
`level_completed`, `next_level_started`, `setting_changed`.

Milestone 9 added exactly two: `app_backgrounded` and `app_foregrounded`. They
are additive — every pre-existing version-1 event still validates unchanged.

### Why those two were added

The "median time to the first valid stitch under 10 seconds" gate cannot be
measured honestly without them. Without the pair, a tester who is interrupted by
a phone call between opening Level 1 and placing their first stitch contributes
a two-minute "thinking time" that is really a two-minute absence. That single
outlier can move a median at n = 12.

With the pair, `backgroundIntervals` reconstructs the time the app spent in the
background per session, and `backgroundOverlap` subtracts only the part that
falls inside the measurement window. A background event with no matching
foreground (the tester never came back) is closed at the last event in that
session — the most conservative available reading.

### First-stitch measurement, precisely

```
firstStitchMs = first_valid_stitch.timestamp
              − level_opened.timestamp
              − background time overlapping that interval
```

with these rules:

- **First attempt only.** The earliest Level 1 `level_opened`, and the first
  valid stitch carrying that attempt id. A restart begins a new attempt and can
  never replace the real first measurement with a faster second one.
- **One measurement per tester**, so no single tester's restarts move the
  median.
- **App load is excluded already**: `level_opened` fires when the level route is
  ready, not at app launch, so cold-start and font loading are outside the
  window. This was true before Milestone 9 and was left alone.
- **No valid stitch, no measurement.** Those testers are counted and reported
  separately (`withoutMeasurement`), never scored as infinity and never silently
  dropped.

---

## What is deliberately absent

None of the following is collected, anywhere, in any build:

IP address · GPS or coarse location · MAC address · IMEI or serial · SSAID ·
advertising identifier (IDFA / GAID) · device model or manufacturer · OS version
or build · screen size or density · locale · timezone · carrier · installed apps
· contacts · name, email, phone, or any account · any free text the tester did
not type into the questionnaire themselves.

`src/playtest/bundle.test.ts` asserts a serialised bundle contains none of these
names, and `npm run scan:analytics` fails the build if any analytics SDK,
advertising identifier, device-fingerprinting library, or network call appears
in `app/` or `src/`.

---

## Parsing and version handling

`parsePlaytestBundle(value)` never throws. It returns either
`{ ok: true, bundle, warnings }` or `{ ok: false, code, reason }`.

| Code | Meaning |
| --- | --- |
| `not-json` | The file is not valid JSON. |
| `not-object` | Valid JSON, but not a JSON object. |
| `missing-version` | No integer `bundleVersion`. |
| `unsupported-future-version` | Newer than this analyzer understands. Update the analyzer — do not reinterpret. |
| `unsupported-past-version` | Older than the locked methodology. No migration is defined; exclude it or re-export. |
| `missing-field` | A required field is absent or empty; the reason names it. |
| `invalid-field` | A field is present but not a legal value; the reason names it. |

Non-fatal conditions become `warnings` and the bundle is still used:

- individually invalid events are dropped, with the count reported;
- an `eventsFingerprint` that does not match the events present is flagged (this
  happens legitimately when invalid events were dropped, and also when a file
  was hand-edited — worth saying either way);
- a malformed `progress` degrades to empty;
- a `responses` block with an unknown questionnaire version is dropped rather
  than reinterpreted.

### Migration discipline

There is no silent migration path and there will not be one. If the envelope
ever needs to change:

1. bump `PLAYTEST_BUNDLE_VERSION`;
2. write an explicit reader for the old version, or explicitly decide old
   bundles are excluded;
3. bump `METHODOLOGY_VERSION` in `src/playtest/cohort.ts` if any gate definition
   moved, and report both versions rather than restating history.

---

## Deduplication contract

The analyzer folds bundles into one record per `playtestInstallId`, in
`exportedAt` order:

1. **Same `bundleId` twice** → the same export shared twice. Dropped, counted as
   a duplicate.
2. **Same install, same `eventsFingerprint`** → the same data re-shared under a
   new bundle id. Dropped as a duplicate — *unless* the second copy carries
   newer questionnaire answers, in which case the answers are taken and the
   entry is recorded as `superseded-responses`, not as a duplicate. (This is the
   real case where a tester shares after playing, then fills in the
   questionnaire and shares again.)
3. **Anything else from a known install** → a genuinely later export. Events are
   unioned by `(sessionId, seq)`, progress merged by best moves, and the newest
   answers kept. The tester count does not move.

A tester who exports after Level 2 and again after Level 4 is therefore **one**
tester with all of their play — never two testers, and never a lost second
session. Every decision is printed in the run's bundle ledger with the reason,
so a dropped file is always accounted for rather than silently vanishing.
