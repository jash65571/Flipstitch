import assert from "node:assert/strict";
import test from "node:test";

import { emptyProgress, recordCompletion, resumeLevelId } from "../progress/model.ts";
import { catalog, levels } from "./catalog.ts";
import {
  getCatalogProgress,
  getChapterForLevel,
  getChapterProgress,
  getCollectionForLevel,
  getCollectionProgress,
  getCollectionUnlockState,
  getFirstLevelIdOfChapter,
  getLastLevelIdOfChapter,
  getLevelContext,
  getNextLevelId,
  getPreviousLevelId
} from "./navigation.ts";

test("every level resolves to a context, and unknown ids resolve to nothing", () => {
  for (const level of levels) {
    assert.ok(getLevelContext(level.id), level.id);
  }
  assert.equal(getLevelContext("not-a-level"), undefined);
  assert.equal(getNextLevelId("not-a-level"), null);
  assert.equal(getPreviousLevelId("not-a-level"), null);
});

test("next and previous walk the whole catalog in play order", () => {
  for (const [index, level] of levels.entries()) {
    assert.equal(getPreviousLevelId(level.id), index === 0 ? null : levels[index - 1].id, level.id);
    assert.equal(getNextLevelId(level.id), index === levels.length - 1 ? null : levels[index + 1].id, level.id);
  }
});

test("navigation crosses a chapter boundary without a gap", () => {
  // Forked Needle ends Chapter One; Echo Stairs opens Chapter Two. Next must
  // step straight across, and Previous must step straight back.
  assert.equal(getNextLevelId("forked-needle-05"), "echo-stairs-06");
  assert.equal(getPreviousLevelId("echo-stairs-06"), "forked-needle-05");

  const end = getLevelContext("forked-needle-05")!;
  const start = getLevelContext("echo-stairs-06")!;
  assert.equal(end.isChapterLast, true);
  assert.equal(end.isCollectionLast, false);
  assert.equal(start.isChapterFirst, true);
  assert.equal(start.isCollectionFirst, false);
  assert.notEqual(end.chapter.id, start.chapter.id);
  assert.equal(end.collection.id, start.collection.id);
});

test("boundaries at the very start and very end of the catalog are honest", () => {
  const first = getLevelContext(levels[0].id)!;
  const last = getLevelContext(levels[levels.length - 1].id)!;
  assert.equal(first.previousLevelId, null);
  assert.equal(first.isCatalogFirst, true);
  assert.equal(first.isChapterFirst, true);
  assert.equal(first.isCollectionFirst, true);
  assert.equal(last.nextLevelId, null);
  assert.equal(last.isCatalogLast, true);
  assert.equal(last.isChapterLast, true);
  assert.equal(last.isCollectionLast, true);
});

test("level numbering is continuous across chapters and collections", () => {
  const numbers = levels.map((level) => getLevelContext(level.id)!.levelNumber);
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  // Position inside the chapter restarts; the player-facing number does not.
  assert.equal(getLevelContext("echo-stairs-06")!.chapterPosition, 1);
  assert.equal(getLevelContext("echo-stairs-06")!.levelNumber, 6);
  assert.equal(getLevelContext("root-knot-11")!.chapterPosition, 1);
  assert.equal(getLevelContext("root-knot-11")!.levelNumber, 11);
});

test("a level knows its chapter and its collection", () => {
  assert.equal(getChapterForLevel("twin-petals-03")?.id, "day-and-night-ch01");
  assert.equal(getCollectionForLevel("twin-petals-03")?.id, "day-and-night");
  assert.equal(getChapterForLevel("moonlit-return-09")?.id, "day-and-night-ch02");
  assert.equal(getChapterForLevel("nope"), undefined);
});

