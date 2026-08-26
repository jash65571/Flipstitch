import { canonicalEdgeKey, oppositeSide, solveFromState, targetEdges } from "./solver.ts";
import type { GameState, Level, Move, MoveResult, StitchEdge } from "./types.ts";

export { oppositeSide } from "./solver.ts";

export function edgeKey(edge: StitchEdge): string {
  return canonicalEdgeKey(edge);
}

export function createGame(level: Level): GameState {
  return {
    activeSide: level.startSide,
    currentHole: level.startHole,
    moves: [],
    usedEdges: new Set<string>(),
    complete: false
  };
}

export function availableNodes(level: Level, state: GameState): string[] {
  return targetEdges(level)
    .filter((edge) => edge.side === state.activeSide && !state.usedEdges.has(edgeKey(edge)))
    .filter((edge) => edge.from === state.currentHole || edge.to === state.currentHole)
    .map((edge) => (edge.from === state.currentHole ? edge.to : edge.from));
}

export function playMove(level: Level, state: GameState, targetNode: string): MoveResult {
  if (state.complete) {
    return { ok: false, state, reason: "complete" };
  }

  if (targetNode === state.currentHole) {
    return { ok: false, state, reason: "same-hole" };
  }

  const matchingEdge = targetEdges(level).find(
    (edge) =>
      edge.side === state.activeSide &&
      ((edge.from === state.currentHole && edge.to === targetNode) ||
        (edge.to === state.currentHole && edge.from === targetNode))
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
  const move: Move = { ...matchingEdge, from: state.currentHole, to: targetNode, key };
  const complete = usedEdges.size === targetEdges(level).length;

  return {
    ok: true,
    completedNow: complete,
    state: {
      activeSide: oppositeSide(state.activeSide),
      currentHole: targetNode,
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
    currentHole: lastMove?.to ?? level.startHole,
    moves,
    usedEdges,
    complete: false
  };
}

export function progress(level: Level, state: GameState): number {
  return state.usedEdges.size / targetEdges(level).length;
}

export function nextHint(level: Level, state: GameState): string | null {
  if (state.complete) {
    return null;
  }

  const continuation = solveFromState(level, state, 1).solutions[0];
  return continuation?.[1] ?? null;
}
