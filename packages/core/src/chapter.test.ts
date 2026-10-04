import * as A from "@automerge/automerge";
import { describe, expect, it } from "vitest";
import { newBlock, type BlockSnapshot } from "./block.ts";
import { applyEdit, createChapter, readChapter, type Chapter } from "./chapter.ts";

const edit = (chapter: Chapter, changed: BlockSnapshot[], removed: BlockSnapshot[] = []) =>
  applyEdit(chapter, {
    order: readChapter(chapter)
      .map((b) => b.id)
      .filter((id) => !removed.some((r) => r.id === id)),
    changed,
    removed: removed.map((b) => b.id),
  });

describe("chapter storage", () => {
  const title = newBlock("The Crossing", { type: "heading", level: 1 });
  const first = newBlock("The ferry left at dawn.", {
    marks: [{ type: "italic", start: 4, end: 9 }],
  });
  const scene = newBlock("", { type: "sceneBreak" });

  it("round-trips blocks, levels and marks", () => {
    const chapter = createChapter("The Crossing", [title, first, scene]);
    expect(readChapter(chapter)).toEqual([title, first, scene]);
  });

  it("records nothing when nothing changed", () => {
    const chapter = createChapter("c", [first]);
    expect(A.getHeads(edit(chapter, [first]))).toEqual(A.getHeads(chapter));
  });

  it("edits text in place", () => {
    const edited = { ...first, text: "The ferry left at first light." };
    expect(readChapter(edit(createChapter("c", [first]), [edited]))[0]?.text).toBe(edited.text);
  });

  it("changes a block's type and drops its level", () => {
    const asParagraph = newBlock(title.text);
    const retyped = { ...asParagraph, id: title.id };
    expect(readChapter(edit(createChapter("c", [title]), [retyped]))).toEqual([retyped]);
  });

  it("replaces marks", () => {
    const bold = { ...first, marks: [{ type: "bold" as const, start: 0, end: 3 }] };
    expect(readChapter(edit(createChapter("c", [first]), [bold]))[0]?.marks).toEqual(bold.marks);
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
    const chapter = A.change(createChapter("c", [first]), (doc) => {
      doc.order.push(first.id);
    });
    expect(readChapter(chapter)).toEqual([first]);
  });

  describe("two devices editing at once", () => {
    const base = createChapter("c", [first]);
    const merged = (phone: BlockSnapshot, laptop: BlockSnapshot) =>
      readChapter(A.merge(edit(A.clone(base), [phone]), edit(A.clone(base), [laptop])))[0];

    it("merges text edits to one paragraph", () => {
      const result = merged(
        { ...first, text: "The ferry left at dawn, always." },
        { ...first, text: "The old ferry left at dawn." },
      );
      expect(result?.text).toBe("The old ferry left at dawn, always.");
    });

    it("keeps formatting added on both devices", () => {
      const result = merged(
        { ...first, marks: [...first.marks, { type: "bold", start: 0, end: 3 }] },
        { ...first, marks: [...first.marks, { type: "bold", start: 18, end: 22 }] },
      );
      expect(result?.marks).toEqual([
        { type: "bold", start: 0, end: 3 },
        { type: "bold", start: 18, end: 22 },
        { type: "italic", start: 4, end: 9 },
      ]);
    });
  });
});
