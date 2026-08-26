/**
 * Collection 01 — Day & Night.
 *
 * The first handcrafted collection: one continuous learning arc, split into a
 * light half and a dark half. All display copy the gallery shows for this
 * collection lives here, never in a screen.
 */
import type { CollectionSource } from "../../types.ts";
import { chapterOneFirstLight } from "./chapter-01-first-light.ts";
import { chapterTwoAfterDark } from "./chapter-02-after-dark.ts";

export const dayAndNight: CollectionSource = {
  id: "day-and-night",
  title: "Day & Night",
  subtitle: "Collection One",
  description:
    "One thread, two sides. Follow the sampler down the page — each finished hoop hands its thread to the next.",
  order: 1,
  theme: { accent: "gold", motif: "Sunrise rays on the front, moonlit returns on the back." },
  chapters: [chapterOneFirstLight, chapterTwoAfterDark]
};
