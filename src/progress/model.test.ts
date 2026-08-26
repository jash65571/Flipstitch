import assert from "node:assert/strict";
import test from "node:test";

import { levels } from "../content/catalog.ts";
import {
  PROGRESS_VERSION,
  emptyProgress,
  isLevelUnlocked,
  readProgress,
  recordCompletion,
  resumeLevelId,
  unlockedLevelCount
} from "./model.ts";

test("only level one starts unlocked", () => {
  const progress = emptyProgress();
  assert.equal(unlockedLevelCount(progress, levels), 1);
  assert.equal(isLevelUnlocked(progress, levels, levels[0].id), true);
  assert.equal(isLevelUnlocked(progress, levels, levels[1].id), false);
});

test("completion unlocks the next level and preserves the best move count", () => {
  let progress = recordCompletion(emptyProgress(), levels[0].id, 8);
  progress = recordCompletion(progress, levels[0].id, 10);
  assert.equal(progress.completed[levels[0].id].bestMoves, 8);
  assert.equal(unlockedLevelCount(progress, levels), 2);
  assert.equal(resumeLevelId(progress, levels), levels[1].id);
});

test("stored progress survives a serialize and reload cycle", () => {
  const saved = recordCompletion(emptyProgress(), levels[0].id, 5);
  assert.deepEqual(readProgress(JSON.stringify(saved), levels), saved);
});

test("bad or stale storage falls back safely", () => {
  assert.deepEqual(readProgress("not json", levels), emptyProgress());
  assert.deepEqual(readProgress(JSON.stringify({ version: 99, completed: {} }), levels), emptyProgress());
});

// ---- Compatibility with progress saved before the content refactor ---------
//
// Prompt 7 moved level data from one flat `levels.ts` into a
// Collection -> Chapter -> Level catalog. Level ids and their order were kept
// identical, so `ProgressData` did not change shape and PROGRESS_VERSION stays
// at 1: bumping it would have wiped real saves for no reason.
//
// These tests use hard-coded version-1 payloads, written the way the shipped
// app wrote them before the refactor, rather than re-serialising today's code.
// That is the only way to prove old saves still load.

/** Exactly what flipstitch.progress.v1 held after clearing the first four hoops. */
const LEGACY_V1_MID_COLLECTION = JSON.stringify({
  version: 1,
  completed: {
    "first-thread-01": { bestMoves: 4 },
    "kite-tail-02": { bestMoves: 5 },
    "twin-petals-03": { bestMoves: 6 },
    "butterfly-turn-04": { bestMoves: 7 }
  },
  lastPlayedLevelId: "forked-needle-05"
});

test("version-1 progress written before the content refactor still loads intact", () => {
  const loaded = readProgress(LEGACY_V1_MID_COLLECTION, levels);
  assert.equal(loaded.version, PROGRESS_VERSION);
  assert.equal(PROGRESS_VERSION, 1, "the storage schema did not change, so the version must not move");
  assert.deepEqual(Object.keys(loaded.completed).sort(), [
    "butterfly-turn-04",
    "first-thread-01",
    "kite-tail-02",
    "twin-petals-03"
  ]);
  assert.equal(loaded.completed["kite-tail-02"].bestMoves, 5);
  assert.equal(loaded.lastPlayedLevelId, "forked-needle-05");
});

test("legacy progress keeps its unlocks and resumes in the right place after the refactor", () => {
  const loaded = readProgress(LEGACY_V1_MID_COLLECTION, levels);
  // Four contiguous completions unlock the fifth hoop and no more.
  assert.equal(unlockedLevelCount(loaded, levels), 5);
  assert.equal(isLevelUnlocked(loaded, levels, "forked-needle-05"), true);
  assert.equal(isLevelUnlocked(loaded, levels, "echo-stairs-06"), false);
  assert.equal(resumeLevelId(loaded, levels), "forked-needle-05");
});

test("legacy progress that spans the new chapter boundary is preserved", () => {
  // Chapter One is now levels 1-5 and Chapter Two levels 6-10. A save made
  // before chapters existed must still unlock straight across the seam.
  const raw = JSON.stringify({
    version: 1,
    completed: {
      "first-thread-01": { bestMoves: 4 },
      "kite-tail-02": { bestMoves: 5 },
      "twin-petals-03": { bestMoves: 6 },
      "butterfly-turn-04": { bestMoves: 7 },
      "forked-needle-05": { bestMoves: 8 }
    },
    lastPlayedLevelId: "forked-needle-05"
  });
  const loaded = readProgress(raw, levels);
  assert.equal(unlockedLevelCount(loaded, levels), 6);
  assert.equal(isLevelUnlocked(loaded, levels, "echo-stairs-06"), true);
  assert.equal(resumeLevelId(loaded, levels), "echo-stairs-06");
});

test("every level id a saved game can hold still resolves in the new catalog", () => {
  const completed: Record<string, { bestMoves: number }> = {};
  for (const [index, level] of levels.entries()) {
    completed[level.id] = { bestMoves: index + 3 };
  }
  const loaded = readProgress(JSON.stringify({ version: 1, completed, lastPlayedLevelId: "master-sampler-10" }), levels);
  assert.equal(Object.keys(loaded.completed).length, levels.length);
  assert.equal(loaded.lastPlayedLevelId, "master-sampler-10");
  assert.equal(unlockedLevelCount(loaded, levels), levels.length);
});

test("a save naming a level that no longer exists drops only that entry", () => {
  const raw = JSON.stringify({
    version: 1,
    completed: { "first-thread-01": { bestMoves: 4 }, "retired-level-99": { bestMoves: 9 } },
    lastPlayedLevelId: "retired-level-99"
  });
  const loaded = readProgress(raw, levels);
  assert.deepEqual(Object.keys(loaded.completed), ["first-thread-01"]);
  assert.equal(loaded.lastPlayedLevelId, null, "an unknown last-played level must not resume into nothing");
});

test("corrupt records inside an otherwise valid save are discarded, not trusted", () => {
  const raw = JSON.stringify({
    version: 1,
    completed: {
      "first-thread-01": { bestMoves: 4 },
      "kite-tail-02": { bestMoves: -3 },
      "twin-petals-03": { bestMoves: "many" },
      "butterfly-turn-04": null
    },
    lastPlayedLevelId: "first-thread-01"
  });
  const loaded = readProgress(raw, levels);
  assert.deepEqual(Object.keys(loaded.completed), ["first-thread-01"]);
  assert.equal(unlockedLevelCount(loaded, levels), 2);
});
