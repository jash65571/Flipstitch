import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { levels } from "@/game/levels";
import { usePlaytest } from "@/playtest/PlaytestProvider";
import { buildPlaytestReport, formatReadableReport } from "@/playtest/report";
import { useProgress } from "@/progress/ProgressProvider";
import {
  confirmExpired,
  confirmFinished,
  initialConfirmState,
  pressConfirm,
  type ConfirmState
} from "@/settings/confirm";
import { useSettings } from "@/settings/SettingsProvider";
import { colors, radius, space, type } from "@/theme/tokens";

const CONFIRM_ARM_MS = 4000;

type ConfirmButtonProps = {
  label: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};

function ConfirmButton({ label, confirmLabel, tone = "danger", onConfirm }: ConfirmButtonProps) {
  const [state, setState] = useState<ConfirmState>(initialConfirmState);

  // Clear the armed timer when the component unmounts or the button is
  // re-created, so no stale timeout can flip state after teardown.
  useEffect(() => {
    if (!state.armed) return;
    const timer = setTimeout(() => setState(confirmExpired), CONFIRM_ARM_MS);
    return () => clearTimeout(timer);
  }, [state.armed]);

  function handlePress() {
    const next = pressConfirm(state);
    setState(next);
    if (!state.armed || state.busy) return;
    void Promise.resolve(onConfirm()).finally(() => setState(confirmFinished));
  }

  const busy = state.busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={busy ? "Working…" : state.armed ? confirmLabel : label}
      accessibilityHint={state.armed && !busy ? "Tap again to confirm" : undefined}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.confirmButton,
        tone === "danger" && styles.confirmButtonDanger,
        state.armed && styles.confirmButtonArmed,
        busy && styles.confirmButtonBusy,
        pressed && !busy && styles.confirmPressed
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.5}
        style={[
          styles.confirmButtonText,
          tone === "danger" && !state.armed && styles.confirmButtonTextDanger,
          state.armed && styles.confirmButtonTextArmed
        ]}
      >
        {busy ? "Working…" : state.armed ? confirmLabel : label}
      </Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { settings, loaded, updateSound, updateHaptics } = useSettings();
  const playtest = usePlaytest();
  const feedback = useFeedback();
  const { resetProgress } = useProgress();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [viewing, setViewing] = useState<"report" | "json" | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  function toggleSound(enabled: boolean) {
    updateSound(enabled);
    playtest.track({ name: "setting_changed", setting: "sound", value: enabled });
  }

  function toggleHaptics(enabled: boolean) {
    updateHaptics(enabled);
    playtest.track({ name: "setting_changed", setting: "haptics", value: enabled });
  }

  async function loadPlaytestData(): Promise<{ report: string; json: string }> {
    const events = await playtest.loadEvents();
    const report = buildPlaytestReport(events, levels.map((level) => level.id));
    return { report: formatReadableReport(report, levels.map((level) => level.id)), json: JSON.stringify(events, null, 2) };
  }

  async function showReport() {
    const data = await loadPlaytestData();
    setReportText(data.report);
    setRawJson(data.json);
    setViewing("report");
  }

  async function showRawJson() {
    const data = await loadPlaytestData();
    setReportText(data.report);
    setRawJson(data.json);
    setViewing("json");
  }

  async function shareText(title: string, text: string) {
    if (typeof Share !== "undefined" && typeof Share.share === "function") {
      try {
        await Share.share({ title, message: text });
        return;
      } catch {
        // Fall through to the inline copy panel.
      }
    }
    setReportText(text);
    setRawJson(text);
    setViewing(text.startsWith("{") ? "json" : "report");
  }

  async function exportReport() {
    const data = await loadPlaytestData();
    await shareText("FlipStitch playtest report", data.report);
  }

  async function exportJson() {
    const data = await loadPlaytestData();
    await shareText("FlipStitch playtest events", data.json);
  }

  async function clearPlaytest() {
    await playtest.clearEvents();
    setReportText(null);
    setRawJson(null);
    setViewing(null);
  }

  const sectionHeading = (text: string) => <Text maxFontSizeMultiplier={1.5} style={styles.sectionHeading}>{text}</Text>;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to level gallery" onPress={() => router.back()} style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
            <Text maxFontSizeMultiplier={1.5} style={styles.navButtonText}>‹ Gallery</Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1.5} style={styles.navTitle}>SETTINGS</Text>
          <View style={styles.navPlaceholder} />
        </View>

        <Text maxFontSizeMultiplier={1.6} style={styles.title}>Make it yours</Text>
        <Text maxFontSizeMultiplier={1.9} style={styles.subtitle}>Tune the feel of every stitch. Everything stays on this device.</Text>

        {sectionHeading("FEEL")}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.rowTitle}>Sound effects</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.rowDetail}>Soft needle, cloth, and completion sounds.</Text>
            </View>
            <Switch
              accessibilityLabel="Sound effects"
              accessibilityHint="Turns stitch, flip, and completion sounds on or off"
              value={settings.soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: colors.linenShadow, true: colors.teal }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.linenShadow}
              disabled={!loaded}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.rowTitle}>Haptics</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.rowDetail}>Gentle taps that confirm each stitch and warn on mistakes.</Text>
            </View>
            <Switch
              accessibilityLabel="Haptics"
              accessibilityHint="Turns vibration feedback on or off"
              value={settings.hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: colors.linenShadow, true: colors.teal }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.linenShadow}
              disabled={!loaded}
            />
          </View>
        </View>

        {sectionHeading("MOTION")}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.rowTitle}>Reduced motion</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.rowDetail}>
                {reduceMotion ? "Following your system setting: on — flips swap instantly." : "Following your system setting: off — flips animate softly."}
              </Text>
            </View>
          </View>
        </View>

        {sectionHeading("PLAYTEST")}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.rowTitle}>Local playtest data</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.rowDetail}>
                Session {playtest.sessionId.slice(0, 12)}… Records stitches, tools, and completions on this device only. Nothing is uploaded.
              </Text>
            </View>
          </View>
          <View style={styles.buttonGrid}>
            <Pressable accessibilityRole="button" accessibilityLabel="Show playtest summary" onPress={showReport} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.actionButtonText}>View report</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Show raw playtest events" onPress={showRawJson} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.actionButtonText}>View raw events</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Export playtest report" onPress={exportReport} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.actionButtonText}>Export report</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Export raw playtest events as JSON" onPress={exportJson} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.actionButtonText}>Export JSON</Text>
            </Pressable>
          </View>
          {viewing !== null && rawJson !== null ? (
            <View style={styles.dataPanel} accessible accessibilityRole="summary" accessibilityLabel={`Playtest data (${viewing === "report" ? "summary" : "raw events"})`}>
              <Text maxFontSizeMultiplier={1.5} style={styles.dataPanelLabel}>
                {viewing === "report" ? "PLAYTEST SUMMARY" : "RAW EVENTS (JSON)"}
              </Text>
              <Text selectable maxFontSizeMultiplier={1.6} style={styles.dataPanelText}>
                {viewing === "report" ? reportText : rawJson}
              </Text>
              {viewing === "report" && reportText !== null ? (
                <Text maxFontSizeMultiplier={1.6} style={styles.dataPanelNote}>
                  The readable report and raw JSON are also available through Export.
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.divider} />
          <ConfirmButton
            label="Clear playtest data"
            confirmLabel="Tap again to clear"
            tone="danger"
            onConfirm={() => void clearPlaytest()}
          />
        </View>

        {sectionHeading("PROGRESS")}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.rowTitle}>Reset game progress</Text>
              <Text maxFontSizeMultiplier={1.7} style={styles.rowDetail}>Unlocks, completions, and best stitches start over. Playtest data is kept.</Text>
            </View>
          </View>
          <ConfirmButton
            label="Reset progress"
            confirmLabel="Tap again to reset"
            tone="danger"
            onConfirm={resetProgress}
          />
        </View>

        {sectionHeading("ABOUT")}
        <View style={styles.card}>
          <Text maxFontSizeMultiplier={1.7} style={styles.aboutLine}>FlipStitch 0.1.0 · feel and playtest proof</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.aboutDetail}>
            Typefaces Bricolage Grotesque and Manrope are bundled under the SIL Open Font License 1.1. All sound effects are
            original, generated in-repo, and owned by the project. See About text below and assets/sounds/README.md.
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Preview a selection sound" onPress={() => feedback.emit("gallerySelected")} style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}>
            <Text maxFontSizeMultiplier={1.5} style={styles.actionButtonText}>Preview sound</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  scrollContent: { alignSelf: "center", width: "100%", maxWidth: 560, paddingTop: space.sm, paddingHorizontal: space.md, paddingBottom: space.xl },
  navRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navButton: { minWidth: 72, minHeight: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  navPressed: { backgroundColor: colors.linenDeep },
  navButtonText: { color: colors.inkSoft, fontFamily: type.bodyBold, fontSize: 11 },
  navTitle: { color: colors.tealDeep, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.2, textAlign: "center" },
  navPlaceholder: { width: 72, minHeight: 48 },
  title: { marginTop: space.sm, color: colors.ink, fontFamily: type.brandHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.7 },
  subtitle: { marginTop: 5, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14, lineHeight: 21 },
  sectionHeading: { marginTop: space.lg, marginBottom: 7, color: colors.inkSoft, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.3 },
  card: { padding: space.md, backgroundColor: colors.cloth, borderWidth: 1, borderColor: colors.linenShadow, borderRadius: radius.md, marginBottom: space.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.ink, fontFamily: type.bodySemibold, fontSize: 15, lineHeight: 21 },
  rowDetail: { marginTop: 2, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12, lineHeight: 18 },
  divider: { height: 1, marginVertical: space.md, backgroundColor: colors.linenDeep },
  buttonGrid: { marginTop: space.md, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  actionPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  actionButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 11 },
  confirmButton: { minHeight: 48, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.linenShadow, borderRadius: radius.pill },
  confirmButtonDanger: { borderColor: colors.danger },
  // Armed state: white text on the danger fill (WCAG AA contrast), never
  // dark-red text on a dark-red background.
  confirmButtonArmed: { backgroundColor: colors.danger, borderColor: colors.danger },
  confirmButtonBusy: { opacity: 0.6 },
  confirmPressed: { opacity: 0.85 },
  confirmButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 12 },
  confirmButtonTextDanger: { color: colors.danger },
  confirmButtonTextArmed: { color: colors.white },
  dataPanel: { marginTop: space.md, padding: space.sm, backgroundColor: colors.linenDeep, borderRadius: radius.sm },
  dataPanelLabel: { color: colors.tealDeep, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.1 },
  dataPanelText: { marginTop: 6, color: colors.ink, fontFamily: type.body, fontSize: 11, lineHeight: 16 },
  dataPanelNote: { marginTop: 8, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 11, lineHeight: 16 },
  aboutLine: { color: colors.ink, fontFamily: type.bodySemibold, fontSize: 13, lineHeight: 19 },
  aboutDetail: { marginTop: 6, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12, lineHeight: 18 }
});
