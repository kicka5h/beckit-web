import {
  isMarkType,
  levelOf,
  newBlock,
  segmentText,
  spansFromSegments,
  toSnapshot,
  type BlockSnapshot,
  type Segment,
} from "@beckit/core";
import type { JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { blockIdOf } from "./block-ids.ts";
import { NODE_FOR_BLOCK, blockTypeOf } from "./schema.ts";

// Editor nodes are immutable, so an untouched block keeps its node object and, through this
// cache, its snapshot object. That is what lets `diffEdit` compare by reference.
const cache = new WeakMap<PMNode, BlockSnapshot | null>();

function snapshotOf(node: PMNode): BlockSnapshot | null {
  const id = blockIdOf(node);
  const type = blockTypeOf(node.type.name);
  if (!id || !type) return null;

  const segments: Segment[] = [];
  node.forEach((child) => {
    const marks = child.marks.map((m) => m.type.name).filter(isMarkType);
    if (child.text) segments.push({ text: child.text, marks });
  });
  const level: unknown = node.attrs.level;
  return toSnapshot({
    id,
    type,
    level: typeof level === "number" ? level : undefined,
    text: node.textContent,
    marks: spansFromSegments(segments),
  });
}

const cachedSnapshotOf = (node: PMNode): BlockSnapshot | null => {
  if (!cache.has(node)) cache.set(node, snapshotOf(node));
  return cache.get(node) ?? null;
};

/** Editor document → blocks. */
export function snapshotsOf(doc: PMNode): BlockSnapshot[] {
  const blocks: BlockSnapshot[] = [];
  doc.forEach((node) => {
    const snapshot = cachedSnapshotOf(node);
    if (snapshot) blocks.push(snapshot);
  });
  return blocks;
}

const blockJSON = (block: BlockSnapshot): JSONContent => {
  const level = levelOf(block);
  return {
    type: NODE_FOR_BLOCK[block.type],
    attrs: level === undefined ? { id: block.id } : { id: block.id, level },
    content: segmentText(block.text, block.marks).map((s) => ({
      type: "text",
      text: s.text,
      marks: s.marks.map((mark) => ({ type: mark })),
    })),
  };
};

/** Blocks → editor document. An empty chapter opens on one empty paragraph. */
export function toDocJSON(blocks: readonly BlockSnapshot[]): JSONContent {
  const content = blocks.length > 0 ? blocks : [newBlock("")];
  return { type: "doc", content: content.map(blockJSON) };
}
