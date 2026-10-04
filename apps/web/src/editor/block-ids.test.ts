import { isBlockId, newBlock } from "@beckit/core";
import type { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  caretAt,
  expectValidIds,
  idsOf,
  makeEditor,
  posIn,
  press,
  textsOf,
} from "./test-editor.ts";

let editor: Editor;
const open = (blocks: Parameters<typeof makeEditor>[0]): Editor => (editor = makeEditor(blocks));
afterEach(() => {
  expectValidIds(editor);
  editor.destroy();
});

const cut = (from: number, to: number): string => {
  editor.commands.setTextSelection({ from, to });
  const slice = editor.state.selection.content();
  editor.view.dom.dispatchEvent(new Event("cut"));
  editor.commands.deleteSelection();
  return editor.view.serializeForClipboard(slice).dom.innerHTML;
};

describe("block ids: creating", () => {
  it("1. gives every loaded block an id", () => {
    open(["a", "b", "c"]);
    expect(idsOf(editor).every(isBlockId)).toBe(true);
  });

  it("2. keeps the ids it was loaded with", () => {
    const blocks = [newBlock("a"), newBlock("b")];
    open(blocks);
    expect(idsOf(editor)).toEqual(blocks.map((b) => b.id));
  });

  it("3. assigns ids to content set without them", () => {
    open(["a"]);
    editor.commands.setContent("<p>one</p><p>two</p>");
    expect(idsOf(editor).every(isBlockId)).toBe(true);
  });

  it("4. resolves duplicate ids in loaded content", () => {
    open(["a"]);
    editor.commands.setContent('<p data-block-id="01J0000000000000000000000A">x</p>'.repeat(3));
    expect(idsOf(editor)[0]).toBe("01J0000000000000000000000A");
  });

  it("5. gives an empty document's paragraph an id", () => {
    open([]);
    expect(idsOf(editor)).toHaveLength(1);
  });

  it("6. re-loading the same content keeps every id", () => {
    const ids = idsOf(open(["a", "b"]));
    editor.commands.setContent(editor.getJSON());
    expect(idsOf(editor)).toEqual(ids);
  });
});

describe("block ids: typing and styling", () => {
  it("7. keeps the id while typing", () => {
    const [first] = idsOf(open(["Mira"]));
    caretAt(editor, 0, 4);
    editor.commands.insertContent(" waited");
    expect(idsOf(editor)).toEqual([first]);
  });

  it("8. keeps the id when text is bolded", () => {
    const ids = idsOf(open(["Mira waited"]));
    editor.commands.setTextSelection({ from: posIn(editor, 0, 0), to: posIn(editor, 0, 4) });
    editor.commands.toggleBold();
    expect(idsOf(editor)).toEqual(ids);
  });

  it("9. keeps the id when a paragraph becomes a heading", () => {
    const ids = idsOf(open(["Title", "Body"]));
    caretAt(editor, 0, 2);
    editor.commands.setNode("heading", { level: 1 });
    expect(editor.state.doc.firstChild?.type.name).toBe("heading");
    expect(idsOf(editor)).toEqual(ids);
  });

  it("10. keeps the id when a heading becomes a paragraph", () => {
    const [title] = idsOf(open([newBlock("Title", { type: "heading", level: 1 })]));
    caretAt(editor, 0, 1);
    editor.commands.setParagraph();
    expect(idsOf(editor)[0]).toBe(title);
  });

  it("11. gives a new scene break its own id", () => {
    const ids = idsOf(open(["Before"]));
    caretAt(editor, 0, 6);
    editor.commands.setHorizontalRule();
    expect(idsOf(editor)[0]).toBe(ids[0]);
    expect(idsOf(editor).length).toBeGreaterThan(1);
  });
});

