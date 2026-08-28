import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
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
import { holeById, needlePoseFor, projectForSide, projectThroughFabric } from "@/game/boardGeometry";
import { needleAnchorNote, peekThroughStatus, playingStatus } from "@/game/peek";
import { targetEdges } from "@/game/solver";
import type { GameState, GuidanceLevel, Level, Side } from "@/game/types";
import { decorativeSvgA11yProps, hiddenSubtreeA11yProps } from "@/components/decorativeA11y";
import { NEEDLE_TIP_RATIO, ThreadedNeedle } from "@/components/ThreadedNeedle";
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
  /** Non-null while the player is inspecting the opposite side through the
   *  current fabric. The live pattern layer below always keeps showing
   *  `game.activeSide` — Peek never changes what it renders, and never
   *  moves or resizes the hoop. See `docs/NEEDLE-INTERACTION.md`. */
  peekSide: Side | null;
  interactionDisabled?: boolean;
  /** Disables the needle-travel/emergence animation without changing the
   *  final result: the tip still lands exactly on the new hole. */
  reduceMotion?: boolean;
  onNodePress: (nodeId: string) => void;
};

/** The wood ring, clamp, and cloth base. This is the physical hoop itself —
 *  it never dims, moves, or resizes for Peek. Only the pattern content
 *  layered on top of it changes. */
function HoopFrame({ size }: { size: number }) {
  return (
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
    </Svg>
  );
}

/** The thread-tension ring on the inner rim: dyes the hoop to the active
 *  side so a flip is legible on the wood itself. Solid for the front,
 *  dashed for the back — shape, not only hue. This is side *identity*
 *  chrome, not puzzle content, so — like the wood — it never dims for
 *  Peek; it stays a ground-truth fact about where the needle actually is. */
function TensionRing({ size, side }: { size: number; side: Side }) {
  const sideThread = side === "front" ? thread.front : thread.back;
  return (
    <Svg width={size} height={size} pointerEvents="none" {...decorativeSvgA11yProps}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={size * 0.398}
        fill="none"
        stroke={sideThread.core}
        strokeWidth={size * 0.01}
        strokeLinecap="round"
        opacity={0.68}
        strokeDasharray={side === "back" ? `${size * 0.02} ${size * 0.026}` : undefined}
      />
    </Svg>
  );
}

/** The current side's pattern: stitched/unstitched lines and hole marks.
 *  Recedes (but never disappears) while Peek is open, so the eye can read
 *  the opposite side's pattern through it without losing this side. */
