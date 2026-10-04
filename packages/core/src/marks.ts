import type { MarkSpan, MarkType } from "./block.ts";
import { compareByStart, type Span } from "./span.ts";

/** A run of text sharing one set of marks. */
export interface Segment {
  readonly text: string;
  readonly marks: readonly MarkType[];
}

function compareMarkSpans(a: MarkSpan, b: MarkSpan): number {
  return a.type.localeCompare(b.type) || compareByStart(a, b);
}

/** Sorts spans into canonical order (by mark, then start), so equal mark sets compare equal. */
export function normalizeSpans(spans: readonly MarkSpan[]): MarkSpan[] {
  return spans
    .filter(({ start, end }) => end > start)
    .map(({ type, start, end }) => ({ type, start, end }))
    .toSorted(compareMarkSpans);
}

/** The spans covered by one mark, sorted by start. */
export function spansOf(spans: readonly MarkSpan[], type: MarkType): Span[] {
  return spans
    .filter((span) => span.type === type)
    .map(({ start, end }) => ({ start, end }))
    .toSorted(compareByStart);
}

/** Splits text at every mark boundary. Inverse of `toSpans`. */
export function toSegments(text: string, spans: readonly MarkSpan[]): Segment[] {
  const cuts = new Set([0, text.length]);
  for (const { start, end } of spans) cuts.add(start).add(end);
  const points = [...cuts].filter((point) => point <= text.length).toSorted((a, b) => a - b);

  const segments: Segment[] = [];
  let start = 0;
  for (const end of points.slice(1)) {
    const covering = spans.filter((span) => span.start <= start && span.end >= end);
    const marks = [...new Set(covering.map((span) => span.type))].toSorted((a, b) =>
      a.localeCompare(b),
    );
    segments.push({ text: text.slice(start, end), marks });
    start = end;
  }
  return segments;
}

/** Collapses styled runs into one span per continuous range of each mark. Inverse of `toSegments`. */
export function toSpans(segments: readonly Segment[]): MarkSpan[] {
  const spans: MarkSpan[] = [];
  const openSince = new Map<MarkType, number>();
  let offset = 0;

  function closeAllExcept(active: ReadonlySet<MarkType>): void {
    for (const [type, start] of openSince) {
      if (active.has(type)) continue;
      spans.push({ type, start, end: offset });
      openSince.delete(type);
    }
  }

  for (const { text, marks } of segments) {
    const active = new Set(marks);
    closeAllExcept(active);
    for (const type of active) if (!openSince.has(type)) openSince.set(type, offset);
    offset += text.length;
  }
  closeAllExcept(new Set());
  return normalizeSpans(spans);
}
