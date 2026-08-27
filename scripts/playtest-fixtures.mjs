#!/usr/bin/env node
/**
 * Synthetic playtest bundle generator — for rehearsing the analysis pipeline.
 *
 *   npm run playtest:fixtures -- ./tmp/rehearsal
 *
 * It writes a directory of bundles plus an observers.csv beside it, covering
 * the cases the cohort analyzer has to survive: testers who finish, testers
 * who stop at Level 1, a moderated tester who was given spoken help, a web
 * tester, a developer-channel bundle that must be excluded, a duplicate
 * re-share, a corrupt file, and a future bundle version.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS OUTPUT IS NOT EVIDENCE.
 *
 * These bundles are made up. They exist to test that the maths, the
 * deduplication, and the rejection paths work — never to justify a product
 * change. A gate "failing" on this data means nothing about the game. Only
 * real humans playing the real build can move a product gate.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlaytestBundle } from "../src/playtest/bundle.ts";
import { catalog } from "../src/content/catalog.ts";
import { CONTENT_REVISION, contentFingerprint } from "../src/content/version.ts";
import { makeQuestionnaireResponse } from "../src/playtest/questionnaire.ts";
import { OBSERVATION_CSV_HEADER } from "../src/playtest/observations.ts";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: npm run playtest:fixtures -- <output-directory>");
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const L = catalog.levelIds;
const T0 = Date.parse("2026-08-27T09:00:00.000Z");
const fp = contentFingerprint(catalog);

function id(n) { return `pi-00000000-0000-4000-8000-${String(n).padStart(12, "0")}`; }

function play(n, levels, firstStitchMs, opensNext, platform) {
  const events = [];
  let seq = 0, clock = 0;
  const push = (name, levelId, attemptId, at) => {
    seq += 1;
    events.push({ schemaVersion: 1, sessionId: `s-${n}`, seq, timestamp: T0 + at, elapsedMs: at, name,
      ...(levelId ? { levelId } : {}), ...(attemptId ? { attemptId } : {}) });
  };
  push("app_session_started", null, null, 0);
  clock = 1000;
  for (let i = 0; i < levels; i += 1) {
    const lv = L[i], a = `s-${n}:${lv}:a1`;
    push("level_opened", lv, a, clock);
    const gap = i === 0 ? firstStitchMs : 3000;
    push("first_valid_stitch", lv, a, clock + gap);
    if (i === 0) push("invalid_stitch", lv, a, clock + gap + 500);
    push("valid_stitch", lv, a, clock + gap + 2000);
    push("level_completed", lv, a, clock + gap + 25000);
    clock += gap + 26000;
  }
  if (opensNext && L[levels]) {
    const lv = L[levels], a = `s-${n}:${lv}:a1`;
    push("level_opened", lv, a, clock);
    push("peek_used", lv, a, clock + 2000);
    push("level_exited", lv, a, clock + 9000);
  }
  const completed = {};
  for (const e of events) if (e.name === "level_completed") completed[e.levelId] = 9;
  return buildPlaytestBundle({
    bundleId: `b-${n}`, appVersion: "0.1.0", contentRevision: CONTENT_REVISION, contentFingerprint: fp,
    buildId: "3689a8f", buildChannel: "playtest", cohortId: "pilot-a", platform,
    playtestInstallId: id(n), installResetCount: 0, exportedAt: new Date(T0 + 3_600_000 + n * 60_000),
    events, progress: { completed, lastPlayedLevelId: null },
    responses: makeQuestionnaireResponse({
      ruleInOwnWords: n % 3 === 0 ? "you have to swap sides every time you sew" : "not sure, something about two sides",
      peekUnderstood: "",
      wouldPlayAnother: n % 4 === 0 ? "unsure" : "yes"
    }, T0 + 3_600_000)
  });
}

const bundles = [];
// 9 testers who reach level 4, 3 who stop at level 1, 1 web tester.
for (let n = 1; n <= 9; n += 1) bundles.push(play(n, 3, 3000 + n * 400, true, "android"));
for (let n = 10; n <= 12; n += 1) bundles.push(play(n, 1, 12_000, false, "android"));
bundles.push(play(13, 3, 5000, true, "web"));
// a developer-build bundle that must be excluded
const dev = play(14, 4, 1000, false, "android");
bundles.push({ ...dev, buildChannel: "development" });
// a duplicate re-share of tester 1
bundles.push(bundles[0]);

for (const [i, b] of bundles.entries()) {
  writeFileSync(join(dir, `bundle-${String(i + 1).padStart(2, "0")}.json`), JSON.stringify(b, null, 2));
}
writeFileSync(join(dir, "corrupt.json"), "{ this is not json");
writeFileSync(join(dir, "future.json"), JSON.stringify({ ...bundles[0], bundleVersion: 2 }, null, 2));

const rows = [OBSERVATION_CSV_HEADER];
for (let n = 1; n <= 13; n += 1) {
  const helped = n === 11 || n === 12 ? "yes" : "no";
  rows.push(`${id(n)},${helped},${helped === "yes" ? "level 1 after 60s" : ""},${helped === "yes" ? "tester asked what to tap" : ""},${n <= 9 ? "yes" : "partial"},unknown,,`);
}
writeFileSync(join(dir, "..", "observers.csv"), rows.join("\n"));
console.log(`wrote ${bundles.length + 2} files to ${dir}`);
