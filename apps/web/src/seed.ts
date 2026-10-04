import { createChapter, newBlock, type Chapter } from "@beckit/core";

/** A starter chapter until storage arrives in milestone 2. */
export const seedChapter = (): Chapter =>
  createChapter("The Crossing", [
    newBlock("The Crossing", { type: "heading", level: 1 }),
    newBlock(
      "The ferry left at dawn whether or not anyone was on it. Mira had learned that the hard way her first winter, standing on the pier with her bag and her excuses while the wake folded shut behind it.",
    ),
    newBlock(
      "This morning she was early. The river was the color of pewter, and the gulls had not yet decided whether the day was worth their trouble.",
    ),
  ]);
