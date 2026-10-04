import { describe, expect, it } from "vitest";

import { wordsOf } from "./text.ts";

describe("wordsOf", () => {
  const cases: [string, number][] = [
    ["", 0],
    ["  ", 0],
    ["The ferry left.", 3],
    ["Mira's well-worn bag", 3],
    ["* * *", 0],
    ["1999 was early", 3],
  ];

  it.each(cases)("finds the words of %j", (text, wordCount) => {
    expect(wordsOf(text)).toHaveLength(wordCount);
  });
});
