import assert from "node:assert/strict";
import test from "node:test";

import { buildPlaytestBundle, parsePlaytestBundle, type PlaytestBundle } from "./bundle.ts";
import type { BuildChannel, PlatformKind } from "./build.ts";
import {
  analyzeTester,
  backgroundIntervals,
  backgroundOverlap,
  buildCohortReport,
  deriveHypotheses,
  mergeBundles,
  GATE_THRESHOLDS,
  METHODOLOGY_VERSION,
  MIN_SEGMENT_SIZE
} from "./cohort.ts";
import { formatCohortReport, formatFreeTextAnswers } from "./cohort-format.ts";
import { PLAYTEST_SCHEMA_VERSION, type PlaytestEvent, type PlaytestEventName } from "./events.ts";
import type { ObservationRecord } from "./observations.ts";
import { makeQuestionnaireResponse } from "./questionnaire.ts";
import { MIN_GATE_SAMPLE } from "./stats.ts";

const LEVELS = ["l1", "l2", "l3", "l4", "l5"];
const T0 = 1_700_000_000_000;

// ── fixture builders ───────────────────────────────────────────────────────

function installId(index: number): string {
  const tail = String(index).padStart(12, "0");
  return `pi-00000000-0000-4000-8000-${tail}`;
}

type Step = { name: PlaytestEventName; levelId?: string; attemptId?: string; at: number };

function eventsFrom(sessionId: string, steps: readonly Step[]): PlaytestEvent[] {
  return steps.map((step, index) => ({
    schemaVersion: PLAYTEST_SCHEMA_VERSION,
    sessionId,
    seq: index + 1,
    timestamp: T0 + step.at,
    elapsedMs: step.at,
    name: step.name,
    ...(step.levelId === undefined ? {} : { levelId: step.levelId }),
    ...(step.attemptId === undefined ? {} : { attemptId: step.attemptId })
  }));
}

/**
 * One tester playing `levelsCompleted` levels cleanly, `firstStitchMs` after
 * opening Level 1, optionally opening the next level without finishing it.
 */
function playthrough(options: {
  sessionId?: string;
  firstStitchMs?: number;
  levelsCompleted: number;
  opensNextUnfinished?: boolean;
}): PlaytestEvent[] {
  const sessionId = options.sessionId ?? "s1";
  const steps: Step[] = [{ name: "app_session_started", at: 0 }];
  let clock = 1000;
  for (let index = 0; index < options.levelsCompleted; index += 1) {
    const levelId = LEVELS[index];
    const attemptId = `${sessionId}:${levelId}:a1`;
    steps.push({ name: "level_opened", levelId, attemptId, at: clock });
    const gap = index === 0 ? (options.firstStitchMs ?? 4000) : 3000;
    steps.push({ name: "first_valid_stitch", levelId, attemptId, at: clock + gap });
    steps.push({ name: "valid_stitch", levelId, attemptId, at: clock + gap + 2000 });
    steps.push({ name: "level_completed", levelId, attemptId, at: clock + gap + 20_000 });
    clock += gap + 21_000;
  }
  if (options.opensNextUnfinished) {
    const levelId = LEVELS[options.levelsCompleted];
    if (levelId) {
      const attemptId = `${sessionId}:${levelId}:a1`;
      steps.push({ name: "level_opened", levelId, attemptId, at: clock });
      steps.push({ name: "level_exited", levelId, attemptId, at: clock + 5000 });
    }
  }
  return eventsFrom(sessionId, steps);
}