describe("block ids: splitting", () => {
  it("12. Enter at the end: the paragraph keeps its id, the new one gets a fresh id", () => {
    const [first] = idsOf(open(["abcdef"]));
    caretAt(editor, 0, 6);
    press(editor, "Enter");
    expect(textsOf(editor)).toEqual(["abcdef", ""]);
    expect(idsOf(editor)[0]).toBe(first);
  });

  it("13. Enter at the start: the text keeps its id", () => {
    const [first] = idsOf(open(["abcdef"]));
    caretAt(editor, 0, 0);
    press(editor, "Enter");
    expect(textsOf(editor)).toEqual(["", "abcdef"]);
    expect(idsOf(editor)[1]).toBe(first);
  });

  it("14. Enter in the middle: the longer half keeps the id (first half)", () => {
    const [first] = idsOf(open(["abcdef"]));
    caretAt(editor, 0, 4);
    press(editor, "Enter");
    expect(textsOf(editor)).toEqual(["abcd", "ef"]);
    expect(idsOf(editor)[0]).toBe(first);
  });

  it("15. Enter in the middle: the longer half keeps the id (second half)", () => {
    const [first] = idsOf(open(["abcdef"]));
    caretAt(editor, 0, 2);
    press(editor, "Enter");
    expect(idsOf(editor)[1]).toBe(first);
  });

  it("16. many splits in a row stay unique", () => {
    open(["x"]);
    for (let i = 0; i < 300; i++) press(editor, "Enter");
    expect(idsOf(editor)).toHaveLength(301);
  });
});

describe("block ids: merging and deleting", () => {
  it("17. Backspace at the start of a paragraph merges into the one above, which keeps its id", () => {
    const [first] = idsOf(open(["abc", "def"]));
    caretAt(editor, 1, 0);
    press(editor, "Backspace");
    expect(textsOf(editor)).toEqual(["abcdef"]);
    expect(idsOf(editor)).toEqual([first]);
  });

  it("18. Delete at the end of a paragraph merges the next one in", () => {
    const [first] = idsOf(open(["abc", "def"]));
    caretAt(editor, 0, 3);
    press(editor, "Delete");
    expect(idsOf(editor)).toEqual([first]);
  });

  it("19. deleting across paragraphs: the one leaving the most text keeps its id", () => {
    const [, , third] = idsOf(open(["abc", "def", "ghi"]));
    editor.commands.setTextSelection({ from: posIn(editor, 0, 1), to: posIn(editor, 2, 1) });
    editor.commands.deleteSelection();
    expect(textsOf(editor)).toEqual(["ahi"]);
    expect(idsOf(editor)).toEqual([third]);
  });

  it("20. deleting a middle paragraph leaves its neighbours' ids alone", () => {
    const [a, , c] = idsOf(open(["a", "b", "c"]));
    editor.commands.setTextSelection({ from: posIn(editor, 0, 1), to: posIn(editor, 1, 1) });
    editor.commands.deleteSelection();
    expect(idsOf(editor)).toEqual([a, c]);
  });

  it("21. select all and type leaves one valid block", () => {
    open(["a", "b", "c"]);
    editor.commands.selectAll();
    editor.commands.insertContent("fresh");
    expect(textsOf(editor)).toEqual(["fresh"]);
  });
});

describe("block ids: undo and redo", () => {
  it("22. undoing a split restores the single original id", () => {
    const ids = idsOf(open(["abcdef"]));
    caretAt(editor, 0, 3);
    press(editor, "Enter");
    editor.commands.undo();
    expect(idsOf(editor)).toEqual(ids);
  });

  it("23. redoing a split gives the same ids as before the undo", () => {
    open(["abcdef"]);
    caretAt(editor, 0, 3);
    press(editor, "Enter");
    const afterSplit = idsOf(editor);
    editor.commands.undo();
    editor.commands.redo();
    expect(idsOf(editor)).toEqual(afterSplit);
  });

  it("24. undoing a deletion brings the deleted paragraph back with its id", () => {
    const ids = idsOf(open(["a", "b", "c"]));
    editor.commands.setTextSelection({ from: posIn(editor, 0, 1), to: posIn(editor, 2, 0) });
    editor.commands.deleteSelection();
    editor.commands.undo();
    expect(idsOf(editor)).toEqual(ids);
  });

  it("25. undoing a heading change keeps the id", () => {
    const ids = idsOf(open(["Title"]));
    caretAt(editor, 0, 1);
    editor.commands.setNode("heading", { level: 2 });
    editor.commands.undo();
    expect(idsOf(editor)).toEqual(ids);
  });
});

