# Playtest data handling

What FlipStitch records during a playtest, what it does not, and how the team
handles the files afterwards.

This is **product and research data hygiene**, written by the team that built
the app. It is not a legal opinion and it has not been reviewed by a lawyer or a
data protection officer. Nothing here should be read as a claim of compliance
with GDPR, CCPA, COPPA, or any other regime. If FlipStitch ever collects data
from testers in a jurisdiction where that matters, this document is the starting
point for that review, not a substitute for it.

Related: `docs/PLAYTEST-BUNDLE-SPEC.md` (the file format),
`docs/PLAYTEST-PROTOCOL.md` (how sessions are run).

---

## The short version, as told to the tester

> This is a playtest of FlipStitch. We are testing the game, not you.
>
> While you play, this device records what you tap in the puzzle: stitches,
> undos, hints, Peek, restarts, and which hoops you finish.
>
> It does not record your name, email, phone, location, contacts, or anything
> about your device beyond whether it is a phone or a browser.
>
> Nothing is sent anywhere. The report stays on this device until you choose to
> share it at the end, and you can stop at any time.

That text lives in `src/playtest/consent.ts` as data, so the app, this document,
and the exported file cannot drift apart. The rest of this page is the same
promise, spelled out.

---

## What is recorded

**Puzzle actions.** For each level: when it was opened, each valid stitch, each
invalid tap, undos, hints (and which rung of the hint ladder), Peek, restarts,
trapped-thread states, exits, and completions. Each carries a timestamp, an
in-session sequence number, and which play-through it belongs to.

**App lifecycle.** Session start, and when the app went to the background and
came back. The background pair exists for one reason: so an interruption can be
subtracted from the "time to first stitch" measurement rather than counted as
thinking time.

**Progress.** Which levels were completed and in how few stitches.

**Post-test answers.** Only what the tester typed or tapped themselves, only in
the wrap-up screen, and only after they finished playing. Every question is
skippable.

**Build identity.** App version, content revision and structural fingerprint,
build id, build channel, an optional cohort label, and the platform *category*
(`android`, `ios`, `web`).

**An anonymous test id.** See below.

---

## What is not recorded

No name, email address, phone number, or account of any kind — there is no
sign-in anywhere in FlipStitch.

No location, coarse or precise. No contacts. No photos. No microphone or camera
access. No IP address. No MAC address, IMEI, serial number, or Android ID. No
advertising identifier (IDFA / GAID). No device model, manufacturer, OS version
or build, screen size, density, locale, timezone, or carrier. No list of other
installed apps. No screen recording, video, or audio.

No third-party analytics SDK is present in the project — no Firebase, Amplitude,
Mixpanel, Segment, or Sentry. The app makes **no network requests at all**: it
has no `fetch`, no XHR, no WebSocket, and no beacon anywhere in `app/` or
`src/`. `npm run scan:analytics` fails the build if any of that appears, and it
runs in CI on every push.

The absence of device fields is deliberate and load-bearing. Model, OS build,
screen size, locale and timezone are exactly the quasi-identifiers that turn an
anonymous record into a device fingerprint when combined. Platform category is
kept because touch and mouse behaviour genuinely differ and must not be pooled
silently; it is coarse enough to identify nobody.

---

## The anonymous test id

Format: `pi-` followed by a random v4 UUID, e.g.
`pi-10d50c96-0c8f-42d1-951f-20f58b3bd28f`.

**What it is.** A random number generated on the device the first time a
playtest build runs, stored in this app's own storage.

**Why it exists.** One question, and only one: *did these two shared files come
from the same test installation?* Without it, a tester who shares their report
twice would be counted as two players and would quietly inflate the sample.

**What it is not.**

- Not an account, login, or profile.
- Not derived from anything about the device — not hardware ids, not the clock,
  not the locale, not the screen. Two fresh installs on the same physical phone
  produce two unrelated ids, and one install cannot appear on two phones.
