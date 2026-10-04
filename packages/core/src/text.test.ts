import { describe, expect, it } from "vitest";
import { newBlock } from "./block.ts";
import { countBlockWords, countWords } from "./text.ts";

describe("countWords", () => {
  it.each([
    ["", 0],
    ["  ", 0],
    ["The ferry left.", 3],
    ["Mira's well-worn bag", 3],
    ["* * *", 0],
    ["1999 was early", 3],
  ])("%j has %i words", (text, words) => {
    expect(countWords(text)).toBe(words);
  });

  it("sums blocks", () => {
    expect(countBlockWords([newBlock("one two"), newBlock("three")])).toBe(3);
  });
});
