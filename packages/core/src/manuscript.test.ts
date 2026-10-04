import * as Automerge from "@automerge/automerge";
import { describe, expect, it } from "vitest";

import {
  childIdsOf,
  countProjectWords,
  createManuscriptDoc,
  createNodeId,
  createPieceNode,
  endPlaceOf,
  findPlace,
  insertNode,
  isNodeId,
  isPart,
  type Manuscript,
  type ManuscriptDoc,
  type ManuscriptNode,
  moveNode,
  type NodeId,
  outlineOf,
  type PieceNode,
  piecesOf,
  type Place,
  removeNode,
  renameNode,
  repeatScopeOf,
  sectionOf,
  stepPlaceOf,
  type TreeStep,
  writePieceWords,
} from "./manuscript.ts";

function createPiece(title: string, words = 0): PieceNode {
  return { ...createPieceNode(title, `automerge:${title}`), words };
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

/** A body holding a part with one chapter inside it, then an epilogue. */
function buildPartAndEpilogue(): {
  readonly manuscript: Manuscript;
  readonly part: NodeId;
  readonly chapter: NodeId;
  readonly epilogue: NodeId;
} {
  const [manuscript, ids] = build([
    [{ parent: "body", index: 0 }, createSection("Part")],
    [{ parent: "body", index: 1 }, createPiece("Epilogue")],
  ]);
  const part = idAt(ids, 0);
  const chapter = createNodeId();
  const withChapter = Automerge.change(Automerge.clone(manuscript), (doc) => {
    insertNode(doc, { parent: part, index: 0 }, createPiece("Chapter 1"), chapter);
  });
  return { manuscript: withChapter, part, chapter, epilogue: idAt(ids, 1) };
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

describe("endPlaceOf", () => {
  it("places after the last node of a part or section", () => {
    const { manuscript, part } = buildPartAndEpilogue();
    expect(endPlaceOf(manuscript, "body")).toEqual({ parent: "body", index: 2 });
    expect(endPlaceOf(manuscript, part)).toEqual({ parent: part, index: 1 });
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

describe("findPlace", () => {
  it("finds nodes in parts and inside sections", () => {
    const [manuscript, ids] = build([
      [{ parent: "back", index: 0 }, createPiece("About")],
      [{ parent: "body", index: 0 }, createSection("Part One")],
    ]);
    const part = idAt(ids, 1);
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      insertNode(doc, { parent: part, index: 0 }, createPiece("Chapter 1"));
    });
    const [chapter] = childIdsOf(next, part);
    expect(findPlace(next, idAt(ids, 0))).toEqual({ parent: "back", index: 0 });
    expect(findPlace(next, chapter ?? createNodeId())).toEqual({ parent: part, index: 0 });
    expect(findPlace(next, createNodeId())).toBeUndefined();
  });
});

describe("moveNode", () => {
  /** A body of three pieces and an empty section, as [manuscript, [one, two, three, part]]. */
  function buildBody(): readonly [Manuscript, NodeId[]] {
    return build([
      [{ parent: "body", index: 0 }, createPiece("One")],
      [{ parent: "body", index: 1 }, createPiece("Two")],
      [{ parent: "body", index: 2 }, createPiece("Three")],
      [{ parent: "body", index: 3 }, createSection("Part")],
    ]);
  }

  function move(manuscript: Manuscript, id: NodeId, place: Place): readonly [Manuscript, boolean] {
    let isMoved = false;
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      isMoved = moveNode(doc, id, place);
    });
    return [next, isMoved];
  }

  it("moves a node up within its list", () => {
    const [manuscript, ids] = buildBody();
    const [next] = move(manuscript, idAt(ids, 2), { parent: "body", index: 0 });
    expect(childIdsOf(next, "body")).toEqual([ids[2], ids[0], ids[1], ids[3]]);
  });

  it("moves a node down, counting the index before the move", () => {
    const [manuscript, ids] = buildBody();
    const [next] = move(manuscript, idAt(ids, 0), { parent: "body", index: 2 });
    expect(childIdsOf(next, "body")).toEqual([ids[1], ids[0], ids[2], ids[3]]);
  });

  it("records nothing when a node is moved to where it already is", () => {
    const [manuscript, ids] = buildBody();
    const [next, isMoved] = move(manuscript, idAt(ids, 1), { parent: "body", index: 2 });
    expect(isMoved).toBe(true);
    expect(Automerge.getHeads(next)).toEqual(Automerge.getHeads(manuscript));
  });

  it("moves a node into a section and out to another part", () => {
    const [manuscript, ids] = buildBody();
    const part = idAt(ids, 3);
    const [inside] = move(manuscript, idAt(ids, 0), { parent: part, index: 0 });
    expect(childIdsOf(inside, part)).toEqual([ids[0]]);
    const [outside] = move(inside, idAt(ids, 0), { parent: "back", index: 5 });
    expect(childIdsOf(outside, part)).toEqual([]);
    expect(childIdsOf(outside, "back")).toEqual([ids[0]]);
  });

  it("refuses to move a section into itself or into its own children", () => {
    const [manuscript, ids] = buildBody();
    const part = idAt(ids, 3);
    const [withChild] = move(manuscript, idAt(ids, 0), { parent: part, index: 0 });
    const inner = insertSection(withChild, part);
    expect(move(withChild, part, { parent: part, index: 0 })[1]).toBe(false);
    expect(move(inner[0], part, { parent: inner[1], index: 0 })[1]).toBe(false);
  });

  it("refuses to move a node that is not in the tree", () => {
    const [manuscript] = buildBody();
    expect(move(manuscript, createNodeId(), { parent: "body", index: 0 })[1]).toBe(false);
  });

  /** Adds an empty section inside `parent`, as [manuscript, its id]. */
  function insertSection(manuscript: Manuscript, parent: NodeId): readonly [Manuscript, NodeId] {
    const id = createNodeId();
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      insertNode(doc, { parent, index: 0 }, createSection("Inner"), id);
    });
    return [next, id];
  }
});

