import * as Automerge from "@automerge/automerge";
import { describe, expect, it } from "vitest";

import { type BlockSnapshot, createBlock } from "./block.ts";
import { applyEdit, type Chapter, createChapter, readChapter } from "./chapter.ts";

/** Applies changed blocks to a chapter, keeping its current order. */
function editBlocks(chapter: Chapter, changed: readonly BlockSnapshot[]): Chapter {
  const order = readChapter(chapter).map((block) => block.id);
  return applyEdit(chapter, { order, changed, removed: [] });
}

function firstBlockOf(chapter: Chapter): BlockSnapshot | undefined {
  return readChapter(chapter)[0];
}

describe("Chapter", () => {
  const title = createBlock("The Crossing", { type: "heading", level: 1 });
  const first = createBlock("The ferry left at dawn.", {
    marks: [{ type: "italic", start: 4, end: 9 }],
  });
  const scene = createBlock("", { type: "sceneBreak" });

  it("round-trips blocks, levels and marks", () => {
    const chapter = createChapter("The Crossing", [title, first, scene]);
    expect(readChapter(chapter)).toEqual([title, first, scene]);
  });

  it("records nothing when nothing changed", () => {
    const chapter = createChapter("c", [first]);
    expect(Automerge.getHeads(editBlocks(chapter, [first]))).toEqual(Automerge.getHeads(chapter));
  });

  it("edits text in place", () => {
    const edited = { ...first, text: "The ferry left at first light." };
    expect(firstBlockOf(editBlocks(createChapter("c", [first]), [edited]))?.text).toBe(edited.text);
  });

  it("turns a heading into a paragraph and drops its level", () => {
    const retyped = { ...createBlock(title.text), id: title.id };
    expect(readChapter(editBlocks(createChapter("c", [title]), [retyped]))).toEqual([retyped]);
  });

  it("changes a heading's level", () => {
    const smaller = { ...title, level: 2 };
    expect(firstBlockOf(editBlocks(createChapter("c", [title]), [smaller]))).toEqual(smaller);
  });

  it("replaces marks", () => {
    const bold: BlockSnapshot = { ...first, marks: [{ type: "bold", start: 0, end: 3 }] };
    expect(firstBlockOf(editBlocks(createChapter("c", [first]), [bold]))?.marks).toEqual(
      bold.marks,
    );
  });

  it("removes and reorders blocks by id", () => {
    const chapter = createChapter("c", [title, first, scene]);
    const next = applyEdit(chapter, {
      order: [scene.id, title.id],
      changed: [],
      removed: [first.id],
    });
    expect(readChapter(next)).toEqual([scene, title]);
    expect(Object.keys(next.blocks)).not.toContain(first.id);
  });

  it("lists a block once even if its id is in the order twice", () => {
    const chapter = Automerge.change(createChapter("c", [first]), (doc) => {
      doc.order.push(first.id);
    });
    expect(readChapter(chapter)).toEqual([first]);
  });

  it("skips an id in the order whose block was deleted on another device", () => {
    const chapter = Automerge.change(createChapter("c", [first, scene]), (doc) => {
      Reflect.deleteProperty(doc.blocks, scene.id);
    });
    expect(readChapter(chapter)).toEqual([first]);
  });

  it("ignores marks Beckit doesn't own, such as another tool's annotations", () => {
    const chapter = Automerge.change(createChapter("c", [first]), (doc) => {
      const path = ["blocks", first.id, "text"];
      Automerge.mark(doc, path, { start: 0, end: 3, expand: "none" }, "comment", "note-1");
      Automerge.mark(doc, path, { start: 0, end: 3, expand: "none" }, "bold", false);
    });
    expect(firstBlockOf(chapter)?.marks).toEqual(first.marks);
  });

  describe("when two devices edit at once", () => {
    const base = createChapter("c", [first]);

    function mergeEdits(phone: BlockSnapshot, laptop: BlockSnapshot): BlockSnapshot | undefined {
      const phoneCopy = editBlocks(Automerge.clone(base), [phone]);
      const laptopCopy = editBlocks(Automerge.clone(base), [laptop]);
      return firstBlockOf(Automerge.merge(phoneCopy, laptopCopy));
    }

    it("merges text edits to one paragraph", () => {
      const merged = mergeEdits(
        { ...first, text: "The ferry left at dawn, always." },
        { ...first, text: "The old ferry left at dawn." },
      );
      expect(merged?.text).toBe("The old ferry left at dawn, always.");
    });

    it("keeps formatting added on both devices", () => {
      const merged = mergeEdits(
        { ...first, marks: [...first.marks, { type: "bold", start: 0, end: 3 }] },
        { ...first, marks: [...first.marks, { type: "bold", start: 18, end: 22 }] },
      );
      expect(merged?.marks).toEqual([
        { type: "bold", start: 0, end: 3 },
        { type: "bold", start: 18, end: 22 },
        { type: "italic", start: 4, end: 9 },
      ]);
    });
  });
});
