import { describe, expect, it } from "vitest";
import { isBlockId, newBlockId, resolveBlockIds, type BlockId } from "./ids.ts";

const A = "A" as BlockId;
const B = "B" as BlockId;
const counter = () => {
  let n = 0;
  return () => `new-${String(++n)}` as BlockId;
};
/** Two adjacent old blocks of equal length, about to be merged. */
const equalPair = (first: BlockId, second: BlockId) => [
  { id: first, from: 1, to: 4 },
  { id: second, from: 4, to: 7 },
];
const resolve = (...args: Parameters<typeof resolveBlockIds>) =>
  resolveBlockIds(args[0], args[1], args[2], counter());

describe("newBlockId", () => {
  it("mints unique, time-ordered ULIDs", () => {
    const ids = Array.from({ length: 1000 }, newBlockId);
    expect(new Set(ids).size).toBe(1000);
    expect(ids.every(isBlockId)).toBe(true);
    expect([...ids].sort((a, b) => (a < b ? -1 : 1))).toEqual(ids);
  });
});

describe("resolveBlockIds", () => {
  it("keeps the id of a block being typed in", () => {
    expect(resolve([{ id: A, from: 1, to: 9 }], [{ id: A, from: 1, to: 12 }])).toEqual([A]);
  });

  it("split: the half with more of the old text keeps the id", () => {
    const previous = [{ id: A, from: 2, to: 10 }];
    const current = [
      { id: A, from: 1, to: 2 },
      { id: A, from: 4, to: 10 },
    ];
    expect(resolve(previous, current)).toEqual(["new-1", A]);
  });

  it("merge: the bigger contributor's id survives", () => {
    const previous = [
      { id: A, from: 1, to: 3 },
      { id: B, from: 3, to: 9 },
    ];
    expect(resolve(previous, [{ id: A, from: 1, to: 9 }])).toEqual([B]);
  });

  it("merge of equals: the earlier block's id survives", () => {
    expect(resolve(equalPair(A, B), [{ id: A, from: 1, to: 7 }])).toEqual([A]);
  });

  it("a rebuilt block (paragraph to heading) inherits by its text", () => {
    expect(resolve([{ id: A, from: 1, to: 6 }], [{ id: null, from: 1, to: 6 }])).toEqual([A]);
  });

  it("an unrelated replacement gets a new id", () => {
    expect(resolve([{ id: A, from: 1, to: 1 }], [{ id: null, from: 1, to: 9 }])).toEqual(["new-1"]);
  });

  it("an empty block being typed into keeps its own id", () => {
    expect(resolve([{ id: A, from: 1, to: 1 }], [{ id: A, from: 1, to: 2 }])).toEqual([A]);
  });

  it("a moved block keeps its id if nothing else holds it", () => {
    expect(resolve([], [{ id: A, from: 1, to: 5 }])).toEqual([A]);
  });

  it("a pasted copy of an id held elsewhere gets a new id", () => {
    expect(resolve([], [{ id: A, from: 1, to: 5 }], (id) => id === A)).toEqual(["new-1"]);
  });

  it("duplicates with no old text: first keeps, rest are new", () => {
    const current = [
      { id: A, from: 1, to: 2 },
      { id: A, from: 3, to: 4 },
    ];
    expect(resolve([], current)).toEqual([A, "new-1"]);
  });

  it("equal halves of a split: the first keeps the id", () => {
    const previous = [{ id: A, from: 1, to: 7 }];
    const current = [
      { id: A, from: 1, to: 4 },
      { id: A, from: 6, to: 9 },
    ];
    expect(resolve(previous, current)).toEqual([A, "new-1"]);
  });

  it("undoing a split: the id the merged block carries wins the tie", () => {
    expect(resolve(equalPair(B, A), [{ id: A, from: 1, to: 7 }])).toEqual([A]);
  });
});
