import type { Level } from "./types.ts";

export const levelOne: Level = {
  id: "first-thread-01",
  title: "First Thread",
  collection: "Day & Night",
  startNode: "a",
  startSide: "front",
  nodes: [
    { id: "a", x: 24, y: 31 },
    { id: "b", x: 43, y: 19 },
    { id: "c", x: 67, y: 27 },
    { id: "d", x: 78, y: 48 },
    { id: "e", x: 68, y: 70 },
    { id: "f", x: 47, y: 80 },
    { id: "g", x: 27, y: 70 },
    { id: "h", x: 18, y: 50 },
    { id: "i", x: 32, y: 42 }
  ],
  edges: [
    { from: "a", to: "b", side: "front" },
    { from: "b", to: "c", side: "back" },
    { from: "c", to: "d", side: "front" },
    { from: "d", to: "e", side: "back" },
    { from: "e", to: "f", side: "front" },
    { from: "f", to: "g", side: "back" },
    { from: "g", to: "h", side: "front" },
    { from: "h", to: "i", side: "back" }
  ],
  solution: ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
};
