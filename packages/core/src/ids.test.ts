import { describe, expect, it } from "vitest";

import {
  type BlockId,
  createBlockId,
  type CurrentBlock,
  isBlockId,
  type PreviousBlock,
  resolveBlockIds,
} from "./ids.ts";

const FIRST = "FIRST" as BlockId;
const SECOND = "SECOND" as BlockId;

/** Creates a minter whose ids are predictable: new-1, new-2, … */
function createCounter(): () => BlockId {
  let count = 0;
  return () => `new-${String(++count)}` as BlockId;
}

function resolve(
  previous: readonly PreviousBlock[],
  current: readonly CurrentBlock[],
  isHeldElsewhere?: (id: BlockId) => boolean,
): BlockId[] {
  return resolveBlockIds(previous, current, isHeldElsewhere, createCounter());
}

/** Creates two adjacent old blocks of equal length, about to be merged. */
function createEqualPair(first: BlockId, second: BlockId): PreviousBlock[] {
  return [
    { id: first, start: 1, end: 4 },
    { id: second, start: 4, end: 7 },
  ];
}

describe("createBlockId", () => {
  it("mints unique, time-ordered ULIDs", () => {
    const ids = Array.from({ length: 1000 }, createBlockId);
    expect(new Set(ids).size).toBe(1000);
    expect(ids.every(isBlockId)).toBe(true);
    expect(ids.toSorted((a, b) => a.localeCompare(b))).toEqual(ids);
  });
});

describe("isBlockId", () => {
  it("rejects anything that isn't a minted id", () => {
    expect([undefined, 7, "", "not-an-id"].some(isBlockId)).toBe(false);
  });
});

describe("resolveBlockIds", () => {
  it("keeps the id of a block being typed in", () => {
    expect(resolve([{ id: FIRST, start: 1, end: 9 }], [{ id: FIRST, start: 1, end: 12 }])).toEqual([
      FIRST,
    ]);
  });

  it("gives a split block's id to the half holding more of the old text", () => {
    const current = [
      { id: FIRST, start: 1, end: 2 },
      { id: FIRST, start: 4, end: 10 },
    ];
    expect(resolve([{ id: FIRST, start: 2, end: 10 }], current)).toEqual(["new-1", FIRST]);
  });

  it("gives the id to the first half when a split is even", () => {
    const current = [
      { id: FIRST, start: 1, end: 4 },
      { id: FIRST, start: 6, end: 9 },
    ];
    expect(resolve([{ id: FIRST, start: 1, end: 7 }], current)).toEqual([FIRST, "new-1"]);
  });

  it("keeps the bigger contributor's id when blocks merge", () => {
    const previous = [
      { id: FIRST, start: 1, end: 3 },
      { id: SECOND, start: 3, end: 9 },
    ];
    expect(resolve(previous, [{ id: FIRST, start: 1, end: 9 }])).toEqual([SECOND]);
  });

  it("keeps the earlier block's id when equal blocks merge", () => {
    const merged = [{ id: FIRST, start: 1, end: 7 }];
    expect(resolve(createEqualPair(FIRST, SECOND), merged)).toEqual([FIRST]);
  });

  it("keeps the id the merged block carries when undoing a split", () => {
    const merged = [{ id: FIRST, start: 1, end: 7 }];
    expect(resolve(createEqualPair(SECOND, FIRST), merged)).toEqual([FIRST]);
  });

  it("lets a rebuilt block (paragraph to heading) inherit its id by its text", () => {
    const current = [{ id: undefined, start: 1, end: 6 }];
    expect(resolve([{ id: FIRST, start: 1, end: 6 }], current)).toEqual([FIRST]);
  });

  it("gives an unrelated replacement a new id", () => {
    const current = [{ id: undefined, start: 1, end: 9 }];
    expect(resolve([{ id: FIRST, start: 1, end: 1 }], current)).toEqual(["new-1"]);
  });

  it("keeps the id of an empty block being typed into", () => {
    const current = [{ id: FIRST, start: 1, end: 2 }];
    expect(resolve([{ id: FIRST, start: 1, end: 1 }], current)).toEqual([FIRST]);
  });

  it("keeps a moved block's id if nothing else holds it", () => {
    expect(resolve([], [{ id: FIRST, start: 1, end: 5 }])).toEqual([FIRST]);
  });

  it("gives a pasted copy of an id held elsewhere a new id", () => {
    const current = [{ id: FIRST, start: 1, end: 5 }];
    expect(resolve([], current, (id) => id === FIRST)).toEqual(["new-1"]);
  });

  it("keeps the first of several duplicates holding no old text and renews the rest", () => {
    const current = [
      { id: FIRST, start: 1, end: 2 },
      { id: FIRST, start: 3, end: 4 },
    ];
    expect(resolve([], current)).toEqual([FIRST, "new-1"]);
  });

  it("mints real ids by default", () => {
    const [id] = resolveBlockIds([], [{ id: undefined, start: 1, end: 2 }]);
    expect(isBlockId(id)).toBe(true);
  });
});
