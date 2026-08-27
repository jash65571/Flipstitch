import assert from "node:assert/strict";
import test from "node:test";

import {
  adjustedWaldInterval,
  binomialCdf,
  classifyGate,
  classifyMedianGate,
  estimateProportion,
  geometricMean,
  median,
  medianInterval,
  percentile,
  ruleOfThreeUpperBound,
  summarizeSample,
  wilsonInterval,
  MIN_GATE_SAMPLE
} from "./stats.ts";

const close = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

test("Wilson interval matches published values for a mid-range proportion", () => {
  // 8 of 10 at 95%. Worked by hand: z2 = 3.8414588, centre = 0.716743,
  // spread = 0.226580, so the interval is 0.490163 to 0.943323.
  const result = wilsonInterval(8, 10);
  assert.ok(result);
  close(result.low, 0.490163, 1e-5);
  close(result.high, 0.943323, 1e-5);
});

test("Wilson interval never collapses to zero width at the extremes", () => {
  const none = wilsonInterval(0, 8);
  const all = wilsonInterval(8, 8);
  assert.ok(none && all);
  assert.equal(none.low, 0);
  assert.ok(none.high > 0.25, "0 of 8 must not be reported as a 0%-to-0% interval");
  assert.equal(all.high, 1);
  assert.ok(all.low < 0.7, "8 of 8 must not be reported as certainty");
});

test("Wilson interval stays inside [0, 1] and is undefined for an empty sample", () => {
  for (const [k, n] of [
    [0, 1],
    [1, 1],
    [3, 7],
    [40, 40]
  ] as const) {
    const result = wilsonInterval(k, n);
    assert.ok(result);
    assert.ok(result.low >= 0 && result.high <= 1);
    assert.ok(result.low <= result.high);
  }
  assert.equal(wilsonInterval(0, 0), null);
});

test("adjusted Wald agrees with Wilson to within a few points on small samples", () => {
  const wilson = wilsonInterval(8, 10);
  const wald = adjustedWaldInterval(8, 10);
  assert.ok(wilson && wald);
  assert.ok(Math.abs(wilson.low - wald.low) < 0.05);
  assert.ok(Math.abs(wilson.high - wald.high) < 0.05);
});

test("estimateProportion reports null rate for an empty denominator", () => {
  const estimate = estimateProportion(0, 0);
  assert.equal(estimate.rate, null);
  assert.equal(estimate.wilson, null);
  assert.equal(estimate.adjustedWald, null);
});

test("rule of three gives the upper bound for zero observed events", () => {
  close(ruleOfThreeUpperBound(10) as number, 0.3);
  close(ruleOfThreeUpperBound(62) as number, 3 / 62);
  assert.equal(ruleOfThreeUpperBound(1), 1);
  assert.equal(ruleOfThreeUpperBound(0), null);
});

test("median and percentile are deterministic on even and odd samples", () => {
  assert.equal(median([]), null);
  assert.equal(median([5]), 5);
  assert.equal(median([1, 3]), 2);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(percentile([1, 2, 3, 4], 0.25), 1);
  assert.equal(percentile([1, 2, 3, 4], 0.75), 3);
  assert.equal(percentile([1, 2, 3, 4], 1), 4);
  assert.equal(percentile([], 0.5), null);
});

test("geometric mean resists a single very slow tester", () => {
  const times = [3000, 3500, 4000, 4200, 60_000];
  const arithmetic = times.reduce((a, b) => a + b, 0) / times.length;
  const geometric = geometricMean(times) as number;
  assert.ok(geometric < arithmetic, "geometric mean must sit below the outlier-dragged arithmetic mean");
  assert.ok(geometric > 3000 && geometric < 10_000);
  assert.equal(geometricMean([]), null);
  assert.equal(geometricMean([0, -5]), null);
});

test("binomial CDF is exact at the boundaries", () => {
  close(binomialCdf(-1, 10, 0.5), 0);
  close(binomialCdf(10, 10, 0.5), 1);
  close(binomialCdf(0, 4, 0.5), 1 / 16);
  close(binomialCdf(1, 4, 0.5), 5 / 16);
});

