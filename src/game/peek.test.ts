import assert from "node:assert/strict";
import test from "node:test";

import { levelOne } from "../content/catalog.ts";
import { createGame } from "./engine.ts";
import {
  displayMode,
  needleAnchorNote,
  peekControlLabel,
  peekEnterAnnouncement,
  peekExitAnnouncement,
  peekingStatus,
  peekThroughStatus,
  playingStatus,
  togglePeek
} from "./peek.ts";

test("peek never mutates game state: toggling peek repeatedly leaves GameState untouched", () => {
  const game = createGame(levelOne);
  const before = JSON.stringify({ ...game, usedEdges: [...game.usedEdges] });

  let peekSide = togglePeek(game.activeSide, null);
  peekSide = togglePeek(game.activeSide, peekSide);
  peekSide = togglePeek(game.activeSide, peekSide);

  assert.equal(JSON.stringify({ ...game, usedEdges: [...game.usedEdges] }), before);
  assert.notEqual(peekSide, null);
});

test("entering then exiting peek restores the exact same peek state (null)", () => {
  const entered = togglePeek("back", null);
  const exited = togglePeek("back", entered);
  assert.equal(exited, null);
});

test("peek always shows the side opposite the active side", () => {
  assert.equal(togglePeek("front", null), "back");
  assert.equal(togglePeek("back", null), "front");
});

test("real side flip (GameState.activeSide) and peek toggling are distinct transitions", () => {
  // Playing a move changes GameState.activeSide via createGame/playMove
  // (engine.ts). Peek never touches GameState — it is a same-shaped Side
  // value that lives entirely outside it. togglePeek's signature never
  // accepts or returns a GameState, only a Side.
  const game = createGame(levelOne);
  const peekSide = togglePeek(game.activeSide, null);
  assert.equal(game.activeSide, "front"); // untouched
  assert.equal(peekSide, "back");
});

test("displayMode is playing when not peeking, peeking otherwise", () => {
  assert.equal(displayMode(null), "playing");
  assert.equal(displayMode("front"), "peeking");
  assert.equal(displayMode("back"), "peeking");
});

test("playingStatus never reports PEEKING and peekingStatus never replaces it", () => {
  assert.equal(playingStatus("back"), "PLAYING · BACK");
  assert.equal(playingStatus("front"), "PLAYING · FRONT");
  assert.equal(peekingStatus(null), null);
  assert.equal(peekingStatus("front"), "PEEKING · FRONT");
});

test("no contradictory FRONT/BACK copy: playingStatus side never equals peekingStatus side while peeking", () => {
  for (const activeSide of ["front", "back"] as const) {
    const peekSide = togglePeek(activeSide, null)!;
    const playing = playingStatus(activeSide);
    const peeking = peekingStatus(peekSide)!;
    assert.notEqual(playing, peeking);
    assert.ok(playing.includes(activeSide.toUpperCase()));
    assert.ok(peeking.includes(peekSide.toUpperCase()));
  }
});

test("control label names the action: Peek <other side> when idle, Close Peek when active", () => {
  assert.equal(peekControlLabel("back", null), "Peek Front");
  assert.equal(peekControlLabel("front", null), "Peek Back");
  // Through-Cloth Peek never moves the player anywhere ("Return to <side>"
  // implied a real trip back), so the active label is action-only.
  assert.equal(peekControlLabel("back", "front"), "Close Peek");
  assert.equal(peekControlLabel("front", "back"), "Close Peek");
});

test("peekThroughStatus names the side being seen through the cloth", () => {
  assert.equal(peekThroughStatus("back"), "SEEING BACK THROUGH CLOTH");
  assert.equal(peekThroughStatus("front"), "SEEING FRONT THROUGH CLOTH");
});

test("needle anchor note always names the true active side, never the peeked side", () => {
  assert.equal(needleAnchorNote("back"), "Needle stays on Back");
  assert.equal(needleAnchorNote("front"), "Needle stays on Front");
});

test("rapid repeated open/close toggling always alternates cleanly and never gets stuck peeking", () => {
  let peekSide: ReturnType<typeof togglePeek> = null;
  for (let i = 0; i < 20; i += 1) {
    peekSide = togglePeek("front", peekSide);
    assert.equal(peekSide, i % 2 === 0 ? "back" : null);
  }
});

test("accessibility announcements name both the peeked side and the real needle side, and mark read-only", () => {
  const enter = peekEnterAnnouncement("front", "back");
  assert.ok(enter.includes("Front"));
  assert.ok(enter.includes("Back"));
  assert.ok(enter.toLowerCase().includes("read-only"));

  const exit = peekExitAnnouncement("back");
  assert.ok(exit.includes("Back"));
});
