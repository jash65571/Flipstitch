import assert from "node:assert/strict";
import test from "node:test";

import {
  appendEvents,
  asyncStorageAdapter,
  dropOldest,
  PlaytestEventStore,
  readEvents,
  type KeyValueStorage
} from "./store.ts";
import {
  isValidPlaytestEvent,
  MAX_PLAYTEST_EVENTS,
  PLAYTEST_SCHEMA_VERSION,
  PLAYTEST_STORAGE_KEY,
  type PlaytestEvent
} from "./events.ts";

function makeEvent(overrides: Partial<Omit<PlaytestEvent, "schemaVersion">> & { schemaVersion?: number } = {}): PlaytestEvent {
  return {
    schemaVersion: PLAYTEST_SCHEMA_VERSION,
    sessionId: "s-test",
    seq: 1,
    timestamp: 1_700_000_000_000,
    elapsedMs: 0,
    name: "valid_stitch",
    ...overrides
  } as PlaytestEvent;
}

function makeFakeStorage(initial: string | null = null, failWrites = false): {
  storage: KeyValueStorage;
  stored: () => string | null;
} {
  let value = initial;
  return {
    storage: {
      getItem: async () => value,
      setItem: async (key, next) => {
        if (failWrites) throw new Error("storage full");
        value = next;
      },
      removeItem: async () => {
        value = null;
      }
    },
    stored: () => value
  };
}

test("valid events pass the schema check and invalid ones are rejected", () => {
  assert.equal(isValidPlaytestEvent(makeEvent()), true);
  assert.equal(isValidPlaytestEvent(makeEvent({ name: "app_session_started" })), true);
  assert.equal(isValidPlaytestEvent(null), false);
  assert.equal(isValidPlaytestEvent({}), false);
  assert.equal(isValidPlaytestEvent(makeEvent({ schemaVersion: 99 })), false);
  assert.equal(isValidPlaytestEvent(makeEvent({ name: "mystery_event" as never })), false);
  assert.equal(isValidPlaytestEvent(makeEvent({ seq: -1 })), false);
});

test("serialization round-trips stored events", () => {
  const raw = JSON.stringify([makeEvent({ seq: 1 }), makeEvent({ seq: 2, name: "level_completed" })]);
  const events = readEvents(raw);
  assert.equal(events.length, 2);
  assert.equal(events[1].name, "level_completed");
});

test("corrupt or foreign data falls back to an empty list", () => {
  assert.deepEqual(readEvents(null), []);
  assert.deepEqual(readEvents("not json"), []);
  assert.deepEqual(readEvents(JSON.stringify({ not: "an array" })), []);
  assert.deepEqual(readEvents(JSON.stringify([makeEvent({ schemaVersion: 99 })])), [], "future schema is not migrated");
});

test("the event store is bounded and removes the oldest events first", async () => {
  const { storage } = makeFakeStorage();
  // A very large batch so one flush moves all pending events into storage.
  const store = new PlaytestEventStore(storage, 0, 1_000_000);
  for (let i = 1; i <= MAX_PLAYTEST_EVENTS + 25; i++) {
    store.append(makeEvent({ seq: i, timestamp: 1_700_000_000_000 + i }));
  }
  const snapshot = await store.snapshot();
  assert.equal(snapshot.length, MAX_PLAYTEST_EVENTS);
  assert.equal(snapshot[0].seq, 26, "the oldest 25 events are dropped first");
  assert.equal(snapshot.at(-1)?.seq, MAX_PLAYTEST_EVENTS + 25);
});

test("pure bounded helpers behave predictably", () => {
  const events = [makeEvent({ seq: 1 }), makeEvent({ seq: 2 }), makeEvent({ seq: 3 })];
  assert.deepEqual(appendEvents(events, [makeEvent({ seq: 4 })], 3).map((e) => e.seq), [2, 3, 4]);
  assert.deepEqual(dropOldest(events, 2).map((e) => e.seq), [2, 3]);
  assert.deepEqual(appendEvents([], [], 10), []);
});

