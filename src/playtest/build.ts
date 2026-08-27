/**
 * Build identity and playtest build mode.
 *
 * FlipStitch ships in three channels. The channel is decided by the *build*,
 * never guessed from the data, so the cohort analyzer can exclude our own QA
 * without heuristics (docs/PLAYTEST-BUNDLE-SPEC.md, Goal 18):
 *
 * - `production`  the normal consumer build. No playtest UI at all.
 * - `development` anything built or run without the playtest flag while
 *                 `__DEV__`/dev server is in use — our own QA.
 * - `playtest`    an internal-distribution build made for external testers,
 *                 produced with `EXPO_PUBLIC_PLAYTEST_MODE=true`.
 *
 * Everything here is a pure function of an environment snapshot so it can be
 * unit tested without a device. `resolveBuildInfo` is called once by
 * `PlaytestProvider` with the literal `process.env.EXPO_PUBLIC_*` reads that
 * Expo inlines at bundle time.
 *
 * No hardware identifier, advertising identifier, IP address, location, or
 * device fingerprint is read here or anywhere else. Only the platform
 * *category* (android / ios / web) is recorded, because mobile touch results
 * and desktop mouse results must not be pooled silently (Goal 29).
 */

export const BUILD_CHANNELS = ["production", "development", "playtest"] as const;
export type BuildChannel = (typeof BUILD_CHANNELS)[number];

/** Platform category. Deliberately coarse — never a device model or model id. */
export const PLATFORM_KINDS = ["android", "ios", "web", "unknown"] as const;
export type PlatformKind = (typeof PLATFORM_KINDS)[number];

export type BuildEnv = {
  /** `EXPO_PUBLIC_PLAYTEST_MODE` — "true" turns the playtest build on. */
  playtestMode?: string;
  /**
   * `EXPO_PUBLIC_BUILD_ID` — a git commit SHA or EAS build id injected at
   * build time. Never typed by a tester (Goal 6).
   */
  buildId?: string;
  /**
   * `EXPO_PUBLIC_COHORT` — an optional label locking a group of bundles to one
   * build revision, so a mid-cohort game change starts a new cohort instead of
   * quietly mixing two onboarding behaviours into one rate (Goal 34).
   */
  cohort?: string;
  /** True in a Metro/dev-client run. */
  dev?: boolean;
};

export type BuildInfo = {
  channel: BuildChannel;
  playtestMode: boolean;
  appVersion: string;
  /** Short build identifier, or `"unknown"` when none was injected. */
  buildId: string;
  cohortId: string | null;
  platform: PlatformKind;
};

const UNKNOWN_BUILD_ID = "unknown";

/** Trims and bounds a free-form build string so a bad env cannot bloat bundles. */
function clean(value: string | undefined, max = 64): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

export function isPlaytestModeEnabled(value: string | undefined): boolean {
  return clean(value)?.toLowerCase() === "true";
}

export function resolveBuildChannel(env: BuildEnv): BuildChannel {
  if (isPlaytestModeEnabled(env.playtestMode)) return "playtest";
  return env.dev === true ? "development" : "production";
}

export function normalizePlatform(value: string | undefined): PlatformKind {
  const kind = clean(value)?.toLowerCase();
  return (PLATFORM_KINDS as readonly string[]).includes(kind ?? "") ? (kind as PlatformKind) : "unknown";
}

export function resolveBuildInfo(env: BuildEnv, appVersion: string, platform: string | undefined): BuildInfo {
  const playtestMode = isPlaytestModeEnabled(env.playtestMode);
  return {
    channel: resolveBuildChannel(env),
    playtestMode,
    appVersion: clean(appVersion, 32) ?? "0.0.0",
    buildId: clean(env.buildId) ?? UNKNOWN_BUILD_ID,
    // A cohort label is only meaningful for a playtest build; carrying one on a
    // production build would invite mixing channels in analysis.
    cohortId: playtestMode ? clean(env.cohort, 48) : null,
    platform: normalizePlatform(platform)
  };
}

/**
 * Content fingerprint.
 *
 * A tester's bundle has to say *which puzzles* they played, not only which app
 * version. `CONTENT_REVISION` is the human-readable label bumped by hand when
 * content changes (see docs/CONTENT-REVISION-POLICY.md); the fingerprint is a
 * derived 8-hex digest over every level's id and authored solution length, so
 * an unrecorded content edit still shows up as a different value.
 *
 * FNV-1a, 32-bit. Not a security hash — a change detector.
 */
export function fingerprint(parts: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    hash ^= 0x1f;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
