/**
 * Attempt lifecycle.
 *
 * An attempt is one play-through of one level:
 *
 *   1. An attempt starts when a level is opened (`level_opened`) or when the
 *      player restarts (`restart_used` closes the old attempt and a new
 *      attempt begins with the next event that carries its id).
 *   2. An attempt ends with exactly one terminal event:
 *      - `level_completed` — the attempt was finished successfully.
 *      - `level_exited` — the player left an unfinished attempt.
 *      - `restart_used` — the player abandoned the attempt in place or
 *        replayed it after completion.
 *
 * `LevelVisit` is the pure state machine for one attempt. Every transition is
 * idempotent, so repeated effect setup (React StrictMode-style) can never
 * double-record an open, and completion can never also produce an exit.
 *
 * All events recorded by gameplay carry the attempt id so reports can group
 * stitches, invalid moves, and tool use by attempt.
 */

export type VisitEvent = {
  name: "level_opened" | "level_exited" | "level_completed" | "restart_used";
  levelId: string;
  attemptId: string;
  completed?: boolean;
};

type Phase = "active" | "completed" | "ended";

let attemptCounter = 0;

/** Builds a unique attempt id for a session and level. */
export function makeAttemptId(sessionId: string, levelId: string): string {
  attemptCounter += 1;
  return `${sessionId}:${levelId}:a${attemptCounter}`;
}

/** Test helper: resets the id counter for deterministic ids. */
export function resetAttemptCounter(): void {
  attemptCounter = 0;
}

export class LevelVisit {
  private phase: Phase = "active";
  private opened = false;
  private readonly levelId: string;
  private readonly attemptId: string;

  constructor(levelId: string, attemptId: string) {
    this.levelId = levelId;
    this.attemptId = attemptId;
  }

  get id(): string {
    return this.attemptId;
  }

  get isActive(): boolean {
    return this.phase === "active";
  }

  /** Idempotent: returns the open event at most once per attempt. */
  open(): VisitEvent | null {
    if (this.opened) return null;
    this.opened = true;
    return { name: "level_opened", levelId: this.levelId, attemptId: this.attemptId };
  }

  /** Idempotent: closes the attempt as completed. No exit follows. */
  complete(): VisitEvent | null {
    if (this.phase !== "active") return null;
    this.phase = "completed";
    return { name: "level_completed", levelId: this.levelId, attemptId: this.attemptId, completed: true };
  }

  /** Idempotent: ends the attempt, returning an exit only if unfinished. */
  end(): VisitEvent | null {
    if (this.phase !== "active") return null;
    this.phase = "ended";
    return { name: "level_exited", levelId: this.levelId, attemptId: this.attemptId, completed: false };
  }

  /**
   * Restarts the level. Allowed while active (abandons the attempt) and after
   * a completion (replay); both begin a fresh attempt. No-op after the attempt
   * was exited. The restart event is recorded for the closing attempt so tool
   * usage is observable; a recorded completion stays a separate terminal event.
   */
  restart(nextAttemptId: string): { abandoned: VisitEvent; next: LevelVisit } | null {
    if (this.phase === "ended") return null;
    this.phase = "ended";
    return {
      abandoned: { name: "restart_used", levelId: this.levelId, attemptId: this.attemptId },
      next: new LevelVisit(this.levelId, nextAttemptId)
    };
  }
}
