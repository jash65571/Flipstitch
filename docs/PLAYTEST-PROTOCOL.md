# FlipStitch external playtest protocol

This document is written for someone who did not build FlipStitch. If you can
hand a phone to a stranger and stay quiet, you can run this session.

Companion documents:

- `docs/PLAYTEST-TESTER-INSTRUCTIONS.md` — the half-page you read *to the tester*.
- `docs/PLAYTEST-DATA.md` — what is recorded and how to handle it.
- `docs/PLAYTEST-BUNDLE-SPEC.md` — the file format.
- `docs/RESEARCH-MILESTONE-9.md` — why the protocol is shaped this way.

---

## 0. What we are trying to find out

FlipStitch claims one thing: **every stitch forces you to play the other side**,
and a new player understands that without being told. Everything below exists to
test that claim without accidentally teaching it.

The single most valuable thing you can do in a session is **nothing**. A tester
who is confused for forty seconds and then works it out is the most useful data
we can get. A tester who is confused for ten seconds and is then helped tells us
nothing at all.

---

## 1. Two kinds of session — do not mix the numbers

### Pilot (exploratory usability testing)

**How many:** about 5 fresh players.
**Goal:** find confusion, controls that do not read as controls, moments where
somebody gives up.
**What it produces:** a list of problems to fix. It does **not** produce a rate.

Five participants is enough to surface most usability problems and is nowhere
near enough to estimate a percentage — this is the standard qualitative /
quantitative split (see `docs/RESEARCH-MILESTONE-9.md` §1).

**Stop and fix** if the pilot shows a severe comprehension failure. Then start a
**new** cohort against the new build. Never mix pre-fix and post-fix sessions
into one rate.

### Gate cohort (behavioural gate evaluation)

**How many:** 40 fresh players is the target; 10 is the floor below which the
analyzer prints no verdict at all.
**Goal:** estimate the four product-gate rates with honest uncertainty.
**Rule:** every tester in one cohort plays the **same locked build revision**.

Why 40: for a binary rate that is roughly a ±15% margin of error at 95%
confidence (NN/g). At 21 it is ±20%. At 12 the interval is so wide that "80%
passed" and "55% passed" are indistinguishable. If 40 is not reachable, run what
you can reach and report the interval — but do not report the point estimate as
if it were the answer.

**Recruiting is the binding constraint**, not the tooling. Say so in the write-up
rather than compensating with a smaller threshold.

---

## 2. Before the tester arrives

- [ ] Install the **playtest build** (`buildChannel: playtest`). A normal build
      records nothing shareable and shows no consent screen.
- [ ] Confirm the build id and content revision — Settings → *Playtest build*.
      Write them down. Every tester in a cohort must match.
- [ ] Ensure a **fresh test state**. Either a fresh install, or open
      *Finish test* → *Reset for the next tester* → tap again to confirm. The
      app should return to the consent screen on next launch, with a new
      anonymous test id.
- [ ] Have the observer sheet open (§7) with the new test id already pasted in.
      Read it from Settings → *Playtest build*, or the wrap-up screen.
- [ ] Silence notifications. An incoming call mid-Level-1 is recorded and
      subtracted from the timing metric, but it still disrupts the session.

---

## 3. Before the player starts

Read `docs/PLAYTEST-TESTER-INSTRUCTIONS.md` aloud, or hand it over. Then:

- **Do not explain the mechanic.** Not once, not partially, not as a hint.
- **Do not point at the first hole**, or look at it pointedly.
- **Do not mention Peek, Undo, or Hint** unless the tester asks what a button is
  — and even then, see §4.
- **Do not say the word "test" about the person.** Say "we're testing the game,
  not you." (NN/g's phrasing.)
- Let them tap *I understand — start* themselves, or hand the device over
  already past it. Either is fine; note which.

The tester may think aloud if they are comfortable. Encourage it once, at the
start, and then leave them alone.

---

## 4. During play — the silence rule

**Say nothing while they are working.** If they go quiet for a long stretch and
you are using think-aloud, one neutral nudge is allowed:

- "What are you thinking?"
- "What are you looking at?"
- "What did you expect to happen?"

These are the only sanctioned prompts. They ask about the tester's state; they
say nothing about the game.

### If they ask you a question

Deflect once, warmly:

> "What would you do if I weren't here?"

If they ask again and are genuinely stuck, **you may help — and you must record
it.** Helping is not a failure of the session; hiding that you helped is. A
helped tester still counts in the Level 1 gate's denominator and is excluded
from its numerator, because "completed without spoken help" means exactly that.

When you help, write down:

- `spokenHelpGiven` = `yes`
- `helpStage` — where they were (e.g. "level 1, ~60s, before any stitch")
- `helpReason` — what they asked or what they were stuck on

Say the minimum that unblocks them, and go quiet again.

### If they are stuck but not asking

