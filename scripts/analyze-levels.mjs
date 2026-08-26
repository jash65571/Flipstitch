/**
 * Analyze every level in the collection and print its objective measures and
 * transparent difficulty score. Used to produce docs/DIFFICULTY-MATRIX.md
 * values and to sanity-check level edits during authoring.
 *
 * Usage: node scripts/analyze-levels.mjs
 */
import { analyzeLevel, difficultyScore } from "../src/game/analyzer.ts";
import { levels } from "../src/game/levels.ts";

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

console.log(
  [
    "#".padEnd(2),
    pad("Level", 18),
    pad("Stitch", 7),
    pad("Soln", 5),
    pad("Decis", 6),
    pad("solnDec", 8),
    pad("Forced", 7),
    pad("MaxBr", 6),
    pad("AvgBr", 6),
    pad("DeadEnd", 8),
    pad("Doomed", 7),
    pad("Danger", 7),
    pad("Unsafe", 7),
    pad("SafeAlt", 7),
    pad("Conseq", 7),
    pad("Hub", 4),
    pad("Score", 5),
    "Tier"
  ].join(" ")
);

for (const [index, level] of levels.entries()) {
  const { metrics, score } = {
    metrics: analyzeLevel(level),
    score: difficultyScore(level, analyzeLevel(level))
  };
  console.log(
    [
      String(index + 1).padEnd(2),
      pad(level.title, 18),
      pad(metrics.totalStitches, 7),
      pad(metrics.solutionCount, 5),
      pad(metrics.decisionStates, 6),
      pad(metrics.solutionDecisionStates, 8),
      pad(percent(metrics.forcedMovePercent), 7),
      pad(metrics.maxBranching, 6),
      pad(metrics.avgBranching.toFixed(2), 6),
      pad(metrics.distinctDeadEnds, 8),
      pad(metrics.doomedStates, 7),
      pad(metrics.dangerousDecisions, 7),
      pad(metrics.unsafeMoveCount, 7),
      pad(metrics.safeAlternativeCount, 7),
      pad(metrics.maxConsequenceDepth, 7),
      pad(metrics.hubCount, 4),
      pad(score.total, 5),
      score.tier
    ].join(" ")
  );
}

console.log("\nDetails:");
for (const [index, level] of levels.entries()) {
  const { metrics, score } = {
    metrics: analyzeLevel(level),
    score: difficultyScore(level, analyzeLevel(level))
  };
  console.log(
    `  ${index + 1}. ${level.title}: planning=${score.planning} risk=${score.risk} length=${score.length} ` +
      `total=${score.total} (${score.tier}) | states=${metrics.reachableStates} ` +
      `front/back edges=${metrics.frontEdges}/${metrics.backEdges} shared holes=${metrics.sharedHoles} ` +
      `hubs=${metrics.hubCount} earliest doom=${metrics.earliestDoomDepth ?? "none"} ` +
      `front decision share=${percent(metrics.frontDecisionShare)}`
  );
}
