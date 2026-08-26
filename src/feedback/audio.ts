/**
 * Audio service: plays the locally bundled sound effects through expo-audio.
 *
 * Ownership and cleanup:
 *  - One player is created per sound and kept for the app lifetime.
 *  - Players are created lazily on first use, so nothing blocks the first
 *    playable screen.
 *  - `release()` releases every player and cancels every pending delayed sound
 *    (delays are tracked independently, so one layered sound cannot overwrite
 *    another's timer).
 *
 * Failure safety:
 *  - Every native call is promise-safe: synchronous throws are caught and any
 *    returned promise gets a rejection handler, so audio can never produce an
 *    unhandled rejection or block gameplay.
 *  - Repeated playback of the same sound is throttled per sound to prevent
 *    uncontrolled overlap during rapid tapping.
 */

import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import type { SoundName } from "./mapping.ts";
import { TimerSet } from "./timers.ts";

export const SOUND_ASSETS: Record<SoundName, number> = {
  "needle-pierce": require("../../assets/sounds/needle-pierce.wav"),
  "thread-tighten": require("../../assets/sounds/thread-tighten.wav"),
  "hoop-flip": require("../../assets/sounds/hoop-flip.wav"),
  "invalid-stitch": require("../../assets/sounds/invalid-stitch.wav"),
  undo: require("../../assets/sounds/undo.wav"),
  hint: require("../../assets/sounds/hint.wav"),
  "level-complete": require("../../assets/sounds/level-complete.wav"),
  "next-level-unlock": require("../../assets/sounds/next-level-unlock.wav"),
  "gallery-selection": require("../../assets/sounds/gallery-selection.wav")
};

const MIN_REPEAT_INTERVAL_MS = 60;

export type AudioService = {
  play(name: SoundName, delayMs?: number): void;
  release(): void;
};

/**
 * Invokes a native call safely: catches synchronous throws and attaches a
 * rejection handler to any returned promise.
 */
function safeInvoke(call: () => unknown): void {
  try {
    const result = call();
    if (result && typeof (result as PromiseLike<unknown>).then === "function") {
      (result as PromiseLike<unknown>).then(undefined, () => undefined);
    }
  } catch {
    // Audio failure must never block gameplay.
  }
}

export function createAudioService(): AudioService {
  const players = new Map<SoundName, AudioPlayer>();
  const lastPlayedAt = new Map<SoundName, number>();
  const delayed = new TimerSet();
  let released = false;

  function playerFor(name: SoundName): AudioPlayer | null {
    if (released) return null;
    let player = players.get(name);
    if (player) return player;
    try {
      player = createAudioPlayer(SOUND_ASSETS[name]);
      players.set(name, player);
      return player;
    } catch {
      return null;
    }
  }

  function playNow(name: SoundName): void {
    if (released) return;
    const now = Date.now();
    const last = lastPlayedAt.get(name) ?? 0;
    if (now - last < MIN_REPEAT_INTERVAL_MS) return;
    lastPlayedAt.set(name, now);

    const player = playerFor(name);
    if (!player) return;
    safeInvoke(() => player.seekTo(0));
    safeInvoke(() => player.play());
  }

  function play(name: SoundName, delayMs = 0): void {
    if (released) return;
    if (delayMs > 0) {
      delayed.schedule(() => playNow(name), delayMs);
      return;
    }
    playNow(name);
  }

  function release(): void {
    released = true;
    delayed.clearAll();
    for (const player of players.values()) {
      safeInvoke(() => player.release());
    }
    players.clear();
  }

  return { play, release };
}
