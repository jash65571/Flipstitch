/**
 * Knot & Bramble — Chapter One: Tangled Root.
 *
 * Collection 02's opening arc. The player has just mastered Day & Night, so
 * this chapter deliberately resets to an easy opener and teaches two new
 * ideas: a return that nests inside another return (`nested-obligation`), and
 * a hub whose exits depend on which side you arrive from (`asymmetric-hub`).
 * By the capstone both ideas combine into one hoop that asks for real
 * lookahead.
 *
 * Every level is validated at module load by `assertValidLevel`; every
 * authored number (solution count, trap intent, difficulty) was measured by
 * `src/game/solver.ts` and `src/game/analyzer.ts`, not hand-guessed.
 */
import { assertValidLevel } from "../../../game/solver.ts";
import type { Level } from "../../../game/types.ts";
import type { ChapterSource } from "../../types.ts";

const rootKnot: Level = assertValidLevel({
  id: "root-knot-11",
  title: "Root Knot",
  difficulty: "Easy",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 88 }, { id: "h", x: 50, y: 60 }, { id: "p", x: 50, y: 36 },
    { id: "q", x: 50, y: 12 }, { id: "a", x: 20, y: 60 }
  ],
  frontEdges: [{ from: "s", to: "h" }, { from: "p", to: "q" }, { from: "a", to: "h" }],
  backEdges: [{ from: "h", to: "p" }, { from: "q", to: "h" }, { from: "h", to: "a" }],
  authoredSolution: ["s", "h", "p", "q", "h", "a", "h"],
  expectedSolutionCount: 4,
  unique: false,
  allowDeadEnds: false,
  hintText: "One root runs deep before it surfaces again. Follow it all the way down before you branch.",
  guidance: "full",
  clues: {
    concept: "A root can dive to a second hole before it returns — the whole dive is one obligation. Finish the dive, then the hub is free for its other branch.",
    region: "From the hub, the deep root and the short root are both safe to start — either order finishes clean."
  },
  completionMessage: "The first knot ties itself off, root and all."
});

const twinRoots: Level = assertValidLevel({
  id: "twin-roots-12",
  title: "Twin Roots",
  difficulty: "Easy",
  startSide: "front",
  startHole: "s",
  holes: [
    { id: "s", x: 50, y: 92 }, { id: "h", x: 50, y: 70 }, { id: "p", x: 50, y: 48 },
    { id: "r", x: 30, y: 30 }, { id: "q", x: 50, y: 12 }, { id: "a", x: 18, y: 70 }, { id: "b", x: 82, y: 70 }
  ],
  frontEdges: [
    { from: "s", to: "h" }, { from: "p", to: "r" }, { from: "q", to: "h" }, { from: "a", to: "h" }, { from: "b", to: "h" }
  ],
  backEdges: [{ from: "h", to: "p" }, { from: "r", to: "q" }, { from: "h", to: "a" }, { from: "h", to: "b" }],
  authoredSolution: ["s", "h", "p", "r", "q", "h", "a", "h", "b", "h"],
  expectedSolutionCount: 6,
  unique: false,
  allowDeadEnds: false,
  hintText: "This root dives two holes deep before it surfaces. The two shallow roots still return in any order.",
  guidance: "full",
  clues: {
    concept: "A deeper dive is still one obligation, however many holes it passes through — it must fully surface before you owe it nothing more.",
    region: "The hub still offers three safe openings: the deep root, and the two shallow ones either side."
  },
  completionMessage: "Every root, shallow or deep, finds its way home."
});

const barkHollow: Level = assertValidLevel({
  id: "bark-hollow-13",
  title: "Bark Hollow",
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
  hintText: "The hollow reads differently depending on which side you arrive from. Close the near loop first.",
  guidance: "reduced",
  clues: {
    concept: "This hub's front and back do not offer the same number of exits. Arrive from one side and it is a junction; arrive from the other and it is a single lane out.",
    region: "The near loop still owes its return — settle it before the long lane carries you away for good."
  },
  completionMessage: "You read the hollow from both sides and it held."
});

const oldGrowth: Level = assertValidLevel({
  id: "old-growth-15",
  title: "Old Growth",
  difficulty: "Tricky",
  startSide: "front",
  startHole: "a",
  holes: [
    { id: "a", x: 16, y: 78 }, { id: "b", x: 32, y: 62 }, { id: "c", x: 20, y: 40 },
    { id: "d", x: 48, y: 54 }, { id: "e", x: 44, y: 28 }, { id: "f", x: 68, y: 44 },
    { id: "g", x: 62, y: 20 }, { id: "g2", x: 78, y: 20 }, { id: "h", x: 84, y: 34 }
  ],
  frontEdges: [
    { from: "a", to: "b" }, { from: "c", to: "b" }, { from: "d", to: "e" }, { from: "d", to: "f" },
    { from: "g", to: "h" }, { from: "g2", to: "f" }
  ],
  backEdges: [
    { from: "b", to: "c" }, { from: "b", to: "d" }, { from: "e", to: "d" }, { from: "f", to: "g" }, { from: "f", to: "g2" }
  ],
  authoredSolution: ["a", "b", "c", "b", "d", "e", "d", "f", "g2", "f", "g", "h"],
  expectedSolutionCount: 1,
  unique: true,
  allowDeadEnds: true,
  hintText: "This trunk holds a nested loop and a two-faced hub together. Close the inner ring, then read the far hub from both its lanes.",
  guidance: "reduced",
  clues: {
    concept: "The inner ring must fully close before the trunk continues, and the hub past it opens two lanes from this side but only one leads home. Both ideas from this chapter live in the same hoop now.",
    region: "The nested ring nearest the start still owes its return — the far hub's true exit only shows once you have tried its near lane."
  },
  completionMessage: "The old growth holds its rings and its grain both true."
});

const deepTaproot: Level = assertValidLevel({
  id: "deep-taproot-14",
  title: "Deep Taproot",
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
  hintText: "The taproot hub offers two safe loops and one lane that never comes back. Save the lane for last.",
  guidance: "reduced",
  clues: {
    concept: "Two of the hub's spokes are nested returns; the third is a taproot that runs on and never resurfaces. Read which spoke is which before you commit to it.",
    region: "From the hub, the two returning loops are still owed — the long taproot lane is the last thing you take."
  },
  completionMessage: "The taproot runs deep and the sampler still stands."
});

export const chapterOneTangledRoot: ChapterSource = {
  id: "knot-and-bramble-ch01",
  title: "Tangled Root",
  subtitle: "A return can nest inside another return, and a hub can wear two different faces.",
  order: 1,
  role: "tutorial",
  resetsDifficulty: true,
  capstoneLevelId: oldGrowth.id,
  entries: [
    {
      level: rootKnot,
      role: "teach",
      teaches: ["nested-obligation"]
    },
    {
      level: twinRoots,
      role: "practice",
      teaches: ["nested-obligation", "ordering-discipline"]
    },
    {
      level: barkHollow,
      role: "twist",
      teaches: ["asymmetric-hub", "dangerous-fork"]
    },
    {
      level: deepTaproot,
      role: "combine",
      teaches: ["asymmetric-hub", "nested-obligation", "ordering-discipline", "hub"]
    },
    {
      level: oldGrowth,
      role: "capstone",
      teaches: ["nested-obligation", "asymmetric-hub", "ordering-discipline"]
    }
  ]
};
