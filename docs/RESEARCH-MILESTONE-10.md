# Milestone 10 Research — Needle, Through-Cloth Peek, Interaction Clarity

Prompt 10's problem is not a puzzle-difficulty problem. It is a legibility
problem: the needle looked randomly placed, and Peek looked like a second,
misaligned hoop. This document records what was actually researched before
the redesign, honestly separating **sources fetched and read this session**
from **well-established design knowledge applied without a fresh citation**.
No quote below is invented; where a live fetch failed, that failure is
stated rather than papered over with a fabricated quote.

---

## Sources fetched and read this session

### 1. Nielsen Norman Group — "Direct Manipulation" (nngroup.com/articles/direct-manipulation)

**Finding.** Direct manipulation is defined as an interaction style where
"users act on displayed objects of interest using physical, incremental,
and reversible actions whose effects are immediately visible on the
screen." Two properties matter most for FlipStitch: **visibility** (system
status is always visible, so a result "confirms" via a change the user can
see, not via a value they have to remember) and **continuous
representation** (the objects of interest stay constantly visible and
accessible, so recognition replaces recall).

**FlipStitch implication.** The needle *is* the "object of interest." Its
old rendering broke visibility — nothing about the frame after a stitch
showed *how* the needle got there, so the player had to recall/infer the
rule ("stitches flip the side") instead of seeing it happen. Peek's old
floating panel broke continuous representation twice over: the real needle
disappeared, and the inspected pattern appeared in a second, differently
positioned frame instead of staying registered to the object already on
screen (the hoop).

**Implementation decision affected.** Needle-travel-then-pierce-then-emerge
motion (Part B) exists specifically to make the *cause* of the side flip
visible, not just its *result*. Through-Cloth Peek's hard "same hoop bounds"
rule (Goal 15) exists specifically to preserve continuous representation of
the one object (the hoop) instead of introducing a second one.

### 2. Nielsen Norman Group — "Website Response Times: 3 Important Limits" (nngroup.com/articles/website-response-times)

**Finding.** Three response-time thresholds, verified via live fetch:
**0.1s** reads as instantaneous and is "essential for supporting direct
manipulation"; **1s** keeps the user's flow of thought unbroken, they
notice a delay but stay in control; **10s** is the outer edge of sustained
attention. The article's own framing: "a snappy user experience beats a
glamorous one."

**FlipStitch implication.** A stitch is a direct-manipulation act (tap a
hole, see a result), so its total animated feedback should sit close to the
0.1s "instantaneous" band and stay far under the 1s "flow" band — a slow
cutscene per stitch would itself become the next legibility problem this
milestone is trying to remove.

**Implementation decision affected.** The stitch motion budget: ~140ms
advance + the existing ~125ms flip-shrink + spring settle + ~110-120ms
emergence, landing the whole sequence in roughly 350-420ms end to end,
consistent with the prompt's 250-400ms target and justified against a real
source rather than picked arbitrarily. See "Stitch animation timeline"
below.

---

## Sources attempted, honestly reported as not retrievable

- **Apple Human Interface Guidelines — "Motion"**
  (developer.apple.com/design/human-interface-guidelines/motion). This page
  is a JavaScript-rendered single-page app; the fetch tool available this
  session returned only the page title, no body text. No claim below is
  attributed to a live read of this page. The widely-known, broadly
  documented HIG motion principles applied in this milestone — *motion
  should support meaning, not replace it*; *transitions should preserve a
  stationary frame of reference so the user never loses their place*; *an
  interface must remain fully meaningful with motion reduced or removed* —
  are treated in this document as established general design knowledge, not
  as a freshly-sourced quote. They are also already reflected in this
  repo's own `docs/DESIGN-BIBLE.md` §8 ("Never gate meaning on motion"),
  which predates this milestone and is the actual project-level source of
  truth being extended here.
- **Nielsen Norman Group — "Ten Usability Heuristics for User Interface
  Design"** and **"Match Between System and the Real World."** Both URLs
  returned HTTP 404 from the fetch tool this session (likely a stale or
  region-varying NN/g path). The heuristics referenced below — *visibility
  of system status*, *match between system and the real world*,
  *recognition rather than recall* — are Jakob Nielsen's well-established,
  widely-cited 1994 heuristics, applied here as general industry-standard
  knowledge, not as a quote from a page actually read this session.

