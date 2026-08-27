/**
 * Moderator observation records.
 *
 * Telemetry cannot know whether a human sitting next to the tester explained
 * the puzzle out loud. Pretending it can is the single easiest way to fake the
 * "80% complete Level 1 without spoken help" gate, so the aided/unaided fact
 * lives here instead: written down by the observer, kept in a separate file,
 * and joined to gameplay only by the anonymous install id.
 *
 * Deliberately *not* in the player's telemetry stream. A facilitator's notes
 * are the researcher's data, not the player's, and mixing them would mean a
 * tester's exported bundle contains someone else's opinion of them.
 *
 * Format: CSV with a header row, or a JSON array of the same fields. CSV
 * because a moderator fills it in on a laptop between sessions and every
 * spreadsheet in the world can write it. Columns:
 *
 *   playtestInstallId    required, matches the bundle's id
 *   spokenHelpGiven      yes | no | unknown
 *   helpStage            free text — where in the test help was given
 *   helpReason           free text — why the observer intervened
 *   level1RuleUnderstood yes | no | partial | unknown
 *   peekUnderstood       yes | no | partial | unknown | not-used
 *   stoppedAtLevel       free text — where the tester chose to stop, if they did
 *   observerNotes        free text
 *
 * Unknown columns are ignored rather than rejected, so a researcher can keep
 * their own extra column without breaking the analyzer.
 */

import { isValidInstallId } from "./install.ts";

export const TRISTATE_VALUES = ["yes", "no", "unknown"] as const;
export type Tristate = (typeof TRISTATE_VALUES)[number];

export const COMPREHENSION_VALUES = ["yes", "no", "partial", "unknown", "not-used"] as const;
export type Comprehension = (typeof COMPREHENSION_VALUES)[number];

export type ObservationRecord = {
  playtestInstallId: string;
  spokenHelpGiven: Tristate;
  helpStage: string;
  helpReason: string;
  level1RuleUnderstood: Comprehension;
  peekUnderstood: Comprehension;
  stoppedAtLevel: string;
  observerNotes: string;
};

export const OBSERVATION_COLUMNS: readonly (keyof ObservationRecord)[] = [
  "playtestInstallId",
  "spokenHelpGiven",
  "helpStage",
  "helpReason",
  "level1RuleUnderstood",
  "peekUnderstood",
  "stoppedAtLevel",
  "observerNotes"
];

/** A blank template a researcher can copy into a spreadsheet. */
export const OBSERVATION_CSV_HEADER = OBSERVATION_COLUMNS.join(",");

export type ObservationParseResult = {
  records: ObservationRecord[];
  errors: string[];
  warnings: string[];
};

function normalizeTristate(value: string | undefined): Tristate {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "yes" || text === "y" || text === "true" || text === "1") return "yes";
  if (text === "no" || text === "n" || text === "false" || text === "0") return "no";
  return "unknown";
}

function normalizeComprehension(value: string | undefined): Comprehension {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "yes" || text === "y" || text === "true" || text === "1") return "yes";
  if (text === "no" || text === "n" || text === "false" || text === "0") return "no";
  if (text === "partial" || text === "partly" || text === "some") return "partial";
  if (text === "not-used" || text === "not used" || text === "n/a" || text === "na") return "not-used";
  return "unknown";
}

function text(value: string | undefined, max = 1000): string {
  return (value ?? "").trim().slice(0, max);
}

/**
 * Minimal RFC-4180 CSV reader: quoted fields, doubled quotes inside them,
 * and embedded newlines. Enough for a spreadsheet export, with no dependency.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (char === "\r") {
      index += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

function fromRow(row: Record<string, string>, where: string, result: ObservationParseResult): void {
  const installId = text(row.playtestinstallid ?? row.playtestInstallId, 64);
  if (!isValidInstallId(installId)) {
    result.errors.push(`${where}: '${installId}' is not a valid playtestInstallId; row skipped.`);
    return;
  }
  if (result.records.some((existing) => existing.playtestInstallId === installId)) {
    result.warnings.push(`${where}: duplicate observation for ${installId}; the first row is kept.`);
    return;
  }
  result.records.push({
    playtestInstallId: installId,
    spokenHelpGiven: normalizeTristate(row.spokenhelpgiven ?? row.spokenHelpGiven),
    helpStage: text(row.helpstage ?? row.helpStage, 200),
    helpReason: text(row.helpreason ?? row.helpReason, 500),
    level1RuleUnderstood: normalizeComprehension(row.level1ruleunderstood ?? row.level1RuleUnderstood),
    peekUnderstood: normalizeComprehension(row.peekunderstood ?? row.peekUnderstood),
    stoppedAtLevel: text(row.stoppedatlevel ?? row.stoppedAtLevel, 100),
    observerNotes: text(row.observernotes ?? row.observerNotes)
  });
}

/** Parses CSV or a JSON array. Never throws; bad rows become errors. */
export function parseObservations(input: string, source = "observations"): ObservationParseResult {
  const result: ObservationParseResult = { records: [], errors: [], warnings: [] };
  const trimmed = input.trim();
  if (trimmed.length === 0) return result;

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      result.errors.push(`${source}: not valid JSON.`);
      return result;
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const [index, entry] of list.entries()) {
      if (typeof entry !== "object" || entry === null) {
        result.errors.push(`${source}[${index}]: not an object; row skipped.`);
        continue;
      }
      const row: Record<string, string> = {};
      for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
        row[key.toLowerCase()] = typeof value === "string" ? value : String(value ?? "");
      }
      fromRow(row, `${source}[${index}]`, result);
    }
    return result;
  }

  const rows = parseCsv(trimmed);
  if (rows.length === 0) return result;
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  if (!header.includes("playtestinstallid")) {
    result.errors.push(`${source}: CSV header must include 'playtestInstallId'. Found: ${rows[0].join(", ")}`);
    return result;
  }
  for (const [index, cells] of rows.slice(1).entries()) {
    const row: Record<string, string> = {};
    for (const [column, name] of header.entries()) row[name] = cells[column] ?? "";
    fromRow(row, `${source} line ${index + 2}`, result);
  }
  return result;
}

export function indexObservations(records: readonly ObservationRecord[]): Map<string, ObservationRecord> {
  return new Map(records.map((record) => [record.playtestInstallId, record] as const));
}
