export type Side = "front" | "back";

export type Difficulty = "Gentle" | "Easy" | "Moderate" | "Tricky" | "Expert";

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
  completionMessage: string;
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
