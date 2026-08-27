import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { useFeedback } from "@/feedback/FeedbackProvider";
import { Wordmark } from "@/components/Wordmark";
import { catalog } from "@/content/catalog";
import { getCollectionProgress, getCollectionUnlockState } from "@/content/navigation";
import type { Collection, CollectionTheme } from "@/content/types";
import { usePlaytest } from "@/playtest/PlaytestProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { getGalleryLayout } from "@/screens/gallery-layout";
import { colors, palette, radius, space, type } from "@/theme/tokens";

const ACCENT_COLOR: Record<CollectionTheme["accent"], string> = {
  gold: colors.gold,
  teal: colors.teal,
  sage: palette.sage,
  brass: palette.brass
};

const ACCENT_DEEP: Record<CollectionTheme["accent"], string> = {
  gold: colors.goldDeep,
  teal: colors.tealDeep,
  sage: palette.sageDeep,
  brass: palette.brassDeep
};

/**
 * One folded sampler folio in the collection library. Unlocked folios show
 * their progress and motif; a locked folio stays legible but explains, in
 * plain language, what unfolds it — never a manipulative tease.
 */
function CollectionFolio({
  collection,
  completed,
  total,
  unlocked,
  reason,
  onPress
}: {
  collection: Collection;
  completed: number;
  total: number;
  unlocked: boolean;
  reason: string | null;
  onPress: () => void;
}) {
  const finished = unlocked && completed === total;
  const accent = ACCENT_COLOR[collection.theme.accent];
  const accentDeep = ACCENT_DEEP[collection.theme.accent];
  const stateWord = !unlocked ? reason ?? "Folded" : finished ? "Every hoop stitched" : `${completed} of ${total} hoops stitched`;
  const accessibilityLabel = `${collection.title}, ${collection.subtitle}. ${stateWord}.`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={unlocked ? "Opens this sampler's journey" : reason ?? "Locked"}
      accessibilityState={{ disabled: !unlocked }}
      disabled={!unlocked}
      onPress={onPress}
      style={({ pressed }) => [styles.folio, !unlocked && styles.folioLocked, pressed && unlocked && styles.folioPressed]}
    >
      <View style={[styles.spine, { backgroundColor: unlocked ? accent : colors.linenShadow }]} />
      <View style={styles.folioBody}>
        <View style={styles.folioHeadingRow}>
          <Text maxFontSizeMultiplier={1.5} style={[styles.folioLabel, { color: unlocked ? accentDeep : colors.inkSoft }]}>
            {collection.subtitle.toUpperCase()}
          </Text>
          {finished ? <Icon name="completed" size={16} color={palette.sageDeep} accent={colors.linenShadow} strokeWidth={2.2} /> : null}
          {!unlocked ? <Icon name="locked" size={16} color={colors.inkSoft} accent={colors.linenShadow} strokeWidth={1.8} /> : null}
        </View>
        <Text maxFontSizeMultiplier={1.5} style={[styles.folioTitle, !unlocked && styles.mutedText]}>
          {collection.title}
        </Text>
        <Text maxFontSizeMultiplier={1.8} numberOfLines={2} style={[styles.folioMotif, !unlocked && styles.mutedText]}>
          {collection.theme.motif}
        </Text>
        {unlocked ? (
          <View style={styles.folioProgressTrack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.folioProgressFill, { width: total === 0 ? "0%" : `${(completed / total) * 100}%`, backgroundColor: accent }]} />
          </View>
        ) : null}
        <Text maxFontSizeMultiplier={1.7} style={[styles.folioState, !unlocked && styles.mutedText]}>
          {stateWord}
        </Text>
      </View>
    </Pressable>
  );
}

