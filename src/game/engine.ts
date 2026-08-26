import type { GameState, Level, Move, MoveResult, Side, StitchEdge } from "./types.ts";

export function oppositeSide(side: Side): Side {
  return side === "front" ? "back" : "front";
}

export function edgeKey(edge: StitchEdge): string {
  const [first, second] = [edge.from, edge.to].sort();
  return `${edge.side}:${first}:${second}`;
}

export function createGame(level: Level): GameState {
  return {
    activeSide: level.startSide,
    currentNode: level.startNode,
    moves: [],
    usedEdges: new Set<string>(),
    complete: false
  };
}

export function availableNodes(level: Level, state: GameState): string[] {
  return level.edges
    .filter((edge) => edge.side === state.activeSide && !state.usedEdges.has(edgeKey(edge)))
    .filter((edge) => edge.from === state.currentNode || edge.to === state.currentNode)
    .map((edge) => (edge.from === state.currentNode ? edge.to : edge.from));
}

export function playMove(level: Level, state: GameState, targetNode: string): MoveResult {
  if (state.complete) {
    return { ok: false, state, reason: "complete" };
  }

  if (targetNode === state.currentNode) {
    return { ok: false, state, reason: "same-hole" };
  }

  const matchingEdge = level.edges.find(
    (edge) =>
      edge.side === state.activeSide &&
      ((edge.from === state.currentNode && edge.to === targetNode) ||
        (edge.to === state.currentNode && edge.from === targetNode))
  );

  if (!matchingEdge) {
    return { ok: false, state, reason: "not-a-stitch" };
  }

  const key = edgeKey(matchingEdge);
  if (state.usedEdges.has(key)) {
    return { ok: false, state, reason: "already-used" };
  }

  const usedEdges = new Set(state.usedEdges);
  usedEdges.add(key);
  const move: Move = { ...matchingEdge, from: state.currentNode, to: targetNode, key };
  const complete = usedEdges.size === level.edges.length;

  return {
    ok: true,
    completedNow: complete,
    state: {
      activeSide: oppositeSide(state.activeSide),
      currentNode: targetNode,
      moves: [...state.moves, move],
      usedEdges,
      complete
    }
  };
}

export function undoMove(level: Level, state: GameState): GameState {
  if (state.moves.length === 0) {
    return state;
  }

  const moves = state.moves.slice(0, -1);
  const usedEdges = new Set(moves.map((move) => move.key));
  const lastMove = moves.at(-1);

  return {
    activeSide: oppositeSide(state.activeSide),
    currentNode: lastMove?.to ?? level.startNode,
    moves,
    usedEdges,
    complete: false
  };
}

export function progress(level: Level, state: GameState): number {
  return state.usedEdges.size / level.edges.length;
}

export function nextHint(level: Level, state: GameState): string | null {
  if (state.complete) {
    return null;
  }

  const expectedIndex = state.moves.length + 1;
  const expectedNode = level.solution[expectedIndex];
  return availableNodes(level, state).includes(expectedNode) ? expectedNode : availableNodes(level, state)[0] ?? null;
}
