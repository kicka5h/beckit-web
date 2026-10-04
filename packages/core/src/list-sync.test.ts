import { describe, expect, it } from "vitest";

import { syncList } from "./list-sync.ts";

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
