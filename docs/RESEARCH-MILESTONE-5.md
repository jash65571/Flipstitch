# Research — Milestone 5: The Living Sampler

Research done before touching the UI. Where a page rendered for retrieval it is
quoted; where a primary page was JavaScript-walled (Apple HIG, App Store) the
finding is drawn from search retrieval or established design knowledge and
labelled as such. Nothing below is copied — competitor art, logos, layouts,
wording, colours, and interactions are studied for principle only.

## How this was gathered

- **Fetched and readable:** Braille Institute Atkinson announcement; Afterburn /
  Railbound interview.
- **Search-retrieved (primary page JS-rendered):** Apple HIG game controls;
  Apple Design Awards 2023–2025 winners; The Witness design commentary;
  Knotwords / Zach Gage design method.
- **Design knowledge (well-documented craft, no single fetched source):**
  Monument Valley, Song of Bloom, Good Sudoku, general sampler/embroidery craft.

Honesty note: I could not load the Meowdoku or stitch. App Store pages directly
(JS walls); those two are the lightest-evidence references and are marked.

---

## Reference log (12)

### 1. Apple HIG — *Designing for games* / *Game controls*
- **Clarity:** "If the UI stays clear, the input feels obvious, and the game
  still works one-handed, it belongs on mobile." Keep the most important
  controls visible; put action where the hand reaches.
- **Personality:** HIG is neutral by design — personality is the developer's job;
  the guidance is about not fighting the interface.
- **Progression:** N/A (platform guidance) but stresses adjustable text and
  remappable/scalable controls so difficulty is never an accessibility barrier.
- **Learn:** Enforce ≥44 pt touch targets, clear contrast, Dynamic Type, and a
  one-handed reach test. Our hoop is thumb-reachable; tools are ≥48 dp.
- **Avoid copying:** Nothing to copy; it is a rulebook, not a look.
- Source: https://developer.apple.com/design/human-interface-guidelines/game-controls

### 2. *stitch.* — Lykke Studios (Apple Design Award 2023)
- **Clarity:** Calm, single-focus cross-stitch board; the craft *is* the UI.
- **Personality:** Handmade thread texture, warm tactility — the reference
  closest to our fantasy, which is exactly why we must not imitate its palette
  or grid. *(App Store page JS-walled; from ADA listing + design knowledge.)*
- **Progression:** Gentle, collection-based, no punishment.
- **Learn:** A needlework game can win on warmth and restraint, not spectacle.
- **Avoid copying:** Its specific colourway, board grid, and mascot-free tone —
  we differentiate with the two-sided hoop and paper-and-ink language.
- Source: https://apps.apple.com/us/app/stitch/id1581052096

### 3. *Rytmos* — Floppy Club (Apple Design Award 2024)
- **Clarity:** One drag gesture; each solved puzzle *adds to an evolving song*,
  so feedback is intrinsic, not a score readout.
- **Personality:** World-music identity; minimalist geometric planets.
- **Progression:** New elements layer in per level; difficulty rises by adding
  voices, not by adding punishment.
- **Learn:** Reward can be the artifact itself (a finished piece), not coins —
  directly informs our confetti-free completion reveal.
- **Avoid copying:** Its geometric/space theme and audio-first loop.
- Source: https://developer.apple.com/design/awards/2024/

### 4. *puffies.* — Lykke Studios (ADA 2025 finalist, Inclusivity)
- **Clarity:** Assemble puffy-sticker puzzles; tactile nostalgia with legible
  pieces.
- **Personality:** 2,500+ hand-drawn stickers by local artists — authored, not
  asset-store.
- **Progression:** Collection/album framing.
- **Learn:** "Authored by a small studio" reads through hand-made assets; validates
  our code-native SVG-over-stock-art rule.
- **Avoid copying:** Sticker-album metaphor and raster art style.
- Source: https://developer.apple.com/design/awards/2025/

