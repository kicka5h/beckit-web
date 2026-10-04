import type { Fragment, Node as ProseMirrorNode } from "@tiptap/pm/model";

import type { Span } from "@beckit/core";

/** A node with its offset inside its parent. For the document's children, that is their position. */
export interface PlacedNode {
  readonly node: ProseMirrorNode;
  readonly pos: number;
}

/** The direct children of a node or fragment, with their offsets. */
export function childrenOf(parent: ProseMirrorNode | Fragment): PlacedNode[] {
  const children: PlacedNode[] = [];
  // ProseMirror exposes children only through forEach; this is the one place we call it.
  parent.forEach((node, pos) => {
    children.push({ node, pos });
  });
  return children;
}

/** The span a block's text occupies in the document, just inside its opening token. */
export function textSpanOf({ node, pos }: PlacedNode): Span {
  return { start: pos + 1, end: pos + 1 + node.content.size };
}
