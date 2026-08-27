# Content Revision Policy

Milestone 8.1 repaired seven Collection 02 levels (Bark Hollow, Deep
Taproot, Bramble Fork, Thicket Path, Twin Thorns, Snared Vine, Knot's End)
that had shipped as exact or near-exact topology clones. The repair changed
their puzzle graphs — a real content change, not a cosmetic one — while
keeping their level IDs. That raised a real product question this document
answers: **when does a content edit require a new level ID, and when does
it keep the old one and its existing completion data?**

## Why this matters

A player's local completion record (`src/progress/model.ts`) is keyed by
level ID. If a level ID's *puzzle* changes after a player has completed it,
their recorded "completed" no longer describes what they actually solved.
For a live game with real players, that is a quiet integrity break: their
progress bar says "done" for content they never played.

FlipStitch has no real players yet (pre-launch). This policy exists so that
distinction — pre-launch iteration vs. post-launch content identity — is
explicit going forward, instead of decided ad hoc each time.

## Classification

| Change | Same ID, completion stays valid | New ID required |
|---|---|---|
| Coordinate-only edits (hole `x`/`y` moved, geometry legibility) | Yes | |
| Hint-copy edits (`hintText`, staged hint copy) | Yes | |
| Visual/cosmetic changes (title casing, completion message wording) not touching graph or solution | Yes | |
| Difficulty label change with no graph change | Yes | |
| Topology change (holes, edges, front/back assignment, start hole/side) | | Yes |
| Solution change (a different `authoredSolution` path becomes correct, even over the same graph) | | Yes |
| Difficulty *re-tiering* driven by a graph change (not just a label) | | Yes |

The test is simple: **if a completed player's recorded solution would no
longer be a valid solution against the new level, it needs a new ID.**
Coordinate and copy edits never change validity; topology and solution
edits always might.

## Post-launch procedure (once FlipStitch has real players)

1. Author the revised puzzle under a **new** level ID (e.g. append a
   revision suffix, or advance the numeric suffix past the current catalog
   max — match whatever ID convention is live at the time).
2. Retire the old ID from the active catalog rotation (remove it from
   collection/chapter entries) rather than deleting it outright, so
   historical completion data referencing it doesn't dangle.
3. Do not silently reuse the old ID for different content. If the old ID
   must be reused (e.g. a numbering scheme constraint), first confirm via
   `npm run analyze:levels` / `validateCatalogTopology` that no completion
   data for that ID exists in any supported save format, and document the
   exception here with a reason.
4. `APPROVED_EXACT_DUPLICATES` in `src/content/duplicates.ts` is for
   reviewed intentional topology reuse across *different* IDs — it is not a
   mechanism for revising a single ID's content in place.

## Pre-launch grandfathering

The seven Milestone 8.1 repairs are grandfathered under their existing IDs.
FlipStitch has shipped no build to real users; every "completion" that
exists anywhere is internal test data. This is explicitly **not** a
precedent for post-launch behavior — it reflects that pre-launch iteration
on content is normal authoring, not a live-service content revision. Once
Prompt 9 or any milestone ships a build to real external users, this
grandfathering ends and the post-launch procedure above governs from that
point forward.
