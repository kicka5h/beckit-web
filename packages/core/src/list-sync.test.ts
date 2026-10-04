import { describe, expect, it } from "vitest";
import { syncList } from "./list-sync.ts";

const cases: [string, string[], string[]][] = [
  ["no change", ["a", "b", "c"], ["a", "b", "c"]],
  ["insert", ["a", "c"], ["a", "b", "c"]],
  ["remove", ["a", "b", "c"], ["a", "c"]],
  ["move up", ["a", "b", "c", "d"], ["d", "a", "b", "c"]],
  ["move down", ["a", "b", "c", "d"], ["b", "c", "d", "a"]],
  ["replace all", ["a", "b"], ["x", "y", "z"]],
  ["to empty", ["a", "b"], []],
  ["from empty", [], ["a"]],
];

describe("syncList", () => {
  it.each(cases)("%s", (_, start, next) => {
    const list = [...start];
    syncList(list, next);
    expect(list).toEqual(next);
  });

  it("does not touch an unchanged list", () => {
    const list = ["a", "b"];
    const spliced: unknown[] = [];
    const watched = new Proxy(list, {
      get: (target, key, receiver) =>
        key === "splice"
          ? (...args: unknown[]) => spliced.push(args)
          : (Reflect.get(target, key, receiver) as unknown),
    });
    syncList(watched, ["a", "b"]);
    expect(spliced).toEqual([]);
  });
});
