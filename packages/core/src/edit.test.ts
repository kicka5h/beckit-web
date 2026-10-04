import { describe, expect, it } from "vitest";
import { diffEdit } from "./edit.ts";
import { newBlock } from "./block.ts";

describe("diffEdit", () => {
  const a = newBlock("a");
  const b = newBlock("b");

  it("returns null when the same snapshots come back", () => {
    expect(diffEdit([a, b], [a, b])).toBeNull();
  });

  it("reports only new snapshot objects as changed", () => {
    const edited = { ...b, text: "b!" };
    expect(diffEdit([a, b], [a, edited])).toEqual({
      order: [a.id, b.id],
      changed: [edited],
      removed: [],
    });
  });

  it("reports a reorder with nothing changed", () => {
    expect(diffEdit([a, b], [b, a])).toEqual({ order: [b.id, a.id], changed: [], removed: [] });
  });

  it("reports a removal", () => {
    expect(diffEdit([a, b], [a])).toEqual({ order: [a.id], changed: [], removed: [b.id] });
  });
});
