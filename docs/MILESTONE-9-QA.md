# Milestone 9 QA — external playtest infrastructure

Prompt 9 built the machinery for measuring FlipStitch against real players. This
document records what was verified, how, and — importantly — what was **not**
measured.

> **External behavioural sample: not measured yet.**
>
> No external human tester has played FlipStitch. The infrastructure below is
> complete and exercised; the behavioural evidence it exists to collect does not
> exist. None of the four product gates has been evaluated against real players,
> and Phase 2 does not close. See *Behavioural status*, below.

---

## Automated checks

Run on the final commit, Node 25.2.1, Windows 11.

| Command | Result |
| --- | --- |
| `npm test` | **326 passed**, 0 failed (was 243 before this milestone; +83) |
| `npm run typecheck` | clean |
| `npm run analyze:levels` | 0 exact, 0 mirrored, 2 advisory near duplicates, 0 unapproved — unchanged |
| `npm run bench:analyzer` | ran, exact throughout |
| `npm run bench:topology` | ran (informational, does not gate CI) |
| `npm run doctor` | 21/21 checks passed |
| `npm run validate:audio` | all 9 required sounds validated |
| `npm run scan:analytics` | no analytics SDK, advertising identifier, device fingerprint, or network call in `app/` or `src/` |
| `npm audit` | 0 vulnerabilities |
| `npm run export:android` | exported |
| `npm run export:ios` | exported |
| `npm run export:web` | exported, 8 static routes including the new `/playtest/wrapup` |
| `npm run playtest:cohort` | new — exercised against synthetic and real exports (below) |
| `npm run playtest:fixtures` | new — generates the synthetic rehearsal set |

### New tests (83)

| File | Tests | Covers |
| --- | --- | --- |
| `src/playtest/stats.test.ts` | 17 | Wilson and adjusted-Wald intervals against hand-worked values, extremes that must not collapse to zero width, rule of three, median/percentile, geometric mean vs an outlier, exact binomial CDF, distribution-free median interval, all five verdict states, threshold-boundary behaviour, empty sample |
| `src/playtest/bundle.test.ts` | 22 | build-channel resolution, non-fingerprinting metadata, install-id generation/validation/persistence/reset, storage failure, consent versioning, disclosure content, non-leading question wording, answer normalisation, bundle round-trip, future/past version refusal, corrupt input, missing/invalid fields by name, per-event validation, fingerprint mismatch, degrading progress/responses |
| `src/playtest/cohort.test.ts` | 32 | the full Goal 33 fixture matrix — see below |
| `src/playtest/observations.test.ts` | 12 | CSV quoting/newlines, spreadsheet boolean spellings, JSON form, per-row rejection, duplicate rows, missing id column, empty/malformed input, unknown columns, indexing |

### Goal 33 fixture matrix — all covered

| Case | Test |
| --- | --- |
| Tester completes everything | `a tester who reaches Level 4 is not an early exit…` |
| Tester quits Level 1 | `a tester who quits during Level 1 is an early exit…` |
| Tester quits Level 2 | `a tester who quits during Level 2 counts as an early exit` |
| Tester reaches Level 4 | `the Level 4 denominator only includes testers who were offered Level 4` |
| Spoken help voids the unaided numerator | `spoken help removes a tester from the unaided numerator but not the denominator` |
| Duplicate export | `the same export shared twice is one tester, not two` |
| Multiple sessions, same install | `a genuinely later session from the same install is merged, never dropped` |
| Corrupt bundle | `a corrupt or wrong-version file is rejected before it can reach the cohort` |
| Wrong bundle version | `a future bundle version is refused rather than reinterpreted`, `an older bundle version…` |
| Developer bundle excluded | `developer and production bundles are excluded by build channel, not by guesswork` |
| Mixed web/mobile cohort | `mixed web and mobile testers are split when both sides are large enough` |
| Zero testers | `zero testers produces no verdicts and says the sample is not measured` |
| Very small sample | `one perfect tester still yields no verdict — a sample of one proves nothing` |
| Threshold boundary values | `a threshold-boundary cohort is reported as promising, never as met`, plus boundary tests in `stats.test.ts` |