### 5. *Art of Fauna* — Klemens Strasser (ADA 2025 Inclusivity winner)
- **Clarity:** Vintage wildlife puzzles solvable **two ways — rearranging the
  image on the *front* of a card, or re-ordering the text on the *back*.**
- **Personality:** Museum-plate warmth; deeply accessible.
- **Progression:** Curated, calm.
- **Learn:** The single most relevant winner: a **front/back** object as the core
  metaphor, with accessibility as a first-class solving path — mirrors our "one
  thread, two sides" and our rule that a11y labels always expose valid moves.
- **Avoid copying:** Its card-flip mechanic and naturalist illustration.
- Source: https://developer.apple.com/design/awards/2025/

### 6. *Railbound* — Afterburn (visual-development interview)
- **Clarity:** Geometry-based outlines over trendy post-process for crisp,
  readable puzzle pieces: *"we actually found best results when using
  tried-and-true geometry-based outlines."*
- **Personality:** French-comic art direction; **over half of dev time went into
  the visual style.**
- **Progression:** *"gentle difficulty progression — but … some spicy levels for
  demanding players appearing later."*
- **Learn:** Invest disproportionately in identity; choose durable techniques
  over trends (our reason to avoid glassmorphism/neon).
- **Avoid copying:** Comic-book rendering and railway theme.
- Source: https://gameworldobserver.com/2022/06/03/afterburn-railbound-making-of-interview

### 7. *The Witness* — Jonathan Blow
- **Clarity:** Wordless teaching — "simple puzzles are placed next to slightly
  more difficult ones, each of which wordlessly teaches the player new rules."
- **Personality:** Confident restraint; Blow deliberately avoids "a little
  character telling you every obvious thing over and over."
- **Progression:** Adjacency teaches; the player teaches themselves.
- **Learn:** Justifies our guidance ramp — levels 1–2 teach with glow, level 3+
  trust the player to read the pattern. Difficulty from *understanding*, not
  hidden information.
- **Avoid copying:** Line-panel motif and open-world framing.
- Source: https://www.gamedeveloper.com/design/how-jonathan-blow-found-the-roots-of-i-the-witness-i-inside-i-braid-i-

### 8. *Knotwords* / *Good Sudoku* — Zach Gage & co.
- **Clarity:** The **"three reads"** method — first glance conveys the essentials
  and pulls you in; second adds supporting detail without overwhelming; third is
  the full depth. "The focus remains firmly on the gameplay."
- **Personality:** Quiet, typographic, confident.
- **Progression:** Deterministic, fair; hints teach rather than solve.
- **Learn:** Our staged hint (concept → region → exact) is a direct application
  of "three reads" to help escalation.
- **Avoid copying:** Its crossword grid and monochrome type system.
- Sources: https://mgmarlow.com/words/2023-01-15-case-study-zach-gage/ ,
  http://playknotwords.com/presskit/

### 9. Atkinson Hyperlegible Next — Braille Institute (Feb 2025)
- **Clarity:** Prioritises **character distinction over typographic uniformity**;
  designed for readers across the vision spectrum; 7 weights, variable + mono.
- **Personality:** Humane, neutral, trustworthy — a good foil to an expressive
  display face.
- **Learn:** Adopted for all controls and small UI text; the legibility payoff is
  strongest exactly where FlipStitch shows dense state (side labels, counts).
- **Licensing:** Free via Google Fonts; SIL OFL 1.1. Verified in-repo (below).
- Source: https://www.brailleinstitute.org/about-us/news/braille-institute-launches-enhanced-atkinson-hyperlegible-font-to-make-reading-easier/

### 10. *Monument Valley* — ustwo *(design knowledge)*
- **Clarity:** One object of attention per screen; generous negative space.
- **Personality:** Architectural, muted-pastel, print-poster restraint.
- **Progression:** Short authored chapters; a book you move through.
- **Learn:** Our gallery becomes a *chapter*, not a dashboard; one focus state.
- **Avoid copying:** Isometric architecture and its exact pastel palette.

