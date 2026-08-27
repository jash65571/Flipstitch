/**
 * Collection 02 — Knot & Bramble.
 *
 * The first Phase 2 collection: a fresh learning arc that teaches nested
 * returns, side-dependent hubs, converging openings, and interacting
 * runners — all still built from the one alternating-thread rule. See
 * docs/COLLECTION-02-DESIGN.md for why this theme and curriculum were chosen.
 */
import type { CollectionSource } from "../../types.ts";
import { chapterOneTangledRoot } from "./chapter-01-tangled-root.ts";
import { chapterTwoBrambleSnare } from "./chapter-02-bramble-snare.ts";

export const knotAndBramble: CollectionSource = {
  id: "knot-and-bramble",
  title: "Knot & Bramble",
  subtitle: "Collection Two",
  description:
    "Roots that nest, hubs that wear two faces, and brambles that only let one thorn go last. A second sampler, a deeper thread.",
  order: 2,
  theme: { accent: "brass", motif: "Root cords on the front, thorned brambles on the back." },
  chapters: [chapterOneTangledRoot, chapterTwoBrambleSnare]
};
