# Milestone 2 QA evidence

Checked on August 26, 2026.

## Automated gates

| Gate | Result |
| --- | --- |
| Pure engine, solver, progression, layout, and contrast tests | Pass |
| TypeScript strict check | Pass |
| Expo Doctor | 21/21 checks pass |
| Android production export | Pass |
| iOS production export | Pass |
| Web static export | Pass |

The full-flow test completes all ten authored solutions in sequence. It confirms level two remains unlocked after serialized progress is reloaded, exercises a hard-level dead end with Undo and Hint recovery, and completes the final level.

## Responsive layout evidence

The pure layout checks use the exact requested portrait viewports:

| Layout | Viewport | Game hoop | Gallery |
| --- | ---: | ---: | ---: |
| Small Android phone | 360 × 640 | 269 pt | 1 column |
| Large Android phone | 412 × 915 | 364 pt | 1 column |
| iPhone portrait | 390 × 844 | 342 pt | 1 column |
| Tablet portrait | 820 × 1180 | 520 pt cap | 3 columns |

Large text forces a compact game layout and returns the gallery to one column. All interactive hole targets and controls remain at least 48 points/dp.

## Preview limitation

No Android emulator, iOS simulator, or attached phone is available in this workspace. The cloud browser also cannot reach the local static preview server. I therefore do not claim a real-device or screenshot pass. Preview evidence is limited to successful platform bundles, static route generation, exact viewport layout tests, and source review.

## Manual device pass still required

1. Open a clean install and confirm only level one is unlocked.
2. Complete level one and open level two from the completion reveal.
3. Kill and reopen the app; confirm level two remains the Continue target.
4. Open level nine, take the early branch, use Hint, Undo, and retry.
5. Preview the other side and confirm the needle never moves.
6. Complete level ten and confirm the final action returns to the full gallery.
7. Repeat with TalkBack and VoiceOver, large text, and reduced motion.
8. Check 360 × 640 Android, 412 × 915 Android, 390 × 844 iPhone, and 820 × 1180 tablet portrait layouts.
