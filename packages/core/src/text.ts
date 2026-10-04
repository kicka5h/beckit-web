const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** The words of a piece of prose: runs of letters or digits, with inner apostrophes and hyphens. */
export function wordsOf(text: string): string[] {
  return text.match(WORD_PATTERN) ?? [];
}
