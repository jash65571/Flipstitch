/**
 * Chapter pacing validation.
 *
 * Prompt 6 locked the first ten levels behind one rule: *every level must
 * score higher than the one before it*. That is the right rule for a single
 * ten-level learning arc and the wrong rule for a game with hundreds of
 * levels — an endlessly rising line hits the 0-100 ceiling almost immediately
 * and leaves no room to teach anything new.
 *
 * So difficulty here is a **pacing system**, not a monotonic line:
 *
 * - The 0-100 measured score (`src/game/analyzer.ts`) describes *the puzzle*.
 * - The `PacingRole` on a chapter entry describes *the position*.
 * - This module checks that the two agree, chapter by chapter.
 *
 * Findings come in two clearly separated kinds, because most pacing questions
 * are matters of design judgement and should not fail a build:
 *
 * - **Invariants** are objective and enforced. They fail `npm test`.
 * - **Warnings** are suspicions worth a human look. They are reported, listed
 *   in the tests, and never fail a build on their own.
 *
 * Documented in docs/PROGRESSION-PACING.md.
 */
import { measureLevel, type DifficultyScore, type LevelMetrics } from "../game/analyzer.ts";
import { guidanceFor } from "../game/engine.ts";
import type { GuidanceLevel, Level } from "../game/types.ts";
import { catalog } from "./catalog.ts";
import type { Catalog, Chapter, ChapterEntry, Collection, ConceptId } from "./types.ts";

/** A level score may not fall more than this within a chapter without an
 *  authored `pacingNote` saying why. Chosen so a normal wave (a breather after
 *  a peak) is allowed, but a collapse must be argued for. */
export const MAX_UNEXPLAINED_DROP = 8;

/** A tutorial chapter must open at or below this measured score. */
export const TUTORIAL_OPENER_MAX = 25;

/** Guidance strength, high to low. Guidance may fade, never strengthen. */
const GUIDANCE_STRENGTH: Record<GuidanceLevel, number> = { full: 3, reduced: 2, minimal: 1 };

export type PacingSeverity = "invariant" | "warning";

export type PacingFinding = {
  severity: PacingSeverity;
  code: string;
  collectionId: string;
  chapterId: string;
  /** The level the finding is about, when it is about one level. */
  levelId: string | null;
  message: string;
};

export type PacingReport = {
  findings: readonly PacingFinding[];
  invariants: readonly PacingFinding[];
  warnings: readonly PacingFinding[];
  ok: boolean;
};

type Measured = {
  entry: ChapterEntry;
  level: Level;
  metrics: LevelMetrics;
  score: DifficultyScore;
  guidance: GuidanceLevel;
};

function measureChapter(chapter: Chapter): Measured[] {
  return chapter.entries.map((entry) => {
    const { metrics, score } = measureLevel(entry.level);
    return { entry, level: entry.level, metrics, score, guidance: guidanceFor(entry.level) };
  });
}

/**
 * Validate one chapter's pacing.
 *
 * `previousChapterTail` is the last measured level of the preceding chapter in
 * the same collection, or null for the first chapter. It is needed for the two
 * rules that cross a chapter boundary: guidance may not strengthen there, and
 * a chapter that claims to reset difficulty must actually open below the
 * previous chapter's peak.
 */
