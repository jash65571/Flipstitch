/**
 * Playtest provider.
 *
 * Owns one PlaytestTracker per app launch, records the app session start, and
 * exposes tracking to screens. All data stays on the device in the bounded
 * AsyncStorage store. Nothing here performs network requests.
 */

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { PlaytestEvent } from "@/playtest/events";
import { PlaytestEventStore } from "@/playtest/store";
import { PlaytestTracker, type TrackInput } from "@/playtest/tracker";

type PlaytestContextValue = {
  track: (input: TrackInput) => void;
  trackOnce: (input: TrackInput) => boolean;
  /** Session id for the current app launch. */
  sessionId: string;
  /** Snapshot of stored events (flushes pending writes first). */
  loadEvents: () => Promise<PlaytestEvent[]>;
  clearEvents: () => Promise<void>;
  /** Bounded event count for the Settings screen. */
  eventCount: number | null;
};

const PlaytestContext = createContext<PlaytestContextValue | null>(null);

export function PlaytestProvider({ children }: { children: ReactNode }) {
  const [eventCount, setEventCount] = useState<number | null>(null);
  const trackerRef = useRef<PlaytestTracker | null>(null);
  if (trackerRef.current === null) {
    trackerRef.current = new PlaytestTracker(new PlaytestEventStore());
  }

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    // Guarded at module scope so React remounts in development cannot create
    // duplicate "app session started" events for one app launch.
    tracker.startSession();
    void tracker.snapshot().then((events) => setEventCount(events.length));
  }, []);

  const value = useMemo<PlaytestContextValue>(() => {
    const tracker = trackerRef.current;
    if (!tracker) {
      throw new Error("PlaytestTracker is unavailable.");
    }
    return {
      track: (input) => {
        tracker.track(input);
        setEventCount((current) => (current === null ? current : current + 1));
      },
      trackOnce: (input) => {
        const recorded = tracker.trackOnce(input);
        if (recorded) {
          setEventCount((current) => (current === null ? current : current + 1));
        }
        return recorded;
      },
      sessionId: tracker.getSessionId(),
      loadEvents: async () => {
        const events = await tracker.snapshot();
        setEventCount(events.length);
        return events;
      },
      clearEvents: async () => {
        await tracker.clear();
        setEventCount(0);
      },
      eventCount
    };
  }, [eventCount]);

  return <PlaytestContext.Provider value={value}>{children}</PlaytestContext.Provider>;
}

export function usePlaytest(): PlaytestContextValue {
  const value = useContext(PlaytestContext);
  if (!value) throw new Error("usePlaytest must be used inside PlaytestProvider.");
  return value;
}
