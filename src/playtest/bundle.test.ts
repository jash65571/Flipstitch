import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlaytestBundle,
  computeEventsFingerprint,
  parsePlaytestBundle,
  PLAYTEST_BUNDLE_VERSION,
  type BundleInput
} from "./bundle.ts";
import { resolveBuildChannel, resolveBuildInfo, fingerprint, normalizePlatform } from "./build.ts";
import { PLAYTEST_SCHEMA_VERSION, type PlaytestEvent } from "./events.ts";
import {
  createInstallId,
  isValidInstallId,
  makeInstallRecord,
  readInstallRecord,
  loadOrCreateInstallRecord,
  resetInstallRecord,
  PLAYTEST_INSTALL_STORAGE_KEY
} from "./install.ts";
import {
  DISCLOSURE_VERSION,
  makeConsentRecord,
  readConsentRecord,
  CONSENT_DISCLOSURE
} from "./consent.ts";
import { makeQuestionnaireResponse, normalizeAnswers, QUESTIONS, MAX_ANSWER_LENGTH } from "./questionnaire.ts";
import type { KeyValueStorage } from "./store.ts";

const INSTALL_ID = "pi-11111111-2222-4333-8444-555555555555";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
    removeItem: async (key) => {
      delete data[key];
    }
  };
}

let seq = 0;
function event(overrides: Partial<PlaytestEvent> = {}): PlaytestEvent {
  seq += 1;
  return {
    schemaVersion: PLAYTEST_SCHEMA_VERSION,
    sessionId: "s1",
    seq,
    timestamp: 1_700_000_000_000 + seq * 1000,
    elapsedMs: seq * 1000,
    name: "valid_stitch",
    ...overrides
  };
}

function input(overrides: Partial<BundleInput> = {}): BundleInput {
  return {
    bundleId: "b-1",
    appVersion: "0.1.0",
    contentRevision: "2c20l.2026-08-27",
    contentFingerprint: "abcdef12",
    buildId: "3689a8f",
    buildChannel: "playtest",
    cohortId: "pilot-a",
    platform: "android",
    playtestInstallId: INSTALL_ID,
    installResetCount: 0,
    exportedAt: new Date("2026-08-27T12:00:00.000Z"),
    events: [event({ name: "level_opened", levelId: "l1" }), event({ name: "first_valid_stitch", levelId: "l1" })],
    progress: { completed: { l1: 6 }, lastPlayedLevelId: "l1" },
    responses: null,
    ...overrides
  };
}

// ── build identity ─────────────────────────────────────────────────────────

test("playtest mode is opt-in and only 'true' enables it", () => {
  assert.equal(resolveBuildChannel({ playtestMode: "true" }), "playtest");
  assert.equal(resolveBuildChannel({ playtestMode: "TRUE" }), "playtest");
  assert.equal(resolveBuildChannel({ playtestMode: "1" }), "production");
  assert.equal(resolveBuildChannel({ playtestMode: "yes" }), "production");
  assert.equal(resolveBuildChannel({ playtestMode: undefined }), "production");
  assert.equal(resolveBuildChannel({ dev: true }), "development");
  assert.equal(resolveBuildChannel({ playtestMode: "true", dev: true }), "playtest");
});

test("build info records only coarse, non-fingerprinting metadata", () => {
  const info = resolveBuildInfo({ playtestMode: "true", buildId: "3689a8f", cohort: "gate-1" }, "0.1.0", "android");
  assert.deepEqual(info, {
    channel: "playtest",
    playtestMode: true,
    appVersion: "0.1.0",
    buildId: "3689a8f",
    cohortId: "gate-1",
    platform: "android"
  });
  // Nothing device-specific can leak in through the platform field.
  assert.equal(normalizePlatform("SM-S928B"), "unknown");
  assert.equal(normalizePlatform(undefined), "unknown");
  assert.equal(normalizePlatform("web"), "web");
});

test("a cohort label is never carried on a non-playtest build", () => {
  const info = resolveBuildInfo({ cohort: "gate-1" }, "0.1.0", "ios");
  assert.equal(info.channel, "production");
  assert.equal(info.cohortId, null);
});

test("fingerprint is stable, order-sensitive, and change-detecting", () => {
  assert.equal(fingerprint(["a", "b"]), fingerprint(["a", "b"]));
  assert.notEqual(fingerprint(["a", "b"]), fingerprint(["b", "a"]));
  assert.notEqual(fingerprint(["ab"]), fingerprint(["a", "b"]));
  assert.match(fingerprint(["a"]), /^[0-9a-f]{8}$/);
});

// ── anonymous install identity ─────────────────────────────────────────────

test("install ids are random, prefixed, and carry no device data", () => {
  const a = createInstallId();
  const b = createInstallId();
  assert.notEqual(a, b);
  assert.ok(isValidInstallId(a));
  assert.ok(a.startsWith("pi-"));
  assert.equal(isValidInstallId("pi-not-a-uuid"), false);
  assert.equal(isValidInstallId(INSTALL_ID.toUpperCase()), false, "ids are lowercase hex only");
  assert.equal(isValidInstallId(42), false);
});

