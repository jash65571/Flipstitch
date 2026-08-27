# Research — Milestone 9: external playtesting and behavioural measurement

Research pass behind Prompt 9. The question this milestone had to answer was
not "how do we build a telemetry pipeline" — we already had local events since
Milestone 3 — but **what makes a number from a handful of testers honest**, and
what a playtest has to look like for that number to mean anything.

Each entry records the source, the finding, the FlipStitch implication, and the
decision it changed. Where a source contradicted our instinct, that is written
down rather than smoothed over.

---

## 1. Qualitative and quantitative testing are different studies

**Source** — Nielsen Norman Group, *Why You Only Need to Test with 5 Users* and
*Why 5 Participants Are Okay in a Qualitative Study, but Not in a Quantitative
One* (https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/,
https://www.nngroup.com/articles/5-test-users-qual-quant/).

**Finding** — Across 83 of NN/g's own consulting projects, testing more than
five users produced very few additional *findings*; the return on the sixth
participant is close to zero. That result is about **discovering problems**. It
says nothing about **estimating a rate**, where five people give an estimate so
wide it is nearly uninformative.

**FlipStitch implication** — "Five people found no problems" and "80% of players
complete Level 1" are not the same claim and cannot come from the same session
count. Prompt 8.2 left us with content we believe in and no evidence about
players; the temptation is to run five friends and call the gate met.

**Decision affected** — The milestone splits into two named activities that
never share a number:

- **Exploratory usability testing** (pilot) — find confusion. Small n is fine.
- **Behavioural gate evaluation** (gate cohort) — estimate rates. Small n is not.

`src/playtest/cohort.ts` refuses to print a gate verdict below
`MIN_GATE_SAMPLE`, and `docs/PLAYTEST-PROTOCOL.md` describes the two stages
separately.

---

## 2. The quantitative sample size we are actually aiming at

**Source** — NN/g, *How Many Participants for Quantitative Usability Studies: A
Summary of Sample-Size Recommendations*
(https://www.nngroup.com/articles/summary-quant-sample-sizes/).

**Finding** — For a binary metric such as a completion rate, 39–40 participants
gives roughly a ±15% margin of error at 95% confidence; 21 gives ±20%; dropping
to 90% confidence buys 28 and 15 respectively. Their default recommendation is
40.

**FlipStitch implication** — Our gates are three proportions and one median. At
n = 12 a 95% interval on a proportion spans roughly 25–30 points, which cannot
distinguish "80% pass" from "55% pass". A prelaunch indie project will not
easily recruit 40 fresh players, but that is a recruiting problem to be stated,
not a statistical problem to be assumed away.

**Decision affected** — `TARGET_GATE_SAMPLE = 40` with the reasoning recorded in
`src/playtest/stats.ts`. `MIN_GATE_SAMPLE = 10` is the floor below which no
verdict is printed at all — chosen as our own line, not from a source, because
below it even a correct interval is so wide that a verdict would be theatre.
The cohort report warns whenever the cohort sits between the two.

---

## 3. Wald intervals lie at small n; Wilson and adjusted Wald do not

**Source** — Sauro & Lewis, *Estimating Completion Rates from Small Samples
Using Binomial Confidence Intervals* (HFES;
https://measuringu.com/papers/sauro-lewisHFES.pdf) and MeasuringU's completion
rate calculator notes (https://measuringu.com/calculators/wald/).

**Finding** — The textbook Wald interval "grossly understates the width of the
true interval when sample sizes are small". The score (Wilson) and adjusted
Wald (Agresti-Coull) methods give average coverage closest to the nominal 95%.
MeasuringU recommends adjusted Wald for samples under about 150.

**FlipStitch implication** — The naive interval would have made our small
cohorts look far more conclusive than they are — precisely the failure mode this
milestone exists to prevent.

**Decision affected** — `wilsonInterval` is the primary interval reported for
every proportion, and `adjustedWaldInterval` is printed beside it as a
cross-check: two methods agreeing is a cheap sanity signal, and a reader who
knows one method sees a familiar number. Both are unit tested against
hand-worked values in `src/playtest/stats.test.ts`.

---

## 4. Zero events still have an upper bound

**Source** — the rule of three, as discussed in MeasuringU's small-sample
guidance (https://measuringu.com/small-n/) — with zero observed events in n
trials the 95% upper bound on the true rate is about 3/n; getting a failure rate
upper bound down to 5% needs about 62 clean trials.

**FlipStitch implication** — "Nobody quit early" from 12 testers reads as a
solved problem and is not one: the true early-exit rate could still be 25%.

**Decision affected** — Any gate with a zero numerator prints its rule-of-three
upper bound in `src/playtest/cohort-format.ts`. This is not decoration: in the
rehearsal run, 0 of 12 early exits classified as **promising**, not **met**,
because the Wilson upper bound (~24%) sits above the 20% threshold. The test
`the early-exit and Level 4 gates are not complements of each other` locks that
behaviour in.

---

## 5. Task times are skewed; report the centre honestly

**Source** — MeasuringU, *Best Practices for Using Statistics on Small Sample
Sizes* (https://measuringu.com/small-n/).

**Finding** — For task times use the geometric mean when n < 25, because one
very slow participant drags the arithmetic mean but barely moves the log-scale
centre; above about 25 the median is a fine centre. Confidence intervals on
small samples will be wide — 20 to 30 percentage points — and that is the
correct thing to show.

**FlipStitch implication** — Our gate is written in terms of a *median* ("median
time to the first valid stitch under 10 seconds"). We were told not to weaken or
silently redefine gates, and swapping the median for a geometric mean would be
exactly that.

**Decision affected** — The gate stays a median. The geometric mean is reported
**alongside** it whenever n < 25, labelled as such, as extra context for a human
— never as the number the gate is judged on. We also added a distribution-free
95% interval for the median from binomial order statistics, so the median is not
reported as a bare point either. Below about six observations no such interval
exists at 95%, and the report says so rather than inventing one.

---

## 6. Percentages are fine at small n — the fix is the interval, not hiding

**Source** — MeasuringU, *Should You Report Numbers or Percentages in
Small-Sample Studies?*
(https://measuringu.com/should-you-report-numbers-with-small-n/).

**Finding** — A proportion is computable at any sample size; the problem is not
the percentage but the missing uncertainty. Report raw counts *and* percentages,
drop spurious decimals, and always attach a confidence interval.

**FlipStitch implication** — An earlier instinct was to suppress percentages
below some n. That would have hidden information rather than qualifying it.

**Decision affected** — Every proportion prints as "k of n", a whole-number
percentage, and its interval. Nothing is suppressed; the verdict is what is
withheld when the sample is too small.

---

## 7. Moderated vs unmoderated, and what each can measure

**Source** — NN/g, *Unmoderated Usability Testing*
(https://www.nngroup.com/articles/unmoderated-usability-testing/).

**Finding** — Unmoderated testing scales to large samples quickly and suits
quantitative benchmarking on a working product, but participants cannot ask for
clarification, engage less realistically, and cannot be redirected. Moderated
sessions capture the behavioural nuance that unmoderated ones cannot.

**FlipStitch implication** — The two halves of our study want opposite things.
The unaided-completion gate *requires* a human to witness whether help was
given; the sample-size gates want the reach only unmoderated testing gives.

**Decision affected** — The gates were split by what each method can actually
evidence. Gate 1 (unaided Level 1 completion) counts **only moderated testers
with an observation record** — an unmoderated tester's Level 1 completion is
reported separately and explicitly labelled *not gate evidence*. Gates 2, 3 and
4 are derivable from telemetry alone and accept both.

---

## 8. Facilitators must not become the tutorial

**Source** — NN/g, *Checklist for Moderating a Usability Test*
(https://www.nngroup.com/articles/usability-checklist/) and *Thinking Aloud: The
#1 Usability Tool*
(https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/).

**Finding** — Say "we're testing the design, not you". Avoid the word "test"
with participants where possible. Do not interrupt during a task; ask follow-ups
afterwards, starting broad ("Do you have any thoughts about doing this
activity?") before narrowing. Warn up front that you may not be able to help
immediately. Note also the counterweight: the more the facilitator talks, the
more the participant treats the session as a conversation, and a think-aloud
protocol *does* need occasional prompting to keep going.

**FlipStitch implication** — Our whole product claim is "the rule is understood
in five seconds without a tutorial". A facilitator who says "try tapping a
glowing hole" has just delivered the tutorial and destroyed that session's
value as evidence.

**Decision affected** — `docs/PLAYTEST-PROTOCOL.md` gives the observer a script
with an explicit silence rule, a bounded list of neutral prompts that keep
think-aloud going without teaching, and a hard requirement to record *any*
spoken help with its stage and reason. A helped tester is not discarded — they
stay in the gate's denominator and out of its numerator, because that is what
"completed without spoken help" means.

---

## 9. Informed consent, in plain language

**Source** — GOV.UK Service Manual, *Getting users' consent for research*
(https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research).

**Finding** — Participants must be told who is doing the research and why, what
is collected, whether the session is recorded or observed, how results are used
and shared, how long data is kept, and that participation is voluntary and can
be withdrawn at any time — in accessible language.

**FlipStitch implication** — We needed disclosure that satisfies all of that
without becoming a wall of text in front of a game.

**Decision affected** — `CONSENT_DISCLOSURE` in `src/playtest/consent.ts` is
four sentences covering purpose, what is recorded, what is *not* recorded, and
the fact that nothing is sent until the tester chooses to share. A test asserts
it stays at most five lines. Declining is a real, equally prominent button that
turns recording off for the whole run. `DISCLOSURE_VERSION` is stored with the
decision, so if the wording of what we record ever changes, prior consent is
treated as unknown and asked again rather than silently reused.

---

## 10. Don't put a wall in front of the game

**Source** — Apple, *Onboarding for games*
(https://developer.apple.com/app-store/onboarding-for-games/) and the Human
Interface Guidelines' onboarding and launching pages.

**Finding** — Avoid splash screens, menus, agreements, and disclaimers when a
new player opens the app; give players an active role and let self-directed play
start as soon as possible; teach the core loop one step at a time rather than in
one long tutorial; never assume prior knowledge.

**FlipStitch implication** — Two consequences. First, the consent screen is
exactly the kind of thing Apple warns about — so it exists **only** in the
playtest build and never ships to a consumer. Second, and more importantly, this
is a reason *not* to add onboarding before measuring: the current design already
follows the "playable tutorial, one step at a time" shape, and adding arrows or
an explanation popup now would both violate the guidance and destroy the
baseline.

**Decision affected** — `PlaytestGate` is a pass-through component in the normal
build. Level 1 is completely unchanged this milestone — verified in the browser
against the real playtest build (`docs/MILESTONE-9-QA.md`).

---

## 11. Ask questions that do not contain their own answers

**Source** — GOV.UK Service Manual, *Designing good questions*
(https://www.gov.uk/service-manual/design/designing-good-questions) and
*Researching user experiences*.

**Finding** — Know why you are asking every question. Closed questions are
easier to answer than open ones, especially for people worried about being
caught out, and are more accessible to people who find reading or writing hard —
but a poorly framed closed question forces an answer that does not exist (their
example: users unsure what "counted" as a second address).

**FlipStitch implication** — "Was the Peek feature clear?" fails twice: it
asserts Peek is a feature worth praising, and it tells a tester what Peek was
for at the exact moment we want to find out whether they knew.

**Decision affected** — Four of the five post-test questions are open text with
no valence. The one closed question ("Would you play another puzzle?") keeps a
genuine middle option, because a forced yes/no manufactures agreement. Every
question is skippable — a blank answer is data, and pressure to answer is
pressure to invent. A test in `src/playtest/bundle.test.ts` scans the prompts
for loaded words.

---

## 12. Do not let a model grade comprehension

**Source** — this milestone's own constraint, supported by the general GUR
principle in the source below that behavioural evidence beats interpreted
opinion.

**Finding** — There is no validated automatic way to decide whether "you swap
sides each time" means the tester understood the forced-flip rule, and an
LLM-graded comprehension score would be an unvalidated instrument dressed as a
measurement.

**Decision affected** — Free-text answers are stored verbatim and printed
verbatim. `formatFreeTextAnswers` is explicitly labelled *ungraded*, and a test
asserts the output never contains the word "correct". Human coding is the method
for this milestone. No cloud call is made — the app has no network code at all,
enforced by `npm run scan:analytics`.

---

## 13. Indie playtesting is resource-constrained, and that shapes the tooling

**Source** — Denisova, A., Bromley, S., Mirza-Babaei, P., & Mekler, E. D.
(2024). *Towards democratisation of games user research: Exploring playtesting
challenges of indie video game developers.* Proceedings of the ACM on
Human-Computer Interaction 343. https://doi.org/10.1145/3677108

**Finding** — From interviews with 13 indie professionals: established games
user research practice assumes resources, knowledge and expertise indies do not
have. Recruiting suitable participants and **managing playtest data** are named
obstacles. The paper argues for adapting GUR practice to be reachable rather
than importing it wholesale.

**FlipStitch implication** — A research platform, a hosted analytics service, or
a bespoke database would all be things we cannot maintain and would not use.
Data management being a named pain point is the reason to invest in the boring
part: reading files, rejecting bad ones, and not double-counting.

**Decision affected** — The whole analysis layer is a local script over JSON
files on disk: no server, no database, no SaaS. `npm run playtest:cohort -- ./playtests/`.
Observer records are a CSV a moderator fills in on a laptop between sessions.
Corrupt and wrong-version files are reported and skipped instead of stopping the
run, because the realistic failure mode is one tester's file arriving mangled at
11pm.

---

## 14. Behaviour beats stated opinion

**Source** — IGDA Games Research and User Experience SIG (https://igda.org/sigs/grux/)
and the practitioner framing at https://gamesuserresearch.com/ — reliable
methods focus on players' actual behaviour rather than subjective feedback, and
choosing the right mixture of methods is the researcher's main job.

**FlipStitch implication** — Our four gates are already behavioural (completion,
timing, exit, continuation), which is the right instinct. The risk was letting
the questionnaire quietly become the evidence because free text is easier to
read than a confidence interval.

**Decision affected** — The report layout puts the four behavioural gates
first, alone, above everything else; a test asserts the gates section precedes
diagnostics. Questionnaire answers appear in a separate section labelled for
human coding, and only one questionnaire item (`wouldPlayAnother`) is ever
counted — never converted into a pass/fail.

---

## 15. Anonymous identity without fingerprinting

**Source** — Android developers, *Best practices for unique identifiers*
(https://developer.android.com/identity/user-data-ids).

**Finding** — Prefer user-resettable identifiers; avoid hardware identifiers
(IMEI, serial, MAC, SSAID) which survive factory resets and enable long-term
tracking. For analytics and app-internal purposes the recommendation is an
app-scoped randomly generated GUID (`UUID.randomUUID()`) kept in internal
storage: resettable, cleared on uninstall, and impossible to correlate across
apps. The advertising ID is for advertising only, and quasi-identifiers such as
timestamps and device model must not be used to re-join data.

**FlipStitch implication** — We genuinely needed *some* stable identity, because
one tester exporting twice must not become two testers in the denominator. That
is a real analysis requirement, and it is also exactly the requirement that
tempts people into device fingerprints.

**Decision affected** — `src/playtest/install.ts` mints a random v4 UUID
prefixed `pi-`, stores it in this app's own AsyncStorage, and offers a reset that
issues a completely unrelated id. It is derived from nothing: not the device,
not the clock, not the locale. It is written into bundles **only** in playtest
builds. The last warning in that source shaped the bundle schema too — no device
model, OS build, screen size, locale, or timezone is recorded, only the platform
*category*, because those fields are precisely the quasi-identifiers that would
turn an anonymous record into a fingerprint. A test asserts the serialised
bundle contains none of them.

---

## 16. Web recruiting is useful, and must not be pooled with touch

**Source** — the NN/g unmoderated-testing guidance in §7, applied to platform.

**Finding** — Unmoderated reach is the argument for a browser build; the
argument against pooling is that the interaction is genuinely different.

**FlipStitch implication** — A browser build is by far the fastest way to reach
testers, and FlipStitch's web target already works. But FlipStitch is an
Android/iOS product and tapping a small hole with a finger is not clicking it
with a mouse.

**Decision affected** — `platform` is recorded as a category on every bundle,
and the cohort report emits per-platform gate blocks whenever both mobile and
web reach `MIN_SEGMENT_SIZE` (5). Below that the groups are pooled in the
headline and the report **says so in a warning**, because silently pooling four
web testers into a mobile rate is the mistake worth guarding against. Mobile
remains the primary product.

---

## What the research did not settle

- **Recruitment.** No source solves finding 40 fresh players for an unreleased
  indie puzzle game. The protocol names this as the binding constraint and the
  reason the pilot comes first.
- **The exact floor for a verdict.** `MIN_GATE_SAMPLE = 10` is our judgement,
  not a cited value. It is deliberately generous to the "no verdict" side.
- **Whether the four thresholds are the right thresholds.** They came from
  `docs/PRODUCT.md` and were preserved unchanged, as instructed. Whether 80% is
  the right bar for Level 1 is a product question that real data may inform
  later; it was not ours to move before measuring.
