import { newBlock } from "@beckit/core";
import { afterEach, describe, expect, it } from "vitest";
import { snapshotsOf } from "./snapshot.ts";
import { caretAt, makeEditor } from "./test-editor.ts";

describe("snapshots", () => {
  const blocks = [
    newBlock("The Crossing", { type: "heading", level: 1 }),
    newBlock("The ferry left at dawn.", {
      marks: [
        { type: "bold", start: 0, end: 9 },
        { type: "italic", start: 4, end: 14 },
      ],
    }),
    newBlock("", { type: "sceneBreak" }),
    newBlock("After."),
  ];
  const editor = makeEditor(blocks);
  afterEach(() => {
    caretAt(editor, 3, 0);
  });

  it("round-trip blocks, levels and overlapping marks through the editor", () => {
    expect(snapshotsOf(editor.state.doc)).toEqual(blocks);
  });

  it("reuse the same snapshot object for untouched blocks", () => {
    const before = snapshotsOf(editor.state.doc);
    caretAt(editor, 3, 6);
    editor.commands.insertContent("!");
    const after = snapshotsOf(editor.state.doc);
    expect(after.slice(0, 3)).toEqual(before.slice(0, 3));
    for (const [i, b] of after.slice(0, 3).entries()) expect(b).toBe(before[i]);
    expect(after[3]).not.toBe(before[3]);
  });
});