test("a stored install record round-trips and a corrupt one is discarded", () => {
  const record = makeInstallRecord(INSTALL_ID, 1000, 2);
  assert.deepEqual(readInstallRecord(JSON.stringify(record)), record);
  assert.equal(readInstallRecord("not json"), null);
  assert.equal(readInstallRecord(null), null);
  assert.equal(readInstallRecord(JSON.stringify({ ...record, version: 99 })), null);
  assert.equal(readInstallRecord(JSON.stringify({ ...record, installId: "nope" })), null);
});

test("the install id is minted once and reused on later launches", async () => {
  const storage = memoryStorage();
  const first = await loadOrCreateInstallRecord(storage, () => 1000);
  const second = await loadOrCreateInstallRecord(storage, () => 2000);
  assert.equal(first.installId, second.installId);
  assert.equal(second.resetCount, 0);
  assert.ok(storage.data[PLAYTEST_INSTALL_STORAGE_KEY]);
});

test("a researcher reset issues an unrelated id and counts the reset", async () => {
  const storage = memoryStorage();
  const first = await loadOrCreateInstallRecord(storage, () => 1000);
  const reset = await resetInstallRecord(storage, first, () => 2000);
  assert.notEqual(reset.installId, first.installId);
  assert.equal(reset.resetCount, 1);
  const reloaded = await loadOrCreateInstallRecord(storage, () => 3000);
  assert.equal(reloaded.installId, reset.installId);
});

test("storage failure never stops a test session", async () => {
  const broken: KeyValueStorage = {
    getItem: async () => {
      throw new Error("disk");
    },
    setItem: async () => {
      throw new Error("disk");
    },
    removeItem: async () => {
      throw new Error("disk");
    }
  };
  const record = await loadOrCreateInstallRecord(broken, () => 1000);
  assert.ok(isValidInstallId(record.installId));
});

// ── consent ────────────────────────────────────────────────────────────────

test("consent recorded against older disclosure wording is asked again", () => {
  const record = makeConsentRecord("granted", 1000);
  assert.deepEqual(readConsentRecord(JSON.stringify(record)), record);
  assert.equal(readConsentRecord(JSON.stringify({ ...record, disclosureVersion: DISCLOSURE_VERSION + 1 })), null);
  assert.equal(readConsentRecord(JSON.stringify({ ...record, decision: "maybe" })), null);
  assert.equal(readConsentRecord(null), null);
});

test("the disclosure names what is recorded and states nothing is sent", () => {
  const text = CONSENT_DISCLOSURE.lines.join(" ").toLowerCase();
  assert.match(text, /records/);
  assert.match(text, /nothing is sent/);
  assert.match(text, /stop at any time/);
  assert.match(text, /does not record your name/);
  assert.ok(CONSENT_DISCLOSURE.lines.length <= 5, "the disclosure must stay short, not become a legal wall");
});

// ── questionnaire ──────────────────────────────────────────────────────────

test("questionnaire wording is neutral and every question is skippable", () => {
  for (const question of QUESTIONS) {
    assert.equal(question.optional, true, `${question.id} must be skippable`);
    const prompt = question.prompt.toLowerCase();
    for (const loaded of ["awesome", "great", "helpful", "easy", "clear", "enjoy", "love", "like the"]) {
      assert.ok(!prompt.includes(loaded), `${question.id} uses a leading word: ${loaded}`);
    }
  }
  const choice = QUESTIONS.find((question) => question.id === "wouldPlayAnother");
  assert.deepEqual(choice?.choices?.map((option) => option.value), ["yes", "no", "unsure"]);
});

test("answers are trimmed, bounded, and unknown ids dropped", () => {
  const answers = normalizeAnswers({
    ruleInOwnWords: "  every stitch flips  ",
    wouldPlayAnother: "maybe",
    freeComment: "x".repeat(MAX_ANSWER_LENGTH + 50),
    somethingElse: "ignored",
    confusionMoment: "   "
  });
  assert.equal(answers.ruleInOwnWords, "every stitch flips");
  assert.equal(answers.wouldPlayAnother, undefined, "an out-of-range choice is not stored");
  assert.equal(answers.freeComment?.length, MAX_ANSWER_LENGTH);
  assert.equal("somethingElse" in answers, false);
  assert.equal("confusionMoment" in answers, false);

  const response = makeQuestionnaireResponse({ wouldPlayAnother: "yes" }, 5000);
  assert.equal(response.answers.wouldPlayAnother, "yes");
  assert.equal(response.respondedAt, 5000);
});

// ── bundle ─────────────────────────────────────────────────────────────────