### 11. *Song of Bloom* — Philipp Stollenmayer *(design knowledge)*
- **Clarity:** Hand-drawn frames; each screen its own tiny world.
- **Personality:** Sketchbook intimacy; unmistakably one author.
- **Learn:** Small hand-drawn imperfection signals authorship — our SVG marks
  carry slight irregularity rather than mechanical perfection.
- **Avoid copying:** Its surreal narrative and sketch style.

### 12. *Meowdoku* — App Store *(lightest evidence; page JS-walled)*
- **Clarity/Personality:** A charming, character-led sudoku; noted as a
  cozy-puzzle comparator only.
- **Learn:** Warmth can carry a logic game — but mascots risk twee; we choose
  material warmth (fabric/paper) over a character.
- **Avoid copying:** Its cat mascot and number-grid chrome.
- Source: https://apps.apple.com/us/app/meowdoku/id6761760135

---

## Font decision & licensing (verified in-repo)

Evaluated replacing Bricolage Grotesque + Manrope with **Fraunces** (editorial
display) + **Atkinson Hyperlegible Next** (UI/body), per the brief.

Verification (not guessed):

| Check | Fraunces | Atkinson Hyperlegible Next |
|---|---|---|
| expo-google-fonts package | `@expo-google-fonts/fraunces@0.4.1` ✓ | `@expo-google-fonts/atkinson-hyperlegible-next@0.4.1` ✓ |
| Weights we load | 600, 700, 800 | 400, 500, 600, 700 |
| License | `MIT AND OFL-1.1` | `MIT AND OFL-1.1` |
| Per-weight bundle | ~72 KB/ttf | ~48 KB/ttf |
| Android / iOS / Web | via expo-font `useFonts` (native) + web `@font-face` | same |
| Web export bundles the ttf | **verified** — 7 ttf in `dist/web` | verified |
| Large text | scales with Dynamic Type / fontScale | designed for legibility at size |
| Small-size clarity | display face reserved for titles only | body face built for distinction |

Bundled OFL texts live in `assets/licenses/Fraunces-OFL.txt` and
`assets/licenses/AtkinsonHyperlegibleNext-OFL.txt`; About copy updated.
Bricolage/Manrope packages removed.

**Decision:** adopt both. Both are technically suitable on SDK 57 (confirmed by a
clean `expo export --platform web` with the ttf present). Rejected alternative:
keeping Bricolage/Manrope — dropped because Fraunces gives the "embroidery book"
editorial voice and Atkinson gives a measurable legibility win in dense UI.

## Accessibility findings applied

- Front/back never rely on colour alone: front thread is **solid**, back is
  **dashed**; both carry a written side label and a thread-dyed rim.
- Guidance reduction dims only the *visual* glow; screen-reader labels still
  announce every valid move (a11y is never the difficulty lever).
- Staged hints keep the exact answer opt-in (Witness/Gage principle).
- All new palette pairs pass WCAG AA (see `src/theme/contrast.test.ts`).
- Trapped-thread state is an `accessibilityRole="alert"` with Undo/Restart.

## Device / platform risks

- **Font white-screen risk:** `RootLayout` returns `null` until fonts resolve; a
  bad import would blank the app. Mitigated by verifying packages resolve and by
  a passing web export before commit.
- **S25 Ultra / tall Android:** hoop sizing capped and floored (`layout.ts`
  tests) so the board stays large but never overflows.
- **Large text (fontScale ≥ 1.4):** sampler journey is a single vertical column,
  so text wraps instead of breaking a grid (covered by `gallery-layout.test.ts`).
- **Web SVG parity:** all art is `react-native-svg`, which renders on web; the
  export SSR-renders every route without throwing.
- **No hardware:** device/emulator and VoiceOver/TalkBack hardware testing was
  **not** performed this milestone; see `MILESTONE-5-QA.md`.
