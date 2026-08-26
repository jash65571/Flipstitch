import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HoopBoard } from "@/components/HoopBoard";
import { createGame, nextHint, oppositeSide, playMove, progress, undoMove } from "@/game/engine";
import { levelOne } from "@/game/level-one";
import type { GameState, Side } from "@/game/types";
import { colors, radius, space, type } from "@/theme/tokens";

type ToolButtonProps = {
  icon: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
};

function ToolButton({ icon, label, disabled, active, onPress }: ToolButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,
        active && styles.toolButtonActive,
        disabled && styles.toolButtonDisabled,
        pressed && !disabled && styles.toolButtonPressed
      ]}
    >
      <Text style={[styles.toolIcon, active && styles.toolTextActive]}>{icon}</Text>
      <Text style={[styles.toolLabel, active && styles.toolTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function GameScreen() {
  const { width, height } = useWindowDimensions();
  const boardSize = Math.min(width - space.lg * 2, height * 0.52, 470);
  const [game, setGame] = useState<GameState>(() => createGame(levelOne));
  const [previewSide, setPreviewSide] = useState<Side | null>(null);
  const [hintNode, setHintNode] = useState<string | null>(null);
  const [message, setMessage] = useState("Tap the glowing hole to make your first stitch.");
  const [reduceMotion, setReduceMotion] = useState(false);
  const flipScale = useRef(new Animated.Value(1)).current;
  const visibleSide = previewSide ?? game.activeSide;
  const percent = Math.round(progress(levelOne, game) * 100);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  const progressWidth = useMemo(
    () => flipScale.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${percent}%`] }),
    [flipScale, percent]
  );

  function animateSwap(commit: () => void) {
    if (reduceMotion) {
      commit();
      return;
    }

    Animated.timing(flipScale, {
      toValue: 0.04,
      duration: 115,
      useNativeDriver: false
    }).start(() => {
      commit();
      Animated.spring(flipScale, {
        toValue: 1,
        damping: 18,
        stiffness: 230,
        mass: 0.7,
        useNativeDriver: false
      }).start();
    });
  }

  function handleNodePress(nodeId: string) {
    setHintNode(null);
    const result = playMove(levelOne, game, nodeId);
    if (!result.ok) {
      setMessage(result.reason === "same-hole" ? "The needle is already here." : "That stitch is not part of this side.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }

    animateSwap(() => {
      setGame(result.state);
      setPreviewSide(null);
      setMessage(
        result.completedNow
          ? "Both sides are complete. One thread, two finished patterns."
          : `Nice. The needle is now on the ${result.state.activeSide}.`
      );
    });

    if (result.completedNow) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } else {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }

  function handleUndo() {
    if (game.moves.length === 0) return;
    animateSwap(() => {
      setGame(undoMove(levelOne, game));
      setPreviewSide(null);
      setHintNode(null);
      setMessage("Stitch removed. Try a different path.");
    });
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function handlePreview() {
    animateSwap(() => {
      setPreviewSide((current) => (current ? null : oppositeSide(game.activeSide)));
      setHintNode(null);
    });
  }

  function handleHint() {
    const hint = nextHint(levelOne, game);
    setPreviewSide(null);
    setHintNode(hint);
    setMessage(hint ? `Look for the glowing hole on the ${game.activeSide}.` : "This hoop is complete.");
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function handleRestart() {
    setGame(createGame(levelOne));
    setPreviewSide(null);
    setHintNode(null);
    setMessage("Tap the glowing hole to make your first stitch.");
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.collection}>{levelOne.collection}</Text>
            <Text style={styles.title}>{levelOne.title}</Text>
          </View>
          <View style={[styles.sideBadge, visibleSide === "back" && styles.sideBadgeBack]}>
            <View style={[styles.sideDot, visibleSide === "back" && styles.sideDotBack]} />
            <Text style={styles.sideText}>{visibleSide.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.progressTrack} accessibilityLabel={`${percent}% complete`}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        <View style={styles.boardRegion}>
          <Animated.View style={{ transform: [{ scaleX: flipScale }] }}>
            <HoopBoard
              level={levelOne}
              game={game}
              visibleSide={visibleSide}
              size={boardSize}
              hintNode={hintNode}
              previewing={previewSide !== null}
              onNodePress={handleNodePress}
            />
          </Animated.View>
        </View>

        <View style={styles.messageBox}>
          <Text style={styles.message}>{message}</Text>
          {game.complete ? (
            <Pressable accessibilityRole="button" onPress={handleRestart} style={styles.replayButton}>
              <Text style={styles.replayText}>Play again</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.toolbar}>
          <ToolButton icon="↶" label="Undo" disabled={game.moves.length === 0} onPress={handleUndo} />
          <ToolButton
            icon="◐"
            label={previewSide ? "Return" : "Preview"}
            active={previewSide !== null}
            onPress={handlePreview}
          />
          <ToolButton icon="✦" label="Hint" disabled={game.complete} onPress={handleHint} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.linen
  },
  screen: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  collection: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    marginTop: 2,
    color: colors.ink,
    fontFamily: type.brand,
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.5
  },
  sideBadge: {
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.coralSoft,
    borderRadius: radius.pill
  },
  sideBadgeBack: {
    backgroundColor: colors.irisSoft
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.coral
  },
  sideDotBack: {
    backgroundColor: colors.iris
  },
  sideText: {
    color: colors.ink,
    fontFamily: type.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1
  },
  progressTrack: {
    height: 6,
    marginTop: space.md,
    overflow: "hidden",
    backgroundColor: colors.linenDeep,
    borderRadius: radius.pill
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.teal,
    borderRadius: radius.pill
  },
  boardRegion: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280
  },
  messageBox: {
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  message: {
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center"
  },
  replayButton: {
    minHeight: 44,
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.pill
  },
  replayText: {
    color: colors.white,
    fontFamily: type.brand,
    fontSize: 14,
    fontWeight: "800"
  },
  toolbar: {
    flexDirection: "row",
    gap: space.sm,
    paddingTop: space.sm
  },
  toolButton: {
    minHeight: 62,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenDeep,
    borderRadius: radius.md
  },
  toolButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  toolButtonDisabled: {
    opacity: 0.38
  },
  toolButtonPressed: {
    transform: [{ scale: 0.96 }]
  },
  toolIcon: {
    color: colors.ink,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: "700"
  },
  toolLabel: {
    marginTop: 3,
    color: colors.inkSoft,
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: "700"
  },
  toolTextActive: {
    color: colors.white
  }
});
