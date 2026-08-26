import assert from "node:assert/strict";
import test from "node:test";

import { availableNodes, createGame, edgeKey, nextHint, playMove, progress, undoMove } from "./engine.ts";
import { levelOne } from "./level-one.ts";

test("a stitch moves the needle and forces the opposite side", () => {
  const initial = createGame(levelOne);
  const result = playMove(levelOne, initial, "b");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.state.currentHole, "b");
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
  assert.equal(restored.currentHole, "a");
  assert.equal(restored.moves.length, 0);
  assert.equal(progress(levelOne, restored), 0);
});

test("the complete alternating path solves both sides", () => {
  let state = createGame(levelOne);

  for (const target of levelOne.authoredSolution.slice(1)) {
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
  const state = createGame(levelOne);
  assert.equal(nextHint(levelOne, state), "b");
  assert.deepEqual(state, createGame(levelOne));
});

test("every invalid move leaves the full state untouched", () => {
  const initial = createGame(levelOne);
  const sameHole = playMove(levelOne, initial, initial.currentHole);
  const wrongLine = playMove(levelOne, initial, "i");

  assert.equal(sameHole.ok, false);
  assert.equal(wrongLine.ok, false);
  assert.equal(sameHole.state, initial);
  assert.equal(wrongLine.state, initial);
  assert.equal(initial.usedEdges.size, 0);
  assert.equal(initial.moves.length, 0);
});

test("a used stitch and a completed game reject moves without mutation", () => {
  const firstEdge = { ...levelOne.frontEdges[0], side: "front" as const };
  const usedState = {
    ...createGame(levelOne),
    usedEdges: new Set([edgeKey(firstEdge)])
  };
  const reused = playMove(levelOne, usedState, "b");

  assert.equal(reused.ok, false);
  assert.equal(reused.state, usedState);
  assert.equal(usedState.usedEdges.size, 1);

  const completeState = { ...usedState, complete: true };
  const afterComplete = playMove(levelOne, completeState, "b");
  assert.equal(afterComplete.ok, false);
  assert.equal(afterComplete.state, completeState);
});

test("a hint exposes one legal choice and never advances the needle", () => {
  const state = createGame(levelOne);
  const hint = nextHint(levelOne, state);

  assert.equal(hint, "b");
  assert.deepEqual(availableNodes(levelOne, state), ["b"]);
  assert.equal(state.currentHole, levelOne.startHole);
  assert.equal(state.activeSide, levelOne.startSide);
  assert.equal(state.moves.length, 0);
});

test("undo walks back a multi-stitch path exactly", () => {
  const first = playMove(levelOne, createGame(levelOne), "b");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = playMove(levelOne, first.state, "c");
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const restored = undoMove(levelOne, second.state);
  assert.equal(restored.activeSide, first.state.activeSide);
  assert.equal(restored.currentHole, first.state.currentHole);
  assert.deepEqual(restored.moves, first.state.moves);
  assert.deepEqual(restored.usedEdges, first.state.usedEdges);
});
