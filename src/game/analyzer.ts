/**
 * Pure, deterministic puzzle analysis for FlipStitch.
 *
 * The analyzer walks the entire reachable state space of a level (position,
 * active side, used-edge set) **once**, with memoisation, and reports objective
 * measures of how much *thought* a level demands:
 *
 * - how many real decisions exist (states with ≥2 legal stitches),
 * - how much of the level is forced (no choice at all),
 * - how wide choices get (branching factor),
 * - whether the thread can genuinely strand (reachable dead ends),
 * - how deep a player must plan to avoid a trap (consequence depth),
 * - how many choices are dangerous versus safe,
 * - how much shared-hole structure the pattern has,
 * - how many complete solutions exist.
 *
 * Solution counting is folded into that same walk: each state caches how many
 * completions are reachable from it, so counting costs one extra addition per
 * state instead of a second, path-materialising enumeration. That is why a
 * dense hoop with thousands of solutions is no more expensive to measure than
 * a unique one.
 *
 * **Exactness.** Every figure is exact when `exhaustive` is true. If the state
 * budget or the solution cap is hit, `exhaustive` / `solutionCountExact` go
 * false and the numbers become lower bounds. Nothing here labels a partial
 * answer as exact.
 *
 * It is intentionally independent of the renderer, storage, and UI, so level
 * design and difficulty-curve tests run anywhere Node does. The measures feed
 * `difficultyScore`, a transparent 0-100 model whose components are documented
 * in docs/DIFFICULTY-MATRIX.md and docs/LEVEL-DESIGN-GUIDE.md.
 */
import {
  DEFAULT_SOLUTION_CAP,
  DEFAULT_STATE_BUDGET,
  canonicalEdgeKey,
  oppositeSide,
  targetEdges
} from "./solver.ts";
import type { Difficulty, Level, Side } from "./types.ts";

export type AnalyzerOptions = {
  /** Maximum distinct states to expand before the walk gives up. */
  stateBudget?: number;
  /** Ceiling on the reported solution count. */
  solutionCap?: number;
};

export type LevelMetrics = {
  /** Total required stitches (every edge on both sides). */
  totalStitches: number;
  /** Number of complete alternating trails that use every edge. */
  solutionCount: number;
  /** True when `solutionCount` is the exact total rather than a lower bound. */
  solutionCountExact: boolean;
  /** Distinct reachable (hole, side, used-edges) states. */
  reachableStates: number;
  /** True when the whole state space was explored; false means every count
   *  below is a lower bound, not a measurement. */
  exhaustive: boolean;
  /** States with ≥2 legal stitches (all decisions, even on doomed paths). */
  decisionStates: number;
  /** Decisions from which at least one full solution is still reachable — the
   *  choices a solving player actually faces. */
  solutionDecisionStates: number;
  /** States with exactly one legal stitch (no choice). */
  forcedMoveStates: number;
  /** Share of non-terminal reachable states that are forced. 1 = autoplay. */
  forcedMovePercent: number;
  /** Largest number of legal stitches in any reachable state. */
  maxBranching: number;
  /** Mean legal stitches over non-terminal reachable states. */
  avgBranching: number;
  /** Distinct genuinely stranded states (no legal unused stitch). */
  distinctDeadEnds: number;
  /** Distinct incomplete states from which no completion is reachable. */
  doomedStates: number;
  /** Fewest stitches played before the thread can first be doomed. */
  earliestDoomDepth: number | null;
  /** Distinct decision states where at least one legal stitch dooms the thread. */
  dangerousDecisions: number;
  /** Stitches offered *at decision states* that doom the thread. Forced stitches
   *  are excluded on purpose: a move with no alternative is not a choice the
   *  player can get wrong. */
  unsafeChoiceCount: number;
  /** Safe stitches offered **at dangerous decision states** — i.e. the escape
   *  routes available exactly where a wrong turn is possible. Safe stitches at
   *  entirely safe decisions are not counted; there is no danger to be an
   *  alternative to. */
  safeAlternativeCount: number;
  /** Largest gap, measured in stitches from a dangerous decision state to the
   *  nearest stranded state under its doomed branch. This is the lookahead a
   *  player needs to see the trap before taking it. */
  maxConsequenceDepth: number;
  /** Holes touched by ≥2 edges — the shared-hole complexity. */
  sharedHoles: number;
  /** Holes touched by ≥3 edges — the hubs where most decisions live. */
  hubCount: number;
  /** Mean number of edges touching a hole. */
  averageDegree: number;
  frontEdges: number;
  backEdges: number;
  /** Share of decision states whose active side is the front. */
  frontDecisionShare: number;
  /** True when a genuine dead end is reachable. */
  canTrap: boolean;
};

