/**
 * Playtest wrap-up (playtest builds only).
 *
 * Three things happen here, in order, after the tester has finished playing:
 *
 *  1. The short post-test questionnaire. It is never shown during a puzzle,
 *     and every question can be skipped.
 *  2. **Share playtest** — one obvious action that opens the native share
 *     sheet with the versioned bundle. The screen says plainly that nothing
 *     has left the device until this is tapped, and that stays true: the app
 *     performs no network request of its own, ever.
 *  3. **Reset for the next tester** — a confirm-twice action for moderated
 *     sessions on one device. It clears progress, events, answers and consent,
 *     and issues a *new* anonymous install id, because the next person is a
 *     different human.
 *
 * There is no debug data on this screen: no hole ids, no solver output, no
 * analyzer scores, no unlock-all. A tester who wanders here sees the test
 * paperwork, not the answers.
 */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePlaytest } from "@/playtest/PlaytestProvider";
import { QUESTIONS, MAX_ANSWER_LENGTH, type QuestionId } from "@/playtest/questionnaire";
import { useProgress } from "@/progress/ProgressProvider";
import {
  confirmExpired,
  confirmFinished,
  initialConfirmState,
  pressConfirm,
  type ConfirmState
} from "@/settings/confirm";
import { colors, radius, space, type } from "@/theme/tokens";

const CONFIRM_ARM_MS = 4000;

