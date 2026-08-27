/**
 * Small-cohort statistics for the behavioural gates.
 *
 * The whole point of this module is to stop "4 of 5 passed" from being written
 * down as "80% of players will pass". Every proportion this milestone reports
 * carries an interval, and every verdict is a statement about that interval
 * rather than about the point estimate.
 *
 * Choices and why:
 *
 * - **Wilson score interval** for proportions. Sauro & Lewis' comparison of
 *   binomial interval methods found the Wald interval "grossly understates the
 *   width of the true interval when sample sizes are small", while the score
 *   (Wilson) and adjusted-Wald methods give average coverage closest to the
 *   nominal 95% (https://measuringu.com/papers/sauro-lewisHFES.pdf,
 *   https://measuringu.com/calculators/wald/). Wilson is used as the primary
 *   interval; `adjustedWaldInterval` is provided alongside it because
 *   MeasuringU recommends it for samples under ~150 and the two agreeing is a
 *   useful sanity check.
 * - **Distribution-free median interval** from binomial order statistics, so
 *   the median first-stitch time is not reported as a bare number either.
 * - **Geometric mean** for task times at n < 25, per MeasuringU's small-sample
 *   guidance (https://measuringu.com/small-n/), reported *alongside* — never
 *   instead of — the median the product gate is written in terms of.
 * - **Rule of three** for zero-event samples, so "0 of 8 failed" is reported
 *   with its real upper bound (~31%) rather than as 0%.
 *
 * Nothing here rounds a wide interval away or turns an unknown into a
 * checkmark. `classifyGate` can return `insufficient-sample`, and frequently
 * should.
 */

/** Two-sided 95% normal critical value. */
export const Z_95 = 1.959963984540054;

export type Interval = { low: number; high: number };

export type ProportionEstimate = {
  numerator: number;
  denominator: number;
  /** Point estimate, or null when the denominator is zero. */
  rate: number | null;
  /** Wilson score interval, or null when the denominator is zero. */
  wilson: Interval | null;
  /** Adjusted-Wald (Agresti-Coull) interval, shown as a cross-check. */
  adjustedWald: Interval | null;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * Unlike Wald it never produces a zero-width interval at 0/n or n/n, and it
 * stays inside [0, 1] by construction.
 */
export function wilsonInterval(successes: number, total: number, z = Z_95): Interval | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const centre = (p + z2 / (2 * total)) / denominator;
  const spread = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denominator;
  return { low: clamp01(centre - spread), high: clamp01(centre + spread) };
}

/**
 * Adjusted-Wald (Agresti-Coull) interval: add z²/2 successes and z² trials,
 * then apply the ordinary Wald formula to the adjusted counts.
 */
export function adjustedWaldInterval(successes: number, total: number, z = Z_95): Interval | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const z2 = z * z;
  const adjustedTotal = total + z2;
  const adjustedP = (successes + z2 / 2) / adjustedTotal;
  const spread = z * Math.sqrt((adjustedP * (1 - adjustedP)) / adjustedTotal);
  return { low: clamp01(adjustedP - spread), high: clamp01(adjustedP + spread) };
}

export function estimateProportion(successes: number, total: number, z = Z_95): ProportionEstimate {
  return {
    numerator: successes,
    denominator: total,
    rate: total > 0 ? successes / total : null,
    wilson: wilsonInterval(successes, total, z),
    adjustedWald: adjustedWaldInterval(successes, total, z)
  };
}

/**
 * Rule of three: with zero observed events in n trials, the 95% upper bound on
 * the true rate is about 3/n. Returned as a plain number so a report can say
 * "0 of 8 — but the true rate could still be as high as 38%".
 */
