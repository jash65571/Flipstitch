/**
 * Level solving and validation.
 *
 * Two very different jobs live here, and they use two very different
 * algorithms on purpose:
 *
 * 1. **Path finding** (`solveLevel`, `solveFromState`) materialises actual
 *    stitch sequences. Hints need one real continuation, so this stays
 *    path-based — but it is always called with a small `limit`.
 * 2. **Counting and reachability** (`countSolutions`, `analyzeStranding`)
 *    never build a path. They memoise over the state
 *    `(current hole, active side, used-edge set)`, which turns an exponential
 *    walk over *paths* into a linear walk over *states*. Counting a level with
 *    a million solutions costs the same as counting one with two.
 *
 * Counting is exact unless it hits an explicit budget, and it says so:
 * `SolutionCount.exact` is never true for a truncated answer. Nothing in this
 * file reports a capped number as an exact one.
 */
import type { GameState, Level, Side, StitchEdge } from "./types.ts";

export type ValidationIssue = {
  code: string;
  message: string;
};

export type SolverResult = {
  solutions: string[][];
  solutionCount: number;
  deadEndCount: number;
  truncated: boolean;
};

/**
 * An exact-or-honestly-capped count of complete alternating trails.
 *
 * `exact` is true only when the whole state space was explored and the count
 * never reached `cap`. When `exact` is false, `count` is a lower bound.
 */
export type SolutionCount = {
  count: number;
  exact: boolean;
  /** The count ceiling that was applied. */
  cap: number;
  /** Distinct memoised states visited. The real cost driver. */
  statesVisited: number;
  /** True when the state budget stopped the walk early. */
  stateBudgetExceeded: boolean;
};

/** Exact reachability facts that need no path materialised. */
export type StrandingAnalysis = {
  /** Distinct reachable states with no legal unused stitch and no completion. */
  deadEndStates: number;
  /** True when at least one dead end is reachable from the start. */
  canStrand: boolean;
  statesVisited: number;
};

export type LevelValidation = {
  valid: boolean;
  issues: ValidationIssue[];
  solutions: SolutionCount;
  stranding: StrandingAnalysis;
};

/**
 * Default ceilings for authoring tools. A production hoop that trips either of
 * these is a design smell, not a tooling limit — but the tool reports the cap
 * truthfully instead of hanging or lying.
 */
export const DEFAULT_SOLUTION_CAP = 1_000_000;
export const DEFAULT_STATE_BUDGET = 2_000_000;

export function oppositeSide(side: Side): Side {
  return side === "front" ? "back" : "front";
}

export function targetEdges(level: Level): StitchEdge[] {
  return [
    ...level.frontEdges.map((edge) => ({ ...edge, side: "front" as const })),
    ...level.backEdges.map((edge) => ({ ...edge, side: "back" as const }))
  ];
}

export function canonicalEdgeKey(edge: StitchEdge): string {
  const [first, second] = [edge.from, edge.to].sort();
  return `${edge.side}:${first}:${second}`;
}

function matchingUnusedEdges(
  edges: StitchEdge[],
  currentHole: string,
  activeSide: Side,
  used: ReadonlySet<string>
): StitchEdge[] {
  return edges.filter(
    (edge) =>
      edge.side === activeSide &&
      !used.has(canonicalEdgeKey(edge)) &&
      (edge.from === currentHole || edge.to === currentHole)
  );
}

/**
 * Enumerate up to `limit` complete solution *paths*. Only use this when the
 * actual stitch sequence is needed (hints, tests). For counts, uniqueness, or
 * reachability, use `countSolutions` / `analyzeStranding` instead — they are
 * state-memoised and do not blow up on dense hoops.
 */
export function solveLevel(level: Level, limit = Number.POSITIVE_INFINITY): SolverResult {
  return solveFromPosition(level, level.startHole, level.startSide, new Set(), [level.startHole], limit);
}

export function solveFromState(level: Level, state: GameState, limit = 1): SolverResult {
  return solveFromPosition(
    level,
    state.currentHole,
    state.activeSide,
    new Set(state.usedEdges),
    [state.currentHole],
    limit
  );
}

