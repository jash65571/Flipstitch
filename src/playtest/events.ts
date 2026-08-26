/**
 * Local playtest event schema.
 *
 * Everything stays on the device. No names, emails, account data, location,
 * contacts, advertising identifiers, device fingerprints, or unrelated device
 * data are collected. Nothing is sent over the network.
 */

export const PLAYTEST_SCHEMA_VERSION = 1;

export const PLAYTEST_STORAGE_KEY = "flipstitch.playtest.v1";

/** Documented bound: keep at most this many events, dropping the oldest first. */
export const MAX_PLAYTEST_EVENTS = 5000;

export type PlaytestEventName =
  | "app_session_started"
  | "level_opened"
  | "first_valid_stitch"
  | "valid_stitch"
  | "invalid_stitch"
  | "preview_used"
  | "undo_used"
  | "hint_used"
  | "restart_used"
  | "level_exited"
  | "level_completed"
  | "next_level_started"
  | "setting_changed";

export const PLAYTEST_EVENT_NAMES: readonly PlaytestEventName[] = [
  "app_session_started",
  "level_opened",
  "first_valid_stitch",
  "valid_stitch",
  "invalid_stitch",
  "preview_used",
  "undo_used",
  "hint_used",
  "restart_used",
  "level_exited",
  "level_completed",
  "next_level_started",
  "setting_changed"
];

export type PlaytestEvent = {
  schemaVersion: typeof PLAYTEST_SCHEMA_VERSION;
  sessionId: string;
  /** Per-session event sequence number, starting at 1. */
  seq: number;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Monotonic milliseconds since the session started. */
  elapsedMs: number;
  name: PlaytestEventName;
  levelId?: string;
  activeSide?: "front" | "back";
  moveCount?: number;
  invalidReason?: string;
  completed?: boolean;
  setting?: string;
  value?: string | boolean;
};

export function isValidPlaytestEvent(value: unknown): value is PlaytestEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    event.schemaVersion === PLAYTEST_SCHEMA_VERSION &&
    typeof event.sessionId === "string" &&
    typeof event.seq === "number" &&
    Number.isInteger(event.seq) &&
    event.seq > 0 &&
    typeof event.timestamp === "number" &&
    typeof event.elapsedMs === "number" &&
    typeof event.name === "string" &&
    (PLAYTEST_EVENT_NAMES as readonly string[]).includes(event.name)
  );
}
