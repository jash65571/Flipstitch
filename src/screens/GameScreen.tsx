import { useEffect, useRef, useState } from "react";
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
import Svg, { Circle, Line, Path } from "react-native-svg";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { HoopBoard } from "@/components/HoopBoard";
import { createGame, nextHint, oppositeSide, playMove, progress, undoMove } from "@/game/engine";
import { targetEdges } from "@/game/solver";
import type { GameState, Level, Side } from "@/game/types";
import { usePlaytest } from "@/playtest/PlaytestProvider";
import { getGameLayout } from "@/screens/layout";
import { colors, radius, space, type } from "@/theme/tokens";

type ToolName = "undo" | "preview" | "hint";

type GameScreenProps = {
  level: Level;
  levelNumber: number;
  hasPrevious: boolean;
  hasNext: boolean;
  /** Playtest attempt id for the current play-through; events are stamped with it. */
  attemptId: string | null;
  onExit: () => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Restart/replay: the route closes the current attempt and starts a new one. */
  onRestart: () => void;
  onComplete: (moves: number) => void;
};

type ToolButtonProps = {
  tool: ToolName;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onPress: () => void;
};

function ToolGlyph({ tool, active }: { tool: ToolName; active?: boolean }) {
  const color = active ? colors.white : colors.ink;
  if (tool === "undo") {
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" pointerEvents="none">
        <Path d="M9 7H5v-4" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5.5 7.2A8 8 0 1 1 5 16" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    );
  }

  if (tool === "preview") {
    return (
      <Svg width={25} height={24} viewBox="0 0 25 24" pointerEvents="none">
        <Path d="M2.5 12s3.7-5.3 10-5.3 10 5.3 10 5.3-3.7 5.3-10 5.3S2.5 12 2.5 12Z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <Circle cx={12.5} cy={12} r={2.7} fill="none" stroke={color} strokeWidth={2} />
      </Svg>
    );
  }

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" pointerEvents="none">
      <Path d="m12 2.8 1.9 5.3 5.3 1.9-5.3 1.9-1.9 5.3-1.9-5.3L4.8 10l5.3-1.9L12 2.8Z" fill="none" stroke={color} strokeWidth={1.9} strokeLinejoin="round" />
      <Line x1={18.5} y1={16.5} x2={21} y2={19} stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

function ToolButton({ tool, label, disabled, active, onPress }: ToolButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(active) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,
        active && styles.toolButtonActive,
        disabled && styles.toolButtonDisabled,
        pressed && !disabled && styles.toolButtonPressed
      ]}
    >
      <ToolGlyph tool={tool} active={active} />
      <Text maxFontSizeMultiplier={1.6} style={[styles.toolLabel, active && styles.toolTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GameScreen({
  level,
  levelNumber,
  hasPrevious,
  hasNext,
  attemptId,
  onExit,
  onPrevious,
  onNext,
  onRestart,
  onComplete
}: GameScreenProps) {
  const { width, height, fontScale } = useWindowDimensions();
  const { boardSize, compact, horizontal, pagePadding, phoneLandscape } = getGameLayout(width, height, fontScale);
  const feedback = useFeedback();
  const playtest = usePlaytest();

  const [game, setGame] = useState<GameState>(() => createGame(level));
  const [previewSide, setPreviewSide] = useState<Side | null>(null);
  const [hintNode, setHintNode] = useState<string | null>(null);
  const [placedStitchCount, setPlacedStitchCount] = useState(0);
  const [message, setMessage] = useState(level.hintText ?? "Choose a glowing hole. Every stitch flips the hoop.");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animating, setAnimating] = useState(false);
  const inputLocked = useRef(false);
  const flipScale = useRef(new Animated.Value(1)).current;
  const settleScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const completionScale = useRef(new Animated.Value(0.96)).current;
  const completionOpacity = useRef(new Animated.Value(0)).current;
  const visibleSide = previewSide ?? game.activeSide;
  const completedCount = game.usedEdges.size;
  const totalCount = targetEdges(level).length;
  const percent = Math.round(progress(level, game) * 100);
  const sideColor = visibleSide === "front" ? colors.coral : colors.iris;
  const sideSoft = visibleSide === "front" ? colors.coralSoft : colors.irisSoft;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: percent,
      duration: reduceMotion ? 0 : 260,
      useNativeDriver: false
    }).start();
  }, [percent, progressValue, reduceMotion]);

  useEffect(() => {
    setGame(createGame(level));
    setPreviewSide(null);
    setHintNode(null);
    setPlacedStitchCount(0);
    setMessage(level.hintText ?? "Choose a glowing hole. Every stitch flips the hoop.");
    progressValue.setValue(0);
  }, [level, progressValue]);

  useEffect(() => {
    if (!game.complete) {
      completionOpacity.setValue(0);
      completionScale.setValue(0.96);
      return;
    }
    if (reduceMotion) {
      completionOpacity.setValue(1);
      completionScale.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(completionOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(completionScale, {
        toValue: 1,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true
      })
    ]).start();
  }, [completionOpacity, completionScale, game.complete, reduceMotion]);

  const progressWidth = progressValue.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  function say(nextMessage: string) {
    setMessage(nextMessage);
    AccessibilityInfo.announceForAccessibility(nextMessage);
  }

  function finishAnimation() {
    inputLocked.current = false;
    setAnimating(false);
  }

  function animateSwap(commit: () => void) {
    if (inputLocked.current) return;
    inputLocked.current = true;
    setAnimating(true);

    if (reduceMotion) {
      commit();
      finishAnimation();
      return;
    }

    Animated.timing(flipScale, {
      toValue: 0.055,
      duration: 125,
      useNativeDriver: true
    }).start(() => {
      commit();
      settleScale.setValue(0.975);
      Animated.parallel([
        Animated.spring(flipScale, {
          toValue: 1,
          damping: 19,
          stiffness: 255,
          mass: 0.72,
          useNativeDriver: true
        }),
        Animated.spring(settleScale, {
          toValue: 1,
          damping: 14,
          stiffness: 250,
          mass: 0.68,
          useNativeDriver: true
        })
      ]).start(finishAnimation);
    });
  }

  function showInvalidFeedback() {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 70, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -3, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true })
    ]).start();
  }

  function handleNodePress(nodeId: string) {
    if (inputLocked.current || previewSide || game.complete) return;
    setHintNode(null);
    const result = playMove(level, game, nodeId);
    if (!result.ok) {
      say(result.reason === "same-hole" ? "The needle is already here." : "That line is not available on this side.");
      showInvalidFeedback();
      feedback.emit("invalidMove");
      playtest.track({
        name: "invalid_stitch",
        levelId: level.id,
        attemptId: attemptId ?? undefined,
        activeSide: game.activeSide,
        moveCount: placedStitchCount,
        invalidReason: result.reason
      });
      return;
    }

    feedback.emit("stitchPlaced");
    const nextMoveCount = placedStitchCount + 1;
    playtest.track({
      name: placedStitchCount === 0 ? "first_valid_stitch" : "valid_stitch",
      levelId: level.id,
      attemptId: attemptId ?? undefined,
      activeSide: game.activeSide,
      moveCount: nextMoveCount
    });

    animateSwap(() => {
      setGame(result.state);
      setPreviewSide(null);
      feedback.emit("sideChanged");
      say(
        result.completedNow
          ? "Thread complete. Both sides are stitched."
          : `${result.state.activeSide === "front" ? "Front" : "Back"} side. Choose the next glowing hole.`
      );
    });

    setPlacedStitchCount(nextMoveCount);

    if (result.completedNow) {
      feedback.emit("levelCompleted");
      onComplete(nextMoveCount);
    }
  }

  function handleUndo() {
    if (game.moves.length === 0 || inputLocked.current) return;
    animateSwap(() => {
      setGame(undoMove(level, game));
      setPreviewSide(null);
      setHintNode(null);
      say("Stitch removed. The needle and side are restored.");
    });
    feedback.emit("undo");
    playtest.track({ name: "undo_used", levelId: level.id, attemptId: attemptId ?? undefined, moveCount: placedStitchCount });
  }

  function handlePreview() {
    if (inputLocked.current) return;
    animateSwap(() => {
      setPreviewSide((current) => (current ? null : oppositeSide(game.activeSide)));
      setHintNode(null);
      feedback.emit("sideChanged");
    });
    playtest.track({ name: "preview_used", levelId: level.id, attemptId: attemptId ?? undefined });
  }

  function handleHint() {
    if (inputLocked.current) return;
    const hint = nextHint(level, game);
    setPreviewSide(null);
    setHintNode(hint);
    say(hint ? `Hole ${hint.toUpperCase()} keeps a full solution open.` : "This path is blocked. Undo the last stitch and try another branch.");
    feedback.emit("hint");
    playtest.track({ name: "hint_used", levelId: level.id, attemptId: attemptId ?? undefined });
  }

  function handleRestart() {
    setGame(createGame(level));
    setPreviewSide(null);
    setHintNode(null);
    setPlacedStitchCount(0);
    progressValue.setValue(0);
    say(level.hintText ?? "Fresh thread. Choose a glowing hole to begin.");
    onRestart();
  }

  if (phoneLandscape) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View accessible accessibilityRole="alert" style={styles.rotateScreen}>
          <View style={styles.rotateHoop}>
            <View style={styles.rotateNeedle} />
          </View>
          <Text maxFontSizeMultiplier={1.8} style={styles.rotateTitle}>Turn the hoop upright</Text>
          <Text maxFontSizeMultiplier={2} style={styles.rotateText}>FlipStitch plays in portrait so every hole stays easy to reach.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <>
      <View style={styles.navRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to level gallery" onPress={onExit} style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
          <Text maxFontSizeMultiplier={1.5} style={styles.navButtonText}>‹ Gallery</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={1.5} style={styles.levelMeta}>LEVEL {levelNumber} · {level.difficulty.toUpperCase()}</Text>
        {hasPrevious ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Play previous level ${levelNumber - 1}`} onPress={onPrevious} style={({ pressed }) => [styles.navButton, pressed && styles.navPressed]}>
            <Text maxFontSizeMultiplier={1.5} style={styles.navButtonText}>Previous</Text>
          </Pressable>
        ) : <View style={styles.navPlaceholder} />}
      </View>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text maxFontSizeMultiplier={1.6} style={styles.collection}>
            {level.collection}
          </Text>
          <Text maxFontSizeMultiplier={1.6} style={[styles.title, compact && styles.titleCompact]}>
            {level.title}
          </Text>
        </View>
        <View style={[styles.sideBadge, { backgroundColor: sideSoft, borderColor: sideColor }]}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sideEyebrow}>
            {previewSide ? "LOOKING AT" : "STITCH ON"}
          </Text>
          <View style={styles.sideNameRow}>
            <View style={[styles.sideDot, { backgroundColor: sideColor }]} />
            <Text maxFontSizeMultiplier={1.4} style={styles.sideText}>
              {visibleSide.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Pattern progress"
        accessibilityValue={{ min: 0, max: totalCount, now: completedCount, text: `${completedCount} of ${totalCount} stitches` }}
        style={styles.progressGroup}
      >
        <View style={styles.progressLabels}>
          <Text maxFontSizeMultiplier={1.5} style={styles.progressLabel}>ONE THREAD</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.progressNumber}>{completedCount} / {totalCount}</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </>
  );

  const footer = (
    <View style={[styles.footer, horizontal && styles.footerWide]}>
      {game.complete ? (
        <Animated.View accessible accessibilityRole="summary" style={[styles.completionCard, { opacity: completionOpacity, transform: [{ scale: completionScale }] }]}>
          <View style={styles.completionTop}>
            <View style={styles.completionSeal}>
              <Text maxFontSizeMultiplier={1.4} style={styles.completionMark}>✓</Text>
            </View>
            <View style={styles.completionCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.completionTitle}>Thread complete</Text>
              <Text maxFontSizeMultiplier={1.8} style={styles.completionText}>{level.completionMessage}</Text>
            </View>
          </View>
          <View style={styles.completionActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Play level again" onPress={handleRestart} style={({ pressed }) => [styles.secondaryButton, pressed && styles.replayPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Again</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Return to level gallery" onPress={onExit} style={({ pressed }) => [styles.secondaryButton, pressed && styles.replayPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Gallery</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={hasNext ? `Play next level ${levelNumber + 1}` : "Return to completed collection"} onPress={hasNext ? onNext : onExit} style={({ pressed }) => [styles.nextButton, pressed && styles.replayPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.nextButtonText}>{hasNext ? "Next" : "Collection"}</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <View accessibilityLiveRegion="polite" style={styles.messageBox}>
          <Text maxFontSizeMultiplier={2} style={styles.message}>{message}</Text>
        </View>
      )}

      {!game.complete ? (
        <View style={styles.toolbar}>
          <ToolButton tool="undo" label="Undo" disabled={game.moves.length === 0 || animating} onPress={handleUndo} />
          <ToolButton tool="preview" label={previewSide ? "Return" : "Preview"} disabled={animating} active={previewSide !== null} onPress={handlePreview} />
          <ToolButton tool="hint" label="Hint" disabled={animating} onPress={handleHint} />
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.screen, { paddingHorizontal: pagePadding }, horizontal && styles.screenWide]}>
        <View style={[styles.playArea, horizontal && styles.playAreaWide]}>
          {header}
          <View style={[styles.boardRegion, horizontal && styles.boardRegionWide]}>
            <Animated.View
              style={{
                transform: [
                  { perspective: 900 },
                  { translateX: shakeX },
                  { scaleX: flipScale },
                  { scale: settleScale }
                ]
              }}
            >
              <HoopBoard
                level={level}
                game={game}
                visibleSide={visibleSide}
                size={boardSize}
                hintNode={hintNode}
                previewing={previewSide !== null}
                interactionDisabled={animating || previewSide !== null || game.complete}
                onNodePress={handleNodePress}
              />
            </Animated.View>
          </View>
        </View>
        {footer}
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
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    paddingTop: space.sm,
    paddingBottom: space.sm
  },
  screenWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: space.xl
  },
  playArea: {
    flex: 1
  },
  playAreaWide: {
    minWidth: 520
  },
  navRow: {
    minHeight: 48,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  navButton: {
    minWidth: 72,
    minHeight: 48,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill
  },
  navPressed: {
    backgroundColor: colors.linenDeep
  },
  navButtonText: {
    color: colors.inkSoft,
    fontFamily: type.bodyBold,
    fontSize: 11
  },
  navPlaceholder: {
    width: 72,
    minHeight: 48
  },
  levelMeta: {
    flex: 1,
    color: colors.tealDeep,
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    textAlign: "center"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: space.sm
  },
  collection: {
    color: colors.inkSoft,
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 1.45
  },
  title: {
    marginTop: 1,
    color: colors.ink,
    fontFamily: type.brandHeavy,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.7
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 31
  },
  sideBadge: {
    minWidth: 104,
    minHeight: 52,
    paddingHorizontal: 13,
    paddingVertical: 7,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md
  },
  sideEyebrow: {
    color: colors.inkSoft,
    fontFamily: type.bodyBold,
    fontSize: 8,
    letterSpacing: 1.05
  },
  sideNameRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  sideDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill
  },
  sideText: {
    color: colors.ink,
    fontFamily: type.bodyBold,
    fontSize: 12,
    letterSpacing: 1.05
  },
  progressGroup: {
    marginTop: space.md
  },
  progressLabels: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  progressLabel: {
    color: colors.inkSoft,
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2
  },
  progressNumber: {
    color: colors.ink,
    fontFamily: type.bodyBold,
    fontSize: 11
  },
  progressTrack: {
    height: 7,
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
    minHeight: 276,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.sm
  },
  boardRegionWide: {
    paddingBottom: 0
  },
  footer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center"
  },
  footerWide: {
    width: 300,
    justifyContent: "center"
  },
  messageBox: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  message: {
    color: colors.inkSoft,
    fontFamily: type.bodySemibold,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center"
  },
  completionCard: {
    minHeight: 126,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "#FFF7DF",
    borderWidth: 1,
    borderColor: "#E5C97A",
    borderRadius: radius.md
  },
  completionTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  completionSeal: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.pill
  },
  completionMark: {
    color: colors.ink,
    fontFamily: type.bodyBold,
    fontSize: 22
  },
  completionCopy: {
    flex: 1,
    paddingHorizontal: 11
  },
  completionTitle: {
    color: colors.ink,
    fontFamily: type.brand,
    fontSize: 17
  },
  completionText: {
    marginTop: 1,
    color: colors.inkSoft,
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 15
  },
  completionActions: {
    marginTop: 9,
    flexDirection: "row",
    gap: 8
  },
  secondaryButton: {
    minWidth: 48,
    minHeight: 48,
    flex: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.pill
  },
  nextButton: {
    minWidth: 68,
    minHeight: 48,
    flex: 1.25,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.pill
  },
  replayPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }]
  },
  secondaryButtonText: {
    color: colors.ink,
    fontFamily: type.bodyBold,
    fontSize: 11
  },
  nextButtonText: {
    color: colors.white,
    fontFamily: type.bodyBold,
    fontSize: 12
  },
  toolbar: {
    flexDirection: "row",
    gap: space.sm,
    paddingTop: space.sm
  },
  toolButton: {
    minWidth: 48,
    minHeight: 64,
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2
  },
  toolButtonActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink
  },
  toolButtonDisabled: {
    opacity: 0.34
  },
  toolButtonPressed: {
    opacity: 0.82,
    transform: [{ translateY: 1 }, { scale: 0.98 }]
  },
  toolLabel: {
    marginTop: 4,
    color: colors.inkSoft,
    fontFamily: type.bodyBold,
    fontSize: 11
  },
  toolTextActive: {
    color: colors.white
  },
  rotateScreen: {
    flex: 1,
    padding: space.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  rotateHoop: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 10,
    borderColor: colors.wood,
    borderRadius: radius.pill,
    backgroundColor: colors.cloth,
    transform: [{ rotate: "-12deg" }]
  },
  rotateNeedle: {
    width: 4,
    height: 48,
    backgroundColor: colors.iris,
    borderRadius: radius.pill,
    transform: [{ rotate: "42deg" }]
  },
  rotateTitle: {
    marginTop: space.lg,
    color: colors.ink,
    fontFamily: type.brandHeavy,
    fontSize: 25,
    textAlign: "center"
  },
  rotateText: {
    maxWidth: 420,
    marginTop: space.sm,
    color: colors.inkSoft,
    fontFamily: type.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  }
});
