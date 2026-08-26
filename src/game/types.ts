export type Side = "front" | "back";

export type StitchNode = {
  id: string;
  x: number;
  y: number;
};

export type StitchEdge = {
  from: string;
  to: string;
  side: Side;
};

export type Level = {
  id: string;
  title: string;
  collection: string;
  startNode: string;
  startSide: Side;
  nodes: StitchNode[];
  edges: StitchEdge[];
  solution: string[];
};

export type Move = StitchEdge & {
  key: string;
};

export type GameState = {
  activeSide: Side;
  currentNode: string;
  moves: Move[];
  usedEdges: ReadonlySet<string>;
  complete: boolean;
};

export type MoveResult =
  | { ok: true; state: GameState; completedNow: boolean }
  | { ok: false; state: GameState; reason: "same-hole" | "not-a-stitch" | "already-used" | "complete" };
