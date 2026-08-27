/**
 * Anonymous playtest-install identity.
 *
 * Session ids answer "which app launch?". For an external cohort we also need
 * "did these two exported bundles come from the same test installation?", so
 * that one tester who exports twice is one tester and not two (Goal 4/14).
 *
 * What this identifier is:
 *
 * - a locally generated random v4 UUID, prefixed `pi-`;
 * - app-scoped: it lives in this app's own AsyncStorage and nothing else can
 *   read it. Android's own guidance for non-advertising, app-internal
 *   analytics is exactly this — a randomly generated GUID kept in internal
 *   storage, not a hardware id
 *   (https://developer.android.com/identity/user-data-ids);
 * - resettable: the researcher reset issues a brand-new one;
 * - erased when the app is uninstalled or its data cleared;
 * - written into exported bundles **only in playtest builds**.
 *
 * What it is emphatically not:
 *
 * - not an account, login, or profile;
 * - not derived from any device value — not IMEI, serial, MAC, SSAID, the
 *   advertising id, the screen, the locale, the clock, or any combination of
 *   them. It carries no information about the device at all;
 * - not a fingerprint: two fresh installs on the same physical phone produce
 *   two unrelated ids, and one install on two phones is impossible;
 * - not present in the normal consumer build's exports.
 *
 * See docs/PLAYTEST-DATA.md for the tester-facing description and
 * docs/PLAYTEST-PROTOCOL.md for when a researcher should and should not reset
 * it.
 */

import type { KeyValueStorage } from "./store.ts";

export const PLAYTEST_INSTALL_STORAGE_KEY = "flipstitch.playtest.install.v1";
export const PLAYTEST_INSTALL_RECORD_VERSION = 1;

/** `pi-` + a 36-character UUID. */
export const INSTALL_ID_PATTERN = /^pi-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type PlaytestInstallRecord = {
  version: typeof PLAYTEST_INSTALL_RECORD_VERSION;
  installId: string;
  /** Epoch milliseconds the id was minted. Coarse study bookkeeping only. */
  createdAt: number;
  /** How many times a researcher reset this device's identity. */
  resetCount: number;
};

export type RandomUuid = () => string;

/**
 * Cryptographically random where available, with a documented fallback.
 *
 * `crypto.randomUUID` exists on modern React Native (Hermes) and every browser
 * target we build for. The fallback uses `crypto.getRandomValues` when that is
 * present, and only if neither exists falls back to `Math.random`. The
 * fallback is still device-independent: it is randomness, not device data.
 */
export const defaultRandomUuid: RandomUuid = () => {
  const source = typeof crypto !== "undefined" ? crypto : undefined;
  if (source && typeof source.randomUUID === "function") {
    return source.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (source && typeof source.getRandomValues === "function") {
    source.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  // RFC 4122 version and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export function createInstallId(randomUuid: RandomUuid = defaultRandomUuid): string {
  return `pi-${randomUuid().toLowerCase()}`;
}

export function isValidInstallId(value: unknown): value is string {
  return typeof value === "string" && INSTALL_ID_PATTERN.test(value);
}

/** Parses a stored record. Anything unreadable becomes `null` so a fresh id is minted. */
export function readInstallRecord(raw: string | null): PlaytestInstallRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== PLAYTEST_INSTALL_RECORD_VERSION) return null;
    if (!isValidInstallId(record.installId)) return null;
    return {
      version: PLAYTEST_INSTALL_RECORD_VERSION,
      installId: record.installId,
      createdAt: typeof record.createdAt === "number" && Number.isFinite(record.createdAt) ? record.createdAt : 0,
      resetCount:
        typeof record.resetCount === "number" && Number.isInteger(record.resetCount) && record.resetCount >= 0
          ? record.resetCount
          : 0
    };
  } catch {
    return null;
  }
}

export function makeInstallRecord(installId: string, createdAt: number, resetCount = 0): PlaytestInstallRecord {
  return { version: PLAYTEST_INSTALL_RECORD_VERSION, installId, createdAt, resetCount };
}

/**
 * Loads the stored identity, minting and persisting one on first run.
 * Storage failure never throws: the caller gets an in-memory id for this
 * launch so a broken disk cannot stop a test session.
 */
export async function loadOrCreateInstallRecord(
  storage: KeyValueStorage,
  now: () => number = Date.now,
  randomUuid: RandomUuid = defaultRandomUuid
): Promise<PlaytestInstallRecord> {
  const raw = await storage.getItem(PLAYTEST_INSTALL_STORAGE_KEY).catch(() => null);
  const existing = readInstallRecord(raw);
  if (existing) return existing;
  const created = makeInstallRecord(createInstallId(randomUuid), now(), 0);
  await storage.setItem(PLAYTEST_INSTALL_STORAGE_KEY, JSON.stringify(created)).catch(() => undefined);
  return created;
}

/**
 * Issues a fresh identity for the next tester, preserving only the reset
 * counter. The new id is unrelated to the old one, so two testers on one
 * device can never be merged into a single "player" in analysis.
 */
export async function resetInstallRecord(
  storage: KeyValueStorage,
  previous: PlaytestInstallRecord | null,
  now: () => number = Date.now,
  randomUuid: RandomUuid = defaultRandomUuid
): Promise<PlaytestInstallRecord> {
  const next = makeInstallRecord(createInstallId(randomUuid), now(), (previous?.resetCount ?? 0) + 1);
  await storage.setItem(PLAYTEST_INSTALL_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  return next;
}
