import type { DocHandle, Repo } from "@automerge/automerge-repo";

import {
  createManuscriptDoc,
  createNodeId,
  type Format,
  insertNode,
  type ManuscriptDoc,
  type ManuscriptNode,
  type NodeId,
  type PlannedPage,
  planProject,
} from "@beckit/core";

import { createChapterDoc } from "./documents.ts";

/** A project just created: its manuscript and the empty piece it opens on. */
export interface CreatedProject {
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly firstPieceId: NodeId;
}

const UNTITLED = "Untitled";

function toNode(repo: Repo, { title, blocks, isContents }: PlannedPage): ManuscriptNode {
  if (isContents) return { kind: "contents", title };
  return { kind: "piece", title, chapterUrl: createChapterDoc(repo, blocks).url, words: 0 };
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
      insertNode(doc, { parent: part, index: doc[part].length }, node, id);
    }
  });
  const body = entries.find(({ part }) => part === "body");
  if (!body) throw new Error(`Format ${format.id} plans no body`);
  return { manuscript, firstPieceId: body.id };
}