function bundle(options: {
  index: number;
  bundleId?: string;
  events: PlaytestEvent[];
  channel?: BuildChannel;
  platform?: PlatformKind;
  exportedAt?: string;
  responses?: PlaytestBundle["responses"];
  contentRevision?: string;
  contentFingerprint?: string;
}): PlaytestBundle {
  const completed: Record<string, number> = {};
  for (const event of options.events) {
    if (event.name === "level_completed" && event.levelId) completed[event.levelId] = 8;
  }
  return buildPlaytestBundle({
    bundleId: options.bundleId ?? `b-${options.index}`,
    appVersion: "0.1.0",
    contentRevision: options.contentRevision ?? "2c20l.2026-08-27",
    contentFingerprint: options.contentFingerprint ?? "abcdef12",
    buildId: "3689a8f",
    buildChannel: options.channel ?? "playtest",
    cohortId: "gate-1",
    platform: options.platform ?? "android",
    playtestInstallId: installId(options.index),
    installResetCount: 0,
    exportedAt: options.exportedAt
      ? new Date(options.exportedAt)
      : new Date(Date.UTC(2026, 7, 27, 12, 0, 0) + options.index * 60_000),
    events: options.events,
    progress: { completed, lastPlayedLevelId: null },
    responses: options.responses ?? null
  });
}

function observation(index: number, overrides: Partial<ObservationRecord> = {}): ObservationRecord {
  return {
    playtestInstallId: installId(index),
    spokenHelpGiven: "no",
    helpStage: "",
    helpReason: "",
    level1RuleUnderstood: "yes",
    peekUnderstood: "unknown",
    stoppedAtLevel: "",
    observerNotes: "",
    ...overrides
  };
}

function report(bundles: readonly PlaytestBundle[], observations: readonly ObservationRecord[] = []) {
  return buildCohortReport({
    bundles: bundles.map((value, index) => ({ source: `f${index}.json`, bundle: value })),
    observations,
    levelIds: LEVELS,
    generatedAt: "2026-08-27T13:00:00.000Z"
  });
}

// ── zero and tiny cohorts ──────────────────────────────────────────────────

test("zero testers produces no verdicts and says the sample is not measured", () => {
  const result = report([]);
  assert.equal(result.testersTotal, 0);
  assert.equal(result.testersEligible, 0);
  assert.equal(result.gates.levelOneUnaided.verdict, "insufficient-sample");
  assert.equal(result.gates.firstStitch.verdict, "insufficient-sample");
  assert.equal(result.gates.earlyExit.verdict, "insufficient-sample");
  assert.equal(result.gates.levelFourContinuation.verdict, "insufficient-sample");
  assert.match(result.warnings.join(" "), /not measured yet/);
  assert.doesNotThrow(() => formatCohortReport(result));
});

test("one perfect tester still yields no verdict — a sample of one proves nothing", () => {
  const result = report([bundle({ index: 1, events: playthrough({ levelsCompleted: 4 }) })], [observation(1)]);
  assert.equal(result.testersEligible, 1);
  assert.equal(result.gates.levelOneUnaided.estimate.numerator, 1);
  assert.equal(result.gates.levelOneUnaided.estimate.denominator, 1);
  assert.equal(result.gates.levelOneUnaided.estimate.rate, 1);
  assert.equal(result.gates.levelOneUnaided.verdict, "insufficient-sample");
  assert.match(result.warnings.join(" "), /minimum for any gate verdict is 10/);
});

// ── per-tester behaviour ───────────────────────────────────────────────────

test("a tester who quits during Level 1 is an early exit and has no first-stitch time", () => {
  const events = eventsFrom("s1", [
    { name: "app_session_started", at: 0 },
    { name: "level_opened", levelId: "l1", attemptId: "a1", at: 1000 },
    { name: "invalid_stitch", levelId: "l1", attemptId: "a1", at: 4000 },
    { name: "level_exited", levelId: "l1", attemptId: "a1", at: 9000 }
  ]);
  const behaviour = analyzeTester(
    mergeBundles([{ source: "f", bundle: bundle({ index: 1, events }) }]).testers[0],
    LEVELS
  );
  assert.equal(behaviour.startedLevelOne, true);
  assert.equal(behaviour.completedLevelOne, false);
  assert.equal(behaviour.completedFirstThree, false);
  assert.equal(behaviour.firstStitchMs, null);
  assert.equal(behaviour.openedLevelFour, false);
});

