/**
 * Feedback provider.
 *
 * Creates the single feedback controller for the app, wiring it to the real
 * audio service (expo-audio), the platform haptic service (expo-haptics), and
 * the persisted sound/haptic preferences. Audio players are created lazily on
 * first play, so nothing delays the first playable screen.
 */

import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from "react";

import { createAudioService } from "@/feedback/audio";
import { FeedbackController } from "@/feedback/controller";
import { createHapticService } from "@/feedback/haptics";
import type { FeedbackEvent } from "@/feedback/mapping";
import { useSettings } from "@/settings/SettingsProvider";

type FeedbackContextValue = {
  emit: (event: FeedbackEvent) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const controllerRef = useRef<FeedbackController | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  if (controllerRef.current === null) {
    controllerRef.current = new FeedbackController(
      createAudioService(),
      createHapticService(),
      () => ({
        soundEnabled: settingsRef.current.soundEnabled,
        hapticsEnabled: settingsRef.current.hapticsEnabled
      })
    );
  }

  useEffect(() => {
    return () => {
      controllerRef.current?.release();
      controllerRef.current = null;
    };
  }, []);

  const value = useMemo<FeedbackContextValue>(
    () => ({
      emit: (event) => controllerRef.current?.emit(event)
    }),
    []
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

export function useFeedback(): FeedbackContextValue {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("useFeedback must be used inside FeedbackProvider.");
  return value;
}
