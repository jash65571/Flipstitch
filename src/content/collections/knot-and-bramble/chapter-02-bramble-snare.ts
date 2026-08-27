/**
 * Knot & Bramble — Chapter Two: Bramble Snare.
 *
 * The pressure arc. Chapter One proved a hub can wear two faces; this chapter
 * adds a second new idea — several safe openings that all funnel into one
 * narrow middle (`converging-openings`) — then turns it dangerous by pairing
 * it with two runners from the same hub, only one of which can safely go
 * last (`interacting-runners`). `resetsDifficulty` is false: this chapter
 * continues Chapter One's arc with a deliberate soft dip while the second
 * concept is introduced, then climbs to the collection capstone.
 */
import { assertValidLevel } from "../../../game/solver.ts";
import type { Level } from "../../../game/types.ts";
import type { ChapterSource } from "../../types.ts";

const brambleFork: Level = assertValidLevel({
  id: "bramble-fork-16",
  title: "Bramble Fork",
  difficulty: "Easy",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 88 }, { id: "h", x: 50, y: 56 }, { id: "a", x: 14, y: 30 },
    { id: "b", x: 50, y: 12 }, { id: "c", x: 86, y: 30 }
  ],
  frontEdges: [{ from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }, { from: "c", to: "h" }],
  backEdges: [{ from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }],
  authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "h"],
  expectedSolutionCount: 6,
  unique: false,
  allowDeadEnds: false,
  hintText: "Three brambles fork from one hub. Every opening is safe — the hub is what keeps bringing you home.",
  guidance: "reduced",
  clues: {
    concept: "All three openings are free right now, but every one of them funnels back through this same hub. That narrow hub, not the wide opening, is the real shape of the puzzle.",
    region: "Any bramble the hub still reaches is a safe start — the choice only gets narrower as they close."
  },
  completionMessage: "Three brambles fork and knot at the same hub."
});

const thicketPath: Level = assertValidLevel({
  id: "thicket-path-17",
  title: "Thicket Path",
  difficulty: "Tricky",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 92 }, { id: "h", x: 50, y: 74 }, { id: "x", x: 28, y: 30 },
    { id: "y", x: 72, y: 44 }, { id: "a", x: 16, y: 56 }, { id: "b", x: 22, y: 36 },
    { id: "c", x: 84, y: 58 }, { id: "d", x: 78, y: 36 }, { id: "e", x: 62, y: 84 },
    { id: "f", x: 76, y: 90 }, { id: "p", x: 34, y: 84 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "x" }, { from: "b", to: "h" },
    { from: "c", to: "y" }, { from: "d", to: "e" }, { from: "p", to: "h" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "x", to: "b" }, { from: "h", to: "c" },
    { from: "y", to: "d" }, { from: "e", to: "f" }, { from: "h", to: "p" }
  ],
  authoredSolution: ["s", "h", "a", "x", "b", "h", "p", "h", "c", "y", "d", "e", "f"],
  expectedSolutionCount: 2,
  unique: false,
  allowDeadEnds: true,
  hintText: "Three paths open from the hub. Two lead somewhere and back; one runs into the deep thicket and stays there.",
  guidance: "reduced",
  clues: {
    concept: "The wide opening at the hub is not the hard part — it is which of the three paths you save for last. One of them never returns to the hub once you take it.",
    region: "The two paths that loop through a shared hole still owe their return — the deep thicket path is the one you finish on."
  },
  completionMessage: "The thicket opens onto a single clean path."
});

const twinThorns: Level = assertValidLevel({
  id: "twin-thorns-18",
  title: "Twin Thorns",
  difficulty: "Tricky",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 90 }, { id: "h", x: 50, y: 60 }, { id: "a", x: 18, y: 34 },
    { id: "b", x: 50, y: 10 }, { id: "c", x: 82, y: 34 }, { id: "i", x: 90, y: 60 },
    { id: "d", x: 78, y: 84 }, { id: "e", x: 54, y: 92 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" },
    { from: "c", to: "i" }, { from: "d", to: "e" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }, { from: "i", to: "d" }
  ],
  authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "i", "d", "e"],
  expectedSolutionCount: 2,
  unique: false,
  allowDeadEnds: true,
  hintText: "One thorn is a runner that never returns to the hub. Take it last, after the two safe loops.",
  guidance: "minimal",
  clues: {
    concept: "Two spokes at the hub loop safely home; the third is a runner that leaves for good. The runner looks identical to the others until you follow it — take it only once nothing else is owed.",
    region: "The hub still holds two safe loops open — resolve both before the thorn that runs away."
  },
  completionMessage: "Both thorns close clean, and the runner carries the thread home."
});

