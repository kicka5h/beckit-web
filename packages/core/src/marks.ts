import type { MarkSpan, MarkType } from "./block.ts";

/** A run of text sharing one set of marks. */
export interface Segment {
  readonly text: string;
  readonly marks: readonly MarkType[];
}

/** A plain start/end range, end exclusive. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

const byStart = (a: Span, b: Span): number => a.start - b.start;

/** Splits text at every mark boundary. Inverse of `spansFromSegments`. */
export function segmentText(text: string, spans: readonly MarkSpan[]): Segment[] {
  const cuts = new Set([0, text.length]);
  for (const { start, end } of spans) cuts.add(start).add(end);
  const points = [...cuts].filter((p) => p <= text.length).sort((a, b) => a - b);

  return points.slice(1).flatMap((end, i) => {
    const start = points[i] ?? 0;
    if (start === end) return [];
    const types = spans.filter((s) => s.start <= start && s.end >= end).map((s) => s.type);
    const marks = [...new Set(types)].sort((a, b) => a.localeCompare(b));
    return [{ text: text.slice(start, end), marks }];
  });
}

/** Collapses styled runs into one span per continuous range of each mark. */
export function spansFromSegments(segments: readonly Segment[]): MarkSpan[] {
  const spans: MarkSpan[] = [];
  const open = new Map<MarkType, number>();
  let offset = 0;

  const closeMissing = (active: ReadonlySet<MarkType>): void => {
    for (const [type, start] of open) {
      if (active.has(type)) continue;
      spans.push({ type, start, end: offset });
      open.delete(type);
    }
  };

  for (const segment of segments) {
    const active = new Set(segment.marks);
    closeMissing(active);
    for (const type of active) if (!open.has(type)) open.set(type, offset);
    offset += segment.text.length;
  }
  closeMissing(new Set());

  return normalizeSpans(spans);
}

/** Canonical order (by mark, then start), so equal mark sets compare equal. */
export const normalizeSpans = (spans: readonly MarkSpan[]): MarkSpan[] =>
  spans
    .filter((s) => s.end > s.start)
    .map(({ type, start, end }) => ({ type, start, end }))
    .sort((a, b) => a.type.localeCompare(b.type) || byStart(a, b));

/** The ranges covered by `type`, sorted by start. */
export const rangesOf = (spans: readonly MarkSpan[], type: MarkType): Span[] =>
  spans
    .filter((s) => s.type === type)
    .map(({ start, end }) => ({ start, end }))
    .sort(byStart);

/** Parts of `from` not covered by `remove`. Both lists sorted by start, non-overlapping. */
export function subtractRanges(from: readonly Span[], remove: readonly Span[]): Span[] {
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
