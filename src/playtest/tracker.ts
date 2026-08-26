/**
 * Playtest tracker: stamps every event with the session id, per-session
 * sequence number, epoch timestamp, and monotonic elapsed time, then hands the
 * event to the bounded store.
 *
 * Exit and completion events are protected against duplicates: each
 * (session, level, name) pair is recorded at most once, so route changes or
 * app backgrounding cannot double-report.
 */

import { PLAYTEST_SCHEMA_VERSION, type PlaytestEvent, type PlaytestEventName } from "./events.ts";
import { PlaytestEventStore } from "./store.ts";

export type TrackInput = {
  name: PlaytestEventName;
  levelId?: string;
  attemptId?: string;
  activeSide?: "front" | "back";
  moveCount?: number;
  invalidReason?: string;
  completed?: boolean;
  setting?: string;
  value?: string | boolean;
};

export type Clock = {
  now(): number;
  monotonic(): number;
};

export const realClock: Clock = {
  now: () => Date.now(),
  monotonic: () => (typeof performance !== "undefined" ? performance.now() : Date.now())
};

function createSessionId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `s-${random}`;
}

export class PlaytestTracker {
  private readonly store: PlaytestEventStore;
  private readonly clock: Clock;
  private readonly sessionId: string;
  private readonly sessionStartedAt: number;
  private seq = 0;
  private readonly recordedKeys = new Set<string>();

  constructor(store: PlaytestEventStore, clock: Clock = realClock, sessionId: string = createSessionId()) {
    this.store = store;
    this.clock = clock;
    this.sessionId = sessionId;
    this.sessionStartedAt = clock.monotonic();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  /** Idempotent: records at most one session start per tracker. */
  startSession(): void {
    this.trackOnce({ name: "app_session_started" });
  }

  track(input: TrackInput): void {
    const event: PlaytestEvent = {
      schemaVersion: PLAYTEST_SCHEMA_VERSION,
      sessionId: this.sessionId,
      seq: ++this.seq,
      timestamp: this.clock.now(),
      elapsedMs: Math.max(0, Math.round(this.clock.monotonic() - this.sessionStartedAt)),
      ...input
    };
    this.store.append(event);
  }

  /**
   * Records an event at most once per session. Used for level_exited and
   * level_completed so route changes and backgrounding cannot duplicate them.
   */
  /** Returns true when the event was actually recorded. */
  trackOnce(input: TrackInput): boolean {
    const key = `${input.name}:${input.levelId ?? ""}`;
    if (this.recordedKeys.has(key)) return false;
    this.recordedKeys.add(key);
    this.track(input);
    return true;
  }

  async snapshot(): Promise<PlaytestEvent[]> {
    return this.store.snapshot();
  }

  /** Flushes any buffered events to storage (e.g. when the app backgrounds). */
  async flush(): Promise<void> {
    await this.store.flush();
  }

  async clear(): Promise<void> {
    this.recordedKeys.clear();
    await this.store.clear();
  }
}
