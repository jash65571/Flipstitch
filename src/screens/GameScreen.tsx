import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFeedback } from "@/feedback/FeedbackProvider";
import { HoopBoard } from "@/components/HoopBoard";
import { Icon } from "@/components/Icon";
import { LevelThumbnail } from "@/components/LevelThumbnail";
import { createGame, guidanceFor, isGameStuck, playMove, progress, stagedHint, undoMove } from "@/game/engine";
import { peekControlLabel, peekEnterAnnouncement, peekExitAnnouncement, togglePeek } from "@/game/peek";
import { targetEdges } from "@/game/solver";
import type { GameState, HintStage, Level, Side, StagedHint } from "@/game/types";
import { usePlaytest } from "@/playtest/PlaytestProvider";
import { getGameLayout } from "@/screens/layout";
import { colors, palette, radius, space, thread, type } from "@/theme/tokens";

type ToolName = "undo" | "peek" | "hint";

type GameScreenProps = {
  level: Level;
  levelNumber: number;
  /** Chapter title, from the content layer. Never hard-coded in a screen. */
  chapterTitle: string;
  /** Collection title, from the content layer. */
  collectionTitle: string;
  hasPrevious: boolean;
  hasNext: boolean;
  /** True when this level is the last in its collection — the completion
   *  card shows a crafted collection-complete state instead of the plain
   *  next-level flow. */
  isCollectionLast: boolean;
  /** Title of the collection unlocked by finishing this one, or null when
   *  none is unlocked yet (or this was already the last collection). */
  nextCollectionTitle: string | null;
  /** Playtest attempt id for the current play-through; events are stamped with it. */
  attemptId: string | null;
  onExit: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenGallery: () => void;
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
      <Icon name={tool} size={24} color={active ? colors.white : colors.ink} accent={active ? colors.white : palette.brass} />
      <Text maxFontSizeMultiplier={1.6} style={[styles.toolLabel, active && styles.toolTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A guidance-aware opening line: full guidance points at the glow, the
 *  quieter levels ask the player to read the pattern. */
function openingMessage(level: Level): string {
  return guidanceFor(level) === "full"
    ? "Choose a glowing hole. Every stitch flips the hoop."
    : "Read the pattern and choose a hole. Every stitch flips the hoop.";
}

export function GameScreen({
  level,
  levelNumber,
  chapterTitle,
  collectionTitle,
  hasPrevious,
  hasNext,
  isCollectionLast,
  nextCollectionTitle,
  attemptId,
  onExit,
  onPrevious,
  onNext,
  onOpenGallery,
  onRestart,
  onComplete
}: GameScreenProps) {
  const { width, height, fontScale } = useWindowDimensions();
  const { boardSize, compact, horizontal, pagePadding, phoneLandscape } = getGameLayout(width, height, fontScale);
  const feedback = useFeedback();
  const playtest = usePlaytest();

  const [game, setGame] = useState<GameState>(() => createGame(level));
  const [peekSide, setPeekSide] = useState<Side | null>(null);
  const [hint, setHint] = useState<StagedHint | null>(null);
  const [stuck, setStuck] = useState(false);
  const [placedStitchCount, setPlacedStitchCount] = useState(0);
  const guidance = guidanceFor(level);
  const [message, setMessage] = useState(level.hintText ?? openingMessage(level));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animating, setAnimating] = useState(false);
  const inputLocked = useRef(false);
  const flipScale = useRef(new Animated.Value(1)).current;
  const settleScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const completionScale = useRef(new Animated.Value(0.96)).current;
  const completionOpacity = useRef(new Animated.Value(0)).current;
  const completedCount = game.usedEdges.size;
  const totalCount = targetEdges(level).length;
  const percent = Math.round(progress(level, game) * 100);
  const hintNode = hint?.kind === "exact" ? hint.exactHole : null;
  const regionHoles = hint?.kind === "region" ? hint.regionHoles : undefined;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  // Peek is a temporary read-only inspection, not a real game state — it
  // must never persist across an app backgrounding, the way a real stitch
  // does. Close it (silently; no feedback event, matching handlePeek's own
  // policy of only emitting on an explicit player action) whenever the app
  // leaves the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") setPeekSide(null);
    });
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
    setPeekSide(null);
    setHint(null);
    setStuck(false);
    setPlacedStitchCount(0);
    setMessage(level.hintText ?? openingMessage(level));
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
    if (inputLocked.current || peekSide || game.complete) return;
    setHint(null);
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

    // Pure trapped-thread check on the resulting state: not complete, yet no
    // legal unused stitch leaves the new hole/side. Detected here, surfaced in
    // the footer after the flip settles. Never fires on the completing stitch.
    const nowStuck = !result.completedNow && isGameStuck(level, result.state);

    animateSwap(() => {
      setGame(result.state);
      setPeekSide(null);
      setStuck(nowStuck);
      feedback.emit("sideChanged");
      if (nowStuck) {
        feedback.emit("invalidMove");
        say("The thread is caught. No stitch leaves this hole on this side — undo the last stitch, or restart the hoop.");
      } else {
        say(
          result.completedNow
            ? "Thread complete. Both sides are stitched."
            : guidance === "full"
              ? "Choose the next glowing hole."
              : "Read the pattern for your next stitch."
        );
      }
    });

    setPlacedStitchCount(nextMoveCount);

    if (nowStuck) {
      playtest.track({
        name: "thread_trapped",
        levelId: level.id,
        attemptId: attemptId ?? undefined,
        activeSide: result.state.activeSide,
        moveCount: nextMoveCount
      });
    }

    if (result.completedNow) {
      feedback.emit("levelCompleted");
      onComplete(nextMoveCount);
    }
  }

  function handleUndo() {
    if (game.moves.length === 0 || inputLocked.current) return;
    animateSwap(() => {
      setGame(undoMove(level, game));
      setPeekSide(null);
      setHint(null);
      setStuck(false);
      say("Stitch removed. The needle and side are restored.");
    });
    feedback.emit("undo");
    playtest.track({ name: "undo_used", levelId: level.id, attemptId: attemptId ?? undefined, moveCount: placedStitchCount });
  }

  // Peek is a read-only inspection of the opposite side, not a real side
  // change: it never calls animateSwap (the hoop-flip transform is reserved
  // for actual stitches) and never emits `sideChanged`. `activeSide` is
  // untouched; only `peekSide` moves. See src/game/peek.ts.
  function handlePeek() {
    if (inputLocked.current) return;
    const next = togglePeek(game.activeSide, peekSide);
    setPeekSide(next);
    setHint(null);
    feedback.emit("peekToggled");
    say(next ? peekEnterAnnouncement(next, game.activeSide) : peekExitAnnouncement(game.activeSide));
    playtest.track({ name: "peek_used", levelId: level.id, attemptId: attemptId ?? undefined });
  }

  // Staged, opt-in help. Each tap escalates one rung: concept -> region -> exact
  // hole. The player chooses how far to go; the first tap never reveals the
  // answer.
  function handleHint() {
    if (inputLocked.current) return;
    const nextStage = (hint ? Math.min(3, hint.stage + 1) : 1) as HintStage;
    const staged = stagedHint(level, game, nextStage);
    setPeekSide(null);
    setHint(staged);
    say(staged.text);
    feedback.emit("hint");
    playtest.track({ name: "hint_used", levelId: level.id, attemptId: attemptId ?? undefined, hintStage: nextStage });
  }

  function handleRestart() {
    setGame(createGame(level));
    setPeekSide(null);
    setHint(null);
    setStuck(false);
    setPlacedStitchCount(0);
    progressValue.setValue(0);
    say(level.hintText ?? openingMessage(level));
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
      {/* Side identity now lives on the hoop itself — the thread-dyed rim and
          the single woven side label — so the header carries only the title. */}
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text maxFontSizeMultiplier={1.6} style={styles.collection}>
            {collectionTitle} · {chapterTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.6} style={[styles.title, compact && styles.titleCompact]}>
            {level.title}
          </Text>
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
        <Animated.View accessible accessibilityRole="summary" accessibilityLabel={`Thread complete. ${level.completionMessage}`} style={[styles.completionCard, { opacity: completionOpacity, transform: [{ scale: completionScale }] }]}>
          <View style={styles.completionTop}>
            {/* The finished sampler settles as one object: front (solid) and
                back (dashed) threads together on the hoop. */}
            <View style={styles.completionArtifact}>
              <LevelThumbnail level={level} size={64} />
              <View style={styles.completionSealBadge}>
                <Icon name="completed" size={18} color={thread.front.deep} accent={thread.back.deep} strokeWidth={2.4} />
              </View>
            </View>
            <View style={styles.completionCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.completionTitle}>
                {isCollectionLast ? `${collectionTitle} — finished` : "Thread complete"}
              </Text>
              <Text maxFontSizeMultiplier={1.8} style={styles.completionText}>{level.completionMessage}</Text>
            </View>
          </View>
          <View style={styles.completionActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Play level again" onPress={handleRestart} style={({ pressed }) => [styles.secondaryButton, pressed && styles.replayPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Again</Text>
            </Pressable>
            {isCollectionLast ? (
              <Pressable accessibilityRole="button" accessibilityLabel="View finished samplers" onPress={onOpenGallery} style={({ pressed }) => [styles.secondaryButton, pressed && styles.replayPressed]}>
                <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Samplers</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Return to level gallery" onPress={onExit} style={({ pressed }) => [styles.secondaryButton, pressed && styles.replayPressed]}>
                <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Gallery</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                hasNext && nextCollectionTitle
                  ? `Open ${nextCollectionTitle}`
                  : hasNext
                    ? `Play next level ${levelNumber + 1}`
                    : `Return to ${collectionTitle}`
              }
              onPress={hasNext ? onNext : onExit}
              style={({ pressed }) => [styles.nextButton, pressed && styles.replayPressed]}
            >
              <Text maxFontSizeMultiplier={1.5} style={styles.nextButtonText}>
                {hasNext ? (nextCollectionTitle ?? "Next") : "Collection"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : stuck ? (
        <View accessible accessibilityRole="alert" style={styles.trapCard}>
          <View style={styles.trapTop}>
            <View style={styles.trapMarkWrap}>
              <Icon name="trapped" size={26} color={colors.danger} accent={thread.back.deep} strokeWidth={2.2} />
            </View>
            <View style={styles.trapCopy}>
              <Text maxFontSizeMultiplier={1.6} style={styles.trapTitle}>The thread is caught</Text>
              <Text maxFontSizeMultiplier={1.9} style={styles.trapText}>
                No stitch leaves this hole on this side. Nothing is lost — step back a stitch, or start the hoop fresh.
              </Text>
            </View>
          </View>
          <View style={styles.trapActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Undo the last stitch to free the thread" onPress={handleUndo} disabled={game.moves.length === 0 || animating} style={({ pressed }) => [styles.nextButton, pressed && styles.replayPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.nextButtonText}>Undo stitch</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Restart the hoop from the beginning" onPress={handleRestart} style={({ pressed }) => [styles.secondaryButton, pressed && styles.replayPressed]}>
              <Text maxFontSizeMultiplier={1.5} style={styles.secondaryButtonText}>Restart</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View accessibilityLiveRegion="polite" style={styles.messageBox}>
          <Text maxFontSizeMultiplier={2} style={styles.message}>{message}</Text>
          {hint ? (
            <View style={styles.hintDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {[1, 2, 3].map((rung) => (
                <View key={rung} style={[styles.hintDot, hint.stage >= rung && styles.hintDotOn]} />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {/* Tools soften to only the relevant ones: the trap card owns undo and
          restart, so the toolbar hides while stuck or complete. */}
      {!game.complete && !stuck ? (
        <View style={styles.toolbar}>
          <ToolButton tool="undo" label="Undo" disabled={game.moves.length === 0 || animating} onPress={handleUndo} />
          <ToolButton tool="peek" label={peekControlLabel(game.activeSide, peekSide)} disabled={animating} active={peekSide !== null} onPress={handlePeek} />
          <ToolButton tool="hint" label={hint ? `Hint ${hint.stage}/3` : "Hint"} disabled={animating} active={hint !== null} onPress={handleHint} />
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
                size={boardSize}
                hintNode={hintNode}
                regionHoles={regionHoles}
                guidance={guidance}
                peekSide={peekSide}
                interactionDisabled={animating || peekSide !== null || game.complete}
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
  hintDots: {
    marginTop: 8,
    flexDirection: "row",
    gap: 6
  },
  hintDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.linenShadow
  },
  hintDotOn: {
    backgroundColor: palette.brass
  },
  trapCard: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: colors.clothShade,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md
  },
  trapTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  trapMarkWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.linenShadow,
    borderRadius: radius.sm
  },
  trapCopy: {
    flex: 1,
    paddingHorizontal: 11
  },
  trapTitle: {
    color: colors.ink,
    fontFamily: type.brand,
    fontSize: 17
  },
  trapText: {
    marginTop: 2,
    color: colors.inkSoft,
    fontFamily: type.bodyMedium,
    fontSize: 12,
    lineHeight: 17
  },
  trapActions: {
    marginTop: 11,
    flexDirection: "row",
    gap: 8
  },
  completionCard: {
    minHeight: 126,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: colors.cloth,
    borderWidth: 1,
    borderColor: palette.brass,
    borderRadius: radius.md
  },
  completionTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  completionArtifact: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center"
  },
  completionSealBadge: {
    position: "absolute",
    right: -4,
    bottom: -2,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.cloth
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
