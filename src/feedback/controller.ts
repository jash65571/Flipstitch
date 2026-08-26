/**
 * Feedback controller: the single place where semantic gameplay events become
 * sound and haptic feedback.
 *
 * The audio and haptic services are injected so the mapping and preference
 * handling can be unit tested without a device. The app wires the real
 * services in FeedbackProvider.
 */

import {
  HAPTIC_GROUP_COOLDOWN_MS,
  planForEvent,
  type FeedbackEvent,
  type HapticKind,
  type SoundName
} from "./mapping.ts";

export type FeedbackSettings = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

export type AudioService = {
  play(name: SoundName, delayMs?: number): void;
  release(): void;
};

export type HapticService = {
  fire(kind: HapticKind): void;
};

export class FeedbackController {
  private readonly audio: AudioService;
  private readonly haptics: HapticService;
  private readonly getSettings: () => FeedbackSettings;
  private lastHaptic: { group: string; at: number } | null = null;

  constructor(audio: AudioService, haptics: HapticService, getSettings: () => FeedbackSettings) {
    this.audio = audio;
    this.haptics = haptics;
    this.getSettings = getSettings;
  }

  emit(event: FeedbackEvent, now = Date.now()): void {
    const plan = planForEvent(event);
    const { soundEnabled, hapticsEnabled } = this.getSettings();

    if (soundEnabled) {
      for (const sound of plan.sounds) {
        this.audio.play(sound.name, sound.delayMs ?? 0);
      }
    }

    if (!hapticsEnabled || !plan.haptic) return;

    const cooldown = HAPTIC_GROUP_COOLDOWN_MS[plan.hapticGroup] ?? 0;
    const fired = this.lastHaptic;
    if (fired && fired.group === plan.hapticGroup && now - fired.at < cooldown) {
      // One action fired this group already; do not double the haptic.
      return;
    }
    this.haptics.fire(plan.haptic);
    this.lastHaptic = { group: plan.hapticGroup, at: now };
  }

  release(): void {
    this.audio.release();
  }
}
