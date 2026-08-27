import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { getLevel } from "@/content/catalog";
import { getLevelContext } from "@/content/navigation";
import { LevelVisit, makeAttemptId } from "@/playtest/attempt";
import { usePlaytest } from "@/playtest/PlaytestProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { GameScreen } from "@/screens/GameScreen";
import { colors, space, type } from "@/theme/tokens";

export default function LevelRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const level = levelId ? getLevel(levelId) : undefined;
  // One source of truth for position: chapter, collection, previous, and next
  // all come from the content layer. This route never indexes a level array.
  const context = level ? getLevelContext(level.id) : undefined;
  const { loading, isUnlocked, completeLevel, startLevel } = useProgress();
  const feedback = useFeedback();
  const playtest = usePlaytest();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const visitRef = useRef<{ levelId: string; visit: LevelVisit } | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One LevelVisit per genuine level visit. The open is recorded exactly once;
  // the exit is recorded at most once, and only when the attempt never
  // completed. The end is deferred by one tick so React StrictMode's immediate
  // cleanup -> setup cycle for the SAME level cancels it instead of recording
  // a bogus exit; a real unmount or level change lets it fire.
  useEffect(() => {
    if (!level) return;
    if (visitRef.current?.levelId === level.id) {
      // StrictMode-style re-setup for the same visit: cancel the deferred end.
      if (endTimerRef.current !== null) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
    } else {
      const visit = new LevelVisit(level.id, makeAttemptId(playtest.sessionId, level.id));
      visitRef.current = { levelId: level.id, visit };
      setAttemptId(visit.id);
    }
    const visit = visitRef.current?.visit;
    if (!visit) return;
    const opened = visit.open();
    if (opened) playtest.track(opened);

    return () => {
      const captured = visitRef.current;
      endTimerRef.current = setTimeout(() => {
        endTimerRef.current = null;
        const exit = captured?.visit.end();
        if (exit) playtest.track(exit);
      }, 0);
    };
  }, [level, playtest]);

  useEffect(() => {
    return () => {
      if (endTimerRef.current !== null) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Loading level progress" style={styles.state}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.stateText}>Preparing the hoop…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!level || !context || !isUnlocked(level.id)) {
    return <Redirect href="/" />;
  }
  const currentLevel = level;
  const currentContext = context;
  const nextContext = currentContext.nextLevelId ? getLevelContext(currentContext.nextLevelId) : undefined;
  const nextCollectionTitle =
    currentContext.isCollectionLast && nextContext && nextContext.collection.id !== currentContext.collection.id
      ? nextContext.collection.title
      : null;

  function openLevelById(nextId: string | null, isForwardStep: boolean) {
    if (!nextId) {
      router.replace({ pathname: "/collection/[id]", params: { id: currentContext.collection.id } });
      return;
    }
    startLevel(nextId);
    if (isForwardStep) {
      playtest.track({ name: "next_level_started", levelId: nextId });
    }
    router.replace({ pathname: "/level/[id]", params: { id: nextId } });
  }

  function handleComplete(moves: number) {
    const current = visitRef.current;
    if (!current) return;
    const completed = current.visit.complete();
    if (completed) {
      playtest.track({ ...completed, moveCount: moves });
    }
    completeLevel(currentLevel.id, moves);
    if (currentContext.nextLevelId) {
      // Linear unlocking means completing level N unlocks N+1 in this moment.
      feedback.emit("levelUnlocked");
    }
  }

  function handleRestart() {
    const current = visitRef.current;
    if (!current) return;
    const result = current.visit.restart(makeAttemptId(playtest.sessionId, current.levelId));
    if (!result) return;
    playtest.track(result.abandoned);
    visitRef.current = { levelId: current.levelId, visit: result.next };
    setAttemptId(result.next.id);
  }

  return (
    <GameScreen
      key={level.id}
      level={level}
      levelNumber={context.levelNumber}
      chapterTitle={context.chapter.title}
      collectionTitle={context.collection.title}
      hasPrevious={context.previousLevelId !== null}
      hasNext={context.nextLevelId !== null}
      isCollectionLast={currentContext.isCollectionLast}
      nextCollectionTitle={nextCollectionTitle}
      attemptId={attemptId}
      onExit={() => router.replace({ pathname: "/collection/[id]", params: { id: currentContext.collection.id } })}
      onPrevious={() => openLevelById(currentContext.previousLevelId, false)}
      onNext={() => openLevelById(currentContext.nextLevelId, true)}
      onOpenGallery={() => router.push("/gallery")}
      onRestart={handleRestart}
      onComplete={handleComplete}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  stateText: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14 }
});