test("median interval is honest that tiny samples cannot bound a median", () => {
  assert.equal(medianInterval([1, 2, 3, 4, 5]), null, "five observations cannot give a 95% median interval");
  const eight = medianInterval([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(eight, "eight observations can");
  assert.equal(eight.low, 1);
  assert.equal(eight.high, 8);
  assert.equal(medianInterval([1]), null);
});

test("summarizeSample only offers a geometric mean below n = 25", () => {
  const small = summarizeSample([1000, 2000, 3000]);
  assert.equal(small.count, 3);
  assert.equal(small.median, 2000);
  assert.ok(small.geometricMean !== null);

  const large = summarizeSample(Array.from({ length: 30 }, (_, index) => 1000 + index));
  assert.equal(large.geometricMean, null);
  assert.equal(large.count, 30);
});

test("classifyGate refuses a verdict below the minimum sample", () => {
  const estimate = estimateProportion(5, 5);
  assert.equal(classifyGate(estimate, 0.8, "at-least"), "insufficient-sample");
  assert.ok(MIN_GATE_SAMPLE > 5);
});

test("classifyGate separates met-with-evidence from merely promising", () => {
  // 20 of 20 at a 0.8 threshold: the whole interval sits above the line.
  assert.equal(classifyGate(estimateProportion(20, 20), 0.8, "at-least"), "met-with-evidence");
  // 8 of 10 hits the point estimate exactly but the interval reaches down to ~49%.
  assert.equal(classifyGate(estimateProportion(8, 10), 0.8, "at-least"), "promising");
  // 6 of 10 misses the point estimate; the interval still reaches above 0.8.
  assert.equal(classifyGate(estimateProportion(6, 10), 0.8, "at-least"), "concerning");
  // 1 of 20 is entirely below the line.
  assert.equal(classifyGate(estimateProportion(1, 20), 0.8, "at-least"), "not-met");
});

test("classifyGate handles 'below' gates in the same four states", () => {
  // Early-exit gate: want the rate under 20%.
  assert.equal(classifyGate(estimateProportion(0, 60), 0.2, "below"), "met-with-evidence");
  assert.equal(classifyGate(estimateProportion(1, 10), 0.2, "below"), "promising");
  assert.equal(classifyGate(estimateProportion(3, 10), 0.2, "below"), "concerning");
  assert.equal(classifyGate(estimateProportion(19, 20), 0.2, "below"), "not-met");
});

test("gate boundary values are classified without rounding a miss into a pass", () => {
  // Exactly at the threshold counts as meeting an "at-least" gate's point
  // estimate, but only "promising" until the interval clears it.
  assert.equal(classifyGate(estimateProportion(16, 20), 0.8, "at-least"), "promising");
  // Exactly at the threshold FAILS a "below" gate, which wants strictly under.
  assert.equal(classifyGate(estimateProportion(4, 20), 0.2, "below"), "concerning");
});

test("classifyMedianGate needs both a big enough n and a bounded interval", () => {
  const fast = summarizeSample(Array.from({ length: 20 }, () => 4000));
  assert.equal(classifyMedianGate(fast, 10_000), "met-with-evidence");

  const slow = summarizeSample(Array.from({ length: 20 }, () => 25_000));
  assert.equal(classifyMedianGate(slow, 10_000), "not-met");

  const tiny = summarizeSample([4000, 4200, 4400]);
  assert.equal(classifyMedianGate(tiny, 10_000), "insufficient-sample");

  // Median 9s, but the distribution-free interval runs 2s-30s, so the gate is
  // not proven either way.
  const spread = summarizeSample([1000, 2000, 3000, 4000, 5000, 9000, 11_000, 14_000, 20_000, 30_000, 40_000]);
  assert.equal(spread.median, 9000);
  assert.equal(classifyMedianGate(spread, 10_000), "promising");

  // Exactly on the threshold fails a strict "under 10s" gate.
  const onTheLine = summarizeSample([
    1000, 2000, 3000, 4000, 5000, 9000, 11_000, 14_000, 20_000, 30_000, 40_000, 60_000
  ]);
  assert.equal(onTheLine.median, 10_000);
  assert.equal(classifyMedianGate(onTheLine, 10_000), "concerning");
});

test("an empty cohort produces no verdict rather than a passing one", () => {
  assert.equal(classifyGate(estimateProportion(0, 0), 0.8, "at-least"), "insufficient-sample");
  assert.equal(classifyMedianGate(summarizeSample([]), 10_000), "insufficient-sample");
});