const snaredVine: Level = assertValidLevel({
  id: "snared-vine-19",
  title: "Snared Vine",
  difficulty: "Tricky",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 92 }, { id: "h", x: 50, y: 74 }, { id: "x", x: 28, y: 30 },
    { id: "y", x: 72, y: 44 }, { id: "a", x: 16, y: 56 }, { id: "b", x: 22, y: 36 },
    { id: "c", x: 84, y: 58 }, { id: "d", x: 78, y: 36 }, { id: "e", x: 62, y: 84 },
    { id: "f", x: 76, y: 90 }, { id: "p", x: 34, y: 84 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "x" }, { from: "b", to: "h" },
    { from: "c", to: "y" }, { from: "d", to: "e" }, { from: "p", to: "h" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "x", to: "b" }, { from: "h", to: "c" },
    { from: "y", to: "d" }, { from: "e", to: "f" }, { from: "h", to: "p" }
  ],
  authoredSolution: ["s", "h", "a", "x", "b", "h", "p", "h", "c", "y", "d", "e", "f"],
  expectedSolutionCount: 2,
  unique: false,
  allowDeadEnds: true,
  hintText: "Three converging paths meet at the hub again, and one of them still runs into the thicket for good.",
  guidance: "minimal",
  clues: {
    concept: "This vine reuses the same shape as the thicket — a wide, safe-looking opening at the hub that narrows to one true order. Read which path is the runner before you touch it.",
    region: "The two looping paths through the shared holes still owe their return — the runner is the last stitch, same as before."
  },
  completionMessage: "The vine tangles, snares, and still comes home clean."
});

const knotsEnd: Level = assertValidLevel({
  id: "knots-end-20",
  title: "Knot's End",
  difficulty: "Expert",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 10, y: 80 }, { id: "b", x: 22, y: 68 }, { id: "c", x: 12, y: 48 },
    { id: "d", x: 36, y: 58 }, { id: "e", x: 31, y: 32 }, { id: "f", x: 50, y: 48 },
    { id: "g", x: 48, y: 22 }, { id: "h", x: 64, y: 56 }, { id: "i", x: 60, y: 30 },
    { id: "j", x: 76, y: 70 }, { id: "k", x: 70, y: 46 }, { id: "l", x: 84, y: 84 },
    { id: "m", x: 80, y: 62 }, { id: "o", x: 90, y: 72 }, { id: "n", x: 96, y: 84 }
  ],
  frontEdges: [
    { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" },
    { from: "d", to: "f" }, { from: "g", to: "f" }, { from: "h", to: "i" },
    { from: "h", to: "j" }, { from: "k", to: "j" }, { from: "l", to: "m" },
    { from: "l", to: "o" }
  ],
  backEdges: [
    { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" },
    { from: "f", to: "g" }, { from: "f", to: "h" }, { from: "i", to: "h" },
    { from: "j", to: "k" }, { from: "j", to: "l" }, { from: "m", to: "l" }, { from: "o", to: "n" }
  ],
  authoredSolution: [
    "a", "b", "c", "b", "d", "e", "d", "f", "g", "f", "h", "i", "h", "j", "k", "j", "l", "m", "l", "o", "n"
  ],
  expectedSolutionCount: 1,
  unique: true,
  allowDeadEnds: true,
  hintText: "Four clusters, each with its own nested loop or runner. Clear each one fully before the bridge that leaves it.",
  guidance: "minimal",
  clues: {
    concept: "Every cluster in this sampler is one of the ideas you already know: a nested loop, an off-side hub, a converging opening, or a runner. Close each cluster completely before the bridge that carries you to the next.",
    region: "The nearest cluster still holds an unclosed loop — finish it before the bridge onward."
  },
  completionMessage: "Every knot ties off, and Knot & Bramble is finished, front and back."
});

export const chapterTwoBrambleSnare: ChapterSource = {
  id: "knot-and-bramble-ch02",
  title: "Bramble Snare",
  subtitle: "Safe openings that narrow fast, and two thorns that cannot both go last.",
  order: 2,
  role: "mastery",
  resetsDifficulty: false,
  capstoneLevelId: knotsEnd.id,
  entries: [
    {
      level: brambleFork,
      role: "teach",
      teaches: ["converging-openings"],
      pacingNote:
        "Bramble Snare opens with converging-openings, a second new Tier 2 idea. It is intentionally gentler than Deep Taproot so the new shape is learned before it is pressured (resetsDifficulty stays false because this is still one collection-long arc, not a new collection)."
    },
    {
      level: thicketPath,
      role: "practice",
      teaches: ["converging-openings", "shared-hole"]
    },
    {
      level: twinThorns,
      role: "pressure",
      teaches: ["interacting-runners", "runner"]
    },
    {
      level: snaredVine,
      role: "combine",
      teaches: ["interacting-runners", "converging-openings"]
    },
    {
      level: knotsEnd,
      role: "capstone",
      teaches: ["interacting-runners", "converging-openings", "multi-region", "linked-return"]
    }
  ]
};
