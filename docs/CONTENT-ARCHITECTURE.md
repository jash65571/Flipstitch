# Content Architecture

How FlipStitch content is modelled, registered, navigated, and validated.
Written in Prompt 7, when the game stopped being a ten-level prototype and had
to become something that can hold hundreds of handcrafted hoops.

## The problem this replaces

Before Prompt 7 the whole game was one file:

```ts
// src/game/levels.ts
export const levels = authoredLevels.map(assertValidLevel);   // one flat array
```

Every screen indexed that array directly. `LevelSelectScreen` hard-coded the
words `CHAPTER ONE`, `Day & Night`, and `Ten hoops` in its JSX. The level route
computed Next and Previous as `index + 1` / `index - 1`. Each `Level` carried a
`collection: string` field that was a display label, not a relationship.

That works for ten levels and fails for a hundred: there is nowhere to put a
second collection, no chapter boundary to navigate, no per-chapter progress, and
every new piece of content means editing a screen.

## The model

```text
Catalog
  Collection            id, title, subtitle, description, order, theme
    Chapter             id, title, subtitle, order, role, capstone, resetsDifficulty
      ChapterEntry      level + progression role + concepts taught + pacing note
        Level           geometry, targets, authored solution, difficulty, copy
```

Types live in `src/content/types.ts`. Three boundaries matter:

**A `Level` does not know where it lives.** It has no collection, chapter,
position, or role. It describes *the puzzle*: holes, front/back targets, the
authored solution, its measured difficulty label, and its teaching copy. The
`collection: string` field was removed in Prompt 7 for exactly this reason —
a level can now be re-placed without touching the puzzle, and a screen has one
source of truth for titles instead of two.

**A `ChapterEntry` is where position lives.** It pairs a level with its
`PacingRole` (`teach`, `practice`, `twist`, `pressure`, `combine`, `capstone`),
the curriculum concepts it teaches, and an optional `pacingNote` justifying a
deliberate difficulty drop. See `docs/PROGRESSION-PACING.md`.

**`src/content/` never imports progress or storage.** Completion is passed into
navigation as a predicate (`CompletionLookup`), so the content layer stays pure
and testable with no storage in the loop.

## Files

```text
src/content/
  types.ts                                   the hierarchy and its vocabulary
  catalog.ts                                 registry, ordering, loud validation
  navigation.ts                              contexts, prev/next, progress rollups
  pacing.ts                                  chapter pacing invariants + warnings
  collections/
    day-and-night/
      collection.ts                          display copy and chapter list
      chapter-01-first-light.ts              levels 1-5 and their roles
      chapter-02-after-dark.ts               levels 6-10 and their roles
```

A new collection is a new folder plus one line in `COLLECTION_SOURCES`. No
screen changes, no navigation changes, no progress changes. `levels.ts` can
never become a 5,000-line file because a chapter file holds one chapter.

## Ordering is a compatibility surface

`buildCatalog` produces the flat play order as: collections by `order`, then
chapters by `order`, then entries as authored. That order is what linear
unlocking and saved progress read.

**Reordering existing levels silently rewrites what current players have
unlocked.** `catalog.test.ts` pins the ten shipped ids in their exact sequence
so that change cannot happen by accident.

## Failing loudly

`buildCatalog` throws at import time — so a bad edit breaks `npm test`, the
typecheck, and the bundle, never a player's save — on:

| Condition | Error |
|---|---|
| Two collections share an id | `duplicate collection id` |
| Two chapters share an id, anywhere in the catalog | `duplicate chapter id` |
| A level appears in two chapters | `duplicate level id` |
| Chapter `order` is duplicated or descending | `must be unique and ascending` |
| A collection has no chapters, or a chapter no levels | `has no chapters` / `has no levels` |
| The declared capstone is not in the chapter | `which is not in the chapter` |
| The capstone is not the chapter's last level | `must end on its capstone` |

Every production level additionally runs `assertValidLevel` at module load, as
it did before: geometry, side alternation, edge reuse, authored solution,
solution count, and dead-end intent are all checked before the app can start.

## Navigation

`src/content/navigation.ts` is the single source of truth for "where am I?".
Screens and routes never index the level array.

```ts
getLevelContext(levelId)          // level, entry, chapter, collection, numbering, boundaries
getNextLevelId(levelId)           // crosses chapter and collection seams
getPreviousLevelId(levelId)
getChapterForLevel(levelId)
getCollectionForLevel(levelId)
getFirstLevelIdOfChapter(id)      // and getLastLevelIdOfChapter
getChapterProgress(chapter, isCompleted)
getCollectionProgress(collection, isCompleted)
getCatalogProgress(isCompleted)
```

A `LevelContext` also reports the boundaries themselves — `isChapterFirst`,
`isChapterLast`, `isCollectionLast`, `isCatalogLast` — so a screen can mark a
seam without recomputing anything.

Previous and Next walk the **flat catalog order**, so they step straight across
a chapter or collection boundary. Level 5 (`forked-needle-05`, end of First
Light) and level 6 (`echo-stairs-06`, start of After Dark) are adjacent for
navigation and separated for presentation. That is deliberate: the sampler is
one continuous thread, and the chapter is a seam in the cloth, not a wall.

Player-facing numbering (`levelNumber`) stays continuous 1…N across the whole
catalog; `chapterPosition` restarts per chapter for content tooling.

## Progress compatibility

`PROGRESS_VERSION` stays at **1**. The storage schema — `{ version, completed,
lastPlayedLevelId }` keyed by level id — did not change, because level ids and
their order did not change. Bumping the version "for cleanliness" would have
wiped real saves for no benefit, so it was not bumped and no migration was
written.

What *is* written is proof: `src/progress/model.test.ts` loads hard-coded
version-1 payloads (written the way the shipped app wrote them before the
refactor, not re-serialised from today's code) and asserts completions, best
move counts, unlocks, and resume all survive — including a save that spans the
new chapter seam.

## Where the screens get their words

`LevelSelectScreen` reads `collection.subtitle`, `collection.title`,
`collection.description`, `chapter.title`, `chapter.subtitle`, and the progress
rollups. `GameScreen` receives `collectionTitle` and `chapterTitle` as props
from the level route, which reads them off the `LevelContext`.

There is no hard-coded content copy left in any screen. Adding a chapter changes
the gallery without changing the gallery's code.

## Related documents

- `docs/PROGRESSION-PACING.md` — the pacing model and its invariants
- `docs/PUZZLE-CURRICULUM.md` — the reasoning skills content can teach
- `docs/DIFFICULTY-MATRIX.md` — the measured difficulty score
- `docs/LEVEL-DESIGN-GUIDE.md` — how to author a single hoop
