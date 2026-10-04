import { MARK_TYPES } from "@beckit/core";
import { describe, expect, it } from "vitest";
import { NODE_FOR_BLOCK } from "./schema.ts";
import { makeEditor } from "./test-editor.ts";

const sorted = (names: Iterable<string>) => [...names].sort((a, b) => a.localeCompare(b));

describe("editor schema", () => {
  const { schema } = makeEditor([]);

  it("has exactly the marks core stores", () => {
    expect(sorted(Object.keys(schema.marks))).toEqual(sorted(MARK_TYPES));
  });

  it("has exactly the blocks core stores", () => {
    const blocks = Object.keys(schema.nodes).filter((name) => name !== "doc" && name !== "text");
    expect(sorted(blocks)).toEqual(sorted(Object.values(NODE_FOR_BLOCK)));
  });
});