function PatternLayer({
  level,
  game,
  size,
  regionHoles,
  guidance = "full",
  dimmed
}: {
  level: Level;
  game: GameState;
  size: number;
  regionHoles?: string[];
  guidance?: GuidanceLevel;
  dimmed: boolean;
}) {
  const side = game.activeSide;
  const nodeById = useMemo(() => new Map(level.holes.map((hole) => [hole.id, hole])), [level.holes]);
  const validTargets = useMemo(() => new Set(availableNodes(level, game)), [game, level]);
  const regionSet = useMemo(() => new Set(regionHoles ?? []), [regionHoles]);
  const sideThread = side === "front" ? thread.front : thread.back;
  const threadColor = sideThread.core;
  const threadDeep = sideThread.deep;
  const softColor = sideThread.soft;
  const showAllTargets = guidance === "full" && !dimmed;
  const dashOpacity = (guidance === "minimal" ? 0.5 : 1) * (dimmed ? 0.55 : 1);

  return (
    <Svg width={size} height={size} pointerEvents="none" style={{ opacity: dimmed ? 0.4 : 1 }} {...decorativeSvgA11yProps}>
      {targetEdges(level)
        .filter((edge) => edge.side === side)
        .map((edge) => {
          const from = projectForSide(nodeById.get(edge.from)!, side, size);
          const to = projectForSide(nodeById.get(edge.to)!, side, size);
          const used = game.usedEdges.has(edgeKey(edge));
          return (
            <G key={edgeKey(edge)}>
              {used ? (
                <>
                  <Line x1={from.x + 1.4} y1={from.y + 2.4} x2={to.x + 1.4} y2={to.y + 2.4} stroke={threadDeep} strokeWidth={size * 0.029} strokeLinecap="round" opacity={0.28} />
                  <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={threadColor} strokeWidth={size * 0.021} strokeLinecap="round" />
                  <Line x1={from.x - 0.7} y1={from.y - 0.7} x2={to.x - 0.7} y2={to.y - 0.7} stroke={colors.white} strokeWidth={size * 0.005} strokeLinecap="round" opacity={0.45} />
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
        const point = projectForSide(hole, side, size);
        const current = hole.id === game.currentHole;
        const isValid = !dimmed && validTargets.has(hole.id);
        const glow = isValid && (showAllTargets || regionSet.has(hole.id));
        return (
          <G key={hole.id}>
            {glow ? <Circle cx={point.x} cy={point.y} r={size * 0.033} fill={softColor} opacity={0.9} /> : null}
            <Circle cx={point.x + 0.8} cy={point.y + 1.5} r={size * 0.018} fill={colors.linenShadow} opacity={0.75} />
            {/* A puncture collar at the current hole: the small ring means
                "the thread passes through the fabric here," not "tap me" —
                the tappable affordance lives entirely in the Pressable
                layer below, never in this mark. */}
            {current ? (
              <Circle cx={point.x} cy={point.y} r={size * 0.03} fill="none" stroke={threadColor} strokeWidth={size * 0.005} opacity={0.4} />
            ) : null}
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
    </Svg>
  );
}

/** Interactive hit targets for every hole. A separate layer from
 *  `PatternLayer` so touch geometry and drawing never drift apart, and so
 *  disabling it for Peek is one prop, not a re-derivation. */
function TouchLayer({
  level,
  game,
  size,
  hintNode,
  dimmed,
  interactionDisabled,
  onNodePress
}: {
  level: Level;
  game: GameState;
  size: number;
  hintNode: string | null;
  dimmed: boolean;
  interactionDisabled: boolean;
  onNodePress: (nodeId: string) => void;
}) {
  const side = game.activeSide;
  const validTargets = useMemo(() => new Set(availableNodes(level, game)), [game, level]);
  const sideThread = side === "front" ? thread.front : thread.back;

  return (
    <View accessible={false} {...hiddenSubtreeA11yProps(dimmed)} style={StyleSheet.absoluteFill}>
      {level.holes.map((hole) => {
        const point = projectForSide(hole, side, size);
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
            {...hiddenSubtreeA11yProps(dimmed)}
            accessibilityState={{ disabled: interactionDisabled }}
            disabled={interactionDisabled}
            hitSlop={4}
            onPress={() => onNodePress(hole.id)}
            style={({ pressed }) => [
              styles.nodeTarget,
              { left: point.x - 24, top: point.y - 24, opacity: pressed ? 0.5 : 1 }
            ]}
          >
            {isHint ? <View style={[styles.hintRing, { borderColor: sideThread.core }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** The ground-truth "PLAYING · <side>" pill, rendered outside any dimmed
 *  subtree. CSS/React Native opacity < 1 creates its own stacking context,
 *  so a z-index set from inside a dimmed layer can never actually paint
 *  above the Peek overlay (Milestone 8.2 QA). Living here, as a sibling at
 *  full opacity, is what keeps it legible while peeking. */
function SideStatusLabel({ side }: { side: Side }) {
  const sideThread = side === "front" ? thread.front : thread.back;
  return (
    <View accessible accessibilityLabel={playingStatus(side)} style={[styles.sideLabel, { backgroundColor: sideThread.deep }]}>
      <View style={[styles.sideLabelDot, { backgroundColor: sideThread.core }]} />
      <Text style={styles.sideLabelText}>{side === "front" ? "PLAYING · FRONT" : "PLAYING · BACK"}</Text>
    </View>
  );
}

/** One small secondary pill while peeking. Replaces the old two-pill stack
 *  (PEEKING · <side> + "Needle stays on <side>") — the through-cloth
 *  visual now does most of that work, so the copy only needs to name what
 *  the player is looking at. */
function PeekStatusLabel({ peekSide, size }: { peekSide: Side; size: number }) {
  // The clamp (HoopFrame) occupies 0 -> size * 0.081 at the top centre, and
  // this pill is centred too, so a fixed `top` collides with the hardware at
  // every board size. Sit just clear of the clamp's lower edge instead.
  return (
    <View accessible={false} style={[styles.peekLabel, { top: size * 0.098 }]}>
      <Text style={styles.peekLabelText}>{peekThroughStatus(peekSide)}</Text>
    </View>
  );
}

/**
 * Through-Cloth Peek: the opposite side's pattern, seen through the exact
 * same hoop and the exact same fabric bounds — never a second, offset, or
 * resized panel. Every hole here lands on the identical pixel as the same
 * hole on the live pattern layer (see `projectThroughFabric` and
 * `boardGeometry.test.ts`). Completed reverse stitches read strongly;
 * remaining routes stay a soft guide. No needle is drawn here — the real
 * needle (NeedleLayer) stays visible above this overlay, anchored to the
 * real current hole, which is the whole point: you are only looking.
 */
function PeekOverlay({ level, game, peekSide, size }: { level: Level; game: GameState; peekSide: Side; size: number }) {
  const nodeById = useMemo(() => new Map(level.holes.map((hole) => [hole.id, hole])), [level.holes]);
  const viewingSide = game.activeSide;
  const sideThread = peekSide === "front" ? thread.front : thread.back;
  const cx = size / 2;
  const cy = size / 2;
  const clothR = size * 0.41;

  return (
    <View
      accessible
      accessibilityLabel={`${peekThroughStatus(peekSide)}. Read only. ${needleAnchorNote(viewingSide)}.`}
      importantForAccessibility="yes"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Svg width={size} height={size} {...decorativeSvgA11yProps}>
        <Defs>
          <RadialGradient id="peekBacklight" cx="50%" cy="45%" r="62%">
            <Stop offset="0" stopColor={colors.white} stopOpacity="0.5" />
            <Stop offset="0.7" stopColor={colors.white} stopOpacity="0.14" />
            <Stop offset="1" stopColor={colors.white} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* The lightbox wash: the fabric already on screen reads as
            backlit, rather than being replaced by a second layer. */}
        <Circle cx={cx} cy={cy} r={clothR} fill="url(#peekBacklight)" />

        {targetEdges(level)
          .filter((edge) => edge.side === peekSide)
          .map((edge) => {
            const from = projectThroughFabric(nodeById.get(edge.from)!, viewingSide, size);
            const to = projectThroughFabric(nodeById.get(edge.to)!, viewingSide, size);
            const used = game.usedEdges.has(edgeKey(edge));
            const key = edgeKey(edge);
            return used ? (
              <G key={key}>
                <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={sideThread.deep} strokeWidth={size * 0.02} strokeLinecap="round" opacity={0.5} />
                <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={sideThread.core} strokeWidth={size * 0.012} strokeLinecap="round" opacity={0.88} />
              </G>
            ) : (
              <Line
                key={key}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={sideThread.soft}
                strokeWidth={size * 0.007}
                strokeLinecap="round"
                strokeDasharray={`${size * 0.01} ${size * 0.02}`}
                opacity={0.42}
              />
            );
          })}

        {level.holes.map((hole) => {
          const point = projectThroughFabric(hole, viewingSide, size);
          return (
            <Circle key={hole.id} cx={point.x} cy={point.y} r={size * 0.011} fill="none" stroke={colors.inkSoft} strokeWidth={size * 0.005} opacity={0.5} />
          );
        })}
      </Svg>
    </View>
  );
}

/**
 * The real, single needle. Always anchored to `game.currentHole` on
 * `game.activeSide` — never offset, never duplicated. Rendered as a
 * sibling at full opacity so it stays visible above the Peek overlay: the
 * player can always answer "where is my needle" by looking, whether or not
 * they're peeking.
 *
 * On every real stitch (or undo), it plays a short two-phase motion:
 * first advancing across the currently-visible cloth toward the
 * destination hole (still on the side just stitched from), then — once the
 * hoop-flip transform in `GameScreen.animateSwap` has committed the new
 * state — emerging through the new side at the mirrored position. Reduced
 * motion skips both phases and snaps straight to the correct tip.
 */
function NeedleLayer({ level, game, size, reduceMotion }: { level: Level; game: GameState; size: number; reduceMotion: boolean }) {
  const canvasSize = size * 0.34;
  const pose = needlePoseFor(level, game, size);
  const sideThread = game.activeSide === "front" ? thread.front : thread.back;

  const anchor = useRef(new Animated.ValueXY({ x: pose.tip.x, y: pose.tip.y })).current;
  const emergeScale = useRef(new Animated.Value(1)).current;
  const emergeOpacity = useRef(new Animated.Value(1)).current;
  const prevRef = useRef({ levelId: level.id, game });

  useEffect(() => {
    const prev = prevRef.current;
    const sameLevel = prev.levelId === level.id;
    const isReset = game.moves.length === 0;
    const sameSpot = prev.game.currentHole === game.currentHole && prev.game.activeSide === game.activeSide;

    if (!sameLevel || isReset || sameSpot || reduceMotion) {
      anchor.setValue({ x: pose.tip.x, y: pose.tip.y });
      emergeScale.setValue(1);
      emergeOpacity.setValue(1);
      prevRef.current = { levelId: level.id, game };
      return;
    }

    // Phase 1: advance across the cloth we were just looking at, toward the
    // hole we're about to pierce.
    const throughPoint = projectForSide(holeById(level, game.currentHole), prev.game.activeSide, size);

    Animated.timing(anchor, { toValue: throughPoint, duration: 140, useNativeDriver: false }).start(() => {
      // Phase 2: the pierce — jump across the mirror discontinuity to the
      // true post-flip position …
      anchor.setValue({ x: pose.tip.x, y: pose.tip.y });
      // … then Phase 3: a brief emergence through the new side's cloth.
      emergeScale.setValue(0.55);
      emergeOpacity.setValue(0.5);
      Animated.parallel([
        Animated.spring(emergeScale, { toValue: 1, damping: 12, stiffness: 260, mass: 0.6, useNativeDriver: false }),
        Animated.timing(emergeOpacity, { toValue: 1, duration: 110, useNativeDriver: false })
      ]).start();
    });

    prevRef.current = { levelId: level.id, game };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, game, size, reduceMotion]);

  const left = Animated.subtract(anchor.x, canvasSize * NEEDLE_TIP_RATIO.x);
  const top = Animated.subtract(anchor.y, canvasSize * NEEDLE_TIP_RATIO.y);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: canvasSize,
        height: canvasSize,
        left,
        top,
        opacity: emergeOpacity,
        transform: [{ scale: emergeScale }]
      }}
    >
      <ThreadedNeedle canvasSize={canvasSize} angleDeg={pose.angleDeg} threadColor={sideThread.core} threadDeep={sideThread.deep} />
    </Animated.View>
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
  reduceMotion = false,
  onNodePress
}: HoopBoardProps) {
  const peeking = peekSide !== null;

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2, shadowColor: (game.activeSide === "front" ? thread.front : thread.back).deep }
      ]}
    >
      <HoopFrame size={size} />
      <View style={StyleSheet.absoluteFill}>
        <TensionRing size={size} side={game.activeSide} />
      </View>
      <View style={StyleSheet.absoluteFill}>
        <PatternLayer
          level={level}
          game={game}
          size={size}
          regionHoles={peeking ? undefined : regionHoles}
          guidance={guidance}
          dimmed={peeking}
        />
      </View>
      {peekSide !== null ? <PeekOverlay level={level} game={game} peekSide={peekSide} size={size} /> : null}
      <TouchLayer
        level={level}
        game={game}
        size={size}
        hintNode={peeking ? null : hintNode}
        dimmed={peeking}
        interactionDisabled={interactionDisabled || peeking}
        onNodePress={onNodePress}
      />
      <NeedleLayer level={level} game={game} size={size} reduceMotion={reduceMotion} />
      <SideStatusLabel side={game.activeSide} />
      {peekSide !== null ? <PeekStatusLabel peekSide={peekSide} size={size} /> : null}
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
    borderColor: "rgba(255,255,255,0.32)",
    // The Peek overlay now shares the hoop's exact bounds, so this pill
    // could sit under it; it must still outrank it visually as the
    // ground-truth needle status (Milestone 8.2 QA regression guard).
    zIndex: 5
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
  peekLabel: {
    position: "absolute",
    // `top` is supplied per-render from the board size; see PeekStatusLabel.
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(28,35,51,0.82)",
    borderRadius: radius.pill,
    zIndex: 5
  },
  peekLabelText: {
    color: colors.white,
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8
  }
});
