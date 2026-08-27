/**
 * Playtest consent.
 *
 * A playtest build tells the tester what is recorded before anything is
 * recorded, and lets them decline without losing the game. GOV.UK's user
 * research guidance is the shape being followed: say who is doing the
 * research, what is collected, that participation is voluntary, that it can be
 * stopped at any time, and what happens to the data
 * (https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research).
 *
 * It is deliberately four short lines, not a legal wall — Apple's game
 * onboarding guidance is explicit that agreements and disclaimers in front of
 * play cost players, and this screen exists only in the playtest build
 * (https://developer.apple.com/app-store/onboarding-for-games/).
 *
 * `DISCLOSURE_VERSION` is stored with the decision. If the wording of what we
 * record ever changes materially, bump it: a decision recorded against older
 * wording is treated as `unknown` and asked again, rather than silently reused.
 *
 * Declining is real. On `declined`, the tracker records nothing at all for the
 * rest of the run, and there is nothing to export.
 */

import type { KeyValueStorage } from "./store.ts";

export const PLAYTEST_CONSENT_STORAGE_KEY = "flipstitch.playtest.consent.v1";
export const PLAYTEST_CONSENT_RECORD_VERSION = 1;

/** Bump when the disclosure text below changes what it says we record. */
export const DISCLOSURE_VERSION = 1;

export type ConsentDecision = "unknown" | "granted" | "declined";

export type ConsentRecord = {
  version: typeof PLAYTEST_CONSENT_RECORD_VERSION;
  decision: Exclude<ConsentDecision, "unknown">;
  decidedAt: number;
  disclosureVersion: number;
};

/**
 * The tester-facing disclosure, as data so the screen, the docs, and the
 * exported bundle all quote the same words.
 */
export const CONSENT_DISCLOSURE = {
  title: "Before you play",
  lines: [
    "This is a playtest of FlipStitch. We are testing the game, not you.",
    "While you play, this device records what you tap in the puzzle: stitches, undos, hints, Peek, restarts, and which hoops you finish.",
    "It does not record your name, email, phone, location, contacts, or anything about your device beyond whether it is a phone or a browser.",
    "Nothing is sent anywhere. The report stays on this device until you choose to share it at the end, and you can stop at any time."
  ],
  acceptLabel: "I understand — start",
  declineLabel: "Play without recording"
} as const;

export function isConsentGranted(decision: ConsentDecision): boolean {
  return decision === "granted";
}

/**
 * Reads a stored decision. A record written against an older disclosure
 * version is treated as `null`, so the tester is asked again rather than being
 * held to wording they never saw.
 */
export function readConsentRecord(raw: string | null): ConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== PLAYTEST_CONSENT_RECORD_VERSION) return null;
    if (record.decision !== "granted" && record.decision !== "declined") return null;
    if (record.disclosureVersion !== DISCLOSURE_VERSION) return null;
    return {
      version: PLAYTEST_CONSENT_RECORD_VERSION,
      decision: record.decision,
      decidedAt: typeof record.decidedAt === "number" && Number.isFinite(record.decidedAt) ? record.decidedAt : 0,
      disclosureVersion: DISCLOSURE_VERSION
    };
  } catch {
    return null;
  }
}

export function makeConsentRecord(decision: Exclude<ConsentDecision, "unknown">, decidedAt: number): ConsentRecord {
  return {
    version: PLAYTEST_CONSENT_RECORD_VERSION,
    decision,
    decidedAt,
    disclosureVersion: DISCLOSURE_VERSION
  };
}

export async function loadConsent(storage: KeyValueStorage): Promise<ConsentRecord | null> {
  const raw = await storage.getItem(PLAYTEST_CONSENT_STORAGE_KEY).catch(() => null);
  return readConsentRecord(raw);
}

export async function saveConsent(
  storage: KeyValueStorage,
  decision: Exclude<ConsentDecision, "unknown">,
  now: () => number = Date.now
): Promise<ConsentRecord> {
  const record = makeConsentRecord(decision, now());
  await storage.setItem(PLAYTEST_CONSENT_STORAGE_KEY, JSON.stringify(record)).catch(() => undefined);
  return record;
}

export async function clearConsent(storage: KeyValueStorage): Promise<void> {
  await storage.removeItem(PLAYTEST_CONSENT_STORAGE_KEY).catch(() => undefined);
}
