import assert from "node:assert/strict";
import test from "node:test";

import { levels } from "../game/levels.ts";
import {
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