describe("block ids: paste and move", () => {
  it("26. pasted plain text gets new ids", () => {
    const ids = idsOf(open(["a"]));
    caretAt(editor, 0, 1);
    editor.view.pasteText("one\n\ntwo\n\nthree");
    expect(idsOf(editor).filter((id) => ids.includes(id))).toEqual(ids);
  });

  it("27. pasting a copy of a paragraph never duplicates its id", () => {
    const ids = idsOf(open(["original", "other"]));
    const html = editor.view.serializeForClipboard(editor.state.doc.slice(0, posIn(editor, 1) - 1))
      .dom.innerHTML;
    caretAt(editor, 1, 5);
    editor.view.pasteHTML(html);
    expect(idsOf(editor)[0]).toBe(ids[0]);
  });

  it("28. pasted HTML from elsewhere has its ids replaced", () => {
    open(["a"]);
    caretAt(editor, 0, 1);
    editor.view.pasteHTML('<p data-block-id="01J0000000000000000000000B">foreign</p><p>x</p>');
    expect(idsOf(editor)).not.toContain("01J0000000000000000000000B");
  });

  it("29. cut and paste moves a paragraph with its id", () => {
    const [a, b, c] = idsOf(open(["first", "second", "third"]));
    const html = cut(posIn(editor, 1) - 1, posIn(editor, 2) - 1);
    caretAt(editor, 1, 5);
    press(editor, "Enter");
    editor.view.pasteHTML(html);
    expect(idsOf(editor)).toContain(b);
    expect(idsOf(editor).slice(0, 2)).toEqual([a, c]);
  });

  it("30. a paste after the cut is used is a copy again", () => {
    const [, b] = idsOf(open(["first", "second"]));
    const html = cut(posIn(editor, 1) - 1, editor.state.doc.content.size);
    editor.view.pasteHTML(html);
    editor.view.pasteHTML(html);
    expect(idsOf(editor).filter((id) => id === b)).toHaveLength(1);
  });
});

describe("block ids: identity follows the text", () => {
  it("merging a short paragraph with a long one keeps the long one's id", () => {
    const [, long] = idsOf(open(["Hi.", "A much longer paragraph of prose."]));
    caretAt(editor, 1, 0);
    press(editor, "Backspace");
    expect(idsOf(editor)).toEqual([long]);
  });

  it("pasting paragraphs at the start of one leaves the id with its text", () => {
    const [original] = idsOf(open(["original long paragraph"]));
    caretAt(editor, 0, 0);
    editor.view.pasteText("one\n\ntwo");
    expect(textsOf(editor)).toEqual(["one", "twooriginal long paragraph"]);
    expect(idsOf(editor)[1]).toBe(original);
  });

  it("cut, undo, then paste above: the original keeps its id, the copy is new", () => {
    const [, second] = idsOf(open(["first", "second", "third"]));
    const html = cut(posIn(editor, 1) - 1, posIn(editor, 2) - 1);
    editor.commands.undo();
    caretAt(editor, 0, 0);
    editor.view.pasteHTML(html);
    const ids = idsOf(editor);
    expect(ids.filter((id) => id === second)).toHaveLength(1);
    expect(textsOf(editor)[ids.indexOf(second ?? null)]).toBe("second");
  });

  it("replacing the whole chapter with unrelated text gives new ids", () => {
    const ids = idsOf(open(["a", "b"]));
    editor.commands.setContent("<p>unrelated one</p><p>unrelated two</p>");
    expect(idsOf(editor).some((id) => ids.includes(id))).toBe(false);
  });

  it("typing over a selected scene break makes a new block, not a renamed scene break", () => {
    const blocks = [newBlock("Before"), newBlock("", { type: "sceneBreak" }), newBlock("After")];
    open(blocks);
    editor.commands.setNodeSelection(posIn(editor, 1) - 1);
    editor.commands.insertContent("New paragraph");
    expect(idsOf(editor)).not.toContain(blocks[1]?.id);
  });
});