export function validateChapterPacing(
  collection: Collection,
  chapter: Chapter,
  previousChapter: Chapter | null
): PacingFinding[] {
  const findings: PacingFinding[] = [];
  const measured = measureChapter(chapter);
  const previous = previousChapter ? measureChapter(previousChapter) : null;

  const add = (severity: PacingSeverity, code: string, levelId: string | null, message: string) => {
    findings.push({ severity, code, collectionId: collection.id, chapterId: chapter.id, levelId, message });
  };

  // ---- Per-level invariants -------------------------------------------------
  for (const item of measured) {
    if (!item.metrics.exhaustive || !item.metrics.solutionCountExact) {
      add(
        "invariant",
        "MEASUREMENT_NOT_EXACT",
        item.level.id,
        "Pacing cannot be validated from an estimate: the analyzer did not measure this level exhaustively."
      );
    }
    if (item.metrics.solutionDecisionStates < 1 || item.metrics.forcedMovePercent >= 1) {
      add(
        "invariant",
        "AUTOPLAY_LEVEL",
        item.level.id,
        "Every shipped level must offer at least one real decision on a solution path; this one is autoplay."
      );
    }
    if (item.score.tier !== item.level.difficulty) {
      add(
        "invariant",
        "TIER_LABEL_MISMATCH",
        item.level.id,
        `Authored difficulty '${item.level.difficulty}' disagrees with the measured tier '${item.score.tier}' (score ${item.score.total}).`
      );
    }
    if (item.metrics.canTrap !== item.level.allowDeadEnds) {
      add(
        "invariant",
        "TRAP_INTENT_MISMATCH",
        item.level.id,
        `allowDeadEnds is ${item.level.allowDeadEnds} but the level ${item.metrics.canTrap ? "can" : "cannot"} actually strand the thread.`
      );
    }
    if (item.metrics.solutionCount !== item.level.expectedSolutionCount) {
      add(
        "invariant",
        "SOLUTION_COUNT_DRIFT",
        item.level.id,
        `Expected ${item.level.expectedSolutionCount} solution(s); the analyzer measured ${item.metrics.solutionCount}.`
      );
    }
    if (chapter.role === "tutorial" && item.entry.role === "teach" && item.metrics.canTrap) {
      add(
        "invariant",
        "TUTORIAL_TEACH_TRAPS",
        item.level.id,
        "A teaching level in a tutorial chapter must never be able to strand the thread."
      );
    }
  }

  // ---- Chapter opener -------------------------------------------------------
  const opener = measured[0];
  if (chapter.role === "tutorial" && opener.score.total > TUTORIAL_OPENER_MAX) {
    add(
      "invariant",
      "TUTORIAL_OPENER_TOO_HARD",
      opener.level.id,
      `A tutorial chapter must open at or below ${TUTORIAL_OPENER_MAX}; this one opens at ${opener.score.total}.`
    );
  }
  if (previous) {
    const previousPeak = Math.max(...previous.map((item) => item.score.total));
    if (chapter.resetsDifficulty && opener.score.total >= previousPeak) {
      add(
        "invariant",
        "CLAIMED_RESET_DID_NOT_RESET",
        opener.level.id,
        `This chapter declares resetsDifficulty, but it opens at ${opener.score.total}, at or above the previous chapter's peak of ${previousPeak}.`
      );
    }
    if (!chapter.resetsDifficulty && !opener.entry.pacingNote) {
      add(
        "invariant",
        "CONTINUATION_WITHOUT_REASON",
        opener.level.id,
        "A chapter that does not reset difficulty must say why in the opening entry's pacingNote."
      );
    }
    const tail = previous[previous.length - 1];
    if (GUIDANCE_STRENGTH[opener.guidance] > GUIDANCE_STRENGTH[tail.guidance]) {
      add(
        "invariant",
        "GUIDANCE_STRENGTHENED",
        opener.level.id,
        `Guidance rose from '${tail.guidance}' at the end of the previous chapter to '${opener.guidance}' here. Guidance may fade, never strengthen, inside one skill arc.`
      );
    }
  }

  // ---- Sequence invariants --------------------------------------------------
  for (let index = 1; index < measured.length; index += 1) {
    const current = measured[index];
    const prior = measured[index - 1];

    if (GUIDANCE_STRENGTH[current.guidance] > GUIDANCE_STRENGTH[prior.guidance]) {
      add(
        "invariant",
        "GUIDANCE_STRENGTHENED",
        current.level.id,
        `Guidance rose from '${prior.guidance}' to '${current.guidance}'. Guidance may fade, never strengthen, inside one skill arc.`
      );
    }

    const drop = prior.score.total - current.score.total;
    if (drop > MAX_UNEXPLAINED_DROP && !current.entry.pacingNote) {
      add(
        "invariant",
        "UNEXPLAINED_DIFFICULTY_DROP",
        current.level.id,
        `Score falls ${drop} points (${prior.score.total} → ${current.score.total}) with no authored pacingNote. A breather is allowed; an unexplained collapse is not.`
      );
    }
  }

  // ---- Capstone -------------------------------------------------------------
  const capstone = measured.find((item) => item.level.id === chapter.capstoneLevelId);
  if (!capstone) {
    add("invariant", "CAPSTONE_MISSING", chapter.capstoneLevelId, "The declared capstone is not in this chapter.");
  } else {
    const peak = Math.max(...measured.map((item) => item.score.total));
    if (capstone.score.total < peak) {
      add(
        "invariant",
        "CAPSTONE_NOT_HARDEST",
        capstone.level.id,
        `The capstone scores ${capstone.score.total} but the chapter peaks at ${peak}. A capstone must be among the hardest levels in its chapter.`
      );
    }
    if (capstone.entry.role !== "capstone") {
      add(
        "invariant",
        "CAPSTONE_ROLE_MISMATCH",
        capstone.level.id,
        `The declared capstone carries the '${capstone.entry.role}' role.`
      );
    }
  }

  // ---- Design warnings ------------------------------------------------------
  const first = measured[0];
  const last = measured[measured.length - 1];
  if (last.score.total < first.score.total) {
    add(
      "warning",
      "CHAPTER_TRENDS_DOWN",
      null,
      `The chapter ends easier than it starts (${first.score.total} → ${last.score.total}). Chapters should generally trend upward.`
    );
  }

  const totalDangerous = measured.reduce((sum, item) => sum + item.metrics.dangerousDecisions, 0);
  if (chapter.role !== "tutorial" && totalDangerous === 0) {
    add("warning", "NO_DANGER_IN_CHAPTER", null, "No level in this non-tutorial chapter contains a dangerous decision.");
  }

  const secondHalfStart = Math.ceil(measured.length / 2);
  for (let index = secondHalfStart; index < measured.length; index += 1) {
    const item = measured[index];
    if (item.metrics.forcedMovePercent > 0.9 && item.metrics.solutionDecisionStates <= 1 && item.metrics.dangerousDecisions === 0) {
      add(
        "warning",
        "LATE_FORCED_FILLER",
        item.level.id,
        `Late in the chapter, this level is ${Math.round(item.metrics.forcedMovePercent * 100)}% forced with no danger and one decision — it reads as filler.`
      );
    }
  }

  for (let index = 1; index < measured.length; index += 1) {
    const prior = measured[index - 1];
    const current = measured[index];
    if (prior.score.tier === "Expert" && current.score.total < prior.score.total * 0.55 && current.entry.role !== "teach") {
      add(
        "warning",
        "EXPERT_FOLLOWED_BY_FILLER",
        current.level.id,
        `An Expert puzzle (${prior.score.total}) is followed by a much easier one (${current.score.total}) that is not a teaching level.`
      );
    }
  }

  const trapLevels = measured.filter((item) => item.metrics.canTrap);
  if (trapLevels.length >= 3) {
    const signatures = new Set(trapLevels.map((item) => [...item.entry.teaches].sort().join("+")));
    if (signatures.size === 1) {
      add(
        "warning",
        "REPEATED_TRAP_SIGNATURE",
        null,
        "Every trap-capable level in this chapter teaches exactly the same concept set. The danger is repeating itself."
      );
    }
  }

  const decisionTotal = measured.reduce((sum, item) => sum + item.metrics.decisionStates, 0);
  if (decisionTotal > 0) {
    const frontDecisions = measured.reduce(
      (sum, item) => sum + item.metrics.decisionStates * item.metrics.frontDecisionShare,
      0
    );
    const frontShare = frontDecisions / decisionTotal;
    if (frontShare > 0.8 || frontShare < 0.2) {
      add(
        "warning",
        "ONE_SIDED_CHAPTER",
        null,
        `${Math.round(frontShare * 100)}% of this chapter's decisions happen on the front. FlipStitch is a two-sided game; the thinking should live on both sides.`
      );
    }
  }

  return findings;
}

