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

/** One row of the tree as a list: a node, the part it is in, and how deep it is nested. */
export interface OutlineEntry {
  readonly id: NodeId;
  readonly node: ManuscriptNode;
  readonly part: Part;
  readonly depth: number;
}

/** The one-step moves in the tree: past a neighbor, into the section above, out of a section. */
export const TREE_STEPS = ["up", "down", "in", "out"] as const;

/** One of `TREE_STEPS`. */
export type TreeStep = (typeof TREE_STEPS)[number];

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

/** Creates a piece with no words yet, its text in the chapter at `chapterUrl`. */
export function createPieceNode(title: string, chapterUrl: string): PieceNode {
  return { kind: "piece", title, chapterUrl, words: 0 };
}

/** The ids listed directly under `parent`. A missing section or a non-section has none. */
export function childIdsOf(manuscript: ManuscriptDoc, parent: Parent): NodeId[] {
  if (isPart(parent)) return manuscript[parent];
  const node = manuscript.nodes[parent];
  return node?.kind === "section" ? node.children : [];
}

/** The place at the end of `parent`'s list, where a new or moved node is appended. */
export function endPlaceOf(manuscript: ManuscriptDoc, parent: Parent): Place {
  return { parent, index: childIdsOf(manuscript, parent).length };
}

/** Inserts `id` into `siblings` at `index`, or at the end when the index is past it. */
function insertId(siblings: NodeId[], index: number, id: NodeId): void {
  siblings.splice(Math.min(index, siblings.length), 0, id);
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
  insertId(childIdsOf(doc, parent), index, id);
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

/** Finds where `id` sits in the tree; undefined if it is not in it. */
export function findPlace(manuscript: ManuscriptDoc, id: NodeId): Place | undefined {
  const parents: Parent[] = [...PARTS, ...Object.keys(manuscript.nodes).filter(isNodeId)];
  for (const parent of parents) {
    const index = childIdsOf(manuscript, parent).indexOf(id);
    if (index !== -1) return { parent, index };
  }
  return undefined;
}

/** Whether `id` is `ancestor` or sits anywhere inside it. */
function isWithin(manuscript: ManuscriptDoc, id: NodeId, ancestor: NodeId): boolean {
  if (id === ancestor) return true;
  return childIdsOf(manuscript, ancestor).some((child) => isWithin(manuscript, id, child));
}

/**
 * Moves a node, with everything inside it, to `place` inside an Automerge change. `place.index`
 * counts the list as it is before the move. A section cannot move into itself; asking for that,
 * or moving a node that is not in the tree, changes nothing and returns false.
 */
export function moveNode(doc: ManuscriptDoc, id: NodeId, { parent, index }: Place): boolean {
  const from = findPlace(doc, id);
  if (!from || (!isPart(parent) && isWithin(doc, parent, id))) return false;
  const isLaterInSameList = from.parent === parent && from.index < index;
  const target = isLaterInSameList ? index - 1 : index;
  if (from.parent === parent && from.index === target) return true;
  childIdsOf(doc, from.parent).splice(from.index, 1);
  insertId(childIdsOf(doc, parent), target, id);
  return true;
}

/** Renames a node inside an Automerge change, writing only if the title changed. */
export function renameNode(doc: ManuscriptDoc, id: NodeId, title: string): void {
  const node = doc.nodes[id];
  if (node && node.title !== title) node.title = title;
}

/** Every id at or inside `id`. */
function subtreeOf(manuscript: ManuscriptDoc, id: NodeId): NodeId[] {
  // Copied first: Automerge's list proxies, live inside a change, have no flatMap.
  const children = [...childIdsOf(manuscript, id)];
  return [id, ...children.flatMap((child) => subtreeOf(manuscript, child))];
}

/**
 * Removes a node and everything inside it from the tree, inside an Automerge change. The pieces'
 * chapter documents are kept, so their text and history survive the removal.
 */
export function removeNode(doc: ManuscriptDoc, id: NodeId): void {
  const place = findPlace(doc, id);
  if (!place) return;
  for (const removed of subtreeOf(doc, id)) Reflect.deleteProperty(doc.nodes, removed);
  childIdsOf(doc, place.parent).splice(place.index, 1);
}

/** The rows under `parent`, depth first, each `depth` levels deep or deeper. */
function outlineEntriesOf(
  manuscript: ManuscriptDoc,
  parent: Parent,
  part: Part,
  depth: number,
): OutlineEntry[] {
  return childIdsOf(manuscript, parent).flatMap((id) => {
    const node = manuscript.nodes[id];
    if (!node) return [];
    return [{ id, node, part, depth }, ...outlineEntriesOf(manuscript, id, part, depth + 1)];
  });
}

/** The whole tree as rows in reading order: front matter, body, then back matter. */
export function outlineOf(manuscript: ManuscriptDoc): OutlineEntry[] {
  return PARTS.flatMap((part) => outlineEntriesOf(manuscript, part, part, 0));
}

/** The section a node sits in, or undefined when it sits directly in a part. */
export function sectionOf(manuscript: ManuscriptDoc, id: NodeId): NodeId | undefined {
  const place = findPlace(manuscript, id);
  return place && !isPart(place.parent) ? place.parent : undefined;
}

/** The end of the section `above`, or undefined when `above` is not a section. */
function sectionEndPlaceOf(
  manuscript: ManuscriptDoc,
  above: NodeId | undefined,
): Place | undefined {
  if (!above || manuscript.nodes[above]?.kind !== "section") return undefined;
  return endPlaceOf(manuscript, above);
}

/** The place just after `id` in its list. */
function nextPlaceOf(manuscript: ManuscriptDoc, id: NodeId): Place | undefined {
  const place = findPlace(manuscript, id);
  return place && { parent: place.parent, index: place.index + 1 };
}

/**
 * The place a one-step move would put a node, ready for `moveNode`, or undefined if it can't move
 * that way: up or down past a sibling, into the end of the section just above it, or out of its
 * section to just after it.
 */
export function stepPlaceOf(
  manuscript: ManuscriptDoc,
  id: NodeId,
  step: TreeStep,
): Place | undefined {
  const place = findPlace(manuscript, id);
  if (!place) return undefined;
  const { parent, index } = place;
  const siblings = childIdsOf(manuscript, parent);
  switch (step) {
    case "up":
      return index > 0 ? { parent, index: index - 1 } : undefined;
    case "down":
      return index < siblings.length - 1 ? { parent, index: index + 2 } : undefined;
    case "in":
      return sectionEndPlaceOf(manuscript, siblings[index - 1]);
    case "out":
      return isPart(parent) ? undefined : nextPlaceOf(manuscript, parent);
  }
}

/**
 * The pieces whose text a repeated-word count covers for `pieceId`: every piece of the section it
 * is in, the whole body when the project has no sections at all, or else the piece alone.
 */
export function repeatScopeOf(manuscript: ManuscriptDoc, pieceId: NodeId): NodeId[] {
  const section = sectionOf(manuscript, pieceId);
  if (section) return piecesOf(manuscript, section).map(({ id }) => id);
  const isFlat = !Object.values(manuscript.nodes).some(({ kind }) => kind === "section");
  return isFlat ? piecesOf(manuscript, "body").map(({ id }) => id) : [pieceId];
}
