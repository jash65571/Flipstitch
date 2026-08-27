import assert from "node:assert/strict";
import test from "node:test";

import { measureLevel } from "./analyzer.ts";
import { availableNodes, createGame, guidanceFor, nextHint, playMove, stagedHint } from "./engine.ts";
import { catalog, levels } from "../content/catalog.ts";
import type { GameState, Level } from "./types.ts";

/**
 * The locked-in measured curve for Collection 01.
 *
 * This array is a **regression guard on the authored content**, not a law of
 * the game. Prompt 6 required every level to score above the one before it;
 * Prompt 7 retired that as a global rule, because an endlessly rising line
 * hits the 0-100 ceiling within one collection and leaves no room to teach.
 *
 * What replaces it lives in `src/content/pacing.ts`: chapter-scoped invariants
 * (capstone is the chapter peak, guidance never strengthens, a large drop needs
 * an authored reason) plus advisory design warnings. This test still pins the
 * exact measured values, so an accidental change to a hoop or to the analyzer
 * is caught immediately — but a future collection is free to breathe.
 */
const EXPECTED_SCORES = [15, 22, 28, 31, 39, 54, 60, 64, 77, 80];

function play(level: Level, path: string[]): GameState {
  let state = createGame(level);
  for (const node of path.slice(1)) {
    const result = playMove(level, state, node);
    assert.ok(result.ok, `${level.id} expected legal stitch to ${node}`);
    state = result.state;
  }
  return state;
}

test("the measured curve for Collection 01 is exactly as authored", () => {
  const scores = catalog.collections[0].levels.map((level) => measureLevel(level).score.total);
  assert.deepEqual(scores, EXPECTED_SCORES, "the authored curve changed; update this test only with intent");
});

test("Collection 01 in particular still rises the whole way — a property of this content, not a global rule", () => {
  // Day & Night is one continuous ten-level learning arc, so it happens to be
  // monotonic. Asserting it here documents *this collection's* shape. The rule
  // that governs future content is in src/content/pacing.ts, and it permits a
  // paced drop; see pacing.test.ts. Collection 02 (Knot & Bramble) uses that
  // room deliberately — see the pacingNote on its Chapter Two opener.
  const scores = catalog.collections[0].levels.map((level) => measureLevel(level).score.total);
  for (let index = 1; index < scores.length; index += 1) {
    assert.ok(scores[index] > scores[index - 1], `level ${index + 1} is easier than level ${index}`);
  }
});

test("levels 1 and 2 stay tutorial-safe: guided, short, and impossible to strand", () => {
  for (const level of levels.slice(0, 2)) {
    const { metrics, score } = measureLevel(level);
    assert.equal(guidanceFor(level), "full", `${level.id} must keep full guidance`);
    assert.equal(level.allowDeadEnds, false);
    assert.equal(metrics.canTrap, false, `${level.id} must never trap a beginner`);
    assert.equal(metrics.dangerousDecisions, 0, `${level.id} must not hide a trap`);
    assert.ok(score.total < 25, `${level.id} must stay within the tutorial band`);
    // Tutorials still ask for at least one safe choice — they are not autoplay.
    assert.ok(metrics.solutionDecisionStates >= 1, `${level.id} should offer a safe choice`);
  }
});

test("the first true trap appears intentionally at level 5, not before", () => {
  for (const level of levels.slice(0, 4)) {
    assert.equal(level.allowDeadEnds, false, `${level.id} must remain trap-free`);
    assert.equal(measureLevel(level).metrics.canTrap, false);
  }
  const forkedNeedle = levels[4];
  assert.equal(forkedNeedle.id, "forked-needle-05");
  assert.equal(forkedNeedle.allowDeadEnds, true);
  assert.equal(measureLevel(forkedNeedle).metrics.canTrap, true);
});

test("levels marked trap-capable really trap; safe levels never do", () => {
  for (const level of levels) {
    const { metrics } = measureLevel(level);
    assert.equal(metrics.canTrap, level.allowDeadEnds, `${level.id} trap intent and reachability disagree`);
    if (level.allowDeadEnds) {
      assert.ok(metrics.distinctDeadEnds >= 1, `${level.id} must expose a reachable dead end`);
      assert.ok(metrics.dangerousDecisions >= 1, `${level.id} must require a dangerous decision`);
      assert.ok(metrics.earliestDoomDepth !== null, `${level.id} must have a measurable doom depth`);
    }
  }
});

test("Tricky and Expert levels demand real planning", () => {
  const hard = levels.filter((level) => ["Tricky", "Expert"].includes(level.difficulty));
  // Day & Night: Orbit Bloom, Laced Window, Moonlit Return, Master Sampler (4).
  // Knot & Bramble: Old Growth, Bark Hollow, Thicket Path, Twin Thorns,
  // Knot's End (5). Milestone 8.1 replaced Deep Taproot, Bramble Fork, and
  // Snared Vine's cloned graphs with genuinely new ones that measure into the
  // Moderate band, so they no longer count here — see docs/COLLECTION-02-DESIGN.md.
  assert.equal(hard.length, 9);
  for (const level of hard) {
    const { metrics, score } = measureLevel(level);
    assert.ok(metrics.solutionDecisionStates >= 3, `${level.id} should hold several real decisions`);
    assert.ok(metrics.dangerousDecisions >= 1, `${level.id} should hide believable traps`);
    assert.ok(score.total >= 55, `${level.id} must clear the Tricky band`);
    assert.ok(metrics.maxConsequenceDepth >= 2, `${level.id} should require planning ahead`);
  }
});

