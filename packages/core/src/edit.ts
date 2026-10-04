import type { BlockSnapshot } from "./block.ts";
import type { ChapterEdit } from "./chapter.ts";

/**
 * Compares two editor snapshots by reference. Snapshots of untouched blocks are reused objects
 * (the editor memoizes them), so this costs O(blocks) with no text comparison.
 * Returns undefined when there is nothing to write.
 */
export function diffEdit(
  previous: readonly BlockSnapshot[],
  next: readonly BlockSnapshot[],
): ChapterEdit | undefined {
  const seen = new Set(previous);
  const nextIds = new Set(next.map((block) => block.id));
  const changed = next.filter((block) => !seen.has(block));
  const removed = previous.filter((block) => !nextIds.has(block.id)).map((block) => block.id);
  const isSameOrder =
    previous.length === next.length &&
    next.every((block, index) => previous[index]?.id === block.id);
  if (changed.length === 0 && isSameOrder) return undefined;
  return { order: [...nextIds], changed, removed };
}
