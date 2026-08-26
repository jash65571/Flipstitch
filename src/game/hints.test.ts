import assert from "node:assert/strict";
import test from "node:test";

import { availableNodes, createGame, nextHint, playMove, stagedHint } from "./engine.ts";
import { getLevel, levels } from "./levels.ts";
import type { GameState, Level } from "./types.ts";

function play(level: Level, path: string[]): GameState {
  let state = createGame(level);
  for (const node of path.slice(1)) {
    const result = playMove(level, state, node);
    assert.ok(result.ok);
    state = result.state;
  }
  return state;
}

test("stage 1 is a concept clue that never reveals a hole", () => {
  const level = getLevel("forked-needle-05")!;
  const hint = stagedHint(level, createGame(level), 1);
  assert.equal(hint.stage, 1);
  assert.equal(hint.kind, "concept");
  assert.equal(hint.exactHole, null);
  assert.deepEqual(hint.regionHoles, []);
  assert.ok(hint.text.length > 0);
});

test("stage 1 does not leak the exact next hole in its text", () => {
  const level = getLevel("first-thread-01")!;
  const state = createGame(level);
  const exact = nextHint(level, state)!;
  const hint = stagedHint(level, state, 1);
  assert.ok(
    !hint.text.toUpperCase().includes(`HOLE ${exact.toUpperCase()}`),
    "conceptual clue must not name the exact hole"
  );
});

test("stage 2 softly marks the branch (the legal target holes)", () => {
  const level = getLevel("forked-needle-05")!;
  const state = createGame(level);
  const hint = stagedHint(level, state, 2);
  assert.equal(hint.stage, 2);
  assert.equal(hint.kind, "region");
  assert.equal(hint.exactHole, null);
  assert.deepEqual([...hint.regionHoles].sort(), [...availableNodes(level, state)].sort());
  assert.ok(hint.regionHoles.length > 0);
});

test("stage 3 pinpoints the exact solver hole", () => {
  const level = getLevel("forked-needle-05")!;
  const state = createGame(level);
  const hint = stagedHint(level, state, 3);
  assert.equal(hint.stage, 3);
  assert.equal(hint.kind, "exact");
  assert.equal(hint.exactHole, nextHint(level, state));
  assert.ok(hint.exactHole !== null);
  assert.ok(hint.text.toUpperCase().includes(hint.exactHole!.toUpperCase()));
});

test("escalation strictly widens what is revealed", () => {
  // concept: nothing -> region: some holes -> exact: one specific hole.
  for (const level of levels) {
    const state = createGame(level);
    const s1 = stagedHint(level, state, 1);
    const s2 = stagedHint(level, state, 2);
    const s3 = stagedHint(level, state, 3);
    assert.equal(s1.regionHoles.length, 0, `${level.id} stage 1 reveals no holes`);
    assert.ok(s2.regionHoles.length >= 1, `${level.id} stage 2 reveals the branch`);
    assert.ok(s3.exactHole !== null, `${level.id} stage 3 reveals the exact hole`);
    assert.ok(s2.regionHoles.includes(s3.exactHole!), `${level.id} exact hole is within the region`);
  }
});

test("on a stranded branch, staged help points to undo rather than a hole", () => {
  const level = getLevel("forked-needle-05")!;
  const stranded = play(level, ["a", "b", "d", "e", "f", "g", "h"]);
  assert.equal(stranded.complete, false);
  const s2 = stagedHint(level, stranded, 2);
  const s3 = stagedHint(level, stranded, 3);
  assert.deepEqual(s2.regionHoles, []);
  assert.equal(s3.exactHole, null);
  assert.match(s3.text.toLowerCase(), /undo/);
});
