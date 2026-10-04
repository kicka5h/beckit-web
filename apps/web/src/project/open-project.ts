import { type DocHandle, isValidAutomergeUrl, type Repo } from "@automerge/automerge-repo";

import {
  type ChapterDoc,
  createManuscriptDoc,
  createNodeId,
  insertNode,
  isNodeId,
  type ManuscriptDoc,
  type NodeId,
  type PieceNode,
  piecesOf,
} from "@beckit/core";

import type { DeviceSettings } from "../device/device-settings.ts";

/** The project open on this device: its manuscript, and the piece being written with its text. */
export interface OpenProject {
  readonly repo: Repo;
  readonly manuscript: DocHandle<ManuscriptDoc>;
  readonly pieceId: NodeId;
  readonly chapter: DocHandle<ChapterDoc>;
}

const MANUSCRIPT_KEY = "manuscript";
const PIECE_KEY = "piece";
const UNTITLED = "Untitled";
const BLANK_FORMAT = "blank";

function createChapterHandle(repo: Repo): DocHandle<ChapterDoc> {
  return repo.create<ChapterDoc>({ order: [], blocks: {} });
}

/** Adds an empty piece to the end of the body and returns its id. */
function addEmptyPiece(repo: Repo, manuscript: DocHandle<ManuscriptDoc>): NodeId {
  const chapter = createChapterHandle(repo);
  const id = createNodeId();
  const piece: PieceNode = { kind: "piece", title: UNTITLED, chapterUrl: chapter.url, words: 0 };
  manuscript.change((doc) => {
    insertNode(doc, { parent: "body", index: doc.body.length }, piece, id);
  });
  return id;
}

/** Finds a document stored on this device, or undefined if it is not here. */
async function findStored<Value>(
  repo: Repo,
  url: string | undefined,
): Promise<DocHandle<Value> | undefined> {
  if (!isValidAutomergeUrl(url)) return undefined;
  try {
    return await repo.find<Value>(url);
  } catch {
    // The document was never stored here, or the browser cleared it. A fresh one takes its place.
    return undefined;
  }
}

/** The piece to open: the one open last time if it still exists, otherwise the first one. */
function pieceToOpen(
  manuscript: ManuscriptDoc,
  remembered: string | undefined,
): NodeId | undefined {
  if (isNodeId(remembered) && manuscript.nodes[remembered]?.kind === "piece") return remembered;
  const [first] = [...piecesOf(manuscript, "body"), ...piecesOf(manuscript, "front")];
  return first?.id;
}

/** Opens a piece's chapter, giving it a fresh empty chapter if its text is not on this device. */
async function openChapter(
  repo: Repo,
  manuscript: DocHandle<ManuscriptDoc>,
  pieceId: NodeId,
): Promise<DocHandle<ChapterDoc>> {
  const piece = manuscript.doc().nodes[pieceId];
  const url = piece?.kind === "piece" ? piece.chapterUrl : undefined;
  const stored = await findStored<ChapterDoc>(repo, url);
  if (stored) return stored;
  const chapter = createChapterHandle(repo);
  manuscript.change((doc) => {
    const node = doc.nodes[pieceId];
    if (node?.kind === "piece") node.chapterUrl = chapter.url;
  });
  return chapter;
}

/**
 * Reopens the project and piece this device had open, or starts a new, untitled one: a new book
 * opens to a blank page, and its title and chapters can wait.
 */
export async function openProject(repo: Repo, settings: DeviceSettings): Promise<OpenProject> {
  const manuscript =
    (await findStored<ManuscriptDoc>(repo, settings.read(MANUSCRIPT_KEY))) ??
    repo.create(createManuscriptDoc(UNTITLED, BLANK_FORMAT));
  const pieceId =
    pieceToOpen(manuscript.doc(), settings.read(PIECE_KEY)) ?? addEmptyPiece(repo, manuscript);
  const chapter = await openChapter(repo, manuscript, pieceId);
  settings.write(MANUSCRIPT_KEY, manuscript.url);
  settings.write(PIECE_KEY, pieceId);
  return { repo, manuscript, pieceId, chapter };
}
