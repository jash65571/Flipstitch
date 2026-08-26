import assert from "node:assert/strict";
import test from "node:test";

import { getGalleryLayout } from "./gallery-layout.ts";

test("small Android portrait uses one readable gallery column", () => {
  assert.deepEqual(getGalleryLayout(360, 1), { contentWidth: 332, columns: 1, cardWidthPercent: "100%" });
});

test("large Android portrait uses one generous gallery column", () => {
  assert.deepEqual(getGalleryLayout(412, 1), { contentWidth: 372, columns: 1, cardWidthPercent: "100%" });
});

test("iPhone portrait keeps cards full width", () => {
  assert.deepEqual(getGalleryLayout(390, 1), { contentWidth: 350, columns: 1, cardWidthPercent: "100%" });
});

test("tablet portrait uses three crafted-hoop columns", () => {
  assert.deepEqual(getGalleryLayout(820, 1), { contentWidth: 780, columns: 3, cardWidthPercent: "31.8%" });
});

test("large text returns the tablet gallery to one column", () => {
  assert.equal(getGalleryLayout(820, 1.4).columns, 1);
});

// The sampler journey is a single centred column driven only by contentWidth.
// It must keep side gutters on every device and never exceed a comfortable
// reading measure, at normal and large font scales alike.
test("sampler journey width stays gutter-bounded and readable across devices", () => {
  const profiles: Array<[string, number]> = [
    ["small Android", 340],
    ["iPhone", 390],
    ["S25 Ultra", 480],
    ["tablet", 834],
    ["wide web", 1280]
  ];
  for (const scale of [1, 1.4, 2]) {
    for (const [name, width] of profiles) {
      const { contentWidth } = getGalleryLayout(width, scale);
      assert.ok(contentWidth > 0, `${name} @${scale} width should be positive`);
      assert.ok(contentWidth < width, `${name} @${scale} should keep side gutters`);
      assert.ok(contentWidth <= 920, `${name} @${scale} should cap the reading measure`);
    }
  }
});

test("sampler gutters widen on the narrowest phones", () => {
  // Sub-380 devices get the tighter gutter so the journey rail + panel still fit.
  assert.ok(340 - getGalleryLayout(340, 1).contentWidth >= 28);
  assert.ok(390 - getGalleryLayout(390, 1).contentWidth >= 40);
});
