import type { DocHandle, Repo } from "@automerge/automerge-repo";

import {
  createNodeId,
  createPieceNode,
  insertNode,
  type ManuscriptDoc,
  moveNode,
  type NodeId,
  type Place,
  removeNode,
  renameNode,
  stepPlaceOf,
  type TreeStep,
} from "@beckit/core";

import { storeChapter } from "./documents.ts";

/** A title as typed, trimmed; undefined when blank, so a blank title keeps the old one. */
function cleanTitleOf(title: string): string | undefined {
  const trimmed = title.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** Adds an empty piece, with its own empty chapter, at `place`; returns its id. */
export function addPiece(
  repo: Repo,
  manuscript: DocHandle<ManuscriptDoc>,
  place: Place,
  title: string,
): NodeId {
  const chapterUrl = storeChapter(repo).url;
  const id = createNodeId();
  manuscript.change((doc) => {
    insertNode(doc, place, createPieceNode(title, chapterUrl), id);
  });
  return id;
}

/** Adds an empty section at `place`. */
export function addSection(
  manuscript: DocHandle<ManuscriptDoc>,
  place: Place,
  title: string,
): void {
  manuscript.change((doc) => {
    insertNode(doc, place, { kind: "section", title, children: [] });
  });
}

/** Moves a node to `place`, with everything inside it. */
export function moveTo(manuscript: DocHandle<ManuscriptDoc>, id: NodeId, place: Place): void {
  manuscript.change((doc) => {
    moveNode(doc, id, place);
  });
}

/** Moves a node one step (up, down, in or out), if it can go that way. */
export function moveByStep(manuscript: DocHandle<ManuscriptDoc>, id: NodeId, step: TreeStep): void {
  const place = stepPlaceOf(manuscript.doc(), id, step);
  if (place) moveTo(manuscript, id, place);
}

/** Renames a node; a blank title keeps the old one. */
export function rename(manuscript: DocHandle<ManuscriptDoc>, id: NodeId, title: string): void {
  const cleaned = cleanTitleOf(title);
  if (cleaned === undefined) return;
  manuscript.change((doc) => {
    renameNode(doc, id, cleaned);
  });
}

/** Removes a node and everything inside it from the tree. Its text stays on the device. */
export function remove(manuscript: DocHandle<ManuscriptDoc>, id: NodeId): void {
  manuscript.change((doc) => {
    removeNode(doc, id);
  });
}

/** Renames the whole project; a blank title keeps the old one. */
export function renameProject(manuscript: DocHandle<ManuscriptDoc>, title: string): void {
  const cleaned = cleanTitleOf(title);
  if (cleaned === undefined || cleaned === manuscript.doc().title) return;
  manuscript.change((doc) => {
    doc.title = cleaned;
  });
}
