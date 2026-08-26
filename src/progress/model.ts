import type { Level } from "../game/types.ts";

export const PROGRESS_VERSION = 1;

export type CompletionRecord = {
  bestMoves: number;
};

export type ProgressData = {
  version: typeof PROGRESS_VERSION;
  completed: Record<string, CompletionRecord>;
  lastPlayedLevelId: string | null;
};

export function emptyProgress(): ProgressData {
  return { version: PROGRESS_VERSION, completed: {}, lastPlayedLevelId: null };
}

export function readProgress(raw: string | null, levels: readonly Level[]): ProgressData {
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    if (parsed.version !== PROGRESS_VERSION || typeof parsed.completed !== "object" || parsed.completed === null) {
      return emptyProgress();
    }
    const validIds = new Set(levels.map((level) => level.id));
    const completed: Record<string, CompletionRecord> = {};
    for (const [levelId, record] of Object.entries(parsed.completed)) {
      if (validIds.has(levelId) && Number.isInteger(record?.bestMoves) && record.bestMoves > 0) {
        completed[levelId] = { bestMoves: record.bestMoves };
      }
    }
    const lastPlayedLevelId = parsed.lastPlayedLevelId && validIds.has(parsed.lastPlayedLevelId)
      ? parsed.lastPlayedLevelId
      : null;
    return { version: PROGRESS_VERSION, completed, lastPlayedLevelId };
  } catch {
    return emptyProgress();
  }
}

export function unlockedLevelCount(progress: ProgressData, levels: readonly Level[]): number {
  let contiguousCompleted = 0;
  while (contiguousCompleted < levels.length && progress.completed[levels[contiguousCompleted].id]) {
    contiguousCompleted += 1;
  }
  return Math.min(levels.length, Math.max(1, contiguousCompleted + 1));
}

export function isLevelUnlocked(progress: ProgressData, levels: readonly Level[], levelId: string): boolean {
  const index = levels.findIndex((level) => level.id === levelId);
  return index >= 0 && index < unlockedLevelCount(progress, levels);
}

export function resumeLevelId(progress: ProgressData, levels: readonly Level[]): string {
  const count = unlockedLevelCount(progress, levels);
  const lastUnlocked = levels[Math.max(0, count - 1)]?.id ?? levels[0].id;
  if (progress.lastPlayedLevelId && isLevelUnlocked(progress, levels, progress.lastPlayedLevelId)) {
    const playedIndex = levels.findIndex((level) => level.id === progress.lastPlayedLevelId);
    if (!progress.completed[progress.lastPlayedLevelId] || playedIndex === levels.length - 1) {
      return progress.lastPlayedLevelId;
    }
  }
  return lastUnlocked;
}

export function recordLevelStart(progress: ProgressData, levelId: string): ProgressData {
  return { ...progress, lastPlayedLevelId: levelId };
}

export function recordCompletion(progress: ProgressData, levelId: string, moves: number): ProgressData {
  const currentBest = progress.completed[levelId]?.bestMoves;
  return {
    ...progress,
    completed: {
      ...progress.completed,
      [levelId]: { bestMoves: currentBest ? Math.min(currentBest, moves) : moves }
    },
    lastPlayedLevelId: levelId
  };
}
