/**
 * Playtest provider.
 *
 * Owns one PlaytestTracker per app launch, records the app session start, and
 * exposes tracking to screens. All data stays on the device in the bounded
 * AsyncStorage store. Nothing here performs network requests.
 *
 * Milestone 9 added the playtest *build mode* on top of that, without changing
 * how the normal consumer build behaves:
 *
 * - `mode.playtestMode` is decided by `EXPO_PUBLIC_PLAYTEST_MODE` at build
 *   time (src/playtest/build.ts). In a normal build every playtest-only path
 *   below is inert: no consent gate, no install id is minted, no wrap-up UI.
 * - In a playtest build, recording does not begin until the tester has seen
 *   the disclosure and chosen. Declining is real — `track` becomes a no-op for
 *   the whole run and there is nothing to export.
 * - `app_backgrounded` / `app_foregrounded` are recorded so the "time to first
 *   valid stitch" measurement can subtract interruptions instead of counting a
 *   phone call as thinking time.
 *
 * The tracker itself, the event schema, and the store are untouched: this
 * milestone reuses the existing telemetry rather than rebuilding it.
 */

import Constants from "expo-constants";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import { catalog } from "@/content/catalog";
import { CONTENT_REVISION, contentFingerprint } from "@/content/version";
import { resolveBuildInfo, type BuildInfo } from "@/playtest/build";
import { buildPlaytestBundle, type BundleProgress, type PlaytestBundle } from "@/playtest/bundle";
import {
  clearConsent,
  loadConsent,
  saveConsent,
  type ConsentDecision
} from "@/playtest/consent";
import type { PlaytestEvent } from "@/playtest/events";
import {
  loadOrCreateInstallRecord,
  resetInstallRecord,
  createInstallId,
  defaultRandomUuid,
  type PlaytestInstallRecord
} from "@/playtest/install";
import {
  makeQuestionnaireResponse,
  readQuestionnaireResponse,
  PLAYTEST_RESPONSES_STORAGE_KEY,
  type QuestionnaireResponse
} from "@/playtest/questionnaire";
import { asyncStorageAdapter, PlaytestEventStore } from "@/playtest/store";
import { PlaytestTracker, type TrackInput } from "@/playtest/tracker";

/**
 * `EXPO_PUBLIC_*` variables must be referenced literally: Expo inlines them
 * into the bundle at build time, so a dynamic lookup would read undefined.
 */
const BUILD_INFO: BuildInfo = resolveBuildInfo(
  {
    playtestMode: process.env.EXPO_PUBLIC_PLAYTEST_MODE,
    buildId: process.env.EXPO_PUBLIC_BUILD_ID,
    cohort: process.env.EXPO_PUBLIC_COHORT,
    dev: typeof __DEV__ !== "undefined" && __DEV__
  },
  Constants.expoConfig?.version ?? "0.0.0",
  Platform.OS
);

const CONTENT_FINGERPRINT = contentFingerprint(catalog);

type PlaytestContextValue = {
  track: (input: TrackInput) => void;
  trackOnce: (input: TrackInput) => boolean;
  /** Session id for the current app launch. */
  sessionId: string;
  /** Snapshot of stored events (flushes pending writes first). */
  loadEvents: () => Promise<PlaytestEvent[]>;
  clearEvents: () => Promise<void>;

  /** Build identity. `playtestMode` is false in the normal consumer build. */
  mode: BuildInfo;
  contentRevision: string;
  contentFingerprint: string;
  /** True once consent and identity have been resolved (always true off playtest mode). */
  ready: boolean;
  /** `unknown` until the tester chooses. Always `granted` off playtest mode. */
  consent: ConsentDecision;
  /** Anonymous install id — minted only in playtest builds. */
  installId: string | null;
  grantConsent: () => Promise<void>;
  declineConsent: () => Promise<void>;
  responses: QuestionnaireResponse | null;
  saveResponses: (answers: Record<string, unknown>) => Promise<void>;
  /** Builds the versioned export envelope. Returns null outside playtest mode. */
  exportBundle: (progress: BundleProgress) => Promise<PlaytestBundle | null>;
  /** Wipes events, answers, consent, and issues a fresh anonymous id. */
  resetForNextTester: () => Promise<void>;
};

