import assert from "node:assert/strict";
import test from "node:test";

import {
  indexObservations,
  parseCsv,
  parseObservations,
  OBSERVATION_COLUMNS,
  OBSERVATION_CSV_HEADER
} from "./observations.ts";

const ID_A = "pi-00000000-0000-4000-8000-00000000000a";
const ID_B = "pi-00000000-0000-4000-8000-00000000000b";

test("the CSV header is the documented column list", () => {
  assert.equal(
    OBSERVATION_CSV_HEADER,
    "playtestInstallId,spokenHelpGiven,helpStage,helpReason,level1RuleUnderstood,peekUnderstood,stoppedAtLevel,observerNotes"
  );
  assert.equal(OBSERVATION_COLUMNS[0], "playtestInstallId");
});

test("CSV parsing handles quotes, doubled quotes, and embedded newlines", () => {
  const rows = parseCsv('a,b,c\n"one, two","he said ""hi""","line1\nline2"\n');
  assert.deepEqual(rows[0], ["a", "b", "c"]);
  assert.deepEqual(rows[1], ["one, two", 'he said "hi"', "line1\nline2"]);
});

test("a well-formed observation CSV parses into records", () => {
  const csv = [
    OBSERVATION_CSV_HEADER,
    `${ID_A},no,,,yes,partial,,"read the labels aloud, then tapped"`,
    `${ID_B},yes,"level 1, 90s","tester asked what to do",no,not-used,level 2,gave up`
  ].join("\n");
  const result = parseObservations(csv, "observers.csv");
  assert.deepEqual(result.errors, []);
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].spokenHelpGiven, "no");
  assert.equal(result.records[0].level1RuleUnderstood, "yes");
  assert.equal(result.records[0].peekUnderstood, "partial");
  assert.equal(result.records[1].spokenHelpGiven, "yes");
  assert.equal(result.records[1].helpStage, "level 1, 90s");
  assert.equal(result.records[1].peekUnderstood, "not-used");
  assert.equal(result.records[1].stoppedAtLevel, "level 2");
});

test("boolean-ish spellings a spreadsheet produces are all accepted", () => {
  const csv = [
    "playtestInstallId,spokenHelpGiven",
    `${ID_A},TRUE`,
    `${ID_B},0`
  ].join("\n");
  const result = parseObservations(csv);
  assert.equal(result.records[0].spokenHelpGiven, "yes");
  assert.equal(result.records[1].spokenHelpGiven, "no");
});

test("an unrecognised help value becomes 'unknown' rather than a silent 'no'", () => {
  const csv = ["playtestInstallId,spokenHelpGiven", `${ID_A},maybe a bit`].join("\n");
  const result = parseObservations(csv);
  assert.equal(result.records[0].spokenHelpGiven, "unknown");
});

test("JSON observations are accepted with the same field names", () => {
  const json = JSON.stringify([
    { playtestInstallId: ID_A, spokenHelpGiven: "no", observerNotes: "silent throughout" }
  ]);
  const result = parseObservations(json, "observers.json");
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].observerNotes, "silent throughout");
});

test("a bad install id is rejected by row, not by file", () => {
  const csv = [
    "playtestInstallId,spokenHelpGiven",
    "not-an-id,no",
    `${ID_A},no`
  ].join("\n");
  const result = parseObservations(csv, "observers.csv");
  assert.equal(result.records.length, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /line 2/);
});

test("duplicate observation rows keep the first and say so", () => {
  const csv = ["playtestInstallId,spokenHelpGiven", `${ID_A},no`, `${ID_A},yes`].join("\n");
  const result = parseObservations(csv);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].spokenHelpGiven, "no");
  assert.match(result.warnings[0], /duplicate observation/);
});

test("a missing id column fails the file with a readable message", () => {
  const result = parseObservations("who,helped\nsomeone,no", "observers.csv");
  assert.equal(result.records.length, 0);
  assert.match(result.errors[0], /must include 'playtestInstallId'/);
});

test("empty and malformed input never throws", () => {
  assert.deepEqual(parseObservations("").records, []);
  assert.deepEqual(parseObservations("   ").records, []);
  const broken = parseObservations("[{ not json", "observers.json");
  assert.equal(broken.records.length, 0);
  assert.match(broken.errors[0], /not valid JSON/);
});

test("unknown extra columns are ignored, not rejected", () => {
  const csv = [
    "playtestInstallId,spokenHelpGiven,researcherInitials",
    `${ID_A},no,JP`
  ].join("\n");
  const result = parseObservations(csv);
  assert.deepEqual(result.errors, []);
  assert.equal(result.records.length, 1);
});

test("records index by install id for joining onto bundles", () => {
  const csv = ["playtestInstallId,spokenHelpGiven", `${ID_A},no`, `${ID_B},yes`].join("\n");
  const index = indexObservations(parseObservations(csv).records);
  assert.equal(index.get(ID_A)?.spokenHelpGiven, "no");
  assert.equal(index.get(ID_B)?.spokenHelpGiven, "yes");
  assert.equal(index.get("pi-missing"), undefined);
});
