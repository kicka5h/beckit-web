import type { BlockSnapshot } from "./block.ts";
import type { ChapterEdit } from "./chapter.ts";

/**
 * Compares two editor snapshots by reference. Snapshots of untouched blocks are reused objects
 * (see the editor's snapshot cache), so this is O(blocks) with no text comparison.
 * Returns null when there is nothing to write.
 */
export function diffEdit(
  previous: readonly BlockSnapshot[],
  next: readonly BlockSnapshot[],
): ChapterEdit | null {
  const seen = new Set(previous);
  const nextIds = new Set(next.map((b) => b.id));
  const changed = next.filter((b) => !seen.has(b));
  const removed = previous.filter((b) => !nextIds.has(b.id)).map((b) => b.id);
  const sameOrder =
    previous.length === next.length && next.every((b, i) => previous[i]?.id === b.id);
  if (changed.length === 0 && sameOrder) return null;
  return { order: [...nextIds], changed, removed };
}
