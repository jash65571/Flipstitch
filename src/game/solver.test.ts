import assert from "node:assert/strict";
import test from "node:test";

import { levels } from "./levels.ts";
import { solveLevel, validateLevel } from "./solver.ts";
import type { Level } from "./types.ts";

function copyLevel(overrides: Partial<Level> = {}): Level {
  const source = levels[0];
  return {
    ...source,
    holes: source.holes.map((hole) => ({ ...hole })),
    frontEdges: source.frontEdges.map((edge) => ({ ...edge })),
    backEdges: source.backEdges.map((edge) => ({ ...edge })),
    authoredSolution: [...source.authoredSolution],
    ...overrides
  };
}

test("all ten production levels pass deterministic validation", () => {
  assert.equal(levels.length, 10);
  for (const level of levels) {
    const result = validateLevel(level);
    assert.equal(result.valid, true, `${level.id}: ${result.issues.map((issue) => issue.message).join("; ")}`);
    assert.equal(result.solver.solutionCount, level.expectedSolutionCount);
  }
});

test("invalid hole references name the bad edge", () => {
  const result = validateLevel(copyLevel({ frontEdges: [{ from: "a", to: "missing" }] }));
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "INVALID_EDGE_HOLE" && issue.message.includes("a-missing")));
});

test("duplicate same-side edges are rejected in either direction", () => {
  const result = validateLevel(
    copyLevel({ frontEdges: [{ from: "a", to: "b" }, { from: "b", to: "a" }] })
  );
  assert.ok(result.issues.some((issue) => issue.code === "DUPLICATE_EDGE"));
});

test("wrong starting holes fail authored-solution validation", () => {
  const result = validateLevel(copyLevel({ startHole: "b" }));
  assert.ok(result.issues.some((issue) => issue.code === "WRONG_SOLUTION_START"));
});

test("wrong side alternation points to the exact stitch", () => {
  const level = copyLevel({
    frontEdges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "e", to: "f" }],
    backEdges: [{ from: "c", to: "d" }, { from: "d", to: "e" }]
  });
  const result = validateLevel(level);
  assert.ok(result.issues.some((issue) => issue.code === "WRONG_SIDE_OR_EDGE" && issue.message.includes("Stitch 2")));
});

test("incomplete authored solutions report missing stitches and edges", () => {
  const result = validateLevel(copyLevel({ authoredSolution: ["a", "b", "c"] }));
  assert.ok(result.issues.some((issue) => issue.code === "INCOMPLETE_SOLUTION"));
  assert.ok(result.issues.some((issue) => issue.code === "MISSING_SOLUTION_EDGES"));
});

test("an impossible level is reported as unsolvable", () => {
  const level = copyLevel({
    holes: [...levels[0].holes, { id: "z", x: 50, y: 90 }],
    frontEdges: [...levels[0].frontEdges, { from: "z", to: "f" }],
    expectedSolutionCount: 1,
    authoredSolution: [...levels[0].authoredSolution, "z"]
  });
  const result = validateLevel(level);
  assert.ok(result.issues.some((issue) => issue.code === "UNSOLVABLE"));
});

test("the solver counts multiple valid trails", () => {
  const level = levels.find((candidate) => candidate.id === "orbit-bloom-07")!;
  assert.equal(solveLevel(level).solutionCount, 6);
  assert.equal(validateLevel(level).valid, true);
});

test("levels marked unique have exactly one solution", () => {
  for (const level of levels.filter((candidate) => candidate.unique)) {
    const solved = solveLevel(level);
    assert.equal(solved.solutionCount, 1, level.id);
  }
});

test("a falsely unique level fails with an author-friendly count", () => {
  const multi = levels.find((candidate) => candidate.id === "twin-petals-03")!;
  const result = validateLevel({ ...multi, unique: true, expectedSolutionCount: 1 });
  assert.ok(result.issues.some((issue) => issue.code === "NOT_UNIQUE"));
  assert.ok(result.issues.some((issue) => issue.code === "SOLUTION_COUNT_MISMATCH"));
});
