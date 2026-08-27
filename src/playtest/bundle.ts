/**
 * Versioned playtest bundle: the export envelope a tester shares.
 *
 * A raw event array is not enough for external testing. A bundle has to say
 * *who* (an anonymous install id), *what build* (app version, content revision
 * and fingerprint, build id, channel, platform), *what happened* (the existing
 * events, unchanged), and *what the tester said* (post-test answers).
 *
 * Design rules held here:
 *
 * - **Versioned and strict.** `parsePlaytestBundle` accepts version 1, rejects
 *   a higher version with a distinct code instead of guessing at it, and
 *   reports missing or malformed fields by name. It never reinterprets an
 *   incompatible bundle, and it never throws — one tester's corrupt file must
 *   not take a cohort run down (Goal 32).
 * - **Minimal.** Platform is a category (`android` / `ios` / `web`), never a
 *   device model, OS build, screen size, locale, timezone, carrier, or IP. No
 *   value here can be combined into a device fingerprint.
 * - **Reused telemetry.** `events` is exactly the existing local event stream
 *   (src/playtest/events.ts). Nothing is re-recorded for the bundle.
 * - **Deduplicable.** `bundleId` identifies this export; `eventsFingerprint`
 *   identifies its contents, so a re-share of the same data is recognisable
 *   even if the tester exported twice and got two bundle ids (Goal 14).
 *
 * See docs/PLAYTEST-BUNDLE-SPEC.md for the field-by-field specification and
 * docs/PLAYTEST-DATA.md for the data-handling rules.
 */

import { fingerprint, type BuildChannel, type PlatformKind, BUILD_CHANNELS, PLATFORM_KINDS } from "./build.ts";
import { isValidPlaytestEvent, PLAYTEST_SCHEMA_VERSION, type PlaytestEvent } from "./events.ts";
import { isValidInstallId } from "./install.ts";
import { QUESTIONNAIRE_VERSION, normalizeAnswers, type QuestionnaireResponse } from "./questionnaire.ts";

export const PLAYTEST_BUNDLE_VERSION = 1;

/** Progress carried in a bundle: which levels were finished, and in how few stitches. */
export type BundleProgress = {
  /** levelId → best move count. Mirrors src/progress/model.ts. */
  completed: Record<string, number>;
  lastPlayedLevelId: string | null;
};

export type PlaytestBundle = {
  bundleVersion: typeof PLAYTEST_BUNDLE_VERSION;
  /** Random per-export id. Two exports of identical data still differ here. */
  bundleId: string;
  /** Schema version of the `events` array (src/playtest/events.ts). */
  eventSchemaVersion: number;
  appVersion: string;
  contentRevision: string;
  /** Derived digest over level structure; catches unlabelled content edits. */
  contentFingerprint: string;
  buildId: string;
  buildChannel: BuildChannel;
  /** Optional label locking a group of bundles to one build revision. */
  cohortId: string | null;
  platform: PlatformKind;
  playtestInstallId: string;
  /** How many times this device's identity was reset before this export. */
  installResetCount: number;
  exportedAt: string;
  /** Digest over the event stream, used to recognise a duplicate re-share. */
  eventsFingerprint: string;
  events: PlaytestEvent[];
  progress: BundleProgress;
  responses: QuestionnaireResponse | null;
};

export type BundleInput = {
  bundleId: string;
  appVersion: string;
  contentRevision: string;
  contentFingerprint: string;
  buildId: string;
  buildChannel: BuildChannel;
  cohortId: string | null;
  platform: PlatformKind;
  playtestInstallId: string;
  installResetCount: number;
  exportedAt: Date | number;
  events: readonly PlaytestEvent[];
  progress: BundleProgress;
  responses: QuestionnaireResponse | null;
};

/**
 * Content digest over the event stream.
 *
 * Uses only fields that identify an event's identity and place in the stream,
 * so re-serialising the same data always yields the same value.
 */
