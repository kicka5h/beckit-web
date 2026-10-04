import { describe, expect, it } from "vitest";

import { createBlock } from "./block.ts";
import { measureBlocks, measureText, readingLevelOf } from "./readability.ts";

describe("measureText", () => {
  it("counts words, sentences and words outside the familiar list", () => {
    expect(measureText("The cat sat in the sun. Then it slept.")).toEqual({
      words: 9,
      difficultWords: 0,
      sentences: 2,
    });
  });

  it("treats regular forms of familiar words, possessives and numbers as familiar", () => {
    const { difficultWords } = measureText("Mother's boxes were carried 12 miles, jumping.");
    expect(difficultWords).toBe(0);
  });

  it("counts unfamiliar words as difficult", () => {
    expect(measureText("Photosynthesis requires chlorophyll.").difficultWords).toBe(3);
  });

  it("ends a sentence at a line with no closing punctuation", () => {
    expect(measureText("Chapter One\nThe ferry left. “Wait!” she said.").sentences).toBe(3);
  });

  it("ends no sentence at decimals, initials or punctuation inside a sentence", () => {
    expect(measureText("It cost 3.5 dollars in the U.S. today. Then it rose.").sentences).toBe(2);
  });

  it("ignores empty lines", () => {
    expect(measureText("\n\n").words).toBe(0);
  });
});

describe("measureBlocks", () => {
  it("adds up each block, each its own paragraph", () => {
    const blocks = [createBlock("The ferry left."), createBlock("It was early")];
    expect(measureBlocks(blocks)).toEqual({ words: 6, difficultWords: 1, sentences: 2 });
  });
});

describe("readingLevelOf", () => {
  it("reads N/A below two sentences", () => {
    expect(readingLevelOf(measureText("One short sentence."))).toBeUndefined();
  });

  it("rates short sentences of familiar words as early grades", () => {
    expect(readingLevelOf(measureText("The cat sat in the sun. Then it slept."))?.label).toBe(
      "4th grade or lower",
    );
  });

  it("adds the adjustment once difficult words pass 5%", () => {
    const stats = { words: 100, difficultWords: 6, sentences: 5 };
    expect(readingLevelOf(stats)?.score).toBeCloseTo(0.1579 * 6 + 0.0496 * 20 + 3.6365);
  });

  it("maps scores to the formula's levels", () => {
    /** The level of 1,000 words with `difficultPercent` difficult and `wordsPerSentence` per sentence. */
    function levelFor(difficultPercent: number, wordsPerSentence: number): string | undefined {
      const stats = {
        words: 1000,
        difficultWords: difficultPercent * 10,
        sentences: 1000 / wordsPerSentence,
      };
      return readingLevelOf(stats)?.label;
    }
    expect(levelFor(0, 105)).toBe("5th–6th grade");
    expect(levelFor(0, 130)).toBe("7th–8th grade");
    expect(levelFor(20, 10)).toBe("9th–10th grade");
    expect(levelFor(25, 10)).toBe("11th–12th grade");
    expect(levelFor(40, 10)).toBe("College");
  });
});