/**
 * Concepts that every hoop exercises by definition, so "was it reused?" is not
 * a meaningful question for them. `forced-flip` is the core rule itself: every
 * legal stitch in FlipStitch forces play onto the opposite side, so a level
 * that did *not* exercise it would not be a FlipStitch level. Tagging it on all
 * levels would be noise; exempting it here keeps the payoff rule sharp for the
 * concepts that really can be taught and then abandoned.
 */
export const UNIVERSAL_CONCEPTS: readonly ConceptId[] = ["forced-flip"];

/** Concepts a `teach` level introduces must be exercised again later. */
function taughtConceptPayoff(collection: Collection): PacingFinding[] {
  const findings: PacingFinding[] = [];
  const flat = collection.chapters.flatMap((chapter) =>
    chapter.entries.map((entry) => ({ chapter, entry }))
  );

  for (const [index, item] of flat.entries()) {
    if (item.entry.role !== "teach") continue;
    const later = flat.slice(index + 1);
    for (const concept of item.entry.teaches) {
      if (UNIVERSAL_CONCEPTS.includes(concept)) continue;
      const reused = later.some((candidate) => candidate.entry.teaches.includes(concept as ConceptId));
      if (!reused) {
        findings.push({
          severity: "warning",
          code: "TAUGHT_CONCEPT_NEVER_REUSED",
          collectionId: collection.id,
          chapterId: item.chapter.id,
          levelId: item.entry.level.id,
          message: `'${concept}' is taught here and never exercised again in this collection. A lesson with no payoff is filler.`
        });
      }
    }
  }
  return findings;
}

/** Validate the pacing of every chapter in the catalog. */
export function validateCatalogPacing(source: Catalog = catalog): PacingReport {
  const findings: PacingFinding[] = [];
  for (const collection of source.collections) {
    for (const [index, chapter] of collection.chapters.entries()) {
      findings.push(...validateChapterPacing(collection, chapter, index > 0 ? collection.chapters[index - 1] : null));
    }
    findings.push(...taughtConceptPayoff(collection));
  }
  const invariants = findings.filter((finding) => finding.severity === "invariant");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  return { findings, invariants, warnings, ok: invariants.length === 0 };
}