describe("renameNode", () => {
  it("renames a node and records nothing when the title is the same", () => {
    const [manuscript, ids] = build([[{ parent: "body", index: 0 }, createPiece("One")]]);
    const renamed = Automerge.change(Automerge.clone(manuscript), (doc) => {
      renameNode(doc, idAt(ids, 0), "The Crossing");
    });
    expect(renamed.nodes[idAt(ids, 0)]?.title).toBe("The Crossing");
    const again = Automerge.change(Automerge.clone(renamed), (doc) => {
      renameNode(doc, idAt(ids, 0), "The Crossing");
      renameNode(doc, createNodeId(), "Missing");
    });
    expect(Automerge.getHeads(again)).toEqual(Automerge.getHeads(renamed));
  });
});

describe("removeNode", () => {
  it("removes a section with everything inside it", () => {
    const { manuscript, part, epilogue } = buildPartAndEpilogue();
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      removeNode(doc, part);
      removeNode(doc, createNodeId());
    });
    expect(childIdsOf(next, "body")).toEqual([epilogue]);
    expect(Object.keys(next.nodes)).toEqual([epilogue]);
  });
});

describe("outlineOf", () => {
  it("lists front, body and back in reading order with their depth", () => {
    const [manuscript, ids] = build([
      [{ parent: "back", index: 0 }, createPiece("About")],
      [{ parent: "body", index: 0 }, createSection("Part")],
      [
        { parent: "front", index: 0 },
        { kind: "contents", title: "Contents" },
      ],
    ]);
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      insertNode(doc, { parent: idAt(ids, 1), index: 0 }, createPiece("Chapter 1"));
      doc.body.push(createNodeId());
    });
    expect(
      outlineOf(next).map(({ node, part, depth }) => [node.title, part, depth] as const),
    ).toEqual([
      ["Contents", "front", 0],
      ["Part", "body", 0],
      ["Chapter 1", "body", 1],
      ["About", "back", 0],
    ]);
  });
});