Additional cases beyond the required list: unobserved testers excluded from the
unaided gate, `unknown` help treated as unobserved, Level 4 opened before the
unlock treated as an anomaly, first-stitch time taken from the first attempt
rather than a faster restart, backgrounded time subtracted, two content
revisions flagged rather than pooled, tiny platform group not split out, and a
proof that Gates 3 and 4 are not complements of each other.

---

## Manual QA — real builds in a real browser

Verified against genuine Expo exports, not a dev server. Two builds:

- **Playtest build** — `EXPO_PUBLIC_PLAYTEST_MODE=true`,
  `EXPO_PUBLIC_BUILD_ID=milestone9-local`, `EXPO_PUBLIC_COHORT=qa-rehearsal`,
  served statically.
- **Normal build** — no env flags, served statically.

| Check | Result |
| --- | --- |
| Fresh launch (playtest) shows the consent disclosure before anything else | ✅ four lines, accept + decline, wordmark |
| Deep link to an inner route before consent | ✅ `/playtest/wrapup` also lands on the consent gate |
| Accept → real game | ✅ collection library, fresh progression (0 of 10), plus the playtest-only *Finish test* pill |
| Level 1 unchanged | ✅ identical controls (Undo / Peek Back / Hint), identical copy, no debug data, no hole ids, no solver output, no analyzer scores, no unlock-all |
| Level 1 completion | ✅ played to "Thread complete", 4 stitches |
| Telemetry recording | ✅ `app_session_started`, `level_opened`, `first_valid_stitch`, `valid_stitch` ×3, `level_completed` |
| Anonymous id + consent stored | ✅ `pi-9705a902-…` and `{"decision":"granted","disclosureVersion":1}` |
| Reach Level 4 | ✅ Levels 1–3 completed, Level 4 opened; all four `level_opened` events recorded |
| Post-test questionnaire | ✅ five questions, all skippable, free text + one three-option choice |
| Export | ✅ produced a valid v1 bundle with correct channel, platform `web`, build id, content revision + fingerprint `76ae7eae`, cohort `qa-rehearsal`, install id, progress, and answers |
| Native share fallback | ✅ *Share sheet did not open? Show report to copy* always available (see defect 1) |
| Researcher reset | ✅ confirm twice → events 0, consent null, answers null, progress null, **new unrelated install id**, `resetCount: 1` |
| Second fresh tester | ✅ reload returns to the consent screen with the new id |
| Decline | ✅ full game playable, level opened and played, **0 events stored**, consent recorded as `declined` |
| Settings export compatibility | ✅ existing View/Export report and raw JSON still work; report panel now appears reliably (see defect 2) |
| Normal build: no consent gate | ✅ launches straight into the library |
| Normal build: no *Finish test* | ✅ absent from library and Settings |
| Normal build: no *Playtest build* section in Settings | ✅ absent |
| Normal build: wrap-up route | ✅ "This screen is only part of playtest builds" + a way back |
| Round-trip into the analyzer | ✅ the genuinely exported bundle parsed cleanly and produced `INSUFFICIENT SAMPLE` on all four gates |

### Cohort tool, end to end

Against the synthetic rehearsal set (13 playtest testers, 1 developer bundle, 1
duplicate, 1 corrupt file, 1 future-version file, plus an observer CSV):

```
Read 17 file(s): 15 valid bundle(s), 2 rejected.
  corrupt.json [not-json] File is not valid JSON.
  future.json  [unsupported-future-version] Bundle version 2 is newer than this tool understands (1).
…
Bundles accepted: 14 · Duplicates dropped: 1 · Non-playtest builds: 1
Installs seen: 14 · Eligible testers: 13 · Observations joined: 13
```

The four gates printed first, each with counts, a percentage, both intervals,
and a verdict; then platform segments, diagnostics, hypotheses, warnings, locked
gate definitions, verbatim free-text answers, and the per-file bundle ledger.

**These numbers are synthetic and are not evidence.** They exist to prove the
arithmetic, the deduplication, and the rejection paths. Per Goal 36, no product
change was made on the basis of any of them — and the run did in fact "fail" a
gate (early exit 23%, `CONCERNING`), which was left alone deliberately.

---

## Defects found and fixed during manual QA

Three real problems surfaced only because the build was driven in a browser
rather than reasoned about.

### 1. Export could hang forever behind the share sheet

**Symptom.** After tapping *Share playtest*, the button stayed disabled
permanently and no data could be retrieved.

