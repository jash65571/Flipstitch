/**
 * Tracks any number of delayed timers so they can all be cancelled together.
 *
 * The audio service schedules layered sounds (e.g. thread-tighten after
 * needle-pierce); with a single timer reference, a second delayed sound would
 * overwrite the first and leak it. TimerSet keeps every timer so release()
 * clears them all.
 */

export class TimerSet {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Schedules a callback; the timer is forgotten once it fires. */
  schedule(callback: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delayMs);
    this.timers.add(timer);
  }

  /** Cancels every pending timer. Safe to call more than once. */
  clearAll(): void {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  get size(): number {
    return this.timers.size;
  }
}
