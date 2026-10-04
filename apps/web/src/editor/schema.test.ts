import { afterAll, describe, expect, it } from "vitest";

import { MARK_TYPES } from "@beckit/core";

import { NODE_FOR_BLOCK } from "./schema.ts";
import { createTestEditor } from "./test-editor.ts";

function sortNames(names: Iterable<string>): string[] {
  return [...names].toSorted((a, b) => a.localeCompare(b));
}

describe("extensions", () => {
  const editor = createTestEditor([]);
  const { schema } = editor;

  afterAll(() => {
    editor.destroy();
  });

  it("has exactly the marks core stores", () => {
    expect(sortNames(Object.keys(schema.marks))).toEqual(sortNames(MARK_TYPES));
  });

  it("has exactly the blocks core stores", () => {
    const blockNames = Object.keys(schema.nodes).filter(
      (name) => name !== "doc" && name !== "text",
    );
    expect(sortNames(blockNames)).toEqual(sortNames(Object.values(NODE_FOR_BLOCK)));
  });
});
