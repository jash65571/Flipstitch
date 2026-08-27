#!/usr/bin/env node
/**
 * Local cohort analyzer.
 *
 *   npm run playtest:cohort -- ./playtests/
 *   npm run playtest:cohort -- ./playtests/ --observations ./playtests/observers.csv
 *   npm run playtest:cohort -- ./playtests/ --json report.json
 *
 * Reads exported playtest bundles from a directory (recursively) or from named
 * files, validates each one, deduplicates re-shares, joins optional moderator
 * observations, and prints the four product gates with confidence intervals.
 *
 * There is no server, no database, and no analytics SDK. This is a script that
 * reads JSON files off the researcher's own disk. A corrupt or
 * wrong-version bundle is reported and skipped; it never stops the run.
 *
 * Exit codes: 0 when the analysis completed (even if gates were missed or the
 * sample was too small), 1 only when the run itself could not proceed —
 * unreadable input path, or every file failed to parse.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

import { buildCohortReport } from "../src/playtest/cohort.ts";
import { formatCohortReport, formatFreeTextAnswers } from "../src/playtest/cohort-format.ts";
import { parsePlaytestBundle } from "../src/playtest/bundle.ts";
import { parseObservations } from "../src/playtest/observations.ts";
import { catalog } from "../src/content/catalog.ts";

function parseArgs(argv) {
  const options = { inputs: [], observations: [], json: null, freeText: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--observations" || arg === "-o") {
      const value = argv[index + 1];
      if (!value) throw new Error("--observations needs a file path.");
      options.observations.push(value);
      index += 1;
    } else if (arg === "--json") {
      const value = argv[index + 1];
      if (!value) throw new Error("--json needs an output file path.");
      options.json = value;
      index += 1;
    } else if (arg === "--no-free-text") {
      options.freeText = false;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option '${arg}'.`);
    } else {
      options.inputs.push(arg);
    }
  }
  return options;
}

/** Collects .json files from a directory tree, or a single named file. */
function collectFiles(target) {
  const full = resolve(target);
  let info;
  try {
    info = statSync(full);
  } catch {
    throw new Error(`Cannot read '${target}'.`);
  }
  if (info.isFile()) return [full];
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const child = join(dir, entry);
      const childInfo = statSync(child);
      if (childInfo.isDirectory()) walk(child);
      else if (extname(child).toLowerCase() === ".json") files.push(child);
    }
  };
  walk(full);
  return files.sort();
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`playtest:cohort — ${error.message}`);
    console.error("Usage: npm run playtest:cohort -- <dir-or-file>... [--observations file.csv] [--json out.json]");
    process.exit(1);
  }

  if (options.inputs.length === 0) {
    console.error("playtest:cohort — no input given.");
    console.error("Usage: npm run playtest:cohort -- ./playtests/ [--observations ./playtests/observers.csv]");
    process.exit(1);
  }

  let files = [];
  try {
    for (const input of options.inputs) files.push(...collectFiles(input));
  } catch (error) {
    console.error(`playtest:cohort — ${error.message}`);
    process.exit(1);
  }
  files = [...new Set(files)];

  const bundles = [];
  const rejected = [];
  const parseWarnings = [];

  for (const file of files) {
    const label = basename(file);
    let raw;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      rejected.push({ file: label, code: "unreadable", reason: "File could not be read." });
      continue;
    }
    const result = parsePlaytestBundle(raw);
    if (!result.ok) {
      rejected.push({ file: label, code: result.code, reason: result.reason });
      continue;
    }
    for (const warning of result.warnings) parseWarnings.push(`${label}: ${warning}`);
    bundles.push({ source: label, bundle: result.bundle });
  }

  const observations = [];
  const observationProblems = [];
  for (const path of options.observations) {
    let raw;
    try {
      raw = readFileSync(resolve(path), "utf8");
    } catch {
      observationProblems.push(`${path}: file could not be read.`);
      continue;
    }
    const parsed = parseObservations(raw, basename(path));
    observations.push(...parsed.records);
    observationProblems.push(...parsed.errors, ...parsed.warnings);
  }

  console.log(`Read ${files.length} file(s): ${bundles.length} valid bundle(s), ${rejected.length} rejected.`);
  if (rejected.length > 0) {
    console.log("");
    console.log("REJECTED FILES (skipped, analysis continues)");
    for (const entry of rejected) console.log(`  ${entry.file} [${entry.code}] ${entry.reason}`);
  }
  if (parseWarnings.length > 0) {
    console.log("");
    console.log("BUNDLE WARNINGS");
    for (const warning of parseWarnings) console.log(`  ${warning}`);
  }
  if (observationProblems.length > 0) {
    console.log("");
    console.log("OBSERVATION FILE NOTES");
    for (const problem of observationProblems) console.log(`  ${problem}`);
  }
  console.log("");

  if (files.length > 0 && bundles.length === 0) {
    console.error("playtest:cohort — every input file failed to parse. Nothing to analyse.");
    process.exit(1);
  }

  const report = buildCohortReport({
    bundles,
    observations,
    levelIds: catalog.levelIds
  });

  console.log(formatCohortReport(report));
  if (options.freeText) {
    console.log("");
    console.log(formatFreeTextAnswers(report));
  }

  console.log("");
  console.log("BUNDLE LEDGER");
  for (const entry of report.ledger) {
    const acceptance =
      entry.acceptance.kind === "accepted"
        ? "accepted"
        : entry.acceptance.kind === "duplicate"
          ? `duplicate of ${entry.acceptance.of}`
          : entry.acceptance.kind === "superseded-responses"
            ? `same events as ${entry.acceptance.of}, newer answers taken`
            : `excluded (${entry.acceptance.kind})`;
    console.log(
      `  ${entry.source} · ${entry.playtestInstallId} · ${entry.exportedAt} · ${entry.eventCount} event(s) · ${acceptance}`
    );
  }

  if (options.json) {
    const path = resolve(options.json);
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log("");
    console.log(`Wrote machine-readable report to ${path}`);
  }

  if (report.testersEligible === 0) {
    console.log("");
    console.log("External behavioural sample: not measured yet.");
  }
}

main();
