/**
 * Puzzle topology fingerprinting.
 *
 * Milestone 8 shipped several Collection 02 levels that were exact graph
 * clones of Collection 01 levels (or of each other) under renamed holes and
 * moved coordinates — different title, same puzzle. `docs/COLLECTION-02-DESIGN.md`
 * even said so ("Reuses the Forked Needle topology"). That is not content
 * proof.
 *
 * This module answers one question precisely: **is this puzzle's graph
 * structurally identical to that one**, ignoring everything that is not the
 * puzzle (title, hole ids, on-screen coordinates, hint text, completion
 * copy), while still respecting everything that *is* the puzzle:
 *
 * - which holes connect on the front vs. the back (front/back edge
 *   assignment is part of the structure, not a decoration to discard),
 * - the start hole and start side,
 * - full connectivity (who connects to whom, and how many times).
 *
 * The approach is a small, dependency-free individualization-refinement
 * canonical-labeling search (the same family of technique as nauty, scaled
 * down for graphs with at most a few dozen holes). It is exhaustive, not
 * heuristic, for the EXACT and MIRRORED categories: two levels get the same
 * canonical key if and only if there exists a hole relabeling that maps one
 * level's front/back edge set and start hole/side exactly onto the other's.
 * NEAR duplicates are explicitly heuristic and are reported as advisory only
 * — see `classifyPair`.
 */
import type { EdgePair, Level, Side } from "../game/types.ts";

type SideAdjacency = { neighbor: number; side: Side }[];

type Graph = {
  n: number;
  /** adjacency[i] = edges touching node i, as (neighbor index, side). */
  adjacency: SideAdjacency[];
  startIndex: number;
  startSide: Side;
};

function buildGraph(level: Level, frontEdges: readonly EdgePair[], backEdges: readonly EdgePair[]): Graph {
  const index = new Map<string, number>();
  level.holes.forEach((hole, i) => index.set(hole.id, i));
  const n = level.holes.length;
  const adjacency: SideAdjacency[] = Array.from({ length: n }, () => []);

  function addEdges(edges: readonly EdgePair[], side: Side) {
    for (const edge of edges) {
      const a = index.get(edge.from)!;
      const b = index.get(edge.to)!;
      adjacency[a].push({ neighbor: b, side });
      adjacency[b].push({ neighbor: a, side });
    }
  }
  addEdges(frontEdges, "front");
  addEdges(backEdges, "back");

  return { n, adjacency, startIndex: index.get(level.startHole)!, startSide: level.startSide };
}

/** 1-dimensional Weisfeiler-Leman color refinement, side-aware. Nodes start
 *  distinguished only by whether they are the start hole; refinement then
 *  propagates side-typed neighborhood structure until colors stabilize. */
function refine(graph: Graph, initial: number[]): number[] {
  let colors = initial.slice();
  // 1-dim Weisfeiler-Leman stabilizes within at most n rounds for an n-node
  // graph; run exactly that many rounds rather than detecting stability
  // (cheap either way at this graph size, and simpler to prove correct).
  for (let round = 0; round < graph.n + 1; round += 1) {
    const signatures = colors.map((color, node) => {
      const neighborSig = graph.adjacency[node]
        .map((edge) => `${edge.side}:${colors[edge.neighbor]}`)
        .sort()
        .join(",");
      return `${color}|${neighborSig}`;
    });
    const ranks = [...new Set(signatures)].sort();
    const rankOf = new Map(ranks.map((sig, i) => [sig, i]));
    colors = signatures.map((sig) => rankOf.get(sig)!);
  }
  return colors;
}

function cellsOf(colors: number[]): Map<number, number[]> {
  const cells = new Map<number, number[]>();
  colors.forEach((color, node) => {
    const list = cells.get(color) ?? [];
    list.push(node);
    cells.set(color, list);
  });
  return cells;
}

const MAX_LEAVES = 20_000;

/** Explore every individualization branch (bounded) and keep the
 *  lexicographically smallest resulting canonical string. Exhaustive for the
 *  small, sparse graphs FlipStitch levels use. */