export function computeEventsFingerprint(events: readonly PlaytestEvent[]): string {
  return fingerprint(
    events.map((event) =>
      [event.sessionId, String(event.seq), event.name, String(event.timestamp), event.levelId ?? ""].join("|")
    )
  );
}

export function buildPlaytestBundle(input: BundleInput): PlaytestBundle {
  const events = [...input.events];
  return {
    bundleVersion: PLAYTEST_BUNDLE_VERSION,
    bundleId: input.bundleId,
    eventSchemaVersion: PLAYTEST_SCHEMA_VERSION,
    appVersion: input.appVersion,
    contentRevision: input.contentRevision,
    contentFingerprint: input.contentFingerprint,
    buildId: input.buildId,
    buildChannel: input.buildChannel,
    cohortId: input.cohortId,
    platform: input.platform,
    playtestInstallId: input.playtestInstallId,
    installResetCount: input.installResetCount,
    exportedAt: new Date(input.exportedAt).toISOString(),
    eventsFingerprint: computeEventsFingerprint(events),
    events,
    progress: input.progress,
    responses: input.responses
  };
}

export const BUNDLE_PARSE_CODES = [
  "not-json",
  "not-object",
  "missing-version",
  "unsupported-future-version",
  "unsupported-past-version",
  "missing-field",
  "invalid-field"
] as const;
export type BundleParseCode = (typeof BUNDLE_PARSE_CODES)[number];

export type BundleParseResult =
  | { ok: true; bundle: PlaytestBundle; warnings: string[] }
  | { ok: false; code: BundleParseCode; reason: string };

function fail(code: BundleParseCode, reason: string): BundleParseResult {
  return { ok: false, code, reason };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readProgress(value: unknown, warnings: string[]): BundleProgress {
  if (typeof value !== "object" || value === null) {
    warnings.push("progress was missing or not an object; treated as empty.");
    return { completed: {}, lastPlayedLevelId: null };
  }
  const record = value as Record<string, unknown>;
  const completed: Record<string, number> = {};
  if (typeof record.completed === "object" && record.completed !== null) {
    for (const [levelId, moves] of Object.entries(record.completed as Record<string, unknown>)) {
      if (typeof moves === "number" && Number.isInteger(moves) && moves > 0) completed[levelId] = moves;
    }
  }
  return {
    completed,
    lastPlayedLevelId: isNonEmptyString(record.lastPlayedLevelId) ? record.lastPlayedLevelId : null
  };
}

function readResponses(value: unknown, warnings: string[]): QuestionnaireResponse | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") {
    warnings.push("responses was not an object; dropped.");
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== QUESTIONNAIRE_VERSION) {
    warnings.push(`responses use questionnaire version ${String(record.version)}; expected ${QUESTIONNAIRE_VERSION}. Dropped.`);
    return null;
  }
  if (typeof record.answers !== "object" || record.answers === null) {
    warnings.push("responses had no answers object; dropped.");
    return null;
  }
  return {
    version: QUESTIONNAIRE_VERSION,
    respondedAt: typeof record.respondedAt === "number" && Number.isFinite(record.respondedAt) ? record.respondedAt : 0,
    answers: normalizeAnswers(record.answers as Record<string, unknown>)
  };
}

/**
 * Parses one bundle. Never throws.
 *
 * A future `bundleVersion` is refused with its own code rather than being read
 * as though it were version 1: a newer exporter may have changed what a field
 * means, and quietly reinterpreting it would corrupt a cohort silently, which
 * is worse than skipping one file loudly.
 */
