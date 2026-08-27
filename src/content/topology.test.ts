import assert from "node:assert/strict";
import test from "node:test";

import type { Level } from "../game/types.ts";
import { canonicalKey, classifyPair, findDuplicates } from "./topology.ts";
import { catalog } from "./catalog.ts";

function level(overrides: Partial<Level>): Level {
  return {
    id: "test",
    title: "Test",
    difficulty: "Easy",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 10, y: 10 },
      { id: "b", x: 20, y: 20 },
      { id: "c", x: 30, y: 30 },
      { id: "d", x: 40, y: 40 }
    ],
    frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "b" }],
    backEdges: [{ from: "b", to: "c" }, { from: "b", to: "d" }],
    authoredSolution: [],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: false,
    completionMessage: "",
    ...overrides
  };
}

const base = level({});

test("hole renaming does not defeat duplicate detection", () => {
  const renamed = level({
    id: "renamed",
    startHole: "w",
    holes: [
      { id: "w", x: 10, y: 10 },
      { id: "x", x: 20, y: 20 },
      { id: "y", x: 30, y: 30 },
      { id: "z", x: 40, y: 40 }
    ],
    frontEdges: [{ from: "w", to: "x" }, { from: "y", to: "x" }],
    backEdges: [{ from: "x", to: "y" }, { from: "x", to: "z" }]
  });
  assert.equal(classifyPair(base, renamed), "exact");
});

test("coordinate movement does not defeat duplicate detection", () => {
  const moved = level({
    id: "moved",
    holes: [
      { id: "a", x: 90, y: 5 },
      { id: "b", x: 55, y: 60 },
      { id: "c", x: 12, y: 88 },
      { id: "d", x: 1, y: 1 }
    ]
  });
  assert.equal(classifyPair(base, moved), "exact");
});

test("front/back edge differences are respected: moving one edge to the other side (not a global mirror) is not an exact duplicate", () => {
  // base: front{a-b, c-b}, back{b-c, b-d} — b-d exists only on the back.
  // Moving just that one edge to the front (nothing else changes) must not
  // read as the same puzzle: a naive detector that ignores side would still
  // see "the same underlying graph" and wrongly call this exact.
  const movedOneEdge = level({
    id: "moved-one-edge",
    frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "b" }, { from: "b", to: "d" }],
    backEdges: [{ from: "b", to: "c" }]
  });
  assert.notEqual(classifyPair(base, movedOneEdge), "exact");
  assert.notEqual(classifyPair(base, movedOneEdge), "mirrored");
});

test("a fully front/back-swapped level is MIRRORED, not EXACT, and not silently ignored", () => {
  const flipped = level({
    id: "flipped",
    startSide: "back",
    frontEdges: base.backEdges,
    backEdges: base.frontEdges
  });
  assert.equal(classifyPair(base, flipped), "mirrored");
});

test("start side differing (with identical edges) is not an exact duplicate", () => {
  const differentStartSide = level({ id: "back-start", startSide: "back" });
  assert.notEqual(classifyPair(base, differentStartSide), "exact");
});

test("start hole differing (with identical edges) is not an exact duplicate", () => {
  const differentStart = level({ id: "different-start", startHole: "c" });
  assert.notEqual(classifyPair(base, differentStart), "exact");
});

test("a genuinely distinct puzzle is not flagged at all", () => {
  const distinct = level({
    id: "star-hub",
    holes: [
      { id: "a", x: 10, y: 10 },
      { id: "b", x: 20, y: 20 },
      { id: "c", x: 30, y: 30 },
      { id: "d", x: 40, y: 40 },
      { id: "e", x: 50, y: 50 }
    ],
    frontEdges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }, { from: "a", to: "e" }],
    backEdges: [{ from: "b", to: "a" }, { from: "c", to: "a" }, { from: "d", to: "a" }, { from: "e", to: "a" }]
  });
  assert.equal(classifyPair(base, distinct), "distinct");
});

test("canonicalKey is a pure function of structure: repeated calls agree", () => {
  assert.equal(canonicalKey(base).key, canonicalKey(base).key);
});

test("an exhaustive canonicalization reports exhaustedBudget: false", () => {
  const result = canonicalKey(base);
  assert.equal(result.exhaustedBudget, false);
  assert.ok(result.exploredLeaves > 0);
});

test("a canonicalization forced to a zero leaf budget reports exhaustedBudget: true", () => {
  const result = canonicalKey(base, 0);
  assert.equal(result.exhaustedBudget, true);
});

test("classifyPair returns exact under a full budget, but inexact (never exact) when forced to a tiny budget", () => {
  const renamed = level({
    id: "renamed",
    startHole: "w",
    holes: [
      { id: "w", x: 10, y: 10 },
      { id: "x", x: 20, y: 20 },
      { id: "y", x: 30, y: 30 },
      { id: "z", x: 40, y: 40 }
    ],
    frontEdges: [{ from: "w", to: "x" }, { from: "y", to: "x" }],
    backEdges: [{ from: "x", to: "y" }, { from: "x", to: "z" }]
  });
  assert.equal(classifyPair(base, renamed), "exact");
  assert.equal(classifyPair(base, renamed, 0), "inexact");
});

test("validateCatalogTopology refuses to certify (ok: false) when forced to a budget that cannot complete", async () => {
  const { validateCatalogTopology } = await import("./duplicates.ts");
  const reportExhaustive = validateCatalogTopology([base]);
  assert.equal(reportExhaustive.inexact.length, 0);

  const other = level({ id: "other", startHole: "c" });
  const reportForcedInexact = validateCatalogTopology([base, other], 0);
  assert.equal(reportForcedInexact.inexact.length, 1);
  assert.equal(reportForcedInexact.ok, false);
});

test("Collection 02's shipped catalog contains no unapproved exact or mirrored topology duplicates", () => {
  const allLevels = catalog.levels;
  const findings = findDuplicates(allLevels).filter((f) => f.kind === "exact" || f.kind === "mirrored");
  assert.deepEqual(
    findings,
    [],
    `Unapproved exact/mirrored topology duplicates: ${JSON.stringify(findings, null, 2)}`
  );
});

test("Knot's End is structurally distinct from Master Sampler", () => {
  const knotsEnd = catalog.levels.find((l) => l.id === "knots-end-20")!;
  const masterSampler = catalog.levels.find((l) => l.id === "master-sampler-10")!;
  const kind = classifyPair(knotsEnd, masterSampler);
  assert.notEqual(kind, "exact");
  assert.notEqual(kind, "mirrored");
});

test("Snared Vine is structurally distinct from Thicket Path", () => {
  const snaredVine = catalog.levels.find((l) => l.id === "snared-vine-19")!;
  const thicketPath = catalog.levels.find((l) => l.id === "thicket-path-17")!;
  const kind = classifyPair(snaredVine, thicketPath);
  assert.notEqual(kind, "exact");
  assert.notEqual(kind, "mirrored");
});
