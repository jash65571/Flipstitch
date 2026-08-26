import assert from "node:assert/strict";
import test from "node:test";

import { PLAYTEST_SCHEMA_VERSION } from "./events.ts";
import { PlaytestEventStore, type KeyValueStorage } from "./store.ts";
import { PlaytestTracker, type Clock } from "./tracker.ts";

function makeMemoryStorage(): KeyValueStorage {
  let value: string | null = null;
  return {
    getItem: async () => value,
    setItem: async (_key, next) => {
      value = next;
    },
    removeItem: async () => {
      value = null;
    }
  };
}

async function makeTracker() {
  const store = new PlaytestEventStore(makeMemoryStorage(), 0);
  let now = 1_700_000_000_000;
  let monotonic = 0;
  const clock: Clock = {
    now: () => now,
    monotonic: () => monotonic
  };
  const tracker = new PlaytestTracker(store, clock, "s-fixed");
  return {
    store,
    tracker,
    advance(ms: number) {
      now += ms;
      monotonic += ms;
    }
  };
}

test("events are stamped with schema, session, sequence, and elapsed time", async () => {
  const { store, tracker } = await makeTracker();
  tracker.startSession();
  tracker.track({ name: "level_opened", levelId: "l1" });
  const events = await store.snapshot();
  assert.equal(events.length, 2);
  assert.equal(events[0].schemaVersion, PLAYTEST_SCHEMA_VERSION);
  assert.equal(events[0].name, "app_session_started");
  assert.equal(events[0].sessionId, "s-fixed");
  assert.equal(events[0].seq, 1);
  assert.equal(events[1].seq, 2);
  assert.equal(events[1].elapsedMs, 0);
});

test("elapsed time is monotonic across events", async () => {
  const { store, tracker, advance } = await makeTracker();
  tracker.startSession();
  advance(2_500);
  tracker.track({ name: "level_opened", levelId: "l1" });
  advance(10_000);
  tracker.track({ name: "first_valid_stitch", levelId: "l1" });
  const events = await store.snapshot();
  assert.equal(events[1].elapsedMs, 2_500);
  assert.equal(events[1].timestamp, 1_700_000_002_500);
  assert.equal(events[2].elapsedMs, 12_500);
  assert.equal(events[2].timestamp, 1_700_000_012_500);
});

test("trackOnce records each session-level event only once", async () => {
  const { store, tracker } = await makeTracker();
  tracker.trackOnce({ name: "level_exited", levelId: "l1", completed: false });
  tracker.trackOnce({ name: "level_exited", levelId: "l1", completed: false });
  tracker.trackOnce({ name: "level_completed", levelId: "l1" });
  const events = await store.snapshot();
  assert.equal(events.filter((e) => e.name === "level_exited").length, 1);
  assert.equal(events.filter((e) => e.name === "level_completed").length, 1);
});

test("clearing the tracker resets duplicate protection for the session", async () => {
  const { store, tracker } = await makeTracker();
  tracker.trackOnce({ name: "level_exited", levelId: "l1" });
  await tracker.clear();
  tracker.trackOnce({ name: "level_exited", levelId: "l1" });
  const events = await store.snapshot();
  assert.equal(events.filter((e) => e.name === "level_exited").length, 1, "after clear the re-record is allowed once");
});

test("the same level can be exited again after a fresh tracker (new visit)", async () => {
  const storage = makeMemoryStorage();
  const store = new PlaytestEventStore(storage, 0);
  const first = new PlaytestTracker(store, undefined, "s-one");
  first.trackOnce({ name: "level_exited", levelId: "l1" });
  const second = new PlaytestTracker(store, undefined, "s-two");
  second.trackOnce({ name: "level_exited", levelId: "l1" });
  const events = await store.snapshot();
  assert.equal(events.length, 2, "distinct sessions may each report an exit");
});