test("clearing removes stored events", async () => {
  const { storage } = makeFakeStorage();
  const store = new PlaytestEventStore(storage, 0);
  store.append(makeEvent());
  await store.flush();
  assert.equal((await store.snapshot()).length, 1);
  await store.clear();
  assert.deepEqual(await store.snapshot(), []);
});

test("storage failure never throws and gameplay can continue", async () => {
  const { storage } = makeFakeStorage(null, true);
  const store = new PlaytestEventStore(storage, 0);
  store.append(makeEvent());
  await store.flush(); // must not reject
  assert.deepEqual(await store.snapshot(), []);
});

test("storage failure while loading falls back to an empty list", async () => {
  const storage: KeyValueStorage = {
    getItem: async () => {
      throw new Error("unavailable");
    },
    setItem: async () => undefined,
    removeItem: async () => undefined
  };
  const store = new PlaytestEventStore(storage, 0);
  assert.deepEqual(await store.snapshot(), []);
});

test("the AsyncStorage adapter uses the playtest storage key", () => {
  assert.equal(typeof asyncStorageAdapter.getItem, "function");
  assert.equal(typeof asyncStorageAdapter.setItem, "function");
  assert.equal(typeof asyncStorageAdapter.removeItem, "function");
  assert.equal(PLAYTEST_STORAGE_KEY, "flipstitch.playtest.v1");
});

test("flush drains more than one batch and preserves append order", async () => {
  const { storage } = makeFakeStorage();
  const store = new PlaytestEventStore(storage, 0, 25);
  for (let i = 1; i <= 250; i++) {
    store.append(makeEvent({ seq: i, timestamp: 1_700_000_000_000 + i }));
  }
  const snapshot = await store.snapshot();
  assert.equal(snapshot.length, 250, "every pending event is flushed, not just one batch");
  assert.deepEqual(snapshot.map((e) => e.seq).slice(0, 3), [1, 2, 3], "order is preserved across batches");
  assert.equal(snapshot.at(-1)?.seq, 250);
});

test("a background flush persists all pending events immediately", async () => {
  const { storage, stored } = makeFakeStorage();
  const store = new PlaytestEventStore(storage, 60_000, 10); // debounce never fires naturally
  for (let i = 1; i <= 35; i++) store.append(makeEvent({ seq: i }));
  await store.flush(); // AppState background handler
  const persisted = readEvents(stored());
  assert.equal(persisted.length, 35);
  assert.equal(persisted[0].seq, 1);
  assert.equal(persisted.at(-1)?.seq, 35);
});

test("clear during pending writes empties storage without resurrecting old data", async () => {
  const { storage } = makeFakeStorage();
  const store = new PlaytestEventStore(storage, 0, 10);
  for (let i = 1; i <= 30; i++) store.append(makeEvent({ seq: i }));
  const flushing = store.flush(); // some batches already queued
  const clearing = store.clear(); // cancels pending + invalidates queued writes
  await flushing;
  await clearing;
  assert.deepEqual(await store.snapshot(), [], "storage is empty after clear");

  // Post-clear appends survive.
  store.append(makeEvent({ seq: 31 }));
  await store.flush();
  const snapshot = await store.snapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].seq, 31);
});

test("appends arriving during an in-flight flush are included in order", async () => {
  const { storage } = makeFakeStorage();
  const store = new PlaytestEventStore(storage, 0, 10);
  for (let i = 1; i <= 10; i++) store.append(makeEvent({ seq: i }));
  const flushing = store.flush();
  for (let i = 11; i <= 20; i++) store.append(makeEvent({ seq: i })); // arrive mid-flush
  await flushing;
  await store.flush();
  const snapshot = await store.snapshot();
  assert.deepEqual(snapshot.map((e) => e.seq), Array.from({ length: 20 }, (_, i) => i + 1));
});

test("legacy version-one events without attempt ids remain readable", async () => {
  const legacy = makeEvent({ seq: 1, name: "level_opened", levelId: "l1" });
  assert.equal(isValidPlaytestEvent(legacy), true);
  const stored = readEvents(JSON.stringify([legacy]));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].attemptId, undefined);
});