test("a tester who quits during Level 2 counts as an early exit", () => {
  const events = playthrough({ levelsCompleted: 1, opensNextUnfinished: true });
  const behaviour = analyzeTester(
    mergeBundles([{ source: "f", bundle: bundle({ index: 1, events }) }]).testers[0],
    LEVELS
  );
  assert.equal(behaviour.completedLevelOne, true);
  assert.equal(behaviour.completedFirstThree, false);
  assert.equal(behaviour.levelsOpened, 2);
});

test("a tester who reaches Level 4 is not an early exit and counts as continuation", () => {
  const events = playthrough({ levelsCompleted: 3, opensNextUnfinished: true });
  const behaviour = analyzeTester(
    mergeBundles([{ source: "f", bundle: bundle({ index: 1, events }) }]).testers[0],
    LEVELS
  );
  assert.equal(behaviour.completedFirstThree, true);
  assert.equal(behaviour.completedLevelThree, true);
  assert.equal(behaviour.openedLevelFour, true);
  assert.equal(behaviour.levelFourVoluntary, true);
  assert.equal(behaviour.levelFourAnomaly, false);
});

test("opening Level 4 before completing Level 3 is an anomaly, never continuation", () => {
  const events = eventsFrom("s1", [
    { name: "app_session_started", at: 0 },
    { name: "level_opened", levelId: "l4", attemptId: "a0", at: 500 },
    { name: "level_exited", levelId: "l4", attemptId: "a0", at: 900 },
    ...[
      { name: "level_opened" as const, levelId: "l1", attemptId: "a1", at: 1000 },
      { name: "first_valid_stitch" as const, levelId: "l1", attemptId: "a1", at: 4000 },
      { name: "level_completed" as const, levelId: "l1", attemptId: "a1", at: 20_000 },
      { name: "level_opened" as const, levelId: "l2", attemptId: "a2", at: 21_000 },
      { name: "level_completed" as const, levelId: "l2", attemptId: "a2", at: 40_000 },
      { name: "level_opened" as const, levelId: "l3", attemptId: "a3", at: 41_000 },
      { name: "level_completed" as const, levelId: "l3", attemptId: "a3", at: 60_000 }
    ]
  ]);
  const result = report([bundle({ index: 1, events })]);
  const behaviour = result.behaviours[0];
  assert.equal(behaviour.openedLevelFour, true);
  assert.equal(behaviour.levelFourVoluntary, false, "an open before the unlock is not a voluntary choice");
  assert.equal(behaviour.levelFourAnomaly, true);
  assert.equal(result.gates.levelFourContinuation.estimate.numerator, 0);
  assert.equal(result.gates.levelFourContinuation.anomalousOpens, 1);
  assert.match(result.warnings.join(" "), /before the tester completed Level 3/);
});

// ── first-stitch timing ────────────────────────────────────────────────────

test("first-stitch time comes from the first Level 1 attempt, not a later restart", () => {
  const events = eventsFrom("s1", [
    { name: "app_session_started", at: 0 },
    { name: "level_opened", levelId: "l1", attemptId: "a1", at: 1000 },
    { name: "first_valid_stitch", levelId: "l1", attemptId: "a1", at: 6000 },
    { name: "restart_used", levelId: "l1", attemptId: "a1", at: 7000 },
    { name: "level_opened", levelId: "l1", attemptId: "a2", at: 7500 },
    { name: "first_valid_stitch", levelId: "l1", attemptId: "a2", at: 7600 },
    { name: "level_completed", levelId: "l1", attemptId: "a2", at: 20_000 }
  ]);
  const behaviour = analyzeTester(
    mergeBundles([{ source: "f", bundle: bundle({ index: 1, events }) }]).testers[0],
    LEVELS
  );
  assert.equal(behaviour.firstStitchMs, 5000, "the fast restart must not replace the real first attempt");
});

