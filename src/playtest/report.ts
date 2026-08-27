/**
 * Pure playtest summary engine.
 *
 * Calculates the milestone's playtest metrics from local events only. It never
 * invents data: every number comes from recorded events, and metrics with too
 * few sessions or attempts carry explicit small-sample warnings.
 *
 * Completion and timing metrics are attempt-based. An attempt is one
 * play-through of one level, bounded by level_opened / restart_used on the
 * start and level_completed / level_exited / restart_used on the end (see
 * src/playtest/attempt.ts). Version-one legacy events without attempt ids are
 * reconstructed into inferred attempts and flagged in warnings rather than
 * treated as precise.
 */

import type { PlaytestEvent } from "./events.ts";
import type { Catalog } from "../content/types.ts";

export const MIN_SESSIONS_FOR_CONFIDENCE = 5;
export const MIN_ATTEMPTS_FOR_CONFIDENCE = 5;

export type RateResult = {
  attempts: number;
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
  legacyLevels: string[];
  warnings: string[];
};

type BuiltAttempt = {
  id: string;
  levelId: string;
  legacy: boolean;
  startedAt: number;
  completedAt: number | null;
  exitedAt: number | null;
  firstStitchAt: number | null;
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

function buildAttempts(events: readonly PlaytestEvent[]): {
  attempts: BuiltAttempt[];
  legacyLevels: string[];
} {
  const attempts: BuiltAttempt[] = [];
  const byId = new Map<string, BuiltAttempt>();
  const activeByLevel = new Map<string, BuiltAttempt>();
  const legacyLevels = new Set<string>();

  const ordered = [...events].sort((a, b) => a.seq - b.seq);

  function makeAttempt(levelId: string, attemptId: string | undefined, startedAt: number): BuiltAttempt {
    const legacy = attemptId === undefined;
    if (legacy) legacyLevels.add(levelId);
    const attempt: BuiltAttempt = {
      id: attemptId ?? `legacy:${levelId}:${startedAt}`,
      levelId,
      legacy,
      startedAt,
      completedAt: null,
      exitedAt: null,
      firstStitchAt: null
    };
    attempts.push(attempt);
    if (!legacy) byId.set(attemptId, attempt);
    activeByLevel.set(levelId, attempt);
    return attempt;
  }

  function attemptFor(event: PlaytestEvent): BuiltAttempt {
    const levelId = event.levelId ?? "";
    if (event.attemptId !== undefined && byId.has(event.attemptId)) {
      return byId.get(event.attemptId) as BuiltAttempt;
    }
    if (event.attemptId !== undefined) {
      return makeAttempt(levelId, event.attemptId, event.timestamp);
    }
    const active = activeByLevel.get(levelId);
    if (active) return active;
    return makeAttempt(levelId, undefined, event.timestamp);
  }

  for (const event of ordered) {
    if (event.levelId === undefined) continue;
    const levelId = event.levelId;

    switch (event.name) {
      case "level_opened": {
        // A genuine visit always starts a fresh attempt. For legacy data an
        // open is the boundary; for attempt-tagged data the open carries the
        // attempt id that the rest of the visit uses.
        makeAttempt(levelId, event.attemptId, event.timestamp);
        break;
      }
      case "first_valid_stitch":
      case "valid_stitch": {
        const attempt = attemptFor(event);
        if (attempt.firstStitchAt === null) attempt.firstStitchAt = event.timestamp;
        break;
      }
      case "restart_used": {
        // The restart abandons the current attempt; whatever follows begins a
        // fresh one (a new attempt id for tagged data, a new inferred attempt
        // for legacy data). The abandoned attempt stays in the list.
        attemptFor(event);
        activeByLevel.delete(levelId);
        break;
      }
      case "level_exited": {
        const attempt = attemptFor(event);
        if (attempt.exitedAt === null) attempt.exitedAt = event.timestamp;
        activeByLevel.delete(levelId);
        break;
      }
      case "level_completed": {
        const attempt = attemptFor(event);
        if (attempt.completedAt === null) attempt.completedAt = event.timestamp;
        activeByLevel.delete(levelId);
        break;
      }
      default:
        // invalid_stitch / undo_used / hint_used / preview_used associate with
        // the active attempt; they are counted directly from events elsewhere.
        attemptFor(event);
    }
  }

  return { attempts, legacyLevels: [...legacyLevels] };
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
      legacyLevels: [],
      warnings
    };
  }

  const levelFourIndex = 3;
  const levelFourId = levelIds[levelFourIndex];

  // Direct event counts (independent of attempt reconstruction).
  const validCounts = new Map<string, number>();
  const invalidCounts = new Map<string, number>();
  const undoCounts = new Map<string, number>();
  const hintCounts = new Map<string, number>();
  const previewCounts = new Map<string, number>();
  const restartCounts = new Map<string, number>();

  let sessionsReachingLevelFour = 0;
  for (const [sessionId, sessionEvents] of sessions) {
    if (levelFourId && sessionEvents.some((event) => event.levelId === levelFourId)) {
      sessionsReachingLevelFour += 1;
    }
    for (const event of sessionEvents) {
      if (event.levelId === undefined) continue;
      switch (event.name) {
        case "first_valid_stitch":
        case "valid_stitch":
          validCounts.set(event.levelId, (validCounts.get(event.levelId) ?? 0) + 1);
          break;
        case "invalid_stitch":
          invalidCounts.set(event.levelId, (invalidCounts.get(event.levelId) ?? 0) + 1);
          break;
        case "undo_used":
          undoCounts.set(event.levelId, (undoCounts.get(event.levelId) ?? 0) + 1);
          break;
        case "hint_used":
          hintCounts.set(event.levelId, (hintCounts.get(event.levelId) ?? 0) + 1);
          break;
        case "preview_used":
          previewCounts.set(event.levelId, (previewCounts.get(event.levelId) ?? 0) + 1);
          break;
        case "restart_used":
          restartCounts.set(event.levelId, (restartCounts.get(event.levelId) ?? 0) + 1);
          break;
      }
    }
  }

  const { attempts, legacyLevels } = buildAttempts(events);

  if (legacyLevels.length > 0) {
    warnings.push(
      `Legacy version-one events for level(s) ${legacyLevels.join(", ")} lack attempt identity; their attempt boundaries are inferred and may be approximate.`
    );
  }

  const completionRateByLevel: Record<string, RateResult> = {};
  const medianCompletionTimeMsByLevel: Record<string, number | null> = {};
  const invalidByLevel: Record<string, number | null> = {};
  const exitByLevel: Record<string, number | null> = {};
  const firstStitchTimesByLevel = new Map<string, number[]>();

  for (const levelId of levelIds) {
    const levelAttempts = attempts.filter((a) => a.levelId === levelId);
    const completed = levelAttempts.filter((a) => a.completedAt !== null).length;
    const exited = levelAttempts.filter((a) => a.exitedAt !== null).length;
    completionRateByLevel[levelId] = {
      attempts: levelAttempts.length,
      completed,
      rate: ratio(completed, levelAttempts.length)
    };
    const completionTimes = levelAttempts
      .filter((a) => a.completedAt !== null)
      .map((a) => (a.completedAt as number) - a.startedAt);
    medianCompletionTimeMsByLevel[levelId] = median(completionTimes);

    const firstTimes = levelAttempts
      .filter((a) => a.firstStitchAt !== null)
      .map((a) => (a.firstStitchAt as number) - a.startedAt);
    firstStitchTimesByLevel.set(levelId, firstTimes);

    const valid = validCounts.get(levelId) ?? 0;
    const invalid = invalidCounts.get(levelId) ?? 0;
    invalidByLevel[levelId] = ratio(invalid, valid + invalid);
    exitByLevel[levelId] = ratio(exited, levelAttempts.length);

    if (levelAttempts.length > 0 && levelAttempts.length < MIN_ATTEMPTS_FOR_CONFIDENCE) {
      warnings.push(
        `Level ${levelId} has only ${levelAttempts.length} attempt(s) — its completion and exit metrics are small-sample.`
      );
    }
  }

  const levelOneId = levelIds[0];
  const levelOneAttempts = levelOneId ? completionRateByLevel[levelOneId]?.attempts ?? 0 : 0;
  const levelOneCompleted = levelOneId ? completionRateByLevel[levelOneId]?.completed ?? 0 : 0;

  const allFirstStitchTimes = [...firstStitchTimesByLevel.values()].flat();
  const allInvalid = [...invalidCounts.values()].reduce((a, b) => a + b, 0);
  const allValid = [...validCounts.values()].reduce((a, b) => a + b, 0);
  const totalAttempts = attempts.length;
  const totalExited = attempts.filter((a) => a.exitedAt !== null).length;
  const totalCompletedLevels = attempts.filter((a) => a.completedAt !== null).length;

  const totalUndos = [...undoCounts.values()].reduce((a, b) => a + b, 0);
  const totalHints = [...hintCounts.values()].reduce((a, b) => a + b, 0);
  const totalPreviews = [...previewCounts.values()].reduce((a, b) => a + b, 0);
  const totalRestarts = [...restartCounts.values()].reduce((a, b) => a + b, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalSessions,
    totalEvents: events.length,
    totalCompletedLevels,
    percentReachingLevelFour: levelFourId ? ratio(sessionsReachingLevelFour, totalSessions) : null,
    timeToFirstStitchMs: {
      overall: median(allFirstStitchTimes),
      levelOne: levelOneId ? median(firstStitchTimesByLevel.get(levelOneId) ?? []) : null
    },
    firstLevelCompletionRate: ratio(levelOneCompleted, levelOneAttempts),
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
      overall: ratio(totalExited, totalAttempts),
      byLevel: exitByLevel
    },
    legacyLevels,
    warnings
  };
}

