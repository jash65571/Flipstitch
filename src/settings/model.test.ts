import assert from "node:assert/strict";
import test from "node:test";

import {
  emptySettings,
  readSettings,
  setHapticsEnabled,
  setSoundEnabled,
  SETTINGS_VERSION
} from "./model.ts";

test("defaults enable both sound and haptics", () => {
  const settings = emptySettings();
  assert.equal(settings.version, SETTINGS_VERSION);
  assert.equal(settings.soundEnabled, true);
  assert.equal(settings.hapticsEnabled, true);
});

test("settings survive a serialize and reload cycle", () => {
  const saved = setHapticsEnabled(setSoundEnabled(emptySettings(), false), false);
  assert.deepEqual(readSettings(JSON.stringify(saved)), saved);
});

test("corrupt settings fall back to defaults", () => {
  assert.deepEqual(readSettings("not json"), emptySettings());
  assert.deepEqual(readSettings(JSON.stringify({ version: 99, soundEnabled: false })), emptySettings());
  assert.deepEqual(readSettings(null), emptySettings());
});

test("toggles only change their own preference", () => {
  const settings = setSoundEnabled(emptySettings(), false);
  assert.equal(settings.soundEnabled, false);
  assert.equal(settings.hapticsEnabled, true);
  const back = setSoundEnabled(settings, true);
  assert.equal(back.soundEnabled, true);
  assert.equal(back.hapticsEnabled, true);
});
