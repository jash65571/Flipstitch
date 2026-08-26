/**
 * Pure two-tap confirmation state machine.
 *
 * Destructive actions (clear playtest data, reset progress) require two taps:
 * the first arms the button, the second confirms. While the confirmed action's
 * async work is in flight the state is `busy`, so a second press cannot
 * double-execute. The armed state expires after a timeout (the component owns
 * the timer and clears it on unmount).
 */

export type ConfirmState = {
  armed: boolean;
  busy: boolean;
};

export const initialConfirmState: ConfirmState = { armed: false, busy: false };

/** First tap arms; second tap confirms (busy until the action finishes). */
export function pressConfirm(state: ConfirmState): ConfirmState {
  if (state.busy) return state;
  if (!state.armed) return { armed: true, busy: false };
  return { armed: false, busy: true };
}

/** Called when the confirmed action resolves or rejects. */
export function confirmFinished(state: ConfirmState): ConfirmState {
  return { armed: false, busy: false };
}

/** Called when the armed timeout fires. Busy work is never interrupted. */
export function confirmExpired(state: ConfirmState): ConfirmState {
  return state.busy ? state : { armed: false, busy: false };
}
