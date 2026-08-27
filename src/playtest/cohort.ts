/**
 * Cohort aggregation: many tester bundles in, four product gates out.
 *
 * This module is the locked methodology. It is pure, dependency-free, and
 * fully unit tested, and it exists so the gate definitions are settled in code
 * and documentation *before* real tester data arrives — not adjusted
 * afterwards until the numbers look better (Goal 34). If a definition turns
 * out to be wrong, bump `METHODOLOGY_VERSION` and report both.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * The four gates from docs/PRODUCT.md, made exact
 * ────────────────────────────────────────────────────────────────────────────
 *
 * A **tester** is one `playtestInstallId` from bundles whose `buildChannel` is
 * `playtest`. Bundles from `development` or `production` builds are our own QA
 * and are excluded by build metadata, never by guessing (Goal 18).
 *
 * A tester is **eligible** when they opened Level 1 at least once. Somebody who
 * installed the build and never started is not evidence about onboarding.
 *
 * 1. **Level 1 unaided completion ≥ 80%.**
 *    Denominator: eligible testers with a moderator observation recording
 *    `spokenHelpGiven` as a definite yes or no. Telemetry cannot see a person
 *    talking, so an unobserved tester simply cannot contribute to this gate;
 *    their Level 1 completion is reported separately and labelled as not gate
 *    evidence.
 *    Numerator: those with `spokenHelpGiven = no` **and** a `level_completed`
 *    for Level 1. A tester who was helped stays in the denominator and is
 *    excluded from the numerator — that is what "without spoken help" means.
 *
 * 2. **Median time to first valid stitch < 10s.**
 *    One measurement per tester, from their **first** Level 1 attempt only, so
 *    no single tester's restarts can move the median. The measurement is
 *    `first_valid_stitch.timestamp − level_opened.timestamp`, minus any time
 *    the app spent backgrounded inside that interval (see `backgroundOverlap`).
 *    Testers who never placed a valid stitch have no measurement and are
 *    counted separately rather than being scored as infinity or dropped
 *    silently.
 *
 * 3. **Fewer than 20% exit during the first three levels.**
 *    Denominator: eligible testers.
 *    Numerator: testers who did not complete all of Levels 1, 2 and 3.
 *
 *    The obvious alternative — "started Level 1 but never opened Level 4" —
 *    was rejected, and the reason is recorded here rather than in a commit
 *    message: it is the exact complement of gate 4's event, which would make
 *    gate 4 arithmetically redundant (gate 3 could only pass if gate 4 passed
 *    at 80%). Under the definition used, the two gates test genuinely
 *    different things: gate 3 asks whether the first three hoops lose people
 *    mid-way, gate 4 asks whether people who finished them chose to continue.
 *    Note this makes gate 3 *looser* in isolation — a tester who finished
 *    Levels 1-3 and then stopped is not an "early exit" — because that tester
 *    is precisely what gate 4 is for. The pair is stricter than either
 *    reading alone.
 *
 * 4. **At least 60% choose to start Level 4.**
 *    Denominator: testers who completed Level 3, i.e. those to whom Level 4
 *    was actually offered. Asking the question of someone who never got there
 *    measures gate 3 again, not continuation.
 *    Numerator: those who opened Level 4 **voluntarily** — the open must come
 *    after their own Level 3 completion, through normal progression. An open
 *    that precedes the unlock (a deep link, a test harness, an unlock-all
 *    build) is not continuation and is reported as an anomaly instead of being
 *    counted.
 *
 * Everything else this module computes is diagnostic context, and the
 * hypotheses in `deriveHypotheses` are explicitly labelled as things for a
 * human to check — never as findings.
 */

import type { PlaytestBundle } from "./bundle.ts";
import type { PlaytestEvent } from "./events.ts";
import type { ObservationRecord } from "./observations.ts";
import {
  classifyGate,
  classifyMedianGate,
  estimateProportion,
  summarizeSample,
  MIN_GATE_SAMPLE,
  TARGET_GATE_SAMPLE,
  type GateVerdict,
  type ProportionEstimate,
  type SampleSummary
} from "./stats.ts";

/** Bump only when a gate definition changes, and report both versions if so. */
export const METHODOLOGY_VERSION = 1;

export const GATE_THRESHOLDS = {
  levelOneUnaidedCompletion: 0.8,
  firstStitchMedianMs: 10_000,
  earlyExit: 0.2,
  levelFourContinuation: 0.6
} as const;

/** Only bundles from this channel count as external behavioural evidence. */
export const EVIDENCE_CHANNEL = "playtest";

// ────────────────────────────────────────────────────────────────────────────
// Merging bundles into testers
// ────────────────────────────────────────────────────────────────────────────

export type BundleAcceptance =
  | { kind: "accepted" }
  | { kind: "duplicate"; of: string }
  | { kind: "superseded-responses"; of: string }
  | { kind: "excluded-channel"; channel: string };

export type BundleLedgerEntry = {
  source: string;
  bundleId: string;
  playtestInstallId: string;
  exportedAt: string;
  eventCount: number;
  acceptance: BundleAcceptance;
};

