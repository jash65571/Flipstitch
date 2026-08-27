import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop
} from "react-native-svg";

import { availableNodes, edgeKey } from "@/game/engine";
import { targetEdges } from "@/game/solver";
import type { GameState, GuidanceLevel, Level, Side, StitchHole } from "@/game/types";
import { decorativeSvgA11yProps } from "@/components/decorativeA11y";
import { colors, radius, thread, type } from "@/theme/tokens";

type HoopBoardProps = {
  level: Level;
  game: GameState;
  visibleSide: Side;
  size: number;
  /** Stage-3 hint: the single exact hole, ringed. */
  hintNode: string | null;
  /** Stage-2 hint: the branch of candidate holes, softly marked. */
  regionHoles?: string[];
  /** Controls how much the board pre-highlights legal destinations. */
  guidance?: GuidanceLevel;
  previewing: boolean;
  interactionDisabled?: boolean;
  onNodePress: (nodeId: string) => void;
};

function pointFor(node: StitchHole, side: Side, size: number) {
  const inset = size * 0.105;
  const inner = size - inset * 2;
  const x = side === "front" ? node.x : 100 - node.x;
  return {
    x: inset + (x / 100) * inner,
    y: inset + (node.y / 100) * inner
  };
}

function HoopBoardView({
  level,
  game,
  visibleSide,
  size,
  hintNode,
  regionHoles,
  guidance = "full",
  previewing,
  interactionDisabled = false,
  onNodePress
}: HoopBoardProps) {
  const nodeById = useMemo(() => new Map(level.holes.map((hole) => [hole.id, hole])), [level.holes]);
  const validTargets = useMemo(() => new Set(availableNodes(level, game)), [game, level]);
  const regionSet = useMemo(() => new Set(regionHoles ?? []), [regionHoles]);
  const sideThread = visibleSide === "front" ? thread.front : thread.back;
  const threadColor = sideThread.core;
  const threadDeep = sideThread.deep;
  const softColor = sideThread.soft;
  const currentPoint = pointFor(nodeById.get(game.currentHole)!, visibleSide, size);
  const showNeedle = !previewing && visibleSide === game.activeSide;
  const onActiveSide = !previewing && visibleSide === game.activeSide;
  // Full guidance glows every legal destination (teaching levels). Reduced and
  // minimal guidance stop pre-highlighting; the player reads the pattern. A
  // staged region hint still reveals its branch regardless of guidance. The
  // dashed back stitches are the shape cue for the back; front stays solid.
  const showAllTargets = guidance === "full";
  const dashOpacity = guidance === "minimal" ? 0.5 : 1;

  return (
    <View
      accessible={false}
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: threadDeep
        }
      ]}
    >
      <Svg width={size} height={size} pointerEvents="none" {...decorativeSvgA11yProps}>
        <Defs>
          <Pattern id="weave" width="8" height="8" patternUnits="userSpaceOnUse">
            <Rect width="8" height="8" fill={colors.cloth} />
            <Line x1="0" y1="1" x2="8" y2="1" stroke={colors.linenShadow} strokeWidth="0.65" opacity="0.42" />
            <Line x1="0" y1="5" x2="8" y2="5" stroke={colors.linenDeep} strokeWidth="0.5" opacity="0.3" />
            <Line x1="1" y1="0" x2="1" y2="8" stroke={colors.linenShadow} strokeWidth="0.55" opacity="0.32" />
            <Line x1="5" y1="0" x2="5" y2="8" stroke={colors.linenDeep} strokeWidth="0.45" opacity="0.26" />
          </Pattern>
          <LinearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.woodLight} />
            <Stop offset="0.48" stopColor={colors.wood} />
            <Stop offset="1" stopColor={colors.woodDark} />
          </LinearGradient>
          <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.48" stopColor="#B9C0C8" />
            <Stop offset="1" stopColor="#626A75" />
          </LinearGradient>
          <RadialGradient id="clothShade" cx="42%" cy="35%" r="66%">
            <Stop offset="0.68" stopColor={colors.cloth} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.linenShadow} stopOpacity="0.4" />
          </RadialGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2 + size * 0.025} r={size * 0.475} fill={colors.woodDark} opacity={0.25} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.468} fill="url(#wood)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.446} fill="none" stroke={colors.woodLight} strokeWidth={size * 0.012} opacity={0.8} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.41} fill="url(#weave)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.41} fill="url(#clothShade)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.412} fill="none" stroke={colors.woodDark} strokeWidth={size * 0.012} opacity={0.58} />
        {/* Thread-tension ring on the inner rim: dyes the hoop to the active
            side so a flip is legible on the wood itself, not just the label.
            Solid for the front, dashed for the back — shape, not only hue. */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.398}
          fill="none"
          stroke={threadColor}
          strokeWidth={size * 0.01}
          strokeLinecap="round"
          opacity={previewing ? 0.32 : 0.68}
          strokeDasharray={visibleSide === "back" ? `${size * 0.02} ${size * 0.026}` : undefined}
        />
        <Path
          d={`M ${size * 0.17} ${size * 0.27} A ${size * 0.39} ${size * 0.39} 0 0 1 ${size * 0.68} ${size * 0.105}`}
          fill="none"
          stroke={colors.white}
          strokeWidth={size * 0.012}
          strokeLinecap="round"
          opacity={0.22}
        />

        <Rect x={size * 0.44} y={size * 0.006} width={size * 0.12} height={size * 0.075} rx={size * 0.018} fill={colors.woodDark} />
        <Rect x={size * 0.455} y={0} width={size * 0.09} height={size * 0.065} rx={size * 0.016} fill="url(#metal)" />
        <Line x1={size * 0.475} y1={size * 0.022} x2={size * 0.525} y2={size * 0.022} stroke={colors.woodDark} strokeWidth={2} />

        {targetEdges(level)
          .filter((edge) => edge.side === visibleSide)
          .map((edge) => {
            const from = pointFor(nodeById.get(edge.from)!, visibleSide, size);
            const to = pointFor(nodeById.get(edge.to)!, visibleSide, size);
            const used = game.usedEdges.has(edgeKey(edge));
            return (
              <G key={edgeKey(edge)}>
                {used ? (
                  <>
                    <Line
                      x1={from.x + 1.4}
                      y1={from.y + 2.4}
                      x2={to.x + 1.4}
                      y2={to.y + 2.4}
                      stroke={threadDeep}
                      strokeWidth={size * 0.029}
                      strokeLinecap="round"
                      opacity={0.28}
                    />
                    <Line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={threadColor}
                      strokeWidth={size * 0.021}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={from.x - 0.7}
                      y1={from.y - 0.7}
                      x2={to.x - 0.7}
                      y2={to.y - 0.7}
                      stroke={colors.white}
                      strokeWidth={size * 0.005}
                      strokeLinecap="round"
                      opacity={0.45}
                    />
                  </>
                ) : (
                  <Line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={softColor}
                    strokeWidth={size * 0.009}
                    strokeLinecap="round"
                    strokeDasharray={`${size * 0.012} ${size * 0.022}`}
                    opacity={dashOpacity}
                  />
                )}
              </G>
            );
          })}

        {level.holes.map((hole) => {
          const point = pointFor(hole, visibleSide, size);
          const current = showNeedle && hole.id === game.currentHole;
          const isValid = onActiveSide && validTargets.has(hole.id);
          // Glow when guidance hands out targets, or when a staged region hint
          // has surfaced this branch. Accessibility labels below always expose
          // valid moves regardless of this visual choice.
          const glow = isValid && (showAllTargets || regionSet.has(hole.id));
          return (
            <G key={hole.id}>
              {glow ? <Circle cx={point.x} cy={point.y} r={size * 0.033} fill={softColor} opacity={0.9} /> : null}
              <Circle cx={point.x + 0.8} cy={point.y + 1.5} r={size * 0.018} fill={colors.linenShadow} opacity={0.75} />
              <Circle
                cx={point.x}
                cy={point.y}
                r={current ? size * 0.019 : size * 0.014}
                fill={current ? colors.gold : colors.ink}
                stroke={colors.cloth}
                strokeWidth={size * 0.008}
              />
            </G>
          );
        })}

        {showNeedle ? (
          <G>
            <Path
              d={`M ${currentPoint.x} ${currentPoint.y} Q ${currentPoint.x + size * 0.04} ${currentPoint.y + size * 0.08} ${currentPoint.x + size * 0.1} ${currentPoint.y + size * 0.075}`}
              fill="none"
              stroke={threadColor}
              strokeWidth={size * 0.012}
              strokeLinecap="round"
            />
            <Line
              x1={currentPoint.x - size * 0.035}
              y1={currentPoint.y + size * 0.04}
              x2={currentPoint.x + size * 0.05}
              y2={currentPoint.y - size * 0.055}
              stroke={colors.ink}
              strokeWidth={size * 0.018}
              strokeLinecap="round"
              opacity={0.18}
            />
            <Line
              x1={currentPoint.x - size * 0.04}
              y1={currentPoint.y + size * 0.032}
              x2={currentPoint.x + size * 0.045}
              y2={currentPoint.y - size * 0.062}
              stroke="url(#metal)"
              strokeWidth={size * 0.011}
              strokeLinecap="round"
            />
            <Ellipse
              cx={currentPoint.x + size * 0.038}
              cy={currentPoint.y - size * 0.054}
              rx={size * 0.006}
              ry={size * 0.012}
              fill={threadDeep}
              transform={`rotate(42 ${currentPoint.x + size * 0.038} ${currentPoint.y - size * 0.054})`}
            />
          </G>
        ) : null}
      </Svg>

      {level.holes.map((hole) => {
        const point = pointFor(hole, visibleSide, size);
        const isHint = !previewing && hintNode === hole.id && visibleSide === game.activeSide;
        const isCurrent = !previewing && hole.id === game.currentHole && visibleSide === game.activeSide;
        const isValid = !previewing && visibleSide === game.activeSide && validTargets.has(hole.id);
        const stateLabel = isCurrent ? "needle position" : isValid ? "valid stitch" : "not available";
        return (
          <Pressable
            key={hole.id}
            accessibilityRole="button"
            accessibilityLabel={`Hole ${hole.id.toUpperCase()}, ${stateLabel}`}
            accessibilityHint={isValid ? "Places one stitch and flips the hoop" : undefined}
            accessibilityState={{ disabled: interactionDisabled }}
            disabled={interactionDisabled}
            hitSlop={4}
            onPress={() => onNodePress(hole.id)}
            style={({ pressed }) => [
              styles.nodeTarget,
              {
                left: point.x - 24,
                top: point.y - 24,
                opacity: pressed ? 0.5 : 1
              }
            ]}
          >
            {isHint ? <View style={[styles.hintRing, { borderColor: threadColor }]} /> : null}
          </Pressable>
        );
      })}

      <View style={[styles.sideLabel, { backgroundColor: threadDeep }]} pointerEvents="none">
        <View style={[styles.sideLabelDot, { backgroundColor: threadColor }]} />
        <Text style={styles.sideLabelText}>{visibleSide === "front" ? "FRONT" : "BACK"}</Text>
      </View>

      {previewing ? (
        <View style={styles.previewBadge} pointerEvents="none">
          <Text style={styles.previewText}>LOOKING ONLY</Text>
        </View>
      ) : null}
    </View>
  );
}

export const HoopBoard = memo(HoopBoardView);

const styles = StyleSheet.create({
  frame: {
    alignSelf: "center",
    backgroundColor: colors.cloth,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 12
  },
  nodeTarget: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill
  },
  hintRing: {
    width: 42,
    height: 42,
    borderWidth: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.52)",
    shadowColor: colors.white,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4
  },
  sideLabel: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    minHeight: 30,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)"
  },
  sideLabelDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill
  },
  sideLabelText: {
    color: colors.white,
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1
  },
  previewBadge: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colors.ink,
    borderRadius: radius.pill
  },
  previewText: {
    color: colors.white,
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.15
  }
});
