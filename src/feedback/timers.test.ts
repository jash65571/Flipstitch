import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { TimerSet } from "./timers.ts";

test("schedules multiple timers independently and fires each once", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const timers = new TimerSet();
    let fired = 0;
    timers.schedule(() => fired++, 10);
    timers.schedule(() => fired++, 20);
    assert.equal(timers.size, 2);
    mock.timers.tick(15);
    assert.equal(fired, 1, "the first timer fired on its own schedule");
    assert.equal(timers.size, 1);
    mock.timers.tick(10);
    assert.equal(fired, 2);
    assert.equal(timers.size, 0, "fired timers are forgotten");
  } finally {
    mock.timers.reset();
  }
});

test("clearAll cancels every pending timer", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const timers = new TimerSet();
    let fired = 0;
    timers.schedule(() => fired++, 10);
    timers.schedule(() => fired++, 10);
    timers.schedule(() => fired++, 10);
    assert.equal(timers.size, 3);
    timers.clearAll();
    assert.equal(timers.size, 0);
    mock.timers.tick(50);
    assert.equal(fired, 0, "no cancelled timer fires");
    timers.clearAll(); // safe to call again
  } finally {
    mock.timers.reset();
  }
});

test("timers scheduled after clearAll still work", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const timers = new TimerSet();
    timers.schedule(() => undefined, 10);
    timers.clearAll();
    let fired = false;
    timers.schedule(() => {
      fired = true;
    }, 10);
    mock.timers.tick(15);
    assert.equal(fired, true);
  } finally {
    mock.timers.reset();
  }
});