const PlaytestContext = createContext<PlaytestContextValue | null>(null);

export function PlaytestProvider({ children }: { children: ReactNode }) {
  const trackerRef = useRef<PlaytestTracker | null>(null);
  if (trackerRef.current === null) {
    trackerRef.current = new PlaytestTracker(new PlaytestEventStore());
  }

  const playtestMode = BUILD_INFO.playtestMode;
  const [ready, setReady] = useState(!playtestMode);
  const [consent, setConsent] = useState<ConsentDecision>(playtestMode ? "unknown" : "granted");
  const [installRecord, setInstallRecord] = useState<PlaytestInstallRecord | null>(null);
  const [responses, setResponses] = useState<QuestionnaireResponse | null>(null);

  // A ref mirrors the consent state so `track` — which is created once and
  // never re-created — always reads the live value rather than a stale capture.
  const recordingRef = useRef<boolean>(!playtestMode);
  const sessionStartedRef = useRef(false);
  /**
   * The latest answers, mirrored outside React state.
   *
   * `exportBundle` is called in the same action that saves the questionnaire
   * ("Share playtest" saves, then exports). Reading `responses` state there
   * would read the value from before that save — React has not re-rendered
   * yet — and quietly ship a bundle with `responses: null`, losing exactly the
   * comprehension answers the export exists to carry.
   */
  const responsesRef = useRef<QuestionnaireResponse | null>(null);

  useEffect(() => {
    if (!playtestMode) return;
    let mounted = true;
    void (async () => {
      const [record, storedConsent, rawResponses] = await Promise.all([
        loadOrCreateInstallRecord(asyncStorageAdapter),
        loadConsent(asyncStorageAdapter),
        asyncStorageAdapter.getItem(PLAYTEST_RESPONSES_STORAGE_KEY).catch(() => null)
      ]);
      if (!mounted) return;
      setInstallRecord(record);
      setConsent(storedConsent?.decision ?? "unknown");
      recordingRef.current = storedConsent?.decision === "granted";
      const stored = readQuestionnaireResponse(rawResponses);
      responsesRef.current = stored;
      setResponses(stored);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [playtestMode]);

  useEffect(() => {
    if (!recordingRef.current || sessionStartedRef.current) return;
    sessionStartedRef.current = true;
    // startSession is idempotent per tracker (deduplicated by trackOnce), so
    // React StrictMode double-mounts in development cannot record two
    // "app session started" events for one app launch.
    trackerRef.current?.startSession();
  }, [consent, ready]);

  useEffect(() => {
    // Flush buffered events when the app backgrounds so playtest data survives
    // a suspension or kill, and flush once more on provider teardown. The
    // background/foreground pair is also recorded, so an interruption can be
    // subtracted from timing metrics rather than inflating them.
    const subscription = AppState.addEventListener("change", (state) => {
      const tracker = trackerRef.current;
      if (!tracker) return;
      if (state === "active") {
        if (recordingRef.current) tracker.track({ name: "app_foregrounded" });
        return;
      }
      if (recordingRef.current) tracker.track({ name: "app_backgrounded" });
      void tracker.flush();
    });
    return () => {
      subscription.remove();
      void trackerRef.current?.flush();
    };
  }, []);

  const grantConsent = useCallback(async () => {
    await saveConsent(asyncStorageAdapter, "granted");
    recordingRef.current = true;
    setConsent("granted");
  }, []);

  const declineConsent = useCallback(async () => {
    await saveConsent(asyncStorageAdapter, "declined");
    recordingRef.current = false;
    setConsent("declined");
    // Anything captured before the choice — there should be nothing — goes.
    await trackerRef.current?.clear();
  }, []);

  const saveResponses = useCallback(async (answers: Record<string, unknown>) => {
    const response = makeQuestionnaireResponse(answers, Date.now());
    responsesRef.current = response;
    await asyncStorageAdapter.setItem(PLAYTEST_RESPONSES_STORAGE_KEY, JSON.stringify(response)).catch(() => undefined);
    setResponses(response);
  }, []);

  const exportBundle = useCallback(
    async (progress: BundleProgress): Promise<PlaytestBundle | null> => {
      const tracker = trackerRef.current;
      if (!tracker || !playtestMode) return null;
      const events = await tracker.snapshot();
      return buildPlaytestBundle({
        bundleId: `b-${defaultRandomUuid()}`,
        appVersion: BUILD_INFO.appVersion,
        contentRevision: CONTENT_REVISION,
        contentFingerprint: CONTENT_FINGERPRINT,
        buildId: BUILD_INFO.buildId,
        buildChannel: BUILD_INFO.channel,
        cohortId: BUILD_INFO.cohortId,
        platform: BUILD_INFO.platform,
        playtestInstallId: installRecord?.installId ?? createInstallId(),
        installResetCount: installRecord?.resetCount ?? 0,
        exportedAt: Date.now(),
        events,
        progress,
        responses: responsesRef.current
      });
    },
    [installRecord, playtestMode]
  );

  /**
   * Researcher reset. A *new* anonymous id is issued, because the next person
   * to hold the device is a different human and merging two testers into one
   * "player" would silently halve the sample. Progress is reset by the caller,
   * which owns it.
   */
  const resetForNextTester = useCallback(async () => {
    await trackerRef.current?.clear();
    await asyncStorageAdapter.removeItem(PLAYTEST_RESPONSES_STORAGE_KEY).catch(() => undefined);
    await clearConsent(asyncStorageAdapter);
    responsesRef.current = null;
    setResponses(null);
    if (playtestMode) {
      const next = await resetInstallRecord(asyncStorageAdapter, installRecord);
      setInstallRecord(next);
      recordingRef.current = false;
      sessionStartedRef.current = false;
      setConsent("unknown");
    }
  }, [installRecord, playtestMode]);

  // Tracking functions are created exactly once so screens never see a new
  // context reference and re-trigger effects that depend on it. Consent is
  // read through a ref for the same reason.
  const trackingApi = useMemo(() => {
    const tracker = trackerRef.current;
    if (!tracker) throw new Error("PlaytestTracker is unavailable.");
    return {
      track: (input: TrackInput) => {
        if (!recordingRef.current) return;
        tracker.track(input);
      },
      trackOnce: (input: TrackInput) => {
        if (!recordingRef.current) return false;
        return tracker.trackOnce(input);
      },
      sessionId: tracker.getSessionId(),
      loadEvents: () => tracker.snapshot(),
      clearEvents: () => tracker.clear()
    };
  }, []);

  const value = useMemo<PlaytestContextValue>(
    () => ({
      ...trackingApi,
      mode: BUILD_INFO,
      contentRevision: CONTENT_REVISION,
      contentFingerprint: CONTENT_FINGERPRINT,
      ready,
      consent,
      installId: installRecord?.installId ?? null,
      grantConsent,
      declineConsent,
      responses,
      saveResponses,
      exportBundle,
      resetForNextTester
    }),
    [
      consent,
      declineConsent,
      exportBundle,
      grantConsent,
      installRecord,
      ready,
      resetForNextTester,
      responses,
      saveResponses,
      trackingApi
    ]
  );

  return <PlaytestContext.Provider value={value}>{children}</PlaytestContext.Provider>;
}

export function usePlaytest(): PlaytestContextValue {
  const value = useContext(PlaytestContext);
  if (!value) throw new Error("usePlaytest must be used inside PlaytestProvider.");
  return value;
}
