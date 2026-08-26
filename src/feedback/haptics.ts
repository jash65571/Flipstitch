/**
 * Haptic service.
 *
 * Uses the platform-recommended expo-haptics APIs:
 *  - Android: performAndroidHapticsAsync, which uses the device haptics engine
 *    and (per Expo docs) is preferred over the Vibrator-based impact APIs.
 *  - iOS/web: the UIImpactFeedbackGenerator / UINotificationFeedbackGenerator
 *    family (impactAsync, notificationAsync, selectionAsync).
 *
 * All calls fail safely: no haptic ever throws into gameplay, and unsupported
 * devices simply produce nothing.
 */

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import type { HapticKind } from "./mapping.ts";

export type HapticService = {
  fire(kind: HapticKind): void;
};

const ANDROID_KIND: Record<HapticKind, Haptics.AndroidHaptics> = {
  light: Haptics.AndroidHaptics.Clock_Tick,
  soft: Haptics.AndroidHaptics.Segment_Tick,
  warning: Haptics.AndroidHaptics.Reject,
  restrained: Haptics.AndroidHaptics.Segment_Tick,
  attention: Haptics.AndroidHaptics.Clock_Tick,
  success: Haptics.AndroidHaptics.Confirm,
  unlock: Haptics.AndroidHaptics.Confirm
};

function fireIos(kind: HapticKind): Promise<void> | undefined {
  switch (kind) {
    case "light":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case "soft":
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    case "warning":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case "restrained":
    case "attention":
      return Haptics.selectionAsync();
    case "success":
    case "unlock":
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export function createHapticService(): HapticService {
  return {
    fire(kind: HapticKind): void {
      try {
        if (Platform.OS === "android") {
          void Haptics.performAndroidHapticsAsync(ANDROID_KIND[kind]).catch(() => undefined);
        } else {
          void fireIos(kind)?.catch(() => undefined);
        }
      } catch {
        // Unsupported devices must fail safely.
      }
    }
  };
}
