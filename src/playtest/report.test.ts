import assert from "node:assert/strict";
import test from "node:test";

import { PLAYTEST_SCHEMA_VERSION, type PlaytestEvent } from "./events.ts";
import { buildPlaytestReport, formatReadableReport, MIN_LEVEL_OPENS_FOR_CONFIDENCE, MIN_SESSIONS_FOR_CONFIDENCE } from "./report.ts";

const LEVEL_IDS = ["l1", "l2", "l3", "l4", "l5"];

let seqCounter = 0;
function makeEvent(overrides: Partial<PlaytestEvent> = {}): PlaytestEvent {
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

function oneCompletedSession(t0: number, levelId = "l1", sessionId = "s1"): PlaytestEvent[] {
  return [
    makeEvent({ sessionId, name: "app_session_started", timestamp: t0 }),
    makeEvent({ sessionId, name: "level_opened", levelId, timestamp: t0 + 1_000 }),
    makeEvent({ sessionId, name: "first_valid_stitch", levelId, timestamp: t0 + 4_000 }),
    makeEvent({ sessionId, name: "valid_stitch", levelId, timestamp: t0 + 5_000 }),
    makeEvent({ sessionId, name: "invalid_stitch", levelId, timestamp: t0 + 6_000 }),
    makeEvent({ sessionId, name: "level_completed", levelId, timestamp: t0 + 30_000 })
  ];
}

test("empty data produces an empty report with a clear warning", () => {
  const report = buildPlaytestReport([], LEVEL_IDS);
  assert.equal(report.totalSessions, 0);
  assert.equal(report.totalEvents, 0);
  assert.ok(report.warnings.some((w) => w.includes("No playtest events")));
});

test("completion metrics are calculated from real events only", () => {
  const events = [...oneCompletedSession(1_700_000_000_000), ...oneCompletedSession(1_700_000_100_000, "l2", "s2")];
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.totalSessions, 2);
  assert.equal(report.totalCompletedLevels, 2);
  assert.equal(report.firstLevelCompletionRate, 1);
  assert.equal(report.completionRateByLevel["l1"].opened, 1);
  assert.equal(report.completionRateByLevel["l1"].completed, 1);
  assert.equal(report.medianCompletionTimeMsByLevel["l1"], 29_000);
});

test("time to first valid stitch uses level open as the start", () => {
  const events = oneCompletedSession(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.timeToFirstStitchMs.levelOne, 3_000);
  assert.equal(report.timeToFirstStitchMs.overall, 3_000);
});

test("invalid-move rate is invalid over valid plus invalid", () => {
  const events = oneCompletedSession(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.equal(report.invalidMoveRate.overall, 1 / 3);
  assert.equal(report.invalidMoveRate.byLevel["l1"], 1 / 3);
});

test("tool usage and exits are counted per level and per session", () => {
  const events = [
    ...oneCompletedSession(1_700_000_000_000),
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

test("exit-before-completion rate is exits over opens per level", () => {
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
  const events = oneCompletedSession(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  assert.ok(
    report.warnings.some((w) => w.includes(`Fewer than ${MIN_SESSIONS_FOR_CONFIDENCE} sessions`)),
    "session count warning"
  );
  assert.ok(
    report.warnings.some((w) => w.includes(`Level l1 has only 1 open(s)`)),
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
  const events = oneCompletedSession(1_700_000_000_000);
  const report = buildPlaytestReport(events, LEVEL_IDS);
  const text = formatReadableReport(report, LEVEL_IDS);
  assert.ok(text.includes("Sessions: 1"));
  assert.ok(text.includes("First-level completion rate: 100%"));
  assert.ok(text.includes("Invalid-move rate"));
  assert.ok(text.includes("Warnings"));
  assert.ok(text.includes("Level 1 (l1)"));
});