Wait. Two minutes of visible struggle on Level 1 is a finding, not an emergency.
Let it run unless they are distressed or want to stop.

### What to watch for and write down

- The **first thing they touch**. A hole? A button? The hoop rim? Nothing?
- Their **first reaction to the side changing** by itself. Surprise? Confusion?
  Did they notice at all?
- Whether they understand **why a trap happened** when the thread strands.
- Whether they discover **Peek**, and what they seem to think it did.
- The exact **moment and wording** of any confusion said out loud.
- Where and why they **stop**, if they stop.

---

## 5. After Level 1

Ask one neutral question:

> "What do you think the rule is?"

Write the answer down **verbatim**, in their words. Do not correct it. Do not
confirm or deny it. Do not say "right" or "close" or "sort of".

This is the hardest moment in the protocol. If the tester is wrong and you
correct them, Levels 2–4 stop being unaided data. If Levels 2–4 still need to be
measured unaided — and in the gate cohort they do — **do not teach them yet.**

Record your own reading in `level1RuleUnderstood` as `yes`, `no`, `partial`, or
`unknown`. That is your judgement for later human coding, not a grade shown to
anyone.

---

## 6. After Level 4, or when they stop

Whichever comes first.

1. Navigate to **Finish test** (on the library screen, or Settings → *Playtest
   build*). This is safe to reach at any time; it shows no answers and no debug
   data.
2. Hand the device back and let the tester answer the questions **themselves**.
   Do not read the questions aloud, do not paraphrase, and do not fill anything
   in for them. Every question is skippable.
3. Tap **Share playtest** and send the file wherever you are collecting them.
   If the share sheet does not appear, tap *Share sheet did not open? Show
   report to copy* and copy the text out.
4. Only now, if they are curious, you may explain the game. The session's data
   is already captured.
5. Thank them and say what happens next with what they told you.

### If they stop early

Record where and why, in their words, in `stoppedAtLevel` and `observerNotes`.
**Do not encourage them to continue.** A tester who stops at Level 2 is exactly
the signal the early-exit gate exists to capture, and persuading them to carry
on destroys that signal and replaces it with your persuasion.

Still run the wrap-up and still export. A short session is data.

---

## 7. The observer record

One row per tester. CSV or JSON — see `src/playtest/observations.ts`.

```csv
playtestInstallId,spokenHelpGiven,helpStage,helpReason,level1RuleUnderstood,peekUnderstood,stoppedAtLevel,observerNotes
pi-10d50c96-0c8f-42d1-951f-20f58b3bd28f,no,,,yes,not-used,,"tapped the rim twice before finding a hole"
pi-7c931041-88a3-4f11-9c02-1b2f3c4d5e6f,yes,"level 1, 90s","asked what to tap",partial,unknown,"level 2","gave up on the second hoop"
```

| Column | Values | Notes |
| --- | --- | --- |
| `playtestInstallId` | `pi-…` | Required. Must match the tester's bundle. |
| `spokenHelpGiven` | `yes` / `no` / `unknown` | Anything unrecognised becomes `unknown`. |
| `helpStage` | free text | Where in the session help was given. |
| `helpReason` | free text | What they were stuck on. |
| `level1RuleUnderstood` | `yes` / `no` / `partial` / `unknown` | Your reading after the §5 question. |
| `peekUnderstood` | `yes` / `no` / `partial` / `unknown` / `not-used` | |
| `stoppedAtLevel` | free text | Only if they chose to stop. |
| `observerNotes` | free text | Anything else worth a human's attention. |

Extra columns of your own are ignored, not rejected. A row with an invalid id is
skipped with an error naming the line; the rest of the file still loads.

**This file is the researcher's, not the player's.** Facilitator notes never go
into a tester's telemetry stream — a tester's exported bundle should not contain
somebody else's opinion of them.

**Only a definite `yes` or `no` makes a tester eligible for the unaided gate.**
`unknown` means "we do not know", and the analyzer treats it as such rather than
assuming nobody helped.

---

## 8. Running the analysis

Put every bundle in one directory and run:

```bash
npm run playtest:cohort -- ./playtests/bundles
npm run playtest:cohort -- ./playtests/bundles --observations ./playtests/observers.csv
npm run playtest:cohort -- ./playtests/bundles --observations ./playtests/observers.csv --json report.json
```

No server, no database, no account. It reads files off your disk.

Corrupt files, wrong-version files, and non-playtest builds are reported and
skipped; the run continues. Duplicate exports are collapsed. Every file's fate
is printed in the bundle ledger at the end.

`/playtests/` is gitignored. Real tester data is never committed.

---

## 9. The four gates, exactly as computed

These definitions are **locked** and live in code
(`src/playtest/cohort.ts`, `METHODOLOGY_VERSION = 1`). They were written and
tested before any real tester data existed, which is the point: once results
arrive, changing a denominator to improve a number is p-hacking. If a definition
turns out to be wrong, bump `METHODOLOGY_VERSION` and report both.

