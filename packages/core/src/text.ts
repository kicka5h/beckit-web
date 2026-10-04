import type { BlockSnapshot } from "./block.ts";
import { memoize } from "./memoize.ts";

const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** The words of a piece of prose: runs of letters or digits, with inner apostrophes and hyphens. */
export function wordsOf(text: string): string[] {
  return text.match(WORD_PATTERN) ?? [];
}

/** Counts words in a piece of prose (see `wordsOf`). */
export function countWords(text: string): number {
  return wordsOf(text).length;
}

// Each snapshot is counted once, so unchanged blocks cost nothing on later counts.
const wordCountOf = memoize((block: BlockSnapshot) => countWords(block.text));

/** Counts the words in every block. */
export function countBlockWords(blocks: readonly BlockSnapshot[]): number {
  return blocks.reduce((total, block) => total + wordCountOf(block), 0);
}
