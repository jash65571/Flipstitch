import assert from "node:assert/strict";
import test from "node:test";

import { colors } from "./tokens.ts";

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

test("all text color pairs clear the WCAG AA normal-text threshold", () => {
  const pairs = [
    [colors.inkSoft, colors.linen],
    [colors.white, colors.coralDeep],
    [colors.white, colors.irisDeep],
    [colors.ink, colors.gold],
    [colors.white, colors.ink],
    [colors.tealDeep, colors.linen],
    [colors.tealDeep, colors.cloth],
    [colors.linenShadow, colors.ink]
  ];

  for (const [foreground, background] of pairs) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} misses 4.5:1`);
  }
});