test("time spent backgrounded is subtracted from the first-stitch measurement", () => {
  const events = eventsFrom("s1", [
    { name: "app_session_started", at: 0 },
    { name: "level_opened", levelId: "l1", attemptId: "a1", at: 1000 },
    { name: "app_backgrounded", at: 3000 },
    { name: "app_foregrounded", at: 123_000 },
    { name: "first_valid_stitch", levelId: "l1", attemptId: "a1", at: 125_000 },
    { name: "level_completed", levelId: "l1", attemptId: "a1", at: 140_000 }
  ]);
  const behaviour = analyzeTester(
    mergeBundles([{ source: "f", bundle: bundle({ index: 1, events }) }]).testers[0],
    LEVELS
  );
  assert.equal(behaviour.firstStitchBackgroundMs, 120_000);
  assert.equal(behaviour.firstStitchMs, 4000, "a two-minute phone call is not thinking time");
});

test("background intervals close at the last event when the app never returns", () => {
  const events = eventsFrom("s1", [
    { name: "level_opened", levelId: "l1", at: 1000 },
    { name: "app_backgrounded", at: 5000 },
    { name: "level_exited", levelId: "l1", at: 9000 }
  ]);
  const intervals = backgroundIntervals(events);
  assert.deepEqual(intervals, [{ start: T0 + 5000, end: T0 + 9000 }]);
  assert.equal(backgroundOverlap(T0 + 4000, T0 + 6000, intervals), 1000);
  assert.equal(backgroundOverlap(T0, T0 + 1000, intervals), 0);
});

// ── the gates ──────────────────────────────────────────────────────────────

test("spoken help removes a tester from the unaided numerator but not the denominator", () => {
  const bundles = [
    bundle({ index: 1, events: playthrough({ levelsCompleted: 1 }) }),
    bundle({ index: 2, events: playthrough({ levelsCompleted: 1 }) })
  ];
  const helped = report(bundles, [
    observation(1),
    observation(2, { spokenHelpGiven: "yes", helpStage: "level 1, after 40s" })
  ]);
  assert.equal(helped.gates.levelOneUnaided.estimate.denominator, 2);
  assert.equal(helped.gates.levelOneUnaided.estimate.numerator, 1, "the helped tester completed but not unaided");
  assert.equal(helped.gates.levelOneUnaided.helpedTesters, 1);
});

test("an unobserved tester cannot contribute to the unaided gate at all", () => {
  const result = report(
    [
      bundle({ index: 1, events: playthrough({ levelsCompleted: 1 }) }),
      bundle({ index: 2, events: playthrough({ levelsCompleted: 1 }) })
    ],
    [observation(1)]
  );
  assert.equal(result.gates.levelOneUnaided.estimate.denominator, 1);
  assert.equal(result.gates.levelOneUnaided.unobservedTesters, 1);
  assert.equal(result.gates.levelOneUnaided.unobservedCompletion.numerator, 1);
  assert.equal(result.gates.levelOneUnaided.unobservedCompletion.denominator, 1);
  assert.match(formatCohortReport(result), /NOT gate evidence/);
});

test("an observation recorded as 'unknown' help is treated as unobserved", () => {
  const result = report([bundle({ index: 1, events: playthrough({ levelsCompleted: 1 }) })], [
    observation(1, { spokenHelpGiven: "unknown" })
  ]);
  assert.equal(result.gates.levelOneUnaided.estimate.denominator, 0);
  assert.equal(result.gates.levelOneUnaided.unobservedTesters, 1);
});

