/**
 * Content navigation — the one source of truth for "where am I?".
 *
 * Screens and routes must never index the flat level array themselves. They
 * ask for a `LevelContext` and read `previousLevelId` / `nextLevelId` /
 * chapter / collection off it. That keeps chapter and collection boundaries
 * correct in exactly one place as the catalog grows.
 *
 * Previous/Next walk the flat catalog order, so they cross chapter and
 * collection boundaries seamlessly; the context also reports *where* the
 * boundaries are so a screen can mark them without recomputing anything.
 *
 * This module is deliberately free of any progress/storage import. Completion
 * is passed in as a predicate so `src/content/` stays a pure content layer.
 */
import { catalog } from "./catalog.ts";
import type { Catalog, Chapter, Collection, ContentProgress, LevelContext } from "./types.ts";

/** Answers "has this level been completed?" without importing the progress module. */
export type CompletionLookup = (levelId: string) => boolean;

type IndexedContext = { context: LevelContext };

function buildIndex(source: Catalog): Map<string, IndexedContext> {
  const index = new Map<string, IndexedContext>();
  const flat = source.levels;

  for (const collection of source.collections) {
    const collectionFirstId = collection.levelIds[0];
    const collectionLastId = collection.levelIds[collection.levelIds.length - 1];

    for (const chapter of collection.chapters) {
      for (const [chapterIndex, entry] of chapter.entries.entries()) {
        const level = entry.level;
        const globalIndex = flat.findIndex((candidate) => candidate.id === level.id);
        index.set(level.id, {
          context: {
            level,
            entry,
            chapter,
            collection,
            globalIndex,
            levelNumber: globalIndex + 1,
            chapterIndex,
            chapterPosition: chapterIndex + 1,
            previousLevelId: globalIndex > 0 ? flat[globalIndex - 1].id : null,
            nextLevelId: globalIndex < flat.length - 1 ? flat[globalIndex + 1].id : null,
            isChapterFirst: chapterIndex === 0,
            isChapterLast: chapterIndex === chapter.entries.length - 1,
            isCollectionFirst: level.id === collectionFirstId,
            isCollectionLast: level.id === collectionLastId,
            isCatalogFirst: globalIndex === 0,
            isCatalogLast: globalIndex === flat.length - 1
          }
        });
      }
    }
  }

  return index;
}

const contextIndex = buildIndex(catalog);

/** Full positional context for a level, or undefined when the id is unknown. */
export function getLevelContext(levelId: string): LevelContext | undefined {
  return contextIndex.get(levelId)?.context;
}

export function getNextLevelId(levelId: string): string | null {
  return getLevelContext(levelId)?.nextLevelId ?? null;
}

export function getPreviousLevelId(levelId: string): string | null {
  return getLevelContext(levelId)?.previousLevelId ?? null;
}

export function getChapterForLevel(levelId: string): Chapter | undefined {
  return getLevelContext(levelId)?.chapter;
}

export function getCollectionForLevel(levelId: string): Collection | undefined {
  return getLevelContext(levelId)?.collection;
}

export function getFirstLevelIdOfChapter(chapterId: string): string | null {
  for (const collection of catalog.collections) {
    const chapter = collection.chapters.find((candidate) => candidate.id === chapterId);
    if (chapter) return chapter.levelIds[0] ?? null;
  }
  return null;
}

export function getLastLevelIdOfChapter(chapterId: string): string | null {
  for (const collection of catalog.collections) {
    const chapter = collection.chapters.find((candidate) => candidate.id === chapterId);
    if (chapter) return chapter.levelIds[chapter.levelIds.length - 1] ?? null;
  }
  return null;
}

function progressOver(levelIds: readonly string[], isCompleted: CompletionLookup): ContentProgress {
  let completed = 0;
  let nextIncompleteLevelId: string | null = null;
  for (const levelId of levelIds) {
    if (isCompleted(levelId)) {
      completed += 1;
    } else if (nextIncompleteLevelId === null) {
      nextIncompleteLevelId = levelId;
    }
  }
  return {
    total: levelIds.length,
    completed,
    finished: completed === levelIds.length,
    nextIncompleteLevelId
  };
}

export function getChapterProgress(chapter: Chapter, isCompleted: CompletionLookup): ContentProgress {
  return progressOver(chapter.levelIds, isCompleted);
}

export function getCollectionProgress(collection: Collection, isCompleted: CompletionLookup): ContentProgress {
  return progressOver(collection.levelIds, isCompleted);
}

export function getCatalogProgress(isCompleted: CompletionLookup): ContentProgress {
  return progressOver(catalog.levelIds, isCompleted);
}