export type TesterRecord = {
  playtestInstallId: string;
  platform: PlaytestBundle["platform"];
  buildChannel: PlaytestBundle["buildChannel"];
  cohortId: string | null;
  appVersion: string;
  contentRevision: string;
  contentFingerprint: string;
  buildId: string;
  /** Bundles that contributed events to this tester. */
  bundleCount: number;
  events: PlaytestEvent[];
  sessionCount: number;
  progress: PlaytestBundle["progress"];
  responses: PlaytestBundle["responses"];
  observation: ObservationRecord | null;
};

function eventKey(event: PlaytestEvent): string {
  return `${event.sessionId}:${event.seq}`;
}

/**
 * Folds bundles into one record per install.
 *
 * Duplicate rules, in order:
 *  1. The same `bundleId` twice is the same export shared twice — dropped.
 *  2. The same install exporting the same `eventsFingerprint` again is the
 *     same data re-shared — dropped, *unless* the second copy carries newer
 *     questionnaire answers, in which case the answers are taken and the entry
 *     is recorded as `superseded-responses` rather than as a duplicate.
 *  3. Anything else from an install already seen is a genuinely later export
 *     (another session, or more play). Its events are unioned by
 *     (sessionId, seq); the tester count does not move. This is why a tester
 *     who exports after Level 2 and again after Level 4 is one tester with all
 *     of their play, and never two testers or a lost second session.
 */
export function mergeBundles(
  entries: readonly { source: string; bundle: PlaytestBundle }[]
): { testers: TesterRecord[]; ledger: BundleLedgerEntry[] } {
  const byInstall = new Map<string, TesterRecord>();
  const seenBundleIds = new Map<string, string>();
  const seenFingerprints = new Map<string, string>();
  const ledger: BundleLedgerEntry[] = [];
  const eventKeys = new Map<string, Set<string>>();

  const ordered = [...entries].sort((a, b) => a.bundle.exportedAt.localeCompare(b.bundle.exportedAt));

  for (const { source, bundle } of ordered) {
    const base = {
      source,
      bundleId: bundle.bundleId,
      playtestInstallId: bundle.playtestInstallId,
      exportedAt: bundle.exportedAt,
      eventCount: bundle.events.length
    };

    const previousBundle = seenBundleIds.get(bundle.bundleId);
    if (previousBundle !== undefined) {
      ledger.push({ ...base, acceptance: { kind: "duplicate", of: previousBundle } });
      continue;
    }

    const fingerprintKey = `${bundle.playtestInstallId}:${bundle.eventsFingerprint}`;
    const previousFingerprint = seenFingerprints.get(fingerprintKey);
    if (previousFingerprint !== undefined) {
      const existing = byInstall.get(bundle.playtestInstallId);
      const newerResponses =
        bundle.responses !== null &&
        (existing?.responses === null ||
          existing === undefined ||
          bundle.responses.respondedAt > (existing.responses?.respondedAt ?? -1));
      if (newerResponses && existing) {
        existing.responses = bundle.responses;
        seenBundleIds.set(bundle.bundleId, bundle.bundleId);
        ledger.push({ ...base, acceptance: { kind: "superseded-responses", of: previousFingerprint } });
        continue;
      }
      ledger.push({ ...base, acceptance: { kind: "duplicate", of: previousFingerprint } });
      continue;
    }

    seenBundleIds.set(bundle.bundleId, bundle.bundleId);
    seenFingerprints.set(fingerprintKey, bundle.bundleId);

    const existing = byInstall.get(bundle.playtestInstallId);
    if (!existing) {
      byInstall.set(bundle.playtestInstallId, {
        playtestInstallId: bundle.playtestInstallId,
        platform: bundle.platform,
        buildChannel: bundle.buildChannel,
        cohortId: bundle.cohortId,
        appVersion: bundle.appVersion,
        contentRevision: bundle.contentRevision,
        contentFingerprint: bundle.contentFingerprint,
        buildId: bundle.buildId,
        bundleCount: 1,
        events: [...bundle.events],
        sessionCount: 0,
        progress: { completed: { ...bundle.progress.completed }, lastPlayedLevelId: bundle.progress.lastPlayedLevelId },
        responses: bundle.responses,
        observation: null
      });
      eventKeys.set(bundle.playtestInstallId, new Set(bundle.events.map(eventKey)));
    } else {
      const keys = eventKeys.get(bundle.playtestInstallId) as Set<string>;
      for (const event of bundle.events) {
        const key = eventKey(event);
        if (keys.has(key)) continue;
        keys.add(key);
        existing.events.push(event);
      }
      existing.bundleCount += 1;
      for (const [levelId, moves] of Object.entries(bundle.progress.completed)) {
        const current = existing.progress.completed[levelId];
        existing.progress.completed[levelId] = current === undefined ? moves : Math.min(current, moves);
      }
      if (bundle.progress.lastPlayedLevelId) existing.progress.lastPlayedLevelId = bundle.progress.lastPlayedLevelId;
      if (bundle.responses && (existing.responses === null || bundle.responses.respondedAt > existing.responses.respondedAt)) {
        existing.responses = bundle.responses;
      }
    }
    ledger.push({ ...base, acceptance: { kind: "accepted" } });
  }

  const testers = [...byInstall.values()].map((tester) => {
    tester.events.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    tester.sessionCount = new Set(tester.events.map((event) => event.sessionId)).size;
    return tester;
  });

  return { testers, ledger };
}