- Not a fingerprint. It carries no information about the device at all.
- Not present in the normal consumer build. Nothing mints it there.

**Resetting it.** *Finish test → Reset for the next tester* issues a completely
new id (and clears progress, recorded actions, answers, and consent).

**When to reset:** whenever a different human is about to use the device. Two
testers sharing one id would be merged into a single "player" in analysis and
would halve the real sample without anyone noticing.

**When not to reset:** if the same tester is pausing and continuing later.
Resetting mid-session splits one person into two.

This follows Android's own guidance for app-internal, non-advertising
identifiers — a randomly generated GUID in internal storage rather than a
hardware identifier
(https://developer.android.com/identity/user-data-ids).

---

## Nothing is uploaded

The app never transmits anything. There is no server, no backend, no cloud
project, no crash reporter.

Data leaves the device exactly once, and only when the tester taps **Share
playtest**, which opens the operating system's own share sheet. The tester
chooses where it goes. If the share sheet does not appear, the report can be
shown on screen and copied by hand instead — that path exists so a tester is
never trapped with data they cannot hand over, and it is equally under their
control.

Declining consent is real. On decline, nothing is recorded for the rest of the
run, and there is nothing to export. The game is fully playable either way.

---

## Consent

The disclosure is shown once, before the game is reachable, in playtest builds
only. Even a deep link to an inner route lands on it first.

The decision is stored with a `disclosureVersion`. If the wording of *what we
record* ever changes materially, that version is bumped and any earlier decision
is treated as unknown and asked again — a tester is never held to wording they
never saw.

The normal consumer build shows no consent screen, because it has nothing to
consent to: it records the same local events it has since Milestone 3, keeps
them on the device, and lets the player view, export, or clear them from
Settings.

---

## Handling the files

**Where they live.** In a local directory on the researcher's machine, e.g.
`./playtests/`. That path is in `.gitignore` — real tester data is never
committed to this repository, and no bundle from a real tester appears anywhere
in version control.

**How long to keep them.** Keep raw bundles for the duration of the milestone
they inform, plus a short tail for re-analysis if a gate definition is
questioned — as a working rule, **90 days from the end of the cohort**. After
that, delete the raw bundles and keep only the aggregate report
(`--json report.json`) and the written findings.

**How to delete a bundle.** Delete the `.json` file, and delete the matching row
from the observer CSV. Both are plain files. If a tester asks to withdraw after
the fact, that is the whole procedure — find their `playtestInstallId`, remove
both, and re-run the analysis. Tell them it is done.

**Who sees them.** The people running the study. Bundles are not published, not
attached to issues, not pasted into chat, and not shared outside the team.

**No selling, no sharing, no third parties.** Playtest data is never sold,
licensed, traded, or handed to any advertiser, publisher, analytics vendor, or
data broker. There is no third party in this pipeline at all — the only software
that reads a bundle is the local script in this repository.

**Observer notes are the researcher's, not the player's.** A facilitator's
notes about a tester live in the observer CSV and are never written into that
tester's telemetry stream. A tester's exported file should not contain somebody
else's opinion of them.

---

## Re-identification risk, honestly

A bundle contains a random id, timestamps, and a sequence of puzzle taps. On its
own it identifies nobody.

It is not magic, though. If a researcher separately keeps a note saying "tester 3
was Sam, Tuesday at 2pm", that note is the identifying thing, not the bundle. So:

- Keep recruitment lists **separate** from bundles, and delete them sooner.
- Never put a real name, email, or handle into `observerNotes`. Write "the
  second tester" or nothing.
- Do not include session times of day in write-ups when the cohort is small
  enough for a schedule to single someone out.

---

## Children

FlipStitch has not been designed or reviewed as a product for children, and this
protocol assumes adult testers who can give their own consent. If a session with
a minor is ever proposed, stop and get that reviewed properly first.
