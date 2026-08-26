import assert from "node:assert/strict";
import test from "node:test";

import { createGame, isGameStuck, playMove, undoMove } from "./engine.ts";
import { getLevel, levels } from "./levels.ts";
import type { GameState, Level } from "./types.ts";

function play(level: Level, path: string[]): GameState {
  let state = createGame(level);
  for (const node of path.slice(1)) {
    const result = playMove(level, state, node);
    assert.ok(result.ok, `expected legal stitch to ${node}, got ${result.ok ? "ok" : result.reason}`);
    state = result.state;
  }
  return state;
}

test("a fresh game is never stuck", () => {
  for (const level of levels) {
    assert.equal(isGameStuck(level, createGame(level)), false, `${level.id} should start playable`);
  }
});

test("a completed level is never reported stuck", () => {
  for (const level of levels) {
    const state = play(level, level.authoredSolution);
    assert.equal(state.complete, true, `${level.id} authored solution should complete`);
    assert.equal(isGameStuck(level, state), false, `${level.id} completion must not read as stuck`);
  }
});

test("the completing stitch never transiently reports stuck", () => {
  // Walk the whole authored solution and assert isGameStuck is false at every
  // intermediate state, including immediately before completion.
  for (const level of levels) {
    let state = createGame(level);
    for (const node of level.authoredSolution.slice(1)) {
      const result = playMove(level, state, node);
      assert.ok(result.ok);
      state = result.state;
      if (!state.complete) {
        assert.equal(isGameStuck(level, state), false, `${level.id} should stay playable mid-solve`);
      }
    }
  }
});

test("forked-needle can strand the thread on the tempting branch", () => {
  // Front a-b, then the back branch b-d instead of closing the b-c loop first:
  // the runaway run d-e-f-g-h ends stranded at h with c left behind.
  const level = getLevel("forked-needle-05")!;
  const stranded = play(level, ["a", "b", "d", "e", "f", "g", "h"]);
  assert.equal(stranded.complete, false);
  assert.equal(isGameStuck(level, stranded), true, "b->d run should strand the thread");
});

test("undo recovers from a trapped thread", () => {
  const level = getLevel("forked-needle-05")!;
  const stranded = play(level, ["a", "b", "d", "e", "f", "g", "h"]);
  assert.equal(isGameStuck(level, stranded), true);
  const recovered = undoMove(level, stranded);
  assert.equal(isGameStuck(level, recovered), false, "undo must free the needle");
});

test("restart (a fresh game) recovers from a trapped thread", () => {
  const level = getLevel("forked-needle-05")!;
  const stranded = play(level, ["a", "b", "d", "e", "f", "g", "h"]);
  assert.equal(isGameStuck(level, stranded), true);
  const restarted = createGame(level);
  assert.equal(isGameStuck(level, restarted), false, "restart must free the needle");
});

test("every level marked allowDeadEnds has at least one reachable stuck state", () => {
  // Depth-first search for any legal, non-complete state with no moves left.
  for (const level of levels.filter((candidate) => candidate.allowDeadEnds)) {
    assert.ok(hasReachableDeadEnd(level), `${level.id} should expose a genuine dead end`);
  }
});

test("no level without allowDeadEnds can ever be stranded", () => {
  for (const level of levels.filter((candidate) => !candidate.allowDeadEnds)) {
    assert.equal(hasReachableDeadEnd(level), false, `${level.id} must never trap the thread`);
  }
});

function hasReachableDeadEnd(level: Level): boolean {
  const seen = new Set<string>();
  function walk(state: GameState): boolean {
    if (state.complete) return false;
    if (isGameStuck(level, state)) return true;
    const key = `${state.activeSide}:${state.currentHole}:${[...state.usedEdges].sort().join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    for (const node of availableTargets(level, state)) {
      const result = playMove(level, state, node);
      if (result.ok && walk(result.state)) return true;
    }
    return false;
  }
  return walk(createGame(level));
}

// Local re-derivation of legal targets so the test does not depend on the
// engine's availableNodes export ordering.
function availableTargets(level: Level, state: GameState): string[] {
  const targets: string[] = [];
  for (const node of level.holes) {
    if (node.id === state.currentHole) continue;
    const result = playMove(level, state, node.id);
    if (result.ok) targets.push(node.id);
  }
  return targets;
}