export function PlaytestWrapUpScreen() {
  const router = useRouter();
  const playtest = usePlaytest();
  const { data, resetProgress } = useProgress();
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, string>>>({});
  const [saved, setSaved] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "working" | "shared">("idle");
  const [bundleJson, setBundleJson] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<ConfirmState>(initialConfirmState);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (playtest.responses) setAnswers(playtest.responses.answers);
  }, [playtest.responses]);

  useEffect(() => {
    if (!resetConfirm.armed) return;
    const timer = setTimeout(() => setResetConfirm(confirmExpired), CONFIRM_ARM_MS);
    return () => clearTimeout(timer);
  }, [resetConfirm.armed]);

  // The wrap-up only exists in a playtest build. In a normal build this route
  // sends the player back to the library rather than showing test paperwork.
  if (!playtest.mode.playtestMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text maxFontSizeMultiplier={1.6} style={styles.body}>
            This screen is only part of playtest builds.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to collections"
            onPress={() => router.replace("/")}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Back to collections</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  function setAnswer(id: QuestionId, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setSaved(false);
  }

  async function saveAnswers() {
    await playtest.saveResponses(answers);
    setSaved(true);
  }

  /**
   * Prepares the bundle, then opens the native share sheet.
   *
   * The share call is deliberately *not* awaited before the UI settles. On
   * some platforms `Share.share` never settles at all — a browser where
   * `navigator.share` exists but no OS sheet appears leaves the promise
   * pending forever, which would strand a tester on a permanently disabled
   * button with no way to hand their data over. Since the bundle is already
   * built by that point, the copy-out path is enabled first and the share
   * sheet is attempted on top of it. Whatever the platform does, the report
   * stays retrievable.
   */
  async function sharePlaytest() {
    setShareState("working");
    await playtest.saveResponses(answers);
    const bundle = await playtest.exportBundle({
      completed: Object.fromEntries(
        Object.entries(data.completed).map(([levelId, record]) => [levelId, record.bestMoves])
      ),
      lastPlayedLevelId: data.lastPlayedLevelId
    });
    if (!bundle) {
      setShareState("idle");
      return;
    }
    const json = JSON.stringify(bundle, null, 2);
    setBundleJson(json);
    setShareState("shared");
    if (typeof Share !== "undefined" && typeof Share.share === "function") {
      // Fire and forget: a rejection (the tester cancelled) and a promise that
      // never settles are both survivable, because the copy panel now exists.
      void Promise.resolve(Share.share({ title: "FlipStitch playtest", message: json })).catch(() => undefined);
    } else {
      setShowJson(true);
    }
  }

  function handleResetPress() {
    const next = pressConfirm(resetConfirm);
    setResetConfirm(next);
    if (!resetConfirm.armed || resetConfirm.busy) return;
    void (async () => {
      resetProgress();
      await playtest.resetForNextTester();
      setAnswers({});
      setBundleJson(null);
      setShowJson(false);
      setShareState("idle");
      setSaved(false);
      setResetDone(true);
    })().finally(() => setResetConfirm(confirmFinished));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to collections"
            onPress={() => router.replace("/")}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.navButtonText}>‹ Back</Text>
          </Pressable>
          <Text maxFontSizeMultiplier={1.5} style={styles.navTitle}>PLAYTEST</Text>
          <View style={styles.navPlaceholder} />
        </View>

        <Text maxFontSizeMultiplier={1.6} style={styles.title}>Thanks for playing</Text>
        <Text maxFontSizeMultiplier={1.8} style={styles.subtitle}>
          A few short questions. Skip any you would rather not answer — there are no wrong answers here.
        </Text>

        {QUESTIONS.map((question) => (
          <View key={question.id} style={styles.card}>
            <Text maxFontSizeMultiplier={1.7} style={styles.question}>{question.prompt}</Text>
            {question.help ? (
              <Text maxFontSizeMultiplier={1.8} style={styles.help}>{question.help}</Text>
            ) : null}
            {question.kind === "choice" ? (
              <View accessibilityRole="radiogroup" accessibilityLabel={question.prompt} style={styles.choiceRow}>
                {question.choices?.map((choice) => {
                  const selected = answers[question.id] === choice.value;
                  return (
                    <Pressable
                      key={choice.value}
                      accessibilityRole="radio"
                      // A radio announces its state through aria-checked, not
                      // aria-selected. `accessibilityState.checked` covers
                      // native; react-native-web forwards the explicit
                      // `aria-checked` prop, and without it the control looks
                      // chosen while telling a screen reader nothing.
                      accessibilityState={{ checked: selected }}
                      aria-checked={selected}
                      accessibilityLabel={choice.label}
                      onPress={() => setAnswer(question.id, choice.value)}
                      style={({ pressed }) => [
                        styles.choice,
                        selected && styles.choiceSelected,
                        pressed && styles.pressed
                      ]}
                    >
                      <Text
                        maxFontSizeMultiplier={1.5}
                        style={[styles.choiceText, selected && styles.choiceTextSelected]}
                      >
                        {choice.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                accessibilityLabel={question.prompt}
                multiline
                maxLength={MAX_ANSWER_LENGTH}
                value={answers[question.id] ?? ""}
                onChangeText={(value) => setAnswer(question.id, value)}
                placeholder="Type here, or leave blank"
                placeholderTextColor={colors.inkSoft}
                style={styles.input}
              />
            )}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save answers on this device"
          onPress={() => void saveAnswers()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>
            {saved ? "Answers saved on this device" : "Save answers"}
          </Text>
        </Pressable>

        <View style={styles.shareCard}>
          <Text maxFontSizeMultiplier={1.7} style={styles.shareTitle}>Share the test report</Text>
          <Text maxFontSizeMultiplier={1.8} style={styles.shareBody}>
            Nothing leaves this device until you share it. Sharing sends one file of puzzle actions and your answers —
            no name, email, location, or device details.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share playtest"
            accessibilityState={{ busy: shareState === "working" }}
            disabled={shareState === "working"}
            onPress={() => void sharePlaytest()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.primaryButtonText}>
              {shareState === "working" ? "Preparing…" : shareState === "shared" ? "Share playtest again" : "Share playtest"}
            </Text>
          </Pressable>
          {bundleJson !== null ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showJson ? "Hide the report text" : "Show the report to copy it"}
                accessibilityHint="Shows the report on screen so it can be selected and copied if the share sheet did not appear"
                onPress={() => setShowJson((current) => !current)}
                style={({ pressed }) => [styles.inlineButton, pressed && styles.pressed]}
              >
                <Text maxFontSizeMultiplier={1.5} style={styles.inlineButtonText}>
                  {showJson ? "Hide report text" : "Share sheet did not open? Show report to copy"}
                </Text>
              </Pressable>
              {showJson ? (
                <View style={styles.dataPanel} accessible accessibilityRole="summary" accessibilityLabel="Playtest bundle JSON">
                  <Text maxFontSizeMultiplier={1.5} style={styles.dataPanelLabel}>PLAYTEST BUNDLE (JSON)</Text>
                  <Text selectable maxFontSizeMultiplier={1.6} style={styles.dataPanelText}>{bundleJson}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text maxFontSizeMultiplier={1.7} style={styles.question}>For the researcher</Text>
          <Text maxFontSizeMultiplier={1.8} style={styles.help}>
            Resets progress, recorded actions, answers, and consent, and issues a new anonymous test id so the next
            tester is never merged with this one. Share this report first if you still need it.
          </Text>
          {playtest.installId ? (
            <Text maxFontSizeMultiplier={1.6} style={styles.meta}>
              Test id {playtest.installId.slice(0, 14)}… · build {playtest.mode.buildId} · content {playtest.contentRevision}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={resetConfirm.armed ? "Tap again to reset for the next tester" : "Reset for the next tester"}
            accessibilityHint={resetConfirm.armed && !resetConfirm.busy ? "Tap again to confirm" : undefined}
            accessibilityState={{ busy: resetConfirm.busy, disabled: resetConfirm.busy }}
            disabled={resetConfirm.busy}
            onPress={handleResetPress}
            style={({ pressed }) => [
              styles.confirmButton,
              resetConfirm.armed && styles.confirmButtonArmed,
              pressed && !resetConfirm.busy && styles.pressed
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.5}
              style={[
                styles.confirmButtonText,
                !resetConfirm.armed && styles.confirmButtonTextDanger,
                resetConfirm.armed && styles.confirmButtonTextArmed
              ]}
            >
              {resetConfirm.busy
                ? "Working…"
                : resetConfirm.armed
                  ? "Tap again to reset"
                  : "Reset for the next tester"}
            </Text>
          </Pressable>
          {resetDone ? (
            <Text maxFontSizeMultiplier={1.7} style={styles.resetDone}>
              Reset. Hand the device over — the next launch starts from the consent screen.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, padding: space.md },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xl
  },
  navRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navButton: { minWidth: 72, minHeight: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  navButtonText: { color: colors.inkSoft, fontFamily: type.bodyBold, fontSize: 11 },
  navTitle: { color: colors.tealDeep, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.2 },
  navPlaceholder: { width: 72, minHeight: 48 },
  title: { marginTop: space.sm, color: colors.ink, fontFamily: type.brandHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.7 },
  subtitle: { marginTop: 5, marginBottom: space.md, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14, lineHeight: 21 },
  card: {
    padding: space.md,
    marginBottom: space.md,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.md
  },
  question: { color: colors.ink, fontFamily: type.bodySemibold, fontSize: 15, lineHeight: 22 },
  help: { marginTop: 4, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12, lineHeight: 18 },
  meta: { marginTop: space.sm, color: colors.inkSoft, fontFamily: type.body, fontSize: 11, lineHeight: 16 },
  input: {
    marginTop: space.sm,
    minHeight: 84,
    padding: space.sm,
    color: colors.ink,
    fontFamily: type.body,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.sm
  },
  choiceRow: { marginTop: space.sm, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 48,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  choiceSelected: { backgroundColor: colors.tealDeep, borderColor: colors.tealDeep },
  choiceText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 13 },
  choiceTextSelected: { color: colors.white },
  primaryButton: {
    marginTop: space.md,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealDeep,
    borderRadius: radius.pill
  },
  primaryButtonText: { color: colors.white, fontFamily: type.bodyBold, fontSize: 15 },
  secondaryButton: {
    minHeight: 48,
    marginBottom: space.md,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  secondaryButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 12 },
  shareCard: {
    padding: space.md,
    marginBottom: space.md,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.tealDeep,
    borderRadius: radius.md
  },
  shareTitle: { color: colors.ink, fontFamily: type.brandSemi, fontSize: 17, lineHeight: 22 },
  shareBody: { marginTop: 5, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 13, lineHeight: 19 },
  inlineButton: {
    marginTop: space.sm,
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  inlineButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 11 },
  dataPanel: { marginTop: space.md, padding: space.sm, backgroundColor: colors.linenDeep, borderRadius: radius.sm },
  dataPanelLabel: { color: colors.tealDeep, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.1 },
  dataPanelText: { marginTop: 6, color: colors.ink, fontFamily: type.body, fontSize: 11, lineHeight: 16 },
  confirmButton: {
    marginTop: space.md,
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill
  },
  confirmButtonArmed: { backgroundColor: colors.danger, borderColor: colors.danger },
  confirmButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 12 },
  confirmButtonTextDanger: { color: colors.danger },
  confirmButtonTextArmed: { color: colors.white },
  resetDone: { marginTop: space.sm, color: colors.tealDeep, fontFamily: type.bodySemibold, fontSize: 12, lineHeight: 18 },
  body: { color: colors.ink, fontFamily: type.bodyMedium, fontSize: 15, lineHeight: 22, textAlign: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] }
});
