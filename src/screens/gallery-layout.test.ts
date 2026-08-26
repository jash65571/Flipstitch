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
