import { describe, expect, it } from "vitest";

import { rebaseList, syncList } from "./list-sync.ts";

describe("syncList", () => {
  const cases: [string, string[], string[]][] = [
    ["an unchanged list", ["a", "b", "c"], ["a", "b", "c"]],
    ["an inserted item", ["a", "c"], ["a", "b", "c"]],
    ["a removed item", ["a", "b", "c"], ["a", "c"]],
    ["an item moved up", ["a", "b", "c", "d"], ["d", "a", "b", "c"]],
    ["an item moved down", ["a", "b", "c", "d"], ["b", "c", "d", "a"]],
    ["a fully replaced list", ["a", "b"], ["x", "y", "z"]],
    ["a list being emptied", ["a", "b"], []],
    ["an empty list being filled", [], ["a"]],
  ];

  it.each(cases)("syncs %s", (_name, start, next) => {
    const list = [...start];
    syncList(list, next);
    expect(list).toEqual(next);
  });

  it("does not touch an unchanged list", () => {
    const splices: unknown[] = [];
    const watched = new Proxy(["a", "b"], {
      get: (target, key, receiver) =>
        key === "splice"
          ? (...callArguments: unknown[]) => splices.push(callArguments)
          : (Reflect.get(target, key, receiver) as unknown),
    });
    syncList(watched, ["a", "b"]);
    expect(splices).toEqual([]);
  });
});

describe("rebaseList", () => {
  const replays: [string, string[], string[]][] = [
    ["an unchanged list", ["a", "b", "c"], ["a", "b", "c"]],
    ["an added item", ["a", "c"], ["a", "b", "c"]],
    ["a removed item", ["a", "b", "c"], ["a", "c"]],
    ["two swapped items", ["a", "b", "c"], ["b", "a", "c"]],
    ["an item moved to the end", ["a", "b", "c", "d"], ["b", "c", "d", "a"]],
    ["a fully replaced list", ["a", "b"], ["x", "y", "z"]],
  ];

  it.each(replays)(
    "gives back the local list for %s when nothing changed elsewhere",
    (_situation, base, local) => {
      expect(rebaseList(base, local, base)).toEqual(local);
    },
  );

  describe("when the list also changed elsewhere", () => {
    interface RebaseCase {
      readonly behavior: string;
      readonly base: string[];
      readonly local: string[];
      readonly current: string[];
      readonly expected: string[];
    }

    const cases: RebaseCase[] = [
      {
        behavior: "keeps an item added elsewhere when only text changed here",
        base: ["a", "b"],
        local: ["a", "b"],
        current: ["a", "x", "b"],
        expected: ["a", "x", "b"],
      },
      {
        behavior: "keeps both sides' additions",
        base: ["a", "b"],
        local: ["a", "b", "y"],
        current: ["a", "x", "b"],
        expected: ["a", "x", "b", "y"],
      },
      {
        behavior: "removes what was removed here",
        base: ["a", "b", "c"],
        local: ["a", "c"],
        current: ["a", "b", "x", "c"],
        expected: ["a", "x", "c"],
      },
      {
        behavior: "places a moved item after the one it follows here",
        base: ["a", "b", "c"],
        local: ["b", "c", "a"],
        current: ["x", "a", "b", "c"],
        expected: ["x", "b", "c", "a"],
      },
      {
        behavior: "starts an item whose predecessor was removed elsewhere",
        base: ["a", "b"],
        local: ["a", "y", "b"],
        current: ["b"],
        expected: ["y", "b"],
      },
    ];

    it.each(cases)("$behavior", ({ base, local, current, expected }) => {
      expect(rebaseList(base, local, current)).toEqual(expected);
    });
  });
});
