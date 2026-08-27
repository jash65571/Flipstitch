/**
 * Playtest consent gate.
 *
 * Shown only in a playtest build, only before the tester has chosen, and never
 * in the normal consumer build. It is the one screen this milestone puts in
 * front of play, and it is deliberately four lines and two buttons.
 *
 * Declining is a real option that keeps the game fully playable. That matters
 * twice over: consent that cannot be refused is not consent, and a tester who
 * feels watched into agreement is not behaving like a first-time player.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Wordmark } from "@/components/Wordmark";
import { CONSENT_DISCLOSURE } from "@/playtest/consent";
import { colors, radius, space, type } from "@/theme/tokens";

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export function PlaytestConsentScreen({ onAccept, onDecline }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.wordmark}>
          <Wordmark size={30} />
        </View>

        <Text maxFontSizeMultiplier={1.6} style={styles.title}>
          {CONSENT_DISCLOSURE.title}
        </Text>

        <View style={styles.card}>
          {CONSENT_DISCLOSURE.lines.map((line) => (
            <Text key={line} maxFontSizeMultiplier={1.8} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CONSENT_DISCLOSURE.acceptLabel}
          accessibilityHint="Starts the playtest and records puzzle actions on this device only"
          onPress={onAccept}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={1.5} style={styles.primaryButtonText}>
            {CONSENT_DISCLOSURE.acceptLabel}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CONSENT_DISCLOSURE.declineLabel}
          accessibilityHint="Plays the full game with no recording at all"
          onPress={onDecline}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>
            {CONSENT_DISCLOSURE.declineLabel}
          </Text>
        </Pressable>

        <Text maxFontSizeMultiplier={1.8} style={styles.footnote}>
          Either way you play the whole game. No account, no sign-in, nothing uploaded.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 520,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.sm
  },
  wordmark: { alignItems: "center", marginBottom: space.sm },
  title: { color: colors.ink, fontFamily: type.brandHeavy, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  card: {
    marginTop: 4,
    padding: space.md,
    gap: space.sm,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.md
  },
  line: { color: colors.ink, fontFamily: type.bodyMedium, fontSize: 15, lineHeight: 23 },
  primaryButton: {
    marginTop: space.md,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    backgroundColor: colors.tealDeep,
    borderRadius: radius.pill
  },
  primaryButtonText: { color: colors.white, fontFamily: type.bodyBold, fontSize: 15 },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  secondaryButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 13 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  footnote: { marginTop: space.sm, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12, lineHeight: 18, textAlign: "center" }
});
