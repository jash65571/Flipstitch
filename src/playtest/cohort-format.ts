/**
 * Human-readable rendering of a cohort report.
 *
 * Layout rule from Goal 15: the four product gates come first, alone, above
 * everything else. Diagnostics, hypotheses, and the bundle ledger come after,
 * so nobody has to hunt for the numbers the milestone exists to produce.
 *
 * Every proportion is printed as "k of n" *and* a percentage *and* its 95%
 * Wilson interval. MeasuringU's guidance is that percentages are valid at any
 * sample size and the honest fix for a small one is the interval, not hiding
 * the number (https://measuringu.com/should-you-report-numbers-with-small-n/).
 */

import type { CohortReport, MedianGate, ProportionGate } from "./cohort.ts";
import { GATE_THRESHOLDS } from "./cohort.ts";
import { ruleOfThreeUpperBound, type GateVerdict, type Interval } from "./stats.ts";

const VERDICT_LABEL: Record<GateVerdict, string> = {
  "insufficient-sample": "INSUFFICIENT SAMPLE — no verdict offered",
  "met-with-evidence": "MET with meaningful evidence",
  promising: "PROMISING — point estimate passes, interval does not yet",
  concerning: "CONCERNING — point estimate misses, interval still straddles",
  "not-met": "NOT MET"
};

