import assert from "node:assert/strict";
import test from "node:test";

import { catalog } from "../content/catalog.ts";
import { analyzeLevel } from "./analyzer.ts";
import { analyzeStranding, countSolutions, solveLevel, validateLevel } from "./solver.ts";
import { syntheticChain, syntheticHub, syntheticRunnerHub } from "./synthetic.ts";

/**
 * Budgets, not guarantees. These are deliberately loose — the point is to fail
 * if the authoring tools ever become exponentially painful, not to assert a
 * millisecond figure that a shared CI runner cannot honour. Measured figures
 * live in docs/MILESTONE-7-QA.md.
 */
const CATALOG_BUDGET_MS = 2000;
const DENSE_FIXTURE_BUDGET_MS = 5000;

function elapsed(work: () => void): number {
  const started = process.hrtime.bigint();
  work();
  return Number(process.hrtime.bigint() - started) / 1e6;
}

// ---- Metric semantics: each name must mean exactly what it says ------------

test("safeAlternativeCount counts safe stitches at DANGEROUS decisions only", () => {
  // This is the Prompt 7 bug fix. The old implementation counted a safe stitch
  // at *every* decision state, so a level with no danger at all still reported
  // "safe alternatives" — alternatives to nothing.
  for (const level of catalog.levels) {
    const metrics = analyzeLevel(level);
    if (metrics.dangerousDecisions === 0) {
      assert.equal(
        metrics.safeAlternativeCount,
        0,
        `${level.id} has no dangerous decision, so it can have no safe alternative`
      );
    }
  }

  // Butterfly Turn is the sharpest case: four decision states, three-way
  // branching, and not one dangerous stitch anywhere.
  const butterfly = analyzeLevel(catalog.levels[3]);
  assert.equal(catalog.levels[3].id, "butterfly-turn-04");
  assert.ok(butterfly.decisionStates >= 4, "the fixture must really contain decisions");
  assert.equal(butterfly.canTrap, false);
  assert.equal(butterfly.safeAlternativeCount, 0);
});

test("safeAlternativeCount is exactly the safe fan-out at dangerous decisions", () => {
  // A hub with N petals plus one runner: from the hub, every unused petal is
  // safe and the runner is doomed until the petals are gone. With 3 petals the
  // hub states form a full subset lattice, and each state's safe fan-out is the
  // number of petals still open. Summing over states gives 12 — checked here
  // against a hand-derived figure, not against the implementation.
  const metrics = analyzeLevel(syntheticRunnerHub(3));
  assert.equal(metrics.dangerousDecisions, 7);
  assert.equal(metrics.unsafeChoiceCount, 7, "one doomed runner stitch per dangerous state");
  assert.equal(metrics.safeAlternativeCount, 12);
  assert.equal(metrics.safeAlternativeCount + metrics.unsafeChoiceCount >= metrics.dangerousDecisions * 2, true);
});

test("unsafeChoiceCount counts doomed stitches offered as a choice, never forced ones", () => {
  // A forced chain has no choices at all, so it can have no unsafe choice.
  const chain = analyzeLevel(syntheticChain(12));
  assert.equal(chain.decisionStates, 0);
  assert.equal(chain.unsafeChoiceCount, 0);
  assert.equal(chain.safeAlternativeCount, 0);
  assert.equal(chain.forcedMovePercent, 1);
});

test("dangerousDecisions, doomedStates and dead ends stay consistent with each other", () => {
  for (const level of catalog.levels) {
    const metrics = analyzeLevel(level);
    assert.equal(metrics.canTrap, metrics.distinctDeadEnds > 0, level.id);
    if (metrics.distinctDeadEnds > 0) {
      // Every dead end is itself a doomed state, so doomed >= dead ends.
      assert.ok(metrics.doomedStates >= metrics.distinctDeadEnds, level.id);
      assert.ok(metrics.dangerousDecisions >= 1, level.id);
      assert.ok(metrics.earliestDoomDepth !== null, level.id);
      assert.ok(metrics.maxConsequenceDepth >= 1, level.id);
    } else {
      assert.equal(metrics.doomedStates, 0, level.id);
      assert.equal(metrics.dangerousDecisions, 0, level.id);
      assert.equal(metrics.earliestDoomDepth, null, level.id);
      assert.equal(metrics.maxConsequenceDepth, 0, level.id);
    }
  }
});

test("solutionDecisionStates is a subset of decisionStates", () => {
  for (const level of catalog.levels) {
    const metrics = analyzeLevel(level);
    assert.ok(metrics.solutionDecisionStates <= metrics.decisionStates, level.id);
    assert.ok(metrics.forcedMoveStates + metrics.decisionStates <= metrics.reachableStates, level.id);
  }
});

