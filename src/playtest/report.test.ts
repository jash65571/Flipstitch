import assert from "node:assert/strict";
import test from "node:test";

import { catalog } from "../content/catalog.ts";
import { PLAYTEST_SCHEMA_VERSION, type PlaytestEvent } from "./events.ts";
import {
  buildContentReport,
  buildPlaytestReport,
  formatReadableReport,
  MIN_ATTEMPTS_FOR_CONFIDENCE,
  MIN_SESSIONS_FOR_CONFIDENCE
} from "./report.ts";

const LEVEL_IDS = ["l1", "l2", "l3", "l4", "l5"];

let seqCounter = 0;
function makeEvent(overrides: Partial<Omit<PlaytestEvent, "schemaVersion">> = {}): PlaytestEvent {
  seqCounter += 1;
  return {
    schemaVersion: PLAYTEST_SCHEMA_VERSION,
    sessionId: "s1",
    seq: seqCounter,
    timestamp: 1_700_000_000_000,
    elapsedMs: 0,
    name: "valid_stitch",
    ...overrides
  };
}

function oneCompletedAttempt(t0: number, levelId = "l1", sessionId = "s1", attemptId = "s1:l1:a1"): PlaytestEvent[] {
  return [
    makeEvent({ sessionId, name: "app_session_started", timestamp: t0 }),
    makeEvent({ sessionId, name: "level_opened", levelId, attemptId, timestamp: t0 + 1_000 }),
    makeEvent({ sessionId, name: "first_valid_stitch", levelId, attemptId, timestamp: t0 + 4_000 }),
    makeEvent({ sessionId, name: "valid_stitch", levelId, attemptId, timestamp: t0 + 5_000 }),
    makeEvent({ sessionId, name: "invalid_stitch", levelId, attemptId, timestamp: t0 + 6_000 }),
    makeEvent({ sessionId, name: "level_completed", levelId, attemptId, timestamp: t0 + 30_000 })
  ];
}

test("empty data produces an empty report with a clear warning", () => {
  const report = buildPlaytestReport([], LEVEL_IDS);
  assert.equal(report.totalSessions, 0);
  assert.equal(report.totalEvents, 0);
  assert.ok(report.warnings.some((w) => w.includes("No playtest events")));
});

test("completion metrics are calculated from real attempts only", () => {
  const events = [
    ...oneCompletedAttempt(1_700_000_000_000, "l1", "s1", "s1:l1:a1"),
    ...oneCompletedAttempt(1_700_000_100_000, "l2", "s2", "s2:l2:a1")
  ];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.totalSessions, 2);
  assert.equal(report.totalCompletedLevels, 2);
  assert.equal(report.firstLevelCompletionRate, 1);
  assert.equal(report.completionRateByLevel["l1"].attempts, 1);
  assert.equal(report.completionRateByLevel["l1"].completed, 1);
  assert.equal(report.medianCompletionTimeMsByLevel["l1"], 29_000);
  assert.deepEqual(report.legacyLevels, []);
});

test("time to first valid stitch uses the attempt start", () => {
  const events = oneCompletedAttempt(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.timeToFirstStitchMs.levelOne, 3_000);
  assert.equal(report.timeToFirstStitchMs.overall, 3_000);
});

test("invalid-move rate is invalid over valid plus invalid", () => {
  const events = oneCompletedAttempt(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.invalidMoveRate.overall, 1 / 3);
  assert.equal(report.invalidMoveRate.byLevel["l1"], 1 / 3);
});

test("tool usage and exits are counted per level and per session", () => {
  const events = [
    ...oneCompletedAttempt(1_700_000_000_000),
    makeEvent({ sessionId: "s1", name: "undo_used", levelId: "l1", timestamp: 1_700_000_010_000 }),
    makeEvent({ sessionId: "s1", name: "hint_used", levelId: "l1", timestamp: 1_700_000_011_000 }),
    makeEvent({ sessionId: "s1", name: "preview_used", levelId: "l1", timestamp: 1_700_000_012_000 }),
    makeEvent({ sessionId: "s1", name: "restart_used", levelId: "l1", timestamp: 1_700_000_013_000 })
  ];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.undoUsage.total, 1);
  assert.equal(report.hintUsage.total, 1);
  assert.equal(report.previewUsage.total, 1);
  assert.equal(report.restartUsage.total, 1);
  assert.equal(report.undoUsage.perSession, 1);
});

