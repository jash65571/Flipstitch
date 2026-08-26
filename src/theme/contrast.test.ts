import assert from "node:assert/strict";
import test from "node:test";

import { colors, palette } from "./tokens.ts";

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
    [colors.linenShadow, colors.ink],
    [colors.danger, colors.white],
    [colors.danger, colors.linen]
  ];

  for (const [foreground, background] of pairs) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} misses 4.5:1`);
  }
});

test("Living Sampler palette clears WCAG AA for normal text and controls", () => {
  const pairs = [
    // Thread deeps carry white labels (side chip, seals).
    [colors.white, palette.vermilionDeep],
    [colors.white, palette.indigoDeep],
    // Front/back thread deeps read as text on warm paper.
    [palette.vermilionDeep, palette.paper],
    [palette.indigoDeep, palette.paper],
    // Ink on paper, and softened ink on both paper tones.
    [palette.inkBlue, palette.paper],
    [palette.inkBlueSoft, palette.paper],
    [palette.inkBlueSoft, palette.paperDeep],
    // Brass / ochre / sage as text and as fills under white/ink.
    [palette.brassDeep, palette.paper],
    [palette.ochre, palette.inkBlue],
    [colors.white, palette.brassDeep],
    [palette.sageDeep, palette.paper],
    [colors.white, palette.sageDeep]
  ];

  for (const [foreground, background] of pairs) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} misses 4.5:1`);
  }
});

test("front and back thread deeps are distinguishable from each other, not only by hue", () => {
  // A meaningful luminance gap backs up the solid/dashed shape difference, so
  // the two sides never rely on colour alone.
  assert.ok(
    contrast(palette.vermilionDeep, palette.indigoDeep) >= 1.35,
    "front and back thread deeps should differ in luminance as well as hue"
  );
});
