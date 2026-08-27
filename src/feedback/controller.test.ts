import assert from "node:assert/strict";
import test from "node:test";

import { FeedbackController, type AudioService, type HapticService } from "./controller.ts";
import { planForEvent, type FeedbackEvent, type HapticKind, type SoundName } from "./mapping.ts";

function makeFakes() {
  const played: Array<{ name: SoundName; delayMs: number }> = [];
  const haptics: HapticKind[] = [];
  const audio: AudioService = {
    play(name, delayMs = 0) {
      played.push({ name, delayMs });
    },
    release() {
      played.length = 0;
    }
  };
  const haptic: HapticService = {
    fire(kind) {
      haptics.push(kind);
    }
  };
  return { played, haptics, audio, haptic };
}

function makeController(audio: AudioService, haptic: HapticService, settings: { soundEnabled: boolean; hapticsEnabled: boolean }) {
  return new FeedbackController(audio, haptic, () => settings);
}

test("every semantic event maps to sounds and a haptic plan", () => {
  const events: FeedbackEvent[] = [
    "stitchPlaced",
    "sideChanged",
    "invalidMove",
    "undo",
    "hint",
    "levelCompleted",
    "levelUnlocked",
    "gallerySelected"
  ];
  for (const event of events) {
    const plan = planForEvent(event);
    assert.ok(plan.sounds.length > 0, `${event} should map to at least one sound`);
    assert.ok(plan.haptic, `${event} should map to a haptic`);
  }
});

test("a valid stitch plays pierce then a delayed thread tighten plus a light tick", () => {
  const { played, haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: true, hapticsEnabled: true });
  controller.emit("stitchPlaced", 1_000);
  assert.deepEqual(played, [
    { name: "needle-pierce", delayMs: 0 },
    { name: "thread-tighten", delayMs: 90 }
  ]);
  assert.deepEqual(haptics, ["light"]);
});

test("side change right after a stitch deduplicates the haptic but keeps its sound", () => {
  const { played, haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: true, hapticsEnabled: true });
  controller.emit("stitchPlaced", 1_000);
  controller.emit("sideChanged", 1_050);
  assert.deepEqual(haptics, ["light"], "one action should fire one haptic");
  assert.ok(played.some((p) => p.name === "hoop-flip"), "the flip sound still plays");
});

test("two independent side changes each still fire their own haptic (real stitches, not Peek — Peek's sideChanged-free peekToggled event is covered separately)", () => {
  const { haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: true, hapticsEnabled: true });
  controller.emit("sideChanged", 1_000);
  controller.emit("sideChanged", 1_500);
  assert.deepEqual(haptics, ["soft", "soft"]);
});

test("unlock right after completion deduplicates the haptic", () => {
  const { haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: true, hapticsEnabled: true });
  controller.emit("levelCompleted", 1_000);
  controller.emit("levelUnlocked", 1_100);
  assert.deepEqual(haptics, ["success"]);
});

test("sound disabled plays nothing but haptics still fire", () => {
  const { played, haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: false, hapticsEnabled: true });
  controller.emit("stitchPlaced", 1_000);
  assert.deepEqual(played, []);
  assert.deepEqual(haptics, ["light"]);
});

test("haptics disabled produces no vibration but sound still plays", () => {
  const { played, haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: true, hapticsEnabled: false });
  controller.emit("invalidMove", 1_000);
  assert.deepEqual(haptics, []);
  assert.deepEqual(played.map((p) => p.name), ["invalid-stitch"]);
});

test("both disabled produces nothing", () => {
  const { played, haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: false, hapticsEnabled: false });
  controller.emit("levelCompleted", 1_000);
  assert.deepEqual(played, []);
  assert.deepEqual(haptics, []);
});

test("the same haptic group can fire again after its cooldown", () => {
  const { haptics, audio, haptic } = makeFakes();
  const controller = makeController(audio, haptic, { soundEnabled: true, hapticsEnabled: true });
  controller.emit("stitchPlaced", 1_000);
  controller.emit("sideChanged", 1_050);
  controller.emit("sideChanged", 1_300);
  assert.deepEqual(haptics, ["light", "soft"]);
});