test("exit-before-completion rate is exits over attempts per level", () => {
  const events = [
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l3", timestamp: 1 }),
    makeEvent({ sessionId: "s1", name: "level_exited", levelId: "l3", completed: false, timestamp: 2 }),
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l3", timestamp: 3 }),
    makeEvent({ sessionId: "s2", name: "level_opened", levelId: "l3", timestamp: 4 }),
    makeEvent({ sessionId: "s2", name: "level_exited", levelId: "l3", completed: false, timestamp: 5 })
  ];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.exitBeforeCompletionRate.byLevel["l3"], 2 / 3);
  assert.equal(report.exitBeforeCompletionRate.overall, 2 / 3);
});

test("percentage reaching level four counts sessions that opened it", () => {
  const events = [
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l1", timestamp: 1 }),
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l4", timestamp: 2 }),
    makeEvent({ sessionId: "s2", name: "level_opened", levelId: "l1", timestamp: 3 }),
    makeEvent({ sessionId: "s3", name: "level_opened", levelId: "l1", timestamp: 4 })
  ];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.percentReachingLevelFour, 1 / 3);
});

test("small sample sizes produce explicit warnings", () => {
  const events = oneCompletedAttempt(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.ok(
    report.warnings.some((w) => w.includes(`Fewer than ${MIN_SESSIONS_FOR_CONFIDENCE} sessions`)),
    "session count warning"
  );
  assert.ok(
    report.warnings.some((w) => w.includes(`Level l1 has only 1 attempt(s)`)),
    "per-level small sample warning"
  );
});

test("a healthy sample size has no session warning", () => {
  const events: PlaytestEvent[] = [];
  for (let s = 1; s <= MIN_SESSIONS_FOR_CONFIDENCE; s++) {
    events.push(makeEvent({ sessionId: `s${s}`, name: "app_session_started", timestamp: s }));
  }
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.totalSessions, MIN_SESSIONS_FOR_CONFIDENCE);
  assert.ok(!report.warnings.some((w) => w.includes("Fewer than")));
});

test("the readable report renders all key sections", () => {
  const events = oneCompletedAttempt(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  const text = formatReadableReport(report, LEVEL_IDS);
  assert.ok(text.includes("Sessions: 1"));
  assert.ok(text.includes("First-level completion rate: 100%"));
  assert.ok(text.includes("Invalid-move rate"));
  assert.ok(text.includes("Warnings"));
  assert.ok(text.includes("Level 1 (l1)"));
});

test("replay after completion creates a separate attempt that cannot corrupt the first", () => {
  const events = [
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l1", attemptId: "a1", timestamp: 1_000 }),
    makeEvent({ sessionId: "s1", name: "valid_stitch", levelId: "l1", attemptId: "a1", timestamp: 2_000 }),
    makeEvent({ sessionId: "s1", name: "level_completed", levelId: "l1", attemptId: "a1", completed: true, timestamp: 3_000 }),
    // Replay: a fresh visit of the same level.
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l1", attemptId: "a2", timestamp: 10_000 }),
    makeEvent({ sessionId: "s1", name: "level_exited", levelId: "l1", attemptId: "a2", completed: false, timestamp: 11_000 })
  ];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  const entry = report.completionRateByLevel["l1"];
  assert.equal(entry.attempts, 2);
  assert.equal(entry.completed, 1);
  assert.equal(entry.rate, 0.5);
  // The completed attempt keeps its own completion time.
  assert.equal(report.medianCompletionTimeMsByLevel["l1"], 2_000);
  // The replay attempt counts as an exit-before-completion.
  assert.equal(report.exitBeforeCompletionRate.byLevel["l1"], 0.5);
});

test("a restart closes one attempt and starts another without corrupting either", () => {
  const events = [
    makeEvent({ sessionId: "s1", name: "level_opened", levelId: "l1", attemptId: "a1", timestamp: 1_000 }),
    makeEvent({ sessionId: "s1", name: "valid_stitch", levelId: "l1", attemptId: "a1", timestamp: 2_000 }),
    makeEvent({ sessionId: "s1", name: "restart_used", levelId: "l1", attemptId: "a1", timestamp: 3_000 }),
    makeEvent({ sessionId: "s1", name: "first_valid_stitch", levelId: "l1", attemptId: "a2", timestamp: 4_000 }),
    makeEvent({ sessionId: "s1", name: "valid_stitch", levelId: "l1", attemptId: "a2", timestamp: 5_000 }),
    makeEvent({ sessionId: "s1", name: "level_completed", levelId: "l1", attemptId: "a2", completed: true, timestamp: 6_000 })
  ];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  const entry = report.completionRateByLevel["l1"];
  assert.equal(entry.attempts, 2, "the abandoned attempt still counts as an attempt");
  assert.equal(entry.completed, 1);
  assert.equal(report.restartUsage.total, 1);
  // Attempt a2 started at its first event (the restart boundary at 3s is the
  // closest recorded start), so completion time is 6s - 4s = 2s.
  assert.equal(report.medianCompletionTimeMsByLevel["l1"], 2_000);
  // First-stitch times: a1 took 1s, a2 restarted and stitched immediately (0s).
  assert.equal(report.timeToFirstStitchMs.levelOne, 500);
});

test("legacy version-one events are interpreted and flagged, never crashed on", () => {
  const events = oneCompletedAttempt(1_700_000_000_000).map((event) => {
    const { attemptId: _dropped, ...rest } = event;
    return rest as PlaytestEvent;
  });
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.completionRateByLevel["l1"].attempts, 1);
  assert.equal(report.completionRateByLevel["l1"].completed, 1);
  assert.ok(report.legacyLevels.includes("l1"));
  assert.ok(
    report.warnings.some((w) => w.includes("Legacy version-one events") && w.includes("inferred")),
    "legacy boundaries are flagged as inferred"
  );
});

