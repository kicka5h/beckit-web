import { describe, expect, it } from "vitest";

import type { MarkSpan } from "./block.ts";
import { normalizeSpans, type Segment, spansOf, toSegments, toSpans } from "./marks.ts";

describe("toSegments", () => {
  it("handles plain and empty text", () => {
    expect(toSegments("plain", [])).toEqual([{ text: "plain", marks: [] }]);
    expect(toSpans(toSegments("plain", []))).toEqual([]);
    expect(toSegments("", [])).toEqual([]);
  });

  it("round-trips overlapping marks through toSpans", () => {
    const spans: MarkSpan[] = [
      { type: "bold", start: 0, end: 6 },
      { type: "italic", start: 3, end: 10 },
    ];
    expect(toSegments("0123456789", spans)).toEqual([
      { text: "012", marks: ["bold"] },
      { text: "345", marks: ["bold", "italic"] },
      { text: "6789", marks: ["italic"] },
    ]);
    expect(toSpans(toSegments("0123456789", spans))).toEqual(normalizeSpans(spans));
  });
});

describe("toSpans", () => {
  it("merges adjacent runs of the same mark", () => {
    const segments: Segment[] = [
      { text: "ab", marks: ["bold"] },
      { text: "cd", marks: ["bold", "italic"] },
    ];
    expect(toSpans(segments)).toEqual([
      { type: "bold", start: 0, end: 4 },
      { type: "italic", start: 2, end: 4 },
    ]);
  });
});

describe("spansOf", () => {
  it("picks one mark's spans, sorted", () => {
    const spans: MarkSpan[] = [
      { type: "bold", start: 5, end: 6 },
      { type: "italic", start: 0, end: 9 },
      { type: "bold", start: 0, end: 2 },
    ];
    expect(spansOf(spans, "bold")).toEqual([
      { start: 0, end: 2 },
      { start: 5, end: 6 },
    ]);
  });
});
