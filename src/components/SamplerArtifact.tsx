import { memo } from "react";
import Svg, { Circle, Line } from "react-native-svg";

import { decorativeSvgA11yProps } from "@/components/decorativeA11y";
import type { Level, Side } from "@/game/types";
import { colors } from "@/theme/tokens";

/**
 * One side of a finished hoop, drawn alone. Front and back never share a
 * frame here — that is `LevelThumbnail`'s job for the sampler journey. This
 * component is the completion gallery's artifact: front (solid, coral) and
 * back (dashed, iris) stay visually distinguishable by more than colour, so
 * the two pieces of one finished sampler read as different sides on sight
 * and to a screen reader.
 */
function SamplerArtifactView({ level, side, size = 96 }: { level: Level; side: Side; size?: number }) {
  const inset = size * 0.17;
  const inner = size - inset * 2;
  const points = new Map(level.holes.map((hole) => [
    hole.id,
    { x: inset + (hole.x / 100) * inner, y: inset + (hole.y / 100) * inner }
  ]));
  const edges = side === "front" ? level.frontEdges : level.backEdges;
  const stroke = side === "front" ? colors.coral : colors.iris;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel={`${level.title}, ${side} side`}
      {...decorativeSvgA11yProps}
    >
      <Circle cx={size / 2} cy={size / 2} r={size * 0.46} fill={colors.wood} />
      <Circle cx={size / 2} cy={size / 2} r={size * 0.385} fill={colors.cloth} />
      {edges.map((edge) => {
        const from = points.get(edge.from)!;
        const to = points.get(edge.to)!;
        return (
          <Line
            key={`${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={stroke}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeDasharray={side === "back" ? "2.5 3" : undefined}
            opacity={0.9}
          />
        );
      })}
      {level.holes.map((hole) => {
        const point = points.get(hole.id)!;
        return <Circle key={hole.id} cx={point.x} cy={point.y} r={2.2} fill={colors.ink} />;
      })}
    </Svg>
  );
}

export const SamplerArtifact = memo(SamplerArtifactView);
