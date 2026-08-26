/**
 * Measure every production level once and print its objective metrics, its
 * transparent difficulty score, and its chapter pacing findings.
 *
 * This is the authoring workflow tool: run it after editing a hoop, before
 * committing. It walks the catalog in play order and calls `measureLevel`
 * exactly once per level (the previous version analysed each level three
 * times per report).
 *
 *   npm run analyze:levels
 *   npm run analyze:levels -- --json
 */
import { measureLevel } from "../src/game/analyzer.ts";
import { catalog } from "../src/content/catalog.ts";
import { validateCatalogPacing } from "../src/content/pacing.ts";
import { guidanceFor } from "../src/game/engine.ts";

const asJson = process.argv.includes("--json");

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

// One measurement per level, reused by every view below.
const rows = [];
let number = 0;
for (const collection of catalog.collections) {
  for (const chapter of collection.chapters) {
    for (const entry of chapter.entries) {
      number += 1;
      const { metrics, score } = measureLevel(entry.level);
      rows.push({ number, collection, chapter, entry, level: entry.level, metrics, score });
    }
  }
}

const pacing = validateCatalogPacing();

if (asJson) {
  console.log(
    JSON.stringify(
      {
        levels: rows.map((row) => ({
          number: row.number,
          collectionId: row.collection.id,
          chapterId: row.chapter.id,
          levelId: row.level.id,
          title: row.level.title,
          role: row.entry.role,
          teaches: row.entry.teaches,
          guidance: guidanceFor(row.level),
          metrics: row.metrics,
          score: row.score
        })),
        pacing
      },
      null,
      2
    )
  );
  process.exit(pacing.ok ? 0 : 1);
}

const HEADER = [
  pad("#", 3),
  pad("Level", 16),
  pad("Role", 9),
  pad("St", 3),
  pad("Soln", 5),
  pad("Exact", 6),
  pad("Dec", 4),
  pad("sDec", 5),
  pad("Forced", 7),
  pad("MaxBr", 6),
  pad("AvgBr", 6),
  pad("Dead", 5),
  pad("Doom", 5),
  pad("Danger", 7),
  pad("Unsafe", 7),
  pad("SafeAlt", 8),
  pad("Conseq", 7),
  pad("Hub", 4),
  pad("States", 7),
  pad("Score", 6),
  "Tier"
].join(" ");

let currentChapterId = null;
for (const row of rows) {
  if (row.chapter.id !== currentChapterId) {
    currentChapterId = row.chapter.id;
    console.log(`\n${row.collection.title} — ${row.chapter.title}  (${row.chapter.role}, capstone: ${row.chapter.capstoneLevelId})`);
    console.log(HEADER);
  }
  console.log(
    [
      pad(row.number, 3),
      pad(row.level.title, 16),
      pad(row.entry.role, 9),
      pad(row.metrics.totalStitches, 3),
      pad(row.metrics.solutionCount, 5),
      pad(row.metrics.solutionCountExact ? "yes" : "NO", 6),
      pad(row.metrics.decisionStates, 4),
      pad(row.metrics.solutionDecisionStates, 5),
      pad(percent(row.metrics.forcedMovePercent), 7),
      pad(row.metrics.maxBranching, 6),
      pad(row.metrics.avgBranching.toFixed(2), 6),
      pad(row.metrics.distinctDeadEnds, 5),
      pad(row.metrics.doomedStates, 5),
      pad(row.metrics.dangerousDecisions, 7),
      pad(row.metrics.unsafeChoiceCount, 7),
      pad(row.metrics.safeAlternativeCount, 8),
      pad(row.metrics.maxConsequenceDepth, 7),
      pad(row.metrics.hubCount, 4),
      pad(row.metrics.reachableStates, 7),
      pad(row.score.total, 6),
      row.score.tier
    ].join(" ")
  );
}

console.log("\nScore breakdown");
for (const row of rows) {
  console.log(
    `  ${pad(row.number, 3)} ${pad(row.level.title, 16)} planning=${pad(row.score.planning, 5)} risk=${pad(row.score.risk, 5)} ` +
      `length=${pad(row.score.length, 4)} total=${pad(row.score.total, 4)} (${pad(row.score.tier, 8)}) ` +
      `guidance=${pad(guidanceFor(row.level), 8)} teaches=${row.entry.teaches.join(",")}`
  );
}

console.log("\nChapter pacing");
if (pacing.findings.length === 0) {
  console.log("  No invariant violations. No design warnings.");
} else {
  for (const finding of pacing.findings) {
    const label = finding.severity === "invariant" ? "INVARIANT" : "warning  ";
    console.log(`  ${label} [${finding.code}] ${finding.chapterId}${finding.levelId ? `/${finding.levelId}` : ""}: ${finding.message}`);
  }
}
console.log(
  `\n  ${pacing.invariants.length} invariant violation(s), ${pacing.warnings.length} design warning(s).` +
    " Invariants fail the build; warnings are for a human to judge."
);

process.exit(pacing.ok ? 0 : 1);
