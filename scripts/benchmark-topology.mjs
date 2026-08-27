/**
 * Topology canonicalization performance benchmark.
 *
 * `src/content/topology.ts`'s duplicate detector is an exhaustive
 * individualization-refinement search bounded by a leaf budget
 * (`DEFAULT_MAX_LEAVES`). This script answers, honestly, how close real and
 * synthetic FlipStitch-shaped graphs come to that budget, so a future
 * larger collection can't silently make CI's topology check go INEXACT
 * without anyone noticing beforehand.
 *
 *   npm run bench:topology
 */
import { canonicalKey } from "../src/content/topology.ts";
import { catalog } from "../src/content/catalog.ts";
import { syntheticChain, syntheticHub, syntheticRunnerHub } from "../src/game/synthetic.ts";

function time(work) {
  const started = process.hrtime.bigint();
  const result = work();
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { result, ms };
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

const HEADER = [pad("Fixture", 28), pad("Nodes", 6), pad("Edges", 6), pad("Leaves", 8), pad("ms", 8), "Exhaustive"].join(" ");

function report(label, level) {
  const nodes = level.holes.length;
  const edges = level.frontEdges.length + level.backEdges.length;
  const { result, ms } = time(() => canonicalKey(level));
  console.log(
    [
      pad(label, 28),
      pad(nodes, 6),
      pad(edges, 6),
      pad(result.exploredLeaves, 8),
      pad(ms.toFixed(2), 8),
      result.exhaustedBudget ? "NO — INEXACT" : "yes"
    ].join(" ")
  );
  return { label, nodes, edges, ...result, ms };
}

console.log("FlipStitch topology canonicalization benchmark");
console.log(`node ${process.version}  ·  ${new Date().toISOString()}`);
console.log();
console.log(HEADER);

const rows = [];

// Forced chains: no symmetry, refinement should discretize in ~1 leaf.
for (const stitches of [8, 20, 40]) {
  rows.push(report(`chain (${stitches} stitches)`, syntheticChain(stitches)));
}

// Symmetric hubs: `spokes` petals are interchangeable until the start hole
// breaks symmetry — the shape most likely to need many individualization
// branches, since automorphism-heavy graphs are exactly what stresses this
// search family.
for (const spokes of [4, 8, 12]) {
  rows.push(report(`symmetric hub (${spokes} petals)`, syntheticHub(spokes)));
}

// Repeated petals with an extra asymmetric runner arm.
for (const spokes of [4, 8]) {
  rows.push(report(`hub + runner (${spokes} petals)`, syntheticRunnerHub(spokes)));
}

// Real production content: the largest shipped levels, dense-but-plausible.
const byNodeCount = [...catalog.levels].sort((a, b) => b.holes.length - a.holes.length).slice(0, 3);
for (const level of byNodeCount) {
  rows.push(report(`catalog: ${level.title}`, level));
}

// A deliberately worst-case highly symmetric graph sized to approach the
// budget: a wide hub is the closest analog to nauty's classic worst case
// (a graph whose automorphism group is a full symmetric group) available
// from our fixture generators.
rows.push(report("worst-case symmetric hub (16 petals)", syntheticHub(16)));

console.log();
const worst = rows.reduce((max, row) => (row.exploredLeaves > max.exploredLeaves ? row : max), rows[0]);
console.log(`Highest leaf count observed: ${worst.label} — ${worst.exploredLeaves} leaves, ${worst.ms.toFixed(2)} ms.`);
const inexact = rows.filter((row) => row.exhaustedBudget);
console.log(
  inexact.length === 0
    ? "All fixtures canonicalized exhaustively within the default budget."
    : `${inexact.length} fixture(s) exhausted the budget: ${inexact.map((row) => row.label).join(", ")}.`
);
console.log("\nThis is informational only — it does not gate CI. If a future collection's");
console.log("levels approach the worst-case row above, raise this with a real budget/algorithm");
console.log("review rather than silently bumping DEFAULT_MAX_LEAVES.");
