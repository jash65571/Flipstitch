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
import { needleAnchorNote, peekingStatus, playingStatus } from "@/game/peek";
import { targetEdges } from "@/game/solver";
import type { GameState, GuidanceLevel, Level, Side, StitchHole } from "@/game/types";
import { decorativeSvgA11yProps } from "@/components/decorativeA11y";
import { colors, radius, thread, type } from "@/theme/tokens";

type HoopBoardProps = {
  level: Level;
  game: GameState;
  size: number;
  /** Stage-3 hint: the single exact hole, ringed. */
  hintNode: string | null;
  /** Stage-2 hint: the branch of candidate holes, softly marked. */
  regionHoles?: string[];
  /** Controls how much the board pre-highlights legal destinations. */
  guidance?: GuidanceLevel;
  /** Non-null while the player is inspecting the opposite side. The play
   *  layer below always keeps showing `game.activeSide` — Peek never
   *  changes what the board's live layer renders. */
  peekSide: Side | null;
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

/** The always-live, always-interactive layer: the real, current game side.
 *  Never reads `peekSide` — that is the whole point of the split. */
function PlayLayer({
  level,
  game,
  size,
  hintNode,
  regionHoles,
  guidance = "full",
  dimmed,
  interactionDisabled,
  onNodePress
}: {
  level: Level;
  game: GameState;
  size: number;
  hintNode: string | null;
  regionHoles?: string[];
  guidance?: GuidanceLevel;
  /** True while a Peek panel is layered on top, so the play layer recedes
   *  visually without pretending the real side changed. */
  dimmed: boolean;
  interactionDisabled: boolean;
  onNodePress: (nodeId: string) => void;
}) {
  const side = game.activeSide;
  const nodeById = useMemo(() => new Map(level.holes.map((hole) => [hole.id, hole])), [level.holes]);
  const validTargets = useMemo(() => new Set(availableNodes(level, game)), [game, level]);
  const regionSet = useMemo(() => new Set(regionHoles ?? []), [regionHoles]);
  const sideThread = side === "front" ? thread.front : thread.back;
  const threadColor = sideThread.core;
  const threadDeep = sideThread.deep;
  const softColor = sideThread.soft;
  const currentPoint = pointFor(nodeById.get(game.currentHole)!, side, size);
  const showAllTargets = guidance === "full" && !dimmed;
  const dashOpacity = (guidance === "minimal" ? 0.5 : 1) * (dimmed ? 0.55 : 1);

  return (
    <View
      accessible={false}
      importantForAccessibility={dimmed ? "no-hide-descendants" : "auto"}
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: threadDeep,
          opacity: dimmed ? 0.4 : 1
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
          opacity={dimmed ? 0.28 : 0.68}
          strokeDasharray={side === "back" ? `${size * 0.02} ${size * 0.026}` : undefined}
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
          .filter((edge) => edge.side === side)
          .map((edge) => {
            const from = pointFor(nodeById.get(edge.from)!, side, size);
            const to = pointFor(nodeById.get(edge.to)!, side, size);
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
          const point = pointFor(hole, side, size);
          const current = hole.id === game.currentHole;
          const isValid = !dimmed && validTargets.has(hole.id);
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
      </Svg>

      {level.holes.map((hole) => {
        const point = pointFor(hole, side, size);
        const isHint = !dimmed && hintNode === hole.id;
        const isCurrent = hole.id === game.currentHole;
        const isValid = !dimmed && validTargets.has(hole.id);
        const stateLabel = isCurrent ? "needle position" : isValid ? "valid stitch" : "not available";
        return (
          <Pressable
            key={hole.id}
            accessibilityRole="button"
            accessibilityLabel={`Hole ${hole.id.toUpperCase()}, ${stateLabel}`}
            accessibilityHint={isValid && !dimmed ? "Places one stitch and flips the hoop" : undefined}
            accessibilityElementsHidden={dimmed}
            importantForAccessibility={dimmed ? "no-hide-descendants" : "auto"}
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

      <View
        accessible
        accessibilityLabel={playingStatus(side)}
        style={[styles.sideLabel, { backgroundColor: threadDeep }]}
      >
        <View style={[styles.sideLabelDot, { backgroundColor: threadColor }]} />
        <Text style={styles.sideLabelText}>{side === "front" ? "PLAYING · FRONT" : "PLAYING · BACK"}</Text>
      </View>
    </View>
  );
}

/** A read-only inspection layer. Renders the opposite side's pattern with no
 *  needle, no legal-move glow, and no interactive holes — nothing here can
 *  be mistaken for "you can stitch this now". */
function PeekLayer({ level, peekSide, activeSide, size }: { level: Level; peekSide: Side; activeSide: Side; size: number }) {
  const nodeById = useMemo(() => new Map(level.holes.map((hole) => [hole.id, hole])), [level.holes]);
  const sideThread = peekSide === "front" ? thread.front : thread.back;

  return (
    <View
      accessible
      accessibilityLabel={`${peekingStatus(peekSide)}. Read only. ${needleAnchorNote(activeSide)}.`}
      importantForAccessibility="yes"
      style={[
        styles.peekFrame,
        {
          width: size * 0.86,
          height: size * 0.86,
          borderRadius: (size * 0.86) / 2,
          borderColor: sideThread.deep
        }
      ]}
    >
      <Svg width={size * 0.86} height={size * 0.86} pointerEvents="none" {...decorativeSvgA11yProps}>
        <Circle cx={(size * 0.86) / 2} cy={(size * 0.86) / 2} r={size * 0.86 * 0.47} fill={colors.linen} opacity={0.96} />
        {targetEdges(level)
          .filter((edge) => edge.side === peekSide)
          .map((edge) => {
            const from = pointFor(nodeById.get(edge.from)!, peekSide, size * 0.86);
            const to = pointFor(nodeById.get(edge.to)!, peekSide, size * 0.86);
            return (
              <Line
                key={edgeKey({ ...edge, side: peekSide })}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={sideThread.soft}
                strokeWidth={size * 0.009}
                strokeLinecap="round"
                strokeDasharray={`${size * 0.012} ${size * 0.022}`}
                opacity={0.85}
              />
            );
          })}
        {level.holes.map((hole) => {
          const point = pointFor(hole, peekSide, size * 0.86);
          return (
            <Circle
              key={hole.id}
              cx={point.x}
              cy={point.y}
              r={size * 0.012}
              fill="none"
              stroke={colors.inkSoft}
              strokeWidth={size * 0.006}
              opacity={0.7}
            />
          );
        })}
      </Svg>

      <View style={[styles.peekTab, { backgroundColor: sideThread.deep }]} pointerEvents="none">
        <Text style={styles.peekTabText}>{peekingStatus(peekSide)}</Text>
      </View>
      <View style={styles.peekAnchor} pointerEvents="none">
        <Text style={styles.peekAnchorText}>{needleAnchorNote(activeSide)}</Text>
      </View>
    </View>
  );
}

function HoopBoardView({
  level,
  game,
  size,
  hintNode,
  regionHoles,
  guidance = "full",
  peekSide,
  interactionDisabled = false,
  onNodePress
}: HoopBoardProps) {
  const peeking = peekSide !== null;

  return (
    <View style={{ width: size, height: size }}>
      <PlayLayer
        level={level}
        game={game}
        size={size}
        hintNode={peeking ? null : hintNode}
        regionHoles={peeking ? undefined : regionHoles}
        guidance={guidance}
        dimmed={peeking}
        interactionDisabled={interactionDisabled || peeking}
        onNodePress={onNodePress}
      />
      {peekSide !== null ? (
        <View style={styles.peekWrap} pointerEvents="none">
          <PeekLayer level={level} peekSide={peekSide} activeSide={game.activeSide} size={size} />
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
  // The Peek panel is offset toward one corner rather than centered exactly
  // on the play layer, so it visibly reads as a lifted second layer of
  // cloth rather than a full-screen replacement of the board.
  peekWrap: {
    position: "absolute",
    top: "7%",
    left: "13%"
  },
  peekFrame: {
    backgroundColor: colors.linen,
    borderWidth: 2,
    borderStyle: "dashed",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 14
  },
  peekTab: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill
  },
  peekTabText: {
    color: colors.white,
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1
  },
  peekAnchor: {
    position: "absolute",
    bottom: -14,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.ink,
    borderRadius: radius.pill
  },
  peekAnchorText: {
    color: colors.white,
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 0.4
  }
});
