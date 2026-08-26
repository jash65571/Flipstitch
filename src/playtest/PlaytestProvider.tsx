/**
 * Playtest provider.
 *
 * Owns one PlaytestTracker per app launch, records the app session start, and
 * exposes tracking to screens. All data stays on the device in the bounded
 * AsyncStorage store. Nothing here performs network requests.
 */

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

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
};

const PlaytestContext = createContext<PlaytestContextValue | null>(null);

export function PlaytestProvider({ children }: { children: ReactNode }) {
  const trackerRef = useRef<PlaytestTracker | null>(null);
  if (trackerRef.current === null) {
    trackerRef.current = new PlaytestTracker(new PlaytestEventStore());
  }

  useEffect(() => {
    // startSession is idempotent per tracker (deduplicated by trackOnce), so
    // React StrictMode double-mounts in development cannot record two
    // "app session started" events for one app launch.
    trackerRef.current?.startSession();

    // Flush buffered events when the app backgrounds so playtest data survives
    // a suspension or kill, and flush once more on provider teardown.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void trackerRef.current?.flush();
      }
    });
    return () => {
      subscription.remove();
      void trackerRef.current?.flush();
    };
  }, []);

  // The value object is created exactly once. Recreating it on state changes
  // would give screens a new reference on every render and re-trigger effects
  // that depend on the playtest context. Event counts are derived on demand
  // through loadEvents() instead of being pushed through context.
  const value = useMemo<PlaytestContextValue>(() => {
    const tracker = trackerRef.current;
    if (!tracker) {
      throw new Error("PlaytestTracker is unavailable.");
    }
    return {
      track: (input) => tracker.track(input),
      trackOnce: (input) => tracker.trackOnce(input),
      sessionId: tracker.getSessionId(),
      loadEvents: () => tracker.snapshot(),
      clearEvents: () => tracker.clear()
    };
  }, []);

  return <PlaytestContext.Provider value={value}>{children}</PlaytestContext.Provider>;
}

export function usePlaytest(): PlaytestContextValue {
  const value = useContext(PlaytestContext);
  if (!value) throw new Error("usePlaytest must be used inside PlaytestProvider.");
  return value;
}
