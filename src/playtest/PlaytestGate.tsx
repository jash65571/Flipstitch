/**
 * Playtest consent gate.
 *
 * In a normal consumer build this component is a pass-through and renders its
 * children immediately — there is no extra frame, no extra state, and nothing
 * about the launch experience changes.
 *
 * In a playtest build it holds the app on the disclosure until the tester has
 * chosen. That is why nothing can be recorded before consent: the game is not
 * mounted yet, so no gameplay event can exist to be recorded.
 */

import type { ReactNode } from "react";

import { usePlaytest } from "@/playtest/PlaytestProvider";
import { PlaytestConsentScreen } from "@/screens/PlaytestConsentScreen";

export function PlaytestGate({ children }: { children: ReactNode }) {
  const playtest = usePlaytest();

  if (!playtest.mode.playtestMode) return <>{children}</>;
  // Storage has not answered yet. Rendering nothing for this frame keeps the
  // splash screen up rather than flashing the game and then the disclosure.
  if (!playtest.ready) return null;
  if (playtest.consent === "unknown") {
    return (
      <PlaytestConsentScreen
        onAccept={() => void playtest.grantConsent()}
        onDecline={() => void playtest.declineConsent()}
      />
    );
  }
  return <>{children}</>;
}