// ────────────────────────────────────────────────────────────────────────────
// Per-tester behaviour
// ────────────────────────────────────────────────────────────────────────────

export type BackgroundInterval = { start: number; end: number };

/**
 * Reconstructs the intervals the app spent backgrounded, per session.
 *
 * A `app_backgrounded` with no matching `app_foregrounded` (the tester never
 * came back) is left open-ended and closed at the last event in that session,
 * which is the most conservative reading available.
 */
export function backgroundIntervals(events: readonly PlaytestEvent[]): BackgroundInterval[] {
  const bySession = new Map<string, PlaytestEvent[]>();
  for (const event of events) {
    const list = bySession.get(event.sessionId) ?? [];
    list.push(event);
    bySession.set(event.sessionId, list);
  }
  const intervals: BackgroundInterval[] = [];
  for (const sessionEvents of bySession.values()) {
    const ordered = [...sessionEvents].sort((a, b) => a.seq - b.seq);
    const lastTimestamp = ordered.length > 0 ? ordered[ordered.length - 1].timestamp : 0;
    let open: number | null = null;
    for (const event of ordered) {
      if (event.name === "app_backgrounded" && open === null) open = event.timestamp;
      if (event.name === "app_foregrounded" && open !== null) {
        if (event.timestamp > open) intervals.push({ start: open, end: event.timestamp });
        open = null;
      }
    }
    if (open !== null && lastTimestamp > open) intervals.push({ start: open, end: lastTimestamp });
  }
  return intervals;
}

/** Milliseconds of [start, end] that overlap any backgrounded interval. */
export function backgroundOverlap(start: number, end: number, intervals: readonly BackgroundInterval[]): number {
  let total = 0;
  for (const interval of intervals) {
    const low = Math.max(start, interval.start);
    const high = Math.min(end, interval.end);
    if (high > low) total += high - low;
  }
  return total;
}

export type TesterBehaviour = {
  playtestInstallId: string;
  platform: PlaytestBundle["platform"];
  eligible: boolean;
  startedLevelOne: boolean;
  completedLevelOne: boolean;
  completedFirstThree: boolean;
  completedLevelThree: boolean;
  openedLevelFour: boolean;
  levelFourVoluntary: boolean;
  levelFourAnomaly: boolean;
  /** Background-adjusted milliseconds, or null when no valid stitch was placed. */
  firstStitchMs: number | null;
  /** Milliseconds removed because the app was backgrounded mid-measurement. */
  firstStitchBackgroundMs: number;
  levelsOpened: number;
  levelsCompleted: number;
  deepestLevelIndexOpened: number;
  counts: {
    validStitches: number;
    invalidStitches: number;
    undos: number;
    hints: number;
    peeks: number;
    restarts: number;
    traps: number;
  };
  levelOneCounts: { invalidStitches: number; hints: number; peeks: number; undos: number; restarts: number };
  levelTwoHints: number;
  /** invalid_stitch events that happened within `PEEK_FOLLOW_MS` after a peek. */
  invalidAfterPeek: number;
  observation: ObservationRecord | null;
  responses: PlaytestBundle["responses"];
};

/** Window in which an invalid move is treated as "shortly after a Peek". */
export const PEEK_FOLLOW_MS = 15_000;

