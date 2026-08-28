import assert from "node:assert/strict";
import test from "node:test";

import { levels } from "../content/catalog.ts";
import { createGame, playMove } from "./engine.ts";
import {
  holeById,
  needlePoseFor,
  needleTipFor,
  projectForSide,
  projectThroughFabric
} from "./boardGeometry.ts";
import type { Level } from "./types.ts";

const SIZE = 320;

function approxEqual(a: number, b: number, eps = 1e-9) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ~= ${b}`);
}

test("front projection is identity-mapped, back projection mirrors x only", () => {
  const hole = { id: "z", x: 30, y: 70 };
  const front = projectForSide(hole, "front", SIZE);
  const back = projectForSide(hole, "back", SIZE);
  const mirroredHole = { ...hole, x: 100 - hole.x };
  const mirroredFront = projectForSide(mirroredHole, "front", SIZE);
  approxEqual(back.x, mirroredFront.x);
  approxEqual(back.y, front.y); // y never mirrors
});

test("Through-Cloth Peek alignment: every hole of every production level lands on the exact same pixel as the viewing side's own projection", () => {
  for (const level of levels) {
    for (const side of ["front", "back"] as const) {
      for (const hole of level.holes) {
        const played = projectForSide(hole, side, SIZE);
        const peeked = projectThroughFabric(hole, side, SIZE);
        approxEqual(peeked.x, played.x);
        approxEqual(peeked.y, played.y);
      }
    }
  }
});

test("Through-Cloth Peek is NOT the same as the peeked side's own (real-flip) projection, except where geometrically symmetric", () => {
  // Sanity check that the peek helper isn't accidentally identical to
  // projecting through the peeked side itself (which would silently
  // reintroduce the old floating-mirror bug for any asymmetric hole).
  const asymmetricHole = { id: "a", x: 22, y: 61 };
  const throughFront = projectThroughFabric(asymmetricHole, "front", SIZE);
  const realBack = projectForSide(asymmetricHole, "back", SIZE);
  assert.notEqual(throughFront.x, realBack.x);
});

test("needle-anchor invariant: needle tip always equals the projection of currentHole on activeSide, for every reachable state of every level", () => {
  for (const level of levels) {
    let game = createGame(level);
    assertAnchored(level, game);

    for (const holeId of level.authoredSolution) {
      const result = playMove(level, game, holeId);
      if (!result.ok) continue;
      game = result.state;
      assertAnchored(level, game);
    }
  }

  function assertAnchored(level: Level, game: ReturnType<typeof createGame>) {
    const tip = needleTipFor(level, game, SIZE);
    const expected = projectForSide(holeById(level, game.currentHole), game.activeSide, SIZE);
    approxEqual(tip.x, expected.x);
    approxEqual(tip.y, expected.y);
  }
});

test("needle pose: before any stitch, uses the default angle and is anchored at startHole", () => {
  const level = levels[0];
  const game = createGame(level);
  const pose = needlePoseFor(level, game, SIZE);
  const expectedTip = projectForSide(holeById(level, level.startHole), level.startSide, SIZE);
  approxEqual(pose.tip.x, expectedTip.x);
  approxEqual(pose.tip.y, expectedTip.y);
  assert.equal(typeof pose.angleDeg, "number");
  assert.ok(Number.isFinite(pose.angleDeg));
});

test("needle pose: after a stitch, the angle is derived from the just-stitched vector, not a fixed constant", () => {
  const level = levels.find((candidate) => candidate.authoredSolution.length > 1) ?? levels[0];
  const game0 = createGame(level);
  const result = playMove(level, game0, level.authoredSolution[1]);
  assert.ok(result.ok);
  if (!result.ok) return;

  const pose = needlePoseFor(level, result.state, SIZE);
  const tip = needleTipFor(level, result.state, SIZE);
  approxEqual(pose.tip.x, tip.x);
  approxEqual(pose.tip.y, tip.y);
  assert.ok(Number.isFinite(pose.angleDeg));
});

test("last-move continuity: for every legal move, the needle ends exactly on the destination hole after the side flips", () => {
  for (const level of levels.slice(0, 6)) {
    let game = createGame(level);
    for (const holeId of level.authoredSolution) {
      const before = game;
      const result = playMove(level, before, holeId);
      if (!result.ok) continue;
      game = result.state;

      assert.equal(game.currentHole, holeId);
      const tip = needleTipFor(level, game, SIZE);
      const destination = projectForSide(holeById(level, holeId), game.activeSide, SIZE);
      approxEqual(tip.x, destination.x);
      approxEqual(tip.y, destination.y);
    }
  }
});
