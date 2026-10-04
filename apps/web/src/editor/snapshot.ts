import type { JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import {
  type BlockSnapshot,
  createBlock,
  isMarkType,
  levelOf,
  memoize,
  toSegments,
  toSnapshot,
  toSpans,
} from "@beckit/core";

import { blockIdOf } from "./block-ids.ts";
import { childrenOf } from "./nodes.ts";
import { blockTypeOf, ID_ATTRIBUTE, NODE_FOR_BLOCK } from "./schema.ts";

function toBlockSnapshot(node: ProseMirrorNode): BlockSnapshot | undefined {
  const id = blockIdOf(node);
  const type = blockTypeOf(node.type.name);
  if (!id || !type) return undefined;

  const segments = childrenOf(node).flatMap(({ node: child }) =>
    child.text
      ? [{ text: child.text, marks: child.marks.map((mark) => mark.type.name).filter(isMarkType) }]
      : [],
  );
  const level: unknown = node.attrs.level;
  return toSnapshot({
    id,
    type,
    level: typeof level === "number" ? level : undefined,
    text: node.textContent,
    marks: toSpans(segments),
  });
}

// Editor nodes are immutable, so an untouched block keeps its node object and therefore its
// snapshot object. That is what lets `diffEdit` compare by reference.
const snapshotOf = memoize(toBlockSnapshot);

/** Converts the editor document into blocks. */
export function toSnapshots(doc: ProseMirrorNode): BlockSnapshot[] {
  return childrenOf(doc).flatMap(({ node }) => snapshotOf(node) ?? []);
}

function toBlockJson(block: BlockSnapshot): JSONContent {
  const level = levelOf(block);
  return {
    type: NODE_FOR_BLOCK[block.type],
    attrs: level === undefined ? { [ID_ATTRIBUTE]: block.id } : { [ID_ATTRIBUTE]: block.id, level },
    content: toSegments(block.text, block.marks).map(({ text, marks }) => ({
      type: "text",
      text,
      marks: marks.map((mark) => ({ type: mark })),
    })),
  };
}

/** Converts blocks into an editor document. An empty chapter opens on one empty paragraph. */
export function toDocJson(blocks: readonly BlockSnapshot[]): JSONContent {
  const content = blocks.length > 0 ? blocks : [createBlock("")];
  return { type: "doc", content: content.map(toBlockJson) };
}