export function analyzeTester(tester: TesterRecord, levelIds: readonly string[]): TesterBehaviour {
  const levelOneId = levelIds[0];
  const levelTwoId = levelIds[1];
  const levelThreeId = levelIds[2];
  const levelFourId = levelIds[3];
  const backgrounds = backgroundIntervals(tester.events);
  const ordered = [...tester.events].sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);

  const opened = new Set<string>();
  const completed = new Set<string>();
  const counts = { validStitches: 0, invalidStitches: 0, undos: 0, hints: 0, peeks: 0, restarts: 0, traps: 0 };
  const levelOneCounts = { invalidStitches: 0, hints: 0, peeks: 0, undos: 0, restarts: 0 };
  let levelTwoHints = 0;
  let invalidAfterPeek = 0;
  let lastPeekAt: number | null = null;

  // First Level 1 attempt only: the earliest open, and the first valid stitch
  // that belongs to that same attempt.
  let firstLevelOneOpenAt: number | null = null;
  let firstLevelOneAttemptId: string | null = null;
  let firstStitchAt: number | null = null;
  let levelThreeCompletedAt: number | null = null;
  let firstLevelFourOpenAt: number | null = null;

  for (const event of ordered) {
    switch (event.name) {
      case "first_valid_stitch":
      case "valid_stitch":
        counts.validStitches += 1;
        break;
      case "invalid_stitch":
        counts.invalidStitches += 1;
        if (event.levelId === levelOneId) levelOneCounts.invalidStitches += 1;
        if (lastPeekAt !== null && event.timestamp - lastPeekAt <= PEEK_FOLLOW_MS) invalidAfterPeek += 1;
        break;
      case "undo_used":
        counts.undos += 1;
        if (event.levelId === levelOneId) levelOneCounts.undos += 1;
        break;
      case "hint_used":
        counts.hints += 1;
        if (event.levelId === levelOneId) levelOneCounts.hints += 1;
        if (event.levelId === levelTwoId) levelTwoHints += 1;
        break;
      case "peek_used":
        counts.peeks += 1;
        lastPeekAt = event.timestamp;
        if (event.levelId === levelOneId) levelOneCounts.peeks += 1;
        break;
      case "restart_used":
        counts.restarts += 1;
        if (event.levelId === levelOneId) levelOneCounts.restarts += 1;
        break;
      case "thread_trapped":
        counts.traps += 1;
        break;
      default:
        break;
    }

    if (event.levelId === undefined) continue;
    if (event.name === "level_opened") {
      opened.add(event.levelId);
      if (event.levelId === levelOneId && firstLevelOneOpenAt === null) {
        firstLevelOneOpenAt = event.timestamp;
        firstLevelOneAttemptId = event.attemptId ?? null;
      }
      if (event.levelId === levelFourId && firstLevelFourOpenAt === null) firstLevelFourOpenAt = event.timestamp;
    }
    if (event.name === "level_completed") {
      completed.add(event.levelId);
      if (event.levelId === levelThreeId && levelThreeCompletedAt === null) levelThreeCompletedAt = event.timestamp;
    }
    if (
      (event.name === "first_valid_stitch" || event.name === "valid_stitch") &&
      event.levelId === levelOneId &&
      firstStitchAt === null &&
      firstLevelOneOpenAt !== null &&
      event.timestamp >= firstLevelOneOpenAt &&
      // Restarts open a new attempt; only the first attempt is measured.
      (firstLevelOneAttemptId === null || event.attemptId === undefined || event.attemptId === firstLevelOneAttemptId)
    ) {
      firstStitchAt = event.timestamp;
    }
  }

  let firstStitchMs: number | null = null;
  let firstStitchBackgroundMs = 0;
  if (firstLevelOneOpenAt !== null && firstStitchAt !== null && firstStitchAt >= firstLevelOneOpenAt) {
    firstStitchBackgroundMs = backgroundOverlap(firstLevelOneOpenAt, firstStitchAt, backgrounds);
    firstStitchMs = Math.max(0, firstStitchAt - firstLevelOneOpenAt - firstStitchBackgroundMs);
  }

  const startedLevelOne = levelOneId !== undefined && opened.has(levelOneId);
  const completedLevelOne = levelOneId !== undefined && completed.has(levelOneId);
  const completedFirstThree =
    levelOneId !== undefined &&
    levelTwoId !== undefined &&
    levelThreeId !== undefined &&
    completed.has(levelOneId) &&
    completed.has(levelTwoId) &&
    completed.has(levelThreeId);
  const openedLevelFour = levelFourId !== undefined && opened.has(levelFourId);
  const levelFourVoluntary =
    openedLevelFour &&
    levelThreeCompletedAt !== null &&
    firstLevelFourOpenAt !== null &&
    firstLevelFourOpenAt >= levelThreeCompletedAt;
  const levelFourAnomaly = openedLevelFour && !levelFourVoluntary;

  const deepestLevelIndexOpened = levelIds.reduce(
    (deepest, levelId, index) => (opened.has(levelId) ? index : deepest),
    -1
  );

  return {
    playtestInstallId: tester.playtestInstallId,
    platform: tester.platform,
    eligible: tester.buildChannel === EVIDENCE_CHANNEL && startedLevelOne,
    startedLevelOne,
    completedLevelOne,
    completedFirstThree,
    completedLevelThree: levelThreeId !== undefined && completed.has(levelThreeId),
    openedLevelFour,
    levelFourVoluntary,
    levelFourAnomaly,
    firstStitchMs,
    firstStitchBackgroundMs,
    levelsOpened: opened.size,
    levelsCompleted: completed.size,
    deepestLevelIndexOpened,
    counts,
    levelOneCounts,
    levelTwoHints,
    invalidAfterPeek,
    observation: tester.observation,
    responses: tester.responses
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Gates
// ────────────────────────────────────────────────────────────────────────────

export type ProportionGate = {
  id: string;
  label: string;
  definition: string;
  threshold: number;
  direction: "at-least" | "below";
  estimate: ProportionEstimate;
  verdict: GateVerdict;
};

export type MedianGate = {
  id: string;
  label: string;
  definition: string;
  thresholdMs: number;
  summary: SampleSummary;
  /** Eligible testers who never placed a valid stitch on Level 1. */
  withoutMeasurement: number;
  /** Measurements that had backgrounded time subtracted. */
  backgroundAdjusted: number;
  verdict: GateVerdict;
};

export type CohortGates = {
  levelOneUnaided: ProportionGate & {
    /** Eligible testers with no definite observation — cannot contribute. */
    unobservedTesters: number;
    /** Their raw Level 1 completion. Context only, not gate evidence. */
    unobservedCompletion: ProportionEstimate;
    helpedTesters: number;
  };
  firstStitch: MedianGate;
  earlyExit: ProportionGate;
  levelFourContinuation: ProportionGate & { anomalousOpens: number };
};

function computeGates(behaviours: readonly TesterBehaviour[], minSample: number): CohortGates {
  const eligible = behaviours.filter((behaviour) => behaviour.eligible);

  // Gate 1 — unaided Level 1 completion, moderated testers only.
  const observed = eligible.filter(
    (behaviour) => behaviour.observation !== null && behaviour.observation.spokenHelpGiven !== "unknown"
  );
  const unaidedCompleted = observed.filter(
    (behaviour) => behaviour.observation?.spokenHelpGiven === "no" && behaviour.completedLevelOne
  ).length;
  const helped = observed.filter((behaviour) => behaviour.observation?.spokenHelpGiven === "yes").length;
  const unobserved = eligible.filter(
    (behaviour) => behaviour.observation === null || behaviour.observation.spokenHelpGiven === "unknown"
  );
  const gateOneEstimate = estimateProportion(unaidedCompleted, observed.length);

  // Gate 2 — median time to first valid stitch.
  const measurements = eligible
    .map((behaviour) => behaviour.firstStitchMs)
    .filter((value): value is number => value !== null);
  const summary = summarizeSample(measurements);

  // Gate 3 — exit during the first three levels.
  const exitedEarly = eligible.filter((behaviour) => !behaviour.completedFirstThree).length;
  const gateThreeEstimate = estimateProportion(exitedEarly, eligible.length);

  // Gate 4 — voluntary continuation to Level 4.
  const offeredLevelFour = eligible.filter((behaviour) => behaviour.completedLevelThree);
  const continued = offeredLevelFour.filter((behaviour) => behaviour.levelFourVoluntary).length;
  const gateFourEstimate = estimateProportion(continued, offeredLevelFour.length);

  return {
    levelOneUnaided: {
      id: "level-one-unaided-completion",
      label: "Level 1 completed without spoken help",
      definition:
        "Denominator: eligible testers with a moderator observation recording spoken help as a definite yes or no. Numerator: spokenHelpGiven = no AND a level_completed for Level 1. Helped testers stay in the denominator.",
      threshold: GATE_THRESHOLDS.levelOneUnaidedCompletion,
      direction: "at-least",
      estimate: gateOneEstimate,
      verdict: classifyGate(gateOneEstimate, GATE_THRESHOLDS.levelOneUnaidedCompletion, "at-least", minSample),
      unobservedTesters: unobserved.length,
      unobservedCompletion: estimateProportion(
        unobserved.filter((behaviour) => behaviour.completedLevelOne).length,
        unobserved.length
      ),
      helpedTesters: helped
    },
    firstStitch: {
      id: "first-valid-stitch-median",
      label: "Median time to the first valid stitch",
      definition:
        "One measurement per eligible tester, from their first Level 1 attempt: first_valid_stitch minus level_opened, minus any backgrounded time inside that interval. Testers who never placed a valid stitch have no measurement and are counted separately.",
      thresholdMs: GATE_THRESHOLDS.firstStitchMedianMs,
      summary,
      withoutMeasurement: eligible.length - measurements.length,
      backgroundAdjusted: eligible.filter((behaviour) => behaviour.firstStitchBackgroundMs > 0).length,
      verdict: classifyMedianGate(summary, GATE_THRESHOLDS.firstStitchMedianMs, minSample)
    },
    earlyExit: {
      id: "early-exit-first-three-levels",
      label: "Exited during the first three levels",
      definition:
        "Denominator: eligible testers. Numerator: testers who did not complete all of Levels 1, 2 and 3. Chosen over 'never opened Level 4' so that this gate and the Level 4 continuation gate are not complements of each other.",
      threshold: GATE_THRESHOLDS.earlyExit,
      direction: "below",
      estimate: gateThreeEstimate,
      verdict: classifyGate(gateThreeEstimate, GATE_THRESHOLDS.earlyExit, "below", minSample)
    },
    levelFourContinuation: {
      id: "level-four-continuation",
      label: "Chose to start Level 4",
      definition:
        "Denominator: eligible testers who completed Level 3, i.e. those actually offered Level 4. Numerator: those whose first Level 4 open came at or after their own Level 3 completion, through normal progression. Opens that precede the unlock are anomalies, not continuation.",
      threshold: GATE_THRESHOLDS.levelFourContinuation,
      direction: "at-least",
      estimate: gateFourEstimate,
      verdict: classifyGate(gateFourEstimate, GATE_THRESHOLDS.levelFourContinuation, "at-least", minSample),
      anomalousOpens: eligible.filter((behaviour) => behaviour.levelFourAnomaly).length
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Diagnostics and hypotheses
// ────────────────────────────────────────────────────────────────────────────

export type LevelDiagnostic = {
  levelId: string;
  levelNumber: number;
  testersOpened: number;
  testersCompleted: number;
  completionRate: number | null;
  invalidStitches: number;
  validStitches: number;
  invalidRate: number | null;
  hints: number;
  peeks: number;
  undos: number;
  restarts: number;
  traps: number;
};

export type CohortDiagnostics = {
  invalidMoveRate: number | null;
  levelOneInvalidPerTester: number | null;
  testersUsingHintOnLevelOne: number;
  testersUsingPeekOnLevelOne: number;
  testersUsingUndo: number;
  testersRestarting: number;
  testersHittingTrap: number;
  invalidShortlyAfterPeek: number;
  levelTwoHintTesters: number;
  byLevel: LevelDiagnostic[];
  wouldPlayAnother: { yes: number; no: number; unsure: number; unanswered: number };
};

function computeDiagnostics(
  behaviours: readonly TesterBehaviour[],
  testers: readonly TesterRecord[],
  levelIds: readonly string[]
): CohortDiagnostics {
  const eligible = behaviours.filter((behaviour) => behaviour.eligible);
  const eligibleIds = new Set(eligible.map((behaviour) => behaviour.playtestInstallId));
  const eligibleTesters = testers.filter((tester) => eligibleIds.has(tester.playtestInstallId));

  const openedByLevel = new Map<string, Set<string>>();
  const completedByLevel = new Map<string, Set<string>>();
  const perLevel = new Map<
    string,
    { invalid: number; valid: number; hints: number; peeks: number; undos: number; restarts: number; traps: number }
  >();
  for (const levelId of levelIds) {
    openedByLevel.set(levelId, new Set());
    completedByLevel.set(levelId, new Set());
    perLevel.set(levelId, { invalid: 0, valid: 0, hints: 0, peeks: 0, undos: 0, restarts: 0, traps: 0 });
  }

  for (const tester of eligibleTesters) {
    for (const event of tester.events) {
      if (event.levelId === undefined) continue;
      const bucket = perLevel.get(event.levelId);
      if (!bucket) continue;
      switch (event.name) {
        case "level_opened":
          openedByLevel.get(event.levelId)?.add(tester.playtestInstallId);
          break;
        case "level_completed":
          completedByLevel.get(event.levelId)?.add(tester.playtestInstallId);
          break;
        case "first_valid_stitch":
        case "valid_stitch":
          bucket.valid += 1;
          break;
        case "invalid_stitch":
          bucket.invalid += 1;
          break;
        case "hint_used":
          bucket.hints += 1;
          break;
        case "peek_used":
          bucket.peeks += 1;
          break;
        case "undo_used":
          bucket.undos += 1;
          break;
        case "restart_used":
          bucket.restarts += 1;
          break;
        case "thread_trapped":
          bucket.traps += 1;
          break;
        default:
          break;
      }
    }
  }

  const totalValid = eligible.reduce((sum, behaviour) => sum + behaviour.counts.validStitches, 0);
  const totalInvalid = eligible.reduce((sum, behaviour) => sum + behaviour.counts.invalidStitches, 0);

  const wouldPlay = { yes: 0, no: 0, unsure: 0, unanswered: 0 };
  for (const behaviour of eligible) {
    const answer = behaviour.responses?.answers.wouldPlayAnother;
    if (answer === "yes") wouldPlay.yes += 1;
    else if (answer === "no") wouldPlay.no += 1;
    else if (answer === "unsure") wouldPlay.unsure += 1;
    else wouldPlay.unanswered += 1;
  }

  return {
    invalidMoveRate: totalValid + totalInvalid > 0 ? totalInvalid / (totalValid + totalInvalid) : null,
    levelOneInvalidPerTester:
      eligible.length > 0
        ? eligible.reduce((sum, behaviour) => sum + behaviour.levelOneCounts.invalidStitches, 0) / eligible.length
        : null,
    testersUsingHintOnLevelOne: eligible.filter((behaviour) => behaviour.levelOneCounts.hints > 0).length,
    testersUsingPeekOnLevelOne: eligible.filter((behaviour) => behaviour.levelOneCounts.peeks > 0).length,
    testersUsingUndo: eligible.filter((behaviour) => behaviour.counts.undos > 0).length,
    testersRestarting: eligible.filter((behaviour) => behaviour.counts.restarts > 0).length,
    testersHittingTrap: eligible.filter((behaviour) => behaviour.counts.traps > 0).length,
    invalidShortlyAfterPeek: eligible.reduce((sum, behaviour) => sum + behaviour.invalidAfterPeek, 0),
    levelTwoHintTesters: eligible.filter((behaviour) => behaviour.levelTwoHints > 0).length,
    byLevel: levelIds.map((levelId, index) => {
      const bucket = perLevel.get(levelId) as NonNullable<ReturnType<typeof perLevel.get>>;
      const openedCount = openedByLevel.get(levelId)?.size ?? 0;
      const completedCount = completedByLevel.get(levelId)?.size ?? 0;
      return {
        levelId,
        levelNumber: index + 1,
        testersOpened: openedCount,
        testersCompleted: completedCount,
        completionRate: openedCount > 0 ? completedCount / openedCount : null,
        invalidStitches: bucket.invalid,
        validStitches: bucket.valid,
        invalidRate: bucket.valid + bucket.invalid > 0 ? bucket.invalid / (bucket.valid + bucket.invalid) : null,
        hints: bucket.hints,
        peeks: bucket.peeks,
        undos: bucket.undos,
        restarts: bucket.restarts,
        traps: bucket.traps
      };
    }),
    wouldPlayAnother: wouldPlay
  };
}

export type Hypothesis = { signal: string; hypothesis: string; check: string };

/**
 * Diagnostic hypotheses — never conclusions.
 *
 * Each one pairs an observed signal with a *possible* explanation and the next
 * thing a human should look at. They deliberately do not name a cause: two of
 * these patterns have at least three plausible readings each, and a report
 * that says "the rule is unclear" when it means "many invalid moves happened"
 * is how a team redesigns the wrong thing.
 */
export function deriveHypotheses(gates: CohortGates, diagnostics: CohortDiagnostics, eligible: number): Hypothesis[] {
  const hypotheses: Hypothesis[] = [];
  if (eligible === 0) return hypotheses;

  const levelOneRate = gates.levelOneUnaided.estimate.rate;
  const highInvalid = (diagnostics.levelOneInvalidPerTester ?? 0) >= 3;
  if (levelOneRate !== null && levelOneRate < GATE_THRESHOLDS.levelOneUnaidedCompletion && highInvalid) {
    hypotheses.push({
      signal: `Level 1 unaided completion ${(levelOneRate * 100).toFixed(0)}% with ${(diagnostics.levelOneInvalidPerTester ?? 0).toFixed(1)} invalid taps per tester on Level 1.`,
      hypothesis: "Testers may not be reading which holes are legal, or which side is active, before tapping.",
      check: "Watch the session recordings or notes for where the first invalid tap lands relative to the needle."
    });
  }

  const continuation = gates.levelFourContinuation.estimate.rate;
  if (
    levelOneRate !== null &&
    levelOneRate >= GATE_THRESHOLDS.levelOneUnaidedCompletion &&
    continuation !== null &&
    continuation < GATE_THRESHOLDS.levelFourContinuation
  ) {
    hypotheses.push({
      signal: "Level 1 completion meets its threshold but Level 4 continuation does not.",
      hypothesis: "Comprehension may be fine while early engagement or pacing is not — people understand it and still stop.",
      check: "Read the 'would you play another puzzle' answers and the free-text comments from testers who stopped."
    });
  }

  if (diagnostics.testersUsingPeekOnLevelOne > 0 && diagnostics.invalidShortlyAfterPeek >= diagnostics.testersUsingPeekOnLevelOne) {
    hypotheses.push({
      signal: `${diagnostics.invalidShortlyAfterPeek} invalid tap(s) occurred within ${PEEK_FOLLOW_MS / 1000}s of a Peek.`,
      hypothesis: "Peek may be read as a side change rather than a look, leaving testers unsure which side is live when it closes.",
      check: "Compare against docs/PREVIEW-INTERACTION.md and ask observers what testers said Peek did."
    });
  }

  if (diagnostics.levelTwoHintTesters / eligible >= 0.5) {
    hypotheses.push({
      signal: `${diagnostics.levelTwoHintTesters} of ${eligible} eligible testers asked for a hint on Level 2.`,
      hypothesis: "The step from Level 1 to Level 2 may be steeper than the tutorial arc intends.",
      check: "Compare the measured difficulty jump in docs/DIFFICULTY-MATRIX.md with where hints were requested."
    });
  }

  const noStitch = gates.firstStitch.withoutMeasurement;
  if (noStitch > 0 && noStitch / eligible >= 0.2) {
    hypotheses.push({
      signal: `${noStitch} of ${eligible} eligible testers never placed a valid stitch on Level 1.`,
      hypothesis: "The first action may not be discoverable — testers may not know the hoop is tappable at all.",
      check: "Check observer notes for what testers tried first before any valid stitch."
    });
  }

  return hypotheses;
}

// ────────────────────────────────────────────────────────────────────────────
// The cohort report
// ────────────────────────────────────────────────────────────────────────────

export type CohortSegment = {
  name: string;
  testers: number;
  gates: CohortGates;
};

export type CohortReport = {
  methodologyVersion: number;
  generatedAt: string;
  bundlesRead: number;
  bundlesAccepted: number;
  duplicateBundles: number;
  bundlesExcludedByChannel: number;
  testersTotal: number;
  testersEligible: number;
  testersExcluded: { installId: string; reason: string }[];
  observationsMatched: number;
  observationsUnmatched: string[];
  contentRevisions: string[];
  contentFingerprints: string[];
  appVersions: string[];
  buildIds: string[];
  cohortIds: string[];
  platformCounts: Record<string, number>;
  gates: CohortGates;
  segments: CohortSegment[];
  diagnostics: CohortDiagnostics;
  hypotheses: Hypothesis[];
  behaviours: TesterBehaviour[];
  ledger: BundleLedgerEntry[];
  warnings: string[];
};

export type CohortInput = {
  bundles: readonly { source: string; bundle: PlaytestBundle }[];
  observations?: readonly ObservationRecord[];
  levelIds: readonly string[];
  /** ISO timestamp for the report header. Injected so output is testable. */
  generatedAt?: string;
  minSample?: number;
  /** Smallest segment that gets its own gate block printed. */
  minSegmentSize?: number;
};

/** Below this, a platform split is noise, not a comparison (Goal 29). */
export const MIN_SEGMENT_SIZE = 5;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function buildCohortReport(input: CohortInput): CohortReport {
  const minSample = input.minSample ?? MIN_GATE_SAMPLE;
  const minSegment = input.minSegmentSize ?? MIN_SEGMENT_SIZE;
  const { testers, ledger } = mergeBundles(input.bundles);

  const observationIndex = new Map((input.observations ?? []).map((record) => [record.playtestInstallId, record]));
  let observationsMatched = 0;
  for (const tester of testers) {
    const observation = observationIndex.get(tester.playtestInstallId);
    if (observation) {
      tester.observation = observation;
      observationsMatched += 1;
    }
  }
  const observedIds = new Set(testers.map((tester) => tester.playtestInstallId));
  const observationsUnmatched = (input.observations ?? [])
    .filter((record) => !observedIds.has(record.playtestInstallId))
    .map((record) => record.playtestInstallId);

  const behaviours = testers.map((tester) => analyzeTester(tester, input.levelIds));
  const eligible = behaviours.filter((behaviour) => behaviour.eligible);

  const testersExcluded = behaviours
    .filter((behaviour) => !behaviour.eligible)
    .map((behaviour) => {
      const tester = testers.find((candidate) => candidate.playtestInstallId === behaviour.playtestInstallId);
      const reason =
        tester && tester.buildChannel !== EVIDENCE_CHANNEL
          ? `bundle came from the '${tester.buildChannel}' build channel, not '${EVIDENCE_CHANNEL}' — internal QA is never behavioural evidence`
          : "never opened Level 1";
      return { installId: behaviour.playtestInstallId, reason };
    });

  const gates = computeGates(behaviours, minSample);
  const diagnostics = computeDiagnostics(behaviours, testers, input.levelIds);

  const platformCounts: Record<string, number> = {};
  for (const behaviour of eligible) {
    platformCounts[behaviour.platform] = (platformCounts[behaviour.platform] ?? 0) + 1;
  }

  const mobile = eligible.filter((behaviour) => behaviour.platform === "android" || behaviour.platform === "ios");
  const web = eligible.filter((behaviour) => behaviour.platform === "web");
  const segments: CohortSegment[] = [{ name: "all testers", testers: eligible.length, gates }];
  if (mobile.length >= minSegment) {
    segments.push({ name: "mobile (android/ios)", testers: mobile.length, gates: computeGates(mobile, minSample) });
  }
  if (web.length >= minSegment) {
    segments.push({ name: "web", testers: web.length, gates: computeGates(web, minSample) });
  }

  const warnings: string[] = [];
  if (eligible.length === 0) {
    warnings.push("No eligible external testers. External behavioural sample: not measured yet.");
  } else if (eligible.length < minSample) {
    warnings.push(
      `Only ${eligible.length} eligible tester(s); the minimum for any gate verdict is ${minSample} and the target is ${TARGET_GATE_SAMPLE}. Treat everything below as pilot signal, not measurement.`
    );
  } else if (eligible.length < TARGET_GATE_SAMPLE) {
    warnings.push(
      `${eligible.length} eligible tester(s) is below the ${TARGET_GATE_SAMPLE}-tester target for a 15% margin of error at 95% confidence. Intervals will be wide.`
    );
  }
  const revisions = unique(testers.filter((t) => t.buildChannel === EVIDENCE_CHANNEL).map((t) => t.contentRevision));
  const fingerprints = unique(
    testers.filter((t) => t.buildChannel === EVIDENCE_CHANNEL).map((t) => t.contentFingerprint)
  );
  if (revisions.length > 1 || fingerprints.length > 1) {
    warnings.push(
      `Testers played more than one content revision (${revisions.join(", ")} / fingerprints ${fingerprints.join(", ")}). These are not one cohort — split them before reading any rate.`
    );
  }
  if (mobile.length > 0 && web.length > 0 && (mobile.length < minSegment || web.length < minSegment)) {
    warnings.push(
      `Mobile (${mobile.length}) and web (${web.length}) testers are pooled in the headline gates because one side is below the ${minSegment}-tester split threshold. Touch and mouse behaviour are not interchangeable.`
    );
  }
  if (gates.levelFourContinuation.anomalousOpens > 0) {
    warnings.push(
      `${gates.levelFourContinuation.anomalousOpens} Level 4 open(s) happened before the tester completed Level 3 and were not counted as continuation.`
    );
  }

  return {
    methodologyVersion: METHODOLOGY_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    bundlesRead: input.bundles.length,
    bundlesAccepted: ledger.filter((entry) => entry.acceptance.kind === "accepted").length,
    duplicateBundles: ledger.filter((entry) => entry.acceptance.kind === "duplicate").length,
    bundlesExcludedByChannel: input.bundles.filter((entry) => entry.bundle.buildChannel !== EVIDENCE_CHANNEL).length,
    testersTotal: testers.length,
    testersEligible: eligible.length,
    testersExcluded,
    observationsMatched,
    observationsUnmatched,
    contentRevisions: revisions,
    contentFingerprints: fingerprints,
    appVersions: unique(testers.map((tester) => tester.appVersion)),
    buildIds: unique(testers.map((tester) => tester.buildId)),
    cohortIds: unique(testers.map((tester) => tester.cohortId).filter((value): value is string => value !== null)),
    platformCounts,
    gates,
    segments,
    diagnostics,
    hypotheses: deriveHypotheses(gates, diagnostics, eligible.length),
    behaviours,
    ledger,
    warnings
  };
}
