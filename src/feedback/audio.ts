/**
 * Audio service: plays the locally bundled sound effects through expo-audio.
 *
 * Ownership and cleanup:
 *  - One player is created per sound and kept for the app lifetime.
 *  - Players are created lazily on first use, so nothing blocks the first
 *    playable screen.
 *  - `release()` releases every player (called when the feedback controller
 *    is torn down). After release all playback becomes a no-op.
 *
 * Failure safety:
 *  - Every play is wrapped so audio problems can never throw into gameplay.
 *  - Repeated playback of the same sound is throttled per sound to prevent
 *    uncontrolled overlap during rapid tapping.
 *  - Layered sounds (e.g. thread-tighten after needle-pierce) are scheduled
 *    with a guarded timer.
 */

import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import type { SoundName } from "./mapping.ts";

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

export function createAudioService(): AudioService {
  const players = new Map<SoundName, AudioPlayer>();
  const lastPlayedAt = new Map<SoundName, number>();
  let released = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

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
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Audio failure must never block gameplay.
    }
  }

  function play(name: SoundName, delayMs = 0): void {
    if (released) return;
    if (delayMs > 0) {
      timer = setTimeout(() => {
        timer = null;
        playNow(name);
      }, delayMs);
      return;
    }
    playNow(name);
  }

  function release(): void {
    released = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    for (const player of players.values()) {
      try {
        player.release();
      } catch {
        // Ignore release failures.
      }
    }
    players.clear();
  }

  return { play, release };
}