function pct(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(0)}%`;
}

function interval(value: Interval | null): string {
  return value === null ? "n/a" : `${pct(value.low)}–${pct(value.high)}`;
}

function seconds(value: number | null): string {
  return value === null ? "n/a" : `${(value / 1000).toFixed(1)}s`;
}

function rule(char = "─", width = 74): string {
  return char.repeat(width);
}

function renderProportionGate(gate: ProportionGate, lines: string[]): void {
  const comparator = gate.direction === "at-least" ? "≥" : "<";
  lines.push(`  ${gate.label}`);
  lines.push(`    Target:   ${comparator} ${pct(gate.threshold)}`);
  lines.push(`    Measured: ${gate.estimate.numerator} of ${gate.estimate.denominator} = ${pct(gate.estimate.rate)}`);
  lines.push(`    95% CI:   ${interval(gate.estimate.wilson)} (Wilson) · ${interval(gate.estimate.adjustedWald)} (adjusted Wald)`);
  if (gate.estimate.numerator === 0 && gate.estimate.denominator > 0) {
    lines.push(`    Note:     0 observed — the true rate could still be up to ${pct(ruleOfThreeUpperBound(gate.estimate.denominator))} (rule of three).`);
  }
  lines.push(`    Verdict:  ${VERDICT_LABEL[gate.verdict]}`);
}

function renderMedianGate(gate: MedianGate, lines: string[]): void {
  const s = gate.summary;
  lines.push(`  ${gate.label}`);
  lines.push(`    Target:   median < ${seconds(gate.thresholdMs)}`);
  lines.push(`    Measured: n = ${s.count}, median ${seconds(s.median)}`);
  lines.push(`    Spread:   min ${seconds(s.min)} · p25 ${seconds(s.p25)} · p75 ${seconds(s.p75)} · max ${seconds(s.max)}`);
  if (s.geometricMean !== null) {
    lines.push(`    Centre:   geometric mean ${seconds(s.geometricMean)} (reported because n < 25; times are skewed)`);
  }
  lines.push(
    `    95% CI:   ${s.medianInterval === null ? "n/a — too few observations to bound a median" : `${seconds(s.medianInterval.low)}–${seconds(s.medianInterval.high)}`}`
  );
  if (gate.withoutMeasurement > 0) {
    lines.push(`    Excluded: ${gate.withoutMeasurement} eligible tester(s) never placed a valid stitch on Level 1.`);
  }
  if (gate.backgroundAdjusted > 0) {
    lines.push(`    Adjusted: ${gate.backgroundAdjusted} measurement(s) had backgrounded time subtracted.`);
  }
  lines.push(`    Verdict:  ${VERDICT_LABEL[gate.verdict]}`);
}

export function formatCohortReport(report: CohortReport): string {
  const lines: string[] = [];
  lines.push(rule("═"));
  lines.push("FlipStitch external playtest cohort report");
  lines.push(`Generated ${report.generatedAt} · methodology v${report.methodologyVersion}`);
  lines.push(rule("═"));
  lines.push("");

  lines.push("PRODUCT GATES (docs/PRODUCT.md)");
  lines.push(rule());
  lines.push("");
  lines.push("1. LEVEL 1 UNAIDED COMPLETION");
  renderProportionGate(report.gates.levelOneUnaided, lines);
  lines.push(
    `    Context:  ${report.gates.levelOneUnaided.helpedTesters} observed tester(s) received spoken help.`
  );
  if (report.gates.levelOneUnaided.unobservedTesters > 0) {
    lines.push(
      `    Context:  ${report.gates.levelOneUnaided.unobservedTesters} eligible tester(s) have no definite observation and cannot contribute to this gate.`
    );
    lines.push(
      `              Their raw Level 1 completion was ${report.gates.levelOneUnaided.unobservedCompletion.numerator} of ${report.gates.levelOneUnaided.unobservedCompletion.denominator} (${pct(report.gates.levelOneUnaided.unobservedCompletion.rate)}) — aid status unknown, NOT gate evidence.`
    );
  }
  lines.push("");

  lines.push("2. TIME TO FIRST VALID STITCH");
  renderMedianGate(report.gates.firstStitch, lines);
  lines.push("");

  lines.push("3. EARLY EXIT DURING THE FIRST THREE LEVELS");
  renderProportionGate(report.gates.earlyExit, lines);
  lines.push("");

  lines.push("4. CHOSE TO START LEVEL 4");
  renderProportionGate(report.gates.levelFourContinuation, lines);
  if (report.gates.levelFourContinuation.anomalousOpens > 0) {
    lines.push(
      `    Context:  ${report.gates.levelFourContinuation.anomalousOpens} Level 4 open(s) preceded the tester's Level 3 completion and were not counted.`
    );
  }
  lines.push("");
  lines.push(rule());
  lines.push("");

  lines.push("COHORT");
  lines.push(`  Bundles read:        ${report.bundlesRead}`);
  lines.push(`  Bundles accepted:    ${report.bundlesAccepted}`);
  lines.push(`  Duplicates dropped:  ${report.duplicateBundles}`);
  lines.push(`  Non-playtest builds: ${report.bundlesExcludedByChannel} (internal QA, excluded by build channel)`);
  lines.push(`  Installs seen:       ${report.testersTotal}`);
  lines.push(`  Eligible testers:    ${report.testersEligible}`);
  lines.push(`  Observations joined: ${report.observationsMatched}`);
  if (report.observationsUnmatched.length > 0) {
    lines.push(`  Observations with no matching bundle: ${report.observationsUnmatched.join(", ")}`);
  }
  lines.push(`  App version(s):      ${report.appVersions.join(", ") || "none"}`);
  lines.push(`  Content revision(s): ${report.contentRevisions.join(", ") || "none"}`);
  lines.push(`  Content fingerprint: ${report.contentFingerprints.join(", ") || "none"}`);
  lines.push(`  Build id(s):         ${report.buildIds.join(", ") || "none"}`);
  if (report.cohortIds.length > 0) lines.push(`  Cohort label(s):     ${report.cohortIds.join(", ")}`);
  const platforms = Object.entries(report.platformCounts)
    .map(([name, count]) => `${name} ${count}`)
    .join(" · ");
  lines.push(`  Platform mix:        ${platforms || "none"}`);
  if (report.testersExcluded.length > 0) {
    lines.push("  Excluded installs:");
    for (const excluded of report.testersExcluded) {
      lines.push(`    ${excluded.installId} — ${excluded.reason}`);
    }
  }
  lines.push("");

  if (report.segments.length > 1) {
    lines.push("PLATFORM SEGMENTS");
    lines.push(rule());
    for (const segment of report.segments.slice(1)) {
      lines.push(`  ${segment.name} (n = ${segment.testers})`);
      lines.push(
        `    Level 1 unaided:  ${segment.gates.levelOneUnaided.estimate.numerator}/${segment.gates.levelOneUnaided.estimate.denominator} ${pct(segment.gates.levelOneUnaided.estimate.rate)} CI ${interval(segment.gates.levelOneUnaided.estimate.wilson)}`
      );
      lines.push(
        `    First stitch:     n ${segment.gates.firstStitch.summary.count}, median ${seconds(segment.gates.firstStitch.summary.median)}`
      );
      lines.push(
        `    Early exit:       ${segment.gates.earlyExit.estimate.numerator}/${segment.gates.earlyExit.estimate.denominator} ${pct(segment.gates.earlyExit.estimate.rate)} CI ${interval(segment.gates.earlyExit.estimate.wilson)}`
      );
      lines.push(
        `    Level 4:          ${segment.gates.levelFourContinuation.estimate.numerator}/${segment.gates.levelFourContinuation.estimate.denominator} ${pct(segment.gates.levelFourContinuation.estimate.rate)} CI ${interval(segment.gates.levelFourContinuation.estimate.wilson)}`
      );
      lines.push("");
    }
  }

  const d = report.diagnostics;
  lines.push("DIAGNOSTICS (eligible testers only)");
  lines.push(rule());
  lines.push(`  Invalid-move rate overall:      ${pct(d.invalidMoveRate)}`);
  lines.push(`  Invalid taps per tester, L1:    ${d.levelOneInvalidPerTester === null ? "n/a" : d.levelOneInvalidPerTester.toFixed(2)}`);
  lines.push(`  Used a hint on Level 1:         ${d.testersUsingHintOnLevelOne} tester(s)`);
  lines.push(`  Used Peek on Level 1:           ${d.testersUsingPeekOnLevelOne} tester(s)`);
  lines.push(`  Used Undo anywhere:             ${d.testersUsingUndo} tester(s)`);
  lines.push(`  Restarted anywhere:             ${d.testersRestarting} tester(s)`);
  lines.push(`  Hit a trapped thread:           ${d.testersHittingTrap} tester(s)`);
  lines.push(`  Invalid tap soon after a Peek:  ${d.invalidShortlyAfterPeek}`);
  lines.push(`  Asked for a hint on Level 2:    ${d.levelTwoHintTesters} tester(s)`);
  lines.push(
    `  Would play another puzzle:      yes ${d.wouldPlayAnother.yes} · no ${d.wouldPlayAnother.no} · not sure ${d.wouldPlayAnother.unsure} · unanswered ${d.wouldPlayAnother.unanswered}`
  );
  lines.push("");
  lines.push("  Completion by level (testers opened → completed):");
  for (const level of d.byLevel) {
    if (level.testersOpened === 0) continue;
    lines.push(
      `    L${String(level.levelNumber).padStart(2, " ")} ${level.levelId.padEnd(18, " ")} ${level.testersCompleted}/${level.testersOpened} (${pct(level.completionRate)}) · invalid ${pct(level.invalidRate)} · hints ${level.hints} · peeks ${level.peeks} · undos ${level.undos} · restarts ${level.restarts} · traps ${level.traps}`
    );
  }
  lines.push("");

  if (report.hypotheses.length > 0) {
    lines.push("HYPOTHESES FOR HUMAN REVIEW (not findings, not causes)");
    lines.push(rule());
    for (const [index, hypothesis] of report.hypotheses.entries()) {
      lines.push(`  ${index + 1}. Signal:     ${hypothesis.signal}`);
      lines.push(`     Hypothesis: ${hypothesis.hypothesis}`);
      lines.push(`     Check:      ${hypothesis.check}`);
      lines.push("");
    }
  }

  if (report.warnings.length > 0) {
    lines.push("WARNINGS");
    lines.push(rule());
    for (const warning of report.warnings) lines.push(`  • ${warning}`);
    lines.push("");
  }

  lines.push("GATE DEFINITIONS (locked — see docs/PLAYTEST-PROTOCOL.md)");
  lines.push(rule());
  for (const gate of [
    report.gates.levelOneUnaided,
    report.gates.earlyExit,
    report.gates.levelFourContinuation
  ] as ProportionGate[]) {
    lines.push(`  ${gate.id}: ${gate.definition}`);
    lines.push("");
  }
  lines.push(`  ${report.gates.firstStitch.id}: ${report.gates.firstStitch.definition}`);
  lines.push("");
  lines.push(
    `  Thresholds: L1 unaided ≥ ${pct(GATE_THRESHOLDS.levelOneUnaidedCompletion)} · first stitch median < ${seconds(GATE_THRESHOLDS.firstStitchMedianMs)} · early exit < ${pct(GATE_THRESHOLDS.earlyExit)} · L4 continuation ≥ ${pct(GATE_THRESHOLDS.levelFourContinuation)}`
  );
  lines.push("");
  lines.push("Free-text comprehension answers are NOT graded automatically. Read them yourself.");

  return lines.join("\n");
}

