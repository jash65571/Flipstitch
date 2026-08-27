/**
 * FlipStitch content hierarchy.
 *
 *   Catalog → Collection → Chapter → Level
 *
 * The hierarchy exists so the game can grow to many collections and hundreds
 * of handcrafted levels without rewriting navigation, progress, or the
 * gallery. Everything a screen needs to render content — titles, subtitles,
 * counts, ordering — lives here as data, never as hard-coded copy in a screen.
 *
 * Two ideas are deliberately kept apart:
 *
 * - **Measured difficulty** (`src/game/analyzer.ts`) describes *the puzzle*.
 *   It is a 0-100 property of the graph, independent of where the level sits.
 * - **Progression role** (`PacingRole`, below) describes *the position*: what
 *   this level is for in its chapter. A chapter paces roles; it does not
 *   require the score to rise forever.
 *
 * See docs/CONTENT-ARCHITECTURE.md and docs/PROGRESSION-PACING.md.
 */
import type { Level } from "../game/types.ts";

/**
 * What a level is *for* where it sits. Roles pace a chapter; they say nothing
 * about the measured score, which is a property of the puzzle itself.
 *
 * - `teach`    introduces one new reasoning idea in its easiest honest form.
 * - `practice` reuses that idea with no new idea attached (a safe win).
 * - `twist`    reframes a learned idea so the habit it built is now wrong.
 * - `pressure` keeps the idea and raises the cost of a mistake.
 * - `combine`  requires two or more previously separate ideas at once.
 * - `capstone` closes a chapter; it must be among the hardest in the chapter.
 */
export type PacingRole = "teach" | "practice" | "twist" | "pressure" | "combine" | "capstone";

export const PACING_ROLES: readonly PacingRole[] = [
  "teach",
  "practice",
  "twist",
  "pressure",
  "combine",
  "capstone"
];

/**
 * A chapter's job inside its collection.
 *
 * - `tutorial`    the player's first contact; must open approachable.
 * - `development` widens an already-taught skill set.
 * - `mastery`     demands combination and planning depth.
 */
export type ChapterRole = "tutorial" | "development" | "mastery";

/** Curriculum concept ids, defined in docs/PUZZLE-CURRICULUM.md. */
export type ConceptId =
  | "forced-flip"
  | "safe-branch"
  | "return-loop"
  | "shared-hole"
  | "hub"
  | "dangerous-fork"
  | "runner"
  | "delayed-trap"
  | "linked-return"
  | "ordering-discipline"
  | "multi-region"
  // Tier 2 (docs/PUZZLE-CURRICULUM.md) — introduced in Collection 02.
  | "nested-obligation"
  | "asymmetric-hub"
  | "interacting-runners"
  | "converging-openings";

/** One authored level in its progression position. */
export type ChapterEntry = {
  level: Level;
  role: PacingRole;
  /** Curriculum concepts this level teaches or exercises. */
  teaches: readonly ConceptId[];
  /**
   * Required whenever this level's measured score drops materially below the
   * previous level in the chapter, or whenever the role sequence breaks the
   * default order. The pacing validator treats an unexplained drop as a hard
   * failure; an authored reason makes the intent reviewable.
   */
  pacingNote?: string;
};

/** Authoring shape for a chapter. `buildCatalog` derives ids and indexes. */
export type ChapterSource = {
  id: string;
  title: string;
  subtitle: string;
  /** Display order inside the collection. Must be unique and ascending. */
  order: number;
  role: ChapterRole;
  /**
   * True when this chapter is expected to open below the previous chapter's
   * peak (a fresh learning arc). False when it deliberately continues one arc
   * across the boundary — the pacing validator relaxes its opener rule then.
   */
  resetsDifficulty: boolean;
  entries: readonly ChapterEntry[];
  /** The level that closes the chapter. Must be the last entry. */
  capstoneLevelId: string;
};

/** Optional, purely presentational metadata. Never affects rules. */
export type CollectionTheme = {
  /** Token name from src/theme/tokens.ts, resolved by the screen. */
  accent: "gold" | "teal" | "sage" | "brass";
  /** One-line description of the stitched motif, for gallery copy. */
  motif: string;
};

/** Authoring shape for a collection. */
export type CollectionSource = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  /** Display order in the catalog. Must be unique and ascending. */
  order: number;
  theme: CollectionTheme;
  chapters: readonly ChapterSource[];
};

/** A chapter after catalog assembly: back-references and indexes resolved. */
export type Chapter = ChapterSource & {
  collectionId: string;
  levels: readonly Level[];
  levelIds: readonly string[];
};

/** A collection after catalog assembly. */
export type Collection = Omit<CollectionSource, "chapters"> & {
  chapters: readonly Chapter[];
  levels: readonly Level[];
  levelIds: readonly string[];
};

/**
 * The assembled game catalog. `levels` is the deterministic flat play order:
 * collections by `order`, chapters by `order`, entries as authored. Linear
 * unlocking and saved progress both read this order.
 */
export type Catalog = {
  collections: readonly Collection[];
  levels: readonly Level[];
  levelIds: readonly string[];
};

/** Everything a screen or route needs to know about one level's position. */
export type LevelContext = {
  level: Level;
  entry: ChapterEntry;
  chapter: Chapter;
  collection: Collection;
  /** 0-based index in the whole catalog. */
  globalIndex: number;
  /** 1-based number shown to players ("LEVEL 7"). */
  levelNumber: number;
  /** 0-based index inside the chapter. */
  chapterIndex: number;
  /** 1-based position inside the chapter. */
  chapterPosition: number;
  previousLevelId: string | null;
  nextLevelId: string | null;
  isChapterFirst: boolean;
  isChapterLast: boolean;
  isCollectionFirst: boolean;
  isCollectionLast: boolean;
  isCatalogFirst: boolean;
  isCatalogLast: boolean;
};

/** Completion counts for a chapter or collection. */
export type ContentProgress = {
  total: number;
  completed: number;
  /** True when every level in the unit is complete. */
  finished: boolean;
  /** First incomplete level id, or null when the unit is finished. */
  nextIncompleteLevelId: string | null;
};
