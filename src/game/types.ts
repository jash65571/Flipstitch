export type Side = "front" | "back";

export type Difficulty = "Gentle" | "Easy" | "Moderate" | "Tricky" | "Expert";

/**
 * How much the board hands the answer to the player.
 * - "full": every legal destination glows (teaching levels 1-2).
 * - "reduced": the needle and holes are clear, but legal destinations are not
 *   pre-highlighted; the player reads the pattern to choose.
 * - "minimal": as reduced, plus quieter dashed pattern guides.
 * Accessibility labels always expose valid actions regardless of this value.
 */
export type GuidanceLevel = "full" | "reduced" | "minimal";

/**
 * Authored copy for the staged hint escalation. The exact next hole is always
 * derived from the solver at runtime, so authors only write the softer clues.
 * Future levels can omit this and fall back to generic staged copy.
 */
export type LevelClues = {
  /** Stage 1: a conceptual clue about the route or loop. No holes revealed. */
  concept: string;
  /** Stage 2: a clue about the region or branch to look at. */
  region: string;
};

export type StitchHole = {
  id: string;
  x: number;
  y: number;
};

export type EdgePair = {
  from: string;
  to: string;
};

export type StitchEdge = EdgePair & {
  side: Side;
};

export type Level = {
  id: string;
  title: string;
  collection: string;
  difficulty: Difficulty;
  startSide: Side;
  startHole: string;
  holes: StitchHole[];
  frontEdges: EdgePair[];
  backEdges: EdgePair[];
  authoredSolution: string[];
  expectedSolutionCount: number;
  unique: boolean;
  allowDeadEnds: boolean;
  hintText?: string;
  /** Guidance strength for this level. Defaults to "full" when omitted. */
  guidance?: GuidanceLevel;
  /** Authored staged-hint copy. When omitted, generic staged copy is used. */
  clues?: LevelClues;
  completionMessage: string;
};

/** One rung of the staged hint ladder. The player chooses to escalate. */
export type HintStage = 1 | 2 | 3;

export type StagedHint = {
  stage: HintStage;
  /** "concept" reveals nothing on the board; "region" softly marks candidate
   *  holes; "exact" pinpoints the one hole that keeps a full solution open. */
  kind: "concept" | "region" | "exact";
  text: string;
  /** Stage 2: holes to softly highlight as the branch to consider. */
  regionHoles: string[];
  /** Stage 3: the single hole that keeps a complete solution reachable. */
  exactHole: string | null;
};

export type Move = StitchEdge & {
  key: string;
};

export type GameState = {
  activeSide: Side;
  currentHole: string;
  moves: Move[];
  usedEdges: ReadonlySet<string>;
  complete: boolean;
};

export type MoveResult =
  | { ok: true; state: GameState; completedNow: boolean }
  | { ok: false; state: GameState; reason: "same-hole" | "not-a-stitch" | "already-used" | "complete" };