/** Verbatim free-text answers for human coding (Goal 20). */
export function formatFreeTextAnswers(report: CohortReport): string {
  const lines: string[] = [];
  lines.push("FREE-TEXT ANSWERS — for human coding, ungraded");
  lines.push(rule("═"));
  let printed = 0;
  for (const behaviour of report.behaviours) {
    if (!behaviour.eligible || behaviour.responses === null) continue;
    const answers = behaviour.responses.answers;
    if (Object.keys(answers).length === 0) continue;
    printed += 1;
    lines.push("");
    lines.push(`${behaviour.playtestInstallId} (${behaviour.platform})`);
    if (answers.ruleInOwnWords) lines.push(`  main rule:   ${answers.ruleInOwnWords}`);
    if (answers.peekUnderstanding) lines.push(`  peek:        ${answers.peekUnderstanding}`);
    if (answers.confusionMoment) lines.push(`  confusion:   ${answers.confusionMoment}`);
    if (answers.wouldPlayAnother) lines.push(`  play again:  ${answers.wouldPlayAnother}`);
    if (answers.freeComment) lines.push(`  comment:     ${answers.freeComment}`);
    const observation = behaviour.observation;
    if (observation) {
      lines.push(
        `  observer:    help ${observation.spokenHelpGiven}${observation.helpStage ? ` at ${observation.helpStage}` : ""}${observation.observerNotes ? ` — ${observation.observerNotes}` : ""}`
      );
    }
  }
  if (printed === 0) lines.push("", "  No questionnaire answers in this cohort.");
  return lines.join("\n");
}
