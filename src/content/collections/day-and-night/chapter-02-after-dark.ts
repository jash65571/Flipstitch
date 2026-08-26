/**
 * Day & Night — Chapter Two: After Dark.
 *
 * The danger arc. Chapter One ended by proving a stitch can strand the thread;
 * this chapter keeps that pressure on and adds ordering discipline, runners
 * that never return, linked returns, and finally a dense multi-region sampler.
 *
 * `resetsDifficulty` is false: this chapter deliberately continues one learning
 * arc rather than opening a new one, so the pacing validator does not demand an
 * approachable opener here. A genuinely new collection would set it true.
 */
import { assertValidLevel } from "../../../game/solver.ts";
import type { Level } from "../../../game/types.ts";
import type { ChapterSource } from "../../types.ts";

const echoStairs: Level = assertValidLevel({
  id: "echo-stairs-06",
  title: "Echo Stairs",
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
});

const orbitBloom: Level = assertValidLevel({
  id: "orbit-bloom-07",
  title: "Orbit Bloom",
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
});

const lacedWindow: Level = assertValidLevel({
  id: "laced-window-08",
  title: "Laced Window",
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
});

const moonlitReturn: Level = assertValidLevel({
  id: "moonlit-return-09",
  title: "Moonlit Return",
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
});

const masterSampler: Level = assertValidLevel({
  id: "master-sampler-10",
  title: "Master Sampler",
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
});

export const chapterTwoAfterDark: ChapterSource = {
  id: "day-and-night-ch02",
  title: "After Dark",
  subtitle: "Runners, linked returns, and the order that keeps the thread home.",
  order: 2,
  role: "mastery",
  resetsDifficulty: false,
  capstoneLevelId: masterSampler.id,
  entries: [
    {
      level: echoStairs,
      role: "twist",
      teaches: ["linked-return", "dangerous-fork", "ordering-discipline"],
      pacingNote:
        "Chapter Two opens at the pressure Chapter One ended on. Day & Night is one continuous learning arc split into a light half and a dark half, so the boundary is a scene change, not a difficulty reset (resetsDifficulty: false)."
    },
    {
      level: orbitBloom,
      role: "pressure",
      teaches: ["hub", "runner", "ordering-discipline"]
    },
    {
      level: lacedWindow,
      role: "pressure",
      teaches: ["shared-hole", "runner", "ordering-discipline"]
    },
    {
      level: moonlitReturn,
      role: "combine",
      teaches: ["linked-return", "delayed-trap", "multi-region", "safe-branch"]
    },
    {
      level: masterSampler,
      role: "capstone",
      teaches: ["multi-region", "linked-return", "ordering-discipline", "hub"]
    }
  ]
};
