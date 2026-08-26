/**
 * Authoring-tool performance benchmark.
 *
 * Answers one question honestly: at what puzzle density do the authoring tools
 * stop being usable? It measures the whole production catalog, then a series of
 * synthetic fixtures whose branching grows on a dial, and reports state counts,
 * runtime, and — critically — whether each figure is exact or capped.
 *
 * It also runs the old path-enumerating counter side by side with the new
 * state-memoised counter so the improvement is measured, not asserted.
 *
 *   npm run bench:analyzer
 *   npm run bench:analyzer -- --max-spokes 11
 */
import { analyzeLevel } from "../src/game/analyzer.ts";
import { catalog } from "../src/content/catalog.ts";
import { analyzeStranding, countSolutions, solveLevel } from "../src/game/solver.ts";
import { syntheticChain, syntheticHub, syntheticRunnerHub } from "../src/game/synthetic.ts";

const maxSpokesArg = process.argv.indexOf("--max-spokes");
const MAX_SPOKES = maxSpokesArg > -1 ? Number(process.argv[maxSpokesArg + 1]) : 9;
/** Above this many enumerated paths the old approach is not worth timing. */
const ENUMERATION_CEILING = 2_000_000;

function time(label, work) {
  const started = process.hrtime.bigint();
  const result = work();
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  return { label, ms, result };
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

console.log("FlipStitch analyzer benchmark");
console.log(`node ${process.version}  ·  ${new Date().toISOString()}`);

console.log("\n== Production catalog (whole-catalog analysis) ==");
const catalogRun = time("catalog", () => catalog.levels.map((level) => analyzeLevel(level)));
let totalStates = 0;
console.log([pad("Level", 18), pad("Stitches", 9), pad("States", 8), pad("Solutions", 10), pad("Exact", 6), "ms"].join(" "));
for (const [index, level] of catalog.levels.entries()) {
  const single = time(level.id, () => analyzeLevel(level));
  totalStates += single.result.reachableStates;
  console.log(
    [
      pad(`${index + 1}. ${level.title}`, 18),
      pad(single.result.totalStitches, 9),
      pad(single.result.reachableStates, 8),
      pad(single.result.solutionCount, 10),
      pad(single.result.solutionCountExact ? "yes" : "NO", 6),
      single.ms.toFixed(2)
    ].join(" ")
  );
}
console.log(`  total: ${catalog.levels.length} levels, ${totalStates} reachable states, ${catalogRun.ms.toFixed(1)} ms`);

console.log("\n== Synthetic scale: forced chain (linear state growth) ==");
console.log([pad("Stitches", 9), pad("States", 9), pad("Solutions", 10), "analyze ms"].join(" "));
for (const stitches of [10, 20, 40, 80, 160]) {
  const level = syntheticChain(stitches);
  const run = time("chain", () => analyzeLevel(level));
  console.log([pad(stitches, 9), pad(run.result.reachableStates, 9), pad(run.result.solutionCount, 10), run.ms.toFixed(2)].join(" "));
}

console.log("\n== Synthetic scale: hub with N petals (exponential states, N! solutions) ==");
console.log(
  [
    pad("Spokes", 7),
    pad("Stitches", 9),
    pad("States", 9),
    pad("Solutions", 11),
    pad("Exact", 6),
    pad("count ms", 9),
    pad("enumerate ms", 13),
    "speedup"
  ].join(" ")
);
for (let spokes = 3; spokes <= MAX_SPOKES; spokes += 1) {
  const level = syntheticHub(spokes);
  const analysis = time("hub-analyze", () => analyzeLevel(level));
  const counted = time("hub-count", () => countSolutions(level));
  const expected = analysis.result.solutionCount;
  let enumerateMs = null;
  if (expected <= ENUMERATION_CEILING) {
    enumerateMs = time("hub-enumerate", () => solveLevel(level)).ms;
  }
  console.log(
    [
      pad(spokes, 7),
      pad(analysis.result.totalStitches, 9),
      pad(analysis.result.reachableStates, 9),
      pad(counted.result.count, 11),
      pad(counted.result.exact ? "yes" : "NO", 6),
      pad(counted.ms.toFixed(2), 9),
      pad(enumerateMs === null ? "skipped" : enumerateMs.toFixed(2), 13),
      enumerateMs === null ? "n/a" : `${(enumerateMs / Math.max(counted.ms, 0.001)).toFixed(1)}x`
    ].join(" ")
  );
}

console.log("\n== Synthetic scale: hub + runner (dangerous decisions and stranding) ==");
console.log(
  [pad("Spokes", 7), pad("States", 9), pad("Dead ends", 10), pad("Danger", 8), pad("SafeAlt", 8), pad("analyze ms", 11), "strand ms"].join(" ")
);
for (let spokes = 3; spokes <= Math.min(MAX_SPOKES, 8); spokes += 1) {
  const level = syntheticRunnerHub(spokes);
  const analysis = time("runner-analyze", () => analyzeLevel(level));
  const strand = time("runner-strand", () => analyzeStranding(level));
  console.log(
    [
      pad(spokes, 7),
      pad(analysis.result.reachableStates, 9),
      pad(analysis.result.distinctDeadEnds, 10),
      pad(analysis.result.dangerousDecisions, 8),
      pad(analysis.result.safeAlternativeCount, 8),
      pad(analysis.ms.toFixed(2), 11),
      strand.ms.toFixed(2)
    ].join(" ")
  );
}

console.log("\nEvery figure above is exact unless its Exact column says NO.");
