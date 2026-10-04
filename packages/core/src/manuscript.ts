import type * as Automerge from "@automerge/automerge";

import { isUlid, mintUlid } from "./ids.ts";

/** Permanent identity of a section or piece in the manuscript tree. */
export type NodeId = string & { readonly __brand: "NodeId" };

/**
 * The three top-level lists of a manuscript. Front and back matter are left out of the project
 * word count and exported around the body.
 */
export const PARTS = ["front", "body", "back"] as const;

/** One of the lists in `PARTS`. */
export type Part = (typeof PARTS)[number];

/** A unit of writing (chapter, essay, poem, page), whose text is its own chapter document. */
export interface PieceNode {
  kind: "piece";
  title: string;
  /** The address of the piece's chapter document. */
  chapterUrl: string;
  /** Words in the piece, kept here so the project total is a sum, not a scan of every chapter. */
  words: number;
}

/** A group of nodes, nested to any depth: a part, a cycle of poems, a year of entries. */
export interface SectionNode {
  kind: "section";
  title: string;
  children: NodeId[];
}

/** A contents page. It holds no text of its own: it is drawn from the tree. */
export interface ContentsNode {
  kind: "contents";
  title: string;
}

/** Any node of the manuscript tree. */
export type ManuscriptNode = PieceNode | SectionNode | ContentsNode;

/**
 * One book or project: its title, the format it started from, and its tree of sections and pieces.
 * A type alias, not an interface: Automerge requires a plain-record root type.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Automerge root type
export type ManuscriptDoc = {
  title: string;
  format: string;
  front: NodeId[];
  body: NodeId[];
  back: NodeId[];
  nodes: Record<NodeId, ManuscriptNode>;
};

/** A manuscript document as Automerge holds it. */
export type Manuscript = Automerge.Doc<ManuscriptDoc>;

/** What a node sits in: one of the parts, or a section. */
export type Parent = Part | NodeId;

/** A piece with its id, as listed by `piecesOf`. */
export interface PieceEntry {
  readonly id: NodeId;
  readonly piece: PieceNode;
}

/** A position in the tree: the list a node sits in and its index there. */
export interface Place {
  readonly parent: Parent;
  readonly index: number;
}

/** Mints a new node id. */
export function createNodeId(): NodeId {
  return mintUlid() as NodeId;
}

/** Whether a value is a node id this app minted. */
export function isNodeId(value: unknown): value is NodeId {
  return isUlid(value);
}

/** Whether a parent is one of the top-level parts rather than a section. */
export function isPart(parent: Parent): parent is Part {
  return (PARTS as readonly string[]).includes(parent);
}

/** Creates the initial value of an empty manuscript. */
export function createManuscriptDoc(title: string, format: string): ManuscriptDoc {
  return { title, format, front: [], body: [], back: [], nodes: {} };
}

/** The ids listed directly under `parent`. A missing section or a non-section has none. */
export function childIdsOf(manuscript: ManuscriptDoc, parent: Parent): NodeId[] {
  if (isPart(parent)) return manuscript[parent];
  const node = manuscript.nodes[parent];
  return node?.kind === "section" ? node.children : [];
}

/**
 * Adds `node` at `place` inside an Automerge change and returns its id, minted unless given. An
 * index past the end appends.
 */
export function insertNode(
  doc: ManuscriptDoc,
  { parent, index }: Place,
  node: ManuscriptNode,
  id: NodeId = createNodeId(),
): NodeId {
  doc.nodes[id] = node;
  const siblings = childIdsOf(doc, parent);
  siblings.splice(Math.min(index, siblings.length), 0, id);
  return id;
}

/** Records a piece's word count inside an Automerge change, writing only if it changed. */
export function writePieceWords(doc: ManuscriptDoc, id: NodeId, words: number): void {
  const node = doc.nodes[id];
  if (node?.kind === "piece" && node.words !== words) node.words = words;
}

/** Every piece under `parent`, depth first, in reading order. */
export function piecesOf(manuscript: ManuscriptDoc, parent: Parent): PieceEntry[] {
  return childIdsOf(manuscript, parent).flatMap((id) => {
    const node = manuscript.nodes[id];
    return node?.kind === "piece" ? [{ id, piece: node }] : piecesOf(manuscript, id);
  });
}

/** Counts the words of the whole project: every piece in the body, front and back matter left out. */
export function countProjectWords(manuscript: ManuscriptDoc): number {
  return piecesOf(manuscript, "body").reduce((total, { piece }) => total + piece.words, 0);
}
