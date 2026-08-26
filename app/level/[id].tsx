import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { getLevel, getLevelIndex, levels } from "@/game/levels";
import { usePlaytest } from "@/playtest/PlaytestProvider";
import { useProgress } from "@/progress/ProgressProvider";
import { GameScreen } from "@/screens/GameScreen";
import { colors, space, type } from "@/theme/tokens";

export default function LevelRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const levelId = Array.isArray(params.id) ? params.id[0] : params.id;
  const level = levelId ? getLevel(levelId) : undefined;
  const index = level ? getLevelIndex(level.id) : -1;
  const { loading, isUnlocked, completeLevel, startLevel } = useProgress();
  const feedback = useFeedback();
  const playtest = usePlaytest();
  const completedRef = useRef(false);

  // Record the level open once per visit, and the exit once per visit unless
  // the level was completed. The cleanup runs on route changes, back
  // navigation, and app state unmounts, so it is the single exit reporter.
  useEffect(() => {
    if (!level) return;
    completedRef.current = false;
    playtest.track({ name: "level_opened", levelId: level.id });
    return () => {
      if (!completedRef.current) {
        playtest.track({ name: "level_exited", levelId: level.id, completed: false });
      }
    };
  }, [level, playtest]);

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

  if (!level || !isUnlocked(level.id)) {
    return <Redirect href="/" />;
  }
  const currentLevel = level;

  function openLevel(nextIndex: number) {
    const next = levels[nextIndex];
    if (!next) {
      router.replace("/");
      return;
    }
    startLevel(next.id);
    if (nextIndex === index + 1) {
      playtest.track({ name: "next_level_started", levelId: next.id });
    }
    router.replace({ pathname: "/level/[id]", params: { id: next.id } });
  }

  function handleComplete(moves: number) {
    completedRef.current = true;
    completeLevel(currentLevel.id, moves);
    if (index < levels.length - 1) {
      // Linear unlocking means completing level N unlocks N+1 in this moment.
      feedback.emit("levelUnlocked");
    }
  }

  return (
    <GameScreen
      key={level.id}
      level={level}
      levelNumber={index + 1}
      hasPrevious={index > 0}
      hasNext={index < levels.length - 1}
      onExit={() => router.replace("/")}
      onPrevious={() => openLevel(index - 1)}
      onNext={() => openLevel(index + 1)}
      onComplete={handleComplete}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  stateText: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14 }
});
