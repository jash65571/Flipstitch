/**
 * Content revision identity.
 *
 * A playtest bundle has to record *which puzzles a tester actually played*.
 * App version alone is not enough: content can change without the app version
 * moving, and a cohort that mixes two different Level 1s is not one cohort
 * (docs/PLAYTEST-BUNDLE-SPEC.md, Goal 6 and Goal 34).
 *
 * Two values do that job together:
 *
 * - `CONTENT_REVISION` — the human-readable label. Bump it by hand whenever
 *   authored content changes, following docs/CONTENT-REVISION-POLICY.md.
 * - `contentFingerprint(catalog)` — derived, not authored. An 8-hex digest over
 *   every level's id, start side, start hole, hole count, edge counts, and
 *   authored solution length, in catalog order. If someone edits a puzzle and
 *   forgets to bump the label, the fingerprint still changes, and the cohort
 *   analyzer will report the split instead of silently pooling the two.
 *
 * The fingerprint intentionally covers *structure*, not cosmetic copy: a typo
 * fix in a hint does not invalidate a cohort, a changed graph does.
 */
import { fingerprint } from "../playtest/build.ts";
import type { Catalog } from "./types.ts";

/**
 * Content revision label. Format: `<collections>c<levels>l.<yyyy-mm-dd>`.
 *
 * `2c20l.2026-08-27` — two collections, twenty levels, as repaired in Prompt
 * 8.2 (`docs/MILESTONE-8-2-QA.md`). Bump this whenever a level's geometry,
 * solution, or ordering changes, and start a new playtest cohort when it moves
 * mid-study.
 */
export const CONTENT_REVISION = "2c20l.2026-08-27";

export function contentFingerprint(catalog: Catalog): string {
  const parts = catalog.levels.map((level) =>
    [
      level.id,
      level.startSide,
      level.startHole,
      String(level.holes.length),
      String(level.frontEdges.length),
      String(level.backEdges.length),
      String(level.authoredSolution.length)
    ].join("|")
  );
  return fingerprint(parts);
}
