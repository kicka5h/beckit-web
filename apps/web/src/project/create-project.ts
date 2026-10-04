import type { DocHandle, Repo } from "@automerge/automerge-repo";

import {
  createManuscriptDoc,
  createNodeId,
  createPieceNode,
  endPlaceOf,
  type Format,
  insertNode,
  type ManuscriptDoc,
  type ManuscriptNode,
  type NodeId,
  type PlannedPage,
  planProject,
  UNTITLED,
} from "@beckit/core";

import { storeChapter } from "./documents.ts";

/** A project just created: its manuscript and the empty piece it opens on. */
export interface CreatedProject {
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly firstPieceId: NodeId;
}

function toNode(repo: Repo, { title, blocks, isContents }: PlannedPage): ManuscriptNode {
  if (isContents) return { kind: "contents", title };
  return createPieceNode(title, storeChapter(repo, blocks).url);
}

/**
 * Creates a project from a format: every pre-made page becomes an ordinary piece with its own
 * chapter, so it has history and syncs like the rest.
 */
export function createProject(repo: Repo, format: Format): CreatedProject {
  const entries = planProject(format).map((page) => ({
    part: page.part,
    id: createNodeId(),
    node: toNode(repo, page),
  }));
  const manuscript = repo.create(createManuscriptDoc(UNTITLED, format.id));
  manuscript.change((doc) => {
    for (const { part, id, node } of entries) {
      insertNode(doc, endPlaceOf(doc, part), node, id);
    }
  });
  const body = entries.find(({ part }) => part === "body");
  if (!body) throw new Error(`Format ${format.id} plans no body`);
  return { manuscript, firstPieceId: body.id };
}
