/**
 * Pure board geometry: the single source of truth for where a hole, the
 * needle, and a Through-Cloth Peek pattern land on screen.
 *
 * Before Milestone 10 this math lived inline in `HoopBoard.tsx` as a single
 * `pointFor(node, side, size)` helper, duplicated per call-site (once for
 * the play layer at full `size`, once for the old floating Peek panel at
 * `size * 0.86`). That duplication is exactly how the two layers drifted
 * out of alignment. Every layer that needs a hole's screen position must
 * now call one of the functions below instead of recomputing the mirror
 * math locally.
 */
import type { GameState, Level, Side, StitchHole } from "./types.ts";

export type Point = { x: number; y: number };

const HOLE_INSET_RATIO = 0.105;

/**
 * Projects a hole's authored 0-100 x/y into board-pixel space for a given
 * viewing side. A hoop viewed from behind reverses left/right, not up/down,
 * so the back side mirrors `x` only (`100 - x`); `y` is identical on both
 * sides. This is the one physical mirror rule in the whole app.
 */
export function projectForSide(hole: StitchHole, side: Side, size: number): Point {
  const inset = size * HOLE_INSET_RATIO;
  const inner = size - inset * 2;
  const x = side === "front" ? hole.x : 100 - hole.x;
  return {
    x: inset + (x / 100) * inner,
    y: inset + (hole.y / 100) * inner
  };
}

/**
 * Through-Cloth Peek projection.
 *
 * Peek does not turn the hoop. The player is looking through the fabric
 * they are already facing at the pattern stitched underneath it — like
 * holding embroidery over a lightbox. Nothing about *where a hole sits on
 * screen* changes; only *which side's pattern* is drawn there changes.
 *
 * So a peeked hole's screen position is deliberately identical to its
 * position under the side the player is actually viewing right now
 * (`viewingSide`, always `game.activeSide`) — never the peeked side's own
 * mirrored projection. This is asserted exactly, per hole, per production
 * level, in boardGeometry.test.ts. See docs/NEEDLE-INTERACTION.md, "Real
 * flip vs. Through-Cloth Peek," for why the two must never be conflated.
 */
export function projectThroughFabric(hole: StitchHole, viewingSide: Side, size: number): Point {
  return projectForSide(hole, viewingSide, size);
}

export function holeById(level: Level, id: string): StitchHole {
  const hole = level.holes.find((candidate) => candidate.id === id);
  if (!hole) {
    throw new Error(`Unknown hole id: ${id}`);
  }
  return hole;
}

/**
 * Hard invariant: the needle tip always sits exactly on `game.currentHole`,
 * projected on the side the needle is actually on (`game.activeSide`). No
 * layer may offset this point "for visual convenience" — see Goal 1/40.
 */
export function needleTipFor(level: Level, game: GameState, size: number): Point {
  return projectForSide(holeById(level, game.currentHole), game.activeSide, size);
}

/** Fallback shaft angle for the very first frame, before any stitch exists. */
export const DEFAULT_NEEDLE_ANGLE_DEG = -42;

export type NeedlePose = { tip: Point; angleDeg: number };

/**
 * A deterministic, physically-motivated needle pose: the tip is pinned to
 * `currentHole` (see `needleTipFor`); the shaft angle follows the vector of
 * the most recent stitch, so the needle visibly points back along the
 * thread it just pulled through rather than sitting at an arbitrary fixed
 * tilt. Before any stitch exists it uses `DEFAULT_NEEDLE_ANGLE_DEG` so the
 * opening frame still reads as an intentional pose, not a dropped needle.
 */
export function needlePoseFor(level: Level, game: GameState, size: number): NeedlePose {
  const tip = needleTipFor(level, game, size);
  const lastMove = game.moves.at(-1);
  if (!lastMove) {
    return { tip, angleDeg: DEFAULT_NEEDLE_ANGLE_DEG };
  }

  const fromPoint = projectForSide(holeById(level, lastMove.from), game.activeSide, size);
  const dx = tip.x - fromPoint.x;
  const dy = tip.y - fromPoint.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { tip, angleDeg: DEFAULT_NEEDLE_ANGLE_DEG };
  }

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { tip, angleDeg };
}
