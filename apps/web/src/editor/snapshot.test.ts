import type { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBlock } from "@beckit/core";

import { toSnapshots } from "./snapshot.ts";
import { createTestEditor, placeCaret } from "./test-editor.ts";

describe("toSnapshots", () => {
  const blocks = [
    createBlock("The Crossing", { type: "heading", level: 1 }),
    createBlock("The ferry left at dawn.", {
      marks: [
        { type: "bold", start: 0, end: 9 },
        { type: "italic", start: 4, end: 14 },
      ],
    }),
    createBlock("", { type: "sceneBreak" }),
    createBlock("After."),
  ];

  let editor: Editor;

  afterEach(() => {
    editor.destroy();
  });

  it("round-trips blocks, levels and overlapping marks through the editor", () => {
    editor = createTestEditor(blocks);
    expect(toSnapshots(editor.state.doc)).toEqual(blocks);
  });

  it("reuses the same snapshot object for untouched blocks", () => {
    editor = createTestEditor(blocks);
    const before = toSnapshots(editor.state.doc);
    placeCaret(editor, 3, 6);
    editor.commands.insertContent("!");
    const after = toSnapshots(editor.state.doc);
    for (const [index, block] of after.slice(0, 3).entries()) expect(block).toBe(before[index]);
    expect(after[3]).not.toBe(before[3]);
  });

  it("opens an empty chapter on one empty paragraph", () => {
    editor = createTestEditor([]);
    expect(toSnapshots(editor.state.doc)).toMatchObject([{ type: "paragraph", text: "" }]);
  });
});
