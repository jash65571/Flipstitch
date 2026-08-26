/**
 * Day & Night — Chapter One: First Light.
 *
 * The opening arc. Levels 1-2 teach the flip rule from both starting sides,
 * 3-4 practise shared holes and hubs where every branch is still safe, and the
 * capstone introduces the first branch that can genuinely strand the thread.
 *
 * Every level is validated at module load by `assertValidLevel`, so a broken
 * hoop fails the import, the tests, and the build — never the player.
 */
import { assertValidLevel } from "../../../game/solver.ts";
import type { Level } from "../../../game/types.ts";
import type { ChapterSource } from "../../types.ts";

const firstThread: Level = assertValidLevel({
  id: "first-thread-01",
  title: "First Thread",
  difficulty: "Easy",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 50, y: 70 }, { id: "b", x: 22, y: 32 }, { id: "c", x: 78, y: 32 }
  ],
  frontEdges: [{ from: "a", to: "b" }, { from: "a", to: "c" }],
  backEdges: [{ from: "b", to: "a" }, { from: "c", to: "a" }],
  authoredSolution: ["a", "b", "a", "c", "a"],
  expectedSolutionCount: 2,
  unique: false,
  allowDeadEnds: false,
  hintText: "Follow the glow. Two rays share one base — either ray is a safe first stitch.",
  guidance: "full",
  clues: {
    concept: "Every stitch flips the hoop. Stitch out along a ray, and the flip returns you to the base.",
    region: "Both glowing holes are safe — pick either ray to begin."
  },
  completionMessage: "Your first sunrise is stitched."
});

const kiteTail: Level = assertValidLevel({
  id: "kite-tail-02",
  title: "Kite Tail",
  difficulty: "Easy",
  startSide: "back",
  startHole: "a",
  holes: [
    { id: "a", x: 50, y: 76 }, { id: "b", x: 22, y: 42 }, { id: "c", x: 50, y: 16 }, { id: "d", x: 78, y: 42 }
  ],
  frontEdges: [{ from: "b", to: "a" }, { from: "c", to: "d" }],
  backEdges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "d", to: "a" }],
  authoredSolution: ["a", "b", "a", "c", "d", "a"],
  expectedSolutionCount: 4,
  unique: false,
  allowDeadEnds: false,
  hintText: "This hoop begins on the back. From the base, two unequal wings return safely.",
  guidance: "full",
  clues: {
    concept: "The kite draws two outlines that share the base hole. Stitch one wing out, flip back, then the other.",
    region: "From the base on this side, the open wings are the two holes you can reach."
  },
  completionMessage: "The kite lifts on one unbroken thread."
});

const twinPetals: Level = assertValidLevel({
  id: "twin-petals-03",
  title: "Twin Petals",
  difficulty: "Easy",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 50, y: 84 }, { id: "b", x: 20, y: 48 }, { id: "m", x: 50, y: 30 }, { id: "c", x: 80, y: 48 }
  ],
  frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "m" }, { from: "m", to: "a" }],
  backEdges: [{ from: "b", to: "m" }, { from: "a", to: "c" }, { from: "m", to: "a" }],
  authoredSolution: ["a", "b", "m", "c", "a", "m", "a"],
  expectedSolutionCount: 6,
  unique: false,
  allowDeadEnds: false,
  hintText: "Two petals share one center hole. Every return is safe.",
  guidance: "reduced",
  clues: {
    concept: "Two petals meet at a shared hole. Trace each petal's out-and-back: it returns through the center, never stranding a hole behind.",
    region: "Look at the two outer holes and the shared center — one petal still owes its return."
  },
  completionMessage: "Two petals, one balanced bloom."
});

const butterflyTurn: Level = assertValidLevel({
  id: "butterfly-turn-04",
  title: "Butterfly Turn",
  difficulty: "Easy",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 88 }, { id: "h", x: 50, y: 50 }, { id: "a", x: 14, y: 30 },
    { id: "b", x: 50, y: 12 }, { id: "c", x: 86, y: 30 }
  ],
  frontEdges: [{ from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }, { from: "c", to: "h" }],
  backEdges: [{ from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }],
  authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "h"],
  expectedSolutionCount: 6,
  unique: false,
  allowDeadEnds: false,
  hintText: "Three wings turn around one hub. Any wing can go first — each returns safely.",
  guidance: "reduced",
  clues: {
    concept: "Every wing is an out-and-back through the hub. Read which wings still owe a return before crossing to another.",
    region: "From the hub, the open wings are the holes with a line back to the center."
  },
  completionMessage: "Every wing meets at the same golden center."
});

const forkedNeedle: Level = assertValidLevel({
  id: "forked-needle-05",
  title: "Forked Needle",
  difficulty: "Moderate",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 14, y: 50 }, { id: "b", x: 40, y: 50 }, { id: "c", x: 40, y: 24 },
    { id: "d", x: 64, y: 40 }, { id: "e", x: 80, y: 56 }, { id: "f", x: 66, y: 72 },
    { id: "g", x: 48, y: 78 }, { id: "h", x: 30, y: 78 }
  ],
  frontEdges: [
    { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" }, { from: "f", to: "g" }
  ],
  backEdges: [
    { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "f" }, { from: "g", to: "h" }
  ],
  authoredSolution: ["a", "b", "c", "b", "d", "e", "f", "g", "h"],
  expectedSolutionCount: 1,
  unique: true,
  allowDeadEnds: true,
  hintText: "A tempting branch can strand thread. Undo is part of solving.",
  guidance: "reduced",
  clues: {
    concept: "One branch here loops back to the fork; the other runs away and never returns. Close the loop first, take the long line last.",
    region: "From the fork, one spoke returns and one runs on — save the runner for last."
  },
  completionMessage: "You found the branch that brings every stitch home."
});

export const chapterOneFirstLight: ChapterSource = {
  id: "day-and-night-ch01",
  title: "First Light",
  subtitle: "Learn the flip, then meet the first branch that can strand you.",
  order: 1,
  role: "tutorial",
  resetsDifficulty: true,
  capstoneLevelId: forkedNeedle.id,
  entries: [
    {
      level: firstThread,
      role: "teach",
      teaches: ["forced-flip", "safe-branch"]
    },
    {
      level: kiteTail,
      role: "teach",
      teaches: ["forced-flip", "safe-branch", "return-loop"]
    },
    {
      level: twinPetals,
      role: "practice",
      teaches: ["shared-hole", "return-loop"]
    },
    {
      level: butterflyTurn,
      role: "practice",
      teaches: ["hub", "return-loop"]
    },
    {
      level: forkedNeedle,
      role: "capstone",
      teaches: ["dangerous-fork", "runner", "delayed-trap"],
      pacingNote:
        "The capstone is also this chapter's twist: it is the first hoop where a legal stitch can strand the thread. Guidance stays reduced and Undo is one tap, so the lesson costs nothing."
    }
  ]
};
