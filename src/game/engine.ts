import { canonicalEdgeKey, oppositeSide, solveFromState, targetEdges } from "./solver.ts";
import type { GameState, GuidanceLevel, HintStage, Level, Move, MoveResult, StagedHint, StitchEdge } from "./types.ts";

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

/** Effective guidance for a level; levels default to full guidance. */
export function guidanceFor(level: Level): GuidanceLevel {
  return level.guidance ?? "full";
}

/**
 * The thread is caught when the level is not complete yet, but no legal unused
 * stitch leaves the current hole on the current side. This is a genuine dead
 * end — not an "eventually unwinnable" prediction — so it never spoils a hint.
 * A completed game is never stuck.
 */
export function isGameStuck(level: Level, state: GameState): boolean {
  if (state.complete) {
    return false;
  }
  return availableNodes(level, state).length === 0;
}

const GENERIC_CLUES = {
  concept: "One thread must cross every line on both sides. Trace where it still has to go.",
  region: "Look at the holes still linked to the needle on this side."
} as const;

/**
 * Staged, opt-in help. The player chooses how far to escalate:
 *   1. a conceptual clue about the route or loop (reveals no holes),
 *   2. a region/branch clue that softly marks the candidate holes,
 *   3. the exact next hole that keeps a full solution open.
 * Stage 3 delegates to the solver, so it is always correct even when authors
 * only wrote the softer copy.
 */
export function stagedHint(level: Level, state: GameState, stage: HintStage): StagedHint {
  const options = availableNodes(level, state);
  const concept = level.clues?.concept ?? level.hintText ?? GENERIC_CLUES.concept;
  const region = level.clues?.region ?? GENERIC_CLUES.region;

  if (stage === 1) {
    return { stage, kind: "concept", text: concept, regionHoles: [], exactHole: null };
  }
  if (stage === 2) {
    const text = options.length > 0 ? region : "No stitch leaves this hole. Undo to free the thread.";
    return { stage, kind: "region", text, regionHoles: options, exactHole: null };
  }

  const exact = nextHint(level, state);
  const text = exact
    ? `Stitch to hole ${exact.toUpperCase()} — it keeps a full solution open.`
    : "This branch is caught. Undo the last stitch and try another route.";
  return { stage, kind: "exact", text, regionHoles: options, exactHole: exact };
}