test("chapter endpoints resolve by chapter id", () => {
  assert.equal(getFirstLevelIdOfChapter("day-and-night-ch01"), "first-thread-01");
  assert.equal(getLastLevelIdOfChapter("day-and-night-ch01"), "forked-needle-05");
  assert.equal(getFirstLevelIdOfChapter("day-and-night-ch02"), "echo-stairs-06");
  assert.equal(getLastLevelIdOfChapter("day-and-night-ch02"), "master-sampler-10");
  assert.equal(getFirstLevelIdOfChapter("nope"), null);
  assert.equal(getLastLevelIdOfChapter("nope"), null);
});

test("chapter and collection progress count only their own levels", () => {
  const completed = new Set(["first-thread-01", "kite-tail-02", "master-sampler-10"]);
  const isCompleted = (levelId: string) => completed.has(levelId);
  const [chapterOne, chapterTwo] = catalog.collections[0].chapters;

  const one = getChapterProgress(chapterOne, isCompleted);
  assert.deepEqual(one, { total: 5, completed: 2, finished: false, nextIncompleteLevelId: "twin-petals-03" });

  const two = getChapterProgress(chapterTwo, isCompleted);
  assert.deepEqual(two, { total: 5, completed: 1, finished: false, nextIncompleteLevelId: "echo-stairs-06" });

  const collection = getCollectionProgress(catalog.collections[0], isCompleted);
  assert.equal(collection.total, 10);
  assert.equal(collection.completed, 3);
  assert.equal(collection.finished, false);
});

test("a finished chapter reports finished with no next incomplete level", () => {
  const isCompleted = (levelId: string) => catalog.collections[0].chapters[0].levelIds.includes(levelId);
  const one = getChapterProgress(catalog.collections[0].chapters[0], isCompleted);
  assert.equal(one.finished, true);
  assert.equal(one.nextIncompleteLevelId, null);
  assert.equal(getCatalogProgress(isCompleted).finished, false);
});

test("resume survives a chapter boundary", () => {
  // Finish everything in Chapter One. Resume must land on the first level of
  // Chapter Two, not stall at the chapter's last completed hoop.
  let progress = emptyProgress();
  for (const levelId of catalog.collections[0].chapters[0].levelIds) {
    progress = recordCompletion(progress, levelId, 6);
  }
  const resumeId = resumeLevelId(progress, levels);
  assert.equal(resumeId, "echo-stairs-06");
  assert.equal(getLevelContext(resumeId)!.chapter.id, "day-and-night-ch02");
});

test("resume on the final level of the catalog stays there rather than falling off the end", () => {
  let progress = emptyProgress();
  for (const level of levels) {
    progress = recordCompletion(progress, level.id, 6);
  }
  assert.equal(resumeLevelId(progress, levels), "knots-end-20");
  assert.equal(getNextLevelId("knots-end-20"), null);
});

test("the first collection is always unlocked; a later one is locked until the one before it finishes", () => {
  const [dayAndNight, knotAndBramble] = catalog.collections;
  assert.equal(getCollectionUnlockState(dayAndNight, () => false).unlocked, true);

  const noneCompleted = getCollectionUnlockState(knotAndBramble, () => false);
  assert.equal(noneCompleted.unlocked, false);
  assert.match(noneCompleted.reason ?? "", /Day & Night/);

  const isDayAndNightComplete = (levelId: string) => dayAndNight.levelIds.includes(levelId);
  const allComplete = getCollectionUnlockState(knotAndBramble, isDayAndNightComplete);
  assert.equal(allComplete.unlocked, true);
  assert.equal(allComplete.reason, null);
});

test("resume lands on Collection 02's first level once Collection 01 is finished", () => {
  let progress = emptyProgress();
  for (const levelId of catalog.collections[0].levelIds) {
    progress = recordCompletion(progress, levelId, 6);
  }
  const resumeId = resumeLevelId(progress, levels);
  assert.equal(resumeId, "root-knot-11");
  assert.equal(getLevelContext(resumeId)!.collection.id, "knot-and-bramble");
});
