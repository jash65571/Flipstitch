import assert from "node:assert/strict";
import test from "node:test";

import { validateLevel } from "../game/solver.ts";
import { buildCatalog, catalog, getChapter, getCollection, getLevel, getLevelIndex, levels, levelOne } from "./catalog.ts";
import type { CollectionSource } from "./types.ts";

/** The ten shipped levels, in the order saved progress depends on. */
const SHIPPED_ORDER = [
  "first-thread-01",
  "kite-tail-02",
  "twin-petals-03",
  "butterfly-turn-04",
  "forked-needle-05",
  "echo-stairs-06",
  "orbit-bloom-07",
  "laced-window-08",
  "moonlit-return-09",
  "master-sampler-10"
];

test("collection ids are unique", () => {
  const ids = catalog.collections.map((collection) => collection.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("chapter ids are unique across the whole catalog, not just per collection", () => {
  const ids = catalog.collections.flatMap((collection) => collection.chapters.map((chapter) => chapter.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 2, "the catalog should exercise more than one chapter");
});

test("level ids are globally unique", () => {
  assert.equal(new Set(catalog.levelIds).size, catalog.levelIds.length);
});

test("every level belongs to exactly one chapter, and every chapter to exactly one collection", () => {
  const owners = new Map<string, string[]>();
  for (const collection of catalog.collections) {
    for (const chapter of collection.chapters) {
      assert.equal(chapter.collectionId, collection.id);
      for (const level of chapter.levels) {
        owners.set(level.id, [...(owners.get(level.id) ?? []), chapter.id]);
      }
    }
  }
  assert.equal(owners.size, catalog.levels.length);
  for (const [levelId, chapters] of owners) {
    assert.equal(chapters.length, 1, `${levelId} appears in ${chapters.length} chapters`);
  }
});

test("the flat play order is the concatenation of collections, then chapters, then entries", () => {
  const rebuilt = catalog.collections.flatMap((collection) =>
    collection.chapters.flatMap((chapter) => chapter.levelIds)
  );
  assert.deepEqual([...catalog.levelIds], rebuilt);
  assert.deepEqual(levels.map((level) => level.id), rebuilt);
});

test("catalog assembly is deterministic", () => {
  const first = buildCatalog([...catalog.collections].map((collection) => ({ ...collection })) as unknown as CollectionSource[]);
  const second = buildCatalog([...catalog.collections].map((collection) => ({ ...collection })) as unknown as CollectionSource[]);
  assert.deepEqual(first.levelIds, second.levelIds);
});

test("the ten shipped levels keep their ids and their order", () => {
  // Saved progress and linear unlocking both key on this exact sequence. A
  // change here silently rewrites what existing players have unlocked.
  assert.deepEqual([...catalog.levelIds], SHIPPED_ORDER);
  assert.equal(levelOne.id, "first-thread-01");
  assert.equal(getLevelIndex("master-sampler-10"), 9);
});

test("every production level still passes full solver validation", () => {
  for (const level of catalog.levels) {
    const result = validateLevel(level);
    assert.equal(result.valid, true, `${level.id}: ${result.issues.map((issue) => issue.message).join("; ")}`);
    assert.equal(result.solutions.exact, true, `${level.id} solution count must be exact, not capped`);
  }
});

test("lookups resolve, and unknown ids resolve to nothing rather than throwing", () => {
  assert.equal(getLevel("orbit-bloom-07")?.title, "Orbit Bloom");
  assert.equal(getLevel("does-not-exist"), undefined);
  assert.equal(getLevelIndex("does-not-exist"), -1);
  assert.equal(getCollection("day-and-night")?.title, "Day & Night");
  assert.equal(getCollection("nope"), undefined);
  assert.equal(getChapter("day-and-night-ch02")?.title, "After Dark");
  assert.equal(getChapter("nope"), undefined);
});

test("every chapter declares a capstone, and the capstone is its last level", () => {
  for (const collection of catalog.collections) {
    for (const chapter of collection.chapters) {
      assert.equal(chapter.capstoneLevelId, chapter.levelIds[chapter.levelIds.length - 1], chapter.id);
    }
  }
});

test("collection and chapter display copy is present, so no screen has to invent it", () => {
  for (const collection of catalog.collections) {
    assert.ok(collection.title.length > 0);
    assert.ok(collection.subtitle.length > 0);
    assert.ok(collection.description.length > 0);
    assert.ok(collection.chapters.length > 0);
    for (const chapter of collection.chapters) {
      assert.ok(chapter.title.length > 0, chapter.id);
      assert.ok(chapter.subtitle.length > 0, chapter.id);
      assert.ok(chapter.entries.length > 0, chapter.id);
      for (const entry of chapter.entries) {
        assert.ok(entry.teaches.length > 0, `${entry.level.id} must declare what it teaches`);
      }
    }
  }
});

// ---- Loud failures on bad authoring ---------------------------------------

function sourceWithChapters(id: string, chapters: CollectionSource["chapters"]): CollectionSource {
  return {
    id,
    title: id,
    subtitle: "",
    description: "",
    order: 1,
    theme: { accent: "gold", motif: "" },
    chapters
  };
}

const sampleChapter = catalog.collections[0].chapters[0];

test("duplicate collection ids fail loudly", () => {
  const one = sourceWithChapters("dupe", [sampleChapter]);
  assert.throws(() => buildCatalog([one, { ...one, order: 2 }]), /duplicate collection id 'dupe'/);
});

test("duplicate chapter ids fail loudly, even across different collections", () => {
  const one = sourceWithChapters("a", [sampleChapter]);
  const two = { ...sourceWithChapters("b", [sampleChapter]), order: 2 };
  assert.throws(() => buildCatalog([one, two]), /duplicate chapter id/);
});

test("a level appearing in two chapters fails loudly", () => {
  const twin = { ...sampleChapter, id: "twin-chapter", order: 2 };
  assert.throws(() => buildCatalog([sourceWithChapters("solo", [sampleChapter, twin])]), /duplicate level id/);
});

test("a chapter whose capstone is not its last level fails loudly", () => {
  const broken = { ...sampleChapter, capstoneLevelId: sampleChapter.levelIds[0] };
  assert.throws(() => buildCatalog([sourceWithChapters("solo", [broken])]), /must end on its capstone/);
});

test("a capstone that is not in the chapter fails loudly", () => {
  const broken = { ...sampleChapter, capstoneLevelId: "not-here" };
  assert.throws(() => buildCatalog([sourceWithChapters("solo", [broken])]), /which is not in the chapter/);
});

test("an empty chapter or an empty collection fails loudly", () => {
  assert.throws(() => buildCatalog([sourceWithChapters("solo", [])]), /has no chapters/);
  assert.throws(
    () => buildCatalog([sourceWithChapters("solo", [{ ...sampleChapter, entries: [] }])]),
    /has no levels/
  );
});

test("duplicate or non-ascending chapter order fails loudly", () => {
  const clash = { ...sampleChapter, id: "clash" };
  assert.throws(
    () => buildCatalog([sourceWithChapters("solo", [sampleChapter, clash])]),
    /chapter order in collection 'solo' must be unique and ascending/
  );
});