export type ContentUnitReport = {
  id: string;
  title: string;
  totalLevels: number;
  levelsReached: number;
  levelsCompleted: number;
  finished: boolean;
  /** thread_trapped events across every level in this unit. */
  trapEvents: number;
};

export type ContentReport = {
  collections: ContentUnitReport[];
  chapters: ContentUnitReport[];
};

/**
 * Collection- and chapter-scale rollups, derived entirely from the same
 * local events `buildPlaytestReport` already reads plus the content
 * hierarchy — no new events are recorded for this. "Reached" means at least
 * one attempt exists for a level in that unit; "trap frequency" reuses the
 * existing `thread_trapped` event, one per level per stranded state a player
 * actually hits, so it already reflects real play rather than the analyzer's
 * theoretical dead-end count.
 */
export function buildContentReport(events: readonly PlaytestEvent[], catalog: Catalog): ContentReport {
  const attemptedLevels = new Set<string>();
  const completedLevels = new Set<string>();
  const trapCountByLevel = new Map<string, number>();

  for (const event of events) {
    if (event.levelId === undefined) continue;
    if (event.name === "level_opened") attemptedLevels.add(event.levelId);
    if (event.name === "level_completed") completedLevels.add(event.levelId);
    if (event.name === "thread_trapped") {
      trapCountByLevel.set(event.levelId, (trapCountByLevel.get(event.levelId) ?? 0) + 1);
    }
  }

  function summarize(id: string, title: string, levelIds: readonly string[]): ContentUnitReport {
    const levelsReached = levelIds.filter((levelId) => attemptedLevels.has(levelId)).length;
    const levelsCompleted = levelIds.filter((levelId) => completedLevels.has(levelId)).length;
    const trapEvents = levelIds.reduce((sum, levelId) => sum + (trapCountByLevel.get(levelId) ?? 0), 0);
    return {
      id,
      title,
      totalLevels: levelIds.length,
      levelsReached,
      levelsCompleted,
      finished: levelIds.length > 0 && levelsCompleted === levelIds.length,
      trapEvents
    };
  }

  return {
    collections: catalog.collections.map((collection) => summarize(collection.id, collection.title, collection.levelIds)),
    chapters: catalog.collections.flatMap((collection) =>
      collection.chapters.map((chapter) => summarize(chapter.id, chapter.title, chapter.levelIds))
    )
  };
}

