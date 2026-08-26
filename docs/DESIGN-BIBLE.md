# FlipStitch Design Bible — The Living Sampler

The single source of truth for how FlipStitch looks, feels, and reasons about
its own interface. If a screen contradicts this document, the screen is wrong.

## 1. The fantasy

FlipStitch is an **heirloom embroidery book coming alive**. It should feel
authored by a small studio, not assembled from a mobile UI kit. Every surface is
made of real craft materials: dyed fabric, paper pattern pieces, a wooden hoop, a
brass needle, thread under tension, ink marks, small hand-drawn imperfections.

The rule that governs everything:

> One continuous thread completes two patterns. Every valid stitch forces the
> player onto the opposite side.

FlipStitch is **not** a maze, sorting, tile-flip, swipe, timer, or lives game. A
wrong choice traps the thread *logically*, then offers unlimited Undo or Restart.

## 2. Why the old UI read as generic

Honest audit of the pre-Milestone-5 app. The hoop artwork was already strong; the
"AI-slop" was concentrated in three places:

1. **The gallery** was a two-column card grid with a number badge and a status
   pill per card — the archetypal template dashboard.
2. **The gameplay screen stated the side three times**: a header badge
   ("STITCH ON FRONT"), the hoop's own label, and the progress row — redundant
   chrome competing with the board.
3. **A gear emoji (⚙)** stood in for the settings identity.

Supporting offenders: tiny all-caps labels used for ordinary content, repeated
white rounded rectangles with the same shadow, and a generic black "Continue"
card. These are removed, not re-skinned into a new trend. We explicitly reject
glassmorphism, neon gradients, floating blobs, and gratuitous 3D. **Every visual
element must have a reason.**

## 3. Material language

| Material | Where it lives | Implementation |
|---|---|---|
| Dyed fabric | hoop cloth, warm grounds | SVG weave `Pattern`, paper tones |
| Paper pattern | locked levels, panels | folded-corner + dashed border |
| Wooden hoop | gameplay + thumbnails | layered `wood` gradient rings |
| Brass needle | active side, wordmark, tools | `gold`/`goldDeep` metal strokes |
| Thread tension | inner rim, rails, stitches | thread-coloured strokes |
| Ink marks | text, holes | dark blue-black `ink` |
| Hand imperfection | marks, seals | slightly irregular SVG paths |

Core artwork is **code-native SVG + React Native** (`react-native-svg`). We do
**not** use AI-generated raster art, stock illustration, emoji, random texture
images, or copied icon packs for the main UI.

## 4. Colour — the Living Sampler palette

Defined once in `src/theme/tokens.ts`. Historical keys (`linen`, `coral`, `iris`,
`ink`) are retained so the whole app re-skins from one file; canonical names are
exported as `palette` and `thread`.

| Role | Token | Hex |
|---|---|---|
| Warm paper | `linen` / `palette.paper` | `#F4ECDD` |
| Paper deep / shadow | `linenDeep` / `linenShadow` | `#E7DAC4` / `#D3C1A4` |
| Cloth | `cloth` | `#FFFDF8` |
| Deep indigo ink (text) | `ink` / `palette.inkBlue` | `#1C2333` |
| Soft ink | `inkSoft` | `#54586A` |
| **Front thread** — brick/vermilion | `thread.front` | core `#C0442E`, deep `#97301D` |
| **Back thread** — deep indigo | `thread.back` | core `#38477F`, deep `#232E5C` |
| Brass / ochre | `palette.brass` / `ochre` | `#B07A22` / `#C58A2E` |
| Brass deep | `goldDeep` | `#8A5E14` |
| Muted sage | `palette.sage` / `sageDeep` | `#6F7E5C` / `#556247` |
| Gold (seal) | `gold` | `#F4B942` |
| Slate-teal accent | `teal` / `tealDeep` | `#2F9C95` / `#1F6F6B` |
| Error | `danger` | `#B23A46` |

Rules:
- **Never identify a side by hue alone.** Front = solid stitch; back = dashed
  stitch; both carry a written label and dye the hoop's inner rim.
- Every colour behind text or on a control must clear **WCAG AA 4.5:1** — proven
  by `src/theme/contrast.test.ts` (normal-text pairs + the new palette pairs).
- State colours: normal (paper/cloth), pressed (opacity + slight scale),
  disabled (0.34–0.6 opacity), locked (paper-deep + dashed), error (`danger`
  border, white text on fill), completed (sage node + brass seal).

## 5. Typography

- **Fraunces** — editorial display, for the wordmark and collection/level/section
  titles. Weights 600/700/800.
- **Atkinson Hyperlegible Next** — all controls and small UI text. Weights
  400/500/600/700.
- Both SIL OFL 1.1; verified to bundle on Android/iOS/Web (see research doc).
- Display face is **never** used for dense small text; body face is **never**
  used for hero titles.
- The **wordmark is custom vector lettering**, not a typed heading: a pure-SVG
  stitch mark (front thread crossing into back through a brass needle) locked to a
  two-tone "Flip"(indigo)/"Stitch"(vermilion) name — the mark itself states the
  rule. See `src/components/Wordmark.tsx`.

## 6. Iconography

One code-native set: `src/components/Icon.tsx` — needle, thread, front, back,
undo, preview, hint, locked, completed, trapped, chapter, settings; plus the
Wordmark stitch mark and the completion seal. Rules:

- Every icon is understandable **without** its text label; the label stays for
  accessibility.
- **No** Unicode emoji, icon fonts, generic gears, or unmodified Material/SF
  symbols as identity. `settings` is a spool, not a gear.
- Decorative-only icons are not allowed; each mark maps to a meaning or action.

## 7. Screen grammar

- **Gallery = a chapter of a sampler book.** A continuous thread on the rail
  connects level "stops"; each stop shows the level's own stitched vignette
  (reusable grammar for hundreds of future levels, not bespoke art). Locked =
  folded/dashed pattern piece; completed = finished-stitch node; current = the
  one focus, with an integrated Continue/Begin tag (no black card). Settings is
  visually secondary (top-right spool). Progress is a woven stitch row, not a
  dashboard.
- **Gameplay = the hoop is the centre.** Side identity lives on the hoop (dyed
  rim, solid/dashed stitches, one woven label). Hierarchy: (1) needle + active
  side, (2) unfinished pattern, (3) the next decision, (4) progress + tools,
  (5) secondary info. Tools are custom sewing marks; irrelevant controls soften
  away (the trap card owns Undo/Restart while stuck).
- **Completion = a crafted artifact.** The finished front+back sampler settles
  with a brass seal — no confetti, no coins. Replay / Gallery / Next preserved.
- **Settings = a workbox.** Sewing-icon section headers; sound, haptics,
  reduced-motion status, local playtest report, export/clear, progress reset,
  about/licence. No accounts, cloud, ads, purchases, streaks, or analytics.

## 8. Motion

- Flip is a physical scale-x swap + settle spring (`GameScreen.animateSwap`).
- **Reduced motion** (system): flips commit instantly; completion appears without
  animation; the trap alert is static. Never gate meaning on motion.

## 9. Non-negotiables

Do not add: new collections/levels, daily puzzles, streaks, ads, purchases,
accounts, cloud saves, external analytics, cosmetics, social sharing, a new
mechanic, or a solver rewrite. Do not remove accessibility to create difficulty.