**Tester** — one `playtestInstallId` from bundles whose `buildChannel` is
`playtest`. Development and production builds are our own QA and are excluded by
build metadata, never by guessing.

**Eligible** — a tester who opened Level 1 at least once.

### Gate 1 — Level 1 completed without spoken help ≥ 80%

- **Denominator:** eligible testers with an observation recording
  `spokenHelpGiven` as a definite `yes` or `no`.
- **Numerator:** those with `spokenHelpGiven = no` **and** a `level_completed`
  for Level 1.
- Helped testers stay in the denominator and are excluded from the numerator.
- Unobserved testers **cannot contribute**. Telemetry cannot see a person
  talking, and pretending it can is the easiest way to fake this gate. Their raw
  Level 1 completion is reported separately, labelled *not gate evidence*.

### Gate 2 — median time to first valid stitch < 10s

- One measurement per eligible tester, from their **first** Level 1 attempt.
- `first_valid_stitch − level_opened`, minus backgrounded time inside that
  window.
- Testers who never placed a valid stitch have no measurement and are counted
  separately.
- Reported with a distribution-free 95% median interval, and — when n < 25 —
  the geometric mean alongside, because task times are skewed. The **gate is
  judged on the median**, as `docs/PRODUCT.md` states it.

### Gate 3 — fewer than 20% exit during the first three levels

- **Denominator:** eligible testers.
- **Numerator:** testers who did **not** complete all of Levels 1, 2 and 3.

The obvious alternative — "started Level 1 but never opened Level 4" — was
rejected, and the reason matters: it is the exact complement of Gate 4's event,
which would make Gate 4 arithmetically redundant (Gate 3 could only pass if Gate
4 passed at 80%). Under the definition used, the two gates test different
things: Gate 3 asks whether the first three hoops lose people mid-way, Gate 4
asks whether people who finished them chose to continue.

This makes Gate 3 *looser in isolation* — a tester who finished Levels 1–3 and
then stopped is not an "early exit" — because that tester is precisely what Gate
4 exists to catch. The pair is stricter than either reading alone.

### Gate 4 — at least 60% choose to start Level 4

- **Denominator:** eligible testers who completed Level 3 — those actually
  offered Level 4. Asking this of someone who never got there just measures
  Gate 3 again.
- **Numerator:** those whose first Level 4 open came at or after their own Level
  3 completion, through normal progression.
- An open that **precedes** the unlock (a deep link, a test harness, an
  unlock-all build) is not a choice to continue. It is reported as an anomaly
  and excluded, with a warning.

---

## 10. Reading the verdicts

The report never prints a green tick. Each gate gets one of five states:

| Verdict | Meaning |
| --- | --- |
| `INSUFFICIENT SAMPLE` | Below 10 in the denominator. No verdict is offered at all. |
| `MET with meaningful evidence` | The whole 95% interval sits on the passing side. |
| `PROMISING` | The point estimate passes; the interval still straddles the threshold. |
| `CONCERNING` | The point estimate misses; the interval still straddles. |
| `NOT MET` | The whole interval sits on the failing side. |

**`PROMISING` is not a pass.** With 12 testers and zero early exits, the gate
still comes out `PROMISING`, because the true rate could be as high as 24%.
That is the correct answer, not a bug.

A zero numerator additionally prints its rule-of-three upper bound: 0 of 10
observed failures still allows a true rate up to 30%.

The report also emits **hypotheses** — a signal, a possible explanation, and the
next thing a human should look at. They are labelled *not findings, not causes*
and they are not conclusions. "Many invalid taps on Level 1" has at least three
plausible readings, and a report that picks one for you is how a team redesigns
the wrong thing.

---

## 11. Things that invalidate a cohort

- **Changing the game mid-cohort.** Start a new cohort with a new `cohortId`.
  The analyzer warns when more than one content revision or fingerprint appears.
- **Reusing a tester.** One human, one anonymous test id. Reset between testers.
- **Counting our own QA.** Developer builds are excluded automatically by
  channel — but do not hand-copy a developer bundle into the cohort directory
  and expect the tool to save you.
- **Pooling web and mobile without saying so.** Both are reported separately
  once each side reaches 5 testers; below that the report warns that they were
  pooled. Mobile is the primary product.
- **Synthetic data.** `npm run playtest:fixtures` exists to rehearse the
  pipeline. Its output is not evidence and must never sit in a real cohort
  directory.

---

## 12. When Phase 2 can close

See `docs/PRODUCT.md`. In short: external tester data must exist, the cohort must
be large enough for the locked method to produce verdicts, the gates must be
computed with that method unchanged, critical qualitative confusion must be
addressed, and there must be at least some real-device or emulator evidence on
mobile. Missing any of those means Phase 2 stays open, and the next milestone is
a correction milestone rather than retention work.
