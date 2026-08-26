/**
 * Synthetic authoring fixtures — **tooling scale tests only**.
 *
 * These are not levels. They are not playable content, they carry no teaching
 * copy, and they are never registered in the catalog. Their only job is to give
 * the analyzer and solver inputs whose branching and stitch count grow on a
 * dial, so we can measure how the authoring tools behave on hoops far denser
 * than anything shipped, *before* a real Expert puzzle hits that wall.
 *
 * Each generator returns a structurally valid `Level` (real holes, real
 * alternating edges, a real authored solution) so validation and analysis run
 * exactly as they would on production content.
 */
import type { Level } from "./types.ts";

function baseLevel(id: string): Omit<Level, "holes" | "frontEdges" | "backEdges" | "authoredSolution" | "expectedSolutionCount" | "unique" | "allowDeadEnds"> {
  return {
    id,
    title: id,
    difficulty: "Gentle",
    startSide: "front",
    startHole: "h0",
    hintText: "",
    completionMessage: ""
  };
}

/**
 * A forced chain of `stitches` stitches: h0 -h0h1- h1 -h1h2- h2 ...
 * Alternating sides, exactly one legal move everywhere. State count grows
 * linearly, so this is the baseline "cheap" shape.
 */
export function syntheticChain(stitches: number): Level {
  const holes = Array.from({ length: stitches + 1 }, (_, index) => ({
    id: `h${index}`,
    x: Math.min(100, (index * 97) / Math.max(1, stitches)),
    y: 50
  }));
  const frontEdges = [];
  const backEdges = [];
  for (let index = 0; index < stitches; index += 1) {
    const edge = { from: `h${index}`, to: `h${index + 1}` };
    if (index % 2 === 0) frontEdges.push(edge);
    else backEdges.push(edge);
  }
  return {
    ...baseLevel(`synthetic-chain-${stitches}`),
    holes,
    frontEdges,
    backEdges,
    authoredSolution: holes.map((hole) => hole.id),
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: false
  };
}

/**
 * A hub with `spokes` out-and-back petals — the shape that actually explodes.
 *
 * From the hub every unused petal is a legal choice, so the reachable state
 * space is on the order of 2^spokes and the solution count is `spokes!`. This
 * is the generalisation of Butterfly Turn, and it is the fixture that proves
 * memoised counting beats path enumeration: at 10 spokes there are 3,628,800
 * solution paths but only a few thousand states.
 *
 * Layout: front `s-hub`, front `p_i-hub`, back `hub-p_i`.
 * Start on the front at `h0` (the stem), so the first stitch reaches the hub
 * on the back, where the petals open up.
 */
export function syntheticHub(spokes: number): Level {
  const holes = [
    { id: "h0", x: 50, y: 95 },
    { id: "hub", x: 50, y: 50 },
    ...Array.from({ length: spokes }, (_, index) => ({
      id: `p${index}`,
      x: 50 + 44 * Math.cos((2 * Math.PI * index) / spokes),
      y: 45 + 42 * Math.sin((2 * Math.PI * index) / spokes)
    }))
  ];
  const frontEdges = [
    { from: "h0", to: "hub" },
    ...Array.from({ length: spokes }, (_, index) => ({ from: `p${index}`, to: "hub" }))
  ];
  const backEdges = Array.from({ length: spokes }, (_, index) => ({ from: "hub", to: `p${index}` }));

  const authoredSolution = ["h0", "hub"];
  for (let index = 0; index < spokes; index += 1) {
    authoredSolution.push(`p${index}`, "hub");
  }

  // spokes! complete orderings of the petals.
  let factorial = 1;
  for (let index = 2; index <= spokes; index += 1) factorial *= index;

  return {
    ...baseLevel(`synthetic-hub-${spokes}`),
    holes: holes.map((hole) => ({ ...hole, x: Math.max(0, Math.min(100, hole.x)), y: Math.max(0, Math.min(100, hole.y)) })),
    frontEdges,
    backEdges,
    authoredSolution,
    expectedSolutionCount: factorial,
    unique: spokes <= 1,
    allowDeadEnds: false
  };
}

/**
 * A hub with `spokes` returning petals **plus one runner that never returns** —
 * the trap shape, generalised.
 *
 * From the hub, taking the runner before every petal is closed strands the
 * thread at the far end of the run. Every hub state is therefore a dangerous
 * decision, so this fixture stresses the reachability/stranding pass and the
 * dangerous-decision bookkeeping, not just raw state count.
 *
 * Layout: front `h0-hub`, front `p_i-hub`, front `r1-r2`; back `hub-p_i`,
 * back `hub-r1`. Exactly `spokes!` solutions: any petal order, runner last.
 */
export function syntheticRunnerHub(spokes: number): Level {
  const holes = [
    { id: "h0", x: 50, y: 96 },
    { id: "hub", x: 50, y: 52 },
    { id: "r1", x: 8, y: 90 },
    { id: "r2", x: 2, y: 70 },
    ...Array.from({ length: spokes }, (_, index) => ({
      id: `p${index}`,
      x: 50 + 40 * Math.cos((2 * Math.PI * index) / spokes),
      y: 46 + 38 * Math.sin((2 * Math.PI * index) / spokes)
    }))
  ];
  const frontEdges = [
    { from: "h0", to: "hub" },
    ...Array.from({ length: spokes }, (_, index) => ({ from: `p${index}`, to: "hub" })),
    { from: "r1", to: "r2" }
  ];
  const backEdges = [
    ...Array.from({ length: spokes }, (_, index) => ({ from: "hub", to: `p${index}` })),
    { from: "hub", to: "r1" }
  ];

  const authoredSolution = ["h0", "hub"];
  for (let index = 0; index < spokes; index += 1) {
    authoredSolution.push(`p${index}`, "hub");
  }
  authoredSolution.push("r1", "r2");

  let factorial = 1;
  for (let index = 2; index <= spokes; index += 1) factorial *= index;

  return {
    ...baseLevel(`synthetic-runner-hub-${spokes}`),
    holes: holes.map((hole) => ({ ...hole, x: Math.max(0, Math.min(100, hole.x)), y: Math.max(0, Math.min(100, hole.y)) })),
    frontEdges,
    backEdges,
    authoredSolution,
    expectedSolutionCount: factorial,
    unique: spokes <= 1,
    allowDeadEnds: true
  };
}
