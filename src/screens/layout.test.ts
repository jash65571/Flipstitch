import assert from "node:assert/strict";
import test from "node:test";

import { getGameLayout } from "./layout.ts";

test("small phones keep the hoop inside the available width", () => {
  const layout = getGameLayout(320, 568, 1);
  assert.equal(layout.compact, true);
  assert.equal(layout.phoneLandscape, false);
  assert.ok(layout.boardSize <= 320 - layout.pagePadding * 2);
  assert.ok(layout.boardSize >= 260);
});

test("large phones give the hoop priority without exceeding its cap", () => {
  const layout = getGameLayout(430, 932, 1);
  assert.equal(layout.horizontal, false);
  assert.equal(layout.boardSize, 382);
});

test("large text selects the compact layout and preserves a playable hoop", () => {
  const layout = getGameLayout(375, 667, 1.5);
  assert.equal(layout.compact, true);
  assert.ok(layout.boardSize >= 280);
  assert.ok(layout.boardSize <= 375 - layout.pagePadding * 2);
});

test("phone landscape shows the portrait guidance state", () => {
  const layout = getGameLayout(844, 390, 1);
  assert.equal(layout.phoneLandscape, true);
  assert.equal(layout.horizontal, false);
});

test("tablet landscape uses a capped two-column board", () => {
  const layout = getGameLayout(1024, 768, 1);
  assert.equal(layout.phoneLandscape, false);
  assert.equal(layout.horizontal, true);
  assert.equal(layout.boardSize, 500);
});

test("Samsung S25 Ultra portrait keeps a large, reachable hoop", () => {
  // ~480 x 1040 logical px at the device's default scale.
  const layout = getGameLayout(480, 1040, 1);
  assert.equal(layout.phoneLandscape, false);
  assert.equal(layout.horizontal, false);
  assert.ok(layout.boardSize <= 480 - layout.pagePadding * 2);
  assert.ok(layout.boardSize >= 320, "the tall S25 Ultra should get a generous hoop");
});

test("S25 Ultra with large text stays compact and playable", () => {
  const layout = getGameLayout(480, 1040, 1.5);
  assert.equal(layout.compact, true);
  assert.ok(layout.boardSize >= 280);
  assert.ok(layout.boardSize <= 480 - layout.pagePadding * 2);
});

test("requested portrait device matrix keeps the hoop within safe horizontal space", () => {
  const devices = [
    { name: "small Android", width: 360, height: 640 },
    { name: "large Android", width: 412, height: 915 },
    { name: "iPhone portrait", width: 390, height: 844 },
    { name: "tablet portrait", width: 820, height: 1180 }
  ];

  for (const device of devices) {
    const layout = getGameLayout(device.width, device.height, 1);
    assert.equal(layout.phoneLandscape, false, device.name);
    assert.equal(layout.horizontal, false, device.name);
    assert.ok(layout.boardSize <= device.width - layout.pagePadding * 2, device.name);
    assert.ok(layout.boardSize >= 260, device.name);
  }
});