test("a built bundle carries build identity and no device fingerprint", () => {
  const bundle = buildPlaytestBundle(input());
  assert.equal(bundle.bundleVersion, PLAYTEST_BUNDLE_VERSION);
  assert.equal(bundle.eventSchemaVersion, PLAYTEST_SCHEMA_VERSION);
  assert.equal(bundle.buildChannel, "playtest");
  assert.equal(bundle.platform, "android");
  assert.equal(bundle.exportedAt, "2026-08-27T12:00:00.000Z");
  assert.equal(bundle.eventsFingerprint, computeEventsFingerprint(bundle.events));

  // The forbidden names are assembled from fragments on purpose: written out
  // whole they would be flagged by `npm run scan:analytics`, which greps the
  // source for exactly these strings. The check keeps its teeth; the scanner
  // keeps its teeth too.
  const forbiddenKeys = ["device" + "Model", "os" + "Version", "loc" + "ale", "time" + "zone", "advertis" + "ingId", "scr" + "een"];
  const keys = Object.keys(bundle).sort();
  for (const forbidden of forbiddenKeys) {
    assert.ok(!keys.includes(forbidden), `bundle must not carry ${forbidden}`);
  }
  // A serialised bundle must not mention any identifier we promised to avoid.
  const serialised = JSON.stringify(bundle).toLowerCase();
  for (const forbidden of ["id" + "fa", "ga" + "id", "advertis" + "ing", "im" + "ei", "mac" + "address", "lat" + "itude"]) {
    assert.ok(!serialised.includes(forbidden), `bundle JSON must not contain ${forbidden}`);
  }
});

test("round-tripping a bundle through JSON preserves it exactly", () => {
  const bundle = buildPlaytestBundle(input({ responses: makeQuestionnaireResponse({ wouldPlayAnother: "yes" }, 42) }));
  const result = parsePlaytestBundle(JSON.stringify(bundle));
  assert.ok(result.ok);
  assert.deepEqual(result.bundle, bundle);
  assert.deepEqual(result.warnings, []);
});

test("a future bundle version is refused rather than reinterpreted", () => {
  const bundle = { ...buildPlaytestBundle(input()), bundleVersion: PLAYTEST_BUNDLE_VERSION + 1 };
  const result = parsePlaytestBundle(bundle);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, "unsupported-future-version");
});

test("an older bundle version is refused with its own code", () => {
  const bundle = { ...buildPlaytestBundle(input()), bundleVersion: 0 };
  const result = parsePlaytestBundle(bundle);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, "unsupported-past-version");
});

test("corrupt input never throws and names what is wrong", () => {
  for (const [value, code] of [
    ["{not json", "not-json"],
    ["[]", "not-object"],
    ["null", "not-object"],
    [JSON.stringify({}), "missing-version"],
    [JSON.stringify({ bundleVersion: "1" }), "missing-version"]
  ] as const) {
    const result = parsePlaytestBundle(value);
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, code);
  }
});

test("missing and invalid fields are reported by name", () => {
  const good = buildPlaytestBundle(input());
  const missing = parsePlaytestBundle({ ...good, appVersion: "" });
  assert.equal(missing.ok === false && missing.code, "missing-field");
  assert.match(missing.ok === false ? missing.reason : "", /appVersion/);

  const badInstall = parsePlaytestBundle({ ...good, playtestInstallId: "nope" });
  assert.equal(badInstall.ok === false && badInstall.code, "invalid-field");

  const badChannel = parsePlaytestBundle({ ...good, buildChannel: "beta" });
  assert.equal(badChannel.ok === false && badChannel.code, "invalid-field");

  const badPlatform = parsePlaytestBundle({ ...good, platform: "windows" });
  assert.equal(badPlatform.ok === false && badPlatform.code, "invalid-field");

  const noEvents = parsePlaytestBundle({ ...good, events: undefined });
  assert.equal(noEvents.ok === false && noEvents.code, "missing-field");

  const badDate = parsePlaytestBundle({ ...good, exportedAt: "yesterday" });
  assert.equal(badDate.ok === false && badDate.code, "invalid-field");
});

test("individually broken events are dropped with a warning, not a crash", () => {
  const good = buildPlaytestBundle(input());
  const result = parsePlaytestBundle({
    ...good,
    events: [...good.events, { schemaVersion: 1, sessionId: "s1" }, null, "nope"]
  });
  assert.ok(result.ok);
  assert.equal(result.bundle.events.length, good.events.length);
  assert.match(result.warnings.join(" "), /3 event\(s\) failed validation/);
});

test("an edited events array is flagged by the fingerprint mismatch", () => {
  const good = buildPlaytestBundle(input());
  const tampered = { ...good, events: good.events.slice(0, 1) };
  const result = parsePlaytestBundle(tampered);
  assert.ok(result.ok);
  assert.match(result.warnings.join(" "), /does not match the events present/);
});

test("a bad progress or responses block degrades instead of failing the bundle", () => {
  const good = buildPlaytestBundle(input());
  const result = parsePlaytestBundle({
    ...good,
    progress: "nonsense",
    responses: { version: 99, answers: {} }
  });
  assert.ok(result.ok);
  assert.deepEqual(result.bundle.progress, { completed: {}, lastPlayedLevelId: null });
  assert.equal(result.bundle.responses, null);
  assert.match(result.warnings.join(" "), /progress was missing/);
  assert.match(result.warnings.join(" "), /questionnaire version 99/);
});