// ---- Counting: exact, and honest when it is not ----------------------------

test("the memoised count agrees exactly with full path enumeration on every shipped level", () => {
  for (const level of catalog.levels) {
    const enumerated = solveLevel(level).solutionCount;
    const counted = countSolutions(level);
    const analyzed = analyzeLevel(level);
    assert.equal(counted.count, enumerated, level.id);
    assert.equal(counted.exact, true, level.id);
    assert.equal(analyzed.solutionCount, enumerated, level.id);
    assert.equal(analyzed.solutionCountExact, true, level.id);
  }
});

test("the memoised count agrees with enumeration on a densely branching fixture", () => {
  // 6 petals: 720 distinct solution paths. Enumeration is still tractable here,
  // which is exactly why it makes a good cross-check.
  const level = syntheticHub(6);
  assert.equal(countSolutions(level).count, 720);
  assert.equal(solveLevel(level).solutionCount, 720);
  assert.equal(analyzeLevel(level).solutionCount, 720);
});

test("a capped count never claims to be exact", () => {
  const level = syntheticHub(6);
  const capped = countSolutions(level, 10);
  assert.equal(capped.count, 10);
  assert.equal(capped.exact, false, "a truncated count must not be labelled exact");
  assert.equal(capped.cap, 10);

  const budgeted = countSolutions(level, 1_000_000, 5);
  assert.equal(budgeted.stateBudgetExceeded, true);
  assert.equal(budgeted.exact, false);
});

test("an analyzer run that hits its state budget reports itself as non-exhaustive", () => {
  const metrics = analyzeLevel(syntheticHub(7), { stateBudget: 20 });
  assert.equal(metrics.exhaustive, false);
  assert.equal(metrics.solutionCountExact, false);
});

test("stranding analysis is exact and matches the analyzer's dead-end count", () => {
  for (const level of catalog.levels) {
    const stranding = analyzeStranding(level);
    const metrics = analyzeLevel(level);
    assert.equal(stranding.canStrand, metrics.canTrap, level.id);
    assert.equal(stranding.deadEndStates, metrics.distinctDeadEnds, level.id);
  }
});

test("validation of a synthetic hoop with 5040 solutions is still exact and fast", () => {
  const level = syntheticHub(7);
  const ms = elapsed(() => {
    const result = validateLevel(level);
    assert.equal(result.valid, true, result.issues.map((issue) => issue.message).join("; "));
    assert.equal(result.solutions.count, 5040);
    assert.equal(result.solutions.exact, true);
  });
  assert.ok(ms < DENSE_FIXTURE_BUDGET_MS, `validation took ${ms.toFixed(1)}ms`);
});

// ---- Scale ----------------------------------------------------------------

test("analysing the whole production catalog stays well inside its budget", () => {
  const ms = elapsed(() => {
    for (const level of catalog.levels) analyzeLevel(level);
  });
  assert.ok(ms < CATALOG_BUDGET_MS, `catalog analysis took ${ms.toFixed(1)}ms`);
});

test("state count grows linearly for forced chains, so length alone is cheap", () => {
  const short = analyzeLevel(syntheticChain(40)).reachableStates;
  const long = analyzeLevel(syntheticChain(80)).reachableStates;
  assert.equal(short, 41);
  assert.equal(long, 81);
});

test("a fixture far denser than any shipped hoop still analyses inside the budget", () => {
  // 9 petals: 362,880 solution paths, but only a few thousand states. Path
  // enumeration takes seconds here; state-memoised analysis takes milliseconds.
  const level = syntheticHub(9);
  let states = 0;
  let solutions = 0;
  const ms = elapsed(() => {
    const metrics = analyzeLevel(level);
    states = metrics.reachableStates;
    solutions = metrics.solutionCount;
  });
  assert.equal(solutions, 362880);
  assert.ok(states < 4000, `states=${states}`);
  assert.ok(ms < DENSE_FIXTURE_BUDGET_MS, `dense analysis took ${ms.toFixed(1)}ms`);
});

test("counting beats enumeration by a wide margin on a dense fixture", () => {
  const level = syntheticHub(8);
  const countMs = elapsed(() => countSolutions(level));
  const enumerateMs = elapsed(() => solveLevel(level));
  assert.ok(
    enumerateMs > countMs * 5,
    `expected counting to be much cheaper: count=${countMs.toFixed(2)}ms enumerate=${enumerateMs.toFixed(2)}ms`
  );
});