describe("sectionOf", () => {
  it("names the section a piece is in, or nothing for a piece directly in a part", () => {
    const { manuscript, part, chapter, epilogue } = buildPartAndEpilogue();
    expect(sectionOf(manuscript, chapter)).toBe(part);
    expect(sectionOf(manuscript, epilogue)).toBeUndefined();
    expect(sectionOf(manuscript, createNodeId())).toBeUndefined();
  });
});

describe("stepPlaceOf", () => {
  /** Body: [section, one, two], with `inner` inside the section. */
  function buildSteps(): { readonly manuscript: Manuscript; readonly ids: readonly NodeId[] } {
    const inner = createNodeId();
    const [manuscript, ids] = build([
      [{ parent: "body", index: 0 }, createSection("Part")],
      [{ parent: "body", index: 1 }, createPiece("One")],
      [{ parent: "body", index: 2 }, createPiece("Two")],
    ]);
    const withInner = Automerge.change(Automerge.clone(manuscript), (doc) => {
      insertNode(doc, { parent: idAt(ids, 0), index: 0 }, createPiece("Inner"), inner);
    });
    return {
      manuscript: withInner,
      ids: [idAt(ids, 0), idAt(ids, 1), idAt(ids, 2), inner],
    };
  }

  const moves: readonly (readonly [string, number, TreeStep, (ids: readonly NodeId[]) => Place])[] =
    [
      ["moves up past the node above", 2, "up", () => ({ parent: "body", index: 1 })],
      ["moves down past the node below", 1, "down", () => ({ parent: "body", index: 3 })],
      [
        "moves into the end of the section above",
        1,
        "in",
        (ids) => ({ parent: idAt(ids, 0), index: 1 }),
      ],
      ["moves out of a section to just after it", 3, "out", () => ({ parent: "body", index: 1 })],
    ];

  it.each(moves)("%s", (_behavior, index, step, placeFor) => {
    const { manuscript, ids } = buildSteps();
    expect(stepPlaceOf(manuscript, idAt(ids, index), step)).toEqual(placeFor(ids));
  });

  const refusals: readonly (readonly [string, number, TreeStep])[] = [
    ["cannot move the first node up", 0, "up"],
    ["cannot move the last node down", 2, "down"],
    ["cannot move in when the node above is not a section", 2, "in"],
    ["cannot move the first node in", 0, "in"],
    ["cannot move out of a part", 1, "out"],
  ];

  it.each(refusals)("%s", (_behavior, index, step) => {
    const { manuscript, ids } = buildSteps();
    expect(stepPlaceOf(manuscript, idAt(ids, index), step)).toBeUndefined();
  });

  it("finds no step for a node that is not in the tree", () => {
    const { manuscript } = buildSteps();
    expect(stepPlaceOf(manuscript, createNodeId(), "up")).toBeUndefined();
  });

  it("finds no way out of a section that has itself left the tree", () => {
    const { manuscript, ids } = buildSteps();
    const detached = Automerge.change(Automerge.clone(manuscript), (doc) => {
      doc.body.splice(0, 1);
    });
    expect(stepPlaceOf(detached, idAt(ids, 3), "out")).toBeUndefined();
  });
});

describe("repeatScopeOf", () => {
  it("covers every piece of the section the piece is in", () => {
    const { manuscript, part, chapter } = buildPartAndEpilogue();
    const second = createNodeId();
    const next = Automerge.change(Automerge.clone(manuscript), (doc) => {
      insertNode(doc, { parent: part, index: 1 }, createPiece("Chapter 2"), second);
    });
    expect(repeatScopeOf(next, chapter)).toEqual([chapter, second]);
  });

  it("covers only the piece when it sits outside the project's sections", () => {
    const { manuscript, epilogue } = buildPartAndEpilogue();
    expect(repeatScopeOf(manuscript, epilogue)).toEqual([epilogue]);
  });

  it("covers the whole body when the project has no sections", () => {
    const [manuscript, ids] = build([
      [{ parent: "front", index: 0 }, createPiece("Dedication")],
      [{ parent: "body", index: 0 }, createPiece("One")],
      [{ parent: "body", index: 1 }, createPiece("Two")],
    ]);
    expect(repeatScopeOf(manuscript, idAt(ids, 1))).toEqual([ids[1], ids[2]]);
  });
});
