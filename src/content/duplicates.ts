/**
 * Catalog-wide structural duplicate policy, built on `src/content/topology.ts`.
 *
 * `EXACT` and `MIRRORED` findings fail production validation by default — a
 * puzzle that is a renamed/relabeled copy of another is not new content. Any
 * exception must be added to `APPROVED_EXACT_DUPLICATES` by name, with a
 * reason in the comment next to it; an empty list here is the healthy state.
 * `NEAR` findings never fail the build — they are advisory, for a human to
 * look at, exactly like a pacing warning.
 *
 * `INEXACT` findings also fail production validation. They mean the
 * canonicalization search hit its leaf budget before it could determine
 * whether a same-sized pair is exact, mirrored, or distinct — an unproven
 * pair is not the same as a proven-distinct one, so this refuses to
 * certify the catalog as duplicate-free until every comparison completes
 * exhaustively (see `docs/MILESTONE-8-2-QA.md` and `topology.ts`).
 */
import { catalog } from "./catalog.ts";
import { findDuplicates, type DuplicateFinding } from "./topology.ts";

/**
 * Pairs explicitly reviewed and accepted as an intentional exact/mirrored
 * topology reuse (format: "levelIdA::levelIdB", ids sorted). Keep this list
 * short and documented — it is meant to stay empty in the common case.
 */
export const APPROVED_EXACT_DUPLICATES: ReadonlySet<string> = new Set([]);

function pairKey(aId: string, bId: string): string {
  return [aId, bId].sort().join("::");
}

export type DuplicateReport = {
  exact: readonly DuplicateFinding[];
  mirrored: readonly DuplicateFinding[];
  near: readonly DuplicateFinding[];
  inexact: readonly DuplicateFinding[];
  unapproved: readonly DuplicateFinding[];
  ok: boolean;
};

/** `maxLeaves` is exposed only so tests can force budget exhaustion and
 *  assert that production validation refuses to certify; production
 *  callers should omit it and use the default (exhaustive-at-our-scale)
 *  budget. */
export function validateCatalogTopology(
  levels: readonly (typeof catalog.levels)[number][] = catalog.levels,
  maxLeaves?: number
): DuplicateReport {
  const findings = findDuplicates(levels, maxLeaves);
  const exact = findings.filter((f) => f.kind === "exact");
  const mirrored = findings.filter((f) => f.kind === "mirrored");
  const near = findings.filter((f) => f.kind === "near");
  const inexact = findings.filter((f) => f.kind === "inexact");
  const unapproved = [...exact, ...mirrored].filter((f) => !APPROVED_EXACT_DUPLICATES.has(pairKey(f.aId, f.bId)));
  return { exact, mirrored, near, inexact, unapproved, ok: unapproved.length === 0 && inexact.length === 0 };
}