test("legacy small-sample warnings use attempt counts", () => {
  const events = [makeEvent({ name: "level_opened", levelId: "l2", timestamp: 1 })];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.ok(report.warnings.some((w) => w.includes(`Level l2 has only 1 attempt(s)`)));
  assert.ok(report.warnings.some((w) => w.includes(`Fewer than ${MIN_ATTEMPTS_FOR_CONFIDENCE}`) === false));
});

// ---- Content report: collection/chapter rollups from local events only ----

test("an untouched catalog reports zero reached and zero completed everywhere", () => {
  const content = buildContentReport([], catalog);
  assert.equal(content.collections.length, catalog.collections.length);
  for (const unit of content.collections) {
    assert.equal(unit.levelsReached, 0);
    assert.equal(unit.levelsCompleted, 0);
    assert.equal(unit.finished, false);
    assert.equal(unit.trapEvents, 0);
  }
});

test("reaching and completing levels rolls up to the right collection and chapter, not others", () => {
  const dayAndNight = catalog.collections[0];
  const firstLevelId = dayAndNight.levelIds[0];
  const events: PlaytestEvent[] = [
    makeEvent({ name: "level_opened", levelId: firstLevelId }),
    makeEvent({ name: "thread_trapped", levelId: firstLevelId }),
    makeEvent({ name: "thread_trapped", levelId: firstLevelId }),
    makeEvent({ name: "level_completed", levelId: firstLevelId })
  ];
  const content = buildContentReport(events, catalog);
  const dayAndNightReport = content.collections.find((unit) => unit.id === dayAndNight.id)!;
  assert.equal(dayAndNightReport.levelsReached, 1);
  assert.equal(dayAndNightReport.levelsCompleted, 1);
  assert.equal(dayAndNightReport.trapEvents, 2);
  assert.equal(dayAndNightReport.finished, false);

  const otherCollections = content.collections.filter((unit) => unit.id !== dayAndNight.id);
  for (const unit of otherCollections) {
    assert.equal(unit.levelsReached, 0, `${unit.id} must not see Day & Night's events`);
  }

  const firstChapter = dayAndNight.chapters[0];
  const chapterReport = content.chapters.find((unit) => unit.id === firstChapter.id)!;
  assert.equal(chapterReport.levelsCompleted, 1);
});

test("a collection reports finished only once every one of its levels is completed", () => {
  const dayAndNight = catalog.collections[0];
  const events: PlaytestEvent[] = dayAndNight.levelIds.map((levelId) => makeEvent({ name: "level_completed", levelId }));
  const content = buildContentReport(events, catalog);
  const dayAndNightReport = content.collections.find((unit) => unit.id === dayAndNight.id)!;
  assert.equal(dayAndNightReport.finished, true);
  const knotAndBramble = content.collections.find((unit) => unit.id === catalog.collections[1].id)!;
  assert.equal(knotAndBramble.finished, false);
});

test("the readable report includes content progress only when a ContentReport is supplied", () => {
  const report = buildPlaytestReport([], LEVEL_IDS);
  const withoutContent = formatReadableReport(report, LEVEL_IDS);
  assert.ok(!withoutContent.includes("Content progress"));

  const content = buildContentReport([], catalog);
  const withContent = formatReadableReport(report, LEVEL_IDS, content);
  assert.ok(withContent.includes("Content progress"));
  assert.ok(withContent.includes(catalog.collections[0].title));
});
