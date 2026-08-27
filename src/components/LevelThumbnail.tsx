import { memo } from "react";
import Svg, { Circle, Line } from "react-native-svg";

import { decorativeSvgA11yProps } from "@/components/decorativeA11y";
import { targetEdges } from "@/game/solver";
import type { Level } from "@/game/types";
import { colors } from "@/theme/tokens";

function LevelThumbnailView({ level, size = 92, locked = false }: { level: Level; size?: number; locked?: boolean }) {
  const inset = size * 0.17;
  const inner = size - inset * 2;
  const points = new Map(level.holes.map((hole) => [
    hole.id,
    { x: inset + (hole.x / 100) * inner, y: inset + (hole.y / 100) * inner }
  ]));

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none" {...decorativeSvgA11yProps}>
      <Circle cx={size / 2} cy={size / 2 + 2} r={size * 0.47} fill={colors.woodDark} opacity={0.18} />
      <Circle cx={size / 2} cy={size / 2} r={size * 0.46} fill={colors.wood} />
      <Circle cx={size / 2} cy={size / 2} r={size * 0.385} fill={colors.cloth} />
      {targetEdges(level).map((edge) => {
        const from = points.get(edge.from)!;
        const to = points.get(edge.to)!;
        return (
          <Line
            key={`${edge.side}-${edge.from}-${edge.to}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={locked ? colors.linenShadow : edge.side === "front" ? colors.coral : colors.iris}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeDasharray={edge.side === "back" ? "2.5 3" : undefined}
            opacity={locked ? 0.62 : 0.88}
          />
        );
      })}
      {level.holes.map((hole) => {
        const point = points.get(hole.id)!;
        return <Circle key={hole.id} cx={point.x} cy={point.y} r={2.4} fill={locked ? colors.inkSoft : colors.ink} />;
      })}
    </Svg>
  );
}

export const LevelThumbnail = memo(LevelThumbnailView);
