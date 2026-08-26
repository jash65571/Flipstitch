/**
 * Pure playtest summary engine.
 *
 * Calculates the milestone's playtest metrics from local events only. It never
 * invents data: every number comes from recorded events, and metrics with too
 * few sessions carry an explicit small-sample warning.
 */

import type { PlaytestEvent } from "./events.ts";

export const MIN_SESSIONS_FOR_CONFIDENCE = 5;
export const MIN_LEVEL_OPENS_FOR_CONFIDENCE = 5;

export type RateResult = {
  opened: number;
  completed: number;
  rate: number | null;
};

export type PlaytestReport = {
  generatedAt: string;
  totalSessions: number;
  totalEvents: number;
  totalCompletedLevels: number;
  percentReachingLevelFour: number | null;
  timeToFirstStitchMs: { overall: number | null; levelOne: number | null };
  firstLevelCompletionRate: number | null;
  completionRateByLevel: Record<string, RateResult>;
  medianCompletionTimeMsByLevel: Record<string, number | null>;
  invalidMoveRate: { overall: number | null; byLevel: Record<string, number | null> };
  undoUsage: { total: number; perSession: number | null };
  hintUsage: { total: number; perSession: number | null };
  previewUsage: { total: number; perSession: number | null };
  restartUsage: { total: number; perSession: number | null };
  exitBeforeCompletionRate: { overall: number | null; byLevel: Record<string, number | null> };
  warnings: string[];
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function ratio(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

function groupBySession(events: readonly PlaytestEvent[]): Map<string, PlaytestEvent[]> {
  const sessions = new Map<string, PlaytestEvent[]>();
  for (const event of events) {
    const list = sessions.get(event.sessionId) ?? [];
    list.push(event);
    sessions.set(event.sessionId, list);
  }
  return sessions;
}

export function buildPlaytestReport(events: readonly PlaytestEvent[], levelIds: readonly string[]): PlaytestReport {
  const warnings: string[] = [];
  const sessions = groupBySession(events);
  const totalSessions = sessions.size;

  if (totalSessions < MIN_SESSIONS_FOR_CONFIDENCE) {
    warnings.push(
      `Fewer than ${MIN_SESSIONS_FOR_CONFIDENCE} sessions recorded — treat every metric as a pilot signal, not a conclusion.`
    );
  }
  if (events.length === 0) {
    warnings.push("No playtest events recorded yet. Play a few levels, then come back.");
    return {
      generatedAt: new Date().toISOString(),
      totalSessions: 0,
      totalEvents: 0,
      totalCompletedLevels: 0,
      percentReachingLevelFour: null,
      timeToFirstStitchMs: { overall: null, levelOne: null },
      firstLevelCompletionRate: null,
      completionRateByLevel: {},
      medianCompletionTimeMsByLevel: {},
      invalidMoveRate: { overall: null, byLevel: {} },
      undoUsage: { total: 0, perSession: null },
      hintUsage: { total: 0, perSession: null },
      previewUsage: { total: 0, perSession: null },
      restartUsage: { total: 0, perSession: null },
      exitBeforeCompletionRate: { overall: null, byLevel: {} },
      warnings
    };
  }

  const levelFourIndex = 3;
  const levelFourId = levelIds[levelFourIndex];

  // Per-level open/completion/stitch bookkeeping across sessions.
  const openedByLevel = new Map<string, number>();
  const completedByLevel = new Map<string, number>();
  const firstStitchTimes = new Map<string, number[]>();
  const completionTimes = new Map<string, number[]>();
  const validCounts = new Map<string, number>();
  const invalidCounts = new Map<string, number>();
  const undoCounts = new Map<string, number>();
  const hintCounts = new Map<string, number>();
  const previewCounts = new Map<string, number>();
  const restartCounts = new Map<string, number>();
  const exitCounts = new Map<string, number>();

  let totalCompletedLevels = 0;
  let sessionsReachingLevelFour = 0;

  for (const [sessionId, sessionEvents] of sessions) {
    const openedTimes = new Map<string, number>();
    const sessionFirstStitch = new Map<string, number>();

    for (const event of sessionEvents) {
      if (event.levelId === undefined) continue;
      const levelId = event.levelId;

      if (event.name === "level_opened") {
        openedByLevel.set(levelId, (openedByLevel.get(levelId) ?? 0) + 1);
        if (!openedTimes.has(levelId)) openedTimes.set(levelId, event.timestamp);
      } else if (event.name === "first_valid_stitch") {
        // A first stitch is also a valid stitch for struggle metrics.
        validCounts.set(levelId, (validCounts.get(levelId) ?? 0) + 1);
        const opened = openedTimes.get(levelId);
        if (opened !== undefined) {
          const list = firstStitchTimes.get(levelId) ?? [];
          list.push(Math.max(0, event.timestamp - opened));
          firstStitchTimes.set(levelId, list);
          sessionFirstStitch.set(levelId, event.timestamp);
        }
      } else if (event.name === "valid_stitch") {
        validCounts.set(levelId, (validCounts.get(levelId) ?? 0) + 1);
        if (!sessionFirstStitch.has(levelId)) {
          const opened = openedTimes.get(levelId);
          if (opened !== undefined) {
            const list = firstStitchTimes.get(levelId) ?? [];
            list.push(Math.max(0, event.timestamp - opened));
            firstStitchTimes.set(levelId, list);
            sessionFirstStitch.set(levelId, event.timestamp);
          }
        }
      } else if (event.name === "invalid_stitch") {
        invalidCounts.set(levelId, (invalidCounts.get(levelId) ?? 0) + 1);
      } else if (event.name === "undo_used") {
        undoCounts.set(levelId, (undoCounts.get(levelId) ?? 0) + 1);
      } else if (event.name === "hint_used") {
        hintCounts.set(levelId, (hintCounts.get(levelId) ?? 0) + 1);
      } else if (event.name === "preview_used") {
        previewCounts.set(levelId, (previewCounts.get(levelId) ?? 0) + 1);
      } else if (event.name === "restart_used") {
        restartCounts.set(levelId, (restartCounts.get(levelId) ?? 0) + 1);
      } else if (event.name === "level_exited" && event.completed === false) {
        exitCounts.set(levelId, (exitCounts.get(levelId) ?? 0) + 1);
      } else if (event.name === "level_completed") {
        completedByLevel.set(levelId, (completedByLevel.get(levelId) ?? 0) + 1);
        totalCompletedLevels += 1;
        const opened = openedTimes.get(levelId);
        if (opened !== undefined) {
          const list = completionTimes.get(levelId) ?? [];
          list.push(Math.max(0, event.timestamp - opened));
          completionTimes.set(levelId, list);
        }
      }
    }

    if (levelFourId) {
      const reached = sessionEvents.some((event) => event.levelId === levelFourId);
      if (reached) sessionsReachingLevelFour += 1;
    }
  }

  const completionRateByLevel: Record<string, RateResult> = {};
  const medianCompletionTimeMsByLevel: Record<string, number | null> = {};
  const invalidByLevel: Record<string, number | null> = {};
  const exitByLevel: Record<string, number | null> = {};

  for (const levelId of levelIds) {
    const opened = openedByLevel.get(levelId) ?? 0;
    const completed = completedByLevel.get(levelId) ?? 0;
    completionRateByLevel[levelId] = { opened, completed, rate: ratio(completed, opened) };
    medianCompletionTimeMsByLevel[levelId] = median(completionTimes.get(levelId) ?? []);
    const valid = validCounts.get(levelId) ?? 0;
    const invalid = invalidCounts.get(levelId) ?? 0;
    invalidByLevel[levelId] = ratio(invalid, valid + invalid);
    exitByLevel[levelId] = ratio(exitCounts.get(levelId) ?? 0, opened);

    if (opened > 0 && opened < MIN_LEVEL_OPENS_FOR_CONFIDENCE) {
      warnings.push(
        `Level ${levelId} has only ${opened} open(s) — its completion and exit metrics are small-sample.`
      );
    }
  }

  const allFirstStitchTimes = [...firstStitchTimes.values()].flat();
  const allInvalid = [...invalidCounts.values()].reduce((a, b) => a + b, 0);
  const allValid = [...validCounts.values()].reduce((a, b) => a + b, 0);
  const allExits = [...exitCounts.values()].reduce((a, b) => a + b, 0);
  const allOpens = [...openedByLevel.values()].reduce((a, b) => a + b, 0);

  const levelOneId = levelIds[0];
  const totalUndos = [...undoCounts.values()].reduce((a, b) => a + b, 0);
  const totalHints = [...hintCounts.values()].reduce((a, b) => a + b, 0);
  const totalPreviews = [...previewCounts.values()].reduce((a, b) => a + b, 0);
  const totalRestarts = [...restartCounts.values()].reduce((a, b) => a + b, 0);

  const firstLevelOpened = levelOneId ? (openedByLevel.get(levelOneId) ?? 0) : 0;
  const firstLevelCompleted = levelOneId ? (completedByLevel.get(levelOneId) ?? 0) : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalSessions,
    totalEvents: events.length,
    totalCompletedLevels,
    percentReachingLevelFour: levelFourId
      ? ratio(sessionsReachingLevelFour, totalSessions)
      : null,
    timeToFirstStitchMs: {
      overall: median(allFirstStitchTimes),
      levelOne: levelOneId ? median(firstStitchTimes.get(levelOneId) ?? []) : null
    },
    firstLevelCompletionRate: ratio(firstLevelCompleted, firstLevelOpened),
    completionRateByLevel,
    medianCompletionTimeMsByLevel,
    invalidMoveRate: {
      overall: ratio(allInvalid, allValid + allInvalid),
      byLevel: invalidByLevel
    },
    undoUsage: { total: totalUndos, perSession: ratio(totalUndos, totalSessions) },
    hintUsage: { total: totalHints, perSession: ratio(totalHints, totalSessions) },
    previewUsage: { total: totalPreviews, perSession: ratio(totalPreviews, totalSessions) },
    restartUsage: { total: totalRestarts, perSession: ratio(totalRestarts, totalSessions) },
    exitBeforeCompletionRate: {
      overall: ratio(allExits, allOpens),
      byLevel: exitByLevel
    },
    warnings
  };
}

/** Human-readable rendering of the report for the Settings export. */
export function formatReadableReport(report: PlaytestReport, levelIds: readonly string[]): string {
  const lines: string[] = [];
  lines.push("FlipStitch local playtest report");
  lines.push(`Generated ${report.generatedAt}`);
  lines.push("");
  lines.push(`Sessions: ${report.totalSessions}`);
  lines.push(`Events: ${report.totalEvents}`);
  lines.push(`Completed levels: ${report.totalCompletedLevels}`);

  const pct = (value: number | null) => (value === null ? "n/a" : `${(value * 100).toFixed(0)}%`);
  const ms = (value: number | null) => (value === null ? "n/a" : `${Math.round(value / 1000)}s`);

  lines.push("");
  lines.push("— Time to first valid stitch (median) —");
  lines.push(`  Level 1: ${ms(report.timeToFirstStitchMs.levelOne)}`);
  lines.push(`  All levels: ${ms(report.timeToFirstStitchMs.overall)}`);

  lines.push("");
  lines.push("— Completion —");
  lines.push(`  First-level completion rate: ${pct(report.firstLevelCompletionRate)}`);
  lines.push(`  Reaching level 4: ${pct(report.percentReachingLevelFour)}`);
  lines.push("  By level:");
  for (const [index, levelId] of levelIds.entries()) {
    const entry = report.completionRateByLevel[levelId];
    const done = entry ? `${entry.completed}/${entry.opened}` : "0/0";
    const rate = entry ? pct(entry.rate) : "n/a";
    const time = ms(report.medianCompletionTimeMsByLevel[levelId]);
    lines.push(`    Level ${index + 1} (${levelId}): ${done} (${rate}), median completion ${time}`);
  }

  lines.push("");
  lines.push("— Struggle signals —");
  lines.push(`  Invalid-move rate (overall): ${pct(report.invalidMoveRate.overall)}`);
  for (const [index, levelId] of levelIds.entries()) {
    const rate = pct(report.invalidMoveRate.byLevel[levelId]);
    lines.push(`    Level ${index + 1}: invalid ${rate}, exit-before-complete ${pct(report.exitBeforeCompletionRate.byLevel[levelId])}`);
  }

  lines.push("");
  lines.push("— Tool usage (totals / per session) —");
  lines.push(`  Undo: ${report.undoUsage.total} / ${report.undoUsage.perSession?.toFixed(2) ?? "n/a"}`);
  lines.push(`  Hint: ${report.hintUsage.total} / ${report.hintUsage.perSession?.toFixed(2) ?? "n/a"}`);
  lines.push(`  Preview: ${report.previewUsage.total} / ${report.previewUsage.perSession?.toFixed(2) ?? "n/a"}`);
  lines.push(`  Restart: ${report.restartUsage.total} / ${report.restartUsage.perSession?.toFixed(2) ?? "n/a"}`);

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("— Warnings —");
    for (const warning of report.warnings) lines.push(`  ${warning}`);
  }
  return lines.join("\n");
}
