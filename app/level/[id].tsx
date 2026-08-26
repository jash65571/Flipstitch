import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getLevel, getLevelIndex, levels } from "@/game/levels";
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

  function openLevel(nextIndex: number) {
    const next = levels[nextIndex];
    if (!next) {
      router.replace("/");
      return;
    }
    startLevel(next.id);
    router.replace({ pathname: "/level/[id]", params: { id: next.id } });
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
      onComplete={(moves) => completeLevel(level.id, moves)}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.linen },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  stateText: { color: colors.inkSoft, fontFamily: type.bodyMedium, fontSize: 14 }
});
