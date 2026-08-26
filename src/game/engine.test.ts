import assert from "node:assert/strict";
import test from "node:test";

import { createGame, nextHint, playMove, progress, undoMove } from "./engine.ts";
import { levelOne } from "./level-one.ts";

test("a stitch moves the needle and forces the opposite side", () => {
  const initial = createGame(levelOne);
  const result = playMove(levelOne, initial, "b");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.currentNode, "b");
  assert.equal(result.state.activeSide, "back");
  assert.equal(result.state.moves.length, 1);
});

test("a hole without a target stitch is rejected", () => {
  const initial = createGame(levelOne);
  const result = playMove(levelOne, initial, "c");

  assert.equal(result.ok, false);
  assert.equal(result.state, initial);
});

test("undo restores the prior side, hole, and thread", () => {
  const first = playMove(levelOne, createGame(levelOne), "b");
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const restored = undoMove(levelOne, first.state);
  assert.equal(restored.activeSide, "front");
  assert.equal(restored.currentNode, "a");
  assert.equal(restored.moves.length, 0);
  assert.equal(progress(levelOne, restored), 0);
});

test("the complete alternating path solves both sides", () => {
  let state = createGame(levelOne);

  for (const target of levelOne.solution.slice(1)) {
    const result = playMove(levelOne, state, target);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    state = result.state;
  }

  assert.equal(state.complete, true);
  assert.equal(progress(levelOne, state), 1);
  assert.equal(nextHint(levelOne, state), null);
});

test("the hint follows the authored solution", () => {
  assert.equal(nextHint(levelOne, createGame(levelOne)), "b");
});