type StateInfo = {
  depth: number;
  /** Completions reachable from this state, capped at `solutionCap`. */
  solutions: number;
  hasSolution: boolean;
  stuck: boolean;
  minStuckDepth: number;
};

export function analyzeLevel(level: Level, options: AnalyzerOptions = {}): LevelMetrics {
  const stateBudget = options.stateBudget ?? DEFAULT_STATE_BUDGET;
  const solutionCap = options.solutionCap ?? DEFAULT_SOLUTION_CAP;

  const edges = targetEdges(level);
  const total = edges.length;
  const edgeKeyByIndex = edges.map((edge) => canonicalEdgeKey(edge));
  const sideByIndex = edges.map((edge) => edge.side);
  const fromByIndex = edges.map((edge) => edge.from);
  const toByIndex = edges.map((edge) => edge.to);

  const memo = new Map<string, StateInfo>();
  const decisionStates = new Set<string>();
  const solutionDecisionStates = new Set<string>();
  const forcedMoveStates = new Set<string>();
  const nonTerminalStates: { key: string; branching: number }[] = [];
  const doomedStateKeys = new Set<string>();
  const stuckStateKeys = new Set<string>();
  const dangerousDecisions = new Set<string>();
  const frontDecisionStates: { key: string; front: boolean }[] = [];
  let unsafeChoiceCount = 0;
  let safeAlternativeCount = 0;
  let maxConsequenceDepth = 0;
  let earliestDoomDepth: number | null = null;
  let budgetExceeded = false;
  let solutionsCapped = false;

  const stateKey = (currentHole: string, side: Side, used: ReadonlySet<number>): string => {
    const usedList = [...used]
      .map((index) => edgeKeyByIndex[index])
      .sort()
      .join(",");
    return `${side}:${currentHole}:${usedList}`;
  };

  const matchingUnused = (currentHole: string, side: Side, used: ReadonlySet<number>): number[] => {
    const matches: number[] = [];
    for (let index = 0; index < edges.length; index += 1) {
      if (used.has(index)) continue;
      if (sideByIndex[index] !== side) continue;
      if (fromByIndex[index] === currentHole || toByIndex[index] === currentHole) {
        matches.push(index);
      }
    }
    return matches;
  };

  function visit(currentHole: string, side: Side, used: ReadonlySet<number>): StateInfo {
    const key = stateKey(currentHole, side, used);
    const cached = memo.get(key);
    if (cached) return cached;

    const depth = used.size;
    const complete = depth === total;

    if (!complete && memo.size >= stateBudget) {
      // Out of budget: report a conservative, explicitly non-exhaustive state
      // rather than pretending this branch was measured.
      budgetExceeded = true;
      return { depth, solutions: 0, hasSolution: false, stuck: false, minStuckDepth: Number.POSITIVE_INFINITY };
    }

    const moves = complete ? [] : matchingUnused(currentHole, side, used);

    let info: StateInfo;
    const childInfos: StateInfo[] = [];
    if (complete) {
      info = { depth, solutions: 1, hasSolution: true, stuck: false, minStuckDepth: Number.POSITIVE_INFINITY };
    } else if (moves.length === 0) {
      info = { depth, solutions: 0, hasSolution: false, stuck: true, minStuckDepth: depth };
      stuckStateKeys.add(key);
    } else {
      let solutions = 0;
      let minStuckDepth = Number.POSITIVE_INFINITY;
      for (const edgeIndex of moves) {
        const next = fromByIndex[edgeIndex] === currentHole ? toByIndex[edgeIndex] : fromByIndex[edgeIndex];
        const nextUsed = new Set(used);
        nextUsed.add(edgeIndex);
        const child = visit(next, oppositeSide(side), nextUsed);
        childInfos.push(child);
        solutions += child.solutions;
        if (solutions >= solutionCap) {
          solutions = solutionCap;
          solutionsCapped = true;
        }
        if (child.minStuckDepth < minStuckDepth) minStuckDepth = child.minStuckDepth;
      }
      info = { depth, solutions, hasSolution: solutions > 0, stuck: false, minStuckDepth };
    }

    memo.set(key, info);

    if (!complete && !info.stuck) {
      nonTerminalStates.push({ key, branching: moves.length });
      if (moves.length >= 2) {
        decisionStates.add(key);
        frontDecisionStates.push({ key, front: side === "front" });
      }
      if (moves.length === 1) forcedMoveStates.add(key);
    }
    if (info.hasSolution && moves.length >= 2) {
      solutionDecisionStates.add(key);
    }
    if (!info.hasSolution && !complete) {
      doomedStateKeys.add(key);
      if (earliestDoomDepth === null || depth < earliestDoomDepth) {
        earliestDoomDepth = depth;
      }
    }

    // A decision state (≥2 legal stitches) where at least one child is doomed
    // is a *dangerous* decision: the player can strand the thread from here.
    //
    // Two passes on purpose. The first establishes whether this state is
    // dangerous at all; only then do the safe stitches here count as
    // `safeAlternativeCount`, which is defined as "safe stitches available at
    // dangerous-decision states". A safe stitch at an entirely safe decision
    // is not an alternative to anything and must not be counted.
    if (!complete && !info.stuck && moves.length >= 2) {
      const doomedChildren = childInfos.filter((child) => !child.hasSolution);
      if (doomedChildren.length > 0) {
        dangerousDecisions.add(key);
        unsafeChoiceCount += doomedChildren.length;
        safeAlternativeCount += childInfos.length - doomedChildren.length;
        for (const child of doomedChildren) {
          const consequence = child.minStuckDepth - depth;
          if (Number.isFinite(consequence) && consequence > maxConsequenceDepth) {
            maxConsequenceDepth = consequence;
          }
        }
      }
    }
    return info;
  }

  const root = visit(level.startHole, level.startSide, new Set());

  const nonTerminalCount = nonTerminalStates.length;
  const totalBranching = nonTerminalStates.reduce((sum, state) => sum + state.branching, 0);
  const maxBranching = nonTerminalStates.reduce((max, state) => Math.max(max, state.branching), 0);
  const forcedMovePercent = nonTerminalCount === 0 ? 0 : forcedMoveStates.size / nonTerminalCount;
  const frontDecisionShare =
    frontDecisionStates.length === 0
      ? 0.5
      : frontDecisionStates.filter((state) => state.front).length / frontDecisionStates.length;

  const degreeByHole = new Map<string, number>();
  for (const hole of level.holes) degreeByHole.set(hole.id, 0);
  for (const edge of edges) {
    degreeByHole.set(edge.from, (degreeByHole.get(edge.from) ?? 0) + 1);
    degreeByHole.set(edge.to, (degreeByHole.get(edge.to) ?? 0) + 1);
  }
  const degrees = [...degreeByHole.values()];
  const sharedHoles = degrees.filter((degree) => degree >= 2).length;
  const hubCount = degrees.filter((degree) => degree >= 3).length;
  const averageDegree = degrees.length === 0 ? 0 : degrees.reduce((sum, degree) => sum + degree, 0) / degrees.length;

  const frontEdges = edges.filter((edge) => edge.side === "front").length;
  const backEdges = edges.filter((edge) => edge.side === "back").length;

  return {
    totalStitches: total,
    solutionCount: root.solutions,
    solutionCountExact: !budgetExceeded && !solutionsCapped,
    reachableStates: memo.size,
    exhaustive: !budgetExceeded,
    decisionStates: decisionStates.size,
    solutionDecisionStates: solutionDecisionStates.size,
    forcedMoveStates: forcedMoveStates.size,
    forcedMovePercent,
    maxBranching,
    avgBranching: nonTerminalCount === 0 ? 0 : totalBranching / nonTerminalCount,
    distinctDeadEnds: stuckStateKeys.size,
    doomedStates: doomedStateKeys.size,
    earliestDoomDepth,
    dangerousDecisions: dangerousDecisions.size,
    unsafeChoiceCount,
    safeAlternativeCount,
    maxConsequenceDepth,
    sharedHoles,
    hubCount,
    averageDegree,
    frontEdges,
    backEdges,
    frontDecisionShare,
    canTrap: stuckStateKeys.size > 0
  };
}

