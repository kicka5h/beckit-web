import type { BlockType } from "@beckit/core";

/** The one place core block types meet editor node names. */
export const NODE_FOR_BLOCK = {
  paragraph: "paragraph",
  heading: "heading",
  sceneBreak: "horizontalRule",
} as const satisfies Record<BlockType, string>;

const BLOCK_FOR_NODE = new Map<string, BlockType>(
  Object.entries(NODE_FOR_BLOCK).map(([block, node]) => [node, block as BlockType]),
);

/** The core block type for an editor node name, if Beckit stores that node. */
export const blockTypeOf = (nodeName: string): BlockType | undefined =>
  BLOCK_FOR_NODE.get(nodeName);

/** Every top-level node type that carries a permanent block id. */
export const ID_NODE_TYPES: string[] = Object.values(NODE_FOR_BLOCK);
