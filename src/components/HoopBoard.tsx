import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, Pattern, Rect } from "react-native-svg";

import { edgeKey } from "@/game/engine";
import type { GameState, Level, Side, StitchNode } from "@/game/types";
import { colors, radius, type } from "@/theme/tokens";

type HoopBoardProps = {
  level: Level;
  game: GameState;
  visibleSide: Side;
  size: number;
  hintNode: string | null;
  previewing: boolean;
  onNodePress: (nodeId: string) => void;
};

function pointFor(node: StitchNode, side: Side, size: number) {
  const inset = size * 0.09;
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
  previewing,
  onNodePress
}: HoopBoardProps) {
  const nodeById = new Map(level.nodes.map((node) => [node.id, node]));
  const threadColor = visibleSide === "front" ? colors.coral : colors.iris;
  const softColor = visibleSide === "front" ? colors.coralSoft : colors.irisSoft;

  return (
    <View
      accessibilityLabel={`${visibleSide} side of the embroidery hoop`}
      style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Svg width={size} height={size} pointerEvents="none">
        <Defs>
          <Pattern id="weave" width="7" height="7" patternUnits="userSpaceOnUse">
            <Rect width="7" height="7" fill={colors.cloth} />
            <Line x1="0" y1="1" x2="7" y2="1" stroke={colors.linenDeep} strokeWidth="0.55" opacity="0.55" />
            <Line x1="1" y1="0" x2="1" y2="7" stroke={colors.linenDeep} strokeWidth="0.45" opacity="0.38" />
          </Pattern>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={size * 0.485} fill={colors.woodDark} opacity={0.23} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.455} fill={colors.wood} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.407} fill="url(#weave)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.407} fill="none" stroke={colors.woodDark} strokeWidth={2} opacity={0.45} />

        {level.edges
          .filter((edge) => edge.side === visibleSide)
          .map((edge) => {
            const from = pointFor(nodeById.get(edge.from)!, visibleSide, size);
            const to = pointFor(nodeById.get(edge.to)!, visibleSide, size);
            const used = game.usedEdges.has(edgeKey(edge));
            return (
              <Line
                key={edgeKey(edge)}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={used ? threadColor : softColor}
                strokeWidth={used ? 7 : 3}
                strokeLinecap="round"
                strokeDasharray={used ? undefined : "4 8"}
              />
            );
          })}

        {level.nodes.map((node) => {
          const point = pointFor(node, visibleSide, size);
          const current = !previewing && node.id === game.currentNode && visibleSide === game.activeSide;
          return (
            <Circle
              key={node.id}
              cx={point.x}
              cy={point.y}
              r={current ? 8 : 5.5}
              fill={current ? colors.gold : colors.ink}
              stroke={colors.cloth}
              strokeWidth={3}
            />
          );
        })}
      </Svg>

      {level.nodes.map((node) => {
        const point = pointFor(node, visibleSide, size);
        const isHint = !previewing && hintNode === node.id && visibleSide === game.activeSide;
        const isCurrent = !previewing && node.id === game.currentNode && visibleSide === game.activeSide;
        return (
          <Pressable
            key={node.id}
            accessibilityRole="button"
            accessibilityLabel={isCurrent ? `Needle at hole ${node.id}` : `Stitch to hole ${node.id}`}
            disabled={previewing}
            hitSlop={6}
            onPress={() => onNodePress(node.id)}
            style={({ pressed }) => [
              styles.nodeTarget,
              {
                left: point.x - 24,
                top: point.y - 24,
                opacity: pressed ? 0.55 : 1
              }
            ]}
          >
            {isHint ? <View style={[styles.hintRing, { borderColor: threadColor }]} /> : null}
            {isCurrent ? <Text style={styles.needle}>╱</Text> : null}
          </Pressable>
        );
      })}

      {previewing ? (
        <View style={styles.previewBadge} pointerEvents="none">
          <Text style={styles.previewText}>PREVIEW</Text>
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
    shadowColor: colors.woodDark,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10
  },
  nodeTarget: {
    position: "absolute",
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill
  },
  needle: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "800",
    textShadowColor: colors.ink,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1
  },
  hintRing: {
    position: "absolute",
    width: 38,
    height: 38,
    borderWidth: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.45)"
  },
  previewBadge: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.ink,
    borderRadius: radius.pill
  },
  previewText: {
    color: colors.white,
    fontFamily: type.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4
  }
});