test("the early-exit and Level 4 gates are not complements of each other", () => {
  // Twelve testers who finish Levels 1-3 and then stop. Nobody exits early,
  // and nobody continues — which is exactly the case a complementary pair of
  // definitions could not express.
  const bundles = Array.from({ length: 12 }, (_, index) =>
    bundle({ index: index + 1, events: playthrough({ levelsCompleted: 3 }) })
  );
  const result = report(bundles);
  assert.equal(result.gates.earlyExit.estimate.numerator, 0);
  assert.equal(result.gates.earlyExit.estimate.denominator, 12);
  assert.equal(result.gates.levelFourContinuation.estimate.numerator, 0);
  assert.equal(result.gates.levelFourContinuation.estimate.denominator, 12);
  assert.equal(result.gates.levelFourContinuation.verdict, "not-met");

  // 0 of 12 early exits is a 0% point estimate, but the Wilson upper bound is
  // still ~24% — above the 20% line. Twelve testers cannot prove this gate,
  // and the report says so rather than printing a tick.
  assert.equal(result.gates.earlyExit.estimate.rate, 0);
  assert.equal(result.gates.earlyExit.verdict, "promising");

  // With a real cohort behind it the same behaviour does clear the gate.
  const larger = report(
    Array.from({ length: 60 }, (_, index) =>
      bundle({ index: index + 1, events: playthrough({ levelsCompleted: 3 }) })
    )
  );
  assert.equal(larger.gates.earlyExit.verdict, "met-with-evidence");
  assert.equal(larger.gates.levelFourContinuation.verdict, "not-met");
});

test("the Level 4 denominator only includes testers who were offered Level 4", () => {
  const bundles = [
    ...Array.from({ length: 6 }, (_, index) =>
      bundle({ index: index + 1, events: playthrough({ levelsCompleted: 3, opensNextUnfinished: true }) })
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      bundle({ index: index + 7, events: playthrough({ levelsCompleted: 1 }) })
    )
  ];
  const result = report(bundles);
  assert.equal(result.testersEligible, 12);
  assert.equal(result.gates.earlyExit.estimate.numerator, 6, "the six who stopped at Level 1 exited early");
  assert.equal(result.gates.levelFourContinuation.estimate.denominator, 6, "only the finishers were offered Level 4");
  assert.equal(result.gates.levelFourContinuation.estimate.numerator, 6);
});

test("gate thresholds are the ones written in docs/PRODUCT.md", () => {
  assert.deepEqual(GATE_THRESHOLDS, {
    levelOneUnaidedCompletion: 0.8,
    firstStitchMedianMs: 10_000,
    earlyExit: 0.2,
    levelFourContinuation: 0.6
  });
  assert.equal(METHODOLOGY_VERSION, 1);
});

test("a threshold-boundary cohort is reported as promising, never as met", () => {
  // Exactly 80% unaided: 16 of 20.
  const bundles = Array.from({ length: 20 }, (_, index) =>
    bundle({ index: index + 1, events: playthrough({ levelsCompleted: index < 16 ? 1 : 0 }) })
  );
  // Testers with zero completed levels still need to have opened Level 1.
  const withOpens = bundles.map((value, index) =>
    index < 16
      ? value
      : bundle({
          index: index + 1,
          events: eventsFrom("s1", [
            { name: "level_opened", levelId: "l1", attemptId: "a1", at: 1000 },
            { name: "level_exited", levelId: "l1", attemptId: "a1", at: 9000 }
          ])
        })
  );
  const result = report(withOpens, withOpens.map((_, index) => observation(index + 1)));
  assert.equal(result.gates.levelOneUnaided.estimate.numerator, 16);
  assert.equal(result.gates.levelOneUnaided.estimate.denominator, 20);
  assert.equal(result.gates.levelOneUnaided.estimate.rate, 0.8);
  assert.equal(result.gates.levelOneUnaided.verdict, "promising");
});

// ── duplicates and multiple sessions ───────────────────────────────────────

test("the same export shared twice is one tester, not two", () => {
  const first = bundle({ index: 1, events: playthrough({ levelsCompleted: 2 }) });
  const result = report([first, first]);
  assert.equal(result.testersTotal, 1);
  assert.equal(result.testersEligible, 1);
  assert.equal(result.bundlesRead, 2);
  assert.equal(result.bundlesAccepted, 1);
  assert.equal(result.duplicateBundles, 1);
});

