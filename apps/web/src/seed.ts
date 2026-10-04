import { type Chapter, createBlock, createChapter } from "@beckit/core";

/** Creates a starter chapter, used until storage arrives in milestone 2. */
export function createSeedChapter(): Chapter {
  return createChapter("The Crossing", [
    createBlock("The Crossing", { type: "heading", level: 1 }),
    createBlock(
      "The ferry left at dawn whether or not anyone was on it. Mira had learned that the hard way her first winter, standing on the pier with her bag and her excuses while the wake folded shut behind it.",
    ),
    createBlock(
      "This morning she was early. The river was the color of pewter, and the gulls had not yet decided whether the day was worth their trouble.",
    ),
  ]);
}