/** Human-readable rendering of the report for the Settings export. */
export function formatReadableReport(report: PlaytestReport, levelIds: readonly string[], content?: ContentReport): string {
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
  lines.push("— Completion (per attempt) —");
  lines.push(`  First-level completion rate: ${pct(report.firstLevelCompletionRate)}`);
  lines.push(`  Reaching level 4: ${pct(report.percentReachingLevelFour)}`);
  lines.push("  By level:");
  for (const [index, levelId] of levelIds.entries()) {
    const entry = report.completionRateByLevel[levelId];
    const done = entry ? `${entry.completed}/${entry.attempts}` : "0/0";
    const rate = entry ? pct(entry.rate) : "n/a";
    const time = ms(report.medianCompletionTimeMsByLevel[levelId]);
    lines.push(`    Level ${index + 1} (${levelId}): ${done} attempts (${rate}), median completion ${time}`);
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

  if (content) {
    lines.push("");
    lines.push("— Content progress (collections & chapters) —");
    for (const unit of content.collections) {
      lines.push(
        `  ${unit.title}: reached ${unit.levelsReached}/${unit.totalLevels}, completed ${unit.levelsCompleted}/${unit.totalLevels}${unit.finished ? " (finished)" : ""}, ${unit.trapEvents} trap event(s)`
      );
    }
    lines.push("  By chapter:");
    for (const unit of content.chapters) {
      lines.push(
        `    ${unit.title}: reached ${unit.levelsReached}/${unit.totalLevels}, completed ${unit.levelsCompleted}/${unit.totalLevels}${unit.finished ? " (finished)" : ""}, ${unit.trapEvents} trap event(s)`
      );
    }
  }

  if (report.warnings.length > 0) {
    lines.push("");
    lines.push("— Warnings —");
    for (const warning of report.warnings) lines.push(`  ${warning}`);
  }
  return lines.join("\n");
}
