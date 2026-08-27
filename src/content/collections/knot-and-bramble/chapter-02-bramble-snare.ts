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
  difficulty: "Moderate",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 90 }, { id: "h", x: 50, y: 58 }, { id: "a", x: 14, y: 44 },
    { id: "b", x: 34, y: 16 }, { id: "c", x: 66, y: 16 }, { id: "d", x: 86, y: 44 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }, { from: "c", to: "h" }, { from: "d", to: "h" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }, { from: "h", to: "d" }
  ],
  authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "h", "d", "h"],
  expectedSolutionCount: 24,
  unique: false,
  allowDeadEnds: false,
  hintText: "Four brambles fork from one hub. Every opening is safe — the hub is what keeps bringing you home.",
  guidance: "reduced",
  clues: {
    concept: "All four openings are free right now, but every one of them funnels back through this same hub. That narrow hub, not the wide opening, is the real shape of the puzzle.",
    region: "Any bramble the hub still reaches is a safe start — the choice only gets narrower as they close."
  },
  completionMessage: "Four brambles fork and knot at the same hub."
});

const thicketPath: Level = assertValidLevel({
  id: "thicket-path-17",
  title: "Thicket Path",
  difficulty: "Tricky",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 92 }, { id: "h", x: 50, y: 66 }, { id: "a", x: 20, y: 50 },
    { id: "b", x: 80, y: 50 }, { id: "x", x: 30, y: 26 }, { id: "y", x: 56, y: 12 },
    { id: "t", x: 78, y: 20 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }, { from: "x", to: "y" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "x" }, { from: "y", to: "t" }
  ],
  authoredSolution: ["s", "h", "a", "h", "b", "h", "x", "y", "t"],
  expectedSolutionCount: 2,
  unique: false,
  allowDeadEnds: true,
  hintText: "Two paths return to the hub. The third runs three holes deep into the thicket and never comes back.",
  guidance: "reduced",
  clues: {
    concept: "The hub offers two safe returns and one deep lane; the deep lane must be the last thing you take, once nothing else is owed.",
    region: "The two wings nearest the hub still owe their return — the thicket lane is the one you finish on."
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
    { id: "s", x: 50, y: 92 }, { id: "h", x: 50, y: 62 }, { id: "a", x: 16, y: 40 },
    { id: "b", x: 50, y: 20 }, { id: "c", x: 82, y: 40 }, { id: "d", x: 90, y: 66 },
    { id: "r", x: 78, y: 86 }, { id: "t", x: 56, y: 96 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }, { from: "c", to: "d" }, { from: "h", to: "r" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }, { from: "d", to: "h" }, { from: "r", to: "t" }
  ],
  authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "d", "h", "r", "t"],
  expectedSolutionCount: 12,
  unique: false,
  allowDeadEnds: true,
  hintText: "Two branches off the hub look almost the same length as a third. Only the two loops actually come back.",
  guidance: "minimal",
  clues: {
    concept: "The loop and the runner are shaped alike — both leave the hub and come back around — but only the loop actually returns to the hub. Take the runner last, once nothing else is owed.",
    region: "The two short wings and the loop all still owe the hub a return — the runner is the one that doesn't."
  },
  completionMessage: "Both thorns close clean, and the runner carries the thread home."
});

const snaredVine: Level = assertValidLevel({
  id: "snared-vine-19",
  title: "Snared Vine",
  difficulty: "Moderate",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 94 }, { id: "h", x: 50, y: 68 }, { id: "a", x: 18, y: 54 },
    { id: "x", x: 78, y: 50 }, { id: "y", x: 90, y: 74 }, { id: "p", x: 28, y: 28 },
    { id: "q", x: 50, y: 10 }, { id: "t", x: 72, y: 20 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "x", to: "y" }, { from: "h", to: "p" }, { from: "q", to: "t" }
  ],
  backEdges: [
    { from: "h", to: "a" }, { from: "h", to: "x" }, { from: "y", to: "h" }, { from: "p", to: "q" }
  ],
  authoredSolution: ["s", "h", "a", "h", "x", "y", "h", "p", "q", "t"],
  expectedSolutionCount: 4,
  unique: false,
  allowDeadEnds: true,
  hintText: "A vine loops back on itself, and a longer vine runs deep and stays there.",
  guidance: "minimal",
  clues: {
    concept: "This vine reuses the same twin shape as the thorns — a loop that returns, and a longer runner that doesn't. Read which is which before you commit.",
    region: "The wing and the loop both still owe the hub a return — the runner is the last stitch, same as before."
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
    { id: "a", x: 6, y: 82 }, { id: "b", x: 18, y: 68 }, { id: "c", x: 10, y: 46 },
    { id: "d", x: 32, y: 56 }, { id: "e", x: 28, y: 30 },
    { id: "f", x: 48, y: 46 }, { id: "g", x: 46, y: 22 }, { id: "g2", x: 62, y: 20 }, { id: "h", x: 62, y: 56 },
    { id: "i", x: 60, y: 32 }, { id: "j", x: 78, y: 66 }, { id: "k", x: 74, y: 42 },
    { id: "l", x: 92, y: 80 }, { id: "m", x: 86, y: 58 }, { id: "o", x: 96, y: 68 }, { id: "n", x: 100, y: 82 }
  ],
  frontEdges: [
    { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" }, { from: "d", to: "f" },
    { from: "g", to: "f" }, { from: "g2", to: "f" }, { from: "h", to: "i" }, { from: "h", to: "j" },
    { from: "k", to: "j" }, { from: "l", to: "m" }, { from: "l", to: "o" }
  ],
  backEdges: [
    { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" }, { from: "f", to: "g" },
    { from: "f", to: "g2" }, { from: "f", to: "h" }, { from: "i", to: "h" }, { from: "j", to: "k" },
    { from: "j", to: "l" }, { from: "m", to: "l" }, { from: "o", to: "n" }
  ],
  authoredSolution: [
    "a", "b", "c", "b", "d", "e", "d", "f", "g", "f", "g2", "f", "h", "i", "h", "j", "k", "j", "l", "m", "l", "o", "n"
  ],
  expectedSolutionCount: 2,
  unique: false,
  allowDeadEnds: true,
  hintText: "Four clusters, each with its own nested loop, hub, or runner. Clear each one fully before the bridge that leaves it.",
  guidance: "minimal",
  clues: {
    concept: "Every cluster in this sampler is one of the ideas you already know: a nested loop, a many-armed hub, a converging opening, or a runner. Close each cluster completely before the bridge that carries you to the next.",
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
      teaches: ["interacting-runners", "converging-openings"],
      pacingNote:
        "Milestone 8.1 replaced Snared Vine's graph (the shipped version was an exact topology clone of Thicket Path — see docs/COLLECTION-02-DESIGN.md). The new puzzle measures 24 points below Twin Thorns: it combines two already-taught shapes (a wing plus the twin loop-vs-runner idea) rather than raising the pressure further, so a gentler score than the pressure entry before it is the intended shape of a combine entry ahead of the capstone, not a collapse."
    },
    {
      level: knotsEnd,
      role: "capstone",
      teaches: ["interacting-runners", "converging-openings", "multi-region", "linked-return"]
    }
  ]
};