function solveFromPosition(
  level: Level,
  currentHole: string,
  activeSide: Side,
  usedAtStart: ReadonlySet<string>,
  pathAtStart: string[],
  limit: number
): SolverResult {
  const edges = targetEdges(level);
  const solutions: string[][] = [];
  let deadEndCount = 0;
  let truncated = false;

  function visit(current: string, side: Side, used: ReadonlySet<string>, path: string[]) {
    if (solutions.length >= limit) {
      truncated = true;
      return;
    }
    if (used.size === edges.length) {
      solutions.push(path);
      return;
    }

    const choices = matchingUnusedEdges(edges, current, side, used);
    if (choices.length === 0) {
      deadEndCount += 1;
      return;
    }

    for (const edge of choices) {
      const key = canonicalEdgeKey(edge);
      const next = edge.from === current ? edge.to : edge.from;
      const nextUsed = new Set(used);
      nextUsed.add(key);
      visit(next, oppositeSide(side), nextUsed, [...path, next]);
      if (solutions.length >= limit) {
        truncated = true;
        return;
      }
    }
  }

  visit(currentHole, activeSide, usedAtStart, pathAtStart);
  return { solutions, solutionCount: solutions.length, deadEndCount, truncated };
}

/**
 * Compact edge table shared by the counting and reachability passes.
 *
 * A state is `(current hole, active side, used-edge set)`. The used-edge set is
 * a bitmask over target-edge indices, so a state key is a short string and no
 * per-branch array copying happens. Because the mask only ever grows, the state
 * graph is acyclic and plain memoisation is sound.
 */
type EdgeTable = {
  count: number;
  side: Side[];
  from: string[];
  to: string[];
};

function edgeTable(level: Level): EdgeTable {
  const edges = targetEdges(level);
  return {
    count: edges.length,
    side: edges.map((edge) => edge.side),
    from: edges.map((edge) => edge.from),
    to: edges.map((edge) => edge.to)
  };
}

function legalEdgeIndices(table: EdgeTable, hole: string, side: Side, used: bigint): number[] {
  const matches: number[] = [];
  for (let index = 0; index < table.count; index += 1) {
    if (((used >> BigInt(index)) & 1n) === 1n) continue;
    if (table.side[index] !== side) continue;
    if (table.from[index] === hole || table.to[index] === hole) matches.push(index);
  }
  return matches;
}

function stateKeyOf(side: Side, hole: string, used: bigint): string {
  return `${side}:${hole}:${used.toString(36)}`;
}

/**
 * Count every complete alternating trail from the level's start, without ever
 * building a path.
 *
 * Exactness contract: `count` is exact when `exact` is true. It is a lower
 * bound when the count reached `cap` or the state budget ran out, and `exact`
 * is false in both cases. Callers that need certainty (validation, uniqueness)
 * must check `exact`.
 */
export function countSolutions(
  level: Level,
  cap: number = DEFAULT_SOLUTION_CAP,
  stateBudget: number = DEFAULT_STATE_BUDGET
): SolutionCount {
  const table = edgeTable(level);
  const full = table.count;
  const memo = new Map<string, number>();
  let budgetExceeded = false;

  function visit(hole: string, side: Side, used: bigint, depth: number): number {
    if (depth === full) return 1;
    const key = stateKeyOf(side, hole, used);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (memo.size >= stateBudget) {
      budgetExceeded = true;
      return 0;
    }

    let total = 0;
    for (const index of legalEdgeIndices(table, hole, side, used)) {
      const next = table.from[index] === hole ? table.to[index] : table.from[index];
      total += visit(next, oppositeSide(side), used | (1n << BigInt(index)), depth + 1);
      if (total >= cap) {
        total = cap;
        break;
      }
    }

    memo.set(key, total);
    return total;
  }

  const count = visit(level.startHole, level.startSide, 0n, 0);
  return {
    count,
    exact: !budgetExceeded && count < cap,
    cap,
    statesVisited: memo.size,
    stateBudgetExceeded: budgetExceeded
  };
}