**Cause.** `Share.share` resolves via `navigator.share` on web. In a context
where `navigator.share` exists but no OS sheet appears, the promise never
settles — it neither resolves nor rejects — so the `try/catch` fallback never
ran and the busy state never cleared. A tester would have been stranded with
data they could not hand over.

**Fix.** The bundle is built and the copy-out path enabled *before* the share
sheet is attempted; the share call is then fired without being awaited. A
rejection (tester cancelled) and a promise that never settles are both
survivable. A *Share sheet did not open? Show report to copy* button is always
available afterwards.

### 2. The same hang existed in the Settings export

**Symptom.** On web, *Export playtest report* appeared to do nothing.

**Cause.** Same pattern, pre-existing since Milestone 3: `await Share.share(...)`
with a fallback that only ran on rejection.

**Fix.** Same shape — show the panel first, attempt the share alongside.
Verified: the report panel now appears reliably.

### 3. Questionnaire answers were lost from the bundle they were saved into

**Symptom.** A bundle exported immediately after answering contained
`"responses": null`, despite the answers being correctly written to storage.

**Cause.** *Share playtest* saves answers and then exports in one action.
`exportBundle` is a `useCallback` closing over `responses` **state**, which had
not re-rendered yet, so it read the pre-save value. The export shipped without
exactly the comprehension answers it exists to carry — and would have done so
silently, for every tester.

**Fix.** The provider mirrors the latest answers in a ref that `exportBundle`
reads. Re-verified end to end: a bundle exported in the same action now carries
all three free-text answers.

### 4. Radio buttons announced no selected state

**Symptom.** The "Would you play another puzzle?" options rendered as selected
visually but exposed no `aria-checked`.

**Cause.** `accessibilityState={{ selected }}` maps to `aria-selected`, which is
not how a radio announces its state. A screen-reader user would have heard
nothing change.

**Fix.** `accessibilityState={{ checked }}` plus an explicit `aria-checked` (both
React Native and react-native-web forward it), and the group wrapped in
`accessibilityRole="radiogroup"` with the question as its label. Verified:
`[{Yes,false},{No,false},{Not sure,true}]`.

---

## Notes for whoever runs the first real cohort

- **Local builds need `--clear`.** Metro caches the inlined value of
  `EXPO_PUBLIC_PLAYTEST_MODE`, so a playtest export made right after a normal
  export can silently come out with the flag off — the two bundles were
  byte-identical until the cache was cleared. EAS builds start clean, so this is
  a local-rehearsal trap only. Always confirm the consent screen appears before
  handing a device to a tester.
- **Check `buildChannel` in one exported bundle** before recruiting. It must say
  `playtest`; anything else is excluded from the analysis by design.
- **The QA bundles produced above were deleted** and were never placed in a
  cohort directory. They were generated by scripted browser automation, not a
  human playing, and would be worthless as behavioural evidence even though
  their channel says `playtest`.

---

## Behavioural status

| Product gate | Threshold | Status |
| --- | --- | --- |
| Level 1 completed without spoken help | ≥ 80% | **Not measured** — no external testers |
| Median time to first valid stitch | < 10s | **Not measured** |
| Exit during the first three levels | < 20% | **Not measured** |
| Chose to start Level 4 | ≥ 60% | **Not measured** |

- **External human testers: 0.**
- **Qualitative findings from external players: none — none have played.**
- No developer session, browser automation run, solver run, or synthetic fixture
  is offered as a substitute, and none was counted.
- **Phase 2 cannot close.** Content exists and is validated; player evidence does
  not exist.

The engineering portion of Prompt 9 is complete. The behavioural portion has not
started, and cannot start without human beings.

---

## Mobile-device evidence

Not obtained this milestone. The manual QA above ran against a real static web
export driven through Chrome at a phone viewport (412×915), which verifies the
playtest flow, the consent gate, the export, and the reset — but it is mouse
input on a desktop browser, not touch on a handset.

The `playtest` EAS profile is configured and the commands are documented, but no
EAS build was produced: no Expo authentication was available in this
environment, and no build artifact is claimed. Running
`npm run build:android:playtest` on a machine with an Expo account is the next
step, and real-device evidence remains a Phase 2 exit condition
(`docs/PRODUCT.md`).