export function parsePlaytestBundle(value: unknown): BundleParseResult {
  if (typeof value === "string") {
    try {
      return parsePlaytestBundle(JSON.parse(value) as unknown);
    } catch {
      return fail("not-json", "File is not valid JSON.");
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail("not-object", "Bundle must be a JSON object.");
  }
  const record = value as Record<string, unknown>;

  const version = record.bundleVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return fail("missing-version", "Missing or non-integer 'bundleVersion'.");
  }
  if (version > PLAYTEST_BUNDLE_VERSION) {
    return fail(
      "unsupported-future-version",
      `Bundle version ${version} is newer than this tool understands (${PLAYTEST_BUNDLE_VERSION}). Update the analyzer rather than reinterpreting it.`
    );
  }
  if (version < PLAYTEST_BUNDLE_VERSION) {
    return fail(
      "unsupported-past-version",
      `Bundle version ${version} predates the locked methodology (${PLAYTEST_BUNDLE_VERSION}). No migration is defined; exclude it or re-export.`
    );
  }

  const warnings: string[] = [];

  for (const field of ["bundleId", "appVersion", "contentRevision", "playtestInstallId", "exportedAt"] as const) {
    if (!isNonEmptyString(record[field])) return fail("missing-field", `Missing or empty '${field}'.`);
  }
  if (!isValidInstallId(record.playtestInstallId)) {
    return fail("invalid-field", "'playtestInstallId' is not a valid anonymous install id.");
  }
  if (!(BUILD_CHANNELS as readonly string[]).includes(record.buildChannel as string)) {
    return fail("invalid-field", `'buildChannel' must be one of ${BUILD_CHANNELS.join(", ")}.`);
  }
  if (!(PLATFORM_KINDS as readonly string[]).includes(record.platform as string)) {
    return fail("invalid-field", `'platform' must be one of ${PLATFORM_KINDS.join(", ")}.`);
  }
  if (!Array.isArray(record.events)) {
    return fail("missing-field", "Missing 'events' array.");
  }
  const exportedAt = new Date(record.exportedAt as string);
  if (Number.isNaN(exportedAt.getTime())) {
    return fail("invalid-field", "'exportedAt' is not a valid ISO timestamp.");
  }

  const rawEvents = record.events as unknown[];
  const events = rawEvents.filter(isValidPlaytestEvent);
  if (events.length !== rawEvents.length) {
    warnings.push(`${rawEvents.length - events.length} event(s) failed validation and were dropped.`);
  }

  const eventSchemaVersion =
    typeof record.eventSchemaVersion === "number" ? record.eventSchemaVersion : PLAYTEST_SCHEMA_VERSION;
  if (eventSchemaVersion !== PLAYTEST_SCHEMA_VERSION) {
    return fail(
      "invalid-field",
      `'eventSchemaVersion' ${eventSchemaVersion} is not the supported event schema (${PLAYTEST_SCHEMA_VERSION}).`
    );
  }

  const declaredFingerprint = record.eventsFingerprint;
  const actualFingerprint = computeEventsFingerprint(events);
  if (isNonEmptyString(declaredFingerprint) && declaredFingerprint !== actualFingerprint) {
    // Not fatal: dropping invalid events legitimately changes the digest. It is
    // still worth saying out loud, because it can also mean an edited file.
    warnings.push(
      `eventsFingerprint '${declaredFingerprint}' does not match the events present ('${actualFingerprint}'). The file may have been edited or partially repaired.`
    );
  }

  const bundle: PlaytestBundle = {
    bundleVersion: PLAYTEST_BUNDLE_VERSION,
    bundleId: (record.bundleId as string).trim(),
    eventSchemaVersion,
    appVersion: (record.appVersion as string).trim(),
    contentRevision: (record.contentRevision as string).trim(),
    contentFingerprint: isNonEmptyString(record.contentFingerprint) ? record.contentFingerprint.trim() : "unknown",
    buildId: isNonEmptyString(record.buildId) ? record.buildId.trim() : "unknown",
    buildChannel: record.buildChannel as BuildChannel,
    cohortId: isNonEmptyString(record.cohortId) ? record.cohortId.trim() : null,
    platform: record.platform as PlatformKind,
    playtestInstallId: record.playtestInstallId,
    installResetCount:
      typeof record.installResetCount === "number" && Number.isInteger(record.installResetCount)
        ? record.installResetCount
        : 0,
    exportedAt: exportedAt.toISOString(),
    eventsFingerprint: actualFingerprint,
    events,
    progress: readProgress(record.progress, warnings),
    responses: readResponses(record.responses, warnings)
  };

  return { ok: true, bundle, warnings };
}
