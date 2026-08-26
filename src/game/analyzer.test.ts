import assert from "node:assert/strict";
import test from "node:test";

import { analyzeLevel, difficultyScore, measureLevel, tierForScore } from "./analyzer.ts";
import { levels } from "./levels.ts";
import type { Level } from "./types.ts";

/** A three-stitch straight chain with zero decisions at any step. */
const forcedChain: Level = {
  id: "forced-chain",
  title: "Forced Chain",
  collection: "test",
  difficulty: "Gentle",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 10, y: 50 },
    { id: "b", x: 30, y: 50 },
    { id: "c", x: 50, y: 50 },
    { id: "d", x: 70, y: 50 }
  ],
  frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "d" }],
  backEdges: [{ from: "b", to: "c" }],
  authoredSolution: ["a", "b", "c", "d"],
  expectedSolutionCount: 1,
  unique: true,
  allowDeadEnds: false,
  hintText: "",
  clues: { concept: "", region: "" },
  completionMessage: ""
};

/** A short fork: one safe return loop plus one dead-end runner. */
const forkWithTrap: Level = {
  id: "fork-with-trap",
  title: "Fork",
  collection: "test",
  difficulty: "Moderate",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 10, y: 60 },
    { id: "b", x: 35, y: 60 },
    { id: "c", x: 35, y: 30 },
    { id: "d", x: 65, y: 40 },
    { id: "e", x: 80, y: 60 }
  ],
  frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" }],
  backEdges: [{ from: "b", to: "c" }, { from: "b", to: "d" }],
  authoredSolution: ["a", "b", "c", "b", "d", "e"],
  expectedSolutionCount: 1,
  unique: true,
  allowDeadEnds: true,
  hintText: "",
  clues: { concept: "", region: "" },
  completionMessage: ""
};

test("the analyzer is deterministic for the same level", () => {
  for (const level of levels) {
    assert.deepEqual(analyzeLevel(level), analyzeLevel(level), `${level.id} must analyze identically twice`);
  }
});

test("a forced chain is pure autoplay: no decisions, no traps, no risk", () => {
  const metrics = analyzeLevel(forcedChain);
  assert.equal(metrics.totalStitches, 3);
  assert.equal(metrics.solutionCount, 1);
  assert.equal(metrics.decisionStates, 0);
  assert.equal(metrics.solutionDecisionStates, 0);
  assert.equal(metrics.maxBranching, 1);
  assert.equal(metrics.forcedMovePercent, 1);
  assert.equal(metrics.distinctDeadEnds, 0);
  assert.equal(metrics.dangerousDecisions, 0);
  assert.equal(metrics.canTrap, false);
});

test("a fork with a dead-end runner reports a reachable trap and a dangerous decision", () => {
  const metrics = analyzeLevel(forkWithTrap);
  assert.equal(metrics.solutionCount, 1);
  assert.equal(metrics.decisionStates, 1);
  assert.equal(metrics.dangerousDecisions, 1);
  assert.equal(metrics.canTrap, true);
  assert.equal(metrics.distinctDeadEnds >= 1, true);
  assert.equal(metrics.safeAlternativeCount >= 1, true);
  assert.ok(metrics.earliestDoomDepth !== null);
});

test("a branching trap puzzle scores far above a longer forced path", () => {
  // The forced chain is only 3 stitches; even doubling its length must not
  // out-score a short puzzle that demands a real, dangerous decision.
  const longForced: Level = {
    ...forcedChain,
    holes: [
      { id: "a", x: 10, y: 50 },
      { id: "b", x: 26, y: 50 },
      { id: "c", x: 42, y: 50 },
      { id: "d", x: 58, y: 50 },
      { id: "e", x: 74, y: 50 },
      { id: "f", x: 90, y: 50 }
    ],
    frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "d" }, { from: "e", to: "f" }],
    backEdges: [{ from: "b", to: "c" }, { from: "d", to: "e" }],
    authoredSolution: ["a", "b", "c", "d", "e", "f"]
  };
  const forcedScore = difficultyScore(longForced, analyzeLevel(longForced));
  const trapScore = difficultyScore(forkWithTrap, analyzeLevel(forkWithTrap));
  assert.ok(trapScore.total > forcedScore.total, "thought must outrank raw stitch count");
  assert.equal(forcedScore.risk, 0);
});

test("the difficulty score is transparent: length is capped and can never dominate", () => {
  for (const level of levels) {
    const { metrics, score } = measureLevel(level);
    assert.ok(score.length <= 10, `${level.id} length share must stay within its cap`);
    assert.ok(score.planning >= 0 && score.planning <= 50, `${level.id} planning within share`);
    assert.ok(score.risk >= 0 && score.risk <= 40, `${level.id} risk within share`);
    // The three components fully explain the total (rounding tolerance ±1).
    assert.ok(Math.abs(score.total - (score.planning + score.risk + score.length)) <= 1, level.id);
    // Sanity: total stitches alone cannot push a level over 10.
    assert.ok(metrics.totalStitches <= 24 || score.length === 10);
  }
});

test("measured tiers follow documented boundaries", () => {
  assert.equal(tierForScore(14), "Gentle");
  assert.equal(tierForScore(15), "Easy");
  assert.equal(tierForScore(34), "Easy");
  assert.equal(tierForScore(35), "Moderate");
  assert.equal(tierForScore(54), "Moderate");
  assert.equal(tierForScore(55), "Tricky");
  assert.equal(tierForScore(74), "Tricky");
  assert.equal(tierForScore(75), "Expert");
  assert.equal(tierForScore(100), "Expert");
});

test("authored difficulty labels match the measured tier for every level", () => {
  for (const level of levels) {
    const { score } = measureLevel(level);
    assert.equal(score.tier, level.difficulty, `${level.id} authored label disagrees with measurement`);
  }
});
