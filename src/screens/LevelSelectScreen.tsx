import { useRouter } from "expo-router";
import type { DimensionValue } from "react-native";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { levels } from "@/game/levels";
import type { Level } from "@/game/types";
import { useProgress } from "@/progress/ProgressProvider";
import { getGalleryLayout } from "@/screens/gallery-layout";
import { colors, radius, space, type } from "@/theme/tokens";

function LevelCard({ level, index, locked, completed, bestMoves, width, onPress }: {
  level: Level;
  index: number;
  locked: boolean;
  completed: boolean;
  bestMoves?: number;
  width: DimensionValue;
  onPress: () => void;
}) {
  const stateText = locked ? "Locked" : completed ? `Complete, best ${bestMoves} stitches` : "Ready to stitch";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Level ${index + 1}, ${level.title}, ${level.difficulty}, ${stateText}`}
      accessibilityHint={locked ? "Complete the prior level to unlock" : "Opens this hoop"}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width },
        locked && styles.cardLocked,
        pressed && !locked && styles.cardPressed
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.levelNumber}>
          <Text maxFontSizeMultiplier={1.5} style={styles.levelNumberText}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={[styles.statusPill, completed && styles.statusComplete, locked && styles.statusLocked]}>
          <Text maxFontSizeMultiplier={1.4} style={styles.statusText}>{locked ? "LOCKED" : completed ? "STITCHED" : "READY"}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <LevelThumbnail level={level} locked={locked} />
        <View style={styles.cardCopy}>
          <Text maxFontSizeMultiplier={1.7} numberOfLines={2} style={styles.cardTitle}>{level.title}</Text>
          <Text maxFontSizeMultiplier={1.6} style={styles.difficulty}>{level.difficulty}</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.cardMeta}>
            {completed ? `Best ${bestMoves} stitches` : locked ? `Finish level ${index}` : `${level.frontEdges.length + level.backEdges.length} stitches`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function LevelSelectScreen() {
  const router = useRouter();
  const { width: viewportWidth, fontScale } = useWindowDimensions();
  const { data, loading, storageWarning, unlockedCount, resumeId, isUnlocked, startLevel } = useProgress();
  const feedback = useFeedback();
  const { contentWidth, cardWidthPercent: cardWidth } = getGalleryLayout(viewportWidth, fontScale);
  const completedCount = Object.keys(data.completed).length;
  const resumeIndex = levels.findIndex((level) => level.id === resumeId);

  function openLevel(levelId: string) {
    feedback.emit("gallerySelected");
    startLevel(levelId);
    router.push({ pathname: "/level/[id]", params: { id: levelId } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text maxFontSizeMultiplier={1.5} style={styles.eyebrow}>FLIPSTITCH COLLECTION 01</Text>
              <Text maxFontSizeMultiplier={1.6} style={styles.title}>Day & Night</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              accessibilityHint="Sound, haptics, playtest data, and about information"
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
            >
              <Text accessibilityElementsHidden style={styles.settingsGlyph}>⚙</Text>
              <Text maxFontSizeMultiplier={1.4} style={styles.settingsLabel}>Settings</Text>
            </Pressable>
          </View>
          <Text maxFontSizeMultiplier={1.9} style={styles.subtitle}>Ten crafted hoops. One thread crosses every side.</Text>
        </View>

        {loading ? (
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading saved progress" style={styles.loadingState}>
            <ActivityIndicator color={colors.teal} size="small" />
            <Text style={styles.loadingText}>Finding your last thread…</Text>
          </View>
        ) : levels.length === 0 ? (
          <View accessible accessibilityRole="alert" style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No hoops are ready</Text>
            <Text style={styles.emptyText}>The next crafted collection will appear here.</Text>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${completedCount === 0 ? "Start" : "Continue"} level ${resumeIndex + 1}, ${levels[resumeIndex].title}`}
              onPress={() => openLevel(resumeId)}
              style={({ pressed }) => [styles.continueCard, pressed && styles.continuePressed]}
            >
              <View style={styles.continueCopy}>
                <Text maxFontSizeMultiplier={1.5} style={styles.continueEyebrow}>{completedCount === 0 ? "BEGIN THE COLLECTION" : "CONTINUE YOUR THREAD"}</Text>
                <Text maxFontSizeMultiplier={1.6} style={styles.continueTitle}>Level {resumeIndex + 1} · {levels[resumeIndex].title}</Text>
                <Text maxFontSizeMultiplier={1.7} style={styles.continueMeta}>{completedCount} of {levels.length} hoops complete</Text>
              </View>
              <Text accessibilityElementsHidden style={styles.continueArrow}>›</Text>
            </Pressable>

            <View accessible accessibilityRole="progressbar" accessibilityLabel="Collection progress" accessibilityValue={{ min: 0, max: levels.length, now: completedCount }} style={styles.collectionProgress}>
              <View style={styles.progressLabels}>
                <Text maxFontSizeMultiplier={1.5} style={styles.progressText}>COLLECTION PROGRESS</Text>
                <Text maxFontSizeMultiplier={1.5} style={styles.progressCount}>{completedCount} / {levels.length}</Text>
              </View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(completedCount / levels.length) * 100}%` }]} /></View>
            </View>

            {storageWarning ? <Text accessibilityRole="alert" style={styles.warning}>{storageWarning}</Text> : null}

            <View style={styles.grid}>
              {levels.map((level, index) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  index={index}
                  width={cardWidth}
                  locked={!isUnlocked(level.id)}
                  completed={Boolean(data.completed[level.id])}
                  bestMoves={data.completed[level.id]?.bestMoves}
                  onPress={() => openLevel(level.id)}
                />
              ))}
            </View>
            <Text style={styles.unlockNote}>{unlockedCount === levels.length ? "Every hoop is unlocked." : `Complete level ${unlockedCount} to reveal the next hoop.`}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  scrollContent: { alignSelf: "center", paddingTop: space.lg, paddingBottom: space.xl },
  hero: { marginBottom: space.lg },
  heroRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm },
  heroCopy: { flex: 1, minWidth: 0 },
  settingsButton: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  settingsPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  settingsGlyph: { color: colors.ink, fontFamily: type.bodyMedium, fontSize: 16, lineHeight: 18 },
  settingsLabel: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 11 },
  eyebrow: { color: colors.tealDeep, fontFamily: type.bodyBold, fontSize: 10, letterSpacing: 1.45 },
  title: { marginTop: 3, color: colors.ink, fontFamily: type.brandHeavy, fontSize: 38, lineHeight: 43, letterSpacing: -1 },
  subtitle: { maxWidth: 540, marginTop: 5, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 15, lineHeight: 22 },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: space.sm },
  loadingText: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14 },
  emptyState: { padding: space.xl, alignItems: "center", backgroundColor: colors.cloth, borderRadius: radius.lg },
  emptyTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 22 },
  emptyText: { marginTop: space.sm, color: colors.inkSoft, fontFamily: type.body, textAlign: "center" },
  continueCard: { minHeight: 92, padding: space.md, flexDirection: "row", alignItems: "center", backgroundColor: colors.ink, borderRadius: radius.lg },
  continuePressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  continueCopy: { flex: 1 },
  continueEyebrow: { color: colors.gold, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.25 },
  continueTitle: { marginTop: 4, color: colors.white, fontFamily: type.brand, fontSize: 20 },
  continueMeta: { marginTop: 3, color: colors.linenShadow, fontFamily: type.bodyMedium, fontSize: 12 },
  continueArrow: { color: colors.white, fontFamily: type.body, fontSize: 36, lineHeight: 40, paddingHorizontal: space.sm },
  collectionProgress: { marginTop: space.lg, marginBottom: space.md },
  progressLabels: { marginBottom: 7, flexDirection: "row", justifyContent: "space-between" },
  progressText: { color: colors.inkSoft, fontFamily: type.bodyBold, fontSize: 9, letterSpacing: 1.2 },
  progressCount: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 11 },
  progressTrack: { height: 7, overflow: "hidden", backgroundColor: colors.linenDeep, borderRadius: radius.pill },
  progressFill: { height: "100%", backgroundColor: colors.teal, borderRadius: radius.pill },
  warning: { marginBottom: space.md, color: colors.danger, fontFamily: type.bodySemibold, fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.md },
  card: { minHeight: 164, padding: 13, backgroundColor: colors.cloth, borderWidth: 1, borderColor: colors.linenShadow, borderRadius: radius.md, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardLocked: { backgroundColor: colors.linenDeep, opacity: 0.76 },
  cardPressed: { transform: [{ translateY: 1 }, { scale: 0.985 }], opacity: 0.88 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelNumber: { minWidth: 34, minHeight: 28, alignItems: "center", justifyContent: "center", backgroundColor: colors.linen, borderRadius: radius.pill },
  levelNumberText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 10, letterSpacing: 0.8 },
  statusPill: { minHeight: 28, paddingHorizontal: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.coralSoft, borderRadius: radius.pill },
  statusComplete: { backgroundColor: "#D7EFEC" },
  statusLocked: { backgroundColor: colors.linenShadow },
  statusText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 8, letterSpacing: 0.8 },
  cardBody: { marginTop: 8, flexDirection: "row", alignItems: "center" },
  cardCopy: { flex: 1, minWidth: 0, marginLeft: 9 },
  cardTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 17, lineHeight: 20 },
  difficulty: { marginTop: 3, color: colors.tealDeep, fontFamily: type.bodyBold, fontSize: 10, letterSpacing: 0.3 },
  cardMeta: { marginTop: 6, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 10, lineHeight: 14 },
  unlockNote: { marginTop: space.lg, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12, textAlign: "center" }
});
