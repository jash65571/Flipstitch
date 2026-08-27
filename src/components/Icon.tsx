import { memo } from "react";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { decorativeSvgA11yProps } from "@/components/decorativeA11y";
import { colors } from "@/theme/tokens";

/**
 * The Living Sampler icon set — code-native SVG marks drawn from the same
 * sewing vocabulary as the hoop. Every mark reads without its text label; the
 * label is kept alongside for accessibility. No emoji, icon fonts, or copied
 * icon packs are used for the interface identity.
 */
export type IconName =
  | "needle"
  | "thread"
  | "front"
  | "back"
  | "undo"
  | "preview"
  | "hint"
  | "locked"
  | "completed"
  | "trapped"
  | "chapter"
  | "settings";

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** Secondary tint for two-tone marks (e.g. the completed stitch). */
  accent?: string;
  strokeWidth?: number;
};

function IconView({ name, size = 24, color = colors.ink, accent, strokeWidth = 2 }: IconProps) {
  const tint = accent ?? color;
  const common = {
    fill: "none" as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none" {...decorativeSvgA11yProps}>
      {name === "needle" ? (
        <G>
          {/* Brass needle on a thread tail. */}
          <Line x1={5} y1={19} x2={17} y2={7} {...common} />
          <Path d="M17 7l2-2" {...common} />
          <Circle cx={16} cy={8} r={1.1} fill="none" stroke={color} strokeWidth={strokeWidth * 0.8} />
          <Path d="M5 19c-1.6.3-2.4-.6-2-2.2" {...common} stroke={tint} />
        </G>
      ) : null}

      {name === "thread" ? (
        <Path d="M4 15c3-4 5 4 8 0s5-9 8-5" {...common} />
      ) : null}

      {name === "front" ? (
        // Solid stitch = front.
        <G>
          <Line x1={4} y1={12} x2={20} y2={12} stroke={color} strokeWidth={strokeWidth * 1.4} strokeLinecap="round" />
          <Circle cx={4} cy={12} r={1.6} fill={color} />
          <Circle cx={20} cy={12} r={1.6} fill={color} />
        </G>
      ) : null}

      {name === "back" ? (
        // Dashed stitch = back (shape differs from front, not only colour).
        <G>
          <Line
            x1={4}
            y1={12}
            x2={20}
            y2={12}
            stroke={color}
            strokeWidth={strokeWidth * 1.4}
            strokeLinecap="round"
            strokeDasharray="2.4 3.2"
          />
          <Circle cx={4} cy={12} r={1.6} fill="none" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx={20} cy={12} r={1.6} fill="none" stroke={color} strokeWidth={strokeWidth} />
        </G>
      ) : null}

      {name === "undo" ? (
        <G>
          <Path d="M8 7H4V3" {...common} />
          <Path d="M4.5 7.2A8 8 0 1 1 4 16" {...common} />
        </G>
      ) : null}

      {name === "preview" ? (
        <G>
          <Path d="M2.5 12s3.6-5.2 9.5-5.2S21.5 12 21.5 12s-3.6 5.2-9.5 5.2S2.5 12 2.5 12Z" {...common} />
          <Circle cx={12} cy={12} r={2.6} {...common} />
        </G>
      ) : null}

      {name === "hint" ? (
        // A thread knot that lights — staged help.
        <G>
          <Path d="M9 15a4 4 0 1 1 6 0c-.8.8-1 1.4-1 2.4H10c0-1-.2-1.6-1-2.4Z" {...common} />
          <Line x1={10} y1={20} x2={14} y2={20} {...common} />
          <Line x1={12} y1={3} x2={12} y2={5} {...common} stroke={tint} />
          <Line x1={5} y1={6} x2={6.5} y2={7.5} {...common} stroke={tint} />
          <Line x1={19} y1={6} x2={17.5} y2={7.5} {...common} stroke={tint} />
        </G>
      ) : null}

      {name === "locked" ? (
        // A folded pattern piece pinned over the work.
        <G>
          <Path d="M5 8l14-3v14l-14 3Z" {...common} />
          <Path d="M5 8l6 2.2L19 5" {...common} />
          <Path d="M11 10.2V21" {...common} stroke={tint} strokeDasharray="1.5 2" />
        </G>
      ) : null}

      {name === "completed" ? (
        // A finished cross-stitch.
        <G>
          <Line x1={6} y1={6} x2={18} y2={18} stroke={color} strokeWidth={strokeWidth * 1.5} strokeLinecap="round" />
          <Line x1={18} y1={6} x2={6} y2={18} stroke={tint} strokeWidth={strokeWidth * 1.5} strokeLinecap="round" />
          <Circle cx={6} cy={6} r={1.2} fill={color} />
          <Circle cx={18} cy={6} r={1.2} fill={tint} />
          <Circle cx={6} cy={18} r={1.2} fill={tint} />
          <Circle cx={18} cy={18} r={1.2} fill={color} />
        </G>
      ) : null}

      {name === "trapped" ? (
        // A knotted, caught thread.
        <G>
          <Path d="M4 16c3 0 3-4 6-4s3 4 6 4" {...common} />
          <Path d="M9 12c1.4-1.6 3.6-1.6 5 0s-.6 3.4-2.2 2.2-.4-3 1.2-3.6" {...common} stroke={tint} />
          <Line x1={4} y1={16} x2={3} y2={17.5} {...common} />
          <Line x1={18} y1={16} x2={20} y2={17} {...common} />
        </G>
      ) : null}

      {name === "chapter" ? (
        // An embroidery-book chapter tab with a stitch run.
        <G>
          <Path d="M6 4h11a2 2 0 0 1 2 2v14l-3-2-3 2V4" {...common} />
          <Line x1={6} y1={4} x2={6} y2={20} {...common} />
          <Line x1={8.5} y1={9} x2={8.5} y2={9} {...common} />
        </G>
      ) : null}

      {name === "settings" ? (
        // A spool + needle, not a gear.
        <G>
          <Rect x={7} y={4} width={10} height={16} rx={1.6} {...common} />
          <Line x1={7} y1={8} x2={17} y2={8} {...common} />
          <Line x1={7} y1={16} x2={17} y2={16} {...common} />
          <Line x1={12} y1={9} x2={12} y2={15} {...common} stroke={tint} />
        </G>
      ) : null}
    </Svg>
  );
}

export const Icon = memo(IconView);
