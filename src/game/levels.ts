import { assertValidLevel } from "./solver.ts";
import type { Level } from "./types.ts";

const collection = "Day & Night";

const authoredLevels: Level[] = [
  {
    id: "first-thread-01",
    title: "First Thread",
    collection,
    difficulty: "Gentle",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 20, y: 64 }, { id: "b", x: 31, y: 40 }, { id: "c", x: 45, y: 28 },
      { id: "d", x: 58, y: 28 }, { id: "e", x: 72, y: 40 }, { id: "f", x: 82, y: 64 }
    ],
    frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "d" }, { from: "e", to: "f" }],
    backEdges: [{ from: "b", to: "c" }, { from: "d", to: "e" }],
    authoredSolution: ["a", "b", "c", "d", "e", "f"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: false,
    hintText: "Follow the glow. Each stitch moves the needle to the other side.",
    completionMessage: "Your first sunrise is stitched."
  },
  {
    id: "kite-tail-02",
    title: "Kite Tail",
    collection,
    difficulty: "Gentle",
    startSide: "back",
    startHole: "a",
    holes: [
      { id: "a", x: 50, y: 15 }, { id: "b", x: 72, y: 36 }, { id: "c", x: 51, y: 54 },
      { id: "d", x: 28, y: 36 }, { id: "e", x: 50, y: 73 }, { id: "f", x: 38, y: 84 },
      { id: "g", x: 56, y: 88 }, { id: "h", x: 68, y: 76 }
    ],
    frontEdges: [{ from: "b", to: "c" }, { from: "d", to: "e" }, { from: "f", to: "g" }],
    backEdges: [{ from: "a", to: "b" }, { from: "c", to: "d" }, { from: "e", to: "f" }, { from: "g", to: "h" }],
    authoredSolution: ["a", "b", "c", "d", "e", "f", "g", "h"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: false,
    hintText: "This hoop begins on the back. The side badge always shows where to stitch.",
    completionMessage: "The kite lifts on one unbroken thread."
  },
  {
    id: "twin-petals-03",
    title: "Twin Petals",
    collection,
    difficulty: "Easy",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 50, y: 66 }, { id: "b", x: 28, y: 36 }, { id: "c", x: 72, y: 36 }
    ],
    frontEdges: [{ from: "a", to: "b" }, { from: "a", to: "c" }],
    backEdges: [{ from: "b", to: "a" }, { from: "c", to: "a" }],
    authoredSolution: ["a", "b", "a", "c", "a"],
    expectedSolutionCount: 2,
    unique: false,
    allowDeadEnds: false,
    hintText: "Either petal is safe. Finish one loop, then stitch the other.",
    completionMessage: "Two choices, one balanced bloom."
  },
  {
    id: "butterfly-turn-04",
    title: "Butterfly Turn",
    collection,
    difficulty: "Easy",
    startSide: "front",
    startHole: "s",
    holes: [
      { id: "s", x: 50, y: 86 }, { id: "h", x: 50, y: 58 }, { id: "a", x: 30, y: 48 },
      { id: "b", x: 18, y: 27 }, { id: "c", x: 40, y: 22 }, { id: "d", x: 70, y: 48 },
      { id: "e", x: 82, y: 27 }, { id: "f", x: 60, y: 22 }
    ],
    frontEdges: [
      { from: "s", to: "h" }, { from: "a", to: "b" }, { from: "c", to: "h" },
      { from: "d", to: "e" }, { from: "f", to: "h" }
    ],
    backEdges: [
      { from: "h", to: "a" }, { from: "b", to: "c" }, { from: "h", to: "d" }, { from: "e", to: "f" }
    ],
    authoredSolution: ["s", "h", "a", "b", "c", "h", "d", "e", "f", "h"],
    expectedSolutionCount: 2,
    unique: false,
    allowDeadEnds: false,
    hintText: "Both wings return to the center, so either wing can go first.",
    completionMessage: "Both wings meet at the same golden center."
  },
  {
    id: "forked-needle-05",
    title: "Forked Needle",
    collection,
    difficulty: "Moderate",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 18, y: 51 }, { id: "b", x: 42, y: 51 }, { id: "c", x: 42, y: 24 },
      { id: "d", x: 68, y: 43 }, { id: "e", x: 83, y: 69 }
    ],
    frontEdges: [{ from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" }],
    backEdges: [{ from: "b", to: "c" }, { from: "b", to: "d" }],
    authoredSolution: ["a", "b", "c", "b", "d", "e"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: true,
    hintText: "A tempting branch can strand thread. Undo is part of solving.",
    completionMessage: "You found the branch that brings every stitch home."
  },
  {
    id: "echo-stairs-06",
    title: "Echo Stairs",
    collection,
    difficulty: "Moderate",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 17, y: 76 }, { id: "b", x: 34, y: 64 }, { id: "c", x: 27, y: 39 },
      { id: "d", x: 53, y: 52 }, { id: "e", x: 49, y: 25 }, { id: "f", x: 72, y: 40 },
      { id: "g", x: 84, y: 18 }
    ],
    frontEdges: [
      { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" }, { from: "d", to: "f" }
    ],
    backEdges: [
      { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" }, { from: "f", to: "g" }
    ],
    authoredSolution: ["a", "b", "c", "b", "d", "e", "d", "f", "g"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: true,
    hintText: "Close each short echo before climbing to the next step.",
    completionMessage: "Every return built the staircase."
  },
  {
    id: "orbit-bloom-07",
    title: "Orbit Bloom",
    collection,
    difficulty: "Tricky",
    startSide: "front",
    startHole: "s",
    holes: [
      { id: "s", x: 50, y: 88 }, { id: "h", x: 50, y: 54 }, { id: "a", x: 23, y: 30 },
      { id: "b", x: 50, y: 15 }, { id: "c", x: 77, y: 30 }
    ],
    frontEdges: [
      { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }, { from: "c", to: "h" }
    ],
    backEdges: [{ from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }],
    authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "h"],
    expectedSolutionCount: 6,
    unique: false,
    allowDeadEnds: false,
    hintText: "Three loops share one hole. Their order changes, but each loop returns safely.",
    completionMessage: "Three orbits close into one bloom."
  },
  {
    id: "laced-window-08",
    title: "Laced Window",
    collection,
    difficulty: "Tricky",
    startSide: "front",
    startHole: "s",
    holes: [
      { id: "s", x: 50, y: 90 }, { id: "h", x: 50, y: 72 }, { id: "x", x: 50, y: 28 },
      { id: "a", x: 25, y: 55 }, { id: "b", x: 25, y: 42 }, { id: "c", x: 75, y: 55 },
      { id: "d", x: 75, y: 42 }
    ],
    frontEdges: [
      { from: "s", to: "h" }, { from: "a", to: "x" }, { from: "b", to: "h" },
      { from: "c", to: "x" }, { from: "d", to: "h" }
    ],
    backEdges: [
      { from: "h", to: "a" }, { from: "x", to: "b" }, { from: "h", to: "c" }, { from: "x", to: "d" }
    ],
    authoredSolution: ["s", "h", "a", "x", "b", "h", "c", "x", "d", "h"],
    expectedSolutionCount: 4,
    unique: false,
    allowDeadEnds: false,
    hintText: "The top and bottom holes are shared. Every crossing still returns to the frame.",
    completionMessage: "The shared holes hold a clean woven window."
  },
  {
    id: "moonlit-return-09",
    title: "Moonlit Return",
    collection,
    difficulty: "Expert",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 14, y: 72 }, { id: "b", x: 29, y: 59 }, { id: "c", x: 19, y: 36 },
      { id: "d", x: 45, y: 52 }, { id: "e", x: 43, y: 25 }, { id: "f", x: 62, y: 45 },
      { id: "g", x: 66, y: 19 }, { id: "h", x: 78, y: 59 }, { id: "i", x: 88, y: 79 }
    ],
    frontEdges: [
      { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" },
      { from: "d", to: "f" }, { from: "g", to: "f" }, { from: "h", to: "i" }
    ],
    backEdges: [
      { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" },
      { from: "f", to: "g" }, { from: "f", to: "h" }
    ],
    authoredSolution: ["a", "b", "c", "b", "d", "e", "d", "f", "g", "f", "h", "i"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: true,
    hintText: "Finish each moonlit return before moving farther right.",
    completionMessage: "Careful returns carried the thread into moonlight."
  },
  {
    id: "master-sampler-10",
    title: "Master Sampler",
    collection,
    difficulty: "Expert",
    startSide: "front",
    startHole: "a",
    holes: [
      { id: "a", x: 12, y: 79 }, { id: "b", x: 25, y: 67 }, { id: "c", x: 15, y: 46 },
      { id: "d", x: 39, y: 56 }, { id: "e", x: 34, y: 30 }, { id: "f", x: 53, y: 47 },
      { id: "g", x: 55, y: 20 }, { id: "h", x: 67, y: 55 }, { id: "i", x: 75, y: 30 },
      { id: "j", x: 79, y: 70 }, { id: "k", x: 91, y: 50 }, { id: "l", x: 76, y: 88 },
      { id: "m", x: 92, y: 82 }
    ],
    frontEdges: [
      { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" },
      { from: "d", to: "f" }, { from: "g", to: "f" }, { from: "h", to: "i" },
      { from: "h", to: "j" }, { from: "k", to: "j" }, { from: "l", to: "m" }
    ],
    backEdges: [
      { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" },
      { from: "f", to: "g" }, { from: "f", to: "h" }, { from: "i", to: "h" },
      { from: "j", to: "k" }, { from: "j", to: "l" }
    ],
    authoredSolution: ["a", "b", "c", "b", "d", "e", "d", "f", "g", "f", "h", "i", "h", "j", "k", "j", "l", "m"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: true,
    hintText: "Plan in pairs. Close every small loop before taking the long stitch onward.",
    completionMessage: "The final sampler proves one thread can hold two plans."
  }
];

export const levels = authoredLevels.map(assertValidLevel);
export const levelOne = levels[0];

export function getLevel(levelId: string): Level | undefined {
  return levels.find((level) => level.id === levelId);
}

export function getLevelIndex(levelId: string): number {
  return levels.findIndex((level) => level.id === levelId);
}
