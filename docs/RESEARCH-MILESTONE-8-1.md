# Research — Milestone 8.1 (Preview/Peek UX)

Corrective research pass for Prompt 8.1's Preview rescue. Sources were
fetched live via web search during this milestone; none are reconstructed
from memory. Each entry records the source, the finding, its relevance to
FlipStitch, and the concrete design decision it changed.

## Nielsen Norman Group — "Modes in User Interfaces: When They Help and When
They Hurt Users"
<https://www.nngroup.com/articles/modes/>

**Finding:** A mode is a state in which the same user input produces a
different result than it would in another state. Modes are dangerous
specifically when they are poorly signaled — the user commits an action
believing they are in one mode while the system is in another ("mode
error" or "mode slip"), and the classic failure mode is Caps Lock: the same
keystroke means something different and the system gave no clear signal
before the mistake happened.

**Relevance:** Milestone 8's Preview was exactly this failure shape. The
board's visible side (`previewSide ?? game.activeSide`) and the status copy
(driven by `game.activeSide` alone, updated only on real moves) could
disagree — the hoop showed FRONT while the message said "Back side..."
Tapping a hole in that moment would not have done what the visible board
suggested, because Preview already blocked input — but the underlying
confusion (which mode am I in, and does it match what I see) is precisely
NN/g's mode-error shape.

**Design decision:** Peek is deliberately *not* a mode that changes what the
board's primary layer shows. `game.activeSide` — the one fact that
determines what a tap would do — is always rendered by the same layer using
the same visual language, whether or not Peek is open. See
`docs/PREVIEW-INTERACTION.md`.

## Nielsen Norman Group — "Visibility of System Status" (Usability Heuristic
#1)
<https://www.nngroup.com/articles/visibility-system-status/>

**Finding:** The system should always keep users informed about what is
going on through appropriate, timely feedback, so a user can tell whether
their last action succeeded and what state the system is currently in.

**Relevance:** FlipStitch's entire mechanic depends on the player always
knowing "which side is my needle actually on." Milestone 8's design let a
temporary inspection state overwrite the only visible indicator of that
fact (the hoop's rendered side and its FRONT/BACK label), with no separate,
persistent indicator of the *real* game state during Preview.

**Design decision:** Two independent, permanently visible status strings —
`PLAYING · FRONT/BACK` (always the real `activeSide`, rendered on the
play layer, never touched by Peek) and `PEEKING · FRONT/BACK` (only present
while `peekSide` is non-null) — see `src/game/peek.ts`. `PLAYING` is never
replaced by `PEEKING`; they can appear together but the first never
disappears.

## Apple Human Interface Guidelines — Feedback
(referenced via Apple Developer Human Interface Guidelines documentation)

**Finding:** Every action should produce a clear reaction — visual, haptic,
or auditory — and that feedback should communicate both the current state
and the result of the action just taken, not just that "something
happened."

**Relevance:** Milestone 8's `handlePreview` emitted the same `sideChanged`
feedback event used for a real stitch (`hoop-flip` sound + `soft` haptic),
so the feedback channel told the player "a real side change just happened"
even when it hadn't.

**Design decision:** Peek now emits a distinct, new `peekToggled` event
(`src/feedback/mapping.ts`) that is deliberately silent (no sound, no
haptic) rather than reusing `sideChanged`'s cues. This was a direct
implementation choice, not a placeholder: the milestone did not add a new
subtle "peek" sound because a silent transition reads more clearly as
"nothing about the real game state just happened" than any new cue would —
see "Do not use the normal gameplay flip for Preview" in `docs/PREVIEW-INTERACTION.md`.

## Apple Human Interface Guidelines — Modality
<https://developer.apple.com/design/human-interface-guidelines/modality>

**Finding:** A modal presentation takes people out of their current context
and requires an explicit action to dismiss; it should be used only when it
gives a clear benefit, should stay simple and short, and must always have
an obvious, easy way out.

**Relevance:** Preview already had an exit path (tap Preview again, now
labeled "Return"), but its *entry* used the same transform and sound as a
real, permanent state change, undercutting the "this is temporary and
reversible" framing modality guidance calls for.

**Design decision:** Peek's control label is dynamic and names the exact
action available right now — `Peek Front` / `Peek Back` when idle, `Return
to Front` / `Return to Back` while peeking (`peekControlLabel` in
`src/game/peek.ts`) — so the exit is never a guess, and the toolbar button's
`active` visual state is unambiguous while peeking.

## Apple Human Interface Guidelines — Motion
<https://developer.apple.com/design/human-interface-guidelines/motion>

**Finding:** Motion should be optional — respect the reduce-motion
accessibility preference and never rely on animation as the sole way to
communicate important information; when animations are turned off, replace
them with something that still preserves meaning (a cross-fade or static
transition), not a silent skip.

**Relevance:** Milestone 8's real-flip animation (`animateSwap`,
`flipScale`) was reused for Preview too, and reduced motion for both was
handled by the same code path — collapsing the two into "animation on/off"
without asking whether reduced motion should still communicate the PLAY vs.
PEEK distinction.

**Design decision:** Peek never uses `animateSwap`'s flip transform at all
(real stitches are the only thing that flips the hoop); the Peek panel
appears/disappears as a discrete state change, which is automatically
reduced-motion-safe without a separate code path, while `PLAYING`/`PEEKING`
labels, the noninteractive board state, and the needle anchor note are
unaffected by the motion setting — meaning is preserved regardless of
whether the (currently minimal) entrance treatment plays.

## Mobile game control guidance (general, cross-referenced across the above
Apple sources plus platform-agnostic HIG-style guidance)

**Finding:** Temporary inspection views in touch interfaces should look and
behave differently from primary interactive surfaces — reduced contrast,
suppressed affordances (no glow/highlight cues that invite a tap), and
explicit "read-only" signaling — so a player never taps expecting an action
that a read-only view cannot perform.

**Relevance:** The shipped Preview board looked identical to the normal
gameplay board (same glow, same node targets sized for tapping), which
invites tapping something that is explicitly blocked.

**Design decision:** The Peek panel (`PeekLayer` in
`src/components/HoopBoard.tsx`) removes legal-move glow, removes the
needle, uses muted outline holes instead of filled tappable dots, and is
marked `accessibilityElementsHidden`/non-interactive; the underlying play
layer dims and its holes are also disabled and hidden from the
accessibility tree while Peek is open, so nothing on screen looks tappable
during a Peek.

---

## Summary of decisions this research changed

| Research finding | Decision |
|---|---|
| Mode errors need a hard visual/semantic boundary between modes | `peekSide` is a value structurally separate from `GameState`; the play layer always renders `activeSide` |
| Visibility of system status must never lapse | Persistent `PLAYING · X` label, independent of Peek |
| Feedback should describe the actual result of an action | New silent `peekToggled` event replaces reused `sideChanged` |
| Modal-style temporary states need an unambiguous exit | Dynamic `Peek X` / `Return to X` control label |
| Motion must be optional without losing meaning | Peek never uses the real-flip transform; state, not animation, carries the meaning |
| Inspection surfaces must not look actionable | Peek panel strips glow, needle, and interactive holes; accessibility marks it read-only |
