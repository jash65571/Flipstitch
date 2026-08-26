/**
 * Semantic feedback events and their pure mapping to sound and haptic plans.
 *
 * Gameplay code emits semantic events (stitchPlaced, invalidMove, ...) and the
 * feedback controller decides which sounds and haptics to play. Screens never
 * choose raw sound filenames or platform haptic constants.
 */

export type FeedbackEvent =
  | "stitchPlaced"
  | "sideChanged"
  | "invalidMove"
  | "undo"
  | "hint"
  | "levelCompleted"
  | "levelUnlocked"
  | "gallerySelected";

export type SoundName =
  | "needle-pierce"
  | "thread-tighten"
  | "hoop-flip"
  | "invalid-stitch"
  | "undo"
  | "hint"
  | "level-complete"
  | "next-level-unlock"
  | "gallery-selection";

/** Abstract haptic kinds; the platform adapter maps these to native APIs. */
export type HapticKind =
  | "light"
  | "soft"
  | "warning"
  | "restrained"
  | "attention"
  | "success"
  | "unlock";

export type PlannedSound = {
  name: SoundName;
  /** Delay in ms before the sound plays, for layered combinations. */
  delayMs?: number;
};

export type FeedbackPlan = {
  sounds: PlannedSound[];
  haptic: HapticKind | null;
  /**
   * Events that belong to the same action share a group. When an event fires
   * haptics for a group that already fired within the group cooldown, the
   * haptic is skipped to avoid double feedback for one action.
   */
  hapticGroup: string;
};

export const FEEDBACK_MAP: Record<FeedbackEvent, FeedbackPlan> = {
  // A valid stitch: needle pierces immediately, thread tightens right after.
  stitchPlaced: {
    sounds: [
      { name: "needle-pierce" },
      { name: "thread-tighten", delayMs: 90 }
    ],
    haptic: "light",
    hapticGroup: "stitch"
  },
  // The hoop flips to the other side. After a stitch this is the same action,
  // so its haptic is deduplicated with the stitch's light tick.
  sideChanged: {
    sounds: [{ name: "hoop-flip" }],
    haptic: "soft",
    hapticGroup: "stitch"
  },
  invalidMove: {
    sounds: [{ name: "invalid-stitch" }],
    haptic: "warning",
    hapticGroup: "invalid"
  },
  undo: {
    sounds: [{ name: "undo" }],
    haptic: "restrained",
    hapticGroup: "tool"
  },
  hint: {
    sounds: [{ name: "hint" }],
    haptic: "attention",
    hapticGroup: "tool"
  },
  levelCompleted: {
    sounds: [{ name: "level-complete" }],
    haptic: "success",
    hapticGroup: "completion"
  },
  // Completion unlocks the next level in the same moment; the unlock haptic is
  // deduplicated so the player feels one strong success, not two.
  levelUnlocked: {
    sounds: [{ name: "next-level-unlock" }],
    haptic: "unlock",
    hapticGroup: "completion"
  },
  gallerySelected: {
    sounds: [{ name: "gallery-selection" }],
    haptic: "light",
    hapticGroup: "tool"
  }
};

/** Cooldown per haptic group in ms. */
export const HAPTIC_GROUP_COOLDOWN_MS: Record<string, number> = {
  stitch: 150,
  invalid: 150,
  tool: 100,
  completion: 500
};

export function planForEvent(event: FeedbackEvent): FeedbackPlan {
  return FEEDBACK_MAP[event];
}