test("re-exporting the same data under a new bundle id is still one tester", () => {
  const events = playthrough({ levelsCompleted: 2 });
  const result = report([
    bundle({ index: 1, bundleId: "b-a", events, exportedAt: "2026-08-27T12:00:00.000Z" }),
    bundle({ index: 1, bundleId: "b-b", events, exportedAt: "2026-08-27T12:30:00.000Z" })
  ]);
  assert.equal(result.testersTotal, 1);
  assert.equal(result.duplicateBundles, 1);
  assert.equal(result.behaviours[0].levelsCompleted, 2);
});

test("a re-export that only adds questionnaire answers keeps them without double counting", () => {
  const events = playthrough({ levelsCompleted: 2 });
  const result = report([
    bundle({ index: 1, bundleId: "b-a", events, exportedAt: "2026-08-27T12:00:00.000Z" }),
    bundle({
      index: 1,
      bundleId: "b-b",
      events,
      exportedAt: "2026-08-27T12:30:00.000Z",
      responses: makeQuestionnaireResponse({ wouldPlayAnother: "yes", ruleInOwnWords: "it flips" }, 99)
    })
  ]);
  assert.equal(result.testersTotal, 1);
  assert.equal(result.duplicateBundles, 0);
  assert.equal(result.ledger[1].acceptance.kind, "superseded-responses");
  assert.equal(result.behaviours[0].responses?.answers.wouldPlayAnother, "yes");
  assert.match(formatFreeTextAnswers(result), /it flips/);
});

test("a genuinely later session from the same install is merged, never dropped", () => {
  const firstSession = playthrough({ sessionId: "s1", levelsCompleted: 1 });
  const secondSession = eventsFrom("s2", [
    { name: "app_session_started", at: 0 },
    { name: "level_opened", levelId: "l2", attemptId: "s2:l2:a1", at: 1000 },
    { name: "first_valid_stitch", levelId: "l2", attemptId: "s2:l2:a1", at: 4000 },
    { name: "level_completed", levelId: "l2", attemptId: "s2:l2:a1", at: 20_000 }
  ]);
  const result = report([
    bundle({ index: 1, bundleId: "b-a", events: firstSession, exportedAt: "2026-08-27T12:00:00.000Z" }),
    bundle({
      index: 1,
      bundleId: "b-b",
      events: [...firstSession, ...secondSession],
      exportedAt: "2026-08-27T13:00:00.000Z"
    })
  ]);
  assert.equal(result.testersTotal, 1, "two exports from one install are one tester");
  assert.equal(result.bundlesAccepted, 2, "and the later session is not discarded");
  assert.equal(result.behaviours[0].levelsCompleted, 2);
  assert.equal(result.behaviours[0].startedLevelOne, true);
  // The overlapping first session is unioned, not duplicated.
  const opens = result.ledger.length;
  assert.equal(opens, 2);
});

// ── channel exclusion, corruption, and platform mix ────────────────────────

test("developer and production bundles are excluded by build channel, not by guesswork", () => {
  const result = report([
    bundle({ index: 1, events: playthrough({ levelsCompleted: 4 }), channel: "development" }),
    bundle({ index: 2, events: playthrough({ levelsCompleted: 4 }), channel: "production" }),
    bundle({ index: 3, events: playthrough({ levelsCompleted: 4 }), channel: "playtest" })
  ]);
  assert.equal(result.testersTotal, 3);
  assert.equal(result.testersEligible, 1);
  assert.equal(result.bundlesExcludedByChannel, 2);
  assert.equal(result.testersExcluded.length, 2);
  assert.match(result.testersExcluded[0].reason, /build channel/);
  assert.match(result.testersExcluded[0].reason, /never behavioural evidence/);
});

test("an install that never opened Level 1 is excluded with its own reason", () => {
  const result = report([bundle({ index: 1, events: eventsFrom("s1", [{ name: "app_session_started", at: 0 }]) })]);
  assert.equal(result.testersEligible, 0);
  assert.equal(result.testersExcluded[0].reason, "never opened Level 1");
});

