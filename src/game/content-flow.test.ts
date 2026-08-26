import assert from "node:assert/strict";
import test from "node:test";

import { createGame, nextHint, playMove, undoMove } from "./engine.ts";
import { levels } from "./levels.ts";
import { emptyProgress, isLevelUnlocked, readProgress, recordCompletion } from "../progress/model.ts";

test("the full ten-level collection unlocks, persists, and completes in order", () => {
  let savedProgress = emptyProgress();

  for (const [index, level] of levels.entries()) {
    assert.equal(isLevelUnlocked(savedProgress, levels, level.id), true, `level ${index + 1} should be unlocked`);
    let game = createGame(level);
    for (const target of level.authoredSolution.slice(1)) {
      const result = playMove(level, game, target);
      assert.equal(result.ok, true, `${level.id} should accept authored stitch to ${target}`);
      if (!result.ok) return;
      game = result.state;
    }
    assert.equal(game.complete, true, level.id);
    savedProgress = recordCompletion(savedProgress, level.id, game.moves.length);

    if (index === 0) {
      savedProgress = readProgress(JSON.stringify(savedProgress), levels);
      assert.equal(isLevelUnlocked(savedProgress, levels, levels[1].id), true, "level two remains unlocked after reload");
    }
  }

  assert.equal(Object.keys(savedProgress.completed).length, 10);
  assert.equal(savedProgress.completed[levels[9].id].bestMoves, levels[9].authoredSolution.length - 1);
});

test("a hard-level dead end can be undone and the solver hint recovers", () => {
  const level = levels[8];
  let game = createGame(level);
  for (const target of ["b", "d"]) {
    const result = playMove(level, game, target);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    game = result.state;
  }
  assert.equal(nextHint(level, game), null);
  game = undoMove(level, game);
  assert.equal(nextHint(level, game), "c");
});
