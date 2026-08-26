import assert from "node:assert/strict";
import test from "node:test";

import { LevelVisit, makeAttemptId, resetAttemptCounter } from "./attempt.ts";

test("opening a level records exactly one level_opened event per visit", () => {
  resetAttemptCounter();
  const visit = new LevelVisit("l1", makeAttemptId("s1", "l1"));
  assert.deepEqual(visit.open(), { name: "level_opened", levelId: "l1", attemptId: "s1:l1:a1" });
  // Repeated effect setup (StrictMode-style) must not record a second open.
  assert.equal(visit.open(), null);
  assert.equal(visit.open(), null);
});

test("completion closes the attempt and never produces an incomplete exit", () => {
  resetAttemptCounter();
  const visit = new LevelVisit("l1", makeAttemptId("s1", "l1"));
  visit.open();
  const completed = visit.complete();
  assert.equal(completed?.name, "level_completed");
  assert.equal(completed?.completed, true);
  assert.equal(visit.end(), null, "no exit may follow completion");
  assert.equal(visit.complete(), null, "completion is recorded at most once");
});

test("leaving an unfinished attempt records exactly one exit", () => {
  resetAttemptCounter();
  const visit = new LevelVisit("l1", makeAttemptId("s1", "l1"));
  visit.open();
  const exit = visit.end();
  assert.deepEqual(exit, { name: "level_exited", levelId: "l1", attemptId: "s1:l1:a1", completed: false });
  assert.equal(visit.end(), null, "exit is recorded at most once");
  assert.equal(visit.complete(), null, "a finished attempt cannot complete");
});

test("restart abandons the old attempt and starts a new one", () => {
  resetAttemptCounter();
  const first = new LevelVisit("l1", makeAttemptId("s1", "l1"));
  first.open();
  const result = first.restart(makeAttemptId("s1", "l1"));
  assert.ok(result);
  assert.equal(result.abandoned.name, "restart_used");
  assert.equal(result.abandoned.attemptId, "s1:l1:a1");
  assert.equal(result.next.id, "s1:l1:a2");
  assert.equal(first.isActive, false);
  // The abandoned visit cannot reopen or complete.
  assert.equal(first.open(), null);
  assert.equal(first.complete(), null);

  // The new attempt behaves independently.
  assert.deepEqual(result.next.open(), { name: "level_opened", levelId: "l1", attemptId: "s1:l1:a2" });
  const nextComplete = result.next.complete();
  assert.equal(nextComplete?.attemptId, "s1:l1:a2");
  assert.equal(result.next.end(), null);
});

test("restart after completion starts a replay attempt", () => {
  resetAttemptCounter();
  const visit = new LevelVisit("l1", makeAttemptId("s1", "l1"));
  visit.open();
  visit.complete();
  const replay = visit.restart(makeAttemptId("s1", "l1"));
  assert.ok(replay, "replaying a completed level begins a new attempt");
  assert.equal(replay.abandoned.name, "restart_used");
  assert.equal(replay.abandoned.attemptId, "s1:l1:a1", "restart is attributed to the closing attempt");
  assert.equal(replay.next.id, "s1:l1:a2");
  // The original attempt is still recorded as completed.
  assert.equal(visit.end(), null, "no exit for the completed attempt");
});

test("restart after an exit is a no-op", () => {
  resetAttemptCounter();
  const visit = new LevelVisit("l1", makeAttemptId("s1", "l1"));
  visit.open();
  visit.end();
  assert.equal(visit.restart(makeAttemptId("s1", "l1")), null);
});

test("attempt ids are unique per session and level", () => {
  resetAttemptCounter();
  const a = makeAttemptId("s1", "l1");
  const b = makeAttemptId("s1", "l1");
  const c = makeAttemptId("s2", "l1");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.ok(a.startsWith("s1:l1:"));
  assert.ok(c.startsWith("s2:l1:"));
});

test("a full open-play-complete lifecycle emits exactly open + complete", () => {
  resetAttemptCounter();
  const visit = new LevelVisit("l3", makeAttemptId("s1", "l3"));
  const events = [visit.open(), visit.open(), visit.complete(), visit.end()].filter(Boolean);
  assert.deepEqual(events.map((e) => e?.name), ["level_opened", "level_completed"]);
});
