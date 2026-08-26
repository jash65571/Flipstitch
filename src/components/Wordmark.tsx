import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { colors, thread, type } from "@/theme/tokens";

/**
 * The FlipStitch wordmark: a custom vector lockup, not plain heading text.
 * A running stitch threads front (vermilion) into back (indigo) through a brass
 * needle, and the name is split across the two thread colours so the identity
 * itself states the one-thread-two-sides rule. The mark is code-native SVG.
 */
function StitchMark({ size }: { size: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 44 44" pointerEvents="none" accessibilityElementsHidden>
      {/* Running stitch: solid front dashes crossing into dashed back. */}
      <Path d="M4 30c5-2 7-14 13-14" fill="none" stroke={thread.front.core} strokeWidth={3} strokeLinecap="round" />
      <Path
        d="M17 16c6 0 8 12 13 10"
        fill="none"
        stroke={thread.back.core}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="1.5 3.4"
      />
      {/* Brass needle piercing the crossing point. */}
      <G>
        <Line x1={26} y1={30} x2={39} y2={11} stroke={colors.woodDark} strokeWidth={3.4} strokeLinecap="round" opacity={0.25} />
        <Line x1={26} y1={30} x2={39} y2={11} stroke={colors.gold} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={37.6} cy={12.6} r={1.3} fill="none" stroke={colors.goldDeep} strokeWidth={1} />
      </G>
      {/* Anchor knots. */}
      <Circle cx={4} cy={30} r={2} fill={thread.front.deep} />
      <Circle cx={17} cy={16} r={1.8} fill={colors.ink} />
    </Svg>
  );
}

type WordmarkProps = {
  /** Overall visual scale; drives both the mark and the type size. */
  size?: number;
  /** Render the mark alone (e.g. compact headers). */
  markOnly?: boolean;
};

function WordmarkView({ size = 28, markOnly = false }: WordmarkProps) {
  const markSize = size * 1.35;
  if (markOnly) {
    return (
      <View accessibilityRole="image" accessibilityLabel="FlipStitch">
        <StitchMark size={markSize} />
      </View>
    );
  }
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="FlipStitch">
      <StitchMark size={markSize} />
      <Text
        allowFontScaling={false}
        style={[styles.word, { fontSize: size }]}
      >
        <Text style={{ color: thread.back.deep }}>Flip</Text>
        <Text style={{ color: thread.front.deep }}>Stitch</Text>
      </Text>
    </View>
  );
}

export const Wordmark = memo(WordmarkView);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  word: {
    fontFamily: type.brandHeavy,
    letterSpacing: -0.8,
    // A slight optical lift pairs the lettering with the stitched mark so the
    // lockup reads as one drawn object rather than an icon beside a label.
    includeFontPadding: false
  }
});
