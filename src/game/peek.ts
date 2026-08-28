/**
 * Peek: the read-only "what's on the other side" inspection.
 *
 * This is deliberately a separate, tiny state machine from `GameState`
 * (src/game/types.ts). Milestone 8's Preview blurred the two into one
 * `visibleSide = previewSide ?? game.activeSide` value, which let the board
 * show a side the game state disagreed with ("Back side..." copy under a
 * hoop rendering FRONT). Keeping `PeekState` structurally separate from
 * `GameState` makes that contradiction impossible to reintroduce: nothing
 * here can read or write `activeSide`, `currentHole`, `moves`, or
 * `usedEdges`.
 *
 * The real game state — which side the needle is actually on — is always
 * `GameState.activeSide`. Peek never changes it. A screen combines the two
 * only for display: the board always renders `game.activeSide` as the live,
 * interactive layer, and layers a read-only Through-Cloth overlay on top of
 * the SAME hoop bounds when `peekSide` is non-null. See
 * `docs/NEEDLE-INTERACTION.md` for the geometry and
 * `docs/PREVIEW-INTERACTION.md` for how Milestone 8.1's floating panel gave
 * way to Milestone 10's through-cloth model — the state-separation rule
 * below did not change, only the visual it drives.
 */
import type { Side } from "./types.ts";

export type DisplayMode = "playing" | "peeking";

/** `null` means the player is not peeking; otherwise the side being inspected. */
export type PeekState = Side | null;

export function displayMode(peekSide: PeekState): DisplayMode {
  return peekSide === null ? "playing" : "peeking";
}

/** Peek always shows the side the player is *not* actively stitching on. */
export function togglePeek(activeSide: Side, peekSide: PeekState): PeekState {
  return peekSide === null ? oppositeOf(activeSide) : null;
}

function oppositeOf(side: Side): Side {
  return side === "front" ? "back" : "front";
}

function sideLabel(side: Side): string {
  return side === "front" ? "Front" : "Back";
}

/** Always-anchored status: the true, current game state. Never says PEEKING. */
export function playingStatus(activeSide: Side): string {
  return `PLAYING · ${sideLabel(activeSide).toUpperCase()}`;
}

/** Only rendered while `peekSide` is non-null. Never replaces `playingStatus`.
 *  Kept distinct from `peekThroughStatus` (the on-board pill copy): this is
 *  used in accessibility strings that read fine as full sentences. */
export function peekingStatus(peekSide: PeekState): string | null {
  return peekSide === null ? null : `PEEKING · ${sideLabel(peekSide).toUpperCase()}`;
}

/** The single on-board pill shown while peeking. Replaces Milestone 8.1's
 *  two-pill stack (`PEEKING · <side>` + `Needle stays on <side>`): the
 *  through-cloth visual — same hoop, aligned holes, the real needle still
 *  visible — now carries most of that meaning, so the label only needs to
 *  name what is being seen, not re-explain the mechanic. */
export function peekThroughStatus(peekSide: Side): string {
  return `SEEING ${sideLabel(peekSide).toUpperCase()} THROUGH CLOTH`;
}

/** Toolbar control label. Dynamic so the action it performs is always named.
 *  Idle offers to open Peek; active offers to close it. "Close Peek" (not
 *  "Return to <side>") because Through-Cloth Peek never moved the player
 *  anywhere to return from — the hoop never turned. */
export function peekControlLabel(activeSide: Side, peekSide: PeekState): string {
  if (peekSide === null) {
    return `Peek ${sideLabel(oppositeOf(activeSide))}`;
  }
  return "Close Peek";
}

/** The anchored, non-actionable needle note shown on the Peek panel. */
export function needleAnchorNote(activeSide: Side): string {
  return `Needle stays on ${sideLabel(activeSide)}`;
}

export function peekEnterAnnouncement(peekSide: Side, activeSide: Side): string {
  return `Viewing ${sideLabel(peekSide)} through the fabric. Needle remains on ${sideLabel(activeSide)}. Read-only.`;
}

export function peekExitAnnouncement(activeSide: Side): string {
  return `Peek closed. Continue stitching on ${sideLabel(activeSide)}.`;
}
