import type { DocHandle, Repo } from "@automerge/automerge-repo";

import {
  createNodeId,
  insertNode,
  type ManuscriptDoc,
  moveNode,
  type NodeId,
  type Place,
  placeAfterStep,
  removeNode,
  renameNode,
  type TreeStep,
} from "@beckit/core";

import { createChapterDoc } from "./documents.ts";

/** Adds an empty piece, with its own empty chapter, at `place`; returns its id. */
export function addPiece(
  repo: Repo,
  manuscript: DocHandle<ManuscriptDoc>,
  place: Place,
  title: string,
): NodeId {
  const chapterUrl = createChapterDoc(repo).url;
  const id = createNodeId();
  manuscript.change((doc) => {
    insertNode(doc, place, { kind: "piece", title, chapterUrl, words: 0 }, id);
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
  const place = placeAfterStep(manuscript.doc(), id, step);
  if (place) moveTo(manuscript, id, place);
}

/** Renames a node; a blank title keeps the old one. */
export function rename(manuscript: DocHandle<ManuscriptDoc>, id: NodeId, title: string): void {
  const trimmed = title.trim();
  if (!trimmed) return;
  manuscript.change((doc) => {
    renameNode(doc, id, trimmed);
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
  const trimmed = title.trim();
  if (!trimmed || trimmed === manuscript.doc().title) return;
  manuscript.change((doc) => {
    doc.title = trimmed;
  });
}