**FlipStitch implication of the two failed fetches.** None — the
underlying, well-established principles are secure enough (decades of
citation, and already partially encoded in this repo's own design docs)
that acting on them without a fresh quote is reasonable. What is *not*
reasonable is inventing a quotation and attributing it to a URL that was
never actually read; this document draws that line explicitly instead of
blurring it.

**Implementation decisions affected (general knowledge, not fresh quotes).**
- *Visibility of system status* → the "PLAYING · &lt;side&gt;" pill remains a
  permanent, un-obscured fact about the board at all times (already a
  DESIGN-BIBLE rule; Milestone 10 keeps it and adds the needle itself as a
  second, always-visible status indicator).
- *Match between system and the real world* → the whole Through-Cloth Peek
  metaphor (embroidery held over a lightbox) and the needle's
  tip-through-eye-to-fabric construction are direct real-world metaphors,
  not abstract UI chrome.
- *Recognition rather than recall* → the needle's pose (Goal 5) is derived
  from the stitch that was just placed, so the player can *see* where the
  thread came from rather than having to remember it.

---

## Real embroidery (stab-method), applied as physical-metaphor knowledge

This is general craft knowledge, not a citation to a specific written
source, and is treated as such.

**Finding.** In stab-method embroidery, a threaded needle is pushed fully
through the fabric from one side, pulled taut on the far side, then pushed
back through at a different hole for the return stitch — the needle is
never "on" both sides at once, and the working thread's loose end always
trails from wherever the needle currently is. Held up to a light source
(a window, a lightbox), the weave of a natural-fiber fabric is thin enough
that the stitches already on the reverse side show through as soft shapes
under the visible top layer, without the fabric moving or the hoop turning.

**FlipStitch implication.** This maps almost exactly onto the two mechanics
this milestone rebuilds:
- **The needle** — "never on both sides at once, thread always trails from
  the needle" is precisely the invariant in Part A/D: the needle tip is
  always exactly `game.currentHole`, and the visible working thread always
  terminates at the needle eye, never floating unattached.
- **Peek** — "held to a light, the reverse shows through the same fabric
  without anything moving" is precisely Through-Cloth Peek: same hoop, same
  cloth, no second frame, no turning.

**Implementation decision affected.** The rejection of the old floating
mini-hoop (Part C) and the "lightbox" visual language (soft backlight wash,
translucency, no glow/glassmorphism) in `PeekOverlay`.

---

## Puzzle-game interaction, applied as design-pattern knowledge

Also general design-pattern knowledge (widely discussed in games-UX
writing and postmortems), not a citation to one specific fetched article.

**Finding, synthesized across *The Room*, *Monument Valley*, *Florence*,
and *Gorogoa*.** These games share a pattern: the object the player is
manipulating (a puzzle box, a path, a panel) stays the single, continuously
visible anchor of the scene. Alternate views (the underside of the box, the
other face of a Monument Valley structure) are reached by *manipulating
that same object* — rotating it, tapping it — never by opening a separate
inspection panel that replaces the scene. Tutorializing happens through the
object's own motion (a door visibly swings open) rather than through
instructional text laid over a static image.

**FlipStitch implication.** This is the strongest external validation for
rejecting the old floating Peek panel and for using needle motion (not
copy) to teach the flip rule. It is *not* a license to copy any specific
mechanic from these games — none of them have an embroidery-flip mechanic —
only their shared *architectural* pattern: one persistent object, alternate
views reached through it, motion carries the teaching.

**Implementation decision affected.** Through-Cloth Peek stays inside the
hoop's own bounds rather than opening a second panel; the needle's
emergence animation (Goal 11) is the primary teacher of "every stitch sends
the needle to the other side," not the message-box copy.

---

## Decisions this research does *not* justify

To keep this document honest about its own limits:
- It does not establish specific millisecond values for the pierce/emerge
  sub-phases beyond the overall 0.1s/1s framing above — those were tuned by
  eye against the existing `animateSwap` timings already in the codebase
  (125ms shrink + spring settle), not derived from a source.
- It does not include any real playtester data. Every comprehension-test
  result in `docs/MILESTONE-10-QA.md` is an author self-assessment against
  the redesigned visuals, explicitly labeled as such (N=0 external
  testers), matching this milestone's own instruction not to recruit the
  real gate cohort yet.
