# Difficulty Matrix — Collection 01 "Day & Night"

First honest difficulty pass over the existing ten levels. No new levels were
added. Figures are **measured**, not asserted: a script walked each level's
authored solution counting decision points (states with more than one legal
move) and did an exhaustive search for any reachable genuine dead end.

- **Meaningful decisions** = branch points along the solve where the player
  actually chooses between ≥2 legal stitches.
- **Can trap?** = a genuine dead end (no legal unused stitch) is reachable —
  exactly the `allowDeadEnds` levels, confirmed by search and by
  `src/game/stuck.test.ts`.
- **Safe retry** = every level offers unlimited Undo and Restart; no lives, ads,
  or payment. Trap levels additionally surface the trapped-thread alert.

| # | Level | Difficulty | Stitches | Solutions | Meaningful decisions | Can trap? | Guidance | Primary skill |
|---|---|---|---|---|---|---|---|---|
| 1 | First Thread | Gentle | 5 | 1 | **0** | no | full | Learn the flip; follow the glow |
| 2 | Kite Tail | Gentle | 7 | 1 | **0** | no | full | Back-side start; read the label |
| 3 | Twin Petals | Easy | 4 | 2 | 1 | no | reduced | First real choice; loops are safe |
| 4 | Butterfly Turn | Easy | 9 | 2 | 1 | no | reduced | Return-to-centre planning |
| 5 | Forked Needle | Moderate | 5 | 1 | 1 | **yes** | reduced | Recognise the stranding branch; Undo |
| 6 | Echo Stairs | Moderate | 8 | 1 | 2 | **yes** | reduced | Close each echo before climbing |
| 7 | Orbit Bloom | Tricky | 7 | 6 | 2 | no | reduced | Ordering; every order is safe |
| 8 | Laced Window | Tricky | 9 | 4 | 2 | no | minimal | Shared-hole crossings; symmetry |
| 9 | Moonlit Return | Expert | 11 | 3 decisions | 3 | **yes** | minimal | Sequencing linked returns L→R |
| 10 | Master Sampler | Expert | 17 | 1 | **5** | **yes** | minimal | Multi-loop planning under traps |

(Level 9 has a single solution; the "3" is decision points, not solution count.)

## Per-level notes and honest calls

- **1–2 (Gentle):** genuinely **too easy** — zero decisions, fully forced
  outlines. That is correct for a first flip tutorial, but they teach rather than
  challenge. They keep full guidance on purpose.
- **3–4 (Easy):** the first authored *choice* appears (which petal / wing first),
  and both branches are safe. Guidance drops to reduced so the player starts
  reading the pattern. Honest call: still easy, but no longer trivial.
- **5 (Moderate):** the pivotal teaching level — one decision, and the wrong
  branch **traps the thread**. This is where the trapped-thread state earns its
  place. Good.
- **6 (Moderate):** two decisions with reachable traps; teaches "resolve the
  local loop first." Solid moderate.
- **7 (Tricky):** labelled Tricky but is **forgiving** — 6 solutions, no trap. It
  is a *planning/ordering* puzzle, not a punishing one. Honest flag: difficulty
  here comes from combinatorial choice, not risk.
- **8 (Tricky):** 4 solutions, no trap; symmetric shared-hole crossings. Same
  honest caveat as 7 — "Tricky" is about reading structure, not danger.
- **9 (Expert):** three decisions with reachable traps; sequencing matters.
  Legitimately expert.
- **10 (Master Sampler):** the hardest by every measure — 17 stitches, five
  decision points, traps reachable. Correctly the capstone.

## Recommended future adjustments (Prompt 6+, not this milestone)

1. **Levels 1–2:** consider a single optional fork so even the tutorials have one
   real (safe) choice, without breaking their teaching role.
2. **Levels 7–8:** either accept them explicitly as "planning, not peril" puzzles
   (and maybe re-label away from "Tricky"), or introduce a dead-end branch so the
   Tricky tier can actually strand the thread like 5/6/9/10 do.
3. **Difficulty curve:** the risk (trap) skill currently appears at 5–6, vanishes
   at 7–8, and returns at 9–10. A future collection should keep the "can-trap"
   skill present once introduced, rather than dropping it mid-tier.
4. **Guidance ramp** (implemented): full (1–2) → reduced (3–7) → minimal (8–10).
   This matches the measured decision counts and is safe because screen-reader
   access to valid moves is preserved at every level.
