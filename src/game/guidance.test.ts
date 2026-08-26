import assert from "node:assert/strict";
import test from "node:test";

import { guidanceFor } from "./engine.ts";
import { levels } from "./levels.ts";
import type { Level } from "./types.ts";

test("levels 1 and 2 keep full guidance", () => {
  assert.equal(guidanceFor(levels[0]), "full");
  assert.equal(guidanceFor(levels[1]), "full");
});

test("from level 3 onward guidance is no longer full", () => {
  for (const level of levels.slice(2)) {
    assert.notEqual(guidanceFor(level), "full", `${level.id} should stop glowing every destination`);
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

test("guidance only ever tightens across the collection", () => {
  const rank = { full: 0, reduced: 1, minimal: 2 } as const;
  let previous = -1;
  for (const level of levels) {
    const current = rank[guidanceFor(level)];
    assert.ok(current >= previous, `${level.id} guidance should not loosen versus the prior level`);
    previous = current;
  }
});