test("a corrupt or wrong-version file is rejected before it can reach the cohort", () => {
  const good = bundle({ index: 1, events: playthrough({ levelsCompleted: 2 }) });
  const inputs = ["{ broken", JSON.stringify({ bundleVersion: 99 }), JSON.stringify(good)];
  const parsed = inputs.map((raw) => parsePlaytestBundle(raw));
  assert.equal(parsed[0].ok, false);
  assert.equal(parsed[1].ok, false);
  assert.ok(parsed[2].ok);
  const result = report(parsed.filter((entry) => entry.ok).map((entry) => entry.bundle));
  assert.equal(result.testersEligible, 1);
});

test("mixed web and mobile testers are split when both sides are large enough", () => {
  const bundles = [
    ...Array.from({ length: MIN_SEGMENT_SIZE }, (_, index) =>
      bundle({ index: index + 1, events: playthrough({ levelsCompleted: 3, opensNextUnfinished: true }), platform: "android" })
    ),
    ...Array.from({ length: MIN_SEGMENT_SIZE }, (_, index) =>
      bundle({ index: index + 20, events: playthrough({ levelsCompleted: 1 }), platform: "web" })
    )
  ];
  const result = report(bundles);
  assert.equal(result.platformCounts.android, MIN_SEGMENT_SIZE);
  assert.equal(result.platformCounts.web, MIN_SEGMENT_SIZE);
  const names = result.segments.map((segment) => segment.name);
  assert.deepEqual(names, ["all testers", "mobile (android/ios)", "web"]);
  assert.equal(result.segments[1].gates.earlyExit.estimate.numerator, 0);
  assert.equal(result.segments[2].gates.earlyExit.estimate.numerator, MIN_SEGMENT_SIZE);
});

test("a tiny platform group is not split out, and the pooling is said out loud", () => {
  const bundles = [
    ...Array.from({ length: 8 }, (_, index) =>
      bundle({ index: index + 1, events: playthrough({ levelsCompleted: 2 }), platform: "android" })
    ),
    bundle({ index: 30, events: playthrough({ levelsCompleted: 2 }), platform: "web" })
  ];
  const result = report(bundles);
  const names = result.segments.map((segment) => segment.name);
  assert.deepEqual(names, ["all testers", "mobile (android/ios)"], "one web tester is not a comparison group");
  assert.match(result.warnings.join(" "), /not interchangeable/);
});

test("two content revisions in one cohort are flagged rather than pooled silently", () => {
  const result = report([
    bundle({ index: 1, events: playthrough({ levelsCompleted: 2 }), contentRevision: "2c20l.2026-08-27" }),
    bundle({
      index: 2,
      events: playthrough({ levelsCompleted: 2 }),
      contentRevision: "2c21l.2026-09-01",
      contentFingerprint: "99999999"
    })
  ]);
  assert.equal(result.contentRevisions.length, 2);
  assert.match(result.warnings.join(" "), /not one cohort/);
});

// ── diagnostics and hypotheses ─────────────────────────────────────────────

test("diagnostics count testers, not raw events, for per-tester signals", () => {
  const events = eventsFrom("s1", [
    { name: "level_opened", levelId: "l1", attemptId: "a1", at: 1000 },
    { name: "hint_used", levelId: "l1", attemptId: "a1", at: 2000 },
    { name: "hint_used", levelId: "l1", attemptId: "a1", at: 3000 },
    { name: "peek_used", levelId: "l1", attemptId: "a1", at: 4000 },
    { name: "invalid_stitch", levelId: "l1", attemptId: "a1", at: 5000 },
    { name: "first_valid_stitch", levelId: "l1", attemptId: "a1", at: 6000 },
    { name: "level_completed", levelId: "l1", attemptId: "a1", at: 20_000 }
  ]);
  const result = report([bundle({ index: 1, events })]);
  assert.equal(result.diagnostics.testersUsingHintOnLevelOne, 1, "two hints from one tester is one tester");
  assert.equal(result.diagnostics.testersUsingPeekOnLevelOne, 1);
  assert.equal(result.diagnostics.invalidShortlyAfterPeek, 1);
  assert.equal(result.diagnostics.byLevel[0].hints, 2);
  assert.equal(result.diagnostics.byLevel[0].testersCompleted, 1);
  assert.equal(result.diagnostics.invalidMoveRate, 0.5);
});