test("Levels 7 and 8 are genuinely harder than 6 — the curve no longer dips", () => {
  const l6 = measureLevel(levels[5]).score.total;
  const l7 = measureLevel(levels[6]).score.total;
  const l8 = measureLevel(levels[7]).score.total;
  assert.ok(l7 > l6, "level 7 must exceed level 6");
  assert.ok(l8 > l7, "level 8 must exceed level 7");
  assert.equal(measureLevel(levels[6]).metrics.canTrap, true);
  assert.equal(measureLevel(levels[7]).metrics.canTrap, true);
});

test("Master Sampler stays Day & Night's strongest capstone", () => {
  const dayAndNight = catalog.collections.find((c) => c.id === "day-and-night")!;
  const scores = dayAndNight.levels.map((level) => measureLevel(level).score.total);
  assert.equal(Math.max(...scores), scores[9]);
  const capstone = measureLevel(levels[9]).metrics;
  assert.ok(capstone.dangerousDecisions >= 10, "the capstone should be dense with danger");
  assert.ok(capstone.solutionDecisionStates >= 5, "the capstone should hold many meaningful decisions");
});

test("Knot's End is the catalog's strongest capstone overall", () => {
  // Milestone 8.1: Knot's End can no longer match Master Sampler's score by
  // being an exact topology clone of it (that was the bug). A later
  // collection's capstone legitimately scoring higher than an earlier one's
  // is expected content growth, not a regression — the invariant that
  // matters is that the catalog's final level is still its hardest.
  const scores = levels.map((level) => measureLevel(level).score.total);
  assert.equal(Math.max(...scores), scores.at(-1));
  assert.equal(levels.at(-1)!.id, "knots-end-20");
});

test("guidance never increases again late within each collection's own arc (also enforced per chapter by the pacing validator)", () => {
  const strength = { full: 3, reduced: 2, minimal: 1 } as const;
  for (const collection of catalog.collections) {
    const guidance = collection.levels.map((level) => guidanceFor(level));
    for (let index = 1; index < guidance.length; index += 1) {
      assert.ok(
        strength[guidance[index]] <= strength[guidance[index - 1]],
        `${collection.id}: guidance must not strengthen again at level ${index + 1}`
      );
    }
    assert.equal(guidance[0], "full", `${collection.id} should open at full guidance`);
    assert.equal(guidance[guidance.length - 1], "minimal", `${collection.id} should close at minimal guidance`);
  }
});

test("hint targets stay legal everywhere: every stage-3 hole is a real, legal move", () => {
  for (const level of levels) {
    let state = createGame(level);
    // At the start and after every authored prefix, the staged hint must never
    // name an illegal hole.
    for (const node of level.authoredSolution.slice(1)) {
      if (state.complete) break;
      const s3 = stagedHint(level, state, 3);
      if (s3.exactHole !== null) {
        assert.ok(
          availableNodes(level, state).includes(s3.exactHole),
          `${level.id} stage 3 named ${s3.exactHole} which is not legal from ${state.currentHole}/${state.activeSide}`
        );
      }
      const result = playMove(level, state, node);
      assert.ok(result.ok);
      state = result.state;
    }
    assert.equal(state.complete, true);
    assert.equal(nextHint(level, state), null, "a completed level has no hint");
  }
});

test("every level offers at least one meaningful decision — none are autoplay", () => {
  for (const level of levels) {
    const { metrics } = measureLevel(level);
    assert.ok(metrics.solutionDecisionStates >= 1, `${level.id} must contain a real choice`);
    assert.ok(metrics.forcedMovePercent < 1, `${level.id} must not be entirely forced`);
  }
});

test("solution counts stay intentional", () => {
  for (const level of levels) {
    const { metrics } = measureLevel(level);
    assert.equal(metrics.solutionCount, level.expectedSolutionCount, level.id);
    assert.equal(metrics.solutionCount > 1, !level.unique, level.id);
  }
});

test("the stranded-thread recovery loop never offers a hole", () => {
  // On the first trap level, drive the thread into the dead end and confirm
  // every hint stage points at undo, never at a hole.
  const level = levels[4];
  const stranded = play(level, ["a", "b", "d", "e", "f", "g", "h"]);
  for (const stage of [1, 2, 3] as const) {
    const hint = stagedHint(level, stranded, stage);
    assert.equal(hint.exactHole, null, `stage ${stage} must not reveal a hole on a trapped thread`);
  }
  assert.match(stagedHint(level, stranded, 3).text.toLowerCase(), /undo/);
});
