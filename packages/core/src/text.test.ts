import { describe, expect, it } from "vitest";

import { createBlock } from "./block.ts";
import { countBlockWords, countWords } from "./text.ts";

describe("countWords", () => {
  const cases: [string, number][] = [
    ["", 0],
    ["  ", 0],
    ["The ferry left.", 3],
    ["Mira's well-worn bag", 3],
    ["* * *", 0],
    ["1999 was early", 3],
  ];

  it.each(cases)("counts %j as %i words", (text, wordCount) => {
    expect(countWords(text)).toBe(wordCount);
  });
});

describe("countBlockWords", () => {
  it("sums the words in every block", () => {
    expect(countBlockWords([createBlock("one two"), createBlock("three")])).toBe(3);
  });
});
