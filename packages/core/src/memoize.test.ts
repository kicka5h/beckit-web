import { describe, expect, it, vi } from "vitest";

import { memoize } from "./memoize.ts";

describe("memoize", () => {
  it("computes once per object and returns the cached result after", () => {
    const compute = vi.fn((key: { readonly name: string }) => key.name.length);
    const lengthOf = memoize(compute);
    const key = { name: "ferry" };
    expect(lengthOf(key)).toBe(5);
    expect(lengthOf(key)).toBe(5);
    expect(lengthOf({ name: "ferry" })).toBe(5);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("caches undefined results too", () => {
    const compute = vi.fn(() => undefined);
    const nothingOf = memoize(compute);
    const key = {};
    nothingOf(key);
    nothingOf(key);
    expect(compute).toHaveBeenCalledOnce();
  });
});
