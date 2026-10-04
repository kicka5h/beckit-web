import * as Automerge from "@automerge/automerge";

import {
  type BlockSnapshot,
  type BlockType,
  isMarkType,
  levelOf,
  MARK_TYPES,
  type MarkSpan,
  toSnapshot,
} from "./block.ts";
import type { BlockId } from "./ids.ts";
import { syncList } from "./list-sync.ts";
import { normalizeSpans, spansOf } from "./marks.ts";
import { subtractSpans } from "./span.ts";

/** A block as stored. Its text is Automerge text, so concurrent edits merge per character. */
export interface StoredBlock {
  type: BlockType;
  level?: number;
  text: string;
}

/**
 * One chapter: block order plus the blocks themselves, keyed by permanent id. Its title lives in
 * the manuscript tree, the one place a piece is named.
 * A type alias, not an interface: Automerge requires a plain-record root type.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- Automerge root type
export type ChapterDoc = {
  order: BlockId[];
  blocks: Record<BlockId, StoredBlock>;
};

/** A chapter document as Automerge holds it. */
export type Chapter = Automerge.Doc<ChapterDoc>;

/** The result of one editor edit: the new block order, changed blocks and removed blocks. */
export interface ChapterEdit {
  readonly order: readonly BlockId[];
  readonly changed: readonly BlockSnapshot[];
  readonly removed: readonly BlockId[];
}

type TextPath = ["blocks", BlockId, "text"];

function textPathOf(id: BlockId): TextPath {
  return ["blocks", id, "text"];
}

function readMarks(doc: ChapterDoc, id: BlockId): MarkSpan[] {
  const spans = Automerge.marks(doc, textPathOf(id)).flatMap(({ name, value, start, end }) =>
    value === true && isMarkType(name) ? [{ type: name, start, end }] : [],
  );
  return normalizeSpans(spans);
}

/** The stored block for `block`, created empty if new. */
function storedBlockOf(doc: ChapterDoc, block: BlockSnapshot): StoredBlock {
  const existing = doc.blocks[block.id];
  if (existing) return existing;
  doc.blocks[block.id] = { type: block.type, text: "" };
  // Read again: Automerge hands back a live proxy only when the value is read from the doc.
  return storedBlockOf(doc, block);
}

function writeLevel(stored: StoredBlock, level: number | undefined): void {
  if (stored.level === level) return;
  if (level === undefined) Reflect.deleteProperty(stored, "level");
  else stored.level = level;
}

/**
 * Marks and unmarks only the spans that differ, per mark type. Rewriting every mark would
 * overwrite formatting another device added concurrently.
 */
function writeMarks(doc: ChapterDoc, { id, marks }: BlockSnapshot): void {
  const path = textPathOf(id);
  const stored = readMarks(doc, id);
  for (const type of MARK_TYPES) {
    const have = spansOf(stored, type);
    const want = spansOf(marks, type);
    for (const span of subtractSpans(have, want)) {
      Automerge.unmark(doc, path, { ...span, expand: "none" }, type);
    }
    for (const span of subtractSpans(want, have)) {
      Automerge.mark(doc, path, { ...span, expand: "after" }, type, true);
    }
  }
}

function writeBlock(doc: ChapterDoc, block: BlockSnapshot): void {
  const stored = storedBlockOf(doc, block);
  if (stored.type !== block.type) stored.type = block.type;
  writeLevel(stored, levelOf(block));
  if (stored.text !== block.text) Automerge.updateText(doc, textPathOf(block.id), block.text);
  writeMarks(doc, block);
}

/**
 * Writes an editor edit into a chapter inside an Automerge change. Fields that already match are
 * not written, so an edit that changes nothing records nothing.
 */
export function writeEdit(doc: ChapterDoc, edit: ChapterEdit): void {
  for (const id of edit.removed) Reflect.deleteProperty(doc.blocks, id);
  for (const block of edit.changed) writeBlock(doc, block);
  syncList(doc.order, edit.order);
}

/** Applies an editor edit as one Automerge change (see `writeEdit`). */
export function applyEdit(chapter: Chapter, edit: ChapterEdit): Chapter {
  return Automerge.change(chapter, (doc) => {
    writeEdit(doc, edit);
  });
}

/** Creates a chapter holding `blocks`, recorded as its first change. */
export function createChapter(blocks: readonly BlockSnapshot[]): Chapter {
  const empty = Automerge.from<ChapterDoc>({ order: [], blocks: {} });
  return applyEdit(empty, { order: blocks.map((block) => block.id), changed: blocks, removed: [] });
}

/** Reads the chapter's blocks in order. An id listed twice (after a concurrent move) appears once. */
export function readChapter(chapter: Chapter): BlockSnapshot[] {
  return [...new Set(chapter.order)].flatMap((id) => {
    const stored = chapter.blocks[id];
    if (!stored) return [];
    const { type, level, text } = stored;
    return [toSnapshot({ id, type, level, text, marks: readMarks(chapter, id) })];
  });
}
