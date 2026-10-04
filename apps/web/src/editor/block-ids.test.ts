import type { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createBlock, isBlockId } from "@beckit/core";

import {
  blockPositionOf,
  createTestEditor,
  cutRange,
  expectValidIds,
  idsOf,
  placeCaret,
  positionOf,
  press,
  selectRange,
  textsOf,
} from "./test-editor.ts";

const FOREIGN_ID = "01J0000000000000000000000B";

describe("BlockIds", () => {
  let editor: Editor;

  function load(blocks: Parameters<typeof createTestEditor>[0]): Editor {
    editor = createTestEditor(blocks);
    return editor;
  }

  afterEach(() => {
    expectValidIds(editor);
    editor.destroy();
  });

  describe("when loading", () => {
    it("gives every loaded block an id", () => {
      expect(idsOf(load(["a", "b", "c"])).every(isBlockId)).toBe(true);
    });

    it("keeps the ids it was loaded with", () => {
      const blocks = [createBlock("a"), createBlock("b")];
      expect(idsOf(load(blocks))).toEqual(blocks.map((block) => block.id));
    });

    it("assigns ids to content set without them", () => {
      load(["a"]);
      editor.commands.setContent("<p>one</p><p>two</p>");
      expect(idsOf(editor).every(isBlockId)).toBe(true);
    });

    it("resolves duplicate ids in loaded content, first copy keeping the id", () => {
      load(["a"]);
      editor.commands.setContent(`<p data-block-id="${FOREIGN_ID}">x</p>`.repeat(3));
      expect(idsOf(editor)[0]).toBe(FOREIGN_ID);
    });

    it("gives an empty chapter's paragraph an id", () => {
      expect(idsOf(load([]))).toHaveLength(1);
    });

    it("keeps every id when the same content is loaded again", () => {
      const ids = idsOf(load(["a", "b"]));
      editor.commands.setContent(editor.getJSON());
      expect(idsOf(editor)).toEqual(ids);
    });
  });

  describe("when typing and styling", () => {
    it("keeps the id while typing", () => {
      const ids = idsOf(load(["Mira"]));
      placeCaret(editor, 0, 4);
      editor.commands.insertContent(" waited");
      expect(idsOf(editor)).toEqual(ids);
    });

    it("keeps the id when text is bolded", () => {
      const ids = idsOf(load(["Mira waited"]));
      selectRange(editor, positionOf(editor, 0, 0), positionOf(editor, 0, 4));
      editor.commands.toggleBold();
      expect(idsOf(editor)).toEqual(ids);
    });

    it("keeps the id when a paragraph becomes a heading", () => {
      const ids = idsOf(load(["Title", "Body"]));
      placeCaret(editor, 0, 2);
      editor.commands.setNode("heading", { level: 1 });
      expect(editor.state.doc.firstChild?.type.name).toBe("heading");
      expect(idsOf(editor)).toEqual(ids);
    });

    it("keeps the id when a heading becomes a paragraph", () => {
      const [title] = idsOf(load([createBlock("Title", { type: "heading", level: 1 })]));
      placeCaret(editor, 0, 1);
      editor.commands.setParagraph();
      expect(idsOf(editor)[0]).toBe(title);
    });

    it("gives a new scene break its own id", () => {
      const [before] = idsOf(load(["Before"]));
      placeCaret(editor, 0, 6);
      editor.commands.setHorizontalRule();
      expect(idsOf(editor)[0]).toBe(before);
      expect(idsOf(editor).length).toBeGreaterThan(1);
    });
  });

  describe("when splitting", () => {
    it("keeps the id on the paragraph and gives the new one a fresh id when Enter is pressed at the end", () => {
      const [original] = idsOf(load(["abcdef"]));
      placeCaret(editor, 0, 6);
      press(editor, "Enter");
      expect(textsOf(editor)).toEqual(["abcdef", ""]);
      expect(idsOf(editor)[0]).toBe(original);
    });

    it("leaves the id with the text when Enter is pressed at the start", () => {
      const [original] = idsOf(load(["abcdef"]));
      placeCaret(editor, 0, 0);
      press(editor, "Enter");
      expect(textsOf(editor)).toEqual(["", "abcdef"]);
      expect(idsOf(editor)[1]).toBe(original);
    });

    it("gives the id to a longer first half when Enter is pressed in the middle", () => {
      const [original] = idsOf(load(["abcdef"]));
      placeCaret(editor, 0, 4);
      press(editor, "Enter");
      expect(textsOf(editor)).toEqual(["abcd", "ef"]);
      expect(idsOf(editor)[0]).toBe(original);
    });

    it("gives the id to a longer second half when Enter is pressed in the middle", () => {
      const [original] = idsOf(load(["abcdef"]));
      placeCaret(editor, 0, 2);
      press(editor, "Enter");
      expect(idsOf(editor)[1]).toBe(original);
    });

    it("keeps ids unique across many splits in a row", () => {
      load(["x"]);
      for (let count = 0; count < 300; count++) press(editor, "Enter");
      expect(idsOf(editor)).toHaveLength(301);
    });
  });

  describe("when merging and deleting", () => {
    it("keeps the upper paragraph's id when Backspace merges equal paragraphs", () => {
      const [upper] = idsOf(load(["abc", "def"]));
      placeCaret(editor, 1, 0);
      press(editor, "Backspace");
      expect(textsOf(editor)).toEqual(["abcdef"]);
      expect(idsOf(editor)).toEqual([upper]);
    });

    it("merges the next paragraph in when Delete is pressed at the end", () => {
      const [upper] = idsOf(load(["abc", "def"]));
      placeCaret(editor, 0, 3);
      press(editor, "Delete");
      expect(idsOf(editor)).toEqual([upper]);
    });

    it("keeps the long paragraph's id when a short one merges into it", () => {
      const [, long] = idsOf(load(["Hi.", "A much longer paragraph of prose."]));
      placeCaret(editor, 1, 0);
      press(editor, "Backspace");
      expect(idsOf(editor)).toEqual([long]);
    });

    it("gives the id to the paragraph leaving the most text when deleting across paragraphs", () => {
      const [, , third] = idsOf(load(["abc", "def", "ghi"]));
      selectRange(editor, positionOf(editor, 0, 1), positionOf(editor, 2, 1));
      editor.commands.deleteSelection();
      expect(textsOf(editor)).toEqual(["ahi"]);
      expect(idsOf(editor)).toEqual([third]);
    });

    it("leaves its neighbors' ids alone when a middle paragraph is deleted", () => {
      const [first, , third] = idsOf(load(["a", "b", "c"]));
      selectRange(editor, positionOf(editor, 0, 1), positionOf(editor, 1, 1));
      editor.commands.deleteSelection();
      expect(idsOf(editor)).toEqual([first, third]);
    });

    it("leaves one valid block after select all and type", () => {
      load(["a", "b", "c"]);
      editor.commands.selectAll();
      editor.commands.insertContent("fresh");
      expect(textsOf(editor)).toEqual(["fresh"]);
    });
  });

  describe("when undoing and redoing", () => {
    it("restores the single original id when a split is undone", () => {
      const ids = idsOf(load(["abcdef"]));
      placeCaret(editor, 0, 3);
      press(editor, "Enter");
      editor.commands.undo();
      expect(idsOf(editor)).toEqual(ids);
    });

    it("gives the same ids when a split is redone", () => {
      load(["abcdef"]);
      placeCaret(editor, 0, 3);
      press(editor, "Enter");
      const afterSplit = idsOf(editor);
      editor.commands.undo();
      editor.commands.redo();
      expect(idsOf(editor)).toEqual(afterSplit);
    });

    it("brings a deleted paragraph back with its id when the deletion is undone", () => {
      const ids = idsOf(load(["a", "b", "c"]));
      selectRange(editor, positionOf(editor, 0, 1), positionOf(editor, 2, 0));
      editor.commands.deleteSelection();
      editor.commands.undo();
      expect(idsOf(editor)).toEqual(ids);
    });

    it("keeps the id when a heading change is undone", () => {
      const ids = idsOf(load(["Title"]));
      placeCaret(editor, 0, 1);
      editor.commands.setNode("heading", { level: 2 });
      editor.commands.undo();
      expect(idsOf(editor)).toEqual(ids);
    });
  });

  describe("when pasting and moving", () => {
    it("gives pasted plain text new ids", () => {
      const ids = idsOf(load(["a"]));
      placeCaret(editor, 0, 1);
      editor.view.pasteText("one\n\ntwo\n\nthree");
      expect(idsOf(editor).filter((id) => ids.includes(id))).toEqual(ids);
    });

    it("never duplicates an id when a copy of a paragraph is pasted", () => {
      const ids = idsOf(load(["original", "other"]));
      const slice = editor.state.doc.slice(0, blockPositionOf(editor, 1));
      const html = editor.view.serializeForClipboard(slice).dom.innerHTML;
      placeCaret(editor, 1, 5);
      editor.view.pasteHTML(html);
      expect(idsOf(editor)[0]).toBe(ids[0]);
    });

    it("replaces the ids in HTML pasted from elsewhere", () => {
      load(["a"]);
      placeCaret(editor, 0, 1);
      editor.view.pasteHTML(`<p data-block-id="${FOREIGN_ID}">foreign</p><p>x</p>`);
      expect(idsOf(editor)).not.toContain(FOREIGN_ID);
    });

    it("leaves the id with its text when paragraphs are pasted at its start", () => {
      const [original] = idsOf(load(["original long paragraph"]));
      placeCaret(editor, 0, 0);
      editor.view.pasteText("one\n\ntwo");
      expect(textsOf(editor)).toEqual(["one", "twooriginal long paragraph"]);
      expect(idsOf(editor)[1]).toBe(original);
    });

    it("moves a paragraph with its id when it is cut and pasted", () => {
      const [first, second, third] = idsOf(load(["first", "second", "third"]));
      const html = cutRange(editor, blockPositionOf(editor, 1), blockPositionOf(editor, 2));
      placeCaret(editor, 1, 5);
      press(editor, "Enter");
      editor.view.pasteHTML(html);
      expect(idsOf(editor)).toContain(second);
      expect(idsOf(editor).slice(0, 2)).toEqual([first, third]);
    });

    it("treats a second paste of the same cut as a copy", () => {
      const [, second] = idsOf(load(["first", "second"]));
      const html = cutRange(editor, blockPositionOf(editor, 1), editor.state.doc.content.size);
      editor.view.pasteHTML(html);
      editor.view.pasteHTML(html);
      expect(idsOf(editor).filter((id) => id === second)).toHaveLength(1);
    });

    it("keeps the original's id after cut, undo, then paste above", () => {
      const [, second] = idsOf(load(["first", "second", "third"]));
      const html = cutRange(editor, blockPositionOf(editor, 1), blockPositionOf(editor, 2));
      editor.commands.undo();
      placeCaret(editor, 0, 0);
      editor.view.pasteHTML(html);
      const ids = idsOf(editor);
      expect(ids.filter((id) => id === second)).toHaveLength(1);
      expect(textsOf(editor)[ids.indexOf(second)]).toBe("second");
    });
  });

  describe("when text is replaced", () => {
    it("gives new ids when the whole chapter is replaced with unrelated text", () => {
      const ids = idsOf(load(["a", "b"]));
      editor.commands.setContent("<p>unrelated one</p><p>unrelated two</p>");
      expect(idsOf(editor).some((id) => ids.includes(id))).toBe(false);
    });

    it("makes a new block, not a renamed scene break, when typing over a selected scene break", () => {
      const blocks = [
        createBlock("Before"),
        createBlock("", { type: "sceneBreak" }),
        createBlock("After"),
      ];
      load(blocks);
      editor.commands.setNodeSelection(blockPositionOf(editor, 1));
      editor.commands.insertContent("New paragraph");
      expect(idsOf(editor)).not.toContain(blocks[1]?.id);
    });
  });
});
