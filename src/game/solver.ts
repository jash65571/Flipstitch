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

export type LevelValidation = {
  valid: boolean;
  issues: ValidationIssue[];
  solver: SolverResult;
};

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

export function validateLevel(level: Level): LevelValidation {
  const issues = structuralIssues(level);
  if (issues.some((issue) => ["INVALID_EDGE_HOLE", "SELF_LOOP", "DUPLICATE_EDGE", "INVALID_START_HOLE"].includes(issue.code))) {
    return { valid: false, issues, solver: { solutions: [], solutionCount: 0, deadEndCount: 0, truncated: false } };
  }

  issues.push(...authoredSolutionIssues(level));
  const solver = solveLevel(level, level.expectedSolutionCount + 1);
  if (solver.solutionCount === 0) {
    issues.push({ code: "UNSOLVABLE", message: "No alternating trail uses every target edge from the required start." });
  }
  if (solver.solutionCount !== level.expectedSolutionCount || solver.truncated) {
    const actual = solver.truncated ? `more than ${level.expectedSolutionCount}` : `${solver.solutionCount}`;
    issues.push({ code: "SOLUTION_COUNT_MISMATCH", message: `Level expects ${level.expectedSolutionCount} solution(s), but the solver found ${actual}.` });
  }
  if (level.unique && (solver.solutionCount !== 1 || solver.truncated)) {
    issues.push({ code: "NOT_UNIQUE", message: "Level is marked unique, but it does not have exactly one solution." });
  }
  if (!level.allowDeadEnds && solver.deadEndCount > 0) {
    issues.push({ code: "UNEXPECTED_DEAD_END", message: `The solver found ${solver.deadEndCount} legal path(s) that dead-end before completion.` });
  }
  if (level.allowDeadEnds && solver.deadEndCount === 0) {
    issues.push({ code: "MISSING_BRANCH", message: "This level is meant to teach recovery, but no dead-end branch exists." });
  }
  return { valid: issues.length === 0, issues, solver };
}

export function assertValidLevel(level: Level): Level {
  const result = validateLevel(level);
  if (!result.valid) {
    throw new Error(`Invalid level '${level.id}':\n${result.issues.map((issue) => `- [${issue.code}] ${issue.message}`).join("\n")}`);
  }
  return level;
}
