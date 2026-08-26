/**
 * Bounded playtest event store.
 *
 * Pure operations (`readEvents`, `appendEvents`, `dropOldest`) are separate
 * from the storage adapter so they can be unit tested without a device.
 *
 * The AsyncStorage adapter batches writes: events accumulate in memory and are
 * flushed after a short debounce. That keeps rapid taps (one write per stitch)
 * off the storage path. Storage failure is swallowed so it can never interrupt
 * gameplay. The store is bounded to MAX_PLAYTEST_EVENTS, removing the oldest
 * events first.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isValidPlaytestEvent,
  MAX_PLAYTEST_EVENTS,
  PLAYTEST_STORAGE_KEY,
  type PlaytestEvent
} from "./events.ts";

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const asyncStorageAdapter: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key)
};

export function readEvents(raw: string | null): PlaytestEvent[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPlaytestEvent);
  } catch {
    return [];
  }
}

/** Appends events and removes the oldest when the bound is exceeded. */
export function appendEvents(
  events: readonly PlaytestEvent[],
  additions: readonly PlaytestEvent[],
  max = MAX_PLAYTEST_EVENTS
): PlaytestEvent[] {
  const next = [...events, ...additions];
  if (next.length > max) {
    return next.slice(next.length - max);
  }
  return next;
}

export function dropOldest(events: readonly PlaytestEvent[], max: number): PlaytestEvent[] {
  if (events.length <= max) return [...events];
  return events.slice(events.length - max);
}

export class PlaytestEventStore {
  private readonly storage: KeyValueStorage;
  private readonly flushDelayMs: number;
  private readonly maxBatch: number;
  private pending: PlaytestEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(storage: KeyValueStorage = asyncStorageAdapter, flushDelayMs = 1500, maxBatch = 100) {
    this.storage = storage;
    this.flushDelayMs = flushDelayMs;
    this.maxBatch = maxBatch;
  }

  append(event: PlaytestEvent): void {
    this.pending.push(event);
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, this.flushDelayMs);
    }
  }

  /** Flushes pending events to storage. Safe to call directly in tests. */
  async flush(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending.splice(0, this.maxBatch);
    this.writeQueue = this.writeQueue.then(async () => {
      const raw = await this.storage.getItem(PLAYTEST_STORAGE_KEY).catch(() => null);
      const existing = raw === null ? [] : readEvents(raw);
      const next = appendEvents(existing, batch);
      await this.storage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
    });
    await this.writeQueue;
  }

  /** Returns a consistent snapshot of stored events. */
  async snapshot(): Promise<PlaytestEvent[]> {
    await this.flush();
    const raw = await this.storage.getItem(PLAYTEST_STORAGE_KEY).catch(() => null);
    return raw === null ? [] : readEvents(raw);
  }

  async clear(): Promise<void> {
    this.pending = [];
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.writeQueue = this.writeQueue.then(() => this.storage.removeItem(PLAYTEST_STORAGE_KEY).catch(() => undefined));
    await this.writeQueue;
  }
}