export function ruleOfThreeUpperBound(total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  return Math.min(1, 3 / total);
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Nearest-rank percentile (p in [0, 1]). Deterministic and interpolation-free. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(clamp01(p) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

/**
 * Geometric mean, the small-sample centre MeasuringU recommends for task times
 * (n < 25), because a single very slow tester drags the arithmetic mean but
 * barely moves the log-scale centre. Non-positive values are excluded and the
 * caller is told how many were.
 */
export function geometricMean(values: readonly number[]): number | null {
  const positive = values.filter((value) => value > 0);
  if (positive.length === 0) return null;
  const logSum = positive.reduce((sum, value) => sum + Math.log(value), 0);
  return Math.exp(logSum / positive.length);
}

/** Exact binomial CDF, P(X <= k) for X ~ Bin(n, p). n stays small here. */
export function binomialCdf(k: number, n: number, p: number): number {
  if (k < 0) return 0;
  if (k >= n) return 1;
  let term = Math.pow(1 - p, n);
  let total = term;
  for (let i = 1; i <= k; i += 1) {
    term = (term * (n - i + 1) * p) / (i * (1 - p));
    total += term;
  }
  return Math.min(1, total);
}

/**
 * Distribution-free confidence interval for a median, from order statistics.
 *
 * Finds the largest k with P(X <= k-1) <= alpha/2 for X ~ Bin(n, 0.5); the
 * interval is then [x_(k), x_(n-k+1)]. Below about six observations no such k
 * exists at 95% and the answer is honestly `null` — which is itself the
 * message: this many testers cannot bound a median.
 */
export function medianInterval(values: readonly number[], alpha = 0.05): Interval | null {
  const n = values.length;
  if (n < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  let k = 0;
  for (let candidate = 1; candidate <= Math.floor(n / 2); candidate += 1) {
    if (binomialCdf(candidate - 1, n, 0.5) <= alpha / 2) k = candidate;
  }
  if (k === 0) return null;
  return { low: sorted[k - 1], high: sorted[n - k] };
}

export type SampleSummary = {
  count: number;
  min: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  max: number | null;
  /** Reported when count < GEOMETRIC_MEAN_MAX_N, per MeasuringU small-n guidance. */
  geometricMean: number | null;
  medianInterval: Interval | null;
};

/** Above this many observations the plain median is a stable enough centre. */
export const GEOMETRIC_MEAN_MAX_N = 25;

export function summarizeSample(values: readonly number[]): SampleSummary {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted.length > 0 ? sorted[0] : null,
    p25: percentile(sorted, 0.25),
    median: median(sorted),
    p75: percentile(sorted, 0.75),
    max: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    geometricMean: sorted.length > 0 && sorted.length < GEOMETRIC_MEAN_MAX_N ? geometricMean(sorted) : null,
    medianInterval: medianInterval(sorted)
  };
}

/**
 * Verdicts. Deliberately four states, not pass/fail:
 *
 * - `insufficient-sample` — below the minimum n, no verdict is offered at all.
 * - `met-with-evidence`   — the whole 95% interval is on the passing side.
 * - `promising`           — the point estimate passes, the interval straddles
 *                           the threshold. Encouraging, not proof.
 * - `concerning`          — the point estimate misses, the interval straddles.
 * - `not-met`             — the whole interval is on the failing side.
 */
export const GATE_VERDICTS = [
  "insufficient-sample",
  "met-with-evidence",
  "promising",
  "concerning",
  "not-met"
] as const;
export type GateVerdict = (typeof GATE_VERDICTS)[number];

/**
 * Minimum denominator before any verdict is offered.
 *
 * NN/g reports 40 participants as the standard for a quantitative usability
 * study at 95% confidence and a 15% margin of error, and 21 at a 20% margin
 * (https://www.nngroup.com/articles/summary-quant-sample-sizes/). Ten is not a
 * substitute for either; it is the floor below which even a Wilson interval is
 * so wide that printing a verdict would be theatre. Between 10 and the target
 * the verdict is real but almost always `promising`/`concerning`, which is the
 * honest answer.
 */
export const MIN_GATE_SAMPLE = 10;

/** The cohort size the study is aiming for. See docs/PLAYTEST-PROTOCOL.md. */
export const TARGET_GATE_SAMPLE = 40;

export type GateDirection = "at-least" | "below";

export function classifyGate(
  estimate: ProportionEstimate,
  threshold: number,
  direction: GateDirection,
  minSample = MIN_GATE_SAMPLE
): GateVerdict {
  if (estimate.denominator < minSample || estimate.rate === null || estimate.wilson === null) {
    return "insufficient-sample";
  }
  const { low, high } = estimate.wilson;
  if (direction === "at-least") {
    if (low >= threshold) return "met-with-evidence";
    if (high < threshold) return "not-met";
    return estimate.rate >= threshold ? "promising" : "concerning";
  }
  // "below": the gate wants the rate under the threshold.
  if (high < threshold) return "met-with-evidence";
  if (low >= threshold) return "not-met";
  return estimate.rate < threshold ? "promising" : "concerning";
}

/**
 * The same four states for a median gate, using the distribution-free median
 * interval. Without an interval (too few observations) no verdict is offered.
 */
export function classifyMedianGate(
  summary: SampleSummary,
  thresholdMs: number,
  minSample = MIN_GATE_SAMPLE
): GateVerdict {
  if (summary.count < minSample || summary.median === null) return "insufficient-sample";
  if (summary.medianInterval === null) return "insufficient-sample";
  if (summary.medianInterval.high < thresholdMs) return "met-with-evidence";
  if (summary.medianInterval.low >= thresholdMs) return "not-met";
  return summary.median < thresholdMs ? "promising" : "concerning";
}
