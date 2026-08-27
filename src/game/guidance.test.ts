import assert from "node:assert/strict";
import test from "node:test";

import { guidanceFor } from "./engine.ts";
import { catalog, levels } from "../content/catalog.ts";
import type { Level } from "./types.ts";

test("levels 1 and 2 keep full guidance", () => {
  assert.equal(guidanceFor(levels[0]), "full");
  assert.equal(guidanceFor(levels[1]), "full");
});

test("from level 3 onward guidance in Collection 01 is no longer full", () => {
  const dayAndNight = catalog.collections[0].levels;
  for (const level of dayAndNight.slice(2)) {
    assert.notEqual(guidanceFor(level), "full", `${level.id} should stop glowing every destination`);
  }
});

test("each collection opens its own arc with full guidance, then fades", () => {
  // Guidance may only fade *within* a collection's learning arc. A new
  // collection is a fresh sampler, so it is expected to open at full again —
  // see docs/PROGRESSION-PACING.md and the pacing validator, which scopes
  // GUIDANCE_STRENGTHENED to chapters inside the same collection.
  for (const collection of catalog.collections) {
    assert.equal(guidanceFor(collection.levels[0]), "full", `${collection.id} should open at full guidance`);
  }
});

test("guidanceFor defaults to full when a level omits the field", () => {
  const bare = { ...levels[0] } as Level;
  delete (bare as { guidance?: unknown }).guidance;
  assert.equal(guidanceFor(bare), "full");
});

test("every level carries authored staged-hint copy", () => {
  for (const level of levels) {
    assert.ok(level.clues, `${level.id} should author staged clues`);
    assert.ok(level.clues!.concept.length > 0);
    assert.ok(level.clues!.region.length > 0);
  }
});

test("guidance only ever tightens within each collection's own arc", () => {
  const rank = { full: 0, reduced: 1, minimal: 2 } as const;
  for (const collection of catalog.collections) {
    let previous = -1;
    for (const level of collection.levels) {
      const current = rank[guidanceFor(level)];
      assert.ok(current >= previous, `${level.id} guidance should not loosen versus the prior level`);
      previous = current;
    }
  }
});