/**
 * Exhaustively find whether the thread can be stranded, and how many distinct
 * stranded states exist. Memoised over states, so it stays cheap even where
 * enumerating dead-end *paths* would explode.
 */
export function analyzeStranding(level: Level, stateBudget: number = DEFAULT_STATE_BUDGET): StrandingAnalysis {
  const table = edgeTable(level);
  const full = table.count;
  const seen = new Set<string>();
  const deadEnds = new Set<string>();

  function visit(hole: string, side: Side, used: bigint, depth: number): void {
    const key = stateKeyOf(side, hole, used);
    if (seen.has(key)) return;
    if (seen.size >= stateBudget) return;
    seen.add(key);
    if (depth === full) return;

    const moves = legalEdgeIndices(table, hole, side, used);
    if (moves.length === 0) {
      deadEnds.add(key);
      return;
    }
    for (const index of moves) {
      const next = table.from[index] === hole ? table.to[index] : table.from[index];
      visit(next, oppositeSide(side), used | (1n << BigInt(index)), depth + 1);
    }
  }

  visit(level.startHole, level.startSide, 0n, 0);
  return { deadEndStates: deadEnds.size, canStrand: deadEnds.size > 0, statesVisited: seen.size };
}

function structuralIssues(level: Level): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const holeIds = new Set<string>();

  for (const [index, hole] of level.holes.entries()) {
    if (holeIds.has(hole.id)) {
      issues.push({ code: "DUPLICATE_HOLE", message: `Hole '${hole.id}' is declared more than once.` });
    }
    holeIds.add(hole.id);
    if (!Number.isFinite(hole.x) || !Number.isFinite(hole.y) || hole.x < 0 || hole.x > 100 || hole.y < 0 || hole.y > 100) {
      issues.push({ code: "INVALID_COORDINATE", message: `Hole '${hole.id}' at index ${index} must use coordinates from 0 to 100.` });
    }
  }

  if (!holeIds.has(level.startHole)) {
    issues.push({ code: "INVALID_START_HOLE", message: `Start hole '${level.startHole}' does not exist.` });
  }

  const seen = new Set<string>();
  for (const edge of targetEdges(level)) {
    if (!holeIds.has(edge.from) || !holeIds.has(edge.to)) {
      issues.push({ code: "INVALID_EDGE_HOLE", message: `${edge.side} edge '${edge.from}-${edge.to}' references a missing hole.` });
    }
    if (edge.from === edge.to) {
      issues.push({ code: "SELF_LOOP", message: `${edge.side} edge '${edge.from}-${edge.to}' is a self-loop.` });
    }
    const key = canonicalEdgeKey(edge);
    if (seen.has(key)) {
      issues.push({ code: "DUPLICATE_EDGE", message: `${edge.side} edge '${edge.from}-${edge.to}' is duplicated.` });
    }
    seen.add(key);
  }

  if (level.expectedSolutionCount < 1 || !Number.isInteger(level.expectedSolutionCount)) {
    issues.push({ code: "INVALID_SOLUTION_TARGET", message: "Expected solution count must be a positive integer." });
  }
  if (level.unique && level.expectedSolutionCount !== 1) {
    issues.push({ code: "UNIQUE_COUNT_MISMATCH", message: "A unique level must expect exactly one solution." });
  }
  return issues;
}