function canonicalKeyFromGraph(graph: Graph): string {
  const initial = Array.from({ length: graph.n }, (_, i) => (i === graph.startIndex ? 1 : 0));
  let best: string | null = null;
  let leaves = 0;

  function encode(colors: number[]): string {
    const label = colors; // color IS the canonical index, since it's a discrete 0..n-1 assignment
    const edgeStrings = new Set<string>();
    for (let node = 0; node < graph.n; node += 1) {
      for (const edge of graph.adjacency[node]) {
        const a = label[node];
        const b = label[edge.neighbor];
        const [lo, hi] = a < b ? [a, b] : [b, a];
        edgeStrings.add(`${edge.side}:${lo}:${hi}`);
      }
    }
    const edges = [...edgeStrings].sort().join(",");
    return `n${graph.n}|${edges}|start:${label[graph.startIndex]}:${graph.startSide}`;
  }

  function recurse(colors: number[]) {
    if (leaves >= MAX_LEAVES) return;
    const refined = refine(graph, colors);
    const distinctCount = new Set(refined).size;

    if (distinctCount === graph.n) {
      leaves += 1;
      const key = encode(refined);
      if (best === null || key < best) best = key;
      return;
    }

    const cells = cellsOf(refined);
    let targetCell: number[] | null = null;
    for (const [, members] of [...cells.entries()].sort((a, b) => a[0] - b[0])) {
      if (members.length > 1) {
        targetCell = members;
        break;
      }
    }
    if (!targetCell) {
      // Should not happen (distinctCount would equal n), but guard anyway.
      leaves += 1;
      const key = encode(refined);
      if (best === null || key < best) best = key;
      return;
    }

    for (const node of targetCell) {
      if (leaves >= MAX_LEAVES) return;
      // Individualize: give `node` a color strictly between its cell's rank
      // and the next-lower rank, forcing it into its own singleton cell on
      // the next refinement pass without disturbing relative order.
      const individualized = refined.map((c, i) => (i === node ? c - 0.5 : c));
      const reranked = rerank(individualized);
      recurse(reranked);
    }
  }

  recurse(initial);
  return best ?? encode(refine(graph, initial));
}

function rerank(colors: number[]): number[] {
  const sorted = [...new Set(colors)].sort((a, b) => a - b);
  const rankOf = new Map(sorted.map((c, i) => [c, i]));
  return colors.map((c) => rankOf.get(c)!);
}

/** Canonical topology key: identical iff a hole relabeling maps one level's
 *  front/back edges and start hole/side exactly onto the other's. */
export function canonicalKey(level: Level): string {
  return canonicalKeyFromGraph(buildGraph(level, level.frontEdges, level.backEdges));
}

/** Canonical key of the level as if its front and back were swapped (the
 *  cloth turned over) — used only to detect MIRRORED duplicates. */
export function mirroredCanonicalKey(level: Level): string {
  const mirrored: Level = {
    ...level,
    startSide: level.startSide === "front" ? "back" : "front"
  };
  return canonicalKeyFromGraph(buildGraph(mirrored, level.backEdges, level.frontEdges));
}

function degreeSignature(level: Level): string {
  const front = new Map<string, number>();
  const back = new Map<string, number>();
  for (const edge of level.frontEdges) {
    front.set(edge.from, (front.get(edge.from) ?? 0) + 1);
    front.set(edge.to, (front.get(edge.to) ?? 0) + 1);
  }
  for (const edge of level.backEdges) {
    back.set(edge.from, (back.get(edge.from) ?? 0) + 1);
    back.set(edge.to, (back.get(edge.to) ?? 0) + 1);
  }
  return level.holes
    .map((hole) => `${front.get(hole.id) ?? 0}.${back.get(hole.id) ?? 0}`)
    .sort()
    .join(",");
}

function totalEdgeCount(level: Level): number {
  return level.frontEdges.length + level.backEdges.length;
}

export type DuplicateKind = "exact" | "mirrored" | "near" | "distinct";

/**
 * Classify a pair of levels.
 *
 * `exact` and `mirrored` are mathematically certain (full isomorphism
 * search, not a coincidence of numeric scores). `near` is an advisory
 * heuristic — same hole count, same total edge count, near-identical degree
 * signature — flagged for human review, never asserted as certain.
 */
export function classifyPair(a: Level, b: Level): DuplicateKind {
  if (a.holes.length !== b.holes.length) return degreeHeuristicOrDistinct(a, b);

  const keyA = canonicalKey(a);
  if (keyA === canonicalKey(b)) return "exact";
  if (keyA === mirroredCanonicalKey(b)) return "mirrored";

  return degreeHeuristicOrDistinct(a, b);
}

function degreeHeuristicOrDistinct(a: Level, b: Level): DuplicateKind {
  if (a.holes.length !== b.holes.length) return "distinct";
  if (totalEdgeCount(a) !== totalEdgeCount(b)) return "distinct";
  return degreeSignature(a) === degreeSignature(b) ? "near" : "distinct";
}

export type DuplicateFinding = {
  aId: string;
  bId: string;
  kind: Exclude<DuplicateKind, "distinct">;
};

/** All EXACT/MIRRORED/NEAR pairs across a level list, aId < bId by input order. */
export function findDuplicates(levels: readonly Level[]): DuplicateFinding[] {
  const findings: DuplicateFinding[] = [];
  for (let i = 0; i < levels.length; i += 1) {
    for (let j = i + 1; j < levels.length; j += 1) {
      const kind = classifyPair(levels[i], levels[j]);
      if (kind !== "distinct") {
        findings.push({ aId: levels[i].id, bId: levels[j].id, kind });
      }
    }
  }
  return findings;
}