export function CollectionLibraryScreen() {
  const router = useRouter();
  const { width: viewportWidth, fontScale } = useWindowDimensions();
  const { data, loading } = useProgress();
  const playtest = usePlaytest();
  const feedback = useFeedback();
  const { contentWidth } = getGalleryLayout(viewportWidth, fontScale);
  const isCompleted = (levelId: string) => Boolean(data.completed[levelId]);

  function openCollection(collectionId: string) {
    feedback.emit("gallerySelected");
    router.push({ pathname: "/collection/[id]", params: { id: collectionId } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <Wordmark size={26} />
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View finished samplers"
              accessibilityHint="Every completed hoop, front and back"
              onPress={() => router.push("/gallery")}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
            >
              <Icon name="completed" size={19} color={colors.inkSoft} accent={palette.brass} strokeWidth={1.9} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              accessibilityHint="Sound, haptics, playtest data, and about information"
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
            >
              <Icon name="settings" size={20} color={colors.inkSoft} accent={palette.brass} strokeWidth={1.9} />
            </Pressable>
          </View>
        </View>
        <Text maxFontSizeMultiplier={1.9} style={styles.introText}>
          Every sampler is a thread-bound folio: one continuous thread, two sides of the hoop.
        </Text>

        {loading ? (
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading saved progress" style={styles.loadingState}>
            <ActivityIndicator color={colors.teal} size="small" />
            <Text style={styles.loadingText}>Finding your last thread…</Text>
          </View>
        ) : (
          <View style={styles.folioList}>
            {catalog.collections.map((collection) => {
              const progress = getCollectionProgress(collection, isCompleted);
              const unlock = getCollectionUnlockState(collection, isCompleted);
              return (
                <CollectionFolio
                  key={collection.id}
                  collection={collection}
                  completed={progress.completed}
                  total={progress.total}
                  unlocked={unlock.unlocked}
                  reason={unlock.reason}
                  onPress={() => openCollection(collection.id)}
                />
              );
            })}
          </View>
        )}

        {/*
          Playtest builds only. The wrap-up (questionnaire, share, researcher
          reset) is reachable from the library — never from inside a puzzle —
          so the gameplay a tester is being measured on stays untouched.
        */}
        {playtest.mode.playtestMode ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Finish test"
            accessibilityHint="A few short questions, then share the test report"
            onPress={() => router.push("/playtest/wrapup")}
            style={({ pressed }) => [styles.finishTestButton, pressed && styles.settingsPressed]}
          >
            <Text maxFontSizeMultiplier={1.5} style={styles.finishTestText}>Finish test</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  scrollContent: { alignSelf: "center", paddingTop: space.lg, paddingBottom: space.xl },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  heroActions: { flexDirection: "row", gap: space.sm },
  settingsButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.md
  },
  settingsPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  finishTestButton: {
    marginTop: space.lg,
    minHeight: 48,
    alignSelf: "center",
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  finishTestText: { color: colors.inkSoft, fontFamily: type.bodyBold, fontSize: 12 },
  introText: { maxWidth: 560, marginTop: space.md, marginBottom: space.lg, color: colors.inkSoft, fontFamily: type.body, fontSize: 15, lineHeight: 22 },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: space.sm },
  loadingText: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14 },
  folioList: { gap: space.md },
  folio: {
    flexDirection: "row",
    minHeight: 128,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2
  },
  folioLocked: { backgroundColor: colors.linenDeep, borderStyle: "dashed", opacity: 0.9, shadowOpacity: 0 },
  folioPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  spine: { width: 10 },
  folioBody: { flex: 1, minWidth: 0, padding: space.md, justifyContent: "center" },
  folioHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  folioLabel: { fontFamily: type.bodyBold, fontSize: 11, letterSpacing: 2.2 },
  folioTitle: { marginTop: 3, color: colors.ink, fontFamily: type.brandHeavy, fontSize: 26, lineHeight: 30 },
  folioMotif: { marginTop: 4, color: colors.inkSoft, fontFamily: type.body, fontSize: 13, lineHeight: 19 },
  folioProgressTrack: { marginTop: 10, height: 5, borderRadius: 3, backgroundColor: colors.linenShadow, overflow: "hidden" },
  folioProgressFill: { height: "100%", borderRadius: 3 },
  folioState: { marginTop: 8, color: colors.inkSoft, fontFamily: type.bodySemibold, fontSize: 12 },
  mutedText: { color: colors.inkSoft }
});