function authoredSolutionIssues(level: Level): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const edges = targetEdges(level);
  const used = new Set<string>();

  if (level.authoredSolution[0] !== level.startHole) {
    issues.push({
      code: "WRONG_SOLUTION_START",
      message: `Authored solution must start at '${level.startHole}', not '${level.authoredSolution[0] ?? "nothing"}'.`
    });
  }
  if (level.authoredSolution.length !== edges.length + 1) {
    issues.push({
      code: "INCOMPLETE_SOLUTION",
      message: `Authored solution has ${Math.max(0, level.authoredSolution.length - 1)} stitches; expected ${edges.length}.`
    });
  }

  let side = level.startSide;
  for (let index = 0; index < level.authoredSolution.length - 1; index += 1) {
    const from = level.authoredSolution[index];
    const to = level.authoredSolution[index + 1];
    const matches = edges.filter(
      (edge) =>
        edge.side === side &&
        ((edge.from === from && edge.to === to) || (edge.from === to && edge.to === from))
    );
    if (matches.length === 0) {
      issues.push({ code: "WRONG_SIDE_OR_EDGE", message: `Stitch ${index + 1} '${from}-${to}' is not a target on the required ${side} side.` });
    } else {
      const key = canonicalEdgeKey(matches[0]);
      if (used.has(key)) {
        issues.push({ code: "REUSED_SOLUTION_EDGE", message: `Authored solution reuses ${side} edge '${from}-${to}'.` });
      }
      used.add(key);
    }
    side = oppositeSide(side);
  }

  if (used.size !== edges.length) {
    const missing = edges.filter((edge) => !used.has(canonicalEdgeKey(edge))).map(canonicalEdgeKey);
    issues.push({
      code: "MISSING_SOLUTION_EDGES",
      message: `Authored solution does not use every target edge exactly once. Missing: ${missing.join(", ") || "unknown"}.`
    });
  }
  return issues;
}

/**
 * Exact authoring validation.
 *
 * The authored solution is still checked stitch by stitch — that has to stay
 * exact and it costs nothing. Solution counting is capped one above the
 * authored expectation, which is all that is needed to tell "exactly N" from
 * "more than N", and dead-end intent is checked by exhaustive *state*
 * reachability rather than by enumerating dead-end paths.
 */
export function validateLevel(level: Level): LevelValidation {
  const issues = structuralIssues(level);
  const emptyCount: SolutionCount = { count: 0, exact: true, cap: 0, statesVisited: 0, stateBudgetExceeded: false };
  const emptyStranding: StrandingAnalysis = { deadEndStates: 0, canStrand: false, statesVisited: 0 };
  if (issues.some((issue) => ["INVALID_EDGE_HOLE", "SELF_LOOP", "DUPLICATE_EDGE", "INVALID_START_HOLE"].includes(issue.code))) {
    return { valid: false, issues, solutions: emptyCount, stranding: emptyStranding };
  }

  issues.push(...authoredSolutionIssues(level));

  const cap = Math.max(2, level.expectedSolutionCount + 1);
  const solutions = countSolutions(level, cap);
  const stranding = analyzeStranding(level);

  if (solutions.stateBudgetExceeded) {
    issues.push({
      code: "STATE_BUDGET_EXCEEDED",
      message: "Level exceeded the analyzer state budget; its solution count is a lower bound, not an exact figure."
    });
  }
  if (solutions.count === 0) {
    issues.push({ code: "UNSOLVABLE", message: "No alternating trail uses every target edge from the required start." });
  }
  if (solutions.count !== level.expectedSolutionCount) {
    const actual = solutions.exact ? `${solutions.count}` : `at least ${solutions.count}`;
    issues.push({
      code: "SOLUTION_COUNT_MISMATCH",
      message: `Level expects ${level.expectedSolutionCount} solution(s), but the solver found ${actual}.`
    });
  }
  if (level.unique && (solutions.count !== 1 || !solutions.exact)) {
    issues.push({ code: "NOT_UNIQUE", message: "Level is marked unique, but it does not have exactly one solution." });
  }
  if (!level.allowDeadEnds && stranding.canStrand) {
    issues.push({
      code: "UNEXPECTED_DEAD_END",
      message: `The solver found ${stranding.deadEndStates} reachable state(s) where the thread strands before completion.`
    });
  }
  if (level.allowDeadEnds && !stranding.canStrand) {
    issues.push({ code: "MISSING_BRANCH", message: "This level is meant to teach recovery, but no dead-end branch exists." });
  }
  return { valid: issues.length === 0, issues, solutions, stranding };
}

export function assertValidLevel(level: Level): Level {
  const result = validateLevel(level);
  if (!result.valid) {
    throw new Error(`Invalid level '${level.id}':\n${result.issues.map((issue) => `- [${issue.code}] ${issue.message}`).join("\n")}`);
  }
  return level;
}