export type DifficultyScore = {
  /** 0-100 transparent difficulty score. */
  total: number;
  /** Thought from real choices, branching, and the absence of forced filler. */
  planning: number;
  /** Thought from dangerous decisions, traps, and delayed consequences. */
  risk: number;
  /** Capped length contribution — raw stitch count can never dominate. */
  length: number;
  /** Measured tier derived from `total`. */
  tier: Difficulty;
};

/**
 * Transparent difficulty model (documented in docs/DIFFICULTY-MATRIX.md).
 *
 *   total = planning + risk + length   (0..100)
 *   planning (0..50) = decisions, branching, and freedom from forced filler
 *   risk     (0..40) = dangerous decisions, trap existence, consequence depth
 *   length   (0..10) = capped stitch count (never dominates thought)
 *
 * Each sub-term is clamped to its share so a single metric cannot dominate:
 * a 20-stitch forced path scores ~8, while a 10-stitch branching trap puzzle
 * scores far higher.
 *
 * This score describes **the puzzle**, not its position in the game. It is
 * deliberately not required to rise forever; chapter pacing is a separate
 * concern handled in `src/content/pacing.ts`.
 */
export function difficultyScore(level: Level, metrics: LevelMetrics): DifficultyScore {
  const decisions = 20 * Math.min(1, metrics.solutionDecisionStates / 6);
  const branching = 15 * Math.min(1, metrics.maxBranching / 4);
  const forcedPenalty = 15 * (1 - metrics.forcedMovePercent);
  const planning = decisions + branching + forcedPenalty;

  const dangerous = 15 * Math.min(1, metrics.dangerousDecisions / 4);
  const foresight = 15 * Math.min(1, metrics.maxConsequenceDepth / 5);
  const trapPresence = 10 * Math.min(1, metrics.distinctDeadEnds / 2);
  const risk = dangerous + foresight + trapPresence;

  const length = 10 * Math.min(1, metrics.totalStitches / 24);

  const total = Math.min(100, Math.round(planning + risk + length));
  return {
    total,
    planning: Math.round(planning * 10) / 10,
    risk: Math.round(risk * 10) / 10,
    length: Math.round(length * 10) / 10,
    tier: tierForScore(total)
  };
}

/** Measured tier boundaries. These define what "Tricky" means in this game. */
export function tierForScore(total: number): Difficulty {
  if (total >= 75) return "Expert";
  if (total >= 55) return "Tricky";
  if (total >= 35) return "Moderate";
  if (total >= 15) return "Easy";
  return "Gentle";
}

/** Convenience: analyze + score in one call. */
export function measureLevel(level: Level, options: AnalyzerOptions = {}): { metrics: LevelMetrics; score: DifficultyScore } {
  const metrics = analyzeLevel(level, options);
  return { metrics, score: difficultyScore(level, metrics) };
}
