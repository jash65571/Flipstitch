import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { Icon } from "@/components/Icon";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { Wordmark } from "@/components/Wordmark";
import { getCollection } from "@/content/catalog";
import { getChapterProgress, getCollectionProgress } from "@/content/navigation";
import type { Chapter, Collection } from "@/content/types";
import type { Level } from "@/game/types";
import { useProgress } from "@/progress/ProgressProvider";
import { getGalleryLayout } from "@/screens/gallery-layout";
import { colors, palette, radius, space, thread, type } from "@/theme/tokens";

type StopState = "locked" | "ready" | "current" | "completed";

/**
 * One stop on the sampler's thread. The vignette is the level's own stitched
 * pattern (reusable grammar, not a bespoke illustration per level); a running
 * thread on the rail connects every stop into one continuous journey.
 */
function LevelStop({
  level,
  number,
  state,
  bestMoves,
  isFirst,
  isLast,
  onPress
}: {
  level: Level;
  number: number;
  state: StopState;
  bestMoves?: number;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const locked = state === "locked";
  const completed = state === "completed";
  const current = state === "current";
  const stitches = level.frontEdges.length + level.backEdges.length;

  const stateWord =
    state === "locked"
      ? "Folded — finish the previous hoop"
      : state === "completed"
        ? `Stitched · best ${bestMoves} stitches`
        : current
          ? "Your thread rests here"
          : "Ready to stitch";
  const accessibilityLabel = `Level ${number}, ${level.title}, ${level.difficulty}. ${stateWord}.`;

  // The rail runs behind the node: the portion the thread has already travelled
  // (completed, or up to the current stop) reads in sage; what is still to come
  // reads as a faint dashed guide.
  const upperDone = completed || current || state === "ready";
  const lowerDone = completed;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={locked ? "Complete the prior level to unlock" : "Opens this hoop"}
      accessibilityState={{ disabled: locked, selected: current }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [styles.stop, pressed && !locked && styles.stopPressed]}
    >
      <View style={styles.rail}>
        <View style={[styles.railLine, styles.railUpper, isFirst && styles.railHidden, upperDone ? styles.railDone : styles.railTodo]} />
        <View style={[styles.railLine, styles.railLower, isLast && styles.railHidden, lowerDone ? styles.railDone : styles.railTodo]} />
        <View style={[styles.node, current && styles.nodeCurrent, completed && styles.nodeCompleted, locked && styles.nodeLocked]}>
          {completed ? (
            <Icon name="completed" size={16} color={thread.front.deep} accent={thread.back.deep} strokeWidth={2.4} />
          ) : locked ? (
            <Icon name="locked" size={15} color={colors.inkSoft} accent={colors.linenShadow} strokeWidth={1.8} />
          ) : (
            <Text allowFontScaling={false} style={[styles.nodeNumber, current && styles.nodeNumberCurrent]}>
              {number}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.panel, current && styles.panelCurrent, locked && styles.panelLocked]}>
        <View style={styles.vignette}>
          <LevelThumbnail level={level} size={64} locked={locked} />
          {locked ? <View style={styles.foldCorner} /> : null}
        </View>
        <View style={styles.panelCopy}>
          <Text maxFontSizeMultiplier={1.7} numberOfLines={2} style={[styles.panelTitle, locked && styles.mutedText]}>
            {level.title}
          </Text>
          <Text maxFontSizeMultiplier={1.6} style={[styles.panelMeta, locked && styles.mutedText]}>
            {level.difficulty} · {stitches} stitches
          </Text>
          {current ? (
            <View style={styles.continueTag}>
              <Icon name="needle" size={15} color={colors.white} accent={colors.gold} strokeWidth={2} />
              <Text maxFontSizeMultiplier={1.5} style={styles.continueTagText}>
                {completed || bestMoves ? "Continue" : "Begin"}
              </Text>
            </View>
          ) : (
            <Text maxFontSizeMultiplier={1.6} style={[styles.panelState, completed && styles.panelStateDone, locked && styles.mutedText]}>
              {stateWord}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * A stitched chapter divider. The rail thread runs straight through it, so the
 * sampler still reads as one continuous journey; the chapter is a seam in the
 * cloth, not a new screen. Completed chapters take a small finished seal.
 */
function ChapterDivider({ chapter, completed, total }: { chapter: Chapter; completed: number; total: number }) {
  const finished = completed === total;
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${chapter.title}. ${chapter.subtitle} ${completed} of ${total} hoops stitched.`}
      style={styles.divider}
    >
      <View style={styles.dividerRail}>
        <View style={[styles.railLine, styles.railFull, completed > 0 ? styles.railDone : styles.railTodo]} />
      </View>
      <View style={styles.dividerBody}>
        <View style={styles.dividerHeadingRow}>
          <Icon name="chapter" size={16} color={palette.brassDeep} accent={colors.linenShadow} strokeWidth={1.9} />
          <Text maxFontSizeMultiplier={1.6} style={styles.dividerTitle}>
            {chapter.title}
          </Text>
          {finished ? (
            <Icon name="completed" size={15} color={thread.front.deep} accent={thread.back.deep} strokeWidth={2.2} />
          ) : null}
        </View>
        <Text maxFontSizeMultiplier={1.7} style={styles.dividerSubtitle}>
          {chapter.subtitle}
        </Text>
        <Text maxFontSizeMultiplier={1.6} style={styles.dividerCount}>
          {completed} of {total} stitched
        </Text>
      </View>
    </View>
  );
}

export function LevelSelectScreen({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const { width: viewportWidth, fontScale } = useWindowDimensions();
  const { data, loading, storageWarning, isUnlocked } = useProgress();
  const feedback = useFeedback();
  const { contentWidth } = getGalleryLayout(viewportWidth, fontScale);

  // Every word on this screen comes from content metadata. Adding a chapter
  // must never require editing this file; adding a collection only requires
  // registering it in src/content/catalog.ts.
  const collection: Collection | undefined = getCollection(collectionId);
  const levels = collection ? collection.levels : [];
  const isCompleted = (levelId: string) => Boolean(data.completed[levelId]);
  const collectionProgress = collection
    ? getCollectionProgress(collection, isCompleted)
    : { total: 0, completed: 0, finished: true, nextIncompleteLevelId: null };
  const resumeId = collectionProgress.nextIncompleteLevelId ?? levels[levels.length - 1]?.id ?? null;

  function openLevel(levelId: string) {
    feedback.emit("gallerySelected");
    router.push({ pathname: "/level/[id]", params: { id: levelId } });
  }

  function stopStateFor(level: Level): StopState {
    if (!isUnlocked(level.id)) return "locked";
    if (data.completed[level.id]) return "completed";
    if (level.id === resumeId) return "current";
    return "ready";
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to your samplers"
              accessibilityHint="Returns to the collection library"
              onPress={() => router.push("/")}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
            >
              <Icon name="chapter" size={19} color={colors.inkSoft} accent={palette.brass} strokeWidth={1.9} />
            </Pressable>
            <Wordmark size={22} markOnly />
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
          {collection ? (
            <>
              <Text maxFontSizeMultiplier={1.5} style={styles.collectionLabel}>
                {collection.subtitle.toUpperCase()}
              </Text>
              <Text maxFontSizeMultiplier={1.6} style={styles.title}>
                {collection.title}
              </Text>
              <Text maxFontSizeMultiplier={1.9} style={styles.subtitle}>
                {collection.description}
              </Text>
            </>
          ) : null}
        </View>

        {loading ? (
          <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading saved progress" style={styles.loadingState}>
            <ActivityIndicator color={colors.teal} size="small" />
            <Text style={styles.loadingText}>Finding your last thread…</Text>
          </View>
        ) : !collection || levels.length === 0 ? (
          <View accessible accessibilityRole="alert" style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No hoops are ready</Text>
            <Text style={styles.emptyText}>The next crafted collection will appear here.</Text>
          </View>
        ) : (
          <>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Collection progress"
              accessibilityValue={{
                min: 0,
                max: collectionProgress.total,
                now: collectionProgress.completed,
                text: `${collectionProgress.completed} of ${collectionProgress.total} hoops stitched`
              }}
              style={styles.progressLine}
            >
              <Text maxFontSizeMultiplier={1.6} style={styles.progressText}>
                {collectionProgress.completed} of {collectionProgress.total} hoops stitched
              </Text>
              <View style={styles.progressStitches}>
                {levels.map((level) => (
                  <View
                    key={level.id}
                    style={[
                      styles.progressStitch,
                      data.completed[level.id]
                        ? styles.progressStitchDone
                        : level.id === resumeId
                          ? styles.progressStitchCurrent
                          : null
                    ]}
                  />
                ))}
              </View>
            </View>

            {storageWarning ? <Text accessibilityRole="alert" style={styles.warning}>{storageWarning}</Text> : null}

            <View style={styles.journey}>
              {collection.chapters.map((chapter) => {
                const chapterProgress = getChapterProgress(chapter, isCompleted);
                return (
                  <View key={chapter.id}>
                    <ChapterDivider chapter={chapter} completed={chapterProgress.completed} total={chapterProgress.total} />
                    {chapter.levels.map((level) => {
                      const globalIndex = levels.findIndex((candidate) => candidate.id === level.id);
                      return (
                        <LevelStop
                          key={level.id}
                          level={level}
                          number={globalIndex + 1}
                          state={stopStateFor(level)}
                          bestMoves={data.completed[level.id]?.bestMoves}
                          isFirst={false}
                          isLast={globalIndex === levels.length - 1}
                          onPress={() => openLevel(level.id)}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </View>
            <Text style={styles.unlockNote}>
              {collectionProgress.finished
                ? "Every hoop in this sampler is stitched."
                : levels.every((level) => isUnlocked(level.id))
                  ? "Every hoop is unlocked."
                  : "Finish the current hoop to unfold the next."}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const RAIL_WIDTH = 52;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  scrollContent: { alignSelf: "center", paddingTop: space.lg, paddingBottom: space.xl },
  hero: { marginBottom: space.lg },
  heroRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
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
  collectionLabel: { marginTop: space.md, color: palette.brassDeep, fontFamily: type.bodyBold, fontSize: 11, letterSpacing: 2.4 },
  title: { marginTop: 4, color: colors.ink, fontFamily: type.brandHeavy, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  subtitle: { maxWidth: 560, marginTop: 8, color: colors.inkSoft, fontFamily: type.body, fontSize: 15, lineHeight: 22 },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: space.sm },
  loadingText: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14 },
  emptyState: { padding: space.xl, alignItems: "center", backgroundColor: colors.cloth, borderRadius: radius.lg },
  emptyTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 22 },
  emptyText: { marginTop: space.sm, color: colors.inkSoft, fontFamily: type.body, textAlign: "center" },
  progressLine: { marginBottom: space.lg },
  progressText: { color: colors.inkSoft, fontFamily: type.bodySemibold, fontSize: 12 },
  progressStitches: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  progressStitch: { width: 18, height: 4, borderRadius: 2, backgroundColor: colors.linenShadow },
  progressStitchDone: { backgroundColor: colors.tealDeep },
  progressStitchCurrent: { backgroundColor: colors.gold },
  warning: { marginBottom: space.md, color: colors.danger, fontFamily: type.bodySemibold, fontSize: 12, lineHeight: 18 },
  journey: {},
  divider: { flexDirection: "row", alignItems: "stretch", minHeight: 72 },
  dividerRail: { width: RAIL_WIDTH, alignItems: "center", justifyContent: "center" },
  dividerBody: { flex: 1, minWidth: 0, marginLeft: 4, paddingVertical: space.sm, justifyContent: "center" },
  dividerHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 20, lineHeight: 24 },
  dividerSubtitle: { marginTop: 3, color: colors.inkSoft, fontFamily: type.body, fontSize: 13, lineHeight: 19 },
  dividerCount: { marginTop: 5, color: palette.brassDeep, fontFamily: type.bodyBold, fontSize: 10, letterSpacing: 1.6 },
  stop: { flexDirection: "row", alignItems: "stretch", minHeight: 96 },
  stopPressed: { opacity: 0.9 },
  rail: { width: RAIL_WIDTH, alignItems: "center", justifyContent: "center" },
  railLine: { position: "absolute", left: RAIL_WIDTH / 2 - 1, width: 2 },
  railUpper: { top: 0, height: "50%" },
  railLower: { bottom: 0, height: "50%" },
  railFull: { top: 0, bottom: 0 },
  railDone: { backgroundColor: palette.sage },
  railTodo: { backgroundColor: colors.linenShadow, opacity: 0.7 },
  railHidden: { backgroundColor: "transparent" },
  node: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cloth,
    borderWidth: 2,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  nodeCurrent: { borderColor: colors.gold, backgroundColor: colors.cloth, transform: [{ scale: 1.12 }] },
  nodeCompleted: { borderColor: palette.sage, backgroundColor: colors.cloth },
  nodeLocked: { borderColor: colors.linenShadow, backgroundColor: colors.linenDeep },
  nodeNumber: { color: colors.inkSoft, fontFamily: type.bodyBold, fontSize: 12 },
  nodeNumberCurrent: { color: colors.ink },
  panel: {
    flex: 1,
    marginVertical: 6,
    marginLeft: 4,
    padding: space.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.md
  },
  panelCurrent: { borderColor: colors.gold, backgroundColor: "#FFFCF3", shadowColor: colors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  panelLocked: { backgroundColor: colors.linenDeep, borderStyle: "dashed", opacity: 0.86 },
  vignette: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  foldCorner: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderTopColor: colors.linenShadow,
    borderLeftWidth: 12,
    borderLeftColor: "transparent"
  },
  panelCopy: { flex: 1, minWidth: 0, marginLeft: space.sm },
  panelTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 18, lineHeight: 21 },
  panelMeta: { marginTop: 2, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12 },
  panelState: { marginTop: 5, color: colors.inkSoft, fontFamily: type.bodySemibold, fontSize: 11, lineHeight: 15 },
  panelStateDone: { color: colors.tealDeep },
  mutedText: { color: colors.inkSoft },
  continueTag: {
    marginTop: 7,
    alignSelf: "flex-start",
    minHeight: 30,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: radius.pill
  },
  continueTagText: { color: colors.white, fontFamily: type.bodyBold, fontSize: 12 },
  unlockNote: { marginTop: space.lg, color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12, textAlign: "center" }
});
