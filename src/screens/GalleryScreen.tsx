import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { SamplerArtifact } from "@/components/SamplerArtifact";
import { catalog } from "@/content/catalog";
import type { Level } from "@/game/types";
import { useProgress } from "@/progress/ProgressProvider";
import { getGalleryLayout } from "@/screens/gallery-layout";
import { colors, palette, radius, space, type } from "@/theme/tokens";

/**
 * One finished hoop, laid into the sampler book as a pair of artifacts —
 * front and back, side by side, the way a finished embroidery piece is
 * mounted. Unfinished levels never pretend to be complete: they simply do
 * not appear here.
 */
function FinishedPage({ level, bestMoves, collectionTitle, chapterTitle, onReplay }: {
  level: Level;
  bestMoves: number;
  collectionTitle: string;
  chapterTitle: string;
  onReplay: () => void;
}) {
  return (
    <View style={styles.page}>
      <View style={styles.pageArtifacts}>
        <View style={styles.artifactSlot}>
          <SamplerArtifact level={level} side="front" size={92} />
          <Text maxFontSizeMultiplier={1.6} style={styles.artifactLabel}>Front</Text>
        </View>
        <View style={styles.artifactSlot}>
          <SamplerArtifact level={level} side="back" size={92} />
          <Text maxFontSizeMultiplier={1.6} style={[styles.artifactLabel, styles.artifactLabelBack]}>Back</Text>
        </View>
      </View>
      <View style={styles.pageCopy}>
        <Text maxFontSizeMultiplier={1.6} style={styles.pageTitle}>{level.title}</Text>
        <Text maxFontSizeMultiplier={1.7} style={styles.pageMeta}>
          {collectionTitle} · {chapterTitle}
        </Text>
        <Text maxFontSizeMultiplier={1.7} style={styles.pageMeta}>Best {bestMoves} stitches</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Replay ${level.title}`}
          accessibilityHint="Starts a new attempt at this finished hoop; your best result is kept"
          onPress={onReplay}
          style={({ pressed }) => [styles.replayButton, pressed && styles.replayPressed]}
        >
          <Icon name="needle" size={15} color={colors.ink} accent={palette.brass} strokeWidth={1.9} />
          <Text maxFontSizeMultiplier={1.5} style={styles.replayButtonText}>Replay</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function GalleryScreen() {
  const router = useRouter();
  const { width: viewportWidth, fontScale } = useWindowDimensions();
  const { data } = useProgress();
  const { contentWidth } = getGalleryLayout(viewportWidth, fontScale);

  const finishedPages = catalog.collections.flatMap((collection) =>
    collection.chapters.flatMap((chapter) =>
      chapter.entries
        .filter((entry) => Boolean(data.completed[entry.level.id]))
        .map((entry) => ({
          level: entry.level,
          bestMoves: data.completed[entry.level.id]!.bestMoves,
          collectionTitle: collection.title,
          chapterTitle: chapter.title
        }))
    )
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.replayPressed]}
          >
            <Icon name="chapter" size={19} color={colors.inkSoft} accent={palette.brass} strokeWidth={1.9} />
          </Pressable>
          <Text maxFontSizeMultiplier={1.5} style={styles.title}>Finished Samplers</Text>
        </View>
        <Text maxFontSizeMultiplier={1.9} style={styles.introText}>
          Every hoop you have completed, front and back, mounted the way a finished embroidery piece is kept.
        </Text>

        {finishedPages.length === 0 ? (
          <View accessible accessibilityRole="alert" style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No samplers finished yet</Text>
            <Text style={styles.emptyText}>Complete a hoop and it will be mounted here, front and back.</Text>
          </View>
        ) : (
          <View style={styles.pageList}>
            {finishedPages.map(({ level, bestMoves, collectionTitle, chapterTitle }) => (
              <FinishedPage
                key={level.id}
                level={level}
                bestMoves={bestMoves}
                collectionTitle={collectionTitle}
                chapterTitle={chapterTitle}
                onReplay={() => router.push({ pathname: "/level/[id]", params: { id: level.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  scrollContent: { alignSelf: "center", paddingTop: space.lg, paddingBottom: space.xl },
  heroRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.md
  },
  replayPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  title: { color: colors.ink, fontFamily: type.brandHeavy, fontSize: 26, letterSpacing: -0.5 },
  introText: { maxWidth: 560, marginTop: space.md, marginBottom: space.lg, color: colors.inkSoft, fontFamily: type.body, fontSize: 15, lineHeight: 22 },
  emptyState: { padding: space.xl, alignItems: "center", backgroundColor: colors.cloth, borderRadius: radius.lg },
  emptyTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 22 },
  emptyText: { marginTop: space.sm, color: colors.inkSoft, fontFamily: type.body, textAlign: "center" },
  pageList: { gap: space.md },
  page: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.lg
  },
  pageArtifacts: { flexDirection: "row", gap: space.sm },
  artifactSlot: { alignItems: "center", gap: 4 },
  artifactLabel: { color: colors.coral, fontFamily: type.bodyBold, fontSize: 10, letterSpacing: 1 },
  artifactLabelBack: { color: colors.iris },
  pageCopy: { flex: 1, minWidth: 0, gap: 3 },
  pageTitle: { color: colors.ink, fontFamily: type.brand, fontSize: 18, lineHeight: 21 },
  pageMeta: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 12 },
  replayButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    minHeight: 34,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.linenDeep,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  replayButtonText: { color: colors.ink, fontFamily: type.bodyBold, fontSize: 12 }
});
