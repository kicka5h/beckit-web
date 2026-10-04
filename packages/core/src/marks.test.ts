import { describe, expect, it } from "vitest";
import type { MarkSpan } from "./block.ts";
import { normalizeSpans, segmentText, spansFromSegments, subtractRanges } from "./marks.ts";

const roundTrip = (text: string, spans: MarkSpan[]) => spansFromSegments(segmentText(text, spans));

describe("segmentText / spansFromSegments", () => {
  it("handles plain and empty text", () => {
    expect(segmentText("plain", [])).toEqual([{ text: "plain", marks: [] }]);
    expect(roundTrip("plain", [])).toEqual([]);
    expect(segmentText("", [])).toEqual([]);
  });

  it("round-trips overlapping marks", () => {
    const spans: MarkSpan[] = [
      { type: "bold", start: 0, end: 6 },
      { type: "italic", start: 3, end: 10 },
    ];
    expect(segmentText("0123456789", spans)).toEqual([
      { text: "012", marks: ["bold"] },
      { text: "345", marks: ["bold", "italic"] },
      { text: "6789", marks: ["italic"] },
    ]);
    expect(roundTrip("0123456789", spans)).toEqual(normalizeSpans(spans));
  });

  it("merges adjacent runs of the same mark", () => {
    const spans = spansFromSegments([
      { text: "ab", marks: ["bold"] },
      { text: "cd", marks: ["bold", "italic"] },
    ]);
    expect(spans).toEqual([
      { type: "bold", start: 0, end: 4 },
      { type: "italic", start: 2, end: 4 },
    ]);
  });
});

describe("subtractRanges", () => {
  type Pairs = [number, number][];
  const cases: [string, Pairs, Pairs, Pairs][] = [
    ["nothing removed", [[0, 5]], [], [[0, 5]]],
    ["all removed", [[2, 4]], [[0, 9]], []],
    [
      "middle removed",
      [[0, 9]],
      [[3, 5]],
      [
        [0, 3],
        [5, 9],
      ],
    ],
    [
      "edges removed",
      [[0, 9]],
      [
        [0, 2],
        [7, 9],
      ],
      [[2, 7]],
    ],
    ["disjoint", [[0, 2]], [[5, 6]], [[0, 2]]],
  ];
  const spans = (pairs: Pairs) => pairs.map(([start, end]) => ({ start, end }));

  it.each(cases)("%s", (_, from, remove, expected) => {
    expect(subtractRanges(spans(from), spans(remove))).toEqual(spans(expected));
  });
});
