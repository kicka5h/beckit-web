import type { DocHandle, Repo } from "@automerge/automerge-repo";

import {
  type ChapterDoc,
  createNodeId,
  findPlace,
  formatOf,
  insertNode,
  isNodeId,
  type ManuscriptDoc,
  type NodeId,
  type Part,
  PARTS,
  piecesOf,
  type Place,
} from "@beckit/core";

import type { DeviceSettings } from "../device/device-settings.ts";
import { createProject } from "./create-project.ts";
import { createChapterDoc, findStored } from "./documents.ts";
import { addToLibrary, type LibraryDoc, openLibrary } from "./library.ts";

/**
 * The project open on this device: its manuscript, and the page being shown. A piece comes with
 * its chapter; a contents page has none, as it is drawn from the tree.
 */
export interface OpenProject {
  readonly repo: Repo;
  readonly library: DocHandle<LibraryDoc>;
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly nodeId: NodeId;
  readonly chapter: DocHandle<ChapterDoc> | undefined;
}

/** What to open next: another page of this project, or another project. */
export interface OpenTarget {
  readonly manuscriptUrl?: string;
  readonly nodeId?: NodeId;
}

const MANUSCRIPT_KEY = "manuscript";
const NODE_KEY = "piece";

/** Adds an empty piece to the end of the body and returns its id. */
function addEmptyPiece(repo: Repo, manuscript: DocHandle<ManuscriptDoc>): NodeId {
  const id = createNodeId();
  const title = formatOf(manuscript.doc().format).firstTitle;
  const chapterUrl = createChapterDoc(repo).url;
  manuscript.change((doc) => {
    const place: Place = { parent: "body", index: doc.body.length };
    insertNode(doc, place, { kind: "piece", title, chapterUrl, words: 0 }, id);
  });
  return id;
}

/** The page to open: the one open last time if it is still in the tree, otherwise the first piece. */
function nodeToOpen(manuscript: ManuscriptDoc, remembered: string | undefined): NodeId | undefined {
  if (isNodeId(remembered) && findPlace(manuscript, remembered)) {
    const kind = manuscript.nodes[remembered]?.kind;
    if (kind === "piece" || kind === "contents") return remembered;
  }
  const parts: Part[] = ["body", ...PARTS.filter((part) => part !== "body")];
  return parts.flatMap((part) => piecesOf(manuscript, part))[0]?.id;
}

/** Opens a piece's chapter, giving it a fresh empty chapter if its text is not on this device. */
async function openChapter(
  repo: Repo,
  manuscript: DocHandle<ManuscriptDoc>,
  nodeId: NodeId,
): Promise<DocHandle<ChapterDoc> | undefined> {
  const node = manuscript.doc().nodes[nodeId];
  if (node?.kind !== "piece") return undefined;
  const stored = await findStored<ChapterDoc>(repo, node.chapterUrl);
  if (stored) return stored;
  const chapter = createChapterDoc(repo);
  manuscript.change((doc) => {
    const piece = doc.nodes[nodeId];
    if (piece?.kind === "piece") piece.chapterUrl = chapter.url;
  });
  return chapter;
}

/** Remembers what to open next time; the next `openProject` opens it. */
export function rememberTarget(settings: DeviceSettings, target: OpenTarget): void {
  if (target.manuscriptUrl !== undefined) settings.write(MANUSCRIPT_KEY, target.manuscriptUrl);
  settings.write(NODE_KEY, target.nodeId ?? "");
}

/**
 * Reopens the project and page this device had open, or starts a new, blank one: a new book opens
 * to a blank page, and its title and chapters can wait.
 */
export async function openProject(repo: Repo, settings: DeviceSettings): Promise<OpenProject> {
  const library = await openLibrary(repo, settings);
  const manuscript =
    (await findStored<ManuscriptDoc>(repo, settings.read(MANUSCRIPT_KEY))) ??
    createProject(repo, formatOf("blank")).manuscript;
  addToLibrary(library, manuscript.url);
  const nodeId =
    nodeToOpen(manuscript.doc(), settings.read(NODE_KEY)) ?? addEmptyPiece(repo, manuscript);
  const chapter = await openChapter(repo, manuscript, nodeId);
  rememberTarget(settings, { manuscriptUrl: manuscript.url, nodeId });
  return { repo, library, manuscript, nodeId, chapter };
}
