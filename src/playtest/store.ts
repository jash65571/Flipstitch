/**
 * Bounded playtest event store.
 *
 * Pure operations (`readEvents`, `appendEvents`, `dropOldest`) are separate
 * from the storage adapter so they can be unit tested without a device.
 *
 * The AsyncStorage adapter batches writes: events accumulate in memory and are
 * flushed after a short debounce. That keeps rapid taps (one write per stitch)
 * off the storage path.
 *
 * Concurrency and ordering:
 *  - `flush()` drains *every* pending batch (not just one) through a serial
 *    write queue, so events are persisted in append order even when more than
 *    one batch is pending.
 *  - `clear()` cancels pending events, invalidates any in-flight writes via a
 *    generation counter, and removes the stored key after the queue drains.
 *    Events appended after a clear survive.
 *  - Storage failure is swallowed so it can never interrupt gameplay.
 *  - The store is bounded to MAX_PLAYTEST_EVENTS, removing the oldest first.
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
  /** Safety cap so a pathological append storm cannot loop forever in one flush. */
  private readonly maxBatchesPerFlush = 1000;
  private pending: PlaytestEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private generation = 0;

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

  /** Flushes ALL pending batches to storage in order. Safe to call directly. */
  async flush(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    let batches = 0;
    while (this.pending.length > 0 && batches < this.maxBatchesPerFlush) {
      const batch = this.pending.splice(0, this.maxBatch);
      batches += 1;
      const generation = this.generation;
      this.writeQueue = this.writeQueue.then(async () => {
        if (generation !== this.generation) return; // cleared meanwhile; skip
        const raw = await this.storage.getItem(PLAYTEST_STORAGE_KEY).catch(() => null);
        const existing = raw === null ? [] : readEvents(raw);
        const next = appendEvents(existing, batch);
        await this.storage.setItem(PLAYTEST_STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      });
    }
    await this.writeQueue;
  }

  /** Returns a consistent snapshot of stored events. */
  async snapshot(): Promise<PlaytestEvent[]> {
    await this.flush();
    const raw = await this.storage.getItem(PLAYTEST_STORAGE_KEY).catch(() => null);
    return raw === null ? [] : readEvents(raw);
  }

  /**
   * Clears stored events. In-flight writes from before the clear are skipped
   * via the generation counter, and the stored key is removed after the write
   * queue drains. Events appended after clear() resolves survive.
   */
  async clear(): Promise<void> {
    this.pending = [];
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.generation += 1;
    this.writeQueue = this.writeQueue.then(() => this.storage.removeItem(PLAYTEST_STORAGE_KEY).catch(() => undefined));
    await this.writeQueue;
  }
}
