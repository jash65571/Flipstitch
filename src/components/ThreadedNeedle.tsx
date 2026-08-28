import { memo } from "react";
import Svg, { Defs, Ellipse, Line, LinearGradient, Path, Stop } from "react-native-svg";

import { colors } from "@/theme/tokens";

/**
 * The needle's tip is anchored at this fixed point within its own local
 * canvas (as a ratio of `canvasSize`). Callers position the canvas — never
 * the tip — so the tip can be pinned exactly to a board coordinate by
 * offsetting the canvas by `-tipX, -tipY`. See `NEEDLE_TIP_RATIO` and
 * `src/game/boardGeometry.ts#needleTipFor`.
 */
const TIP_X_RATIO = 0.34;
const TIP_Y_RATIO = 0.78;

export const NEEDLE_TIP_RATIO = { x: TIP_X_RATIO, y: TIP_Y_RATIO };

export type ThreadedNeedleProps = {
  /** Local canvas size in px (square). */
  canvasSize: number;
  /** The direction (degrees) the needle just travelled *from*. The shaft
   *  trails in the opposite direction, so the needle visibly points back
   *  along the thread it just pulled through rather than sitting at an
   *  arbitrary fixed tilt. */
  angleDeg: number;
  threadColor: string;
  threadDeep: string;
};

/**
 * A physically legible needle: metal shaft, a visible eye, and one
 * continuous working-thread path that starts at the tip (the fabric hole
 * the needle just pierced), runs alongside the shaft, passes through the
 * eye, and ends in a short loose tail. Every segment has a physical
 * reason — there is no decorative, disconnected curve.
 */
function ThreadedNeedleView({ canvasSize, angleDeg, threadColor, threadDeep }: ThreadedNeedleProps) {
  const tipX = canvasSize * TIP_X_RATIO;
  const tipY = canvasSize * TIP_Y_RATIO;
  const trailRad = ((angleDeg + 180) * Math.PI) / 180;
  const dirX = Math.cos(trailRad);
  const dirY = Math.sin(trailRad);

  const shaftLen = canvasSize * 0.6;
  const eyeLen = canvasSize * 0.48;
  const tailLen = canvasSize * 0.68;
  // Perpendicular offset used only to give the loose thread tail a gentle
  // curl past the eye, so it reads as slack rather than a rigid extension.
  const perpX = -dirY;
  const perpY = dirX;

  const shaftEndX = tipX + dirX * shaftLen;
  const shaftEndY = tipY + dirY * shaftLen;
  const eyeX = tipX + dirX * eyeLen;
  const eyeY = tipY + dirY * eyeLen;
  const tailX = tipX + dirX * tailLen + perpX * canvasSize * 0.12;
  const tailY = tipY + dirY * tailLen + perpY * canvasSize * 0.12;
  const curlX = tipX + dirX * (eyeLen + canvasSize * 0.08) + perpX * canvasSize * 0.16;
  const curlY = tipY + dirY * (eyeLen + canvasSize * 0.08) + perpY * canvasSize * 0.16;

  return (
    <Svg width={canvasSize} height={canvasSize} pointerEvents="none">
      <Defs>
        <LinearGradient id="needleMetal" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.48" stopColor="#B9C0C8" />
          <Stop offset="1" stopColor="#626A75" />
        </LinearGradient>
      </Defs>

      {/* Working thread: fabric hole (tip) -> alongside the shaft -> through
          the eye -> a short loose tail. One continuous, physically-motivated
          path; nothing here is decorative. */}
      <Path
        d={`M ${tipX} ${tipY} L ${eyeX} ${eyeY} Q ${curlX} ${curlY} ${tailX} ${tailY}`}
        fill="none"
        stroke={threadColor}
        strokeWidth={canvasSize * 0.045}
        strokeLinecap="round"
      />

      {/* Soft drop shadow under the shaft. */}
      <Line
        x1={tipX + canvasSize * 0.014}
        y1={tipY + canvasSize * 0.022}
        x2={shaftEndX + canvasSize * 0.014}
        y2={shaftEndY + canvasSize * 0.022}
        stroke={colors.ink}
        strokeWidth={canvasSize * 0.052}
        strokeLinecap="round"
        opacity={0.16}
      />

      {/* Metal shaft, tip pinned at (tipX, tipY). */}
      <Line
        x1={tipX}
        y1={tipY}
        x2={shaftEndX}
        y2={shaftEndY}
        stroke="url(#needleMetal)"
        strokeWidth={canvasSize * 0.036}
        strokeLinecap="round"
      />

      {/* Eye, with the thread visibly passing through it. */}
      <Ellipse
        cx={eyeX}
        cy={eyeY}
        rx={canvasSize * 0.018}
        ry={canvasSize * 0.036}
        fill={threadDeep}
        transform={`rotate(${angleDeg} ${eyeX} ${eyeY})`}
      />
      <Ellipse
        cx={eyeX}
        cy={eyeY}
        rx={canvasSize * 0.008}
        ry={canvasSize * 0.02}
        fill="none"
        stroke={colors.linen}
        strokeWidth={canvasSize * 0.006}
        opacity={0.9}
        transform={`rotate(${angleDeg} ${eyeX} ${eyeY})`}
      />
    </Svg>
  );
}

export const ThreadedNeedle = memo(ThreadedNeedleView);
