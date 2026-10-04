/** A range of positions, start inclusive, end exclusive. Every range in Beckit has this shape. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/** The number of positions two spans share. */
export function overlapOf(first: Span, second: Span): number {
  return Math.max(0, Math.min(first.end, second.end) - Math.max(first.start, second.start));
}

/** Compares spans by where they start, for sorting. */
export function compareByStart(a: Span, b: Span): number {
  return a.start - b.start;
}

/** Returns the parts of `from` that `remove` does not cover. Both lists sorted, non-overlapping. */
export function subtractSpans(from: readonly Span[], remove: readonly Span[]): Span[] {
  return from.flatMap(({ start, end }) => {
    const pieces: Span[] = [];
    let cursor = start;
    for (const cut of remove) {
      if (cut.end <= cursor || cut.start >= end) continue;
      if (cut.start > cursor) pieces.push({ start: cursor, end: cut.start });
      cursor = cut.end;
    }
    if (cursor < end) pieces.push({ start: cursor, end });
    return pieces;
  });
}
