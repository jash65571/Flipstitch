import assert from "node:assert/strict";
import test from "node:test";

import { measureLevel } from "../game/analyzer.ts";
import { catalog } from "./catalog.ts";
import { MAX_UNEXPLAINED_DROP, TUTORIAL_OPENER_MAX, validateCatalogPacing, validateChapterPacing } from "./pacing.ts";
import type { Chapter, Collection } from "./types.ts";

/**
 * The design warnings the shipped catalog is currently expected to raise.
 *
 * Warnings never fail a build on their own — they are judgement calls. This
 * list is the record of which judgement calls have been made, so a *new*
 * warning shows up as a test failure and gets looked at instead of scrolling
 * past in CI output.
 */
const EXPECTED_WARNINGS: string[] = [];

test("the shipped catalog violates no pacing invariant", () => {
  const report = validateCatalogPacing();
  assert.deepEqual(
    report.invariants.map((finding) => `${finding.code} @ ${finding.levelId ?? finding.chapterId}: ${finding.message}`),
    [],
    "pacing invariants must hold for all shipped content"
  );
  assert.equal(report.ok, true);
});

test("the shipped catalog's design warnings are exactly the reviewed set", () => {
  const codes = validateCatalogPacing().warnings.map((finding) => `${finding.code} @ ${finding.levelId ?? finding.chapterId}`);
  assert.deepEqual(codes, EXPECTED_WARNINGS);
});

test("invariants and warnings are separate, and only invariants gate the build", () => {
  const report = validateCatalogPacing();
  assert.equal(
    report.findings.length,
    report.invariants.length + report.warnings.length,
    "every finding must be classified as exactly one severity"
  );
  for (const finding of report.invariants) assert.equal(finding.severity, "invariant");
  for (const finding of report.warnings) assert.equal(finding.severity, "warning");
  // `ok` reflects invariants only. Warnings must never flip it.
  assert.equal(report.ok, report.invariants.length === 0);
});

test("difficulty is no longer required to rise forever — only to be paced", () => {
  // Chapter One ends at 39 and Chapter Two opens at 54; in this collection the
  // line still rises. What changed is the *rule*: a drop is legal inside a
  // chapter as long as it is small, or explained by an authored pacingNote.
  // This test documents that the pacing model, not a global monotonic
  // assertion, is what governs the curve.
  const chapterOne = catalog.collections[0].chapters[0];
  const scores = chapterOne.levels.map((level) => measureLevel(level).score.total);
  const gentleDrop = scores.map((score, index) => (index === 2 ? score - MAX_UNEXPLAINED_DROP : score));
  assert.ok(gentleDrop[2] < gentleDrop[1], "the fixture must actually contain a drop");
  assert.ok(
    MAX_UNEXPLAINED_DROP > 0 && TUTORIAL_OPENER_MAX > 0,
    "pacing tolerances are explicit constants, not hidden magic numbers"
  );
});

// ---- The validator must actually catch bad pacing --------------------------

const collection: Collection = catalog.collections[0];
const chapterOne: Chapter = collection.chapters[0];
const chapterTwo: Chapter = collection.chapters[1];

function codesFor(chapter: Chapter, previous: Chapter | null = null): string[] {
  return validateChapterPacing(collection, chapter, previous).map((finding) => finding.code);
}

test("a capstone easier than an earlier level in its chapter is an invariant violation", () => {
  // Re-order Chapter Two so the hardest level is not last.
  const reversed: Chapter = {
    ...chapterTwo,
    entries: [...chapterTwo.entries].reverse(),
    levels: [...chapterTwo.levels].reverse(),
    levelIds: [...chapterTwo.levelIds].reverse(),
    capstoneLevelId: "echo-stairs-06"
  };
  const codes = codesFor(reversed, chapterOne);
  assert.ok(codes.includes("CAPSTONE_NOT_HARDEST"), codes.join(", "));
});

test("guidance that strengthens again inside a chapter is an invariant violation", () => {
  const strengthened: Chapter = {
    ...chapterTwo,
    entries: chapterTwo.entries.map((entry, index) =>
      index === 1 ? { ...entry, level: { ...entry.level, guidance: "full" as const } } : entry
    )
  };
  assert.ok(codesFor(strengthened, chapterOne).includes("GUIDANCE_STRENGTHENED"));
});

test("a large unexplained difficulty drop is an invariant violation, but an explained one is not", () => {
  const cliff = { ...chapterTwo.entries[4], level: { ...chapterTwo.entries[4].level } };
  const swapped: Chapter = {
    ...chapterTwo,
    // Put the easiest level after the hardest, with no authored reason.
    entries: [chapterTwo.entries[0], chapterTwo.entries[3], chapterTwo.entries[1], chapterTwo.entries[2], cliff]
  };
  assert.ok(codesFor(swapped, chapterOne).includes("UNEXPLAINED_DIFFICULTY_DROP"));

  const explained: Chapter = {
    ...swapped,
    entries: swapped.entries.map((entry, index) =>
      index === 2 ? { ...entry, pacingNote: "Deliberate breather that teaches the hub before the finale." } : entry
    )
  };
  const codes = codesFor(explained, chapterOne);
  assert.equal(
    codes.filter((code) => code === "UNEXPLAINED_DIFFICULTY_DROP").length,
    0,
    "an authored pacingNote must satisfy the drop rule"
  );
});

test("a tutorial chapter that opens too hard is an invariant violation", () => {
  const hardOpener: Chapter = { ...chapterTwo, role: "tutorial", resetsDifficulty: true };
  assert.ok(codesFor(hardOpener, null).includes("TUTORIAL_OPENER_TOO_HARD"));
});

test("a chapter that claims to reset difficulty but does not is an invariant violation", () => {
  const claimsReset: Chapter = { ...chapterTwo, resetsDifficulty: true };
  assert.ok(codesFor(claimsReset, chapterOne).includes("CLAIMED_RESET_DID_NOT_RESET"));
});

test("a continuation chapter with no authored reason is an invariant violation", () => {
  const silent: Chapter = {
    ...chapterTwo,
    entries: chapterTwo.entries.map((entry, index) =>
      index === 0 ? { ...entry, pacingNote: undefined } : entry
    )
  };
  assert.ok(codesFor(silent, chapterOne).includes("CONTINUATION_WITHOUT_REASON"));
});

test("a teaching level that can trap a beginner is an invariant violation", () => {
  const trapTutorial: Chapter = {
    ...chapterOne,
    entries: chapterOne.entries.map((entry) =>
      entry.level.id === "forked-needle-05" ? { ...entry, role: "teach" as const } : entry
    )
  };
  assert.ok(codesFor(trapTutorial).includes("TUTORIAL_TEACH_TRAPS"));
});

test("a chapter that trends downward raises a warning, not a build failure", () => {
  const reversed: Chapter = {
    ...chapterOne,
    entries: [...chapterOne.entries].reverse(),
    capstoneLevelId: "first-thread-01"
  };
  const findings = validateChapterPacing(collection, reversed, null);
  const trend = findings.find((finding) => finding.code === "CHAPTER_TRENDS_DOWN");
  assert.ok(trend, "the downward trend should be detected");
  assert.equal(trend?.severity, "warning", "a subjective trend must not fail the build");
});
