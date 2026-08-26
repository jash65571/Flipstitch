import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmExpired,
  confirmFinished,
  initialConfirmState,
  pressConfirm,
  type ConfirmState
} from "./confirm.ts";

test("first tap arms, second tap confirms into busy", () => {
  const armed = pressConfirm(initialConfirmState);
  assert.deepEqual(armed, { armed: true, busy: false });
  const busy = pressConfirm(armed);
  assert.deepEqual(busy, { armed: false, busy: true });
});

test("busy state ignores further presses (no double execution)", () => {
  const busy: ConfirmState = { armed: false, busy: true };
  assert.deepEqual(pressConfirm(busy), busy);
  assert.deepEqual(pressConfirm({ armed: true, busy: true }), { armed: true, busy: true });
});

test("finishing resets the button", () => {
  const busy: ConfirmState = { armed: false, busy: true };
  assert.deepEqual(confirmFinished(busy), initialConfirmState);
});

test("the armed timeout expires the armed state but never interrupts busy work", () => {
  const armed: ConfirmState = { armed: true, busy: false };
  assert.deepEqual(confirmExpired(armed), initialConfirmState);
  const busy: ConfirmState = { armed: false, busy: true };
  assert.deepEqual(confirmExpired(busy), busy);
});

test("the state machine transitions are pure and deterministic", () => {
  const a = pressConfirm(initialConfirmState);
  const b = pressConfirm(a);
  const c = confirmFinished(b);
  assert.deepEqual(c, initialConfirmState);
  assert.deepEqual(pressConfirm(c), { armed: true, busy: false });
});
