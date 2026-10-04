import { describe, expect, it } from "vitest";

import { createBlock, HEADING_LEVELS, isMarkType, levelOf } from "./block.ts";

describe("createBlock", () => {
  it("makes a paragraph by default", () => {
    expect(createBlock("text")).toMatchObject({ type: "paragraph", text: "text", marks: [] });
  });

  it("gives headings a level, defaulting to the top level", () => {
    expect(levelOf(createBlock("Title", { type: "heading", level: 2 }))).toBe(2);
    expect(levelOf(createBlock("Title", { type: "heading" }))).toBe(HEADING_LEVELS[0]);
  });

  it("drops a level given to a block that isn't a heading", () => {
    expect(levelOf(createBlock("text", { level: 2 }))).toBeUndefined();
  });
});

describe("isMarkType", () => {
  it("accepts only marks Beckit stores", () => {
    expect(isMarkType("bold")).toBe(true);
    expect(isMarkType("strike")).toBe(false);
  });
});
