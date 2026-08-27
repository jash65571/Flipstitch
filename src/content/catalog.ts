/**
 * The FlipStitch content registry.
 *
 * `buildCatalog` is the single place where authored collections become the
 * deterministic play order the rest of the game reads. It fails loudly — at
 * import time, so a bad edit breaks the tests and the build rather than a
 * player's save — on duplicate ids, misordered chapters, empty chapters, a
 * capstone that is not the last level of its chapter, or a level that appears
 * in more than one chapter.
 *
 * Flat play order is: collections by `order`, chapters by `order`, entries as
 * authored. Linear unlocking and saved progress both read that order, so it is
 * a compatibility surface: reordering existing levels changes what players
 * have unlocked.
 */
import type { Level } from "../game/types.ts";
import { dayAndNight } from "./collections/day-and-night/collection.ts";
import { knotAndBramble } from "./collections/knot-and-bramble/collection.ts";
import type { Catalog, Chapter, Collection, CollectionSource } from "./types.ts";

/** Every authored collection, in no particular order — `order` decides. */
export const COLLECTION_SOURCES: readonly CollectionSource[] = [dayAndNight, knotAndBramble];

function fail(message: string): never {
  throw new Error(`FlipStitch catalog is invalid: ${message}`);
}

function assertUnique(kind: string, ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (id.trim().length === 0) fail(`a ${kind} has an empty id.`);
    if (seen.has(id)) fail(`duplicate ${kind} id '${id}'.`);
    seen.add(id);
  }
}

function assertAscendingDistinct(kind: string, orders: readonly number[], where: string): void {
  for (let index = 0; index < orders.length; index += 1) {
    if (!Number.isInteger(orders[index])) fail(`${kind} order in ${where} must be an integer.`);
    if (index > 0 && orders[index] <= orders[index - 1]) {
      fail(`${kind} order in ${where} must be unique and ascending (saw ${orders[index - 1]} then ${orders[index]}).`);
    }
  }
}

export function buildCatalog(sources: readonly CollectionSource[]): Catalog {
  const orderedCollections = [...sources].sort((a, b) => a.order - b.order);
  assertUnique("collection", orderedCollections.map((collection) => collection.id));
  assertAscendingDistinct("collection", orderedCollections.map((collection) => collection.order), "the catalog");

  const allChapterIds: string[] = [];
  const allLevelIds: string[] = [];
  const allLevels: Level[] = [];
  const collections: Collection[] = [];

  for (const source of orderedCollections) {
    if (source.chapters.length === 0) fail(`collection '${source.id}' has no chapters.`);
    const orderedChapters = [...source.chapters].sort((a, b) => a.order - b.order);
    assertAscendingDistinct("chapter", orderedChapters.map((chapter) => chapter.order), `collection '${source.id}'`);

    const chapters: Chapter[] = [];
    const collectionLevels: Level[] = [];

    for (const chapterSource of orderedChapters) {
      allChapterIds.push(chapterSource.id);
      if (chapterSource.entries.length === 0) fail(`chapter '${chapterSource.id}' has no levels.`);

      const levels = chapterSource.entries.map((entry) => entry.level);
      const levelIds = levels.map((level) => level.id);
      const lastId = levelIds[levelIds.length - 1];
      if (!levelIds.includes(chapterSource.capstoneLevelId)) {
        fail(`chapter '${chapterSource.id}' names capstone '${chapterSource.capstoneLevelId}', which is not in the chapter.`);
      }
      if (chapterSource.capstoneLevelId !== lastId) {
        fail(`chapter '${chapterSource.id}' must end on its capstone; '${lastId}' comes after '${chapterSource.capstoneLevelId}'.`);
      }

      allLevelIds.push(...levelIds);
      allLevels.push(...levels);
      collectionLevels.push(...levels);
      chapters.push({ ...chapterSource, collectionId: source.id, levels, levelIds });
    }

    const { chapters: _authored, ...meta } = source;
    collections.push({
      ...meta,
      chapters,
      levels: collectionLevels,
      levelIds: collectionLevels.map((level) => level.id)
    });
  }

  assertUnique("chapter", allChapterIds);
  assertUnique("level", allLevelIds);

  return { collections, levels: allLevels, levelIds: allLevelIds };
}

/** The live catalog. Built once at import; throws if authored content is bad. */
export const catalog: Catalog = buildCatalog(COLLECTION_SOURCES);

/**
 * Flat play order across the whole catalog. This is what linear unlocking,
 * `ProgressProvider`, and the playtest report consume.
 */
export const levels: readonly Level[] = catalog.levels;

/** The very first level of the game. */
export const levelOne: Level = catalog.levels[0];

const levelById = new Map(catalog.levels.map((level) => [level.id, level] as const));

export function getLevel(levelId: string): Level | undefined {
  return levelById.get(levelId);
}

export function getLevelIndex(levelId: string): number {
  return catalog.levels.findIndex((level) => level.id === levelId);
}

export function getCollection(collectionId: string) {
  return catalog.collections.find((collection) => collection.id === collectionId);
}

export function getChapter(chapterId: string) {
  for (const collection of catalog.collections) {
    const chapter = collection.chapters.find((candidate) => candidate.id === chapterId);
    if (chapter) return chapter;
  }
  return undefined;
}
