import { assertValidLevel } from "./solver.ts";
import type { Level } from "./types.ts";

const collection = "Day & Night";

const authoredLevels: Level[] = [
  {
    id: "first-thread-01",
    title: "First Thread",
    collection,
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
  },
  {
    id: "kite-tail-02",
    title: "Kite Tail",
    collection,
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
  },
  {
    id: "twin-petals-03",
    title: "Twin Petals",
    collection,
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
  },
  {
    id: "butterfly-turn-04",
    title: "Butterfly Turn",
    collection,
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
  },
  {
    id: "forked-needle-05",
    title: "Forked Needle",
    collection,
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
    guidance: "reduced",
    clues: {
      concept: "Each step is a small out-and-back echo. Close the echo you are on before climbing higher.",
      region: "The lower, nearer holes hold the echo you still owe — resolve it before the long line up."
    },
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
      { id: "s", x: 50, y: 90 }, { id: "h", x: 50, y: 56 }, { id: "a", x: 16, y: 26 },
      { id: "b", x: 50, y: 10 }, { id: "c", x: 84, y: 26 }, { id: "d", x: 84, y: 72 },
      { id: "e", x: 62, y: 88 }, { id: "f", x: 38, y: 84 }
    ],
    frontEdges: [
      { from: "s", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" },
      { from: "c", to: "d" }, { from: "e", to: "f" }
    ],
    backEdges: [
      { from: "h", to: "a" }, { from: "h", to: "b" }, { from: "h", to: "c" }, { from: "d", to: "e" }
    ],
    authoredSolution: ["s", "h", "a", "h", "b", "h", "c", "d", "e", "f"],
    expectedSolutionCount: 2,
    unique: false,
    allowDeadEnds: true,
    hintText: "Petals orbit one hub. One line never returns — save it for last.",
    guidance: "reduced",
    clues: {
      concept: "Two petals orbit the hub and return; the third line runs out and never comes back. Close the returning petals first, finish on the long line.",
      region: "From the hub, read which spokes still owe a return before the line that runs away."
    },
    completionMessage: "The orbits close into one bloom."
  },
  {
    id: "laced-window-08",
    title: "Laced Window",
    collection,
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
    hintText: "Two shared holes lace the window. The loose crossing must finish last.",
    guidance: "minimal",
    clues: {
      concept: "One rail returns to the frame through a shared hole; the runner ends outside it. Weave the returning rail and petal first, then the loose crossing.",
      region: "From the hub, the rail and petal still owe their returns — the runner outside is the final stitch."
    },
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
      { id: "a", x: 10, y: 74 }, { id: "b", x: 24, y: 60 }, { id: "c", x: 14, y: 38 },
      { id: "d", x: 40, y: 54 }, { id: "e", x: 36, y: 28 }, { id: "f", x: 57, y: 46 },
      { id: "g", x: 50, y: 22 }, { id: "g2", x: 64, y: 22 }, { id: "h", x: 74, y: 58 },
      { id: "i", x: 86, y: 44 }
    ],
    frontEdges: [
      { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" },
      { from: "d", to: "f" }, { from: "g", to: "f" }, { from: "g2", to: "f" }, { from: "h", to: "i" }
    ],
    backEdges: [
      { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" },
      { from: "f", to: "g" }, { from: "f", to: "g2" }, { from: "f", to: "h" }
    ],
    authoredSolution: ["a", "b", "c", "b", "d", "e", "d", "f", "g", "f", "g2", "f", "h", "i"],
    expectedSolutionCount: 2,
    unique: false,
    allowDeadEnds: true,
    hintText: "Finish each moonlit return before moving farther right.",
    guidance: "minimal",
    clues: {
      concept: "The pattern climbs left to right in linked returns. Skipping ahead strands a hole behind you — and at the final cluster, two returns are both safe.",
      region: "The left-most unfinished cluster still owes a return — settle it before reaching right."
    },
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
    authoredSolution: ["a", "b", "c", "b", "d", "e", "d", "f", "g", "f", "h", "i", "h", "j", "k", "j", "l", "m", "l", "o", "n"],
    expectedSolutionCount: 1,
    unique: true,
    allowDeadEnds: true,
    hintText: "Plan in pairs. Close every small loop before taking the long stitch onward.",
    guidance: "minimal",
    clues: {
      concept: "This sampler chains many small loops. Close each loop fully before the long stitch that leaves it.",
      region: "The tight cluster around the needle still holds an unclosed loop — finish it before travelling on."
    },
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
