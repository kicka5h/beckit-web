import type { BlockSnapshot } from "./block.ts";

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Words in a piece of prose: runs of letters or digits, with inner apostrophes and hyphens. */
export const countWords = (text: string): number => text.match(WORD)?.length ?? 0;

const blockWords = new WeakMap<BlockSnapshot, number>();

/** Total words in `blocks`. Counts each snapshot once, so unchanged blocks cost nothing. */
export function countBlockWords(blocks: readonly BlockSnapshot[]): number {
  let total = 0;
  for (const block of blocks) {
    let words = blockWords.get(block);
    if (words === undefined) {
      words = countWords(block.text);
      blockWords.set(block, words);
    }
    total += words;
  }
  return total;
}
