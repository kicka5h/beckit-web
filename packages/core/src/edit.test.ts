import { describe, expect, it } from "vitest";

import { createBlock } from "./block.ts";
import { diffEdit } from "./edit.ts";

describe("diffEdit", () => {
  const first = createBlock("first");
  const second = createBlock("second");

  it("returns undefined when the same snapshots come back", () => {
    expect(diffEdit([first, second], [first, second])).toBeUndefined();
  });

  it("reports only new snapshot objects as changed", () => {
    const edited = { ...second, text: "second!" };
    expect(diffEdit([first, second], [first, edited])).toEqual({
      order: [first.id, second.id],
      changed: [edited],
      removed: [],
    });
  });

  it("reports a reorder with nothing changed", () => {
    expect(diffEdit([first, second], [second, first])).toEqual({
      order: [second.id, first.id],
      changed: [],
      removed: [],
    });
  });

  it("reports a removal", () => {
    expect(diffEdit([first, second], [first])).toEqual({
      order: [first.id],
      changed: [],
      removed: [second.id],
    });
  });
});