test("hypotheses are labelled as things to check and never assert a cause", () => {
  const result = report([]);
  assert.deepEqual(deriveHypotheses(result.gates, result.diagnostics, 0), []);

  const bundles = Array.from({ length: 12 }, (_, index) =>
    bundle({
      index: index + 1,
      events: eventsFrom("s1", [
        { name: "level_opened", levelId: "l1", attemptId: "a1", at: 1000 },
        { name: "invalid_stitch", levelId: "l1", attemptId: "a1", at: 2000 },
        { name: "invalid_stitch", levelId: "l1", attemptId: "a1", at: 3000 },
        { name: "invalid_stitch", levelId: "l1", attemptId: "a1", at: 4000 },
        { name: "invalid_stitch", levelId: "l1", attemptId: "a1", at: 5000 },
        { name: "level_exited", levelId: "l1", attemptId: "a1", at: 9000 }
      ])
    })
  );
  const struggling = report(bundles, bundles.map((_, index) => observation(index + 1)));
  const text = struggling.hypotheses.map((h) => `${h.hypothesis} ${h.check}`).join(" ");
  assert.ok(struggling.hypotheses.length > 0);
  assert.match(text, /may|possible/i, "hypotheses must be hedged, not asserted");
  for (const hypothesis of struggling.hypotheses) {
    assert.ok(hypothesis.check.length > 0, "every hypothesis names the next thing a human should look at");
  }
  assert.match(formatCohortReport(struggling), /not findings, not causes/);
});

// ── output ─────────────────────────────────────────────────────────────────

test("the formatted report leads with the four gates and shows every interval", () => {
  const bundles = Array.from({ length: 12 }, (_, index) =>
    bundle({ index: index + 1, events: playthrough({ levelsCompleted: 3, opensNextUnfinished: true }) })
  );
  const text = formatCohortReport(report(bundles, bundles.map((_, index) => observation(index + 1))));
  const gatesAt = text.indexOf("PRODUCT GATES");
  const diagnosticsAt = text.indexOf("DIAGNOSTICS");
  assert.ok(gatesAt >= 0 && diagnosticsAt > gatesAt, "gates must not be buried under diagnostics");
  assert.match(text, /1\. LEVEL 1 UNAIDED COMPLETION/);
  assert.match(text, /2\. TIME TO FIRST VALID STITCH/);
  assert.match(text, /3\. EARLY EXIT DURING THE FIRST THREE LEVELS/);
  assert.match(text, /4\. CHOSE TO START LEVEL 4/);
  assert.match(text, /Wilson/);
  assert.match(text, /adjusted Wald/);
  assert.match(text, /NOT graded automatically/);
  assert.ok(!text.includes("undefined"), "no formatting hole may print 'undefined'");
});

test("a zero numerator is reported with its rule-of-three upper bound", () => {
  const bundles = Array.from({ length: 12 }, (_, index) =>
    bundle({ index: index + 1, events: playthrough({ levelsCompleted: 3 }) })
  );
  const text = formatCohortReport(report(bundles));
  assert.match(text, /rule of three/);
});

test("the free-text view prints answers verbatim and ungraded", () => {
  const result = report([
    bundle({
      index: 1,
      events: playthrough({ levelsCompleted: 1 }),
      responses: makeQuestionnaireResponse(
        { ruleInOwnWords: "you swap to the other side each time", wouldPlayAnother: "unsure" },
        50
      )
    })
  ]);
  const text = formatFreeTextAnswers(result);
  assert.match(text, /you swap to the other side each time/);
  assert.match(text, /ungraded/);
  assert.ok(!text.includes("correct"), "the tool must not judge a natural-language answer");
});

test("minimum sample constants are the documented ones", () => {
  assert.equal(MIN_GATE_SAMPLE, 10);
  assert.equal(MIN_SEGMENT_SIZE, 5);
});
