import { describe, expect, it } from "vitest";

import { compareByStart, overlapOf, type Span, subtractSpans } from "./span.ts";

type Pairs = readonly [number, number][];

function toSpanList(pairs: Pairs): Span[] {
  return pairs.map(([start, end]) => ({ start, end }));
}

describe("overlapOf", () => {
  it("counts shared positions and never goes negative", () => {
    expect(overlapOf({ start: 0, end: 5 }, { start: 3, end: 9 })).toBe(2);
    expect(overlapOf({ start: 0, end: 2 }, { start: 5, end: 9 })).toBe(0);
  });
});

describe("compareByStart", () => {
  it("orders spans by start", () => {
    const spans = toSpanList([
      [4, 5],
      [1, 2],
    ]);
    expect(spans.toSorted(compareByStart)).toEqual(
      toSpanList([
        [1, 2],
        [4, 5],
      ]),
    );
  });
});

describe("subtractSpans", () => {
  const cases: [string, Pairs, Pairs, Pairs][] = [
    ["nothing is removed", [[0, 5]], [], [[0, 5]]],
    ["everything is removed", [[2, 4]], [[0, 9]], []],
    [
      "the middle is removed",
      [[0, 9]],
      [[3, 5]],
      [
        [0, 3],
        [5, 9],
      ],
    ],
    [
      "the edges are removed",
      [[0, 9]],
      [
        [0, 2],
        [7, 9],
      ],
      [[2, 7]],
    ],
    ["the spans are disjoint", [[0, 2]], [[5, 6]], [[0, 2]]],
  ];

  it.each(cases)("subtracts correctly when %s", (_name, from, remove, expected) => {
    expect(subtractSpans(toSpanList(from), toSpanList(remove))).toEqual(toSpanList(expected));
  });
});
