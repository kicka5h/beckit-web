import * as Automerge from "@automerge/automerge";
import { describe, expect, it } from "vitest";

import {
  childIdsOf,
  countProjectWords,
  createManuscriptDoc,
  createNodeId,
  insertNode,
  isNodeId,
  isPart,
  type Manuscript,
  type ManuscriptDoc,
  type ManuscriptNode,
  type NodeId,
  type PieceNode,
  piecesOf,
  type Place,
  writePieceWords,
} from "./manuscript.ts";

function createPiece(title: string, words = 0): PieceNode {
  return { kind: "piece", title, chapterUrl: `automerge:${title}`, words };
}

function createSection(title: string): ManuscriptNode {
  return { kind: "section", title, children: [] };
}

/** The id at `index`, failing the test if there is none. */
function idAt(ids: readonly NodeId[], index: number): NodeId {
  const id = ids[index];
  if (!id) throw new Error(`No node at index ${String(index)}`);
  return id;
}

/** Inserts nodes one after another, each at its place, and returns the manuscript with their ids. */
function build(
  entries: readonly (readonly [Place, ManuscriptNode])[],
): readonly [Manuscript, NodeId[]] {
  const ids: NodeId[] = [];
  const manuscript = Automerge.change(
    Automerge.from<ManuscriptDoc>(createManuscriptDoc("Book", "blank")),
    (doc) => {
      for (const [place, node] of entries) ids.push(insertNode(doc, place, node));
    },
  );
  return [manuscript, ids];
}

describe("createNodeId", () => {
  it("mints valid, distinct ids", () => {
    const first = createNodeId();
    expect(isNodeId(first)).toBe(true);
    expect(createNodeId()).not.toBe(first);
  });

  it("rejects values that are not ids", () => {
    expect(isNodeId("chapter-1")).toBe(false);
    expect(isNodeId(7)).toBe(false);
  });
});

describe("isPart", () => {
  it("tells parts from section ids", () => {
    expect(isPart("body")).toBe(true);
    expect(isPart(createNodeId())).toBe(false);
  });
});

describe("insertNode", () => {
  it("adds nodes to a part in order", () => {
    const [manuscript, ids] = build([
      [{ parent: "body", index: 0 }, createPiece("One")],
      [{ parent: "body", index: 1 }, createPiece("Two")],
    ]);
    expect(childIdsOf(manuscript, "body")).toEqual(ids);
  });

  it("inserts before an existing node", () => {
    const [manuscript, ids] = build([
      [{ parent: "body", index: 0 }, createPiece("Two")],
      [{ parent: "body", index: 0 }, createPiece("One")],
    ]);
    expect(childIdsOf(manuscript, "body")).toEqual(ids.toReversed());
  });

  it("appends when the index is past the end", () => {
    const [manuscript, ids] = build([
      [{ parent: "front", index: 0 }, createPiece("Dedication")],
      [{ parent: "front", index: 9 }, createPiece("Epigraph")],
    ]);
    expect(childIdsOf(manuscript, "front")).toEqual(ids);
  });

  it("uses the id it is given", () => {
    const id = createNodeId();
    const manuscript = Automerge.change(
      Automerge.from<ManuscriptDoc>(createManuscriptDoc("Book", "blank")),
      (doc) => {
        insertNode(doc, { parent: "body", index: 0 }, createPiece("One"), id);
      },
    );
    expect(childIdsOf(manuscript, "body")).toEqual([id]);
  });

  it("nests nodes inside a section", () => {
    const [manuscript, ids] = build([[{ parent: "body", index: 0 }, createSection("Part One")]]);
    const part = idAt(ids, 0);
    const next = Automerge.change(manuscript, (doc) => {
      insertNode(doc, { parent: part, index: 0 }, createPiece("Chapter 1"));
    });
    expect(childIdsOf(next, part)).toHaveLength(1);
  });
});

describe("childIdsOf", () => {
  it("lists nothing under a piece or a missing node", () => {
    const [manuscript, ids] = build([[{ parent: "body", index: 0 }, createPiece("One")]]);
    expect(childIdsOf(manuscript, idAt(ids, 0))).toEqual([]);
    expect(childIdsOf(manuscript, createNodeId())).toEqual([]);
  });
});

describe("piecesOf", () => {
  it("lists pieces depth first, skipping sections and contents pages", () => {
    const [manuscript, ids] = build([
      [{ parent: "body", index: 0 }, createSection("Part One")],
      [
        { parent: "body", index: 1 },
        { kind: "contents", title: "Contents" },
      ],
      [{ parent: "body", index: 0 }, createPiece("Prologue")],
    ]);
    const next = Automerge.change(manuscript, (doc) => {
      insertNode(doc, { parent: idAt(ids, 0), index: 0 }, createPiece("Chapter 1"));
    });
    const pieces = piecesOf(next, "body");
    expect(pieces.map(({ piece }) => piece.title)).toEqual(["Prologue", "Chapter 1"]);
    expect(pieces[0]?.id).toBe(idAt(ids, 2));
  });
});

describe("countProjectWords", () => {
  it("sums the body and leaves out front and back matter", () => {
    const [manuscript] = build([
      [{ parent: "front", index: 0 }, createPiece("Dedication", 5)],
      [{ parent: "body", index: 0 }, createPiece("One", 1000)],
      [{ parent: "body", index: 1 }, createPiece("Two", 2500)],
      [{ parent: "back", index: 0 }, createPiece("About the author", 120)],
    ]);
    expect(countProjectWords(manuscript)).toBe(3500);
  });
});

describe("writePieceWords", () => {
  const [manuscript, ids] = build([
    [{ parent: "body", index: 0 }, createPiece("One", 10)],
    [{ parent: "body", index: 1 }, createSection("Part")],
  ]);

  it("updates a piece's count", () => {
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      writePieceWords(doc, idAt(ids, 0), 12);
    });
    expect(countProjectWords(next)).toBe(12);
  });

  it("records nothing when the count is unchanged or the node is not a piece", () => {
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      writePieceWords(doc, idAt(ids, 0), 10);
      writePieceWords(doc, idAt(ids, 1), 99);
    });
    expect(Automerge.getHeads(next)).toEqual(Automerge.getHeads(manuscript));
  });
});
